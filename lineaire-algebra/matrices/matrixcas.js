/* Exacte matrixberekeningen, zonder DOM. Een matrix is { r, k, w } en een
 * breuk { t, n }. De invoerparser bewaart de bestaande getalnotatie en fouten.
 * Beschikbaar als MatrixCAS in de browser en via require() in Node.
 */
(function () {
  "use strict";
  var MAX_MACHT = 8;

  /* --- Breuken ---------------------------------------------------------- */

  // Alles rekent met exacte breuken. Zo blijft 1/3 van een matrix leesbaar en
  // klopt de determinant van een matrix met kommagetallen tot op het cijfer.
  function ggd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function breuk(t, n) {
    if (n === 0) throw new Error("Delen door nul kan niet.");
    if (n < 0) { t = -t; n = -n; }
    if (!Number.isSafeInteger(t) || !Number.isSafeInteger(n)) {
      throw new Error("De getallen worden te groot voor deze rekenmachine. " +
                      "Neem kleinere elementen of een kleinere orde.");
    }
    var d = ggd(t, n);
    return { t: t / d, n: n / d };
  }

  function heel(t) { return breuk(t, 1); }
  function optel(a, b) { return breuk(a.t * b.n + b.t * a.n, a.n * b.n); }
  function aftrek(a, b) { return breuk(a.t * b.n - b.t * a.n, a.n * b.n); }
  function maal(a, b) { return breuk(a.t * b.t, a.n * b.n); }
  function isNul(a) { return a.t === 0; }
  function isGelijk(a, b) { return a.t === b.t && a.n === b.n; }
  function isNegatief(a) { return a.t < 0; }

  /* --- Matrices --------------------------------------------------------- */

  // Een matrix is { r: rijen, k: kolommen, w: [[breuk]] }.
  function matrix(r, k, maakElement) {
    var w = [];
    for (var i = 0; i < r; i++) {
      var rij = [];
      for (var j = 0; j < k; j++) rij.push(maakElement(i, j));
      w.push(rij);
    }
    return { r: r, k: k, w: w };
  }

  function eenheidsmatrix(n) {
    return matrix(n, n, function (i, j) { return heel(i === j ? 1 : 0); });
  }
  function getransponeerde(m) {
    return matrix(m.k, m.r, function (i, j) { return m.w[j][i]; });
  }
  function termsgewijs(a, b, bewerking) {
    if (a.r !== b.r || a.k !== b.k) {
      throw new Error("Optellen kan enkel bij gelijke dimensies: A is " +
        a.r + " × " + a.k + ", B is " + b.r + " × " + b.k + ".");
    }
    return matrix(a.r, a.k, function (i, j) { return bewerking(a.w[i][j], b.w[i][j]); });
  }
  function scalairVeelvoud(r, m) {
    return matrix(m.r, m.k, function (i, j) { return maal(r, m.w[i][j]); });
  }
  function product(a, b, naam1 = "A", naam2 = "B") {
    if (a.k !== b.r) {
      throw new Error("Dit product bestaat niet: " + naam1 + " heeft " + a.k +
        " kolommen en " + naam2 + " heeft " + b.r + " rijen. " +
        "Voor een product moeten die twee gelijk zijn.");
    }
    return matrix(a.r, b.k, function (i, j) {
      var s = heel(0);
      for (var t = 0; t < a.k; t++) s = optel(s, maal(a.w[i][t], b.w[t][j]));
      return s;
    });
  }

  // De matrix die overblijft als rij i en kolom j geschrapt worden.
  function minor(m, i, j) {
    var w = [];
    for (var p = 0; p < m.r; p++) {
      if (p === i) continue;
      var rij = [];
      for (var q = 0; q < m.k; q++) if (q !== j) rij.push(m.w[p][q]);
      w.push(rij);
    }
    return { r: m.r - 1, k: m.k - 1, w: w };
  }

  // Ontwikkeling naar de eerste rij, precies zoals in de cursus.
  function determinant(m, naam = "A") {
    eisVierkant(naam, m, "Een determinant");
    if (m.r === 0) return heel(1);
    if (m.r === 1) return m.w[0][0];
    if (m.r === 2) return aftrek(maal(m.w[0][0], m.w[1][1]), maal(m.w[0][1], m.w[1][0]));
    var totaal = heel(0);
    for (var j = 0; j < m.k; j++) {
      if (isNul(m.w[0][j])) continue;
      var term = maal(m.w[0][j], determinant(minor(m, 0, j)));
      totaal = (j % 2 === 0) ? optel(totaal, term) : aftrek(totaal, term);
    }
    return totaal;
  }

  function leesGetal(invoer, fout = "Vul bij r een getal in, bijvoorbeeld 3, -0.5 of 2/3.") {
    var tekst = String(invoer).trim().replace(/\s+/g, "").replace(",", ".");
    var deling = /^([+-]?\d+)\/(\d+)$/.exec(tekst);
    if (deling) return breuk(Number(deling[1]), Number(deling[2]));
    if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(tekst)) {
      var punt = tekst.indexOf(".");
      if (punt < 0) return heel(Number(tekst));
      var cijfers = tekst.length - punt - 1;
      return breuk(Math.round(Number(tekst) * Math.pow(10, cijfers)),
                   Math.pow(10, cijfers));
    }
    throw new Error(fout);
  }

  function leesMacht(invoer) {
    var tekst = String(invoer).trim();
    if (!/^\d+$/.test(tekst) || Number(tekst) > MAX_MACHT) {
      throw new Error("Vul bij n een geheel getal van 0 tot " + MAX_MACHT + " in.");
    }
    return Number(tekst);
  }

  function leesMatrix(tekst, naam = "A") {
    if (!Array.isArray(tekst) || !tekst.length || !Array.isArray(tekst[0]) || !tekst[0].length ||
        tekst.some(rij => !Array.isArray(rij) || rij.length !== tekst[0].length)) {
      throw new Error("Een matrix moet minstens één element en even lange rijen hebben.");
    }
    return matrix(tekst.length, tekst[0].length, (i, j) => leesGetal(tekst[i][j],
      "In " + naam + " staat op rij " + (i + 1) + ", kolom " + (j + 1) +
      " geen getal. Schrijf bijvoorbeeld 3, -1.5 of 2/3."));
  }

  function eisVierkant(naam, m, bewerking) {
    if (m.r !== m.k) throw new Error(bewerking + " bestaat enkel voor een vierkante matrix; " +
      naam + " is een " + m.r + " × " + m.k + "-matrix.");
  }

  function macht(m, n, naam = "A") {
    n = leesMacht(n);
    eisVierkant(naam, m, "Een macht");
    if (n === 0) return eenheidsmatrix(m.r);
    var resultaat = m;
    for (var t = 1; t < n; t++) resultaat = product(resultaat, m);
    return resultaat;
  }

  // null betekent verschillende dimensies; anders de afwijkende celposities.
  function verschillen(a, b) {
    if (a.r !== b.r || a.k !== b.k) return null;
    var plaatsen = [];
    for (var i = 0; i < a.r; i++) {
      for (var j = 0; j < a.k; j++) {
        if (!isGelijk(a.w[i][j], b.w[i][j])) plaatsen.push([i, j]);
      }
    }
    return plaatsen;
  }

  function ontwikkeling(m, richting, lijn, naam = "A") {
    eisVierkant(naam, m, "Een determinant");
    if (!["rij", "kolom"].includes(richting) || !Number.isInteger(lijn) || lijn < 0 || lijn >= m.r) {
      throw new Error("Kies een bestaande rij of kolom voor de ontwikkeling.");
    }
    var termen = [];
    for (var q = 0; q < m.r; q++) {
      var i = richting === "rij" ? lijn : q;
      var j = richting === "rij" ? q : lijn;
      var deel = minor(m, i, j), teken = (i + j) % 2 === 0 ? 1 : -1;
      var deelwaarde = determinant(deel), cofactor = maal(heel(teken), deelwaarde);
      termen.push({ i: i, j: j, element: m.w[i][j], minor: deel, teken: teken,
        deelwaarde: deelwaarde, cofactor: cofactor, waarde: maal(m.w[i][j], cofactor) });
    }
    return termen;
  }

  var api = {
    MAX_MACHT, breuk, heel, optel, aftrek, maal, isNul, isGelijk, isNegatief,
    matrix, eenheidsmatrix, getransponeerde, termsgewijs, scalairVeelvoud,
    product, minor, determinant, leesGetal, leesMatrix, leesMacht, macht,
    verschillen, ontwikkeling
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.MatrixCAS = api;
})();
