/* Een term in een formule oplichten, zoals op papier.
 *
 * In de PDF zet \markeerterm{rowc!35}{x} een licht gekleurd kadertje rond de
 * term, en \markeercellen kleurt na \CodeAfter een blok cellen van een
 * nicematrix. MathJax kende die kleuren niet: een onbekende kleur wordt daar
 * een zwart vlak, en dan verdwijnt net wat aangeduid wordt.
 *
 * Dit bestand geeft MathJax een eigen \markeerterm. De kleuren zelf komen uit
 * de bron: mkpi --site zet elke \definecolor van het hoofdstuk als
 * \definecolor voor MathJax bij de macro's van de pagina. Een kleur schrijf
 * je zoals in xcolor, als naam of met een percentage (rowc!35). Op de site
 * wordt dat percentage een doorzichtigheid in plaats van een menging met wit:
 * op een witte achtergrond is het beeld hetzelfde, en in de nachtstand
 * blijft de term leesbaar (presentatie.css dempt er de kleur, klasse
 * mkpi-markering).
 *
 * mathjax-nicematrix.js gebruikt dezelfde kleuren voor \markeercellen, via
 * window.MathJaxMarkering. Een onbekende kleur geeft een fout in beeld.
 *
 * De pagina laadt dit script na het instellingenblok van lwarp en voor
 * tex-svg-full.js: het wikkelt startup.ready in en voegt zijn pakket toe aan
 * de lijst die lwarp al schreef.
 */
(function () {
  "use strict";

  var config = (window.MathJax = window.MathJax || {});
  config.startup = config.startup || {};
  config.tex = config.tex || {};
  var pakketten = (config.tex.packages = config.tex.packages || {});
  var erbij = (pakketten["[+]"] = pakketten["[+]"] || []);
  // colortbl geeft \cellcolor, waarmee mathjax-nicematrix.js cellen kleurt.
  ["colortbl", "mkpi-markering"].forEach(function (naam) {
    if (erbij.indexOf(naam) < 0) erbij.push(naam);
  });

  var vorigeReady = config.startup.ready;

  // De basiskleuren van xcolor, voor wie \markeerterm{yellow!30}{...} schrijft.
  var XCOLOR = {
    black: "#000000", white: "#ffffff", red: "#ff0000", green: "#00ff00",
    blue: "#0000ff", cyan: "#00ffff", magenta: "#ff00ff", yellow: "#ffff00",
    gray: "#808080", darkgray: "#404040", lightgray: "#bfbfbf",
    brown: "#bf8040", lime: "#bfff00", olive: "#808000", orange: "#ff8000",
    pink: "#ffbfbf", purple: "#bf0040", teal: "#008080", violet: "#800080"
  };

  config.startup.ready = function () {
    var Configuration = MathJax._.input.tex.Configuration.Configuration;
    var CommandMap = MathJax._.input.tex.SymbolMap.CommandMap;
    var TexParser = MathJax._.input.tex.TexParser.default;
    var TexError = MathJax._.input.tex.TexError.default;

    function fout(cs, bericht) {
      throw new TexError("MarkeringFout", cs + ": " + bericht);
    }

    // Een kleur van xcolor (naam of naam!percentage) als {r, g, b, a}, met a
    // het percentage maal de dekking.
    function kleur(parser, spec, dekking, cs) {
      var delen = spec.trim().split("!");
      if (delen.length > 2) fout(cs, "de kleur " + spec + " mengt meer dan de website aankan");
      var naam = delen[0].trim();
      var deel = 1;
      if (delen.length === 2) {
        if (!/^\s*\d+(\.\d*)?\s*$/.test(delen[1])) fout(cs, "geen percentage in de kleur " + spec);
        deel = parseFloat(delen[1]) / 100;
      }
      var model = parser.configuration.packageData.get("color").model;
      var hex = model.getColor("named", naam);
      if (!/^#/.test(hex)) hex = XCOLOR[naam];
      var treffer = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
      if (!treffer) fout(cs, "de kleur " + naam + " kent de website niet");
      return {
        r: parseInt(treffer[1], 16),
        g: parseInt(treffer[2], 16),
        b: parseInt(treffer[3], 16),
        a: Math.min(1, deel * dekking)
      };
    }

    // Twee doorzichtige kleuren op elkaar, zoals twee \markeercellen over
    // dezelfde cel in de PDF.
    function over(onder, boven) {
      var a = boven.a + onder.a * (1 - boven.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      var meng = function (k) {
        return Math.round((boven[k] * boven.a + onder[k] * onder.a * (1 - boven.a)) / a);
      };
      return { r: meng("r"), g: meng("g"), b: meng("b"), a: a };
    }

    // Als rgba(...): zonder #, want dat is in TeX het teken van een argument.
    function tekst(k) {
      return "rgba(" + [k.r, k.g, k.b, +k.a.toFixed(3)].join(",") + ")";
    }

    window.MathJaxMarkering = { kleur: kleur, over: over, tekst: tekst };

    new CommandMap("mkpi-markering", { markeerterm: "MarkeerTerm" }, {
      MarkeerTerm: function (parser, cs) {
        var spec = parser.GetArgument(cs);
        var term = parser.GetArgument(cs);
        var vak = tekst(kleur(parser, spec, 1, cs));
        var mml = new TexParser(term, parser.stack.env, parser.configuration).mml();
        // 3pt rond de term, zoals \fboxsep op papier. \bbox kan het niet:
        // dat weigert een kleur met doorzichtigheid.
        parser.Push(parser.create("node", "mpadded", [mml], {
          mathbackground: vak,
          "class": "mkpi-markering",
          width: "+6pt", height: "+3pt", depth: "+3pt", lspace: "3pt"
        }));
      }
    });
    Configuration.create("mkpi-markering", { handler: { macro: ["mkpi-markering"] } });

    if (typeof vorigeReady === "function") vorigeReady.call(this);
    else MathJax.startup.defaultReady();
  };
})();
