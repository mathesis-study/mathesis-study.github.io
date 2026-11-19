/* Interactieve grafieken bij A20_VerloopVanCyclometrischeFuncties.tex.
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

  var GRIJP = { touch: 30, mouse: 6 };           // ruim aanraakgebied

  /* --- Raaklijnen spiegelen om y = x ------------------------------------- */

  // De beperkte sinusgrafiek en de grafiek van Bgsin, elkaars spiegelbeeld om
  // y = x. Het punt P(a, sin a) glijdt over de sinusgrafiek; zijn spiegelbeeld
  // P'(sin a, a) ligt op de grafiek van Bgsin. In P staat de raaklijn t met
  // een hellingsdriehoekje 1 opzij en cos a op; in P' de raaklijn t' met het
  // gespiegelde driehoekje, 1 op en cos a opzij. De rico van t' is dus
  // 1 / cos a. De raaklijn t' gaat door P' en P' + (cos a, 1), zodat ze ook
  // in a = ±π/2 bestaat: daar is ze verticaal.
  G.registreer("spiegel-raaklijn", function (ctx) {
    var BEGIN_A = 0.6;
    var HALF = Math.PI / 2;

    var bord = ctx.maakBord({
      begrenzing: [-2.0, 2.75, 2.75, -2.0], raster: true, gelijkeschaal: true
    });

    function begrens(a) { return Math.max(-HALF, Math.min(HALF, a)); }

    ctx.stijl(bord.create("functiongraph",
      [function (x) { return x; }, -2.0, 2.75], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "zwak");
    ctx.stijl(bord.create("text", [-1.8, -1.35, "y = x"], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "zwak");

    ctx.stijl(bord.create("functiongraph", [Math.sin, -HALF, HALF], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "zwak");
    ctx.stijl(bord.create("text", [-1.45, -0.62, "y = sin x"], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "zwak");

    ctx.stijl(bord.create("functiongraph", [Math.asin, -1, 1], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("text", [-0.5, -1.75, "y = Bgsin x"], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "kromme");

    var P = ctx.stijl(bord.create("point", [BEGIN_A, Math.sin(BEGIN_A)], {
      name: "P", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [10, -14] }
    }), "punt");

    function a() { return P.X(); }
    function zet(x) {
      x = begrens(x);
      P.setPositionDirectly(window.JXG.COORDS_BY_USER, [x, Math.sin(x)]);
    }
    P.on("drag", function () { zet(P.X()); bord.update(); });

    // Het spiegelbeeld P' op de grafiek van Bgsin.
    var P2 = ctx.stijl(bord.create("point", [
      function () { return Math.sin(a()); },
      function () { return a(); }
    ], {
      name: "P'", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-26, 10] }
    }), "secante");
    ctx.stijl(bord.create("segment", [P, P2], {
      strokeWidth: 1, dash: 1, fixed: true, highlight: false
    }), "zwak");

    // De raaklijn t in P met haar driehoekje: 1 opzij, cos a op.
    var R = bord.create("point", [
      function () { return a() + 1; },
      function () { return Math.sin(a()); }
    ], { visible: false, fixed: true });
    var Q = bord.create("point", [
      function () { return a() + 1; },
      function () { return Math.sin(a()) + Math.cos(a()); }
    ], { visible: false, fixed: true });
    ctx.stijl(bord.create("line", [P, Q], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("segment", [P, R], {
      strokeWidth: 1.5, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("segment", [R, Q], {
      strokeWidth: 3.5, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("text", [
      function () { return a() + 0.5; },
      function () { return Math.sin(a()) - 14 / bord.unitY; },
      "1"
    ], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "punt");
    ctx.stijl(bord.create("point", [
      function () { return a() + 1.5; },
      function () { return Math.sin(a()) + 1.5 * Math.cos(a()); }
    ], {
      name: "t", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0, label: { offset: [8, -12] }
    }), "punt");

    // Het gespiegelde driehoekje in P': 1 op, cos a opzij.
    var R2 = bord.create("point", [
      function () { return Math.sin(a()); },
      function () { return a() + 1; }
    ], { visible: false, fixed: true });
    var Q2 = bord.create("point", [
      function () { return Math.sin(a()) + Math.cos(a()); },
      function () { return a() + 1; }
    ], { visible: false, fixed: true });
    ctx.stijl(bord.create("line", [P2, Q2], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("segment", [P2, R2], {
      strokeWidth: 1.5, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("segment", [R2, Q2], {
      strokeWidth: 3.5, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("text", [
      function () { return Math.sin(a()) - 14 / bord.unitX; },
      function () { return a() + 0.5; },
      "1"
    ], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "secante");
    ctx.stijl(bord.create("point", [
      function () { return Math.sin(a()) + 1.5 * Math.cos(a()); },
      function () { return a() + 1.5; }
    ], {
      name: "t'", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0, label: { offset: [-18, 8] }
    }), "secante");

    function werkBij() {
      var x = a();
      var m = Math.cos(x);
      var zin = "P(" + ctx.getal(x, 2) + ", " + ctx.getal(Math.sin(x), 2) +
        "), rico van t = cos " + ctx.getal(x, 2) + " = " + ctx.getal(m, 2) +
        ". P'(" + ctx.getal(Math.sin(x), 2) + ", " + ctx.getal(x, 2) + "), ";
      if (m < 0.005) {
        zin += "t is horizontaal, dus t' is verticaal: in dit randpunt is" +
          " Bgsin niet afleidbaar.";
      } else {
        zin += "rico van t' = 1 / " + ctx.getal(m, 2) + " = " +
          ctx.getal(1 / m, 2) + ".";
      }
      ctx.toon(zin);
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(BEGIN_A);
      bord.update();
      werkBij();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();

    return { reset: herstel };
  });
})();
