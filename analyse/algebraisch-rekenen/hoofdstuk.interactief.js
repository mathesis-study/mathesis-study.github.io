/* Interactieve figuren bij A01_AlgebraischRekenen.tex.
 *
 * Het schema van Horner en de staartdeling zijn recepten: op het bord groeien
 * ze stap voor stap, op papier staat enkel de eindstand. Hier bouwt de
 * leerling ze zelf op met Volgende stap, in dezelfde vorm als in de cursus,
 * en ziet hij bij elke stap welke getallen of termen meedoen. Elke figuur
 * neemt ook een eigen veelterm aan, zodat ze dient om een oefening na te
 * kijken.
 *
 * Er is geen assenstelsel: het bord van JSXGraph blijft leeg onder een
 * HTML-laag, zoals de matrices in L03. Het schema van Horner is een raster
 * van knoppen; de staartdeling is één MathJax-array met \cline, waarin wat
 * nog niet aan de beurt is onzichtbaar zijn plaats al inneemt, zodat er bij
 * een stap niets verspringt. In beide gaat een klik op een plaats die nog
 * leeg is, vooruit tot de stap die ze invult.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  /* --- Exacte breuken ---------------------------------------------------- */

  function ggd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  function br(t, n) {
    if (n === undefined) n = 1;
    if (n < 0) { t = -t; n = -n; }
    var g = ggd(t, n);
    return { t: t / g, n: n / g };
  }
  var NUL = br(0);
  function plus(a, b) { return br(a.t * b.n + b.t * a.n, a.n * b.n); }
  function min(a, b) { return br(a.t * b.n - b.t * a.n, a.n * b.n); }
  function maal(a, b) { return br(a.t * b.t, a.n * b.n); }
  function deel(a, b) { return br(a.t * b.n, a.n * b.t); }
  function isNul(a) { return a.t === 0; }
  function isEen(a) { return a.t === a.n; }
  function negatief(a) { return a.t < 0; }
  function abs(a) { return br(Math.abs(a.t), a.n); }
  function veilig(a) { return Math.abs(a.t) < 1e12 && a.n < 1e12; }

  // In een cel van het schema: een minteken en een schuine breukstreep.
  function tekst(a) {
    var s = String(Math.abs(a.t)) + (a.n === 1 ? "" : "/" + a.n);
    return (a.t < 0 ? "−" : "") + s;
  }
  function absTex(a) {
    return a.n === 1 ? String(Math.abs(a.t)) : "\\frac{" + Math.abs(a.t) + "}{" + a.n + "}";
  }
  function getalTex(a) { return (a.t < 0 ? "-" : "") + absTex(a); }
  // Een factor in een product: een negatief getal tussen haakjes.
  function factorTex(a) { return negatief(a) ? "(" + getalTex(a) + ")" : getalTex(a); }

  /* --- Lezen van wat de leerling typt ------------------------------------ */

  function normaliseer(s) {
    return String(s)
      .replace(/[−–—]/g, "-")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4")
      .replace(/⁵/g, "^5").replace(/⁶/g, "^6")
      .replace(/[*·⋅\s]/g, "")
      .replace(/X/g, "x");
  }

  // "3", "-1.5" of "2/3"; null als het geen getal is.
  function leesGetal(s) {
    var m = /^([+-]?)(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(normaliseer(s));
    if (!m) return null;
    var waarde = decimaal(m[2]);
    if (m[3] !== undefined) {
      var noemer = decimaal(m[3]);
      if (isNul(noemer)) return null;
      waarde = deel(waarde, noemer);
    }
    return m[1] === "-" ? maal(waarde, br(-1)) : waarde;
  }
  function decimaal(s) {
    var delen = s.split(".");
    if (delen.length === 1) return br(parseInt(s, 10));
    var n = Math.pow(10, delen[1].length);
    return br(parseInt(delen[0] + delen[1], 10), n);
  }

  // Een veelterm in x, zoals "2x^3 - 4x + 3", of een rij coëfficiënten
  // "2, 0, -4, 3". Geeft de coëfficiënten van de hoogste macht naar de
  // constante term, of gooit een fout met een zin voor de leerling.
  function leesVeelterm(invoer) {
    var s = normaliseer(invoer);
    if (!s) throw new Error("Typ een veelterm.");
    if (s.indexOf("x") < 0 && /[,;]/.test(s)) {
      var lijst = s.split(/[,;]/).map(function (deel) {
        var g = leesGetal(deel);
        if (!g) throw new Error("“" + deel + "” is geen getal.");
        return g;
      });
      return zonderNullenVooraan(lijst);
    }
    if (!/^[+-]/.test(s)) s = "+" + s;
    var termen = s.match(/[+-][^+-]*/g) || [];
    var per = {};
    var hoogste = 0;
    termen.forEach(function (term) {
      var m = /^([+-])((?:\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)?)?(x(?:\^(\d+))?)?$/.exec(term);
      if (!m || (m[2] === undefined && m[3] === undefined)) {
        throw new Error("“" + term.replace(/^\+/, "") + "” kan ik niet lezen.");
      }
      var coef = m[2] === undefined ? br(1) : leesGetal(m[2]);
      if (!coef) throw new Error("“" + m[2] + "” is geen getal.");
      if (m[1] === "-") coef = maal(coef, br(-1));
      var macht = m[3] === undefined ? 0 : (m[4] === undefined ? 1 : parseInt(m[4], 10));
      if (macht > 12) throw new Error("Hoogstens graad 12.");
      per[macht] = plus(per[macht] || NUL, coef);
      hoogste = Math.max(hoogste, macht);
    });
    var coefs = [];
    for (var p = hoogste; p >= 0; p--) coefs.push(per[p] || NUL);
    return zonderNullenVooraan(coefs);
  }
  function zonderNullenVooraan(coefs) {
    var i = 0;
    while (i < coefs.length - 1 && isNul(coefs[i])) i++;
    return coefs.slice(i);
  }
  function graad(coefs) { return coefs.length - 1; }
  function isNulveelterm(coefs) { return coefs.length === 1 && isNul(coefs[0]); }

  /* --- Veeltermen in TeX -------------------------------------------------- */

  function machtTex(p) { return p === 0 ? "" : p === 1 ? "x" : "x^{" + p + "}"; }

  // Eén term met zijn teken; eerst = zonder plusteken vooraan.
  function termTex(c, p, eerst) {
    var teken = negatief(c) ? "-" : (eerst ? "" : "+");
    var getal = p > 0 && isEen(abs(c)) ? "" : absTex(c);
    return teken + getal + machtTex(p);
  }

  function veeltermTex(coefs) {
    var n = graad(coefs), delen = [];
    coefs.forEach(function (c, i) {
      if (!isNul(c)) delen.push(termTex(c, n - i, delen.length === 0));
    });
    return delen.length ? delen.join("") : "0";
  }

  // x - a, met x + 3 voor a = -3.
  function delerTex(a) {
    if (isNul(a)) return "x";
    return "x" + (negatief(a) ? "+" + absTex(a) : "-" + absTex(a));
  }

  /* --- MathJax ------------------------------------------------------------ */

  // MathJax zet na elkaar; een snelle reeks klikken mag geen verouderde
  // formule achterlaten. De nieuwe formule wordt eerst onzichtbaar gezet en
  // pas daarna gewisseld, zodat er geen ruwe LaTeX in beeld komt.
  var wachtrij = Promise.resolve();
  function zet(el, tex) {
    el.a01Doel = tex;
    wachtrij = wachtrij.then(function () {
      if (el.a01Doel !== tex || el.a01Bron === tex) return;
      var MJ = window.MathJax;
      if (!MJ || !MJ.typesetPromise) {
        el.a01Bron = tex;
        el.textContent = tex;
        return;
      }
      var nieuw = document.createElement("span");
      nieuw.textContent = tex;
      // Onzichtbaar en geknipt, zodat ze tijdens het zetten geen schuifbalk
      // laat opflitsen.
      nieuw.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;" +
        "max-width:100%;overflow:hidden;white-space:nowrap";
      el.appendChild(nieuw);
      return MJ.typesetPromise([nieuw]).then(function () {
        if (el.a01Doel !== tex) { nieuw.remove(); return; }
        if (MJ.typesetClear) {
          Array.prototype.forEach.call(el.children, function (kind) {
            if (kind !== nieuw) MJ.typesetClear([kind]);
          });
        }
        while (el.firstChild && el.firstChild !== nieuw) el.removeChild(el.firstChild);
        while (nieuw.nextSibling) el.removeChild(nieuw.nextSibling);
        nieuw.style.cssText = "";
        el.a01Bron = tex;
      });
    }).catch(function (fout) { console.error(fout); });
  }
  function inline(tex) { return "\\(\\displaystyle " + tex + "\\)"; }
  // Een formule midden in een zin van de uitleg. De zin is gewone tekst, zodat
  // ze op een smal scherm afbreekt; één lange formule kan dat niet.
  function f(tex) { return "\\(" + tex + "\\)"; }

  /* --- Opmaak -------------------------------------------------------------- */

  function stijl() {
    if (document.getElementById("a01-stijl")) return;
    var el = document.createElement("style");
    el.id = "a01-stijl";
    el.textContent = `
      .a01-html > .interactieve-grafiek-bord { display:none !important; }
      .a01-laag { display:flex; flex-direction:column; gap:.6rem; padding:.8rem 1rem;
        box-sizing:border-box; color:var(--grafiek-tekst); background:var(--grafiek-vlak); }
      .pres-figuur-groot .a01-laag { padding-top:3rem; }
      .pres-figuur-groot.interactieve-grafiek.a01-html { justify-content:safe center;
        overflow-y:auto; }
      .a01-invoer label { white-space:nowrap; }
      .a01-invoer { padding-right:5rem; }
      .a01-invoer { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem 1rem;
        font-size:.95rem; }
      .a01-invoer label { display:inline-flex; align-items:center; gap:.4rem; }
      .a01-invoer input, .a01-invoer select { font:inherit; color:inherit;
        background:var(--kleur-vlak); border:1px solid var(--kleur-lijn);
        border-radius:var(--straal); padding:.25rem .45rem; }
      .a01-invoer input { width:11rem; max-width:50vw; }
      .a01-invoer input.a01-kort { width:7rem; }
      .a01-invoer input[aria-invalid="true"] { border-color:var(--grafiek-secante); }
      .a01-midden { flex:0 0 auto; display:flex; flex-wrap:wrap; align-items:flex-start;
        justify-content:center; gap:1rem 2.5rem; }
      .a01-fout { color:var(--grafiek-secante); font-size:.95rem; }
      .a01-fout:empty { display:none; }
      .a01-uitleg, .a01-besluit { position:relative; font-size:1.15rem; min-height:3.6rem; text-align:center;
        max-width:100%; overflow-x:auto; overflow-y:hidden; flex-shrink:0; }
      .a01-besluit, .a01-besluit.a01-tweeregels { min-height:3.8rem; }
      @media (max-width: 40rem) {
        .a01-uitleg { min-height:5.6rem; }
        .a01-besluit { min-height:5.6rem; }
      }
      .a01-uitleg mjx-container, .a01-besluit mjx-container,
      .a01-deling mjx-container { margin:0 !important; }

      .a01-horner { display:grid; font-size:1.4rem; font-variant-numeric:tabular-nums;
        margin:.2rem auto 0; }
      .a01-laag button:not(.a01-cel) { font:inherit; }
      .a01-laag .a01-horner .a01-cel { min-width:2.6rem;
        padding:.3rem .55rem; margin:0; font:inherit; color:inherit; text-align:right;
        white-space:nowrap; box-sizing:border-box; background:transparent; border:0;
        border-radius:0; cursor:default; }
      .a01-laag .a01-horner .a01-cel.a01-verborgen > span { visibility:hidden; }
      .a01-laag .a01-horner .a01-cel.a01-pijl { text-align:center; }
      .a01-laag .a01-horner .a01-cel.a01-links { border-left:2px solid var(--grafiek-tekst); }
      .a01-laag .a01-horner .a01-cel.a01-lijn { border-bottom:2px solid var(--grafiek-tekst); }
      .a01-laag .a01-horner .a01-cel.a01-rest { border-left:2px solid var(--grafiek-tekst); }
      .a01-laag .a01-horner .a01-cel.a01-klikbaar { cursor:pointer; }
      .a01-laag .a01-horner .a01-cel.a01-klikbaar:hover {
        background:color-mix(in srgb, var(--grafiek-punt) 9%, transparent); }
      .a01-laag .a01-horner .a01-cel:focus-visible {
        outline:3px solid var(--grafiek-punt); outline-offset:-3px; }
      .a01-laag .a01-horner .a01-cel.a01-bron { color:var(--grafiek-punt);
        background:color-mix(in srgb, var(--grafiek-punt) 14%, transparent); }
      .a01-laag .a01-horner .a01-cel.a01-nieuw { color:var(--grafiek-secante);
        font-weight:600; background:color-mix(in srgb, var(--grafiek-secante) 16%, transparent); }

      .a01-deling { font-size:1.25rem; overflow-x:auto; overflow-y:hidden; max-width:100%;
        flex-shrink:0; cursor:pointer; }
      .a01-deling .a01-weg { opacity:0; }
      .a01-bron { color:var(--grafiek-punt); }
      .a01-nieuw { color:var(--grafiek-secante); }
      .a01-stappen { margin:0; padding:0; list-style:none; display:flex; flex-wrap:wrap;
        align-items:center; justify-content:center; gap:.35rem .5rem; font-size:.9rem; }
      .a01-stappen li { padding:.15rem .55rem; border:1px solid var(--kleur-lijn);
        border-radius:var(--straal); }
      .a01-stappen li.a01-actief { color:var(--grafiek-secante); border-color:var(--grafiek-secante);
        background:color-mix(in srgb, var(--grafiek-secante) 14%, transparent); }
      .a01-stappen li.a01-herhaal { border:none; color:var(--grafiek-zwak); }
    `;
    document.head.appendChild(el);
  }

  function el(soort, klasse, inhoud) {
    var e = document.createElement(soort);
    if (klasse) e.className = klasse;
    if (inhoud !== undefined) e.textContent = inhoud;
    return e;
  }

  // De runtime verwacht een bord van JSXGraph, maar deze figuren tekenen
  // niets op een assenstelsel. Het bord blijft daarom leeg en verborgen, en
  // de HTML-laag staat ervoor in de gewone stroom van de figuur. Zo is de
  // figuur precies zo hoog als haar inhoud: het bord krijgt van de runtime
  // een vaste hoogte, begrensd op een deel van het venster, en daarin zou
  // een lange deling op een laag scherm moeten schuiven.
  function maakLaag(ctx) {
    ctx.maakBord({ begrenzing: [-5, 5, 5, -5], assen: false });
    stijl();
    ctx.figuur.classList.add("a01-html");
    var laag = el("div", "a01-laag");
    ctx.figuur.insertBefore(laag, ctx.element);
    return laag;
  }

  function veld(ouder, opschrift, waarde, kort) {
    var label = el("label");
    label.appendChild(document.createTextNode(opschrift));
    var invoer = el("input", kort ? "a01-kort" : "");
    invoer.type = "text";
    invoer.value = waarde;
    invoer.spellcheck = false;
    invoer.autocomplete = "off";
    label.appendChild(invoer);
    ouder.appendChild(label);
    return invoer;
  }

  function keuzelijst(ouder, voorbeelden) {
    var label = el("label");
    label.appendChild(document.createTextNode("Voorbeeld"));
    var lijst = el("select");
    voorbeelden.forEach(function (v, i) {
      var optie = el("option", "", v.naam);
      optie.value = String(i);
      lijst.appendChild(optie);
    });
    var eigen = el("option", "", "eigen invoer");
    eigen.value = "eigen";
    lijst.appendChild(eigen);
    label.appendChild(lijst);
    ouder.appendChild(label);
    return lijst;
  }

  // De knoppen onder de figuur, gedeeld door beide soorten.
  function stapknoppen(ctx, figuur) {
    var vorige = ctx.knop("Vorige stap", function () { figuur.naar(figuur.stap - 1); });
    var volgende = ctx.knop("Volgende stap", function () { figuur.naar(figuur.stap + 1); });
    var alles = ctx.knop("Alles", function () { figuur.naar(figuur.aantal()); });
    return function () {
      var n = figuur.aantal();
      vorige.disabled = figuur.stap <= 0;
      volgende.disabled = figuur.stap >= n;
      alles.disabled = figuur.stap >= n;
    };
  }

  /* --- Het schema van Horner ---------------------------------------------- */

  // opties.voorbeelden: [{naam, A, a}]; bij herhaald is a een lijst getallen
  // gescheiden door een komma, en wordt het quotiënt telkens het volgende
  // deeltal.
  function maakHorner(ctx, opties) {
    var laag = maakLaag(ctx);
    var invoer = el("div", "a01-invoer");
    laag.appendChild(invoer);
    var lijst = keuzelijst(invoer, opties.voorbeelden);
    var veldA = veld(invoer, "A(x) =", "", false);
    var velda = veld(invoer, "a =", "", true);
    var fout = el("div", "a01-fout");
    laag.appendChild(fout);
    var midden = el("div", "a01-midden");
    laag.appendChild(midden);
    var rooster = el("div", "a01-horner");
    rooster.setAttribute("role", "img");
    midden.appendChild(rooster);
    var uitleg = el("div", "a01-uitleg");
    var besluit = el("div", "a01-besluit");
    laag.appendChild(uitleg);
    laag.appendChild(besluit);

    var figuur = { stap: 0, aantal: function () { return stappen.length; }, naar: naar };
    var ronden = [];    // per a: {a, boven, midden, onder}
    var stappen = [];   // {ronde, soort, j}
    var cellen = {};    // "ronde:rij:kolom" -> element; rij 0 = boven, 1 = midden, 2 = onder
    var aCellen = [];
    var stopMelding = "";
    var vulStap = {};   // cel -> de stap waarna ze ingevuld is
    var restStap = {};  // restcel -> de stap die de rest bespreekt
    var werkKnoppenBij = stapknoppen(ctx, figuur);

    function bereken(coefs, as) {
      ronden = [];
      stappen = [];
      stopMelding = "";
      vulStap = {};
      restStap = {};
      var huidig = coefs;
      for (var r = 0; r < as.length; r++) {
        if (graad(huidig) < 1) {
          stopMelding = "Het quotiënt is een constante: verder delen door x − a kan niet.";
          break;
        }
        var a = as[r];
        var boven = huidig, mid = [null], onder = [boven[0]];
        for (var j = 1; j < boven.length; j++) {
          mid.push(maal(a, onder[j - 1]));
          onder.push(plus(boven[j], mid[j]));
          if (!veilig(onder[j])) throw new Error("De getallen worden te groot.");
        }
        ronden.push({ a: a, boven: boven, midden: mid, onder: onder });
        stappen.push({ ronde: r, soort: "neer", j: 0 });
        vulStap[r + ":1:0"] = vulStap[r + ":2:0"] = stappen.length;
        for (j = 1; j < boven.length; j++) {
          stappen.push({ ronde: r, soort: "maal", j: j });
          vulStap[r + ":1:" + j] = stappen.length;
          stappen.push({ ronde: r, soort: "plus", j: j });
          vulStap[r + ":2:" + j] = stappen.length;
        }
        stappen.push({ ronde: r, soort: "rest", j: boven.length - 1 });
        restStap[r + ":2:" + (boven.length - 1)] = stappen.length;
        var rest = onder[onder.length - 1];
        if (!isNul(rest)) {
          if (r < as.length - 1) {
            stopMelding = "De rest is niet 0: " + "x − a is geen deler, dus hier stopt het herhalen.";
          }
          break;
        }
        huidig = onder.slice(0, -1);
      }
    }

    function bouwRooster() {
      rooster.textContent = "";
      cellen = {};
      aCellen = [];
      var breedte = ronden.length ? ronden[0].boven.length : 0;
      rooster.style.gridTemplateColumns = "auto repeat(" + breedte + ", auto)";
      // Een cel die een stap invult, is een knop: een klik gaat vooruit tot
      // die cel er staat, en op de rest nog één stap verder, tot het besluit.
      function cel(r, rij, k, inhoud, klassen) {
        var sleutel = r + ":" + rij + ":" + k;
        var c = el(rij === 0 ? "div" : "button", "a01-cel " + (klassen || ""));
        c.appendChild(el("span", "", inhoud));
        if (k === 0) c.classList.add("a01-links");
        if (rij !== 0) {
          c.type = "button";
          c.setAttribute("aria-label", (rij === 1 ? "Middelste rij" : "Onderste rij") +
            (ronden.length > 1 ? " van deling " + (r + 1) : "") + ", kolom " + (k + 1));
          c.addEventListener("click", function () { klik(sleutel); });
        }
        cellen[sleutel] = c;
        return c;
      }
      function leeg(n) { for (var i = 0; i < n; i++) rooster.appendChild(el("div", "a01-cel")); }
      ronden.forEach(function (ronde, r) {
        var n = ronde.boven.length;
        if (r === 0) {
          rooster.appendChild(el("div", "a01-cel"));
          ronde.boven.forEach(function (c, k) {
            rooster.appendChild(cel(r, 0, k, tekst(c)));
          });
        }
        var aCel = el("div", "a01-cel a01-a a01-lijn");
        aCel.appendChild(el("span", "", tekst(ronde.a)));
        aCellen.push(aCel);
        rooster.appendChild(aCel);
        ronde.midden.forEach(function (c, k) {
          var inhoud = k === 0 ? "↓" : tekst(c);
          rooster.appendChild(cel(r, 1, k, inhoud, "a01-lijn" + (k === 0 ? " a01-pijl" : "")));
        });
        leeg(breedte - n);
        rooster.appendChild(el("div", "a01-cel"));
        ronde.onder.forEach(function (c, k) {
          rooster.appendChild(cel(r, 2, k, tekst(c), k === n - 1 && n > 1 ? "a01-rest" : ""));
        });
        leeg(breedte - n);
      });
      // De bovenste rij van een volgende ronde is de onderste van de vorige.
      ronden.forEach(function (ronde, r) {
        if (r === 0) return;
        ronde.boven.forEach(function (c, k) { cellen[r + ":0:" + k] = cellen[(r - 1) + ":2:" + k]; });
      });
      rooster.setAttribute("aria-label", "Schema van Horner");
    }

    function klik(sleutel) {
      var doel = vulStap[sleutel];
      if (figuur.stap < doel) naar(doel);
      else if (restStap[sleutel] && figuur.stap < restStap[sleutel]) naar(restStap[sleutel]);
    }

    function tekenStand() {
      Object.keys(cellen).forEach(function (sleutel) {
        var c = cellen[sleutel];
        c.classList.remove("a01-bron", "a01-nieuw");
        var nog = figuur.stap < (vulStap[sleutel] || 0) ||
          (restStap[sleutel] && figuur.stap < restStap[sleutel]);
        c.classList.toggle("a01-klikbaar", !!nog);
        var delen = sleutel.split(":");
        if (delen[1] !== "0") c.classList.add("a01-verborgen");
      });
      aCellen.forEach(function (c) { c.classList.remove("a01-bron"); c.classList.add("a01-verborgen"); });
      if (aCellen[0]) aCellen[0].classList.remove("a01-verborgen");
      // Alles tot en met de huidige stap staat er.
      for (var s = 0; s < figuur.stap; s++) {
        var st = stappen[s];
        aCellen[st.ronde].classList.remove("a01-verborgen");
        if (st.soort === "neer") {
          cellen[st.ronde + ":1:0"].classList.remove("a01-verborgen");
          cellen[st.ronde + ":2:0"].classList.remove("a01-verborgen");
        } else if (st.soort === "maal") {
          cellen[st.ronde + ":1:" + st.j].classList.remove("a01-verborgen");
        } else if (st.soort === "plus") {
          cellen[st.ronde + ":2:" + st.j].classList.remove("a01-verborgen");
        }
      }
      var huidige = stappen[figuur.stap - 1];
      if (!huidige) {
        zet(uitleg, "Schrijf de coëfficiënten bovenaan en " + f("a = " + getalTex(ronden[0].a)) +
          " links.");
        ctx.toon("Coëfficiënten bovenaan, a = " + tekst(ronden[0].a) + " links.");
      } else {
        var r = huidige.ronde, j = huidige.j, ronde = ronden[r];
        var C = function (rij, k) { return cellen[r + ":" + rij + ":" + k]; };
        if (huidige.soort === "neer") {
          C(0, 0).classList.add("a01-bron");
          C(2, 0).classList.add("a01-nieuw");
          zet(uitleg, "Breng " + f(getalTex(ronde.onder[0])) + " naar beneden.");
          ctx.toon("Breng " + tekst(ronde.onder[0]) + " naar beneden.");
        } else if (huidige.soort === "maal") {
          aCellen[r].classList.add("a01-bron");
          C(2, j - 1).classList.add("a01-bron");
          C(1, j).classList.add("a01-nieuw");
          zet(uitleg, "Vermenigvuldig met " + f("a") + ": " + f(factorTex(ronde.a) +
            "\\cdot " + factorTex(ronde.onder[j - 1]) + " = " + getalTex(ronde.midden[j])) + ".");
          ctx.toon("Vermenigvuldig met a: " + tekst(ronde.a) + " maal " +
            tekst(ronde.onder[j - 1]) + " is " + tekst(ronde.midden[j]) + ".");
        } else if (huidige.soort === "plus") {
          C(0, j).classList.add("a01-bron");
          C(1, j).classList.add("a01-bron");
          C(2, j).classList.add("a01-nieuw");
          zet(uitleg, "Tel op: " + f(getalTex(ronde.boven[j]) + " + " +
            factorTex(ronde.midden[j]) + " = " + getalTex(ronde.onder[j])) + ".");
          ctx.toon("Tel op: " + tekst(ronde.boven[j]) + " plus " + tekst(ronde.midden[j]) +
            " is " + tekst(ronde.onder[j]) + ".");
        } else {
          var n = ronde.onder.length;
          C(2, n - 1).classList.add("a01-nieuw");
          for (var k = 0; k < n - 1; k++) C(2, k).classList.add("a01-bron");
          var rest = ronde.onder[n - 1];
          var deeltal = r === 0 ? "A" : "Q_{" + r + "}";
          zet(uitleg, "Rest " + f("= " + deeltal + "(" + getalTex(ronde.a) + ") = " +
            getalTex(rest)) + ".");
          ctx.toon("Rest " + tekst(rest) + ", links het quotiënt.");
        }
      }
      zet(besluit, besluitTex());
      werkKnoppenBij();
    }

    function besluitTex() {
      if (figuur.stap < stappen.length) return "";
      var laatste = ronden[ronden.length - 1];
      var rest = laatste.onder[laatste.onder.length - 1];
      var Q = laatste.onder.slice(0, -1);
      if (!opties.herhaald || ronden.length === 1) {
        var r0 = ronden[0];
        // Twee formules met een spatie ertussen: op een smal scherm komt de
        // tweede onder de eerste.
        return inline("A(" + getalTex(r0.a) + ") = " + getalTex(rest)) + " \u2003 " +
          inline("A(x) = (" + delerTex(r0.a) + ")(" + veeltermTex(Q) + ")" +
            (isNul(rest) ? "" : (negatief(rest) ? "" : "+") + getalTex(rest))) +
          (stopMelding ? " " + stopMelding : "");
      }
      // Herhaald: alle factoren x - a waarvoor de rest 0 was, dan het
      // laatste quotiënt (en een rest die niet 0 is).
      var factoren = "";
      var tot = isNul(rest) ? ronden.length : ronden.length - 1;
      for (var r = 0; r < tot; r++) factoren += "(" + delerTex(ronden[r].a) + ")";
      var uit;
      if (!isNul(rest)) {
        uit = factoren + "(" + veeltermTex(laatste.boven) + ")";
      } else if (Q.length > 1) {
        uit = factoren + "(" + veeltermTex(Q) + ")";
      } else {
        // Een constant quotiënt komt vooraan: 3(x - 1)(x + 1).
        uit = (isEen(Q[0]) ? "" : getalTex(Q[0])) + factoren;
      }
      return inline("A(x) = " + uit) +
        (stopMelding ? " " + stopMelding : "");
    }

    function naar(stap) {
      figuur.stap = Math.max(0, Math.min(stappen.length, stap));
      tekenStand();
    }

    function lees() {
      fout.textContent = "";
      veldA.removeAttribute("aria-invalid");
      velda.removeAttribute("aria-invalid");
      var coefs, as;
      try {
        coefs = leesVeelterm(veldA.value);
        if (graad(coefs) < 1) throw new Error("Kies een veelterm van minstens graad 1.");
      } catch (e) {
        veldA.setAttribute("aria-invalid", "true");
        fout.textContent = e.message;
        return false;
      }
      var delen = opties.herhaald ? veldaWaarden() : [velda.value];
      as = delen.map(leesGetal);
      if (!as.length || as.some(function (a) { return !a; })) {
        velda.setAttribute("aria-invalid", "true");
        fout.textContent = opties.herhaald
          ? "Typ voor a een of meer getallen, gescheiden door een komma."
          : "Typ voor a een getal, zoals 2, -1.5 of 2/3.";
        return false;
      }
      try {
        bereken(coefs, as);
      } catch (e) {
        fout.textContent = e.message;
        return false;
      }
      bouwRooster();
      naar(0);
      return true;
    }
    function veldaWaarden() {
      return normaliseer(velda.value).split(/[,;]/).filter(function (d) { return d !== ""; });
    }

    function kies(i) {
      var v = opties.voorbeelden[i];
      lijst.value = String(i);
      veldA.value = v.A;
      velda.value = v.a;
      lees();
    }
    lijst.addEventListener("change", function () {
      if (lijst.value !== "eigen") kies(+lijst.value);
    });
    [veldA, velda].forEach(function (v) {
      v.addEventListener("input", function () { lijst.value = "eigen"; });
      v.addEventListener("change", lees);
      v.addEventListener("keydown", function (e) { if (e.key === "Enter") lees(); });
    });

    kies(0);
    return { reset: function () { kies(0); } };
  }

  /* --- De staartdeling ---------------------------------------------------- */

  function maakStaartdeling(ctx, opties) {
    var laag = maakLaag(ctx);
    var invoer = el("div", "a01-invoer");
    laag.appendChild(invoer);
    var lijst = keuzelijst(invoer, opties.voorbeelden);
    var veldA = veld(invoer, "A(x) =", "", false);
    var veldD = veld(invoer, "D(x) =", "", false);
    var fout = el("div", "a01-fout");
    laag.appendChild(fout);
    // De vier stappen van het algoritme, zoals in de cursus; de stap die nu
    // gebeurt, licht op.
    var lijstStappen = el("ol", "a01-stappen");
    ["① rangschikken, vervolledigen",
     "② hoogstegraadsterm A / D",
     "③ term in Q × D",
     "④ aftrekken"].forEach(function (t) {
      lijstStappen.appendChild(el("li", "a01-stap", t));
    });
    lijstStappen.appendChild(el("li", "a01-herhaal", "herhaal tot gr R < gr D"));
    laag.appendChild(lijstStappen);
    var midden = el("div", "a01-midden");
    laag.appendChild(midden);
    var deling = el("div", "a01-deling");
    midden.appendChild(deling);
    deling.addEventListener("click", function (e) {
      var stap = stapBij(e.clientX, e.clientY);
      if (stap === null) return;
      var laatste = stappen.length - 1;
      if (figuur.stap < stap) naar(stap);
      // Een klik op de laatste rest gaat nog één stap verder, naar het besluit.
      else if (stap === laatste - 1 && figuur.stap === stap) naar(laatste);
    });
    var uitleg = el("div", "a01-uitleg");
    var besluit = el("div", "a01-besluit a01-tweeregels");
    laag.appendChild(uitleg);
    laag.appendChild(besluit);

    var figuur = { stap: 0, aantal: function () { return stappen.length; }, naar: naar };
    var werkKnoppenBij = stapknoppen(ctx, figuur);
    var A, D, n, m, ronden, Q, R, stappen;

    // Een rij van de deling als lijst termen per macht (null = leeg).
    function bereken() {
      n = graad(A); m = graad(D);
      ronden = [];
      Q = []; // [{c, p}]
      var rest = A.slice();       // coëfficiënten, index = n - macht
      function rgraad() {
        for (var i = 0; i < rest.length; i++) if (!isNul(rest[i])) return n - i;
        return -1;
      }
      var veiligheid = 0;
      while (rgraad() >= m && veiligheid++ < 20) {
        var p = rgraad();
        var q = deel(rest[n - p], D[0]);
        var qp = p - m;
        var product = {};
        D.forEach(function (d, i) {
          if (!isNul(d)) product[qp + (m - i)] = maal(q, d);
        });
        var nieuw = rest.slice();
        Object.keys(product).forEach(function (macht) {
          nieuw[n - macht] = min(nieuw[n - macht], product[macht]);
        });
        nieuw[n - p] = NUL;
        if (nieuw.some(function (c) { return !veilig(c); })) throw new Error("De getallen worden te groot.");
        ronden.push({ lead: p, q: q, qp: qp, product: product, voor: rest, rest: nieuw });
        Q.push({ c: q, p: qp });
        rest = nieuw;
      }
      R = zonderNullenVooraan(rest);
      stappen = [{ soort: "vervolledig" }];
      ronden.forEach(function (ronde, i) {
        stappen.push({ soort: "quotient", ronde: i });
        stappen.push({ soort: "product", ronde: i });
        stappen.push({ soort: "aftrekken", ronde: i });
      });
      stappen.push({ soort: "klaar" });
    }

    // Bouwt de array voor stap s. Wat nog niet aan de beurt is, staat er
    // onzichtbaar, zodat de array vanaf het begin haar volle maat heeft.
    function arrayTex(s) {
      var st = stappen[s];
      var zichtbaarRonde = -1, zichtbaarDeel = 0; // 1 quotiënt, 2 product, 3 rest
      for (var i = 1; i <= s; i++) {
        var x = stappen[i];
        if (x.ronde !== undefined) {
          zichtbaarRonde = x.ronde;
          zichtbaarDeel = x.soort === "quotient" ? 1 : x.soort === "product" ? 2 : 3;
        }
      }
      if (st.soort === "klaar") { zichtbaarRonde = ronden.length - 1; zichtbaarDeel = 3; }
      function zichtbaar(r, deelNr) {
        return r < zichtbaarRonde || (r === zichtbaarRonde && deelNr <= zichtbaarDeel);
      }
      // Elke cel draagt de stap die haar schrijft (a01-s-<stap>), zodat een
      // klik erop tot daar kan gaan. Wat nog niet aan de beurt is, staat er
      // onzichtbaar: zo houdt de array haar maat en heeft de cel al een plaats.
      function verpak(tex, toon, klasse, stap) {
        if (!tex) return "";
        var inhoud = !toon ? "\\class{a01-weg}{" + tex + "}" :
          klasse ? "\\class{" + klasse + "}{" + tex + "}" : tex;
        return stap === undefined ? inhoud : "\\class{a01-s-" + stap + "}{" + inhoud + "}";
      }

      var kolommen = n + 1;
      var rijen = [];
      // Deeltal, vervolledigd.
      var eersteRij = [""];
      A.forEach(function (c, i) {
        var t = termTex(c, n - i, i === 0);
        var klasse = null;
        if (st.soort === "vervolledig" && isNul(c)) klasse = "a01-nieuw";
        if (st.soort === "quotient" && ronden[st.ronde].lead === n - i && st.ronde === 0) klasse = "a01-bron";
        eersteRij.push(verpak(t, true, klasse));
      });
      var dTex = veeltermTex(D);
      if (st.soort === "quotient") {
        // De hoogstegraadsterm van D licht op.
        dTex = "\\class{a01-bron}{" + termTex(D[0], m, true) + "}" +
          veeltermTex(D).slice(termTex(D[0], m, true).length);
      }
      eersteRij.push(dTex);
      rijen.push({ tex: eersteRij.join("&"), lijn: "\\cline{" + (kolommen + 2) + "-" + (kolommen + 2) + "}" });

      // Het quotiënt onder de deler: elke term op haar plaats, ook als ze
      // er nog niet staat.
      var qCel = Q.map(function (t, i) {
        return verpak(termTex(t.c, t.p, i === 0), zichtbaar(i, 1),
          st.soort === "quotient" && st.ronde === i ? "a01-nieuw" : null, 1 + 3 * i);
      }).join("");

      ronden.forEach(function (ronde, r) {
        // Productrij.
        var cellen = ["-"];
        var machten = Object.keys(ronde.product).map(Number).sort(function (a, b) { return b - a; });
        var laagste = machten[machten.length - 1];
        var eerst = true;
        for (var p = n; p >= 0; p--) {
          if (ronde.product[p] === undefined) { cellen.push(""); continue; }
          var t = termTex(ronde.product[p], p, eerst);
          eerst = false;
          var klasse = st.soort === "product" && st.ronde === r ? "a01-nieuw" : null;
          cellen.push(verpak(t, zichtbaar(r, 2), klasse, 2 + 3 * r));
        }
        cellen[0] = verpak("-", zichtbaar(r, 2), null, 2 + 3 * r);
        cellen.push(r === 0 ? qCel : "");
        rijen.push({
          tex: cellen.join("&"),
          lijn: zichtbaar(r, 3) ? "\\cline{" + (n - ronde.lead + 2) + "-" + (n - laagste + 2) + "}" : ""
        });
        // Partiële rest.
        var restCellen = [""];
        var eerstR = true;
        var isLaatste = r === ronden.length - 1;
        var allesNul = ronde.rest.every(isNul);
        for (p = n; p >= 0; p--) {
          var c = ronde.rest[n - p];
          if (p >= ronde.lead || isNul(c)) {
            if (allesNul && p === 0) {
              restCellen.push(verpak("0", zichtbaar(r, 3),
                st.soort === "aftrekken" && st.ronde === r ? "a01-nieuw" : null, 3 + 3 * r));
            } else {
              restCellen.push("");
            }
            continue;
          }
          var tr = termTex(c, p, eerstR);
          eerstR = false;
          var kl = null;
          if (st.soort === "aftrekken" && st.ronde === r) kl = "a01-nieuw";
          if (st.soort === "quotient" && st.ronde === r + 1 && p === ronden[r + 1].lead) kl = "a01-bron";
          if (st.soort === "klaar" && isLaatste) kl = "a01-nieuw";
          restCellen.push(verpak(tr, zichtbaar(r, 3), kl, 3 + 3 * r));
        }
        restCellen.push("");
        rijen.push({ tex: restCellen.join("&"), lijn: "" });
      });
      var spec = "r" + new Array(kolommen + 1).join("r") + "|l";
      return "\\begin{array}{" + spec + "}" + rijen.map(function (rij, i) {
        return rij.tex + (i < rijen.length - 1 ? "\\\\" + rij.lijn : "");
      }).join("") + "\\end{array}";
    }

    function tekenStand() {
      var s = figuur.stap;
      var st = stappen[s];
      zet(deling, inline(arrayTex(s)));
      var actief = { vervolledig: 0, quotient: 1, product: 2, aftrekken: 3 }[st.soort];
      Array.prototype.forEach.call(lijstStappen.querySelectorAll("li.a01-stap"), function (li, i) {
        li.classList.toggle("a01-actief", i === actief);
      });
      var tex = "", zin = "";
      if (st.soort === "vervolledig") {
        tex = "Rangschikken, vervolledigen: " + f("A(x) = " + volledigTex(A));
        zin = "Stap \u2460: rangschik en vervolledig.";
      } else if (st.soort === "quotient") {
        var ronde = ronden[st.ronde];
        var lead = termTex(ronde.voor[n - ronde.lead], ronde.lead, true);
        tex = inline("\\frac{" + lead + "}{" + termTex(D[0], m, true) + "} = " + termTex(ronde.q, ronde.qp, true));
        zin = "Stap \u2461: deel de hoogstegraadstermen.";
      } else if (st.soort === "product") {
        ronde = ronden[st.ronde];
        tex = f(factorTermTex(ronde.q, ronde.qp) + "\\cdot(" + veeltermTex(D) + ")") + " " +
          f("= " + productTex(ronde));
        zin = "Stap \u2462: vermenigvuldig met de deler.";
      } else if (st.soort === "aftrekken") {
        ronde = ronden[st.ronde];
        var rest = zonderNullenVooraan(ronde.rest);
        var klaar = isNulveelterm(rest) || graad(rest) < m;
        tex = "Aftrekken: partiële rest " + f(veeltermTex(rest)) + "." +
          (klaar ? "" : " Terug naar stap \u2461.");
        zin = "Stap \u2463: trek af." + (klaar ? "" : " Terug naar \u2461.");
      } else {
        if (isNulveelterm(R)) {
          tex = f("R(x) = 0") + ": opgaande deling.";
        } else if (!ronden.length) {
          tex = f("\\gr A < \\gr D") + ": " + f("Q(x) = 0") + " en " + f("R(x) = A(x)") + ".";
        } else {
          tex = f("\\gr R = " + graad(R) + " < " + m + " = \\gr D") + ": klaar.";
        }
        zin = "Klaar: gr R < gr D.";
      }
      zet(uitleg, tex);
      ctx.toon(zin);
      if (st.soort === "klaar") {
        var qv = Q.length ? qVeelterm() : "0";
        // Enkel quotiënt en rest: de hele gelijkheid is op een smal scherm
        // te breed, en ze staat in de cursus vlak onder de figuur.
        zet(besluit, inline("\\begin{aligned} Q(x) &= " + qv + " \\\\ R(x) &= " +
          (isNulveelterm(R) ? "0" : veeltermTex(R)) + "\\end{aligned}"));
      } else {
        zet(besluit, "");
      }
      werkKnoppenBij();
    }

    // De term die het dichtst bij de klik ligt, tot op 0.6em van de rechthoek
    // rond haar inkt: in de SVG van MathJax is een groep zo groot als haar
    // inkt, en een minteken is maar een streepje.
    function stapBij(x, y) {
      var marge = 0.6 * parseFloat(getComputedStyle(deling).fontSize);
      var beste = null, afstand = Infinity;
      deling.querySelectorAll('[class*="a01-s-"]').forEach(function (g) {
        var m = /(?:^|\s)a01-s-(\d+)/.exec(g.getAttribute("class") || "");
        if (!m) return;
        var k = g.getBoundingClientRect();
        var dx = Math.max(k.left - x, 0, x - k.right);
        var dy = Math.max(k.top - y, 0, y - k.bottom);
        var d = Math.hypot(dx, dy);
        if (d <= marge && d < afstand) { afstand = d; beste = +m[1]; }
      });
      return beste;
    }

    function qVeelterm() {
      var coefs = [];
      var hoogste = Q[0].p;
      for (var p = hoogste; p >= 0; p--) coefs.push(NUL);
      Q.forEach(function (t) { coefs[hoogste - t.p] = t.c; });
      return veeltermTex(coefs);
    }
    function volledigTex(coefs) {
      return coefs.map(function (c, i) { return termTex(c, graad(coefs) - i, i === 0); }).join("");
    }
    function factorTermTex(c, p) {
      var t = termTex(c, p, true);
      return negatief(c) ? "(" + t + ")" : t;
    }
    function productTex(ronde) {
      var machten = Object.keys(ronde.product).map(Number).sort(function (a, b) { return b - a; });
      return machten.map(function (p, i) { return termTex(ronde.product[p], p, i === 0); }).join("");
    }

    function naar(stap) {
      figuur.stap = Math.max(0, Math.min(stappen.length - 1, stap));
      tekenStand();
    }
    figuur.aantal = function () { return stappen.length - 1; };

    function lees() {
      fout.textContent = "";
      veldA.removeAttribute("aria-invalid");
      veldD.removeAttribute("aria-invalid");
      try {
        A = leesVeelterm(veldA.value);
      } catch (e) {
        veldA.setAttribute("aria-invalid", "true");
        fout.textContent = "Deeltal: " + e.message;
        return;
      }
      try {
        D = leesVeelterm(veldD.value);
        if (isNulveelterm(D)) throw new Error("delen door 0 kan niet.");
      } catch (e) {
        veldD.setAttribute("aria-invalid", "true");
        fout.textContent = "Deler: " + e.message;
        return;
      }
      if (graad(A) > 8) { fout.textContent = "Deeltal: hoogstens graad 8."; return; }
      try {
        bereken();
      } catch (e) {
        fout.textContent = e.message;
        return;
      }
      naar(0);
    }

    function kies(i) {
      var v = opties.voorbeelden[i];
      lijst.value = String(i);
      veldA.value = v.A;
      veldD.value = v.D;
      lees();
    }
    lijst.addEventListener("change", function () {
      if (lijst.value !== "eigen") kies(+lijst.value);
    });
    [veldA, veldD].forEach(function (v) {
      v.addEventListener("input", function () { lijst.value = "eigen"; });
      v.addEventListener("change", lees);
      v.addEventListener("keydown", function (e) { if (e.key === "Enter") lees(); });
    });

    kies(0);
    return { reset: function () { kies(0); } };
  }

  /* --- De figuren van het hoofdstuk -------------------------------------- */

  G.registreer("horner-getalwaarde", function (ctx) {
    return maakHorner(ctx, {
      voorbeelden: [
        { naam: "A(2) met A(x) = 2x³ − 4x + 3", A: "2x^3 - 4x + 3", a: "2" },
        { naam: "deling door x − 1", A: "6x^3 - 2x^2 + x - 5", a: "1" },
        { naam: "reststelling: deling door x + 3", A: "2x^3 + 9x^2 + 8x + 1", a: "-3" },
        { naam: "x³ − 64 delen door x − 4", A: "x^3 - 64", a: "4" }
      ]
    });
  });

  G.registreer("horner-herhaald", function (ctx) {
    return maakHorner(ctx, {
      herhaald: true,
      voorbeelden: [
        { naam: "3x⁵ + 6x⁴ − 2x³ − 4x² − x − 2", A: "3x^5 + 6x^4 - 2x^3 - 4x^2 - x - 2", a: "1, -1, -2" },
        { naam: "x³ + 3x² − x − 3", A: "x^3 + 3x^2 - x - 3", a: "1, -1, -3" },
        { naam: "x⁴ − 1", A: "x^4 - 1", a: "1, -1" }
      ]
    });
  });

  G.registreer("staartdeling", function (ctx) {
    return maakStaartdeling(ctx, {
      voorbeelden: [
        { naam: "(2x⁴ − 9x² − x − 4) : (−2x² + 4x − 3)", A: "2x^4 - 9x^2 - x - 4", D: "-2x^2 + 4x - 3" },
        { naam: "(x² + 7x + 8) : (x + 1)", A: "x^2 + 7x + 8", D: "x + 1" },
        { naam: "(2x³ + 5x² + 5x + 3) : (2x + 3)", A: "2x^3 + 5x^2 + 5x + 3", D: "2x + 3" },
        { naam: "(6x³ + 8x² + 4x + 20) : (2x + 2)", A: "6x^3 + 8x^2 + 4x + 20", D: "2x + 2" },
        { naam: "(2x³ + 9x² + 8x + 1) : (x + 3)", A: "2x^3 + 9x^2 + 8x + 1", D: "x + 3" }
      ]
    });
  });
}());
