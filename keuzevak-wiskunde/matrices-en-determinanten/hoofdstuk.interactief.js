/* Interactieve grafieken bij L01_Matrices.tex.
 *
 * Het werkblad (matrices met haken op een bord, een rij of kolom laten
 * oplichten, het venster aan de inhoud aanpassen) staat in web/matrixbord.js,
 * omdat ook L03_Determinanten het gebruikt. Hier volgt per figuur enkel nog
 * wat haar eigen is.
 *
 * mkpi: gebruikt matrixbord.js
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var M = window.Matrixbord;
  if (!G || !M) return;

  var ONDER = M.ONDER;
  var index = M.index;
  var el = M.el;
  var macht = M.macht;
  var waarde = M.waarde;
  var net = M.net;
  var haakjes = M.haakjes;
  var willekeurigGetal = M.willekeurigGetal;
  var willekeurigeMatrix = M.willekeurigeMatrix;
  var vulWillekeurig = M.vulWillekeurig;
  var orde = M.orde;
  var nulmatrix = M.nulmatrix;
  var som = M.som;
  var veelvoud = M.veelvoud;
  var product = M.product;
  var getransponeerde = M.getransponeerde;
  var eenheidsmatrix = M.eenheidsmatrix;
  var machtVan = M.machtVan;
  var gelijk = M.gelijk;
  var maakWerkblad = M.maakWerkblad;
  var klikPunt = M.klikPunt;
  var assenMet = M.assenMet;
  var matrixBord = M.matrixBord;
  var maakDrieluik = M.maakDrieluik;

  /* --- 1. De orde van een matrix ----------------------------------------- */

  // Op papier staat er één rooster met puntjes erin. Hier verandert de orde
  // onder je handen, en licht bij een klik meteen de rij en de kolom op waar
  // het element in staat: dat is precies wat de dubbele index betekent.
  G.registreer("matrix-orde", function (ctx) {
    var wb = maakWerkblad(ctx);
    var st = { rijen: 3, kolommen: 4, rij: 2, kolom: 3 };

    var bord = matrixBord(ctx);
    var m = wb.matrix(bord, {
      rijen: function () { return st.rijen; },
      kolommen: function () { return st.kolommen; },
      maxrijen: 5, maxkolommen: 5,
      x: 0.6, y: 0,
      waarde: function (i, j) { return el("a", i, j); }
    });
    var rijMerk = m.markeer("secante");
    var kolMerk = m.markeer("punt");

    wb.tekst(bord,
      function () { return m.X(); },
      function () { return m.boven() + 0.6; },
      function () { return st.kolommen + " kolommen"; }, "punt", { factor: 0.9 });
    wb.tekst(bord,
      function () { return m.links() - 0.7; },
      function () { return m.Y(); },
      function () { return st.rijen + " rijen"; }, "secante",
      { anchorX: "right", factor: 0.9 });
    wb.tekst(bord,
      function () { return m.X(); },
      function () { return m.boven() - m.hoogte() - 0.7; },
      function () { return "A is een " + st.rijen + "×" + st.kolommen + "-matrix"; },
      "tekst", { factor: 0.95 });

    wb.venster(bord, function () {
      return [m.volleBreedte() + 5.4, m.hoogte() + 3.2];
    });

    function werkBij() {
      rijMerk.zet(st.rij, 0);
      kolMerk.zet(0, st.kolom);
      wb.pas();
      ctx.toon("A is een " + st.rijen + "×" + st.kolommen + "-matrix: " +
        "m = " + st.rijen + " rijen en n = " + st.kolommen + " kolommen, " +
        "dus A hoort bij de " + st.rijen + "×" + st.kolommen +
        "-matrices. " +
        "Het aangeduide element " + el("a", st.rij, st.kolom) +
        " staat in rij " + st.rij + " en kolom " + st.kolom +
        ": de rij staat eerst.");
    }

    function pasOrde(dr, dk) {
      st.rijen = Math.max(1, Math.min(5, st.rijen + dr));
      st.kolommen = Math.max(1, Math.min(5, st.kolommen + dk));
      st.rij = Math.min(st.rij, st.rijen);
      st.kolom = Math.min(st.kolom, st.kolommen);
      werkBij();
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = m.celVan(p[0], p[1]);
      if (!cel) return;
      st.rij = cel.rij;
      st.kolom = cel.kolom;
      werkBij();
    });

    ctx.knop("Rij erbij", function () { pasOrde(1, 0); });
    ctx.knop("Rij eraf", function () { pasOrde(-1, 0); });
    ctx.knop("Kolom erbij", function () { pasOrde(0, 1); });
    ctx.knop("Kolom eraf", function () { pasOrde(0, -1); });

    function herstel() {
      st.rijen = 3;
      st.kolommen = 4;
      st.rij = 2;
      st.kolom = 3;
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 1b. Voorbeelden van matrices -------------------------------------- */

  // Op papier staan er drie voorbeelden naast elkaar. Hier levert Willekeurig
  // er telkens een nieuw: een andere orde en andere elementen, zodat de
  // leerling zelf blijft aflezen hoeveel rijen en kolommen er zijn.
  G.registreer("matrix-voorbeelden", function (ctx) {
    var wb = maakWerkblad(ctx);
    var BEGIN = [[2, -1, 5], [0, 3, -4]];
    var A = BEGIN.map(function (rij) { return rij.slice(); });

    var bord = matrixBord(ctx);
    var m = wb.matrix(bord, {
      rijen: function () { return A.length; },
      kolommen: function () { return A[0].length; },
      maxrijen: 4, maxkolommen: 4, celbreedte: 1.1, x: .35, y: -.2,
      waarde: function (i, j) { return net(String(A[i - 1][j - 1])); }
    });
    wb.tekst(bord, function () { return m.links() - .35; }, function () {
      return m.Y();
    }, "A =", "tekst", { factor: 1.15, vet: true, anchorX: "right" });
    wb.tekst(bord, function () { return m.X(); }, function () {
      return m.boven() - m.hoogte() - 0.7;
    }, function () {
      return "A is een " + A.length + "×" + A[0].length + "-matrix";
    }, "tekst", { factor: 0.95 });

    wb.venster(bord, function () {
      return [m.volleBreedte() + 1.8, m.hoogte() + 3.2];
    });

    function werkBij() {
      wb.pas();
      ctx.toon("A is een " + A.length + "×" + A[0].length + "-matrix: " +
        A.length + " rijen en " + A[0].length + " kolommen.");
    }

    // Een nieuw voorbeeld mag niet toevallig dezelfde orde houden: dan lijkt
    // de knop niets te doen aan de orde.
    function nieuw() {
      var rijen = A.length;
      var kolommen = A[0].length;
      while (rijen === A.length && kolommen === A[0].length) {
        rijen = Math.floor(Math.random() * 4) + 1;
        kolommen = Math.floor(Math.random() * 4) + 1;
      }
      A = willekeurigeMatrix(rijen, kolommen);
      werkBij();
    }

    ctx.knop("Willekeurig", nieuw);

    function herstel() {
      A = BEGIN.map(function (rij) { return rij.slice(); });
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 2. De bijzondere matrices naast elkaar ---------------------------- */

  // Voor het begrip vierkante matrix tonen we alleen een gewone vierkante
  // matrix. De bijzondere matrixsoorten krijgen hun eigen voorbeeld bij de
  // overeenkomstige paragraaf in de cursus.
  G.registreer("bijzondere-matrices", function (ctx) {
    var wb = maakWerkblad(ctx);
    var BASIS = willekeurigeMatrix(5, 5);
    var st = { n: 4, diagonaal: true, neven: false };

    var bord = matrixBord(ctx);
    var m = wb.matrix(bord, {
      rijen: function () { return st.n; },
      kolommen: function () { return st.n; },
      maxrijen: 5, maxkolommen: 5,
      celbreedte: 1.1,
      x: 0, y: -0.2,
      waarde: function (i, j) {
        return net(String(BASIS[i - 1][j - 1]));
      }
    });

    // Voor elke plaats op de hoofddiagonaal een eigen merkteken: samen tonen
    // ze de diagonaal, ook als de orde verandert.
    var diagonaal = [];
    var nevendiagonaal = [];
    for (var k = 1; k <= 5; k++) {
      (function (k) {
        var merk = m.markeer("punt");
        merk.zet(k, k);
        diagonaal.push({ merk: merk, k: k });
        var neven = m.markeer("secante");
        neven.zet(k, 6 - k);
        nevendiagonaal.push({ merk: neven, k: k });
      }(k));
    }

    wb.tekst(bord,
      function () { return m.links() - 0.35; },
      function () { return m.Y(); },
      "A =", "tekst",
      { factor: 1.15, vet: true, anchorX: "right" });

    wb.venster(bord, function () {
      return [m.volleBreedte() + 1.6, m.hoogte() + 2.4];
    });

    function werkBij() {
      diagonaal.forEach(function (d) {
        if (st.diagonaal && d.k <= st.n) d.merk.zet(d.k, d.k);
        else d.merk.verberg();
      });
      nevendiagonaal.forEach(function (d) {
        if (st.neven && d.k <= st.n) d.merk.zet(d.k, st.n + 1 - d.k);
        else d.merk.verberg();
      });
      wb.pas();
      ctx.toon("Een vierkante matrix A van de orde " + st.n + "×" + st.n +
        ". De aangeduide elementen vormen de hoofddiagonaal.");
    }

    ctx.knop("Wijzig A", function () {
      vulWillekeurig(BASIS);
      werkBij();
    });
    ctx.knop("Kleiner", function () {
      st.n = Math.max(1, st.n - 1);
      werkBij();
    });
    ctx.knop("Groter", function () {
      st.n = Math.min(5, st.n + 1);
      werkBij();
    });
    var knopD = ctx.knop("Hoofddiagonaal", function (knop) {
      st.diagonaal = !st.diagonaal;
      knop.setAttribute("aria-pressed", String(st.diagonaal));
      werkBij();
    });
    knopD.classList.add("diagonaal-knop");
    knopD.style.setProperty("--diagonaal-kleur", "var(--grafiek-punt)");
    knopD.style.color = "var(--grafiek-punt)";
    knopD.style.borderColor = "var(--grafiek-punt)";
    knopD.setAttribute("aria-pressed", "true");
    var knopN = ctx.knop("Nevendiagonaal", function (knop) {
      st.neven = !st.neven;
      knop.setAttribute("aria-pressed", String(st.neven));
      werkBij();
    });
    knopN.classList.add("diagonaal-knop");
    knopN.style.setProperty("--diagonaal-kleur", "var(--grafiek-secante)");
    knopN.style.color = "var(--grafiek-secante)";
    knopN.style.borderColor = "var(--grafiek-secante)";
    knopN.setAttribute("aria-pressed", "false");

    function herstel() {
      st.n = 4;
      st.diagonaal = true;
      st.neven = false;
      knopD.setAttribute("aria-pressed", "true");
      knopN.setAttribute("aria-pressed", "false");
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 3. Elke bijzondere matrix bij haar eigen definitie ---------------- */

  // De voorbeelden bij de definities gebruiken hetzelfde rustige rooster als
  // de vierkante matrix hierboven. Zo verandert alleen de eigenschap die de
  // definitie bespreekt, niet ook de manier waarop de matrix getekend wordt.
  // Met metProduct krijgen de eenheidsmatrix en de nulmatrix een knop Product
  // (A · I = A en A · O = O). In L01 komen ze voor het product aan bod; een
  // cursus die het product eerst behandelt, kiest die variant.
  function bijzondereMatrix(ctx, soort, metProduct) {
    var wb = maakWerkblad(ctx);
    var BASIS = willekeurigeMatrix(5, 5);
    var st = { n: 3, rijen: 3, kolommen: 2, rij: true, k: 5, boven: true,
               product: false };
    var rijKnop;
    var kolomKnop;
    var bovenKnop;
    var onderKnop;
    var productKnop;
    var bord = matrixBord(ctx);

    function rijen() {
      return soort === "nul" ? st.rijen :
        soort === "rij-kolom" ? (st.rij ? 1 : st.n) : st.n;
    }

    function kolommen() {
      return soort === "nul" ? st.kolommen :
        soort === "rij-kolom" ? (st.rij ? st.n : 1) : st.n;
    }

    function getal(i, j) {
      if (soort === "nul") return 0;
      if (soort === "diagonaal") return i === j ? BASIS[i - 1][i - 1] : 0;
      if (soort === "scalair") return i === j ? st.k : 0;
      if (soort === "eenheid") return i === j ? 1 : 0;
      if (soort === "driehoek") {
        return (st.boven ? i > j : i < j) ? 0 : BASIS[i - 1][j - 1];
      }
      return BASIS[i - 1][j - 1];
    }

    function naam() {
      if (soort === "nul") return "O =";
      if (soort === "rij-kolom") return st.n === 1 ? "R = K =" :
        (st.rij ? "R =" : "K =");
      if (soort === "diagonaal") return "D =";
      if (soort === "scalair") return net(String(st.k)) + "I =";
      if (soort === "eenheid") return "I =";
      return "A =";
    }

    var m = wb.matrix(bord, {
      rijen: rijen, kolommen: kolommen,
      maxrijen: 5, maxkolommen: 5, celbreedte: 1.1, x: .35, y: -.2,
      zichtbaar: function () { return !st.product; },
      waarde: function (i, j) { return net(String(getal(i, j))); }
    });
    wb.tekst(bord, function () { return m.links() - .35; }, function () {
      return m.Y();
    }, naam, "tekst", {
      factor: 1.15, vet: true, anchorX: "right",
      visible: function () { return !st.product; }
    });

    // Enkel bij de eenheids- en de nulmatrix: A · I = A of A · O = O op
    // hetzelfde bord.
    var prod = metProduct && (soort === "eenheid" || soort === "nul") ?
      factorProduct(ctx, wb, bord, st, soort) : null;

    var diagonaal = [];
    var nulDriehoek = [];
    var toegelatenDriehoek = [];
    for (var k = 1; k <= 5; k++) {
      (function (k) {
        var merk = m.markeer("punt");
        diagonaal.push({ merk: merk, k: k });
      }(k));
    }
    for (var i = 1; i <= 5; i++) {
      for (var j = 1; j <= 5; j++) {
        (function (i, j) {
          var merk = m.markeer("secante");
          nulDriehoek.push({ merk: merk, i: i, j: j });
          var toegelaten = m.markeer("punt");
          toegelatenDriehoek.push({ merk: toegelaten, i: i, j: j });
        }(i, j));
      }
    }

    wb.venster(bord, function () {
      if (st.product) return prod.maat();
      return [m.volleBreedte() + 1.8, m.hoogte() + 2.4];
    });

    function werkBij() {
      if (prod) prod.werkBij();
      diagonaal.forEach(function (d) {
        var toon = soort === "diagonaal" || soort === "scalair" ||
          soort === "eenheid";
        if (toon && d.k <= st.n) d.merk.zet(d.k, d.k);
        else d.merk.verberg();
      });
      nulDriehoek.forEach(function (d) {
        var nul = soort === "driehoek" && d.i <= st.n && d.j <= st.n &&
          (st.boven ? d.i > d.j : d.i < d.j);
        if (nul) d.merk.zet(d.i, d.j);
        else d.merk.verberg();
      });
      toegelatenDriehoek.forEach(function (d) {
        var toegelaten = soort === "driehoek" && d.i <= st.n && d.j <= st.n &&
          !(st.boven ? d.i > d.j : d.i < d.j);
        if (toegelaten) d.merk.zet(d.i, d.j);
        else d.merk.verberg();
      });
      wb.pas();
      if (rijKnop) rijKnop.setAttribute("aria-pressed", String(st.n === 1 || st.rij));
      if (kolomKnop) kolomKnop.setAttribute("aria-pressed", String(st.n === 1 || !st.rij));
      if (bovenKnop) bovenKnop.setAttribute("aria-pressed", String(st.n === 1 || st.boven));
      if (onderKnop) onderKnop.setAttribute("aria-pressed", String(st.n === 1 || !st.boven));
      if (soort === "nul") {
        ctx.toon(st.product ? prod.boodschap() :
          "Nulmatrix O van de orde " + st.rijen + "×" + st.kolommen +
          ": alle elementen zijn 0.");
      } else if (soort === "rij-kolom") {
        if (st.n === 1) {
          ctx.toon("Deze 1×1-matrix is tegelijk een rijmatrix en een kolommatrix.");
        } else {
          ctx.toon((st.rij ? "Rijmatrix R" : "Kolommatrix K") + " van de orde " +
            rijen() + "×" + kolommen() + ".");
        }
      } else if (soort === "diagonaal") {
        ctx.toon("Diagonaalmatrix D van de orde " + st.n + "×" + st.n +
          ": buiten de hoofddiagonaal staat 0.");
      } else if (soort === "scalair") {
        ctx.toon("Scalaire matrix " + net(String(st.k)) + "I van de orde " +
          st.n + "×" + st.n + ".");
      } else if (soort === "eenheid") {
        ctx.toon(st.product ? prod.boodschap() :
          "Eenheidsmatrix I van de orde " + st.n + "×" + st.n + ".");
      } else {
        ctx.toon(st.n === 1 ?
          "Deze 1×1-matrix is tegelijk boven- en onderdriehoekig." :
          (st.boven ? "Boven" : "Onder") + "driehoeksmatrix van de orde " +
          st.n + "×" + st.n + ": de oranje driehoek bestaat uit nullen.");
      }
    }

    function kleinerGroter() {
      ctx.knop("Kleiner", function () { st.n = Math.max(1, st.n - 1); werkBij(); });
      ctx.knop("Groter", function () { st.n = Math.min(maxOrde(), st.n + 1); werkBij(); });
    }

    // Drie matrices naast elkaar krijgen op een smal scherm te kleine cellen
    // voor de orde 5; het product gaat daarom tot de orde 4.
    function maxOrde() { return st.product ? 4 : 5; }

    function maakProductKnop() {
      productKnop = ctx.knop("Product", function () {
        st.product = !st.product;
        if (st.product) {
          st.n = Math.min(st.n, maxOrde());
          st.rijen = Math.min(st.rijen, maxOrde());
          st.kolommen = Math.min(st.kolommen, maxOrde());
          prod.begin();
        }
        productKnop.setAttribute("aria-pressed", String(st.product));
        werkBij();
      });
      productKnop.setAttribute("aria-pressed", "false");
      bord.on("down", function (e) {
        if (!st.product) return;
        var p = klikPunt(bord, e);
        if (p && prod.kies(p[0], p[1])) werkBij();
      });
    }

    if (soort === "nul") {
      ctx.knop("Meer rijen", function () { st.rijen = st.rijen >= maxOrde() ? 1 : st.rijen + 1; werkBij(); });
      ctx.knop("Meer kolommen", function () { st.kolommen = st.kolommen >= maxOrde() ? 1 : st.kolommen + 1; werkBij(); });
      if (prod) maakProductKnop();
    } else if (soort === "rij-kolom") {
      rijKnop = ctx.knop("Rijmatrix", function () { st.rij = true; werkBij(); });
      kolomKnop = ctx.knop("Kolommatrix", function () { st.rij = false; werkBij(); });
      rijKnop.setAttribute("aria-pressed", "true");
      kolomKnop.setAttribute("aria-pressed", "false");
      kleinerGroter();
      ctx.knop("Wijzig", function () { vulWillekeurig(BASIS); werkBij(); });
    } else if (soort === "scalair") {
      ctx.knop("Waarde −", function () { st.k = Math.max(-5, st.k - 1); werkBij(); });
      ctx.knop("Waarde +", function () { st.k = Math.min(5, st.k + 1); werkBij(); });
      kleinerGroter();
    } else {
      if (soort === "driehoek") {
        bovenKnop = ctx.knop("Bovendriehoekig", function () { st.boven = true; bovenKnop.setAttribute("aria-pressed", "true"); onderKnop.setAttribute("aria-pressed", "false"); werkBij(); });
        onderKnop = ctx.knop("Onderdriehoekig", function () { st.boven = false; bovenKnop.setAttribute("aria-pressed", "false"); onderKnop.setAttribute("aria-pressed", "true"); werkBij(); });
        bovenKnop.setAttribute("aria-pressed", "true");
        onderKnop.setAttribute("aria-pressed", "false");
      } else if (soort === "diagonaal") {
        ctx.knop("Wijzig diagonaal", function () { vulWillekeurig(BASIS); werkBij(); });
      }
      kleinerGroter();
      if (prod) maakProductKnop();
    }

    function herstel() {
      st.n = 3; st.rijen = 3; st.kolommen = 2; st.rij = true; st.k = 5; st.boven = true;
      st.product = false;
      if (productKnop) productKnop.setAttribute("aria-pressed", "false");
      if (rijKnop) rijKnop.setAttribute("aria-pressed", "true");
      if (kolomKnop) kolomKnop.setAttribute("aria-pressed", "false");
      if (bovenKnop) bovenKnop.setAttribute("aria-pressed", "true");
      if (onderKnop) onderKnop.setAttribute("aria-pressed", "false");
      werkBij();
    }
    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  }

  // A · I = A en A · O = O. Bij de eenheidsmatrix is A een willekeurige
  // n×n-matrix en I heeft dezelfde orde; bij de nulmatrix heeft O de gekozen
  // orde r×k en is A een willekeurige r×r-matrix, zodat het product opnieuw
  // een r×k-matrix is. Een klik op een element van het product licht de rij
  // van A en de kolom van de tweede factor op, met de som van producten
  // eronder: bij I blijft enkel de term met de 1 over, bij O valt alles weg.
  function factorProduct(ctx, wb, bord, st, soort) {
    var P = willekeurigeMatrix(5, 5);
    var keuze = { rij: 0, kolom: 0 };
    var eenheid = soort === "eenheid";

    function r() { return eenheid ? st.n : st.rijen; }
    function k() { return eenheid ? st.n : st.kolommen; }
    function A(i, j) { return P[i - 1][j - 1]; }
    function F(i, j) { return eenheid && i === j ? 1 : 0; }
    function naamF() { return eenheid ? "I" + index(st.n, ONDER) : "O"; }
    function C(i, j) {
      var s = 0;
      for (var t = 1; t <= r(); t++) s += A(i, t) * F(t, j);
      return s;
    }

    var d = maakDrieluik(ctx, wb, bord, {
      teken: "·", celbreedte: 1.1, y: 0.35,
      zichtbaar: function () { return st.product; },
      A: {
        rijen: r, kolommen: r,
        maxrijen: 5, maxkolommen: 5, naam: "A",
        waarde: function (i, j) { return net(String(A(i, j))); }
      },
      B: {
        rijen: r, kolommen: k,
        maxrijen: 5, maxkolommen: 5, naam: naamF,
        waarde: function (i, j) { return String(F(i, j)); }
      },
      C: {
        rijen: r, kolommen: k,
        maxrijen: 5, maxkolommen: 5,
        naam: function () { return "A · " + naamF(); },
        waarde: function (i, j) { return net(String(C(i, j))); }
      }
    });

    var merkA = d.A.markeer("secante");
    var merkF = d.B.markeer("punt");
    var merkC = d.C.markeer("raaklijn");

    function som() {
      var i = keuze.rij;
      var j = keuze.kolom;
      var termen = [];
      for (var t = 1; t <= r(); t++) {
        termen.push(haakjes(A(i, t)) + "·" + F(t, j));
      }
      return el("c", i, j) + " = " + termen.join(" + ") + " = " +
        net(String(C(i, j))) + (eenheid ? " = " + el("a", i, j) : "");
    }

    wb.tekst(bord, 0,
      function () { return -d.hoogte() / 2 - 0.5; },
      function () { return keuze.rij ? som() : "Klik op een element van A · " + naamF(); },
      "tekst", { factor: 0.95, visible: function () { return st.product; } });

    return {
      maat: function () { return [d.breedte() + 1.2, d.hoogte() + 2.6]; },
      begin: function () {
        vulWillekeurig(P);
        keuze.rij = 0;
        keuze.kolom = 0;
      },
      // Een klik op het product kiest dat element, een klik in A een rij en
      // een klik in de tweede factor een kolom.
      kies: function (x, y) {
        var cel = d.C.celVan(x, y);
        if (!cel) {
          var celA = d.A.celVan(x, y);
          var celF = d.B.celVan(x, y);
          if (celA) cel = { rij: celA.rij, kolom: keuze.kolom || 1 };
          else if (celF) cel = { rij: keuze.rij || 1, kolom: celF.kolom };
          else return false;
        }
        keuze.rij = cel.rij;
        keuze.kolom = cel.kolom;
        return true;
      },
      werkBij: function () {
        keuze.rij = Math.min(keuze.rij, r());
        keuze.kolom = Math.min(keuze.kolom, k());
        if (st.product && keuze.rij) {
          merkA.zet(keuze.rij, 0);
          merkF.zet(0, keuze.kolom);
          merkC.zet(keuze.rij, keuze.kolom);
        } else {
          merkA.verberg();
          merkF.verberg();
          merkC.verberg();
        }
        d.herplaats();
      },
      boodschap: function () {
        var basis = eenheid ?
          "A · " + naamF() + " = A: een willekeurige " + st.n + "×" + st.n +
            "-matrix A maal de eenheidsmatrix geeft A terug." :
          "A · O = O: een willekeurige " + r() + "×" + r() +
            "-matrix A maal de nulmatrix O van de orde " + r() + "×" + k() +
            " geeft opnieuw de nulmatrix van die orde.";
        if (!keuze.rij) return basis + " Klik op een element van het product.";
        return basis + " Rij " + keuze.rij + " van A maal kolom " +
          keuze.kolom + " van " + naamF() + " geeft " + som() + ".";
      }
    };
  }

  G.registreer("nulmatrix", function (ctx) { return bijzondereMatrix(ctx, "nul"); });
  G.registreer("nulmatrix-product", function (ctx) {
    return bijzondereMatrix(ctx, "nul", true);
  });
  G.registreer("rij-kolommatrix", function (ctx) { return bijzondereMatrix(ctx, "rij-kolom"); });
  G.registreer("diagonaalmatrix", function (ctx) { return bijzondereMatrix(ctx, "diagonaal"); });
  G.registreer("scalaire-matrix", function (ctx) { return bijzondereMatrix(ctx, "scalair"); });
  G.registreer("eenheidsmatrix", function (ctx) { return bijzondereMatrix(ctx, "eenheid"); });
  G.registreer("eenheidsmatrix-product", function (ctx) {
    return bijzondereMatrix(ctx, "eenheid", true);
  });
  G.registreer("driehoeksmatrix", function (ctx) { return bijzondereMatrix(ctx, "driehoek"); });

  // Synthese: de leerling legt meerdere definities tegelijk op. Eerst worden
  // enkel de logische voorwaarden gecontroleerd; pas daarna construeren we een
  // voorbeeld. Zo vertelt een onmogelijke keuze ook precies waar ze spaak loopt.
  G.registreer("bijzondere-eigenschappen-combineren", function (ctx) {
    var wb = maakWerkblad(ctx);
    var st = {
      grootte: 3,
      rijen: 3,
      kolommen: 3,
      aan: {
        nul: false, rij: false, kolom: false, vierkant: false,
        diagonaal: false, scalair: false, eenheid: false,
        boven: false, onder: false, symmetrisch: false,
        antisymmetrisch: false
      }
    };
    var knoppen = {};
    var bord = matrixBord(ctx);

    var soorten = [
      ["nul", "Nulmatrix"],
      ["rij", "Rijmatrix"],
      ["kolom", "Kolommatrix"],
      ["vierkant", "Vierkant"],
      ["diagonaal", "Diagonaal"],
      ["scalair", "Scalair"],
      ["eenheid", "Eenheidsmatrix"],
      ["boven", "Bovendriehoekig"],
      ["onder", "Onderdriehoekig"],
      ["symmetrisch", "Symmetrisch"],
      ["antisymmetrisch", "Antisymmetrisch"]
    ];
    var vierkantNodig = ["vierkant", "diagonaal", "scalair", "eenheid", "boven",
                         "onder", "symmetrisch", "antisymmetrisch"];

    function ordeVoor(grootte) {
      var vierkant = vierkantNodig.some(function (naam) { return st.aan[naam]; });
      var rijenVast = st.aan.rij || (st.aan.kolom && vierkant);
      var kolommenVast = st.aan.kolom || (st.aan.rij && vierkant);
      return [rijenVast ? 1 : grootte, kolommenVast ? 1 : grootte];
    }

    function pasOrdeAan() {
      var orde = ordeVoor(st.grootte);
      st.rijen = orde[0];
      st.kolommen = orde[1];
    }

    function conflicten() {
      var uit = [];
      if (st.aan.nul && st.aan.eenheid) {
        uit.push("Een nulmatrix heeft overal nullen, terwijl een eenheidsmatrix " +
          "enen op de hoofddiagonaal moet hebben.");
      }
      if (st.aan.antisymmetrisch && st.aan.eenheid) {
        uit.push("Een antisymmetrische matrix heeft nullen op de " +
          "hoofddiagonaal, een eenheidsmatrix enen.");
      }
      return uit;
    }

    function basiswaarde(i, j) {
      return ((2 * i + 3 * j) % 9) - 4 || 2;
    }

    // Een plaats die door een van de gekozen eigenschappen nul moet zijn.
    function nulplek(i, j) {
      if ((st.aan.diagonaal || st.aan.scalair || st.aan.eenheid) && i !== j) return true;
      if (st.aan.boven && i > j) return true;
      if (st.aan.onder && i < j) return true;
      if (st.aan.antisymmetrisch && i === j) return true;
      return false;
    }

    // Spiegelt een eigenschap over de hoofddiagonaal, dan sleept een nul op de
    // ene plaats die op haar spiegelbeeld mee.
    function nul(i, j) {
      var spiegelt = st.aan.symmetrisch || st.aan.antisymmetrisch;
      return nulplek(i, j) || (spiegelt && nulplek(j, i));
    }

    function voorbeeld(i, j) {
      if (st.aan.nul) return 0;
      if (st.aan.symmetrisch && st.aan.antisymmetrisch) return 0;
      if (nul(i, j)) return 0;
      if (st.aan.eenheid) return 1;
      if (st.aan.scalair) return 3;
      if (st.aan.antisymmetrisch) {
        return i < j ? basiswaarde(i, j) : -basiswaarde(j, i);
      }
      if (st.aan.symmetrisch) {
        return basiswaarde(Math.min(i, j), Math.max(i, j));
      }
      return basiswaarde(i, j);
    }

    var m = wb.matrix(bord, {
      rijen: function () { return conflicten().length ? 0 : st.rijen; },
      kolommen: function () { return conflicten().length ? 0 : st.kolommen; },
      maxrijen: 5, maxkolommen: 5, celbreedte: 1.1, x: .35, y: -.2,
      waarde: function (i, j) { return net(String(voorbeeld(i, j))); }
    });
    wb.tekst(bord, function () { return m.links() - .35; }, function () {
      return m.Y();
    }, function () { return conflicten().length ? "" : "A ="; }, "tekst",
    { factor: 1.15, vet: true, anchorX: "right" });
    wb.tekst(bord, 0, 0, function () {
      return conflicten().length ? "Geen matrix mogelijk" : "";
    }, "tekst", { factor: 1.05, vet: true });
    wb.venster(bord, function () {
      return [Math.max(m.volleBreedte() + 1.8, 5.5), Math.max(m.hoogte() + 2.4, 4.5)];
    });

    function werkBij() {
      pasOrdeAan();
      soorten.forEach(function (soort) {
        knoppen[soort[0]].setAttribute("aria-pressed", String(st.aan[soort[0]]));
      });
      kleinerKnop.disabled = st.grootte === 1 ||
        ordeVoor(st.grootte - 1).join("×") === ordeVoor(st.grootte).join("×");
      groterKnop.disabled = st.grootte === 5 ||
        ordeVoor(st.grootte + 1).join("×") === ordeVoor(st.grootte).join("×");
      wb.pas();
      var fouten = conflicten();
      var ordeTekst = "Orde " + st.rijen + "×" + st.kolommen + ". ";
      if (fouten.length) {
        ctx.toon(ordeTekst + "Geen matrix mogelijk. " + fouten.join(" "));
      } else {
        var gekozen = soorten.filter(function (soort) { return st.aan[soort[0]]; })
          .map(function (soort) { return soort[1].toLowerCase(); });
        var extra = st.aan.symmetrisch && st.aan.antisymmetrisch ?
          " Enkel de nulmatrix is tegelijk symmetrisch en antisymmetrisch." : "";
        ctx.toon(ordeTekst + "Deze matrix bestaat" +
          (gekozen.length ? " en heeft alle gekozen eigenschappen: " + gekozen.join(", ") + "." : ".") +
          extra);
      }
    }

    var kleinerKnop = ctx.knop("Kleiner", function () {
      st.grootte = Math.max(1, st.grootte - 1);
      werkBij();
    });
    var groterKnop = ctx.knop("Groter", function () {
      st.grootte = Math.min(5, st.grootte + 1);
      werkBij();
    });
    soorten.forEach(function (soort) {
      knoppen[soort[0]] = ctx.knop(soort[1], function () {
        st.aan[soort[0]] = !st.aan[soort[0]];
        werkBij();
      });
    });

    function herstel() {
      st.grootte = 3;
      soorten.forEach(function (soort) { st.aan[soort[0]] = false; });
      werkBij();
    }
    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 4. Transponeren en symmetrie -------------------------------------- */

  // De drie begrippen krijgen elk hun eigen figuur bij hun definitie. De
  // tekenlogica is gedeeld, maar een leerling schakelt hier niet tussen
  // getransponeerd, symmetrisch en antisymmetrisch.
  function transponeerBouwer(start) {
    return function (ctx) {
      var wb = maakWerkblad(ctx);
      var VOORBEELDEN = [
        {
          naam: "Willekeurig",
          M: willekeurigeMatrix(3, 2),
          soort: "Een 3×2-matrix wordt een 2×3-matrix."
        },
        {
          naam: "Symmetrisch",
          M: [[2, 1, 4], [1, 3, 0], [4, 0, 5]],
          soort: "Aᵀ = A: deze matrix is symmetrisch."
        },
        {
          naam: "Antisymmetrisch",
          M: [[0, 2, -1], [-2, 0, 3], [1, -3, 0]],
          soort: "Aᵀ = −A: deze matrix is antisymmetrisch. " +
            "Op de hoofddiagonaal kan dan enkel 0 staan."
        }
      ];

      var st = {
        keuze: start, bron: "A", index: 1, rij: 1, kolom: 1, gekozen: false
      };

      function wijzigA() {
        var vb = VOORBEELDEN[st.keuze];
        var n;
        var M;
        if (st.keuze === 1) {
          n = Math.floor(Math.random() * 3) + 2;
          M = willekeurigeMatrix(n, n);
          for (var i = 0; i < n; i++) {
            for (var j = i + 1; j < n; j++) M[j][i] = M[i][j];
          }
          vb.M = M;
        } else if (st.keuze === 2) {
          n = Math.floor(Math.random() * 3) + 2;
          M = nulmatrix(n, n);
          for (var r = 0; r < n; r++) {
            for (var k = r + 1; k < n; k++) {
              M[r][k] = willekeurigGetal();
              M[k][r] = -M[r][k];
            }
          }
          vb.M = M;
        } else {
          vb.M = willekeurigeMatrix(
            Math.floor(Math.random() * 3) + 2,
            Math.floor(Math.random() * 3) + 2
          );
        }
        st.bron = "A";
        st.index = 1;
        st.rij = 1;
        st.kolom = 1;
        st.gekozen = false;
        werkBij();
      }

      function A() { return VOORBEELDEN[st.keuze].M; }
      function AT() { return getransponeerde(A()); }

      var bord = matrixBord(ctx);

      var links = wb.matrix(bord, {
        rijen: function () { return A().length; },
        kolommen: function () { return A()[0].length; },
        maxrijen: 4, maxkolommen: 4,
        celbreedte: 1.2,
        x: function () { return st.xA; },
        y: 0,
        waarde: function (i, j) { return net(String(A()[i - 1][j - 1])); }
      });
      var rechts = wb.matrix(bord, {
        rijen: function () { return AT().length; },
        kolommen: function () { return AT()[0].length; },
        maxrijen: 4, maxkolommen: 4,
        celbreedte: 1.2,
        x: function () { return st.xT; },
        y: 0,
        zichtbaar: function () { return start === 0; },
        waarde: function (i, j) { return net(String(AT()[i - 1][j - 1])); }
      });

      var merkenA = [];
      var merkenT = [];
      for (var mr = 1; mr <= 4; mr++) {
        for (var mk = 1; mk <= 4; mk++) {
          merkenA.push({ rij: mr, kolom: mk, merk: links.markeer("secante") });
          merkenT.push({ rij: mr, kolom: mk, merk: rechts.markeer("punt") });
        }
      }

      wb.tekst(bord,
        function () { return links.links() - 0.45; }, 0,
        "A =", "zwak", { factor: 1.05, anchorX: "right" });
      wb.tekst(bord,
        function () { return rechts.links() - 0.45; }, 0,
        "Aᵀ =", "zwak", {
          factor: 1.05, anchorX: "right",
          visible: function () { return start === 0; }
        });
      wb.tekst(bord,
        function () { return st.xA + links.volleBreedte() / 2 + 0.65; }, 0,
        "⇒", "zwak", {
          factor: 1.4, visible: function () { return start === 0; }
        });

      wb.tekst(bord,
        0, function () {
          return -Math.max(links.hoogte(), rechts.hoogte()) / 2 - 1.1;
        },
        function () { return VOORBEELDEN[st.keuze].soort; }, "tekst",
        { factor: 0.92 });

      function totaleBreedte() {
        return start !== 0 ? links.volleBreedte() + 1.8 :
          links.volleBreedte() + rechts.volleBreedte() + 4.0;
      }

      wb.venster(bord, function () {
        return [totaleBreedte() + 1.2,
                Math.max(links.hoogte(), rechts.hoogte()) + 3.4];
      });

      function herplaats() {
        if (start !== 0) {
          st.xA = 0.35;
          return;
        }
        var b = totaleBreedte();
        st.xA = -b / 2 + 0.8 + links.volleBreedte() / 2;
        st.xT = b / 2 - rechts.volleBreedte() / 2;
      }

      function boodschap() {
        if (start !== 0) {
          if (!st.gekozen) {
            return "Klik op een element van A en vergelijk het met zijn " +
              "spiegelbeeld over de hoofddiagonaal. " +
              VOORBEELDEN[st.keuze].soort;
          }
          return el("a", st.rij, st.kolom) +
            (start === 1 ? " = " : " = −") +
            el("a", st.kolom, st.rij) + ". " +
            VOORBEELDEN[st.keuze].soort;
        }
        if (!st.gekozen) {
          return "Selecteer een rij van A of van Aᵀ. De volledige rij wordt " +
            "de overeenkomstige kolom in de andere matrix. " +
            VOORBEELDEN[st.keuze].soort;
        }
        return "Rij " + st.index + " van " + st.bron + " wordt kolom " +
          st.index + " van " + (st.bron === "A" ? "Aᵀ" : "A") + ". " +
          VOORBEELDEN[st.keuze].soort;
      }

      function werkBij() {
        var M = A();
        var T = AT();
        st.index = Math.min(st.index, st.bron === "A" ? M.length : T.length);
        if (volgensRijKnop) {
          volgensRijKnop.setAttribute("aria-pressed", String(st.bron === "A"));
          volgensKolomKnop.setAttribute("aria-pressed", String(st.bron === "AT"));
        }
        merkenA.forEach(function (cel) {
          var toon = start !== 0 ? st.gekozen &&
            ((cel.rij === st.rij && cel.kolom === st.kolom) ||
             (cel.rij === st.kolom && cel.kolom === st.rij)) :
            st.gekozen && (st.bron === "A" ?
              cel.rij === st.index && cel.kolom <= M[0].length :
              cel.kolom === st.index && cel.rij <= M.length);
          if (toon) cel.merk.zet(cel.rij, cel.kolom);
          else cel.merk.verberg();
        });
        merkenT.forEach(function (cel) {
          var toon = start === 0 && st.gekozen && (st.bron === "AT" ?
            cel.rij === st.index && cel.kolom <= T[0].length :
            cel.kolom === st.index && cel.rij <= T.length);
          if (toon) cel.merk.zet(cel.rij, cel.kolom);
          else cel.merk.verberg();
        });
        herplaats();
        wb.pas();
        ctx.toon(boodschap());
      }

      bord.on("down", function (e) {
        var p = klikPunt(bord, e);
        if (!p) return;
        var cel = links.celVan(p[0], p[1]);
        if (cel) {
          if (start !== 0) {
            st.rij = cel.rij;
            st.kolom = cel.kolom;
            st.gekozen = true;
            werkBij();
            return;
          }
          st.bron = "A";
          st.index = cel.rij;
        } else {
          cel = rechts.celVan(p[0], p[1]);
          if (!cel) return;
          st.bron = "AT";
          st.index = cel.rij;
        }
        st.gekozen = true;
        werkBij();
      });

      var volgensRijKnop;
      var volgensKolomKnop;
      if (start === 0) {
        volgensRijKnop = ctx.knop("Volgens rij", function () {
          var M = A();
          st.index = st.gekozen && st.bron === "A" && st.index < M.length ?
            st.index + 1 : 1;
          st.bron = "A";
          st.gekozen = true;
          werkBij();
        });

        volgensKolomKnop = ctx.knop("Volgens kolom", function () {
          var T = AT();
          st.index = st.gekozen && st.bron === "AT" && st.index < T.length ?
            st.index + 1 : 1;
          st.bron = "AT";
          st.gekozen = true;
          werkBij();
        });
      }

      ctx.knop("Wijzig A", wijzigA);

      function herstel() {
        st.keuze = start;
        st.bron = "A";
        st.index = 1;
        st.rij = 1;
        st.kolom = 1;
        st.gekozen = false;
        werkBij();
      }

      wijzigA();
      return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
    };
  }

  G.registreer("transponeren", transponeerBouwer(0));
  G.registreer("symmetrie", transponeerBouwer(1));
  G.registreer("antisymmetrie", transponeerBouwer(2));


  /* --- 4. De som van twee matrices --------------------------------------- */

  G.registreer("matrix-som", function (ctx) {
    var wb = maakWerkblad(ctx);
    var PAREN = [
      {
        naam: "Zelfde orde",
        A: willekeurigeMatrix(2, 3),
        B: willekeurigeMatrix(2, 3)
      },
      {
        naam: "Verschillende orde",
        A: willekeurigeMatrix(2, 2),
        B: willekeurigeMatrix(1, 4)
      }
    ];
    var st = { keuze: 0, rij: 0, kolom: 0, alles: false };

    function A() { return PAREN[st.keuze].A; }
    function B() { return PAREN[st.keuze].B; }
    function past() {
      return A().length === B().length && A()[0].length === B()[0].length;
    }
    function C() { return past() ? som(A(), B()) : null; }

    var bord = matrixBord(ctx);
    var d = maakDrieluik(ctx, wb, bord, {
      teken: "+",
      celbreedte: 1.15,
      A: {
        rijen: function () { return A().length; },
        kolommen: function () { return A()[0].length; },
        maxrijen: 2, maxkolommen: 4, naam: "A",
        waarde: function (i, j) { return net(String(A()[i - 1][j - 1])); }
      },
      B: {
        rijen: function () { return B().length; },
        kolommen: function () { return B()[0].length; },
        maxrijen: 2, maxkolommen: 4, naam: "B",
        waarde: function (i, j) { return net(String(B()[i - 1][j - 1])); }
      },
      C: {
        rijen: function () { return past() ? A().length : 1; },
        kolommen: function () { return past() ? A()[0].length : 1; },
        maxrijen: 2, maxkolommen: 4, naam: "A + B",
        zichtbaar: past,
        leeg: "bestaat niet",
        waarde: function (i, j) {
          var res = C();
          if (!res) return "";
          if (st.alles || (i === st.rij && j === st.kolom)) {
            return net(String(res[i - 1][j - 1]));
          }
          return "·";
        }
      }
    });

    var merkA = d.A.markeer("secante");
    var merkB = d.B.markeer("punt");
    var merkC = d.C.markeer("raaklijn");

    wb.venster(bord, function () {
      return [d.breedte() + 1.2, d.hoogte() + 2.6];
    });

    function werkBij() {
      if (st.rij && past()) {
        merkA.zet(st.rij, st.kolom);
        merkB.zet(st.rij, st.kolom);
        merkC.zet(st.rij, st.kolom);
      } else {
        merkA.verberg();
        merkB.verberg();
        merkC.verberg();
      }
      d.herplaats();
      wb.pas();
      if (!past()) {
        ctx.toon("A is een " + A().length + "×" + A()[0].length +
          "-matrix en B een " + B().length + "×" + B()[0].length +
          "-matrix. Optellen gebeurt element per element, dus matrices van " +
          "een verschillende orde kunnen niet opgeteld worden.");
        return;
      }
      if (!st.rij) {
        ctx.toon("Klik op een element van de som, of stap met de knop. " +
          "Twee matrices van dezelfde orde tel je op door de " +
          "overeenkomstige elementen op te tellen.");
        return;
      }
      var a = A()[st.rij - 1][st.kolom - 1];
      var b = B()[st.rij - 1][st.kolom - 1];
      ctx.toon(el("c", st.rij, st.kolom) + " = " +
        el("a", st.rij, st.kolom) + " + " + el("b", st.rij, st.kolom) +
        " = " + net(String(a)) + " + " + net(String(b)) +
        " = " + net(String(a + b)) + ".");
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p || !past()) return;
      var cel = d.A.celVan(p[0], p[1]) || d.B.celVan(p[0], p[1]) ||
                d.C.celVan(p[0], p[1]);
      if (!cel) return;
      st.rij = cel.rij;
      st.kolom = cel.kolom;
      werkBij();
    });

    ctx.knop("Volgend element", function () {
      if (!past()) return;
      if (!st.rij) {
        st.rij = 1;
        st.kolom = 1;
      } else if (st.kolom < A()[0].length) {
        st.kolom += 1;
      } else {
        st.kolom = 1;
        st.rij = st.rij < A().length ? st.rij + 1 : 1;
      }
      werkBij();
    });

    var knopAlles = ctx.knop("Volledige som tonen", function (knop) {
      st.alles = !st.alles;
      knop.textContent = st.alles ? "Som weer verbergen" : "Volledige som tonen";
      knop.setAttribute("aria-pressed", String(st.alles));
      werkBij();
    });
    knopAlles.setAttribute("aria-pressed", "false");

    ctx.knop("Wijzig A", function () {
      vulWillekeurig(A());
      st.rij = 0;
      st.kolom = 0;
      st.alles = false;
      knopAlles.textContent = "Volledige som tonen";
      knopAlles.setAttribute("aria-pressed", "false");
      werkBij();
    });
    ctx.knop("Wijzig B", function () {
      vulWillekeurig(B());
      st.rij = 0;
      st.kolom = 0;
      st.alles = false;
      knopAlles.textContent = "Volledige som tonen";
      knopAlles.setAttribute("aria-pressed", "false");
      werkBij();
    });

    var keuzeknoppen = PAREN.map(function (paar, i) {
      var knop = ctx.knop(paar.naam, function () {
        st.keuze = i;
        st.rij = 0;
        st.kolom = 0;
        keuzeknoppen.forEach(function (ander, k) {
          ander.setAttribute("aria-pressed", String(k === i));
        });
        werkBij();
      });
      knop.setAttribute("aria-pressed", String(i === 0));
      return knop;
    });

    function herstel() {
      st.keuze = 0;
      st.rij = 0;
      st.kolom = 0;
      st.alles = false;
      knopAlles.textContent = "Volledige som tonen";
      knopAlles.setAttribute("aria-pressed", "false");
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === 0));
      });
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 5. Een matrix maal een getal -------------------------------------- */

  // Hier hoort een schuifknop: het is net de beweging van r die toont dat elk
  // element mee verandert, en dat r = 1 en r = -1 geen aparte regels zijn maar
  // twee standen van dezelfde bewerking.
  G.registreer("scalair-veelvoud", function (ctx) {
    var wb = maakWerkblad(ctx);
    var A = willekeurigeMatrix(3, 2);
    var st = { rij: 0, kolom: 0 };

    var bord = matrixBord(ctx);

    var schuif = bord.create("slider",
      [[-2.8, -2.3], [2.2, -2.3], [-3, 4.5, 5]], {
        name: "r", snapWidth: 0.5, withTicks: false,
        size: 6, precision: 1, withLabel: false
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");
    if (schuif.label) ctx.stijl(schuif.label, "tekst");
    bord.create("button", [2.75, -2.3, "Wijzig A", wijzigA], {
      fixed: true, highlight: false
    });

    function r() { return Math.round(schuif.Value() * 2) / 2; }

    var links = wb.matrix(bord, {
      rijen: 3, kolommen: 2, celbreedte: 1.2,
      x: function () { return st.xA; }, y: 0.6,
      waarde: function (i, j) { return net(String(A[i - 1][j - 1])); }
    });
    var rechts = wb.matrix(bord, {
      rijen: 3, kolommen: 2, celbreedte: 1.4,
      x: function () { return st.xR; }, y: 0.6,
      waarde: function (i, j) {
        return net(ctx.getal(r() * A[i - 1][j - 1], 1));
      }
    });

    var merkA = links.markeer("secante");
    var merkR = rechts.markeer("raaklijn");

    wb.tekst(bord, function () { return links.links() - 0.35; }, 0.6,
      "A =", "tekst", { factor: 1.05, anchorX: "right" });
    wb.tekst(bord, function () { return st.xMaal; }, 0.6,
      "⇒", "zwak", { factor: 1.35 });
    wb.tekst(bord, function () { return rechts.links() - 0.35; }, 0.6,
      "rA =", "tekst", { factor: 1.05, anchorX: "right" });
    wb.tekst(bord, -3.2, -2.3,
      function () { return "r = " + net(ctx.getal(r(), 1)); }, "punt",
      { factor: 1, anchorX: "right" });

    function breedte() {
      return links.volleBreedte() + rechts.volleBreedte() + 3.4;
    }

    wb.venster(bord, function () {
      return [breedte() + 2.2, links.hoogte() + 3.4];
    });

    function herplaats() {
      var b = breedte();
      st.xA = -b / 2 + links.volleBreedte() / 2;
      st.xR = b / 2 - rechts.volleBreedte() / 2;
      st.xMaal = (st.xA + links.volleBreedte() / 2 +
                  st.xR - rechts.volleBreedte() / 2) / 2;
    }

    function werkBij() {
      if (st.rij) {
        merkA.zet(st.rij, st.kolom);
        merkR.zet(st.rij, st.kolom);
      } else {
        merkA.verberg();
        merkR.verberg();
      }
      herplaats();
      wb.pas();
      var extra = "";
      if (Math.abs(r() - 1) < 1e-9) extra = " Voor r = 1 verandert er niets: 1 · A = A.";
      else if (Math.abs(r() + 1) < 1e-9) extra = " Voor r = −1 krijgen we de tegengestelde matrix −A.";
      else if (Math.abs(r()) < 1e-9) extra = " Voor r = 0 blijft de nulmatrix O over.";
      var kern = "Elk element wordt met r vermenigvuldigd: r · (aᵢⱼ) = (r aᵢⱼ).";
      if (st.rij) {
        var a = A[st.rij - 1][st.kolom - 1];
        kern = "r · " + el("a", st.rij, st.kolom) + " = " +
          net(ctx.getal(r(), 1)) + " · " + a + " = " +
          net(ctx.getal(r() * a, 1)) + ".";
      }
      ctx.toon("r = " + net(ctx.getal(r(), 1)) + ". " + kern + extra);
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = links.celVan(p[0], p[1]) || rechts.celVan(p[0], p[1]);
      if (!cel) return;
      st.rij = cel.rij;
      st.kolom = cel.kolom;
      werkBij();
    });

    bord.on("update", werkBij);

    function zetR(nieuw) {
      schuif.setValue(nieuw);
      bord.update();
      werkBij();
    }

    function wijzigA() {
      vulWillekeurig(A);
      st.rij = 0;
      st.kolom = 0;
      werkBij();
    }

    function herstel() {
      st.rij = 0;
      st.kolom = 0;
      zetR(4.5);
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 6. Matrices als vectoren ----------------------------------------- */

  // Voor 2×1-matrices is de identificatie met R² letterlijk tekenbaar. De
  // leerling versleept A en B; de parallellogramregel en het scalaire
  // veelvoud bewegen mee. De formule erboven legt uit dat een m×n-matrix op
  // dezelfde manier gewoon mn geordende coördinaten heeft.
  G.registreer("vectorruimte-matrices", function (ctx) {
    var bord = ctx.maakBord({
      begrenzing: [-4, 5, 8, -3],
      raster: true, assen: false, gelijkeschaal: false
    });
    assenMet(ctx, bord, "x₁", "x₂");

    function maakSleepPunt(x, y, naam, rol, label) {
      return ctx.stijl(bord.create("point", [x, y], {
        name: naam, size: 3, showInfobox: false,
        snapToGrid: true, snapSizeX: 0.1, snapSizeY: 0.1,
        precision: { touch: 40, mouse: 9 },
        label: { offset: label }
      }), rol);
    }

    var A = maakSleepPunt(2, 1, "A", "punt", [10, -16]);
    var B = maakSleepPunt(-1, 2, "B", "secante", [-20, 10]);

    // De som volgt de gekozen A en B en kan niet los versleept worden.
    var som = ctx.stijl(bord.create("point", [
      function () { return A.X() + B.X(); },
      function () { return A.Y() + B.Y(); }
    ], {
      name: "A+B", size: 3, fixed: true, showInfobox: false,
      label: { offset: [10, 10] }
    }), "afgeleide");

    var schaalrechte = ctx.stijl(bord.create("line", [[0, 0], A], {
      strokeWidth: 1.2, dash: 2, fixed: true, highlight: false
    }), "zwak");

    var schuif = bord.create("slider",
      [[-2.4, -2.3], [3.0, -2.3], [-1, 2, 2.5]], {
        name: "r", snapWidth: 0.1, withTicks: false,
        size: 6, precision: 1, withLabel: true,
        label: { offset: [-10, -20] }
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");
    if (schuif.label) ctx.stijl(schuif.label, "tekst");

    function r() { return Math.round(schuif.Value() * 10) / 10; }

    // rA is een glijpunt op de rechte door A. Verslepen verandert r; de
    // schuifregelaar en het exacte halve veelvoud volgen die beweging mee.
    var schaalbeeld = ctx.stijl(bord.create("glider", [4, 2, schaalrechte], {
      name: "rA", size: 3, fixed: false, showInfobox: false,
      precision: { touch: 40, mouse: 9 },
      label: { offset: [10, -16] }
    }), "raaklijn");

    function pijl(naar, rol, dikte) {
      return ctx.stijl(bord.create("arrow", [[0, 0], naar], {
        strokeWidth: dikte || 2.5, fixed: true, highlight: false
      }), rol);
    }

    // Eerst de schaalrechte en het parallellogram, daarna de vier pijlen.
    ctx.stijl(bord.create("segment", [A, som], {
      strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
    }), "hulp");
    ctx.stijl(bord.create("segment", [B, som], {
      strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
    }), "hulp");
    pijl(schaalbeeld, "raaklijn");
    pijl(A, "punt");
    pijl(B, "secante");
    pijl(som, "afgeleide", 3);

    function zet(punt, x, y) {
      punt.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
    }

    function begrens(punt, isA) {
      var x = Math.max(isA ? -1.5 : -2.4,
        Math.min(isA ? 3 : 4.4, punt.X()));
      var y = Math.max(isA ? -1 : -1.8,
        Math.min(isA ? 1.8 : 2.8, punt.Y()));
      if (isA && Math.abs(x) < 0.01 && Math.abs(y) < 0.01) x = 0.5;
      if (x !== punt.X() || y !== punt.Y()) zet(punt, x, y);
    }

    function zetSchaalbeeld() {
      zet(schaalbeeld, r() * A.X(), r() * A.Y());
    }

    A.on("drag", function () {
      begrens(A, true);
      zetSchaalbeeld();
    });
    B.on("drag", function () { begrens(B, false); });
    schuif.on("drag", zetSchaalbeeld);
    schaalbeeld.on("drag", function () {
      var noemer = A.X() * A.X() + A.Y() * A.Y();
      var nieuw = (schaalbeeld.X() * A.X() + schaalbeeld.Y() * A.Y()) / noemer;
      nieuw = Math.max(-1, Math.min(2.5, Math.round(nieuw * 10) / 10));
      schuif.setValue(nieuw);
      zetSchaalbeeld();
    });

    function paar(x, y) {
      return "(" + ctx.getal(x, 1) + ", " + ctx.getal(y, 1) + ")ᵀ";
    }

    function werkBij() {
      begrens(A, true);
      begrens(B, false);
      ctx.toon(
        "A = " + paar(A.X(), A.Y()) +
        ", B = " + paar(B.X(), B.Y()) +
        ", A+B = " + paar(som.X(), som.Y()) +
        ". r = " + ctx.getal(r(), 1) +
        " en rA = " + paar(schaalbeeld.X(), schaalbeeld.Y()) + "."
      );
    }
    bord.on("update", werkBij);

    function herstel() {
      zet(A, 2, 1);
      zet(B, -1, 2);
      schuif.setValue(2);
      zetSchaalbeeld();
      bord.update();
      werkBij();
    }

    werkBij();
    return { reset: herstel };
  });

  /* --- Bouwsteen: het product van twee matrices -------------------------- */

  // Het hart van het hoofdstuk. Elk element van het product is een rij maal
  // een kolom, en dat is precies wat op papier niet beweegt: hier licht bij
  // elk element van C de rij van A en de kolom van B op, met de uitgeschreven
  // som eronder.
  function maakProductFiguur(ctx, opties) {
    var wb = maakWerkblad(ctx);
    var st = { keuze: 0, rij: 0, kolom: 0, klaar: [], volledig: false };
    var PAREN = opties.paren;

    function paar() { return PAREN[st.keuze]; }
    function A() { return paar().A; }
    function B() { return paar().B; }
    function past() { return A()[0].length === B().length; }
    function C() { return past() ? product(A(), B()) : null; }
    function symbolisch() { return paar().symbolisch === true; }

    function gedaan(i, j) {
      return st.volledig || st.klaar.indexOf(i + "," + j) >= 0;
    }

    var bord = matrixBord(ctx);
    var d = maakDrieluik(ctx, wb, bord, {
      teken: "·",
      celbreedte: opties.celbreedte || 1.25,
      y: 0.35,
      A: {
        rijen: function () { return A().length; },
        kolommen: function () { return A()[0].length; },
        maxrijen: 5, maxkolommen: 5,
        naam: function () {
          return (paar().naamA || "A") + " (" + A().length + "×" +
            A()[0].length + ")";
        },
        waarde: function (i, j) {
          return symbolisch() ? el(paar().letterA || "a", i, j)
                              : net(ctx.getal(A()[i - 1][j - 1], 2));
        }
      },
      B: {
        rijen: function () { return B().length; },
        kolommen: function () { return B()[0].length; },
        maxrijen: 5, maxkolommen: 5,
        naam: function () {
          return (paar().naamB || "B") + " (" + B().length + "×" +
            B()[0].length + ")";
        },
        waarde: function (i, j) {
          return symbolisch() ? el(paar().letterB || "b", i, j)
                              : net(ctx.getal(B()[i - 1][j - 1], 2));
        }
      },
      C: {
        rijen: function () { return past() ? A().length : 1; },
        kolommen: function () { return past() ? B()[0].length : 1; },
        maxrijen: 5, maxkolommen: 5,
        zichtbaar: past,
        naam: function () {
          if (!past()) return "";
          return (paar().naamC || "A · B") + " (" + A().length +
            "×" + B()[0].length + ")";
        },
        waarde: function (i, j) {
          if (symbolisch()) return el("c", i, j);
          var res = C();
          if (!res) return "";
          if (gedaan(i, j) || (i === st.rij && j === st.kolom)) {
            return net(ctx.getal(res[i - 1][j - 1], 2));
          }
          return "·";
        }
      }
    });

    var merkA = d.A.markeer("secante");
    var merkB = d.B.markeer("punt");
    var merkC = d.C.markeer("raaklijn");

    // De binnenste afmetingen: de vraag of het product bestaat.
    wb.tekst(bord,
      function () { return d.A.X() + d.A.breedte() / 2 + 0.55; },
      function () { return d.A.boven() - d.A.hoogte() - 0.75; },
      function () {
        return A()[0].length + (past() ? " = " : " ≠ ") + B().length;
      },
      "afgeleide", { factor: 0.95 });

    var berekening = wb.tekst(bord, 0,
      function () { return -d.hoogte() / 2 - 0.8; },
      function () { return st.uitleg || ""; }, "tekst", { factor: 0.95 });

    wb.venster(bord, function () {
      return [d.breedte() + 1.2, d.hoogte() + 3.4];
    });

    function somTekst(i, j) {
      var termen = [];
      var res = 0;
      for (var k = 1; k <= A()[0].length; k++) {
        var a = A()[i - 1][k - 1];
        var b = B()[k - 1][j - 1];
        res += a * b;
        termen.push(haakjes(a) + "·" + haakjes(b));
      }
      return {
        formule: el("c", i, j) + " = " + termen.join(" + ") + " = " +
          net(ctx.getal(res, 2)),
        symbolen: el("c", i, j) + " = " +
          (function () {
            var s = [];
            for (var k = 1; k <= A()[0].length; k++) {
              s.push(el(paar().letterA || "a", i, k) +
                     el(paar().letterB || "b", k, j));
            }
            return s.join(" + ");
          }())
      };
    }

    function werkBij() {
      if (past() && st.rij) {
        merkA.zet(st.rij, 0);
        merkB.zet(0, st.kolom);
        merkC.zet(st.rij, st.kolom);
      } else {
        merkA.verberg();
        merkB.verberg();
        merkC.verberg();
      }
      if (!past()) {
        st.uitleg = "A · B bestaat niet";
      } else if (!st.rij) {
        st.uitleg = "";
      } else {
        var s = somTekst(st.rij, st.kolom);
        st.uitleg = symbolisch() ? s.symbolen : s.formule;
      }
      d.herplaats();
      wb.pas();
      ctx.toon(boodschap());
    }

    function boodschap() {
      var mA = A().length + "×" + A()[0].length;
      var mB = B().length + "×" + B()[0].length;
      var nA = paar().naamA || "A";
      var nB = paar().naamB || "B";
      var nC = paar().naamC || "A · B";
      if (!past()) {
        return nA + " is een " + mA + "-matrix en " + nB + " een " + mB +
          "-matrix. De binnenste afmetingen verschillen (" + A()[0].length +
          " ≠ " + B().length + "), dus " + nC + " bestaat niet.";
      }
      var basis = nA + " is een " + mA + "-matrix en " + nB + " een " + mB +
        "-matrix. De binnenste afmetingen zijn gelijk, dus " + nC +
        " bestaat en is een " + A().length + "×" + B()[0].length + "-matrix.";
      if (!st.rij) {
        return basis + " Klik op een element van het product, of stap met de knop.";
      }
      var s = somTekst(st.rij, st.kolom);
      return basis + " Rij " + st.rij + " van " + nA + " maal kolom " +
        st.kolom + " van " + nB + " geeft " + (symbolisch() ? s.symbolen : s.formule) + ".";
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p || !past()) return;
      var cel = d.C.celVan(p[0], p[1]);
      if (!cel) {
        var celA = d.A.celVan(p[0], p[1]);
        var celB = d.B.celVan(p[0], p[1]);
        if (celA) cel = { rij: celA.rij, kolom: st.kolom || 1 };
        else if (celB) cel = { rij: st.rij || 1, kolom: celB.kolom };
        else return;
      }
      kies(cel.rij, cel.kolom);
    });

    function kies(i, j) {
      if (st.rij && !gedaan(st.rij, st.kolom)) {
        st.klaar.push(st.rij + "," + st.kolom);
      }
      st.rij = i;
      st.kolom = j;
      werkBij();
    }

    ctx.knop("Volgend element", function () {
      if (!past()) return;
      if (!st.rij) return kies(1, 1);
      if (st.kolom < B()[0].length) return kies(st.rij, st.kolom + 1);
      if (st.rij < A().length) return kies(st.rij + 1, 1);
      kies(1, 1);
    });

    // Een schakelaar: aan blijft het volledige product staan, ook na Wijzig
    // of een ander paar; uit komen enkel de al berekende elementen terug.
    var volledigKnop = ctx.knop("Volledig product", function () {
      st.volledig = !st.volledig;
      zetKnoppen();
      werkBij();
    });

    if (opties.wijzigbaar !== false) {
      // Zonder eigen wijzigA en wijzigB blijft de orde staan en krijgen enkel
      // de getallen een nieuwe waarde; met letters valt er dan niets te zien.
      ctx.knop("Wijzig A", function () {
        if (opties.wijzigA) opties.wijzigA();
        else if (symbolisch()) return;
        else vulWillekeurig(A());
        begin();
        werkBij();
      });
      ctx.knop("Wijzig B", function () {
        if (opties.wijzigB) opties.wijzigB();
        else if (symbolisch()) return;
        else vulWillekeurig(B());
        begin();
        werkBij();
      });
    }

    function begin() {
      st.rij = 0;
      st.kolom = 0;
      st.klaar = [];
    }

    // Twee schakelaars in plaats van een knop per paar: de paren staan dan
    // in de volgorde getallen, letters, gewisseld met getallen, gewisseld
    // met letters.
    var schakelaars = opties.schakelaars ? opties.schakelaars.map(function (naam, bit) {
      var knop = ctx.knop(naam, function () {
        st.keuze ^= 1 << bit;
        begin();
        zetKnoppen();
        werkBij();
      });
      return knop;
    }) : [];

    var keuzeknoppen = opties.schakelaars ? [] : PAREN.map(function (p, i) {
      return ctx.knop(p.naam, function () {
        st.keuze = i;
        begin();
        zetKnoppen();
        werkBij();
      });
    });

    function zetKnoppen() {
      volledigKnop.setAttribute("aria-pressed", String(st.volledig));
      schakelaars.forEach(function (knop, bit) {
        knop.setAttribute("aria-pressed", String((st.keuze & (1 << bit)) !== 0));
      });
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === st.keuze));
      });
    }

    function herstel() {
      if (opties.herstel) opties.herstel();
      st.keuze = 0;
      st.volledig = false;
      begin();
      zetKnoppen();
      werkBij();
    }

    zetKnoppen();
    werkBij();
    return {
      reset: herstel, herschaal: wb.pas, kleur: wb.kleur,
      bord: bord, berekening: berekening
    };
  }

  /* --- 6. Het product, algemeen ------------------------------------------ */

  // Wijzig A en Wijzig B kiezen ook een nieuwe orde, van 1×1 tot 3×3. Meestal
  // passen de binnenste afmetingen, want het gaat hier om het uitrekenen van
  // de elementen; af en toe niet, en dan bestaat het product niet. Wissel en
  // Letters tonen altijd dezelfde A en B.
  G.registreer("matrixproduct", function (ctx) {
    var A, B;
    var paren = [];

    function orde() { return Math.floor(Math.random() * 3) + 1; }

    function zet(nieuwA, nieuwB) {
      A = nieuwA;
      B = nieuwB;
      var wissel = {
        naamA: "B", naamB: "A", naamC: "B · A", letterA: "b", letterB: "a"
      };
      paren[0] = { A: A, B: B };
      paren[1] = {
        A: nulmatrix(A.length, A[0].length), B: nulmatrix(B.length, B[0].length),
        symbolisch: true
      };
      paren[2] = Object.assign({ A: B, B: A }, wissel);
      paren[3] = Object.assign({ symbolisch: true, A: paren[1].B, B: paren[1].A }, wissel);
    }

    zet(willekeurigeMatrix(2, 3), willekeurigeMatrix(3, 2));

    return maakProductFiguur(ctx, {
      schakelaars: ["Letters", "Wissel"],
      paren: paren,
      wijzigA: function () {
        var kolommen = Math.random() < 0.75 ? B.length : orde();
        zet(willekeurigeMatrix(orde(), kolommen), B);
      },
      wijzigB: function () {
        var rijen = Math.random() < 0.75 ? A[0].length : orde();
        zet(A, willekeurigeMatrix(rijen, orde()));
      },
      herstel: function () {
        zet(willekeurigeMatrix(2, 3), willekeurigeMatrix(3, 2));
      }
    });
  });

  /* --- 7. Bestaat het product? ------------------------------------------- */

  G.registreer("product-orde", function (ctx) {
    var wb = maakWerkblad(ctx);
    var st = { m: 2, n: 3, p: 3, q: 2, abstract: false };

    function past() { return st.abstract || st.n === st.p; }
    function dimensie(waarde, soort) {
      return "<span class=\"matrixdimensie-" + soort + "\">" + waarde +
        "</span>";
    }
    function abstractElement(letter, i, j, laatsteRij, laatsteKolom) {
      if (i === 3 && j === 3) return "⋱";
      if (i === 3) return "⋮";
      if (j === 3) return "⋯";
      return letter + (i === 4 ? laatsteRij : index(i, ONDER)) +
        (j === 4 ? laatsteKolom : index(j, ONDER));
    }

    var bord = matrixBord(ctx);
    var d = maakDrieluik(ctx, wb, bord, {
      teken: "·",
      celbreedte: 1.35,
      A: {
        rijen: function () { return st.abstract ? 4 : st.m; },
        kolommen: function () { return st.abstract ? 4 : st.n; },
        maxrijen: 4, maxkolommen: 4,
        naam: function () {
          return "A (" + dimensie(st.abstract ? "m" : st.m, "buiten-rijen") +
            "×" + dimensie(st.abstract ? "n" : st.n, "binnen") + ")";
        },
        waarde: function (i, j) {
          return st.abstract ? abstractElement("a", i, j, "ₘ", "ₙ")
                             : el("a", i, j);
        }
      },
      B: {
        rijen: function () { return st.abstract ? 4 : st.p; },
        kolommen: function () { return st.abstract ? 4 : st.q; },
        maxrijen: 4, maxkolommen: 4,
        naam: function () {
          return "B (" + dimensie(st.abstract ? "n" : st.p, "binnen") +
            "×" + dimensie(st.abstract ? "p" : st.q, "buiten-kolommen") +
            ")";
        },
        waarde: function (i, j) {
          return st.abstract ? abstractElement("b", i, j, "ₙ", "ₚ")
                             : el("b", i, j);
        }
      },
      C: {
        rijen: function () { return st.abstract ? 4 : (past() ? st.m : 1); },
        kolommen: function () { return st.abstract ? 4 : (past() ? st.q : 1); },
        maxrijen: 4, maxkolommen: 4,
        zichtbaar: past,
        naam: function () {
          return past() ? "A · B (" +
            dimensie(st.abstract ? "m" : st.m, "buiten-rijen") + "×" +
            dimensie(st.abstract ? "p" : st.q, "buiten-kolommen") + ")" : "";
        },
        waarde: function (i, j) {
          return st.abstract ? abstractElement("c", i, j, "ₘ", "ₚ")
                             : el("c", i, j);
        }
      }
    });

    wb.tekst(bord, 0, function () { return -d.hoogte() / 2 - 0.8; },
      function () {
        if (st.abstract) {
          return "binnenste afmetingen: n = n, dus het product bestaat";
        }
        return "binnenste afmetingen: " + st.n +
          (past() ? " = " : " ≠ ") + st.p +
          (past() ? ", dus het product bestaat"
                  : ", dus het product bestaat niet");
      }, "tekst", { factor: 0.95 });

    wb.venster(bord, function () {
      return [d.breedte() + 1.2, d.hoogte() + 3.2];
    });

    function werkBij() {
      d.herplaats();
      wb.pas();
      if (st.abstract) {
        ctx.toon("A is een m×n-matrix en B een n×p-matrix. De binnenste " +
          "afmetingen n zijn gelijk, dus A · B bestaat en is een " +
          "m×p-matrix: de buitenste afmetingen.");
        return;
      }
      ctx.toon("A is een " + st.m + "×" + st.n + "-matrix, B een " +
        st.p + "×" + st.q + "-matrix. " +
        (past()
          ? "De binnenste afmetingen zijn gelijk (" + st.n + " = " + st.p +
            "), dus A · B bestaat en is een " + st.m + "×" + st.q +
            "-matrix: de buitenste afmetingen."
          : "De binnenste afmetingen verschillen (" + st.n + " ≠ " +
            st.p + "), dus A · B bestaat niet."));
    }

    function pas(sleutel, delta) {
      st.abstract = false;
      st[sleutel] = Math.max(1, Math.min(4, st[sleutel] + delta));
      werkBij();
    }

    ctx.knop("rij(A)++", function () { pas("m", 1); });
    ctx.knop("kol(A)++", function () { pas("n", 1); });
    ctx.knop("rij(B)++", function () { pas("p", 1); });
    ctx.knop("kol(B)++", function () { pas("q", 1); });
    ctx.knop("m × n · n × p", function () {
      st.abstract = true;
      werkBij();
    });
    ctx.knop("rij(A)--", function () { pas("m", -1); });
    ctx.knop("kol(A)--", function () { pas("n", -1); });
    ctx.knop("rij(B)--", function () { pas("p", -1); });
    ctx.knop("kol(B)--", function () { pas("q", -1); });
    ctx.knop("Herstel", herstel);

    function herstel() {
      st.m = 2;
      st.n = 3;
      st.p = 3;
      st.q = 2;
      st.abstract = false;
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 8. Transponeren en vermenigvuldigen ------------------------------- */

  // A is een m×n-matrix en B een n×p-matrix, dus A · B bestaat altijd.
  // Aᵀ · Bᵀ is n×m maal p×n en bestaat enkel als m = p: daarom is m ≠ p.
  // Bᵀ · Aᵀ bestaat dan vanzelf. Wijzig A en Wijzig B kiezen ook een nieuwe
  // orde. Verandert n, dan krijgt de andere matrix evenveel rijen of kolommen
  // erbij of eraf; wat al stond, blijft staan.
  G.registreer("transponeer-product", function (ctx) {
    var A, B;
    var paren = [{ naam: "A · B" }, { naam: "Aᵀ · Bᵀ" }, { naam: "Bᵀ · Aᵀ" }];

    function orde() { return Math.floor(Math.random() * 3) + 1; }

    // Een willekeurige orde van 1 tot 3, verschillend van verboden.
    function ordeBehalve(verboden) {
      var k = Math.floor(Math.random() * 2) + 1;
      return k >= verboden ? k + 1 : k;
    }

    function metOrde(M, m, n) {
      var nieuw = willekeurigeMatrix(m, n);
      for (var i = 0; i < Math.min(m, M.length); i++) {
        for (var j = 0; j < Math.min(n, M[0].length); j++) nieuw[i][j] = M[i][j];
      }
      return nieuw;
    }

    function zet(nieuwA, nieuwB) {
      A = nieuwA;
      B = nieuwB;
      paren[0].A = A;
      paren[0].B = B;
      paren[1].A = getransponeerde(A);
      paren[1].B = getransponeerde(B);
      paren[1].naamA = "Aᵀ"; paren[1].naamB = "Bᵀ"; paren[1].naamC = "Aᵀ · Bᵀ";
      paren[2].A = getransponeerde(B);
      paren[2].B = getransponeerde(A);
      paren[2].naamA = "Bᵀ"; paren[2].naamB = "Aᵀ"; paren[2].naamC = "Bᵀ · Aᵀ";
    }

    function beginstand() {
      zet(willekeurigeMatrix(3, 2), willekeurigeMatrix(2, 1));
    }

    beginstand();

    return maakProductFiguur(ctx, {
      paren: paren,
      wijzigA: function () {
        var n = orde();
        zet(willekeurigeMatrix(ordeBehalve(B[0].length), n),
            metOrde(B, n, B[0].length));
      },
      wijzigB: function () {
        var n = orde();
        zet(metOrde(A, A.length, n),
            willekeurigeMatrix(n, ordeBehalve(A.length)));
      },
      herstel: beginstand
    });
  });

  /* --- 9. De macht van een vierkante matrix ------------------------------ */

  G.registreer("matrixmacht", function (ctx) {
    var wb = maakWerkblad(ctx);
    var VOORBEELDEN = [
      {
        naam: "Willekeurig",
        M: willekeurigeMatrix(2, 2),
        uitleg: "Een gewone vierkante matrix: de machten lopen snel op."
      },
      {
        naam: "Fibonacci",
        M: [[1, 1], [1, 0]],
        uitleg: "In de machten van deze matrix verschijnen de getallen van " +
          "Fibonacci: 1, 1, 2, 3, 5, 8, 13, ..."
      },
      {
        naam: "Eenheidsmatrix I",
        M: [[1, 0], [0, 1]],
        uitleg: "I is het neutraal element: Iᵖ = I voor elke p."
      },
      {
        naam: "Overgangsmatrix",
        M: [[0.6, 0.3], [0.4, 0.7]],
        uitleg: "Bij een overgangsmatrix naderen de machten een vaste " +
          "matrix: de evenwichtstoestand."
      }
    ];
    var st = { keuze: 0, p: 1, xA: 0, xM: 0 };

    function A() { return VOORBEELDEN[st.keuze].M; }
    function Ap() { return machtVan(A(), st.p); }

    var bord = matrixBord(ctx);
    var links = wb.matrix(bord, {
      rijen: 2, kolommen: 2, celbreedte: 1.4,
      x: function () { return st.xA; }, y: 0, naam: "A",
      waarde: function (i, j) { return net(ctx.getal(A()[i - 1][j - 1], 2)); }
    });
    var rechts = wb.matrix(bord, {
      rijen: 2, kolommen: 2, celbreedte: 2.1,
      x: function () { return st.xM; }, y: 0,
      naam: function () { return macht("A", st.p); },
      waarde: function (i, j) { return net(ctx.getal(Ap()[i - 1][j - 1], 2)); }
    });

    wb.tekst(bord, function () { return (st.xA + st.xM) / 2; }, 0,
      function () { return "→"; }, "zwak",
      { factor: 1 });
    wb.tekst(bord, 0, function () { return -links.hoogte() / 2 - 1.2; },
      function () { return VOORBEELDEN[st.keuze].uitleg; }, "tekst",
      { factor: 0.9 });

    function breedte() {
      return links.volleBreedte() + rechts.volleBreedte() + 3;
    }

    wb.venster(bord, function () {
      return [breedte() + 1.2, links.hoogte() + 4];
    });

    function werkBij() {
      var b = breedte();
      st.xA = -b / 2 + links.volleBreedte() / 2;
      st.xM = b / 2 - rechts.volleBreedte() / 2;
      wb.pas();
      ctx.toon(st.p === 0
        ? macht("A", 0) + " is de eenheidsmatrix I. Dat is een afspraak, " +
          "zodat het optellen van de exponenten ook voor p = 0 blijft " +
          "kloppen. " + VOORBEELDEN[st.keuze].uitleg
        : macht("A", st.p) + " is het product van " + st.p +
          " factoren A" + (st.p === 1 ? " (dus A zelf)" : "") + ". " +
          "Enkel bij een vierkante matrix is dat zinvol, want anders passen " +
          "de afmetingen niet op elkaar. " + VOORBEELDEN[st.keuze].uitleg);
    }

    ctx.knop("p + 1", function () {
      st.p = Math.min(12, st.p + 1);
      werkBij();
    });
    ctx.knop("p − 1", function () {
      st.p = Math.max(0, st.p - 1);
      werkBij();
    });
    ctx.knop("Wijzig A", function () {
      VOORBEELDEN[0].M = willekeurigeMatrix(2, 2);
      st.keuze = 0;
      st.p = 1;
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === 0));
      });
      werkBij();
    });

    var keuzeknoppen = VOORBEELDEN.map(function (vb, i) {
      var knop = ctx.knop(vb.naam, function () {
        st.keuze = i;
        st.p = 1;
        keuzeknoppen.forEach(function (ander, k) {
          ander.setAttribute("aria-pressed", String(k === i));
        });
        werkBij();
      });
      knop.setAttribute("aria-pressed", String(i === 0));
      return knop;
    });

    function herstel() {
      st.keuze = 0;
      st.p = 1;
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === 0));
      });
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 10. A · B en B · A onder elkaar ----------------------------------- */

  // Twee producten van dezelfde twee matrices, tegelijk in beeld. De cellen
  // die verschillen lichten op: dat A · B ≠ B · A is geen regel om te
  // onthouden maar iets om te zien.
  G.registreer("niet-commutatief", function (ctx) {
    var wb = maakWerkblad(ctx);
    var BEGIN_A = [[3, -1], [-2, 4]];
    var BEGIN_B = [[5, 0], [1, 6]];
    // B volgt de modus: vrij een eigen matrix, anders de eenheidsmatrix of
    // het dubbele van A. Zo blijft Willekeurig werken terwijl een van de twee
    // schakelaars aanstaat.
    var st = {
      A: BEGIN_A.map(function (rij) { return rij.slice(); }),
      Bvrij: BEGIN_B.map(function (rij) { return rij.slice(); }),
      modus: "vrij"
    };

    function A() { return st.A; }
    function B() {
      if (st.modus === "I") return [[1, 0], [0, 1]];
      if (st.modus === "2A") return veelvoud(2, st.A);
      return st.Bvrij;
    }
    function AB() { return product(A(), B()); }
    function BA() { return product(B(), A()); }
    function commuteert() { return gelijk(AB(), BA()); }

    var bord = matrixBord(ctx);

    var boven = maakDrieluik(ctx, wb, bord, {
      teken: "·", celbreedte: 1.5, y: 1.5,
      A: { rijen: 2, kolommen: 2, naam: "A",
           waarde: function (i, j) { return net(String(A()[i - 1][j - 1])); } },
      B: { rijen: 2, kolommen: 2, naam: "B",
           waarde: function (i, j) { return net(String(B()[i - 1][j - 1])); } },
      C: { rijen: 2, kolommen: 2, naam: "A · B",
           waarde: function (i, j) { return net(String(AB()[i - 1][j - 1])); } }
    });
    var onder = maakDrieluik(ctx, wb, bord, {
      teken: "·", celbreedte: 1.5, y: -1.9,
      A: { rijen: 2, kolommen: 2, naam: "B",
           waarde: function (i, j) { return net(String(B()[i - 1][j - 1])); } },
      B: { rijen: 2, kolommen: 2, naam: "A",
           waarde: function (i, j) { return net(String(A()[i - 1][j - 1])); } },
      C: { rijen: 2, kolommen: 2, naam: "B · A",
           waarde: function (i, j) { return net(String(BA()[i - 1][j - 1])); } }
    });

    // Per plaats één merkteken boven en één onder: samen tonen ze waar de
    // twee producten uit elkaar lopen.
    var merken = [];
    [1, 2].forEach(function (i) {
      [1, 2].forEach(function (j) {
        merken.push({ i: i, j: j,
          boven: boven.C.markeer("secante"), onder: onder.C.markeer("secante") });
      });
    });

    wb.tekst(bord, 0, 0,
      function () { return commuteert() ? "A · B = B · A" : "A · B ≠ B · A"; },
      "tekst", { factor: 1.15, vet: true });

    wb.venster(bord, function () {
      return [Math.max(boven.breedte(), onder.breedte()) + 1.2, 10.4];
    });

    function werkBij() {
      var P = AB();
      var Q = BA();
      merken.forEach(function (merk) {
        var anders = Math.abs(P[merk.i - 1][merk.j - 1] -
                              Q[merk.i - 1][merk.j - 1]) > 1e-9;
        if (anders) {
          merk.boven.zet(merk.i, merk.j);
          merk.onder.zet(merk.i, merk.j);
        } else {
          merk.boven.verberg();
          merk.onder.verberg();
        }
      });
      boven.herplaats();
      onder.herplaats();
      wb.pas();
      schakelaars.forEach(function (knopmodus) {
        knopmodus.knop.setAttribute("aria-pressed",
          String(st.modus === knopmodus.modus));
      });
      ctx.toon(commuteert()
        ? "Hier is A · B = B · A. Dat kan gebeuren, maar het geldt " +
          "niet voor alle matrices: het product van vierkante matrices is " +
          "niet commutatief."
        : "A · B en B · A hebben dezelfde orde, maar niet dezelfde " +
          "elementen: de aangeduide plaatsen verschillen. De volgorde van de " +
          "factoren doet er dus toe.");
    }

    ctx.knop("Willekeurig", function () {
      st.A = willekeurigeMatrix(2, 2);
      st.Bvrij = willekeurigeMatrix(2, 2);
      werkBij();
    });

    // De twee schakelaars sluiten elkaar uit; opnieuw klikken zet B weer vrij.
    function schakelaar(opschrift, modus) {
      var knop = ctx.knop(opschrift, function () {
        st.modus = st.modus === modus ? "vrij" : modus;
        werkBij();
      });
      knop.setAttribute("aria-pressed", "false");
      return { knop: knop, modus: modus };
    }

    var schakelaars = [schakelaar("B = I", "I"), schakelaar("B = 2A", "2A")];

    function herstel() {
      st.A = BEGIN_A.map(function (rij) { return rij.slice(); });
      st.Bvrij = BEGIN_B.map(function (rij) { return rij.slice(); });
      st.modus = "vrij";
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 11. Nuldelers ------------------------------------------------------ */

  // A en B zijn allebei niet de nulmatrix, en toch is A · B = O. Elk element
  // van het product is een som van producten die elkaar opheffen; door op een
  // element te klikken ziet de leerling die som staan.
  //
  // De opzet: kies een richting (p, q). De rijen van A zijn veelvouden van
  // (q, -p) en de kolommen van B veelvouden van (p, q). Elke rij van A staat
  // dan loodrecht op elke kolom van B, dus elk element van A · B is 0. Omdat
  // B afhangt van de richting van A, kiest Wijzig A ook een nieuwe B.
  G.registreer("nuldelers", function (ctx) {
    var BEGIN = { p: 1, q: 1, k: [1, 1], m: [1, 2] };
    var st = { p: BEGIN.p, q: BEGIN.q, k: BEGIN.k.slice(), m: BEGIN.m.slice() };

    function nietNul() {
      var waarden = [-2, -1, 1, 2];
      return waarden[Math.floor(Math.random() * waarden.length)];
    }

    // Geen 0 in de richting: dan staat er in A en B nergens een 0, en is elk
    // element van het product een som van twee producten die elkaar echt
    // opheffen in plaats van een som met een factor 0.
    function nieuweRichting() {
      st.p = nietNul();
      st.q = nietNul();
    }

    function A() {
      return [[st.k[0] * st.q, -st.k[0] * st.p],
              [st.k[1] * st.q, -st.k[1] * st.p]];
    }

    function B() {
      return [[st.m[0] * st.p, st.m[1] * st.p],
              [st.m[0] * st.q, st.m[1] * st.q]];
    }

    var paren = [{ A: A(), B: B(), naamC: "A · B" }];

    function zet() {
      paren[0].A = A();
      paren[0].B = B();
    }

    return maakProductFiguur(ctx, {
      schakelaars: [],
      celbreedte: 1.5,
      paren: paren,
      wijzigA: function () {
        nieuweRichting();
        st.k = [nietNul(), nietNul()];
        zet();
      },
      wijzigB: function () {
        st.m = [nietNul(), nietNul()];
        zet();
      },
      herstel: function () {
        st.p = BEGIN.p;
        st.q = BEGIN.q;
        st.k = BEGIN.k.slice();
        st.m = BEGIN.m.slice();
        zet();
      }
    });
  });

}());
