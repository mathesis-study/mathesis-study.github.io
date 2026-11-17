/* Interactieve grafieken bij L04_Stelsels.tex.
 *
 * Een stelsel oplossen is een reeks bewerkingen, en op papier staat enkel
 * hun uitkomst. Twee grafieken laten de leerling die bewerkingen zelf doen.
 * De eerste toont waarom een elementaire bewerking mag: de rechten van een
 * stelsel draaien, maar hun snijpunt blijft staan. De tweede voert de methode
 * van Gauss-Jordan uit op de uitgebreide matrix, met de spil, de
 * controlekolom en de oplossing die je op het einde afleest.
 *
 * Alle wiskunde staat in MathJax, ook in de knoppen. De matrix van
 * gauss-jordan is een HTML-raster met echte knoppen tussen haken, zoals de
 * matrices van L03_Determinanten; de zetter, de haken en de maat van de laag
 * komen zoals daar uit web/matrixbord.js. Volgende stap volgt de werkwijze van de
 * cursus: eerst vereenvoudigen en ordenen, dan nullen maken in de kolom van
 * de spil, en tot slot alle spillen 1.
 *
 * mkpi: gebruikt matrixbord.js
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var M = window.Matrixbord;
  if (!G || !M) return;

  var net = M.net;
  var matrixBord = M.matrixBord;
  var pasLaagAan = M.pasLaagAan;
  var maakHaken = M.maakHaken;
  // Zonder MathJax staat er een leesbare tekst in plaats van ruwe LaTeX.
  function maakZetter() { return M.maakZetter(plat); }

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
    gelijk: function (a, b) { return a.t === b.t && a.n === b.n; },
    tekst: function (a) { return net(a.n === 1 ? String(a.t) : a.t + "/" + a.n); },
    tex: function (a) {
      if (a.n === 1) return String(a.t);
      return (a.t < 0 ? "-" : "") + "\\frac{" + Math.abs(a.t) + "}{" + a.n + "}";
    }
  };

  /* --- Wiskunde in LaTeX ------------------------------------------------- */

  // Een lineaire combinatie zoals de cursus ze schrijft: 2R_2-3R_1, R_1+7R_2.
  function termTex(k, naam, eerste) {
    if (Q.nul(k)) return "";
    var neg = k.t < 0;
    var abs = breuk(Math.abs(k.t), k.n);
    var co = Q.een(abs) ? "" : Q.tex(abs);
    if (eerste) return (neg ? "-" : "") + co + naam;
    return (neg ? "-" : "+") + co + naam;
  }

  // Rijen tellen in de code vanaf 0, in de tekst vanaf 1. Een bewerking is
  // een regel van een aligned-blok: de & staat voor de pijl.
  function rTex(i) { return "R_{" + (i + 1) + "}"; }
  function combinatieTex(i, k, l, j) {
    return rTex(i) + "&\\leftarrow " + termTex(k, rTex(i), true) + termTex(l, rTex(j), false);
  }
  // R_doel ← R_bron/d, zoals R_3\leftarrow R_3/(-64). Delen door -1 is -R,
  // delen door een breuk is vermenigvuldigen met haar omgekeerde.
  function deelTex(doel, bron, d) {
    var links = rTex(doel) + "&\\leftarrow ";
    if (d.n !== 1) return links + termTex(Q.deel(breuk(1), d), rTex(bron), true);
    if (d.t === 1) return links + rTex(bron);
    if (d.t === -1) return links + "-" + rTex(bron);
    return links + rTex(bron) + "/" + (d.t < 0 ? "(" + d.t + ")" : d.t);
  }
  function wisselTex(i, j) { return rTex(i) + "&\\leftrightarrow " + rTex(j); }

  function uitgelijnd(regels) {
    if (!regels.length) return "";
    return "\\(\\displaystyle\\begin{aligned}" + regels.join("\\\\[0.3em]") + "\\end{aligned}\\)";
  }

  // Tekst met wiskunde als gewone zin voor ctx.toon, die een schermlezer
  // voorleest: R_1 \leftarrow 2R_1 wordt R1 ← 2R1.
  var PLAT = {
    leftarrow: " ← ", leftrightarrow: " ↔ ", emptyset: "∅", mid: " | ",
    mathbb: "", in: " ∈ ", text: "", sim: "∼", displaystyle: "", R: "ℝ"
  };
  // Enkel binnen de wiskunde wordt - een minteken: rij-canoniek blijft staan.
  // Een accolade \{ van een verzameling blijft, een groep {...} valt weg.
  function platWiskunde(s) {
    return s
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
      .replace(/\\mathbb\{R\}/g, "ℝ")
      .replace(/\\\{/g, "\u0001").replace(/\\\}/g, "\u0002")
      .replace(/\\([a-zA-Z]+)/g, function (heel, w) { return w in PLAT ? PLAT[w] : w; })
      .replace(/\\[,;! ]/g, " ")
      .replace(/[_{}&]/g, "")
      .replace(/\u0001/g, "{").replace(/\u0002/g, "}")
      .replace(/-/g, "−");
  }
  function plat(s) {
    var stukken = String(s).split(/\\[()]/);
    // Een tekst zonder \( \) is ofwel gewone tekst, ofwel een bewerking
    // zoals R_2&\leftarrow 2R_2-3R_1: die herken je aan een backslash of _.
    if (stukken.length === 1 && /[\\_&]/.test(s)) stukken = ["", s];
    return stukken.map(function (stuk, k) { return k % 2 ? platWiskunde(stuk) : stuk; })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  function zinnen(regels) {
    return regels.filter(Boolean).map(function (r) {
      r = plat(r).trim();
      return /[.?:!]$/.test(r) ? r : r + ".";
    }).join(" ");
  }

  /* --- MathJax zetten ---------------------------------------------------- */

  // De zetter, de haken rond de matrix en de maat van de laag komen uit
  // web/matrixbord.js, samen met L03_Determinanten.

  // Wiskunde in een knop of label. Is MathJax er nog niet, dan staat eerst
  // de tekst en volgt de formule zodra MathJax klaar is.
  function zetWiskunde(element, tex, tekst) {
    element.classList.add("gj-wis");
    element.setAttribute("aria-label", tekst);
    function probeer() {
      var mj = window.MathJax;
      if (!mj || typeof mj.tex2svg !== "function") return false;
      var svg = mj.tex2svg(tex, { display: false }).querySelector("svg");
      element.textContent = "";
      element.appendChild(svg);
      return true;
    }
    if (probeer()) return;
    element.textContent = tekst;
    na(probeer);
  }

  // Voer f uit zodra MathJax klaar is.
  function na(f) {
    var mj = window.MathJax;
    var klaar = mj && mj.startup && mj.startup.promise;
    if (klaar) klaar.then(f);
    else setTimeout(function wacht() { if (!f()) setTimeout(wacht, 300); }, 300);
  }

  // Een formule op het JSXGraph-bord, als SVG in een eigen span: het bord
  // zet elke tekst op .82rem, en een formule moet groter.
  function maakTex(grootte) {
    var cache = {};
    return function (tex, tekst) {
      if (cache[tex]) return cache[tex];
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        var svg = mj.tex2svg("\\displaystyle " + tex, { display: false }).querySelector("svg");
        cache[tex] = '<span style="font-size:' + grootte + '">' + svg.outerHTML + "</span>";
      } catch (e) {
        return tekst;
      }
      return cache[tex];
    };
  }

  /* --- Opmaak ------------------------------------------------------------ */

  function stijl() {
    if (document.getElementById("gj-stijl")) return;
    var s = document.createElement("style");
    s.id = "gj-stijl";
    s.textContent = `
      .gj-punt { color:var(--grafiek-punt); }
      .gj-secante { color:var(--grafiek-secante); }
      .gj-zwak { color:var(--grafiek-zwak); }
      .interactieve-grafiek-knoppen .gj-wis { display:inline-flex; align-items:center;
        justify-content:center; min-height:2rem; }
      .gj-wis mjx-container, .gj-wis svg { margin:0 !important; }
      .gj-teller { display:inline-flex; align-items:center; gap:.3rem; }
      .gj-teller button { min-width:2.1rem; padding-inline:.45rem; }
      .gj-teller button:disabled { opacity:.45; cursor:default; }
      .gj-teller-waarde { min-width:4rem; text-align:center; color:var(--grafiek-tekst); }
      .gj-tussenruimte { flex:0 0 1.2rem; }

      .gj-laag { position:absolute; top:0; left:0; display:flex; box-sizing:border-box;
        transform-origin:top left; align-items:center; justify-content:safe center;
        gap:2rem 3rem; padding:2.25rem 1rem 1.5rem; overflow:visible;
        color:var(--grafiek-tekst);
        --gj-b:3.4rem; --gj-h:2.7rem; --gj-gat:.3rem; }
      .gj-laag mjx-assistive-mml { width:1px !important; height:1px !important; }
      .gj-matrixdeel { display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
      .gj-naam { font-size:1.5rem; width:4.4rem; flex-shrink:0; text-align:right; }
      .gj-raster, .gj-controle { display:grid; gap:var(--gj-gat); padding:.4rem .15rem;
        grid-auto-rows:var(--gj-h); }
      /* Sterker dan .interactieve-grafiek-bord button, de gewone knopstijl. */
      .gj-raster button.gj-vak, .gj-controle .gj-som { font:inherit; font-size:1.45rem;
        width:var(--gj-b); height:var(--gj-h); padding:0; color:var(--grafiek-tekst);
        background:transparent; border:1px solid transparent; border-radius:.3rem;
        display:flex; align-items:center; justify-content:center;
        box-sizing:border-box; white-space:nowrap; }
      .gj-raster button.gj-vak:hover { border-color:var(--grafiek-zwak); }
      .gj-raster button.gj-vak:focus-visible { outline:3px solid var(--grafiek-punt); }
      .gj-vak mjx-container, .gj-som mjx-container { margin:0 !important; }
      .gj-streep { width:1.5px; background:currentColor; justify-self:center; }
      .gj-raster button.gj-rij-punt {
        background:color-mix(in srgb, var(--grafiek-punt) 16%, transparent); }
      .gj-raster button.gj-rij-secante {
        background:color-mix(in srgb, var(--grafiek-secante) 24%, transparent); }
      .gj-raster button.gj-spil {
        background:color-mix(in srgb, var(--grafiek-punt) 30%, transparent);
        color:var(--grafiek-punt); border-color:var(--grafiek-punt); }
      .gj-controlekolom { position:relative; }
      .gj-controlekop { position:absolute; bottom:100%; left:50%; transform:translateX(-50%);
        font-size:.85rem; color:var(--grafiek-zwak); white-space:nowrap; }
      .gj-controle .gj-som { color:var(--grafiek-zwak); }
      .gj-uitleg { width:19rem; max-width:100%; display:flex; flex-direction:column; gap:.6rem;
        flex-shrink:0; }
      .gj-titel { font-weight:700; min-height:1.5em; margin:0; }
      .gj-ops { font-size:1.25rem; min-height:8.2rem; }
      .gj-ops mjx-container { margin:0 !important; }
      .gj-besluit { min-height:7.5rem; line-height:1.45; }
      .gj-besluit p { margin:0 0 .35em; }
      .gj-besluit p:empty { display:none; }
      .gj-besluit .gj-groot { font-size:1.2rem; }
      @media (max-width:650px) { .gj-laag { flex-direction:column; align-items:safe center;
          gap:1.25rem; padding:4.75rem .5rem 1rem; --gj-b:2.45rem; --gj-h:2.2rem; --gj-gat:.2rem; }
        .gj-naam { width:3.4rem; font-size:1.3rem; }
        .gj-matrixdeel { gap:.25rem; }
        .gj-raster button.gj-vak, .gj-controle .gj-som { font-size:1.15rem; }
        .gj-uitleg { width:19rem; } }
    `;
    document.head.appendChild(s);
  }

  function div(klasse) {
    var d = document.createElement("div");
    d.className = klasse;
    return d;
  }

  /* --- 1. Gelijkwaardige stelsels ---------------------------------------- */

  // Elke vergelijking ax + by = c is een rechte. Een elementaire bewerking
  // verandert de vergelijkingen, en dus de rechten, maar niet hun snijpunt.
  G.registreer("gelijkwaardige-stelsels", function (ctx) {
    stijl();
    var BEGIN = [[1, 1, 7], [3, -1, 1]];
    var KMIN = -3, KMAX = 3, KBEGIN = 2;
    var st = { S: kopie(BEGIN), k: KBEGIN, stap: "", geschiedenis: [] };

    function kopie(S) { return S.map(function (r) { return r.slice(); }); }

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
        name: nr === 0 ? "R₁" : "R₂", withLabel: true,
        dash: nr === 0 ? 0 : 2,
        label: { position: nr === 0 ? "rt" : "lft", offset: nr === 0 ? [-30, 12] : [30, 12] }
      }), rol);
    }
    var rechten = [rechte(0, "punt"), rechte(1, "secante")];
    var snijpunt = ctx.stijl(bord.create("point", [2, 5], {
      name: "(2;5)", size: 4, fixed: true, showInfobox: false,
      label: { offset: [10, -12] }
    }), "tekst");
    // De namen op het bord ook in MathJax, zodra het klaar is.
    na(function () {
      var tex = maakTex("1.1rem");
      rechten[0].label.setText(tex("R_1", "R₁"));
      rechten[1].label.setText(tex("R_2", "R₂"));
      snijpunt.label.setText(tex("(2;5)", "(2;5)"));
      bord.update();
      return true;
    });

    function lidTex(a, b) {
      var s = "";
      if (a) s += (a === -1 ? "-" : a === 1 ? "" : String(a)) + "x";
      if (b) {
        var abs = Math.abs(b);
        var co = abs === 1 ? "" : String(abs);
        s += s ? (b < 0 ? "-" : "+") + co + "y" : (b < 0 ? "-" : "") + co + "y";
      }
      return s || "0";
    }
    function vergelijkingTex(r) { return lidTex(r[0], r[1]) + "=" + r[2]; }
    function veelvoudTex(i, k) {
      return (i === 0 ? "R_1" : "R_2") + "\\leftarrow " + termTex(breuk(k), i === 0 ? "R_1" : "R_2", true);
    }
    function optelTex(i, k) {
      var naam = i === 0 ? "R_1" : "R_2", ander = i === 0 ? "R_2" : "R_1";
      return naam + "\\leftarrow " + naam + termTex(breuk(k), ander, false);
    }

    // Het stelsel staat rechtsboven, waar de rechten niet komen, maar onder
    // Groot en Reset (RESERVE pixels). Het vak houdt een vaste breedte,
    // zodat een langere vergelijking niets doet verschuiven.
    var RESERVE = 52, RAND = 10;
    function hoek(as) {
      var b = bord.getBoundingBox();
      return as === "x" ? b[2] - RAND / bord.unitX : b[1] - RESERVE / bord.unitY;
    }
    var formule = maakTex("1.25rem");
    var klein = maakTex("1rem");
    function paneelHtml() {
      var regels = [
        "\\begin{cases}\\class{gj-punt}{R_1}\\colon\\ " + vergelijkingTex(st.S[0]) +
          "\\\\ \\class{gj-secante}{R_2}\\colon\\ " + vergelijkingTex(st.S[1]) + "\\end{cases}"
      ];
      var html = formule(regels[0], plat(vergelijkingTex(st.S[0]) + ", " + vergelijkingTex(st.S[1])));
      // Een bewerking is wiskunde, een naam zoals Combinatiemethode tekst.
      var stap = !st.stap ? "&nbsp;"
        : st.stap.indexOf("\\") >= 0 ? klein("\\class{gj-zwak}{" + st.stap + "}", plat(st.stap))
        : "<span class='gj-zwak' style='font-size:.9rem'>" + st.stap + "</span>";
      return "<div style='line-height:1.2'>" + html + "<div style='margin-top:.35em'>" + stap + "</div></div>";
    }
    var paneel = bord.create("text", [
      function () { return hoek("x"); }, function () { return hoek("y"); }, paneelHtml
    ], {
      anchorX: "right", anchorY: "top", fixed: true, highlight: false,
      useMathJax: false,
      cssStyle: "background:var(--kleur-vlak-zweef);padding:.4em .7em;" +
        "border-radius:4px;white-space:nowrap;min-width:12.5rem;min-height:5.6rem;box-sizing:border-box"
    });
    ctx.stijl(paneel, "tekst");

    function werkBij() {
      bord.update();
      kToon(st.k);
      ctx.toon(zinnen([
        "Stelsel: \\(" + vergelijkingTex(st.S[0]) + "\\) en \\(" + vergelijkingTex(st.S[1]) + "\\)",
        st.stap,
        "Het snijpunt blijft \\((2;5)\\)",
        "\\(k = " + st.k + "\\)"
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

    // De teller − k = 2 + staat vooraan, met een tussenruimte tot de
    // bewerkingen die hem gebruiken. k = 0 slaat hij over: een rij met 0
    // vermenigvuldigen is geen elementaire bewerking.
    var kToon = teller(ctx, "k", function (stap) {
      var k = st.k + stap;
      if (k === 0) k += stap;
      if (k < KMIN || k > KMAX) return;
      st.k = k;
      werkBij();
    }, KMIN, KMAX);

    var wissel = ctx.knop("R₁ ↔ R₂", function () {
      voerUit("R_1\\leftrightarrow R_2", [st.S[1].slice(), st.S[0].slice()]);
    });
    zetWiskunde(wissel, "R_1\\leftrightarrow R_2", "R₁ ↔ R₂");
    [0, 1].forEach(function (i) {
      var knop = ctx.knop(i === 0 ? "R₁ ← k·R₁" : "R₂ ← k·R₂", function () {
        var S = kopie(st.S);
        S[i] = S[i].map(function (x) { return st.k * x; });
        voerUit(veelvoudTex(i, st.k), S);
      });
      zetWiskunde(knop, i === 0 ? "R_1\\leftarrow kR_1" : "R_2\\leftarrow kR_2",
        i === 0 ? "R₁ ← k·R₁" : "R₂ ← k·R₂");
    });
    [0, 1].forEach(function (i) {
      var j = 1 - i;
      var knop = ctx.knop(i === 0 ? "R₁ ← R₁ + k·R₂" : "R₂ ← R₂ + k·R₁", function () {
        var S = kopie(st.S);
        S[i] = S[i].map(function (x, t) { return x + st.k * st.S[j][t]; });
        voerUit(optelTex(i, st.k), S);
      });
      zetWiskunde(knop, i === 0 ? "R_1\\leftarrow R_1+kR_2" : "R_2\\leftarrow R_2+kR_1",
        i === 0 ? "R₁ ← R₁ + k·R₂" : "R₂ ← R₂ + k·R₁");
    });
    // Zoals in het voorbeeld van de cursus: in R₁ valt y weg, in R₂ valt x
    // weg. Beide rechten staan dan evenwijdig met een as.
    ctx.knop("Combinatiemethode", function () {
      var a = st.S[0], b = st.S[1];
      var r1 = [b[1] * a[0] - a[1] * b[0], 0, b[1] * a[2] - a[1] * b[2]];
      var r2 = [0, a[0] * b[1] - b[0] * a[1], a[0] * b[2] - b[0] * a[2]];
      voerUit("Combinatiemethode", [vereenvoudig(r1), vereenvoudig(r2)]);
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
      st.k = KBEGIN;
      werkBij();
    }

    na(function () { bord.update(); return true; });
    werkBij();
    return { reset: herstel };
  });

  // Een teller − naam = waarde + als één groep in de knoppenbalk, met een
  // tussenruimte erna. verander(+1 of −1) past de waarde aan; de teruggegeven
  // functie toont een waarde en zet de knoppen aan of uit.
  function teller(ctx, naam, verander, min, max) {
    var minKnop = ctx.knop("−", function () { verander(-1); });
    var plusKnop = ctx.knop("+", function () { verander(1); });
    zetWiskunde(minKnop, "-", naam + " verlagen");
    zetWiskunde(plusKnop, "+", naam + " verhogen");
    var groep = document.createElement("span");
    groep.className = "gj-teller";
    groep.setAttribute("role", "group");
    groep.setAttribute("aria-label", naam);
    var waarde = document.createElement("span");
    waarde.className = "gj-teller-waarde";
    waarde.setAttribute("aria-live", "polite");
    minKnop.parentNode.insertBefore(groep, minKnop);
    groep.appendChild(minKnop);
    groep.appendChild(waarde);
    groep.appendChild(plusKnop);
    var ruimte = document.createElement("span");
    ruimte.className = "gj-tussenruimte";
    groep.parentNode.insertBefore(ruimte, groep.nextSibling);
    var tex = maakTex("1rem");
    var vorige = null;
    function toon(w) {
      var html = tex(naam + "=" + w, naam + " = " + net(String(w)));
      if (html !== vorige) { waarde.innerHTML = html; vorige = html; }
      minKnop.disabled = w <= min;
      plusKnop.disabled = w >= max;
    }
    na(function () { vorige = null; return true; });
    return toon;
  }

  /* --- 2. De methode van Gauss-Jordan ------------------------------------ */

  var STELSELS = [
    { naam: "Voorbeeld 1", A: [[2, -1, 3, 5], [3, 2, 2, 4], [5, 3, -1, 7]] },
    { naam: "Voorbeeld 2", A: [[2, 4, -1, -7], [3, 6, 2, 0], [-2, 2, -3, -17], [4, -3, 4, 26]] },
    { naam: "Voorbeeld 3", A: [[3, -7, 2, 2], [-1, 3, 0, -2], [1, -2, 1, 0]] },
    { naam: "Voorbeeld 4", A: [[1, -3, -1, 2], [-2, 5, 3, 4], [4, -11, -5, 5]] }
  ];
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
  function deelRij(r, d) {
    return r.map(function (x) { return Q.deel(x, d); });
  }

  // R_i ← k·R_i + l·R_j.
  function combineer(A, i, k, l, j) {
    var B = kopieQ(A);
    B[i] = A[i].map(function (x, t) { return Q.plus(Q.maal(k, x), Q.maal(l, A[j][t])); });
    return B;
  }

  // Het rekenwerk voor "maak nul": het element a in rij i wordt nul met de
  // spil p in rij j, via R_i ← p·R_i − a·R_j (de combinatiemethode). Zijn
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

  // De deler waarmee een rij van gehele getallen eenvoudiger wordt, of null
  // als er niets te vereenvoudigen valt. Wordt het eerste element zo ±1, dan
  // delen we zo dat het 1 wordt: R_3 ← R_3/(−64) in Voorbeeld 1.
  function vereenvoudiger(r) {
    if (r.some(function (x) { return x.n !== 1; })) return null;
    var g = r.reduce(function (a, x) { return ggd(a, x.t); }, 0);
    if (g <= 1) return null;
    var h = r[hoofd(r, r.length)];
    return breuk(Math.abs(h.t) === g && h.t < 0 ? -g : g);
  }

  // Is rij a een veelvoud van rij b? Dan maakt de volgende stap er toch een
  // nulrij van, en heeft vereenvoudigen geen zin.
  function evenredig(a, b) {
    var h = hoofd(b, b.length);
    if (h < 0 || hoofd(a, a.length) < 0) return false;
    var lambda = Q.deel(a[h], b[h]);
    return a.every(function (x, t) { return Q.gelijk(x, Q.maal(lambda, b[t])); });
  }

  // Is de matrix rij-canoniek, of het stelsel duidelijk strijdig? En zo
  // niet: wat is de volgende stap van de methode, zoals de cursus ze zet?
  // Bij elke nieuwe spil eerst de rijen ordenen en vereenvoudigen, dan
  // nullen maken in haar kolom; tot slot alle spillen 1 en de nulrijen
  // onderaan. Een stap bestaat uit een titel en de bewerkingen die er samen
  // bij horen.
  function volgendeStap(A, n) {
    var r = 0, i, t, s, B, ops;
    for (var c = 0; c <= n && r < A.length; c++) {
      // Strijdig zodra er onder de spilrijen niets meer in A staat, maar wel
      // een bekende term: dan liggen V en de rangen vast en stoppen we.
      if (A.slice(r).every(function (rij) { return hoofd(rij, n) < 0; }) &&
          A.slice(r).some(function (rij) { return !Q.nul(rij[n]); })) return null;
      var p = -1;
      for (i = r; i < A.length; i++) if (!Q.nul(A[i][c])) { p = i; break; }
      if (p < 0) continue;
      var anderen = [];
      for (i = 0; i < A.length; i++) if (i !== p && !Q.nul(A[i][c])) anderen.push(i);
      if (p === r && !anderen.length) { r++; continue; }

      // Ordenen en vereenvoudigen. Een rij die een veelvoud is van de
      // spilrij, laten we staan: nullen maken werkt ze toch weg.
      var delers = A.map(function (rij, i) {
        return i !== p && evenredig(rij, A[p]) ? null : vereenvoudiger(rij);
      });
      var wissel = p !== r;
      if (wissel || delers.some(Boolean)) {
        var bron = function (t) { return !wissel ? t : t === r ? p : t === p ? r : t; };
        var kaal = wissel && !delers[p] && !delers[r];
        B = kopieQ(A);
        ops = [];
        if (kaal) ops.push(wisselTex(r, p));
        for (t = 0; t < A.length; t++) {
          s = bron(t);
          B[t] = delers[s] ? deelRij(A[s], delers[s]) : A[s];
          if (kaal && (t === r || t === p)) continue;
          if (s !== t || delers[s]) ops.push(deelTex(t, s, delers[s] || breuk(1)));
        }
        var aantal = delers.filter(Boolean).length;
        return {
          A: B, ops: ops, spil: [r, c],
          titel: !wissel ? (aantal === 1 ? "Rij vereenvoudigen" : "Rijen vereenvoudigen")
            : aantal ? "Rijen ordenen en vereenvoudigen" : "Rijen ordenen"
        };
      }

      // Nullen maken in de kolom van de spil, in alle andere rijen tegelijk.
      B = kopieQ(A);
      ops = [];
      anderen.forEach(function (i) {
        var f = nulMaker(A[r][c], A[i][c]);
        B[i] = combineer(A, i, f.k, f.l, r)[i];
        ops.push(combinatieTex(i, f.k, f.l, r));
      });
      return { A: B, ops: ops, spil: [r, c], titel: "Nullen maken in \\(K_{" + (c + 1) + "}\\)" };
    }

    // Alle spillen 1.
    B = kopieQ(A);
    ops = [];
    for (i = 0; i < A.length; i++) {
      var h = hoofd(A[i], n + 1);
      if (h >= 0 && !Q.een(A[i][h])) {
        B[i] = deelRij(A[i], A[i][h]);
        ops.push(deelTex(i, i, A[i][h]));
      }
    }
    if (ops.length) {
      return { A: B, ops: ops, spil: null,
               titel: ops.length === 1 ? "Spil \\(1\\) maken" : "Spillen \\(1\\) maken" };
    }

    // Nulrijen onderaan: pas dan is de matrix echt rij-canoniek.
    for (i = 0; i + 1 < A.length; i++) {
      if (hoofd(A[i], n + 1) < 0 && hoofd(A[i + 1], n + 1) >= 0) {
        B = kopieQ(A);
        B[i] = A[i + 1];
        B[i + 1] = A[i];
        return { A: B, ops: [wisselTex(i, i + 1)], spil: null, titel: "Nulrij onderaan" };
      }
    }
    return null;
  }

  function rang(A, n) {
    return A.filter(function (r) { return hoofd(r, n) >= 0; }).length;
  }

  // De oplossing aflezen uit een rij-canonieke matrix, als regels tekst met
  // wiskunde.
  function aflezen(A, n) {
    var rA = rang(A, n), rAb = rang(A, n + 1);
    if (rAb > rA) {
      return ["Strijdig stelsel: \\(r(A)=" + rA + "<r(A_b)=" + rAb + "\\)",
              "\\(V=\\emptyset\\)"];
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
      var s = Q.nul(r[n]) ? "" : Q.tex(r[n]);
      vrij.forEach(function (v) {
        s += termTex(Q.min(r[v]), par[v], s === "");
      });
      uitdr[j] = s || "0";
    }
    var V = "\\(V=\\{(" + uitdr.join(";") + ")" +
      (vrij.length ? "\\mid " + vrij.map(function (v) { return par[v]; }).join(",") +
        "\\in\\mathbb{R}" : "") + "\\}\\)";
    var zin = vrij.length
      ? "\\(r(A)=r(A_b)=" + rA + "<n=" + n + "\\): " +
        (vrij.length === 1 ? "één onbekende" : vrij.length + " onbekenden") + " vrij te kiezen"
      : "\\(r(A)=r(A_b)=n=" + n + "\\): één oplossing";
    return [zin, V];
  }

  G.registreer("gauss-jordan", function (ctx) {
    stijl();
    matrixBord(ctx);
    var N = 3;          // aantal onbekenden
    var st = {
      keuze: 0, A: naarQ(STELSELS[0].A), spil: null, tweede: -1,
      titel: "", ops: [], geschiedenis: []
    };
    var zet = maakZetter();

    // De laag: links A_b met de controlekolom, rechts de stap en het besluit.
    var laag = div("gj-laag");
    var matrixdeel = div("gj-matrixdeel");
    var naam = div("gj-naam");
    var raster = div("gj-raster");
    var controlekolom = div("gj-controlekolom");
    var kop = div("gj-controlekop");
    kop.textContent = "controle";
    var controle = div("gj-controle");
    controlekolom.appendChild(kop);
    controlekolom.appendChild(controle);
    matrixdeel.appendChild(naam);
    matrixdeel.appendChild(maakHaken(raster, "haken"));
    matrixdeel.appendChild(controlekolom);
    var uitleg = div("gj-uitleg");
    var titel = document.createElement("p");
    titel.className = "gj-titel";
    var ops = div("gj-ops");
    var besluit = div("gj-besluit");
    var regels = [0, 1, 2].map(function () {
      var p = document.createElement("p");
      besluit.appendChild(p);
      return p;
    });
    uitleg.appendChild(titel);
    uitleg.appendChild(ops);
    uitleg.appendChild(besluit);
    laag.appendChild(matrixdeel);
    laag.appendChild(uitleg);
    ctx.element.appendChild(laag);
    pasLaagAan(ctx, laag);

    var vakjes = [], sommen = [], R = 0;
    function bouw() {
      if (st.A.length === R) return;
      R = st.A.length;
      if (window.MathJax && window.MathJax.typesetClear) {
        window.MathJax.typesetClear([raster, controle]);
      }
      raster.textContent = "";
      controle.textContent = "";
      raster.style.gridTemplateColumns = "repeat(" + N + ",var(--gj-b)) .9rem var(--gj-b)";
      vakjes = [];
      sommen = [];
      for (var i = 0; i < R; i++) {
        vakjes.push([]);
        for (var j = 0; j <= N; j++) {
          (function (i, j) {
            var vak = document.createElement("button");
            vak.type = "button";
            vak.className = "gj-vak";
            vak.style.gridRow = String(i + 1);
            vak.style.gridColumn = String(j < N ? j + 1 : N + 2);
            vak.addEventListener("click", function () { klik(i, j); });
            raster.appendChild(vak);
            vakjes[i].push(vak);
          }(i, j));
        }
        var som = document.createElement("span");
        som.className = "gj-som";
        controle.appendChild(som);
        sommen.push(som);
      }
      var streep = div("gj-streep");
      streep.style.gridColumn = String(N + 1);
      streep.style.gridRow = "1 / span " + R;
      raster.appendChild(streep);
    }

    function klaar() { return volgendeStap(st.A, N) === null; }

    function som(rij) {
      var s = breuk(0);
      rij.forEach(function (x) { s = Q.plus(s, x); });
      return s;
    }

    function besluitRegels() {
      if (klaar()) {
        return [rang(st.A, N + 1) > rang(st.A, N) ? "Het stelsel is duidelijk strijdig."
                : "De matrix is rij-canoniek."].concat(aflezen(st.A, N));
      }
      if (!st.spil) {
        return ["Klik op een element dat niet nul is: dat wordt de spil.",
                "Of kies Volgende stap."];
      }
      if (st.tweede < 0) {
        return ["Klik op een andere rij om er een nul te maken.",
                "Of deel de spilrij door de spil, of vereenvoudig ze."];
      }
      var p = st.A[st.spil[0]][st.spil[1]];
      var a = st.A[st.tweede][st.spil[1]];
      if (Q.nul(a)) return ["Dat element is al nul.", "Of wissel de twee rijen."];
      var f = nulMaker(p, a);
      return ["Maak nul: \\(" + combinatieTex(st.tweede, f.k, f.l, st.spil[0]).replace("&", "") + "\\)",
              "Of wissel de twee rijen."];
    }

    var knoppen = {};
    function werkBij() {
      bouw();
      var paren = [];
      var A = st.A;
      for (var i = 0; i < R; i++) {
        for (var j = 0; j <= N; j++) {
          var vak = vakjes[i][j];
          var spil = st.spil && st.spil[0] === i && st.spil[1] === j;
          vak.classList.toggle("gj-spil", !!spil);
          vak.classList.toggle("gj-rij-punt", !!st.spil && st.spil[0] === i && !spil);
          vak.classList.toggle("gj-rij-secante", st.tweede === i);
          vak.setAttribute("aria-pressed", String(!!spil));
          vak.setAttribute("aria-label", "Rij " + (i + 1) + ", " +
            (j < N ? "kolom " + (j + 1) : "bekende term") + ": " + Q.tekst(A[i][j]));
          paren.push([vak, "\\(" + Q.tex(A[i][j]) + "\\)"]);
        }
        paren.push([sommen[i], "\\(" + Q.tex(som(A[i])) + "\\)"]);
      }
      var lijst = besluitRegels();
      paren.push([naam, st.geschiedenis.length ? "\\(\\sim\\)" : "\\(A_b=\\)"]);
      paren.push([titel, st.titel || STELSELS[st.keuze].naam]);
      paren.push([ops, uitgelijnd(st.ops)]);
      regels.forEach(function (p, k) { paren.push([p, lijst[k] || ""]); });
      zet(paren);

      var tweede = st.spil && st.tweede >= 0;
      var spilwaarde = st.spil && A[st.spil[0]][st.spil[1]];
      knoppen.nul.disabled = !tweede || Q.nul(A[st.tweede][st.spil[1]]);
      knoppen.wissel.disabled = !tweede;
      knoppen.deel.disabled = !st.spil || Q.een(spilwaarde);
      knoppen.eenvoud.disabled = !st.spil || !vereenvoudiger(A[st.spil[0]]);
      knoppen.volgende.disabled = klaar();
      knoppen.terug.disabled = !st.geschiedenis.length;

      ctx.toon(zinnen([st.titel || STELSELS[st.keuze].naam]
        .concat(st.ops.map(plat))
        .concat(lijst)) + " A_b = " + A.map(function (rr) {
          return "(" + rr.map(Q.tekst).join(", ") + ")";
        }).join(", ") + ".");
    }

    // Een klik op een element van een andere rij kiest die rij (oranje); een
    // klik op een element van de spilrij of zonder spil kiest de spil.
    function klik(i, j) {
      if (st.spil && i !== st.spil[0]) {
        st.tweede = i;
      } else if (j < N && !Q.nul(st.A[i][j])) {
        st.spil = [i, j];
        st.tweede = -1;
      }
      werkBij();
    }

    function voerUit(t, ops, B, spil) {
      st.geschiedenis.push({ A: st.A, spil: st.spil, tweede: st.tweede, titel: st.titel, ops: st.ops });
      st.A = B;
      st.titel = t;
      st.ops = ops;
      st.spil = spil || null;
      st.tweede = -1;
      werkBij();
    }

    knoppen.nul = ctx.knop("Maak nul", function () {
      if (!st.spil || st.tweede < 0) return;
      var r = st.spil[0], c = st.spil[1];
      var p = st.A[r][c], a = st.A[st.tweede][c];
      if (Q.nul(a)) return;
      var f = nulMaker(p, a);
      voerUit("Nul maken in \\(K_{" + (c + 1) + "}\\)",
        [combinatieTex(st.tweede, f.k, f.l, r)],
        combineer(st.A, st.tweede, f.k, f.l, r), st.spil);
    });
    knoppen.deel = ctx.knop("Deel door spil", function () {
      if (!st.spil) return;
      var i = st.spil[0];
      var d = st.A[i][st.spil[1]];
      var B = kopieQ(st.A);
      B[i] = deelRij(st.A[i], d);
      voerUit("Spil \\(1\\) maken", [deelTex(i, i, d)], B, st.spil);
    });
    knoppen.eenvoud = ctx.knop("Vereenvoudig", function () {
      if (!st.spil) return;
      var i = st.spil[0];
      var d = vereenvoudiger(st.A[i]);
      if (!d) return;
      var B = kopieQ(st.A);
      B[i] = deelRij(st.A[i], d);
      voerUit("Rij vereenvoudigen", [deelTex(i, i, d)], B, st.spil);
    });
    knoppen.wissel = ctx.knop("Wissel", function () {
      if (!st.spil || st.tweede < 0) return;
      var i = st.spil[0], j = st.tweede;
      var B = kopieQ(st.A);
      B[i] = st.A[j];
      B[j] = st.A[i];
      voerUit("Rijen ordenen", [wisselTex(Math.min(i, j), Math.max(i, j))], B, null);
    });
    knoppen.volgende = ctx.knop("Volgende stap", function () {
      var v = volgendeStap(st.A, N);
      if (!v) return;
      voerUit(v.titel, v.ops, v.A, v.spil);
    });
    knoppen.terug = ctx.knop("Terug", function () {
      var vorige = st.geschiedenis.pop();
      if (!vorige) return;
      st.A = vorige.A;
      st.spil = vorige.spil;
      st.tweede = vorige.tweede;
      st.titel = vorige.titel;
      st.ops = vorige.ops;
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
      st.titel = "";
      st.ops = [];
      st.geschiedenis = [];
      werkBij();
    }

    function herstel() {
      st.keuze = 0;
      begin();
    }

    begin();
    return { reset: herstel };
  });
}());
