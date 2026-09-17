/* Interactieve grafieken bij L01_Matrices.tex.
 *
 * Een matrix is geen kromme, maar wel een rooster waarin plaats alles bepaalt:
 * welke rij, welke kolom, wat er met wat samenwerkt. Net dat gaat op papier
 * verloren, want daar staat elk voorbeeld in zijn eindstand. Hier tekenen we
 * de matrices zelf op een JSXGraph-bord, zodat een rij, een kolom of een cel
 * kan oplichten en de leerling ziet welke getallen bij elkaar horen.
 *
 * Onderaan staan drie gewone grafieken: de toepassingen (overgangs-, migratie-
 * en Lesliematrices) gaan over een evolutie, en die hoort in een assenstelsel.
 *
 * Bovenaan staat het werkblad: het tekenen van een matrix met haken, het
 * oplichten van een rij of een kolom, en het aanpassen van het venster aan de
 * inhoud. Daarna volgt per figuur enkel nog wat haar eigen is.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  /* --- Kleine hulpjes ---------------------------------------------------- */

  var ONDER = ["₀", "₁", "₂", "₃", "₄",
               "₅", "₆", "₇", "₈", "₉"];
  var BOVEN = ["⁰", "¹", "²", "³", "⁴",
               "⁵", "⁶", "⁷", "⁸", "⁹"];

  function index(n, tekens) {
    return String(n).split("").map(function (cijfer) {
      return tekens[Number(cijfer)];
    }).join("");
  }

  // a_{ij} als leesbare tekst: a₂₃. De cursus gebruikt die notatie ook, en op
  // een bord is een echte formule niet nodig.
  function el(letter, i, j) {
    return letter + index(i, ONDER) + index(j, ONDER);
  }

  function macht(letter, p) {
    return letter + index(p, BOVEN);
  }

  function waarde(v) {
    return typeof v === "function" ? v() : v;
  }

  // Getallen zoals in de cursus: een punt als decimaalteken, en een smalle
  // spatie per duizendtal, zodat 88761 leesbaar blijft.
  function duizend(x) {
    var n = Math.round(x);
    var teken = n < 0 ? "−" : "";
    var cijfers = String(Math.abs(n));
    var stukken = [];
    while (cijfers.length > 3) {
      stukken.unshift(cijfers.slice(-3));
      cijfers = cijfers.slice(0, -3);
    }
    stukken.unshift(cijfers);
    return teken + stukken.join(" ");
  }

  // Een minteken in tekst hoort een echt minteken te zijn, geen koppelteken.
  function net(tekst) {
    return String(tekst).replace(/-/g, "−");
  }

  // Een negatief getal als factor hoort tussen haakjes: 4·(−3), niet 4·−3.
  function haakjes(x) {
    var tekst = net(String(x));
    return x < 0 ? "(" + tekst + ")" : tekst;
  }

  function willekeurigGetal() {
    return Math.floor(Math.random() * 11) - 5;
  }

  function willekeurigeMatrix(m, n) {
    var A = nulmatrix(m, n);
    for (var i = 0; i < m; i++) {
      for (var j = 0; j < n; j++) A[i][j] = willekeurigGetal();
    }
    return A;
  }

  function vulWillekeurig(A) {
    var nieuw = willekeurigeMatrix(A.length, A[0].length);
    for (var i = 0; i < A.length; i++) A[i] = nieuw[i];
  }

  /* --- Matrixrekenen ----------------------------------------------------- */

  function orde(A) {
    return { rijen: A.length, kolommen: A.length ? A[0].length : 0 };
  }

  function nulmatrix(m, n) {
    var uit = [];
    for (var i = 0; i < m; i++) {
      uit.push([]);
      for (var j = 0; j < n; j++) uit[i].push(0);
    }
    return uit;
  }

  function som(A, B) {
    return A.map(function (rij, i) {
      return rij.map(function (a, j) { return a + B[i][j]; });
    });
  }

  function veelvoud(r, A) {
    return A.map(function (rij) {
      return rij.map(function (a) { return r * a; });
    });
  }

  function product(A, B) {
    var uit = nulmatrix(A.length, B[0].length);
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < B[0].length; j++) {
        var s = 0;
        for (var k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
        uit[i][j] = s;
      }
    }
    return uit;
  }

  function getransponeerde(A) {
    var uit = nulmatrix(A[0].length, A.length);
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[0].length; j++) uit[j][i] = A[i][j];
    }
    return uit;
  }

  function machtVan(A, p) {
    var uit = A;
    for (var k = 1; k < p; k++) uit = product(uit, A);
    return uit;
  }

  function gelijk(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[0].length; j++) {
        if (Math.abs(A[i][j] - B[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  /* --- Werkblad: matrices op een bord ------------------------------------ */

  // Het venster van een matrixbord hangt niet van vaste getallen af maar van
  // wat erin staat: de figuur bepaalt hoe breed en hoe hoog haar inhoud is, en
  // hier wordt daar een begrenzing van gemaakt die past bij de plaats die de
  // slide geeft. Zo blijft dezelfde figuur leesbaar op een breed scherm en in
  // een smalle kolom.
  function pasVenster(bord, breedte, hoogte) {
    var w = bord.canvasWidth;
    var h = bord.canvasHeight;
    if (!w || !h) return 40;
    var schaal = Math.min(w / (breedte * 1.06), h / (hoogte * 1.06));
    var box = [-w / schaal / 2, h / schaal / 2, w / schaal / 2, -h / schaal / 2];
    bord.presBegrenzing = box;
    bord.presGelijkeSchaal = true;
    try { bord.setBoundingBox(box, true); } catch (fout) { /* niets */ }
    return schaal;
  }

  function maakWerkblad(ctx) {
    var teksten = [];    // [tekstobject, lettergroottefactor]
    var vullingen = [];  // [vlak, rol]
    var vensters = [];   // [bord, maatfunctie]
    var wb = {};

    wb.tekst = function (bord, x, y, inhoud, rol, opties) {
      var o = opties || {};
      var t = bord.create("text", [x, y, inhoud], {
        anchorX: o.anchorX || "middle",
        anchorY: o.anchorY || "middle",
        fixed: true,
        highlight: false,
        useMathJax: false,
        cssStyle: o.vet ? "font-weight:600" : "",
        visible: o.visible === undefined ? true : o.visible
      });
      ctx.stijl(t, rol || "tekst");
      teksten.push([t, o.factor || 1]);
      return t;
    };

    // Een gekleurd vlak volgt de rol bij een themawisseling niet vanzelf: de
    // runtime kleurt enkel lijnen en punten. Daarom houden we ze hier bij.
    wb.vulling = function (vlak, rol) {
      vullingen.push([vlak, rol]);
      vlak.setAttribute({ fillColor: ctx.kleur(rol) });
      return vlak;
    };

    wb.venster = function (bord, maat) {
      vensters.push([bord, maat]);
    };

    // Past elk bord aan zijn inhoud aan en kiest daarna de lettergrootte: een
    // cel van een halve centimeter verdient kleinere cijfers dan een cel van
    // twee centimeter.
    wb.pas = function () {
      var schaal = 40;
      vensters.forEach(function (paar) {
        var maat = paar[1]();
        schaal = Math.min(schaal, pasVenster(paar[0], maat[0], maat[1]));
      });
      teksten.forEach(function (paar) {
        var px = Math.round(schaal * 0.34 * paar[1]);
        paar[0].setAttribute({ fontSize: Math.max(9, Math.min(24, px)) });
      });
      vensters.forEach(function (paar) {
        try { paar[0].fullUpdate(); } catch (fout) { /* niets */ }
      });
    };

    wb.kleur = function (kleuren) {
      var k = kleuren || ctx.kleuren();
      vullingen.forEach(function (paar) {
        paar[0].setAttribute({ fillColor: k[paar[1]] || k.kromme });
      });
    };

    // Een matrix met haken. Aantal rijen, aantal kolommen, plaats en inhoud
    // mogen functies zijn: zo kan dezelfde figuur van orde veranderen zonder
    // opnieuw opgebouwd te worden.
    wb.matrix = function (bord, o) {
      var bw = o.celbreedte || 1.3;
      var bh = o.celhoogte || 1.0;
      var maxR = o.maxrijen || waarde(o.rijen);
      var maxK = o.maxkolommen || waarde(o.kolommen);
      var HAAK = 0.16;   // afstand van de haak tot de cellen
      var TIP = 0.2;     // de horizontale stukjes van een haak
      var m = {};

      m.R = function () { return waarde(o.rijen); };
      m.K = function () { return waarde(o.kolommen); };
      m.X = function () { return waarde(o.x) || 0; };
      m.Y = function () { return waarde(o.y) || 0; };
      m.zichtbaar = function () {
        return o.zichtbaar === undefined ? true : waarde(o.zichtbaar);
      };
      m.breedte = function () { return m.K() * bw; };
      m.hoogte = function () { return m.R() * bh; };
      m.volleBreedte = function () { return m.breedte() + 2 * (HAAK + TIP); };
      m.volleHoogte = function () { return m.hoogte() + 0.4; };
      m.links = function () { return m.X() - m.breedte() / 2; };
      m.boven = function () { return m.Y() + m.hoogte() / 2; };
      m.celX = function (j) { return m.links() + (j - 0.5) * bw; };
      m.celY = function (i) { return m.boven() - (i - 0.5) * bh; };

      function punt(fx, fy) {
        return bord.create("point", [fx, fy], {
          visible: false, fixed: true, name: "", withLabel: false
        });
      }

      function lijn(a, b) {
        return ctx.stijl(bord.create("segment", [a, b], {
          strokeWidth: 2, fixed: true, highlight: false,
          visible: function () { return m.zichtbaar(); }
        }), o.rol || "tekst");
      }

      function haak(links) {
        var teken = links ? -1 : 1;
        function x0() { return m.X() + teken * (m.breedte() / 2 + HAAK); }
        function x1() { return x0() - teken * TIP; }
        function yb() { return m.Y() + m.hoogte() / 2 + 0.1; }
        function yo() { return m.Y() - m.hoogte() / 2 - 0.1; }
        var boven = punt(x0, yb);
        var onder = punt(x0, yo);
        lijn(boven, onder);
        lijn(boven, punt(x1, yb));
        lijn(onder, punt(x1, yo));
      }

      var i, j;
      for (i = 1; i <= maxR; i++) {
        for (j = 1; j <= maxK; j++) {
          (function (i, j) {
            wb.tekst(bord,
              function () { return m.celX(j); },
              function () { return m.celY(i); },
              // JSXGraph vraagt de inhoud van elke cel op, ook van een cel die
              // buiten de huidige orde valt en dus niet te zien is.
              function () {
                if (i > m.R() || j > m.K()) return "";
                return o.waarde(i, j);
              },
              o.rol || "tekst",
              {
                factor: o.factor,
                visible: function () {
                  return m.zichtbaar() && i <= m.R() && j <= m.K();
                }
              });
          }(i, j));
        }
      }
      haak(true);
      haak(false);

      if (o.naam) {
        wb.tekst(bord,
          function () { return m.X(); },
          function () { return m.boven() + 0.45; },
          o.naam, o.naamrol || "zwak",
          { factor: 0.95, visible: function () { return m.zichtbaar(); } });
      }

      // Licht een rij, een kolom of één cel op. Rij 0 betekent "alle rijen",
      // kolom 0 "alle kolommen": zo is een hele rij, een hele kolom en een
      // enkele cel dezelfde beweging.
      m.markeer = function (rol) {
        var st = { rij: 0, kolom: 0, aan: false };
        function xl() { return st.kolom ? m.celX(st.kolom) - bw / 2 : m.links(); }
        function xr() { return st.kolom ? m.celX(st.kolom) + bw / 2 : m.links() + m.breedte(); }
        function yb() { return st.rij ? m.celY(st.rij) + bh / 2 : m.boven(); }
        function yo() { return st.rij ? m.celY(st.rij) - bh / 2 : m.boven() - m.hoogte(); }
        var vlak = bord.create("polygon",
          [punt(xl, yb), punt(xr, yb), punt(xr, yo), punt(xl, yo)], {
            fixed: true, highlight: false, fillOpacity: 0.32, layer: 0,
            borders: { visible: false, strokeWidth: 0 },
            vertices: { visible: false },
            visible: function () { return st.aan && m.zichtbaar(); }
          });
        wb.vulling(vlak, rol);
        return {
          zet: function (rij, kolom) {
            st.rij = rij || 0;
            st.kolom = kolom || 0;
            st.aan = true;
          },
          verberg: function () { st.aan = false; },
          aan: function () { return st.aan; }
        };
      };

      // Welke cel ligt onder een punt van het bord? Buiten de matrix: niets.
      m.celVan = function (x, y) {
        if (!m.zichtbaar()) return null;
        var kolom = Math.floor((x - m.links()) / bw) + 1;
        var rij = Math.floor((m.boven() - y) / bh) + 1;
        if (rij < 1 || kolom < 1 || rij > m.R() || kolom > m.K()) return null;
        return { rij: rij, kolom: kolom };
      };

      return m;
    };

    return wb;
  }

  // De plaats van een klik of een tik op het bord, in bordcoördinaten.
  function klikPunt(bord, e) {
    try {
      var gebeurtenis = e;
      if (e && e.touches && e.touches.length) gebeurtenis = e.touches[0];
      return bord.getUsrCoordsOfMouse(gebeurtenis);
    } catch (fout) {
      return null;
    }
  }

  // De runtime noemt haar assen altijd x en y. In de toepassingen dragen ze
  // een betekenis (dag, jaar, kans, aantal), en dan is die naam meer waard dan
  // de letter. Verder blijven ze precies zoals de runtime ze zet, inclusief de
  // rol "as" voor de dag- en nachtstand.
  function assenMet(ctx, bord, xnaam, ynaam) {
    [["x", xnaam], ["y", ynaam]].forEach(function (paar) {
      var richting = paar[0];
      var as = bord.create("axis",
        richting === "x" ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], {
          name: paar[1], withLabel: true,
          label: {
            position: "urt",
            offset: richting === "x" ? [-8, 16] : [14, -10],
            anchorX: richting === "x" ? "right" : "left",
            cssClass: "grafiek-aslabel", useMathJax: false
          },
          ticks: {
            drawZero: false, drawLabels: true, majorHeight: 8, minorTicks: 0,
            label: { cssClass: "grafiek-aslabel", anchorX: "middle" }
          }
        });
      ctx.stijl(as, "as");
    });
  }

  function matrixBord(ctx) {
    return ctx.maakBord({
      begrenzing: [-8, 5, 8, -5],
      assen: false,
      gelijkeschaal: true
    });
  }

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
  function bijzondereMatrix(ctx, soort) {
    var wb = maakWerkblad(ctx);
    var BASIS = willekeurigeMatrix(5, 5);
    var st = { n: 3, rijen: 3, kolommen: 2, rij: true, k: 5, boven: true };
    var rijKnop;
    var kolomKnop;
    var bovenKnop;
    var onderKnop;
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
      waarde: function (i, j) { return net(String(getal(i, j))); }
    });
    wb.tekst(bord, function () { return m.links() - .35; }, function () {
      return m.Y();
    }, naam, "tekst", { factor: 1.15, vet: true, anchorX: "right" });

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
      return [m.volleBreedte() + 1.8, m.hoogte() + 2.4];
    });

    function werkBij() {
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
        ctx.toon("Nulmatrix O van de orde " + st.rijen + "×" + st.kolommen +
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
        ctx.toon("Eenheidsmatrix I van de orde " + st.n + "×" + st.n + ".");
      } else {
        ctx.toon(st.n === 1 ?
          "Deze 1×1-matrix is tegelijk boven- en onderdriehoekig." :
          (st.boven ? "Boven" : "Onder") + "driehoeksmatrix van de orde " +
          st.n + "×" + st.n + ": de oranje driehoek bestaat uit nullen.");
      }
    }

    function kleinerGroter() {
      ctx.knop("Kleiner", function () { st.n = Math.max(1, st.n - 1); werkBij(); });
      ctx.knop("Groter", function () { st.n = Math.min(5, st.n + 1); werkBij(); });
    }

    if (soort === "nul") {
      ctx.knop("Meer rijen", function () { st.rijen = st.rijen === 5 ? 1 : st.rijen + 1; werkBij(); });
      ctx.knop("Meer kolommen", function () { st.kolommen = st.kolommen === 5 ? 1 : st.kolommen + 1; werkBij(); });
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
    }

    function herstel() {
      st.n = 3; st.rijen = 3; st.kolommen = 2; st.rij = true; st.k = 5; st.boven = true;
      if (rijKnop) rijKnop.setAttribute("aria-pressed", "true");
      if (kolomKnop) kolomKnop.setAttribute("aria-pressed", "false");
      if (bovenKnop) bovenKnop.setAttribute("aria-pressed", "true");
      if (onderKnop) onderKnop.setAttribute("aria-pressed", "false");
      werkBij();
    }
    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  }

  G.registreer("nulmatrix", function (ctx) { return bijzondereMatrix(ctx, "nul"); });
  G.registreer("rij-kolommatrix", function (ctx) { return bijzondereMatrix(ctx, "rij-kolom"); });
  G.registreer("diagonaalmatrix", function (ctx) { return bijzondereMatrix(ctx, "diagonaal"); });
  G.registreer("scalaire-matrix", function (ctx) { return bijzondereMatrix(ctx, "scalair"); });
  G.registreer("eenheidsmatrix", function (ctx) { return bijzondereMatrix(ctx, "eenheid"); });
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
        boven: false, onder: false
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
      ["onder", "Onderdriehoekig"]
    ];
    var vierkantNodig = ["vierkant", "diagonaal", "scalair", "eenheid", "boven", "onder"];

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
      return uit;
    }

    function voorbeeld(i, j) {
      if (st.aan.nul) return 0;
      if (st.aan.eenheid) return i === j ? 1 : 0;
      if (st.aan.scalair) return i === j ? 3 : 0;
      if (st.aan.diagonaal || (st.aan.boven && st.aan.onder)) return i === j ? i + 1 : 0;
      if (st.aan.boven && i > j) return 0;
      if (st.aan.onder && i < j) return 0;
      return ((2 * i + 3 * j) % 9) - 4 || 2;
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
        ctx.toon(ordeTekst + "Deze matrix bestaat" +
          (gekozen.length ? " en heeft alle gekozen eigenschappen: " + gekozen.join(", ") + "." : "."));
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

  /* --- Bouwsteen: A (bewerking) B = C ------------------------------------ */

  // De som, het veelvoud en het product zien er alle drie hetzelfde uit: twee
  // gegevens, een teken, een resultaat. Dit blok tekent die opstelling en
  // houdt de plaatsen bij; wat er in de cellen komt en wat oplicht, bepaalt
  // elke figuur zelf.
  function maakDrieluik(ctx, wb, bord, o) {
    var st = { xA: 0, xB: 0, xC: 0, xOp: 0, xIs: 0 };
    var TUSSEN = 0.55;
    var TEKEN = 0.7;
    var d = {};

    d.A = wb.matrix(bord, {
      rijen: o.A.rijen, kolommen: o.A.kolommen,
      maxrijen: o.A.maxrijen, maxkolommen: o.A.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.A.waarde, naam: o.A.naam,
      x: function () { return st.xA; }, y: o.y || 0
    });
    d.B = wb.matrix(bord, {
      rijen: o.B.rijen, kolommen: o.B.kolommen,
      maxrijen: o.B.maxrijen, maxkolommen: o.B.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.B.waarde, naam: o.B.naam,
      x: function () { return st.xB; }, y: o.y || 0
    });
    d.C = wb.matrix(bord, {
      rijen: o.C.rijen, kolommen: o.C.kolommen,
      maxrijen: o.C.maxrijen, maxkolommen: o.C.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.C.waarde, naam: o.C.naam,
      zichtbaar: o.C.zichtbaar,
      x: function () { return st.xC; }, y: o.y || 0
    });

    wb.tekst(bord, function () { return st.xOp; }, o.y || 0,
      o.teken, "zwak", { factor: 1.2 });
    wb.tekst(bord, function () { return st.xIs; }, o.y || 0,
      "=", "zwak", { factor: 1.2 });
    wb.tekst(bord, function () { return st.xC; }, o.y || 0,
      o.C.leeg || "bestaat niet", "secante", {
        factor: 1,
        visible: function () {
          return o.C.zichtbaar ? !waarde(o.C.zichtbaar) : false;
        }
      });

    d.breedte = function () {
      var cb = d.C.zichtbaar() ? d.C.volleBreedte() : 2.6;
      return d.A.volleBreedte() + d.B.volleBreedte() + cb +
        2 * TEKEN + 4 * TUSSEN;
    };
    d.hoogte = function () {
      return Math.max(d.A.hoogte(), d.B.hoogte(), d.C.hoogte()) + 1.4;
    };

    d.herplaats = function () {
      var x = -d.breedte() / 2;
      st.xA = x + d.A.volleBreedte() / 2;
      x += d.A.volleBreedte() + TUSSEN;
      st.xOp = x + TEKEN / 2;
      x += TEKEN + TUSSEN;
      st.xB = x + d.B.volleBreedte() / 2;
      x += d.B.volleBreedte() + TUSSEN;
      st.xIs = x + TEKEN / 2;
      x += TEKEN + TUSSEN;
      st.xC = x + (d.C.zichtbaar() ? d.C.volleBreedte() : 2.6) / 2;
    };

    return d;
  }

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
      ctx.toon(macht("A", st.p) + " is het product van " + st.p +
        " factoren A" + (st.p === 1 ? " (dus A zelf)" : "") + ". " +
        "Enkel bij een vierkante matrix is dat zinvol, want anders passen de " +
        "afmetingen niet op elkaar. " + VOORBEELDEN[st.keuze].uitleg);
    }

    ctx.knop("p + 1", function () {
      st.p = Math.min(12, st.p + 1);
      werkBij();
    });
    ctx.knop("p − 1", function () {
      st.p = Math.max(1, st.p - 1);
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
    var PAREN = [
      {
        naam: "Willekeurig",
        A: willekeurigeMatrix(2, 2),
        B: willekeurigeMatrix(2, 2)
      },
      {
        naam: "B = I",
        A: [[3, -1], [-2, 4]],
        B: [[1, 0], [0, 1]]
      },
      {
        naam: "B = 2A",
        A: [[3, -1], [-2, 4]],
        B: [[6, -2], [-4, 8]]
      },
      {
        naam: "Nog een paar",
        A: [[1, 2], [0, 1]],
        B: [[1, 0], [3, 1]]
      }
    ];
    var st = { keuze: 0 };

    function A() { return PAREN[st.keuze].A; }
    function B() { return PAREN[st.keuze].B; }
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
      ctx.toon(commuteert()
        ? "Hier is A · B = B · A. Dat kan gebeuren, maar het geldt " +
          "niet voor alle matrices: het product van vierkante matrices is " +
          "niet commutatief."
        : "A · B en B · A hebben dezelfde orde, maar niet dezelfde " +
          "elementen: de aangeduide plaatsen verschillen. De volgorde van de " +
          "factoren doet er dus toe.");
    }

    ctx.knop("Wijzig A", function () {
      PAREN[st.keuze].A = willekeurigeMatrix(2, 2);
      if (st.keuze === 2) PAREN[st.keuze].B = veelvoud(2, A());
      werkBij();
    });

    var keuzeknoppen = PAREN.map(function (paar, i) {
      var knop = ctx.knop(paar.naam, function () {
        st.keuze = i;
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
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === 0));
      });
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });

  /* --- 11. Overgangsmatrix: het weer van Thomas -------------------------- */

  // Een overgangsmatrix gaat over een evolutie, en dan is een assenstelsel de
  // juiste tekening: de drie kansen dag na dag, met de kansboom van de cursus
  // als tweede dag. Wie de begintoestand verandert, ziet dat de drie krommen
  // altijd naar hetzelfde evenwicht lopen.
  G.registreer("overgangsmatrix", function (ctx) {
    var A = [
      [0.6, 0.3, 0.1],
      [0.3, 0.4, 0.5],
      [0.1, 0.3, 0.4]
    ];
    var NAMEN = ["warm (W)", "bewolkt (B)", "regen (R)"];
    var KORT = ["W", "B", "R"];
    var ROLLEN = ["secante", "punt", "afgeleide"];
    var DAGEN = 12;
    var START = [
      { naam: "Vandaag regen", v: [0, 0, 1] },
      { naam: "Vandaag warm", v: [1, 0, 0] },
      { naam: "Vandaag bewolkt", v: [0, 1, 0] },
      { naam: "Alles even waarschijnlijk", v: [1 / 3, 1 / 3, 1 / 3] }
    ];
    var st = { keuze: 0, dag: 2 };

    // De rij toestanden vanaf de gekozen begintoestand.
    function verloop() {
      var rij = [START[st.keuze].v.slice()];
      for (var n = 1; n <= DAGEN; n++) {
        var vorige = rij[n - 1];
        var nieuw = [0, 0, 0];
        for (var i = 0; i < 3; i++) {
          for (var k = 0; k < 3; k++) nieuw[i] += A[i][k] * vorige[k];
        }
        rij.push(nieuw);
      }
      return rij;
    }

    var rijen = verloop();

    var bord = ctx.maakBord({
      begrenzing: [-1.4, 1.16, DAGEN + 1.6, -0.16],
      assen: false
    });
    assenMet(ctx, bord, "dag", "kans");

    // De drie krommen lopen op het einde naar elkaar toe, dus een opschrift
    // aan het uiteinde zou daar op elkaar vallen. De legende staat daarom in
    // de hoek, met dezelfde kleur als haar kromme.
    var krommen = [0, 1, 2].map(function (i) {
      var kromme = ctx.stijl(bord.create("curve", [[], []], {
        strokeWidth: 2.5, fixed: true, highlight: false
      }), ROLLEN[i]);
      ctx.stijl(bord.create("text",
        [DAGEN - 4.6, 0.93 - i * 0.1, NAMEN[i]], {
          anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
          fontSize: 14, cssStyle: "font-weight:600"
        }), ROLLEN[i]);
      return kromme;
    });

    // De dag die uitgelezen wordt: een schuifbaar punt op de x-as.
    var spoor = bord.create("segment", [[0, 0], [DAGEN, 0]], {
      visible: false, fixed: true
    });
    var wijzer = ctx.stijl(bord.create("glider", [st.dag, 0, spoor], {
      name: "dag", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      snapToGrid: false,
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    var lijn = ctx.stijl(bord.create("segment",
      [[function () { return dag(); }, 0],
       [function () { return dag(); }, 1.02]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");

    var merkers = [0, 1, 2].map(function (i) {
      return ctx.stijl(bord.create("point",
        [function () { return dag(); },
         function () { return rijen[dag()][i]; }], {
          name: "", size: 4, fixed: true, highlight: false, withLabel: false
        }), ROLLEN[i]);
    });

    function dag() {
      return Math.max(0, Math.min(DAGEN, Math.round(wijzer.X())));
    }

    function tekenKrommen() {
      krommen.forEach(function (kromme, i) {
        var xs = [];
        var ys = [];
        for (var n = 0; n <= DAGEN; n++) {
          xs.push(n);
          ys.push(rijen[n][i]);
        }
        kromme.dataX = xs;
        kromme.dataY = ys;
      });
    }

    function werkBij() {
      var n = dag();
      var v = rijen[n];
      var tekst = "Dag " + n + ": " + KORT.map(function (naam, i) {
        return naam + " = " + ctx.getal(v[i], 3);
      }).join(", ") + ".";
      if (n === 2 && st.keuze === 0) {
        tekst += " Vandaag regent het, dus overmorgen is de kans op mooi weer " +
          "0.25, ofwel 25 %: precies wat de kansboom en de kolom R van A² geven.";
      } else if (n >= 8) {
        tekst += " Na een aantal dagen verandert er nog nauwelijks iets: de " +
          "kansen naderen een evenwicht dat niet meer van het weer van vandaag afhangt.";
      }
      ctx.toon(tekst);
    }

    bord.on("update", werkBij);

    var keuzeknoppen = START.map(function (keuze, i) {
      var knop = ctx.knop(keuze.naam, function () {
        st.keuze = i;
        rijen = verloop();
        tekenKrommen();
        keuzeknoppen.forEach(function (ander, k) {
          ander.setAttribute("aria-pressed", String(k === i));
        });
        bord.fullUpdate();
        werkBij();
      });
      knop.setAttribute("aria-pressed", String(i === 0));
      return knop;
    });

    function zetDag(n) {
      wijzer.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Volgende dag", function () { zetDag(Math.min(DAGEN, dag() + 1)); });
    ctx.knop("Vorige dag", function () { zetDag(Math.max(0, dag() - 1)); });

    function herstel() {
      st.keuze = 0;
      rijen = verloop();
      tekenKrommen();
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === 0));
      });
      zetDag(2);
    }

    tekenKrommen();
    zetDag(2);
    return { reset: herstel };
  });

  /* --- 12. Migratiematrix: naar een evenwicht ---------------------------- */

  // De cursus rekent M¹⁰, M²⁰, M³⁰ en M⁵⁰ uit en besluit dat er een evenwicht
  // ontstaat. Hier is de startverdeling sleepbaar: het evenwicht 90 000 / 60 000
  // blijft staan, waar je ook begint. Dat maakt de exacte berekening erna
  // meteen begrijpelijk.
  G.registreer("migratie-evenwicht", function (ctx) {
    var M = [[0.90, 0.15], [0.10, 0.85]];
    var TOTAAL = 150;     // duizendtallen; zo blijven de asgetallen leesbaar
    var JAREN = 50;
    var EVENWICHT = [90, 60];
    var st = { jaar: 10 };

    var bord = ctx.maakBord({
      begrenzing: [-7, 172, JAREN + 7, -18],
      assen: false
    });
    assenMet(ctx, bord, "jaar", "aantal (×1000)");

    var spoorStart = bord.create("segment", [[0, 0], [0, TOTAAL]], {
      visible: false, fixed: true
    });
    var beginpunt = ctx.stijl(bord.create("glider", [0, 68, spoorStart], {
      name: "start", size: 6, showInfobox: false,
      precision: { touch: 30, mouse: 8 },
      label: { anchorX: "right", offset: [-10, 0] }
    }), "punt");

    var spoorJaar = bord.create("segment", [[0, 0], [JAREN, 0]], {
      visible: false, fixed: true
    });
    var jaarpunt = ctx.stijl(bord.create("glider", [st.jaar, 0, spoorJaar], {
      name: "jaar", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    function jaar() {
      return Math.max(0, Math.min(JAREN, Math.round(jaarpunt.X())));
    }

    function verloop() {
      var s = Math.max(0, Math.min(TOTAAL, beginpunt.Y()));
      var rij = [[s, TOTAAL - s]];
      for (var n = 1; n <= JAREN; n++) {
        var v = rij[n - 1];
        rij.push([M[0][0] * v[0] + M[0][1] * v[1],
                  M[1][0] * v[0] + M[1][1] * v[1]]);
      }
      return rij;
    }

    var rijen = verloop();

    var kromS = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");
    var kromP = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "punt");

    [0, 1].forEach(function (i) {
      ctx.stijl(bord.create("segment",
        [[0, EVENWICHT[i]], [JAREN, EVENWICHT[i]]], {
          strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
        }), "hulp");
      ctx.stijl(bord.create("text",
        [JAREN + 0.6, EVENWICHT[i], i === 0 ? "S" : "P"], {
          anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
          fontSize: 15, cssStyle: "font-weight:600"
        }), i === 0 ? "secante" : "punt");
    });

    var merkS = ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return rijen[jaar()][0]; }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "secante");
    var merkP = ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return rijen[jaar()][1]; }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "punt");

    ctx.stijl(bord.create("segment",
      [[function () { return jaar(); }, 0],
       [function () { return jaar(); }, TOTAAL]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");

    function tekenKrommen() {
      var xs = [];
      var ys = [];
      var zs = [];
      for (var n = 0; n <= JAREN; n++) {
        xs.push(n);
        ys.push(rijen[n][0]);
        zs.push(rijen[n][1]);
      }
      kromS.dataX = xs;
      kromS.dataY = ys;
      kromP.dataX = xs;
      kromP.dataY = zs;
    }

    // De krommen hangen enkel van de startverdeling af, de tekstregel ook van
    // het gekozen jaar. Het hertekenen gebeurt daarom bij het slepen van het
    // startpunt, niet bij elke update van het bord: anders zou de kromme een
    // beeld achterlopen op de hand die haar versleept.
    function hertekenen() {
      rijen = verloop();
      tekenKrommen();
      bord.update();
    }

    function werkBij() {
      var n = jaar();
      var v = rijen[n];
      ctx.toon("Start (" + (2002) + "): " + duizend(rijen[0][0] * 1000) +
        " in de stad en " + duizend(rijen[0][1] * 1000) + " op het platteland. " +
        "Na " + n + " jaar (" + (2002 + n) + "): S = " +
        duizend(v[0] * 1000) + " en P = " + duizend(v[1] * 1000) + ". " +
        (n >= 25
          ? "Het evenwicht 90 000 / 60 000 is bereikt."
          : "Sleep het startpunt: waar je ook begint, beide krommen lopen " +
            "naar 90 000 en 60 000."));
    }

    bord.on("update", werkBij);
    beginpunt.on("drag", hertekenen);

    function zetJaar(n) {
      jaarpunt.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Volgend jaar", function () { zetJaar(Math.min(JAREN, jaar() + 1)); });
    ctx.knop("Vorig jaar", function () { zetJaar(Math.max(0, jaar() - 1)); });
    ctx.knop("2012 (na 10 jaar)", function () { zetJaar(10); });
    ctx.knop("Na 50 jaar", function () { zetJaar(JAREN); });

    function herstel() {
      beginpunt.setPosition(window.JXG.COORDS_BY_USER, [0, 68]);
      hertekenen();
      zetJaar(10);
    }

    hertekenen();
    werkBij();
    return { reset: herstel };
  });

  /* --- 13. Lesliematrix: sterft de soort uit? ---------------------------- */

  // Op papier staan P₀, P₁, P₁₆ en P₃₂, en het besluit dat de populatie om de
  // 16 jaar halveert. Met een schuifknop op de overlevingskans van de eieren
  // wordt zichtbaar waar de kentering ligt: onder een bepaalde waarde sterft
  // de soort uit, erboven groeit ze.
  G.registreer("leslie-populatie", function (ctx) {
    var P0 = [180, 80, 50, 30, 20];
    var GEBOORTE = [0, 0, 2, 2, 1];
    var OVERLEEF = [null, 0.6, 0.6, 0.6];   // 1j->2j, 2j->3j, 3j->4j
    var JAREN = 40;
    var KLASSEN = ["0j", "1j", "2j", "3j", "4j"];

    var bord = ctx.maakBord({
      begrenzing: [-6, 430, JAREN + 6, -60],
      assen: false
    });
    assenMet(ctx, bord, "jaar", "aantal");

    // Onderaan links: daar is het bord leeg, en de knoppen Groot en Reset
    // zweven rechtsboven over de figuur.
    var schuif = bord.create("slider",
      [[2, -38], [16, -38], [0.1, 0.4, 1]], {
        name: "overleving eieren", snapWidth: 0.05, withTicks: false,
        size: 6, precision: 2,
        label: { fontSize: 13 }
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");

    function eiOverleving() {
      return Math.round(schuif.Value() * 20) / 20;
    }

    function volgende(P) {
      var uit = [0, 0, 0, 0, 0];
      for (var k = 0; k < 5; k++) uit[0] += GEBOORTE[k] * P[k];
      uit[1] = eiOverleving() * P[0];
      for (var i = 2; i < 5; i++) uit[i] = OVERLEEF[i - 1] * P[i - 1];
      return uit;
    }

    function verloop() {
      var rij = [P0.slice()];
      for (var n = 1; n <= JAREN; n++) rij.push(volgende(rij[n - 1]));
      return rij;
    }

    var rijen = verloop();

    function totaal(P) {
      return P.reduce(function (a, b) { return a + b; }, 0);
    }

    var kromTotaal = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 3, fixed: true, highlight: false
    }), "kromme");
    var kromEieren = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2, dash: 2, fixed: true, highlight: false
    }), "secante");

    ctx.stijl(bord.create("segment", [[0, 360], [JAREN, 360]], {
      strokeWidth: 1.5, dash: 1, fixed: true, highlight: false
    }), "hulp");
    ctx.stijl(bord.create("text", [0.4, 372, "startaantal 360"], {
      anchorX: "left", fixed: true, highlight: false, fontSize: 13
    }), "hulp");
    ctx.stijl(bord.create("text", [JAREN + 0.6,
      function () { return totaal(rijen[JAREN]); }, "totaal"], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      fontSize: 14, cssStyle: "font-weight:600"
    }), "kromme");
    ctx.stijl(bord.create("text", [JAREN + 0.6,
      function () { return rijen[JAREN][0]; }, "eieren"], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      fontSize: 14
    }), "secante");

    var spoorJaar = bord.create("segment", [[0, 0], [JAREN, 0]], {
      visible: false, fixed: true
    });
    var jaarpunt = ctx.stijl(bord.create("glider", [16, 0, spoorJaar], {
      name: "jaar", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    function jaar() {
      return Math.max(0, Math.min(JAREN, Math.round(jaarpunt.X())));
    }

    ctx.stijl(bord.create("segment",
      [[function () { return jaar(); }, 0],
       [function () { return jaar(); }, 420]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");
    ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return totaal(rijen[jaar()]); }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "kromme");

    function tekenKrommen() {
      var xs = [];
      var ys = [];
      var zs = [];
      for (var n = 0; n <= JAREN; n++) {
        xs.push(n);
        ys.push(totaal(rijen[n]));
        zs.push(rijen[n][0]);
      }
      kromTotaal.dataX = xs;
      kromTotaal.dataY = ys;
      kromEieren.dataX = xs;
      kromEieren.dataY = zs;
    }

    // Zoals bij de migratiematrix: het rekenwerk hoort bij het verzetten van de
    // schuifknop, de tekstregel bij elke update van het bord.
    function hertekenen() {
      rijen = verloop();
      tekenKrommen();
      bord.update();
    }

    function werkBij() {
      var n = jaar();
      var P = rijen[n];
      var groeit = totaal(rijen[JAREN]) > totaal(rijen[0]);
      ctx.toon("Overlevingskans van de eieren: " +
        ctx.getal(eiOverleving(), 2) + ". Na " + n + " jaar: " +
        KLASSEN.map(function (naam, i) {
          return naam + " = " + Math.round(P[i]);
        }).join(", ") + ", samen " +
        P.reduce(function (a, b) { return a + Math.round(b); }, 0) +
        " vogels. " +
        (groeit
          ? "Met deze overlevingskans groeit de populatie."
          : "Met deze overlevingskans krimpt de populatie: bij 0.4 halveert " +
            "ze ongeveer om de 16 jaar en sterft de soort uit."));
    }

    bord.on("update", werkBij);
    schuif.on("drag", hertekenen);

    function zetJaar(n) {
      jaarpunt.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Volgend jaar", function () { zetJaar(Math.min(JAREN, jaar() + 1)); });
    ctx.knop("Na 16 jaar", function () { zetJaar(16); });
    ctx.knop("Na 32 jaar", function () { zetJaar(32); });
    ctx.knop("Overleving 0.4", function () {
      schuif.setValue(0.4);
      hertekenen();
      werkBij();
    });
    ctx.knop("Overleving 0.7", function () {
      schuif.setValue(0.7);
      hertekenen();
      werkBij();
    });

    function herstel() {
      schuif.setValue(0.4);
      hertekenen();
      zetJaar(16);
    }

    hertekenen();
    werkBij();
    return { reset: herstel };
  });

}());
