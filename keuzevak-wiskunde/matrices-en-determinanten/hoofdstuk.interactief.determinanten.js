/* Interactieve grafieken bij L03_Determinanten.tex.
 *
 * Een determinant is één getal, maar dat getal komt uit een recept: schrappen,
 * een teken kiezen, vermenigvuldigen, optellen. Op papier staat dat recept in
 * zijn eindstand, en een leerling die het zelf probeert, weet niet waar hij
 * de draad kwijt is. Hier voert de leerling het recept stap voor stap uit en
 * ziet hij bij elke stap welke elementen meedoen. Twee grafieken tonen de
 * determinant ook als oppervlakte, zodat de eigenschappen een beeld krijgen.
 *
 * Het werkblad voor matrices op een bord komt uit web/matrixbord.js, samen
 * met L01_Matrices. Dezelfde grafieken staan ook in het keuzevak Matrices en
 * determinanten, dat dit bestand via een link als deelmodule inleest; de
 * namen beginnen daarom allemaal met det-, zodat ze niet botsen met die van
 * L01.
 *
 * mkpi: gebruikt matrixbord.js
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var M = window.Matrixbord;
  if (!G || !M) return;

  var ONDER = M.ONDER;
  var BOVEN = M.BOVEN;
  var index = M.index;
  var el = M.el;
  var net = M.net;
  var haakjes = M.haakjes;
  var maakWerkblad = M.maakWerkblad;
  var klikPunt = M.klikPunt;
  var matrixBord = M.matrixBord;

  /* --- Kleine hulpjes ---------------------------------------------------- */

  function sub(n) { return index(n, ONDER); }
  function sup(n) { return index(n, BOVEN); }
  function lijnNaam(soort, n) { return (soort === "R" ? "R" : "K") + sub(n); }
  function minorNaam(i, j) { return "M" + sub(i) + sub(j); }
  function cofactorNaam(i, j) { return "A" + sub(i) + sub(j); }
  function teken(i, j) { return (i + j) % 2 === 0 ? 1 : -1; }

  // (−1)²⁺³: het teken van de cofactor zoals de cursus het schrijft.
  function tekenMacht(i, j) { return "(−1)" + sup(i) + "⁺" + sup(j); }

  function getal(x) { return net(String(x)); }

  // Een som van getallen zoals je ze opschrijft: 12 − 12 + 4, niet
  // 12 + −12 + 4.
  function somTekst(getallen) {
    return getallen.map(function (x, k) {
      if (k === 0) return getal(x);
      return (x < 0 ? " − " : " + ") + Math.abs(x);
    }).join("");
  }

  // Regels van het bord als lopende tekst voor ctx.toon: elke regel wordt
  // een zin, ook als ze op het bord zonder punt eindigt.
  function zinnen(regels) {
    return regels.filter(Boolean).map(function (r) {
      r = r.trim();
      return /[.?:!]$/.test(r) ? r : r + ".";
    }).join(" ");
  }

  function kopie(A) {
    return A.map(function (rij) { return rij.slice(); });
  }

  // Schrap rij i en kolom j (vanaf 1 geteld).
  function minor(A, i, j) {
    var uit = [];
    for (var r = 0; r < A.length; r++) {
      if (r === i - 1) continue;
      var rij = [];
      for (var k = 0; k < A.length; k++) if (k !== j - 1) rij.push(A[r][k]);
      uit.push(rij);
    }
    return uit;
  }

  function det(A) {
    if (A.length === 1) return A[0][0];
    if (A.length === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    var s = 0;
    for (var j = 1; j <= A.length; j++) {
      if (A[0][j - 1] !== 0) s += teken(1, j) * A[0][j - 1] * det(minor(A, 1, j));
    }
    return s;
  }

  function cofactor(A, i, j) { return teken(i, j) * det(minor(A, i, j)); }

  // Welke rij of kolom van het origineel hoort bij rij r van de minor
  // zonder rij i?
  function origineel(r, geschrapt) { return r < geschrapt ? r : r + 1; }

  // Een 2×2-determinant uitgeschreven: p·s − q·r.
  function kruisTekst(m) {
    return haakjes(m[0][0]) + "·" + haakjes(m[1][1]) + " − " +
      haakjes(m[0][1]) + "·" + haakjes(m[1][0]);
  }

  // Een willekeurige vierkante matrix met kleine gehele getallen en minstens
  // één nul, zodat er altijd iets te kiezen valt.
  function willekeurig(n) {
    var A;
    do {
      A = [];
      for (var i = 0; i < n; i++) {
        A.push([]);
        for (var j = 0; j < n; j++) A[i].push(Math.floor(Math.random() * 11) - 5);
      }
      A[Math.floor(Math.random() * n)][Math.floor(Math.random() * n)] = 0;
    } while (Math.abs(det(A)) > 150);
    return A;
  }

  // Een lijnstuk tussen twee punten die van de toestand afhangen.
  function lijnstuk(ctx, bord, a, b, rol, o) {
    function punt(f) {
      return bord.create("point", [
        function () { return f()[0]; },
        function () { return f()[1]; }
      ], { visible: false, fixed: true, name: "", withLabel: false });
    }
    return ctx.stijl(bord.create("segment", [punt(a), punt(b)], {
      strokeWidth: o.dikte || 2,
      dash: o.streep || 0,
      strokeOpacity: o.opaciteit || 1,
      fixed: true, highlight: false,
      visible: o.zichtbaar || true
    }), rol);
  }

  // Regels tekst onder de matrices, gecentreerd. De inhoud zet de figuur in
  // regels.tekst; de hoogte volgt uit de lay-out.
  function maakRegels(wb, bord, aantal, y) {
    var regels = { tekst: [] };
    for (var k = 0; k < aantal; k++) {
      (function (k) {
        wb.tekst(bord, 0, function () { return y(k); },
          function () { return regels.tekst[k] || ""; }, "tekst",
          { factor: 0.85 });
      }(k));
    }
    return regels;
  }

  // Een knop die aan of uit staat, zoals Letters of Tekenpatroon.
  function schakel(knop, aan) {
    knop.setAttribute("aria-pressed", String(!!aan));
  }

  /* --- Determinant in een tekstvak --------------------------------------- */

  // Op een bord met een assenstelsel staan de getallen van de determinant in
  // een klein HTML-tabelletje tussen twee strepen. De kleuren komen uit de
  // CSS-variabelen van de rollen, zodat ze de dag- en nachtstand volgen.
  function detTabel(rijen, kolomkleuren) {
    var html = '<table style="display:inline-table;vertical-align:middle;' +
      'border-collapse:collapse;border:0;border-left:1.5px solid currentColor;' +
      'border-right:1.5px solid currentColor;margin:0 .3em">';
    rijen.forEach(function (rij) {
      html += "<tr>" + rij.map(function (c, j) {
        var kleur = kolomkleuren && kolomkleuren[j]
          ? "color:var(--grafiek-" + kolomkleuren[j] + ");" : "";
        return '<td style="' + kleur + 'border:0;padding:.05em .45em;' +
          'text-align:right">' + c + "</td>";
      }).join("") + "</tr>";
    });
    return html + "</table>";
  }

  function kleurtekst(tekst, rol) {
    return '<span style="color:var(--grafiek-' + rol + ')">' + tekst + "</span>";
  }

  function tekstvak(ctx, bord, x, y, inhoud) {
    var t = bord.create("text", [x, y, inhoud], {
      anchorX: "left", anchorY: "top", fixed: true, highlight: false,
      useMathJax: false, fontSize: 15,
      cssStyle: "background:var(--kleur-vlak-zweef);padding:.35em .6em;" +
        "line-height:1.55;border-radius:4px;white-space:nowrap"
    });
    return ctx.stijl(t, "tekst");
  }

  // Een sleepbaar roosterpunt dat binnen het bord blijft.
  function roosterpunt(ctx, bord, xy, naam, rol, grens) {
    var p = ctx.stijl(bord.create("point", xy, {
      name: naam, size: 4, showInfobox: false,
      snapToGrid: true, snapSizeX: 1, snapSizeY: 1,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [8, 12] }
    }), rol);
    p.on("drag", function () {
      var x = Math.max(grens[0], Math.min(grens[2], Math.round(p.X())));
      var y = Math.max(grens[3], Math.min(grens[1], Math.round(p.Y())));
      if (x !== p.X() || y !== p.Y()) {
        p.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
      }
    });
    return p;
  }

  // Een rooster met stap 1 en zonder fijnere lijnen: zo kan de leerling de
  // eenheidsvierkanten tellen en de oppervlakte zelf nagaan.
  function eenheidsrooster(ctx, bord) {
    return ctx.stijl(bord.create("grid", [], {
      majorStep: 1, minorElements: 0, strokeOpacity: 1, fixed: true, highlight: false
    }), "raster");
  }

  // Een assenstelsel met gelijke schaal en een tekstvak ernaast. JSXGraph
  // houdt bij gelijke schaal de hoogte vast en knipt anders links en rechts
  // een stuk van het vlak af. Hier kiezen we zelf het venster: het hele
  // vlak (plot = [links, boven, rechts, onder]) blijft zichtbaar, en het
  // tekstvak (pw bij ph pixels) komt ernaast op een breed bord en eronder op
  // een smal. Het resultaat is de plaats van de linkerbovenhoek van het vak.
  function schikBord(bord, plot, pw, ph) {
    var w = bord.canvasWidth, h = bord.canvasHeight;
    var dx = plot[2] - plot[0], dy = plot[1] - plot[3];
    if (!w || !h) return [plot[2], plot[1]];
    var marge = 12;
    var naast = Math.min((w - pw - marge) / dx, h / dy);
    var onder = Math.min(w / dx, (h - ph - marge) / dy);
    var s = Math.max(Math.max(naast, onder), 4);
    var breed = w / s, hoog = h / s;
    var box, vak;
    if (naast >= onder) {
      var links = plot[0] - (breed - dx - (pw + marge) / s) / 2;
      var boven = plot[1] + (hoog - dy) / 2;
      box = [links, boven, links + breed, boven - hoog];
      vak = [plot[2] + marge / s, plot[1]];
    } else {
      var boven2 = plot[1] + (hoog - dy - (ph + marge) / s) / 2;
      var links2 = plot[0] - (breed - dx) / 2;
      box = [links2, boven2, links2 + breed, boven2 - hoog];
      vak = [plot[0], plot[3] - marge / s];
    }
    bord.presBegrenzing = box;
    bord.presGelijkeSchaal = true;
    try { bord.setBoundingBox(box, true); } catch (fout) { /* niets */ }
    return vak;
  }

  function zetPunt(p, xy) {
    p.setPosition(window.JXG.COORDS_BY_USER, xy);
  }

  /* --- 1. De determinant als oppervlakte --------------------------------- */

  // De kolommen van een 2×2-matrix zijn twee vectoren. De leerling versleept
  // hun eindpunten en ziet det A en de oppervlakte van het parallellogram
  // samen veranderen, met het teken als oriëntatie. In de variant met
  // eigenschappen doen de knoppen de kolombewerkingen uit het hoofdstuk, en
  // zie je waarom het teken omkeert, de determinant verdubbelt of net gelijk
  // blijft.
  function oppervlakteFiguur(ctx, opties) {
    // Elke vector blijft binnen GRENS, en ook het vierde hoekpunt v₁ + v₂
    // blijft in het vlak, zodat het parallellogram nooit onder het tekstvak
    // verdwijnt.
    var GRENS = [-4, 5, 6, -3];
    var HOEK = [-5, 6, 7, -3];
    var BEGIN = [[3, 0], [1, 2]];
    var PLOT = [-5.6, 6.6, 7.6, -3.6];
    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var st = { vorige: "", vak: [PLOT[2], PLOT[1]] };
    function schik() {
      st.vak = schikBord(bord, PLOT, 320, opties.eigenschappen ? 300 : 200);
      bord.fullUpdate();
    }

    var O = bord.create("point", [0, 0], { visible: false, fixed: true, name: "" });
    var v1 = roosterpunt(ctx, bord, BEGIN[0], "v₁", "punt", GRENS);
    var v2 = roosterpunt(ctx, bord, BEGIN[1], "v₂", "secante", GRENS);
    var S = bord.create("point", [
      function () { return v1.X() + v2.X(); },
      function () { return v1.Y() + v2.Y(); }
    ], { visible: false, fixed: true, name: "" });

    function waarde() {
      return Math.round(v1.X() * v2.Y() - v2.X() * v1.Y());
    }

    // Het vlak kleurt groen bij een positieve en oranje bij een negatieve
    // determinant; de tekst ernaast zegt hetzelfde in woorden.
    bord.create("polygon", [O, v1, S, v2], {
      fixed: true, highlight: false, fillOpacity: 0.28, layer: 0,
      fillColor: function () {
        return waarde() >= 0 ? kleuren.afgeleide : kleuren.secante;
      },
      borders: { strokeWidth: 1, dash: 2, strokeColor: function () { return kleuren.hulp; } },
      vertices: { visible: false }
    });
    ctx.stijl(bord.create("arrow", [O, v1], { strokeWidth: 3, fixed: true, highlight: false }), "punt");
    ctx.stijl(bord.create("arrow", [O, v2], { strokeWidth: 3, fixed: true, highlight: false }), "secante");

    // Een boogje van v₁ naar v₂ langs de kortste weg: tegen de wijzers van
    // de klok in bij een positieve determinant, met de wijzers mee bij een
    // negatieve.
    function opBoog(v) {
      return function () {
        var r = Math.sqrt(v.X() * v.X() + v.Y() * v.Y()) || 1;
        return [0.9 * v.X() / r, 0.9 * v.Y() / r];
      };
    }
    var b1 = bord.create("point", [function () { return opBoog(v1)()[0]; },
      function () { return opBoog(v1)()[1]; }], { visible: false, fixed: true, name: "" });
    var b2 = bord.create("point", [function () { return opBoog(v2)()[0]; },
      function () { return opBoog(v2)()[1]; }], { visible: false, fixed: true, name: "" });
    ctx.stijl(bord.create("arc", [O, b1, b2], {
      strokeWidth: 1.5, lastArrow: { type: 2, size: 6 }, fixed: true, highlight: false,
      visible: function () { return waarde() > 0; }
    }), "tekst");
    ctx.stijl(bord.create("arc", [O, b2, b1], {
      strokeWidth: 1.5, firstArrow: { type: 2, size: 6 }, fixed: true, highlight: false,
      visible: function () { return waarde() < 0; }
    }), "tekst");

    function paneel() {
      var a = Math.round(v1.X()), c = Math.round(v1.Y());
      var b = Math.round(v2.X()), d = Math.round(v2.Y());
      var D = waarde();
      var html = "A = (" + kleurtekst("v₁", "punt") + " " +
        kleurtekst("v₂", "secante") + ")<br>det A = " +
        detTabel([[getal(a), getal(b)], [getal(c), getal(d)]], ["punt", "secante"]) +
        " = " + haakjes(a) + "·" + haakjes(d) + " − " + haakjes(b) + "·" +
        haakjes(c) + " = <b>" + getal(D) + "</b><br>" +
        "oppervlakte = |det A| = " + Math.abs(D) + "<br>";
      if (D > 0) {
        html += "det A &gt; 0: van v₁ naar v₂ draai je<br>tegen de wijzers van de klok in";
      } else if (D < 0) {
        html += "det A &lt; 0: van v₁ naar v₂ draai je<br>met de wijzers van de klok mee";
      } else {
        html += "det A = 0: v₁ en v₂ liggen op één rechte,<br>er is geen parallellogram";
      }
      if (st.vorige) html += "<br><br>" + st.vorige;
      return html;
    }
    tekstvak(ctx, bord, function () { return st.vak[0]; },
      function () { return st.vak[1]; }, paneel);

    function beschrijving() {
      var D = waarde();
      return "v₁ = (" + getal(Math.round(v1.X())) + ", " + getal(Math.round(v1.Y())) +
        ") en v₂ = (" + getal(Math.round(v2.X())) + ", " + getal(Math.round(v2.Y())) +
        "). det A = " + getal(D) + ", de oppervlakte van het parallellogram is " +
        Math.abs(D) + "." + (st.vorige ? " " + st.vorige.replace(/<[^>]+>/g, " ") : "");
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });
    function binnen(p, grens) {
      var g = grens || GRENS;
      return p[0] >= g[0] && p[0] <= g[2] && p[1] >= g[3] && p[1] <= g[1];
    }

    // Het laatste goede roosterpunt van elke vector: valt v₁ + v₂ buiten het
    // vlak, dan springt de gesleepte vector daarheen terug.
    var goed = [BEGIN[0], BEGIN[1]];
    bord.on("update", function () {
      if (binnen([S.X(), S.Y()], HOEK)) {
        goed = [[Math.round(v1.X()), Math.round(v1.Y())],
                [Math.round(v2.X()), Math.round(v2.Y())]];
      }
    });
    [v1, v2].forEach(function (v, k) {
      v.on("drag", function () {
        st.vorige = "";
        if (!binnen([S.X(), S.Y()], HOEK)) zetPunt(v, goed[k]);
      });
    });

    // Een kolombewerking: nieuwe v₁ en v₂, en in woorden wat er met de
    // determinant gebeurt.
    function bewerk(naam, f, uitleg) {
      var oud = waarde();
      var p = [Math.round(v1.X()), Math.round(v1.Y())];
      var q = [Math.round(v2.X()), Math.round(v2.Y())];
      var nieuw = f(p, q);
      var hoek = [nieuw[0][0] + nieuw[1][0], nieuw[0][1] + nieuw[1][1]];
      if (!binnen(nieuw[0]) || !binnen(nieuw[1]) || !binnen(hoek, HOEK)) {
        st.vorige = naam + " past niet meer op het bord.<br>Maak v₁ en v₂ eerst wat korter.";
      } else {
        zetPunt(v1, nieuw[0]);
        zetPunt(v2, nieuw[1]);
        st.vorige = "<b>" + naam + "</b>: det A gaat van " + getal(oud) + " naar " +
          getal(waarde()) + ".<br>" + uitleg;
      }
      bord.update();
    }

    if (opties.eigenschappen) {
      ctx.knop("K₁ ↔ K₂", function () {
        bewerk("K₁ ↔ K₂", function (p, q) { return [q, p]; },
          "Kolommen gewisseld: de draaizin keert om,<br>dus ook het teken. De oppervlakte blijft.");
      });
      ctx.knop("K₁ × 2", function () {
        bewerk("K₁ ← 2K₁", function (p, q) { return [[2 * p[0], 2 * p[1]], q]; },
          "Eén kolom maal 2: het parallellogram wordt<br>twee keer zo lang, de determinant ook.");
      });
      ctx.knop("K₁ × (−1)", function () {
        bewerk("K₁ ← −K₁", function (p, q) { return [[-p[0], -p[1]], q]; },
          "Eén kolom maal −1: de oppervlakte blijft,<br>de draaizin en dus het teken keren om.");
      });
      ctx.knop("K₂ + K₁", function () {
        bewerk("K₂ ← K₂ + K₁", function (p, q) { return [p, [q[0] + p[0], q[1] + p[1]]]; },
          "Een kolom erbij opgeteld: het parallellogram<br>schuift scheef, maar basis en hoogte blijven.<br>De determinant blijft gelijk.");
      });
      ctx.knop("K₂ − K₁", function () {
        bewerk("K₂ ← K₂ − K₁", function (p, q) { return [p, [q[0] - p[0], q[1] - p[1]]]; },
          "Een kolom ervan afgetrokken: het parallellogram<br>schuift terug. De determinant blijft gelijk.");
      });
      ctx.knop("A × 2", function () {
        bewerk("A ← 2A", function (p, q) {
          return [[2 * p[0], 2 * p[1]], [2 * q[0], 2 * q[1]]];
        }, "Beide kolommen maal 2: twee keer zo breed<br>én twee keer zo hoog, dus det(2A) = 2²·det A.");
      });
    }

    function herstel() {
      zetPunt(v1, BEGIN[0]);
      zetPunt(v2, BEGIN[1]);
      st.vorige = "";
      bord.update();
    }

    schik();
    ctx.toon(beschrijving());
    return {
      reset: herstel,
      herschaal: schik,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  }

  G.registreer("det-oppervlakte", function (ctx) {
    return oppervlakteFiguur(ctx, {});
  });
  G.registreer("det-eigenschappen-meetkundig", function (ctx) {
    return oppervlakteFiguur(ctx, { eigenschappen: true });
  });

  /* --- 2. Minor en cofactor ---------------------------------------------- */

  // Klik op een element: zijn rij en kolom worden geschrapt, de minor staat
  // ernaast en daaronder het teken uit (−1)^(i+j). Het tekenpatroon kan als
  // schaakbord over de matrix. In de variant voor de adjunctmatrix verzamel
  // je de cofactoren in een eigen matrix en transponeer je die daarna.
  function cofactorFiguur(ctx, opties) {
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var n = 3;
    var A = kopie(opties.begin);
    var st = { i: 0, j: 0, patroon: false, letters: false, adj: false, gedaan: {}, x: {} };
    var TUSSEN = 1.2;
    var Y = 1.3;

    function gekozen() { return st.i > 0; }

    var mA = wb.matrix(bord, {
      rijen: n, kolommen: n, naam: "A",
      x: function () { return st.x.A; }, y: Y,
      waarde: function (i, j) {
        return st.letters ? el("a", i, j) : getal(A[i - 1][j - 1]);
      },
      opaciteit: function (i, j) {
        if (!gekozen() || (i === st.i && j === st.j)) return 1;
        return i === st.i || j === st.j ? 0.25 : 1;
      }
    });
    var merk = mA.markeer("punt");

    var mM = wb.matrix(bord, {
      rijen: n - 1, kolommen: n - 1, haken: "strepen",
      x: function () { return st.x.M; }, y: Y,
      zichtbaar: gekozen,
      naam: function () { return gekozen() ? minorNaam(st.i, st.j) : ""; },
      waarde: function (r, k) {
        if (!gekozen()) return "";
        var i = origineel(r, st.i), j = origineel(k, st.j);
        return st.letters ? el("a", i, j) : getal(A[i - 1][j - 1]);
      }
    });

    var mC = null;
    if (opties.verzamel) {
      mC = wb.matrix(bord, {
        rijen: n, kolommen: n,
        x: function () { return st.x.C; }, y: Y,
        naam: function () { return st.adj ? "adj A = (cofactoren)ᵀ" : "cofactoren"; },
        waarde: function (i, j) {
          var r = st.adj ? j : i, k = st.adj ? i : j;
          if (st.letters) return cofactorNaam(r, k);
          return st.gedaan[r + "," + k] ? getal(cofactor(A, r, k)) : "·";
        }
      });
    }

    // Het schaakbord van tekens, klein rechtsboven in elke cel.
    for (var i = 1; i <= n; i++) {
      for (var j = 1; j <= n; j++) {
        (function (i, j) {
          wb.tekst(bord,
            function () { return mA.celX(j) + 0.45; },
            function () { return mA.celY(i) + 0.3; },
            teken(i, j) > 0 ? "+" : "−", teken(i, j) > 0 ? "punt" : "secante",
            { factor: 0.75, vet: true, visible: function () { return st.patroon; } });
        }(i, j));
      }
    }

    // De geschrapte rij en kolom, zoals je ze op papier doorstreept.
    lijnstuk(ctx, bord,
      function () { return [mA.links() - 0.15, mA.celY(st.i || 1)]; },
      function () { return [mA.links() + mA.breedte() + 0.15, mA.celY(st.i || 1)]; },
      "secante", { dikte: 1.5, opaciteit: 0.7, zichtbaar: gekozen });
    lijnstuk(ctx, bord,
      function () { return [mA.celX(st.j || 1), mA.boven() + 0.15]; },
      function () { return [mA.celX(st.j || 1), mA.boven() - mA.hoogte() - 0.15]; },
      "secante", { dikte: 1.5, opaciteit: 0.7, zichtbaar: gekozen });

    var regels = maakRegels(wb, bord, 3, function (k) { return Y - 2.4 - 0.8 * k; });

    function breedte() {
      var b = mA.volleBreedte() + TUSSEN + mM.volleBreedte();
      if (mC) b += TUSSEN + mC.volleBreedte();
      return b;
    }

    wb.venster(bord, function () { return [Math.max(breedte(), 11) + 0.4, 8.2]; });

    function herplaats() {
      var x = -breedte() / 2;
      st.x.A = x + mA.volleBreedte() / 2;
      x += mA.volleBreedte() + TUSSEN;
      st.x.M = x + mM.volleBreedte() / 2;
      x += mM.volleBreedte() + TUSSEN;
      if (mC) st.x.C = x + mC.volleBreedte() / 2;
    }

    function minorTekst() {
      var m = minor(A, st.i, st.j);
      if (st.letters) {
        var i1 = origineel(1, st.i), i2 = origineel(2, st.i);
        var j1 = origineel(1, st.j), j2 = origineel(2, st.j);
        return minorNaam(st.i, st.j) + " = " + el("a", i1, j1) + el("a", i2, j2) +
          " − " + el("a", i1, j2) + el("a", i2, j1);
      }
      return minorNaam(st.i, st.j) + " = " + kruisTekst(m) + " = " + getal(det(m));
    }

    function cofactorTekst() {
      var t = teken(st.i, st.j);
      var basis = cofactorNaam(st.i, st.j) + " = " + tekenMacht(st.i, st.j) + " · " +
        minorNaam(st.i, st.j) + " = " + (t > 0 ? "+" : "−") + minorNaam(st.i, st.j);
      if (st.letters) return basis;
      var m = det(minor(A, st.i, st.j));
      if (t > 0) return basis + " = " + getal(m);
      return basis + " = −" + haakjes(m) + " = " + getal(-m);
    }

    function allesGedaan() {
      for (var i = 1; i <= n; i++) {
        for (var j = 1; j <= n; j++) if (!st.gedaan[i + "," + j]) return false;
      }
      return true;
    }

    function werkBij() {
      if (gekozen()) merk.zet(st.i, st.j); else merk.verberg();
      if (!gekozen()) {
        regels.tekst = ["Klik op een element van A.", "", ""];
      } else {
        regels.tekst = [
          "Schrap rij " + st.i + " en kolom " + st.j + " van A: wat overblijft, is de minor " +
            minorNaam(st.i, st.j) + ".",
          minorTekst(),
          cofactorTekst()
        ];
      }
      if (mC && st.adj && allesGedaan() && !st.letters) {
        var D = det(A);
        regels.tekst[0] = D === 0
          ? "det A = 0: A heeft geen omgekeerde matrix."
          : "det A = " + getal(D) + ", dus A⁻¹ = (1/" + getal(D) + ") · adj A.";
      }
      herplaats();
      wb.pas();
      ctx.toon(zinnen(regels.tekst));
    }

    function kies(i, j) {
      st.i = i;
      st.j = j;
      st.gedaan[i + "," + j] = true;
      werkBij();
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = mA.celVan(p[0], p[1]);
      if (!cel && mC) {
        cel = mC.celVan(p[0], p[1]);
        if (cel && st.adj) cel = { rij: cel.kolom, kolom: cel.rij };
      }
      if (cel) kies(cel.rij, cel.kolom);
    });

    ctx.knop("Volgend element", function () {
      if (!gekozen()) return kies(1, 1);
      if (st.j < n) return kies(st.i, st.j + 1);
      kies(st.i < n ? st.i + 1 : 1, 1);
    });
    var patroonKnop = ctx.knop("Tekenpatroon", function () {
      st.patroon = !st.patroon;
      schakel(patroonKnop, st.patroon);
      werkBij();
    });
    var letterKnop = ctx.knop("Letters", function () {
      st.letters = !st.letters;
      schakel(letterKnop, st.letters);
      werkBij();
    });
    var adjKnop = null;
    if (mC) {
      ctx.knop("Alle cofactoren", function () {
        for (var i = 1; i <= n; i++) {
          for (var j = 1; j <= n; j++) st.gedaan[i + "," + j] = true;
        }
        werkBij();
      });
      adjKnop = ctx.knop("Transponeer", function () {
        st.adj = !st.adj;
        schakel(adjKnop, st.adj);
        werkBij();
      });
    }
    ctx.knop("Wijzig A", function () {
      A = willekeurig(n);
      st.gedaan = {};
      if (gekozen()) st.gedaan[st.i + "," + st.j] = true;
      werkBij();
    });

    function herstel() {
      A = kopie(opties.begin);
      st.i = st.j = 0;
      st.patroon = st.letters = st.adj = false;
      st.gedaan = {};
      schakel(patroonKnop, false);
      schakel(letterKnop, false);
      if (adjKnop) schakel(adjKnop, false);
      werkBij();
    }

    schakel(patroonKnop, false);
    schakel(letterKnop, false);
    if (adjKnop) schakel(adjKnop, false);
    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  }

  G.registreer("det-cofactor", function (ctx) {
    return cofactorFiguur(ctx, { begin: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] });
  });
  G.registreer("det-adjunct", function (ctx) {
    return cofactorFiguur(ctx, {
      begin: [[1, 0, 2], [3, -1, 5], [2, 6, 1]], verzamel: true
    });
  });

  /* --- 3. Ontwikkelen naar een rij of kolom ------------------------------ */

  // Kies een rij of kolom en loop de termen een voor een af: bij elke term
  // lichten het element en zijn minor op. Een nul in de gekozen rij maakt een
  // term meteen nul. Onderaan houdt de figuur bij welke rijen en kolommen al
  // geprobeerd zijn: het resultaat is telkens hetzelfde.
  G.registreer("det-laplace", function (ctx) {
    var BEGIN = {
      3: [[1, -3, 5], [-2, 1, -2], [1, -5, 0]],
      4: [[2, 1, 0, 3], [1, 0, 0, 2], [4, 3, 1, 1], [0, 2, 0, 1]]
    };
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var st = {
      n: 3, A: kopie(BEGIN[3]), soort: "R", nr: 0, term: 0,
      getoond: [], geprobeerd: [], x: {}
    };
    var TUSSEN = 1.2;
    var Y = 1.5;

    function positie(k) {
      return st.soort === "R" ? { i: st.nr, j: k } : { i: k, j: st.nr };
    }

    var mA = wb.matrix(bord, {
      rijen: function () { return st.n; }, kolommen: function () { return st.n; },
      maxrijen: 4, maxkolommen: 4, naam: "A",
      x: function () { return st.x.A; }, y: Y,
      waarde: function (i, j) { return getal(st.A[i - 1][j - 1]); },
      opaciteit: function (i, j) {
        if (!st.term) return 1;
        var p = positie(st.term);
        if (i === p.i && j === p.j) return 1;
        return i === p.i || j === p.j ? 0.25 : 1;
      }
    });
    var merkLijn = mA.markeer("punt");
    var merkTerm = mA.markeer("secante");

    var mM = wb.matrix(bord, {
      rijen: function () { return st.n - 1; }, kolommen: function () { return st.n - 1; },
      maxrijen: 3, maxkolommen: 3, haken: "strepen",
      x: function () { return st.x.M; }, y: Y,
      zichtbaar: function () { return st.term > 0; },
      naam: function () {
        if (!st.term) return "";
        var p = positie(st.term);
        return minorNaam(p.i, p.j);
      },
      waarde: function (r, k) {
        if (!st.term) return "";
        var p = positie(st.term);
        return getal(st.A[origineel(r, p.i) - 1][origineel(k, p.j) - 1]);
      }
    });

    var regels = maakRegels(wb, bord, 5, function (k) { return Y - 2.9 - 0.75 * k; });

    function breedte() { return mA.volleBreedte() + TUSSEN + mM.volleBreedte(); }
    wb.venster(bord, function () { return [Math.max(breedte(), 13) + 0.4, 9.6]; });

    function herplaats() {
      var x = -breedte() / 2;
      st.x.A = x + mA.volleBreedte() / 2;
      st.x.M = x + mA.volleBreedte() + TUSSEN + mM.volleBreedte() / 2;
    }

    function element(k) {
      var p = positie(k);
      return st.A[p.i - 1][p.j - 1];
    }
    function cof(k) {
      var p = positie(k);
      return cofactor(st.A, p.i, p.j);
    }
    function allesGetoond() {
      for (var k = 1; k <= st.n; k++) if (!st.getoond[k]) return false;
      return true;
    }

    function termDetail(k) {
      var p = positie(k);
      var a = element(k);
      if (a === 0) {
        return el("a", p.i, p.j) + " = 0: deze term is 0, " + cofactorNaam(p.i, p.j) +
          " hoef je niet uit te rekenen.";
      }
      var m = det(minor(st.A, p.i, p.j));
      var t = teken(p.i, p.j);
      var binnen = st.n === 3 ? kruisTekst(minor(st.A, p.i, p.j)) : getal(m);
      var uit = cofactorNaam(p.i, p.j) + " = " + tekenMacht(p.i, p.j) + " · " +
        minorNaam(p.i, p.j) + " = " + (t > 0 ? "+" : "−") + "(" + binnen + ") = " +
        getal(t * m);
      if (st.n === 4) uit += "   (de minor is een determinant van orde 3)";
      return uit;
    }

    function werkBij() {
      if (st.nr) {
        if (st.soort === "R") merkLijn.zet(st.nr, 0); else merkLijn.zet(0, st.nr);
      } else {
        merkLijn.verberg();
      }
      if (st.term) {
        var p = positie(st.term);
        merkTerm.zet(p.i, p.j);
      } else {
        merkTerm.verberg();
      }
      var r = ["", "", "", "", ""];
      if (!st.nr) {
        r[0] = "Klik op een element: we ontwikkelen naar zijn " +
          (st.soort === "R" ? "rij." : "kolom.");
        r[1] = "Welke rij of kolom maakt het rekenwerk het kortst?";
      } else {
        var symbolen = [], getallen = [];
        for (var k = 1; k <= st.n; k++) {
          var q = positie(k);
          symbolen.push(el("a", q.i, q.j) + "·" + cofactorNaam(q.i, q.j));
          var a = element(k);
          // Bij een element 0 blijft de cofactor een naam: die hoeft niemand
          // uit te rekenen.
          getallen.push(haakjes(a) + "·" +
            (st.getoond[k] && a !== 0 ? haakjes(cof(k)) : cofactorNaam(q.i, q.j)));
        }
        r[0] = "Ontwikkeling naar " + lijnNaam(st.soort, st.nr) + ":  det A = " +
          symbolen.join(" + ");
        r[1] = "= " + getallen.join(" + ");
        r[2] = st.term ? termDetail(st.term) : "Klik op Volgende term, of op een element van " +
          lijnNaam(st.soort, st.nr) + ".";
        if (allesGetoond()) {
          var producten = [];
          for (var t = 1; t <= st.n; t++) producten.push(element(t) * cof(t));
          r[3] = "= " + somTekst(producten) + " = " + getal(det(st.A));
        }
      }
      if (st.geprobeerd.length) {
        r[4] = "Al ontwikkeld: " + st.geprobeerd.map(function (g) {
          return g.naam + " → " + getal(g.waarde);
        }).join(",  ");
      }
      regels.tekst = r;
      herplaats();
      wb.pas();
      ctx.toon(zinnen(r));
    }

    function toon(k) {
      st.term = k;
      st.getoond[k] = true;
      if (allesGetoond()) {
        var naam = lijnNaam(st.soort, st.nr);
        var al = st.geprobeerd.some(function (g) { return g.naam === naam; });
        if (!al) st.geprobeerd.push({ naam: naam, waarde: det(st.A) });
      }
      werkBij();
    }

    function kiesLijn(nr) {
      st.nr = nr;
      st.term = 0;
      st.getoond = [];
      werkBij();
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = mA.celVan(p[0], p[1]);
      if (!cel) return;
      var nr = st.soort === "R" ? cel.rij : cel.kolom;
      if (nr === st.nr) toon(st.soort === "R" ? cel.kolom : cel.rij);
      else kiesLijn(nr);
    });

    ctx.knop("Volgende term", function () {
      if (!st.nr) kiesLijn(1);
      toon(st.term % st.n + 1);
    });
    ctx.knop("Alle termen", function () {
      if (!st.nr) kiesLijn(1);
      for (var k = 1; k <= st.n; k++) st.getoond[k] = true;
      toon(st.n);
    });
    var soortKnop = ctx.knop("Naar een kolom", function () {
      st.soort = st.soort === "R" ? "K" : "R";
      soortKnop.textContent = st.soort === "R" ? "Naar een kolom" : "Naar een rij";
      kiesLijn(st.nr);
    });
    var ordeKnop = ctx.knop("Orde 4", function () {
      st.n = st.n === 3 ? 4 : 3;
      ordeKnop.textContent = st.n === 3 ? "Orde 4" : "Orde 3";
      st.A = kopie(BEGIN[st.n]);
      st.geprobeerd = [];
      kiesLijn(0);
    });
    ctx.knop("Wijzig A", function () {
      st.A = willekeurig(st.n);
      st.geprobeerd = [];
      kiesLijn(0);
    });

    function herstel() {
      st.n = 3;
      st.A = kopie(BEGIN[3]);
      st.soort = "R";
      st.geprobeerd = [];
      soortKnop.textContent = "Naar een kolom";
      ordeKnop.textContent = "Orde 4";
      kiesLijn(0);
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 4. De regel van Sarrus -------------------------------------------- */

  // De eerste twee kolommen staan nog eens rechts van de determinant. Stap
  // voor stap licht een diagonaal op: eerst de drie dalende (met een plus),
  // dan de drie stijgende (met een min). Het product van elke diagonaal
  // komt erbij in de som eronder.
  G.registreer("det-sarrus", function (ctx) {
    var BEGIN = [[3, -2, 1], [2, 1, 2], [3, 2, 4]];
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var A = kopie(BEGIN);
    var st = { stap: 0, letters: false };

    function tekstVan(i, j) {
      return st.letters ? el("a", i, j) : getal(A[i - 1][j - 1]);
    }

    var mA = wb.matrix(bord, {
      rijen: 3, kolommen: 3, haken: "strepen", x: -1.3, y: 1.1, naam: "det A",
      waarde: tekstVan
    });
    var mK = wb.matrix(bord, {
      rijen: 3, kolommen: 2, haken: "geen", rol: "zwak",
      x: function () { return mA.X() + mA.breedte() / 2 + 0.45 + 1.3; }, y: 1.1,
      naam: "K₁ en K₂ nog eens", naamrol: "zwak",
      waarde: tekstVan
    });

    // De zes diagonalen in het blok van vijf kolommen. Kolom 4 en 5 zijn
    // kolom 1 en 2.
    var DIAGONALEN = [];
    [0, 1, 2].forEach(function (d) {
      DIAGONALEN.push({ plus: true, cellen: [[1, 1 + d], [2, 2 + d], [3, 3 + d]] });
    });
    [0, 1, 2].forEach(function (d) {
      DIAGONALEN.push({ plus: false, cellen: [[1, 3 + d], [2, 2 + d], [3, 1 + d]] });
    });

    function celX(c) { return c <= 3 ? mA.celX(c) : mK.celX(c - 3); }
    function echt(c) { return c > 3 ? c - 3 : c; }

    DIAGONALEN.forEach(function (d, k) {
      var a = d.cellen[0], b = d.cellen[2];
      function uiteinde(verder) {
        return function () {
          var x0 = celX(a[1]), y0 = mA.celY(a[0]);
          var x1 = celX(b[1]), y1 = mA.celY(b[0]);
          var t = verder ? 1.2 : -0.2;
          return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
        };
      }
      lijnstuk(ctx, bord, uiteinde(false), uiteinde(true), d.plus ? "punt" : "secante", {
        dikte: 3,
        opaciteit: function () { return st.stap === k + 1 ? 0.9 : 0.3; },
        zichtbaar: function () { return st.stap > k; }
      });
    });

    var regels = maakRegels(wb, bord, 3, function (k) { return -1.4 - 0.8 * k; });
    wb.venster(bord, function () { return [12.5, 7.4]; });

    function factoren(d) {
      return d.cellen.map(function (c) {
        return st.letters ? el("a", c[0], echt(c[1])) : haakjes(A[c[0] - 1][echt(c[1]) - 1]);
      }).join(st.letters ? "" : "·");
    }
    function product(d) {
      return d.cellen.reduce(function (p, c) { return p * A[c[0] - 1][echt(c[1]) - 1]; }, 1);
    }

    function regel(plus) {
      var begin = plus ? 0 : 3;
      var delen = [], waarden = [];
      for (var k = begin; k < begin + 3; k++) {
        delen.push(st.stap > k ? factoren(DIAGONALEN[k]) : "…");
        waarden.push(product(DIAGONALEN[k]));
      }
      var uit = (plus ? "+ (" : "− (") + delen.join(" + ") + ")";
      if (!st.letters && st.stap >= begin + 3) {
        var s = waarden.reduce(function (a, b) { return a + b; }, 0);
        uit += " = " + (plus ? "+" : "−") + "(" + somTekst(waarden) + ") = " +
          (plus ? "" : "−") + haakjes(s);
      }
      return uit;
    }

    function werkBij() {
      var plus = 0, min = 0;
      for (var k = 0; k < 3; k++) plus += product(DIAGONALEN[k]);
      for (k = 3; k < 6; k++) min += product(DIAGONALEN[k]);
      var slot = "";
      if (st.stap === 0) slot = "Klik op Volgende diagonaal.";
      else if (st.stap === 6 && !st.letters) {
        slot = "det A = " + getal(plus) + " − " + haakjes(min) + " = " + getal(plus - min);
      }
      regels.tekst = [regel(true), regel(false), slot];
      wb.pas();
      var d = DIAGONALEN[st.stap - 1];
      ctx.toon(st.stap
        ? "Diagonaal " + st.stap + " van 6, " + (d.plus ? "dalend, met een plus: " : "stijgend, met een min: ") +
          factoren(d) + (st.letters ? "" : " = " + getal(product(d))) + ". " + zinnen(regels.tekst)
        : "De eerste twee kolommen staan nog eens rechts van de determinant. " +
          "Klik op Volgende diagonaal.");
    }

    ctx.knop("Volgende diagonaal", function () {
      st.stap = st.stap % 6 + 1;
      werkBij();
    });
    ctx.knop("Alle diagonalen", function () {
      st.stap = 6;
      werkBij();
    });
    var letterKnop = ctx.knop("Letters", function () {
      st.letters = !st.letters;
      schakel(letterKnop, st.letters);
      werkBij();
    });
    ctx.knop("Wijzig A", function () {
      A = willekeurig(3);
      st.stap = 0;
      werkBij();
    });

    function herstel() {
      A = kopie(BEGIN);
      st.stap = 0;
      st.letters = false;
      schakel(letterKnop, false);
      werkBij();
    }

    schakel(letterKnop, false);
    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 5. Rij- en kolombewerkingen --------------------------------------- */

  // De eigenschappen zeggen wat een bewerking met de determinant doet. Hier
  // doet de leerling de bewerking zelf, denkt na over de nieuwe determinant,
  // en ziet pas daarna of hij juist zat. Klik een eerste rij (blauw) en
  // eventueel een tweede (oranje) aan, en kies de bewerking.
  G.registreer("det-rijbewerkingen", function (ctx) {
    var BEGIN = [[2, 1, 3], [1, 0, 2], [4, 1, 5]];
    var KS = [2, 3, -1, -2, 0];
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var st = {
      A: kopie(BEGIN), vorige: null, stap: "", uitleg: "", verborgen: false,
      soort: "R", eerste: 0, tweede: 0, k: 0, x: {}, geschiedenis: []
    };
    var TUSSEN = 1.1;
    var Y = 1.2;

    function k() { return KS[st.k]; }
    function heeftVorige() { return st.vorige !== null; }

    var mV = wb.matrix(bord, {
      rijen: 3, kolommen: 3, haken: "strepen",
      x: function () { return st.x.V; }, y: Y,
      zichtbaar: heeftVorige,
      naam: function () { return heeftVorige() ? "voor" : ""; }, naamrol: "zwak",
      waarde: function (i, j) { return heeftVorige() ? getal(st.vorige[i - 1][j - 1]) : ""; }
    });
    var mA = wb.matrix(bord, {
      rijen: 3, kolommen: 3, haken: "strepen",
      x: function () { return st.x.A; }, y: Y,
      naam: function () { return heeftVorige() ? "na" : "det A"; }, naamrol: "zwak",
      waarde: function (i, j) { return getal(st.A[i - 1][j - 1]); }
    });
    var merk1 = mA.markeer("punt");
    var merk2 = mA.markeer("secante");

    wb.tekst(bord, function () { return st.x.P; }, Y + 0.45,
      function () { return heeftVorige() ? st.stap : ""; }, "tekst", { factor: 0.85, vet: true });
    wb.tekst(bord, function () { return st.x.P; }, Y - 0.2,
      function () { return heeftVorige() ? "⟶" : ""; }, "zwak", { factor: 1.3 });
    wb.tekst(bord, function () { return st.x.V; }, Y - 2.25,
      function () { return heeftVorige() ? "det = " + getal(det(st.vorige)) : ""; }, "tekst",
      { factor: 0.9 });
    wb.tekst(bord, function () { return st.x.A; }, Y - 2.25,
      function () { return "det = " + (st.verborgen ? "?" : getal(det(st.A))); }, "tekst",
      { factor: 0.9, vet: true });

    var regels = maakRegels(wb, bord, 3, function (n) { return Y - 3.1 - 0.75 * n; });

    function pijlBreedte() { return heeftVorige() ? 2.8 : 0; }
    function breedte() {
      return (heeftVorige() ? mV.volleBreedte() + pijlBreedte() : 0) + mA.volleBreedte();
    }
    wb.venster(bord, function () { return [13, 8.6]; });

    function herplaats() {
      var x = -breedte() / 2;
      if (heeftVorige()) {
        st.x.V = x + mV.volleBreedte() / 2;
        x += mV.volleBreedte();
        st.x.P = x + pijlBreedte() / 2;
        x += pijlBreedte();
      }
      st.x.A = x + mA.volleBreedte() / 2;
    }

    function lijn(A, nr) {
      var uit = [];
      for (var t = 0; t < 3; t++) uit.push(st.soort === "R" ? A[nr - 1][t] : A[t][nr - 1]);
      return uit;
    }
    function zetLijn(A, nr, waarden) {
      for (var t = 0; t < 3; t++) {
        if (st.soort === "R") A[nr - 1][t] = waarden[t]; else A[t][nr - 1] = waarden[t];
      }
    }
    function naam(nr) { return lijnNaam(st.soort, nr); }
    function woord() { return st.soort === "R" ? "rij" : "kolom"; }
    function woorden() { return st.soort === "R" ? "rijen" : "kolommen"; }

    // Een nulrij, of twee evenredige rijen (of kolommen): dan is de
    // determinant 0, en dat verdient een aparte zin.
    function nulrij(A) {
      for (var a = 1; a <= 3; a++) {
        if (lijn(A, a).every(function (x) { return x === 0; })) return a;
      }
      return 0;
    }
    function evenredig(A) {
      for (var a = 1; a <= 3; a++) {
        for (var b = a + 1; b <= 3; b++) {
          var p = lijn(A, a), q = lijn(A, b);
          if (p[0] * q[1] === p[1] * q[0] && p[0] * q[2] === p[2] * q[0] &&
              p[1] * q[2] === p[2] * q[1]) {
            return [a, b];
          }
        }
      }
      return null;
    }

    function selectieTekst() {
      if (!st.eerste) return "Klik op een " + woord() + " van de determinant.";
      var t = "Gekozen: " + naam(st.eerste) + " (blauw)";
      if (st.tweede) t += " en " + naam(st.tweede) + " (oranje)";
      return t + ". k = " + getal(k()) + ".";
    }

    function werkBij() {
      if (st.eerste) {
        if (st.soort === "R") merk1.zet(st.eerste, 0); else merk1.zet(0, st.eerste);
      } else {
        merk1.verberg();
      }
      if (st.tweede) {
        if (st.soort === "R") merk2.zet(st.tweede, 0); else merk2.zet(0, st.tweede);
      } else {
        merk2.verberg();
      }
      var r = [selectieTekst(), "", ""];
      if (heeftVorige()) {
        if (st.verborgen) {
          r[1] = "Denk vooraf na: wat wordt de determinant na " + st.stap + "?";
          r[2] = "Klik daarna op Toon det.";
        } else {
          r[1] = st.uitleg;
          var leeg = nulrij(st.A);
          var nul = evenredig(st.A);
          if (leeg) {
            r[2] = naam(leeg) + " bevat enkel nullen, dus de determinant is 0.";
          } else if (nul) {
            r[2] = naam(nul[0]) + " en " + naam(nul[1]) + " zijn evenredig, dus de determinant is 0.";
          }
        }
      }
      regels.tekst = r;
      herplaats();
      wb.pas();
      ctx.toon(zinnen(r) + (st.verborgen ? "" : " det = " + getal(det(st.A)) + "."));
    }

    function voerUit(stap, nieuw, uitleg) {
      st.geschiedenis.push({ A: st.A, vorige: st.vorige, stap: st.stap, uitleg: st.uitleg,
                             verborgen: st.verborgen });
      st.vorige = st.A;
      st.A = nieuw;
      st.stap = stap;
      st.uitleg = uitleg;
      st.verborgen = true;
      werkBij();
    }

    function nodig(twee) {
      if (!st.eerste || (twee && !st.tweede)) {
        regels.tekst = [selectieTekst(), twee
          ? "Deze bewerking heeft twee " + woorden() + " nodig: klik er nog een aan."
          : "Klik eerst op een " + woord() + ".", ""];
        wb.pas();
        ctx.toon(zinnen(regels.tekst));
        return false;
      }
      return true;
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = mA.celVan(p[0], p[1]);
      if (!cel) return;
      var nr = st.soort === "R" ? cel.rij : cel.kolom;
      if (!st.eerste || st.tweede || nr === st.eerste) {
        st.eerste = nr;
        st.tweede = 0;
      } else {
        st.tweede = nr;
      }
      werkBij();
    });

    ctx.knop("Wissel", function () {
      if (!nodig(true)) return;
      var B = kopie(st.A);
      var p = lijn(B, st.eerste), q = lijn(B, st.tweede);
      zetLijn(B, st.eerste, q);
      zetLijn(B, st.tweede, p);
      voerUit(naam(st.eerste) + " ↔ " + naam(st.tweede), B,
        "Twee " + woorden() + " verwisseld: de determinant verandert van teken.");
    });
    ctx.knop("Maal k", function () {
      if (!nodig(false)) return;
      var B = kopie(st.A);
      zetLijn(B, st.eerste, lijn(B, st.eerste).map(function (x) { return k() * x; }));
      voerUit(naam(st.eerste) + " ← " + (k() === -1 ? "−" : getal(k())) + naam(st.eerste), B,
        "Eén " + woord() + " maal " + getal(k()) + ": de determinant wordt ook met " +
        getal(k()) + " vermenigvuldigd.");
    });
    ctx.knop("Tel k keer op", function () {
      if (!nodig(true)) return;
      var B = kopie(st.A);
      var q = lijn(B, st.tweede);
      zetLijn(B, st.eerste, lijn(B, st.eerste).map(function (x, t) { return x + k() * q[t]; }));
      var factor = k() === 1 ? "" : (k() === -1 ? "" : getal(Math.abs(k())));
      voerUit(naam(st.eerste) + " ← " + naam(st.eerste) + (k() < 0 ? " − " : " + ") +
        factor + naam(st.tweede), B,
        "Een veelvoud van een andere " + woord() + " opgeteld: de determinant blijft gelijk.");
    });
    var kKnop = ctx.knop("k = 2", function () {
      st.k = (st.k + 1) % KS.length;
      kKnop.textContent = "k = " + getal(k());
      werkBij();
    });
    ctx.knop("Transponeer", function () {
      voerUit("Aᵀ", M.getransponeerde(st.A),
        "Rijen en kolommen van rol gewisseld: det Aᵀ = det A.");
    });
    ctx.knop("Toon det", function () {
      st.verborgen = false;
      werkBij();
    });
    ctx.knop("Terug", function () {
      var vorige = st.geschiedenis.pop();
      if (!vorige) return;
      st.A = vorige.A;
      st.vorige = vorige.vorige;
      st.stap = vorige.stap;
      st.uitleg = vorige.uitleg;
      st.verborgen = vorige.verborgen;
      werkBij();
    });
    var soortKnop = ctx.knop("Kolommen", function () {
      st.soort = st.soort === "R" ? "K" : "R";
      soortKnop.textContent = st.soort === "R" ? "Kolommen" : "Rijen";
      st.eerste = st.tweede = 0;
      werkBij();
    });
    ctx.knop("Wijzig A", function () {
      st.A = willekeurig(3);
      st.vorige = null;
      st.geschiedenis = [];
      st.verborgen = false;
      werkBij();
    });

    function herstel() {
      st.A = kopie(BEGIN);
      st.vorige = null;
      st.geschiedenis = [];
      st.verborgen = false;
      st.soort = "R";
      st.eerste = st.tweede = 0;
      st.k = 0;
      kKnop.textContent = "k = 2";
      soortKnop.textContent = "Kolommen";
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 6. Verlaging van de orde ------------------------------------------ */

  // Exacte breuken: bij een spil die geen 1 of −1 is, verschijnen er breuken,
  // en die horen er net zo exact te staan als op papier.
  function ggd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function breuk(t, n) {
    if (n === undefined) n = 1;
    if (n < 0) { t = -t; n = -n; }
    var g = ggd(t, n);
    return { t: t / g, n: n / g };
  }
  var Q = {
    plus: function (a, b) { return breuk(a.t * b.n + b.t * a.n, a.n * b.n); },
    min: function (a, b) { return breuk(a.t * b.n - b.t * a.n, a.n * b.n); },
    maal: function (a, b) { return breuk(a.t * b.t, a.n * b.n); },
    deel: function (a, b) { return breuk(a.t * b.n, a.n * b.t); },
    nul: function (a) { return a.t === 0; },
    tekst: function (a) { return net(a.n === 1 ? String(a.t) : a.t + "/" + a.n); },
    // Als factor: een negatief getal of een breuk tussen haakjes.
    factor: function (a) {
      var s = Q.tekst(a);
      return a.t < 0 || a.n !== 1 ? "(" + s + ")" : s;
    }
  };
  function naarQ(A) {
    return A.map(function (rij) { return rij.map(function (x) { return breuk(x); }); });
  }
  function detQ(A) {
    if (A.length === 1) return A[0][0];
    var s = breuk(0);
    for (var j = 1; j <= A.length; j++) {
      if (Q.nul(A[0][j - 1])) continue;
      var term = Q.maal(A[0][j - 1], detQ(minor(A, 1, j)));
      s = teken(1, j) > 0 ? Q.plus(s, term) : Q.min(s, term);
    }
    return s;
  }

  // Kies een spil. Maak nullen in haar kolom met rijbewerkingen (of in haar
  // rij met kolombewerkingen), en ontwikkel dan naar die kolom: van de hele
  // ontwikkeling blijft maar één term over, en de orde zakt met één. Zo
  // verder tot er een 2×2-determinant overblijft. De figuur zegt bij elke
  // stap welke bewerking ze doet, zodat de leerling dezelfde regels op papier
  // kan schrijven.
  G.registreer("det-verlaging", function (ctx) {
    var VOORBEELDEN = [
      [[6, 9, 2], [2, 3, 1], [3, 5, 2]],
      [[3, 2, 0], [4, -2, 1], [1, 3, -4]],
      [[2, 3, 1, -1], [1, 2, 0, 3], [-3, 1, 2, 2], [4, 0, 1, 5]]
    ];
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var st = { voorbeeld: 0, stadia: [], i: 0, j: 0, soort: "K", melding: "", x: {} };
    var Y = 1.2;

    function nu() { return st.stadia[st.stadia.length - 1]; }
    function orde() { return nu().B.length; }

    function begin(A) {
      st.stadia = [{ B: naarQ(A), f: breuk(1), stap: "" }];
      st.i = st.j = 0;
      st.melding = "";
    }
    begin(VOORBEELDEN[0]);

    var mB = wb.matrix(bord, {
      rijen: orde, kolommen: orde, maxrijen: 4, maxkolommen: 4, haken: "strepen",
      x: function () { return st.x.B; }, y: Y,
      waarde: function (i, j) { return Q.tekst(nu().B[i - 1][j - 1]); },
      naam: function () {
        return st.stadia.length === 1 ? "det A" : "stap " + (st.stadia.length - 1);
      }, naamrol: "zwak"
    });
    // Eerst de kolom, dan de spil: zo ligt de spil bovenop.
    var merkLijn = mB.markeer("secante");
    var merkSpil = mB.markeer("punt");

    // De factor die al voor de determinant staat, zoals −1 · |…|.
    wb.tekst(bord, function () { return st.x.F; }, Y,
      function () {
        var f = nu().f;
        return f.t === 1 && f.n === 1 ? "" : Q.factor(f) + " ·";
      }, "tekst", { factor: 1.1 });

    var regels = maakRegels(wb, bord, 4, function (n) { return Y - 2.9 - 0.72 * n; });
    wb.venster(bord, function () { return [13.5, 9.8]; });

    function herplaats() {
      var f = nu().f;
      var fb = f.t === 1 && f.n === 1 ? 0 : 1.6;
      var totaal = fb + mB.volleBreedte();
      st.x.F = -totaal / 2 + fb / 2;
      st.x.B = -totaal / 2 + fb + mB.volleBreedte() / 2;
    }

    // Alle elementen van de lijn door de spil, behalve de spil zelf, zijn 0?
    function klaarOmTeOntwikkelen() {
      var B = nu().B;
      for (var t = 1; t <= orde(); t++) {
        if (st.soort === "K" && t !== st.i && !Q.nul(B[t - 1][st.j - 1])) return false;
        if (st.soort === "R" && t !== st.j && !Q.nul(B[st.i - 1][t - 1])) return false;
      }
      return true;
    }

    function einde() {
      var s = nu();
      if (orde() > 2) return "";
      var D = detQ(s.B);
      var f = s.f;
      var eind = Q.maal(f, D);
      var voor = f.t === 1 && f.n === 1 ? "" : Q.factor(f) + " · ";
      var binnen = orde() === 2
        ? Q.factor(s.B[0][0]) + "·" + Q.factor(s.B[1][1]) + " − " +
          Q.factor(s.B[0][1]) + "·" + Q.factor(s.B[1][0])
        : Q.tekst(s.B[0][0]);
      return "Orde " + orde() + ": det A = " + voor + "(" + binnen + ") = " + Q.tekst(eind);
    }

    function werkBij() {
      if (st.i) merkSpil.zet(st.i, st.j); else merkSpil.verberg();
      if (st.i && orde() > 2) {
        if (st.soort === "K") merkLijn.zet(0, st.j); else merkLijn.zet(st.i, 0);
      } else {
        merkLijn.verberg();
      }
      var stappen = st.stadia.slice(1).map(function (s, k) {
        return (k + 1) + ". " + s.stap;
      });
      var r = stappen.slice(-3);
      while (r.length < 3) r.unshift("");
      if (st.melding) {
        r.push(st.melding);
      } else if (orde() <= 2) {
        r.push(einde());
      } else if (!st.i) {
        r.push("Klik op een spil: liefst een 1 of −1, in een " +
          (st.soort === "K" ? "kolom" : "rij") + " met veel nullen.");
      } else if (klaarOmTeOntwikkelen()) {
        r.push("Buiten de spil staan er enkel nullen in " + lijnNaam(st.soort, st.soort === "K" ? st.j : st.i) +
          ": klik op Ontwikkel.");
      } else {
        r.push("Klik op Maak nullen: de andere elementen van " +
          lijnNaam(st.soort, st.soort === "K" ? st.j : st.i) + " worden 0.");
      }
      regels.tekst = r;
      herplaats();
      wb.pas();
      ctx.toon(zinnen(stappen.concat([regels.tekst[3]])));
    }

    function nieuwStadium(B, f, stap) {
      st.stadia.push({ B: B, f: f, stap: stap });
    }

    // R₂ ← R₂ − 2R₁, met een breuk tussen haakjes: R₂ ← R₂ − (3/2)R₁.
    function bewerkingTekst(doel, factor, bron) {
      var min = factor.t > 0;
      var abs = breuk(Math.abs(factor.t), factor.n);
      var f = abs.t === 1 && abs.n === 1 ? "" : (abs.n === 1 ? Q.tekst(abs) : "(" + Q.tekst(abs) + ")");
      return doel + " ← " + doel + (min ? " − " : " + ") + f + bron;
    }

    ctx.knop("Maak nullen", function () {
      st.melding = "";
      if (orde() <= 2) return werkBij();
      if (!st.i) {
        st.melding = "Kies eerst een spil: klik op een element dat niet 0 is.";
        return werkBij();
      }
      if (klaarOmTeOntwikkelen()) {
        st.melding = "Er staan al nullen: klik op Ontwikkel.";
        return werkBij();
      }
      var s = nu();
      var B = s.B.map(function (rij) { return rij.slice(); });
      var spil = B[st.i - 1][st.j - 1];
      var ops = [];
      for (var t = 1; t <= orde(); t++) {
        if (st.soort === "K") {
          if (t === st.i || Q.nul(B[t - 1][st.j - 1])) continue;
          var c = Q.deel(B[t - 1][st.j - 1], spil);
          for (var u = 0; u < orde(); u++) B[t - 1][u] = Q.min(B[t - 1][u], Q.maal(c, B[st.i - 1][u]));
          ops.push(bewerkingTekst(lijnNaam("R", t), c, lijnNaam("R", st.i)));
        } else {
          if (t === st.j || Q.nul(B[st.i - 1][t - 1])) continue;
          var d = Q.deel(B[st.i - 1][t - 1], spil);
          for (var v = 0; v < orde(); v++) B[v][t - 1] = Q.min(B[v][t - 1], Q.maal(d, B[v][st.j - 1]));
          ops.push(bewerkingTekst(lijnNaam("K", t), d, lijnNaam("K", st.j)));
        }
      }
      var zin = ops.join(", ") + ": de determinant blijft gelijk.";
      if (spil.t !== spil.n && spil.t !== -spil.n) {
        zin += " (Spil " + Q.tekst(spil) + ": daarom de breuken.)";
      }
      nieuwStadium(B, s.f, zin);
      werkBij();
    });

    ctx.knop("Ontwikkel", function () {
      st.melding = "";
      if (orde() <= 2) return werkBij();
      if (!st.i) {
        st.melding = "Kies eerst een spil.";
        return werkBij();
      }
      if (!klaarOmTeOntwikkelen()) {
        st.melding = "Er staan nog getallen naast de spil. Klik eerst op Maak nullen.";
        return werkBij();
      }
      var s = nu();
      var spil = s.B[st.i - 1][st.j - 1];
      var t = teken(st.i, st.j);
      var f = Q.maal(Q.maal(s.f, breuk(t)), spil);
      var lijnTekst = lijnNaam(st.soort, st.soort === "K" ? st.j : st.i);
      nieuwStadium(minor(s.B, st.i, st.j), f,
        "Ontwikkel naar " + lijnTekst + ": enkel " + tekenMacht(st.i, st.j) + " · " +
        Q.factor(spil) + " · " + minorNaam(st.i, st.j) + " blijft over.");
      st.i = st.j = 0;
      werkBij();
    });

    ctx.knop("Tip", function () {
      // De beste spil: een 1 of −1 met zoveel mogelijk nullen in haar kolom
      // (of rij); anders het kleinste getal dat geen 0 is.
      var B = nu().B, beste = null;
      for (var i = 1; i <= orde(); i++) {
        for (var j = 1; j <= orde(); j++) {
          var a = B[i - 1][j - 1];
          if (Q.nul(a)) continue;
          var nullen = 0;
          for (var t = 1; t <= orde(); t++) {
            var b = st.soort === "K" ? B[t - 1][j - 1] : B[i - 1][t - 1];
            if (Q.nul(b)) nullen++;
          }
          var score = (a.n === 1 && Math.abs(a.t) === 1 ? 100 : 0) + 10 * nullen -
            Math.abs(a.t / a.n);
          if (!beste || score > beste.score) beste = { i: i, j: j, score: score, a: a };
        }
      }
      if (!beste || orde() <= 2) return werkBij();
      st.i = beste.i;
      st.j = beste.j;
      st.melding = "Tip: kies " + el("a", beste.i, beste.j) + " = " + Q.tekst(beste.a) +
        (beste.a.n === 1 && Math.abs(beste.a.t) === 1 ? ": met een spil 1 of −1 blijven alle getallen geheel." : ".");
      werkBij();
    });
    var soortKnop = ctx.knop("Nullen in een rij", function () {
      st.soort = st.soort === "K" ? "R" : "K";
      soortKnop.textContent = st.soort === "K" ? "Nullen in een rij" : "Nullen in een kolom";
      st.melding = "";
      werkBij();
    });
    ctx.knop("Terug", function () {
      if (st.stadia.length > 1) st.stadia.pop();
      st.i = st.j = 0;
      st.melding = "";
      werkBij();
    });
    ctx.knop("Andere determinant", function () {
      st.voorbeeld = (st.voorbeeld + 1) % VOORBEELDEN.length;
      begin(VOORBEELDEN[st.voorbeeld]);
      werkBij();
    });

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p || orde() <= 2) return;
      var cel = mB.celVan(p[0], p[1]);
      if (!cel) return;
      st.melding = "";
      if (Q.nul(nu().B[cel.rij - 1][cel.kolom - 1])) {
        st.i = st.j = 0;
        st.melding = "Een spil mag geen 0 zijn: daarmee maak je geen nullen.";
      } else {
        st.i = cel.rij;
        st.j = cel.kolom;
      }
      werkBij();
    });

    function herstel() {
      st.voorbeeld = 0;
      st.soort = "K";
      soortKnop.textContent = "Nullen in een rij";
      begin(VOORBEELDEN[0]);
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 7. Meetkundige toepassingen --------------------------------------- */

  // Drie punten en de determinant met hun coördinaten. Die determinant is het
  // dubbele van de georiënteerde oppervlakte van de driehoek: nul als de
  // punten op één rechte liggen, positief als je tegen de wijzers van de klok
  // in van het eerste naar het tweede en het derde punt gaat. Eén figuur,
  // drie vragen: ligt P op de rechte door P₁ en P₂, zijn A, B en C
  // collineair, en hoe groot is de oppervlakte van driehoek ABC?
  function meetkundeFiguur(ctx, soort) {
    var GRENS = [-5, 7, 9, -3];
    var BEGIN = {
      rechte: [[0, 0], [2, 3], [-4, 7]],
      collineair: [[3, 2], [-2, -1], [8, 5]],
      driehoek: [[1, 0], [7, 2], [4, 2]]
    }[soort];
    var NAMEN = soort === "rechte" ? ["P", "P₁", "P₂"] : ["A", "B", "C"];
    var PLOT = [-5.6, 7.8, 9.6, -3.8];
    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var vak = [PLOT[2], PLOT[1]];
    function schik() {
      vak = schikBord(bord, PLOT, soort === "rechte" ? 330 : 300, soort === "rechte" ? 250 : 130);
      bord.fullUpdate();
    }

    var punten = BEGIN.map(function (xy, k) {
      return roosterpunt(ctx, bord, xy, NAMEN[k], k === 0 ? "punt" : "secante", GRENS);
    });
    var P = punten[0], P1 = punten[1], P2 = punten[2];

    function co(p) { return [Math.round(p.X()), Math.round(p.Y())]; }
    function waarde() {
      var a = co(P), b = co(P1), c = co(P2);
      return a[0] * (b[1] - c[1]) - a[1] * (b[0] - c[0]) + (b[0] * c[1] - c[0] * b[1]);
    }

    if (soort === "rechte") {
      ctx.stijl(bord.create("line", [P1, P2], {
        strokeWidth: 2, fixed: true, highlight: false,
        visible: function () { return co(P1)[0] !== co(P2)[0] || co(P1)[1] !== co(P2)[1]; }
      }), "kromme");
    }
    bord.create("polygon", punten, {
      fixed: true, highlight: false, layer: 0,
      fillOpacity: soort === "rechte" ? 0.12 : 0.25,
      fillColor: function () { return waarde() >= 0 ? kleuren.afgeleide : kleuren.secante; },
      borders: {
        strokeWidth: soort === "rechte" ? 1 : 2, dash: soort === "rechte" ? 2 : 0,
        strokeColor: function () { return kleuren.hulp; }
      },
      vertices: { visible: false }
    });

    function paneel() {
      var a = co(P), b = co(P1), c = co(P2);
      var D = waarde();
      var eerste = soort === "rechte" ? ["x", "y", "1"] : [getal(a[0]), getal(a[1]), "1"];
      var tabel = detTabel([eerste, [getal(b[0]), getal(b[1]), "1"],
                            [getal(c[0]), getal(c[1]), "1"]]);
      var html;
      if (soort === "rechte") {
        var u = b[1] - c[1], v = -(b[0] - c[0]), w = b[0] * c[1] - c[0] * b[1];
        html = "rechte P₁P₂ ↔ " + tabel + " = 0<br>" +
          "ontwikkeld naar R₁: " + vergelijking(u, v, w) + "<br><br>" +
          "Vul P(" + getal(a[0]) + ", " + getal(a[1]) + ") in: " +
          detTabel([[getal(a[0]), getal(a[1]), "1"], [getal(b[0]), getal(b[1]), "1"],
                    [getal(c[0]), getal(c[1]), "1"]]) + " = <b>" + getal(D) + "</b><br>" +
          (D === 0 ? "De determinant is 0: P ligt op de rechte."
                   : "De determinant is niet 0:<br>P ligt niet op de rechte.") +
          "<br>" + kleurtekst("|" + getal(D) + "| = 2 · opp ΔPP₁P₂", "zwak");
      } else if (soort === "collineair") {
        html = tabel + " = <b>" + getal(D) + "</b><br>" +
          (D === 0 ? "De determinant is 0: A, B en C zijn collineair."
                   : "De determinant is niet 0: A, B en C<br>liggen niet op één rechte.");
      } else {
        html = "opp ΔABC = ½ · |" + tabel + "|<br>" +
          "= ½ · |" + getal(D) + "| = <b>" + ctx.getal(Math.abs(D) / 2, 1) + "</b><br>" +
          (D > 0 ? "det &gt; 0: A → B → C gaat tegen de wijzers in."
            : D < 0 ? "det &lt; 0: A → B → C gaat met de wijzers mee."
              : "det = 0: de punten liggen op één rechte,<br>de driehoek is plat.");
      }
      return html;
    }

    // ux + vy + w = 0 met de gewone schrijfwijze: geen 1x, geen + −.
    function vergelijking(u, v, w) {
      var delen = [];
      [[u, "x"], [v, "y"], [w, ""]].forEach(function (paar) {
        var c = paar[0];
        if (c === 0) return;
        var abs = Math.abs(c);
        var t = (abs === 1 && paar[1] ? "" : abs) + paar[1];
        if (!delen.length) delen.push((c < 0 ? "−" : "") + t);
        else delen.push((c < 0 ? " − " : " + ") + t);
      });
      return (delen.join("") || "0") + " = 0";
    }

    tekstvak(ctx, bord, function () { return vak[0]; }, function () { return vak[1]; }, paneel);

    function beschrijving() {
      var D = waarde();
      var t = NAMEN.map(function (n, k) {
        var c = co(punten[k]);
        return n + "(" + getal(c[0]) + ", " + getal(c[1]) + ")";
      }).join(", ");
      var slot = soort === "driehoek"
        ? " De oppervlakte van driehoek ABC is " + ctx.getal(Math.abs(D) / 2, 1) + "."
        : (D === 0 ? " De punten liggen op één rechte." : " De punten liggen niet op één rechte.");
      return t + ". De determinant is " + getal(D) + "." + slot;
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    function herstel() {
      punten.forEach(function (p, k) { zetPunt(p, BEGIN[k]); });
      bord.update();
    }

    schik();
    ctx.toon(beschrijving());
    return {
      reset: herstel,
      herschaal: schik,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  }

  G.registreer("det-rechte", function (ctx) { return meetkundeFiguur(ctx, "rechte"); });
  G.registreer("det-collineair", function (ctx) { return meetkundeFiguur(ctx, "collineair"); });
  G.registreer("det-driehoek", function (ctx) { return meetkundeFiguur(ctx, "driehoek"); });

}());
