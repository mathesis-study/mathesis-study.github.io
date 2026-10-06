/* Een grote accolade over meerdere rijen van een array, voor MathJax.
 *
 * In de PDF komen \ldelim en \rdelim uit bigdelim: \ldelim\{{2}{*}[T] zet in
 * een cel een accolade die de twee rijen vanaf die cel overspant, met het
 * opschrift T ervoor, verticaal in het midden. MathJax kent bigdelim niet, en
 * cellen over meerdere rijen ook niet. lwarp geeft MathJax daarom een
 * \ldelim die enkel het opschrift met een gewone accolade in de eerste rij
 * zet; de accolade overspant niets en het opschrift staat te hoog.
 *
 * Dit bestand geeft MathJax een eigen \ldelim en \rdelim. Het macro kijkt in
 * de formule vooruit en leest de rijen die de accolade moet overspannen. Van
 * die rijen maakt het een onzichtbare array met dezelfde cellen; omdat die
 * hetzelfde soort array is, krijgen haar rijen dezelfde hoogte en dezelfde
 * tussenruimte als in de echte tabel, wat er ook in de cellen staat. Rond die
 * onzichtbare array komt de accolade met \left ... \right., met het opschrift
 * ernaast, net zoals bigdelim het in de PDF doet. Dat geheel wordt daarna zo
 * verschoven dat zijn bovenrand op de bovenrand van de eerste rij valt, en
 * telt zelf niet mee voor de hoogte van de rij (mpadded met voffset in
 * eenheden van de eigen hoogte). Zo blijft de rest van de tabel staan zoals
 * ze stond, en valt de accolade precies over haar rijen.
 *
 * Het dekt de vorm van bigdelim: \ldelim<haak>{<rijen>}{<breedte>}[<tekst>],
 * met het optionele argument voor bigstruts dat lwarp ook kent. De breedte *
 * is de natuurlijke breedte; een lengte zet de breedte van de cel vast. Een
 * \hline tussen de overspannen rijen telt mee, een ervoor of erna niet. Zijn
 * er minder rijen dan gevraagd, of staat het macro niet in een omgeving met
 * rijen, dan komt er een fout in beeld in plaats van een stille afwijking van
 * de PDF.
 *
 * De pagina laadt dit script na het instellingenblok van lwarp en voor
 * tex-svg-full.js: het wikkelt startup.ready in en voegt zijn pakket toe aan
 * de lijst die lwarp al schreef. mkpi --site haalt de definities van lwarp
 * voor \ldelim en \rdelim uit de pagina, anders winnen die als macro's van de
 * pagina van dit pakket.
 */
(function () {
  "use strict";

  var config = (window.MathJax = window.MathJax || {});
  config.startup = config.startup || {};
  config.tex = config.tex || {};
  var pakketten = (config.tex.packages = config.tex.packages || {});
  var erbij = (pakketten["[+]"] = pakketten["[+]"] || []);
  if (erbij.indexOf("mkpi-bigdelim") < 0) erbij.push("mkpi-bigdelim");

  var vorigeReady = config.startup.ready;

  // Omgevingen met een argument voor de kolommen, dat geen deel is van de
  // eerste rij.
  var MET_KOLOMMEN = /^(array|darray|subarray|tabular)$/;
  // Wat voor een rij een lijn trekt; dat hoort bij de grens erboven.
  var LIJN = /^\s*(\\hline\b|\\hdashline\b|\\cline\s*\{[^{}]*\})\s*/;

  // Lees bij positie i een besturingsreeks: \naam, \\ of \{.
  function reeks(tekst, i) {
    var j = i + 1;
    if (/[A-Za-z]/.test(tekst.charAt(j))) {
      while (j < tekst.length && /[A-Za-z]/.test(tekst.charAt(j))) j++;
    } else {
      j++;
    }
    return tekst.slice(i, j);
  }

  function spaties(tekst, i) {
    while (i < tekst.length && /\s/.test(tekst.charAt(i))) i++;
    return i;
  }

  // Positie na een groep tussen haakjes open/dicht die bij i begint (na
  // spaties), of i zelf als daar geen groep staat.
  function naGroep(tekst, i, open, dicht) {
    var j = spaties(tekst, i);
    if (tekst.charAt(j) !== open) return i;
    var diepte = 0;
    for (; j < tekst.length; j++) {
      var teken = tekst.charAt(j);
      if (teken === "\\") { j++; continue; }
      if (teken === open) diepte++;
      else if (teken === dicht && --diepte === 0) return j + 1;
    }
    return tekst.length;
  }

  // Waar begint de rij waarin positie p staat? Loop de formule van voor af
  // door en houd per omgeving het begin van de lopende rij bij.
  function beginVanRij(tekst, p) {
    var stapel = [{ rij: 0, diepte: 0, rijen: false }];
    var diepte = 0;
    for (var i = 0; i < p; i++) {
      var teken = tekst.charAt(i);
      var top = stapel[stapel.length - 1];
      if (teken === "{") { diepte++; continue; }
      if (teken === "}") { diepte--; continue; }
      if (teken !== "\\") continue;
      var cs = reeks(tekst, i);
      if (cs === "\\begin" || cs === "\\end") {
        var na = naGroep(tekst, i + cs.length, "{", "}");
        var naam = tekst.slice(i + cs.length, na).replace(/[\s{}]/g, "");
        if (cs === "\\begin") {
          if (MET_KOLOMMEN.test(naam)) {
            na = naGroep(tekst, na, "[", "]");
            na = naGroep(tekst, na, "{", "}");
          }
          stapel.push({ rij: na, diepte: diepte, rijen: true });
        } else if (stapel.length > 1) {
          stapel.pop();
        }
        i = na - 1;
        continue;
      }
      if (cs === "\\\\" && diepte === top.diepte) top.rij = i + 2;
      i += cs.length - 1;
    }
    return stapel[stapel.length - 1];
  }

  // De rijen vanaf positie begin tot het einde van de omgeving, elk met de
  // scheiding die erop volgt (\\ met een eventuele extra ruimte).
  function rijenVanaf(tekst, begin) {
    var rijen = [];
    var diepte = 0;
    var start = begin;
    for (var i = begin; i < tekst.length; i++) {
      var teken = tekst.charAt(i);
      if (teken === "{") { diepte++; continue; }
      if (teken === "}") { diepte--; continue; }
      if (teken !== "\\") continue;
      var cs = reeks(tekst, i);
      if (cs === "\\begin") { diepte++; i += cs.length - 1; continue; }
      if (cs === "\\end") {
        if (diepte === 0) break;
        diepte--;
        i += cs.length - 1;
        continue;
      }
      if (cs === "\\\\" && diepte === 0) {
        var na = naGroep(tekst, i + 2, "[", "]");
        rijen.push({ tekst: tekst.slice(start, i), scheiding: tekst.slice(i, na) });
        start = na;
        i = na - 1;
        continue;
      }
      i += cs.length - 1;
    }
    rijen.push({ tekst: tekst.slice(start, i), scheiding: "" });
    return rijen;
  }

  // Haal \ldelim en \rdelim met hun argumenten uit een rij, zodat de
  // onzichtbare kopie van de rijen geen accolades opnieuw gaat bouwen.
  function zonderDelims(tekst) {
    var uit = "";
    for (var i = 0; i < tekst.length; i++) {
      var teken = tekst.charAt(i);
      if (teken !== "\\") { uit += teken; continue; }
      var cs = reeks(tekst, i);
      if (cs !== "\\ldelim" && cs !== "\\rdelim") {
        uit += cs;
        i += cs.length - 1;
        continue;
      }
      var j = spaties(tekst, i + cs.length);
      // De haak: een besturingsreeks of één teken.
      j = tekst.charAt(j) === "\\" ? j + reeks(tekst, j).length
        : (tekst.charAt(j) === "{" ? naGroep(tekst, j, "{", "}") : j + 1);
      j = naGroep(tekst, j, "{", "}");
      j = naGroep(tekst, j, "[", "]");
      j = naGroep(tekst, j, "{", "}");
      j = naGroep(tekst, j, "[", "]");
      i = j - 1;
    }
    return uit;
  }

  config.startup.ready = function () {
    var Configuration = MathJax._.input.tex.Configuration.Configuration;
    var CommandMap = MathJax._.input.tex.SymbolMap.CommandMap;
    var TexParser = MathJax._.input.tex.TexParser.default;
    var TexError = MathJax._.input.tex.TexError.default;

    function fout(naam, bericht) {
      throw new TexError("BigdelimFout", naam + ": " + bericht);
    }

    // Een onzichtbare array met de gegeven rijen; met [t] ligt haar basislijn
    // op die van de eerste rij, zonder optie in het midden zoals de tabel.
    function spook(rijen, bovenaan) {
      var kolommen = 1;
      var body = rijen.map(function (rij, k) {
        var tekst = zonderDelims(rij.tekst);
        // Een lijn boven de eerste rij hoort bij de grens erboven.
        if (k === 0) while (LIJN.test(tekst)) tekst = tekst.replace(LIJN, "");
        kolommen = Math.max(kolommen, tekst.split("&").length);
        return tekst + (k < rijen.length - 1 ? rij.scheiding : "");
      }).join(" ");
      return "\\vphantom{\\begin{array}" + (bovenaan ? "[t]" : "") +
        "{" + new Array(kolommen + 1).join("c") + "}" + body + "\\end{array}}";
    }

    function delim(parser, naam, links) {
      var plek = parser.string.lastIndexOf(naam, parser.i);
      var haak = parser.GetArgument(naam);
      var aantal = parseInt(parser.GetArgument(naam), 10);
      parser.GetBrackets(naam, "");
      var breedte = parser.GetArgument(naam).trim();
      var opschrift = parser.GetBrackets(naam, "");
      if (!(aantal >= 1)) fout(naam, "het aantal rijen is geen positief geheel getal");

      var tekst = parser.string;
      var omgeving = beginVanRij(tekst, plek);
      if (!omgeving.rijen) fout(naam, "staat niet in een array");
      // De eerste rij zonder dit macro zelf: wat ervoor en erna in de rij staat.
      var rijen = rijenVanaf(tekst, omgeving.rij);
      if (rijen.length < aantal) {
        fout(naam, "overspant " + aantal + " rijen, maar er zijn er maar " + rijen.length);
      }
      rijen = rijen.slice(0, aantal);

      var label = opschrift ? "\\text{" + opschrift + "}" : "";
      var midden = spook(rijen, false);
      var groep = links
        ? label + "\\left" + haak + midden + "\\right."
        : "\\left." + midden + "\\right" + haak + label;

      var maak = function (bron) {
        return new TexParser(bron, parser.stack.env, parser.configuration).mml();
      };
      // Eerst met de bovenrand op de basislijn en zonder hoogte, dan omhoog
      // tot de bovenrand van de eerste rij. Het geheel telt niet mee voor de
      // hoogte van de rij.
      var omlaag = parser.create("node", "mpadded", [maak(groep)], {
        height: "0", voffset: "-1height"
      });
      var eersteRij = maak(spook(rijen.slice(0, 1), true));
      var rij = parser.create("node", "mrow", [eersteRij, omlaag]);
      var eigenschappen = { height: "0", depth: "0", voffset: "1height" };
      if (breedte && breedte !== "*") eigenschappen.width = breedte;
      parser.Push(parser.create("node", "mpadded", [rij], eigenschappen));
    }

    new CommandMap("mkpi-bigdelim", {
      ldelim: ["Delim", true],
      rdelim: ["Delim", false]
    }, {
      Delim: function (parser, naam, links) { delim(parser, naam, links); }
    });
    Configuration.create("mkpi-bigdelim", { handler: { macro: ["mkpi-bigdelim"] } });

    if (typeof vorigeReady === "function") vorigeReady.call(this);
    else MathJax.startup.defaultReady();
  };
})();
