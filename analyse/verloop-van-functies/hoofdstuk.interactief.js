/* Interactieve grafieken bij A17_VerloopVanFuncties.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert de context: het bord, de kleuren per
 * rol, de getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 *
 * Bovenaan staan enkele hulpmiddelen die meerdere grafieken van dit
 * hoofdstuk delen: een glijpunt op de x-as met zijn punt op de grafiek, een
 * schets op schaal in een hoek van het bord, nulwaarden zoeken en lagen die
 * met een knop aan en uit gaan.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;
  var JXG = window.JXG;

  var SLEEP = { touch: 30, mouse: 6 };

  function opties(extra) {
    var uit = { fixed: true, highlight: false };
    Object.keys(extra || {}).forEach(function (k) { uit[k] = extra[k]; });
    return uit;
  }

  function zet(punt, x, y) {
    punt.setPosition(JXG.COORDS_BY_USER, [x, y]);
  }

  /* --- Hulpmiddelen ------------------------------------------------------ */

  // Alle x in ]links, rechts[ waar g van teken wisselt, verfijnd met
  // bisectie. Genoeg voor de gladde functies van dit hoofdstuk.
  function nulwaarden(g, links, rechts, stappen) {
    var n = stappen || 400;
    var uit = [];
    var h = (rechts - links) / n;
    var xa = links + h * 1e-3;
    var ga = g(xa);
    for (var i = 1; i <= n; i++) {
      var xb = links + i * h - (i === n ? h * 1e-3 : 0);
      var gb = g(xb);
      if (isFinite(ga) && isFinite(gb) && ga * gb < 0) {
        var a = xa, b = xb, fa = ga;
        for (var k = 0; k < 50; k++) {
          var m = (a + b) / 2;
          var fm = g(m);
          if (fa * fm <= 0) { b = m; } else { a = m; fa = fm; }
        }
        uit.push((a + b) / 2);
      }
      xa = xb; ga = gb;
    }
    return uit;
  }

  function afgeleide(f) {
    return function (x) {
      var h = 1e-5;
      return (f(x + h) - f(x - h)) / (2 * h);
    };
  }

  // De veelterm door de gegeven punten, in de vorm van Lagrange.
  function interpolatie(punten) {
    return function (x) {
      var som = 0;
      for (var i = 0; i < punten.length; i++) {
        var term = punten[i][1];
        for (var j = 0; j < punten.length; j++) {
          if (j !== i) term *= (x - punten[j][0]) / (punten[i][0] - punten[j][0]);
        }
        som += term;
      }
      return som;
    };
  }

  // Een punt op de x-as dat over [links, rechts] schuift, met zijn punt op
  // de grafiek erboven en de verticale stippellijn ertussen. Beide punten
  // zijn sleepbaar; wie het ene sleept, verplaatst het andere mee.
  function asEnGrafiek(ctx, bord, f, cfg) {
    var spoor = bord.create("segment", [[cfg.links, 0], [cfg.rechts, 0]], {
      visible: false, fixed: true
    });
    var voet = ctx.stijl(bord.create("glider", [cfg.start, 0, spoor], {
      name: cfg.naam, size: 4, showInfobox: false, precision: SLEEP,
      label: { anchorX: "middle", offset: [0, -22] }
    }), "punt");
    var punt = ctx.stijl(bord.create("point", [cfg.start, f(cfg.start)], {
      name: "", size: 4, showInfobox: false, precision: SLEEP
    }), "punt");

    function geldig(x) {
      x = Math.min(cfg.rechts, Math.max(cfg.links, x));
      return cfg.corrigeer ? cfg.corrigeer(x) : x;
    }
    voet.on("drag", function () {
      var x = geldig(voet.X());
      if (x !== voet.X()) zet(voet, x, 0);
      zet(punt, x, f(x));
      bord.update();
    });
    punt.on("drag", function () {
      var x = geldig(punt.X());
      zet(punt, x, f(x));
      zet(voet, x, 0);
      bord.update();
    });
    ctx.stijl(bord.create("segment", [
      [function () { return voet.X(); }, 0],
      [function () { return punt.X(); }, function () { return punt.Y(); }]
    ], opties({ strokeWidth: 1, dash: 2 })), "zwak");

    return {
      x: function () { return voet.X(); },
      punt: punt,
      zetX: function (x) {
        x = geldig(x);
        zet(voet, x, 0);
        zet(punt, x, f(x));
        bord.update();
      }
    };
  }

  // Een schets op schaal in een rechthoek van het bord, gegeven in
  // gebruikerscoördinaten [links, onder, rechts, boven]. teken() geeft
  // { breedte, hoogte, lijnen: [[[x, y], ...], ...] } in de eenheid van het
  // vraagstuk (cm of m). Breedte en hoogte krijgen dezelfde schaal in pixels,
  // zodat de vorm klopt, ook als de assen van het bord niet even groot zijn.
  function schets(ctx, bord, regio, teken, rol, extra) {
    var kromme = bord.create("curve", [[], []], opties(extra || { strokeWidth: 2 }));
    kromme.updateDataArray = function () {
      var t = teken();
      var bx = (regio[2] - regio[0]) * bord.unitX;
      var by = (regio[3] - regio[1]) * bord.unitY;
      var s = Math.min(bx / t.breedte, by / t.hoogte);
      var ox = (bx - s * t.breedte) / 2;
      var oy = (by - s * t.hoogte) / 2;
      var xs = [], ys = [];
      t.lijnen.forEach(function (lijn) {
        lijn.forEach(function (p) {
          xs.push(regio[0] + (ox + s * p[0]) / bord.unitX);
          ys.push(regio[1] + (oy + s * p[1]) / bord.unitY);
        });
        xs.push(NaN); ys.push(NaN);
      });
      this.dataX = xs;
      this.dataY = ys;
    };
    return ctx.stijl(kromme, rol || "punt");
  }

  function rechthoek(x, y, b, h) {
    return [[x, y], [x + b, y], [x + b, y + h], [x, y + h], [x, y]];
  }

  // Een knop die een groep objecten toont en verbergt.
  function laag(ctx, bord, opschrift, objecten, bijWissel) {
    var aan = false;
    var knop = ctx.knop(opschrift, function () { zetLaag(!aan); });
    function zetLaag(stand) {
      aan = stand;
      objecten().forEach(function (o) { o.setAttribute({ visible: aan }); });
      knop.setAttribute("aria-pressed", String(aan));
      if (bijWissel) bijWissel(aan);
      bord.update();
    }
    knop.setAttribute("aria-pressed", "false");
    return { zet: zetLaag, aan: function () { return aan; } };
  }

  function label(ctx, bord, x, y, tekst, extra) {
    var o = { anchorX: "left", anchorY: "bottom", fixed: true, highlight: false };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return ctx.stijl(bord.create("text", [x, y, tekst], o), "tekst");
  }

  // Een kort horizontaal of schuin raaklijnstuk door (x0, y0) met rico m.
  function raakstuk(ctx, bord, x0, y0, m, halve, rol, extra) {
    var o = { strokeWidth: 2.5 };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return ctx.stijl(bord.create("segment", [
      [function () { return valOf(x0) - valOf(halve); },
       function () { return valOf(y0) - valOf(m) * valOf(halve); }],
      [function () { return valOf(x0) + valOf(halve); },
       function () { return valOf(y0) + valOf(m) * valOf(halve); }]
    ], opties(o)), rol || "raaklijn");
  }

  function valOf(v) { return typeof v === "function" ? v() : v; }

  /* --- 1. Stelling van Rolle --------------------------------------------- */

  // Een derdegraadsfunctie door P(1, h), twee vormpunten en Q(5, h). De
  // hoogte h van P bepaalt die van Q, zodat f(a) = f(b) altijd geldt. Met
  // twee vormpunten kan de leerling zelf een grafiek maken met één of twee
  // punten met een horizontale raaklijn; Toon c zet ze er alle bij.
  G.registreer("rolle", function (ctx) {
    var A = 1, B = 5;
    var bord = ctx.maakBord({ begrenzing: [-0.4, 3.6, 6.2, -0.6], asgetallen: false });

    var paal = bord.create("segment", [[A, 0.3], [A, 3.3]], { visible: false, fixed: true });
    var P = ctx.stijl(bord.create("glider", [A, 1.5, paal], {
      name: "P", size: 5, showInfobox: false, precision: SLEEP,
      label: { offset: [-18, 4] }
    }), "punt");
    var Q = ctx.stijl(bord.create("point", [B, function () { return P.Y(); }], {
      name: "Q", size: 4, fixed: true, showInfobox: false, label: { offset: [8, 4] }
    }), "punt");

    var V1 = ctx.stijl(bord.create("point", [2.2, 2.8], {
      name: "", size: 6, face: "<>", showInfobox: false, precision: SLEEP
    }), "hulp");
    var V2 = ctx.stijl(bord.create("point", [3.8, 0.6], {
      name: "", size: 6, face: "<>", showInfobox: false, precision: SLEEP
    }), "hulp");

    function begrens() {
      var x1 = Math.min(Math.max(V1.X(), A + 0.3), B - 0.9);
      var x2 = Math.min(Math.max(V2.X(), x1 + 0.6), B - 0.3);
      zet(V1, x1, Math.min(3.4, Math.max(-0.4, V1.Y())));
      zet(V2, x2, Math.min(3.4, Math.max(-0.4, V2.Y())));
    }
    V1.on("drag", begrens);
    V2.on("drag", begrens);

    function f(x) {
      return interpolatie([[A, P.Y()], [V1.X(), V1.Y()], [V2.X(), V2.Y()],
        [B, P.Y()]])(x);
    }
    var df = afgeleide(f);

    var kromme = ctx.stijl(bord.create("functiongraph", [f, A, B], opties({
      strokeWidth: 2.5, name: "f", withLabel: false
    })), "kromme");

    ["a", "b"].forEach(function (naam, i) {
      var x = i ? B : A;
      ctx.stijl(bord.create("segment", [[x, 0], [x, function () { return P.Y(); }]],
        opties({ strokeWidth: 1, dash: 2 })), "zwak");
      label(ctx, bord, x, -0.12, naam, { anchorX: "middle", anchorY: "top" });
    });

    var T = ctx.stijl(bord.create("glider", [2, f(2), kromme], {
      name: "T", size: 5, showInfobox: false, precision: SLEEP,
      label: { offset: [-6, 14] }
    }), "secante");
    ctx.stijl(bord.create("tangent", [T], opties({ strokeWidth: 1.5, dash: 2 })),
      "secante");

    var toonC = false;
    var cs = [];
    function wortels() { return nulwaarden(df, A, B); }
    var stukken = [0, 1, 2].map(function (i) {
      var stuk = raakstuk(ctx, bord,
        function () { return cs[i] || 0; },
        function () { return f(cs[i] || 0); }, 0, 0.6, "raaklijn",
        { visible: function () { return toonC && i < cs.length; } });
      var voet = ctx.stijl(bord.create("segment", [
        [function () { return cs[i] || 0; }, 0],
        [function () { return cs[i] || 0; }, function () { return f(cs[i] || 0); }]
      ], opties({ strokeWidth: 1, dash: 2,
        visible: function () { return toonC && i < cs.length; } })), "raaklijn");
      var naam = ctx.stijl(bord.create("text", [
        function () { return cs[i] || 0; }, -0.12,
        function () { return cs.length > 1 ? "c" + (i + 1) : "c"; }
      ], opties({ anchorX: "middle", anchorY: "top",
        visible: function () { return toonC && i < cs.length; } })), "raaklijn");
      return [stuk, voet, naam];
    });

    function werkBij() {
      cs = wortels();
      var m = df(T.X());
      ctx.toon("f(a) = f(b) = " + ctx.getal(P.Y(), 2) +
        ". In T is x = " + ctx.getal(T.X(), 2) + " en f′(x) = " + ctx.getal(m, 2) +
        (Math.abs(m) < 0.05 ? ": de raaklijn ligt (bijna) horizontaal." : ".") +
        (toonC ? " Punten met f′(c) = 0: " + (cs.length ? cs.map(function (c) {
          return "c = " + ctx.getal(c, 2);
        }).join(", ") : "geen") + "." : ""));
    }
    bord.on("update", werkBij);

    var knopC = ctx.knop("Toon c", function () {
      toonC = !toonC;
      knopC.setAttribute("aria-pressed", String(toonC));
      bord.update();
    });
    knopC.setAttribute("aria-pressed", "false");

    function herstel() {
      zet(P, A, 1.5);
      zet(V1, 2.2, 2.8);
      zet(V2, 3.8, 0.6);
      bord.update();
      zet(T, 2, f(2));
      toonC = false;
      knopC.setAttribute("aria-pressed", "false");
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 2. Stelling van Lagrange ------------------------------------------ */

  // Een vierdegraadsfunctie door P, drie vormpunten en Q. De koorde PQ staat
  // in het oranje; Toon c zet in elk punt waar de raaklijn evenwijdig is met
  // PQ een stuk van die raaklijn in het blauw.
  G.registreer("lagrange", function (ctx) {
    var A = 0.8, B = 5;
    var BEGIN = [[1.7, 3.0], [2.9, 0.9], [4.2, 3.7]];
    var bord = ctx.maakBord({ begrenzing: [-0.3, 4.8, 5.8, -0.5], asgetallen: false });

    function paal(x) {
      return bord.create("segment", [[x, 0.2], [x, 4.4]], { visible: false, fixed: true });
    }
    var P = ctx.stijl(bord.create("glider", [A, 1.3, paal(A)], {
      name: "P", size: 5, showInfobox: false, precision: SLEEP, label: { offset: [-18, 4] }
    }), "punt");
    var Q = ctx.stijl(bord.create("glider", [B, 2.9, paal(B)], {
      name: "Q", size: 5, showInfobox: false, precision: SLEEP, label: { offset: [8, 4] }
    }), "punt");
    var V = BEGIN.map(function (p) {
      return ctx.stijl(bord.create("point", p, {
        name: "", size: 6, face: "<>", showInfobox: false, precision: SLEEP
      }), "hulp");
    });
    function begrens() {
      var vorige = A;
      V.forEach(function (v, i) {
        var x = Math.min(Math.max(v.X(), vorige + 0.4), B - 0.4 * (3 - i));
        zet(v, x, Math.min(4.6, Math.max(-0.3, v.Y())));
        vorige = x;
      });
    }
    V.forEach(function (v) { v.on("drag", begrens); });

    function f(x) {
      return interpolatie([[A, P.Y()]].concat(V.map(function (v) {
        return [v.X(), v.Y()];
      }), [[B, Q.Y()]]))(x);
    }
    var df = afgeleide(f);
    function rico() { return (Q.Y() - P.Y()) / (B - A); }

    var kromme = ctx.stijl(bord.create("functiongraph", [f, A, B], opties({
      strokeWidth: 2.5
    })), "kromme");
    ctx.stijl(bord.create("segment", [P, Q], opties({ strokeWidth: 2, dash: 2 })),
      "secante");
    label(ctx, bord, A, -0.1, "a", { anchorX: "middle", anchorY: "top" });
    label(ctx, bord, B, -0.1, "b", { anchorX: "middle", anchorY: "top" });

    var T = ctx.stijl(bord.create("glider", [2.3, f(2.3), kromme], {
      name: "T", size: 5, showInfobox: false, precision: SLEEP, label: { offset: [-6, 14] }
    }), "punt");
    ctx.stijl(bord.create("tangent", [T], opties({ strokeWidth: 1.5, dash: 2 })), "punt");

    var toonC = false;
    var cs = [];
    [0, 1, 2, 3].forEach(function (i) {
      function zicht() { return toonC && i < cs.length; }
      raakstuk(ctx, bord, function () { return cs[i] || 0; },
        function () { return f(cs[i] || 0); }, rico, 0.6, "raaklijn", { visible: zicht });
      ctx.stijl(bord.create("segment", [
        [function () { return cs[i] || 0; }, 0],
        [function () { return cs[i] || 0; }, function () { return f(cs[i] || 0); }]
      ], opties({ strokeWidth: 1, dash: 2, visible: zicht })), "raaklijn");
      ctx.stijl(bord.create("text", [function () { return cs[i] || 0; }, -0.1,
        function () { return "c" + (i + 1); }],
        opties({ anchorX: "middle", anchorY: "top", visible: zicht })), "raaklijn");
    });

    function werkBij() {
      var m = rico();
      cs = nulwaarden(function (x) { return df(x) - m; }, A, B);
      var mt = df(T.X());
      ctx.toon("rico PQ = " + ctx.getal(m, 2) + "; rico raaklijn in T = " +
        ctx.getal(mt, 2) + (Math.abs(mt - m) < 0.05 ? ": evenwijdig met PQ." : ".") +
        (toonC ? " Punten met f′(c) = rico PQ: " + cs.map(function (c) {
          return "c = " + ctx.getal(c, 2);
        }).join(", ") + "." : ""));
    }
    bord.on("update", werkBij);

    var knopC = ctx.knop("Toon c", function () {
      toonC = !toonC;
      knopC.setAttribute("aria-pressed", String(toonC));
      bord.update();
    });
    knopC.setAttribute("aria-pressed", "false");

    function herstel() {
      zet(P, A, 1.3);
      zet(Q, B, 2.9);
      V.forEach(function (v, i) { zet(v, BEGIN[i][0], BEGIN[i][1]); });
      bord.update();
      zet(T, 2.3, f(2.3));
      toonC = false;
      knopC.setAttribute("aria-pressed", "false");
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 3. Stijgen, dalen en extrema -------------------------------------- */

  // Dezelfde kromme als de statische figuur bij "Extremum van een functie".
  // Het punt glijdt over de grafiek; de raaklijn kleurt mee met het teken
  // van f′. Met de knoppen komt de grafiek van f′ erbij, en de extrema met
  // hun horizontale raaklijn.
  G.registreer("stijgen-dalen", function (ctx) {
    function f(x) { return 0.6 * (x * x * x / 3 - 2.5 * x * x + 5.25 * x) + 0.3; }
    function df(x) { return 0.6 * (x * x - 5 * x + 5.25); }
    var bord = ctx.maakBord({ begrenzing: [-0.4, 3.9, 5.8, -1.1], raster: true });

    var kromme = ctx.stijl(bord.create("functiongraph", [f, 0.2, 5.1], opties({
      strokeWidth: 2.5, name: "f", withLabel: true, label: { position: "rt", offset: [-10, 10] }
    })), "kromme");
    var grafiekAfg = ctx.stijl(bord.create("functiongraph", [df, 0.2, 5.1], opties({
      strokeWidth: 2, dash: 2, visible: false, name: "f′", withLabel: true,
      label: { position: "rt", offset: [-14, -10] }
    })), "afgeleide");

    var T = ctx.stijl(bord.create("glider", [0.8, f(0.8), kromme], {
      name: "", size: 5, showInfobox: false, precision: SLEEP
    }), "punt");
    var raak = ctx.stijl(bord.create("tangent", [T], opties({ strokeWidth: 2 })), "raaklijn");
    var spoorAfg = ctx.stijl(bord.create("point", [
      function () { return T.X(); }, function () { return df(T.X()); }
    ], opties({ name: "", size: 3, visible: false })), "afgeleide");

    var extrema = [
      raakstuk(ctx, bord, 1.5, f(1.5), 0, 0.6, "raaklijn", { visible: false }),
      raakstuk(ctx, bord, 3.5, f(3.5), 0, 0.6, "raaklijn", { visible: false }),
      label(ctx, bord, 1.5, f(1.5) + 0.12, "max", { anchorX: "middle", visible: false }),
      label(ctx, bord, 3.5, f(3.5) - 0.12, "min", { anchorX: "middle", anchorY: "top",
        visible: false })
    ];

    function werkBij() {
      var m = df(T.X());
      var stand = Math.abs(m) < 0.03 ? "f′(x) = 0: horizontale raaklijn"
        : m > 0 ? "f′(x) > 0: f stijgt" : "f′(x) < 0: f daalt";
      ctx.toon("x = " + ctx.getal(T.X(), 2) + ", f′(x) = " + ctx.getal(m, 2) +
        ". " + stand + ".");
      raak.setAttribute({ dash: Math.abs(m) < 0.03 ? 0 : m > 0 ? 0 : 3 });
    }
    bord.on("update", werkBij);

    var lAfg = laag(ctx, bord, "Grafiek van f′", function () {
      return [grafiekAfg, spoorAfg];
    });
    var lExt = laag(ctx, bord, "Extrema", function () { return extrema; });

    function herstel() {
      lAfg.zet(false);
      lExt.zet(false);
      zet(T, 0.8, f(0.8));
      bord.update();
    }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 4. Som 12, maximaal product x²·y ---------------------------------- */

  // Leerlingen gokken hier 6 en 6. Gok 6 en 6 zet die keuze op de grafiek,
  // zodat ze zien dat ze onder het echte maximum in x = 8 ligt.
  G.registreer("som-product", function (ctx) {
    function P(x) { return x * x * (12 - x); }
    var bord = ctx.maakBord({ begrenzing: [-0.8, 300, 13, -25] });
    ctx.stijl(bord.create("functiongraph", [P, 0, 12], opties({ strokeWidth: 2.5 })), "kromme");

    var X = asEnGrafiek(ctx, bord, P, { links: 0.2, rechts: 11.8, start: 2, naam: "x" });

    var gok = [
      ctx.stijl(bord.create("point", [6, 216], opties({ name: "", size: 4, visible: false })), "secante"),
      ctx.stijl(bord.create("segment", [[0, 216], [6, 216]], opties({
        strokeWidth: 1.5, dash: 2, visible: false })), "secante"),
      ctx.stijl(bord.create("text", [6.3, 205, "gok 6 en 6: 216"], opties({
        anchorX: "left", anchorY: "top", visible: false })), "secante")
    ];
    var maximum = [
      raakstuk(ctx, bord, 8, 256, 0, 1.5, "raaklijn", { visible: false }),
      label(ctx, bord, 8, 262, "max = 256", { anchorX: "middle", visible: false })
    ];

    function werkBij() {
      var x = X.x();
      ctx.toon("x = " + ctx.getal(x, 2) + ", y = 12 − x = " + ctx.getal(12 - x, 2) +
        ", product x²·y = " + ctx.getal(P(x), 2) + ".");
    }
    bord.on("update", werkBij);
    var l1 = laag(ctx, bord, "Gok 6 en 6", function () { return gok; });
    var l2 = laag(ctx, bord, "Toon maximum", function () { return maximum; });

    function herstel() { l1.zet(false); l2.zet(false); X.zetX(2); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 5. Op ieder potje past een dekseltje ------------------------------ */

  // De kost k(r), naast het potje zelf: de Asymptote-figuur potje.asy, die
  // in dezelfde figuur-bewijs rechts staat. Beide sturen dezelfde r. Wie r in
  // de grafiek versleept, zet de schuifregelaar die presentatie.js onder het
  // potje maakt, en die vervormt het potje; wie de schuifregelaar versleept,
  // verschuift het punt op de grafiek. Het bereik van r is dat van de
  // regelaar in potje.asy: van 2 tot 6.5 per 0.01.
  G.registreer("potje", function (ctx) {
    var RMIN = 2, RMAX = 6.5, STAP = 0.01, ROPT = 3.2707, BEGIN = 2;
    function k(r) { return 0.005 * Math.PI * r * r + 0.003 * Math.PI * r + 1.2 / r; }
    function hoogte(r) { return 300 / (Math.PI * r * r); }
    var bord = ctx.maakBord({ begrenzing: [-0.5, 2.3, 8.6, -0.25] });
    ctx.stijl(bord.create("functiongraph", [k, 0.58, 8.4], opties({ strokeWidth: 2.5 })), "kromme");

    var R = asEnGrafiek(ctx, bord, k, { links: RMIN, rechts: RMAX, start: BEGIN, naam: "r" });

    var minimum = [
      raakstuk(ctx, bord, ROPT, k(ROPT), 0, 1, "raaklijn", { visible: false }),
      label(ctx, bord, ROPT, k(ROPT) - 0.08, "min ≈ 0.57", { anchorX: "middle",
        anchorY: "top", visible: false })
    ];

    /* De koppeling met het potje. */

    var blok = ctx.figuur.closest(".figuur-bewijs") || document;
    function frame() { return blok.querySelector('iframe[src*="potje"]'); }
    function regelaar() {
      var f = frame();
      return f && f.parentNode ? f.parentNode.querySelector(".pres-figuurschuif input") : null;
    }
    function index() { return Math.round((R.x() - RMIN) / STAP); }

    var zelf = false;
    function stuurPotje() {
      var invoer = regelaar();
      if (!invoer || Number(invoer.value) === index()) return;
      zelf = true;
      invoer.value = String(index());
      invoer.dispatchEvent(new Event("input", { bubbles: true }));
      zelf = false;
    }

    function vanRegelaar(e) {
      if (zelf || !e.target.closest || !e.target.closest(".pres-figuurschuif")) return;
      R.zetX(RMIN + Number(e.target.value) * STAP);
    }
    blok.addEventListener("input", vanRegelaar);

    // Laadt het potje (opnieuw), dan meldt het zijn eigen beginwaarde en
    // maakt presentatie.js de regelaar. Daarna krijgt het de r van hier.
    function bijMelding(e) {
      var f = frame();
      if (f && e.source === f.contentWindow && e.data && e.data.type === "asy-schuif") {
        window.setTimeout(stuurPotje, 0);
      }
    }
    window.addEventListener("message", bijMelding);

    function werkBij() {
      var r = R.x();
      ctx.toon("r = " + ctx.getal(r, 2) + " cm, h = 300/(πr²) = " +
        ctx.getal(hoogte(r), 2) + " cm, kost k(r) = " + ctx.getal(k(r), 3) + " euro.");
      stuurPotje();
    }
    bord.on("update", werkBij);
    var l = laag(ctx, bord, "Toon minimum", function () { return minimum; });
    ctx.knop("Naar het minimum", function () { R.zetX(ROPT); });

    function herstel() { l.zet(false); R.zetX(BEGIN); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return {
      reset: herstel,
      vernietig: function () {
        blok.removeEventListener("input", vanRegelaar);
        window.removeEventListener("message", bijMelding);
      }
    };
  });

  /* --- 6. Omheining langs een muur --------------------------------------- */

  G.registreer("omheining", function (ctx) {
    function A(x) { return 60 * x - 2 * x * x; }
    var bord = ctx.maakBord({ begrenzing: [-2, 610, 33, -55] });
    ctx.stijl(bord.create("functiongraph", [A, 0, 30], opties({ strokeWidth: 2.5 })), "kromme");
    var X = asEnGrafiek(ctx, bord, A, { links: 0.5, rechts: 29.5, start: 5, naam: "x" });

    // De muur onderaan (dik), de omheining in drie stukken erboven.
    schets(ctx, bord, [17, 480, 32.6, 600], function () {
      var x = X.x(), y = 60 - 2 * x;
      return { breedte: 62, hoogte: 30,
        lijnen: [[[1 + (60 - y) / 2, 0], [1 + (60 - y) / 2, x],
                  [1 + (60 - y) / 2 + y, x], [1 + (60 - y) / 2 + y, 0]]] };
    }, "punt");
    schets(ctx, bord, [17, 480, 32.6, 600], function () {
      return { breedte: 62, hoogte: 30, lijnen: [[[0, 0], [62, 0]]] };
    }, "kromme", { strokeWidth: 5 });

    var maximum = [
      raakstuk(ctx, bord, 15, 450, 0, 4, "raaklijn", { visible: false }),
      label(ctx, bord, 15, 462, "max = 450", { anchorX: "middle", visible: false })
    ];

    function werkBij() {
      var x = X.x();
      ctx.toon("diepte x = " + ctx.getal(x, 2) + " m, breedte y = 60 − 2x = " +
        ctx.getal(60 - 2 * x, 2) + " m, oppervlakte A(x) = " + ctx.getal(A(x), 1) + " m².");
    }
    bord.on("update", werkBij);
    var l = laag(ctx, bord, "Toon maximum", function () { return maximum; });
    function herstel() { l.zet(false); X.zetX(5); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 7. Open doos uit een vierkant karton ------------------------------ */

  // De uitslag: het karton zonder de vier hoeken, met de plooilijnen in
  // stippellijn.
  function uitslag(L, B, x) {
    return [[x, 0], [L - x, 0], [L - x, x], [L, x], [L, B - x], [L - x, B - x],
      [L - x, B], [x, B], [x, B - x], [0, B - x], [0, x], [x, x], [x, 0]];
  }
  function plooien(L, B, x) {
    return [[[x, x], [L - x, x], [L - x, B - x], [x, B - x], [x, x]]];
  }

  function doosGrafiek(ctx, cfg) {
    var bord = ctx.maakBord({ begrenzing: cfg.venster });
    ctx.stijl(bord.create("functiongraph", [cfg.V, 0, cfg.max], opties({ strokeWidth: 2.5 })), "kromme");
    var X = asEnGrafiek(ctx, bord, cfg.V, { links: 0.2, rechts: cfg.max - 0.2,
      start: cfg.start, naam: cfg.naam });
    schets(ctx, bord, cfg.regio, function () {
      return { breedte: cfg.L, hoogte: cfg.B, lijnen: [uitslag(cfg.L, cfg.B, X.x())] };
    }, "punt");
    schets(ctx, bord, cfg.regio, function () {
      return { breedte: cfg.L, hoogte: cfg.B, lijnen: plooien(cfg.L, cfg.B, X.x()) };
    }, "hulp", { strokeWidth: 1.5, dash: 2 });

    var maximum = [
      raakstuk(ctx, bord, cfg.xopt, cfg.V(cfg.xopt), 0, cfg.max / 10, "raaklijn", { visible: false }),
      label(ctx, bord, cfg.xopt, cfg.V(cfg.xopt) * 1.03, cfg.maxtekst,
        { anchorX: "middle", visible: false })
    ];
    function werkBij() {
      var x = X.x();
      ctx.toon(cfg.naam + " = " + ctx.getal(x, 2) + " cm: lengte " +
        ctx.getal(cfg.L - 2 * x, 2) + " cm, breedte " + ctx.getal(cfg.B - 2 * x, 2) +
        " cm, hoogte " + ctx.getal(x, 2) + " cm, inhoud " + ctx.getal(cfg.V(x), 1) + " cm³.");
    }
    bord.on("update", werkBij);
    var l = laag(ctx, bord, "Toon maximum", function () { return maximum; });
    ctx.knop("Naar het maximum", function () { X.zetX(cfg.xopt); });
    function herstel() { l.zet(false); X.zetX(cfg.start); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  }

  G.registreer("open-doos", function (ctx) {
    return doosGrafiek(ctx, {
      V: function (x) { return (30 - 2 * x) * (30 - 2 * x) * x; },
      L: 30, B: 30, max: 15, start: 2, xopt: 5, naam: "x",
      maxtekst: "max = 2000",
      venster: [-1, 2400, 16, -180], regio: [10.6, 1050, 15.8, 2350]
    });
  });

  G.registreer("metalen-bakje", function (ctx) {
    return doosGrafiek(ctx, {
      V: function (h) { return (50 - 2 * h) * (30 - 2 * h) * h; },
      L: 50, B: 30, max: 15, start: 2, xopt: (40 - 5 * Math.sqrt(19)) / 3, naam: "h",
      maxtekst: "max ≈ 4104.41",
      venster: [-1, 4800, 16.5, -350], regio: [11.5, 2650, 16.2, 4350]
    });
  });

  /* --- 8. Hol en bol ----------------------------------------------------- */

  // f(x) = x³/9 − x + 2, zoals in de statische figuur. Het punt glijdt over
  // de grafiek; de tekstregel toont hoe de rico van de raaklijn verandert.
  // Hol en bol kleurt het bolle en het holle stuk elk anders, Grafiek van f′
  // toont dat f′ daalt waar f bol is, en Buigpunt zet de buigraaklijn.
  G.registreer("hol-bol", function (ctx) {
    function f(x) { return x * x * x / 9 - x + 2; }
    function df(x) { return x * x / 3 - 1; }
    function ddf(x) { return 2 * x / 3; }
    var bord = ctx.maakBord({ begrenzing: [-3.6, 4.1, 3.6, -1.5], raster: true });
    var kromme = ctx.stijl(bord.create("functiongraph", [f, -3, 3], opties({ strokeWidth: 2.5 })), "kromme");

    var bol = ctx.stijl(bord.create("functiongraph", [f, -3, 0], opties({
      strokeWidth: 5, strokeOpacity: 0.45, visible: false })), "secante");
    var hol = ctx.stijl(bord.create("functiongraph", [f, 0, 3], opties({
      strokeWidth: 5, strokeOpacity: 0.45, visible: false })), "afgeleide");
    var tekstBol = label(ctx, bord, -2.2, 3.5, "bol ∩", { visible: false });
    var tekstHol = label(ctx, bord, 0.4, 0.7, "hol ∪", { anchorY: "top", visible: false });

    var grafAfg = ctx.stijl(bord.create("functiongraph", [df, -3, 3], opties({
      strokeWidth: 2, dash: 2, visible: false, name: "f′", withLabel: true,
      label: { position: "rt", offset: [-14, -10] } })), "afgeleide");

    var T = ctx.stijl(bord.create("glider", [-2, f(-2), kromme], {
      name: "", size: 5, showInfobox: false, precision: SLEEP
    }), "punt");
    ctx.stijl(bord.create("tangent", [T], opties({ strokeWidth: 2 })), "raaklijn");

    var bp = [
      ctx.stijl(bord.create("point", [0, 2], opties({ name: "BP", size: 4, visible: false,
        label: { offset: [8, 10] } })), "punt"),
      raakstuk(ctx, bord, 0, 2, -1, 1.6, "secante", { visible: false, dash: 2 })
    ];

    function werkBij() {
      var x = T.X();
      var k = ddf(x);
      ctx.toon("x = " + ctx.getal(x, 2) + ", rico raaklijn f′(x) = " + ctx.getal(df(x), 2) +
        ", f″(x) = " + ctx.getal(k, 2) + ": " +
        (Math.abs(k) < 0.02 ? "buigpunt." : k < 0 ? "f′ daalt, f is bol." : "f′ stijgt, f is hol."));
    }
    bord.on("update", werkBij);

    var l1 = laag(ctx, bord, "Hol en bol", function () { return [bol, hol, tekstBol, tekstHol]; });
    var l2 = laag(ctx, bord, "Grafiek van f′", function () { return [grafAfg]; });
    var l3 = laag(ctx, bord, "Buigpunt", function () { return bp; });

    function herstel() { l1.zet(false); l2.zet(false); l3.zet(false); zet(T, -2, f(-2)); bord.update(); }
    ctx.knop("Beginstand", herstel);
    werkBij();
    return { reset: herstel };
  });

  /* --- 9. Volledig verloop: de grafiek in lagen opbouwen ------------------ */

  // Op het bord groeit de grafiek uit de gegevens: eerst de snijpunten, dan
  // de asymptoten, de extrema, de buigpunten en de punten uit de tabel, en
  // pas op het einde de kromme zelf. Elke knop zet één laag erbij of weg.
  function verloop(ctx, cfg) {
    var bord = ctx.maakBord({ begrenzing: cfg.venster });
    var lagen = [];

    function punten(lijst, rol) {
      return lijst.map(function (p) {
        return ctx.stijl(bord.create("point", [p[0], p[1]], opties({
          name: p[2] || "", size: 4, visible: false, showInfobox: false,
          label: { offset: p[3] || [6, 10] } })), rol || "punt");
      });
    }

    cfg.lagen.forEach(function (lg) {
      var objecten = lg.maak(bord, punten);
      lagen.push(laag(ctx, bord, lg.opschrift, function () { return objecten; }));
    });

    var grafiek = cfg.stukken.map(function (s) {
      return ctx.stijl(bord.create("functiongraph", [cfg.f, s[0], s[1]], opties({
        strokeWidth: 2.5, visible: false })), "kromme");
    });
    lagen.push(laag(ctx, bord, "Grafiek", function () { return grafiek; }));

    ctx.knop("Alles", function () { lagen.forEach(function (l) { l.zet(true); }); });
    function herstel() { lagen.forEach(function (l) { l.zet(false); }); }
    ctx.knop("Leeg bord", herstel);
    ctx.toon(cfg.uitleg);
    return { reset: herstel };
  }

  G.registreer("verloop-parabool", function (ctx) {
    return verloop(ctx, {
      venster: [-4.5, 4.2, 6.5, -1.8],
      f: function (x) { return x * x / 4 - x / 2 - 0.75; },
      stukken: [[-4.5, 6.5]],
      uitleg: "f(x) = ¼x² − ½x − ¾: snijpunten (−1, 0), (3, 0) en (0, −¾), minimum f(1) = −1, overal hol.",
      lagen: [
        { opschrift: "Snijpunten", maak: function (b, punten) {
          return punten([[-1, 0], [3, 0], [0, -0.75]]);
        } },
        { opschrift: "Minimum", maak: function (b, punten) {
          return punten([[1, -1, "min", [-10, -14]]]).concat([
            raakstuk(ctx, b, 1, -1, 0, 0.7, "raaklijn", { visible: false })]);
        } },
        { opschrift: "Tabel", maak: function (b, punten) {
          return punten([[-3, 3], [-2, 1.25], [2, -0.75], [4, 1.25], [5, 3]], "hulp");
        } }
      ]
    });
  });

  G.registreer("verloop-derdegraads", function (ctx) {
    function f(x) { return (x * x * x + 3 * x * x - 24 * x + 20) / 36; }
    var w = 2 * Math.sqrt(6);
    return verloop(ctx, {
      venster: [-8, 4.2, 6.8, -1.6],
      f: f,
      stukken: [[-8, 6.8]],
      uitleg: "f(x) = (x³ + 3x² − 24x + 20)/36: maximum 25/9 in x = −4, minimum −2/9 in x = 2, " +
        "buigpunt (−1, 23/18) met rico −¾.",
      lagen: [
        { opschrift: "Snijpunten", maak: function (b, punten) {
          return punten([[-2 - w, 0], [1, 0], [-2 + w, 0], [0, 5 / 9]]);
        } },
        { opschrift: "Extrema", maak: function (b, punten) {
          return punten([[-4, 25 / 9, "max"], [2, -2 / 9, "min", [-10, -14]]]).concat([
            raakstuk(ctx, b, -4, 25 / 9, 0, 0.9, "raaklijn", { visible: false }),
            raakstuk(ctx, b, 2, -2 / 9, 0, 0.9, "raaklijn", { visible: false })]);
        } },
        { opschrift: "Buigpunt", maak: function (b, punten) {
          return punten([[-1, 23 / 18, "BP"]], "secante").concat([
            raakstuk(ctx, b, -1, 23 / 18, -0.75, 1.4, "secante", { visible: false })]);
        } },
        { opschrift: "Tabel", maak: function (b, punten) {
          return punten([-7, -6, -5, -3, -2, 3, 4, 5, 6].map(function (x) {
            return [x, f(x)];
          }), "hulp");
        } }
      ]
    });
  });

  G.registreer("verloop-rationaal", function (ctx) {
    function f(x) { return 2 * x / (x * x - 1); }
    return verloop(ctx, {
      venster: [-5.5, 4.5, 5.5, -4.5],
      f: f,
      stukken: [[-5.5, -1.02], [-0.98, 0.98], [1.02, 5.5]],
      uitleg: "f(x) = 2x/(x² − 1): VA x = −1 en x = 1, HA y = 0, overal dalend, " +
        "buigpunt (0, 0) met buigraaklijn y = −2x.",
      lagen: [
        { opschrift: "Snijpunt", maak: function (b, punten) { return punten([[0, 0]]); } },
        { opschrift: "Asymptoten", maak: function (b) {
          return [-1, 1].map(function (x) {
            return ctx.stijl(b.create("line", [[x, 0], [x, 1]], opties({
              strokeWidth: 1.5, dash: 2, visible: false })), "secante");
          }).concat([ctx.stijl(b.create("line", [[0, 0], [1, 0]], opties({
            strokeWidth: 3, dash: 2, visible: false })), "secante")]);
        } },
        { opschrift: "Buigpunt", maak: function (b, punten) {
          return punten([[0, 0, "BP", [8, -16]]], "secante").concat([
            raakstuk(ctx, b, 0, 0, -2, 0.9, "secante", { visible: false })]);
        } },
        { opschrift: "Tabel", maak: function (b, punten) {
          return punten([-5, -4, -3, -2, -0.5, 0.5, 2, 3, 4, 5].map(function (x) {
            return [x, f(x)];
          }), "hulp");
        } }
      ]
    });
  });

  G.registreer("verloop-irrationaal", function (ctx) {
    function f(x) { return Math.cbrt(3 * x * x - x * x * x); }
    return verloop(ctx, {
      venster: [-4, 4.5, 6.5, -4.5],
      f: f,
      stukken: [[-4, 6.5]],
      uitleg: "f(x) = ∛(3x² − x³): SA y = −x + 1, minimum 0 in x = 0 (verticale raaklijn), " +
        "maximum ∛4 in x = 2, buigpunt (3, 0) met verticale raaklijn.",
      lagen: [
        { opschrift: "Snijpunten", maak: function (b, punten) { return punten([[0, 0], [3, 0]]); } },
        { opschrift: "Asymptoot", maak: function (b) {
          return [ctx.stijl(b.create("line", [[0, 1], [1, 0]], opties({
            strokeWidth: 1.5, dash: 2, visible: false, name: "SA", withLabel: true,
            label: { position: "llft", offset: [20, 0] } })), "secante")];
        } },
        { opschrift: "Extrema", maak: function (b, punten) {
          return punten([[0, 0, "min", [-28, -6]], [2, Math.cbrt(4), "max"]]).concat([
            raakstuk(ctx, b, 2, Math.cbrt(4), 0, 0.6, "raaklijn", { visible: false }),
            ctx.stijl(b.create("segment", [[0, -0.6], [0, 0.6]], opties({
              strokeWidth: 2.5, visible: false })), "raaklijn")]);
        } },
        { opschrift: "Buigpunt", maak: function (b, punten) {
          return punten([[3, 0, "BP", [8, 10]]], "secante").concat([
            ctx.stijl(b.create("segment", [[3, -0.8], [3, 0.8]], opties({
              strokeWidth: 2.5, visible: false })), "secante")]);
        } },
        { opschrift: "Tabel", maak: function (b, punten) {
          return punten([-2, -1, 1, 2.5, 4].map(function (x) { return [x, f(x)]; }), "hulp");
        } }
      ]
    });
  });
})();
