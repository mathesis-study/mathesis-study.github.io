/* Een klein computeralgebrasysteem voor de cursussite.
 *
 * Het rekent exact met breuken en wortels en kent wat de hoofdstukken over
 * afgeleiden nodig hebben: veeltermen, rationale functies, wortels en machten
 * met een rationale exponent, de goniometrische en cyclometrische functies,
 * ln, log_a, e^x en a^x. Het doel is niet enkel het antwoord: een afgeleide
 * komt stap voor stap tot stand, met bij elke stap de rekenregel uit de
 * cursus in de notatie van de cursus (Df, D(f·g) = Df·g + f·Dg, ...) en wat
 * f en g in die stap zijn.
 *
 * Het bestand is in lagen opgebouwd; elke laag gebruikt enkel de lagen erboven.
 *   Breuken       exacte rationale getallen
 *   Catalogus     de elementaire functies, elk op één plaats beschreven
 *   Lezen         van getypte tekst naar een boom
 *   De boom       uitdrukkingen zoals de leerling ze typte
 *   Tonen         de boom in LaTeX
 *   Afleiden      stap voor stap, met de rekenregels
 *   Normaalvorm   een som van termen, om te vereenvoudigen en exact in te vullen
 *   Numeriek      waarden voor een grafiek of een benadering
 *   Vormen        de normaalvorm terug als leesbare boom
 *   Functie       een functie van één veranderlijke, de ingang voor hergebruik
 *   Omgeving      de rekenmachine: één regel invoer, een antwoord in blokken
 *
 * Er zijn dus twee voorstellingen van een uitdrukking.
 *  - De boom (k: "num", "sym", "add", "sub", "neg", "mul", "div", "pow",
 *    "fn", "call", "D") volgt wat de leerling typte. Daarop lopen de stappen
 *    van het afleiden, en die boom wordt letterlijk getoond.
 *  - De som (een lijst van termen coëfficiënt maal factoren met een rationale
 *    exponent) is de normaalvorm om te vereenvoudigen, exact in te vullen en
 *    numeriek te plotten.
 *
 * Een nieuwe functie toevoegen gaat met registreerFunctie (zie de catalogus):
 * de lezer, het tonen, het afleiden, de normaalvorm en de grafiek halen alles
 * daar. Hergebruik buiten de rekenmachine gaat via FunctieCAS.functie(...),
 * bijvoorbeeld in de module van een interactieve grafiek met de regel
 * "mkpi: gebruikt functiecas.js".
 *
 * Het bestand heeft geen DOM nodig: functierekenmachine.js bouwt er de
 * vensters rond, en bin/tests/functiecas*.test.js test het onder Node.
 */
(function (wereld) {
  "use strict";

  /* --- Breuken ---------------------------------------------------------- */

  function bggd(a, b) {
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function Q(n, d) {
    n = BigInt(n);
    d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) throw new Rekenfout("Delen door nul kan niet.");
    if (d < 0n) { n = -n; d = -d; }
    var g = bggd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }
  var NUL = Q(0), EEN = Q(1), MIN_EEN = Q(-1), HALF = Q(1, 2);
  function qplus(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
  function qmin(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
  function qmaal(a, b) { return Q(a.n * b.n, a.d * b.d); }
  function qdeel(a, b) {
    if (b.n === 0n) throw new Rekenfout("Delen door nul kan niet.");
    return Q(a.n * b.d, a.d * b.n);
  }
  function qneg(a) { return { n: -a.n, d: a.d }; }
  function qis(a, b) { return a.n === b.n && a.d === b.d; }
  function qnul(a) { return a.n === 0n; }
  function qheel(a) { return a.d === 1n; }
  function qteken(a) { return a.n < 0n ? -1 : a.n > 0n ? 1 : 0; }
  function qgetal(a) { return Number(a.n) / Number(a.d); }
  function qabs(a) { return a.n < 0n ? qneg(a) : a; }
  function qvloer(a) {
    var q = a.n / a.d;
    if (a.n < 0n && q * a.d !== a.n) q -= 1n;
    return q;
  }
  function qmacht(a, k) {
    // k is een BigInt of een klein getal
    k = BigInt(k);
    if (k < 0n) { if (a.n === 0n) throw new Rekenfout("Delen door nul kan niet."); a = Q(a.d, a.n); k = -k; }
    if (k > 400n) throw new Rekenfout("Die macht is te groot voor deze rekenmachine.");
    var n = 1n, d = 1n;
    for (var i = 0n; i < k; i++) { n *= a.n; d *= a.d; }
    return Q(n, d);
  }
  function qtekst(a) { return a.d === 1n ? String(a.n) : a.n + "/" + a.d; }
  // Het kleinste gemene veelvoud van de noemers.
  function kgvNoemers(lijst) {
    return lijst.reduce(function (acc, q) { return acc / bggd(acc, q.d) * q.d; }, 1n);
  }

  function Rekenfout(bericht) {
    this.message = bericht;
  }
  Rekenfout.prototype = Object.create(Error.prototype);
  Rekenfout.prototype.name = "Rekenfout";

  // Een fout in wat de leerling typte, met de plaats waar het misloopt.
  function Invoerfout(bericht, plaats) {
    this.message = bericht;
    this.plaats = plaats;
  }
  Invoerfout.prototype = Object.create(Error.prototype);
  Invoerfout.prototype.name = "Invoerfout";

  /* --- De boom: bouwstenen ---------------------------------------------- */

  function num(q, tekst) { return { k: "num", q: q, tekst: tekst }; }
  function sym(n) { return { k: "sym", n: n }; }
  function bin(k, a, b) { return { k: k, a: a, b: b }; }
  function neg(a) { return { k: "neg", a: a }; }
  function fn(n, a, index) { var f = { k: "fn", n: n, a: a }; if (index !== undefined) f.index = index; return f; }
  function Dk(a, v) { var d = { k: "D", a: a }; if (v) d.v = v; return d; }
  function heelgetal(k) { return num(Q(k)); }
  function wortelBoom(onder, n) { return fn("wortel", onder, Number(n)); }

  var OPDRACHTEN = { raaklijn: "raaklijn", normaal: "normaal", wis: "wis" };
  // Namen die een leerling kan proberen maar die hier niet bestaan: beter
  // een duidelijke melding dan a·b·s.
  var ONBEKEND = {
    abs: "De absolute waarde kent deze rekenmachine niet.",
    lim: "Limieten kent deze rekenmachine niet."
  };
  // Alle namen, de langste eerst, zodat "sqrtx" als sqrt gevolgd door x leest.
  var NAMEN = [];
  function herbouwNamen() {
    NAMEN = Object.keys(NAAM_NAAR).concat(Object.keys(OPDRACHTEN), Object.keys(ONBEKEND), ["pi"])
      .sort(function (a, b) { return b.length - a.length; });
  }

  /* --- Catalogus van de elementaire functies ------------------------------ */

  // Elke functie staat hier één keer, met alles wat de andere lagen over haar
  // moeten weten. Een definitie heeft
  //   naam       de interne naam, ook in de boom: { k: "fn", n: naam, a: ... }
  //   namen      wat de leerling mag typen (sin, arcsin, ...)
  //   operator   LaTeX voor een gewone functie, zoals \sin; zo'n functie mag
  //              ook zonder haakjes (sin x) en met een macht (sin^2 x)
  //   tex(e)     LaTeX voor een functie met een eigen schrijfwijze (wortels)
  //   waarde(a, e)  de numerieke waarde in a
  //   exact(a)   een bijzondere waarde als som (sin(π/6) = 1/2), of null; kan
  //              een Rekenfout geven buiten het domein
  //   normaal(e, a)  de normaalvorm, voor functies die geen gewone grond zijn
  //   pariteit   "even" of "oneven": sin(-x) = -sin x
  //   buiten(e)  de afgeleide van de buitenste functie, als boom in e.a
  //   regels     { sleutel: formule }; de sleutel naam + "X" is de
  //              basisformule, naam de formule met de kettingregel
  //   regel(e, bijX)  de sleutel van de gebruikte formule, als dat niet
  //              naam of naam + "X" is
  //   met(e)     wat er naast f nog in de formule staat, zoals [["n", 4]]
  //   soort      "wortel" of "macht" (e^x) voor de schrijfwijze: na zo'n
  //              factor staat geen maalteken
  var CATALOGUS = {}, VOLGORDE = [], NAAM_NAAR = {};
  var REGELS = {
    constante: "Dc = 0",
    x: "Dx = 1",
    som: "D(f\\pm g) = Df \\pm Dg",
    tegengestelde: "D(-f) = -Df",
    constanteMaal: "D(c\\cdot f) = c\\cdot Df",
    product: "D(f\\cdot g) = Df\\cdot g + f\\cdot Dg",
    deelConstante: "D\\dfrac{f}{c} = \\dfrac{Df}{c}",
    omgekeerde: "D\\dfrac{1}{f} = \\dfrac{-Df}{f^2}",
    omgekeerdeX: "D\\dfrac{1}{x} = \\dfrac{-1}{x^2}",
    quotient: "D\\dfrac{f}{g} = \\dfrac{Df\\cdot g - f\\cdot Dg}{g^2}",
    machtX: "Dx^{q} = q\\cdot x^{q-1}",
    macht: "D\\bigl(f^{q}\\bigr) = q\\cdot f^{q-1}\\cdot Df",
    grondtalX: "Da^{x} = a^{x}\\cdot\\ln a",
    grondtal: "Da^{f} = a^{f}\\cdot\\ln a\\cdot Df"
  };

  function registreerFunctie(def) {
    if (!def.naam || !def.namen || !def.namen.length) throw new Error("Een functie heeft een naam en namen.");
    if (!def.normaal && !def.waarde) throw new Error(def.naam + " heeft een waarde nodig.");
    def.volgorde = VOLGORDE.length;
    if (!CATALOGUS[def.naam]) VOLGORDE.push(def.naam);
    CATALOGUS[def.naam] = def;
    def.namen.forEach(function (n) { NAAM_NAAR[n] = def.naam; });
    for (var s in def.regels || {}) REGELS[s] = def.regels[s];
    herbouwNamen();
    return def;
  }

  function isGewoneFunctie(e) { return e.k === "fn" && !!CATALOGUS[e.n].operator; }
  function soortVan(e) { return e.k === "fn" ? CATALOGUS[e.n].soort || "gewoon" : null; }

  // Bijzondere waarden van de goniometrische functies, in graden: enkel
  // veelvouden van 30° en 45°, zoals in de tabel van de cursus.
  function graden(a) {
    var c;
    if (!a.length) c = NUL;
    else if (a.length === 1 && a[0].f.length === 1 && a[0].f[0].b.s === "s:pi" && qis(a[0].f[0].e, EEN)) c = a[0].c;
    else return null;
    var g = qmaal(c, Q(180));
    if (!qheel(g)) return null;
    var n = Number(g.n);
    return n % 30 === 0 || n % 45 === 0 ? n : null;
  }
  function sinusGraden(n) {
    n = ((n % 360) + 360) % 360;
    var teken = EEN;
    if (n >= 180) { n -= 180; teken = MIN_EEN; }
    if (n > 90) n = 180 - n;
    var w;
    switch (n) {
      case 0: return [];
      case 30: w = getalSom(HALF); break;
      case 45: w = somMaalGetal(getalMacht(Q(2), HALF), HALF); break;
      case 60: w = somMaalGetal(getalMacht(Q(3), HALF), HALF); break;
      case 90: w = getalSom(EEN); break;
    }
    return somMaalGetal(w, teken);
  }
  function cosinusGraden(n) { return sinusGraden(n + 90); }
  function piMaal(q) { return somMaalGetal(grondSom(symGrond("pi")), q); }
  // Zoekt de hoek (in graden, uit een lijst) waar de functie de waarde a
  // aanneemt, en geeft ze in radialen.
  function zoekHoek(a, hoeken, f) {
    var s = somSleutel(a);
    for (var i = 0; i < hoeken.length; i++) {
      var w;
      try { w = f(hoeken[i]); } catch (fout) { if (fout instanceof Rekenfout) continue; throw fout; }
      if (somSleutel(w) === s) return piMaal(Q(hoeken[i], 180));
    }
    return null;
  }
  function tussenMinEenEnEen(a, naam) {
    if (isConstanteSom(a) && Math.abs(somWaarde(a, {})) > 1 + 1e-12) {
      throw new Rekenfout(naam + " bestaat enkel voor getallen van -1 tot en met 1.");
    }
  }
  function strikPositief(a) {
    if (isGetalSom(a) ? qteken(getalVan(a)) <= 0 : isConstanteSom(a) && !(somWaarde(a, {}) > 0)) {
      throw new Rekenfout("De logaritme bestaat enkel voor strikt positieve getallen.");
    }
  }
  function lnGrondtal(q) { return fn("ln", num(q)); }

  registreerFunctie({
    naam: "wortel", namen: ["sqrt", "wortel", "cbrt", "root"], soort: "wortel",
    tex: function (e) {
      return e.index === 2 ? "\\sqrt{" + tex(e.a) + "}" : "\\sqrt[" + e.index + "]{" + tex(e.a) + "}";
    },
    waarde: function (a, e) { return reeleMacht(a, Q(1, e.index)); },
    normaal: function (e) { return normaalMacht(e.a, Q(1, e.index)); },
    buiten: function (e) {
      var n = e.index;
      var w = n === 2 ? wortelBoom(e.a, 2) : wortelBoom(bin("pow", e.a, heelgetal(n - 1)), n);
      return bin("div", heelgetal(1), bin("mul", heelgetal(n), w));
    },
    regel: function (e, bijX) { return (e.index === 2 ? "wortel" : "nwortel") + (bijX ? "X" : ""); },
    met: function (e) { return e.index === 2 ? [] : [["n", heelgetal(e.index)]]; },
    regels: {
      wortelX: "D\\sqrt{x} = \\dfrac{1}{2\\sqrt{x}}",
      wortel: "D\\sqrt{f} = \\dfrac{1}{2\\sqrt{f}}\\cdot Df",
      nwortelX: "D\\sqrt[n]{x} = \\dfrac{1}{n\\sqrt[n]{x^{n-1}}}",
      nwortel: "D\\sqrt[n]{f} = \\dfrac{1}{n\\sqrt[n]{f^{n-1}}}\\cdot Df"
    }
  });
  registreerFunctie({
    naam: "exp", namen: ["exp"], soort: "macht",
    tex: function (e) { return "e^{" + tex(e.a) + "}"; },
    waarde: Math.exp,
    normaal: function (e, a) { return expVan(a); },
    buiten: function (e) { return e; },
    regels: { expX: "De^{x} = e^{x}", exp: "De^{f} = e^{f}\\cdot Df" }
  });
  registreerFunctie({
    naam: "sin", namen: ["sin"], operator: "\\sin", pariteit: "oneven",
    waarde: Math.sin,
    exact: function (a) { var n = graden(a); return n === null ? null : sinusGraden(n); },
    buiten: function (e) { return fn("cos", e.a); },
    regels: { sinX: "D\\sin x = \\cos x", sin: "D\\sin f = \\cos f\\cdot Df" }
  });
  registreerFunctie({
    naam: "cos", namen: ["cos"], operator: "\\cos", pariteit: "even",
    waarde: Math.cos,
    exact: function (a) { var n = graden(a); return n === null ? null : cosinusGraden(n); },
    buiten: function (e) { return neg(fn("sin", e.a)); },
    regels: { cosX: "D\\cos x = -\\sin x", cos: "D\\cos f = -\\sin f\\cdot Df" }
  });
  function tangensGraden(n) {
    var c = cosinusGraden(n);
    if (!c.length) throw new Rekenfout("De tangens bestaat niet waar de cosinus nul is.");
    return somMaal(sinusGraden(n), somMacht(c, MIN_EEN));
  }
  function cotangensGraden(n) {
    var s = sinusGraden(n);
    if (!s.length) throw new Rekenfout("De cotangens bestaat niet waar de sinus nul is.");
    return somMaal(cosinusGraden(n), somMacht(s, MIN_EEN));
  }
  registreerFunctie({
    naam: "tan", namen: ["tan", "tg"], operator: "\\tan", pariteit: "oneven",
    waarde: Math.tan,
    exact: function (a) { var n = graden(a); return n === null ? null : tangensGraden(n); },
    buiten: function (e) { return bin("div", heelgetal(1), bin("pow", fn("cos", e.a), heelgetal(2))); },
    regels: { tanX: "D\\tan x = \\dfrac{1}{\\cos^2 x}", tan: "D\\tan f = \\dfrac{1}{\\cos^2 f}\\cdot Df" }
  });
  registreerFunctie({
    naam: "cot", namen: ["cot", "cotg"], operator: "\\cot", pariteit: "oneven",
    waarde: function (a) { return 1 / Math.tan(a); },
    exact: function (a) { var n = graden(a); return n === null ? null : cotangensGraden(n); },
    buiten: function (e) { return neg(bin("div", heelgetal(1), bin("pow", fn("sin", e.a), heelgetal(2)))); },
    regels: { cotX: "D\\cot x = \\dfrac{-1}{\\sin^2 x}", cot: "D\\cot f = \\dfrac{-1}{\\sin^2 f}\\cdot Df" }
  });
  function eenMinKwadraat(a) { return wortelBoom(bin("sub", heelgetal(1), bin("pow", a, heelgetal(2))), 2); }
  registreerFunctie({
    naam: "bgsin", namen: ["bgsin", "arcsin", "asin"], operator: "\\operatorname{bgsin}", pariteit: "oneven",
    waarde: Math.asin,
    exact: function (a) {
      tussenMinEenEnEen(a, "bgsin");
      return zoekHoek(a, [0, 30, 45, 60, 90, -30, -45, -60, -90], sinusGraden);
    },
    buiten: function (e) { return bin("div", heelgetal(1), eenMinKwadraat(e.a)); },
    regels: {
      bgsinX: "D\\operatorname{bgsin} x = \\dfrac{1}{\\sqrt{1-x^2}}",
      bgsin: "D\\operatorname{bgsin} f = \\dfrac{1}{\\sqrt{1-f^2}}\\cdot Df"
    }
  });
  registreerFunctie({
    naam: "bgcos", namen: ["bgcos", "arccos", "acos"], operator: "\\operatorname{bgcos}",
    waarde: Math.acos,
    exact: function (a) {
      tussenMinEenEnEen(a, "bgcos");
      return zoekHoek(a, [0, 30, 45, 60, 90, 120, 135, 150, 180], cosinusGraden);
    },
    buiten: function (e) { return neg(bin("div", heelgetal(1), eenMinKwadraat(e.a))); },
    regels: {
      bgcosX: "D\\operatorname{bgcos} x = \\dfrac{-1}{\\sqrt{1-x^2}}",
      bgcos: "D\\operatorname{bgcos} f = \\dfrac{-1}{\\sqrt{1-f^2}}\\cdot Df"
    }
  });
  registreerFunctie({
    naam: "bgtan", namen: ["bgtan", "bgtg", "arctan", "atan"], operator: "\\operatorname{bgtan}", pariteit: "oneven",
    waarde: Math.atan,
    exact: function (a) { return zoekHoek(a, [0, 30, 45, 60, -30, -45, -60], tangensGraden); },
    buiten: function (e) { return bin("div", heelgetal(1), bin("add", heelgetal(1), bin("pow", e.a, heelgetal(2)))); },
    regels: {
      bgtanX: "D\\operatorname{bgtan} x = \\dfrac{1}{1+x^2}",
      bgtan: "D\\operatorname{bgtan} f = \\dfrac{1}{1+f^2}\\cdot Df"
    }
  });
  registreerFunctie({
    naam: "ln", namen: ["ln"], operator: "\\ln",
    waarde: function (a) { return a > 0 ? Math.log(a) : NaN; },
    normaal: function (e, a) { return lnVan(a); },
    buiten: function (e) { return bin("div", heelgetal(1), e.a); },
    regels: { lnX: "D\\ln x = \\dfrac{1}{x}", ln: "D\\ln f = \\dfrac{1}{f}\\cdot Df" }
  });
  // log_a met een rationaal grondtal a (in e.index); log zonder grondtal is
  // de briggse logaritme, met grondtal 10.
  registreerFunctie({
    naam: "log", namen: ["log"], grondtal: true,
    tex: function (e) {
      var g = qis(e.index, Q(10)) ? "\\log" : "\\log_{" + numTex(e.index) + "}";
      return g + fnArgument(e.a);
    },
    waarde: function (a, e) { return a > 0 ? Math.log(a) / Math.log(qgetal(e.index)) : NaN; },
    normaal: function (e, a) { return logVan(a, e.index); },
    buiten: function (e) { return bin("div", heelgetal(1), bin("mul", e.a, lnGrondtal(e.index))); },
    met: function (e) { return [["a", num(e.index)]]; },
    regels: {
      logX: "D\\log_a x = \\dfrac{1}{x\\ln a}",
      log: "D\\log_a f = \\dfrac{1}{f\\ln a}\\cdot Df"
    }
  });

  /* --- Lezen ------------------------------------------------------------ */


  function tokens(tekst) {
    var uit = [], i = 0;
    tekst = tekst.replace(/[−–]/g, "-").replace(/[·×⋅∙]/g, "*").replace(/÷/g, "/")
                 .replace(/[’′`]/g, "'").replace(/″/g, "''");
    while (i < tekst.length) {
      var c = tekst[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^[0-9]*\.?[0-9]*/.exec(tekst.slice(i))[0];
        if (m === ".") throw new Invoerfout("Een punt hoort bij een getal, zoals 0.5.", i);
        if ((m.match(/\./g) || []).length > 1) throw new Invoerfout("Een getal heeft hoogstens één decimale punt.", i);
        uit.push({ t: "num", v: m, p: i });
        i += m.length;
        continue;
      }
      if (/[A-Za-z]/.test(c)) {
        var rest = tekst.slice(i).toLowerCase(), naam = null;
        for (var j = 0; j < NAMEN.length; j++) {
          if (rest.indexOf(NAMEN[j]) === 0) { naam = NAMEN[j]; break; }
        }
        if (naam && ONBEKEND[naam]) throw new Invoerfout(ONBEKEND[naam], i);
        if (naam) {
          uit.push({ t: "naam", v: naam, p: i });
          i += naam.length;
        } else {
          uit.push({ t: "naam", v: c, p: i });
          i++;
        }
        continue;
      }
      if (c === "*" && tekst[i + 1] === "*") { uit.push({ t: "^", p: i }); i += 2; continue; }
      if (c === "π") { uit.push({ t: "naam", v: "pi", p: i }); i++; continue; }
      if (c === "√") { uit.push({ t: "naam", v: "sqrt", p: i, wortelteken: 2 }); i++; continue; }
      if (c === "∛") { uit.push({ t: "naam", v: "sqrt", p: i, wortelteken: 3 }); i++; continue; }
      if (c === "²" || c === "³") { uit.push({ t: "macht", v: c === "²" ? 2 : 3, p: i }); i++; continue; }
      if ("+-*/^()=,'_".indexOf(c) >= 0) { uit.push({ t: c, p: i }); i++; continue; }
      if (c === "|") throw new Invoerfout(ONBEKEND.abs, i);
      if (c === "[" || c === "{") { uit.push({ t: "(", p: i }); i++; continue; }
      if (c === "]" || c === "}") { uit.push({ t: ")", p: i }); i++; continue; }
      throw new Invoerfout("Het teken " + c + " ken ik niet.", i);
    }
    uit.push({ t: "einde", p: tekst.length });
    return uit;
  }

  function getal(tekst) {
    var delen = tekst.split(".");
    var heel = delen[0] || "0", dec = delen[1] || "";
    var n = BigInt(heel + dec), d = 10n ** BigInt(dec.length);
    return Q(n, d);
  }

  function isFunctienaam(v) { return /^[a-wyzA-CE-Z]$/.test(v) && v !== "e"; }
  // De veranderlijke van een definitie: één letter, maar geen e of D.
  function isVeranderlijke(v) { return /^[a-zA-Z]$/.test(v) && v !== "e" && v !== "D"; }

  // Leest één regel: een definitie f(x) = ..., een opdracht raaklijn(f, 2) of
  // een uitdrukking.
  function lees(tekst) {
    var ts = tokens(tekst), i = 0;
    function kijk(o) { return ts[i + (o || 0)]; }
    function neem(t, bericht) {
      if (ts[i].t !== t) throw new Invoerfout(bericht || ("Hier verwacht ik " + t + "."), ts[i].p);
      return ts[i++];
    }

    function som() {
      var links = product();
      while (kijk().t === "+" || kijk().t === "-") {
        var op = ts[i++].t;
        var rechts = product();
        links = bin(op === "+" ? "add" : "sub", links, rechts);
      }
      return links;
    }
    function begintFactor(t) {
      return t.t === "num" || t.t === "naam" || t.t === "(";
    }
    function isFunctieToken(t) {
      return t.t === "naam" && (NAAM_NAAR[t.v] || OPDRACHTEN[t.v] || t.v === "D");
    }
    function impliciet(a, b) { var r = bin("mul", a, b); r.impliciet = true; return r; }
    function product() {
      var links = eenterm();
      for (;;) {
        var t = kijk();
        if (t.t === "*" || t.t === "/") {
          i++;
          var r = eenterm();
          links = bin(t.t === "*" ? "mul" : "div", links, r);
        } else if (begintFactor(t)) {
          links = impliciet(links, macht());
        } else return links;
      }
    }
    function eenterm() {
      if (kijk().t === "-") { i++; return neg(eenterm()); }
      if (kijk().t === "+") { i++; return eenterm(); }
      return macht();
    }
    function macht() {
      var grond = achtervoegsel();
      if (kijk().t === "^") {
        i++;
        var exp = eenterm();
        return bin("pow", grond, exp);
      }
      return grond;
    }
    function achtervoegsel() {
      var a = primair();
      while (kijk().t === "macht") a = bin("pow", a, heelgetal(ts[i++].v));
      return a;
    }
    function argumenten(leegMag) {
      neem("(");
      if (leegMag && kijk().t === ")") { i++; return []; }
      var args = [som()];
      while (kijk().t === ",") { i++; args.push(som()); }
      neem(")", "Hier mis ik een sluitend haakje.");
      return args;
    }
    // Het argument zonder haakjes, zoals in sin 2x of ln x: de factoren die
    // zonder bewerkingsteken volgen, tot aan de volgende functie. Zo is
    // sin x cos x het product van sin x en cos x, en ln x/x een breuk.
    function losArgument() {
      var a = macht();
      while (begintFactor(kijk()) && !isFunctieToken(kijk())) a = impliciet(a, macht());
      return a;
    }
    // Een rationaal getal als grondtal of wortelexponent.
    function vastGetal(e, bericht, p) {
      var s;
      try { s = normaal(e); } catch (fout) { if (fout instanceof Rekenfout) s = null; else throw fout; }
      if (!s || !isGetalSom(s)) throw new Invoerfout(bericht, p);
      return getalVan(s);
    }
    function functie(t) {
      var def = CATALOGUS[NAAM_NAAR[t.v]];
      var n = def.naam, getypt = t.v;
      if (t.wortelteken) return wortelBoom(kijk().t === "(" ? argumenten()[0] : achtervoegsel(), t.wortelteken);
      if (getypt === "root") return wortelMetIndex();
      var index;
      if (n === "wortel") index = getypt === "cbrt" ? 3 : 2;
      if (def.grondtal) index = grondtal(t);
      var exponent = null;
      if (def.operator && kijk().t === "^") {
        // sin^2 x is (sin x)^2
        i++;
        exponent = eenterm();
      }
      var arg;
      if (kijk().t === "(") {
        var args = argumenten();
        if (args.length !== 1) throw new Invoerfout(getypt + " heeft één argument.", t.p);
        arg = args[0];
      } else if (begintFactor(kijk()) && !OPDRACHTEN[kijk().v]) {
        arg = losArgument();
      } else {
        throw new Invoerfout("Na " + getypt + " volgt het argument, zoals " + getypt + "(x).", kijk().p);
      }
      var e = fn(n, arg, index);
      return exponent ? bin("pow", e, exponent) : e;
    }
    // root(x, n) of root(x; n): de n-de machtswortel.
    function wortelMetIndex() {
      var t = kijk();
      if (t.t !== "(") throw new Invoerfout("Schrijf root(uitdrukking, n), bijvoorbeeld root(x, 4).", t.p);
      var args = argumenten();
      if (args.length !== 2) throw new Invoerfout("Schrijf root(uitdrukking, n), bijvoorbeeld root(x, 4).", t.p);
      var n = vastGetal(args[1], "De wortelexponent is een natuurlijk getal vanaf 2.", t.p);
      if (!qheel(n) || n.n < 2n || n.n > 100n) throw new Invoerfout("De wortelexponent is een natuurlijk getal vanaf 2.", t.p);
      return wortelBoom(args[0], n.n);
    }
    // log_2(x), log_{1/2} x, log2(x) of log(x) (grondtal 10).
    function grondtal(t) {
      var p = kijk().p, e;
      if (kijk().t === "_") {
        i++;
        if (kijk().t === "(") { i++; e = som(); neem(")", "Hier mis ik een sluitend haakje."); }
        else if (kijk().t === "num") e = primair();
        else throw new Invoerfout("Na log_ volgt het grondtal, zoals log_2(x).", kijk().p);
      } else if (kijk().t === "num" && kijk().p === t.p + t.v.length) {
        e = primair();
      } else return Q(10);
      var g = vastGetal(e, "Het grondtal van een logaritme is een getal, zoals in log_2(x).", p);
      if (qteken(g) <= 0 || qis(g, EEN)) throw new Invoerfout("Het grondtal van een logaritme is strikt positief en verschilt van 1.", p);
      return g;
    }
    function primair() {
      var t = kijk();
      if (t.t === "num") { i++; return num(getal(t.v), t.v.indexOf(".") >= 0 ? t.v : undefined); }
      if (t.t === "(") {
        i++;
        var e = som();
        neem(")", "Hier mis ik een sluitend haakje.");
        // (x^2 + 1)' is de afgeleide, zoals in de cursus.
        while (kijk().t === "'") { i++; e = Dk(e); }
        return e;
      }
      if (t.t === "naam") {
        i++;
        var v = t.v;
        if (NAAM_NAAR[v]) return functie(t);
        if (OPDRACHTEN[v]) {
          if (kijk().t !== "(") {
            throw new Invoerfout(v === "wis" ? "Schrijf wis(f): de functie die weg mag."
              : "Schrijf " + v + "(f, 2): de functie en de x-coördinaat van het punt.", kijk().p);
          }
          return { k: "opdracht", n: v, args: argumenten(v === "wis"), p: t.p };
        }
        if (v === "pi") return sym("pi");
        if (v === "D") {
          if (kijk().t === "(") {
            var a = argumenten();
            if (a.length !== 1) throw new Invoerfout("D heeft één argument: D(x^2 + 1).", t.p);
            return Dk(a[0]);
          }
          return Dk(macht());
        }
        // f(…), f'(…), f''(…): een functie die de leerling definieerde.
        var accenten = 0;
        while (kijk().t === "'") { i++; accenten++; }
        if (isFunctienaam(v) && kijk().t === "(") {
          return { k: "call", n: v, accenten: accenten, args: argumenten(), p: t.p };
        }
        if (accenten) {
          if (!isFunctienaam(v)) throw new Invoerfout("Een accent hoort bij een functienaam, zoals f'(x).", t.p);
          return { k: "call", n: v, accenten: accenten, args: null, p: t.p };
        }
        return sym(v);
      }
      if (t.t === "einde") throw new Invoerfout("Hier mis ik nog iets.", t.p);
      if (t.t === ")") throw new Invoerfout("Dit haakje sluit niets.", t.p);
      throw new Invoerfout("Hier verwacht ik een getal, x of een haakje.", t.p);
    }
    // Een letter voor een haakje is hier nog een aanroep, behalve x, e en D:
    // x(x+1) is meteen een product. Of a(x+1) een functie of een product is,
    // beslist de omgeving achteraf met de lijst van gedefinieerde functies.

    if (ts.length === 1) throw new Invoerfout("Typ een opdracht.", 0);
    // Definitie: f(x) = ..., of met een andere veranderlijke, zoals h(t) = ...
    if (ts[0].t === "naam" && isFunctienaam(ts[0].v) && ts[1].t === "(" && ts[2].t === "naam" &&
        isVeranderlijke(ts[2].v) && ts[2].v !== ts[0].v && ts[3].t === ")" && ts[4].t === "=") {
      i = 5;
      var lijf = som();
      if (kijk().t !== "einde") throw new Invoerfout("Hier verwacht ik het einde van de regel.", kijk().p);
      return { k: "definitie", n: ts[0].v, v: ts[2].v, lijf: lijf };
    }
    var e = som();
    if (kijk().t === "=") throw new Invoerfout("Een definitie schrijf je als f(x) = ..., met x als veranderlijke.", kijk().p);
    if (kijk().t === ",") throw new Invoerfout("Een komma staat enkel tussen argumenten, zoals in raaklijn(f, 2). Schrijf decimalen met een punt.", kijk().p);
    if (kijk().t !== "einde") throw new Invoerfout("Hier verwacht ik een bewerking.", kijk().p);
    return e;
  }

  /* --- De boom ---------------------------------------------------------- */

  function bevat(e, test) {
    if (!e || typeof e !== "object") return false;
    if (test(e)) return true;
    if (e.a && bevat(e.a, test)) return true;
    if (e.b && bevat(e.b, test)) return true;
    if (e.args) for (var i = 0; i < e.args.length; i++) if (bevat(e.args[i], test)) return true;
    return false;
  }
  function bevatVar(e, v) { return bevat(e, function (n) { return n.k === "sym" && n.n === v; }); }
  function bevatD(e) { return bevat(e, function (n) { return n.k === "D"; }); }
  function isNum(e, q) { return e.k === "num" && (q === undefined || qis(e.q, q)); }
  function isVar(e, v) { return e.k === "sym" && e.n === v; }

  // De letters die voor een getal kunnen staan: alles behalve e en π.
  function vrijeLetters(e) {
    var uit = [];
    bevat(e, function (n) {
      if (n.k === "sym" && n.n !== "e" && n.n !== "pi" && uit.indexOf(n.n) < 0) uit.push(n.n);
      return false;
    });
    return uit;
  }
  // Waarnaar we afleiden als niemand het zegt: x, of anders de enige letter
  // die erin staat. Zo is D(t^2) gewoon 2t.
  function kiesVeranderlijke(e) {
    var l = vrijeLetters(e);
    return l.indexOf("x") >= 0 || l.length !== 1 ? "x" : l[0];
  }

  function vervang(e, f) {
    var r = f(e);
    if (r !== undefined) return r;
    var kopie = {};
    for (var s in e) kopie[s] = e[s];
    if (e.a) kopie.a = vervang(e.a, f);
    if (e.b) kopie.b = vervang(e.b, f);
    if (e.args) kopie.args = e.args.map(function (x) { return vervang(x, f); });
    return kopie;
  }

  // Vult een boom in voor de veranderlijke v (standaard x).
  function vulIn(e, v, waarde) {
    if (waarde === undefined) { waarde = v; v = "x"; }
    return vervang(e, function (n) { if (isVar(n, v)) return waarde; });
  }

  /* --- Tonen in LaTeX --------------------------------------------------- */

  function rang(e) {
    switch (e.k) {
      case "add": case "sub": return 1;
      case "neg": return 2;
      case "mul": case "div": return 2;
      case "pow": return 4;
      case "num": return (qteken(e.q) < 0) ? 2 : (e.q.d !== 1n && !e.tekst ? 3 : 5);
      default: return 5;
    }
  }
  function haakjes(t) {
    return /\\frac|\\sqrt|\\left/.test(t) ? "\\left(" + t + "\\right)" : "(" + t + ")";
  }
  function begintMetMin(t) { return /^\s*-/.test(t); }

  function numTex(q, tekst) {
    if (tekst) return tekst.replace(/^\./, "0.");
    if (q.d === 1n) return String(q.n);
    var s = q.n < 0n ? "-" : "";
    return s + "\\frac{" + (q.n < 0n ? -q.n : q.n) + "}{" + q.d + "}";
  }

  function symTex(n) { return n === "pi" ? "\\pi" : n; }

  function tex(e) {
    switch (e.k) {
      case "num": return numTex(e.q, e.tekst);
      case "sym": return symTex(e.n);
      case "add": {
        var r = tex(e.b);
        if (begintMetMin(r)) r = haakjes(r);
        return tex(e.a) + "+" + r;
      }
      case "sub": {
        var s = tex(e.b);
        if (rang(e.b) <= 1 || begintMetMin(s)) s = haakjes(s);
        return tex(e.a) + "-" + s;
      }
      case "neg": {
        var n = tex(e.a);
        if (rang(e.a) <= 1 || begintMetMin(n)) n = haakjes(n);
        return "-" + n;
      }
      case "mul": {
        var l = tex(e.a), rr = tex(e.b);
        if (rang(e.a) <= 1) l = haakjes(l);
        if (rang(e.b) <= 2 && !(e.b.k === "mul" || e.b.k === "div") || begintMetMin(rr)) rr = haakjes(rr);
        if (maalteken(e.a, e.b, rr)) return l + "\\cdot " + rr;
        // √3 x leest als √(3x): een dunne spatie na een wortel.
        var laatste = e.a;
        while (laatste.k === "mul") laatste = laatste.b;
        if (soortVan(laatste) === "wortel" && !/^\\sqrt|^\\left|^\(/.test(rr)) return l + "\\," + rr;
        // \pi x, niet \pix: na een commando een spatie voor een letter.
        if (/\\[a-zA-Z]+$/.test(l) && /^[a-zA-Z]/.test(rr)) return l + " " + rr;
        return l + rr;
      }
      case "div": return "\\frac{" + tex(e.a) + "}{" + tex(e.b) + "}";
      case "pow": {
        var g = tex(e.a);
        if (rang(e.a) < 5 || e.a.k === "fn" || e.a.k === "D" || e.a.k === "call" && e.a.accenten) g = haakjes(g);
        if (e.a.k === "sym" && e.a.n === "e") return "e^{" + tex(e.b) + "}";
        // sin^2 x, zoals in de cursus
        if (isGewoneFunctie(e.a) && e.b.k === "num" && qheel(e.b.q) && qteken(e.b.q) > 0) {
          return CATALOGUS[e.a.n].operator + "^{" + tex(e.b) + "}" + fnArgument(e.a.a);
        }
        return g + "^{" + tex(e.b) + "}";
      }
      case "fn": {
        var def = CATALOGUS[e.n];
        return def.tex ? def.tex(e) : def.operator + fnArgument(e.a);
      }
      case "call": {
        var naam = e.n + "'".repeat(e.accenten);
        if (!e.args) return naam;
        return naam + "(" + e.args.map(tex).join(", ") + ")";
      }
      case "D": {
        var inh = tex(e.a);
        if (e.a.k === "sym" || e.a.k === "num" && qteken(e.a.q) >= 0 || soortVan(e.a) === "wortel") return "D" + (e.a.k === "fn" ? "" : " ") + inh;
        return "D" + haakjes(inh);
      }
      case "opdracht":
        return "\\text{" + e.n + "}\\left(" + e.args.map(tex).join(",\\ ") + "\\right)";
      case "definitie":
        return e.n + "(" + e.v + ") = " + tex(e.lijf);
      case "somboom":
        return tex(somBoom(e.s));
    }
    return "?";
  }

  function fnArgument(a) {
    var t = tex(a);
    return a.k === "sym" || a.k === "num" && qteken(a.q) >= 0 ? " " + t : haakjes(t);
  }

  // Tussen factoren staat een maalteken waar juxtapositie verwarrend zou
  // zijn: voor een getal, rond een D, en na een breuk of een gewone functie.
  function maalteken(a, b, rtex) {
    while (a.k === "mul") a = a.b;
    while (b.k === "mul") b = b.a;
    if (/^\s*[0-9.]/.test(rtex) || /^\\frac/.test(rtex) || /^(\\left)?\(\s*-/.test(rtex)) return true;
    if (a.k === "D" || b.k === "D") return true;
    if (a.k === "div" || b.k === "div") return true;
    if (a.k === "num" && a.q.d !== 1n) return false;
    if (a.k === "fn" && soortVan(a) === "gewoon") return true;
    if (a.k === "call" || b.k === "call") return true;
    return false;
  }

  /* --- Afleiden, stap voor stap ----------------------------------------- */

  // Wat meteen uit een basisformule komt, zonder een regel eromheen.
  function isBasis(u, v) {
    if (!bevatVar(u, v)) return true;
    if (isVar(u, v)) return true;
    if (u.k === "pow" && isVar(u.a, v) && !bevatVar(u.b, v)) return true;
    if (u.k === "fn" && isVar(u.a, v)) return true;
    if (u.k === "div" && isNum(u.a, EEN) && isVar(u.b, v)) return true;
    if (u.k === "pow" && !bevatVar(u.a, v) && isVar(u.b, v)) return true;
    // 3x en 5x^2: de constante en de macht in één beweging.
    if (u.k === "mul" && u.a.k === "num" && (isVar(u.b, v) || u.b.k === "pow" && isVar(u.b.a, v) && !bevatVar(u.b.b, v))) return true;
    return false;
  }

  function factoren(e, lijst) {
    if (e.k === "mul") { factoren(e.a, lijst); factoren(e.b, lijst); }
    else lijst.push(e);
    return lijst;
  }
  function maalLijst(lijst) {
    var r = lijst[0];
    for (var i = 1; i < lijst.length; i++) r = bin("mul", r, lijst[i]);
    return r;
  }
  function termen(e, teken, lijst) {
    if (e.k === "add") { termen(e.a, teken, lijst); termen(e.b, teken, lijst); }
    else if (e.k === "sub") { termen(e.a, teken, lijst); termen(e.b, -teken, lijst); }
    else lijst.push({ teken: teken, e: e });
    return lijst;
  }

  function getalwaarde(e) {
    // De exacte waarde van een constante exponent, of null.
    try {
      var s = normaal(e);
      if (s.length === 0) return NUL;
      if (s.length === 1 && s[0].f.length === 0) return s[0].c;
    } catch (fout) { if (!(fout instanceof Rekenfout)) throw fout; }
    return null;
  }

  // Past op D(u) precies één regel toe, afgeleid naar v. Het resultaat bevat
  // opnieuw D's van de delen van u; wat daarvan een basisformule is, rekenen
  // we meteen uit. Elke toegepaste regel komt in het logboek, met wat f, g,
  // c, q, ... in die toepassing zijn.
  function regel(u, v, logboek) {
    function gebruik(naam, met) { logboek.push({ regel: naam, met: met || [], v: v }); }
    function Dsub(w) { return isBasis(w, v) ? regel(w, v, logboek) : Dk(w, v); }

    if (!bevatVar(u, v)) { gebruik("constante"); return heelgetal(0); }
    if (isVar(u, v)) { gebruik("x"); return heelgetal(1); }
    switch (u.k) {
      case "add": case "sub": {
        gebruik("som");
        var ts = termen(u, 1, []);
        var r = null;
        ts.forEach(function (t) {
          var d = Dsub(t.e);
          if (!r) r = t.teken < 0 ? neg(d) : d;
          else r = bin(t.teken < 0 ? "sub" : "add", r, d);
        });
        return r;
      }
      case "neg":
        gebruik("tegengestelde");
        return neg(Dsub(u.a));
      case "mul": {
        var fs = factoren(u, []);
        var cst = fs.filter(function (f) { return !bevatVar(f, v); });
        var var_ = fs.filter(function (f) { return bevatVar(f, v); });
        if (cst.length) {
          var c = maalLijst(cst), rest = maalLijst(var_);
          // Bij c·x en c·x^q zegt "met f = x" niets extra.
          var eenvoudig = isVar(rest, v) || rest.k === "pow" && isVar(rest.a, v) && !bevatVar(rest.b, v);
          gebruik("constanteMaal", eenvoudig ? [] : [["c", c], ["f", rest]]);
          return bin("mul", c, Dsub(rest));
        }
        var f = var_[0], g = maalLijst(var_.slice(1));
        gebruik("product", [["f", f], ["g", g]]);
        return bin("add", bin("mul", Dsub(f), g), bin("mul", f, Dsub(g)));
      }
      case "div": {
        if (!bevatVar(u.b, v)) { gebruik("deelConstante", [["f", u.a], ["c", u.b]]); return bin("div", Dsub(u.a), u.b); }
        if (!bevatVar(u.a, v)) {
          if (isVar(u.b, v) && isNum(u.a, EEN)) { gebruik("omgekeerdeX"); return bin("div", heelgetal(-1), bin("pow", sym(v), heelgetal(2))); }
          gebruik("omgekeerde", [["f", u.b]]);
          var deel = bin("div", neg(Dsub(u.b)), bin("pow", u.b, heelgetal(2)));
          return isNum(u.a, EEN) ? deel : bin("mul", u.a, deel);
        }
        gebruik("quotient", [["f", u.a], ["g", u.b]]);
        return bin("div", bin("sub", bin("mul", Dsub(u.a), u.b), bin("mul", u.a, Dsub(u.b))),
                   bin("pow", u.b, heelgetal(2)));
      }
      case "pow": {
        if (bevatVar(u.b, v)) {
          if (bevatVar(u.a, v)) throw new Rekenfout("Een macht met " + v + " in het grondtal én in de exponent valt buiten deze rekenmachine.");
          if (u.a.k === "sym" && u.a.n === "e") {
            if (isVar(u.b, v)) { gebruik("expX"); return u; }
            gebruik("exp", [["f", u.b]]);
            return bin("mul", u, Dsub(u.b));
          }
          if (isVar(u.b, v)) { gebruik("grondtalX"); return bin("mul", u, fn("ln", u.a)); }
          gebruik("grondtal", [["a", u.a], ["f", u.b]]);
          return bin("mul", bin("mul", u, fn("ln", u.a)), Dsub(u.b));
        }
        var q = getalwaarde(u.b);
        var qmin1 = q ? num(qmin(q, EEN)) : bin("sub", u.b, heelgetal(1));
        if (isVar(u.a, v)) {
          gebruik("machtX");
          return bin("mul", q ? num(q) : u.b, bin("pow", sym(v), qmin1));
        }
        gebruik("macht", [["f", u.a], ["q", q ? num(q) : u.b]]);
        return bin("mul", bin("mul", q ? num(q) : u.b, bin("pow", u.a, qmin1)), Dsub(u.a));
      }
      case "fn": {
        var def = CATALOGUS[u.n], bijX = isVar(u.a, v);
        if (!def.buiten) throw new Rekenfout("De afgeleide van " + u.n + " kent deze rekenmachine niet.");
        var naam = def.regel ? def.regel(u, bijX) : def.naam + (bijX ? "X" : "");
        var extra = def.met ? def.met(u) : [];
        gebruik(naam, bijX ? [] : [["f", u.a]].concat(extra));
        var buiten = def.buiten(u);
        return bijX ? buiten : bin("mul", buiten, Dsub(u.a));
      }
    }
    throw new Rekenfout("Deze uitdrukking kan ik niet afleiden.");
  }

  // Eén stap: elke D in de boom krijgt één regel. Een D binnen een D (een
  // hogere afgeleide die de leerling zelf nestte) komt eerst aan de beurt.
  function stap(e, logboek) {
    if (e.k === "D") {
      var v = e.v || kiesVeranderlijke(e.a);
      if (bevatD(e.a)) return Dk(stap(e.a, logboek), v);
      return regel(e.a, v, logboek);
    }
    if (!bevatD(e)) return e;
    var kopie = {};
    for (var s in e) kopie[s] = e[s];
    if (e.a) kopie.a = stap(e.a, logboek);
    if (e.b) kopie.b = stap(e.b, logboek);
    return kopie;
  }

  // De formule van een regel, met de veranderlijke v in de plaats van x:
  // Dt = 1 als we naar t afleiden. Geen enkel LaTeX-commando in de regels
  // bevat een x, dus de letter vervangen volstaat.
  function formule(regelnaam, v) {
    var f = REGELS[regelnaam];
    return !v || v === "x" ? f : f.replace(/x/g, v);
  }

  // Het logboek van een stap als uitleg: per regel één keer de formule, met
  // eronder elke toepassing ("f = x^2 + 1, g = x - 1").
  function uitleg(logboek) {
    var uit = [], per = {};
    logboek.forEach(function (t) {
      var sleutel = t.regel + "|" + t.v;
      var r = per[sleutel];
      if (!r) { r = per[sleutel] = { regel: t.regel, formule: formule(t.regel, t.v), met: [] }; uit.push(r); }
      if (!t.met.length) return;
      var m = t.met.map(function (p) { return p[0] + " = " + tex(opkuis(p[1])); }).join(",\\ ");
      if (r.met.indexOf(m) < 0) r.met.push(m);
    });
    return uit;
  }

  // Lichte opkuis tussen de stappen: + 0, · 1 en 0 · f verdwijnen, getallen
  // in een product worden samen vooraan gezet. Meer niet: de structuur van
  // de regel moet herkenbaar blijven.
  function opkuis(e) {
    if (!e || typeof e !== "object" || e.k === "num" || e.k === "sym") return e;
    var kopie = {};
    for (var s in e) kopie[s] = e[s];
    if (e.a) kopie.a = opkuis(e.a);
    if (e.b) kopie.b = opkuis(e.b);
    if (e.args) kopie.args = e.args.map(opkuis);
    e = kopie;
    var a = e.a, b = e.b;
    switch (e.k) {
      case "add":
        if (isNum(a, NUL)) return b;
        if (isNum(b, NUL)) return a;
        if (a.k === "num" && b.k === "num") return num(qplus(a.q, b.q));
        if (b.k === "neg") return bin("sub", a, b.a);
        if (b.k === "num" && qteken(b.q) < 0) return bin("sub", a, num(qneg(b.q)));
        return e;
      case "sub":
        if (isNum(b, NUL)) return a;
        if (isNum(a, NUL)) return opkuis(neg(b));
        if (a.k === "num" && b.k === "num") return num(qmin(a.q, b.q));
        if (b.k === "neg") return bin("add", a, b.a);
        if (b.k === "num" && qteken(b.q) < 0) return bin("add", a, num(qneg(b.q)));
        return e;
      case "neg":
        if (a.k === "neg") return a.a;
        if (a.k === "num") return num(qneg(a.q));
        if (a.k === "mul" && a.a.k === "num") return opkuis(bin("mul", num(qneg(a.a.q)), a.b));
        return e;
      case "mul": {
        var fs = factoren(e, []);
        var c = EEN, rest = [], negatief = false, getallen = 0;
        for (var i = 0; i < fs.length; i++) {
          var f = fs[i];
          if (f.k === "neg") { negatief = !negatief; f = f.a; }
          if (f.k === "num" && !f.tekst) { c = qmaal(c, f.q); getallen++; }
          else rest.push(f);
        }
        // Eén getal dat al op zijn plaats staat, laten we staan: 1/(2√u) · 2x
        // blijft zo en wordt geen 2 · 1/(2√u) · x.
        if (getallen === 1 && !negatief && !qis(qabs(c), EEN) && !qnul(c) && fs[0].k !== "num" &&
            !fs.some(function (g) { return g.k === "neg"; })) return e;
        if (negatief) c = qneg(c);
        if (qnul(c)) return heelgetal(0);
        if (!rest.length) return num(c);
        var r = maalLijst(rest);
        if (qis(c, EEN)) return r;
        if (qis(c, MIN_EEN)) return neg(r);
        if (qteken(c) < 0) return neg(bin("mul", num(qneg(c)), r));
        return bin("mul", num(c), r);
      }
      case "div":
        if (isNum(b, EEN)) return a;
        if (isNum(a, NUL)) return heelgetal(0);
        if (a.k === "num" && b.k === "num" && !a.tekst && !b.tekst) return num(qdeel(a.q, b.q));
        if (a.k === "neg") return neg(bin("div", a.a, b));
        if (a.k === "num" && qteken(a.q) < 0) return neg(bin("div", num(qneg(a.q)), b));
        return e;
      case "pow":
        if (isNum(b, EEN)) return a;
        if (isNum(b, NUL)) return heelgetal(1);
        if (a.k === "num" && b.k === "num" && qheel(b.q) && b.q.n >= 0n && b.q.n < 10n && !a.tekst) return num(qmacht(a.q, b.q.n));
        return e;
    }
    return e;
  }

  // De stappen van D(u), afgeleid naar v, tot er geen D meer overblijft.
  // Elke stap is { boom, tex, regels, uitleg }: regels zijn de formules, en
  // uitleg zegt per formule wat f, g, ... in die stap zijn.
  function afleidingsstappen(u, v) {
    v = v || kiesVeranderlijke(u);
    var stappen = [];
    var huidig = Dk(u, v);
    stappen.push({ boom: huidig, tex: tex(huidig), regels: [], uitleg: [] });
    var veiligheid = 0;
    while (bevatD(huidig)) {
      if (++veiligheid > 40) throw new Rekenfout("Deze afleiding wordt te lang.");
      var logboek = [];
      huidig = opkuis(stap(huidig, logboek));
      var u2 = uitleg(logboek);
      stappen.push({ boom: huidig, tex: tex(huidig), regels: u2.map(function (r) { return r.formule; }), uitleg: u2 });
    }
    return stappen;
  }

  /* --- De normaalvorm --------------------------------------------------- */

  // Een som is een lijst termen { c: breuk, f: [ { b: grond, e: breuk } ] }
  // met de factoren gesorteerd op de sleutel van hun grond. Een grond is
  //   { t: "sym", n }                  x, a, e, pi
  //   { t: "priem", p }                een priemgetal onder een wortel
  //   { t: "som", lijst, neg }         een som met minstens twee termen,
  //                                    primitief en met positieve kop; neg
  //                                    staat voor haar tegengestelde (enkel
  //                                    onder een wortel met even index)
  //   { t: "fn", n, a }                een gewone functie uit de catalogus,
  //                                    of exp, van een som
  //   { t: "macht", g, a }             g^a met g een positieve breuk, a een som
  // Elke grond heeft een sleutel s, zodat gelijke gronden samenvallen.

  var MAX_TERMEN = 400;

  function symGrond(n) { return { t: "sym", n: n, s: "s:" + n }; }
  function priemGrond(p) { return { t: "priem", p: p, s: "p:" + String(p).padStart(12, "0") }; }
  function somGrond(s, isNeg) {
    return { t: "som", lijst: s, neg: !!isNeg, s: "t:" + (isNeg ? "-" : "") + somSleutel(s) };
  }
  // De volgorde uit de catalogus zit in de sleutel: sin x cos x, niet cos x sin x.
  function fnGrond(n, a) {
    return { t: "fn", n: n, a: a, s: "f:" + String(CATALOGUS[n].volgorde).padStart(3, "0") + n + "(" + somSleutel(a) + ")" };
  }
  function machtGrond(g, a) { return { t: "macht", g: g, a: a, s: "m:" + qtekst(g) + "(" + somSleutel(a) + ")" }; }

  function termSleutel(t) {
    return t.f.map(function (f) { return f.b.s + "^" + qtekst(f.e); }).join("*");
  }
  function somSleutel(s) {
    return s.map(function (t) { return qtekst(t.c) + "*" + termSleutel(t); }).join("+");
  }

  function getalSom(q) { return qnul(q) ? [] : [{ c: q, f: [] }]; }
  function grondSom(b, e) { return [{ c: EEN, f: [{ b: b, e: e || EEN }] }]; }

  // De graad van een term in x, voor de volgorde: hoogste macht eerst.
  function graad(t, v) {
    var g = NUL;
    t.f.forEach(function (f) { if (f.b.t === "sym" && f.b.n === (v || "x")) g = f.e; });
    return g;
  }
  function totaleGraad(t) {
    var g = NUL;
    t.f.forEach(function (f) { if (f.b.t === "sym" && f.b.n !== "e" && f.b.n !== "pi") g = qplus(g, f.e); });
    return g;
  }
  function vergelijkTermen(p, q) {
    var d = qteken(qmin(totaleGraad(q), totaleGraad(p)));
    if (d) return d;
    var dx = qteken(qmin(graad(q), graad(p)));
    if (dx) return dx;
    var a = termSleutel(p), b = termSleutel(q);
    // Een term met enkel symbolen (een veelterm) komt voor een term met
    // wortels of functies.
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function sorteer(s) { return s.sort(vergelijkTermen); }

  // Voegt gelijke termen samen en schrapt nullen.
  function verzamel(lijst) {
    var per = new Map(), volgorde = [];
    lijst.forEach(function (t) {
      var k = termSleutel(t);
      if (per.has(k)) per.get(k).c = qplus(per.get(k).c, t.c);
      else { var n = { c: t.c, f: t.f }; per.set(k, n); volgorde.push(k); }
    });
    var uit = [];
    volgorde.forEach(function (k) { var t = per.get(k); if (!qnul(t.c)) uit.push(t); });
    if (uit.length > MAX_TERMEN) throw new Rekenfout("Deze uitdrukking wordt te groot om uit te werken.");
    return sorteer(pythagoras(uit));
  }

  // c·T·sin^2 u + c·T·cos^2 u = c·T: de grondformule van de goniometrie.
  // Enkel waar beide termen er letterlijk staan; verder herschrijven we
  // sin^2 u niet, anders herkent de leerling zijn uitdrukking niet meer.
  function pythagoras(termen_) {
    function kwadraat(t, n) {
      for (var i = 0; i < t.f.length; i++) {
        var f = t.f[i];
        if (f.b.t === "fn" && f.b.n === n && qheel(f.e) && f.e.n >= 2n) return i;
      }
      return -1;
    }
    function zonder(t, i) {
      var f = t.f[i], fs = t.f.slice();
      var rest = qmin(f.e, Q(2));
      if (qnul(rest)) fs.splice(i, 1); else fs[i] = { b: f.b, e: rest };
      return { c: t.c, f: fs, u: somSleutel(f.b.a) };
    }
    for (var i = 0; i < termen_.length; i++) {
      var si = kwadraat(termen_[i], "sin");
      if (si < 0) continue;
      var a = zonder(termen_[i], si), ka = termSleutel(a);
      for (var j = 0; j < termen_.length; j++) {
        var ci = kwadraat(termen_[j], "cos");
        if (ci < 0 || j === i) continue;
        var b = zonder(termen_[j], ci);
        if (a.u !== b.u || !qis(a.c, b.c) || termSleutel(b) !== ka) continue;
        var nieuw = termen_.filter(function (t, k) { return k !== i && k !== j; });
        return verzamel(nieuw.concat([{ c: a.c, f: a.f }]));
      }
    }
    return termen_;
  }

  function somPlus(a, b) { return verzamel(a.concat(b)); }
  function somNeg(a) { return a.map(function (t) { return { c: qneg(t.c), f: t.f }; }); }
  function somMaalGetal(a, q) {
    if (qnul(q)) return [];
    return a.map(function (t) { return { c: qmaal(t.c, q), f: t.f }; });
  }

  // Priemontbinding van een klein natuurlijk getal; voor grote getallen
  // geven we op en blijft het getal als geheel onder de wortel.
  function ontbind(n) {
    var uit = [];
    if (n > 10n ** 14n) return null;
    for (var p = 2n; p * p <= n; p += (p === 2n ? 1n : 2n)) {
      var k = 0;
      while (n % p === 0n) { n /= p; k++; }
      if (k) uit.push([p, k]);
    }
    if (n > 1n) uit.push([n, 1]);
    return uit;
  }

  // Normaliseert de factoren van een term: gelijke gronden samen, machten
  // met hetzelfde grondtal samen (e^a · e^b = e^(a+b)), een priem met een
  // gehele exponent in de coëfficiënt, een som met een gehele positieve
  // exponent uitgewerkt. Geeft een som terug.
  function normTerm(c, fs) {
    if (qnul(c)) return [];
    var exps = new Map(), gewone = [];
    fs.forEach(function (f) {
      if (qnul(f.e)) return;
      if (f.b.t === "fn" && f.b.n === "exp" || f.b.t === "macht") {
        var k = f.b.t === "macht" ? qtekst(f.b.g) : "e";
        var bij = somMaalGetal(f.b.a, f.e);
        var h = exps.get(k);
        if (h) h.arg = h.arg.concat(bij);
        else exps.set(k, { g: f.b.g, arg: bij });
        return;
      }
      gewone.push(f);
    });
    exps.forEach(function (h, k) {
      var arg = verzamel(h.arg);
      if (!arg.length) return;
      if (k === "e") {
        if (isGetalSom(arg) && qheel(getalVan(arg))) gewone.push({ b: symGrond("e"), e: getalVan(arg) });
        else gewone.push({ b: fnGrond("exp", arg), e: EEN });
      } else if (isGetalSom(arg)) {
        var w = getalMacht(h.g, getalVan(arg))[0];
        c = qmaal(c, w.c);
        gewone = gewone.concat(w.f);
      } else gewone.push({ b: machtGrond(h.g, arg), e: EEN });
    });
    var per = new Map();
    gewone.forEach(function (f) {
      var h = per.get(f.b.s);
      if (h) h.e = qplus(h.e, f.e);
      else per.set(f.b.s, { b: f.b, e: f.e });
    });
    // Een som en haar tegengestelde: de kant met gehele exponent draait om.
    per.forEach(function (f, k) {
      if (f.b.t !== "som" || !f.b.neg) return;
      var positief = per.get(somGrond(f.b.lijst, false).s);
      if (!positief) return;
      if (qheel(positief.e)) {
        if (positief.e.n % 2n !== 0n) c = qneg(c);
        f.e = qplus(f.e, positief.e);
        per.delete(positief.b.s);
      } else if (qheel(f.e)) {
        if (f.e.n % 2n !== 0n) c = qneg(c);
        positief.e = qplus(positief.e, f.e);
        per.delete(k);
      }
    });
    var rest = [], uitwerken = [];
    per.forEach(function (f) {
      if (qnul(f.e)) return;
      if (f.b.t === "priem") {
        // p^e met e = geheel + rest, 0 <= rest < 1
        var vl = qvloer(f.e);
        if (vl !== 0n) c = qmaal(c, qmacht(Q(f.b.p), vl));
        var r = qmin(f.e, Q(vl));
        if (!qnul(r)) rest.push({ b: f.b, e: r });
        return;
      }
      if (f.b.t === "som" && qheel(f.e) && f.e.n > 0n) {
        var s = f.b.neg ? somNeg(f.b.lijst) : f.b.lijst;
        uitwerken.push([s, f.e.n]);
        return;
      }
      if (f.b.t === "som" && f.b.neg && qheel(f.e)) {
        // (-P)^k met k geheel en negatief: (-1)^k P^k
        if (f.e.n % 2n !== 0n) c = qneg(c);
        rest.push({ b: somGrond(f.b.lijst, false), e: f.e });
        return;
      }
      rest.push(f);
    });
    // Een priem met dezelfde exponent als een ander hoort bij dezelfde
    // wortel, maar we houden ze apart en voegen ze pas bij het tonen samen.
    rest.sort(function (p, q) { return p.b.s < q.b.s ? -1 : p.b.s > q.b.s ? 1 : 0; });
    var uit = [{ c: c, f: rest }];
    uitwerken.forEach(function (paar) {
      for (var i = 0n; i < paar[1]; i++) uit = somMaal(uit, paar[0]);
    });
    return uit;
  }

  function somMaal(a, b) {
    var lijst = [];
    if (a.length * b.length > MAX_TERMEN * 4) throw new Rekenfout("Deze uitdrukking wordt te groot om uit te werken.");
    a.forEach(function (p) {
      b.forEach(function (q) {
        lijst = lijst.concat(normTerm(qmaal(p.c, q.c), p.f.concat(q.f)));
      });
    });
    return verzamel(lijst);
  }

  function isGetalSom(s) { return s.length === 0 || s.length === 1 && s[0].f.length === 0; }
  function getalVan(s) { return s.length === 0 ? NUL : s[0].c; }

  // Rationale macht van een rationaal getal, als som.
  function getalMacht(q, e) {
    if (qnul(q)) {
      if (qteken(e) < 0) throw new Rekenfout("Delen door nul kan niet.");
      if (qnul(e)) return getalSom(EEN);
      return [];
    }
    if (qheel(e)) return getalSom(qmacht(q, e.n));
    var teken = 1;
    if (qteken(q) < 0) {
      if (e.d % 2n === 0n) throw new Rekenfout("Een wortel met even index uit een negatief getal bestaat niet.");
      q = qneg(q);
      if (e.n % 2n !== 0n) teken = -1;
    }
    var fs = [], c = Q(teken);
    [[q.n, 1n], [q.d, -1n]].forEach(function (paar) {
      if (paar[0] === 1n) return;
      var delen = ontbind(paar[0]);
      if (!delen) throw new Rekenfout("Dat getal is te groot om onder een wortel te vereenvoudigen.");
      delen.forEach(function (pk) {
        fs.push({ b: priemGrond(pk[0]), e: qmaal(e, Q(BigInt(pk[1]) * paar[1])) });
      });
    });
    return normTerm(c, fs);
  }

  // Inhoud van een som: de positieve breuk die je buiten haakjes kunt zetten
  // zodat alle coëfficiënten gehele getallen zonder gemeenschappelijke deler
  // zijn, met het teken van de kopterm.
  function inhoud(s) {
    var g = 0n;
    s.forEach(function (t) { g = bggd(g, t.c.n); });
    var k = Q(g, kgvNoemers(s.map(function (t) { return t.c; })));
    if (qteken(s[0].c) < 0) k = qneg(k);
    return k;
  }

  function somMacht(s, e) {
    if (qheel(e) && e.n >= 0n) {
      if (e.n === 0n) return getalSom(EEN);
      if (s.length === 1) return normTerm(qmacht(s[0].c, e.n), s[0].f.map(function (f) { return { b: f.b, e: qmaal(f.e, e) }; }));
      var r = s;
      for (var i = 1n; i < e.n; i++) r = somMaal(r, s);
      return r;
    }
    if (s.length === 0) {
      if (qteken(e) < 0) throw new Rekenfout("Delen door nul kan niet.");
      return [];
    }
    if (s.length === 1) {
      var t = s[0];
      var beschermd = t.f.filter(function (f) { return moetBeschermd(f, e); });
      if (beschermd.length) {
        // √(x^2) is |x|, niet x. Zonder absolute waarde laten we zo'n
        // factor onder de wortel staan: fout vereenvoudigen is erger dan niet.
        var vrij = { c: t.c, f: t.f.filter(function (f) { return !moetBeschermd(f, e); }) };
        return somMaal(somMacht([vrij], e), normTerm(EEN, [{ b: somGrond([{ c: EEN, f: beschermd }], false), e: e }]));
      }
      if (qteken(t.c) < 0 && !qheel(e) && e.d % 2n === 0n) {
        if (t.f.length === 0) throw new Rekenfout("Een wortel met even index uit een negatief getal bestaat niet.");
        // √(-3x) = √3 · √(-x): het minteken blijft onder de wortel.
        return somMaal(getalMacht(qneg(t.c), e),
                       normTerm(EEN, [{ b: somGrond([{ c: EEN, f: t.f }], true), e: e }]));
      }
      return somMaal(getalMacht(t.c, e),
                     normTerm(EEN, t.f.map(function (f) { return { b: f.b, e: qmaal(f.e, e) }; })));
    }
    if (qheel(e)) {
      // (1 + 1/x^2)^(-1) = x^2 (x^2 + 1)^(-1): eerst op één noemer.
      var r1 = opEenNoemer(s);
      if (r1.F.length) {
        return somMaal(normTerm(EEN, r1.F.map(function (f) { return { b: f.b, e: qmaal(f.e, e) }; })),
                       somMacht(r1.binnen, e));
      }
    }
    var k = inhoud(s);
    var p = somMaalGetal(s, qdeel(EEN, k));
    var isNeg = false;
    // Onder een wortel blijft de som staan zoals ze was: ∛(9 - x^3), niet
    // -∛(x^3 - 9).
    if (qteken(k) < 0 && !qheel(e)) { k = qneg(k); isNeg = true; }
    return somMaal(getalMacht(k, e), normTerm(EEN, [{ b: somGrond(p, isNeg), e: e }]));
  }

  // Mag (b^k)^e niet zomaar b^(k·e) worden? Dat is zo als b negatief kan
  // zijn, k even is en k·e oneven: (x^2)^(1/2) = |x|, (x^2)^(3/2) = |x|^3.
  function kanNegatief(b) {
    if (b.t === "sym") return b.n !== "e" && b.n !== "pi";
    if (b.t === "fn") return b.n !== "exp";
    return b.t === "som";
  }
  function moetBeschermd(f, e) {
    return !qheel(e) && kanNegatief(f.b) && f.e.n % 2n === 0n && qmaal(f.e, e).n % 2n !== 0n;
  }

  // Van de boom naar de normaalvorm.
  function normaal(e) {
    switch (e.k) {
      case "somboom": return e.s;
      case "num": return getalSom(e.q);
      case "sym":
        return grondSom(symGrond(e.n));
      case "add": return somPlus(normaal(e.a), normaal(e.b));
      case "sub": return somPlus(normaal(e.a), somNeg(normaal(e.b)));
      case "neg": return somNeg(normaal(e.a));
      case "mul": return somMaal(normaal(e.a), normaal(e.b));
      case "div": return somMaal(normaal(e.a), normaalMacht(e.b, MIN_EEN));
      case "pow": {
        var ex = normaal(e.b);
        if (e.a.k === "sym" && e.a.n === "e") return expVan(ex);
        if (isGetalSom(ex)) return normaalMacht(e.a, getalVan(ex));
        var g = normaal(e.a);
        if (isGetalSom(g)) return machtVan(getalVan(g), ex);
        if (!vrijeLetters(e.b).length) throw new Rekenfout("Een exponent moet hier een getal zijn.");
        throw new Rekenfout("Een macht met een veranderlijke in de exponent kan ik enkel met een getal als grondtal, zoals 2^x of e^x.");
      }
      case "fn": {
        var def = CATALOGUS[e.n];
        // Een wortel werkt zelf op de boom: √(x^2 (x+1)) blijft zo ontbonden.
        var a = def.soort === "wortel" ? null : normaal(e.a);
        if (def.normaal) return def.normaal(e, a);
        return gewoneFunctie(def, a);
      }
      case "D": return normaal(afgeleide(e.a, e.v));
      case "call": throw new Rekenfout("De functie " + e.n + " is nog niet gedefinieerd. Typ eerst bijvoorbeeld " + e.n + "(x) = x^2.");
    }
    throw new Rekenfout("Dat kan ik niet uitrekenen.");
  }

  // Een gewone functie van een som: een bijzondere waarde als die er is,
  // anders een grond. sin(-u) wordt -sin u.
  function gewoneFunctie(def, a) {
    var w = def.exact ? def.exact(a) : null;
    if (w) return w;
    if (def.pariteit && a.length && a.every(function (t) { return qteken(t.c) < 0; })) {
      var b = grondSom(fnGrond(def.naam, somNeg(a)));
      return def.pariteit === "oneven" ? somNeg(b) : b;
    }
    return grondSom(fnGrond(def.naam, a));
  }

  // e^q, waarbij een macht, product of wortel in e ontbonden blijft: zo
  // blijft (x-1)^2 in een noemer staan als (x-1)^2 en wordt het geen
  // x^2 - 2x + 1. Een positieve gehele macht van een som werken we wel uit.
  function normaalMacht(e, q) {
    if (qheel(q) && q.n > 0n && e.k !== "div") return somMacht(normaal(e), q);
    switch (e.k) {
      case "pow": {
        if (e.a.k === "sym" && e.a.n === "e") break;
        var r = getalwaarde(e.b);
        // (x^2)^(1/2) niet samenvoegen tot x: zie moetBeschermd.
        if (r && !(r.n % 2n === 0n && qmaal(q, r).n % 2n !== 0n)) return normaalMacht(e.a, qmaal(q, r));
        break;
      }
      case "mul": return somMaal(normaalMacht(e.a, q), normaalMacht(e.b, q));
      case "div": return somMaal(normaalMacht(e.a, q), normaalMacht(e.b, qneg(q)));
      case "fn":
        if (e.n === "wortel") return normaalMacht(e.a, qmaal(q, Q(1, e.index)));
        break;
      case "neg":
        if (qheel(q)) return somMaalGetal(normaalMacht(e.a, q), q.n % 2n === 0n ? EEN : MIN_EEN);
        break;
    }
    var s = normaal(e);
    if (s.length === 0 && qteken(q) < 0) throw new Rekenfout("Delen door nul kan niet.");
    return somMacht(s, q);
  }

  // Is a precies c · ln u (één term, één factor)? Dan { c, u }.
  function lnTerm(a) {
    if (a.length !== 1 || a[0].f.length !== 1) return null;
    var f = a[0].f[0];
    if (f.b.t !== "fn" || f.b.n !== "ln" || !qis(f.e, EEN)) return null;
    return { c: a[0].c, u: f.b.a };
  }
  // Is a precies één grond met exponent 1 en coëfficiënt 1?
  function eenGrond(a) {
    return a.length === 1 && qis(a[0].c, EEN) && a[0].f.length === 1 ? a[0].f[0] : null;
  }

  function expVan(a) {
    if (a.length === 0) return getalSom(EEN);
    if (isGetalSom(a) && qheel(getalVan(a))) return grondSom(symGrond("e"), getalVan(a));
    // e^(c ln u) = u^c
    var l = lnTerm(a);
    if (l) return somMacht(l.u, l.c);
    return grondSom(fnGrond("exp", a));
  }

  // a^u met a een rationaal getal.
  function machtVan(q, a) {
    if (isGetalSom(a)) return getalMacht(q, getalVan(a));
    if (qteken(q) <= 0) throw new Rekenfout("Een macht met een veranderlijke in de exponent heeft een strikt positief grondtal.");
    if (qis(q, EEN)) return getalSom(EEN);
    return grondSom(machtGrond(q, a));
  }

  function lnVan(a) {
    strikPositief(a);
    if (isGetalSom(a) && qis(getalVan(a), EEN)) return [];
    var f = eenGrond(a);
    if (f && f.b.t === "sym" && f.b.n === "e") return getalSom(f.e);          // ln e^k = k
    if (f && qis(f.e, EEN) && f.b.t === "fn" && f.b.n === "exp") return f.b.a; // ln e^u = u
    if (f && qis(f.e, EEN) && f.b.t === "macht") return somMaal(f.b.a, lnVan(getalSom(f.b.g))); // ln a^u = u ln a
    return grondSom(fnGrond("ln", a));
  }

  // log_g(a) = ln a / ln g, maar exact als a een rationale macht van g is:
  // log_2 8 = 3, log_4 2 = 1/2.
  function logVan(a, g) {
    strikPositief(a);
    if (isGetalSom(a)) {
      var k = rationaleLogaritme(getalVan(a), g);
      if (k) return getalSom(k);
    }
    return somMaal(lnVan(a), somMacht(lnVan(getalSom(g)), MIN_EEN));
  }
  function rationaleLogaritme(q, g) {
    var k = Math.log(qgetal(q)) / Math.log(qgetal(g));
    if (!isFinite(k)) return null;
    for (var d = 1; d <= 12; d++) {
      var n = Math.round(k * d);
      if (Math.abs(k * d - n) > 1e-9) continue;
      var kandidaat = Q(n, d);
      try {
        if (somSleutel(getalMacht(g, kandidaat)) === somSleutel(getalSom(q))) return kandidaat;
      } catch (fout) { if (!(fout instanceof Rekenfout)) throw fout; }
    }
    return null;
  }

  // De afgeleide zonder stappen, voor hogere afgeleiden en D's in een
  // uitdrukking.
  function afgeleide(u, v) {
    var st = afleidingsstappen(u, v);
    return st[st.length - 1].boom;
  }


  /* --- Invullen en numeriek rekenen -------------------------------------- */

  function grondWaarde(b, omg) {
    switch (b.t) {
      case "sym":
        if (b.n === "e") return Math.E;
        if (b.n === "pi") return Math.PI;
        return omg[b.n] !== undefined ? omg[b.n] : NaN;
      case "priem": return Number(b.p);
      case "som": { var v = somWaarde(b.lijst, omg); return b.neg ? -v : v; }
      case "fn": return CATALOGUS[b.n].waarde(somWaarde(b.a, omg));
      case "macht": return Math.pow(qgetal(b.g), somWaarde(b.a, omg));
    }
    return NaN;
  }

  // Een reële macht: een oneven wortel uit een negatief getal bestaat.
  function reeleMacht(g, e) {
    var ex = qgetal(e);
    if (qheel(e) || g >= 0) return Math.pow(g, ex);
    if (e.d % 2n === 0n) return NaN;
    var r = Math.pow(-g, ex);
    return e.n % 2n === 0n ? r : -r;
  }

  function somWaarde(s, omg) {
    var totaal = 0;
    for (var i = 0; i < s.length; i++) {
      var t = s[i], w = qgetal(t.c);
      for (var j = 0; j < t.f.length; j++) {
        var g = grondWaarde(t.f[j].b, omg);
        if (g === 0 && qteken(t.f[j].e) < 0) return NaN;
        w *= reeleMacht(g, t.f[j].e);
      }
      totaal += w;
    }
    return totaal;
  }

  // Een som als functie van v (standaard x), voor de grafiek.
  function numeriek(s, v) {
    v = v || "x";
    return function (x) { var omg = {}; omg[v] = x; return somWaarde(s, omg); };
  }

  // De numerieke waarde van een boom, zonder hem eerst te vereenvoudigen.
  // Een D wordt benaderd met een vijfpuntsformule, ook vlak bij een pool
  // nauwkeurig; zo kan een test elke stap van een afleiding narekenen.
  function waarde(e, omg) {
    omg = omg || {};
    switch (e.k) {
      case "num": return qgetal(e.q);
      case "sym":
        if (e.n === "e") return Math.E;
        if (e.n === "pi") return Math.PI;
        return omg[e.n] !== undefined ? omg[e.n] : NaN;
      case "add": return waarde(e.a, omg) + waarde(e.b, omg);
      case "sub": return waarde(e.a, omg) - waarde(e.b, omg);
      case "neg": return -waarde(e.a, omg);
      case "mul": return waarde(e.a, omg) * waarde(e.b, omg);
      case "div": return waarde(e.a, omg) / waarde(e.b, omg);
      case "pow": {
        var g = waarde(e.a, omg);
        var q = vrijeLetters(e.b).length ? null : getalwaarde(e.b);
        return q ? reeleMacht(g, q) : Math.pow(g, waarde(e.b, omg));
      }
      case "fn": return CATALOGUS[e.n].waarde(waarde(e.a, omg), e);
      case "somboom": return somWaarde(e.s, omg);
      case "D": {
        var v = e.v || kiesVeranderlijke(e.a), x0 = omg[v];
        var h = 1e-4 * Math.max(1, Math.abs(x0));
        var in_ = function (d) { var o = Object.assign({}, omg); o[v] = x0 + d * h; return waarde(e.a, o); };
        return (-in_(2) + 8 * in_(1) - 8 * in_(-1) + in_(-2)) / (12 * h);
      }
    }
    return NaN;
  }

  // Vult een exacte waarde (een som) in voor v (standaard x) en werkt uit.
  // Een deling door nul of een wortel uit een negatief getal geeft een
  // Rekenfout.
  function vulInSom(s, waarde_, v) {
    v = v || "x";
    function grond(b) {
      switch (b.t) {
        case "sym": return b.n === v ? waarde_ : grondSom(b);
        case "priem": return grondSom(b);
        case "som": { var w = somIn(b.lijst); return b.neg ? somNeg(w) : w; }
        case "fn": return normaal(fn(b.n, { k: "somboom", s: somIn(b.a) }));
        case "macht": return machtVan(b.g, somIn(b.a));
      }
    }
    function somIn(som) {
      var r = [];
      som.forEach(function (t) {
        var term = getalSom(t.c);
        t.f.forEach(function (f) {
          var g = grond(f.b);
          if (g.length === 0 && qteken(f.e) < 0) throw new Rekenfout("Er staat een deling door nul.");
          term = somMaal(term, somMacht(g, f.e));
        });
        r = somPlus(r, term);
      });
      return r;
    }
    return somIn(s);
  }

  /* --- De normaalvorm tonen ---------------------------------------------- */

  // Een som wordt opnieuw een boom, zodat tonen, invullen en verder afleiden
  // allemaal van dezelfde vorm vertrekken. Er zijn twee vormen:
  //   termsgewijs  elke groep termen met dezelfde noemer op één breuk,
  //                zoals 2x - 1/x^2
  //   één noemer   alles op één breuk, zoals (2x^3 - 1)/x^2

  function isVeelterm(s, v) {
    return s.every(function (t) {
      return t.f.every(function (f) { return f.b.t === "sym" && f.b.n === v && qheel(f.e) && f.e.n > 0n; });
    });
  }
  // De enige veranderlijke van een som, of null als er meer zijn.
  function hoofdVeranderlijke(s) {
    var namen = {};
    s.forEach(function (t) {
      t.f.forEach(function (f) { if (f.b.t === "sym" && f.b.n !== "e" && f.b.n !== "pi") namen[f.b.n] = true; });
    });
    var n = Object.keys(namen);
    return n.length === 1 ? n[0] : (n.length === 0 ? "x" : null);
  }

  // Een veelterm in v als coëfficiëntenlijst [a0, a1, ...], en terug.
  function naarCoeff(s) {
    var c = [];
    s.forEach(function (t) {
      var g = t.f.length ? Number(t.f[0].e.n) : 0;
      while (c.length <= g) c.push(NUL);
      c[g] = qplus(c[g], t.c);
    });
    return c;
  }
  function vanCoeff(c, v) {
    var s = [];
    c.forEach(function (a, g) {
      if (!qnul(a)) s.push({ c: a, f: g ? [{ b: symGrond(v), e: Q(g) }] : [] });
    });
    return sorteer(s);
  }
  // Deelt veelterm a door b; het quotiënt als de deling opgaat, anders null.
  function deelVeelterm(a, b) {
    a = a.slice();
    while (a.length && qnul(a[a.length - 1])) a.pop();
    var nb = b.length - 1;
    if (a.length === 0 || a.length - 1 < nb) return null;
    var q = [];
    for (var i = a.length - 1 - nb; i >= 0; i--) {
      var f = qdeel(a[i + nb], b[nb]);
      q[i] = f;
      for (var j = 0; j <= nb; j++) a[i + j] = qmin(a[i + j], qmaal(f, b[j]));
    }
    for (var k = 0; k < a.length; k++) if (!qnul(a[k])) return null;
    return q;
  }
  function grondVeelterm(b, v) {
    if (b.t === "sym" && b.n === v) return [NUL, EEN];
    if (b.t === "som" && isVeelterm(b.lijst, v)) {
      var c = naarCoeff(b.lijst);
      return b.neg ? c.map(qneg) : c;
    }
    return null;
  }

  // Zet termen op één noemer: s = F · binnen, met F de factoren die alle
  // termen gemeen hebben met een negatieve of gebroken exponent. Daarna
  // schrappen we in binnen wat tegen een factor van de noemer wegvalt.
  function opEenNoemer(s) {
    var min = new Map(), gronden = new Map();
    s.forEach(function (t, i) {
      var hier = new Map();
      t.f.forEach(function (f) { hier.set(f.b.s, f.e); gronden.set(f.b.s, f.b); });
      gronden.forEach(function (b, k) {
        var e = hier.has(k) ? hier.get(k) : NUL;
        if (i === 0) { min.set(k, e); return; }
        var m = min.has(k) ? min.get(k) : NUL;
        min.set(k, qteken(qmin(e, m)) < 0 ? e : m);
      });
    });
    var F = [];
    min.forEach(function (e, k) {
      var b = gronden.get(k);
      if (qnul(e) || b.t === "priem") return;
      if (qteken(e) < 0 || !qheel(e) || s.length === 1 && b.t !== "sym") F.push({ b: b, e: e });
    });
    var binnen = [];
    s.forEach(function (t) {
      var fs = t.f.slice();
      F.forEach(function (f) { fs.push({ b: f.b, e: qneg(f.e) }); });
      binnen = binnen.concat(normTerm(t.c, fs));
    });
    binnen = verzamel(binnen);
    var v = hoofdVeranderlijke(binnen);
    if (v && binnen.length && isVeelterm(binnen, v)) {
      var coeff = naarCoeff(binnen);
      F.forEach(function (f) {
        var g = grondVeelterm(f.b, v);
        while (g && qteken(f.e) < 0) {
          var q = deelVeelterm(coeff, g);
          if (!q) break;
          coeff = q;
          f.e = qplus(f.e, EEN);
        }
      });
      binnen = vanCoeff(coeff, v);
      var over = [];
      F.forEach(function (f) {
        if (qnul(f.e)) return;
        // Een som die zo een gehele positieve exponent krijgt, werken we uit.
        if (f.b.t === "som" && qheel(f.e) && f.e.n > 0n) binnen = somMaal(binnen, somMacht(f.b.neg ? somNeg(f.b.lijst) : f.b.lijst, f.e));
        else over.push(f);
      });
      F = over;
    }
    // (1 + cos x)/(1 + cos x)^2: een teller die gelijk is aan een som uit
    // de noemer, valt ertegen weg.
    if (binnen.length > 1) {
      var k = inhoud(binnen), sleutel = somSleutel(somMaalGetal(binnen, qdeel(EEN, k)));
      for (var i = 0; i < F.length; i++) {
        var f = F[i];
        if (f.b.t === "som" && !f.b.neg && qteken(f.e) < 0 && somSleutel(f.b.lijst) === sleutel) {
          binnen = getalSom(k);
          F = F.slice();
          F[i] = { b: f.b, e: qplus(f.e, EEN) };
          if (qnul(F[i].e)) F.splice(i, 1);
          break;
        }
      }
    }
    return { F: F, binnen: binnen };
  }

  // Een grond met een positieve exponent als boom. Gebroken exponenten
  // worden wortels: x^(3/2) = x√x en u^(2/3) = ∛(u^2).
  function factorBoom(b, e) {
    var g;
    switch (b.t) {
      case "sym": g = sym(b.n); break;
      case "som": g = somBoom(b.neg ? somNeg(b.lijst) : b.lijst); break;
      case "fn": case "macht":
        if (b.t === "macht" || b.n === "exp") {
          var ex = qheel(e) ? somMaalGetal(b.a, e) : b.a;
          var eb = bin("pow", b.t === "macht" ? num(b.g) : sym("e"), somBoom(ex));
          return qheel(e) ? eb : bin("pow", eb, num(e));
        }
        g = fn(b.n, somBoom(b.a));
        break;
    }
    function macht(k) { return k === 1n ? g : bin("pow", g, heelgetal(k)); }
    if (qheel(e)) return macht(e.n);
    var heel = qvloer(e), rest = qmin(e, Q(heel));
    var w = wortelBoom(rest.n === 1n ? g : bin("pow", g, heelgetal(rest.n)), rest.d);
    return heel > 0n ? bin("mul", macht(heel), w) : w;
  }

  // Factoren met een positieve exponent, in de volgorde van een schoolboek:
  // wortels uit getallen, symbolen (x achteraan), sommen en wortels, functies.
  function factorBomen(fs) {
    var priem = new Map(), rest = [];
    fs.forEach(function (f) {
      if (f.b.t === "priem") {
        var k = String(f.e.d);
        if (!priem.has(k)) priem.set(k, 1n);
        priem.set(k, priem.get(k) * f.b.p ** f.e.n);
      } else rest.push(f);
    });
    var orde = { sym: 0, som: 1, macht: 2, fn: 3 };
    rest.sort(function (p, q) {
      // e^x en 2^x voor de andere functies: e^x sin x, 2^x ln 2.
      var d = orde[p.b.t === "fn" && p.b.n === "exp" ? "macht" : p.b.t] - orde[q.b.t === "fn" && q.b.n === "exp" ? "macht" : q.b.t];
      if (d) return d;
      if (p.b.t === "sym") {
        var px = p.b.n === "x" ? 1 : 0, qx = q.b.n === "x" ? 1 : 0;
        if (px !== qx) return px - qx;
      }
      // Een gebroken exponent achter een gehele: x^2√(x+1), niet √(x+1)x^2.
      return (qheel(p.e) ? 0 : 1) - (qheel(q.e) ? 0 : 1);
    });
    var uit = [];
    priem.forEach(function (n, d) { uit.push(wortelBoom(num(Q(n)), BigInt(d))); });
    rest.forEach(function (f) { uit.push(factorBoom(f.b, f.e)); });
    return uit;
  }

  function product(lijst) {
    if (!lijst.length) return heelgetal(1);
    var r = lijst[0];
    for (var i = 1; i < lijst.length; i++) r = bin("mul", r, lijst[i]);
    return r;
  }

  // Een grond zonder veranderlijke: π, e, een wortel uit een getal, ln 2.
  function isConstanteGrond(b) {
    switch (b.t) {
      case "sym": return b.n === "e" || b.n === "pi";
      case "priem": return true;
      case "som": return isConstanteSom(b.lijst);
      case "fn": case "macht": return isConstanteSom(b.a);
    }
    return false;
  }

  // Een term zonder noemer: coëfficiënt vooraan, zoals 3/2 √x of -2x^3.
  function termBoom(t) {
    var c = qabs(t.c);
    var fs = factorBomen(t.f);
    // √3/3 en π/6 lezen beter dan 1/3 · √3 en 1/6 π; bij x^2/2 en 1/2 x^2
    // maakt het niet uit.
    if (!qheel(c) && t.f.some(function (f) { return !qheel(f.e) || isConstanteGrond(f.b); })) {
      var boven = c.n === 1n ? product(fs) : product([num(Q(c.n))].concat(fs));
      return { boom: bin("div", boven, num(Q(c.d))), negatief: qteken(t.c) < 0 };
    }
    var boom = qis(c, EEN) && fs.length ? product(fs) : product([num(c)].concat(fs));
    return { boom: boom, negatief: qteken(t.c) < 0 };
  }

  function somUitDelen(delen) {
    if (!delen.length) return heelgetal(0);
    // 9 - x^3 leest beter dan -x^3 + 9.
    if (delen.length === 2 && delen[0].negatief && !delen[1].negatief) delen = [delen[1], delen[0]];
    var r = delen[0].negatief ? neg(delen[0].boom) : delen[0].boom;
    for (var i = 1; i < delen.length; i++) r = bin(delen[i].negatief ? "sub" : "add", r, delen[i].boom);
    return r;
  }

  // Termen die allemaal op één breuk komen.
  function breukDeel(s) {
    var r = opEenNoemer(s);
    var binnen = r.binnen;
    if (!binnen.length) return { boom: heelgetal(0), negatief: false };
    // Gehele coëfficiënten in de teller; hun gemeenschappelijke noemer onder.
    var l = kgvNoemers(binnen.map(function (t) { return t.c; }));
    var N = somMaalGetal(binnen, Q(l));
    var negatief = N.every(function (t) { return qteken(t.c) < 0; });
    if (negatief) N = somNeg(N);
    var teller = [], noemer = [];
    r.F.forEach(function (f) {
      if (qteken(f.e) < 0) noemer.push({ b: f.b, e: qneg(f.e) });
      else teller.push(f);
    });
    var boven;
    if (N.length > 1 && teller.length) {
      // (15x - 12)√(2x+1) wordt 3(5x - 4)√(2x+1)
      var g = inhoud(N);
      var voor = qis(qabs(g), EEN) ? [] : [num(qabs(g))];
      boven = product(voor.concat([somUitDelen(somMaalGetal(N, qdeel(EEN, qabs(g))).map(termBoom))], factorBomen(teller)));
    } else if (N.length > 1) boven = product([somUitDelen(N.map(termBoom))].concat(factorBomen(teller)));
    else {
      var c = N[0].c, fs = factorBomen(N[0].f.concat(teller));
      if (qteken(c) < 0) { negatief = !negatief; c = qneg(c); }
      boven = qis(c, EEN) && fs.length ? product(fs) : product([num(c)].concat(fs));
    }
    var onderF = factorBomen(noemer);
    if (l !== 1n) onderF.unshift(num(Q(l)));
    if (!onderF.length) return { boom: boven, negatief: negatief };
    return { boom: bin("div", boven, product(onderF)), negatief: negatief };
  }

  // Alles op één breuk.
  function breukBoom(s) {
    if (!s.length) return heelgetal(0);
    var d = breukDeel(s);
    return d.negatief ? neg(d.boom) : d.boom;
  }

  // Termen gegroepeerd per noemer; de termen zonder noemer eerst.
  function somBoom(s) {
    if (!s.length) return heelgetal(0);
    var groepen = new Map(), volgorde = [];
    s.forEach(function (t) {
      var k = t.f.filter(function (f) { return qteken(f.e) < 0; })
                 .map(function (f) { return f.b.s + "^" + qtekst(f.e); }).join("*");
      if (!groepen.has(k)) { groepen.set(k, []); volgorde.push(k); }
      groepen.get(k).push(t);
    });
    volgorde.sort(function (a, b) { return (a === "" ? 0 : 1) - (b === "" ? 0 : 1); });
    var delen = [];
    volgorde.forEach(function (k) {
      var g = groepen.get(k);
      if (k === "") delen = delen.concat(g.map(termBoom));
      else delen.push(breukDeel(g));
    });
    return somUitDelen(delen);
  }

  // De vormen om te tonen, zonder dubbels: termsgewijs en op één noemer.
  // De laatste is de uitkomst.
  function vormBomen(s) {
    var a = somBoom(s);
    var noemer = s.some(function (t) { return t.f.some(function (f) { return qteken(f.e) < 0; }); });
    if (!noemer) return [a];
    var b = breukBoom(s);
    return tex(a) === tex(b) ? [a] : [a, b];
  }
  function vormen(s) { return vormBomen(s).map(tex); }

  // Een product van factoren zonder breuk, zoals 10(2x+1)^4: dat is al
  // eenvoudig, en uitwerken zou het enkel langer maken. Met sommen mag er
  // ook een som als factor in staan, zoals in 4(3x^2-2x-5)^3 (6x-2).
  function isProductvorm(e, metSommen) {
    if (metSommen && e.k !== "mul" && e.k !== "neg" && e.k !== "pow") return false;
    function factor(f) {
      switch (f.k) {
        case "num": case "sym": case "fn": return true;
        case "add": case "sub": return !!metSommen;
        case "neg": return factor(f.a);
        case "mul": return factor(f.a) && factor(f.b);
        case "pow": return (f.a.k === "sym" || f.a.k === "add" || f.a.k === "sub" || f.a.k === "fn") && f.b.k === "num" && qheel(f.b.q) && qteken(f.b.q) > 0 || f.a.k === "sym" && f.a.n === "e";
      }
      return false;
    }
    return factor(e);
  }

  // Zo'n product netjes geordend: de getallen samen vooraan, uit elke
  // veelterm haar inhoud en een macht van x naar voren, gelijke factoren
  // samen. 3(x^2-2x)^2 (2x-2) wordt zo 6x^2(x-1)(x-2)^2, zoals in de cursus.
  // Een som die geen veelterm is, maakt er null van: die werken we uit.
  function productVorm(boom) {
    var fs = [], c = EEN;
    (function plat(e) {
      if (e.k === "mul") { plat(e.a); plat(e.b); }
      else if (e.k === "neg") { c = qneg(c); plat(e.a); }
      else fs.push(e);
    })(boom);
    var letters = new Map(), veeltermen = new Map(), rest = [];
    function letter(n, k) { letters.set(n, qplus(letters.get(n) || NUL, k)); }
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], g = f, k = EEN;
      if (f.k === "pow" && f.b.k === "num" && qheel(f.b.q) && qteken(f.b.q) > 0) { g = f.a; k = f.b.q; }
      if (g.k === "num") { c = qmaal(c, qmacht(g.q, k.n)); continue; }
      if (g.k === "sym" && g.n !== "e" && g.n !== "pi") { letter(g.n, k); continue; }
      if (g.k === "add" || g.k === "sub") {
        var som_ = normaal(g), v = hoofdVeranderlijke(som_);
        if (!v || !isVeelterm(som_, v)) {
          if (g === f) return null;
          rest.push(f);
          continue;
        }
        if (som_.length < 2) return null;
        // De inhoud zonder teken: 7x(3 - x^2) blijft zo staan.
        var inh = qabs(inhoud(som_));
        c = qmaal(c, qmacht(inh, k.n));
        var coeff = naarCoeff(somMaalGetal(som_, qdeel(EEN, inh)));
        var m = 0;
        while (qnul(coeff[m])) m++;
        if (m) letter(v, qmaal(Q(m), k));
        var p = vanCoeff(coeff.slice(m), v);
        if (p.length < 2) { c = qmaal(c, qmacht(p[0].c, k.n)); continue; }
        var sl = somSleutel(p);
        if (veeltermen.has(sl)) veeltermen.get(sl).e = qplus(veeltermen.get(sl).e, k);
        else veeltermen.set(sl, { s: p, e: k, v: v });
        continue;
      }
      rest.push(f);
    }
    var uit = [];
    Array.from(letters.keys()).sort(function (a, b) { return (a === "x") - (b === "x") || (a < b ? -1 : 1); })
      .forEach(function (n) { var e = letters.get(n); uit.push(qis(e, EEN) ? sym(n) : bin("pow", sym(n), num(e))); });
    Array.from(veeltermen.values()).sort(vergelijkFactoren).forEach(function (p) {
      var b = somBoom(p.s);
      uit.push(qis(p.e, EEN) ? b : bin("pow", b, num(p.e)));
    });
    // 7(3 - 3x^2) is gewoon 21 - 21x^2: een getal maal één veelterm werken
    // we uit, zoals de cursus.
    if (!letters.size && !rest.length && veeltermen.size === 1 && qis(Array.from(veeltermen.values())[0].e, EEN)) return null;
    uit = uit.concat(rest);
    var ca = qabs(c);
    if (!qis(ca, EEN) || !uit.length) uit.unshift(num(ca));
    var r = product(uit);
    return qteken(c) < 0 ? neg(r) : r;
  }

  // Veeltermfactoren in de volgorde van een schoolboek: eerst de lineaire,
  // gerangschikt volgens hun nulwaarde, dan de rest naar graad.
  function vergelijkFactoren(p, q) {
    var gp = p.s[0].f.length ? Number(p.s[0].f[0].e.n) : 0, gq = q.s[0].f.length ? Number(q.s[0].f[0].e.n) : 0;
    if (gp !== gq) return gp - gq;
    if (gp === 1) {
      var np = nulwaarde(p.s), nq = nulwaarde(q.s);
      return qteken(qmin(np, nq));
    }
    return somSleutel(p.s) < somSleutel(q.s) ? -1 : 1;
  }
  function nulwaarde(lineair) {
    var c = naarCoeff(lineair);
    return qneg(qdeel(c[0], c[1]));
  }

  /* --- Ontbinden in factoren ----------------------------------------------- */

  function delers(n) {
    if (n < 0n) n = -n;
    var p = ontbind(n);
    if (!p) return null;
    var uit = [1n];
    p.forEach(function (pk) {
      var nieuw = [];
      uit.forEach(function (d) { var m = d; for (var i = 0; i <= pk[1]; i++) { nieuw.push(m); m *= pk[0]; } });
      uit = nieuw;
    });
    return uit.length > 5000 ? null : uit.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  }

  // Ontbindt een veelterm met rationale coëfficiënten (laagste graad eerst)
  // over Q: een constante c, een macht van x en lineaire factoren uit de
  // rationale nulwaarden (qx - p met p | a0 en q | an); wat overblijft,
  // blijft als één factor staan. Geeft { c, factoren: [{ coeff, e }] }.
  function ontbindVeelterm(coeff) {
    var a = coeff.slice();
    while (a.length && qnul(a[a.length - 1])) a.pop();
    if (a.length < 2) return null;
    var factoren = [], k = 0;
    while (qnul(a[k])) k++;
    if (k) factoren.push({ coeff: [NUL, EEN], e: k });
    a = a.slice(k);
    var g = 0n;
    a.forEach(function (q) { g = bggd(g, q.n); });
    var c = Q(g, kgvNoemers(a));
    if (qteken(a[a.length - 1]) < 0) c = qneg(c);
    var P = a.map(function (q) { return qdeel(q, c); });
    zoek:
    while (P.length > 2) {
      var boven = delers(P[0].n), onder = delers(P[P.length - 1].n);
      if (!boven || !onder) break;
      for (var i = 0; i < onder.length; i++) {
        for (var j = 0; j < boven.length; j++) {
          for (var teken = 1n; teken >= -1n; teken -= 2n) {
            var pp = teken * boven[j], qq = onder[i];
            if (bggd(pp, qq) !== 1n) continue;
            var deler = [Q(-pp), Q(qq)], m = 0, quot;
            while (P.length > 2 && (quot = deelVeelterm(P, deler))) { P = quot; m++; }
            if (P.length === 2 && deelVeelterm(P, deler)) { m++; P = [EEN]; }
            if (m) { factoren.push({ coeff: deler, e: m }); continue zoek; }
          }
        }
      }
      break;
    }
    if (P.length >= 2) {
      // Een lineaire rest met een positieve kop is zelf een factor.
      var bestaand = factoren.filter(function (f) { return somSleutel(vanCoeff(f.coeff, "x")) === somSleutel(vanCoeff(P, "x")); })[0];
      if (bestaand) bestaand.e++;
      else factoren.push({ coeff: P, e: 1 });
    } else c = qmaal(c, P[0]);
    return { c: c, factoren: factoren };
  }

  // De ontbonden vorm van een som: de teller op één noemer ontbonden in
  // factoren, zoals (x+1)^2 (x-8)/(x-2)^3. Handig voor een tekenverloop.
  // Null als er niets te ontbinden valt.
  function ontbondenBoom(s) {
    if (!s.length) return null;
    var r = opEenNoemer(s);
    var binnen = r.binnen, v = hoofdVeranderlijke(binnen);
    if (!v || binnen.length < 2 || !isVeelterm(binnen, v)) return null;
    var o = ontbindVeelterm(naarCoeff(binnen));
    if (!o) return null;
    var aantal = o.factoren.reduce(function (n, f) { return n + f.e; }, 0);
    if (aantal < 2) return null;
    var lijst = o.factoren.map(function (f) { return { s: vanCoeff(f.coeff, v), e: Q(f.e) }; });
    var uit = [];
    lijst.filter(function (p) { return p.s.length === 1; }).forEach(function (p) {
      uit.push(qis(p.e, EEN) ? sym(v) : bin("pow", sym(v), num(p.e)));
    });
    lijst.filter(function (p) { return p.s.length > 1; }).sort(vergelijkFactoren).forEach(function (p) {
      var b = somBoom(p.s);
      uit.push(qis(p.e, EEN) ? b : bin("pow", b, num(p.e)));
    });
    var teller = [], noemer = [];
    r.F.forEach(function (f) {
      if (qteken(f.e) < 0) noemer.push({ b: f.b, e: qneg(f.e) });
      else teller.push(f);
    });
    var c = o.c, ca = qabs(c);
    var bovenaan = (ca.n === 1n ? [] : [num(Q(ca.n))]).concat(uit, factorBomen(teller));
    var onderaan = (ca.d === 1n ? [] : [num(Q(ca.d))]).concat(factorBomen(noemer));
    var boom = onderaan.length ? bin("div", product(bovenaan), product(onderaan)) : product(bovenaan);
    return qteken(c) < 0 ? neg(boom) : boom;
  }

  // De vormen om na een boom te tonen, elk met een naam: niets als de boom
  // al de eenvoudigste vorm is, anders termsgewijs en eventueel op één
  // noemer. Voor een afgeleide ordenen we een product zoals de cursus het
  // schrijft, en komt de ontbonden vorm er als laatste bij.
  function eindvormen(boom, s, afgeleide_) {
    var uit, product_ = null;
    if (s.length > 1 && !bevatD(boom) && isProductvorm(boom, afgeleide_)) product_ = afgeleide_ ? productVorm(boom) : boom;
    if (product_) uit = [{ boom: product_, naam: "vereenvoudigd" }];
    else {
      uit = vormBomen(s).map(function (b, i) { return { boom: b, naam: i ? "op één noemer" : "vereenvoudigd" }; });
      if (afgeleide_) {
        var o = ontbondenBoom(s);
        if (o && uit.every(function (u) { return tex(u.boom) !== tex(o); })) uit.push({ boom: o, naam: "ontbonden in factoren", ontbonden: true });
      }
    }
    return uit;
  }
  function uitkomstBoom(s) { var v = vormBomen(s); return v[v.length - 1]; }
  function uitkomstTex(s) { return tex(uitkomstBoom(s)); }

  /* --- Decimale benadering ------------------------------------------------ */

  function decimaal(w) {
    if (!isFinite(w)) return null;
    if (w !== 0 && Math.abs(w) < 1e-4) return w.toPrecision(4).replace(/e([+-]?)(\d+)/, "\\cdot 10^{$1$2}").replace("+", "");
    return String(Number(w.toFixed(Math.abs(w) >= 1e6 ? 0 : 6)));
  }

  function isConstanteSom(s) {
    return s.every(function (t) {
      return t.f.every(function (f) {
        if (f.b.t === "sym") return f.b.n === "e" || f.b.n === "pi";
        if (f.b.t === "som") return isConstanteSom(f.b.lijst);
        if (f.b.t === "fn" || f.b.t === "macht") return isConstanteSom(f.b.a);
        return true;
      });
    });
  }
  function isRationaal(s) { return isGetalSom(s); }

  /* --- Een functie, voor hergebruik ---------------------------------------- */

  // Een exacte waarde uit wat een aanroeper geeft: een breuk Q, een getal,
  // tekst zoals "3/2" of "pi/6", een boom of al een som.
  function exacteWaarde(a) {
    if (Array.isArray(a)) return a;
    if (a && typeof a === "object" && "n" in a && "d" in a) return getalSom(a);
    if (typeof a === "number") {
      if (!isFinite(a)) throw new Rekenfout("Dat is geen getal.");
      var q = getal(Math.abs(a).toFixed(12));
      return getalSom(a < 0 ? qneg(q) : q);
    }
    var s = normaal(typeof a === "string" ? lees(a) : a);
    if (!isConstanteSom(s)) throw new Rekenfout("Vul een getal in, zoals 2, 1.5, 2/3 of pi/6.");
    return s;
  }

  // Een functie van één veranderlijke, de ingang voor wie de CAS buiten de
  // rekenmachine gebruikt:
  //   var f = FunctieCAS.functie("x^3 - 3x");
  //   f.tex                     "x^{3}-3x"
  //   f.waarde(2)               2
  //   f.exact("3/2").tex        "-\\frac{9}{8}"
  //   f.afleiding().stappen     de stappen met hun rekenregels
  //   f.afgeleide().tex         "3x^{2}-3"
  //   f.inPunt("3/2")           f(a), f'(a), raaklijn en normaal, exact
  // Ook "h(t) = 20t - 5t^2" mag: dan is t de veranderlijke.
  function Functie(invoer, v) {
    var boom = typeof invoer === "string" ? lees(invoer) : invoer;
    if (boom.k === "definitie") { this.naam = boom.n; v = v || boom.v; boom = boom.lijf; }
    if (boom.k === "opdracht") throw new Rekenfout("Geef een voorschrift, zoals x^3 - 3x.");
    if (bevat(boom, function (n) { return n.k === "call"; })) throw new Rekenfout("Een functie hier kan niet naar een andere functie verwijzen.");
    this.boom = boom;
    this.v = v || kiesVeranderlijke(boom);
    this.tex = tex(boom);
  }
  // De normaalvorm pas als iemand ze vraagt: een afleiding heeft ze niet
  // nodig, en voor sommige voorschriften (x^x) bestaat ze niet.
  Object.defineProperty(Functie.prototype, "som", {
    get: function () { return this._som || (this._som = normaal(this.boom)); }
  });
  // De vormen van het voorschrift: termsgewijs en eventueel op één noemer.
  Functie.prototype.vormen = function () { return vormen(this.som); };
  Functie.prototype.eenvoudigste = function () { return uitkomstTex(this.som); };
  Functie.prototype.waarde = function (x) { var omg = {}; omg[this.v] = x; return somWaarde(this.som, omg); };
  Functie.prototype.numeriek = function () { return numeriek(this.som, this.v); };
  // De exacte functiewaarde als { som, tex, getal }; een Rekenfout als ze
  // niet bestaat.
  Functie.prototype.exact = function (a) {
    var s = vulInSom(this.som, exacteWaarde(a), this.v);
    return { som: s, tex: uitkomstTex(s), getal: somWaarde(s, {}) };
  };
  Functie.prototype.afleiding = function () {
    if (!this._afleiding) {
      var st = afleidingsstappen(this.boom, this.v);
      var laatste = st[st.length - 1].boom;
      var s = normaal(laatste);
      var slot = st[st.length - 1].tex;
      var vormen_ = eindvormen(laatste, s, true).filter(function (u) { return tex(u.boom) !== slot; });
      // De uitkomst is de laatste vorm vóór de ontbonden vorm.
      var gewoon = vormen_.filter(function (u) { return !u.ontbonden; });
      var uitkomst = gewoon.length ? gewoon[gewoon.length - 1].boom : laatste;
      this._afleiding = {
        stappen: st, som: s, boom: uitkomst,
        vormen: vormen_.map(function (u) { return { boom: u.boom, naam: u.naam, tex: tex(u.boom) }; }),
        uitkomst: vormen_.map(function (u) { return tex(u.boom); }),
        uitkomstNamen: vormen_.map(function (u) { return u.naam; }),
        resultaat: tex(uitkomst)
      };
    }
    return this._afleiding;
  };
  Functie.prototype.afgeleide = function () {
    var f = new Functie(this.afleiding().boom, this.v);
    if (this.naam) f.naam = this.naam + "'";
    return f;
  };
  Functie.prototype.inPunt = function (a) { return inPunt(analyseer(this.boom, this.v), exacteWaarde(a)); };
  // Het voorschrift met de teller ontbonden in factoren, of null.
  Functie.prototype.ontbonden = function () { var o = ontbondenBoom(this.som); return o ? tex(o) : null; };

  function functie(invoer, v) { return new Functie(invoer, v); }

  /* --- Functies en opdrachten ---------------------------------------------- */

  // Deze letters zijn altijd een functie: f(3) zonder definitie is een fout,
  // geen product. Andere letters zijn het enkel als ze gedefinieerd zijn.
  var FUNCTIELETTERS = "fgh";

  function Omgeving() {
    this.functies = {};
    this.versie = 1;     // gaat omhoog bij elke definitie en elk wissen
    this.bezig = [];     // de functies die nu uitgeschreven worden (kringen)
  }

  // Definieert een functie met voorschrift lijf in de veranderlijke v. Een
  // aanroep van een andere functie blijft staan zoals ze getypt is: wie
  // g(x) = f(x) + 1 schrijft, verwijst naar f, en wijzigt f later, dan
  // wijzigt g mee. Het invullen gebeurt pas bij het rekenen (voorschrift).
  // De definitie wordt wel meteen uitgeschreven om ze na te kijken: een
  // onbekende functie of een kring (f via g terug naar f) is een fout, en
  // dan blijft de vorige definitie staan.
  Omgeving.prototype.definieer = function (naam, lijf, v) {
    var oud = this.functies[naam], f = { lijf: lijf, v: v || "x" };
    this.functies[naam] = f;
    this.versie++;
    try { this.voorschrift(naam); }
    catch (fout) {
      if (oud) this.functies[naam] = oud; else delete this.functies[naam];
      this.versie++;
      throw fout;
    }
    return f;
  };

  Omgeving.prototype.wis = function () { this.functies = {}; this.versie++; };

  // Vergeet één functie. Een functie die naar haar verwijst, meldt voortaan
  // dat ze niet gedefinieerd is.
  Omgeving.prototype.verwijder = function (naam) {
    delete this.functies[naam];
    this.versie++;
  };

  // Het voorschrift van naam met alle verwijzingen ingevuld, en de
  // normaalvorm ervan. Beide worden onthouden tot er iets gedefinieerd of
  // gewist wordt, want een verwijzing kan diep gaan.
  Omgeving.prototype.voorschrift = function (naam) {
    var f = this.functies[naam];
    if (!f) return null;
    if (f.versie !== this.versie) {
      f.uit = this.vervangAanroepen(f.lijf);
      f.uitSom = null;
      f.versie = this.versie;
    }
    return f.uit;
  };

  Omgeving.prototype.voorschriftSom = function (naam) {
    var lijf = this.voorschrift(naam);
    var f = this.functies[naam];
    if (!f.uitSom) f.uitSom = normaal(lijf);
    return f.uitSom;
  };

  // De functie als Functie, voor wie verder wil rekenen.
  Omgeving.prototype.functie = function (naam) {
    var f = this.functies[naam];
    if (!f) return null;
    var r = new Functie(this.voorschrift(naam), f.v);
    r.naam = naam;
    return r;
  };

  // Vervangt f(u), f'(u), ... door het voorschrift, met u ingevuld. Een
  // letter die geen functie is, maakt van a(x+1) een product.
  Omgeving.prototype.vervangAanroepen = function (e) {
    var zelf = this;
    return vervang(e, function (n) {
      if (n.k !== "call") return undefined;
      var f = zelf.functies[n.n];
      var voorbeeld = " Typ eerst bijvoorbeeld " + n.n + "(x) = x^2 - 3x.";
      if (!f) {
        if (n.accenten || !n.args || FUNCTIELETTERS.indexOf(n.n) >= 0 || n.args.length !== 1) {
          throw new Rekenfout("De functie " + n.n + " is nog niet gedefinieerd." + voorbeeld);
        }
        var r = bin("mul", sym(n.n), zelf.vervangAanroepen(n.args[0]));
        r.impliciet = true;
        return r;
      }
      var naam = n.n + "'".repeat(n.accenten);
      if (!n.args) throw new Rekenfout("Schrijf " + naam + "(" + f.v + ") of " + naam + "(2), met haakjes.");
      if (n.args.length !== 1) throw new Rekenfout(n.n + " heeft één argument.");
      if (zelf.bezig.indexOf(n.n) >= 0) {
        throw new Rekenfout("Zo verwijst " + n.n + " naar zichzelf, rechtstreeks of via " +
          zelf.bezig.join(", ") + ". Typ een voorschrift dat op zichzelf staat.");
      }
      zelf.bezig.push(n.n);
      var lijf;
      try { lijf = zelf.voorschrift(n.n); }
      finally { zelf.bezig.pop(); }
      for (var i = 0; i < n.accenten; i++) lijf = uitkomstBoom(normaal(afgeleide(lijf, f.v)));
      var arg = zelf.vervangAanroepen(n.args[0]);
      return isVar(arg, f.v) ? lijf : vulIn(lijf, f.v, arg);
    });
  };

  // De stappen van D(u) naar v, de normaalvorm van het resultaat en de
  // vormen waarin we die tonen.
  function afleiding(u, links, v) {
    var a = new Functie(u, v).afleiding();
    return {
      blok: { soort: "stappen", links: links, stappen: a.stappen, uitkomst: a.uitkomst,
              uitkomstNamen: a.uitkomstNamen, resultaat: a.resultaat },
      som: a.som, boom: a.boom
    };
  }

  function naarWelkeVeranderlijke(v) {
    return { soort: "tekst", tekst: "We leiden af naar $" + v + "$." };
  }

  // Werkt één regel invoer uit. Het resultaat heeft
  //   invoer    LaTeX van wat er gelezen werd
  //   blokken   [{ soort: "vergelijking" | "stappen" | "tekst" | "benadering", ... }]
  //   functie   de naam van een functie die (opnieuw) gedefinieerd werd
  Omgeving.prototype.voerUit = function (tekst) {
    var boom = lees(tekst);
    if (boom.k === "definitie") return this.definitie(boom, tekst.slice(tekst.indexOf("=") + 1).trim());
    if (boom.k === "opdracht") return boom.n === "wis" ? this.wisOpdracht(boom) : this.raaklijnOfNormaal(boom);
    if (boom.k === "call" && this.functies[boom.n] && boom.args && boom.args.length === 1) return this.functiewaarde(boom);
    if (boom.k === "call" && !this.functies[boom.n] && (boom.accenten || FUNCTIELETTERS.indexOf(boom.n) >= 0)) {
      this.vervangAanroepen(boom);   // geeft de foutmelding
    }
    if (boom.k === "D") {
      var u = this.vervangAanroepen(boom.a);
      var v = kiesVeranderlijke(u);
      var a = afleiding(u, null, v);
      a.blok.open = true;
      var blokken = [a.blok];
      if (v !== "x") blokken.unshift(naarWelkeVeranderlijke(v));
      return { invoer: tex(boom), blokken: blokken };
    }
    var e = this.vervangAanroepen(boom);
    var s = normaal(e);
    var invoer = tex(boom);
    var rij = [invoer];
    if (tex(e) !== invoer && !bevatD(e)) rij.push(tex(e));
    vormen(s).forEach(function (t) { if (rij.indexOf(t) < 0) rij.push(t); });
    var blokken2 = [{ soort: "vergelijking", tex: rij.join(" = ") }];
    if (isConstanteSom(s)) benadering(s, blokken2);
    return { invoer: invoer, blokken: blokken2 };
  };

  Omgeving.prototype.definitie = function (boom, tekst) {
    var f = this.definieer(boom.n, boom.lijf, boom.v);
    f.tekst = tekst;
    var getypt = tex(boom.lijf);
    var lijf = this.voorschrift(boom.n), som = this.voorschriftSom(boom.n);
    var rij = [boom.n + "(" + boom.v + ") = " + getypt];
    var ev = eindvormen(lijf, som);
    var v = tex(ev[ev.length - 1].boom);
    if (v !== getypt && v !== tex(lijf)) rij.push(v);
    else if (tex(lijf) !== getypt) rij.push(tex(lijf));
    return { invoer: tex(boom), blokken: [{ soort: "vergelijking", tex: rij.join(" = ") }], functie: boom.n };
  };

  // f(a), f'(x), f''(2), ...: eerst de afgeleide functies, dan invullen.
  Omgeving.prototype.functiewaarde = function (boom) {
    var f = this.functies[boom.n], v = f.v;
    var lijfVanF = this.voorschrift(boom.n), somVanF = this.voorschriftSom(boom.n);
    var arg = this.vervangAanroepen(boom.args[0]);
    if ((bevatVar(arg, v) || bevatVar(arg, "x")) && !isVar(arg, v)) {
      // f(2x + 1): gewoon de uitdrukking uitwerken.
      var e = this.vervangAanroepen(boom);
      var s0 = normaal(e);
      var rij0 = [tex(boom), tex(e)];
      vormen(s0).forEach(function (t) { if (rij0.indexOf(t) < 0) rij0.push(t); });
      return { invoer: tex(boom), blokken: [{ soort: "vergelijking", tex: rij0.join(" = ") }] };
    }
    var blokken = [];
    var huidig = lijfVanF, som = somVanF, huidigBoom = lijfVanF;
    for (var k = 1; k <= boom.accenten; k++) {
      var a = afleiding(huidig, boom.n + "'".repeat(k) + "(" + v + ")", v);
      a.blok.open = k === boom.accenten && isVar(arg, v);
      blokken.push(a.blok);
      som = a.som;
      huidig = a.boom;
      huidigBoom = a.boom;
    }
    var naam = boom.n + "'".repeat(boom.accenten);
    if (isVar(arg, v)) {
      if (!boom.accenten) {
        // Verwijst het voorschrift naar een andere functie, dan staat die
        // verwijzing vooraan, zoals ze getypt is: g(x) = f(x)+1 = x^2+1.
        var rij1 = [naam + "(" + v + ") = " + tex(f.lijf)];
        if (tex(f.lijf) !== tex(lijfVanF)) rij1.push(tex(lijfVanF));
        var u = uitkomstTex(somVanF);
        if (rij1.indexOf(u) < 0) rij1.push(u);
        blokken.push({ soort: "vergelijking", tex: rij1.join(" = ") });
      }
      return { invoer: tex(boom), blokken: blokken };
    }
    if (boom.accenten === 0) huidigBoom = lijfVanF;
    var argTex = "\\left(" + tex(boom.args[0]) + "\\right)";
    var waarde_;
    try { waarde_ = vulInSom(som, normaal(arg), v); }
    catch (fout) {
      if (!(fout instanceof Rekenfout)) throw fout;
      blokken.push({ soort: "vergelijking", tex: naam + argTex + " = " + tex(vulIn(huidigBoom, v, arg)) });
      blokken.push({ soort: "tekst", fout: true,
                     tekst: "$" + naam + argTex + "$ bestaat niet: " + klein(fout.message) });
      return { invoer: tex(boom), blokken: blokken };
    }
    var ingevuld = tex(vulIn(huidigBoom, v, bevatVar(boom.args[0], v) ? arg : ingevuldArg(boom.args[0], arg)));
    var rij = [naam + argTex];
    if (ingevuld !== tex(boom.args[0])) rij.push(ingevuld);
    vormen(waarde_).slice(-1).forEach(function (t) { if (rij.indexOf(t) < 0) rij.push(t); });
    blokken.push({ soort: "vergelijking", tex: rij.join(" = ") });
    if (isConstanteSom(waarde_)) benadering(waarde_, blokken);
    return { invoer: tex(boom), blokken: blokken };
  };

  // Het argument zoals de leerling het typte, als dat een getal is; anders
  // wat eruit volgde (een symbool, of een uitgewerkte functiewaarde).
  function ingevuldArg(getypt, arg) { return getypt.k === "call" ? arg : getypt; }

  function benadering(s, blokken) {
    if (isGetalSom(s) && qheel(getalVan(s))) return;
    var d = decimaal(somWaarde(s, {}));
    if (d !== null) blokken.push({ soort: "benadering", tex: "\\approx " + d });
  }

  // wis(f), wis(f, g) en wis(): één functie, meer functies of alles. Wie naar
  // een gewiste functie verwijst, blijft staan, maar hoort het.
  Omgeving.prototype.wisOpdracht = function (boom) {
    var zelf = this, blokken = [];
    if (!boom.args.length) {
      var alles = Object.keys(this.functies).sort();
      this.wis();
      blokken.push({ soort: "tekst", tekst: alles.length
        ? "Alle functies zijn gewist: $" + alles.join("$, $") + "$."
        : "Er was nog geen functie om te wissen." });
      return { invoer: tex(boom), blokken: blokken, gewist: true };
    }
    var namen = boom.args.map(function (a) {
      if (a.k !== "sym" || !/^[a-zA-Z]$/.test(a.n)) throw new Rekenfout("Schrijf wis(f): de naam van een functie.");
      if (!zelf.functies[a.n]) {
        var er = Object.keys(zelf.functies);
        throw new Rekenfout("De functie " + a.n + " is niet gedefinieerd." +
          (er.length ? " Gedefinieerd zijn: " + er.join(", ") + "." : ""));
      }
      return a.n;
    });
    namen.forEach(function (n) { zelf.verwijder(n); });
    blokken.push({ soort: "tekst", tekst: "$" + namen.join("$, $") + "$ " + (namen.length > 1 ? "zijn" : "is") + " gewist." });
    // Wie naar een gewiste functie verwees, rekent niet meer: dat zeggen we
    // erbij, want aan de functie zelf is niets te zien.
    var stuk = Object.keys(this.functies).filter(function (n) {
      try { zelf.voorschrift(n); return false; } catch (fout) {
        if (!(fout instanceof Rekenfout)) throw fout;
        return true;
      }
    });
    if (stuk.length) {
      blokken.push({ soort: "tekst", fout: true,
        tekst: "$" + stuk.join("$, $") + "$ " + (stuk.length > 1 ? "verwijzen" : "verwijst") +
          " naar " + (namen.length > 1 ? "een van die functies" : "$" + namen[0] + "$") + " en " +
          (stuk.length > 1 ? "werken" : "werkt") + " niet meer." });
    }
    return { invoer: tex(boom), blokken: blokken, gewist: true };
  };

  // raaklijn(f, a) en normaal(f, a), ook met een voorschrift in plaats van f.
  Omgeving.prototype.raaklijnOfNormaal = function (boom) {
    var isNormaal = boom.n === "normaal";
    if (boom.args.length !== 2) throw new Rekenfout("Schrijf " + boom.n + "(f, 2): de functie en de x-coördinaat van het punt.");
    var fArg = boom.args[0], aArg = boom.args[1];
    var naam = null, lijf, v;
    if (fArg.k === "sym" && fArg.n !== "x" && /^[a-zA-Z]$/.test(fArg.n)) {
      if (!this.functies[fArg.n]) throw new Rekenfout("De functie " + fArg.n + " is nog niet gedefinieerd. Typ eerst bijvoorbeeld " + fArg.n + "(x) = x^2 - 3x.");
      naam = fArg.n;
    } else if (fArg.k === "call" && !fArg.accenten && fArg.args && fArg.args.length === 1 && this.functies[fArg.n] &&
               isVar(fArg.args[0], this.functies[fArg.n].v)) {
      naam = fArg.n;
    }
    if (naam) { lijf = this.voorschrift(naam); v = this.functies[naam].v; }
    else { lijf = this.vervangAanroepen(fArg); v = kiesVeranderlijke(lijf); }
    var a = this.vervangAanroepen(aArg);
    if (bevatVar(a, v)) throw new Rekenfout("Het tweede argument is de x-coördinaat van het punt: een getal.");
    var r = rechteBlokken(lijf, naam, a, aArg, isNormaal, v);
    r.invoer = tex(boom);
    return r;
  };

  function rechteBlokken(lijf, naam, a, aArg, isNormaal, v) {
    var f = naam || "f";
    var blokken = [];
    if (!naam) blokken.push({ soort: "vergelijking", tex: "f(" + v + ") = " + tex(lijf) });
    var s = normaal(lijf), aSom = normaal(a);
    var aTex = tex(aArg), aHaak = "\\left(" + aTex + "\\right)";
    var fa, ma;
    try { fa = vulInSom(s, aSom, v); }
    catch (fout) {
      if (!(fout instanceof Rekenfout)) throw fout;
      blokken.push({ soort: "tekst", fout: true, tekst: "$" + f + aHaak + "$ bestaat niet: " + klein(fout.message) + " Het punt ligt dus niet op de grafiek." });
      return { blokken: blokken };
    }
    var afl = afleiding(lijf, f + "'(" + v + ")", v);
    blokken.push(afl.blok);
    var faTex = uitkomstTex(fa);
    try { ma = vulInSom(afl.som, aSom, v); }
    catch (fout2) {
      if (!(fout2 instanceof Rekenfout)) throw fout2;
      blokken.push({ soort: "vergelijking", tex: f + aHaak + " = " + faTex });
      blokken.push({ soort: "tekst", fout: true,
                     tekst: "$" + f + "'" + aHaak + "$ bestaat niet: " + klein(fout2.message) +
                            " De functie is niet afleidbaar in $" + aTex + "$. Kijk naar de grafiek: staat de raaklijn daar verticaal?" });
      return { blokken: blokken };
    }
    blokken.push({ soort: "vergelijking", tex: f + aHaak + " = " + faTex + " \\qquad " + f + "'" + aHaak + " = " + uitkomstTex(ma) });
    if (!isNormaal) {
      blokken.push({ soort: "tekst", tekst: "De raaklijn in $P\\left(" + aTex + ",\\, " + faTex + "\\right)$:", formule: "t \\leftrightarrow y - " + f + "(a) = " + f + "'(a)\\,(x-a)" });
      blokken.push({ soort: "vergelijking", tex: rechteTex("t", fa, ma, aSom) });
    } else if (ma.length === 0) {
      blokken.push({ soort: "tekst", tekst: "De raaklijn in $P\\left(" + aTex + ",\\, " + faTex + "\\right)$ is horizontaal, dus de normaal staat verticaal." });
      blokken.push({ soort: "vergelijking", tex: "n \\leftrightarrow x = " + uitkomstTex(aSom) });
    } else {
      blokken.push({ soort: "tekst", tekst: "De normaal in $P\\left(" + aTex + ",\\, " + faTex + "\\right)$:", formule: "n \\leftrightarrow y - " + f + "(a) = \\frac{-1}{" + f + "'(a)}\\,(x-a)" });
      blokken.push({ soort: "vergelijking", tex: rechteTex("n", fa, normaalRico(ma), aSom) });
    }
    return { blokken: blokken };
  }

  function klein(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function normaalRico(m) { return somMaal(getalSom(MIN_EEN), somMacht(m, MIN_EEN)); }

  // De vergelijking van de rechte door (a, fa) met rico m: eerst als
  // y - f(a) = m(x - a), zoals de formule het zegt. Is alles rationaal, dan
  // volgt de vorm ux + vy + w = 0 met gehele coëfficiënten, zoals in de
  // cursus; anders y = mx + q.
  function rechteTex(naam, fa, m, a) {
    function verschil(letter, w) {
      if (!w.length) return letter + "-0";
      var t = uitkomstTex(w);
      if (begintMetMin(t) && w.length === 1) return letter + "+" + t.replace(/^\s*-/, "");
      if (w.length > 1) return letter + "-" + haakjes(t);
      return letter + "-" + t;
    }
    var rechts;
    if (!m.length) rechts = "0";
    else {
      var mt = uitkomstTex(m);
      if (mt === "1") mt = "";
      else if (mt === "-1") mt = "-";
      else if (m.length > 1) mt = haakjes(mt);
      rechts = mt + "\\,(" + verschil("x", a) + ")";
    }
    var eerste = naam + " \\leftrightarrow " + verschil("y", fa) + " = " + rechts;
    if ([fa, m, a].every(isRationaal)) {
      var M = getalVan(m), f = getalVan(fa), x0 = getalVan(a);
      // m·x - y + (f - m·x0) = 0, met gehele coëfficiënten
      var c = [M, MIN_EEN, qmin(f, qmaal(M, x0))];
      var l = kgvNoemers(c);
      var i = c.map(function (q) { return qmaal(q, Q(l)).n; });
      var g = i.reduce(function (acc, n) { return bggd(acc, n); }, 0n) || 1n;
      i = i.map(function (n) { return n / g; });
      if (i[0] < 0n || i[0] === 0n && i[1] < 0n) i = i.map(function (n) { return -n; });
      var delen = "";
      [[i[0], "x"], [i[1], "y"], [i[2], ""]].forEach(function (p) {
        var n = p[0];
        if (n === 0n) return;
        var abs = n < 0n ? -n : n;
        delen += (n < 0n ? "-" : (delen ? "+" : "")) + (abs === 1n && p[1] ? "" : String(abs)) + p[1];
      });
      return eerste + " \\iff " + delen + " = 0";
    }
    var q = somPlus(fa, somNeg(somMaal(m, a)));
    return eerste + " \\iff y = " + tex(somBoom(somPlus(somMaal(m, grondSom(symGrond("x"))), q)));
  }

  /* --- Voor de grafiek ------------------------------------------------------ */

  // Alles wat de grafiek nodig heeft van een voorschrift in v: de
  // normaalvorm, de afgeleide en numerieke functies voor beide.
  function analyseer(lijf, v) {
    var f = new Functie(lijf, v);
    var afl = f.afleiding();
    return {
      lijf: lijf, v: f.v, som: f.som, afgeleide: afl.som,
      f: numeriek(f.som, f.v), fAccent: numeriek(afl.som, f.v),
      tex: f.tex, afgeleideTex: afl.resultaat
    };
  }

  // Exacte gegevens in x = a (een breuk of een som) voor de regels onder
  // de grafiek.
  function inPunt(analyse, a) {
    var aSom = Array.isArray(a) ? a : getalSom(a);
    var v = analyse.v || "x";
    var uit = { a: a, aTex: Array.isArray(a) ? uitkomstTex(a) : numTex(a) };
    try { uit.fa = vulInSom(analyse.som, aSom, v); }
    catch (f) { if (f instanceof Rekenfout) { uit.fout = f.message; return uit; } throw f; }
    uit.faTex = uitkomstTex(uit.fa);
    uit.faGetal = somWaarde(uit.fa, {});
    try { uit.m = vulInSom(analyse.afgeleide, aSom, v); }
    catch (f2) { if (f2 instanceof Rekenfout) { uit.mFout = f2.message; return uit; } throw f2; }
    uit.mTex = uitkomstTex(uit.m);
    uit.mGetal = somWaarde(uit.m, {});
    uit.raaklijnTex = rechteTex("t", uit.fa, uit.m, aSom);
    uit.normaalTex = uit.m.length ? rechteTex("n", uit.fa, normaalRico(uit.m), aSom)
                                  : "n \\leftrightarrow x = " + uit.aTex;
    return uit;
  }

  // De catalogus zoals een helpvenster haar kan tonen.
  function catalogus() {
    return VOLGORDE.map(function (n) {
      var d = CATALOGUS[n];
      return { naam: d.naam, namen: d.namen.slice(), regels: Object.assign({}, d.regels) };
    });
  }

  var CAS = {
    // lezen en tonen
    lees: lees, tex: tex, vrijeLetters: vrijeLetters, kiesVeranderlijke: kiesVeranderlijke,
    // afleiden
    afleidingsstappen: afleidingsstappen, afgeleide: afgeleide, REGELS: REGELS,
    // normaalvorm en vormen
    normaal: normaal, vormen: vormen, uitkomstTex: uitkomstTex, uitkomstBoom: uitkomstBoom,
    // numeriek en invullen
    numeriek: numeriek, somWaarde: somWaarde, waarde: waarde, vulIn: vulIn, vulInSom: vulInSom,
    // hergebruik
    functie: functie, Functie: Functie, registreerFunctie: registreerFunctie, catalogus: catalogus,
    // de rekenmachine en haar grafiek
    Omgeving: Omgeving, analyseer: analyseer, inPunt: inPunt,
    // getallen en fouten
    Q: Q, getal: getal, qtekst: qtekst, numTex: numTex, decimaal: decimaal,
    Rekenfout: Rekenfout, Invoerfout: Invoerfout
  };

  if (typeof module !== "undefined" && module.exports) module.exports = CAS;
  else wereld.FunctieCAS = CAS;
})(typeof window !== "undefined" ? window : this);
