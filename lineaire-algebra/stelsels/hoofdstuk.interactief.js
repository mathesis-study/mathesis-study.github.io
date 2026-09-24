/* Interactieve grafieken bij L04_Stelsels.tex.
 *
 * Een stelsel oplossen is een reeks bewerkingen, en op papier staat enkel
 * hun uitkomst. Twee grafieken laten de leerling die bewerkingen zelf doen.
 * De eerste toont waarom een elementaire bewerking mag: de rechten van een
 * stelsel draaien, maar hun snijpunt blijft staan. De tweede voert de methode
 * van Gauss-Jordan uit op de uitgebreide matrix, met de spil, de
 * controlekolom en de oplossing die je op het einde afleest.
 *
 * Het werkblad voor matrices op een bord komt uit web/matrixbord.js.
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
  var net = M.net;
  var maakWerkblad = M.maakWerkblad;
  var klikPunt = M.klikPunt;
  var matrixBord = M.matrixBord;

  /* --- Exacte breuken ---------------------------------------------------- */

  // Delen door een spil geeft breuken, en die horen er even exact te staan
  // als op papier.
  function ggd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a;
  }
  function breuk(t, n) {
    if (n === undefined) n = 1;
    if (n < 0) { t = -t; n = -n; }
    var g = ggd(t, n) || 1;
    return { t: t / g, n: n / g };
  }
  var Q = {
    plus: function (a, b) { return breuk(a.t * b.n + b.t * a.n, a.n * b.n); },
    maal: function (a, b) { return breuk(a.t * b.t, a.n * b.n); },
    deel: function (a, b) { return breuk(a.t * b.n, a.n * b.t); },
    min: function (a) { return breuk(-a.t, a.n); },
    nul: function (a) { return a.t === 0; },
    een: function (a) { return a.t === 1 && a.n === 1; },
    tekst: function (a) { return net(a.n === 1 ? String(a.t) : a.t + "/" + a.n); }
  };

  function sub(n) { return index(n, ONDER); }
  function rij(n) { return "R" + sub(n); }

  // Een lineaire combinatie zoals de cursus ze schrijft: 2R₂ − 3R₁, −R₁ + 3R₂.
  function term(k, naam, eerste) {
    if (Q.nul(k)) return "";
    var neg = k.t < 0;
    var abs = breuk(Math.abs(k.t), k.n);
    var co = Q.een(abs) ? "" : Q.tekst(abs);
    if (eerste) return (neg ? "−" : "") + co + naam;
    return (neg ? " − " : " + ") + co + naam;
  }

  function zinnen(regels) {
    return regels.filter(Boolean).map(function (r) {
      r = r.trim();
      return /[.?:!]$/.test(r) ? r : r + ".";
    }).join(" ");
  }

  /* --- 1. Gelijkwaardige stelsels ---------------------------------------- */

  // Elke vergelijking ax + by = c is een rechte. Een elementaire bewerking
  // verandert de vergelijkingen, en dus de rechten, maar niet hun snijpunt.
  G.registreer("gelijkwaardige-stelsels", function (ctx) {
    var BEGIN = [[1, 1, 7], [3, -1, 1]];
    var KS = [2, 3, -1, -2];
    var st = { S: kopie(BEGIN), k: 0, stap: "", geschiedenis: [] };

    function kopie(S) { return S.map(function (r) { return r.slice(); }); }
    function k() { return KS[st.k]; }

    var bord = ctx.maakBord({
      begrenzing: [-2.5, 9.5, 8.5, -2.5],
      raster: true,
      gelijkeschaal: true
    });

    // JSXGraph kent een rechte als [c, a, b] met c + a·x + b·y = 0.
    function rechte(nr, rol) {
      return ctx.stijl(bord.create("line", [
        function () { return -st.S[nr][2]; },
        function () { return st.S[nr][0]; },
        function () { return st.S[nr][1]; }
      ], {
        strokeWidth: 2.5, fixed: true, highlight: false,
        name: rij(nr + 1), withLabel: true,
        dash: nr === 0 ? 0 : 2,
        label: { position: nr === 0 ? "rt" : "lft", offset: nr === 0 ? [-30, 12] : [30, 12] }
      }), rol);
    }
    rechte(0, "punt");
    rechte(1, "secante");
    ctx.stijl(bord.create("point", [2, 5], {
      name: "(2;5)", size: 4, fixed: true, showInfobox: false,
      label: { offset: [10, -12] }
    }), "tekst");

    function lid(a, b) {
      var s = "";
      if (a) s += (a === -1 ? "−" : a === 1 ? "" : net(String(a))) + "x";
      if (b) {
        var abs = Math.abs(b);
        var co = abs === 1 ? "" : String(abs);
        s += s ? (b < 0 ? " − " : " + ") + co + "y" : (b < 0 ? "−" : "") + co + "y";
      }
      return s || "0";
    }
    function vergelijking(r) { return lid(r[0], r[1]) + " = " + net(String(r[2])); }

    var paneel = bord.create("text", [8.2, 8.6, function () {
      return "<div style='line-height:1.5'>" +
        "<b style='color:var(--grafiek-punt)'>" + rij(1) + "</b>: " + vergelijking(st.S[0]) + "<br>" +
        "<b style='color:var(--grafiek-secante)'>" + rij(2) + "</b>: " + vergelijking(st.S[1]) +
        (st.stap ? "<br><i>" + st.stap + "</i>" : "") + "</div>";
    }], {
      anchorX: "right", anchorY: "top", fixed: true, highlight: false,
      useMathJax: false, fontSize: 15,
      cssStyle: "background:var(--kleur-vlak-zweef);padding:.35em .6em;" +
        "border-radius:4px;white-space:nowrap"
    });
    ctx.stijl(paneel, "tekst");

    function werkBij() {
      bord.update();
      ctx.toon(zinnen([
        "Stelsel: " + vergelijking(st.S[0]) + " en " + vergelijking(st.S[1]),
        st.stap,
        "Het snijpunt blijft (2;5)",
        "k = " + net(String(k()))
      ]));
    }

    function voerUit(stap, nieuw) {
      st.geschiedenis.push({ S: st.S, stap: st.stap });
      st.S = nieuw;
      st.stap = stap;
      werkBij();
    }

    function vereenvoudig(r) {
      var g = ggd(ggd(r[0], r[1]), r[2]) || 1;
      var eerste = r[0] || r[1];
      if (eerste < 0) g = -g;
      return r.map(function (x) { return x / g; });
    }

    ctx.knop("R₁ ↔ R₂", function () {
      voerUit("R₁ ↔ R₂", [st.S[1].slice(), st.S[0].slice()]);
    });
    [0, 1].forEach(function (i) {
      ctx.knop(rij(i + 1) + " → k·" + rij(i + 1), function () {
        var S = kopie(st.S);
        S[i] = S[i].map(function (x) { return k() * x; });
        voerUit(rij(i + 1) + " → " + term(breuk(k()), rij(i + 1), true), S);
      });
    });
    [0, 1].forEach(function (i) {
      var j = 1 - i;
      ctx.knop(rij(i + 1) + " → " + rij(i + 1) + " + k·" + rij(j + 1), function () {
        var S = kopie(st.S);
        S[i] = S[i].map(function (x, t) { return x + k() * st.S[j][t]; });
        voerUit(rij(i + 1) + " → " + rij(i + 1) + term(breuk(k()), rij(j + 1), false), S);
      });
    });
    var kKnop = ctx.knop("k = 2", function () {
      st.k = (st.k + 1) % KS.length;
      kKnop.textContent = "k = " + net(String(k()));
      werkBij();
    });
    // Zoals in het voorbeeld van de cursus: in R₁ valt y weg, in R₂ valt x
    // weg. Beide rechten staan dan evenwijdig met een as.
    ctx.knop("Combinatiemethode", function () {
      var a = st.S[0], b = st.S[1];
      var r1 = [b[1] * a[0] - a[1] * b[0], 0, b[1] * a[2] - a[1] * b[2]];
      var r2 = [0, a[0] * b[1] - b[0] * a[1], a[0] * b[2] - b[0] * a[2]];
      voerUit("Combinatiemethode",
        [vereenvoudig(r1), vereenvoudig(r2)]);
    });
    ctx.knop("Terug", function () {
      var vorige = st.geschiedenis.pop();
      if (!vorige) return;
      st.S = vorige.S;
      st.stap = vorige.stap;
      werkBij();
    });

    function herstel() {
      st.S = kopie(BEGIN);
      st.stap = "";
      st.geschiedenis = [];
      st.k = 0;
      kKnop.textContent = "k = 2";
      werkBij();
    }

    werkBij();
    return { reset: herstel };
  });

  /* --- 2. De methode van Gauss-Jordan ------------------------------------ */

  var STELSELS = [
    { naam: "Voorbeeld 1", A: [[2, -1, 3, 5], [3, 2, 2, 4], [5, 3, -1, 7]] },
    { naam: "Voorbeeld 2", A: [[2, 4, -1, -7], [3, 6, 2, 0], [-2, 2, -3, -17], [4, -3, 4, 26]] },
    { naam: "Voorbeeld 3", A: [[3, -7, 2, 2], [-1, 3, 0, -2], [1, -2, 1, 0]] },
    { naam: "Voorbeeld 4", A: [[1, -3, -1, 2], [-2, 5, 3, 4], [4, -11, -5, 5]] }
  ];
  var ONBEKENDEN = ["x", "y", "z"];
  var PARAMETERS = ["t", "s"];

  function naarQ(A) {
    return A.map(function (r) { return r.map(function (x) { return breuk(x); }); });
  }
  function kopieQ(A) {
    return A.map(function (r) { return r.slice(); });
  }
  function hoofd(r, n) {
    for (var j = 0; j < n; j++) if (!Q.nul(r[j])) return j;
    return -1;
  }

  // R_i → k·R_i + l·R_j, met de gemeenschappelijke factor van de nieuwe rij
  // eruit gedeeld, zoals de cursus doet om de getallen klein te houden.
  function combineer(A, i, k, l, j) {
    var B = kopieQ(A);
    B[i] = A[i].map(function (x, t) { return Q.plus(Q.maal(k, x), Q.maal(l, A[j][t])); });
    return B;
  }

  // Het rekenwerk voor "maak nul": het element a in rij i wordt nul met de
  // spil p in rij j, via R_i → p·R_i − a·R_j (de combinatiemethode). Zijn
  // spil en element gehele getallen, dan delen we eerst hun ggd weg.
  function nulMaker(p, a) {
    var k = p, l = Q.min(a);
    if (p.n === 1 && a.n === 1) {
      var g = ggd(p.t, a.t) || 1;
      k = breuk(p.t, g);
      l = breuk(-a.t, g);
    }
    if (k.t < 0) { k = Q.min(k); l = Q.min(l); }
    return { k: k, l: l };
  }

  function opTekst(i, k, l, j) {
    if (Q.een(k)) return rij(i + 1) + " → " + rij(i + 1) + term(l, rij(j + 1), false);
    return rij(i + 1) + " → " + term(k, rij(i + 1), true) + term(l, rij(j + 1), false);
  }

  // Is de matrix rij-canoniek? En zo niet: wat is de volgende stap van de
  // methode? Eerst de spil op haar plaats, dan nullen onder en boven haar,
  // en tot slot alle spillen 1.
  function volgendeStap(A, n) {
    var r = 0;
    // De kolom van de bekende termen telt mee: een strijdig stelsel krijgt
    // zo ook zijn rij-canonieke matrix, met een spil 1 in die kolom.
    for (var c = 0; c <= n && r < A.length; c++) {
      var p = -1;
      for (var i = r; i < A.length; i++) if (!Q.nul(A[i][c])) { p = i; break; }
      if (p < 0) continue;
      if (p !== r) {
        var B = kopieQ(A);
        B[r] = A[p];
        B[p] = A[r];
        return { A: B, tekst: rij(r + 1) + " ↔ " + rij(p + 1), spil: [r, c] };
      }
      for (i = 0; i < A.length; i++) {
        if (i === r || Q.nul(A[i][c])) continue;
        var f = nulMaker(A[r][c], A[i][c]);
        return { A: combineer(A, i, f.k, f.l, r), tekst: opTekst(i, f.k, f.l, r), spil: [r, c] };
      }
      r++;
    }
    for (i = 0; i < A.length; i++) {
      var h = hoofd(A[i], n + 1);
      if (h >= 0 && !Q.een(A[i][h])) {
        var d = A[i][h];
        var C = kopieQ(A);
        C[i] = A[i].map(function (x) { return Q.deel(x, d); });
        return { A: C, tekst: rij(i + 1) + " / " + (d.t < 0 || d.n !== 1 ? "(" + Q.tekst(d) + ")" : Q.tekst(d)), spil: [i, h] };
      }
    }
    // Nulrijen onderaan: pas dan is de matrix echt rij-canoniek.
    for (i = 0; i + 1 < A.length; i++) {
      if (hoofd(A[i], n + 1) < 0 && hoofd(A[i + 1], n + 1) >= 0) {
        var E = kopieQ(A);
        E[i] = A[i + 1];
        E[i + 1] = A[i];
        return { A: E, tekst: rij(i + 1) + " ↔ " + rij(i + 2) + " (nulrij onderaan)", spil: null };
      }
    }
    return null;
  }

  function rang(A, n) {
    return A.filter(function (r) { return hoofd(r, n) >= 0; }).length;
  }

  // De oplossing aflezen uit een rij-canonieke matrix.
  function aflezen(A, n) {
    var rA = rang(A, n), rAb = rang(A, n + 1);
    if (rAb > rA) {
      return ["r(A) = " + rA + " < r(A_b) = " + rAb + ": strijdig stelsel, V = ∅"];
    }
    var spillen = [];
    A.forEach(function (r) { var h = hoofd(r, n); if (h >= 0) spillen.push(h); });
    var vrij = [];
    for (var j = 0; j < n; j++) if (spillen.indexOf(j) < 0) vrij.push(j);
    var par = {};
    vrij.forEach(function (j, q) { par[j] = PARAMETERS[q]; });
    var uitdr = [];
    for (j = 0; j < n; j++) {
      if (par[j]) { uitdr[j] = par[j]; continue; }
      var r = A.filter(function (rr) { return hoofd(rr, n) === j; })[0];
      var s = Q.nul(r[n]) ? "" : Q.tekst(r[n]);
      vrij.forEach(function (v) {
        var c = Q.min(r[v]);
        if (Q.nul(c)) return;
        s += term(c, par[v], s === "");
      });
      uitdr[j] = s || "0";
    }
    var V = "V = {(" + uitdr.join(";") + ")" +
      (vrij.length ? " | " + vrij.map(function (v) { return par[v]; }).join(", ") + " ∈ ℝ" : "") + "}";
    var zin = vrij.length
      ? "r(A) = r(A_b) = " + rA + " < n = " + n + ": " + vrij.length + " onbekende vrij te kiezen"
      : "r(A) = r(A_b) = n = " + n + ": precies één oplossing";
    return [zin, V];
  }

  G.registreer("gauss-jordan", function (ctx) {
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);
    var st = {
      keuze: 0, A: naarQ(STELSELS[0].A), spil: null, tweede: -1, stap: "", uitleg: "",
      geschiedenis: []
    };
    var N = 3;          // aantal onbekenden
    var BW = 1.45;      // celbreedte
    var Y = 0.95;

    function R() { return st.A.length; }

    var mA = wb.matrix(bord, {
      rijen: function () { return R(); }, kolommen: N + 1, maxrijen: 4,
      celbreedte: BW,
      x: function () { return -0.9; }, y: Y,
      naam: "A_b", naamrol: "zwak",
      waarde: function (i, j) { return Q.tekst(st.A[i - 1][j - 1]); }
    });
    var mC = wb.matrix(bord, {
      rijen: function () { return R(); }, kolommen: 1, maxrijen: 4,
      celbreedte: BW, haken: "geen", rol: "zwak",
      x: function () { return mA.X() + mA.volleBreedte() / 2 + 0.9; }, y: Y,
      waarde: function (i) {
        var s = breuk(0);
        st.A[i - 1].forEach(function (x) { s = Q.plus(s, x); });
        return Q.tekst(s);
      }
    });

    // De streep tussen de coëfficiënten en de bekende termen.
    function streepX() { return mA.celX(N) + BW / 2; }
    function punt(fx, fy) {
      return bord.create("point", [fx, fy], { visible: false, fixed: true, name: "", withLabel: false });
    }
    ctx.stijl(bord.create("segment", [
      punt(streepX, function () { return mA.boven() + 0.05; }),
      punt(streepX, function () { return mA.boven() - mA.hoogte() - 0.05; })
    ], { strokeWidth: 1.5, fixed: true, highlight: false }), "tekst");

    wb.tekst(bord, function () { return mC.X(); }, function () { return mA.boven() + 0.45; },
      "controle", "zwak", { factor: 0.8 });

    var merkRij = mA.markeer("punt");
    var merkSpil = mA.markeer("punt");
    var merkTweede = mA.markeer("secante");

    var regels = { tekst: [] };
    [0, 1, 2].forEach(function (k) {
      wb.tekst(bord, 0, function () { return mA.boven() - mA.hoogte() - 0.75 - 0.72 * k; },
        function () { return regels.tekst[k] || ""; }, "tekst", { factor: 0.85, vet: k === 0 });
    });

    wb.venster(bord, function () { return [12.5, R() + 3.4]; });

    function klaar() { return volgendeStap(st.A, N) === null; }

    function werkBij() {
      if (st.spil) {
        merkRij.zet(st.spil[0] + 1, 0);
        merkSpil.zet(st.spil[0] + 1, st.spil[1] + 1);
      } else {
        merkRij.verberg();
        merkSpil.verberg();
      }
      if (st.tweede >= 0) merkTweede.zet(st.tweede + 1, 0); else merkTweede.verberg();

      var r;
      if (klaar()) {
        r = ["Rij-canoniek" + (st.stap ? " na " + st.stap : "")].concat(aflezen(st.A, N));
      } else if (!st.spil) {
        r = [st.stap || STELSELS[st.keuze].naam,
             "Klik op een element dat niet nul is: dat wordt de spil (blauw).",
             "Of kies Volgende stap."];
      } else if (st.tweede < 0) {
        r = [st.stap || "Spil gekozen",
             "Klik op een andere rij (oranje) om er een nul te maken.",
             "Of deel de spilrij door de spil."];
      } else {
        r = [st.stap || "Twee rijen gekozen",
             "Maak nul: " + nulTekst(),
             "Of wissel de twee rijen."];
      }
      regels.tekst = r;
      wb.pas();
      ctx.toon(zinnen(r) + " A_b = " + st.A.map(function (rr) {
        return "(" + rr.map(Q.tekst).join(", ") + ")";
      }).join(", ") + ".");
    }

    function nulTekst() {
      var p = st.A[st.spil[0]][st.spil[1]];
      var a = st.A[st.tweede][st.spil[1]];
      if (Q.nul(a)) return "dat element is al nul.";
      var f = nulMaker(p, a);
      return opTekst(st.tweede, f.k, f.l, st.spil[0]);
    }

    function voerUit(tekst, B, spil) {
      st.geschiedenis.push({ A: st.A, spil: st.spil, tweede: st.tweede, stap: st.stap });
      st.A = B;
      st.stap = tekst;
      st.spil = spil || null;
      st.tweede = -1;
      werkBij();
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p) return;
      var cel = mA.celVan(p[0], p[1]);
      if (!cel) return;
      var i = cel.rij - 1, j = cel.kolom - 1;
      if (st.spil && i !== st.spil[0]) {
        st.tweede = i;
      } else if (j < N && !Q.nul(st.A[i][j])) {
        st.spil = [i, j];
        st.tweede = -1;
      }
      werkBij();
    });

    ctx.knop("Maak nul", function () {
      if (!st.spil || st.tweede < 0) return;
      var p = st.A[st.spil[0]][st.spil[1]];
      var a = st.A[st.tweede][st.spil[1]];
      if (Q.nul(a)) return;
      var f = nulMaker(p, a);
      voerUit(opTekst(st.tweede, f.k, f.l, st.spil[0]),
        combineer(st.A, st.tweede, f.k, f.l, st.spil[0]), st.spil);
    });
    ctx.knop("Deel door spil", function () {
      if (!st.spil) return;
      var i = st.spil[0];
      var d = st.A[i][st.spil[1]];
      var B = kopieQ(st.A);
      B[i] = st.A[i].map(function (x) { return Q.deel(x, d); });
      voerUit(rij(i + 1) + " / " + (d.t < 0 || d.n !== 1 ? "(" + Q.tekst(d) + ")" : Q.tekst(d)), B, st.spil);
    });
    ctx.knop("Wissel", function () {
      if (!st.spil || st.tweede < 0) return;
      var i = st.spil[0], j = st.tweede;
      var B = kopieQ(st.A);
      B[i] = st.A[j];
      B[j] = st.A[i];
      voerUit(rij(i + 1) + " ↔ " + rij(j + 1), B, null);
    });
    ctx.knop("Volgende stap", function () {
      var v = volgendeStap(st.A, N);
      if (!v) return;
      voerUit(v.tekst, v.A, v.spil);
    });
    ctx.knop("Terug", function () {
      var vorige = st.geschiedenis.pop();
      if (!vorige) return;
      st.A = vorige.A;
      st.spil = vorige.spil;
      st.tweede = vorige.tweede;
      st.stap = vorige.stap;
      werkBij();
    });
    ctx.knop("Ander stelsel", function () {
      st.keuze = (st.keuze + 1) % STELSELS.length;
      begin();
    });

    function begin() {
      st.A = naarQ(STELSELS[st.keuze].A);
      st.spil = null;
      st.tweede = -1;
      st.stap = "";
      st.geschiedenis = [];
      werkBij();
    }

    function herstel() {
      st.keuze = 0;
      begin();
    }

    begin();
    return { reset: herstel, herschaal: wb.pas, kleur: wb.kleur };
  });
}());
