/* Interactieve figuren bij A02_Veeltermfuncties.tex.
 *
 * indeling-reele-functies: de indeling van de reële functies als boom. Een
 * klik op een soort klapt haar deelsoorten open of dicht en toont een
 * willekeurig voorbeeld met zijn grafiek, elke klik een nieuw. Op papier
 * staat de hele boom in één TikZ-figuur.
 *
 * Elke eindsoort heeft een maker die een voorschrift met willekeurige,
 * nette coëfficiënten opbouwt, samen met een uitleg die bij dat voorschrift
 * hoort (top, nulwaarden, periode, domein). Een hogere soort kiest een
 * willekeurige deelsoort en zegt in de uitleg waar het voorbeeld thuishoort.
 *
 * Er is geen assenstelsel van JSXGraph: het bord blijft leeg en verborgen
 * onder een HTML-laag, zoals in A01. De boom is een geneste lijst van echte
 * knoppen, de grafiek van een voorbeeld een kleine SVG die de functie
 * bemonstert. Zo is de figuur precies zo hoog als wat er open staat.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  /* --- Toeval en notatie --------------------------------------------------- */

  function geheel(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function kies(lijst) { return lijst[Math.floor(Math.random() * lijst.length)]; }
  function nietNul(a, b) { var x; do { x = geheel(a, b); } while (x === 0); return x; }

  function ggd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  // t/n als vereenvoudigde breuk in TeX.
  function breuk(t, n) {
    if (n < 0) { t = -t; n = -n; }
    var g = ggd(t, n);
    t /= g; n /= g;
    if (n === 1) return String(t);
    return (t < 0 ? "-" : "") + "\\frac{" + Math.abs(t) + "}{" + n + "}";
  }

  // Een veelterm in x uit gehele coëfficiënten, van de hoogste macht naar
  // de constante term.
  function veelterm(coefs) {
    var n = coefs.length - 1, s = "";
    coefs.forEach(function (c, i) {
      if (c === 0) return;
      var p = n - i, a = Math.abs(c);
      s += c < 0 ? (s ? " - " : "-") : (s ? " + " : "");
      if (a !== 1 || p === 0) s += a;
      if (p > 0) s += p === 1 ? "x" : "x^{" + p + "}";
    });
    return s || "0";
  }
  function waardeVan(coefs, x) {
    return coefs.reduce(function (som, c) { return som * x + c; }, 0);
  }
  function maal(p, q) {
    var r = [];
    for (var i = 0; i < p.length + q.length - 1; i++) r.push(0);
    p.forEach(function (a, i) { q.forEach(function (b, j) { r[i + j] += a * b; }); });
    return r;
  }
  // " + 2", " - 1" of "" achter een uitdrukking.
  function plusTex(d) { return d === 0 ? "" : d > 0 ? " + " + d : " - " + -d; }
  // Een factor voor een functienaam: "", "-", "2" of "\tfrac{1}{2}".
  function factorTex(a) {
    if (a === 1) return "";
    if (a === -1) return "-";
    if (a === 0.5) return "\\tfrac{1}{2}";
    return String(a);
  }
  // Een opsomming in tekst: "a", "a en b", "a, b en c".
  function opsomming(delen) {
    if (delen.length < 2) return delen.join("");
    return delen.slice(0, -1).join(", ") + " en " + delen[delen.length - 1];
  }
  function m(tex) { return "\\(" + tex + "\\)"; }

  // Open en volle bolletjes waar de functie springt: vol op het beeld zelf,
  // open op de waarden net links en net rechts als die verschillen.
  function sprongPunten(f, xs) {
    var punten = [];
    xs.forEach(function (x) {
      var y = f(x), l = f(x - 1e-9), r = f(x + 1e-9);
      punten.push([x, y, "vol"]);
      if (Math.abs(l - y) > 1e-6) punten.push([x, l, "open"]);
      if (Math.abs(r - y) > 1e-6 && Math.abs(r - l) > 1e-6) punten.push([x, r, "open"]);
    });
    return punten;
  }

  /* --- Makers per soort ------------------------------------------------------ */

  // Elke maker geeft { tex, f, x: [xmin, xmax], uitleg } terug, en eventueel
  // y (een vast verticaal venster), asymptoot (het venster negeert de
  // uitschieters), sprong en punten.

  function constante() {
    var c = nietNul(-4, 4);
    return { tex: String(c), f: function () { return c; }, x: [-4, 4],
      uitleg: "Elke " + m("x") + " heeft hetzelfde beeld " + m(c) + ": een rechte " +
        "evenwijdig met de " + m("x") + "-as, door " + m("(0, " + c + ")") + "." };
  }

  function eerstegraads() {
    var a = nietNul(-3, 3), b = geheel(-4, 4), nul = -b / a;
    return { tex: veelterm([a, b]), f: function (x) { return a * x + b; },
      x: [Math.min(-4, nul - 3), Math.max(4, nul + 3)],
      uitleg: m("a = " + a + (a > 0 ? " > 0" : " < 0")) + ": een " +
        (a > 0 ? "stijgende" : "dalende") + " rechte door " + m("(0, " + b + ")") +
        ", met nulwaarde " + m("x = " + breuk(-b, a)) + "." };
  }

  function tweedegraads() {
    var a = kies([-2, -1, 1, 2]), p = geheel(-3, 3), q = geheel(-4, 4);
    var coefs = [a, -2 * a * p, a * p * p + q];
    // f(x) = a(x - p)^2 + q, dus nulwaarden waar (x - p)^2 = -q/a.
    var d = -q / a, nul;
    if (d < 0) nul = "geen nulwaarden";
    else if (d === 0) nul = "één nulwaarde " + m("x = " + p);
    else if (Number.isInteger(Math.sqrt(d))) {
      nul = "nulwaarden " + m("x = " + (p - Math.sqrt(d))) + " en " + m("x = " + (p + Math.sqrt(d)));
    } else {
      nul = "nulwaarden " + m("x = " + (p === 0 ? "" : p + " ") + "\\pm \\sqrt{" + breuk(-q, a) + "}");
    }
    return { tex: veelterm(coefs), f: function (x) { return waardeVan(coefs, x); },
      x: [p - 4, p + 4],
      uitleg: m(a > 0 ? "a > 0" : "a < 0") + ": een " + (a > 0 ? "dalparabool" : "bergparabool") +
        " met top " + m("(" + p + ", " + q + ")") + " en " + nul + "." };
  }

  function hogeregraads() {
    var n = kies([3, 3, 4]), a = kies([1, -1]), wortels = [];
    for (var i = 0; i < n; i++) wortels.push(geheel(-3, 3));
    wortels.sort(function (u, v) { return u - v; });
    var coefs = [a];
    wortels.forEach(function (r) { coefs = maal(coefs, [1, -r]); });
    // De factorvorm en de nulwaarden met hun multipliciteit.
    var tel = {};
    wortels.forEach(function (r) { tel[r] = (tel[r] || 0) + 1; });
    var verschillend = Object.keys(tel).map(Number).sort(function (u, v) { return u - v; });
    var factoren = verschillend.map(function (r) {
      var f = r === 0 ? "x" : "(" + veelterm([1, -r]) + ")";
      return tel[r] > 1 ? f + "^{" + tel[r] + "}" : f;
    }).join("");
    var nullen = verschillend.map(function (r) {
      return m(r) + (tel[r] === 2 ? " (dubbel)" : tel[r] === 3 ? " (drievoudig)" : "");
    });
    var links = Math.min(wortels[0] - 1.5, -2), rechts = Math.max(wortels[n - 1] + 1.5, 2);
    return { tex: veelterm(coefs), f: function (x) { return waardeVan(coefs, x); },
      x: [links, rechts],
      uitleg: "Graad " + m(n) + ". In factoren: " + m("f(x) = " + (a < 0 ? "-" : "") + factoren) +
        ", met nulwaarden " + opsomming(nullen) + "." };
  }

  function rationaal() {
    var soort = geheel(1, 3), a, b, c, k;
    if (soort === 1) {
      // (ax + b)/(x - c), niet te vereenvoudigen: ac + b ≠ 0.
      do { a = nietNul(-2, 2); b = geheel(-4, 4); c = geheel(-3, 3); } while (a * c + b === 0);
      return { tex: "\\frac{" + veelterm([a, b]) + "}{" + veelterm([1, -c]) + "}",
        f: function (x) { return (a * x + b) / (x - c); }, x: [c - 5, c + 5], asymptoot: true,
        uitleg: "Voor " + m("x = " + c) + " is de noemer nul: daar heeft " + m("f") + " geen beeld." };
    }
    if (soort === 2) {
      k = nietNul(-4, 4); c = geheel(1, 3);
      return { tex: "\\frac{" + k + "}{" + veelterm([1, 0, -c * c]) + "}",
        f: function (x) { return k / (x * x - c * c); }, x: [-c - 4, c + 4], asymptoot: true,
        uitleg: "Voor " + m("x = " + -c) + " en " + m("x = " + c) + " is de noemer nul: " +
          "daar heeft " + m("f") + " geen beeld." };
    }
    do { b = geheel(-4, 4); c = nietNul(-3, 3); } while (c * c + b === 0);
    return { tex: "\\frac{" + veelterm([1, 0, b]) + "}{" + veelterm([1, -c]) + "}",
      f: function (x) { return (x * x + b) / (x - c); }, x: [c - 6, c + 6], asymptoot: true,
      uitleg: "Voor " + m("x = " + c) + " is de noemer nul: daar heeft " + m("f") + " geen beeld." };
  }

  function irrationaal() {
    var soort = geheel(1, 4), a, b, r;
    if (soort === 1) {
      a = nietNul(-2, 2); b = geheel(-4, 4); r = -b / a;
      return { tex: "\\sqrt{" + veelterm([a, b]) + "}",
        f: function (x) { return Math.sqrt(a * x + b); },
        x: a > 0 ? [r - 2, r + 8] : [r - 8, r + 2],
        uitleg: "Enkel waar " + m(veelterm([a, b]) + " \\geq 0") + ", dus voor " +
          m("x " + (a > 0 ? "\\geq " : "\\leq ") + breuk(-b, a)) + "." };
    }
    if (soort === 2) {
      b = geheel(-3, 3);
      return { tex: "\\sqrt[3]{" + veelterm([1, b]) + "}",
        f: function (x) { return Math.cbrt(x + b); }, x: [-b - 8, -b + 8],
        uitleg: "Een derdemachtswortel bestaat voor elke " + m("x \\in \\R") + "." };
    }
    r = geheel(1, 4);
    if (soort === 3) {
      return { tex: "\\sqrt{" + veelterm([-1, 0, r * r]) + "}",
        f: function (x) { return Math.sqrt(r * r - x * x); }, x: [-r - 1.5, r + 1.5],
        uitleg: "Enkel voor " + m("-" + r + " \\leq x \\leq " + r) + ". De grafiek is een " +
          "halve cirkel met straal " + m(r) + "." };
    }
    return { tex: "\\sqrt{" + veelterm([1, 0, -r * r]) + "}",
      f: function (x) { return Math.sqrt(x * x - r * r); }, x: [-r - 5, r + 5],
      uitleg: "Enkel voor " + m("x \\leq -" + r) + " of " + m("x \\geq " + r) + "." };
  }

  // De hoek bx: tex, en de periode van sin en cos als tex.
  var HOEKEN = [
    { b: 1, tex: "x", periode: "2\\pi", tanPeriode: "\\pi" },
    { b: 2, tex: "2x", periode: "\\pi", tanPeriode: "\\frac{\\pi}{2}" },
    { b: 3, tex: "3x", periode: "\\frac{2\\pi}{3}", tanPeriode: "\\frac{\\pi}{3}" },
    { b: 0.5, tex: "\\frac{x}{2}", periode: "4\\pi", tanPeriode: "2\\pi" }
  ];

  function goniometrisch() {
    var h = kies(HOEKEN), b = h.b;
    if (Math.random() < 0.25) {
      var w = Math.PI / b;
      return { tex: "\\tan " + h.tex, f: function (x) { return Math.tan(b * x); },
        x: [-2 * w, 2 * w], y: [-5, 5],
        uitleg: "Periode " + m(h.tanPeriode) + ". Waar " + m("\\cos " + h.tex + " = 0") +
          " bestaat de tangens niet: daar breekt de grafiek af." };
    }
    var a = kies([1, 2, 3, -1, -2]), sin = Math.random() < 0.5, d = kies([0, 0, 1, -1]);
    var g = sin ? Math.sin : Math.cos, p = 2 * Math.PI / b;
    return { tex: factorTex(a) + (sin ? "\\sin " : "\\cos ") + h.tex + plusTex(d),
      f: function (x) { return a * g(b * x) + d; }, x: [-p * 1.1, p * 1.1],
      uitleg: "Amplitude " + m(Math.abs(a)) + " en periode " + m(h.periode) +
        (d ? ", " + (d > 0 ? "omhoog" : "omlaag") + " geschoven over " + m(Math.abs(d)) : "") + "." };
  }

  function cyclometrisch() {
    var d = kies([0, 0, 1, -1]);
    // Een grens van het bereik, verschoven over d.
    function grens(t) {
      if (!d) return t;
      return t === "0" ? String(d) : t + plusTex(d);
    }
    var soorten = [
      { naam: "\\Bgsin", f: Math.asin, x: [-1.8, 1.8], domein: "[-1, 1]",
        bereik: ["\\bigl[", "-\\frac{\\pi}{2}", "\\frac{\\pi}{2}", "\\bigr]"] },
      { naam: "\\Bgcos", f: Math.acos, x: [-1.8, 1.8], domein: "[-1, 1]",
        bereik: ["\\bigl[", "0", "\\pi", "\\bigr]"] },
      { naam: "\\Bgtan", f: Math.atan, x: [-8, 8], domein: "\\R",
        bereik: ["\\bigl]", "-\\frac{\\pi}{2}", "\\frac{\\pi}{2}", "\\bigr["] },
      { naam: "\\Bgcot", f: function (x) { return Math.PI / 2 - Math.atan(x); }, x: [-8, 8],
        domein: "\\R", bereik: ["\\bigl]", "0", "\\pi", "\\bigr["] }
    ];
    var s = kies(soorten);
    return { tex: s.naam + " x" + plusTex(d), f: function (x) { return s.f(x) + d; }, x: s.x,
      uitleg: "Domein " + m(s.domein) + ", bereik " +
        m(s.bereik[0] + grens(s.bereik[1]) + ", " + grens(s.bereik[2]) + s.bereik[3]) + "." };
  }

  function logaritmisch() {
    var grondtallen = [
      { tex: "\\log_2", a: "2", f: Math.log2, stijgt: true },
      { tex: "\\log_3", a: "3", f: function (x) { return Math.log(x) / Math.log(3); }, stijgt: true },
      { tex: "\\log", a: "10", f: Math.log10, stijgt: true },
      { tex: "\\ln", a: "e", f: Math.log, stijgt: true },
      { tex: "\\log_{\\frac{1}{2}}", a: "\\frac{1}{2}", f: function (x) { return -Math.log2(x); }, stijgt: false },
      { tex: "\\log_{\\frac{1}{3}}", a: "\\frac{1}{3}",
        f: function (x) { return -Math.log(x) / Math.log(3); }, stijgt: false }
    ];
    var g = kies(grondtallen), b = geheel(-3, 3);
    return { tex: g.tex + (b === 0 ? " x" : "(" + veelterm([1, b]) + ")"),
      f: function (x) { return g.f(x + b); }, x: [-b - 1, -b + 9], asymptoot: true,
      uitleg: "Grondtal " + m("a = " + g.a) + (g.stijgt ? ": stijgend" : ": dalend") +
        ". Enkel voor " + m("x > " + -b) + ", met nulwaarde " + m("x = " + (1 - b)) + "." };
  }

  function exponentieel() {
    var grondtallen = [
      { tex: "2", a: 2 }, { tex: "3", a: 3 }, { tex: "e", a: Math.E },
      { tex: "\\left(\\frac{1}{2}\\right)", a: 0.5 }, { tex: "\\left(\\frac{1}{3}\\right)", a: 1 / 3 }
    ];
    var g = kies(grondtallen), d = geheel(-2, 2);
    return { tex: g.tex + "^x" + plusTex(d), f: function (x) { return Math.pow(g.a, x) + d; },
      x: [-4, 4], y: [Math.min(-1, d - 2), d + 9],
      uitleg: (g.a > 1 ? "Grondtal groter dan 1: stijgend" : "Grondtal tussen 0 en 1: dalend") +
        ". De grafiek gaat door " + m("(0, " + (1 + d) + ")") + " en nadert de rechte " +
        m("y = " + d) + "." };
  }

  function hyperbolisch() {
    var a = kies([1, 2, -1, 0.5]), soort = geheel(1, 3), at = factorTex(a);
    if (soort === 1) {
      return { tex: at + "\\sinh x", f: function (x) { return a * Math.sinh(x); }, x: [-3, 3],
        uitleg: "Een oneven functie met bereik " + m("\\R") + "." };
    }
    if (soort === 2) {
      return { tex: at + "\\cosh x", f: function (x) { return a * Math.cosh(x); }, x: [-3, 3],
        uitleg: "Een even functie met " + (a > 0 ? "minimum " : "maximum ") +
          m(a === 0.5 ? "\\frac{1}{2}" : a) + " in " + m("x = 0") + "." };
    }
    var at2 = a === 0.5 ? "\\frac{1}{2}" : String(Math.abs(a));
    return { tex: at + "\\tanh x", f: function (x) { return a * Math.tanh(x); }, x: [-4, 4],
      uitleg: "Een oneven functie; de grafiek blijft tussen de rechten " +
        m("y = -" + at2) + " en " + m("y = " + at2) + "." };
  }

  function gFunctie() {
    var sprongen = [], f, tex, uitleg, i;
    if (Math.random() < 0.2) {
      f = function (x) { return x - Math.floor(x); };
      tex = "x - \\lfloor x \\rfloor";
      uitleg = "Het deel na de komma: telkens van " + m("0") + " tot net onder " + m("1") + ".";
      for (i = -4; i <= 4; i++) sprongen.push(i);
      return { tex: tex, f: f, x: [-3.5, 3.5], y: [-1, 2], sprong: 0.5, punten: sprongPunten(f, sprongen),
        uitleg: uitleg };
    }
    var k = kies([1, 1, 2, 0.5]), d = kies([0, 0, 1, -1]);
    var hoek = k === 1 ? "x" : k === 2 ? "2x" : "\\frac{x}{2}";
    f = function (x) { return Math.floor(k * x + 1e-12) + d; };
    for (i = -12; i <= 12; i++) if (Math.abs(i / k) <= 5) sprongen.push(i / k);
    var breedte = k === 1 ? "1" : k === 2 ? "\\frac{1}{2}" : "2";
    return { tex: "\\lfloor " + hoek + " \\rfloor" + plusTex(d), f: f, x: [-4.5, 4.5],
      sprong: 0.5, punten: sprongPunten(f, sprongen),
      uitleg: "Trapjes van breedte " + m(breedte) + " en hoogte " + m("1") +
        ". Elk trapje bevat zijn linkereindpunt, niet zijn rechter." };
  }

  function signfunctie() {
    var soort = geheel(1, 3), coefs, a, b;
    if (soort === 1) { a = nietNul(-2, 2); b = geheel(-3, 3); coefs = [a, b]; }
    else if (soort === 2) { b = geheel(1, 3); coefs = [kies([1, -1]), 0, -kies([1, -1]) * b * b]; }
    else {
      coefs = [1];
      [geheel(-3, 0), geheel(0, 3)].forEach(function (r) { coefs = maal(coefs, [1, -r]); });
      coefs = maal(coefs, [kies([1, -1])]);
    }
    var binnen = veelterm(coefs);
    var f = function (x) { return Math.sign(waardeVan(coefs, x)); };
    // De nulwaarden van een veelterm van graad 1 of 2.
    var nullen = [];
    if (coefs.length === 2) nullen = [-coefs[1] / coefs[0]];
    else {
      var D = coefs[1] * coefs[1] - 4 * coefs[0] * coefs[2];
      if (D === 0) nullen = [-coefs[1] / (2 * coefs[0])];
      else if (D > 0) {
        nullen = [(-coefs[1] - Math.sqrt(D)) / (2 * coefs[0]), (-coefs[1] + Math.sqrt(D)) / (2 * coefs[0])]
          .sort(function (u, v) { return u - v; });
      }
    }
    var nulTex = nullen.map(function (r) {
      return m("x = " + (coefs.length === 2 ? breuk(-coefs[1], coefs[0]) : String(Math.round(r * 1e9) / 1e9)));
    });
    return { tex: "\\operatorname{sgn}(" + binnen + ")", f: f, x: [-4.5, 4.5], y: [-2, 2],
      sprong: 0.5, punten: sprongPunten(f, nullen),
      uitleg: "Het tekenverloop van " + m(binnen) + " als functie: " + m("1") + " waar die " +
        "positief is, " + m("-1") + " waar die negatief is" +
        (nullen.length ? " en " + m("0") + " voor " + opsomming(nulTex) : "") + "." };
  }

  /* --- De indeling --------------------------------------------------------- */

  // enkel: hoe de uitleg een voorbeeld van deze soort noemt.
  var BOOM = {
    id: "reeel", naam: "Reële functies",
    def: "Een verband \\(f\\colon \\R \\to \\R\\colon x \\mapsto y = f(x)\\) " +
      "waarbij met elke \\(x\\) ten hoogste één \\(y\\) overeenkomt.",
    kinderen: [
      {
        id: "algebraisch", naam: "Algebraïsche functies", kort: "Algebraïsch",
        enkel: "een algebraïsche functie",
        def: "In het voorschrift komen enkel de bewerkingen \\(+\\), \\(-\\), " +
          "\\(\\cdot\\), \\(:\\) en \\(\\sqrt[n]{\\phantom{x}}\\) voor.",
        kinderen: [
          {
            id: "veelterm", naam: "Veeltermfuncties", kort: "Veelterm",
            enkel: "een veeltermfunctie",
            def: "Het voorschrift is een veelterm in \\(x\\): " +
              "\\(f(x) = a_nx^n + \\cdots + a_1x + a_0\\) met \\(a_i \\in \\R\\) " +
              "en \\(a_n \\neq 0\\).",
            kinderen: [
              { id: "constant", naam: "Constante functie", kort: "Constant",
                enkel: "een constante functie", maak: constante,
                def: "\\(f(x) = a\\) met \\(a \\in \\R\\). De grafiek is een rechte " +
                  "evenwijdig met de \\(x\\)-as, door \\((0, a)\\)." },
              { id: "eerstegraads", naam: "Eerstegraadsfunctie", kort: "1e graad",
                enkel: "een eerstegraadsfunctie", maak: eerstegraads,
                def: "\\(f(x) = ax + b\\) met \\(a \\neq 0\\). De grafiek is een " +
                  "rechte met richtingscoëfficiënt \\(a\\)." },
              { id: "tweedegraads", naam: "Tweedegraadsfunctie", kort: "2e graad",
                enkel: "een tweedegraadsfunctie", maak: tweedegraads,
                def: "\\(f(x) = ax^2 + bx + c\\) met \\(a \\neq 0\\). De grafiek is " +
                  "een parabool." },
              { id: "hogeregraads", naam: "Hogeregraadsfunctie", kort: "Hogere graad",
                enkel: "een hogeregraadsfunctie", maak: hogeregraads,
                def: "Een veeltermfunctie van graad \\(> 2\\)." }
            ]
          },
          { id: "rationaal", naam: "Rationale functies", kort: "Rationaal",
            enkel: "een rationale functie", maak: rationaal,
            def: "Het voorschrift is een quotiënt van 2 veeltermen, waarbij de noemer " +
              "niet de nulveelterm is." },
          { id: "irrationaal", naam: "Irrationale functies", kort: "Irrationaal",
            enkel: "een irrationale functie", maak: irrationaal,
            def: "Een algebraïsche functie die geen rationale functie is: \\(x\\) " +
              "staat onder 1 of meerdere worteltekens." }
        ]
      },
      {
        id: "transcendent", naam: "Transcendente functies", kort: "Transcendent",
        enkel: "een transcendente functie",
        def: "Een reële functie die geen algebraïsche functie is.",
        kinderen: [
          { id: "gonio", naam: "Goniometrische functies", kort: "Goniometrisch",
            enkel: "een goniometrische functie", maak: goniometrisch,
            def: "\\(\\sin x\\), \\(\\cos x\\), \\(\\tan x\\) en \\(\\cot x\\), met " +
              "\\(x\\) in radialen." },
          { id: "cyclo", naam: "Cyclometrische functies", kort: "Cyclometrisch",
            enkel: "een cyclometrische functie", maak: cyclometrisch,
            def: "De inverse functies van de goniometrische functies: \\(\\Bgsin x\\), " +
              "\\(\\Bgcos x\\), \\(\\Bgtan x\\) en \\(\\Bgcot x\\)." },
          { id: "log", naam: "Logaritmische functies", kort: "Logaritmisch",
            enkel: "een logaritmische functie", maak: logaritmisch,
            def: "\\(f(x) = \\log_a x\\) met \\(a \\in \\R_0^+ \\setminus \\{1\\}\\)." },
          { id: "exp", naam: "Exponentiële functies", kort: "Exponentieel",
            enkel: "een exponentiële functie", maak: exponentieel,
            def: "\\(f(x) = a^x\\) met \\(a \\in \\R_0^+ \\setminus \\{1\\}\\)." },
          { id: "hyp", naam: "Hyperbolische functies", kort: "Hyperbolisch",
            enkel: "een hyperbolische functie", maak: hyperbolisch,
            def: "Opgebouwd uit \\(e^x\\) en \\(e^{-x}\\), zoals " +
              "\\(\\sinh x = \\frac{e^x - e^{-x}}{2}\\) en \\(\\cosh x = \\frac{e^x + e^{-x}}{2}\\)." },
          { id: "gfunctie", naam: "G-functie", enkel: "een G-functie", maak: gFunctie,
            def: "\\(G(x) = \\lfloor x \\rfloor\\): het grootste geheel getal niet " +
              "groter dan \\(x\\), dus \\(G(x) \\leq x < G(x) + 1\\) en \\(G(x) \\in \\Z\\)." },
          { id: "sign", naam: "Signfunctie", enkel: "een signfunctie", maak: signfunctie,
            def: "\\(\\operatorname{sgn}(x)\\) is \\(1\\) voor \\(x > 0\\), \\(-1\\) " +
              "voor \\(x < 0\\) en \\(0\\) voor \\(x = 0\\)." }
        ]
      }
    ]
  };

  function hoofdletter(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Een voorbeeld van een soort: bij een eindsoort van haar maker, anders van
  // een willekeurige deelsoort. De uitleg begint dan met de weg naar boven:
  // "Een tweedegraadsfunctie, dus een veeltermfunctie en een algebraïsche
  // functie."
  function maakVoorbeeld(soort) {
    var pad = [], s = soort;
    while (!s.maak) { s = kies(s.kinderen); pad.unshift(s); }
    var v = s.maak();
    if (pad.length) {
      var namen = pad.map(function (p) { return p.enkel; });
      v.uitleg = hoofdletter(namen[0]) +
        (namen.length > 1 ? ", dus " + opsomming(namen.slice(1)) : "") + ". " + v.uitleg;
    }
    v.venster = venster(v);
    return v;
  }

  // Het venster van de grafiek: het gevraagde x-interval met de oorsprong
  // erin, en verticaal wat de functie daar bereikt. Bij een asymptoot tellen
  // de uitschieters niet mee.
  function venster(v) {
    var x0 = Math.min(v.x[0], -1), x1 = Math.max(v.x[1], 1);
    if (v.y) return [x0, x1, v.y[0], v.y[1]];
    var ys = [];
    for (var i = 0; i <= 300; i++) {
      var y = v.f(x0 + (x1 - x0) * i / 300);
      if (isFinite(y)) ys.push(y);
    }
    ys.sort(function (a, b) { return a - b; });
    var lo = ys[0], hi = ys[ys.length - 1];
    if (v.asymptoot) {
      lo = ys[Math.floor(ys.length * 0.06)];
      hi = ys[Math.floor(ys.length * 0.94)];
    }
    lo = Math.min(lo, 0); hi = Math.max(hi, 0);
    if (hi - lo < 2) { lo -= (2 - (hi - lo)) / 2; hi = lo + 2; }
    var rand = Math.max((hi - lo) * 0.12, 0.5);
    return [x0, x1, lo - rand, hi + rand];
  }

  /* --- MathJax ------------------------------------------------------------- */

  // MathJax zet na elkaar; een snelle reeks klikken mag geen verouderde
  // formule achterlaten. De nieuwe inhoud wordt onzichtbaar gezet en pas
  // daarna gewisseld, zodat er geen ruwe LaTeX in beeld komt.
  //
  // De macro's van de cursus (\R, \Z, \Bgsin) staan als verborgen
  // \newcommand in de pagina en bestaan pas nadat MathJax de pagina zelf
  // gezet heeft. Een grafiek op de eerste slide bouwt vroeger; de wachtrij
  // begint daarom bij startup.promise.
  var wachtrij = new Promise(function (klaar) {
    var pogingen = 0;
    function probeer() {
      var MJ = window.MathJax;
      if (MJ && MJ.startup && MJ.startup.promise) MJ.startup.promise.then(klaar, klaar);
      // Zonder MathJax (niet geladen) komt de LaTeX als gewone tekst.
      else if (++pogingen > 200) klaar();
      else window.setTimeout(probeer, 50);
    }
    probeer();
  });
  function zet(el, tekst) {
    el.a02Doel = tekst;
    wachtrij = wachtrij.then(function () {
      if (el.a02Doel !== tekst || el.a02Bron === tekst) return;
      var MJ = window.MathJax;
      if (!MJ || !MJ.typesetPromise) {
        el.a02Bron = tekst;
        el.textContent = tekst;
        return;
      }
      var nieuw = document.createElement("span");
      nieuw.textContent = tekst;
      nieuw.style.cssText = "position:absolute;visibility:hidden;left:0;top:0";
      el.appendChild(nieuw);
      return MJ.typesetPromise([nieuw]).then(function () {
        if (el.a02Doel !== tekst) { nieuw.remove(); return; }
        Array.prototype.slice.call(el.childNodes).forEach(function (kind) {
          if (kind === nieuw) return;
          if (MJ.typesetClear && kind.nodeType === 1) MJ.typesetClear([kind]);
          el.removeChild(kind);
        });
        nieuw.style.cssText = "";
        el.a02Bron = tekst;
      });
    }).catch(function (fout) { console.error(fout); });
  }

  /* --- Opmaak -------------------------------------------------------------- */

  function stijl() {
    if (document.getElementById("a02-stijl")) return;
    var el = document.createElement("style");
    el.id = "a02-stijl";
    el.textContent = `
      .a02-html > .interactieve-grafiek-bord { display:none !important; }
      .a02-laag { container-type:inline-size; padding:.8rem 1rem 1rem;
        box-sizing:border-box; color:var(--grafiek-tekst); }
      .pres-figuur-groot .a02-laag { padding-top:3rem; }
      .pres-figuur-groot.interactieve-grafiek.a02-html { justify-content:safe center;
        overflow-y:auto; }
      .a02-inhoud { display:flex; flex-direction:column; gap:1rem; }

      .a02-boomvak { overflow-x:auto; padding:.2rem 0 .4rem; }
      .a02-boom, .a02-boom ul { list-style:none; margin:0; padding:0; }
      .a02-boom li { position:relative; display:flex; align-items:center; margin:0;
        padding:.18rem 0 .18rem 1.1rem; }
      .a02-boom > li { padding-left:0; }
      .a02-boom ul { display:flex; flex-direction:column; position:relative;
        margin-left:1.1rem; }
      .a02-boom ul[hidden] { display:none; }
      .a02-boom ul::before { content:""; position:absolute; left:-1.1rem; width:1.1rem;
        top:50%; border-top:2px solid var(--grafiek-hulp); }
      .a02-boom ul > li::before { content:""; position:absolute; left:0; width:1.1rem;
        top:50%; border-top:2px solid var(--grafiek-hulp); }
      .a02-boom ul > li::after { content:""; position:absolute; left:0; top:0; bottom:0;
        border-left:2px solid var(--grafiek-hulp); }
      .a02-boom ul > li:first-child::after { top:50%; }
      .a02-boom ul > li:last-child::after { bottom:50%; }
      .a02-boom ul > li:only-child::after { display:none; }
      .a02-boom ul.a02-nieuw > li > .a02-knoop { animation:a02-in .25s ease-out; }
      @keyframes a02-in { from { opacity:0; transform:translateX(-.5rem); } }
      @media (prefers-reduced-motion: reduce) {
        .a02-boom ul.a02-nieuw > li > .a02-knoop { animation:none; }
      }

      .a02-knoop { display:inline-flex; align-items:stretch; flex-shrink:0;
        border:1px solid var(--kleur-lijn); border-radius:var(--straal);
        background:var(--kleur-vlak); white-space:nowrap; }
      .a02-laag .a02-knoop button { font:inherit; color:inherit; background:transparent;
        border:0; margin:0; cursor:pointer; border-radius:0; }
      .a02-laag .a02-naam { padding:.3rem .5rem; display:inline-flex;
        align-items:center; gap:.35rem; }
      .a02-heeftkort { display:none; }
      .a02-pijl { display:inline-block; transition:transform .2s; color:var(--grafiek-zwak); }
      .a02-naam[aria-expanded="true"] .a02-pijl { transform:rotate(90deg); }
      .a02-laag .a02-knoop button:hover {
        background:color-mix(in srgb, var(--grafiek-punt) 9%, transparent); }
      .a02-laag .a02-knoop button:focus-visible {
        outline:3px solid var(--grafiek-punt); outline-offset:-3px; }
      .a02-knoop.a02-gekozen { border-color:var(--grafiek-punt);
        background:color-mix(in srgb, var(--grafiek-punt) 13%, var(--kleur-vlak));
        font-weight:600; }

      .a02-paneel { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 22rem);
        gap:.6rem 1.5rem; align-items:start; border-top:1px solid var(--kleur-lijn);
        padding-top:.8rem; min-height:15rem; }
      .a02-tekst { display:flex; flex-direction:column; gap:.55rem; min-width:0; }
      .a02-titel { font-weight:600; font-size:1.05rem; }
      .a02-def { line-height:1.5; }
      .a02-formule { font-size:1.25rem; min-height:2.6rem; overflow-x:auto; overflow-y:hidden; }
      .a02-formule mjx-container { margin:0 !important; }
      .a02-uitleg { line-height:1.5; min-height:4.5rem; }
      .a02-laag .a02-volgende { align-self:flex-start; font:inherit; font-size:.9rem;
        padding:.25rem .7rem; color:inherit; background:var(--kleur-vlak);
        border:1px solid var(--kleur-lijn); border-radius:var(--straal); cursor:pointer; }
      .a02-grafiek { width:100%; height:auto; display:block; }
      .a02-grafiek .a02-as { stroke:var(--grafiek-as); stroke-width:1.2; }
      .a02-grafiek .a02-streep { stroke:var(--grafiek-as); stroke-width:1; }
      .a02-grafiek .a02-raster { stroke:var(--grafiek-raster); stroke-width:1; }
      .a02-grafiek .a02-kromme { stroke:var(--grafiek-punt); stroke-width:2.5; fill:none;
        stroke-linejoin:round; stroke-linecap:round; }
      .a02-grafiek .a02-vol { fill:var(--grafiek-punt); }
      .a02-grafiek .a02-open { fill:var(--grafiek-vlak); stroke:var(--grafiek-punt);
        stroke-width:2; }
      .a02-grafiek text { fill:var(--grafiek-tekst); font-size:12px; }
      .a02-grafiek .a02-leeg { fill:var(--grafiek-zwak); font-size:13px; }
      /* Past de boom niet in de breedte, dan wordt hij een ingesprongen
         lijst met de volledige namen, met het paneel ernaast of eronder. */
      @container (max-width: 46rem) {
        .a02-inhoud { display:grid; grid-template-columns:max-content minmax(0, 1fr);
          gap:1.5rem; align-items:start; }
        .a02-paneel { grid-template-columns:minmax(0, 1fr); border-top:0; padding-top:0;
          border-left:1px solid var(--kleur-lijn); padding-left:1.5rem; }
        .a02-grafiek { max-width:24rem; }
        .a02-heeftkort { display:inline; }
        .a02-kort { display:none; }
        .a02-boom li, .a02-boom ul > li { display:block; padding:.15rem 0 .15rem 1.1rem; }
        .a02-boom > li { padding-left:0; }
        .a02-boom ul { margin-left:.6rem; padding-top:.1rem; }
        .a02-boom ul::before { display:none; }
        .a02-boom ul > li::before { top:1.2rem; width:1rem; }
        .a02-boom ul > li:first-child::after { top:0; }
        .a02-boom ul > li:last-child::after { bottom:auto; height:1.2rem; }
        .a02-boom ul > li:only-child::after { display:block; }
        .a02-boom ul.a02-nieuw > li > .a02-knoop { animation-name:a02-neer; }
        @keyframes a02-neer { from { opacity:0; transform:translateY(-.3rem); } }
      }
      @container (max-width: 36rem) {
        .a02-inhoud { grid-template-columns:minmax(0, 1fr); }
        .a02-paneel { border-left:0; padding-left:0; border-top:1px solid var(--kleur-lijn);
          padding-top:.8rem; }
        .a02-heeftkort { display:none; }
        .a02-kort { display:inline; }
      }
    `;
    document.head.appendChild(el);
  }

  function el(soort, klasse, inhoud) {
    var e = document.createElement(soort);
    if (klasse) e.className = klasse;
    if (inhoud !== undefined) e.textContent = inhoud;
    return e;
  }

  var SVG = "http://www.w3.org/2000/svg";
  function svg(soort, attributen, ouder) {
    var e = document.createElementNS(SVG, soort);
    Object.keys(attributen).forEach(function (k) { e.setAttribute(k, attributen[k]); });
    if (ouder) ouder.appendChild(e);
    return e;
  }

  // De runtime verwacht een bord van JSXGraph. Het blijft leeg en verborgen;
  // de HTML-laag staat ervoor in de gewone stroom van de figuur.
  function maakLaag(ctx) {
    ctx.maakBord({ begrenzing: [-5, 5, 5, -5], assen: false });
    stijl();
    ctx.figuur.classList.add("a02-html");
    var laag = el("div", "a02-laag");
    ctx.figuur.insertBefore(laag, ctx.element);
    return laag;
  }

  /* --- Grafiek van een voorbeeld ------------------------------------------ */

  var B = 360, H = 240;

  function tekenGrafiek(doel, v) {
    while (doel.firstChild) doel.removeChild(doel.firstChild);
    if (!v) {
      var leeg = svg("text", { x: B / 2, y: H / 2, "text-anchor": "middle", "class": "a02-leeg" }, doel);
      leeg.textContent = "Hier komt de grafiek van een voorbeeld.";
      doel.setAttribute("aria-label", "Nog geen voorbeeld gekozen");
      return;
    }
    doel.setAttribute("aria-label", "Grafiek van f(x) = " + v.tex);
    var x0 = v.venster[0], x1 = v.venster[1], y0 = v.venster[2], y1 = v.venster[3];
    function sx(x) { return (x - x0) / (x1 - x0) * B; }
    function sy(y) { return H - (y - y0) / (y1 - y0) * H; }

    // Raster en streepjes per eenheid, of per 2, 5 of 10 bij een groter venster.
    function stap(breedte) { return breedte > 60 ? 10 : breedte > 24 ? 5 : breedte > 12 ? 2 : 1; }
    var dx = stap(x1 - x0), dy = stap(y1 - y0), k;
    for (k = Math.ceil(x0 / dx) * dx; k <= x1; k += dx) {
      svg("line", { x1: sx(k), x2: sx(k), y1: 0, y2: H, "class": "a02-raster" }, doel);
    }
    for (k = Math.ceil(y0 / dy) * dy; k <= y1; k += dy) {
      svg("line", { x1: 0, x2: B, y1: sy(k), y2: sy(k), "class": "a02-raster" }, doel);
    }
    var ox = sx(0), oy = sy(0);
    svg("line", { x1: 0, x2: B, y1: oy, y2: oy, "class": "a02-as" }, doel);
    svg("line", { x1: ox, x2: ox, y1: 0, y2: H, "class": "a02-as" }, doel);
    svg("path", { d: "M" + (B - 8) + " " + (oy - 4) + "L" + B + " " + oy + "L" + (B - 8) + " " + (oy + 4),
      "class": "a02-as", fill: "none" }, doel);
    svg("path", { d: "M" + (ox - 4) + " 8L" + ox + " 0L" + (ox + 4) + " 8",
      "class": "a02-as", fill: "none" }, doel);
    svg("text", { x: B - 6, y: oy - 8, "text-anchor": "end" }, doel).textContent = "x";
    svg("text", { x: ox + 8, y: 13 }, doel).textContent = "y";
    svg("line", { x1: sx(dx), x2: sx(dx), y1: oy - 4, y2: oy + 4, "class": "a02-streep" }, doel);
    svg("text", { x: sx(dx), y: oy + 16, "text-anchor": "middle" }, doel).textContent = String(dx);
    svg("line", { x1: ox - 4, x2: ox + 4, y1: sy(dy), y2: sy(dy), "class": "a02-streep" }, doel);
    svg("text", { x: ox - 7, y: sy(dy) + 4, "text-anchor": "end" }, doel).textContent = String(dy);

    // De kromme: bemonsteren, onderbreken buiten het domein en bij een
    // sprong, en aan de rand van het domein het eindpunt opzoeken.
    var bereik = y1 - y0, sprong = v.sprong || bereik / 2;
    var grens = function (y) { return Math.max(y0 - 10 * bereik, Math.min(y1 + 10 * bereik, y)); };
    function waarde(x) { var y = v.f(x); return isFinite(y) ? y : NaN; }
    function rand(a, b) {
      // a ligt in het domein, b niet: zoek de overgang.
      for (var i = 0; i < 40; i++) {
        var m = (a + b) / 2;
        if (isNaN(waarde(m))) b = m; else a = m;
      }
      return a;
    }
    var n = 600, d = "", vorig = null;
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = waarde(x);
      if (isNaN(y)) {
        if (vorig) {
          var xr = rand(vorig.x, x);
          d += "L" + sx(xr).toFixed(2) + " " + sy(grens(waarde(xr))).toFixed(2);
        }
        vorig = null;
        continue;
      }
      if (!vorig && i > 0) {
        var xl = rand(x, x0 + (x1 - x0) * (i - 1) / n);
        d += "M" + sx(xl).toFixed(2) + " " + sy(grens(waarde(xl))).toFixed(2);
        vorig = { x: xl, y: waarde(xl) };
      }
      var opnieuw = !vorig || Math.abs(y - vorig.y) > sprong;
      d += (opnieuw ? "M" : "L") + sx(x).toFixed(2) + " " + sy(grens(y)).toFixed(2);
      vorig = { x: x, y: y };
    }
    var klem = "a02-klem-" + (++klemmen);
    var clip = svg("clipPath", { id: klem }, svg("defs", {}, doel));
    svg("rect", { x: 0, y: 0, width: B, height: H }, clip);
    svg("path", { d: d, "class": "a02-kromme", "clip-path": "url(#" + klem + ")" }, doel);
    (v.punten || []).forEach(function (p) {
      if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) return;
      svg("circle", { cx: sx(p[0]), cy: sy(p[1]), r: 4, "class": p[2] === "open" ? "a02-open" : "a02-vol" }, doel);
    });
  }
  var klemmen = 0;

  /* --- De boom ------------------------------------------------------------- */

  G.registreer("indeling-reele-functies", function (ctx) {
    var laag = maakLaag(ctx);
    var knopen = Object.create(null);
    var gekozen = null, getoond = null;

    var inhoud = el("div", "a02-inhoud");
    laag.appendChild(inhoud);
    var boomvak = el("div", "a02-boomvak");
    var boom = el("ul", "a02-boom");
    boom.setAttribute("role", "tree");
    boom.setAttribute("aria-label", "Indeling van de reële functies");
    boomvak.appendChild(boom);
    inhoud.appendChild(boomvak);

    // Het paneel met de uitleg bij de gekozen soort en het voorbeeld.
    var paneel = el("div", "a02-paneel");
    var tekst = el("div", "a02-tekst");
    tekst.setAttribute("aria-live", "polite");
    var titel = el("div", "a02-titel");
    var def = el("div", "a02-def");
    var formule = el("div", "a02-formule");
    var uitleg = el("div", "a02-uitleg");
    var volgende = el("button", "a02-volgende", "Ander voorbeeld");
    volgende.type = "button";
    [titel, def, formule, uitleg, volgende].forEach(function (e) { tekst.appendChild(e); });
    var grafiek = svg("svg", { viewBox: "0 0 " + B + " " + H, "class": "a02-grafiek", role: "img" });
    paneel.appendChild(tekst);
    paneel.appendChild(grafiek);
    inhoud.appendChild(paneel);

    function bouwKnoop(soort, ouderUl, diepte, ouder) {
      var li = el("li");
      li.setAttribute("role", "none");
      var knoop = el("div", "a02-knoop");
      var naam = el("button", "a02-naam");
      naam.type = "button";
      naam.setAttribute("role", "treeitem");
      naam.setAttribute("aria-level", String(diepte));
      naam.appendChild(el("span", soort.kort ? "a02-heeftkort" : "", soort.naam));
      if (soort.kort) naam.appendChild(el("span", "a02-kort", soort.kort));
      var info = { soort: soort, li: li, knoop: knoop, naam: naam, ouder: ouder,
        ul: null, kinderen: [] };
      if (soort.kinderen) {
        naam.insertBefore(el("span", "a02-pijl", "›"), naam.firstChild);
        naam.firstChild.setAttribute("aria-hidden", "true");
        naam.setAttribute("aria-expanded", "false");
      }
      knoop.appendChild(naam);
      li.appendChild(knoop);
      ouderUl.appendChild(li);
      knopen[soort.id] = info;

      if (soort.kinderen) {
        var ul = el("ul");
        ul.setAttribute("role", "group");
        ul.hidden = true;
        li.appendChild(ul);
        info.ul = ul;
        soort.kinderen.forEach(function (kind) {
          info.kinderen.push(bouwKnoop(kind, ul, diepte + 1, info));
        });
      }

      naam.addEventListener("click", function () {
        if (info.ul) {
          var open = info.ul.hidden;
          // Bij openen klappen de broers dicht, zodat de boom smal blijft.
          if (open && info.ouder) {
            info.ouder.kinderen.forEach(function (b) { if (b !== info) sluit(b); });
          }
          if (open) opent(info); else sluit(info);
        }
        toonVoorbeeld(info);
      });
      naam.addEventListener("keydown", function (e) { toets(e, info); });
      return info;
    }

    function opent(info) {
      if (!info.ul || !info.ul.hidden) return;
      info.ul.hidden = false;
      info.naam.setAttribute("aria-expanded", "true");
      info.ul.classList.remove("a02-nieuw");
      void info.ul.offsetWidth;
      info.ul.classList.add("a02-nieuw");
    }
    function sluit(info) {
      if (!info.ul) return;
      info.kinderen.forEach(sluit);
      info.ul.hidden = true;
      info.naam.setAttribute("aria-expanded", "false");
    }

    function kies(info, voorbeeld) {
      if (gekozen) gekozen.knoop.classList.remove("a02-gekozen");
      gekozen = info;
      getoond = voorbeeld;
      info.knoop.classList.add("a02-gekozen");
      titel.textContent = info.soort.naam;
      zet(def, info.soort.def);
      zet(formule, "\\(\\displaystyle f(x) = " + voorbeeld.tex + "\\)");
      zet(uitleg, voorbeeld.uitleg);
      tekenGrafiek(grafiek, voorbeeld);
    }

    // Een nieuw willekeurig voorbeeld, nooit hetzelfde voorschrift als net.
    function toonVoorbeeld(info) {
      var v, pogingen = 0;
      do { v = maakVoorbeeld(info.soort); }
      while (getoond && gekozen === info && v.tex === getoond.tex && ++pogingen < 20);
      kies(info, v);
    }
    volgende.addEventListener("click", function () { if (gekozen) toonVoorbeeld(gekozen); });

    // Pijltjes zoals in een boomweergave: rechts opent of gaat naar het
    // eerste kind, links sluit of gaat naar de ouder, op en neer lopen langs
    // de zichtbare soorten.
    function zichtbaar() {
      return Object.keys(knopen).map(function (id) { return knopen[id]; })
        .filter(function (k) { return k.naam.offsetParent !== null; });
    }
    function toets(e, info) {
      var lijst, i;
      if (e.key === "ArrowRight" && info.ul) {
        if (info.ul.hidden) info.naam.click(); else info.kinderen[0].naam.focus();
      } else if (e.key === "ArrowLeft") {
        if (info.ul && !info.ul.hidden) info.naam.click();
        else if (info.ouder) info.ouder.naam.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        lijst = zichtbaar();
        i = lijst.indexOf(info) + (e.key === "ArrowDown" ? 1 : -1);
        if (lijst[i]) lijst[i].naam.focus();
      } else {
        return;
      }
      e.preventDefault();
    }

    bouwKnoop(BOOM, boom, 1, null);

    function herstel() {
      sluit(knopen.reeel);
      opent(knopen.reeel);
      toonVoorbeeld(knopen.reeel);
    }
    herstel();

    ctx.knop("Alles openen", function () {
      Object.keys(knopen).forEach(function (id) { opent(knopen[id]); });
    });
    ctx.knop("Alles dicht", function () {
      sluit(knopen.reeel);
      toonVoorbeeld(knopen.reeel);
    });

    return { reset: herstel };
  });
})();
