/* Interactieve grafieken bij vierkantsvergelijkingen.tex.
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

  // ctx.getal met een echt minteken, zoals in de formules van de cursus.
  function getal(ctx, waarde, decimalen) {
    return ctx.getal(waarde, decimalen).replace(/^-/, "−");
  }

  /* --- De discriminant als verschuiving ---------------------------------- */

  // De parabool y = x² − 6x + c uit het voorbeeld x² − 6x + 2 = 0. Met a = 1
  // en b = −6 is D = 36 − 4c: de discriminant bepaalt c en dus de hoogte van
  // de parabool, want de top ligt op y = −D/(4a) = −D/4. De schuifknop gaat
  // per 4, zodat c altijd een geheel getal blijft en de vergelijking er
  // uitziet als een oefening uit de cursus.
  var DMIN = -16, DMAX = 40, DSTAP = 4, DBEGIN = 28;

  G.registreer("discriminant-parabool", function (ctx) {
    var bord = ctx.maakBord({ begrenzing: [-1.5, 13, 7.5, -12.5], raster: true });

    var schuif = bord.create("slider",
      [[0.3, -11.3], [2.5, -11.3], [DMIN, DBEGIN, DMAX]], {
        name: "D", snapWidth: DSTAP, withTicks: false,
        size: 6, withLabel: false
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");

    function D() {
      var d = Math.round(schuif.Value() / DSTAP) * DSTAP;
      return Math.max(DMIN, Math.min(DMAX, d));
    }
    ctx.stijl(bord.create("text", [0.3, -9.9, function () {
      return "D = " + getal(ctx, D());
    }], {
      fixed: true, highlight: false, anchorX: "left", anchorY: "middle"
    }), "punt");
    function c() { return (36 - D()) / 4; }
    function f(x) { return x * x - 6 * x + c(); }
    function halveBreedte() { return Math.sqrt(Math.max(D(), 0)) / 2; }

    ctx.stijl(bord.create("line", [[3, 0], [3, 1]], {
      fixed: true, highlight: false, dash: 2, strokeWidth: 1.5
    }), "hulp");
    ctx.stijl(bord.create("text", [3.15, -11.5, "x = −b/(2a) = 3"], {
      fixed: true, highlight: false, anchorX: "left", anchorY: "middle"
    }), "zwak");

    ctx.stijl(bord.create("functiongraph", [f], {
      fixed: true, highlight: false, strokeWidth: 2.5
    }), "kromme");

    // De afstand van de symmetrieas tot elk nulpunt is √D/(2a).
    [-1, 1].forEach(function (kant) {
      ctx.stijl(bord.create("segment", [
        [3, 0], [function () { return 3 + kant * halveBreedte(); }, 0]
      ], {
        fixed: true, highlight: false, strokeWidth: 4,
        visible: function () { return D() > 0; }
      }), "secante");
    });
    ctx.stijl(bord.create("text", [
      function () { return 3 + halveBreedte() / 2; }, 1.1, "√D/(2a)"
    ], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle",
      visible: function () { return D() >= 16; }
    }), "secante");

    var nulpunten = [-1, 1].map(function (kant) {
      return ctx.stijl(bord.create("point", [
        function () { return 3 + kant * halveBreedte(); }, 0
      ], {
        fixed: true, highlight: false, withLabel: false, size: 4,
        visible: function () { return D() >= 0; }
      }), "punt");
    });
    ctx.stijl(bord.create("text", [
      function () { return nulpunten[0].X() - 0.15; }, -1.1,
      function () { return D() === 0 ? "x₁ = x₂" : "x₁"; }
    ], {
      fixed: true, highlight: false, anchorX: "right", anchorY: "middle",
      visible: function () { return D() >= 0; }
    }), "punt");
    ctx.stijl(bord.create("text", [
      function () { return nulpunten[1].X() + 0.15; }, -1.1, "x₂"
    ], {
      fixed: true, highlight: false, anchorX: "left", anchorY: "middle",
      visible: function () { return D() > 0; }
    }), "punt");

    // De top schuift over de symmetrieas en neemt de schuifknop mee.
    var top = ctx.stijl(bord.create("point", [3, -DBEGIN / 4], {
      name: "T", size: 5, precision: GRIJP, showInfobox: false,
      label: { offset: [10, -12] }
    }), "punt");

    function zetTop() {
      top.setPositionDirectly(window.JXG.COORDS_BY_USER, [3, -D() / 4]);
    }
    top.on("drag", function () {
      var d = -4 * Math.round(top.Y());
      schuif.setValue(Math.max(DMIN, Math.min(DMAX, d)));
      zetTop();
      bord.update();
    });
    schuif.on("drag", function () { zetTop(); bord.update(); });

    function term(k) {
      if (k === 0) return "";
      return (k > 0 ? " + " : " − ") + Math.abs(k);
    }
    function factor(r) {
      if (r === 0) return "x";
      return "(x " + (r > 0 ? "− " : "+ ") + Math.abs(r) + ")";
    }

    function werkBij() {
      var d = D(), k = c();
      var vgl = "x² − 6x" + term(k);
      var dTekst = "D = " + getal(ctx, d);
      if (d < 0) {
        ctx.toon(dTekst + " < 0: " + vgl + " = 0 heeft geen reële oplossingen. " +
                 "De parabool raakt de x-as niet.");
        return;
      }
      var w = Math.sqrt(d);
      if (d === 0) {
        ctx.toon(dTekst + ": " + vgl + " = (x − 3)², één dubbele oplossing x = 3. " +
                 "De top ligt op de x-as.");
        return;
      }
      var x1 = 3 - w / 2, x2 = 3 + w / 2;
      if (Math.round(w) === w) {
        ctx.toon(dTekst + " = " + w + "² is een kwadraat: " + vgl + " = " +
                 factor(x1) + factor(x2) + ", dus x = " + getal(ctx, x1) +
                 " of x = " + getal(ctx, x2) + ". Ontbinden lukt.");
      } else {
        ctx.toon(dTekst + " > 0: " + vgl + " = 0 heeft twee oplossingen, x = (6 ± √" +
                 d + ")/2 ≈ " + getal(ctx, x1, 2) + " of " + getal(ctx, x2, 2) +
                 ". " + d + " is geen kwadraat, dus ontbinden lukt niet.");
      }
    }
    bord.on("update", werkBij);

    function herstel() {
      schuif.setValue(DBEGIN);
      zetTop();
      bord.update();
    }
    herstel();
    return { reset: herstel };
  });
})();
