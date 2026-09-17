/* Interactieve grafieken bij G02_Basisformules.tex.
 *
 * Alle figuren van dit hoofdstuk tonen dezelfde goniometrische cirkel, telkens
 * met een ander accent. Wat ze delen (de cirkel, een sleepbaar punt, een boog
 * bij een hoek, een projectie op een as) staat bovenaan als bouwsteen; daarna
 * volgt per figuur enkel nog wat haar eigen is.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var RAD = Math.PI / 180;
  // Verder dan dit reikt geen enkel bord; tan en cot lopen bij een hoek vlak
  // bij hun asymptoot onbegrensd op, en zonder grens tekent JSXGraph een
  // segment dat het hele beeld overspoelt.
  var GRENS = 2.4;

  /* --- Bouwstenen -------------------------------------------------------- */

  // De hoek van een punt op de cirkel, in graden, in [0, 360).
  function graden(P) {
    var g = Math.atan2(P.Y(), P.X()) / RAD;
    return g < 0 ? g + 360 : g;
  }

  function cos(g) { return Math.cos(g * RAD); }
  function sin(g) { return Math.sin(g * RAD); }

  // Bij een rechte hoek bestaat tan niet, bij een gestrekte hoek cot niet.
  // Math.tan geeft daar geen oneindig maar een zeer groot getal terug, dus
  // wordt het geval hier zelf afgevangen; ctx.getal maakt van NaN de tekst
  // "niet bepaald".
  function tan(g) { return Math.abs(cos(g)) < 1e-9 ? NaN : Math.tan(g * RAD); }
  function cot(g) { return Math.abs(sin(g)) < 1e-9 ? NaN : 1 / Math.tan(g * RAD); }

  function knip(waarde) {
    if (!isFinite(waarde)) return GRENS;
    return Math.max(-GRENS, Math.min(GRENS, waarde));
  }

  function cirkel(ctx, bord) {
    return ctx.stijl(bord.create("circle", [[0, 0], 1], {
      fixed: true, highlight: false, strokeWidth: 1.5
    }), "hulp");
  }

  // Het punt dat de leerling versleept. Het blijft op de cirkel liggen, zodat
  // de figuur nooit een punt buiten de eenheidscirkel toont.
  function sleeppunt(ctx, bord, rond, beginhoek, naam) {
    return ctx.stijl(bord.create("glider",
      [cos(beginhoek), sin(beginhoek), rond], {
        name: naam || "P", size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { offset: [10, 10] }
      }), "punt");
  }

  // Een hulppunt met berekende plaats: onzichtbaar, enkel om segmenten aan op
  // te hangen.
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
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle"
    }), rol || "tekst");
  }

  // De boog van het beginbeen tot de gegeven hoek. De hoek mag negatief zijn:
  // dan loopt de boog met de wijzers mee, en daarom staan tmin en tmax hier
  // als functies in plaats van als vaste 0 en hoek.
  function boog(ctx, bord, straal, hoekIn, rol) {
    return ctx.stijl(bord.create("curve", [
      function (t) { return straal * Math.cos(t); },
      function (t) { return straal * Math.sin(t); },
      function () { return Math.min(0, hoekIn() * RAD); },
      function () { return Math.max(0, hoekIn() * RAD); }
    ], { fixed: true, highlight: false, strokeWidth: 2 }), rol);
  }

  // Boog plus het opschrift ernaast, halverwege en net erbuiten.
  function hoekmerk(ctx, bord, straal, hoekIn, tekst, rol) {
    boog(ctx, bord, straal, hoekIn, rol);
    opschrift(ctx, bord,
      function () { return (straal + 0.22) * cos(hoekIn() / 2); },
      function () { return (straal + 0.22) * sin(hoekIn() / 2); },
      tekst, rol);
  }

  // De straal naar een punt op de cirkel, iets doorgetrokken zodat de richting
  // duidelijk blijft.
  function straal(ctx, bord, hoekIn, rol, lengte) {
    var L = lengte || 1.35;
    return lijnstuk(ctx, bord, [0, 0],
      plaats(bord,
        function () { return L * cos(hoekIn()); },
        function () { return L * sin(hoekIn()); }), rol);
  }

  // De stippellijnen van een punt naar beide assen: de projecties waaruit
  // cosinus en sinus af te lezen zijn.
  function projecties(ctx, bord, hoekIn) {
    var P = plaats(bord,
      function () { return cos(hoekIn()); },
      function () { return sin(hoekIn()); });
    lijnstuk(ctx, bord, P,
      plaats(bord, function () { return cos(hoekIn()); }, 0),
      "hulp", { strokeWidth: 1, dash: 2 });
    lijnstuk(ctx, bord, P,
      plaats(bord, 0, function () { return sin(hoekIn()); }),
      "hulp", { strokeWidth: 1, dash: 2 });
    return P;
  }

  // De cosinus als stuk op de x-as en de sinus als stuk op de y-as.
  function cosinusstuk(ctx, bord, hoekIn, tekst) {
    lijnstuk(ctx, bord, [0, 0],
      plaats(bord, function () { return cos(hoekIn()); }, 0), "secante");
    if (tekst !== false) {
      opschrift(ctx, bord,
        function () { return cos(hoekIn()) / 2; },
        function () { return sin(hoekIn()) >= 0 ? -0.17 : 0.17; },
        tekst || "cos α", "secante");
    }
  }

  function sinusstuk(ctx, bord, hoekIn, tekst) {
    lijnstuk(ctx, bord, [0, 0],
      plaats(bord, 0, function () { return sin(hoekIn()); }), "afgeleide");
    if (tekst !== false) {
      opschrift(ctx, bord,
        function () { return cos(hoekIn()) >= 0 ? -0.26 : 0.26; },
        function () { return sin(hoekIn()) / 2; },
        tekst || "sin α", "afgeleide");
    }
  }

  // De vier goniometrische getallen van een hoek, als één regel tekst.
  function getallen(ctx, naam, g) {
    return "cos " + naam + " = " + ctx.getal(cos(g), 3) +
      ", sin " + naam + " = " + ctx.getal(sin(g), 3) +
      ", tan " + naam + " = " + ctx.getal(tan(g), 3) +
      ", cot " + naam + " = " + ctx.getal(cot(g), 3);
  }

  /* --- Titelfiguur: de cirkel met alle verwante punten ------------------- */

  G.registreer("gonio-cirkel-overzicht", function (ctx) {
    var BEGIN = 65;

    var bord = ctx.maakBord({
      begrenzing: [-2.0, 1.8, 2.0, -1.8],
      gelijkeschaal: true
    });

    var rond = cirkel(ctx, bord);
    var P = sleeppunt(ctx, bord, rond, BEGIN, "Pα");
    function a() { return graden(P); }

    straal(ctx, bord, a, "punt", 1);
    opschrift(ctx, bord,
      function () { return 0.5 * cos(a()) - 0.12 * sin(a()); },
      function () { return 0.5 * sin(a()) + 0.12 * cos(a()); },
      "1", "punt");

    projecties(ctx, bord, a);
    cosinusstuk(ctx, bord, a);
    sinusstuk(ctx, bord, a);
    hoekmerk(ctx, bord, 0.3, a, "α", "punt");

    // De vier punten die in de rest van het hoofdstuk terugkomen. Ze bewegen
    // mee met P, zodat meteen zichtbaar is dat ze samen één figuur vormen.
    [[180, "P(180°−α)", -1, "secante"],
     [0, "P(−α)", -1, "secante"],
     [180, "P(180°+α)", 1, "secante"],
     [90, "P(90°−α)", -1, "afgeleide"]
    ].forEach(function (rij) {
      var basis = rij[0], teken = rij[2];
      function h() { return basis + teken * a(); }
      ctx.stijl(bord.create("point", [
        function () { return cos(h()); },
        function () { return sin(h()); }
      ], {
        name: rij[1], size: 3, fixed: true, showInfobox: false,
        label: { offset: [0, 14], anchorX: "middle" }
      }), rij[3]);
    });

    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-14, -10] }
    }), "tekst");

    function werkBij() {
      ctx.toon("α = " + ctx.getal(a(), 1) + "°. " + getallen(ctx, "α", a()) + ".");
    }

    bord.on("update", werkBij);
    werkBij();

    return {
      reset: function () {
        P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
        bord.update();
        werkBij();
      }
    };
  });

  /* --- De goniometrische cirkel als drager van een georiënteerde hoek --- */

  G.registreer("gonio-cirkel-definitie", function (ctx) {
    var BEGIN = 40;

    var bord = ctx.maakBord({
      begrenzing: [-1.7, 1.4, 1.7, -1.4],
      schaalstap: 1,
      gelijkeschaal: true
    });

    var rond = cirkel(ctx, bord);
    var P = sleeppunt(ctx, bord, rond, BEGIN, "P");
    function a() { return graden(P); }

    straal(ctx, bord, a, "kromme", 1);
    hoekmerk(ctx, bord, 0.3, a, "α", "kromme");

    ctx.stijl(bord.create("point", [1, 0], {
      name: "E₁", size: 2, fixed: true, showInfobox: false,
      label: { offset: [4, -14] }
    }), "tekst");
    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-14, -10] }
    }), "tekst");

    function werkBij() {
      ctx.toon("Bij P hoort de georiënteerde hoek α = " +
        ctx.getal(a(), 1) + "°.");
    }

    bord.on("update", werkBij);
    werkBij();

    return {
      reset: function () {
        P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
        bord.update();
        werkBij();
      }
    };
  });

  /* --- De goniometrische cirkel met cos, sin, tan en cot ----------------- */

  G.registreer("gonio-cirkel", function (ctx) {
    var BEGIN = 35;

    var bord = ctx.maakBord({
      begrenzing: [-2.7, 1.4, 2.7, -1.4],
      schaalstap: 1,
      gelijkeschaal: true
    });

    var rond = cirkel(ctx, bord);
    var P = sleeppunt(ctx, bord, rond, BEGIN, "P");
    function a() { return graden(P); }

    // De raaklijnen in E1 en E2: daarop worden tan en cot afgelezen.
    ctx.stijl(bord.create("line", [[1, 0], [1, 1]], {
      fixed: true, highlight: false, strokeWidth: 1, dash: 2
    }), "hulp");
    ctx.stijl(bord.create("line", [[0, 1], [1, 1]], {
      fixed: true, highlight: false, strokeWidth: 1, dash: 2
    }), "hulp");

    straal(ctx, bord, a, "kromme", 1);
    projecties(ctx, bord, a);
    cosinusstuk(ctx, bord, a);
    sinusstuk(ctx, bord, a);
    hoekmerk(ctx, bord, 0.3, a, "α", "kromme");

    // tan op de raaklijn x = 1, cot op de raaklijn y = 1.
    lijnstuk(ctx, bord, [1, 0],
      plaats(bord, 1, function () { return knip(tan(a())); }), "punt");
    opschrift(ctx, bord, 1.34,
      function () { return knip(tan(a())) / 2; }, "tan α", "punt");

    lijnstuk(ctx, bord, [0, 1],
      plaats(bord, function () { return knip(cot(a())); }, 1), "raaklijn");
    opschrift(ctx, bord,
      function () { return knip(cot(a())) / 2; }, 1.2, "cot α", "raaklijn");

    ctx.stijl(bord.create("point", [1, 0], {
      name: "E₁", size: 2, fixed: true, showInfobox: false,
      label: { offset: [4, -14] }
    }), "tekst");
    ctx.stijl(bord.create("point", [0, 1], {
      name: "E₂", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-18, 4] }
    }), "tekst");
    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-14, -10] }
    }), "tekst");

    function werkBij() {
      ctx.toon("α = " + ctx.getal(a(), 1) + "°, dus P = (" +
        ctx.getal(cos(a()), 3) + ", " + ctx.getal(sin(a()), 3) + "). " +
        "tan α = " + ctx.getal(tan(a()), 3) +
        ", cot α = " + ctx.getal(cot(a()), 3) + ".");
    }

    bord.on("update", werkBij);
    werkBij();

    return {
      reset: function () {
        P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
        bord.update();
        werkBij();
      }
    };
  });

  /* --- De bijzondere hoeken --------------------------------------------- */

  // Dezelfde kolommen als de tabel erboven, met de exacte waarden als tekst:
  // een decimale benadering zou juist datgene verbergen waar het hier om gaat.
  var BIJZONDER = [
    { hoek: 0,   naam: "0",       graden: "0°",   sin: "0", cos: "1",
      tan: "0", cot: "∉ ℝ" },
    { hoek: 30,  naam: "π/6", graden: "30°",  sin: "1/2", cos: "√3/2",
      tan: "√3/3", cot: "√3" },
    { hoek: 45,  naam: "π/4", graden: "45°",  sin: "√2/2", cos: "√2/2",
      tan: "1", cot: "1" },
    { hoek: 60,  naam: "π/3", graden: "60°",  sin: "√3/2", cos: "1/2",
      tan: "√3", cot: "√3/3" },
    { hoek: 90,  naam: "π/2", graden: "90°",  sin: "1", cos: "0",
      tan: "∉ ℝ", cot: "0" },
    { hoek: 180, naam: "π",   graden: "180°", sin: "0", cos: "−1",
      tan: "0", cot: "∉ ℝ" },
    { hoek: 270, naam: "3π/2", graden: "270°", sin: "−1", cos: "0",
      tan: "∉ ℝ", cot: "0" },
    { hoek: 360, naam: "2π",  graden: "360°", sin: "0", cos: "1",
      tan: "0", cot: "∉ ℝ" }
  ];

  G.registreer("bijzondere-hoeken", function (ctx) {
    var keuze = 2;

    var bord = ctx.maakBord({
      begrenzing: [-2.3, 2.0, 2.3, -2.0],
      gelijkeschaal: true
    });

    cirkel(ctx, bord);

    // Alle bijzondere hoeken blijven als spaak staan; enkel de gekozen hoek
    // krijgt kleur. Zo blijft het overzicht van de tabel bewaard.
    BIJZONDER.forEach(function (rij) {
      if (rij.hoek === 360) return;
      lijnstuk(ctx, bord, [0, 0], [cos(rij.hoek), sin(rij.hoek)],
        "hulp", { strokeWidth: 1 });
      ctx.stijl(bord.create("point", [cos(rij.hoek), sin(rij.hoek)], {
        name: "", size: 2, fixed: true, showInfobox: false
      }), "hulp");
    });

    // De coördinaten buiten de cirkel, zoals in de statische figuur. De
    // schuine punten krijgen hun plaats radiaal; de punten op een as staan
    // ernaast, want op de as zelf botsen ze met de getallen bij de streepjes.
    [[1.42 * cos(30), 1.42 * sin(30), "(√3/2, 1/2)"],
     [1.50 * cos(45), 1.50 * sin(45), "(√2/2, √2/2)"],
     [1.42 * cos(60), 1.42 * sin(60), "(1/2, √3/2)"],
     [1.36, 0.20, "(1, 0)"],
     [-0.52, 1.20, "(0, 1)"],
     [-1.36, 0.20, "(−1, 0)"],
     [0.52, -1.20, "(0, −1)"]
    ].forEach(function (rij) {
      opschrift(ctx, bord, rij[0], rij[1], rij[2], "zwak");
    });

    function h() { return BIJZONDER[keuze].hoek; }

    straal(ctx, bord, h, "punt", 1);
    hoekmerk(ctx, bord, 0.34, h, "α", "punt");
    ctx.stijl(bord.create("point", [
      function () { return cos(h()); },
      function () { return sin(h()); }
    ], { name: "P", size: 5, fixed: true, showInfobox: false,
         label: { offset: [10, 10] } }), "punt");

    projecties(ctx, bord, h);
    cosinusstuk(ctx, bord, h);
    sinusstuk(ctx, bord, h);

    var knoppen = BIJZONDER.map(function (rij, i) {
      return ctx.knop(rij.naam, function () { kies(i); });
    });

    function werkBij() {
      var rij = BIJZONDER[keuze];
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", i === keuze ? "true" : "false");
      });
      ctx.toon("α = " + rij.naam + " = " + rij.graden +
        ": sin α = " + rij.sin + ", cos α = " + rij.cos +
        ", tan α = " + rij.tan + ", cot α = " + rij.cot + ".");
    }

    function kies(i) {
      keuze = i;
      bord.update();
      werkBij();
    }

    werkBij();

    return { reset: function () { kies(2); } };
  });

  /* --- Gelijke hoeken: dezelfde straal, een omwenteling verder ----------- */

  G.registreer("gelijke-hoeken", function (ctx) {
    var BEGIN = 32;
    var k = 1;

    var bord = ctx.maakBord({
      begrenzing: [-2.1, 2.0, 2.1, -2.0],
      gelijkeschaal: true
    });

    var rond = cirkel(ctx, bord);
    var P = sleeppunt(ctx, bord, rond, BEGIN, "P");
    function a() { return graden(P); }
    function b() { return a() + k * 360; }

    // α en β liggen op dezelfde straal: dat is precies wat de figuur toont.
    straal(ctx, bord, a, "kromme", 1.3);
    hoekmerk(ctx, bord, 0.34, a, "α", "punt");

    // De weg van het beginbeen naar β, als spiraal: elke omwenteling ligt een
    // eindje verder naar buiten, anders vallen ze op elkaar.
    ctx.stijl(bord.create("curve", [
      function (t) {
        return (0.45 + 0.2 * Math.abs(t) / (2 * Math.PI)) * Math.cos(t);
      },
      function (t) {
        return (0.45 + 0.2 * Math.abs(t) / (2 * Math.PI)) * Math.sin(t);
      },
      function () { return Math.min(0, b() * RAD); },
      function () { return Math.max(0, b() * RAD); }
    ], { fixed: true, highlight: false, strokeWidth: 2 }), "secante");

    opschrift(ctx, bord, 0, -1.75, function () {
      return "β = α + " + k + "·360°";
    }, "secante");

    var minder = ctx.knop("k − 1", function () { zet(k - 1); });
    var meer = ctx.knop("k + 1", function () { zet(k + 1); });

    function werkBij() {
      minder.disabled = k <= -2;
      meer.disabled = k >= 2;
      ctx.toon("α = " + ctx.getal(a(), 1) + "° en β = α + " +
        k + "·360° = " + ctx.getal(b(), 1) +
        "° geven hetzelfde punt P, dus dezelfde getallen: " +
        getallen(ctx, "β", b()) + ".");
    }

    function zet(nieuw) {
      k = Math.max(-2, Math.min(2, nieuw));
      bord.update();
      werkBij();
    }

    bord.on("update", werkBij);
    werkBij();

    return {
      reset: function () {
        k = 1;
        P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
        bord.update();
        werkBij();
      }
    };
  });

  /* --- Periode π van tangens en cotangens -------------------------------- */

  G.registreer("periode-tangens", function (ctx) {
    var BEGIN = 32;

    var bord = ctx.maakBord({
      begrenzing: [-2.2, 2.2, 2.6, -2.2],
      gelijkeschaal: true
    });

    var rond = cirkel(ctx, bord);
    var P = sleeppunt(ctx, bord, rond, BEGIN, "P");
    function a() { return graden(P); }
    function b() { return a() + 180; }

    ctx.stijl(bord.create("line", [[1, 0], [1, 1]], {
      fixed: true, highlight: false, strokeWidth: 1, dash: 2
    }), "hulp");

    // Eén rechte door de oorsprong draagt beide hoeken; ze snijdt de raaklijn
    // x = 1 in één enkel punt, en dus is er ook maar één waarde voor tan.
    ctx.stijl(bord.create("line", [[0, 0], P], {
      fixed: true, highlight: false, strokeWidth: 2.5
    }), "kromme");

    hoekmerk(ctx, bord, 0.34, a, "α", "punt");
    hoekmerk(ctx, bord, 0.72, b, "α + π", "secante");

    ctx.stijl(bord.create("point", [
      function () { return cos(b()); },
      function () { return sin(b()); }
    ], { name: "P′", size: 4, fixed: true, showInfobox: false,
         label: { offset: [-24, -12] } }), "secante");

    var T = plaats(bord, 1, function () { return knip(tan(a())); });
    lijnstuk(ctx, bord, [1, 0], T, "afgeleide");
    ctx.stijl(bord.create("point", [1, function () { return knip(tan(a())); }], {
      name: "", size: 4, fixed: true, showInfobox: false
    }), "afgeleide");
    opschrift(ctx, bord, 1.9, function () { return knip(tan(a())); },
      "tan α", "afgeleide");

    function werkBij() {
      ctx.toon("α = " + ctx.getal(a(), 1) + "° en α + π = " +
        ctx.getal(b() % 360, 1) + "° liggen op dezelfde rechte: " +
        "tan α = " + ctx.getal(tan(a()), 3) +
        " = tan(α + π), en cot α = " + ctx.getal(cot(a()), 3) +
        " = cot(α + π).");
    }

    bord.on("update", werkBij);
    werkBij();

    return {
      reset: function () {
        P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
        bord.update();
        werkBij();
      }
    };
  });

  /* --- De vier soorten verwante hoeken ----------------------------------- */

  // Alle vier de figuren zijn dezelfde tekening met een andere β. Enkel het
  // verband en het opschrift verschillen, dus staat de tekening één keer hier.
  function verwanteHoek(naam, opties) {
    G.registreer(naam, function (ctx) {
      var BEGIN = opties.beginhoek;

      var bord = ctx.maakBord({
        begrenzing: [-2.1, 2.0, 2.1, -2.0],
        gelijkeschaal: true
      });

      var rond = cirkel(ctx, bord);
      var P = sleeppunt(ctx, bord, rond, BEGIN, "Pα");
      function a() { return graden(P); }
      function b() { return opties.beta(a()); }

      if (opties.bissectrice) {
        ctx.stijl(bord.create("line", [[0, 0], [1, 1]], {
          fixed: true, highlight: false, strokeWidth: 1, dash: 2
        }), "hulp");
      }

      straal(ctx, bord, a, "punt", 1.3);
      straal(ctx, bord, b, "secante", 1.3);

      hoekmerk(ctx, bord, 0.34, a, "α", "punt");
      hoekmerk(ctx, bord, opties.boogstraal || 0.72, b, "β", "secante");

      projecties(ctx, bord, a);
      projecties(ctx, bord, b);

      ctx.stijl(bord.create("point", [
        function () { return cos(b()); },
        function () { return sin(b()); }
      ], { name: "Pβ", size: 5, fixed: true, showInfobox: false,
           label: { offset: [10, 10] } }), "secante");

      function werkBij() {
        ctx.toon("α = " + ctx.getal(a(), 1) + "° en β = " +
          opties.verband + " = " + ctx.getal((b() % 360 + 360) % 360, 1) + "°. " +
          getallen(ctx, "α", a()) + ". " + getallen(ctx, "β", b()) + ".");
      }

      bord.on("update", werkBij);
      werkBij();

      return {
        reset: function () {
          P.setPosition(window.JXG.COORDS_BY_USER, [cos(BEGIN), sin(BEGIN)]);
          bord.update();
          werkBij();
        }
      };
    });
  }

  verwanteHoek("tegengestelde-hoeken", {
    beginhoek: 32,
    beta: function (g) { return -g; },
    verband: "−α"
  });

  verwanteHoek("complementaire-hoeken", {
    beginhoek: 15,
    beta: function (g) { return 90 - g; },
    verband: "π/2 − α",
    bissectrice: true,
    boogstraal: 0.62
  });

  verwanteHoek("supplementaire-hoeken", {
    beginhoek: 28,
    beta: function (g) { return 180 - g; },
    verband: "π − α",
    boogstraal: 0.62
  });

  verwanteHoek("antisupplementaire-hoeken", {
    beginhoek: 22,
    beta: function (g) { return g + 180; },
    verband: "α + π",
    boogstraal: 0.62
  });
}());
