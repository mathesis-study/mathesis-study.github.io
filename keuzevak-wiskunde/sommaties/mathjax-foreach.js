/* \foreach voor MathJax.
 *
 * In de PDF komt \foreach uit pgffor. MathJax kent geen lussen en geen
 * voorwaarden: een macro met \foreach erin belandde daar als rode tekst in de
 * formule. Dit bestand geeft MathJax een eigen \foreach, zodat dezelfde bron
 * op papier en op de website hetzelfde oplevert.
 *
 * Het dekt met opzet maar een deel van pgffor: een lijst van waarden en een
 * bereik van gehele getallen. Alles daarbuiten (een lijst met /, een opgegeven
 * stapgrootte, opties tussen [ ]) geeft een fout in beeld in plaats van een
 * stille afwijking van de PDF. Een cursus die meer nodig heeft, schrijft de
 * gevallen uit, of dit bestand wordt uitgebreid, met sitebuild.py mee.
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
  if (erbij.indexOf("mkpi-foreach") < 0) erbij.push("mkpi-foreach");

  var MAX_WAARDEN = 200;
  var vorigeReady = config.startup.ready;

  config.startup.ready = function () {
    var Configuration = MathJax._.input.tex.Configuration.Configuration;
    var CommandMap = MathJax._.input.tex.SymbolMap.CommandMap;
    var TexError = MathJax._.input.tex.TexError.default;
    var ParseUtil = MathJax._.input.tex.ParseUtil.default;

    function fout(bericht) {
      throw new TexError("ForeachFout", "\\foreach: " + bericht);
    }

    // Zet de uitgerolde tekst terug in de invoer, met dezelfde teller tegen
    // oneindige lussen die lwarp voor zijn eigen macro's gebruikt.
    function gebruik(parser, tekst) {
      parser.string = ParseUtil.addArgs(parser, tekst, parser.string.slice(parser.i));
      parser.i = 0;
      if (++parser.macroCount > parser.configuration.options.maxMacros) {
        throw new TexError("MaxMacroSub1",
          "MathJax maximum macro substitution count exceeded; " +
          "is there a recursive macro call?");
      }
    }

    // {1,...,5} wordt 1 2 3 4 5; {a,b,c} blijft zoals het staat.
    function waardenUit(lijst) {
      var waarden = lijst.split(",").map(function (s) { return s.trim(); });
      var punten = waarden.indexOf("...");
      if (waarden.indexOf("...", punten + 1) > 0) {
        fout("meer dan een bereik in dezelfde lijst kan hier niet");
      }
      if (punten >= 0) {
        if (punten !== waarden.length - 2 || punten < 1) {
          fout("een bereik schrijf je als {van,...,tot}");
        }
        var van = Number(waarden[punten - 1]);
        var tot = Number(waarden[punten + 1]);
        if (!Number.isInteger(van) || !Number.isInteger(tot)) {
          fout("een bereik loopt hier enkel over gehele getallen, niet over \"" +
               waarden[punten - 1] + ",...," + waarden[punten + 1] + "\"");
        }
        var stap = tot >= van ? 1 : -1;
        waarden = waarden.slice(0, punten - 1);
        for (var w = van; stap > 0 ? w <= tot : w >= tot; w += stap) {
          waarden.push(String(w));
        }
      }
      waarden.forEach(function (waarde) {
        if (waarde.indexOf("/") >= 0) {
          fout("een lijst met / (meerdere lusvariabelen) kan hier niet");
        }
      });
      if (!waarden.length) fout("de lijst is leeg");
      if (waarden.length > MAX_WAARDEN) {
        fout("de lijst telt meer dan " + MAX_WAARDEN + " waarden");
      }
      return waarden;
    }

    new CommandMap("mkpi-foreach", { foreach: "ForeachFunctie" }, {
      ForeachFunctie: function (parser, naam) {
        var rest = parser.string.slice(parser.i);
        if (/^\s*\[/.test(rest)) fout("opties tussen [ ] kunnen hier niet");
        var kop = rest.match(/^\s*(\\[a-zA-Z]+)\s*in\s*(?=\{)/);
        if (!kop) {
          fout("schrijf \\foreach \\variabele in {lijst}{lichaam}");
        }
        parser.i += kop[0].length;
        var variabele = kop[1];
        var waarden = waardenUit(parser.GetArgument(naam));
        var lichaam = parser.GetArgument(naam);
        // De lusvariabele mag geen langere macronaam aanraken: \i vervangen in
        // \int zou de formule stil veranderen. Een lichaam zonder de
        // variabele mag: dan herhaalt de lus gewoon hetzelfde stuk.
        var merk = new RegExp("\\" + variabele + "(?![a-zA-Z])", "g");
        gebruik(parser, waarden.map(function (waarde) {
          return lichaam.replace(merk, waarde);
        }).join(""));
      }
    });
    Configuration.create("mkpi-foreach", { handler: { macro: ["mkpi-foreach"] } });

    if (typeof vorigeReady === "function") vorigeReady.call(this);
    else MathJax.startup.defaultReady();
  };
})();
