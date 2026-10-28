(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var JXG = window.JXG;
  var RAD = Math.PI / 180;
  // Verder dan dit reikt het bord niet; tan, sec en csc lopen bij een
  // rechte of gestrekte hoek onbegrensd op.
  var GRENS = 1.4;

  function cos(g) { return Math.cos(g * RAD); }
  function sin(g) { return Math.sin(g * RAD); }
  // Math.cos(90°) is geen 0 maar 6e-17: hier zelf afvangen.
  function nul(x) { return Math.abs(x) < 1e-9; }
  function tan(g) { return nul(cos(g)) ? NaN : sin(g) / cos(g); }
  function sec(g) { return nul(cos(g)) ? NaN : 1 / cos(g); }
  function csc(g) { return nul(sin(g)) ? NaN : 1 / sin(g); }

  function graden(P) {
    var g = Math.round(Math.atan2(P.Y(), P.X()) / RAD);
    return g < 0 ? g + 360 : g;
  }

  function g(x) { return String(G.getal(x, 3)).replace(/-/g, "−"); }

  function teken(x) {
    if (!isFinite(x)) return "bestaat niet";
    if (nul(x)) return "= 0";
    return x > 0 ? "> 0" : "< 0";
  }

  function kwadrant(a) {
    if (a % 90 === 0) return null;
    return ["I", "II", "III", "IV"][Math.floor(a / 90)];
  }

  /* --- Bouwstenen -------------------------------------------------------- */

  function plaats(bord, fx, fy) {
    return bord.create("point", [fx, fy], {
      visible: false, fixed: true, name: "", showInfobox: false
    });
  }

  function lijnstuk(ctx, bord, van, naar, rol, opties) {
    var keuze = { fixed: true, highlight: false, strokeWidth: 2.5 };
    Object.keys(opties || {}).forEach(function (sleutel) {
      keuze[sleutel] = opties[sleutel];
    });
    return ctx.stijl(bord.create("segment", [van, naar], keuze), rol);
  }

  function opschrift(ctx, bord, fx, fy, tekst, rol) {
    return ctx.stijl(bord.create("text", [fx, fy, tekst], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle",
      useMathJax: false
    }), rol || "tekst");
  }

  // De cirkel, het sleeppunt P (vast op hele graden), de straal, de boog
  // van α, de projecties en de stukken cos α en sin α op de assen.
  function cirkel(ctx, bord, begin) {
    var rond = ctx.stijl(bord.create("circle", [[0, 0], 1], {
      fixed: true, highlight: false, strokeWidth: 1.5
    }), "hulp");
    var P = ctx.stijl(bord.create("glider", [cos(begin), sin(begin), rond], {
      name: "P", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [-16, 12] }
    }), "punt");
    function a() { return graden(P); }
    P.on("drag", function () {
      P.setPosition(JXG.COORDS_BY_USER, [cos(a()), sin(a())]);
    });

    lijnstuk(ctx, bord, [0, 0], P, "kromme", { strokeWidth: 1.5 });
    ctx.stijl(bord.create("curve", [
      function (t) { return 0.25 * Math.cos(t); },
      function (t) { return 0.25 * Math.sin(t); },
      0, function () { return a() * RAD; }
    ], { fixed: true, highlight: false, strokeWidth: 1.5 }), "kromme");
    opschrift(ctx, bord,
      function () { return 0.4 * cos(a() / 2); },
      function () { return 0.4 * sin(a() / 2); }, "α", "kromme");

    var X = plaats(bord, function () { return cos(a()); }, 0);
    var Y = plaats(bord, 0, function () { return sin(a()); });
    lijnstuk(ctx, bord, P, X, "hulp", { strokeWidth: 1, dash: 2 });
    lijnstuk(ctx, bord, P, Y, "hulp", { strokeWidth: 1, dash: 2 });
    lijnstuk(ctx, bord, [0, 0], X, "secante", { strokeWidth: 4 });
    lijnstuk(ctx, bord, [0, 0], Y, "afgeleide", { strokeWidth: 4 });
    opschrift(ctx, bord,
      function () { return cos(a()) / 2; },
      function () { return sin(a()) >= 0 ? -0.13 : 0.13; }, "cos α", "secante");
    opschrift(ctx, bord,
      function () { return cos(a()) >= 0 ? 0.26 : -0.26; },
      function () { return sin(a()) / 2; }, "sin α", "afgeleide");

    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-14, -10] }
    }), "tekst");

    return {
      P: P,
      a: a,
      zet: function (hoek) {
        P.setPosition(JXG.COORDS_BY_USER, [cos(hoek), sin(hoek)]);
        bord.update();
      }
    };
  }

  // De nummers I tot IV van de kwadranten; dat van P licht op. De runtime
  // zet ze bij een themawissel terug op "zwak", daarna roept api.kleur dit
  // opnieuw aan.
  function kwadranten(ctx, bord, a) {
    var rollen = [];
    ["I", "II", "III", "IV"].forEach(function (naam, i) {
      var hoek = 45 + 90 * i;
      var tekst = opschrift(ctx, bord, 1.25 * cos(hoek), 1.25 * sin(hoek), naam, "zwak");
      rollen.push([tekst, naam]);
    });
    function kleur() {
      var kleuren = ctx.kleuren();
      rollen.forEach(function (paar) {
        paar[0].setAttribute({
          strokeColor: kwadrant(a()) === paar[1] ? kleuren.punt : kleuren.zwak
        });
      });
    }
    bord.on("update", kleur);
    kleur();
    return kleur;
  }

  /* --- tekens-5 ---------------------------------------------------------- */

  G.registreer("r1-tekens-5", function (ctx) {
    var BEGIN = 130;
    var bord = ctx.maakBord({
      begrenzing: [-1.9, 1.5, 1.9, -1.5], schaalstap: 1, gelijkeschaal: true
    });
    var c = cirkel(ctx, bord, BEGIN);
    var kleur = kwadranten(ctx, bord, c.a);

    function werkBij() {
      var a = c.a(), k = kwadrant(a);
      var tekst = "α = " + a + "°" + (k ? ", α ∈ " + k : ", op een as") +
        ". cos α = " + g(cos(a)) + " " + teken(cos(a)) +
        ", sin α = " + g(sin(a)) + " " + teken(sin(a)) + ".";
      if (k) {
        tekst += cos(a) * sin(a) > 0 ? " Hetzelfde teken." : " Tegengesteld teken.";
      }
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);
    ["I", "II", "III", "IV"].forEach(function (naam, i) {
      ctx.knop(naam, function () { c.zet(40 + 90 * i); });
    });
    werkBij();

    return {
      reset: function () { c.zet(BEGIN); kleur(); werkBij(); },
      kleur: kleur,
      vernietig: function () { JXG.JSXGraph.freeBoard(bord); }
    };
  });

  /* --- secans ------------------------------------------------------------ */

  // Een punt op de straal door P (of haar verlengde voorbij O) op afstand r,
  // ingekort tot het binnen het bord blijft.
  function opStraal(a, r, grens) {
    if (!isFinite(r)) r = grens * 4;
    var x = r * cos(a), y = r * sin(a);
    var f = Math.min(1, grens / Math.max(Math.abs(x), 1e-12), grens / Math.max(Math.abs(y), 1e-12));
    return [f * x, f * y];
  }

  // Elke knop is een hoek, of [opschrift, hoek].
  function secans(begin) {
    return function (ctx) {
      var BEGIN = begin;
      var bord = ctx.maakBord({
        begrenzing: [-2.4, 1.5, 2.4, -1.5], schaalstap: 1, gelijkeschaal: true
      });

      // De raaklijnen in E₁ en E₂, en de rechte OP door O heen.
      ctx.stijl(bord.create("line", [[1, 0], [1, 1]], {
        fixed: true, highlight: false, strokeWidth: 1, dash: 2
      }), "hulp");
      ctx.stijl(bord.create("line", [[0, 1], [1, 1]], {
        fixed: true, highlight: false, strokeWidth: 1, dash: 2
      }), "hulp");

      var c = cirkel(ctx, bord, BEGIN);
      var a = c.a;
      ctx.stijl(bord.create("line", [[0, 0], c.P], {
        fixed: true, highlight: false, strokeWidth: 1, dash: 1
      }), "zwak");

      // tan α op x = 1; T = (1, tan α) en C = (cot α, 1).
      var T = plaats(bord,
        function () { return opStraal(a(), sec(a()), GRENS)[0]; },
        function () { return opStraal(a(), sec(a()), GRENS)[1]; });
      var C = plaats(bord,
        function () { return opStraal(a(), csc(a()), 2.3)[0]; },
        function () { return opStraal(a(), csc(a()), 2.3)[1]; });
      lijnstuk(ctx, bord, [1, 0], T, "punt", { strokeWidth: 3 });
      lijnstuk(ctx, bord, [0, 0], T, "secante", { strokeWidth: 2, dash: 3 });
      lijnstuk(ctx, bord, [0, 0], C, "afgeleide", { strokeWidth: 2, dash: 3 });
      opschrift(ctx, bord, 1.32, function () { return T.Y() / 2; }, "tan α", "punt");
      opschrift(ctx, bord,
        function () { return T.X() / 2 + 0.16 * sin(a()); },
        function () { return T.Y() / 2 - 0.16 * cos(a()); }, "sec α", "secante");
      opschrift(ctx, bord,
        function () { return C.X() / 2 - 0.16 * sin(a()); },
        function () { return C.Y() / 2 + 0.16 * cos(a()); }, "csc α", "afgeleide");
      var puntT = ctx.stijl(bord.create("point", [function () { return T.X(); }, function () { return T.Y(); }], {
        name: "T", size: 3, fixed: true, showInfobox: false, label: { offset: [8, 0] }
      }), "secante");
      var puntC = ctx.stijl(bord.create("point", [function () { return C.X(); }, function () { return C.Y(); }], {
        name: "C", size: 3, fixed: true, showInfobox: false, label: { offset: [0, 12] }
      }), "afgeleide");
      // T en C enkel als ze bestaan en in beeld liggen.
      function toonTC() {
        var h = a();
        var tZichtbaar = isFinite(sec(h)) && Math.abs(tan(h)) <= GRENS;
        var cZichtbaar = isFinite(csc(h)) && Math.abs(cos(h) / sin(h)) <= 2.3;
        if (puntT.visProp.visible !== tZichtbaar) puntT.setAttribute({ visible: tZichtbaar });
        if (puntC.visProp.visible !== cZichtbaar) puntC.setAttribute({ visible: cZichtbaar });
      }
      bord.on("update", toonTC);
      toonTC();

      var kleur = kwadranten(ctx, bord, a);

      function werkBij() {
        var h = a(), k = kwadrant(h);
        ctx.toon("α = " + h + "°" + (k ? ", α ∈ " + k : ", op een as") +
          ". tan α = " + g(tan(h)) + " " + teken(tan(h)) +
          ", sec α = " + g(sec(h)) + " " + teken(sec(h)) +
          ", csc α = " + g(csc(h)) + " " + teken(csc(h)) + ".");
      }
      bord.on("update", werkBij);
      werkBij();

      return {
        reset: function () { c.zet(BEGIN); kleur(); werkBij(); },
        kleur: kleur,
        vernietig: function () { JXG.JSXGraph.freeBoard(bord); }
      };
    };
  }

  G.registreer("r1-secans-23-a", secans(140));
  G.registreer("r1-secans-23-b", secans(320));
}());
