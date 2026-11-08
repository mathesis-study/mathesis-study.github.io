/* Interactieve grafieken bij A19_VerloopVanGoniometrischeFuncties.tex.
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

  /* --- De helling van de sinusgrafiek ------------------------------------ */

  // De grafiek van sin x met een punt P erop en de raaklijn t in P. Een
  // hellingsdriehoekje met horizontale zijde 1 toont de rico van t als
  // verticale zijde. Het punt H zet die rico als hoogte uit boven of onder
  // P: H = (x, cos x). Het spoor van H, op vraag getoond, is de grafiek van
  // de afgeleide: de cosinusgrafiek.
  G.registreer("helling-sinus", function (ctx) {
    var BEGIN_X = 1;
    var LINKS = 0, RECHTS = 2 * Math.PI;

    var bord = ctx.maakBord({
      begrenzing: [-0.6, 2.1, 7.0, -1.7], raster: true
    });

    function f(x) { return Math.sin(x); }
    function afgeleide(x) { return Math.cos(x); }
    function begrens(x) { return Math.max(LINKS, Math.min(RECHTS, x)); }

    var spoor = ctx.stijl(bord.create("functiongraph",
      [afgeleide, -0.6, 7.0], {
        strokeWidth: 2, dash: 2, fixed: true, highlight: false, visible: false
      }), "afgeleide");

    ctx.stijl(bord.create("functiongraph", [f, -0.6, 7.0], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("text", [4.75, -1.3, "y = sin x"], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "kromme");

    var P = ctx.stijl(bord.create("point", [BEGIN_X, f(BEGIN_X)], {
      name: "P", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [-20, 12] }
    }), "punt");

    function zet(x) {
      x = begrens(x);
      P.setPositionDirectly(window.JXG.COORDS_BY_USER, [x, f(x)]);
    }
    P.on("drag", function () { zet(P.X()); bord.update(); });

    // De raaklijn door P met rico cos x.
    var Q = bord.create("point", [
      function () { return P.X() + 1; },
      function () { return P.Y() + afgeleide(P.X()); }
    ], { visible: false, fixed: true });
    var R = bord.create("point", [
      function () { return P.X() + 1; },
      function () { return P.Y(); }
    ], { visible: false, fixed: true });

    ctx.stijl(bord.create("line", [P, Q], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "raaklijn");
    ctx.stijl(bord.create("point", [
      function () { return P.X() - 0.55; },
      function () { return P.Y() - 0.55 * afgeleide(P.X()); }
    ], {
      name: "t", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0, label: { offset: [-14, 4] }
    }), "raaklijn");

    // Het hellingsdriehoekje: 1 opzij, de rico op of neer.
    ctx.stijl(bord.create("segment", [P, R], {
      strokeWidth: 1.5, fixed: true, highlight: false
    }), "hulp");
    ctx.stijl(bord.create("segment", [R, Q], {
      strokeWidth: 4, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("text", [
      function () { return P.X() + 0.5; },
      function () { return P.Y() - 14 / bord.unitY * (afgeleide(P.X()) < 0 ? -1 : 1); },
      "1"
    ], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle",
      fontSize: 14
    }), "hulp");

    // H zet de rico uit als hoogte, recht boven of onder P.
    var H = ctx.stijl(bord.create("point", [
      function () { return P.X(); },
      function () { return afgeleide(P.X()); }
    ], {
      name: "H", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [8, -12] }
    }), "afgeleide");
    ctx.stijl(bord.create("segment", [
      [function () { return P.X(); }, 0], H
    ], {
      strokeWidth: 4, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("segment", [P, H], {
      strokeWidth: 1, dash: 1, fixed: true, highlight: false
    }), "zwak");

    function werkBij() {
      var x = P.X();
      var rico = afgeleide(x);
      var verloop = Math.abs(rico) < 0.005 ? "een top: de raaklijn is horizontaal"
        : rico > 0 ? "de grafiek stijgt" : "de grafiek daalt";
      ctx.toon(
        "P(" + ctx.getal(x, 2) + ", " + ctx.getal(f(x), 2) +
        "); rico van t = " + ctx.getal(rico, 2) +
        " = cos " + ctx.getal(x, 2) + ", dus H(" + ctx.getal(x, 2) + ", " +
        ctx.getal(rico, 2) + "); " + verloop + ".");
    }
    bord.on("update", werkBij);

    var knopSpoor = ctx.knop("Spoor van H tonen", function (knop) {
      var aan = spoor.visProp.visible !== true;
      spoor.setAttribute({ visible: aan });
      knop.setAttribute("aria-pressed", String(aan));
      knop.textContent = aan ? "Spoor van H verbergen" : "Spoor van H tonen";
      bord.update();
    });
    knopSpoor.setAttribute("aria-pressed", "false");

    function herstel() {
      zet(BEGIN_X);
      spoor.setAttribute({ visible: false });
      knopSpoor.setAttribute("aria-pressed", "false");
      knopSpoor.textContent = "Spoor van H tonen";
      bord.update();
      werkBij();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();

    return { reset: herstel };
  });

  /* --- De opeenvolgende afgeleiden van sin x ------------------------------ */

  // Een formule als SVG van MathJax, om in een tekst op het bord te zetten.
  // Zonder MathJax blijft er een tekstversie staan.
  function maakTex() {
    var cache = {};
    return function (tex, tekst) {
      if (cache[tex]) return cache[tex];
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        cache[tex] = mj.tex2svg("\\displaystyle " + tex, { display: false })
          .querySelector("svg").outerHTML;
      } catch (e) {
        return tekst;
      }
      return cache[tex];
    };
  }

  // De n-de afgeleide van sin x is sin(x + n·π/2): elke afleiding schuift de
  // grafiek een kwart periode naar links. De knop Afleiden laat die
  // verschuiving zien: de nieuwe afgeleide schuift vloeiend uit de vorige
  // naar links, en een pijl van top naar top meet die laatste stap. De
  // grafiek van sin x zelf blijft gestreept staan als vast vertrekpunt, zodat
  // na vier keer afleiden te zien is dat de grafiek er weer op valt.
  G.registreer("afgeleiden-sinus", function (ctx) {
    var KWART = Math.PI / 2;
    var DUUR = 700;                                 // ms per verschuiving
    var MAX = 8;
    var tex = maakTex();

    var bord = ctx.maakBord({
      begrenzing: [-1.9, 2.4, 7.1, -2.0], raster: true
    });

    var n = 0;            // hoeveel keer afgeleid
    var fase = 0;         // de getekende verschuiving, in kwarten; loopt naar n
    var lopend = null;

    function huidig(x) { return Math.sin(x + fase * KWART); }

    ctx.stijl(bord.create("functiongraph",
      [function (x) { return Math.sin(x); }, -1.9, 7.1], {
        strokeWidth: 2, dash: 2, fixed: true, highlight: false
      }), "zwak");
    ctx.stijl(bord.create("functiongraph", [huidig, -1.9, 7.1], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");

    // De top van de vorige afgeleide tussen π/2 en 5π/2, en die van de
    // nieuwe een kwart periode links ervan, dus tussen 0 en 2π.
    function vorigeTop() {
      var t = KWART - (n - 1) * KWART;
      while (t < KWART) t += 2 * Math.PI;
      while (t >= 5 * KWART) t -= 2 * Math.PI;
      return t;
    }
    function huidigeTop() { return vorigeTop() - (fase - (n - 1)) * KWART; }

    var HOOGTE = 1.3;
    var A = bord.create("point", [vorigeTop, HOOGTE], { visible: false, fixed: true });
    var B = bord.create("point", [huidigeTop, HOOGTE], { visible: false, fixed: true });
    var pijl = ctx.stijl(bord.create("arrow", [A, B], {
      strokeWidth: 3, fixed: true, highlight: false, visible: false,
      lastArrow: { type: 2, size: 5 }
    }), "secante");
    var hulp1 = ctx.stijl(bord.create("segment", [
      A, [vorigeTop, 1]
    ], { strokeWidth: 1, dash: 1, fixed: true, highlight: false, visible: false }), "zwak");
    var hulp2 = ctx.stijl(bord.create("segment", [
      B, [huidigeTop, 1]
    ], { strokeWidth: 1, dash: 1, fixed: true, highlight: false, visible: false }), "zwak");
    var pijlLabel = ctx.stijl(bord.create("text", [
      function () { return (vorigeTop() + huidigeTop()) / 2; },
      HOOGTE + 0.32,
      function () { return tex("\\frac{\\pi}{2}", "π/2"); }
    ], {
      anchorX: "middle", anchorY: "middle", fixed: true, highlight: false,
      display: "html", useMathJax: false, fontSize: 15, visible: false
    }), "secante");

    var NAMEN = ["f(x)", "f'(x)", "f''(x)", "f'''(x)"];
    var WAARDEN = ["\\sin x", "\\cos x", "-\\sin x", "-\\cos x"];
    var TEKSTEN = ["sin x", "cos x", "−sin x", "−cos x"];
    function naam(k) { return k < 4 ? NAMEN[k] : "f^{(" + k + ")}(x)"; }
    function naamTekst(k) {
      return k < 4 ? NAMEN[k].replace(/'/g, "′") : "f(" + k + ")(x)";
    }
    function formule() {
      var w = WAARDEN[n % 4];
      if (n === 0) return naam(0) + " = " + w;
      var hoek = n === 1 ? "\\frac{\\pi}{2}" : n + "\\cdot\\frac{\\pi}{2}";
      return naam(n) + " = \\sin\\left(x+" + hoek + "\\right) = " + w;
    }
    ctx.stijl(bord.create("text", [0.45, -1.58, function () {
      return tex(formule(), naamTekst(n) + " = " + TEKSTEN[n % 4]);
    }], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      display: "html", useMathJax: false, fontSize: 16
    }), "tekst");

    function toonPijl(aan) {
      [pijl, hulp1, hulp2, pijlLabel].forEach(function (o) {
        o.setAttribute({ visible: aan });
      });
    }

    function werkBij() {
      var zin = naamTekst(n) + " = " + TEKSTEN[n % 4] + ".";
      if (n === 0) {
        zin += " Druk op Afleiden.";
      } else {
        zin += " Ten opzichte van " + naamTekst(n - 1) + " schoof de grafiek een" +
          " kwart periode, π/2, naar links. Gestreept: sin x.";
        if (n % 4 === 0) zin += " Na vier keer afleiden zijn we terug bij sin x.";
      }
      ctx.toon(zin);
    }

    function stopLoop() {
      if (lopend !== null) window.cancelAnimationFrame(lopend);
      lopend = null;
    }

    function ga(nieuw) {
      stopLoop();
      var vooruit = nieuw > n;
      n = nieuw;
      toonPijl(n > 0);
      werkBij();
      if (!vooruit) { fase = n; bord.update(); return; }
      var start = null;
      fase = n - 1;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / DUUR);
        var zacht = deel < 0.5 ? 2 * deel * deel : 1 - 2 * (1 - deel) * (1 - deel);
        fase = n - 1 + zacht;
        bord.update();
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    }

    var knopTerug = ctx.knop("Terug", function () { if (n > 0) ga(n - 1); });
    ctx.knop("Afleiden", function () { if (n < MAX) ga(n + 1); });

    function herstel() {
      stopLoop();
      n = 0;
      fase = 0;
      toonPijl(false);
      bord.update();
      werkBij();
    }
    ctx.knop("Beginstand", herstel);
    knopTerug.title = "Een afgeleide terug";
    herstel();

    return { reset: herstel, vernietig: stopLoop };
  });
})();
