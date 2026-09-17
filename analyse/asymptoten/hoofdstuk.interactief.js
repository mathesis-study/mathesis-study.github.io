/* Interactieve grafieken bij A15_Asymptoten.tex. */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  G.registreer("asymptoot-afstand", function (ctx) {
    var LINKS = 1.32;
    var RECHTS = 9.9;
    var BEGIN_X = 2;

    function f(x) { return 0.5 * x + 0.6 + 3 / (x - 0.5); }
    function a(x) { return 0.5 * x + 0.6; }

    var bord = ctx.maakBord({
      begrenzing: [-0.6, 6.4, 10.3, -0.7],
      asgetallen: false
    });

    var asymptoot = ctx.stijl(bord.create("line", [[0, a(0)], [2, a(2)]], {
      name: "a", withLabel: true, fixed: true, highlight: false,
      strokeWidth: 2, dash: 2,
      label: { position: "rt", offset: [-18, 12] }
    }), "raaklijn");

    var kromme = ctx.stijl(bord.create("functiongraph", [f, LINKS, RECHTS], {
      name: "f", withLabel: true, fixed: true, highlight: false,
      strokeWidth: 2.5,
      label: { position: "rt", offset: [-22, 12] }
    }), "kromme");

    var P = ctx.stijl(bord.create("glider", [BEGIN_X, f(BEGIN_X), kromme], {
      name: "P", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [8, 12] }
    }), "punt");

    var voet = bord.create("perpendicularpoint", [P, asymptoot], {
      name: "", visible: false, fixed: true
    });

    ctx.stijl(bord.create("segment", [P, voet], {
      fixed: true, highlight: false, strokeWidth: 2
    }), "hulp");

    ctx.stijl(bord.create("text", [
      function () { return (P.X() + voet.X()) / 2 + 0.12; },
      function () { return (P.Y() + voet.Y()) / 2; },
      "d(P,a)"
    ], {
      fixed: true, anchorX: "left", anchorY: "middle"
    }), "hulp");

    function afstand() {
      var dx = P.X() - voet.X();
      var dy = P.Y() - voet.Y();
      return Math.sqrt(dx * dx + dy * dy);
    }

    function werkBij() {
      ctx.toon("x = " + ctx.getal(P.X()) +
        ", f(x) = " + ctx.getal(P.Y()) +
        ", d(P,a) = " + ctx.getal(afstand(), 3) + ".");
    }

    bord.on("update", werkBij);

    function herstel() {
      P.setPosition(window.JXG.COORDS_BY_USER, [BEGIN_X, f(BEGIN_X)]);
      bord.update();
      werkBij();
    }

    werkBij();
    return { reset: herstel };
  });
  /* --- 2. Ligging ten opzichte van een horizontale asymptoot ------------- */

  // Bij het opsporen van horizontale asymptoten (voorbeeld 1) staat het
  // verschil v(x) = f(x) - b centraal: het teken zegt of de grafiek boven of
  // onder de HA ligt, |v(x)| hoe ver ze er nog van af ligt. De cursusfunctie
  // staat vooraan; de andere drie tonen dat het teken kan wisselen en dat een
  // grafiek haar eigen HA mag snijden, ook oneindig vaak.
  G.registreer("ha-ligging", function (ctx) {
    var FUNCTIES = [
      {
        naam: "(x² − 4x + 5)/(x − 2)²",
        vschrift: "v(x) = 1/(x − 2)²",
        f: function (x) { return 1 + 1 / ((x - 2) * (x - 2)); },
        b: 1,
        va: 2,
        venster: [-4.2, 4.2, 10.2, -1.2],
        sleep: [-4, 10],
        start: 3.2
      },
      {
        naam: "(2x + 1)/(x − 1)",
        vschrift: "v(x) = 3/(x − 1)",
        f: function (x) { return 2 + 3 / (x - 1); },
        b: 2,
        va: 1,
        venster: [-8.4, 7.4, 10.4, -3.4],
        sleep: [-8, 10],
        start: 4
      },
      {
        naam: "(x² + x + 1)/(x² + 1)",
        vschrift: "v(x) = x/(x² + 1)",
        f: function (x) { return 1 + x / (x * x + 1); },
        b: 1,
        venster: [-9.4, 2.3, 9.4, -0.5],
        sleep: [-9, 9],
        start: 1
      },
      {
        naam: "1 + sin(x)/x",
        vschrift: "v(x) = sin(x)/x",
        f: function (x) {
          return Math.abs(x) < 1e-9 ? 2 : 1 + Math.sin(x) / x;
        },
        b: 1,
        venster: [-22, 2.4, 22, -0.6],
        sleep: [-21, 21],
        start: 2
      }
    ];

    var DREMPEL = 0.02;   // hieronder noemen we v(x) nul: de grafiek snijdt

    var huidig = FUNCTIES[0];

    function f(x) {
      // Vlak bij een verticale asymptoot geen waarde teruggeven: JSXGraph
      // breekt de kromme dan netjes af in plaats van er een steile rechte
      // door te trekken.
      if (huidig.va !== undefined && Math.abs(x - huidig.va) < 1e-6) {
        return NaN;
      }
      return huidig.f(x);
    }

    function v(x) { return f(x) - huidig.b; }

    var bord = ctx.maakBord({
      begrenzing: huidig.venster,
      raster: true
    });

    // De horizontale asymptoot y = b, van rand tot rand van het venster.
    ctx.stijl(bord.create("segment",
      [[function () { return huidig.venster[0]; },
        function () { return huidig.b; }],
       [function () { return huidig.venster[2]; },
        function () { return huidig.b; }]],
      { strokeWidth: 2, dash: 2, fixed: true, highlight: false,
        name: "HA", withLabel: true,
        label: { position: "lft", offset: [18, 12] } }), "raaklijn");

    // De verticale asymptoot hoort niet bij dit onderzoek, maar zonder haar
    // is de sprong in het teken van v niet te begrijpen.
    ctx.stijl(bord.create("segment",
      [[function () { return huidig.va === undefined ? 0 : huidig.va; },
        function () { return huidig.venster[3]; }],
       [function () { return huidig.va === undefined ? 0 : huidig.va; },
        function () { return huidig.venster[1]; }]],
      { strokeWidth: 1.5, dash: 1, fixed: true, highlight: false,
        visible: function () { return huidig.va !== undefined; } }), "hulp");

    ctx.stijl(bord.create("functiongraph", [f], {
      strokeWidth: 2.5, fixed: true, highlight: false,
      name: "f", withLabel: true,
      label: { position: "rt", offset: [-14, -14] }
    }), "kromme");

    // De grafiek van v zelf: dezelfde verschillen, maar gemeten vanaf de
    // x-as. Aanvankelijk verborgen, zoals in de statische figuur eronder.
    var vkromme = ctx.stijl(bord.create("functiongraph", [v], {
      strokeWidth: 2, dash: 2, fixed: true, highlight: false, visible: false,
      name: "v", withLabel: true,
      label: { position: "rt", offset: [-14, 12] }
    }), "secante");

    // Een onzichtbaar lijnstuk op de x-as: daarover blijft x sleepbaar, ook
    // waar de grafiek zelf buiten beeld schiet.
    var spoor = bord.create("segment",
      [[function () { return huidig.sleep[0]; }, 0],
       [function () { return huidig.sleep[1]; }, 0]],
      { visible: false, fixed: true });

    var voet = ctx.stijl(bord.create("glider", [huidig.start, 0, spoor], {
      name: "x", size: 4, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { anchorX: "middle", offset: [0, -18] }
    }), "hulp");

    var P = ctx.stijl(bord.create("point",
      [function () { return voet.X(); }, function () { return f(voet.X()); }],
      { name: "P", size: 4, fixed: true, highlight: false,
        label: { offset: [10, 8] } }), "punt");

    // Het verschil v(x) als lijnstuk van de HA naar de grafiek: dat is waar
    // het in deze figuur om gaat.
    ctx.stijl(bord.create("segment",
      [[function () { return voet.X(); }, function () { return huidig.b; }],
       [function () { return voet.X(); }, function () { return f(voet.X()); }]],
      { strokeWidth: 3, fixed: true, highlight: false,
        visible: function () { return Math.abs(v(voet.X())) >= DREMPEL; }
      }), "secante");

    ctx.stijl(bord.create("text",
      [function () { return voet.X() + 0.15; },
       function () { return huidig.b + v(voet.X()) / 2; },
       "v(x)"],
      { fixed: true, anchorX: "left", anchorY: "middle",
        visible: function () { return Math.abs(v(voet.X())) >= DREMPEL; }
      }), "secante");

    // Hetzelfde verschil nog eens, maar vanaf de x-as: zo hoort het lijnstuk
    // bij de grafiek van v.
    ctx.stijl(bord.create("segment",
      [[function () { return voet.X(); }, 0],
       [function () { return voet.X(); }, function () { return v(voet.X()); }]],
      { strokeWidth: 2, dash: 2, fixed: true, highlight: false,
        visible: function () {
          return vkromme.visProp.visible === true &&
                 Math.abs(v(voet.X())) >= DREMPEL;
        } }), "secante");

    function ligging(waarde) {
      if (!isFinite(waarde)) return "P ligt niet op de grafiek";
      if (Math.abs(waarde) < DREMPEL) return "P ligt zo goed als op de HA";
      return waarde > 0 ? "P ligt boven de HA" : "P ligt onder de HA";
    }

    function werkBij() {
      var x = voet.X();
      var waarde = v(x);
      ctx.toon("x = " + ctx.getal(x) +
        ", f(x) = " + ctx.getal(f(x)) +
        ", b = " + ctx.getal(huidig.b) +
        ", v(x) = f(x) − b = " + ctx.getal(waarde, 3) +
        " (" + huidig.vschrift + "): " + ligging(waarde) + ".");
    }

    function zet(x) {
      voet.setPosition(window.JXG.COORDS_BY_USER, [x, 0]);
      bord.update();
    }

    bord.on("update", werkBij);

    /* Bediening onder de grafiek. */

    var knopV = ctx.knop("Grafiek van v tonen", function (knop) {
      var aan = vkromme.visProp.visible !== true;
      vkromme.setAttribute({ visible: aan });
      knop.setAttribute("aria-pressed", String(aan));
      knop.textContent = aan ? "Grafiek van v verbergen"
                             : "Grafiek van v tonen";
      bord.update();
    });
    knopV.setAttribute("aria-pressed", "false");

    var lopend = null;
    function stopLoop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }

    // x naar de rand laten lopen: het lijnstuk v(x) krimpt zichtbaar naar 0.
    function laatLopen(naarRechts) {
      stopLoop();
      var van = voet.X();
      var naar = naarRechts ? huidig.sleep[1] : huidig.sleep[0];
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / 2600);
        zet(van + (naar - van) * deel);
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    }

    ctx.knop("x → +∞", function () { laatLopen(true); });
    ctx.knop("x → −∞", function () { laatLopen(false); });

    var knoppen = FUNCTIES.map(function (keuze) {
      return ctx.knop("f(x) = " + keuze.naam, function () { kies(keuze); });
    });

    function kies(keuze) {
      huidig = keuze;
      stopLoop();
      bord.setBoundingBox(keuze.venster, false);
      zet(keuze.start);
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(FUNCTIES[i] === keuze));
      });
      werkBij();
    }

    function herstel() {
      vkromme.setAttribute({ visible: false });
      knopV.setAttribute("aria-pressed", "false");
      knopV.textContent = "Grafiek van v tonen";
      kies(FUNCTIES[0]);
    }

    kies(FUNCTIES[0]);

    return { reset: herstel, vernietig: stopLoop };
  });

}());
