/* Interactieve grafieken bij A16_Afgeleiden.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert de context: het bord, de kleuren per
 * rol, de getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 *
 * Dit bestand raakt de navigatie, de sneltoetsen en de rest van de site niet
 * aan; het beschrijft enkel wat er in deze figuren te zien is.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  /* --- 1. Van de rechte PQ naar het verloop van f ------------------------ */

  // Dezelfde kromme als in de statische figuur bij "Van rechte PQ naar het
  // verloop van f": geen voorschrift, enkel een vlot verloop met een top en
  // een dal. Op dit punt in de cursus is er nog niets over afgeleiden gezegd,
  // dus staat er geen raaklijn in en is er geen knop die Q naar P brengt. De
  // leerling schuift P en Q zelf, aan de grafiek of aan de x-as, en ziet wat
  // de rechte PQ over het verloop van f zegt. Komt Q zeer dicht bij P, dan
  // verdwijnt die rechte gewoon: de limiet komt pas later.
  G.registreer("verloop-pq", function (ctx) {
    // De punten waar de statische figuur haar vloeiende kromme door trekt.
    var XS = [0.3, 1, 2, 3, 3.6, 4.4, 5.2, 5.8];
    var YS = [0.6, 1.6, 2.6, 2.9, 2.6, 1.8, 1.5, 1.9];
    var TWEEDE = window.JXG.Math.Numerics.splineDef(XS, YS);
    var LINKS = XS[0];
    var RECHTS = XS[XS.length - 1];
    var BEGIN_A = 1;                            // de beginstand van P
    var BEGIN_X = 3;                            // de beginstand van Q
    var DREMPEL = 0.06;                        // hieronder vervalt de rechte

    function f(x) {
      return window.JXG.Math.Numerics.splineEval(x, XS, YS, TWEEDE);
    }

    // Geen getallen bij de assen: deze figuur gaat over het verloop, niet
    // over waarden. De actuele waarden staan wel in de tekstregel eronder.
    var bord = ctx.maakBord({
      begrenzing: [-1.5, 4.2, 6.6, -1.2],
      asgetallen: false
    });

    var kromme = ctx.stijl(bord.create("functiongraph", [f, LINKS, RECHTS], {
      strokeWidth: 2.5, fixed: true, highlight: false, name: "f", withLabel: true,
      label: { position: "rt", offset: [-6, -16] }
    }), "kromme");

    // Een onzichtbaar lijnstuk op de x-as. Zo blijven a en x sleepbaar over
    // net dat stuk van de as waar de grafiek getekend is.
    var spoor = bord.create("segment", [[LINKS, 0], [RECHTS, 0]], {
      visible: false, fixed: true
    });

    function maakPunt(x, naam, verschuiving) {
      return ctx.stijl(bord.create("glider", [x, f(x), kromme], {
        name: naam, size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { offset: verschuiving }
      }), "punt");
    }

    function maakVoet(x) {
      return ctx.stijl(bord.create("glider", [x, 0, spoor], {
        withLabel: false, size: 3, showInfobox: false,
        precision: { touch: 30, mouse: 6 }
      }), "hulp");
    }

    var P = maakPunt(BEGIN_A, "P", [10, -16]);
    var Q = maakPunt(BEGIN_X, "Q", [-20, 10]);
    var voetA = maakVoet(BEGIN_A);
    var voetX = maakVoet(BEGIN_X);

    function zet(punt, x, y) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
    }

    // Het punt op de grafiek en het punt op de as horen bij elkaar: wie het
    // ene versleept, verplaatst het andere mee.
    function koppel(punt, voet) {
      punt.on("drag", function () { zet(voet, punt.X(), 0); bord.update(); });
      voet.on("drag", function () {
        zet(punt, voet.X(), f(voet.X()));
        bord.update();
      });
    }
    koppel(P, voetA);
    koppel(Q, voetX);

    function verschil() { return Q.X() - P.X(); }
    function apart() { return Math.abs(verschil()) >= DREMPEL; }

    ctx.stijl(bord.create("line", [P, Q], {
      strokeWidth: 2, fixed: true, highlight: false, visible: apart
    }), "secante");

    // De projecties op de assen, zoals in de statische figuur.
    function projectie(punt, naaras) {
      ctx.stijl(bord.create("segment",
        [[function () { return punt.X(); }, function () { return punt.Y(); }],
         naaras === "x"
           ? [function () { return punt.X(); }, 0]
           : [0, function () { return punt.Y(); }]],
        { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "hulp");
    }
    projectie(P, "x");
    projectie(P, "y");
    projectie(Q, "x");
    projectie(Q, "y");

    // Liggen P en Q (bijna) op dezelfde hoogte of boven elkaar, dan zouden
    // hun labels op de assen elkaar overlappen. Elk label schuift dan zoveel
    // opzij als nodig, in pixels, zodat het niet van de bordgrootte afhangt.
    var RUIMTE_X = 16;                          // tussen a en x
    var RUIMTE_Y = 18;                          // tussen f(a) en f(x)

    function uiteen(eigen, ander, eerst, ruimte, eenheid) {
      var tekort = ruimte - Math.abs(eigen - ander) * eenheid;
      if (tekort <= 0) return eigen;
      var kant = eigen === ander ? (eerst ? -1 : 1) : (eigen < ander ? -1 : 1);
      return eigen + kant * tekort / 2 / eenheid;
    }

    function voetlabel(voet, ander, eerst, opschrift) {
      ctx.stijl(bord.create("text", [
        function () {
          return uiteen(voet.X(), ander.X(), eerst, RUIMTE_X, bord.unitX);
        },
        function () { return -18 / bord.unitY; },
        opschrift
      ], { anchorX: "middle", anchorY: "middle", fixed: true }), "hulp");
    }
    voetlabel(voetA, voetX, true, "a");
    voetlabel(voetX, voetA, false, "x");

    function hoogtelabel(punt, ander, eerst, opschrift) {
      ctx.stijl(bord.create("text", [
        -0.2,
        function () {
          return uiteen(punt.Y(), ander.Y(), eerst, RUIMTE_Y, bord.unitY);
        },
        opschrift
      ], { anchorX: "right", anchorY: "middle", fixed: true }), "hulp");
    }
    hoogtelabel(P, Q, true, "f(a)");
    hoogtelabel(Q, P, false, "f(x)");

    function werkBij() {
      var waarden = "a = " + ctx.getal(P.X()) +
        ", f(a) = " + ctx.getal(P.Y()) +
        "; x = " + ctx.getal(Q.X()) +
        ", f(x) = " + ctx.getal(Q.Y()) + ". ";
      if (!apart()) {
        ctx.toon(waarden +
          "Q ligt te dicht bij P; de rechte PQ wordt niet getekend.");
        return;
      }
      var rico = (Q.Y() - P.Y()) / verschil();
      ctx.toon(waarden + "De rechte PQ " +
        (Math.abs(rico) < 0.04 ? "loopt horizontaal"
          : rico > 0 ? "stijgt" : "daalt") + ".");
    }

    bord.on("update", werkBij);

    function herstel() {
      zet(P, BEGIN_A, f(BEGIN_A));
      zet(voetA, BEGIN_A, 0);
      zet(Q, BEGIN_X, f(BEGIN_X));
      zet(voetX, BEGIN_X, 0);
      bord.update();
      werkBij();
    }

    // Q valt samen met P: dan is er geen rechte PQ meer.
    function qOpP() {
      zet(Q, P.X(), P.Y());
      zet(voetX, P.X(), 0);
      bord.update();
      werkBij();
    }

    ctx.knop("Q op P", qOpP);
    ctx.knop("Beginstand", herstel);
    werkBij();

    return { reset: herstel };
  });

  /* --- 2. Van secante naar raaklijn -------------------------------------- */

  // Dezelfde functie en hetzelfde punt P als in de statische figuur bij
  // "Meetkundige betekenis": f(x) = 0.4x² met P(2, 1.6). P en Q schuiven over
  // de grafiek, of via hun x-waarden a en x over de x-as; hoe dichter Q bij P
  // komt, hoe beter de secante PQ samenvalt met de raaklijn t. Met Andere f
  // gebeurt hetzelfde bij een andere functie, zodat het niet aan de parabool
  // ligt.
  G.registreer("secante-raaklijn", function (ctx) {
    var BEGIN_A = 2;                            // de beginstand van P
    var START = 3.2;                            // de beginstand van Q
    var MINIMUMAFSTAND = 0.015;                 // Q valt nooit samen met P
    var LINKS = -1.2;                           // P en Q blijven binnen dit
    var RECHTS = 3.4;                           // stuk, zodat alles in beeld is

    // Elke functie blijft op [LINKS, RECHTS] binnen het bord.
    var FUNCTIES = [
      { voorschrift: "0.4x²",
        f: function (x) { return 0.4 * x * x; },
        afgeleide: function (x) { return 0.8 * x; } },
      { voorschrift: "x³/8 − x/2 + 1",
        f: function (x) { return x * x * x / 8 - x / 2 + 1; },
        afgeleide: function (x) { return 3 * x * x / 8 - 0.5; } },
      { voorschrift: "1.5 + 1.5 sin x",
        f: function (x) { return 1.5 + 1.5 * Math.sin(x); },
        afgeleide: function (x) { return 1.5 * Math.cos(x); } },
      { voorschrift: "0.15 eˣ",
        f: function (x) { return 0.15 * Math.exp(x); },
        afgeleide: function (x) { return 0.15 * Math.exp(x); } }
    ];
    var keuze = 0;

    function f(x) { return FUNCTIES[keuze].f(x); }
    function afgeleide(x) { return FUNCTIES[keuze].afgeleide(x); }

    var bord = ctx.maakBord({
      begrenzing: [-1.6, 5, 4.4, -1.5]
    });

    var kromme = ctx.stijl(bord.create("functiongraph", [f, -1.6, 4.4], {
      strokeWidth: 2.5, fixed: true, highlight: false, name: "f", withLabel: false
    }), "kromme");

    // Een onzichtbaar lijnstuk op de x-as, waarover a en x schuiven.
    var spoor = bord.create("segment", [[LINKS, 0], [RECHTS, 0]], {
      visible: false, fixed: true
    });

    // Een klein punt is op een aanraakscherm niet te raken; precision
    // vergroot enkel het sleepgebied, niet het bolletje zelf.
    var P = ctx.stijl(bord.create("glider", [BEGIN_A, f(BEGIN_A), kromme], {
      name: "P", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [-16, 12] }
    }), "punt");

    var Q = ctx.stijl(bord.create("glider", [START, f(START), kromme], {
      name: "Q", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [-20, 10] }
    }), "secante");

    function maakVoet(x, naam) {
      return ctx.stijl(bord.create("glider", [x, 0, spoor], {
        name: naam, size: 3, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { anchorX: "middle", offset: [0, -30] }
      }), "hulp");
    }
    var voetA = maakVoet(BEGIN_A, "a");
    var voetX = maakVoet(START, "x");

    ctx.stijl(bord.create("tangent", [P], {
      strokeWidth: 2, dash: 0, fixed: true, highlight: false,
      name: "t", withLabel: false
    }), "raaklijn");

    // Het label t staat niet aan de rand van het bord, waar het wegvalt of
    // onder de knoppen komt, maar op de raaklijn een stuk naast P, aan de
    // kant waar er plaats is, net onder de rechte.
    function labelX() { return P.X() + (P.X() < 2.5 ? 0.9 : -0.9); }
    ctx.stijl(bord.create("point", [
      labelX,
      function () { return P.Y() + afgeleide(P.X()) * (labelX() - P.X()); }
    ], {
      name: "t", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0,
      label: { offset: [8, -14] }
    }), "raaklijn");

    // Ook het label f staat boven de grafiek, op de plaats uit een vaste
    // lijst die het verst van P en Q ligt.
    var PLAATSEN_F = [-0.8, 0.9, 2.6];
    function labelFX() {
      var beste = PLAATSEN_F[0];
      var afstand = -1;
      PLAATSEN_F.forEach(function (x) {
        var d = Math.min(Math.abs(x - P.X()), Math.abs(x - Q.X()));
        if (d > afstand + 0.3) { beste = x; afstand = d; }
      });
      return beste;
    }
    ctx.stijl(bord.create("point", [labelFX, function () { return f(labelFX()); }], {
      name: "f", size: 0, fixed: true, highlight: false, showInfobox: false,
      strokeOpacity: 0, fillOpacity: 0,
      label: { anchorX: "middle", offset: [0, 18] }
    }), "kromme");

    ctx.stijl(bord.create("line", [P, Q], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "secante");

    // De verticale projecties van P en Q op a en x.
    function projectie(punt) {
      ctx.stijl(bord.create("segment",
        [[function () { return punt.X(); }, function () { return punt.Y(); }],
         [function () { return punt.X(); }, 0]],
        { strokeWidth: 1, dash: 2, fixed: true, highlight: false }), "zwak");
    }
    projectie(P);
    projectie(Q);

    // De hoek tussen P en Q, als twee zijden: horizontaal Delta x, verticaal
    // Delta f. Zo staat het differentiequotiënt letterlijk in de tekening.
    ctx.stijl(bord.create("segment",
      [[function () { return P.X(); }, function () { return P.Y(); }],
       [function () { return Q.X(); }, function () { return P.Y(); }]],
      { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("segment",
      [[function () { return Q.X(); }, function () { return P.Y(); }],
       [function () { return Q.X(); }, function () { return Q.Y(); }]],
      { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "hulp");

    ctx.stijl(bord.create("text",
      [function () { return (P.X() + Q.X()) / 2; },
       function () { return P.Y() + (Q.Y() >= P.Y() ? -0.3 : 0.3); },
       "Δx"],
      { anchorX: "middle", anchorY: "middle", fixed: true }), "hulp");
    ctx.stijl(bord.create("text",
      [function () { return Q.X() + (Q.X() >= P.X() ? 0.1 : -0.1); },
       function () { return (P.Y() + Q.Y()) / 2; },
       "Δf"],
      { anchorX: function () { return Q.X() >= P.X() ? "left" : "right"; },
        anchorY: "middle", fixed: true }), "hulp");

    function rico() {
      var dx = Q.X() - P.X();
      return Math.abs(dx) < 1e-9 ? afgeleide(P.X()) : (Q.Y() - P.Y()) / dx;
    }

    function werkBij() {
      var dx = Q.X() - P.X();
      var df = Q.Y() - P.Y();
      var samen = Math.abs(dx) < DICHTBIJ;
      ctx.toon(
        "f(x) = " + FUNCTIES[keuze].voorschrift + "; " +
        "a = " + ctx.getal(P.X()) + ", x = " + ctx.getal(Q.X()) +
        "; Δx = " + ctx.getal(dx) + ", Δf = " + ctx.getal(df) +
        ", rico van PQ = " + ctx.getal(rico(), 3) +
        "; rico van de raaklijn t = " + ctx.getal(afgeleide(P.X()), 3) +
        (samen ? ". Q ligt vrijwel op P: de secante valt samen met t."
               : "."));
    }

    // Rechtsonder, waar de grafiek niet komt, staat het differentiequotiënt
    // met de actuele getallen. Ligt Q vrijwel op P, dan gaat het over in de
    // limiet: het afgeleid getal f'(a). De formule bestaat uit drie delen:
    // links wat voor de breuk staat, in het midden de breuk
    // (f(x)-f(a))/(x-a) die in beide standen dezelfde is, rechts de
    // getallen. Links en rechts krijgen een vaste breedte, zodat de breuk bij
    // de overgang naar de limiet op haar plaats blijft. MathJax zet de
    // formule enkel opnieuw wanneer de afgeronde getallen veranderen; zonder
    // MathJax blijft er een tekstversie staan.
    var DICHTBIJ = 0.08;
    var LINKS_QUOTIENT = "\\left(\\frac{\\Delta f}{\\Delta x}\\right)_{\\!a} =";
    var LINKS_LIMIET = "f'(a) = \\lim_{x \\to a}";
    var MIDDEN = "\\frac{f(x)-f(a)}{x-a}";
    // Breder dan wat er rechts ooit komt te staan: x en a blijven in
    // [LINKS, RECHTS], dus f en de rico blijven voor elke functie tussen -2
    // en 5.
    var RECHTS_BREEDST = "= \\frac{8.88-8.88}{-8.88-(-8.88)} = -8.888";
    var vorigeTex = null;
    var vorigeHtml = "";
    var breedteLinks = null;
    var breedteRechts = null;

    function tussenhaakjes(getal) {
      return getal.charAt(0) === "-" ? "(" + getal + ")" : getal;
    }

    function formuleDelen() {
      if (Math.abs(Q.X() - P.X()) < DICHTBIJ) {
        return [LINKS_LIMIET, MIDDEN, "= " + ctx.getal(afgeleide(P.X()), 3)];
      }
      return [LINKS_QUOTIENT, MIDDEN,
        "= \\frac{" + ctx.getal(Q.Y()) + "-" + tussenhaakjes(ctx.getal(P.Y())) +
        "}{" + ctx.getal(Q.X()) + "-" + tussenhaakjes(ctx.getal(P.X())) + "}" +
        " = " + ctx.getal(rico(), 3)];
    }

    // Enkel de SVG: de omhullende mjx-container overleeft de omzetting van
    // JSXGraph niet.
    function svg(tex) {
      return window.MathJax.tex2svg("\\displaystyle " + tex, { display: false })
        .querySelector("svg");
    }

    // MathJax geeft de breedte van een SVG in ex.
    function breedte(tex) {
      return parseFloat(svg(tex).getAttribute("width")) || 0;
    }

    function formuleHtml() {
      var delen = formuleDelen();
      var tex = delen.join(" ");
      if (tex === vorigeTex) return vorigeHtml;
      vorigeTex = tex;
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        if (breedteLinks === null) {
          breedteLinks = Math.max(breedte(LINKS_QUOTIENT), breedte(LINKS_LIMIET));
          breedteRechts = breedte(RECHTS_BREEDST);
        }
        vorigeHtml =
          '<span style="display:inline-block;text-align:right;width:' +
            breedteLinks + 'ex">' + svg(delen[0]).outerHTML + "</span>" +
          '<span style="margin:0 0.3em">' + svg(delen[1]).outerHTML + "</span>" +
          '<span style="display:inline-block;text-align:left;width:' +
            breedteRechts + 'ex">' + svg(delen[2]).outerHTML + "</span>";
      } catch (e) {
        vorigeHtml = tex.replace(/\\left|\\right|\\!|\\frac|\\lim_|\\to|\\Delta /g,
          function (m) { return { "\\to": "→", "\\Delta ": "Δ", "\\lim_": "lim " }[m] || ""; })
          .replace(/[{}]/g, " ");
      }
      return vorigeHtml;
    }

    ctx.stijl(bord.create("text", [4.35, -1.45, formuleHtml], {
      anchorX: "right", anchorY: "bottom", fixed: true, highlight: false,
      display: "html", useMathJax: false, fontSize: 16
    }), "tekst");

    function begrens(x) { return Math.max(LINKS, Math.min(RECHTS, x)); }

    function zet(punt, voet, x) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, f(x)]);
      voet.setPosition(window.JXG.COORDS_BY_USER, [x, 0]);
    }

    // Q mag P niet raken: dan zou de secante verdwijnen en het
    // differentiequotiënt 0/0 worden. Wie P versleept, duwt Q opzij; wie Q
    // versleept, blijft net naast P staan.
    function houdAfstand(bewogen) {
      var a = P.X();
      var x = Q.X();
      if (Math.abs(x - a) >= MINIMUMAFSTAND) return;
      var kant = x < a ? -1 : 1;
      if (bewogen === P) {
        var nieuw = a - kant * MINIMUMAFSTAND;
        if (nieuw < LINKS || nieuw > RECHTS) {
          zet(P, voetA, x + kant * MINIMUMAFSTAND);
        } else {
          zet(Q, voetX, a + kant * MINIMUMAFSTAND);
        }
      } else {
        var doel = a + kant * MINIMUMAFSTAND;
        if (doel < LINKS || doel > RECHTS) doel = a - kant * MINIMUMAFSTAND;
        zet(Q, voetX, doel);
      }
    }

    // Het punt op de grafiek en zijn x-waarde op de as horen bij elkaar: wie
    // het ene versleept, verplaatst het andere mee.
    function koppel(punt, voet) {
      punt.on("drag", function () {
        zet(punt, voet, begrens(punt.X()));
        houdAfstand(punt);
        bord.update();
      });
      voet.on("drag", function () {
        zet(punt, voet, voet.X());
        houdAfstand(punt);
        bord.update();
      });
    }
    koppel(P, voetA);
    koppel(Q, voetX);

    bord.on("update", werkBij);

    function zetQ(x) {
      zet(Q, voetX, x);
      bord.update();
    }

    // Laat Q in een vloeiende beweging naar P toe gaan: de limietstand van de
    // secante wordt zo ook zichtbaar zonder zelf te slepen.
    var lopend = null;
    function stopLoop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }
    function naarP() {
      stopLoop();
      var begin = Q.X();
      var a = P.X();
      // Ligt Q al op P, dan begint de beweging opnieuw van op dezelfde
      // afstand als in de beginstand, aan dezelfde kant als het kan.
      if (Math.abs(begin - a) < DICHTBIJ) {
        var kant = begin < a ? -1 : 1;
        begin = a + kant * (START - BEGIN_A);
        if (begin < LINKS || begin > RECHTS) begin = a - kant * (START - BEGIN_A);
        zetQ(begin);
      }
      var doel = a + (begin < a ? -MINIMUMAFSTAND : MINIMUMAFSTAND);
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / 1600);
        // Traag uitlopen: net bij P is het interessant, dus daar mag het
        // langzaam gaan.
        var vloeiend = 1 - Math.pow(1 - deel, 3);
        zetQ(begin + (doel - begin) * vloeiend);
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    }

    ctx.knop("Q naar P laten gaan", naarP);
    // De volgende functie; P en Q houden hun x-waarde en komen op de nieuwe
    // grafiek te liggen.
    function andereF() {
      stopLoop();
      keuze = (keuze + 1) % FUNCTIES.length;
      zet(P, voetA, P.X());
      zetQ(Q.X());
    }

    ctx.knop("Andere f", andereF);
    ctx.knop("Beginstand", beginstand);

    // Beginstand zet enkel P en Q terug; de gekozen functie blijft.
    function beginstand() {
      stopLoop();
      zet(P, voetA, BEGIN_A);
      zetQ(START);
      werkBij();
    }

    // Reset brengt ook de parabool terug.
    function herstel() {
      keuze = 0;
      beginstand();
    }

    werkBij();

    return {
      reset: herstel,
      vernietig: stopLoop
    };
  });

  /* --- 3. Van raaklijnhelling naar de afgeleide functie ------------------- */

  // De cursus rekent f'(a) uit voor een willekeurige a en houdt daar het
  // voorschrift f'(x) = 2x + 2 aan over. Hier gebeurt hetzelfde meetkundig:
  // het punt (x, f'(x)) onder de raaklijn tekent de grafiek van f' terwijl je
  // sleept.
  G.registreer("afgeleide-functie", function (ctx) {
    var FUNCTIES = [
      {
        naam: "x² + 2x − 3",
        f: function (x) { return x * x + 2 * x - 3; },
        af: function (x) { return 2 * x + 2; },
        afschrift: "f′(x) = 2x + 2",
        venster: [-5.4, 7.4, 3.4, -7.4],
        // Waarover Doorlopen het punt laat gaan: het stuk waar zowel f als
        // f' binnen het venster blijven.
        loop: [-4.3, 2.3],
        start: 1
      },
      {
        naam: "⅓x³ − x",
        f: function (x) { return x * x * x / 3 - x; },
        af: function (x) { return x * x - 1; },
        afschrift: "f′(x) = x² − 1",
        venster: [-3.4, 4.4, 3.4, -4.4],
        loop: [-2.2, 2.2],
        start: 1.4
      },
      {
        naam: "−x² + 3",
        f: function (x) { return -x * x + 3; },
        af: function (x) { return -2 * x; },
        afschrift: "f′(x) = −2x",
        venster: [-3.6, 5.4, 3.6, -5.4],
        loop: [-2.6, 2.6],
        start: -1.2
      }
    ];

    var huidig = FUNCTIES[0];

    var bord = ctx.maakBord({
      begrenzing: huidig.venster,
      raster: true
    });

    var kromme = ctx.stijl(bord.create("functiongraph",
      [function (x) { return huidig.f(x); }],
      { strokeWidth: 2.5, fixed: true, highlight: false,
        name: "f", withLabel: true,
        label: { position: "rt", offset: [-14, -12] }
      }), "kromme");

    // De volledige grafiek van f', aanvankelijk verborgen: eerst mag de
    // leerling ze zelf zien ontstaan.
    var afgeleidekromme = ctx.stijl(bord.create("functiongraph",
      [function (x) { return huidig.af(x); }],
      { strokeWidth: 2, dash: 2, fixed: true, highlight: false, visible: false,
        name: "f'", withLabel: true,
        label: { position: "rt", offset: [-16, 10] }
      }), "afgeleide");

    var A = ctx.stijl(bord.create("glider", [huidig.start, 0, kromme], {
      name: "", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
          }), "punt");

    ctx.stijl(bord.create("tangent", [A], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "raaklijn");

    // Het gemeten getal, op dezelfde x-waarde uitgezet: zo ontstaat de
    // grafiek van f' punt voor punt onder die van f.
    var B = ctx.stijl(bord.create("point",
      [function () { return A.X(); }, function () { return huidig.af(A.X()); }],
      { name: "", size: 4, fixed: true, highlight: false, trace: true,
        traceAttributes: { size: 1.5 } }), "afgeleide");

    ctx.stijl(bord.create("segment",
      [[function () { return A.X(); }, function () { return A.Y(); }],
       [function () { return A.X(); }, function () { return huidig.af(A.X()); }]],
      { strokeWidth: 1, dash: 1, fixed: true, highlight: false }), "hulp");

    function werkBij() {
      var x = A.X();
      ctx.toon("x = " + ctx.getal(x) +
        ", f(x) = " + ctx.getal(huidig.f(x)) +
        ", rico van de raaklijn = f′(x) = " + ctx.getal(huidig.af(x)) +
        " (" + huidig.afschrift + ")");
    }

    function zetA(x) {
      A.setPosition(window.JXG.COORDS_BY_USER, [x, huidig.f(x)]);
      bord.update();
    }

    bord.on("update", werkBij);

    /* Bediening onder de grafiek. */

    var knopAfgeleide = ctx.knop("Grafiek van f′ tonen", function (knop) {
      var aan = afgeleidekromme.visProp.visible !== true;
      afgeleidekromme.setAttribute({ visible: aan });
      knop.setAttribute("aria-pressed", String(aan));
      knop.textContent = aan ? "Grafiek van f′ verbergen"
                             : "Grafiek van f′ tonen";
      bord.update();
    });
    knopAfgeleide.setAttribute("aria-pressed", "false");

    var lopend = null;
    function stopLoop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }

    // Eén doorloop van links naar rechts tekent de volledige grafiek van f'
    // met het spoor van B; dat is de kern van deze figuur.
    ctx.knop("Doorlopen", function () {
      stopLoop();
      bord.clearTraces();
      var links = huidig.loop[0];
      var rechts = huidig.loop[1];
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / 3200);
        zetA(links + (rechts - links) * deel);
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    });

    var knoppen = FUNCTIES.map(function (keuze) {
      return ctx.knop("f(x) = " + keuze.naam, function () {
        kies(keuze);
      });
    });

    function kies(keuze) {
      huidig = keuze;
      stopLoop();
      bord.clearTraces();
      bord.setBoundingBox(keuze.venster, false);
      zetA(keuze.start);
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(FUNCTIES[i] === keuze));
      });
      werkBij();
    }

    ctx.knop("Spoor wissen", function () { bord.clearTraces(); bord.update(); });

    function herstel() {
      afgeleidekromme.setAttribute({ visible: false });
      knopAfgeleide.setAttribute("aria-pressed", "false");
      knopAfgeleide.textContent = "Grafiek van f′ tonen";
      kies(FUNCTIES[0]);
    }

    kies(FUNCTIES[0]);

    return {
      reset: herstel,
      vernietig: stopLoop
    };
  });

  /* --- 4. De gemiddelde helling van de skihelling ------------------------ */

  // Dezelfde parabool als in de statische figuur bij "Inleidend voorbeeld:
  // skivakantie": h(x) = 0.1(18x − x²). Hier staat de cursus nog voor de
  // definitie van het afgeleid getal, dus komt er geen raaklijn in: enkel de
  // gemiddelde helling tussen twee plaatsen A en B, met Δx, Δh, het
  // percentage en de hoek erbij. De knoppen zetten de intervallen uit de
  // tabel; de laatste knop laat B naar A gaan en maakt zo zichtbaar waarom we
  // straks een limiet nemen.
  G.registreer("skihelling", function (ctx) {
    var LINKS = 0;
    var RECHTS = 18;
    var MINIMUMAFSTAND = 0.15;                  // B valt nooit samen met A
    var BEGIN = [0, 9];                         // het eerste interval uit de tekst

    // De vier intervallen van de tabel in de cursus, in dezelfde volgorde als
    // de rijen daar. [0,9] hoort bij de zin erboven en staat niet in de tabel.
    var TABELINTERVALLEN = [[0, 2], [2, 4], [4, 6], [6, 8]];
    var INTERVALLEN = [BEGIN].concat(TABELINTERVALLEN);
    var SPELING = 0.05;                         // wanneer telt een stand als "dat interval"

    function h(x) { return 0.1 * (18 * x - x * x); }

    var bord = ctx.maakBord({
      begrenzing: [-2.2, 10.2, 20.4, -1.8],
      raster: true
    });

    var kromme = ctx.stijl(bord.create("functiongraph", [h, LINKS, RECHTS], {
      strokeWidth: 2.5, fixed: true, highlight: false, name: "h", withLabel: true,
      label: { position: "rt", offset: [-10, -18] }
    }), "kromme");

    function maakPunt(x, naam, verschuiving) {
      return ctx.stijl(bord.create("glider", [x, h(x), kromme], {
        name: naam, size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { offset: verschuiving }
      }), "punt");
    }

    var A = maakPunt(BEGIN[0], "A", [-18, -10]);
    var B = maakPunt(BEGIN[1], "B", [8, 10]);

    ctx.stijl(bord.create("line", [A, B], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "secante");

    // De twee rechthoekszijden: horizontaal Δx, verticaal Δh. Zo staat het
    // quotiënt uit de tekst letterlijk in de tekening.
    ctx.stijl(bord.create("segment",
      [[function () { return A.X(); }, function () { return A.Y(); }],
       [function () { return B.X(); }, function () { return A.Y(); }]],
      { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("segment",
      [[function () { return B.X(); }, function () { return A.Y(); }],
       [function () { return B.X(); }, function () { return B.Y(); }]],
      { strokeWidth: 1.5, dash: 2, fixed: true, highlight: false }), "hulp");

    ctx.stijl(bord.create("text",
      [function () { return (A.X() + B.X()) / 2; },
       function () { return A.Y() - 0.65; },
       "Δx"],
      { anchorX: "middle", fixed: true }), "hulp");
    ctx.stijl(bord.create("text",
      [function () { return B.X() + 0.3; },
       function () { return (A.Y() + B.Y()) / 2; },
       "Δh"],
      { fixed: true }), "hulp");

    // De hoek in graden, minuten en seconden, zoals in de tabel van de cursus.
    function hoek(rico) {
      var graden = Math.atan(rico) * 180 / Math.PI;
      var teken = graden < 0 ? "−" : "";
      var rest = Math.abs(graden);
      var d = Math.floor(rest);
      var m = Math.floor((rest - d) * 60);
      var sec = Math.round((((rest - d) * 60) - m) * 60);
      if (sec === 60) { sec = 0; m += 1; }
      if (m === 60) { m = 0; d += 1; }
      return teken + d + "° " + m + "′ " + sec + "″";
    }

    function werkBij() {
      var dx = B.X() - A.X();
      var dh = B.Y() - A.Y();
      var rico = dh / dx;
      ctx.toon(
        "A(" + ctx.getal(A.X()) + ", " + ctx.getal(A.Y()) + "), " +
        "B(" + ctx.getal(B.X()) + ", " + ctx.getal(B.Y()) + "). " +
        "Δx = " + ctx.getal(dx) + ", Δh = " + ctx.getal(dh) +
        ", gemiddelde helling Δh/Δx = " + ctx.getal(rico, 3) +
        " = " + ctx.getal(rico * 100, 1) + "%" +
        ", α = " + hoek(rico) +
        (Math.abs(dx) < 0.5
          ? ". A en B liggen vlak bij elkaar: dit is zowat de helling in dat ene punt."
          : "."));
      markeer();
    }

    function zet(punt, x) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, h(x)]);
    }

    // A blijft links van B, en de twee raken elkaar nooit: anders wordt de
    // gemiddelde helling 0/0.
    function houdVolgorde(gesleept) {
      var a = A.X();
      var b = B.X();
      if (b - a >= MINIMUMAFSTAND) return;
      if (gesleept === A) zet(A, Math.min(b - MINIMUMAFSTAND, RECHTS));
      else zet(B, Math.max(a + MINIMUMAFSTAND, LINKS));
    }

    A.on("drag", function () { houdVolgorde(A); });
    B.on("drag", function () { houdVolgorde(B); });
    bord.on("update", werkBij);

    var lopend = null;
    function stopLoop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }

    function zetInterval(paar) {
      stopLoop();
      zet(A, paar[0]);
      zet(B, paar[1]);
      bord.update();
      werkBij();
    }

    var knoppen = INTERVALLEN.map(function (paar) {
      return ctx.knop("[" + ctx.getal(paar[0]) + ", " + ctx.getal(paar[1]) + "]",
        function () { zetInterval(paar); });
    });

    /* --- Samenspel met de tabel in de cursus ------------------------------
     *
     * De tabel eronder is gewone LaTeX en gaat als array naar MathJax. Die
     * zet er wel SVG van, maar bewaart de structuur: de tabel staat in de DOM
     * als een mtable met een mtr per rij. Daarop kunnen we dus een klik leggen
     * en de rij laten oplichten die bij de huidige stand van A en B hoort.
     *
     * Het contract is smal en controleerbaar: de eerste tabel na deze figuur
     * moet precies één kopregel plus TABELINTERVALLEN.length rijen tellen.
     * Klopt dat niet, dan blijft de tabel gewoon een tabel en veranderen enkel
     * de knoppen hierboven nog iets. De grafiek is dus nooit van de tabel
     * afhankelijk om te werken.
     */
    var SVGNS = "http://www.w3.org/2000/svg";
    var tabelrijen = null;

    function zoekTabel() {
      var slide = ctx.figuur.closest("section.slide") || document;
      var formules = Array.prototype.slice.call(
        slide.querySelectorAll("mjx-container"));
      for (var i = 0; i < formules.length; i++) {
        var formule = formules[i];
        if (!(ctx.figuur.compareDocumentPosition(formule) &
              window.Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        var mtable = formule.querySelector('[data-mml-node="mtable"]');
        if (!mtable) continue;
        // Enkel de eerstvolgende tabel telt: vinden we daar het verwachte
        // aantal rijen niet, dan is dit de tabel niet en laten we het erbij.
        var rijen = mtable.querySelectorAll('[data-mml-node="mtr"]');
        if (rijen.length !== TABELINTERVALLEN.length + 1) return null;
        return Array.prototype.slice.call(rijen, 1);   // de kopregel valt weg
      }
      return null;
    }

    function koppelTabel() {
      // Zet MathJax de formule ooit opnieuw, dan hangen onze rijen los van de
      // pagina en beginnen we gewoon opnieuw.
      if (tabelrijen && !tabelrijen[0].isConnected) tabelrijen = null;
      if (tabelrijen) return;
      var rijen = zoekTabel();
      if (!rijen) return;
      tabelrijen = rijen;
      rijen.forEach(function (rij, i) {
        // Een eigen rechthoek achter de rij: hij dient tegelijk als markering
        // en als klikvlak, want losse lettertekens zijn te smal om te raken.
        //
        // Hij komt in de rij zelf te staan, want getBBox() geeft de doos in de
        // maten van de rij, zonder haar eigen transform. Als eerste kind wordt
        // hij vóór de lettertekens getekend en staat hij er dus achter.
        // Toevoegen gebeurt pas in meetTabel(), zodra de maten er zijn: een
        // rechthoek van niets op (0,0) zou de meting zelf vertekenen.
        var markering = document.createElementNS(SVGNS, "rect");
        markering.setAttribute("fill", ctx.kleur("punt"));
        markering.setAttribute("fill-opacity", "0");
        markering.style.cursor = "pointer";
        rij.markering = markering;

        var uitleg = document.createElementNS(SVGNS, "title");
        uitleg.textContent = "Toon dit interval in de grafiek hierboven";
        rij.appendChild(uitleg);

        rij.style.cursor = "pointer";
        function kies() { zetInterval(TABELINTERVALLEN[i]); }
        rij.addEventListener("click", kies);
        markering.addEventListener("click", kies);
      });
      meetTabel();
    }

    // De maten kunnen we pas nemen wanneer MathJax klaar is en de slide echt
    // zichtbaar is; op een verborgen slide geeft getBBox() een lege doos.
    // Daarom meten we tot het lukt, en daarna niet meer.
    function meetTabel() {
      if (!tabelrijen) return;
      tabelrijen.forEach(function (rij) {
        if (rij.markering.parentNode) return;             // al opgemeten
        var vak = rij.getBBox();
        if (!vak.width || !vak.height) return;            // nog niet zichtbaar
        var marge = vak.height * 0.22;
        rij.markering.setAttribute("x", vak.x - marge);
        rij.markering.setAttribute("y", vak.y - marge);
        rij.markering.setAttribute("width", vak.width + 2 * marge);
        rij.markering.setAttribute("height", vak.height + 2 * marge);
        rij.markering.setAttribute("rx", marge);
        rij.insertBefore(rij.markering, rij.firstChild);
      });
    }

    // MathJax zet asynchroon; de tabel hoeft er nog niet te staan wanneer de
    // slide voor het eerst zichtbaar wordt.
    if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
      window.MathJax.startup.promise.then(koppelTabel, function () { /* niets */ });
    } else {
      koppelTabel();
    }

    // Welk interval staat er nu? -1 wanneer A en B er vrij tussenin staan.
    function welkInterval(lijst) {
      for (var i = 0; i < lijst.length; i++) {
        if (Math.abs(A.X() - lijst[i][0]) < SPELING &&
            Math.abs(B.X() - lijst[i][1]) < SPELING) return i;
      }
      return -1;
    }

    // De knoppen en de tabel wijzen altijd hetzelfde aan, of je nu op een knop
    // klikt, op een rij, of A en B gewoon versleept.
    function markeer() {
      var opKnop = welkInterval(INTERVALLEN);
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(i === opKnop));
      });
      if (!tabelrijen || !tabelrijen[0].isConnected) return;
      meetTabel();
      var opRij = welkInterval(TABELINTERVALLEN);
      tabelrijen.forEach(function (rij, i) {
        rij.markering.setAttribute("fill-opacity", i === opRij ? "0.18" : "0");
      });
    }

    // B naar A laten gaan: het interval krimpt en de gemiddelde helling gaat
    // naar de helling in A. Dat is precies de stap naar de limiet.
    ctx.knop("B naar A laten gaan", function () {
      stopLoop();
      var begin = B.X();
      var doel = Math.min(A.X() + MINIMUMAFSTAND, RECHTS);
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / 1800);
        // Traag uitlopen: net bij A gebeurt het interessante.
        zet(B, begin + (doel - begin) * (1 - Math.pow(1 - deel, 3)));
        bord.update();
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    });

    function herstel() { zetInterval(BEGIN); }

    ctx.knop("Beginstand", herstel);
    herstel();

    return {
      reset: herstel,
      vernietig: stopLoop,
      // Zodra de slide in beeld komt, is de tabel wél op te meten.
      herschaal: function () { koppelTabel(); markeer(); },
      kleur: function (kleuren) {
        if (!tabelrijen) return;
        tabelrijen.forEach(function (rij) {
          rij.markering.setAttribute("fill", kleuren.punt);
        });
      }
    };
  });

  /* --- 5. Continu maar niet afleidbaar ----------------------------------- */

  // De twee statische figuren bij "Afleidbaarheid en continuïteit" naast
  // elkaar in één interactieve figuur, want ze maken hetzelfde punt: continu
  // in 0, maar geen afgeleid getal. Bij het knikpunt f(x) = |x| blijven de
  // linker- en de rechterrico op −1 en +1 staan, hoe dicht je ook nadert; bij
  // de verticale raaklijn groeien ze allebei onbegrensd.
  G.registreer("niet-afleidbaar", function (ctx) {
    var RAND = 1.6;                             // tot waar de kromme loopt
    var MINIMUM = 0.02;                         // de punten bereiken 0 nooit
    var START = 1.35;                           // enkel de eerste plaatsing

    // L begint verder van 0 dan R. Bij $f(x) = \sqrt[3]{x}$ zouden twee even
    // ver gelegen punten precies op één rechte door O liggen: de twee
    // lijnstukken lezen dan als één koorde en je ziet niet dat het om twee
    // afzonderlijke differentiequotiënten gaat.
    var AFSTAND_L = [1.25, 1.45];
    var AFSTAND_R = [0.85, 1.05];

    var GEVALLEN = [
      {
        naam: "knikpunt: f(x) = |x|",
        f: function (x) { return Math.abs(x); },
        venster: [-2.3, 2.1, 2.3, -0.9],
        // De linkertak loopt hier naar linksboven, dus staat f erboven.
        naamplaats: [2, 20],
        // Wat de leerling in de tekstregel moet zien besluiten.
        besluit: function () {
          return "De linkerlimiet is −1 en de rechterlimiet is +1: ze " +
            "verschillen, dus bestaat f′(0) niet.";
        }
      },
      {
        naam: "verticale raaklijn: f(x) = ∛x",
        f: function (x) {
          return (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 1 / 3);
        },
        venster: [-2.3, 1.7, 2.3, -1.7],
        // Hier loopt de linkertak naar linksonder: f komt eronder.
        naamplaats: [14, -6],
        besluit: function (links, rechts) {
          return "Hoe dichter bij 0, hoe groter beide quotiënten: ze groeien " +
            "onbegrensd (nu " + ctx.getal(links, 1) + " en " +
            ctx.getal(rechts, 1) + "). Er is geen reëel afgeleid getal, de " +
            "raaklijn staat verticaal.";
        }
      }
    ];

    var huidig = GEVALLEN[0];

    function f(x) { return huidig.f(x); }

    var bord = ctx.maakBord({
      begrenzing: huidig.venster,
      raster: true,
      asgetallen: false
    });

    // Twee takken, want in 0 zit juist het probleem: één functiongraph zou de
    // knik en de verticale raaklijn gladstrijken, en een punt zou er dwars
    // doorheen kunnen glijden.
    function tak(van, tot, opties) {
      return ctx.stijl(bord.create("functiongraph", [f, van, tot],
        Object.assign({ strokeWidth: 2.5, fixed: true, highlight: false },
          opties || {})), "kromme");
    }
    // Het opschrift hangt aan de linkertak: rechts staat het punt R in de weg.
    var linkertak = tak(-RAND, 0, {
      name: "f", withLabel: true,
      label: { position: "lft", offset: huidig.naamplaats }
    });
    var rechtertak = tak(0, RAND);

    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-16, -14] }
    }), "punt");

    function maakPunt(x, kromme, naam, verschuiving) {
      return ctx.stijl(bord.create("glider", [x, f(x), kromme], {
        name: naam, size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { offset: verschuiving }
      }), "punt");
    }

    var L = maakPunt(-START, linkertak, "L", [-20, 10]);
    var R = maakPunt(START, rechtertak, "R", [10, 10]);

    // Het lijnstuk van O naar het punt: zijn rico is precies het
    // differentiequotiënt (f(x) − f(0))/(x − 0). Allebei dus een secante en
    // geen raaklijn; links en rechts staan uit elkaar met de lijnstijl, niet
    // met de kleur, want de tekstregel verwijst daar ook naar.
    //
    // Bewust een lijnstuk en geen volledige rechte: bij f(x) = |x| valt zo'n
    // koorde samen met de tak zelf, en een doorlopende rechte zou de knik
    // uitwissen door de V ook in het onderste halfvlak door te trekken.
    ctx.stijl(bord.create("segment", [[0, 0], L], {
      strokeWidth: 3, dash: 2, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("segment", [[0, 0], R], {
      strokeWidth: 3, fixed: true, highlight: false
    }), "secante");

    function rico(punt) {
      var x = punt.X();
      return Math.abs(x) < 1e-9 ? 0 : f(x) / x;
    }

    function werkBij() {
      var links = rico(L);
      var rechts = rico(R);
      ctx.toon(
        "Links: x = " + ctx.getal(L.X(), 3) +
        ", (f(x) − f(0))/(x − 0) = " + ctx.getal(links, 2) +
        " (streepjeslijn). Rechts: x = " + ctx.getal(R.X(), 3) +
        ", quotiënt = " + ctx.getal(rechts, 2) + " (volle lijn). " +
        huidig.besluit(links, rechts));
    }

    function zet(punt, x) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, f(x)]);
    }

    // Elke beginstand ligt net wat anders dan de vorige, zodat het beeld niet
    // als één vaste tekening blijft hangen.
    var vorigeL = null;
    var vorigeR = null;
    function kiesAfstand(grenzen, vorige) {
      var x;
      do {
        x = grenzen[0] + (grenzen[1] - grenzen[0]) * Math.random();
      } while (vorige !== null && Math.abs(x - vorige) < 0.06);
      return x;
    }

    function zetBegin() {
      vorigeL = kiesAfstand(AFSTAND_L, vorigeL);
      vorigeR = kiesAfstand(AFSTAND_R, vorigeR);
      zet(L, -vorigeL);
      zet(R, vorigeR);
    }

    // L blijft links van 0, R rechts, en geen van beide bereikt 0 zelf.
    function begrens(punt, teken) {
      var x = punt.X();
      var beperkt = Math.min(RAND, Math.max(MINIMUM, Math.abs(x)));
      zet(punt, teken * beperkt);
    }

    L.on("drag", function () { begrens(L, -1); });
    R.on("drag", function () { begrens(R, 1); });
    bord.on("update", werkBij);

    var lopend = null;
    function stopLoop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }

    ctx.knop("Naar 0 laten gaan", function () {
      stopLoop();
      // Staan de punten al tegen 0, dan zou er niets meer bewegen: zet ze
      // eerst terug, zodat een tweede klik de beweging herbegint.
      if (Math.abs(L.X()) < 10 * MINIMUM && Math.abs(R.X()) < 10 * MINIMUM) {
        zetBegin();
        bord.update();
      }
      // L en R hebben een eigen afstand, maar leggen die in dezelfde tijd af:
      // ze komen samen in 0 aan.
      var beginL = Math.abs(L.X());
      var beginR = Math.abs(R.X());
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var deel = Math.min(1, (tijd - start) / 2400);
        var vloeiend = 1 - Math.pow(1 - deel, 3);
        zet(L, -(beginL + (MINIMUM - beginL) * vloeiend));
        zet(R, beginR + (MINIMUM - beginR) * vloeiend);
        bord.update();
        if (deel < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    });

    var knoppen = GEVALLEN.map(function (geval) {
      return ctx.knop(geval.naam, function () { kies(geval); });
    });

    function kies(geval) {
      huidig = geval;
      stopLoop();
      bord.setBoundingBox(geval.venster, false);
      if (linkertak.label) linkertak.label.setAttribute({ offset: geval.naamplaats });
      zetBegin();
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(GEVALLEN[i] === geval));
      });
      bord.update();
      werkBij();
    }

    // Beginstand zet enkel L en R terug; het gekozen geval blijft.
    function beginstand() {
      stopLoop();
      zetBegin();
      bord.update();
      werkBij();
    }

    // Reset brengt ook het knikpunt terug.
    function herstel() { kies(GEVALLEN[0]); }

    ctx.knop("Beginstand", beginstand);
    herstel();

    return { reset: herstel, vernietig: stopLoop };
  });

  /* --- 6. Schetsoefeningen: teken zelf de grafiek van f' ----------------- */

  // De vier oefeningen bij "De afgeleide functie" zijn op papier telkens een
  // gegeven grafiek van f met een leeg rooster ernaast. Op de website tekent
  // de leerling in dat rooster, met de vinger, de muis of het toetsenbord, en
  // zegt Controleer wat er aan de schets klopt en wat niet.
  //
  // De beoordeling is met opzet een algoritme en geen taalmodel: de site moet
  // statisch en offline blijven werken, en een leerling heeft meer aan een
  // uitspraak over het teken, de nulpunten en de ligging dan aan een cijfer.
  // Exact tekenen lukt met een vinger toch niet, dus alles wordt vergeleken
  // in eenheden van de hoogte van het venster, met ruime marges.
  //
  // Zolang enkel dit hoofdstuk schetsoefeningen heeft, hoort deze machinerie
  // hier en niet in de algemene runtime.
  var Schets = (function () {
    var N = 121;                 // roosterkolommen over het tekendomein
    var GLAD = 2;                // halve breedte van het gladstrijkvenster
    var PUNTEN = 5;              // sleepbare punten in de puntenstand

    var num = window.JXG.Math.Numerics;

    function maakRooster(a, b) {
      var xs = [];
      for (var i = 0; i < N; i++) xs.push(a + (b - a) * i / (N - 1));
      return xs;
    }

    // Een voortschrijdend gemiddelde haalt de bibber van een vinger weg
    // zonder de vorm te veranderen.
    function glad(waarden) {
      var uit = [];
      for (var i = 0; i < waarden.length; i++) {
        var som = 0, aantal = 0;
        for (var k = -GLAD; k <= GLAD; k++) {
          var j = i + k;
          if (j >= 0 && j < waarden.length && !isNaN(waarden[j])) {
            som += waarden[j];
            aantal++;
          }
        }
        uit.push(aantal ? som / aantal : NaN);
      }
      return uit;
    }

    function tekenVan(waarde, dood) {
      if (waarde > dood) return 1;
      if (waarde < -dood) return -1;
      return 0;
    }

    // De x-waarden waar een rij van teken wisselt, lineair geschat.
    function nulpunten(xs, ys) {
      var lijst = [];
      for (var i = 1; i < ys.length; i++) {
        if (isNaN(ys[i - 1]) || isNaN(ys[i])) continue;
        if (ys[i - 1] === 0) continue;
        if ((ys[i - 1] < 0) !== (ys[i] < 0)) {
          var deel = ys[i - 1] / (ys[i - 1] - ys[i]);
          lijst.push(xs[i - 1] + deel * (xs[i] - xs[i - 1]));
        }
      }
      return lijst;
    }

    function spreiding(ys, van, tot) {
      var som = 0, somkw = 0, aantal = 0;
      for (var i = van; i <= tot; i++) {
        if (isNaN(ys[i])) continue;
        som += ys[i];
        somkw += ys[i] * ys[i];
        aantal++;
      }
      if (!aantal) return 0;
      var gem = som / aantal;
      return Math.sqrt(Math.max(0, somkw / aantal - gem * gem));
    }

    function maak(ctx, opgave) {
      var a = opgave.domein[0];
      var b = opgave.domein[1];
      var venster = opgave.venster;                 // [links, boven, rechts, onder]
      var hoogte = venster[1] - venster[3];
      var xs = maakRooster(a, b);
      var juist = xs.map(opgave.fAccent);
      var waarden = xs.map(function () { return NaN; });
      var geschiedenis = [];
      var stand = "teken";

      var bord = ctx.maakBord({ begrenzing: venster, raster: true });

      ctx.stijl(bord.create("functiongraph", [opgave.f, a, b], {
        strokeWidth: 2.5, fixed: true, highlight: false,
        name: "f", withLabel: true, label: { position: "rt", offset: [-8, -14] }
      }), "kromme");

      var schets = ctx.stijl(bord.create("curve", [[], []], {
        strokeWidth: 3, fixed: true, highlight: false
      }), "punt");

      var oplossing = ctx.stijl(bord.create("functiongraph", [opgave.fAccent, a, b], {
        strokeWidth: 2.5, dash: 2, fixed: true, highlight: false, visible: false,
        name: "f'", withLabel: true, label: { position: "rt", offset: [-8, -14] }
      }), "afgeleide");

      /* --- de puntenstand: sleepbaar en met de pijltjestoetsen te zetten -- */

      var punten = [];
      for (var k = 0; k < PUNTEN; k++) {
        var px = a + (b - a) * k / (PUNTEN - 1);
        var spoor = bord.create("segment",
          [[px, venster[3] + 0.2], [px, venster[1] - 0.2]],
          { visible: false, fixed: true });
        punten.push(ctx.stijl(bord.create("glider", [px, 0, spoor], {
          withLabel: false, size: 4, showInfobox: false, visible: false,
          precision: { touch: 30, mouse: 6 }
        }), "punt"));
      }

      function puntenY(x) {
        var px = punten.map(function (p) { return p.X(); });
        var py = punten.map(function (p) { return p.Y(); });
        return num.splineEval(x, px, py, num.splineDef(px, py));
      }

      var spline = ctx.stijl(bord.create("curve",
        [function (t) { return t; }, function (t) { return puntenY(t); }, a, b],
        { strokeWidth: 3, fixed: true, highlight: false, visible: false }), "punt");

      /* --- tekenen met vinger of muis ------------------------------------ */

      function kolomVan(x) {
        return Math.round((x - a) / (b - a) * (N - 1));
      }

      function zet(i, y) {
        if (i < 0 || i >= N) return;
        waarden[i] = Math.min(venster[1], Math.max(venster[3], y));
      }

      // Tussen twee opeenvolgende posities van de vinger ligt vaak een hele
      // reeks kolommen; die worden lineair opgevuld. De laatste haal telt,
      // zodat terugkrabbelen de vorige poging overschrijft.
      var vorige = null;
      function trek(x, y) {
        var i = kolomVan(x);
        if (vorige === null) {
          zet(i, y);
        } else {
          var i0 = vorige.i, y0 = vorige.y;
          var stap = i >= i0 ? 1 : -1;
          for (var j = i0; j !== i + stap; j += stap) {
            var deel = i === i0 ? 1 : (j - i0) / (i - i0);
            zet(j, y0 + (y - y0) * deel);
          }
        }
        vorige = { i: i, y: y };
        toonSchets();
      }

      function toonSchets() {
        var dx = [], dy = [];
        for (var i = 0; i < N; i++) {
          dx.push(xs[i]);
          dy.push(isNaN(waarden[i]) ? NaN : waarden[i]);
        }
        schets.dataX = dx;
        schets.dataY = dy;
        bord.update();
      }

      var houder = bord.containerObj;
      var bezig = false;

      function coords(e) {
        return bord.getUsrCoordsOfMouse(e);
      }

      function omlaag(e) {
        if (stand !== "teken" || e.button > 0) return;
        bezig = true;
        vorige = null;
        geschiedenis.push(waarden.slice());
        if (geschiedenis.length > 20) geschiedenis.shift();
        if (houder.setPointerCapture && e.pointerId !== undefined) {
          try { houder.setPointerCapture(e.pointerId); } catch (fout) { /* niet erg */ }
        }
        var p = coords(e);
        trek(p[0], p[1]);
        e.preventDefault();
        e.stopPropagation();
      }

      function beweeg(e) {
        if (!bezig) return;
        var p = coords(e);
        trek(p[0], p[1]);
        e.preventDefault();
        e.stopPropagation();
      }

      function omhoog(e) {
        if (!bezig) return;
        bezig = false;
        vorige = null;
        e.preventDefault();
      }

      houder.style.touchAction = "none";
      houder.addEventListener("pointerdown", omlaag, true);
      houder.addEventListener("pointermove", beweeg, true);
      houder.addEventListener("pointerup", omhoog, true);
      houder.addEventListener("pointercancel", omhoog, true);

      /* --- de beoordeling ------------------------------------------------ */

      // De schets zoals ze beoordeeld wordt: gladgestreken, en in de
      // puntenstand gewoon de spline op hetzelfde rooster.
      function huidige() {
        if (stand === "punten") return xs.map(puntenY);
        return glad(waarden);
      }

      function grenzen(ys) {
        var eerste = -1, laatste = -1;
        for (var i = 0; i < ys.length; i++) {
          if (isNaN(ys[i])) continue;
          if (eerste < 0) eerste = i;
          laatste = i;
        }
        return [eerste, laatste];
      }

      // De gemiddelde afstand tot een kandidaatfunctie, in eenheden van de
      // vensterhoogte. Zo betekent dezelfde drempel in elke oefening
      // hetzelfde, ook als de assen anders geschaald zijn.
      function afstand(ys, van, tot, h, schuif) {
        var som = 0, aantal = 0;
        for (var i = van; i <= tot; i++) {
          if (isNaN(ys[i])) continue;
          som += Math.abs(ys[i] - h(xs[i] + (schuif || 0)));
          aantal++;
        }
        return aantal ? som / aantal / hoogte : Infinity;
      }

      // Wie met de vinger tekent, zit gemakkelijk een paar pixels naast de
      // juiste plaats; op een steil stuk geeft dat meteen een grote
      // verticale afwijking. Daarom mag de vergelijking een beetje in de
      // x-richting schuiven, te weinig om een andere vorm goed te keuren.
      function beste(ys, van, tot, h) {
        var speling = 0.06 * (b - a);
        var klein = Infinity;
        for (var k = -4; k <= 4; k++) {
          klein = Math.min(klein, afstand(ys, van, tot, h, k * speling / 4));
        }
        return klein;
      }

      function kandidaten() {
        var lijst = [
          { functie: opgave.f,
            tekst: "Dat is de grafiek van f zelf. Teken hoe steil f is, niet " +
                   "hoe hoog f ligt." },
          { functie: function (x) { return -opgave.fAccent(x); },
            tekst: "Je tekening is gespiegeld om de x-as. Waar f stijgt, ligt " +
                   "f' boven de x-as." }
        ];
        return lijst.concat(opgave.misvattingen || []);
      }

      function beoordeel() {
        var ys = huidige();
        var rand = grenzen(ys);
        if (rand[0] < 0) {
          return { goed: false, tekst: "Er staat nog niets. Teken de grafiek " +
                                       "van f' van links naar rechts." };
        }
        if ((rand[1] - rand[0] + 1) / N < 0.7) {
          return { goed: false, tekst: "Je tekening bedekt maar een deel van " +
                                       "het venster. Teken f' over het hele bereik." };
        }
        var van = rand[0], tot = rand[1];
        var dood = 0.05 * hoogte;

        var d = beste(ys, van, tot, opgave.fAccent);
        if (d <= 0.075) {
          return { goed: true, tekst: "Juist. De streepjeslijn is de grafiek " +
                                      "van f'; vergelijk ze met je schets." };
        }

        // Een herkenbare misvatting krijgt voorrang op algemene feedback.
        var raak = null;
        kandidaten().forEach(function (kandidaat) {
          var dk = beste(ys, van, tot, kandidaat.functie);
          if (dk <= 0.08 && dk < 0.6 * d && (!raak || dk < raak.d)) {
            raak = { d: dk, tekst: kandidaat.tekst };
          }
        });
        if (raak) return { goed: false, tekst: raak.tekst };

        // Dezelfde vorm, maar een stuk te hoog of te laag: dat is een fout op
        // zich, en ze verbergt anders de controle op de nulpunten.
        var scheef = 0, geteld = 0;
        for (var m = van; m <= tot; m++) {
          if (isNaN(ys[m])) continue;
          scheef += ys[m] - juist[m];
          geteld++;
        }
        scheef = geteld ? scheef / geteld : 0;
        var verschoven = beste(ys, van, tot, function (x) {
          return opgave.fAccent(x) + scheef;
        });
        if (verschoven <= 0.07 && Math.abs(scheef) / hoogte > 0.09) {
          return { goed: false, tekst: "De vorm klopt, maar je grafiek ligt " +
                   (scheef > 0 ? "te hoog" : "te laag") + "." };
        }

        // Klopt het teken? Dat is de kern van de oefening.
        var mis = 0, meetelt = 0;
        for (var i = van; i <= tot; i++) {
          if (isNaN(ys[i]) || Math.abs(juist[i]) < dood) continue;
          meetelt++;
          if (tekenVan(ys[i], dood) !== 0 &&
              tekenVan(ys[i], dood) !== tekenVan(juist[i], dood)) mis++;
        }
        if (meetelt && mis / meetelt > 0.22) {
          return { goed: false, tekst: "Het teken klopt niet overal: waar f " +
                   "stijgt hoort f' boven de x-as, waar f daalt eronder." };
        }

        // Liggen de nulpunten goed? Daar heeft f een top of een dal.
        var hoort = nulpunten(xs, juist);
        var heeft = nulpunten(xs.slice(van, tot + 1), ys.slice(van, tot + 1));
        var marge = 0.18 * (b - a);
        for (var n = 0; n < hoort.length; n++) {
          var dichtst = Infinity;
          heeft.forEach(function (x) {
            dichtst = Math.min(dichtst, Math.abs(x - hoort[n]));
          });
          if (dichtst > marge) {
            return { goed: false, tekst: "Je grafiek snijdt de x-as niet bij " +
                     "x = " + ctx.getal(hoort[n]) + ". Daar heeft f een " +
                     "horizontale raaklijn, dus is f' daar nul." };
          }
        }
        if (heeft.length > hoort.length + 1) {
          return { goed: false, tekst: "Je grafiek snijdt de x-as vaker dan " +
                   "f horizontale raaklijnen heeft." };
        }

        // Vorm goed, ligging niet: te hoog, te laag, te vlak of te steil.
        if (Math.abs(scheef) / hoogte > 0.09) {
          return { goed: false, tekst: "De vorm klopt, maar je grafiek ligt " +
                   (scheef > 0 ? "te hoog" : "te laag") + "." };
        }
        var mijn = spreiding(ys, van, tot);
        var hoort2 = spreiding(juist, van, tot);
        if (hoort2 <= 0.02 * hoogte && mijn > 0.09 * hoogte) {
          return { goed: false, tekst: "De raaklijn aan f heeft overal dezelfde " +
                   "richtingscoëfficiënt, dus is f' een horizontale rechte." };
        }
        if (hoort2 > 0.02 * hoogte) {
          var verhouding = mijn / hoort2;
          if (verhouding < 0.5 || verhouding > 2) {
            return { goed: false, tekst: "De vorm klopt, maar je grafiek loopt " +
                     (verhouding < 1 ? "te vlak" : "te steil") +
                     ". Kijk nog eens hoe steil de raaklijn aan f staat." };
          }
        }
        if (d <= 0.14) {
          return { goed: false, tekst: "Bijna. De vorm klopt, je zit er nog " +
                                       "net naast." };
        }
        return { goed: false, tekst: "Nog niet juist. Lees in enkele punten de " +
                 "richtingscoëfficiënt van de raaklijn aan f af en zet die " +
                 "waarden uit." };
      }

      /* --- knoppen -------------------------------------------------------- */

      function wis() {
        geschiedenis.push(waarden.slice());
        for (var i = 0; i < N; i++) waarden[i] = NaN;
        punten.forEach(function (p) {
          p.setPosition(window.JXG.COORDS_BY_USER, [p.X(), 0]);
        });
        oplossing.setAttribute({ visible: false });
        toonSchets();
        ctx.toon(opdrachttekst());
      }

      function ongedaan() {
        if (!geschiedenis.length) return;
        var vorigeStand = geschiedenis.pop();
        for (var i = 0; i < N; i++) waarden[i] = vorigeStand[i];
        toonSchets();
      }

      function opdrachttekst() {
        return stand === "teken"
          ? "Teken de grafiek van f' in het rooster en druk op Controleer."
          : "Zet de vijf punten op hun plaats, met de muis of met de " +
            "pijltjestoetsen, en druk op Controleer.";
      }

      function controleer() {
        var uitslag = beoordeel();
        if (uitslag.goed) oplossing.setAttribute({ visible: true });
        bord.update();
        ctx.toon(uitslag.tekst);
      }

      function toonOplossing() {
        oplossing.setAttribute({ visible: !oplossing.getAttribute("visible") });
        bord.update();
        ctx.toon(oplossing.getAttribute("visible")
          ? "De streepjeslijn is de grafiek van f'."
          : opdrachttekst());
      }

      function zetStand(nieuw) {
        stand = nieuw;
        var punten_aan = stand === "punten";
        punten.forEach(function (p) { p.setAttribute({ visible: punten_aan }); });
        spline.setAttribute({ visible: punten_aan });
        schets.setAttribute({ visible: !punten_aan });
        standknop.textContent = punten_aan ? "Vrij tekenen" : "Met punten";
        bord.update();
        ctx.toon(opdrachttekst());
      }

      var standknop = ctx.knop("Met punten", function () {
        zetStand(stand === "teken" ? "punten" : "teken");
      });
      ctx.knop("Ongedaan", ongedaan);
      ctx.knop("Wis", wis);
      ctx.knop("Controleer", controleer);
      ctx.knop("Toon f'", toonOplossing);

      function herstel() {
        geschiedenis = [];
        for (var i = 0; i < N; i++) waarden[i] = NaN;
        punten.forEach(function (p) {
          p.setPosition(window.JXG.COORDS_BY_USER, [p.X(), 0]);
        });
        oplossing.setAttribute({ visible: false });
        zetStand("teken");
        toonSchets();
      }

      function vernietig() {
        houder.removeEventListener("pointerdown", omlaag, true);
        houder.removeEventListener("pointermove", beweeg, true);
        houder.removeEventListener("pointerup", omhoog, true);
        houder.removeEventListener("pointercancel", omhoog, true);
      }

      herstel();
      return { reset: herstel, vernietig: vernietig, beoordeel: beoordeel,
               tekenOp: function (h) {                 // enkel voor de tests
                 for (var i = 0; i < N; i++) waarden[i] = h(xs[i]);
                 toonSchets();
               } };
    }

    return { maak: maak };
  })();

  // De vier oefeningen. Venster en domein volgen de statische figuren in de
  // cursus; het venster van de schets is het rechtse assenstelsel daar.
  [
    { naam: "schets-afgeleide-a",
      f: function (x) { return 0.5 * x * x - 2; },
      fAccent: function (x) { return x; },
      domein: [-3.2, 3.2] },
    { naam: "schets-afgeleide-b",
      f: function (x) { return -2 * x + 1; },
      fAccent: function () { return -2; },
      domein: [-1.8, 2.4],
      misvattingen: [
        { functie: function () { return 0; },
          tekst: "Een rechte is niet constant nul: haar richtingscoëfficiënt " +
                 "is niet nul, maar wel overal dezelfde." }
      ] },
    { naam: "schets-afgeleide-c",
      f: function (x) { return x * x * x / 3 - x; },
      fAccent: function (x) { return x * x - 1; },
      domein: [-2.1, 2.1] },
    { naam: "schets-afgeleide-d",
      f: function (x) { return -0.5 * x * x + x + 1; },
      fAccent: function (x) { return -x + 1; },
      domein: [-2.5, 3.2] }
  ].forEach(function (opgave) {
    G.registreer(opgave.naam, function (ctx) {
      return Schets.maak(ctx, {
        f: opgave.f,
        fAccent: opgave.fAccent,
        domein: opgave.domein,
        venster: [-3.6, 4, 3.6, -4],
        misvattingen: opgave.misvattingen
      });
    });
  });
})();
