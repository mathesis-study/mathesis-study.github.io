/* Interactieve grafieken bij M02_Cirkels.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert de context: het bord, de kleuren per
 * rol, de getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 *
 * Een cirkel moet er op het scherm ook als cirkel uitzien, dus elk bord
 * gebruikt dezelfde schaal op beide assen. Punten die de leerling op het
 * rooster zet, springen naar gehele coördinaten: dan komen de vergelijkingen
 * uit met dezelfde getallen als in de voorbeelden en oefeningen.
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

  // Een negatief getal tussen haakjes, voor een invulling zoals 4 − (−2).
  function haak(ctx, waarde, decimalen) {
    var tekst = getal(ctx, waarde, decimalen);
    return tekst.charAt(0) === "−" ? "(" + tekst + ")" : tekst;
  }

  // (x − 3)², (y + 2)² of x²: de term van de standaardvorm.
  function kwadraatTerm(ctx, letter, midden) {
    if (Math.abs(midden) < EPS) return letter + "²";
    return "(" + letter + (midden > 0 ? " − " : " + ") +
      getal(ctx, Math.abs(midden)) + ")²";
  }

  // De grootste gemene deler van gehele getallen, voor vergelijkingen met
  // zo klein mogelijke gehele coëfficiënten.
  function ggd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { var r = a % b; a = b; b = r; }
    return a;
  }

  // Een breuk teller/noemer met gehele getallen, vereenvoudigd.
  function breuk(teller, noemer) {
    if (noemer < 0) { teller = -teller; noemer = -noemer; }
    var d = ggd(teller, noemer) || 1;
    return { t: teller / d, n: noemer / d };
  }

  function breukTekst(b) {
    var teken = b.t < 0 ? "−" : "";
    var t = Math.abs(b.t);
    return b.n === 1 ? teken + t : teken + t + "/" + b.n;
  }

  // u·x + v·y + w = 0 met gehele coëfficiënten, als tekst: −3x + 4y + 16 = 0.
  function rechteTekst(u, v, w) {
    var delen = [];
    function term(c, letter) {
      if (c === 0) return;
      var abs = Math.abs(c);
      var tekst = (abs === 1 && letter ? "" : String(abs)) + letter;
      if (!delen.length) delen.push((c < 0 ? "−" : "") + tekst);
      else delen.push((c < 0 ? "− " : "+ ") + tekst);
    }
    term(u, "x");
    term(v, "y");
    term(w, "");
    return (delen.length ? delen.join(" ") : "0") + " = 0";
  }

  // Deelt u, v en w door hun ggd. Met yPositief krijgt y een positieve
  // coëfficiënt (zoals a ↔ −3x + 4y + 16 = 0), anders x.
  function normaliseer(u, v, w, yPositief) {
    var d = ggd(ggd(u, v), w) || 1;
    u /= d; v /= d; w /= d;
    var eerste = yPositief ? (v !== 0 ? v : u) : (u !== 0 ? u : v);
    if (eerste < 0) { u = -u; v = -v; w = -w; }
    return [u + 0, v + 0, w + 0];
  }

  // √n netjes: 5 als n = 25, √13 ≈ 3.61 als n = 13.
  function wortelTekst(ctx, n) {
    var w = Math.sqrt(n);
    if (Math.abs(w - Math.round(w)) < EPS) return String(Math.round(w));
    if (Math.abs(n - Math.round(n)) < EPS) {
      return "√" + Math.round(n) + " ≈ " + getal(ctx, w);
    }
    return getal(ctx, w);
  }

  /* --- Bouwstenen op het bord -------------------------------------------- */

  function sleeppunt(ctx, bord, x, y, naam, rol, label) {
    return ctx.stijl(bord.create("point", [x, y], {
      name: naam, size: 5, showInfobox: false, precision: GRIJP,
      label: label || { offset: [8, 12] }
    }), rol || "punt");
  }

  function zet(punt, x, y) {
    punt.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
  }

  // Een punt dat bij het slepen naar gehele coördinaten springt, binnen de
  // opgegeven grenzen [links, boven, rechts, onder].
  function opRooster(punt, grenzen, naSprong) {
    punt.on("drag", function () {
      var x = Math.round(punt.X()), y = Math.round(punt.Y());
      if (grenzen) {
        x = Math.max(grenzen[0], Math.min(grenzen[2], x));
        y = Math.max(grenzen[3], Math.min(grenzen[1], y));
      }
      zet(punt, x, y);
      if (naSprong) naSprong();
      punt.board.update();
    });
  }

  function lijnstuk(ctx, bord, p, q, rol, opties) {
    var o = { fixed: true, highlight: false, withLabel: false, strokeWidth: 2 };
    Object.keys(opties || {}).forEach(function (k) { o[k] = opties[k]; });
    return ctx.stijl(bord.create("segment", [p, q], o), rol);
  }

  function tekst(ctx, bord, x, y, inhoud, rol, opties) {
    var o = { fixed: true, highlight: false, anchorX: "middle", anchorY: "middle" };
    Object.keys(opties || {}).forEach(function (k) { o[k] = opties[k]; });
    return ctx.stijl(bord.create("text", [x, y, inhoud], o), rol || "tekst");
  }

  // Een kromme waarvan de punten bij elke update opnieuw berekend worden.
  // pad() geeft [xs, ys] terug.
  function pad(ctx, bord, rol, bereken, opties) {
    var o = { fixed: true, highlight: false, withLabel: false, strokeWidth: 1.5 };
    Object.keys(opties || {}).forEach(function (k) { o[k] = opties[k]; });
    var kromme = bord.create("curve", [[], []], o);
    kromme.updateDataArray = function () {
      var p = bereken();
      this.dataX = p ? p[0] : [];
      this.dataY = p ? p[1] : [];
    };
    return ctx.stijl(kromme, rol);
  }

  // Het vierkantje van een rechte hoek in hoekpunt h tussen de richtingen u
  // en v (eenheidsvectoren); de maat staat in pixels, dus blijft het even
  // groot bij elke schermgrootte.
  function rechteHoek(ctx, bord, h, u, v, rol) {
    return pad(ctx, bord, rol || "zwak", function () {
      var p = h(), a = u(), b = v();
      if (!p || !a || !b) return null;
      var s = 11 / bord.unitX;
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
  // aanligt, zoals [Verschuiving].
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
    return { start: start, stop: stop, loopt: function () { return lopend !== null; } };
  }

  /* --- 1. De cirkel als verzameling punten -------------------------------- */

  // De definitie zegt: alle punten op afstand r van M. De leerling zoekt die
  // punten zelf: P ligt vrij, en telkens P op afstand r van M komt, blijft er
  // een stip achter. Zo groeit de cirkel uit de definitie, en pas daarna
  // toont de knop de cirkel zelf.
  G.registreer("cirkel-definitie", function (ctx) {
    var R = 2;
    var BEGIN_M = [1, 1];
    var HOEK = 25 * Math.PI / 180;
    var VANGST = 0.12;                           // zo dicht bij r springt P erop
    var MAX_STIPPEN = 360;

    var bord = ctx.maakBord({ begrenzing: [-3.4, 4, 5.4, -2.2], gelijkeschaal: true });

    var M = sleeppunt(ctx, bord, BEGIN_M[0], BEGIN_M[1], "M", "kromme",
      { offset: [-18, -14] });
    var cirkel = ctx.stijl(bord.create("circle", [M, R], {
      strokeWidth: 2, dash: 2, fixed: true, highlight: false, visible: false
    }), "kromme");
    var P = sleeppunt(ctx, bord, BEGIN_M[0] + R * Math.cos(HOEK),
      BEGIN_M[1] + R * Math.sin(HOEK), "P", "punt");

    function afstand() { return Math.hypot(P.X() - M.X(), P.Y() - M.Y()); }
    function opCirkel() { return Math.abs(afstand() - R) < EPS * 100; }

    lijnstuk(ctx, bord, M, P, "hulp");
    tekst(ctx, bord,
      function () { return (M.X() + P.X()) / 2; },
      function () { return (M.Y() + P.Y()) / 2; },
      function () {
        return opCirkel() ? "d = r = " + getal(ctx, R)
                          : "d = " + getal(ctx, afstand());
      },
      "tekst", { anchorY: "bottom" });

    var stippen = [];
    function legStip() {
      if (stippen.length >= MAX_STIPPEN) return;
      for (var i = 0; i < stippen.length; i++) {
        if (Math.hypot(stippen[i].X() - P.X(), stippen[i].Y() - P.Y()) < 0.06) return;
      }
      stippen.push(ctx.stijl(bord.create("point", [P.X(), P.Y()], {
        name: "", withLabel: false, size: 2, fixed: true, highlight: false,
        showInfobox: false
      }), "afgeleide"));
    }
    function wisStippen() {
      stippen.forEach(function (stip) { bord.removeObject(stip); });
      stippen = [];
    }

    P.on("drag", function () {
      var d = afstand();
      if (Math.abs(d - R) < VANGST && d > EPS) {
        zet(P, M.X() + R * (P.X() - M.X()) / d, M.Y() + R * (P.Y() - M.Y()) / d);
        legStip();
      }
      bord.update();
    });
    // M springt naar het rooster en neemt P mee; de stippen hoorden bij het
    // vorige middelpunt en verdwijnen.
    var vorigeM = BEGIN_M.slice();
    opRooster(M, [-2, 3, 4, -1], function () {
      var dx = M.X() - vorigeM[0], dy = M.Y() - vorigeM[1];
      if (dx || dy) {
        zet(P, P.X() + dx, P.Y() + dy);
        wisStippen();
        if (opCirkel()) legStip();
        vorigeM = [M.X(), M.Y()];
      }
    });

    var toonCirkel = schakelaar(ctx, "Cirkel", false,
      function (aan) { cirkel.setAttribute({ visible: aan }); bord.update(); });
    ctx.knop("Stippen wissen", function () { wisStippen(); bord.update(); });

    function werkBij() {
      var d = afstand();
      var waar;
      if (opCirkel()) waar = " = r: P ligt op de cirkel";
      else if (d < R) waar = " < r: P ligt binnen de cirkel";
      else waar = " > r: P ligt buiten de cirkel";
      ctx.toon("M(" + getal(ctx, M.X()) + ", " + getal(ctx, M.Y()) + "), r = " +
        getal(ctx, R) + ". d(P,M) = " + getal(ctx, d) + waar + ". " +
        (stippen.length === 1 ? "1 punt" : stippen.length + " punten") +
        " op afstand r gevonden.");
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(M, BEGIN_M[0], BEGIN_M[1]);
      vorigeM = BEGIN_M.slice();
      zet(P, BEGIN_M[0] + R * Math.cos(HOEK), BEGIN_M[1] + R * Math.sin(HOEK));
      wisStippen();
      legStip();
      toonCirkel.zet(false);
      bord.update();
    }
    legStip();
    bord.update();
    return { reset: herstel };
  });

  /* --- 2. De vergelijking uit de afstandsformule --------------------------- */

  // P(x, y) ligt op de cirkel als d(P,M) = r. De rechthoekige driehoek met
  // rechthoekszijden x − x_M en y − y_M en schuine zijde r maakt daar de
  // stelling van Pythagoras van: (x − x_M)² + (y − y_M)² = r².
  G.registreer("cirkel-vergelijking", function (ctx) {
    var BEGIN_M = [3, 2], BEGIN_P = [6, 4];
    var GRENZEN = [-1, 6, 8, -2];
    var bord = ctx.maakBord({ begrenzing: [-1.6, 6.6, 8.6, -2.6], raster: true,
                              gelijkeschaal: true });
    var loop = animatie();

    var M = sleeppunt(ctx, bord, BEGIN_M[0], BEGIN_M[1], "M", "afgeleide",
      { offset: [-14, 14] });
    var P = sleeppunt(ctx, bord, BEGIN_P[0], BEGIN_P[1], "P", "punt");
    ctx.stijl(bord.create("circle", [M, P], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "kromme");

    function Q() { return [P.X(), M.Y()]; }
    function dx() { return P.X() - M.X(); }
    function dy() { return P.Y() - M.Y(); }
    function r2() { return dx() * dx() + dy() * dy(); }
    function geheel() {
      return [M.X(), M.Y(), P.X(), P.Y()].every(function (v) {
        return Math.abs(v - Math.round(v)) < EPS;
      });
    }
    function r2Tekst() { return geheel() ? String(Math.round(r2())) : getal(ctx, r2()); }

    var zijde = { strokeWidth: 3 };
    lijnstuk(ctx, bord, M, [function () { return P.X(); }, function () { return M.Y(); }],
      "secante", zijde);
    lijnstuk(ctx, bord, [function () { return P.X(); }, function () { return M.Y(); }], P,
      "secante", zijde);
    lijnstuk(ctx, bord, M, P, "afgeleide", zijde);
    rechteHoek(ctx, bord, function () {
      return Math.abs(dx()) > EPS && Math.abs(dy()) > EPS ? Q() : null;
    }, function () { return [dx() > 0 ? -1 : 1, 0]; },
       function () { return [0, dy() > 0 ? 1 : -1]; });

    // De namen van de zijden staan aan de buitenkant van de driehoek.
    var px = function () { return 1 / bord.unitX; };
    tekst(ctx, bord,
      function () { return (M.X() + P.X()) / 2; },
      function () { return M.Y() - (dy() >= 0 ? 12 : -12) * px(); },
      function () {
        return Math.abs(dx()) < EPS ? "" : "x − x<sub>M</sub> = " + getal(ctx, dx());
      }, "secante",
      { anchorY: function () { return dy() >= 0 ? "top" : "bottom"; } });
    tekst(ctx, bord,
      function () { return P.X() + (dx() >= 0 ? 8 : -8) * px(); },
      function () { return (M.Y() + P.Y()) / 2; },
      function () {
        return Math.abs(dy()) < EPS ? "" : "y − y<sub>M</sub> = " + getal(ctx, dy());
      }, "secante",
      { anchorX: function () { return dx() >= 0 ? "left" : "right"; } });
    tekst(ctx, bord,
      function () { return (M.X() + P.X()) / 2 - (dx() >= 0 ? 10 : -10) * px(); },
      function () { return (M.Y() + P.Y()) / 2 + 10 * px(); },
      function () { return "r = " + wortelTekst(ctx, r2()); }, "afgeleide",
      { anchorX: function () { return dx() >= 0 ? "right" : "left"; },
        anchorY: "bottom" });

    // M sleept de hele cirkel mee, P bepaalt de straal.
    var vorigeM = BEGIN_M.slice();
    opRooster(M, GRENZEN, function () {
      var sx = M.X() - vorigeM[0], sy = M.Y() - vorigeM[1];
      zet(P, P.X() + sx, P.Y() + sy);
      vorigeM = [M.X(), M.Y()];
    });
    opRooster(P, [GRENZEN[0] - 2, GRENZEN[1] + 2, GRENZEN[2] + 2, GRENZEN[3] - 2],
      function () {
        loop.stop();
        if (P.X() === M.X() && P.Y() === M.Y()) zet(P, M.X() + 1, M.Y());
      });
    M.on("down", loop.stop);

    function werkBij() {
      var x = P.X(), y = P.Y();
      ctx.toon("M(" + getal(ctx, M.X()) + ", " + getal(ctx, M.Y()) + ") en P(" +
        getal(ctx, x) + ", " + getal(ctx, y) + "): (" + getal(ctx, x) + " − " +
        haak(ctx, M.X()) + ")² + (" + getal(ctx, y) + " − " + haak(ctx, M.Y()) +
        ")² = " + getal(ctx, dx() * dx()) + " + " + getal(ctx, dy() * dy()) +
        " = " + r2Tekst() + " = r². Elk punt P(x, y) van deze cirkel voldoet aan " +
        kwadraatTerm(ctx, "x", M.X()) + " + " + kwadraatTerm(ctx, "y", M.Y()) +
        " = " + r2Tekst() + ".");
    }
    bord.on("update", werkBij);

    // Eén volle toer van P rond M: de rechthoekszijden veranderen van lengte
    // en van teken, de som van hun kwadraten blijft r².
    ctx.knop("P laten rondgaan", function () {
      var mx = M.X(), my = M.Y();
      var r = Math.sqrt(r2());
      var begin = Math.atan2(dy(), dx());
      var eind = [P.X(), P.Y()];
      loop.start(6000, function (deel) {
        var hoek = begin + 2 * Math.PI * deel;
        zet(P, mx + r * Math.cos(hoek), my + r * Math.sin(hoek));
        bord.update();
      }, function () { zet(P, eind[0], eind[1]); bord.update(); });
    });

    function herstel() {
      loop.stop();
      zet(M, BEGIN_M[0], BEGIN_M[1]);
      zet(P, BEGIN_P[0], BEGIN_P[1]);
      vorigeM = BEGIN_M.slice();
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel, vernietig: loop.stop };
  });

  /* --- 3. Van algemene vorm naar middelpunt en straal ---------------------- */

  // x² + y² + 2ax + 2by + c = 0 heeft middelpunt M(−a, −b) en r² = a² + b² − c.
  // De leerling verschuift M (dus a en b) en verandert c, en ziet de cirkel
  // krimpen tot het punt M en verdwijnen zodra a² + b² − c negatief wordt.
  G.registreer("algemene-vorm", function (ctx) {
    var BEGIN_M = [2, 8], BEGIN_C = 43;
    var bord = ctx.maakBord({ begrenzing: [-6.5, 14.5, 10.5, -1.5], raster: true,
                              gelijkeschaal: true });
    var c = BEGIN_C;

    var M = sleeppunt(ctx, bord, BEGIN_M[0], BEGIN_M[1], "M", "afgeleide",
      { offset: [8, 12] });
    function a() { return -M.X(); }
    function b() { return -M.Y(); }
    function r2() { return a() * a() + b() * b() - c; }

    ctx.stijl(bord.create("circle", [M, function () { return Math.sqrt(Math.max(r2(), 0)); }], {
      strokeWidth: 2.5, fixed: true, highlight: false,
      visible: function () { return r2() > 0; }
    }), "kromme");
    lijnstuk(ctx, bord, M,
      [function () { return M.X() + Math.sqrt(Math.max(r2(), 0)); }, function () { return M.Y(); }],
      "punt", { visible: function () { return r2() > 0; } });
    tekst(ctx, bord,
      function () { return M.X() + Math.sqrt(Math.max(r2(), 0)) / 2; },
      function () { return M.Y() - 8 / bord.unitX; },
      function () { return r2() > 0 ? "r" : ""; }, "punt", { anchorY: "top" });

    opRooster(M, [-5, 13, 9, 0]);

    function vergelijking() {
      var delen = ["x² + y²"];
      function term(coef, letter) {
        if (coef === 0) return;
        var abs = Math.abs(coef);
        delen.push((coef < 0 ? "− " : "+ ") + (abs === 1 && letter ? "" : abs) + letter);
      }
      term(2 * a(), "x");
      term(2 * b(), "y");
      term(c, "");
      return delen.join(" ") + " = 0";
    }

    function werkBij() {
      var r = r2();
      var besluit;
      if (r > 0) besluit = "r = " + wortelTekst(ctx, r) + ": een cirkel met middelpunt M(" +
        getal(ctx, M.X()) + ", " + getal(ctx, M.Y()) + ").";
      else if (r === 0) besluit = "enkel het punt M voldoet; dat is geen cirkel.";
      else besluit = "a² + b² − c < 0, dus geen enkel punt voldoet: dat is geen cirkel.";
      ctx.toon(vergelijking() + ": 2a = " + getal(ctx, 2 * a()) + ", 2b = " +
        getal(ctx, 2 * b()) + ", c = " + getal(ctx, c) + ", dus M(−a, −b) = M(" +
        getal(ctx, M.X()) + ", " + getal(ctx, M.Y()) + ") en r² = a² + b² − c = " +
        getal(ctx, a() * a()) + " + " + getal(ctx, b() * b()) + " − " + haak(ctx, c) +
        " = " + getal(ctx, r) + "; " + besluit);
    }
    bord.on("update", werkBij);

    function wijzigC(stap) {
      return function () { c += stap; bord.update(); };
    }
    ctx.knop("c − 5", wijzigC(-5));
    ctx.knop("c − 1", wijzigC(-1));
    ctx.knop("c + 1", wijzigC(1));
    ctx.knop("c + 5", wijzigC(5));

    function herstel() {
      c = BEGIN_C;
      zet(M, BEGIN_M[0], BEGIN_M[1]);
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 4. Raaklijn in een punt van de cirkel ------------------------------- */

  // t staat loodrecht op de straal MD. D glijdt over de cirkel en springt
  // naar roosterpunten, zodat t ↔ x₁x + y₁y = r² uitkomt met de getallen van
  // de voorbeelden (x² + y² = 25 in D(4, 3)). Met een verschoven middelpunt
  // wordt het de algemene formule.
  G.registreer("raaklijn-cirkel", function (ctx) {
    var BEGIN_R2 = 25, BEGIN_D = [4, 3], BEGIN_M = [1, 1];
    var bord = ctx.maakBord({ begrenzing: [-6.5, 6.5, 7.5, -6.5], raster: true,
                              gelijkeschaal: true });
    var r2 = BEGIN_R2;
    var vrijM = false;

    var M = sleeppunt(ctx, bord, 0, 0, "O", "kromme", { offset: [-16, -12] });
    M.setAttribute({ fixed: true });
    function r() { return Math.sqrt(r2); }

    var cirkel = ctx.stijl(bord.create("circle", [M, r], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "kromme");
    var D = ctx.stijl(bord.create("glider", [BEGIN_D[0], BEGIN_D[1], cirkel], {
      name: "D", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [8, 14] }
    }), "punt");
    // L op de cirkel, rechts van M: daarmee verandert de straal.
    var L = sleeppunt(ctx, bord, r(), 0, "", "hulp");
    L.setAttribute({ size: 4, withLabel: false });

    function u() { return D.X() - M.X(); }
    function v() { return D.Y() - M.Y(); }

    lijnstuk(ctx, bord, M, D, "afgeleide", { dash: 2 });
    tekst(ctx, bord,
      function () { return M.X() + r() / 2; },
      function () { return M.Y() - 8 / bord.unitX; },
      "r", "hulp", { anchorY: "top" });
    // De raaklijn door D met richting loodrecht op MD.
    ctx.stijl(bord.create("line", [D,
      [function () { return D.X() - v(); }, function () { return D.Y() + u(); }]], {
      strokeWidth: 2.5, fixed: true, highlight: false, name: "t", withLabel: true,
      label: { position: "rt", offset: [-14, -14] }
    }), "raaklijn");
    rechteHoek(ctx, bord, function () { return [D.X(), D.Y()]; },
      function () { return eenheid(-u(), -v()); },
      function () { return eenheid(-v(), u()); });

    function geheel(w) { return Math.abs(w - Math.round(w)) < 1e-7; }

    // D springt naar een roosterpunt van de cirkel als het er dichtbij komt.
    D.on("drag", function () {
      var x = Math.round(D.X()), y = Math.round(D.Y());
      var mx = M.X(), my = M.Y();
      if ((x - mx) * (x - mx) + (y - my) * (y - my) === r2 &&
          Math.hypot(D.X() - x, D.Y() - y) < 0.3) {
        zet(D, x, y);
      }
      bord.update();
    });

    // De straal verandert zo dat r² geheel blijft.
    L.on("drag", function () {
      var afstand = Math.max(0, L.X() - M.X());
      r2 = Math.max(2, Math.min(30, Math.round(afstand * afstand)));
      var hoek = Math.atan2(v(), u());
      zet(L, M.X() + r(), M.Y());
      zet(D, M.X() + r() * Math.cos(hoek), M.Y() + r() * Math.sin(hoek));
      bord.update();
    });

    var vorigeM = [0, 0];
    opRooster(M, [-3, 3, 3, -3], function () {
      var sx = M.X() - vorigeM[0], sy = M.Y() - vorigeM[1];
      zet(D, D.X() + sx, D.Y() + sy);
      zet(L, M.X() + r(), M.Y());
      vorigeM = [M.X(), M.Y()];
    });

    function coord(w) { return geheel(w) ? String(Math.round(w)).replace("-", "−") : getal(ctx, w); }

    function werkBij() {
      var x1 = D.X(), y1 = D.Y(), mx = M.X(), my = M.Y();
      var du = u(), dv = v();
      var straal = vrijM ? "MD" : "OD";
      var rico;
      if (Math.abs(du) < 1e-7) {
        rico = "m_" + straal + " bestaat niet (" + straal + " is verticaal), dus m_t = 0";
      } else if (Math.abs(dv) < 1e-7) {
        rico = "m_" + straal + " = 0, dus t is verticaal";
      } else {
        var exact = geheel(du) && geheel(dv);
        rico = "m_" + straal + " = " +
          (exact ? breukTekst(breuk(Math.round(dv), Math.round(du))) : getal(ctx, dv / du)) +
          ", m_t = −1/m_" + straal + " = " +
          (exact ? breukTekst(breuk(-Math.round(du), Math.round(dv))) : getal(ctx, -du / dv));
      }
      var rechte;
      var alGeheel = geheel(x1) && geheel(y1);
      if (!vrijM) {
        rechte = "t ↔ x₁x + y₁y = r², dus " + (alGeheel
          ? rechteVorm(Math.round(x1), Math.round(y1), r2)
          : getal(ctx, x1) + "x + " + haak(ctx, y1) + "y = " + r2);
      } else {
        var w = r2 + du * mx + dv * my;
        rechte = "t ↔ (x₁ − x_M)(x − x_M) + (y₁ − y_M)(y − y_M) = r², dus (" +
          coord(x1) + " − " + haak(ctx, mx) + ")(x − " + haak(ctx, mx) + ") + (" +
          coord(y1) + " − " + haak(ctx, my) + ")(y − " + haak(ctx, my) + ") = " + r2 +
          (alGeheel ? " of " + rechteVorm(Math.round(du), Math.round(dv), Math.round(w)) : "");
      }
      ctx.toon((vrijM ? "𝒞 ↔ " + kwadraatTerm(ctx, "x", mx) + " + " +
                        kwadraatTerm(ctx, "y", my) + " = " + r2
                      : "𝒞 ↔ x² + y² = " + r2) +
        ", D(" + coord(x1) + ", " + coord(y1) + "). " + rico + ". " + rechte + ".");
    }
    // ux + vy = w, zonder nullen: 4x + 3y = 25, 5x = 25 of x = 5. Hebben de
    // coëfficiënten een gemeenschappelijke deler, dan volgt ook de
    // vereenvoudigde vorm, zoals −2x − 2y = 8 of x + y = −4.
    function rechteVorm(a, b, w) {
      function vorm(a, b, w) {
        return rechteTekst(a, b, 0).replace(/ = 0$/, "") + " = " + String(w).replace("-", "−");
      }
      var eenvoudig = normaliseer(a, b, -w, false);
      var anders = ggd(ggd(a, b), w) > 1;
      return vorm(a, b, w) + (anders ? " of " + vorm(eenvoudig[0], eenvoudig[1], -eenvoudig[2]) : "");
    }
    bord.on("update", werkBij);

    // Met een verschoven middelpunt wordt het de algemene formule.
    var middelpunt = schakelaar(ctx, "Middelpunt verschuiven", false, function (vrij) {
      var inO = !vrij;
      vrijM = vrij;
      if (inO) {
        var sx = -M.X(), sy = -M.Y();
        zet(M, 0, 0);
        zet(D, D.X() + sx, D.Y() + sy);
        vorigeM = [0, 0];
      } else if (M.X() === 0 && M.Y() === 0) {
        zet(M, BEGIN_M[0], BEGIN_M[1]);
        zet(D, D.X() + BEGIN_M[0], D.Y() + BEGIN_M[1]);
        vorigeM = BEGIN_M.slice();
      }
      zet(L, M.X() + r(), M.Y());
      M.setAttribute({ fixed: inO, name: inO ? "O" : "M" });
      bord.update();
    });

    function herstel() {
      middelpunt.zet(false);
      r2 = BEGIN_R2;
      zet(L, r(), 0);
      zet(D, BEGIN_D[0], BEGIN_D[1]);
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 5. Bovenste en onderste halve cirkel ------------------------------- */

  // Een verticale rechte door x snijdt de cirkel in twee punten: bij één x
  // horen twee y-waarden, f₁(x) en f₂(x). De raaklijn in het punt van f₁
  // toont het teken van f₁′(x): stijgend links, dalend rechts, horizontaal
  // in het maximum, verticaal in −r en r.
  G.registreer("halve-cirkels", function (ctx) {
    var BEGIN_R = 2.4, BEGIN_X = 1.2;
    var bord = ctx.maakBord({ begrenzing: [-3.6, 3.6, 3.9, -3.6], gelijkeschaal: true });
    var loop = animatie();
    var r = BEGIN_R;

    function f1(x) { return Math.sqrt(Math.max(r * r - x * x, 0)); }

    function halve(teken) {
      return pad(ctx, bord, teken > 0 ? "afgeleide" : "secante", function () {
        var xs = [], ys = [];
        for (var i = 0; i <= 120; i++) {
          var s = Math.PI * i / 120;
          xs.push(r * Math.cos(s));
          ys.push(teken * r * Math.sin(s));
        }
        return [xs, ys];
      }, { strokeWidth: 3 });
    }
    halve(1);
    halve(-1);
    var spoor = bord.create("segment", [[-3.2, 0], [3.2, 0]], { visible: false, fixed: true });
    var X = ctx.stijl(bord.create("glider", [BEGIN_X, 0, spoor], {
      name: "x", size: 5, showInfobox: false, precision: GRIJP,
      label: { anchorX: "middle", offset: [0, -20] }
    }), "punt");
    // De straal zelf versleep je met het punt r op de x-as.
    var Rpunt = ctx.stijl(bord.create("glider", [BEGIN_R, 0, spoor], {
      name: "r", size: 4, showInfobox: false, precision: GRIJP,
      label: { anchorX: "left", offset: [4, 14] }
    }), "hulp");
    tekst(ctx, bord, function () { return -r - 4 / bord.unitX; },
      function () { return 10 / bord.unitX; },
      "−r", "hulp", { anchorX: "right", anchorY: "bottom" });

    // De namen van de halve cirkels staan aan de kant waar x niet staat, zodat
    // ze niet op de waarden bij de verticale rechte vallen.
    function naamX() { return (X.X() >= 0 ? -0.78 : 0.78) * r; }
    function naamAnker() { return X.X() >= 0 ? "right" : "left"; }
    tekst(ctx, bord, naamX, function () { return 0.78 * r + 0.1; },
      "f<sub>1</sub>", "afgeleide", { anchorX: naamAnker, anchorY: "bottom" });
    tekst(ctx, bord, naamX, function () { return -0.78 * r - 0.1; },
      "f<sub>2</sub>", "secante", { anchorX: naamAnker, anchorY: "top" });

    function x() { return X.X(); }
    function P1() { return [x(), f1(x())]; }
    function P2() { return [x(), -f1(x())]; }

    ctx.stijl(bord.create("line", [
      [function () { return x(); }, -1], [function () { return x(); }, 1]], {
      strokeWidth: 1, dash: 2, fixed: true, highlight: false
    }), "zwak");
    var punt = { size: 4, fixed: true, highlight: false, showInfobox: false,
                 withLabel: false };
    ctx.stijl(bord.create("point", [function () { return P1()[0]; },
      function () { return P1()[1]; }], punt), "afgeleide");
    ctx.stijl(bord.create("point", [function () { return P2()[0]; },
      function () { return P2()[1]; }], punt), "secante");
    function waardeX() { return x() + (x() >= 0 ? 10 : -10) / bord.unitX; }
    function waardeAnker() { return x() >= 0 ? "left" : "right"; }
    tekst(ctx, bord, waardeX, function () { return f1(x()) + 6 / bord.unitX; },
      function () { return "f<sub>1</sub>(x) = " + getal(ctx, f1(x())); }, "afgeleide",
      { anchorX: waardeAnker, anchorY: "bottom" });
    tekst(ctx, bord, waardeX, function () { return -f1(x()) - 6 / bord.unitX; },
      function () { return "f<sub>2</sub>(x) = " + getal(ctx, -f1(x())); }, "secante",
      { anchorX: waardeAnker, anchorY: "top" });

    // De raaklijn in (x, f₁(x)) staat loodrecht op de straal: richting
    // (f₁(x), −x). Dat blijft ook in −r en r bruikbaar, waar ze verticaal is.
    var raaklijn = ctx.stijl(bord.create("line", [
      [function () { return P1()[0]; }, function () { return P1()[1]; }],
      [function () { return P1()[0] + f1(x()); }, function () { return P1()[1] - x(); }]], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "raaklijn");

    function begrensX() {
      var w = Math.round(X.X() * 10) / 10;
      w = Math.max(-r, Math.min(r, w));
      if (Math.abs(Math.abs(X.X()) - r) < 0.06) w = X.X() < 0 ? -r : r;
      zet(X, w, 0);
    }
    X.on("drag", function () { loop.stop(); begrensX(); bord.update(); });
    Rpunt.on("drag", function () {
      loop.stop();
      r = Math.max(0.8, Math.min(3.1, Math.round(Rpunt.X() * 10) / 10));
      zet(Rpunt, r, 0);
      begrensX();
      bord.update();
    });

    function werkBij() {
      var w = x();
      var y = f1(w);
      var tekstregel = "r = " + getal(ctx, r) + ", x = " + getal(ctx, w) + ": ";
      if (Math.abs(Math.abs(w) - r) < EPS) {
        tekstregel += "f₁(x) = f₂(x) = 0, een nulwaarde. f₁′(x) = −x/√(r² − x²) bestaat " +
          "niet: de raaklijn is verticaal.";
      } else {
        var afg = -w / y;
        tekstregel += "f₁(x) = √(r² − x²) = " + getal(ctx, y) + " en f₂(x) = −√(r² − x²) = " +
          getal(ctx, -y) + ": twee y-waarden bij één x, dus de cirkel is geen functie. " +
          "f₁′(x) = −x/√(r² − x²) = " + getal(ctx, afg);
        if (Math.abs(w) < EPS) tekstregel += ": horizontale raaklijn, maximum f₁(0) = r.";
        else if (afg > 0) tekstregel += " > 0: f₁ stijgt.";
        else tekstregel += " < 0: f₁ daalt.";
      }
      ctx.toon(tekstregel);
    }
    bord.on("update", werkBij);

    ctx.knop("Doorlopen van −r tot r", function () {
      loop.start(5000, function (deel) {
        zet(X, -r + 2 * r * deel, 0);
        bord.update();
      });
    });

    var toonRaaklijn = schakelaar(ctx, "Raaklijn", true,
      function (aan) { raaklijn.setAttribute({ visible: aan }); bord.update(); });

    function herstel() {
      loop.stop();
      r = BEGIN_R;
      zet(Rpunt, r, 0);
      zet(X, BEGIN_X, 0);
      toonRaaklijn.zet(true);
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel, vernietig: loop.stop };
  });

  /* --- 6 en 7. Parametervoorstelling -------------------------------------- */

  // P doorloopt de cirkel terwijl de hoek t van 0 tot 2π gaat. De
  // rechthoekige driehoek toont de coördinaten r cos t en r sin t. In het
  // algemene geval staat ernaast de cirkel rond O met hetzelfde punt: de
  // verschuiving over (x_M, y_M) brengt de ene op de andere.
  function parametervoorstelling(algemeen) {
    return function (ctx) {
      var BEGIN_M = algemeen ? [1, 1] : [0, 0];
      var BEGIN_R = 2;
      var BEGIN_T = algemeen ? 40 : 50;           // in graden, zoals de figuur
      var bord = ctx.maakBord({
        begrenzing: algemeen ? [-3.6, 4, 5, -2.6] : [-3, 3, 3.4, -3],
        gelijkeschaal: true
      });
      var loop = animatie();
      var r = BEGIN_R;

      var M = sleeppunt(ctx, bord, BEGIN_M[0], BEGIN_M[1], algemeen ? "M" : "O",
        "kromme", { offset: algemeen ? [-16, 14] : [-16, -12] });
      if (!algemeen) M.setAttribute({ fixed: true });

      var cirkel = ctx.stijl(bord.create("circle", [M, function () { return r; }], {
        strokeWidth: 2, fixed: true, highlight: false
      }), "kromme");
      var hoek0 = BEGIN_T * Math.PI / 180;
      var P = ctx.stijl(bord.create("glider", [BEGIN_M[0] + r * Math.cos(hoek0),
        BEGIN_M[1] + r * Math.sin(hoek0), cirkel], {
        name: "P", size: 5, showInfobox: false, precision: GRIJP,
        label: { offset: [8, 12] }
      }), "punt");
      var L = sleeppunt(ctx, bord, BEGIN_M[0] + r, BEGIN_M[1], algemeen ? "" : "L", "hulp",
        { offset: [6, 12] });
      L.setAttribute({ size: 4 });

      function t() {
        var a = Math.atan2(P.Y() - M.Y(), P.X() - M.X());
        return a < -EPS ? a + 2 * Math.PI : Math.max(a, 0);
      }
      function Q() { return [P.X(), M.Y()]; }

      // Het spoor van de verschuiving: de cirkel rond O en het punt P₀.
      var verschuiving = [];
      if (algemeen) {
        verschuiving.push(ctx.stijl(bord.create("circle", [[0, 0], function () { return r; }], {
          strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
        }), "zwak"));
        verschuiving.push(ctx.stijl(bord.create("point", [
          function () { return r * Math.cos(t()); }, function () { return r * Math.sin(t()); }], {
          name: "P<sub>0</sub>", size: 3, fixed: true, highlight: false, showInfobox: false,
          label: { offset: [8, -10] }
        }), "zwak"));
        verschuiving.push(ctx.stijl(bord.create("arrow", [[0, 0], M], {
          strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
        }), "zwak"));
        verschuiving.push(ctx.stijl(bord.create("arrow", [
          [function () { return r * Math.cos(t()); }, function () { return r * Math.sin(t()); }],
          P], { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "zwak"));
      }

      lijnstuk(ctx, bord, M, P, "punt", { strokeWidth: 3 });
      var hulpQ = [function () { return P.X(); }, function () { return M.Y(); }];
      lijnstuk(ctx, bord, M, hulpQ, "secante", { strokeWidth: 2.5 });
      lijnstuk(ctx, bord, hulpQ, P, "secante", { strokeWidth: 2.5 });
      if (!algemeen) {
        ctx.stijl(bord.create("point", hulpQ, {
          name: "Q", size: 2, fixed: true, highlight: false, showInfobox: false,
          label: { offset: [4, -12] }
        }), "hulp");
      }
      rechteHoek(ctx, bord, function () {
        var q = Q();
        return Math.abs(P.X() - M.X()) > 0.05 && Math.abs(P.Y() - M.Y()) > 0.05 ? q : null;
      }, function () { return [P.X() > M.X() ? -1 : 1, 0]; },
         function () { return [0, P.Y() > M.Y() ? 1 : -1]; });

      // De hoek t als boog vanaf de positieve x-richting.
      pad(ctx, bord, "punt", function () {
        var s = 26 / bord.unitX, eind = t(), xs = [], ys = [];
        var n = Math.max(2, Math.ceil(eind * 20));
        for (var i = 0; i <= n; i++) {
          xs.push(M.X() + s * Math.cos(eind * i / n));
          ys.push(M.Y() + s * Math.sin(eind * i / n));
        }
        return [xs, ys];
      }, { strokeWidth: 2 });
      tekst(ctx, bord,
        function () { return M.X() + 40 / bord.unitX * Math.cos(t() / 2); },
        function () { return M.Y() + 40 / bord.unitX * Math.sin(t() / 2); },
        "t", "punt");

      var px = function () { return 1 / bord.unitX; };
      function rechts() { return P.X() >= M.X(); }
      function boven() { return P.Y() >= M.Y(); }
      tekst(ctx, bord,
        function () { return (M.X() + P.X()) / 2; },
        function () { return M.Y() + (boven() ? -10 : 10) * px(); },
        function () {
          return Math.abs(P.X() - M.X()) < 0.3 ? "" : (algemeen ? "r cos t" : "x = r cos t");
        }, "secante", { anchorY: function () { return boven() ? "top" : "bottom"; } });
      tekst(ctx, bord,
        function () { return P.X() + (rechts() ? 8 : -8) * px(); },
        function () { return (M.Y() + P.Y()) / 2; },
        function () {
          return Math.abs(P.Y() - M.Y()) < 0.3 ? "" : (algemeen ? "r sin t" : "y = r sin t");
        }, "secante", { anchorX: function () { return rechts() ? "left" : "right"; } });
      tekst(ctx, bord,
        function () { return (M.X() + P.X()) / 2 + (boven() === rechts() ? -10 : 10) * px(); },
        function () { return (M.Y() + P.Y()) / 2 + 10 * px(); },
        "r", "punt", { anchorX: function () { return boven() === rechts() ? "right" : "left"; },
                       anchorY: "bottom" });

      function zetT(hoek) {
        zet(P, M.X() + r * Math.cos(hoek), M.Y() + r * Math.sin(hoek));
      }
      // P springt per graad, zodat t leesbaar blijft.
      P.on("drag", function () {
        loop.stop();
        zetT(Math.round(t() * 180 / Math.PI) * Math.PI / 180);
        bord.update();
      });
      L.on("drag", function () {
        loop.stop();
        var hoek = t();
        r = Math.max(0.6, Math.min(2.8, Math.round((L.X() - M.X()) * 10) / 10));
        zet(L, M.X() + r, M.Y());
        zetT(hoek);
        bord.update();
      });
      if (algemeen) {
        var vorigeM = BEGIN_M.slice();
        opRooster(M, [-2, 2, 3, -1], function () {
          zet(P, P.X() + M.X() - vorigeM[0], P.Y() + M.Y() - vorigeM[1]);
          zet(L, M.X() + r, M.Y());
          vorigeM = [M.X(), M.Y()];
        });
        M.on("down", loop.stop);
      }

      function werkBij() {
        var hoek = t();
        var graden = Math.round(hoek * 180 / Math.PI * 10) / 10;
        var c = Math.cos(hoek), s = Math.sin(hoek);
        var kop = "t = " + getal(ctx, graden, 1) + "° = " + getal(ctx, hoek, 3) +
          " rad, r = " + getal(ctx, r) + ": ";
        if (!algemeen) {
          ctx.toon(kop + "x = r cos t = " + getal(ctx, r) + " · " + haak(ctx, c, 3) + " = " +
            getal(ctx, r * c) + " en y = r sin t = " + getal(ctx, r) + " · " +
            haak(ctx, s, 3) + " = " + getal(ctx, r * s) + ". Controle: x² + y² = " +
            getal(ctx, r * r * (c * c + s * s)) + " = r².");
        } else {
          ctx.toon(kop + "M(" + getal(ctx, M.X()) + ", " + getal(ctx, M.Y()) +
            "), x = x_M + r cos t = " + getal(ctx, M.X()) + " + " + haak(ctx, r * c) +
            " = " + getal(ctx, M.X() + r * c) + " en y = y_M + r sin t = " +
            getal(ctx, M.Y()) + " + " + haak(ctx, r * s) + " = " + getal(ctx, M.Y() + r * s) +
            ". P₀(" + getal(ctx, r * c) + ", " + getal(ctx, r * s) +
            ") op de cirkel rond O schuift mee over (" + getal(ctx, M.X()) + ", " +
            getal(ctx, M.Y()) + ").");
        }
      }
      bord.on("update", werkBij);

      ctx.knop("t van 0 tot 2π", function () {
        loop.start(6000, function (deel) {
          zetT(2 * Math.PI * deel);
          bord.update();
        });
      });
      var toonVerschuiving = null;
      if (algemeen) {
        toonVerschuiving = schakelaar(ctx, "Verschuiving", true, function (aan) {
            verschuiving.forEach(function (el) { el.setAttribute({ visible: aan }); });
            bord.update();
          });
      }

      function herstel() {
        loop.stop();
        r = BEGIN_R;
        zet(M, BEGIN_M[0], BEGIN_M[1]);
        if (algemeen) vorigeM = BEGIN_M.slice();
        zet(L, BEGIN_M[0] + r, BEGIN_M[1]);
        zetT(hoek0);
        if (toonVerschuiving) toonVerschuiving.zet(true);
        bord.update();
      }
      ctx.knop("Beginstand", herstel);
      werkBij();
      return { reset: herstel, vernietig: loop.stop };
    };
  }
  G.registreer("parameter-oorsprong", parametervoorstelling(false));
  G.registreer("parameter-algemeen", parametervoorstelling(true));

  /* --- 8. Raaklijn via de afstand van M tot de rechte --------------------- */

  // Een rechte a door twee roosterpunten A en B, en de cirkel uit het
  // voorbeeld. De loodlijn uit M geeft d(M,a); vergeleken met r zegt dat of a
  // de cirkel snijdt, raakt of mist, en de snijpunten bevestigen het.
  G.registreer("afstand-rechte", function (ctx) {
    var MX = 1, MY = 3, R2 = 25;
    var BEGIN_A = [0, -4], BEGIN_B = [8, 2];
    var bord = ctx.maakBord({ begrenzing: [-6.5, 9.5, 10.5, -6.5], raster: true,
                              gelijkeschaal: true });
    var R = Math.sqrt(R2);

    ctx.stijl(bord.create("circle", [[MX, MY], R], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("point", [MX, MY], {
      name: "M", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-16, 12] }
    }), "kromme");

    var A = sleeppunt(ctx, bord, BEGIN_A[0], BEGIN_A[1], "A", "secante");
    var B = sleeppunt(ctx, bord, BEGIN_B[0], BEGIN_B[1], "B", "secante");
    ctx.stijl(bord.create("line", [A, B], {
      strokeWidth: 2.5, fixed: true, highlight: false, name: "a", withLabel: true,
      label: { position: "rt", offset: [-10, 12] }
    }), "secante");

    // u x + v y + w = 0 met gehele coëfficiënten, y-coëfficiënt positief.
    function rechte() {
      var u = B.Y() - A.Y(), v = A.X() - B.X();
      return normaliseer(u, v, -(u * A.X() + v * A.Y()), true);
    }
    function voet() {
      var l = rechte(), n2 = l[0] * l[0] + l[1] * l[1];
      var k = (l[0] * MX + l[1] * MY + l[2]) / n2;
      return [MX - k * l[0], MY - k * l[1]];
    }
    function afstand() {
      var l = rechte();
      return Math.abs(l[0] * MX + l[1] * MY + l[2]) / Math.sqrt(l[0] * l[0] + l[1] * l[1]);
    }
    function raakt() { return Math.abs(afstand() - R) < 1e-9; }

    var H = [function () { return voet()[0]; }, function () { return voet()[1]; }];
    lijnstuk(ctx, bord, [MX, MY], H, "punt", { strokeWidth: 2.5, dash: 2 });
    ctx.stijl(bord.create("point", H, {
      name: "H", size: 3, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [8, -10] }
    }), "punt");
    rechteHoek(ctx, bord, voet, function () {
      var h = voet(); return eenheid(MX - h[0], MY - h[1]);
    }, function () { return eenheid(B.X() - A.X(), B.Y() - A.Y()); });
    tekst(ctx, bord,
      function () { return (MX + voet()[0]) / 2 + 8 / bord.unitX; },
      function () { return (MY + voet()[1]) / 2; }, "d", "punt", { anchorX: "left" });

    // De gemeenschappelijke punten van a en de cirkel.
    function snijpunten() {
      var h = voet(), d = afstand();
      if (d > R + 1e-9) return [];
      var rest = Math.sqrt(Math.max(R2 - d * d, 0));
      var e = eenheid(B.X() - A.X(), B.Y() - A.Y());
      if (rest < 1e-9) return [h];
      return [[h[0] - rest * e[0], h[1] - rest * e[1]], [h[0] + rest * e[0], h[1] + rest * e[1]]];
    }
    [0, 1].forEach(function (i) {
      ctx.stijl(bord.create("point", [
        function () { var s = snijpunten(); return s[i] ? s[i][0] : 0; },
        function () { var s = snijpunten(); return s[i] ? s[i][1] : 0; }], {
        name: "", size: 4, fixed: true, highlight: false, showInfobox: false,
        withLabel: false, face: "o",
        visible: function () { return snijpunten().length > i; }
      }), "afgeleide");
    });

    function houdApart(bewogen) {
      if (A.X() === B.X() && A.Y() === B.Y()) {
        zet(bewogen, bewogen.X() + 1, bewogen.Y());
      }
    }
    opRooster(A, [-6, 9, 10, -6], function () { houdApart(A); });
    opRooster(B, [-6, 9, 10, -6], function () { houdApart(B); });

    function werkBij() {
      var l = rechte();
      var teller = l[0] * MX + l[1] * MY + l[2];
      var n2 = l[0] * l[0] + l[1] * l[1];
      var d = afstand();
      var noemer = Math.sqrt(n2);
      var noemerTekst = Math.abs(noemer - Math.round(noemer)) < EPS
        ? String(Math.round(noemer)) : "√" + n2;
      var besluit;
      if (raakt()) {
        var h = voet();
        besluit = " = r: a raakt de cirkel in H(" + getal(ctx, h[0]) + ", " +
          getal(ctx, h[1]) + ").";
      } else if (d < R) {
        besluit = " < r = " + getal(ctx, R) + ": a snijdt de cirkel in twee punten.";
      } else {
        besluit = " > r = " + getal(ctx, R) + ": a heeft geen punt gemeen met de cirkel.";
      }
      ctx.toon("𝒞 ↔ (x − 1)² + (y − 3)² = 25 en a ↔ " + rechteTekst(l[0], l[1], l[2]) +
        ". d(M,a) = |" + getal(ctx, l[0]) + "·1 + " + haak(ctx, l[1]) + "·3 + " +
        haak(ctx, l[2]) + "| / √(" + haak(ctx, l[0]) + "² + " + haak(ctx, l[1]) + "²) = " +
        Math.abs(teller) + "/" + noemerTekst +
        (teller !== 0 && (noemerTekst.charAt(0) === "√" ||
                          Math.abs(teller) % Math.round(noemer) !== 0)
          ? " ≈ " + getal(ctx, d) : " = " + getal(ctx, d)) + besluit);
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(A, BEGIN_A[0], BEGIN_A[1]);
      zet(B, BEGIN_B[0], BEGIN_B[1]);
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 9. Raaklijnen met een gegeven richting ---------------------------- */

  // De rechten y = 3x + m zijn allemaal evenwijdig met de gegeven rechte.
  // Substitutie in de cirkel geeft een vierkantsvergelijking in x; haar
  // discriminant beslist over twee, één of geen gemeenschappelijke punten.
  G.registreer("evenwijdige-raaklijnen", function (ctx) {
    var BEGIN_M = 2;                                 // de gegeven rechte zelf
    var bord = ctx.maakBord({ begrenzing: [-6.5, 6.5, 8.5, -4.5], raster: true,
                              gelijkeschaal: true });
    var m = BEGIN_M;

    ctx.stijl(bord.create("circle", [[1, 1], Math.sqrt(10)], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("point", [1, 1], {
      name: "M", size: 3, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-16, 10] }
    }), "kromme");
    ctx.stijl(bord.create("line", [[0, 2], [1, 5]], {
      strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
    }), "zwak");

    // Het sleeppunt ligt waar y = 3x + m de horizontale y = 1 door M snijdt:
    // zo blijft het in beeld voor alle m waar iets gebeurt.
    function xS() { return (1 - m) / 3; }
    var spoor = bord.create("segment", [[-6.5, 1], [8.5, 1]], { visible: false, fixed: true });
    var S = ctx.stijl(bord.create("glider", [xS(), 1, spoor], {
      name: "", size: 5, showInfobox: false, precision: GRIJP, withLabel: false
    }), "secante");
    ctx.stijl(bord.create("line", [
      [function () { return xS(); }, 1], [function () { return xS() + 1; }, 4]], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");
    tekst(ctx, bord, function () { return xS() + 1.5 + 14 / bord.unitX; },
      5.5, function () { return "y = 3x " + (m < 0 ? "− " : "+ ") + Math.abs(m); },
      "secante", { anchorX: "left" });

    // 10x² + (6m − 8)x + m² − 2m − 8 = 0
    function coef() { return [10, 6 * m - 8, m * m - 2 * m - 8]; }
    function discriminant() { var c = coef(); return c[1] * c[1] - 4 * c[0] * c[2]; }
    function oplossingen() {
      var c = coef(), D = discriminant();
      if (D < 0) return [];
      if (D === 0) return [-c[1] / 20];
      return [(-c[1] - Math.sqrt(D)) / 20, (-c[1] + Math.sqrt(D)) / 20];
    }
    [0, 1].forEach(function (i) {
      ctx.stijl(bord.create("point", [
        function () { var o = oplossingen(); return o[i] !== undefined ? o[i] : 0; },
        function () { var o = oplossingen(); return o[i] !== undefined ? 3 * o[i] + m : 0; }], {
        name: "", size: 4, fixed: true, highlight: false, showInfobox: false,
        withLabel: false, visible: function () { return oplossingen().length > i; }
      }), "afgeleide");
    });

    S.on("drag", function () {
      m = Math.max(-18, Math.min(20, Math.round(1 - 3 * S.X())));
      zet(S, xS(), 1);
      bord.update();
    });

    function werkBij() {
      var c = coef(), D = discriminant();
      function term(k, letter, eerste) {
        if (k === 0) return "";
        var abs = Math.abs(k);
        return (eerste ? (k < 0 ? "−" : "") : (k < 0 ? " − " : " + ")) +
          (abs === 1 && letter ? "" : abs) + letter;
      }
      var vkv = term(c[0], "x²", true) + term(c[1], "x") + term(c[2], "") + " = 0";
      var besluit;
      if (D > 0) besluit = "D > 0: twee snijpunten, geen raaklijn.";
      else if (D === 0) besluit = "D = 0: één gemeenschappelijk punt, y = 3x " +
        (m < 0 ? "− " : "+ ") + Math.abs(m) + " is een raaklijn.";
      else besluit = "D < 0: geen gemeenschappelijk punt.";
      ctx.toon("m = " + getal(ctx, m) + ": " + vkv + ", D = " + haak(ctx, c[1]) + "² − 4·10·" +
        haak(ctx, c[2]) + " = " + getal(ctx, D) + ". " + besluit);
    }
    bord.on("update", werkBij);

    function stapM(stap) { return function () { m += stap; zet(S, xS(), 1); bord.update(); }; }
    ctx.knop("m − 1", stapM(-1));
    ctx.knop("m + 1", stapM(1));
    function herstel() { m = BEGIN_M; zet(S, xS(), 1); bord.update(); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 10. Omgeschreven cirkel van een driehoek ---------------------------- */

  // Twee middelloodlijnen snijden in M, dat even ver van A, B en C ligt. Met
  // gehele hoekpunten rekent alles exact met breuken, zodat de leerling ook
  // de oefening met M(27/22, 37/22) kan nakijken.
  G.registreer("omgeschreven-cirkel", function (ctx) {
    var BEGIN = { A: [5, 6], B: [-2, -1], C: [5, 0] };
    var bord = ctx.maakBord({ begrenzing: [-5.5, 10.5, 10.5, -4.5], raster: true,
                              gelijkeschaal: true });

    var A = sleeppunt(ctx, bord, BEGIN.A[0], BEGIN.A[1], "A", "punt");
    var B = sleeppunt(ctx, bord, BEGIN.B[0], BEGIN.B[1], "B", "punt",
      { offset: [-18, -12] });
    var C = sleeppunt(ctx, bord, BEGIN.C[0], BEGIN.C[1], "C", "punt",
      { offset: [8, -12] });
    [[A, B], [B, C], [C, A]].forEach(function (zijde) {
      lijnstuk(ctx, bord, zijde[0], zijde[1], "kromme", { strokeWidth: 1.5 });
    });

    // De middelloodlijn van [PQ]: 2(x_Q − x_P)x + 2(y_Q − y_P)y = x_Q² + y_Q² − x_P² − y_P².
    function middelloodlijn(P, Q) {
      var u = 2 * (Q.X() - P.X()), v = 2 * (Q.Y() - P.Y());
      var w = -(Q.X() * Q.X() + Q.Y() * Q.Y() - P.X() * P.X() - P.Y() * P.Y());
      return normaliseer(u, v, w, false);
    }
    function middelpunt() {
      var l1 = middelloodlijn(A, B), l2 = middelloodlijn(B, C);
      var det = l1[0] * l2[1] - l2[0] * l1[1];
      if (det === 0) return null;
      return {
        x: breuk(-l1[2] * l2[1] + l2[2] * l1[1], det),
        y: breuk(-l1[0] * l2[2] + l2[0] * l1[2], det)
      };
    }
    function waarde(b) { return b.t / b.n; }
    function mx() { var m = middelpunt(); return m ? waarde(m.x) : 0; }
    function my() { var m = middelpunt(); return m ? waarde(m.y) : 0; }
    function bestaat() { return middelpunt() !== null; }

    // Een middelloodlijn als rechte door het midden van [PQ], loodrecht erop.
    function tekenMiddelloodlijn(P, Q, rol, opties) {
      var midden = [function () { return (P.X() + Q.X()) / 2; },
                    function () { return (P.Y() + Q.Y()) / 2; }];
      var o = { strokeWidth: 1.8, dash: 3, fixed: true, highlight: false };
      Object.keys(opties || {}).forEach(function (k) { o[k] = opties[k]; });
      var lijn = ctx.stijl(bord.create("line", [midden, [
        function () { return (P.X() + Q.X()) / 2 - (Q.Y() - P.Y()); },
        function () { return (P.Y() + Q.Y()) / 2 + (Q.X() - P.X()); }]], o), rol);
      var stip = ctx.stijl(bord.create("point", midden, {
        name: "", withLabel: false, size: 2, fixed: true, highlight: false,
        showInfobox: false, visible: o.visible
      }), rol);
      rechteHoek(ctx, bord, function () {
        if (o.visible && !o.visible()) return null;
        return [midden[0](), midden[1]()];
      }, function () { return eenheid(Q.X() - P.X(), Q.Y() - P.Y()); },
         function () { return eenheid(-(Q.Y() - P.Y()), Q.X() - P.X()); }, rol);
      return [lijn, stip];
    }
    tekenMiddelloodlijn(A, B, "secante");
    tekenMiddelloodlijn(B, C, "secante");
    var derdeAan = false;
    tekenMiddelloodlijn(A, C, "zwak", { visible: function () { return derdeAan; } });

    ctx.stijl(bord.create("circle", [
      [mx, my], function () { return Math.hypot(A.X() - mx(), A.Y() - my()); }], {
      strokeWidth: 2.5, fixed: true, highlight: false, visible: bestaat
    }), "afgeleide");
    ctx.stijl(bord.create("point", [mx, my], {
      name: "M", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [8, 12] }, visible: bestaat
    }), "afgeleide");

    var punten = [A, B, C];
    punten.forEach(function (p) {
      opRooster(p, [-5, 10, 10, -4], function () {
        // Twee samenvallende hoekpunten maken geen driehoek.
        punten.forEach(function (q) {
          if (q !== p && q.X() === p.X() && q.Y() === p.Y()) zet(p, p.X() + 1, p.Y());
        });
      });
    });

    function werkBij() {
      var m = middelpunt();
      if (!m) {
        ctx.toon("A, B en C liggen op één rechte: de middelloodlijnen zijn evenwijdig " +
          "en er is geen omgeschreven cirkel.");
        return;
      }
      var l1 = middelloodlijn(A, B), l2 = middelloodlijn(B, C);
      // r² = (x_A − x_M)² + (y_A − y_M)² als breuk.
      var n = m.x.n * m.y.n / ggd(m.x.n, m.y.n);
      var dxA = A.X() * n - m.x.t * (n / m.x.n);
      var dyA = A.Y() * n - m.y.t * (n / m.y.n);
      var r2 = breuk(dxA * dxA + dyA * dyA, n * n);
      function termBreuk(letter, b) {
        if (b.t === 0) return letter + "²";
        var abs = breukTekst({ t: Math.abs(b.t), n: b.n });
        return "(" + letter + (b.t > 0 ? " − " : " + ") + abs + ")²";
      }
      ctx.toon("Middelloodlijn van [AB] ↔ " + rechteTekst(l1[0], l1[1], l1[2]) +
        " en van [BC] ↔ " + rechteTekst(l2[0], l2[1], l2[2]) + ". Snijpunt M(" +
        breukTekst(m.x) + ", " + breukTekst(m.y) + "), r² = d(M,A)² = " +
        breukTekst(r2) + ". 𝒞 ↔ " + termBreuk("x", m.x) + " + " + termBreuk("y", m.y) +
        " = " + breukTekst(r2) + ".");
    }
    bord.on("update", werkBij);

    var derde = schakelaar(ctx, "Middelloodlijn van [AC]", false,
      function (aan) { derdeAan = aan; bord.update(); });

    function herstel() {
      zet(A, BEGIN.A[0], BEGIN.A[1]);
      zet(B, BEGIN.B[0], BEGIN.B[1]);
      zet(C, BEGIN.C[0], BEGIN.C[1]);
      derde.zet(false);
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });
})();
