/* Rekenkern van de stelselrekenmachine voor de cursussite.
 *
 * De leerling typt een stelsel van lineaire vergelijkingen, één vergelijking
 * per regel, en krijgt het opgelost zoals in het hoofdstuk over stelsels: de
 * uitgebreide matrix A_b wordt met de methode van Gauss-Jordan stap voor stap
 * herleid tot de rij-canonieke matrix, met naast elke rij de rij-operatie
 * (R_2 -> 2R_2 - 3R_1, zonder breuken), de spil in een kadertje en op vraag
 * de controlekolom. Daarna volgen het stelsel dat we aflezen, de oplossing
 * met vrij gekozen onbekenden, de oplossingenverzameling V en de rangen.
 *
 * Een letter die geen onbekende is, is een parameter. Het stelsel wordt dan
 * besproken zoals in de cursus: we herleiden voor alle waarden samen tot een
 * spil van de parameter afhangt, en delen daar in gevallen in (m != 1 en
 * m != -1, m = 1, m = -1), elk met haar eigen herleiding en oplossing, en
 * onderaan een overzicht.
 *
 * Het bestand is in lagen opgebouwd; elke laag gebruikt enkel de lagen erboven.
 *   Breuken       exacte rationale getallen met BigInt
 *   Veeltermen    in de parameters: optellen, delen, ggd, ontbinden
 *   Lezen         van getypte regels naar de rijen van A_b
 *   Tonen         veeltermen, matrices en rij-operaties in LaTeX
 *   Gauss-Jordan  de herleiding, met gevallen
 *   Besluit       aflezen, oplossen, V en de rangen
 *   Oplossen      de ingang: los(tekst, opties)
 *
 * Het bestand heeft geen DOM nodig: stelselrekenmachine.js bouwt er het
 * venster rond, en bin/tests/stelselcas.test.js test het onder Node.
 */
(function (wereld) {
  "use strict";

  // Groter past niet meer leesbaar in een venster, en de cursus gaat niet
  // verder dan vier vergelijkingen.
  var MAX_VERGELIJKINGEN = 6, MAX_ONBEKENDEN = 6, MAX_PARAMETERS = 2;
  var MAX_GEVALLEN = 12;
  // Letters die altijd een onbekende zijn. Een andere letter is een
  // parameter, tenzij geen van deze letters voorkomt: dan zijn alle letters
  // onbekenden (a, b en c van een parabool door drie punten).
  var ONBEKENDEN = ["x", "y", "z", "u", "v", "w"];
  // Namen voor vrij gekozen onbekenden, in deze volgorde.
  var VRIJE_NAMEN = ["t", "s", "r", "q", "p", "k", "l"];

  function Rekenfout(bericht) {
    var e = new Error(bericht);
    Object.setPrototypeOf(e, Rekenfout.prototype);
    return e;
  }
  Rekenfout.prototype = Object.create(Error.prototype);
  Rekenfout.prototype.name = "Rekenfout";

  // plaats is de positie in de volledige invoertekst, zodat het venster het
  // teken kan aanwijzen.
  function Invoerfout(bericht, plaats) {
    var e = new Error(bericht);
    Object.setPrototypeOf(e, Invoerfout.prototype);
    e.plaats = plaats;
    return e;
  }
  Invoerfout.prototype = Object.create(Error.prototype);
  Invoerfout.prototype.name = "Invoerfout";

  /* --- Breuken ---------------------------------------------------------- */

  // Met BigInt: bij het herleiden zonder breuken worden de getallen snel groot.
  function bggd(a, b) {
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function Q(t, n) {
    t = BigInt(t);
    n = n === undefined ? 1n : BigInt(n);
    if (n === 0n) throw Rekenfout("Delen door nul kan niet.");
    if (n < 0n) { t = -t; n = -n; }
    var g = bggd(t, n) || 1n;
    return { t: t / g, n: n / g };
  }
  var NUL = Q(0), EEN = Q(1);
  function qplus(a, b) { return Q(a.t * b.n + b.t * a.n, a.n * b.n); }
  function qmin(a, b) { return Q(a.t * b.n - b.t * a.n, a.n * b.n); }
  function qmaal(a, b) { return Q(a.t * b.t, a.n * b.n); }
  function qdeel(a, b) { return Q(a.t * b.n, a.n * b.t); }
  function qneg(a) { return { t: -a.t, n: a.n }; }
  function qnul(a) { return a.t === 0n; }
  function qis(a, b) { return a.t === b.t && a.n === b.n; }
  function qteken(a) { return a.t < 0n ? -1 : a.t > 0n ? 1 : 0; }
  function qabs(a) { return a.t < 0n ? qneg(a) : a; }
  function qvergelijk(a, b) { return qteken(qmin(a, b)); }

  // Een getal zoals de leerling het typte: 3, 1.5 of .5.
  function qUitTekst(s) {
    var m = /^(\d*)(?:\.(\d*))?$/.exec(s);
    var geheel = m[1] || "0", dec = m[2] || "";
    return Q(BigInt(geheel + dec), 10n ** BigInt(dec.length));
  }

  function qtex(a) {
    var t = a.t < 0n ? -a.t : a.t;
    var s = a.n === 1n ? String(t) : "\\frac{" + t + "}{" + a.n + "}";
    return (a.t < 0n ? "-" : "") + s;
  }

  /* --- Veeltermen in de parameters -------------------------------------- */

  // Een veelterm is een Map van exponenten ("2,0" voor m^2 bij de parameters
  // m en p) naar een breuk. Zonder parameters is er één sleutel, "", en is
  // elk element van de matrix gewoon een getal. Alles wat volgt, werkt voor
  // elk aantal parameters; de rekenmachine laat er hoogstens twee toe.
  function Ring(namen) {
    var k = namen.length;
    var NULEXP = [];
    for (var i = 0; i < k; i++) NULEXP.push(0);
    var CSLEUTEL = NULEXP.join(",");

    function leeg() { return new Map(); }
    function zet(p, e, c) {
      var s = e.join(",");
      var oud = p.get(s);
      var nieuw = oud ? qplus(oud.c, c) : c;
      if (qnul(nieuw)) p.delete(s);
      else p.set(s, { e: e, c: nieuw });
    }
    function cst(c) {
      var p = leeg();
      if (!qnul(c)) p.set(CSLEUTEL, { e: NULEXP.slice(), c: c });
      return p;
    }
    function getal(n) { return cst(Q(n)); }
    function veranderlijke(i, graad) {
      var e = NULEXP.slice();
      e[i] = graad === undefined ? 1 : graad;
      var p = leeg();
      p.set(e.join(","), { e: e, c: EEN });
      return p;
    }
    function isNul(p) { return p.size === 0; }
    function isCst(p) { return p.size === 0 || (p.size === 1 && p.has(CSLEUTEL)); }
    function waarde(p) { return p.size === 0 ? NUL : p.get(CSLEUTEL).c; }
    function plus(a, b) {
      var p = new Map(a);
      b.forEach(function (t) { zet(p, t.e, t.c); });
      return p;
    }
    function neg(a) {
      var p = leeg();
      a.forEach(function (t, s) { p.set(s, { e: t.e, c: qneg(t.c) }); });
      return p;
    }
    function min(a, b) { return plus(a, neg(b)); }
    function maal(a, b) {
      var p = leeg();
      a.forEach(function (t) {
        b.forEach(function (u) {
          var e = [];
          for (var i = 0; i < k; i++) e.push(t.e[i] + u.e[i]);
          zet(p, e, qmaal(t.c, u.c));
        });
      });
      return p;
    }
    function schaal(a, c) {
      if (qnul(c)) return leeg();
      var p = leeg();
      a.forEach(function (t, s) { p.set(s, { e: t.e, c: qmaal(t.c, c) }); });
      return p;
    }
    function macht(a, n) {
      var p = cst(EEN);
      for (var i = 0; i < n; i++) p = maal(p, a);
      return p;
    }
    function gelijk(a, b) { return isNul(min(a, b)); }
    function graad(p, i) {
      var g = -1;
      p.forEach(function (t) { if (t.e[i] > g) g = t.e[i]; });
      return g;
    }
    function totaleGraad(p) {
      var g = -1;
      p.forEach(function (t) {
        var s = 0;
        for (var i = 0; i < k; i++) s += t.e[i];
        if (s > g) g = s;
      });
      return g;
    }
    function veranderlijken(p) {
      var v = [];
      for (var i = 0; i < k; i++) if (graad(p, i) > 0) v.push(i);
      return v;
    }
    // De coëfficiënt van v_i^d, als veelterm in de andere parameters.
    function coef(p, i, d) {
      var q = leeg();
      p.forEach(function (t, s) {
        if (t.e[i] !== d) return;
        var e = t.e.slice();
        e[i] = 0;
        q.set(e.join(","), { e: e, c: t.c });
      });
      return q;
    }
    // De termen van groot naar klein: eerst naar de eerste parameter, dan
    // naar de volgende. Zo staat m^2 - 1 zoals in de cursus.
    function termen(p) {
      var lijst = [];
      p.forEach(function (t) { lijst.push(t); });
      lijst.sort(function (a, b) {
        var sa = 0, sb = 0;
        for (var i = 0; i < k; i++) { sa += a.e[i]; sb += b.e[i]; }
        if (sa !== sb) return sb - sa;
        for (i = 0; i < k; i++) if (a.e[i] !== b.e[i]) return b.e[i] - a.e[i];
        return 0;
      });
      return lijst;
    }
    function leidend(p) { return termen(p)[0]; }
    // Vervang v_i door een veelterm in de andere parameters.
    function vervang(p, i, uitdr) {
      var q = leeg();
      p.forEach(function (t) {
        var e = t.e.slice();
        var n = e[i];
        e[i] = 0;
        var m = leeg();
        m.set(e.join(","), { e: e, c: t.c });
        q = plus(q, maal(m, macht(uitdr, n)));
      });
      return q;
    }
    function vulIn(p, waarden) {
      var s = NUL;
      p.forEach(function (t) {
        var c = t.c;
        for (var i = 0; i < k; i++) {
          for (var j = 0; j < t.e[i]; j++) c = qmaal(c, waarden[i]);
        }
        s = qplus(s, c);
      });
      return s;
    }

    // Exacte deling: een veelterm door een deler die er zeker in gaat, zoals
    // de ggd. Gaat de deling niet op, dan is dat een fout in de rekenmachine.
    function deel(p, d) {
      if (isNul(d)) throw Rekenfout("Delen door nul kan niet.");
      if (isCst(d)) return schaal(p, qdeel(EEN, waarde(d)));
      var i = veranderlijken(d)[0];
      var dd = graad(d, i), ld = coef(d, i, dd);
      var quot = leeg(), rest = p;
      while (!isNul(rest)) {
        var dr = graad(rest, i);
        if (dr < dd) throw Rekenfout("Een deling gaat niet op.");
        var t = maal(deel(coef(rest, i, dr), ld), veranderlijke(i, dr - dd));
        quot = plus(quot, t);
        rest = min(rest, maal(t, d));
      }
      return quot;
    }
    function deelbaar(p, d) {
      try { deel(p, d); return true; } catch (e) { return false; }
    }

    // De rationale inhoud: het getal c waarvoor p/c gehele coëfficiënten
    // zonder gemeenschappelijke deler heeft, met de leidende term positief.
    function inhoudQ(p) {
      if (isNul(p)) return EEN;
      var g = 0n, l = 1n;
      p.forEach(function (t) {
        g = bggd(g, t.c.t);
        l = l / bggd(l, t.c.n) * t.c.n;
      });
      var c = Q(g, l);
      return qteken(leidend(p).c) < 0 ? qneg(c) : c;
    }
    function primitief(p) { return isNul(p) ? p : schaal(p, qdeel(EEN, inhoudQ(p))); }

    // De inhoud naar v_i: de ggd van de coëfficiënten van de machten van v_i.
    function inhoud(p, i) {
      var g = leeg();
      for (var d = graad(p, i); d >= 0; d--) g = ggd(g, coef(p, i, d));
      return g;
    }

    // De grootste gemene deler, primitief en met een positieve leidende term.
    // Voor meer parameters gaat het recursief: de inhoud naar de eerste
    // parameter, en voor de primitieve delen een rij van pseudoresten.
    function ggd(a, b) {
      if (isNul(a)) return primitief(b);
      if (isNul(b)) return primitief(a);
      if (isCst(a) || isCst(b)) return cst(EEN);
      var va = veranderlijken(a), vb = veranderlijken(b);
      var i = Math.min(va[0], vb[0]);
      if (va.indexOf(i) < 0) return ggd(a, inhoud(b, i));
      if (vb.indexOf(i) < 0) return ggd(inhoud(a, i), b);
      var ca = inhoud(a, i), cb = inhoud(b, i);
      var c = ggd(ca, cb);
      var pa = deel(a, ca), pb = deel(b, cb);
      if (graad(pa, i) < graad(pb, i)) { var w = pa; pa = pb; pb = w; }
      while (!isNul(pb)) {
        if (graad(pb, i) === 0) { pa = cst(EEN); break; }
        var r = pseudorest(pa, pb, i);
        pa = pb;
        pb = isNul(r) ? r : deel(r, inhoud(r, i));
      }
      return primitief(maal(c, isCst(pa) ? cst(EEN) : deel(pa, inhoud(pa, i))));
    }
    function pseudorest(a, b, i) {
      var db = graad(b, i), lb = coef(b, i, db), r = a;
      while (!isNul(r) && graad(r, i) >= db) {
        var dr = graad(r, i);
        r = min(maal(lb, r), maal(maal(coef(r, i, dr), veranderlijke(i, dr - db)), b));
      }
      return r;
    }

    // De rationale nulpunten van een veelterm in één parameter, van klein
    // naar groot. Enkel kandidaten p/q met p een deler van de constante term
    // en q een deler van de hoogste coëfficiënt kunnen.
    function rationaleNulpunten(p, i) {
      var g = graad(p, i);
      var cf = [];
      var pr = primitief(p);
      for (var d = 0; d <= g; d++) cf.push(waarde(coef(pr, i, d)).t);
      var nulpunten = [];
      if (cf[0] === 0n) nulpunten.push(NUL);
      var laag = 0;
      while (cf[laag] === 0n) laag++;
      var tellers = delers(cf[laag]), noemers = delers(cf[g]);
      if (!tellers || !noemers) return nulpunten;
      var gezien = {};
      tellers.forEach(function (t) {
        noemers.forEach(function (n) {
          [Q(t, n), Q(-t, n)].forEach(function (r) {
            var s = r.t + "/" + r.n;
            if (gezien[s]) return;
            gezien[s] = true;
            var w = [];
            for (var j = 0; j < k; j++) w.push(NUL);
            w[i] = r;
            if (qnul(vulIn(p, w))) nulpunten.push(r);
          });
        });
      });
      nulpunten.sort(qvergelijk);
      return nulpunten;
    }
    function delers(n) {
      if (n < 0n) n = -n;
      if (n > 1000000000000n) return null;
      var d = [];
      for (var i = 1n; i * i <= n; i++) {
        if (n % i === 0n) { d.push(i); if (i * i !== n) d.push(n / i); }
      }
      return d;
    }

    // Ontbinden in factoren: een getal maal primitieve factoren met een
    // positieve leidende term. Lineaire factoren van één parameter komen er
    // altijd uit; wat overblijft, staat als één factor.
    function ontbind(p) {
      if (isNul(p)) return { c: NUL, f: [] };
      var factoren = [];
      function voegToe(f) {
        f = primitief(f);
        if (isCst(f)) return;
        for (var j = 0; j < factoren.length; j++) {
          if (gelijk(factoren[j].p, f)) { factoren[j].e++; return; }
        }
        factoren.push({ p: f, e: 1 });
      }
      function splits(q) {
        if (isCst(q)) return;
        var i = veranderlijken(q)[0];
        var c = inhoud(q, i);
        if (!isCst(c)) { splits(c); q = deel(q, c); }
        if (veranderlijken(q).length === 1) {
          rationaleNulpunten(q, i).forEach(function (r) {
            var lin = min(schaal(veranderlijke(i), Q(r.n)), getal(r.t));
            while (!isCst(q) && deelbaar(q, lin)) { q = deel(q, lin); voegToe(lin); }
          });
        }
        if (!isCst(q)) voegToe(q);
      }
      splits(p);
      var rest = p;
      factoren.forEach(function (f) { rest = deel(rest, macht(f.p, f.e)); });
      return { c: waarde(rest), f: factoren };
    }

    // Wanneer is een factor nul? Enkel als ze lineair is in een parameter met
    // een getal als coëfficiënt, kan de rekenmachine die parameter uitdrukken
    // (m = 1, a = -b). Een kwadratische factor zonder reële nulpunten is
    // nooit nul; voor de rest past de rekenmachine.
    function nulpunt(f) {
      var vs = veranderlijken(f);
      for (var j = 0; j < vs.length; j++) {
        var i = vs[j];
        if (graad(f, i) !== 1) continue;
        var c = coef(f, i, 1);
        if (!isCst(c)) continue;
        var rest = min(f, maal(c, veranderlijke(i)));
        return { i: i, uitdr: schaal(rest, qneg(qdeel(EEN, waarde(c)))) };
      }
      return null;
    }
    function nooitNul(f) {
      var vs = veranderlijken(f);
      if (vs.length !== 1) return false;
      var i = vs[0];
      if (graad(f, i) !== 2) return false;
      var a = waarde(coef(f, i, 2)), b = waarde(coef(f, i, 1)), c = waarde(coef(f, i, 0));
      return qteken(qmin(qmaal(b, b), qmaal(Q(4), qmaal(a, c)))) < 0;
    }

    /* --- Tonen -------------------------------------------------------- */

    function monoom(e) {
      var s = "";
      for (var i = 0; i < k; i++) {
        if (!e[i]) continue;
        s += namen[i] + (e[i] > 1 ? "^{" + e[i] + "}" : "");
      }
      return s;
    }
    // Een veelterm uitgeschreven, van de hoogste graad naar de laagste.
    function tex(p) {
      if (isNul(p)) return "0";
      var s = "";
      termen(p).forEach(function (t, j) {
        var c = t.c, m = monoom(t.e);
        var negatief = qteken(c) < 0;
        var a = qabs(c);
        var term;
        if (m && a.n !== 1n) term = "\\frac{" + (a.t === 1n ? "" : a.t) + m + "}{" + a.n + "}";
        else term = (m && qis(a, EEN) ? "" : qtex(a)) + m;
        s += (negatief ? "-" : j ? "+" : "") + term;
      });
      return s;
    }
    function isTerm(p) { return p.size <= 1; }
    // Als factor voor iets anders: haakjes rond een som.
    function factorTex(p) {
      if (isTerm(p)) {
        var s = tex(p);
        return s === "1" ? "" : s === "-1" ? "-" : s;
      }
      return "(" + tex(p) + ")";
    }
    // Ontbonden, zoals -3(m-1)(m+1) of 2m(m+1)^{2}.
    function ontbondenTex(p) {
      if (isTerm(p)) return tex(p);
      var o = ontbind(p);
      if (!o.f.length) return qtex(o.c);
      if (o.f.length === 1 && o.f[0].e === 1 && qis(qabs(o.c), EEN)) {
        return qteken(o.c) < 0 ? tex(neg(o.f[0].p)) : tex(o.f[0].p);
      }
      var s = qteken(o.c) < 0 ? "-" : "";
      var a = qabs(o.c);
      if (!qis(a, EEN)) s += qtex(a);
      o.f.forEach(function (f) {
        var enkel = isTerm(f.p);
        var b = enkel ? tex(f.p) : "(" + tex(f.p) + ")";
        if (f.e > 1) b = (enkel && tex(f.p).length > 1 ? "(" + tex(f.p) + ")" : b) + "^{" + f.e + "}";
        s += b;
      });
      return s;
    }

    return {
      namen: namen, k: k, cst: cst, getal: getal, veranderlijke: veranderlijke,
      isNul: isNul, isCst: isCst, waarde: waarde, plus: plus, min: min, neg: neg,
      maal: maal, schaal: schaal, macht: macht, gelijk: gelijk, graad: graad,
      totaleGraad: totaleGraad, veranderlijken: veranderlijken, coef: coef,
      leidend: leidend, vervang: vervang, vulIn: vulIn, deel: deel, deelbaar: deelbaar,
      inhoudQ: inhoudQ, primitief: primitief, ggd: ggd, ontbind: ontbind,
      nulpunt: nulpunt, nooitNul: nooitNul, rationaleNulpunten: rationaleNulpunten,
      tex: tex, factorTex: factorTex, ontbondenTex: ontbondenTex, isTerm: isTerm
    };
  }

  /* --- Lezen ------------------------------------------------------------ */

  // Elke regel (of elk stuk tussen puntkomma's) is een vergelijking. De
  // tekens krijgen hun plaats in de volledige tekst mee, voor de foutmelding.
  function splitsRegels(tekst) {
    var regels = [], begin = 0;
    for (var i = 0; i <= tekst.length; i++) {
      var c = tekst[i];
      if (i === tekst.length || c === "\n" || c === ";") {
        var stuk = tekst.slice(begin, i);
        if (stuk.trim()) regels.push({ tekst: stuk, begin: begin });
        begin = i + 1;
      }
    }
    return regels;
  }

  var LETTER = /[A-Za-zÀ-ɏͰ-Ͽ]/;
  function lexeer(regel) {
    var s = regel.tekst, uit = [], i = 0;
    while (i < s.length) {
      var c = s[i], plaats = regel.begin + i;
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var j = i;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        if (s[j] === ".") { j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        if (s[j] === ",") {
          throw Invoerfout("Schrijf decimalen met een punt, niet met een komma.", regel.begin + j);
        }
        var cijfers = s.slice(i, j);
        if (cijfers === ".") throw Invoerfout("Hier staat een punt zonder getal.", plaats);
        uit.push({ soort: "getal", waarde: qUitTekst(cijfers), plaats: plaats });
        i = j;
        continue;
      }
      if (LETTER.test(c)) {
        // Een letter met een index: x_1, x1 of x_{12}.
        var naam = c, j2 = i + 1;
        var m = /^_?\{?([0-9]+)\}?/.exec(s.slice(j2));
        if (m && (m[0][0] === "_" || /[0-9]/.test(m[0][0]))) {
          naam = c + "_" + m[1];
          j2 += m[0].length;
        }
        uit.push({ soort: "letter", naam: naam, plaats: plaats });
        i = j2;
        continue;
      }
      var teken = { "−": "-", "–": "-", "·": "*", "×": "*", "⋅": "*", ":": "/" }[c] || c;
      if ("+-*/^()=".indexOf(teken) < 0) {
        throw Invoerfout("Het teken " + c + " ken ik hier niet.", plaats);
      }
      uit.push({ soort: teken, plaats: plaats });
      i++;
    }
    uit.push({ soort: "einde", plaats: regel.begin + s.length });
    return uit;
  }

  // Welke letters zijn onbekenden, welke parameters?
  function kiesOnbekenden(letters) {
    var standaard = letters.filter(function (l) {
      return ONBEKENDEN.indexOf(l) >= 0 || /^x_\d+$/.test(l);
    });
    var geindexeerd = standaard.filter(function (l) { return /^x_/.test(l); });
    if (geindexeerd.length && standaard.indexOf("x") >= 0) {
      return { fout: "Gebruik x samen met x_1, x_2, ... niet door elkaar." };
    }
    var onbekenden, parameters;
    if (standaard.length) {
      onbekenden = standaard;
      parameters = letters.filter(function (l) { return standaard.indexOf(l) < 0; });
    } else {
      onbekenden = letters.slice();
      parameters = [];
    }
    onbekenden.sort(function (a, b) {
      var ia = ONBEKENDEN.indexOf(a), ib = ONBEKENDEN.indexOf(b);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      var na = /_(\d+)$/.exec(a), nb = /_(\d+)$/.exec(b);
      if (na && nb) return Number(na[1]) - Number(nb[1]);
      return a < b ? -1 : a > b ? 1 : 0;
    });
    parameters.sort();
    return { onbekenden: onbekenden, parameters: parameters };
  }

  // Een uitdrukking is een lineaire vorm: per onbekende een coëfficiënt en
  // een constante term, allemaal veeltermen in de parameters.
  function Lezer(R, onbekenden, parameters) {
    var n = onbekenden.length;

    function vorm(cst) {
      var c = [];
      for (var j = 0; j < n; j++) c.push(R.cst(NUL));
      return { c: c, k: cst || R.cst(NUL) };
    }
    function heeftOnbekende(v) { return v.c.some(function (x) { return !R.isNul(x); }); }
    function som(a, b, teken) {
      var v = vorm();
      for (var j = 0; j < n; j++) v.c[j] = teken < 0 ? R.min(a.c[j], b.c[j]) : R.plus(a.c[j], b.c[j]);
      v.k = teken < 0 ? R.min(a.k, b.k) : R.plus(a.k, b.k);
      return v;
    }
    function maalVeelterm(a, p) {
      var v = vorm();
      for (var j = 0; j < n; j++) v.c[j] = R.maal(a.c[j], p);
      v.k = R.maal(a.k, p);
      return v;
    }

    function leesVergelijking(tokens) {
      var pos = 0;
      function kijk() { return tokens[pos]; }
      function neem() { return tokens[pos++]; }
      function begintFactor(t) {
        return t.soort === "getal" || t.soort === "letter" || t.soort === "(";
      }
      function uitdrukking() {
        var v, t = kijk();
        if (t.soort === "+" || t.soort === "-") {
          neem();
          v = term();
          if (t.soort === "-") v = maalVeelterm(v, R.getal(-1));
        } else v = term();
        while (kijk().soort === "+" || kijk().soort === "-") {
          var op = neem().soort;
          v = som(v, term(), op === "-" ? -1 : 1);
        }
        return v;
      }
      function term() {
        var v = factor();
        for (;;) {
          var t = kijk();
          if (t.soort === "*" || t.soort === "/") {
            neem();
            var w = factor();
            v = t.soort === "*" ? product(v, w, t) : quotient(v, w, t);
          } else if (begintFactor(t)) {
            v = product(v, factor(), t);
          } else return v;
        }
      }
      function product(a, b, t) {
        if (heeftOnbekende(a) && heeftOnbekende(b)) {
          throw Invoerfout("Hier vermenigvuldig je twee onbekenden: dat is niet lineair.", t.plaats);
        }
        if (heeftOnbekende(b)) { var w = a; a = b; b = w; }
        return maalVeelterm(a, b.k);
      }
      function quotient(a, b, t) {
        if (heeftOnbekende(b)) {
          throw Invoerfout("Delen door een onbekende is niet lineair.", t.plaats);
        }
        if (R.isNul(b.k)) throw Invoerfout("Delen door nul kan niet.", t.plaats);
        if (!R.isCst(b.k)) {
          throw Invoerfout("Deel niet door een parameter: vermenigvuldig liever beide leden.", t.plaats);
        }
        return maalVeelterm(a, R.cst(qdeel(EEN, R.waarde(b.k))));
      }
      function factor() {
        var v = primair();
        if (kijk().soort === "^") {
          var t = neem();
          var haakje = kijk().soort === "(";
          if (haakje) neem();
          var e = neem();
          if (e.soort !== "getal" || e.waarde.n !== 1n || e.waarde.t > 20n) {
            throw Invoerfout("Een exponent is hier een natuurlijk getal.", e.plaats);
          }
          if (haakje) verwacht(")");
          var exp = Number(e.waarde.t);
          if (heeftOnbekende(v)) {
            if (exp === 1) return v;
            throw Invoerfout("Een macht van een onbekende is niet lineair.", t.plaats);
          }
          return vorm(R.macht(v.k, exp));
        }
        return v;
      }
      function primair() {
        var t = neem();
        if (t.soort === "getal") return vorm(R.cst(t.waarde));
        if (t.soort === "letter") {
          var j = onbekenden.indexOf(t.naam);
          if (j >= 0) {
            var v = vorm();
            v.c[j] = R.getal(1);
            return v;
          }
          return vorm(R.veranderlijke(parameters.indexOf(t.naam)));
        }
        if (t.soort === "(") {
          var w = uitdrukking();
          verwacht(")");
          return w;
        }
        if (t.soort === "einde") throw Invoerfout("De vergelijking houdt hier op.", t.plaats);
        if (t.soort === "=") throw Invoerfout("Voor of na het gelijkheidsteken ontbreekt iets.", t.plaats);
        throw Invoerfout("Hier verwacht ik een getal, een letter of een haakje.", t.plaats);
      }
      function verwacht(soort) {
        var t = neem();
        if (t.soort !== soort) {
          throw Invoerfout(soort === ")" ? "Hier ontbreekt een haakje )." : "Hier verwacht ik " + soort + ".", t.plaats);
        }
      }

      var gelijk = tokens.filter(function (t) { return t.soort === "="; });
      if (gelijk.length === 0) {
        throw Invoerfout("Deze vergelijking heeft geen gelijkheidsteken.", tokens[tokens.length - 1].plaats);
      }
      if (gelijk.length > 1) throw Invoerfout("Eén gelijkheidsteken per vergelijking.", gelijk[1].plaats);
      var links = uitdrukking();
      verwacht("=");
      var rechts = uitdrukking();
      var t = kijk();
      if (t.soort !== "einde") {
        throw Invoerfout(t.soort === ")" ? "Dit haakje sluit niets." : "Hier verwacht ik een bewerking.", t.plaats);
      }
      // Standaardvorm: de onbekenden links, de bekende term rechts.
      var v = som(links, rechts, -1);
      return v.c.concat([R.neg(v.k)]);
    }

    return { leesVergelijking: leesVergelijking };
  }

  function lees(tekst) {
    var regels = splitsRegels(tekst);
    if (!regels.length) return null;
    if (regels.length > MAX_VERGELIJKINGEN) {
      throw Invoerfout("Hoogstens " + MAX_VERGELIJKINGEN + " vergelijkingen.", regels[MAX_VERGELIJKINGEN].begin);
    }
    var tokens = regels.map(lexeer);
    var letters = [], eerste = {};
    tokens.forEach(function (lijst) {
      lijst.forEach(function (t) {
        if (t.soort !== "letter" || letters.indexOf(t.naam) >= 0) return;
        letters.push(t.naam);
        eerste[t.naam] = t.plaats;
      });
    });
    var keuze = kiesOnbekenden(letters);
    if (keuze.fout) throw Invoerfout(keuze.fout, eerste["x"]);
    if (!keuze.onbekenden.length) throw Invoerfout("Er staat geen onbekende in het stelsel.", 0);
    if (keuze.onbekenden.length > MAX_ONBEKENDEN) {
      throw Invoerfout("Hoogstens " + MAX_ONBEKENDEN + " onbekenden.", eerste[keuze.onbekenden[MAX_ONBEKENDEN]]);
    }
    if (keuze.parameters.length > MAX_PARAMETERS) {
      throw Invoerfout("Hoogstens " + MAX_PARAMETERS + " parameters (" +
                       ONBEKENDEN.slice(0, 3).join(", ") + ", ... zijn onbekenden).",
                       eerste[keuze.parameters[MAX_PARAMETERS]]);
    }
    var R = Ring(keuze.parameters);
    var lezer = Lezer(R, keuze.onbekenden, keuze.parameters);
    var rijen = tokens.map(function (lijst) { return lezer.leesVergelijking(lijst); });
    return { R: R, onbekenden: keuze.onbekenden, parameters: keuze.parameters, rijen: rijen };
  }

  /* --- Tonen ------------------------------------------------------------- */

  function naamTex(naam) {
    var m = /^(.)_(\d+)$/.exec(naam);
    return m ? m[1] + "_{" + m[2] + "}" : naam;
  }

  // a·x in een som: 2x, -y, mx, (m+1)y of \frac{1}{2}x.
  function termTex(R, c, naam, ontbonden) {
    if (ontbonden && !R.isTerm(c)) {
      var o = R.ontbind(c);
      if (o.f.length === 1 && o.f[0].e === 1 && qis(qabs(o.c), EEN)) {
        return { neg: qteken(o.c) < 0, tex: "(" + R.tex(o.f[0].p) + ")" + naam };
      }
      var t = R.ontbondenTex(c);
      var neg = t[0] === "-";
      return { neg: neg, tex: (neg ? t.slice(1) : t) + naam };
    }
    if (R.isTerm(c)) {
      var s = R.tex(c);
      if (s === "1") s = "";
      else if (s === "-1") s = "-";
      return { neg: s[0] === "-", tex: (s[0] === "-" ? s.slice(1) : s) + naam };
    }
    var l = R.leidend(c);
    if (qteken(l.c) < 0 && c.size <= 3) return { neg: true, tex: "(" + R.tex(R.neg(c)) + ")" + naam };
    return { neg: false, tex: "(" + R.tex(c) + ")" + naam };
  }
  function somTex(delen) {
    var s = "";
    delen.forEach(function (d, j) { s += (d.neg ? "-" : j ? "+" : "") + d.tex; });
    return s || "0";
  }

  // Het linkerlid van een vergelijking; een lid zonder onbekenden wordt 0z,
  // zoals in de cursus.
  function linkerlidTex(R, rij, namen, ontbonden) {
    var delen = [];
    for (var j = 0; j < namen.length; j++) {
      if (!R.isNul(rij[j])) delen.push(termTex(R, rij[j], naamTex(namen[j]), ontbonden));
    }
    return delen.length ? somTex(delen) : "0" + naamTex(namen[namen.length - 1]);
  }

  function stelselTex(R, rijen, namen) {
    return "\\begin{cases}" + rijen.map(function (rij) {
      return linkerlidTex(R, rij, namen) + "=" + R.tex(rij[namen.length]);
    }).join("\\\\ ") + "\\end{cases}";
  }

  // De uitgebreide matrix zoals in de cursus: rechts uitgelijnd met enkel
  // getallen, gecentreerd zodra er een parameter in staat. spil is de cel
  // [rij, kolom] in een kadertje, controle de controlekolom.
  function matrixTex(R, M, opties) {
    opties = opties || {};
    var n = M[0].length - 1;
    var uitlijning = R.k ? "c" : "r";
    var kolommen = "";
    for (var j = 0; j < n; j++) kolommen += uitlijning;
    kolommen += "|" + uitlijning;
    var spil = opties.spil;
    var s = "\\left(\\begin{array}{" + kolommen + "}" + M.map(function (rij, i) {
      return rij.map(function (x, j) {
        var t = R.tex(x);
        return spil && spil[0] === i && spil[1] === j ? "\\boxed{" + t + "}" : t;
      }).join("&");
    }).join("\\\\ ") + "\\end{array}\\right)";
    if (opties.controle) {
      s += "\\;\\class{sr-controle}{\\begin{array}{r}" + M.map(function (rij, i) {
        var som = rij.reduce(function (a, x) { return R.plus(a, x); }, R.cst(NUL));
        return R.tex(som) + (opties.hoog === i ? "\\vphantom{\\boxed{0}}" : "");
      }).join("\\\\ ") + "\\end{array}}";
    }
    return s;
  }

  // De rij-operaties tussen twee matrices, elk naast haar rij.
  function operatiesTex(ops, m, hoog) {
    var regels = [];
    for (var i = 0; i < m; i++) {
      var t = ops[i] ? "\\scriptstyle " + ops[i] : "";
      if (hoog === i) t += "\\vphantom{\\boxed{0}}";
      regels.push(t);
    }
    return "\\,\\begin{array}{r}" + regels.join("\\\\ ") + "\\end{array}\\,";
  }

  function rij(i) { return "R_{" + (i + 1) + "}"; }

  // k R_i + l R_j, met k en l veeltermen: 2R_2-3R_1, R_3-mR_1,
  // R_3-(1-3m)R_2 of (m+1)R_1+2mR_3.
  function combinatieTex(R, i, k, h, l) {
    var eerste = R.factorTex(k) + rij(i);
    var tweede;
    if (R.isTerm(l)) {
      var s = R.tex(l);
      var neg = s[0] === "-";
      if (neg) s = s.slice(1);
      if (s === "1") s = "";
      tweede = (neg ? "-" : "+") + s + rij(h);
    } else {
      var negL = qteken(R.leidend(l).c) < 0;
      tweede = (negL ? "-(" + R.tex(R.neg(l)) : "+(" + R.tex(l)) + ")" + rij(h);
    }
    return rij(i) + "\\to " + eerste + tweede;
  }

  // Een rij delen door d: R_3/5, R_3/(-64), R_3/(m-1); een breuk als deler
  // wordt vermenigvuldigen: R_1\to 2R_1.
  function deelTex(R, i, d) {
    if (R.isCst(d)) {
      var c = R.waarde(d);
      if (qis(c, Q(-1))) return rij(i) + "\\to -" + rij(i);
      if (c.t === 1n || c.t === -1n) {
        return rij(i) + "\\to " + qtex(qdeel(EEN, c)) + rij(i);
      }
      if (c.n === 1n) return rij(i) + "/" + (c.t < 0n ? "(" + qtex(c) + ")" : qtex(c));
      return rij(i) + "\\to " + qtex(qdeel(EEN, c)) + rij(i);
    }
    var t = R.ontbondenTex(d);
    return rij(i) + "/" + (R.isTerm(d) && t[0] !== "-" ? t : "(" + t + ")");
  }

  /* --- Gauss-Jordan ----------------------------------------------------- */

  function kopieer(M) { return M.map(function (r) { return r.slice(); }); }

  function Herleiding(R, n, m) {
    var gevallenTeller = 0;

    // Is p in dit geval zeker niet nul? Een getal dat niet nul is, of een
    // veelterm waarvan elke factor bij de voorwaarden van het geval hoort of
    // nooit nul kan zijn.
    function nietNul(p, st) {
      if (R.isNul(p)) return false;
      if (R.isCst(p)) return true;
      return R.ontbind(p).f.every(function (f) {
        return R.nooitNul(f.p) || st.nz.some(function (g) { return R.gelijk(g, f.p); });
      });
    }

    // Het deel van d dat we mogen gebruiken om door te delen: het getal en
    // de factoren die in dit geval niet nul zijn.
    function veiligDeel(d, st) {
      var o = R.ontbind(d);
      var p = R.cst(o.c);
      o.f.forEach(function (f) {
        if (nietNul(f.p, st)) p = R.maal(p, R.macht(f.p, f.e));
      });
      return p;
    }

    // Een rij door haar inhoud delen: geen breuken, geen gemeenschappelijke
    // factor en het eerste element positief.
    function vereenvoudig(st, stappen, kop) {
      var ops = {}, M = st.M;
      for (var i = 0; i < m; i++) {
        var r = M[i];
        var g = R.cst(NUL);
        r.forEach(function (x) { g = R.ggd(g, x); });
        if (R.isNul(g)) continue;
        var d = veiligDeel(g, st);
        var rd = r.map(function (x) { return R.deel(x, d); });
        d = R.schaal(d, rijinhoud(rd));
        // Delen we toch, dan meteen zo dat het eerste element positief wordt:
        // R_3/(-64) in plaats van R_3/64 en later R_3\to -R_3.
        if (R.isCst(d) && qis(R.waarde(d), EEN)) continue;
        var eerste = rd.filter(function (x) { return !R.isNul(x); })[0];
        if (qteken(R.leidend(eerste).c) < 0) d = R.neg(d);
        M[i] = r.map(function (x) { return R.deel(x, d); });
        ops[i] = deelTex(R, i, d);
      }
      if (Object.keys(ops).length) stappen.push({ ops: ops, M: kopieer(M), kop: kop });
    }
    function rijinhoud(r) {
      var g = 0n, l = 1n, eerste = null;
      r.forEach(function (x) {
        x.forEach(function (t) {
          g = bggd(g, t.c.t);
          l = l / bggd(l, t.c.n) * t.c.n;
        });
        if (!eerste && !R.isNul(x)) eerste = x;
      });
      if (g === 0n) return EEN;
      return Q(g, l);
    }

    // De spil kiezen in kolom st.c, vanaf rij st.h. Een getal krijgt de
    // voorkeur: eerst in de huidige rij, anders het kleinste eronder. Hangt
    // elke kandidaat van de parameters af, dan kiezen we de eenvoudigste,
    // ook als ze in dit geval nul kan zijn: dan volgen de gevallen.
    function kiesSpil(st) {
      var h = st.h, c = st.c, M = st.M;
      var zeker = [], mogelijk = [];
      for (var i = h; i < m; i++) {
        var x = M[i][c];
        if (R.isNul(x)) continue;
        (nietNul(x, st) ? zeker : mogelijk).push(i);
      }
      function beste(lijst) {
        var getallen = lijst.filter(function (i) { return R.isCst(M[i][c]); });
        if (getallen.indexOf(h) >= 0) return h;
        if (getallen.length) {
          return getallen.reduce(function (a, i) {
            return qvergelijk(qabs(R.waarde(M[i][c])), qabs(R.waarde(M[a][c]))) < 0 ? i : a;
          });
        }
        if (lijst.indexOf(h) >= 0) return h;
        return lijst.reduce(function (a, i) {
          return R.totaleGraad(M[i][c]) < R.totaleGraad(M[a][c]) ? i : a;
        });
      }
      if (zeker.length) return { rij: beste(zeker), zeker: true };
      if (mogelijk.length) return { rij: beste(mogelijk), zeker: false };
      return null;
    }

    // Eén ronde van de methode: eventueel wisselen, dan met de spil alle
    // andere elementen van haar kolom nul maken, en de rijen vereenvoudigen.
    function ronde(st, stappen, rijSpil) {
      var h = st.h, c = st.c, M = st.M;
      var kop = "Nullen maken in $K_{" + (c + 1) + "}$";
      var vorige = stappen[stappen.length - 1];
      if (rijSpil !== h) {
        var w = M[h]; M[h] = M[rijSpil]; M[rijSpil] = w;
        var o = {};
        o[h] = rij(h) + "\\leftrightarrow " + rij(rijSpil);
        vorige = { ops: o, M: kopieer(M), kop: kop };
        stappen.push(vorige);
        kop = null;
      }
      var p = M[h][c], ops = {};
      for (var i = 0; i < m; i++) {
        if (i === h || R.isNul(M[i][c])) continue;
        var e = M[i][c];
        var g = R.ggd(p, e);
        var kk = R.deel(p, g), l = R.neg(R.deel(e, g));
        if (qteken(R.leidend(kk).c) < 0) { kk = R.neg(kk); l = R.neg(l); }
        var ri = M[i], rh = M[h];
        M[i] = ri.map(function (x, j) { return R.plus(R.maal(kk, x), R.maal(l, rh[j])); });
        ops[i] = combinatieTex(R, i, kk, h, l);
      }
      if (Object.keys(ops).length) {
        vorige.spil = [h, c];
        stappen.push({ ops: ops, M: kopieer(M), kop: kop });
        kop = null;
      }
      st.spillen.push([h, c]);
      st.h++;
      st.c++;
      vereenvoudig(st, stappen, kop);
    }

    function kloon(st) {
      return { M: kopieer(st.M), h: st.h, c: st.c, spillen: st.spillen.slice(),
               nz: st.nz.slice(), voorwaarden: st.voorwaarden.slice() };
    }

    // Een parameter vervangen in alles wat het geval weet. Wordt een factor
    // die niet nul mocht zijn toch nul, dan kan het geval niet voorkomen.
    function vervang(st, i, uitdr) {
      st.M = st.M.map(function (r) { return r.map(function (x) { return R.vervang(x, i, uitdr); }); });
      var nz = [];
      for (var j = 0; j < st.nz.length; j++) {
        var f = R.vervang(st.nz[j], i, uitdr);
        if (R.isNul(f)) return false;
        R.ontbind(f).f.forEach(function (g) { nz.push(g.p); });
      }
      st.nz = nz;
      // Een voorwaarde die door de ingevulde waarde vanzelf geldt, valt weg:
      // bij m = -1/3 hoeft m != 0 er niet meer bij.
      st.voorwaarden = st.voorwaarden.filter(function (v) {
        return v.soort !== "niet" || !R.isCst(R.vervang(v.f, i, uitdr));
      });
      return true;
    }

    // De herleiding van één geval, tot ze klaar is of tot de volgende spil
    // van de parameters afhangt. Dan volgen de gevallen.
    function verwerk(st, stappen) {
      var knoop = { stappen: stappen, voorwaarden: st.voorwaarden, gevallen: null, besluit: null };
      while (st.c <= n && st.h < m) {
        var keuze = kiesSpil(st);
        if (!keuze) { st.c++; continue; }
        if (keuze.zeker) { ronde(st, stappen, keuze.rij); continue; }
        knoop.gevallen = splits(st, st.M[keuze.rij][st.c]);
        knoop.M = kopieer(st.M);
        return knoop;
      }
      spillenEen(st, stappen);
      knoop.M = kopieer(st.M);
      knoop.spillen = st.spillen;
      knoop.nz = st.nz;
      return knoop;
    }

    function splits(st, p) {
      var factoren = R.ontbind(p).f.map(function (f) { return f.p; }).filter(function (f) {
        return !nietNul(f, st);
      });
      var nulpunten = factoren.map(function (f) {
        var z = R.nulpunt(f);
        if (!z) {
          throw Rekenfout("Om verder te gaan moet de rekenmachine weten wanneer " +
                          "$" + R.tex(f) + "=0$, en die waarden zijn niet rationaal.");
        }
        return z;
      });
      var gevallen = [];
      var algemeen = kloon(st);
      factoren.forEach(function (f) {
        algemeen.nz.push(f);
        algemeen.voorwaarden.push({ soort: "niet", f: f });
      });
      gevallen.push(algemeen);
      factoren.forEach(function (f, j) {
        var g = kloon(st);
        // Dat de vorige factoren niet nul zijn, hoort bij dit geval, maar
        // volgt meestal al uit de ingevulde waarde (m = 1 dus m != -1).
        for (var a = 0; a < j; a++) {
          g.nz.push(factoren[a]);
          if (!R.isCst(R.vervang(factoren[a], nulpunten[j].i, nulpunten[j].uitdr))) {
            g.voorwaarden.push({ soort: "niet", f: factoren[a] });
          }
        }
        g.voorwaarden.push({ soort: "is", i: nulpunten[j].i, uitdr: nulpunten[j].uitdr });
        if (vervang(g, nulpunten[j].i, nulpunten[j].uitdr)) {
          g.ingevuld = true;
          gevallen.push(g);
        }
      });
      gevallenTeller += gevallen.length - 1;
      if (gevallenTeller > MAX_GEVALLEN) {
        throw Rekenfout("Dit stelsel vraagt meer dan " + MAX_GEVALLEN + " gevallen.");
      }
      return gevallen.map(function (g) {
        var stappen = [];
        if (g.ingevuld) {
          stappen.push({ ops: {}, M: kopieer(g.M), ingevuld: true });
          vereenvoudig(g, stappen, null);
        } else {
          // Nu de spil niet nul is, mag er ook door haar factoren gedeeld
          // worden: R_3/(m-1).
          stappen.push({ ops: {}, M: kopieer(g.M), verborgen: true });
          vereenvoudig(g, stappen, null);
        }
        return verwerk(g, stappen);
      });
    }

    // Tot slot elke spil 1: enkel een getal als spil, want delen door een
    // veelterm zou breuken in de matrix zetten. Die spillen delen we pas bij
    // het aflezen.
    function spillenEen(st, stappen) {
      var ops = {}, M = st.M;
      st.spillen.forEach(function (s) {
        var p = M[s[0]][s[1]];
        if (!R.isCst(p) || qis(R.waarde(p), EEN)) return;
        M[s[0]] = M[s[0]].map(function (x) { return R.deel(x, p); });
        ops[s[0]] = deelTex(R, s[0], p);
      });
      if (Object.keys(ops).length) stappen.push({ ops: ops, M: kopieer(M), kop: "Spillen $1$ maken" });
    }

    function start(M) {
      var st = { M: kopieer(M), h: 0, c: 0, spillen: [], nz: [], voorwaarden: [] };
      var stappen = [{ ops: {}, M: kopieer(M), begin: true }];
      vereenvoudig(st, stappen, null);
      return verwerk(st, stappen);
    }

    return { start: start };
  }

  /* --- Besluit ------------------------------------------------------------ */

  // Een coördinaat van de oplossing: een som van termen (teller/noemer)·t,
  // met t = 1 voor de constante term. Elke breuk wordt vereenvoudigd.
  function breukTex(R, teller, noemer) {
    var g = R.ggd(teller, noemer);
    teller = R.deel(teller, g);
    noemer = R.deel(noemer, g);
    // Het getal van de noemer naar de teller, zodat de noemer primitief is.
    var c = R.inhoudQ(noemer);
    if (R.isCst(noemer)) { teller = R.schaal(teller, qdeel(EEN, R.waarde(noemer))); noemer = R.cst(EEN); }
    else { noemer = R.schaal(noemer, qdeel(EEN, c)); teller = R.schaal(teller, qdeel(EEN, c)); }
    return { teller: teller, noemer: noemer };
  }

  function coordinaatTex(R, delen) {
    // delen: [{teller, noemer, naam}] met naam "" voor de constante term.
    var stukken = [];
    delen.forEach(function (d) {
      if (R.isNul(d.teller)) return;
      var b = breukTex(R, d.teller, d.noemer);
      stukken.push(stukTex(R, b.teller, b.noemer, d.naam));
    });
    if (!stukken.length) return "0";
    return somTex(stukken);
  }

  function stukTex(R, teller, noemer, naam) {
    if (R.isCst(noemer)) {
      teller = R.schaal(teller, qdeel(EEN, R.waarde(noemer)));
      if (R.isTerm(teller)) {
        if (!naam) {
          var s = R.tex(teller);
          return { neg: s[0] === "-", tex: s[0] === "-" ? s.slice(1) : s };
        }
        // Een enkele term met een breuk als coëfficiënt: \frac{3t}{10}.
        var l = R.leidend(teller), c = qabs(l.c);
        var rest = R.tex(R.schaal(teller, qdeel(EEN, l.c)));
        var boven = (c.t === 1n ? "" : String(c.t)) + (rest === "1" ? "" : rest) + naam;
        var t = c.n === 1n ? boven : "\\frac{" + boven + "}{" + c.n + "}";
        return { neg: qteken(l.c) < 0, tex: t };
      }
      // Een som met een gemeenschappelijke noemer: \frac{a+1}{2}.
      var inh = R.inhoudQ(teller);
      if (inh.n !== 1n) {
        var boven2 = R.schaal(R.schaal(teller, qdeel(EEN, inh)), Q(inh.t < 0n ? -inh.t : inh.t));
        var bt = R.ontbondenTex(boven2);
        return { neg: inh.t < 0n, tex: "\\frac{" + bt + "}{" + inh.n + "}" + naam };
      }
      if (!naam) return { neg: false, tex: R.tex(teller) };
      return termTex(R, teller, naam);
    }
    // Gehele getallen boven en onder de breukstreep, het teken ervoor:
    // -\frac{b}{2(a+1)}.
    var ct = R.inhoudQ(teller), cn = R.inhoudQ(noemer);
    var c = qdeel(ct, cn);
    var boven = R.schaal(R.schaal(teller, qdeel(EEN, ct)), Q(c.t < 0n ? -c.t : c.t));
    var onder = R.schaal(R.schaal(noemer, qdeel(EEN, cn)), Q(c.n));
    return { neg: c.t < 0n,
             tex: "\\frac{" + R.ontbondenTex(boven) + "}{" + R.ontbondenTex(onder) + "}" + naam };
  }

  function besluit(R, knoop, namen, bezet) {
    var M = knoop.M, n = namen.length, m = M.length;
    var spillen = knoop.spillen;
    var spilKolommen = spillen.map(function (s) { return s[1]; });
    var rA = spilKolommen.filter(function (c) { return c < n; }).length;
    var rAb = spillen.length;
    var strijdig = rAb > rA;

    // Het stelsel dat we uit de rij-canonieke matrix aflezen.
    var vergelijkingen = M.map(function (r, i) {
      var t = linkerlidTex(R, r, namen, true) + "=" + R.ontbondenTex(r[n]);
      if (strijdig && spillen.some(function (s) { return s[0] === i && s[1] === n; })) t += "\\quad\\lightning";
      return t;
    });
    var afgelezen = "\\Rightarrow\\begin{cases}" + vergelijkingen.join("\\\\ ") + "\\end{cases}";

    var vrij = [];
    for (var j = 0; j < n; j++) if (spilKolommen.indexOf(j) < 0) vrij.push(j);
    var vrijeNamen = [];
    VRIJE_NAMEN.concat("abcdefghijklmnopqrstuvwxyz".split("")).forEach(function (l) {
      if (vrijeNamen.length < vrij.length && bezet.indexOf(l) < 0 && vrijeNamen.indexOf(l) < 0) vrijeNamen.push(l);
    });

    var uit = { rA: rA, rAb: rAb, n: n, strijdig: strijdig, vrij: vrij.length };
    if (strijdig) {
      uit.oplossing = afgelezen;
      uit.V = "V=\\emptyset";
    } else {
      var coord = [];
      spillen.forEach(function (s) {
        var r = M[s[0]], p = r[s[1]];
        var delen = [{ teller: r[n], noemer: p, naam: "" }];
        vrij.forEach(function (f, a) {
          delen.push({ teller: R.neg(r[f]), noemer: p, naam: vrijeNamen[a] });
        });
        coord[s[1]] = coordinaatTex(R, delen);
      });
      vrij.forEach(function (f, a) { coord[f] = vrijeNamen[a]; });
      var opgelost = namen.map(function (x, j) {
        var t = naamTex(x) + "=" + coord[j];
        var a = vrij.indexOf(j);
        if (a >= 0) t += "\\in\\R";
        return t;
      });
      // Breuken op volle grootte, zoals in de cursus: x=\dfrac{m-1}{m+1}.
      var breuken = coord.some(function (c) { return c.indexOf("\\frac") >= 0; });
      var opgelostTex = "\\begin{cases}" + opgelost.join(breuken ? "\\\\[6pt] " : "\\\\ ")
        .replace(/\\frac/g, "\\dfrac") + "\\end{cases}";
      var eenheid = spillen.every(function (sp) {
        var p = M[sp[0]][sp[1]];
        return R.isCst(p) && qis(R.waarde(p), EEN);
      });
      if (!vrij.length && eenheid) uit.oplossing = "\\Rightarrow" + opgelostTex;
      else uit.oplossing = afgelezen + "\\iff" + opgelostTex;
      var tupel = "(" + coord.join(";") + ")";
      var groot = coord.some(function (c) { return c.indexOf("\\frac") >= 0; });
      if (!vrij.length) {
        uit.V = groot ? "V=\\Bigl\\{" + tupel.replace(/^\(/, "\\Bigl(").replace(/\)$/, "\\Bigr)") + "\\Bigr\\}"
                      : "V=\\{" + tupel + "\\}";
      } else {
        var mid = "\\mid " + vrijeNamen.join(",") + "\\in\\R";
        uit.V = groot ? "V=\\Bigl\\{" + tupel.replace(/^\(/, "\\Bigl(").replace(/\)$/, "\\Bigr)") + mid + "\\Bigr\\}"
                      : "V=\\{" + tupel + mid + "\\}";
      }
    }

    // De rangen zoals in de opmerkingen bij de voorbeelden.
    if (strijdig) {
      uit.rangen = "r(A_b)=" + rAb + ">r(A)=" + rA;
      uit.uitleg = "Dit is een strijdig stelsel: er is geen oplossing.";
    } else if (rA === n) {
      uit.rangen = "r(A_b)=r(A)=" + rA + "=n";
      uit.uitleg = "Het stelsel heeft juist één oplossing.";
    } else {
      uit.rangen = "r(A_b)=r(A)=" + rA + "<n=" + n;
      var vrijAantal = n - rA;
      uit.uitleg = "Het stelsel heeft oneindig veel oplossingen: we kiezen " + vrijAantal +
                   (vrijAantal === 1 ? " onbekende" : " onbekenden") + " vrij.";
    }
    return uit;
  }

  /* --- Voorwaarden van een geval ----------------------------------------- */

  function voorwaardeTex(R, v) {
    if (v.soort === "is") return R.namen[v.i] + "=" + R.tex(v.uitdr);
    var z = R.nulpunt(v.f);
    if (z) return R.namen[z.i] + "\\neq " + R.tex(z.uitdr);
    return R.tex(v.f) + "\\neq 0";
  }
  function voorwaardenTex(R, lijst) {
    return lijst.map(function (v) { return voorwaardeTex(R, v); }).join("\\text{ en }");
  }

  // Bij één parameter voegt het overzicht gevallen met dezelfde oplossing
  // samen. Een spil die een waarde uitsluit waar het stelsel toch hetzelfde
  // doet, geeft zo geen overbodige regel: m != -6 in plaats van m != 1 en
  // m != -6 naast m = 1.
  function voegSamen(R, lijst) {
    if (R.k !== 1) return lijst;
    var algemeen = null, bijzonder = [];
    for (var a = 0; a < lijst.length; a++) {
      var niet = [], is = null;
      for (var b = 0; b < lijst[a].lijst.length; b++) {
        var v = lijst[a].lijst[b];
        if (v.soort === "is") { is = R.waarde(v.uitdr); continue; }
        var z = R.nulpunt(v.f);
        if (!z) return lijst;
        niet.push(R.waarde(z.uitdr));
      }
      var geval = { niet: niet, is: is, V: lijst[a].V };
      if (is === null) {
        if (algemeen) return lijst;
        algemeen = geval;
      } else bijzonder.push(geval);
    }
    var naam = R.namen[0];
    var uit = [];
    var rest = bijzonder.filter(function (g) {
      if (!algemeen || g.V !== algemeen.V) return true;
      algemeen.niet = algemeen.niet.filter(function (w) { return !qis(w, g.is); });
      return false;
    });
    if (algemeen) {
      algemeen.niet.sort(qvergelijk);
      uit.push({
        voorwaarden: algemeen.niet.length ? algemeen.niet.map(function (w) {
          return naam + "\\neq " + qtex(w);
        }).join("\\text{ en }") : naam + "\\in\\R",
        V: algemeen.V
      });
    }
    var groepen = [];
    rest.forEach(function (g) {
      var groep = groepen.filter(function (x) { return x.V === g.V; })[0];
      if (groep) groep.waarden.push(g.is);
      else groepen.push({ V: g.V, waarden: [g.is] });
    });
    groepen.forEach(function (x) {
      x.waarden.sort(qvergelijk);
      uit.push({
        voorwaarden: x.waarden.map(function (w) { return naam + "=" + qtex(w); }).join("\\text{ of }"),
        V: x.V
      });
    });
    return uit;
  }

  /* --- Oplossen ---------------------------------------------------------- */

  // De ingang. Geeft null voor een lege invoer, anders
  //   { stelsel, Ab, n, parameters, homogeen, det, gevallen: bool,
  //     knoop, overzicht }
  // met in elke knoop de stappen als LaTeX en eventueel de gevallen.
  function los(tekst, opties) {
    opties = opties || {};
    var gelezen = lees(tekst);
    if (!gelezen) return null;
    var R = gelezen.R, namen = gelezen.onbekenden, rijen = gelezen.rijen;
    var n = namen.length, m = rijen.length;
    var bezet = namen.concat(gelezen.parameters);

    var uit = {
      onbekenden: namen.slice(),
      parameters: gelezen.parameters.slice(),
      n: n,
      stelsel: stelselTex(R, rijen, namen),
      Ab: "A_b=" + matrixTex(R, rijen),
      homogeen: rijen.every(function (r) { return R.isNul(r[n]); }),
      info: []
    };

    if (uit.homogeen) {
      var nul = namen.map(function () { return "0"; }).join(";");
      uit.info.push("Het stelsel is homogeen: de nuloplossing $(" + nul + ")$ is altijd een oplossing.");
    }
    if (m === n) {
      var det = determinant(R, rijen.map(function (r) { return r.slice(0, n); }));
      var d = "\\det A=" + R.ontbondenTex(det);
      if (gelezen.parameters.length && !R.isCst(det)) {
        var nulpunten = [], alles = true;
        R.ontbind(det).f.forEach(function (f) {
          if (R.nooitNul(f.p)) return;
          var z = R.nulpunt(f.p);
          if (z) nulpunten.push(R.namen[z.i] + "=" + R.tex(z.uitdr));
          else alles = false;
        });
        if (alles && nulpunten.length) d += "\\qquad\\det A=0\\iff " + nulpunten.join("\\ \\vee\\ ");
      }
      uit.det = d;
    }

    var knoop = Herleiding(R, n, m).start(rijen);
    var overzicht = [];
    // De matrix waar de gevallen beginnen, krijgt een merkteken: (*), bij
    // gevallen binnen een geval (**), enzovoort. Een geval dat meteen weer
    // splitst, verwijst naar hetzelfde merkteken.
    function maak(k, eerste, merk) {
      var lijnen = [];
      var laatste = k.stappen.length - 1;
      var eigenMerk = merk;
      k.stappen.forEach(function (s, j) {
        if (s.verborgen) return;
        var vorige = k.stappen[j - 1];
        var hoog = s.spil ? s.spil[0] : vorige && vorige.spil ? vorige.spil[0] : undefined;
        var mat = matrixTex(R, s.M, { spil: s.spil, controle: opties.controle,
                                      hoog: s.spil ? s.spil[0] : undefined });
        var tex, kop = s.kop || null;
        if (s.begin) tex = "A_b=" + mat;
        else if (s.ingevuld) {
          tex = "A_b\\sim " + mat;
          var is = k.voorwaarden[k.voorwaarden.length - 1];
          kop = "Vul $" + voorwaardeTex(R, is) + "$ in $" + merk + "$ in";
        } else {
          // Zoals in een align*: elke volgende regel begint onder A_b.
          tex = (lijnen.length ? "\\phantom{A_b}" : "A_b") + "\\sim" + operatiesTex(s.ops, s.M.length, hoog) + mat;
        }
        if (j === laatste && k.gevallen) {
          eigenMerk = "(" + (merk ? merk.slice(1, -1) : "") + "*)";
          tex += "\\quad" + eigenMerk;
        }
        lijnen.push({ kop: kop, tex: tex });
      });
      var uitk = { lijnen: lijnen };
      if (!eerste) uitk.voorwaarden = voorwaardenTex(R, k.voorwaarden);
      if (k.gevallen) {
        uitk.gevallen = k.gevallen.map(function (g) { return maak(g, false, eigenMerk); });
      } else {
        uitk.besluit = besluit(R, k, namen, bezet);
        if (k.voorwaarden.length) {
          overzicht.push({ voorwaarden: voorwaardenTex(R, k.voorwaarden), V: uitk.besluit.V,
                           lijst: k.voorwaarden });
        }
      }
      return uitk;
    }
    uit.knoop = maak(knoop, true, "");
    uit.overzicht = voegSamen(R, overzicht).map(function (o) {
      return { voorwaarden: o.voorwaarden, V: o.V };
    });
    return uit;
  }

  // Ontwikkeling naar de eerste rij, zoals in het hoofdstuk over determinanten.
  function determinant(R, A) {
    var n = A.length;
    if (n === 1) return A[0][0];
    var s = R.cst(NUL);
    for (var j = 0; j < n; j++) {
      if (R.isNul(A[0][j])) continue;
      var minor = A.slice(1).map(function (r) { return r.filter(function (x, q) { return q !== j; }); });
      var t = R.maal(A[0][j], determinant(R, minor));
      s = j % 2 ? R.min(s, t) : R.plus(s, t);
    }
    return s;
  }

  var StelselCAS = {
    los: los, lees: lees, Ring: Ring, Q: Q,
    Rekenfout: Rekenfout, Invoerfout: Invoerfout
  };

  if (typeof module !== "undefined" && module.exports) module.exports = StelselCAS;
  else wereld.StelselCAS = StelselCAS;
})(typeof window !== "undefined" ? window : this);
