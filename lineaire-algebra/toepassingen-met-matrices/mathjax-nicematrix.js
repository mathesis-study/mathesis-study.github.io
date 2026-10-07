/* Een matrix met kopjes voor MathJax.
 *
 * In de PDF komen de matrixomgevingen met kopjes uit nicematrix: first-row
 * zet een rij boven de matrix, last-col een kolom rechts ernaast, en beide
 * blijven buiten de haken staan. MathJax kent nicematrix niet. lwarp geeft de
 * omgevingen daar door als een gewone pmatrix en gooit de opties weg, zodat de
 * kopjes binnen de haken belanden en de kolommen niet meer uitlijnen.
 *
 * Dit bestand geeft MathJax een eigen versie van die omgevingen, zodat
 * dezelfde bron op papier en op de website hetzelfde beeld oplevert. De
 * omgeving wordt herschreven tot geneste arrays: de kopjes staan in de
 * buitenste, de getallen met hun haken in de binnenste.
 *
 * Het dekt met opzet maar een deel van nicematrix: de opties first-row,
 * last-row, first-col en last-col, en de cellen zelf. columns-width wordt
 * gelezen maar niet nagebootst; MathJax kent geen kolommen van vaste breedte,
 * dus een kopje kan een haartje naast zijn kolom staan. Alles wat het beeld
 * echt zou veranderen (\Block, \Cdots, hvlines, ...) geeft een fout in beeld
 * in plaats van een stille afwijking van de PDF. Van \CodeBefore en \CodeAfter
 * blijft enkel \markeercellen over: die cellen krijgen op de site dezelfde
 * lichte kleur, met de kleuren van mathjax-markering.js. De rest (\celpijl,
 * eigen tikz) valt weg.
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
  if (erbij.indexOf("mkpi-nicematrix") < 0) erbij.push("mkpi-nicematrix");

  var vorigeReady = config.startup.ready;

  // De omgevingen van nicematrix met de haken die erbij horen.
  var HAKEN = {
    NiceMatrix: ["", ""],
    pNiceMatrix: ["(", ")"],
    bNiceMatrix: ["[", "]"],
    BNiceMatrix: ["\\{", "\\}"],
    vNiceMatrix: ["|", "|"],
    VNiceMatrix: ["\\|", "\\|"]
  };

  // Wat nicematrix nog meer kan, maar hier niet.
  var TEVEEL = /\\(Block|Cdots|Vdots|Ddots|Iddots|Hdotsfor|SubMatrix|line|hdottedline|diagbox)\b/;

  config.startup.ready = function () {
    var Configuration = MathJax._.input.tex.Configuration.Configuration;
    var EnvironmentMap = MathJax._.input.tex.SymbolMap.EnvironmentMap;
    var ParseMethods = MathJax._.input.tex.ParseMethods.default;
    var TexParser = MathJax._.input.tex.TexParser.default;
    var TexError = MathJax._.input.tex.TexError.default;

    function fout(naam, bericht) {
      throw new TexError("NiceMatrixFout", "\\begin{" + naam + "}: " + bericht);
    }

    // Splits op een scheider die buiten accolades en buiten een geneste
    // omgeving staat. Zo blijft een cel met \frac{a}{b} of met een eigen
    // array heel.
    function splits(tekst, scheider) {
      var delen = [];
      var diepte = 0;
      var begin = 0;
      for (var i = 0; i < tekst.length; i++) {
        var teken = tekst.charAt(i);
        if (diepte === 0 && tekst.startsWith(scheider, i)) {
          delen.push(tekst.slice(begin, i));
          i += scheider.length - 1;
          begin = i + 1;
          continue;
        }
        if (tekst.startsWith("\\begin{", i)) { diepte++; i += 6; continue; }
        if (tekst.startsWith("\\end{", i)) { diepte--; i += 4; continue; }
        if (teken === "\\") { i++; continue; }
        if (teken === "{") diepte++;
        else if (teken === "}") diepte--;
      }
      delen.push(tekst.slice(begin));
      return delen;
    }

    // De rijen van de omgeving, elk als lijst van cellen. Een lege laatste rij
    // (de bron eindigt vaak op \\) telt niet mee.
    function rijenUit(body) {
      var rijen = splits(body, "\\\\").map(function (rij) {
        return splits(rij, "&").map(function (cel) { return cel.trim(); });
      });
      while (rijen.length && rijen[rijen.length - 1].join("") === "") rijen.pop();
      return rijen;
    }

    function optiesUit(tekst, naam) {
      var opties = {};
      splits(tekst || "", ",").forEach(function (deel) {
        deel = deel.trim();
        if (!deel) return;
        var is = deel.indexOf("=");
        var sleutel = is < 0 ? deel : deel.slice(0, is).trim();
        opties[sleutel] = is < 0 ? true : deel.slice(is + 1).trim();
        if (["first-row", "last-row", "first-col", "last-col",
             "columns-width", "margin", "nullify-dots", "r", "c", "l"]
            .indexOf(sleutel) < 0) {
          fout(naam, "de optie " + sleutel + " kent de website niet");
        }
      });
      return opties;
    }

    // \markeercellen[dekking]{kleur}{r-k}{r-k} uit \CodeAfter: een blok
    // cellen van de matrix zelf, geteld zonder de kopjes, zoals in nicematrix.
    var MARKEERCELLEN = /\\markeercellen\s*(?:\[([^\]]*)\])?\s*\{([^{}]*)\}\s*\{\s*(\d+)\s*-\s*(\d+)\s*\}\s*\{\s*(\d+)\s*-\s*(\d+)\s*\}/g;

    function markeringenUit(parser, naam, code) {
      var markeringen = [];
      var treffer;
      MARKEERCELLEN.lastIndex = 0;
      while ((treffer = MARKEERCELLEN.exec(code))) {
        var hulp = window.MathJaxMarkering;
        if (!hulp) fout(naam, "\\markeercellen heeft mathjax-markering.js nodig");
        var dekking = treffer[1] === undefined || treffer[1].trim() === "" ? 0.35 : parseFloat(treffer[1]);
        markeringen.push({
          kleur: hulp.kleur(parser, treffer[2], dekking, "\\markeercellen"),
          van: [+treffer[3], +treffer[4]],
          tot: [+treffer[5], +treffer[6]]
        });
      }
      return markeringen;
    }

    // Zet \cellcolor in de gemarkeerde cellen; twee markeringen over dezelfde
    // cel leggen hun kleuren op elkaar.
    function kleurCellen(naam, rijen, markeringen) {
      var hulp = window.MathJaxMarkering;
      var kleuren = {};
      markeringen.forEach(function (m) {
        for (var r = m.van[0]; r <= m.tot[0]; r++) {
          for (var k = m.van[1]; k <= m.tot[1]; k++) {
            if (r < 1 || k < 1 || r > rijen.length || k > rijen[r - 1].length) {
              fout(naam, "\\markeercellen wijst naar cel " + r + "-" + k + ", buiten de matrix");
            }
            var sleutel = r + "-" + k;
            kleuren[sleutel] = kleuren[sleutel] ? hulp.over(kleuren[sleutel], m.kleur) : m.kleur;
          }
        }
      });
      Object.keys(kleuren).forEach(function (sleutel) {
        var plaats = sleutel.split("-");
        var rij = rijen[plaats[0] - 1];
        rij[plaats[1] - 1] = "\\cellcolor{" + hulp.tekst(kleuren[sleutel]) + "}" + rij[plaats[1] - 1];
      });
    }

    // De cellen met een kleur krijgen een klasse, zodat presentatie.css ze in
    // de nachtstand kan dempen, net als \markeerterm.
    function klasseOpGekleurd(node) {
      if (node.isKind && node.isKind("mtd") && node.attributes.getExplicit("mathbackground")) {
        node.attributes.set("class", "mkpi-markering");
      }
      (node.childNodes || []).forEach(klasseOpGekleurd);
    }

    function array(rijen, kolommen, uitlijning) {
      return "\\begin{array}" + (uitlijning ? "[" + uitlijning + "]" : "") +
        "{" + kolommen + "}" +
        rijen.map(function (rij) { return rij.join(" & "); }).join("\\\\") +
        "\\end{array}";
    }

    // Bouw uit de omgeving de geneste arrays: de kopjes eromheen, de getallen
    // met hun haken in het midden.
    function bouw(naam, body, optietekst, markeringen) {
      var opties = optiesUit(optietekst, naam);
      var haken = HAKEN[naam];
      var rijen = rijenUit(body);
      if (!rijen.length) fout(naam, "de matrix is leeg");

      var boven = opties["first-row"] ? rijen.shift() : null;
      var onder = opties["last-row"] ? rijen.pop() : null;
      var links = null;
      var rechts = null;
      if (opties["first-col"]) {
        links = rijen.map(function (rij) { return [rij.shift()]; });
        if (boven) boven.shift();
        if (onder) onder.shift();
      }
      if (opties["last-col"]) {
        // De kopjesrijen hebben hier een lege cel staan.
        var breedte = Math.max.apply(null, rijen.map(function (r) { return r.length; }));
        rechts = rijen.map(function (rij) {
          return [rij.length === breedte ? rij.pop() : ""];
        });
        if (boven && boven.length > breedte) boven.pop();
        if (onder && onder.length > breedte) onder.pop();
      }
      if (!rijen.length) fout(naam, "de matrix heeft enkel kopjes");
      kleurCellen(naam, rijen, markeringen);

      var kolommen = new Array(rijen[0].length + 1).join("c");
      var matrix = array(rijen, kolommen);
      if (haken[0]) matrix = "\\left" + haken[0] + matrix + "\\right" + haken[1];
      if (!links && !rechts && !boven && !onder) return matrix;

      // De kopjes boven en onder staan even breed als de matrix, de haken
      // meegerekend, zodat ze boven hun kolom uitkomen.
      var rand = function (rij) {
        var kop = array([rij], new Array(rij.length + 1).join("c"));
        return haken[0] ? "\\hphantom{\\Big" + haken[0] + "}" + kop +
                          "\\hphantom{\\Big" + haken[1] + "}" : kop;
      };
      var kolom = function (cellen) {
        return array(cellen, "c");
      };

      var buiten = [];
      var leeg = function () { return ""; };
      var regel = function (l, m, r) {
        var cellen = [];
        if (links) cellen.push(l);
        cellen.push(m);
        if (rechts) cellen.push(r);
        return cellen;
      };
      if (boven) buiten.push(regel(leeg(), rand(boven), leeg()));
      buiten.push(regel(links ? kolom(links) : "", matrix, rechts ? kolom(rechts) : ""));
      if (onder) buiten.push(regel(leeg(), rand(onder), leeg()));

      // De rij met de matrix draagt de basislijn, zodat wat ervoor staat
      // (A =) op de hoogte van de matrix komt en niet van het midden van
      // matrix en kopjes samen, net als in de PDF.
      var buitenkolommen = (links ? "c@{}" : "") + "c" + (rechts ? "@{}c" : "");
      return array(buiten, buitenkolommen, "baseline " + (boven ? 2 : 1));
    }

    var omgevingen = {};
    Object.keys(HAKEN).forEach(function (naam) {
      // Het eerste argument is de naam waarop de omgeving sluit; die leest
      // ParseMethods.environment zelf uit.
      omgevingen[naam] = ["NiceMatrixOmgeving", naam];
    });

    new EnvironmentMap("mkpi-nicematrix", ParseMethods.environment, omgevingen, {
      NiceMatrixOmgeving: function (parser, begin) {
        var naam = begin.getProperty("name") || begin.getName();
        var optietekst = parser.GetBrackets("\\begin{" + naam + "}", "");
        // lwarp schrijft de formule met een spatie na \\begin en \\end.
        var eind = new RegExp("\\\\end\\s*\\{" + naam + "\\}");
        var rest = parser.string.slice(parser.i);
        var treffer = eind.exec(rest);
        if (!treffer) fout(naam, "de omgeving wordt niet afgesloten");
        var body = rest.slice(0, treffer.index);
        parser.i += treffer.index + treffer[0].length;
        // \CodeBefore en \CodeAfter tekenen in druk de accenten bij een cel;
        // op de site blijven enkel de gekleurde cellen over.
        var code = /\\Code(Before|After)\b[\s\S]*$/.exec(body);
        var markeringen = code ? markeringenUit(parser, naam, code[0]) : [];
        if (code) body = body.slice(0, code.index);
        if (TEVEEL.test(body)) {
          fout(naam, "deze matrix gebruikt meer van nicematrix dan de website aankan");
        }
        var mml = new TexParser(bouw(naam, body, optietekst, markeringen),
                                parser.stack.env, parser.configuration).mml();
        if (markeringen.length) klasseOpGekleurd(mml);
        return parser.itemFactory.create("mml", mml);
      }
    });
    Configuration.create("mkpi-nicematrix", { handler: { environment: ["mkpi-nicematrix"] } });

    if (typeof vorigeReady === "function") vorigeReady.call(this);
    else MathJax.startup.defaultReady();
  };
})();
