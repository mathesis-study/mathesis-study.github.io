/* Interactieve grafieken bij R02_VectorenEnCoordinaten.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert de context: het bord, de kleuren per
 * rol, de getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  /* --- Coördinaten van een punt in de ruimte ------------------------------ */

  // Dezelfde balk als coordinaten_kubus.asy, maar in JSXGraph 3D, zodat de
  // hoekpunten te verslepen zijn. Een punt op een as schuift enkel over die
  // as, een punt in een coördinaatvlak enkel in dat vlak, en het punt
  // (x,y,z) zelf volgt. De opschriften blijven symbolisch zoals op papier;
  // de getallen staan in de regel onder de figuur.
  G.registreer("coordinaten-kubus", function (ctx) {
    var BEGIN = { x: 3, y: 4, z: 2 };
    var GRENS = { x: [0.3, 5], y: [0.3, 5.5], z: [0.3, 3.2] };
    var AS = { x: 6, y: 6.5, z: 4 };         // vaste lengte van de assen
    var BEGIN_AZ = 1.37;                     // de camera van de .asy-figuur
    var BEGIN_EL = 0.37;
    var s = { x: BEGIN.x, y: BEGIN.y, z: BEGIN.z };

    var bord = ctx.maakBord({
      begrenzing: [-8.3, 6.3, 7.7, -6.5], assen: false, gelijkeschaal: true
    });
    var view = bord.create("view3d", [[-5.5, -5.5], [11, 11],
      [[-0.5, AS.x], [-0.5, AS.y], [-0.5, AS.z]]], {
      projection: "parallel",
      axesPosition: "none",
      xPlaneRear: { visible: false }, yPlaneRear: { visible: false },
      zPlaneRear: { visible: false },
      az: { slider: { visible: false, start: BEGIN_AZ },
            pointer: { enabled: true, key: "none", outside: true } },
      // Hoogstens recht van boven en nooit van onder: anders ligt de figuur
      // ondersteboven en weet een leerling niet meer waar boven is.
      el: { slider: { visible: false, start: BEGIN_EL, min: 0, max: Math.PI / 2 },
            continuous: false,
            pointer: { enabled: true, key: "none", outside: true } },
      bank: { slider: { visible: false } }
    });

    // Een wiskundig opschrift met de MathJax van de site. Zolang MathJax er
    // niet is, staat de brontekst er; dezelfde tekst wordt later vervangen.
    var opschriften = [];
    function tex(bron) {
      var mj = window.MathJax;
      if (mj && typeof mj.tex2svg === "function") {
        try { return mj.tex2svg(bron, { display: false }).outerHTML; }
        catch (fout) { /* dan de brontekst */ }
      }
      return bron;
    }
    function opschrift(positie, bron, verschuiving, rol) {
      var t = view.create("text3d", [positie, tex(bron)], {
        display: "html", parse: false, useMathJax: false, fixed: true, highlight: false,
        anchorX: verschuiving[2] || "left", anchorY: verschuiving[3] || "middle",
        fontSize: 16,
        // Een opschrift reikt tot tegen zijn hoekpunt; zonder pointer-events
        // gaat een klik erop door naar de greep eronder.
        cssStyle: "white-space: nowrap; padding: 0 3px; pointer-events: none",
        highlightCssStyle: "white-space: nowrap; padding: 0 3px; pointer-events: none"
      });
      var tekst = t.element2D || t;
      tekst.mathesisBron = bron;
      opschriften.push(tekst);
      ctx.stijl(tekst, rol || "tekst");
      return t;
    }

    // --- De assen, met een pijl op het einde -------------------------------
    var O = [0, 0, 0];
    [["x", [AS.x, 0, 0]], ["y", [0, AS.y, 0]], ["z", [0, 0, AS.z]]]
      .forEach(function (a) {
        ctx.stijl(view.create("line3d", [O, a[1]], {
          strokeWidth: 2, fixed: true, highlight: false, lastArrow: { type: 2, size: 8 }
        }), "as");
        opschrift(a[1], a[0], [0, 0, "middle", "middle"], "tekst");
      });

    // --- De hoekpunten ----------------------------------------------------
    // Welke coördinaten elk hoekpunt van de balk heeft; de andere zijn 0.
    var HOEKEN = { X: "x", Y: "y", Z: "z", XY: "xy", XZ: "xz", YZ: "yz" };
    function plaats(naam) {
      var c = HOEKEN[naam];
      return [c.indexOf("x") >= 0 ? s.x : 0,
              c.indexOf("y") >= 0 ? s.y : 0,
              c.indexOf("z") >= 0 ? s.z : 0];
    }
    function beperk(waarde, as) {
      return Math.min(GRENS[as][1], Math.max(GRENS[as][0], waarde));
    }

    var punten = {};
    Object.keys(HOEKEN).forEach(function (naam) {
      punten[naam] = view.create("point3d", [
        function () { return plaats(naam)[0]; },
        function () { return plaats(naam)[1]; },
        function () { return plaats(naam)[2]; }
      ], { name: "", withLabel: false, size: 4, fixed: true, highlight: false,
           showInfobox: false });
      ctx.stijl(punten[naam].element2D, "punt");
    });

    // Het slepen gebeurt met een onzichtbaar 2D-punt boven elk hoekpunt, en
    // niet met gliders in 3D: die krijgen in JSXGraph 1.13 op een rechte
    // evenwijdig met de z-as geen coördinaten. Bij een parallelle projectie
    // is het beeld van een verschuiving lineair, dus volgt de verandering van
    // x, y of z exact uit de verplaatsing van de wijzer: langs de as van het
    // punt, of in het vlak via de beelden van twee assen.
    function beeld(c) {
      var p = view.project3DTo2D(c);
      return [p[1], p[2]];
    }
    function asbeeld(as) {
      var e = [as === "x" ? 1 : 0, as === "y" ? 1 : 0, as === "z" ? 1 : 0];
      var a = beeld(e), o = beeld([0, 0, 0]);
      return [a[0] - o[0], a[1] - o[1]];
    }
    var grepen = {};
    var sleep = null;
    Object.keys(HOEKEN).forEach(function (naam) {
      var c = beeld(plaats(naam));
      var greep = bord.create("point", c, {
        name: "", withLabel: false, size: 9, showInfobox: false,
        fillOpacity: 0, strokeOpacity: 0,
        highlightFillOpacity: 0.25, highlightStrokeOpacity: 0.6,
        precision: { touch: 30, mouse: 8 },
        // Boven de opschriften, die tot tegen hun hoekpunt reiken, en boven
        // de punten en lijnen van de 3D-tekening (laag 12 en 13).
        layer: 16
      });
      ctx.stijl(greep, "punt");
      grepen[naam] = greep;
      greep.on("down", function () {
        sleep = { naam: naam, begin: { x: s.x, y: s.y, z: s.z },
                  wijzer: [greep.X(), greep.Y()] };
      });
      greep.on("drag", function () {
        if (!sleep || sleep.naam !== naam) return;
        var d = [greep.X() - sleep.wijzer[0], greep.Y() - sleep.wijzer[1]];
        var assen = HOEKEN[naam].split("");
        var u = asbeeld(assen[0]);
        if (assen.length === 1) {
          var n = u[0] * u[0] + u[1] * u[1];
          if (n > 1e-9) {
            s[assen[0]] = beperk(sleep.begin[assen[0]] + (d[0] * u[0] + d[1] * u[1]) / n,
                                 assen[0]);
          }
        } else {
          // d = a·u + b·v oplossen; staat het vlak op zijn kant, dan niet.
          var v = asbeeld(assen[1]);
          var det = u[0] * v[1] - u[1] * v[0];
          if (Math.abs(det) > 1e-3 * Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1])) {
            s[assen[0]] = beperk(sleep.begin[assen[0]] + (d[0] * v[1] - d[1] * v[0]) / det,
                                 assen[0]);
            s[assen[1]] = beperk(sleep.begin[assen[1]] + (u[0] * d[1] - u[1] * d[0]) / det,
                                 assen[1]);
          }
        }
        toon();
      });
      greep.on("up", function () {
        sleep = null;
        zetAlles();
      });
    });
    // Na elke update (slepen, draaien, herschalen) liggen de grepen weer op
    // hun hoekpunt, behalve de greep die de wijzer nog vasthoudt.
    function volgGrepen() {
      Object.keys(grepen).forEach(function (naam) {
        if (sleep && sleep.naam === naam) return;
        var c = beeld(plaats(naam));
        grepen[naam].coords.setCoordinates(window.JXG.COORDS_BY_USER, c);
        grepen[naam].prepareUpdate().update().updateRenderer();
      });
    }
    bord.on("update", volgGrepen);

    function P(naam) { return function () { return plaats(naam); }; }
    var XYZ = view.create("point3d", [
      function () { return s.x; }, function () { return s.y; },
      function () { return s.z; }
    ], { name: "", withLabel: false, size: 4, fixed: true, showInfobox: false });
    ctx.stijl(XYZ.element2D || XYZ, "secante");

    // De vaste punten O, E1, E2 en E3.
    function vastPunt(c) {
      var p = view.create("point3d", c, {
        name: "", withLabel: false, size: 3, fixed: true, highlight: false,
        showInfobox: false
      });
      ctx.stijl(p.element2D || p, "tekst");
      return p;
    }
    vastPunt([0, 0, 0]);
    vastPunt([1, 0, 0]);
    vastPunt([0, 1, 0]);
    vastPunt([0, 0, 1]);

    // --- De balk ----------------------------------------------------------
    function ribbe(a, b, streep) {
      var ra = typeof a === "string" ? punten[a] : a;
      var rb = typeof b === "string" ? punten[b] : b;
      return ctx.stijl(view.create("line3d", [ra, rb], {
        strokeWidth: streep ? 1.2 : 1.8, dash: streep ? 2 : 0,
        fixed: true, highlight: false
      }), streep ? "hulp" : "kromme");
    }
    [["X", "XY"], ["XY", "Y"], ["Z", "YZ"], ["YZ", "Y"],
     ["X", "XZ"], ["XZ", "Z"]].forEach(function (r) { ribbe(r[0], r[1]); });
    [["XZ", XYZ], ["YZ", XYZ], ["XY", XYZ]].forEach(function (r) {
      ribbe(r[0], r[1], true);
    });

    // --- De opschriften ---------------------------------------------------
    opschrift(O, "O", [0, 0, "right", "bottom"]);
    opschrift([1, 0, 0], "\\vec E_1", [0, 0, "right", "bottom"]);
    opschrift([1, 0, 0], "(1,0,0)", [0, 0, "left", "top"], "afgeleide");
    opschrift([0, 1, 0], "\\vec E_2", [0, 0, "right", "bottom"]);
    opschrift([0, 1, 0], "(0,1,0)", [0, 0, "left", "bottom"], "afgeleide");
    opschrift([0, 0, 1], "\\vec E_3", [0, 0, "right", "bottom"]);
    opschrift([0, 0, 1], "(0,0,1)", [0, 0, "left", "bottom"], "afgeleide");
    [["X", "x\\vec E_1", "(x,0,0)"],
     ["Y", "y\\vec E_2", "(0,y,0)"],
     ["Z", "z\\vec E_3", "(0,0,z)"],
     ["XY", "x\\vec E_1+y\\vec E_2", "(x,y,0)"],
     ["XZ", "x\\vec E_1+z\\vec E_3", "(x,0,z)"],
     ["YZ", "y\\vec E_2+z\\vec E_3", "(0,y,z)"]].forEach(function (o) {
      opschrift(P(o[0]), o[1], [0, 0, "right", "bottom"]);
      opschrift(P(o[0]), o[2], [0, 0, "left", "top"], "afgeleide");
    });

    function toon() {
      ctx.toon("x = " + ctx.getal(s.x, 1) + ", y = " + ctx.getal(s.y, 1) +
               ", z = " + ctx.getal(s.z, 1) + ": het punt (x, y, z) is (" +
               ctx.getal(s.x, 1) + ", " + ctx.getal(s.y, 1) + ", " +
               ctx.getal(s.z, 1) + ").");
    }

    function zetAlles() {
      bord.update();
      toon();
    }

    // Komt MathJax pas na het bord, dan krijgen de opschriften nu hun vorm.
    var mj = window.MathJax;
    if (mj && mj.startup && mj.startup.promise) {
      mj.startup.promise.then(function () {
        opschriften.forEach(function (t) { t.setText(tex(t.mathesisBron)); });
        bord.update();
      });
    }

    function herstel() {
      s.x = BEGIN.x; s.y = BEGIN.y; s.z = BEGIN.z;
      if (typeof view.setView === "function") view.setView(BEGIN_AZ, BEGIN_EL);
      zetAlles();
    }

    zetAlles();
    return { reset: herstel };
  });
})();
