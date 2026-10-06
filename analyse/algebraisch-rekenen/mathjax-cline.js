/* Een lijn onder enkele kolommen van een array (\cline) voor MathJax.
 *
 * In de PDF trekt \cline{a-b} na een \\ een lijn onder de kolommen a tot en
 * met b, zoals onder elk product van een staartdeling. MathJax kent \cline
 * niet: het heeft enkel \hline, over de hele breedte. lwarp geeft MathJax
 * daarom een \cline die niets doet, zodat de lijn op de site stil wegvalt.
 *
 * Dit bestand geeft MathJax een echte \cline. Bij het lezen gaat het net als
 * \hline van MathJax zelf: de lijn hoort bij de grens onder de laatste
 * voltooide rij, en die rij en de kolommen worden als attribuut data-cline op
 * de tabel (mtable) bewaard, als "rij:a-b" gescheiden door spaties; rij -1 is
 * de bovenrand. Bij het tekenen in SVG komen die lijnen erbij, op de hoogte
 * waar MathJax ook een \hline zou zetten en over de volle breedte van de
 * kolommen, de tussenruimte meegerekend, zoals in LaTeX. Een \cline neemt,
 * net als in LaTeX, geen extra ruimte in.
 *
 * Het dekt \cline{a-b} na een \\ (ook meerdere na elkaar, en boven de eerste
 * of onder de laatste rij) in elke omgeving met rijen van MathJax. Een
 * argument dat niet van de vorm a-b is, a kleiner dan 1, b kleiner dan a of
 * groter dan het aantal kolommen, en een \cline midden in een rij of buiten
 * een tabel geven een fout in beeld in plaats van een stille afwijking van
 * de PDF. Enkel de SVG-uitvoer van MathJax tekent de lijnen; dat is de enige
 * die de sites gebruiken.
 *
 * De pagina laadt dit script na het instellingenblok van lwarp en voor
 * tex-svg-full.js: het wikkelt startup.ready in en voegt zijn pakket toe aan
 * de lijst die lwarp al schreef. mkpi --site haalt de definitie van lwarp
 * voor \cline uit de pagina, anders wint die als macro van dit pakket.
 */
(function () {
  "use strict";

  var config = (window.MathJax = window.MathJax || {});
  config.startup = config.startup || {};
  config.tex = config.tex || {};
  var pakketten = (config.tex.packages = config.tex.packages || {});
  var erbij = (pakketten["[+]"] = pakketten["[+]"] || []);
  if (erbij.indexOf("mkpi-cline") < 0) erbij.push("mkpi-cline");

  var vorigeReady = config.startup.ready;

  var ATTRIBUUT = "data-cline";
  // De dikte van een lijn in een tabel van MathJax, in em.
  var DIKTE = 0.07;

  // "0:2-3 2:1-1" wordt [{rij: 0, van: 2, tot: 3}, {rij: 2, van: 1, tot: 1}].
  function lees(attribuut) {
    return String(attribuut).split(" ").filter(Boolean).map(function (stuk) {
      var m = /^(-?\d+):(\d+)-(\d+)$/.exec(stuk);
      return { rij: +m[1], van: +m[2], tot: +m[3] };
    });
  }

  config.startup.ready = function () {
    var Configuration = MathJax._.input.tex.Configuration.Configuration;
    var CommandMap = MathJax._.input.tex.SymbolMap.CommandMap;
    var TexError = MathJax._.input.tex.TexError.default;
    var ArrayItem = MathJax._.input.tex.base.BaseItems.ArrayItem;
    var SVGmtable = MathJax._.output.svg.Wrappers.mtable.SVGmtable;

    function fout(code, bericht) {
      throw new TexError(code, "\\cline: " + bericht);
    }

    // Lezen: bewaar de lijn bij de tabel, zoals \hline zijn rowlines.
    function cline(parser, naam) {
      var argument = parser.GetArgument(naam);
      var top = parser.stack.Top();
      if (!(top instanceof ArrayItem) || top.row.length || top.Size()) {
        fout("MisplacedCline", "hoort na \\\\, aan het begin van een rij van een tabel");
      }
      var m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(argument);
      if (!m) fout("ClineArgument", "verwacht {a-b}, niet {" + argument + "}");
      var van = +m[1], tot = +m[2];
      if (van < 1 || tot < van) fout("ClineKolommen", "geen kolommen " + van + " tot " + tot);
      var lijn = (top.table.length - 1) + ":" + van + "-" + tot;
      var vorige = top.arraydef[ATTRIBUUT];
      top.arraydef[ATTRIBUUT] = vorige ? vorige + " " + lijn : lijn;
    }

    // Aan het einde van de tabel is het aantal kolommen bekend.
    var maakTabel = ArrayItem.prototype.createMml;
    ArrayItem.prototype.createMml = function () {
      var lijnen = this.arraydef[ATTRIBUUT];
      if (lijnen) {
        var kolommen = Math.max.apply(null, this.table.map(function (rij) {
          return rij.childNodes.length;
        }).concat(0));
        lees(lijnen).forEach(function (lijn) {
          if (lijn.tot > kolommen) {
            fout("ClineKolommen", "kolom " + lijn.tot + " bestaat niet, de tabel heeft er " + kolommen);
          }
        });
      }
      return maakTabel.call(this);
    };

    // Tekenen: na de lijnen van MathJax zelf.
    var rijlijnen = SVGmtable.prototype.handleRowLines;
    SVGmtable.prototype.handleRowLines = function (svg) {
      rijlijnen.call(this, svg);
      var attribuut = this.node.attributes.get(ATTRIBUUT);
      if (!attribuut) return;

      // De hoogte van de grens onder elke rij, en bovenaan (rij -1); zoals
      // handleRowLines van MathJax ze berekent.
      var gelijk = this.node.attributes.get("equalrows");
      var hoogte = this.getEqualRowHeight();
      var data = this.getTableData();
      var ruimte = this.getRowHalfSpacing();
      var y = this.getBBox().h - this.fLine;
      var grens = { "-1": y };
      for (var r = 0; r < this.numRows; r++) {
        var hd = this.getRowHD(gelijk, hoogte, data.H[r], data.D[r]);
        y -= ruimte[r] + hd[0] + hd[1] + ruimte[r + 1];
        grens[r] = y;
        y -= this.rLines[r] || 0;
      }

      // De linker- en rechterrand van elke kolom, met de halve tussenruimte
      // aan weerszijden; zoals handleColumnLines van MathJax ze berekent.
      var tussen = this.getColumnHalfSpacing();
      var breedte = this.getComputedWidths();
      var randen = [];
      var x = this.fLine;
      for (var k = 0; k < this.numCols; k++) {
        var links = x;
        x += tussen[k] + breedte[k] + tussen[k + 1];
        randen.push([links, x]);
        x += this.cLines[k] || 0;
      }

      var adaptor = this.adaptor;
      lees(attribuut).forEach(function (lijn) {
        // makeHLine tekent een lijn een halve dikte onder de hoogte die het
        // krijgt, in de ruimte van een \hline. Een \cline neemt geen ruimte
        // in en ligt dus midden op de grens.
        var element = this.makeHLine(grens[lijn.rij] + DIKTE / 2, "solid", DIKTE);
        adaptor.setAttribute(element, "x1", this.fixed(randen[lijn.van - 1][0]));
        adaptor.setAttribute(element, "x2", this.fixed(randen[lijn.tot - 1][1]));
        adaptor.setAttribute(element, ATTRIBUUT, lijn.van + "-" + lijn.tot);
        adaptor.append(svg, element);
      }, this);
    };

    new CommandMap("mkpi-cline", { cline: "Cline" }, {
      Cline: function (parser, naam) { cline(parser, naam); }
    });
    Configuration.create("mkpi-cline", { handler: { macro: ["mkpi-cline"] } });

    if (typeof vorigeReady === "function") vorigeReady.call(this);
    else MathJax.startup.defaultReady();
  };
})();
