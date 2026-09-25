/* Interactieve grafieken bij A19_Differentialen.tex.
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

  /* --- De differentiaal: aangroeiing langs grafiek en raaklijn ----------- */

  // Dezelfde figuur als bovenaan het hoofdstuk: een vast punt A(a, f(a)), een
  // veranderlijk punt B(x, f(x)), de raaklijn t in A, en daaronder C op de
  // hoogte van A en D op de raaklijn. De leerling ziet twee aangroeiingen
  // naast elkaar: Delta y = y_B - y_C langs de grafiek en df(a) = y_D - y_C
  // langs de raaklijn. Met Delta x halveren wordt zichtbaar dat hun verschil
  // veel sneller klein wordt dan Delta x zelf (ongeveer vier keer per
  // halvering): daarom mag Delta y door dy benaderd worden.
  G.registreer("differentiaal", function (ctx) {
    var BEGIN_A = 1.2;                          // zoals in de statische figuur
    var BEGIN_X = 4;
    var LINKS = 0.3;                            // A en B blijven op dit stuk
    var RECHTS = 5.6;
    var MINIMUMAFSTAND = 0.01;                  // B valt nooit samen met A

    // Elke functie blijft op [LINKS, RECHTS] ruim binnen het bord.
    var FUNCTIES = [
      { voorschrift: "4.2 − 3.6 e^(−0.55x)",
        f: function (x) { return 4.2 - 3.6 * Math.exp(-0.55 * x); },
        afgeleide: function (x) { return 1.98 * Math.exp(-0.55 * x); } },
      { voorschrift: "0.15x² + 1",
        f: function (x) { return 0.15 * x * x + 1; },
        afgeleide: function (x) { return 0.3 * x; } },
      { voorschrift: "2.5 + 1.5 sin x",
        f: function (x) { return 2.5 + 1.5 * Math.sin(x); },
        afgeleide: function (x) { return 1.5 * Math.cos(x); } }
    ];
    var keuze = 0;

    function f(x) { return FUNCTIES[keuze].f(x); }
    function afgeleide(x) { return FUNCTIES[keuze].afgeleide(x); }

    var bord = ctx.maakBord({
      begrenzing: [-0.8, 6.6, 6.4, -1.1]
    });

    var kromme = ctx.stijl(bord.create("functiongraph", [f, 0.1, 6.2], {
      strokeWidth: 2.5, fixed: true, highlight: false, withLabel: false
    }), "kromme");

    var spoor = bord.create("segment", [[LINKS, 0], [RECHTS, 0]], {
      visible: false, fixed: true
    });

    var A = ctx.stijl(bord.create("glider", [BEGIN_A, f(BEGIN_A), kromme], {
      name: "A", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [-18, 12] }
    }), "punt");

    var B = ctx.stijl(bord.create("glider", [BEGIN_X, f(BEGIN_X), kromme], {
      name: "B", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [8, -12] }
    }), "secante");

    function maakVoet(x, naam) {
      return ctx.stijl(bord.create("glider", [x, 0, spoor], {
        name: naam, size: 3, showInfobox: false,
        precision: { touch: 30, mouse: 6 },
        label: { anchorX: "middle", offset: [0, -30] }
      }), "hulp");
    }
    var voetA = maakVoet(BEGIN_A, "a");
    var voetX = maakVoet(BEGIN_X, "x");

    function yD() { return A.Y() + afgeleide(A.X()) * (B.X() - A.X()); }

    ctx.stijl(bord.create("tangent", [A], {
      strokeWidth: 2, fixed: true, highlight: false, withLabel: false
    }), "raaklijn");

    // C en D: vaste punten die met A en B meebewegen.
    function hulppunt(naam, x, y, verschuiving) {
      return ctx.stijl(bord.create("point", [x, y], {
        name: naam, size: 3, fixed: true, highlight: false, showInfobox: false,
        label: { offset: verschuiving }
      }), "hulp");
    }
    hulppunt("C", function () { return B.X(); }, function () { return A.Y(); },
      [8, -12]);
    hulppunt("D", function () { return B.X(); }, yD, [-20, 8]);

    // Projecties en de horizontale door A.
    function stippel(x1, y1, x2, y2) {
      ctx.stijl(bord.create("segment", [[x1, y1], [x2, y2]], {
        strokeWidth: 1, dash: 2, fixed: true, highlight: false
      }), "zwak");
    }
    stippel(function () { return A.X(); }, function () { return A.Y(); },
      function () { return A.X(); }, 0);
    stippel(function () { return B.X(); }, 0,
      function () { return B.X(); }, function () { return Math.max(B.Y(), yD()); });
    stippel(function () { return A.X(); }, function () { return A.Y(); },
      function () { return B.X(); }, function () { return A.Y(); });

    // De twee aangroeiingen als dikke verticale stukken naast elkaar: Delta y
    // links van de verticale door x, df(a) rechts ervan. Zo liggen ze niet op
    // elkaar, ook niet als ze bijna gelijk zijn.
    function kant() { return B.X() >= A.X() ? 1 : -1; }
    // Bij een kleine Delta x schuiven ze mee dichter tegen de verticale, zodat
    // ze niet voorbij A komen te staan.
    function naast(afstand) {
      return function () {
        var ruimte = Math.min(1, 3 * Math.abs(B.X() - A.X()));
        return B.X() + kant() * afstand * ruimte;
      };
    }
    // Onder deze Delta x vallen de namen op elkaar; de waarden staan dan
    // enkel nog in de tekstregel onder de grafiek.
    function naam(tekst) {
      return function () { return Math.abs(B.X() - A.X()) < 0.5 ? "" : tekst; };
    }
    ctx.stijl(bord.create("segment",
      [[naast(-0.12), function () { return A.Y(); }],
       [naast(-0.12), function () { return B.Y(); }]],
      { strokeWidth: 4, fixed: true, highlight: false }), "secante");
    ctx.stijl(bord.create("segment",
      [[naast(0.12), function () { return A.Y(); }],
       [naast(0.12), yD]],
      { strokeWidth: 4, fixed: true, highlight: false }), "raaklijn");

    ctx.stijl(bord.create("text",
      [naast(-0.2), function () { return (A.Y() + B.Y()) / 2; }, naam("Δy")],
      { anchorX: function () { return kant() > 0 ? "right" : "left"; },
        anchorY: "middle", fixed: true, highlight: false }), "secante");
    ctx.stijl(bord.create("text",
      [naast(0.2), function () { return A.Y() + 0.75 * (yD() - A.Y()); }, naam("df(a)")],
      { anchorX: function () { return kant() > 0 ? "left" : "right"; },
        anchorY: "middle", fixed: true, highlight: false }), "raaklijn");

    function werkBij() {
      var dx = B.X() - A.X();
      var dy = B.Y() - A.Y();
      var df = afgeleide(A.X()) * dx;
      var fout = dy - df;
      var procent = Math.abs(dy) < 1e-12 ? null : Math.abs(fout / dy) * 100;
      ctx.toon(
        "f(x) = " + FUNCTIES[keuze].voorschrift + "; " +
        "Δx = " + ctx.getal(dx, 4) +
        "; Δy = " + ctx.getal(dy, 4) +
        "; df(a) = f′(a)·Δx = " + ctx.getal(afgeleide(A.X()), 3) + " · " +
        ctx.getal(dx, 4) + " = " + ctx.getal(df, 4) +
        "; verschil Δy − df(a) = " + ctx.getal(fout, 5) +
        (procent === null ? "." : " (" + ctx.getal(procent, 2) + "% van Δy)."));
    }

    function begrens(x) { return Math.max(LINKS, Math.min(RECHTS, x)); }

    function zet(punt, voet, x) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, f(x)]);
      voet.setPosition(window.JXG.COORDS_BY_USER, [x, 0]);
    }

    // B mag A niet raken: dan zijn Delta y en df(a) allebei nul.
    function houdAfstand(bewogen) {
      var a = A.X();
      var x = B.X();
      if (Math.abs(x - a) >= MINIMUMAFSTAND) return;
      var richting = x < a ? -1 : 1;
      if (bewogen === A) {
        var nieuw = a + richting * MINIMUMAFSTAND;
        if (nieuw < LINKS || nieuw > RECHTS) zet(A, voetA, x - richting * MINIMUMAFSTAND);
        else zet(B, voetX, nieuw);
      } else {
        var doel = a + richting * MINIMUMAFSTAND;
        if (doel < LINKS || doel > RECHTS) doel = a - richting * MINIMUMAFSTAND;
        zet(B, voetX, doel);
      }
    }

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
    koppel(A, voetA);
    koppel(B, voetX);

    bord.on("update", werkBij);

    // Halveert de afstand van B tot A. Is B al zeer dicht, dan begint het
    // opnieuw van de beginafstand, zodat de knop blijft werken.
    function halveer() {
      var dx = B.X() - A.X();
      var nieuw = Math.abs(dx) / 2 < 0.02 ? A.X() + (dx < 0 ? -1 : 1) * (BEGIN_X - BEGIN_A)
                                           : A.X() + dx / 2;
      if (nieuw < LINKS || nieuw > RECHTS) nieuw = A.X() - (nieuw - A.X());
      zet(B, voetX, begrens(nieuw));
      houdAfstand(B);
      bord.update();
    }

    function andereF() {
      keuze = (keuze + 1) % FUNCTIES.length;
      zet(A, voetA, A.X());
      zet(B, voetX, B.X());
      bord.update();
    }

    function beginstand() {
      zet(A, voetA, BEGIN_A);
      zet(B, voetX, BEGIN_X);
      bord.update();
      werkBij();
    }

    function herstel() {
      keuze = 0;
      beginstand();
    }

    ctx.knop("Δx halveren", halveer);
    ctx.knop("Andere f", andereF);
    ctx.knop("Beginstand", beginstand);

    werkBij();

    return { reset: herstel };
  });
})();
