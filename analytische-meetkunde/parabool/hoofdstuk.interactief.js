/* Interactieve grafieken bij M03_Parabool.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert de context: het bord, de kleuren per
 * rol, de getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 *
 * Loodrechte stand en gelijke hoeken moeten er op het scherm ook zo uitzien,
 * dus elk bord gebruikt dezelfde schaal op beide assen. De parabool staat,
 * zoals in de cursus, meestal in de stand y² = 2px met top O.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var GRIJP = { touch: 30, mouse: 6 };           // ruim aanraakgebied
  var EPS = 1e-9;

  /* --- Getallen en formules als tekst ------------------------------------ */

  // ctx.getal met een echt minteken, zoals in de formules van de cursus.
  function getal(ctx, waarde, decimalen) {
    return ctx.getal(waarde, decimalen).replace(/^-/, "−");
  }

  function punt(ctx, x, y) {
    return "(" + getal(ctx, x) + ", " + getal(ctx, y) + ")";
  }

  function geheel(v) { return Math.abs(v - Math.round(v)) < 1e-7; }

  function ggd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { var r = a % b; a = b; b = r; }
    return a;
  }

  // u·x + v·y + w = 0 als tekst: 5x + 6y + 9 = 0. Lukt het met een kleine
  // factor om gehele coëfficiënten te krijgen, dan gedeeld door hun ggd en
  // met een positieve eerste coëfficiënt; anders met afgeronde decimalen.
  function rechteTekst(ctx, u, v, w) {
    for (var k = 1; k <= 12; k++) {
      if (geheel(k * u) && geheel(k * v) && geheel(k * w)) {
        u *= k; v *= k; w *= k;
        break;
      }
    }
    if (geheel(u) && geheel(v) && geheel(w)) {
      u = Math.round(u); v = Math.round(v); w = Math.round(w);
      var d = ggd(ggd(u, v), w) || 1;
      u /= d; v /= d; w /= d;
      if ((u !== 0 ? u : v) < 0) { u = -u; v = -v; w = -w; }
    }
    var delen = [];
    function term(c, letter) {
      if (Math.abs(c) < 1e-7) return;
      var abs = Math.abs(c);
      var tekst = (Math.abs(abs - 1) < 1e-7 && letter ? "" : getal(ctx, abs)) + letter;
      if (!delen.length) delen.push((c < 0 ? "−" : "") + tekst);
      else delen.push((c < 0 ? "− " : "+ ") + tekst);
    }
    term(u, "x");
    term(v, "y");
    term(w, "");
    return (delen.length ? delen.join(" ") : "0") + " = 0";
  }

  /* --- Bouwstenen op het bord -------------------------------------------- */

  function sleeppunt(ctx, bord, x, y, naam, rol, label) {
    return ctx.stijl(bord.create("point", [x, y], {
      name: naam, size: 5, showInfobox: false, precision: GRIJP,
      label: label || { offset: [8, 12] }
    }), rol || "punt");
  }

  function vastpunt(ctx, bord, coords, naam, rol, label) {
    return ctx.stijl(bord.create("point", coords, {
      name: naam, size: 3, fixed: true, highlight: false, showInfobox: false,
      withLabel: !!naam, label: label || { offset: [6, -12] }
    }), rol || "tekst");
  }

  function zet(p, x, y) {
    p.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
  }

  function klem(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function samen(basis, extra) {
    Object.keys(extra || {}).forEach(function (k) { basis[k] = extra[k]; });
    return basis;
  }

  function lijnstuk(ctx, bord, p, q, rol, opties) {
    return ctx.stijl(bord.create("segment", [p, q], samen(
      { fixed: true, highlight: false, withLabel: false, strokeWidth: 2 }, opties)), rol);
  }

  // De rechte c + a·x + b·y = 0, met functies voor c, a en b.
  function rechte(ctx, bord, c, a, b, rol, opties) {
    return ctx.stijl(bord.create("line", [c, a, b], samen(
      { fixed: true, highlight: false, withLabel: false, strokeWidth: 2 }, opties)), rol);
  }

  function tekst(ctx, bord, x, y, inhoud, rol, opties) {
    return ctx.stijl(bord.create("text", [x, y, inhoud], samen(
      { fixed: true, highlight: false, anchorX: "middle", anchorY: "middle" }, opties)),
      rol || "tekst");
  }

  // Een kromme waarvan de punten bij elke update opnieuw berekend worden.
  // bereken() geeft [xs, ys] terug, of null.
  function pad(ctx, bord, rol, bereken, opties) {
    var kromme = bord.create("curve", [[], []], samen(
      { fixed: true, highlight: false, withLabel: false, strokeWidth: 1.5 }, opties));
    kromme.updateDataArray = function () {
      var p = bereken();
      this.dataX = p ? p[0] : [];
      this.dataY = p ? p[1] : [];
    };
    return ctx.stijl(kromme, rol);
  }

  // De parabool y² = 2px, met p een functie.
  function parabool(ctx, bord, p, rol, opties) {
    return ctx.stijl(bord.create("curve", [
      function (t) { return t * t / (2 * p()); },
      function (t) { return t; }, -14, 14
    ], samen({ fixed: true, highlight: false, strokeWidth: 2.5 }, opties)), rol || "kromme");
  }

  // Een boogje rond c() van hoek a() naar hoek b(), langs de kleinste kant,
  // met een straal in pixels.
  function boog(ctx, bord, c, a, b, straal, rol) {
    return pad(ctx, bord, rol, function () {
      var m = c(), h1 = a(), h2 = b();
      if (!m || h1 === null || h2 === null) return null;
      var verschil = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1));
      var r = straal / bord.unitX, xs = [], ys = [];
      for (var i = 0; i <= 16; i++) {
        var h = h1 + verschil * i / 16;
        xs.push(m[0] + r * Math.cos(h));
        ys.push(m[1] + r * Math.sin(h));
      }
      return [xs, ys];
    }, { strokeWidth: 2 });
  }

  // Het vierkantje van een rechte hoek in h() tussen de eenheidsvectoren
  // u() en v(), in pixels, dus even groot bij elke schermgrootte.
  function rechteHoek(ctx, bord, h, u, v, rol) {
    return pad(ctx, bord, rol || "zwak", function () {
      var p = h(), a = u(), b = v();
      if (!p || !a || !b) return null;
      var s = 10 / bord.unitX;
      return [
        [p[0] + s * a[0], p[0] + s * (a[0] + b[0]), p[0] + s * b[0]],
        [p[1] + s * a[1], p[1] + s * (a[1] + b[1]), p[1] + s * b[1]]
      ];
    }, { strokeWidth: 1 });
  }

  function eenheid(dx, dy) {
    var l = Math.sqrt(dx * dx + dy * dy);
    return l < EPS ? null : [dx / l, dy / l];
  }

  // Een aan/uit-knop: het opschrift blijft staan, aria-pressed toont of het
  // aanligt.
  function schakelaar(ctx, naam, begin, functie) {
    var stand = begin;
    var knop = ctx.knop(naam, function () { zetStand(!stand); });
    function zetStand(nieuw) {
      stand = nieuw;
      knop.setAttribute("aria-pressed", String(stand));
      functie(stand);
    }
    knop.setAttribute("aria-pressed", String(stand));
    return { zet: zetStand, stand: function () { return stand; } };
  }

  // Een animatie over duur ms; stap(deel) krijgt een waarde van 0 tot 1.
  function animatie() {
    var lopend = null;
    function stop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }
    function start(duur, stap, klaar) {
      stop();
      var begin = null;
      function volgende(tijd) {
        if (begin === null) begin = tijd;
        var deel = Math.min(1, (tijd - begin) / duur);
        stap(deel);
        if (deel < 1) lopend = window.requestAnimationFrame(volgende);
        else { lopend = null; if (klaar) klaar(); }
      }
      lopend = window.requestAnimationFrame(volgende);
    }
    return { start: start, stop: stop };
  }

  // Stippen die een punt achterlaat, zodat de parabool uit losse punten
  // ontstaat.
  function stippen(ctx, bord, rol) {
    var lijst = [];
    var MAX = 400;
    function leg(x, y) {
      if (lijst.length >= MAX) return;
      for (var i = 0; i < lijst.length; i++) {
        if (Math.hypot(lijst[i].X() - x, lijst[i].Y() - y) < 0.07) return;
      }
      lijst.push(ctx.stijl(bord.create("point", [x, y], {
        name: "", withLabel: false, size: 2, fixed: true, highlight: false,
        showInfobox: false
      }), rol || "afgeleide"));
    }
    function wis() {
      lijst.forEach(function (s) { bord.removeObject(s); });
      lijst = [];
    }
    return { leg: leg, wis: wis, aantal: function () { return lijst.length; } };
  }

  function puntenTekst(n) { return n === 1 ? "1 punt" : n + " punten"; }

  /* --- 1. De parabool als verzameling punten ------------------------------ */

  // De definitie zegt: alle punten die even ver van F als van r liggen. De
  // leerling zoekt die punten zelf: P ligt vrij, en telkens |PF| en |PG|
  // gelijk worden, blijft er een stip achter. F verschuiven verandert p.
  G.registreer("parabool-definitie", function (ctx) {
    var BEGIN_P = [2.25, 3], BEGIN_F = 1;
    var VANGST = 0.15;
    var bord = ctx.maakBord({ begrenzing: [-4, 5, 7, -5], raster: true,
                              gelijkeschaal: true });

    var F = sleeppunt(ctx, bord, BEGIN_F, 0, "F", "afgeleide", { offset: [6, -14] });
    function p() { return 2 * F.X(); }
    function rx() { return -p() / 2; }

    var kromme = parabool(ctx, bord, p, "kromme", { dash: 2, visible: false });
    rechte(ctx, bord, function () { return p() / 2; }, 1, 0, "afgeleide");
    tekst(ctx, bord, function () { return rx() - 0.15; }, 4.5, "r", "afgeleide",
      { anchorX: "right" });

    var P = sleeppunt(ctx, bord, BEGIN_P[0], BEGIN_P[1], "P", "punt");
    var Gp = vastpunt(ctx, bord, [rx, function () { return P.Y(); }], "G", "tekst",
      { offset: [-16, 10] });
    function dF() { return Math.hypot(P.X() - F.X(), P.Y()); }
    function dr() { return Math.abs(P.X() - rx()); }
    function gelijk() { return Math.abs(dF() - dr()) < 1e-6; }

    lijnstuk(ctx, bord, Gp, P, "punt");
    lijnstuk(ctx, bord, P, F, "secante");
    tekst(ctx, bord, function () { return (rx() + P.X()) / 2; },
      function () { return P.Y() + 10 / bord.unitY; },
      function () { return "|PG| = " + getal(ctx, dr()); }, "punt", { anchorY: "bottom" });
    tekst(ctx, bord, function () { return (P.X() + F.X()) / 2 + 8 / bord.unitX; },
      function () { return P.Y() / 2; },
      function () { return "|PF| = " + getal(ctx, dF()); }, "secante", { anchorX: "left" });

    var spoor = stippen(ctx, bord);

    P.on("drag", function () {
      if (Math.abs(dF() - dr()) < VANGST) {
        var x = P.Y() * P.Y() / (2 * p());
        if (Math.abs(x - P.X()) < 0.5) {
          zet(P, x, P.Y());
          spoor.leg(x, P.Y());
        }
      }
      bord.update();
    });
    // F springt naar halve eenheden op de positieve x-as, zodat p geheel is;
    // de stippen hoorden bij de vorige parabool en verdwijnen.
    F.on("drag", function () {
      var x = klem(Math.round(F.X() * 2) / 2, 0.5, 3);
      if (x !== F.X() || F.Y() !== 0) {
        zet(F, x, 0);
        spoor.wis();
      }
      bord.update();
    });

    var toonParabool = schakelaar(ctx, "Parabool", false, function (aan) {
      kromme.setAttribute({ visible: aan });
      bord.update();
    });
    ctx.knop("Stippen wissen", function () { spoor.wis(); bord.update(); });

    function werkBij() {
      var besluit;
      if (gelijk()) besluit = "|PF| = |PG|: P ligt op de parabool.";
      else if (dF() < dr()) besluit = "|PF| < |PG|: P ligt aan de kant van F.";
      else besluit = "|PF| > |PG|: P ligt aan de kant van r.";
      ctx.toon("p = " + getal(ctx, p()) + ": F" + punt(ctx, F.X(), 0) + " en r ↔ x = " +
        getal(ctx, rx()) + ". P" + punt(ctx, P.X(), P.Y()) + ": |PF| = " +
        getal(ctx, dF()) + " en |PG| = " + getal(ctx, dr()) + ". " + besluit + " " +
        puntenTekst(spoor.aantal()) + " van de parabool gevonden.");
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(F, BEGIN_F, 0);
      zet(P, BEGIN_P[0], BEGIN_P[1]);
      spoor.wis();
      spoor.leg(BEGIN_P[0], BEGIN_P[1]);
      toonParabool.zet(false);
      bord.update();
    }
    spoor.leg(BEGIN_P[0], BEGIN_P[1]);
    bord.update();
    return { reset: herstel };
  });

  /* --- 2. Punten construeren met een evenwijdige en een cirkel ------------ */

  // Een evenwijdige met r op afstand d, en een cirkel rond F met straal d:
  // hun snijpunten liggen even ver van r als van F. Zo levert elke
  // evenwijdige rechts van O twee punten van de parabool.
  G.registreer("punten-construeren", function (ctx) {
    var P_ = 2, BEGIN_A = 0.8;
    var bord = ctx.maakBord({ begrenzing: [-3, 5.5, 7, -5.5], raster: true,
                              gelijkeschaal: true });
    var loop = animatie();

    var kromme = parabool(ctx, bord, function () { return P_; }, "kromme",
      { dash: 2, visible: false });
    rechte(ctx, bord, P_ / 2, 1, 0, "afgeleide");
    tekst(ctx, bord, -1.15, 5, "r", "afgeleide", { anchorX: "right" });
    vastpunt(ctx, bord, [1, 0], "F", "tekst");

    var D = sleeppunt(ctx, bord, BEGIN_A, 0, "", "punt");
    function a() { return D.X(); }
    function d() { return a() + P_ / 2; }
    function y() { return a() >= 0 ? Math.sqrt(2 * P_ * a()) : null; }

    rechte(ctx, bord, function () { return -a(); }, 1, 0, "punt");
    // De afstand d tussen r en de evenwijdige, onderaan.
    lijnstuk(ctx, bord, [-1, -4.8], [function () { return a(); }, -4.8], "punt",
      { firstArrow: true, lastArrow: true, strokeWidth: 1.5 });
    tekst(ctx, bord, function () { return (a() - 1) / 2; }, -4.6, "d", "punt",
      { anchorY: "bottom" });
    ctx.stijl(bord.create("circle", [[1, 0], function () { return Math.max(d(), 0); }], {
      strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
    }), "secante");

    var boven = vastpunt(ctx, bord, [a, function () { return y() === null ? NaN : y(); }],
      "", "punt");
    var onder = vastpunt(ctx, bord, [a, function () { return y() === null ? NaN : -y(); }],
      "", "punt");
    boven.setAttribute({ size: 4 });
    onder.setAttribute({ size: 4 });

    var spoor = stippen(ctx, bord);
    function legStippen() {
      if (y() === null) return;
      spoor.leg(a(), y());
      spoor.leg(a(), -y());
    }

    D.on("drag", function () {
      loop.stop();
      zet(D, klem(D.X(), -0.9, 6.6), 0);
      legStippen();
      bord.update();
    });

    var toonParabool = schakelaar(ctx, "Parabool", false, function (aan) {
      kromme.setAttribute({ visible: aan });
      bord.update();
    });
    ctx.knop("Evenwijdige laten lopen", function () {
      loop.start(6000, function (deel) {
        zet(D, 6.4 * deel, 0);
        legStippen();
        bord.update();
      });
    });
    ctx.knop("Stippen wissen", function () { spoor.wis(); bord.update(); });

    function werkBij() {
      var besluit;
      if (a() > 1e-6) {
        besluit = "De cirkel rond F met straal d snijdt de evenwijdige in (" +
          getal(ctx, a()) + ", ±" + getal(ctx, y()) + "): twee punten van de parabool.";
      } else if (a() > -1e-6) {
        besluit = "De cirkel raakt de evenwijdige in de top O.";
      } else {
        besluit = "De cirkel haalt de evenwijdige niet: links van O ligt geen punt van de parabool.";
      }
      ctx.toon("Evenwijdige x = " + getal(ctx, a()) + ", op afstand d = " +
        getal(ctx, d()) + " van r ↔ x = −1. " + besluit + " " +
        puntenTekst(spoor.aantal()) + " geconstrueerd.");
    }
    bord.on("update", werkBij);

    function herstel() {
      loop.stop();
      zet(D, BEGIN_A, 0);
      spoor.wis();
      legStippen();
      toonParabool.zet(false);
      bord.update();
    }
    legStippen();
    bord.update();
    return { reset: herstel, vernietig: loop.stop };
  });

  /* --- 3. De bovenste en onderste halve parabool --------------------------- */

  // Bij één x > 0 horen twee y-waarden, dus beschrijven f1 en f2 samen de
  // parabool. De raaklijn aan f1 wordt steiler naarmate x naar 0 gaat, tot
  // ze in O verticaal staat.
  G.registreer("halve-parabolen", function (ctx) {
    var P_ = 1, BEGIN_X = 2;
    var bord = ctx.maakBord({ begrenzing: [-1.6, 4.2, 6.8, -4.2], raster: true,
                              gelijkeschaal: true });

    function f1(x) { return Math.sqrt(2 * P_ * x); }
    ctx.stijl(bord.create("functiongraph", [f1, 0, 20], {
      strokeWidth: 2.5, fixed: true, highlight: false }), "punt");
    ctx.stijl(bord.create("functiongraph", [function (x) { return -f1(x); }, 0, 20], {
      strokeWidth: 2.5, fixed: true, highlight: false }), "secante");
    tekst(ctx, bord, 5, 3.55, "f<sub>1</sub>", "punt", { anchorY: "bottom" });
    tekst(ctx, bord, 6.2, -3.85, "f<sub>2</sub>", "secante", { anchorX: "left" });
    vastpunt(ctx, bord, [P_ / 2, 0], "F", "tekst");

    var X = sleeppunt(ctx, bord, BEGIN_X, 0, "x", "tekst", { offset: [6, -14] });
    function x() { return X.X(); }
    function afgeleide() { return x() > 1e-9 ? P_ / Math.sqrt(2 * P_ * x()) : Infinity; }

    rechte(ctx, bord, function () { return -x(); }, 1, 0, "hulp", { dash: 2, strokeWidth: 1 });
    vastpunt(ctx, bord, [x, function () { return f1(x()); }], "", "punt").setAttribute({ size: 4 });
    vastpunt(ctx, bord, [x, function () { return -f1(x()); }], "", "secante").setAttribute({ size: 4 });

    // De raaklijn aan f1 in (x, f1(x)): p·x' − y1·y' + p·x = 0 met y1 = f1(x),
    // dezelfde formule als in de cursus; in O is dat de y-as.
    rechte(ctx, bord,
      function () { return P_ * x(); },
      function () { return P_; },
      function () { return -f1(x()); }, "afgeleide");

    X.on("drag", function () {
      zet(X, klem(X.X(), 0, 6.3), 0);
      bord.update();
    });
    ctx.knop("Naar O", function () { zet(X, 0, 0); bord.update(); });

    function werkBij() {
      var besluit = x() > 1e-9
        ? "f′1(" + getal(ctx, x()) + ") = 1/√" + getal(ctx, 2 * x()) + " = " +
          getal(ctx, afgeleide()) + " > 0: f1 stijgt. Dichter bij 0 wordt de raaklijn steiler."
        : "In O bestaat f′1(0) niet: de raaklijn is verticaal, de y-as.";
      ctx.toon("p = 1, x = " + getal(ctx, x()) + ": f1(x) = √(2x) = " +
        getal(ctx, f1(x())) + " en f2(x) = " + getal(ctx, -f1(x())) +
        ", twee y-waarden bij één x. " + besluit);
    }
    bord.on("update", werkBij);

    function herstel() { zet(X, BEGIN_X, 0); bord.update(); }
    bord.update();
    return { reset: herstel };
  });

  /* --- 4. De constructie met A(−2p, 0) ------------------------------------ */

  // Een rechte e door A met rico λ snijdt de y-as in B; de loodlijn in B op e
  // snijdt de x-as in C. Het punt P(x_C, y_B) ligt op de parabool, voor elke
  // λ: zo laat P bij het verschuiven van B de parabool achter.
  G.registreer("constructie-parabool", function (ctx) {
    var P_ = 1, BEGIN_YB = 1.6;
    var bord = ctx.maakBord({ begrenzing: [-3.2, 3.6, 5.4, -3.2], raster: true,
                              gelijkeschaal: true });
    var loop = animatie();

    var kromme = parabool(ctx, bord, function () { return P_; }, "kromme",
      { dash: 2, visible: false });
    vastpunt(ctx, bord, [-2 * P_, 0], "A(−2p, 0)", "tekst", { offset: [-20, -14] });

    var B = sleeppunt(ctx, bord, 0, BEGIN_YB, "B", "punt", { offset: [-18, 10] });
    function yB() { return B.Y(); }
    function lambda() { return yB() / (2 * P_); }
    function xC() { return yB() * yB() / (2 * P_); }

    // e ↔ y_B·x − 2p·y + 2p·y_B = 0 en de loodlijn in B:
    // 2p·x + y_B·y − y_B² = 0. Zo blijven beide rechten bestaan voor λ = 0.
    rechte(ctx, bord, function () { return 2 * P_ * yB(); }, yB, -2 * P_, "punt");
    rechte(ctx, bord, function () { return -yB() * yB(); }, 2 * P_, yB, "punt");
    tekst(ctx, bord, -2.9, function () { return lambda() * (-2.9 + 2 * P_); }, "e", "punt",
      { anchorY: "bottom" });
    rechteHoek(ctx, bord,
      function () { return [0, yB()]; },
      function () { return eenheid(-2 * P_, -yB()); },
      function () { return eenheid(yB(), -2 * P_); }, "punt");

    var C = vastpunt(ctx, bord, [xC, 0], "C", "tekst", { offset: [6, -14] });
    var P = vastpunt(ctx, bord, [xC, yB], "P", "afgeleide", { offset: [8, 8] });
    P.setAttribute({ size: 5 });
    lijnstuk(ctx, bord, B, P, "afgeleide", { dash: 2 });
    lijnstuk(ctx, bord, C, P, "afgeleide", { dash: 2 });

    var spoor = stippen(ctx, bord);
    function legStip() { spoor.leg(xC(), yB()); }

    B.on("drag", function () {
      loop.stop();
      zet(B, 0, klem(B.Y(), -2.6, 3.1));
      legStip();
      bord.update();
    });

    var toonParabool = schakelaar(ctx, "Parabool", false, function (aan) {
      kromme.setAttribute({ visible: aan });
      bord.update();
    });
    ctx.knop("λ laten lopen", function () {
      loop.start(7000, function (deel) {
        zet(B, 0, -2.6 + 5.6 * deel);
        legStip();
        bord.update();
      });
    });
    ctx.knop("Stippen wissen", function () { spoor.wis(); bord.update(); });

    function werkBij() {
      ctx.toon("p = 1, λ = " + getal(ctx, lambda()) + ": B(0, 2pλ) = B" +
        punt(ctx, 0, yB()) + ", C(2pλ², 0) = C" + punt(ctx, xC(), 0) + " en P" +
        punt(ctx, xC(), yB()) + ". Controle: y² = " + getal(ctx, yB() * yB()) +
        " = 2px, dus P ligt op y² = 2x. " + puntenTekst(spoor.aantal()) + " geconstrueerd.");
    }
    bord.on("update", werkBij);

    function herstel() {
      loop.stop();
      zet(B, 0, BEGIN_YB);
      spoor.wis();
      legStip();
      toonParabool.zet(false);
      bord.update();
    }
    legStip();
    bord.update();
    return { reset: herstel, vernietig: loop.stop };
  });

  /* --- 5. De raaklijn en de hoofdeigenschap ------------------------------- */

  // P schuift over y² = 4x. De raaklijn y1·y = p(x + x1) gaat door S(−x1, 0),
  // de normaal staat er loodrecht op. GPFS is een ruit, dus deelt PS de hoek
  // GPF middendoor.
  G.registreer("raaklijn-parabool", function (ctx) {
    var P_ = 2, BEGIN_Y = 3;
    var bord = ctx.maakBord({ begrenzing: [-4.8, 5.2, 6.8, -4.2], gelijkeschaal: true });
    var kleuren = ctx.kleuren();

    parabool(ctx, bord, function () { return P_; }, "kromme");
    rechte(ctx, bord, P_ / 2, 1, 0, "zwak");
    tekst(ctx, bord, -1.15, 4.9, "r", "zwak", { anchorX: "right" });
    var F = vastpunt(ctx, bord, [P_ / 2, 0], "F", "tekst", { offset: [6, -14] });

    var P = sleeppunt(ctx, bord, BEGIN_Y * BEGIN_Y / (2 * P_), BEGIN_Y, "P", "punt",
      { offset: [8, 12] });
    function x1() { return P.X(); }
    function y1() { return P.Y(); }

    var S = vastpunt(ctx, bord, [function () { return -x1(); }, 0], "S", "raaklijn",
      { offset: [-6, -16] });
    var Gp = vastpunt(ctx, bord, [-P_ / 2, y1], "G", "tekst", { offset: [-16, 10] });

    // g door P evenwijdig met de x-as, de raaklijn t en de normaal n.
    rechte(ctx, bord, function () { return -y1(); }, 0, 1, "hulp", { strokeWidth: 1 });
    rechte(ctx, bord, function () { return P_ * x1(); }, P_,
      function () { return -y1(); }, "raaklijn", { strokeWidth: 2.5 });
    rechte(ctx, bord, function () { return -y1() * x1() - P_ * y1(); }, y1, P_,
      "secante");
    lijnstuk(ctx, bord, P, F, "zwak", { strokeWidth: 1.5 });
    lijnstuk(ctx, bord, P, [x1, 0], "hulp", { dash: 2, strokeWidth: 1 });
    // De namen van t en n aan de rand: t ↔ y = p(x + x1)/y1 en
    // n ↔ y = y1 − y1(x − x1)/p.
    tekst(ctx, bord, -4.4, function () {
      return Math.abs(y1()) < 1e-3 ? NaN : P_ * (-4.4 + x1()) / y1();
    }, "t", "raaklijn", { anchorY: "bottom" });
    tekst(ctx, bord, 6.3, function () {
      return y1() - y1() * (6.3 - x1()) / P_;
    }, "n", "secante", { anchorX: "left", anchorY: "bottom" });

    // De ruit GPFS met de twee gelijke hoeken in P.
    var ruit = [
      bord.create("polygon", [Gp, P, F, S], {
        fixed: true, highlight: false, fillOpacity: 0.16, withLines: false, layer: 0,
        fillColor: function () { return kleuren.secante; },
        vertices: { visible: false }
      }),
      boog(ctx, bord, function () { return Math.abs(y1()) < 1e-3 ? null : [x1(), y1()]; },
        function () { return Math.PI; },
        function () { return Math.atan2(-y1(), -2 * x1()); }, 26, "afgeleide"),
      boog(ctx, bord, function () { return Math.abs(y1()) < 1e-3 ? null : [x1(), y1()]; },
        function () { return Math.atan2(-y1(), -2 * x1()); },
        function () { return Math.atan2(-y1(), P_ / 2 - x1()); }, 20, "afgeleide")
    ];
    function toonRuit(aan) {
      ruit.forEach(function (o) { o.setAttribute({ visible: aan }); });
      bord.update();
    }

    P.on("drag", function () {
      var y = klem(P.Y(), -4, 5);
      zet(P, y * y / (2 * P_), y);
      bord.update();
    });
    var ruitKnop = schakelaar(ctx, "Ruit GPFS", true, toonRuit);

    function hoek() {
      var a = Math.atan2(-y1(), -2 * x1()) - Math.PI;
      return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
    }

    function werkBij() {
      var zijde = x1() + P_ / 2;
      var tt = rechteTekst(ctx, P_, -y1(), P_ * x1());
      var eigenschap = Math.abs(y1()) < 1e-3
        ? "In de top is t de y-as, de topraaklijn."
        : "|GP| = |PF| = |FS| = " + getal(ctx, zijde) + ", dus GPFS is een ruit en " +
          "∠GPS = ∠SPF = " + getal(ctx, hoek(), 1) + "°.";
      ctx.toon("P" + punt(ctx, x1(), y1()) + " op y² = 4x: t ↔ " + getal(ctx, y1()) +
        "·y = 2(x + " + getal(ctx, x1()) + "), of " + tt + ". t gaat door S" +
        punt(ctx, -x1(), 0) + ". " + eigenschap);
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(P, BEGIN_Y * BEGIN_Y / (2 * P_), BEGIN_Y);
      ruitKnop.zet(true);
      bord.update();
    }
    bord.update();
    return {
      reset: herstel,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  });

  /* --- 6. De optische eigenschap ------------------------------------------ */

  // Een straal evenwijdig met de as treft de spiegel in Q en kaatst terug
  // volgens de normaal in Q. De teruggekaatste straal wordt hier echt
  // berekend, niet naar F getrokken: dat hij door F gaat, is het resultaat.
  G.registreer("optische-eigenschap", function (ctx) {
    var P_ = 2, BEGIN_H = 2.4, XBRON = 7.2;
    var bord = ctx.maakBord({ begrenzing: [-1.4, 5, 8.2, -5], gelijkeschaal: true,
                              asgetallen: false });

    parabool(ctx, bord, function () { return P_; }, "kromme", { strokeWidth: 3 });
    vastpunt(ctx, bord, [P_ / 2, 0], "F", "tekst", { offset: [-4, -16] });

    var H = sleeppunt(ctx, bord, XBRON, BEGIN_H, "", "secante");
    function h() { return H.Y(); }
    function Q() { return [h() * h() / (2 * P_), h()]; }
    // De normaal in Q naar binnen: (p, −y), en de teruggekaatste richting.
    function normaal() { return eenheid(P_, -h()); }
    function terug() {
      var n = normaal(), d = [-1, 0];
      var k = 2 * (d[0] * n[0] + d[1] * n[1]);
      return [d[0] - k * n[0], d[1] - k * n[1]];
    }
    function eindpunt() {
      var q = Q(), r = terug();
      var lengte = 1.25 * Math.hypot(q[0] - P_ / 2, q[1]) + 0.5;
      return [q[0] + lengte * r[0], q[1] + lengte * r[1]];
    }

    lijnstuk(ctx, bord, H, [function () { return Q()[0]; }, function () { return Q()[1]; }],
      "secante", { lastArrow: true, strokeWidth: 2.5 });
    lijnstuk(ctx, bord, [function () { return Q()[0]; }, function () { return Q()[1]; }],
      [function () { return eindpunt()[0]; }, function () { return eindpunt()[1]; }],
      "secante", { lastArrow: true, strokeWidth: 2.5 });
    lijnstuk(ctx, bord,
      [function () { return Q()[0] - 1.2 * normaal()[0]; }, function () { return Q()[1] - 1.2 * normaal()[1]; }],
      [function () { return Q()[0] + 1.6 * normaal()[0]; }, function () { return Q()[1] + 1.6 * normaal()[1]; }],
      "hulp", { dash: 2, strokeWidth: 1 });
    vastpunt(ctx, bord, [function () { return Q()[0]; }, function () { return Q()[1]; }],
      "Q", "secante", { offset: [-16, 8] });

    // Een bundel vaste stralen, om te zien dat ze allemaal door F gaan.
    var bundel = [];
    [-4, -3, -2, -1, 1, 2, 3, 4].forEach(function (y) {
      var q = [y * y / (2 * P_), y];
      var n = eenheid(P_, -y);
      var k = -2 * n[0];
      var r = [-1 - k * n[0], -k * n[1]];
      var lengte = Math.hypot(q[0] - P_ / 2, q[1]) + 0.6;
      bundel.push(lijnstuk(ctx, bord, [XBRON, y], q, "zwak",
        { strokeWidth: 1, visible: false }));
      bundel.push(lijnstuk(ctx, bord, q, [q[0] + lengte * r[0], q[1] + lengte * r[1]], "zwak",
        { strokeWidth: 1, visible: false }));
    });
    var bundelKnop = schakelaar(ctx, "Bundel", false, function (aan) {
      bundel.forEach(function (o) { o.setAttribute({ visible: aan }); });
      bord.update();
    });

    H.on("drag", function () {
      zet(H, XBRON, klem(H.Y(), -4.6, 4.6));
      bord.update();
    });

    function werkBij() {
      var q = Q(), n = normaal();
      var inval = Math.acos(Math.min(1, Math.abs(n[0]))) * 180 / Math.PI;
      var r = terug();
      // Afstand van F tot de teruggekaatste rechte, als controle.
      var afwijking = Math.abs((P_ / 2 - q[0]) * r[1] - (0 - q[1]) * r[0]);
      ctx.toon("Straal op hoogte " + getal(ctx, h()) + " treft de spiegel in Q" +
        punt(ctx, q[0], q[1]) + ". Hoek van inval = hoek van terugkaatsing = " +
        getal(ctx, inval, 1) + "° ten opzichte van de normaal. De teruggekaatste straal " +
        (afwijking < 1e-6 ? "gaat door het brandpunt F(1, 0)." : "mist F."));
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(H, XBRON, BEGIN_H);
      bundelKnop.zet(false);
      bord.update();
    }
    bord.update();
    return { reset: herstel };
  });

  /* --- 7. De vier vormen van de topvergelijking --------------------------- */

  // F mag op elk van de vier halve assen staan. De stand van F bepaalt de
  // vorm: y² = ±2px met F op de x-as, x² = ±2py met F op de y-as.
  G.registreer("andere-vormen", function (ctx) {
    var bord = ctx.maakBord({ begrenzing: [-5.2, 5.2, 5.2, -5.2], raster: true,
                              gelijkeschaal: true });

    var F = sleeppunt(ctx, bord, 1, 0, "F", "afgeleide", { offset: [6, 10] });
    // De richting van de as naar F toe, en p = 2·|OF|.
    function u() { return eenheid(F.X(), F.Y()) || [1, 0]; }
    function p() { return 2 * Math.hypot(F.X(), F.Y()); }

    pad(ctx, bord, "kromme", function () {
      var a = u(), q = p(), xs = [], ys = [];
      for (var i = 0; i <= 120; i++) {
        var t = -12 + 24 * i / 120, s = t * t / (2 * q);
        xs.push(s * a[0] - t * a[1]);
        ys.push(s * a[1] + t * a[0]);
      }
      return [xs, ys];
    }, { strokeWidth: 2.5 });
    // De richtlijn: loodrecht op de as, op afstand p/2 aan de andere kant.
    rechte(ctx, bord, function () { return p() / 2; },
      function () { return u()[0]; }, function () { return u()[1]; }, "afgeleide");
    tekst(ctx, bord,
      function () { var a = u(); return -a[0] * (p() / 2 + 0.3) - a[1] * 4.3; },
      function () { var a = u(); return -a[1] * (p() / 2 + 0.3) + a[0] * 4.3; },
      "r", "afgeleide");

    function vorm() {
      var x = F.X(), y = F.Y();
      var halve = getal(ctx, p() / 2);
      if (x > 0) return { tekst: ["y² = 2px", "F(p/2, 0)", "r ↔ x = −p/2", "y1·y = p(x + x1)"],
        r: "x = −" + halve };
      if (x < 0) return { tekst: ["y² = −2px", "F(−p/2, 0)", "r ↔ x = p/2", "y1·y = −p(x + x1)"],
        r: "x = " + halve };
      if (y > 0) return { tekst: ["x² = 2py", "F(0, p/2)", "r ↔ y = −p/2", "x1·x = p(y + y1)"],
        r: "y = −" + halve };
      return { tekst: ["x² = −2py", "F(0, −p/2)", "r ↔ y = p/2", "x1·x = −p(y + y1)"],
        r: "y = " + halve };
    }
    // De vergelijking met het getal 2p ingevuld: y² = −4x, x² = 6y, ...
    function ingevuld() {
      var x = F.X(), y = F.Y(), twee = getal(ctx, 2 * p());
      if (x > 0) return "y² = " + twee + "x";
      if (x < 0) return "y² = −" + twee + "x";
      if (y > 0) return "x² = " + twee + "y";
      return "x² = −" + twee + "y";
    }
    tekst(ctx, bord,
      function () { var a = u(); return a[0] * 3.3 + (a[0] === 0 ? 2.6 : 0); },
      function () { var a = u(); return a[1] * 4.4 + (a[1] === 0 ? 4.3 : 0); },
      function () { return "𝒫 ↔ " + ingevuld(); }, "kromme");

    // F springt naar het dichtstbijzijnde punt met p geheel op een halve as.
    F.on("drag", function () {
      var x = F.X(), y = F.Y();
      if (Math.abs(x) >= Math.abs(y)) {
        x = Math.round(x * 2) / 2;
        if (x === 0) x = F.X() < 0 ? -0.5 : 0.5;
        zet(F, klem(x, -3, 3), 0);
      } else {
        y = Math.round(y * 2) / 2;
        if (y === 0) y = F.Y() < 0 ? -0.5 : 0.5;
        zet(F, 0, klem(y, -3, 3));
      }
      bord.update();
    });
    [["y² = 2px", 1, 0], ["y² = −2px", -1, 0], ["x² = 2py", 0, 1], ["x² = −2py", 0, -1]]
      .forEach(function (k) {
        ctx.knop(k[0], function () { zet(F, k[1], k[2]); bord.update(); });
      });

    function werkBij() {
      var v = vorm();
      ctx.toon("p = " + getal(ctx, p()) + ". Vorm " + v.tekst[0] + " met " + v.tekst[1] +
        " en " + v.tekst[2] + ": hier F" + punt(ctx, F.X(), F.Y()) + ", r ↔ " + v.r +
        " en 𝒫 ↔ " + ingevuld() + ". Raaklijn in P1(x1, y1): " + v.tekst[3] + ".");
    }
    bord.on("update", werkBij);

    function herstel() { zet(F, 1, 0); bord.update(); }
    bord.update();
    return { reset: herstel };
  });

  /* --- 8. Raaklijnen uit een punt en de raakkoorde ------------------------ */

  // Uit A aan y² = 5x: de raakpunten R(x1, y1) voldoen aan y_A·y1 = p(x_A + x1)
  // en y1² = 2p·x1, dus aan y1² − 2y_A·y1 + 2p·x_A = 0. Buiten de parabool
  // geeft dat twee raaklijnen, op de parabool één, binnen geen. De
  // raakkoorde R1R2 is y_A·y = p(x + x_A), de formule van de raaklijn met A.
  G.registreer("raaklijnen-uit-punt", function (ctx) {
    var P_ = 5 / 2, BEGIN_A = [-3, 1];
    var bord = ctx.maakBord({ begrenzing: [-5.5, 7.5, 8.5, -6.5], raster: true,
                              gelijkeschaal: true });

    parabool(ctx, bord, function () { return P_; }, "kromme");
    var A = sleeppunt(ctx, bord, BEGIN_A[0], BEGIN_A[1], "A", "tekst", { offset: [-16, 10] });
    function xA() { return A.X(); }
    function yA() { return A.Y(); }
    // Een vierde van de discriminant: y_A² − 2p·x_A.
    function delta() { return yA() * yA() - 2 * P_ * xA(); }
    function raakY(k) {
      var d = delta();
      if (d < -1e-9) return null;
      return yA() + k * Math.sqrt(Math.max(d, 0));
    }
    function zichtbaar(k) {
      return function () {
        var d = delta();
        return d > 1e-9 || (k === 1 && Math.abs(d) <= 1e-9);
      };
    }

    // De raaklijn in R(x1, y1): p·x − y1·y + p·x1 = 0.
    [1, -1].forEach(function (k) {
      var rol = k === 1 ? "punt" : "secante";
      rechte(ctx, bord,
        function () { var y = raakY(k); return y === null ? 0 : y * y / 2; },
        function () { return P_; },
        function () { var y = raakY(k); return y === null ? 1 : -y; },
        rol, { visible: zichtbaar(k) });
      vastpunt(ctx, bord,
        [function () { var y = raakY(k); return y === null ? NaN : y * y / (2 * P_); },
         function () { var y = raakY(k); return y === null ? NaN : y; }],
        k === 1 ? "R<sub>1</sub>" : "R<sub>2</sub>", rol, { offset: [8, -12] })
        .setAttribute({ size: 4, visible: zichtbaar(k) });
    });
    // De raakkoorde: p·x − y_A·y + p·x_A = 0.
    rechte(ctx, bord, function () { return P_ * xA(); }, P_, function () { return -yA(); },
      "afgeleide", { dash: 2, visible: function () { return delta() > 1e-9; } });

    A.on("drag", function () {
      zet(A, klem(Math.round(A.X()), -5, 8), klem(Math.round(A.Y()), -6, 7));
      bord.update();
    });

    // Een raaklijn als tekst: met 2p = 5 wordt p·x − y1·y + p·x1 = 0, maal 2,
    // 5x − 2y1·y + y1² = 0.
    function raaklijnTekst(y) { return rechteTekst(ctx, 5, -2 * y, y * y); }

    function werkBij() {
      var d = delta(), deel;
      var koorde = rechteTekst(ctx, 5, -2 * yA(), 5 * xA());
      if (d > 1e-9) {
        var y1 = raakY(1), y2 = raakY(-1);
        deel = "A ligt buiten de parabool: twee raaklijnen. R1" +
          punt(ctx, y1 * y1 / 5, y1) + ", t1 ↔ " + raaklijnTekst(y1) + "; R2" +
          punt(ctx, y2 * y2 / 5, y2) + ", t2 ↔ " + raaklijnTekst(y2) +
          ". Raakkoorde R1R2 ↔ " + koorde + ", de formule van de raaklijn met A ingevuld.";
      } else if (d >= -1e-9) {
        deel = "A ligt op de parabool: één raaklijn, t ↔ " + raaklijnTekst(yA()) + ".";
      } else {
        deel = "A ligt binnen de parabool: elke rechte door A snijdt ze, er is geen raaklijn.";
      }
      ctx.toon("𝒫 ↔ y² = 5x en A" + punt(ctx, xA(), yA()) + ". " + deel);
    }
    bord.on("update", werkBij);

    function herstel() { zet(A, BEGIN_A[0], BEGIN_A[1]); bord.update(); }
    bord.update();
    return { reset: herstel };
  });
})();
