/* Interactieve grafieken bij A18_VerloopVanExponentieleEnLogaritmischeFuncties.tex.
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

  /* --- Het bijzondere van e ---------------------------------------------- */

  // De grafiek van f(x) = a^x met de raaklijn t in P(x, a^x). Die raaklijn
  // snijdt de x-as in T, op afstand 1/ln a links van de voet H van P, waar P
  // ook ligt. De rico van t is dus |HP| / |TH| = a^x ln a. De leerling kiest a
  // met een schuifknop en ziet dat |TH| precies 1 wordt bij a = e: dan is de
  // helling overal gelijk aan de hoogte, en valt de grafiek van f' op die
  // van f.
  G.registreer("bijzondere-e", function (ctx) {
    var AMIN = 1.5, AMAX = 4, BEGIN_A = 2;
    var BEGIN_X = 1;                            // de beginstand van P
    var LINKS = -2.2;                           // P blijft rechts hiervan
    var RECHTS = 2.2;                           // en links hiervan,
    var HOOGST = 6.4;                           // en onder deze hoogte
    var VANGST = 0.04;                          // zo dicht bij e is het e

    var bord = ctx.maakBord({
      begrenzing: [-5.6, 7.6, 2.8, -1.3], raster: true
    });

    var schuif = bord.create("slider",
      [[-5.2, 6.9], [-2.6, 6.9], [AMIN, BEGIN_A, AMAX]], {
        name: "a", withTicks: false, size: 6, withLabel: false
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");

    function grondtal() {
      var a = schuif.Value();
      return Math.abs(a - Math.E) < VANGST ? Math.E : a;
    }
    function isE() { return grondtal() === Math.E; }
    function f(x) { return Math.pow(grondtal(), x); }
    function ln() { return Math.log(grondtal()); }
    function afgeleide(x) { return f(x) * ln(); }
    function grens() { return Math.min(RECHTS, Math.log(HOOGST) / ln()); }
    function begrens(x) { return Math.max(LINKS, Math.min(grens(), x)); }

    ctx.stijl(bord.create("text", [-5.2, 7.35, function () {
      return isE() ? "a = e ≈ " + ctx.getal(Math.E, 3)
                   : "a = " + ctx.getal(grondtal(), 2);
    }], {
      fixed: true, highlight: false, anchorX: "left", anchorY: "middle"
    }), "punt");

    var afgeleidekromme = ctx.stijl(bord.create("functiongraph",
      [afgeleide, -5.6, 2.8], {
        strokeWidth: 2, dash: 2, fixed: true, highlight: false, visible: false
      }), "afgeleide");

    ctx.stijl(bord.create("functiongraph", [f, -5.6, 2.8], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("text", [-4.6, function () { return f(-4.6) + 0.45; },
      "f"], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), "kromme");

    // P ligt altijd op de grafiek en H er recht onder op de x-as. Wie het
    // ene versleept, verplaatst het andere mee.
    var P = ctx.stijl(bord.create("point", [BEGIN_X, f(BEGIN_X)], {
      name: "P", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [-22, 10] }
    }), "punt");
    var H = ctx.stijl(bord.create("point", [BEGIN_X, 0], {
      name: "H", size: 3, showInfobox: false, precision: GRIJP,
      label: { offset: [4, -14] }
    }), "hulp");

    function zet(x) {
      x = begrens(x);
      P.setPositionDirectly(window.JXG.COORDS_BY_USER, [x, f(x)]);
      H.setPositionDirectly(window.JXG.COORDS_BY_USER, [x, 0]);
    }
    P.on("drag", function () { zet(P.X()); bord.update(); });
    H.on("drag", function () { zet(H.X()); bord.update(); });
    schuif.on("drag", function () {
      if (isE()) schuif.setValue(Math.E);
      zet(P.X());
      bord.update();
    });

    function tX() { return P.X() - 1 / ln(); }
    var T = ctx.stijl(bord.create("point", [tX, 0], {
      name: "T", size: 3, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-14, -14] }
    }), "secante");

    ctx.stijl(bord.create("line", [T, P], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "raaklijn");
    ctx.stijl(bord.create("point", [
      function () { return P.X() + 0.5; },
      function () { return P.Y() + 0.5 * afgeleide(P.X()); }
    ], {
      name: "t", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0, label: { offset: [10, -6] }
    }), "raaklijn");

    // De twee zijden van de driehoek THP: horizontaal 1/ln a, verticaal de
    // hoogte a^x van P. Hun quotiënt is de rico van t.
    ctx.stijl(bord.create("segment", [T, H], {
      strokeWidth: 4, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("segment", [H, P], {
      strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
    }), "hulp");

    ctx.stijl(bord.create("text", [
      function () { return (T.X() + H.X()) / 2; },
      function () { return -22 / bord.unitY; },
      function () { return isE() ? "1" : ctx.getal(1 / ln(), 2); }
    ], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle",
      fontSize: 16
    }), "secante");

    // Boven het raster, links waar de grafiek laag blijft, staat het verband
    // tussen helling en hoogte. Het staat links vast, dus een andere
    // breedte duwt niets opzij. Zonder MathJax blijft er een tekstversie.
    var vorigeTex = null;
    var vorigeHtml = "";
    function formuleHtml() {
      var tex = isE()
        ? "f'(x) = e^x = f(x)"
        : "f'(x) = a^x \\ln a = " + ctx.getal(ln(), 2) + "\\cdot f(x)";
      if (tex === vorigeTex) return vorigeHtml;
      vorigeTex = tex;
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        vorigeHtml = mj.tex2svg("\\displaystyle " + tex, { display: false })
          .querySelector("svg").outerHTML;
      } catch (e) {
        vorigeHtml = tex.replace(/\\cdot/g, "·").replace(/\\ln/g, "ln")
          .replace(/\^x/g, "ˣ").replace(/'/g, "′");
      }
      return vorigeHtml;
    }
    ctx.stijl(bord.create("text", [-5.2, 5.9, formuleHtml], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      display: "html", useMathJax: false, fontSize: 16
    }), "tekst");

    function werkBij() {
      var x = P.X();
      var naam = isE() ? "e" : ctx.getal(grondtal(), 2);
      var afstand = isE() ? "precies 1" : ctx.getal(1 / ln(), 2);
      ctx.toon(
        "f(x) = " + naam + "ˣ; P(" + ctx.getal(x) + ", " + ctx.getal(f(x)) +
        "); rico van t = f′(x) = " + ctx.getal(afgeleide(x), 3) +
        "; f′(x) / f(x) = ln a = " + ctx.getal(ln(), 3) +
        ". De raaklijn snijdt de x-as " + afstand + " links van H" +
        (isE() ? ", dus de helling is overal gelijk aan de hoogte."
               : ", waar P ook ligt."));
    }
    bord.on("update", werkBij);

    var knopAfgeleide = ctx.knop("Grafiek van f′ tonen", function (knop) {
      var aan = afgeleidekromme.visProp.visible !== true;
      afgeleidekromme.setAttribute({ visible: aan });
      knop.setAttribute("aria-pressed", String(aan));
      knop.textContent = aan ? "Grafiek van f′ verbergen"
                             : "Grafiek van f′ tonen";
      bord.update();
    });
    knopAfgeleide.setAttribute("aria-pressed", "false");

    ctx.knop("a = e", function () {
      schuif.setValue(Math.E);
      zet(P.X());
      bord.update();
    });

    function herstel() {
      schuif.setValue(BEGIN_A);
      zet(BEGIN_X);
      afgeleidekromme.setAttribute({ visible: false });
      knopAfgeleide.setAttribute("aria-pressed", "false");
      knopAfgeleide.textContent = "Grafiek van f′ tonen";
      bord.update();
      werkBij();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();

    return { reset: herstel };
  });
})();
