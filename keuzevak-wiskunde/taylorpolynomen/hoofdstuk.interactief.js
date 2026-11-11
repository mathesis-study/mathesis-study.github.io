/* Interactieve grafieken bij Taylorpolynomen.tex.
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

  var GRIJP = { touch: 30, mouse: 6 };           // ruim aanraakgebied

  function opties(extra) {
    var o = { fixed: true, highlight: false };
    for (var sleutel in extra) o[sleutel] = extra[sleutel];
    return o;
  }

  var FAC = [1];
  for (var i = 1; i <= 60; i++) FAC.push(FAC[i - 1] * i);

  /* --- Formules met MathJax ---------------------------------------------- */

  // Een formule als SVG van MathJax, inline en in displaystijl, in een eigen
  // span van 1.15rem: de teksten op het bord staan op .82rem, te klein voor
  // een formule. Zolang MathJax er niet is, komt de tekstversie; die wordt
  // niet onthouden, zodat de volgende update het opnieuw probeert.
  function maakTex(grootte) {
    var cache = {};
    return function (tex, tekst) {
      if (cache[tex]) return cache[tex];
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        var svg = mj.tex2svg("\\displaystyle " + tex, { display: false }).querySelector("svg");
        svg.style.maxWidth = "100%";
        svg.style.height = "auto";
        cache[tex] = '<span style="font-size:' + (grootte || "1.15rem") + '">' +
          svg.outerHTML + "</span>";
      } catch (e) {
        return tekst;
      }
      return cache[tex];
    };
  }

  // Een formule linksboven op het bord, met een halfdoorzichtige achtergrond
  // in de kleur van het bord, zodat een kromme eronder de formule niet
  // onleesbaar maakt. Rechtsboven blijft ruimte voor Groot en Reset; op een
  // smal bord begint de formule daaronder en krijgt ze de volle breedte.
  var RESERVE = 92, SMAL = 560, KNOPHOOGTE = 40;
  function formule(ctx, bord, inhoud) {
    var tex = maakTex();
    function smal() { return bord.canvasWidth < SMAL; }
    return ctx.stijl(bord.create("text", [
      function () { return bord.getBoundingBox()[0] + 8 / bord.unitX; },
      function () {
        return bord.getBoundingBox()[1] - (smal() ? KNOPHOOGTE : 6) / bord.unitY;
      },
      function () {
        var f = inhoud();
        var breedte = Math.max(60, bord.canvasWidth - (smal() ? 16 : RESERVE + 8));
        return '<div style="max-width:' + Math.floor(breedte) + 'px;padding:2px 6px;' +
          'border-radius:4px;background:color-mix(in srgb, var(--grafiek-vlak) 85%, transparent)">' +
          tex(f[0], f[1]) + "</div>";
      }
    ], opties({ anchorX: "left", anchorY: "top", display: "html", useMathJax: false })), "tekst");
  }

  // Een klein getal in tekst: gewone notatie, of wetenschappelijk als het
  // anders als 0 zou verschijnen.
  function klein(ctx, x) {
    var a = Math.abs(x);
    if (a === 0 || a >= 0.001) return ctx.getal(x, 4);
    if (a >= 1e-7) return ctx.getal(x, Math.ceil(-Math.log10(a)) + 1);
    return x.toExponential(1).replace("e", " · 10^");
  }

  // Een korte naam op het bord (P_2, P_n) als formule, met tekst als terugval.
  var labelTex = maakTex("1rem");
  function label(tex, tekst) {
    return function () { return labelTex(tex(), tekst()); };
  }

  function knopAan(knop, aan, tekstAan, tekstUit) {
    knop.setAttribute("aria-pressed", String(aan));
    if (tekstAan) knop.textContent = aan ? tekstAan : tekstUit;
  }

  /* --- De graad kiezen ------------------------------------------------------ */

  // De graad staat als een teller in de knoppenbalk: min, de waarde n = 3 en
  // plus als één groep. Een smalle tussenruimte scheidt ze van de keuze van de
  // functie. De stijl staat hier, want enkel dit hoofdstuk gebruikt ze.
  var graadStijl = false;
  function zetGraadStijl() {
    if (graadStijl) return;
    graadStijl = true;
    var stijl = document.createElement("style");
    stijl.textContent =
      ".taylor-graad { display:inline-flex; align-items:center; gap:.3rem; }" +
      ".taylor-graad button { min-width:2.1rem; padding-inline:.45rem; }" +
      ".taylor-graad button:disabled { opacity:.45; cursor:default; }" +
      ".taylor-graad-waarde { min-width:3.4rem; text-align:center; color:var(--grafiek-tekst); }" +
      ".taylor-tussenruimte { flex:0 0 1.2rem; }" +
      ".interactieve-grafiek-knoppen .taylor-wis { display:inline-flex; align-items:center; justify-content:center; min-height:2rem; }" +
      ".taylor-wis mjx-container, .taylor-wis svg { margin:0 !important; }";
    document.head.appendChild(stijl);
  }

  // Wiskunde in een knop of label, in tekststijl. Is MathJax er nog niet, dan
  // staat eerst de tekst en volgt de formule zodra MathJax klaar is.
  function zetWiskunde(element, tex, tekst) {
    element.classList.add("taylor-wis");
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
    var mj = window.MathJax;
    var klaar = mj && mj.startup && mj.startup.promise;
    if (klaar) klaar.then(probeer);
    else setTimeout(function wacht() { if (!probeer()) setTimeout(wacht, 300); }, 300);
  }

  var graadTex = maakTex("1rem");
  function graadKiezer(ctx, max, verlaag, verhoog) {
    zetGraadStijl();
    var min = ctx.knop("−", verlaag);
    var plus = ctx.knop("+", verhoog);
    zetWiskunde(min, "-", "−");
    zetWiskunde(plus, "+", "+");
    min.setAttribute("aria-label", "Graad n verlagen");
    plus.setAttribute("aria-label", "Graad n verhogen");
    var groep = document.createElement("span");
    groep.className = "taylor-graad";
    groep.setAttribute("role", "group");
    groep.setAttribute("aria-label", "Graad n");
    var waarde = document.createElement("span");
    waarde.className = "taylor-graad-waarde";
    min.parentNode.insertBefore(groep, min);
    groep.appendChild(min);
    groep.appendChild(waarde);
    groep.appendChild(plus);
    var vorige = null;
    return function toon(n) {
      if (n === vorige && waarde.firstChild && waarde.querySelector("svg")) return;
      vorige = n;
      waarde.innerHTML = graadTex("n = " + n, "n = " + n);
      min.disabled = n <= 0;
      plus.disabled = n >= max;
    };
  }

  // De keuze van de functie: f = [sin x ▾], een knop met de gekozen functie
  // die een lijst openklapt met alle functies als formule. Een gewone select
  // kan geen MathJax tonen. De lijst klapt naar boven open, over het bord,
  // want onder de knoppen staat de figuur bijna aan haar einde. Muis,
  // aanraking en toetsenbord (pijltjes, Home, End, Enter, Escape) werken.
  var KEUZESTIJL =
    ".taylor-keuze { position:relative; display:inline-flex; align-items:center; gap:.4rem; }" +
    ".interactieve-grafiek-knoppen .taylor-keuze-knop { display:inline-flex; align-items:center; gap:.45rem; min-height:2rem; }" +
    ".taylor-keuze-knop svg { margin:0 !important; }" +
    ".taylor-keuze-pijl { width:.7rem; height:.7rem; flex:none; transition:transform .15s; }" +
    ".taylor-keuze-knop[aria-expanded=true] .taylor-keuze-pijl { transform:rotate(180deg); }" +
    ".taylor-keuze-lijst { position:absolute; bottom:calc(100% + .3rem); left:0; z-index:20;" +
    " min-width:100%; margin:0; padding:.25rem; list-style:none; box-sizing:border-box;" +
    " background:var(--kleur-vlak); border:1px solid var(--kleur-lijn); border-radius:var(--straal);" +
    " box-shadow:0 .4rem 1.2rem color-mix(in srgb, var(--kleur-tekst) 18%, transparent); }" +
    ".taylor-keuze-lijst[hidden] { display:none; }" +
    ".interactieve-grafiek-knoppen .taylor-keuze-lijst li { display:flex; align-items:center; min-height:2.2rem; padding:.1rem .7rem;" +
    " border-radius:calc(var(--straal) - 2px); cursor:pointer; white-space:nowrap; color:var(--kleur-tekst); }" +
    ".taylor-keuze-lijst li svg { margin:0 !important; }" +
    ".taylor-keuze-lijst li:hover, .taylor-keuze-lijst li.taylor-actief {" +
    " background:color-mix(in srgb, var(--grafiek-punt) 14%, transparent); }" +
    ".taylor-keuze-lijst li[aria-selected=true] { box-shadow:inset 3px 0 0 var(--grafiek-punt); }";

  var keuzeTeller = 0;
  function functieKiezer(ctx, labelTex, lijst, kies) {
    zetGraadStijl();
    if (!document.getElementById("taylor-keuzestijl")) {
      var stijl = document.createElement("style");
      stijl.id = "taylor-keuzestijl";
      stijl.textContent = KEUZESTIJL;
      document.head.appendChild(stijl);
    }
    var sleutels = Object.keys(lijst);
    var id = "taylor-keuze-" + (++keuzeTeller);

    var knop = ctx.knop("", function () { open(lijstEl.hidden); });
    knop.className = "taylor-keuze-knop";
    knop.setAttribute("aria-haspopup", "listbox");
    knop.setAttribute("aria-expanded", "false");
    knop.setAttribute("aria-controls", id);
    var inhoud = document.createElement("span");
    var pijl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pijl.setAttribute("class", "taylor-keuze-pijl");
    pijl.setAttribute("viewBox", "0 0 12 12");
    pijl.setAttribute("aria-hidden", "true");
    pijl.innerHTML = '<path d="M2 4.5 L6 8.5 L10 4.5" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
    knop.appendChild(inhoud);
    knop.appendChild(pijl);

    var groep = document.createElement("span");
    groep.className = "taylor-keuze";
    var label = document.createElement("span");
    label.setAttribute("aria-hidden", "true");
    zetWiskunde(label, labelTex, "f =");
    knop.parentNode.insertBefore(groep, knop);
    groep.appendChild(label);
    groep.appendChild(knop);

    var lijstEl = document.createElement("ul");
    lijstEl.id = id;
    lijstEl.className = "taylor-keuze-lijst";
    lijstEl.setAttribute("role", "listbox");
    lijstEl.setAttribute("aria-label", "Functie");
    lijstEl.tabIndex = -1;
    lijstEl.hidden = true;
    var opties = sleutels.map(function (sleutel) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = id + "-" + sleutel;
      li.setAttribute("aria-label", "f(x) = " + lijst[sleutel].tekst);
      zetWiskunde(li, lijst[sleutel].knoptex, lijst[sleutel].tekst);
      li.addEventListener("click", function () { kiesOptie(sleutel); });
      li.addEventListener("pointermove", function () { markeer(sleutels.indexOf(sleutel)); });
      lijstEl.appendChild(li);
      return li;
    });
    groep.appendChild(lijstEl);

    var ruimte = document.createElement("span");
    ruimte.className = "taylor-tussenruimte";
    ruimte.setAttribute("aria-hidden", "true");
    groep.parentNode.insertBefore(ruimte, groep);

    var gekozen = sleutels[0], actief = 0;
    function markeer(i) {
      actief = (i + opties.length) % opties.length;
      opties.forEach(function (li, j) { li.classList.toggle("taylor-actief", j === actief); });
      lijstEl.setAttribute("aria-activedescendant", opties[actief].id);
    }
    function buiten(e) { if (!groep.contains(e.target)) open(false); }
    function open(aan) {
      lijstEl.hidden = !aan;
      knop.setAttribute("aria-expanded", String(aan));
      if (aan) {
        markeer(sleutels.indexOf(gekozen));
        lijstEl.focus();
        document.addEventListener("pointerdown", buiten, true);
      } else {
        document.removeEventListener("pointerdown", buiten, true);
      }
    }
    function kiesOptie(sleutel) {
      open(false);
      knop.focus();
      if (sleutel !== gekozen) kies(sleutel);
    }
    knop.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        open(true);
      }
    });
    lijstEl.addEventListener("keydown", function (e) {
      var acties = {
        ArrowDown: function () { markeer(actief + 1); },
        ArrowUp: function () { markeer(actief - 1); },
        Home: function () { markeer(0); },
        End: function () { markeer(opties.length - 1); },
        Enter: function () { kiesOptie(sleutels[actief]); },
        " ": function () { kiesOptie(sleutels[actief]); },
        Escape: function () { open(false); knop.focus(); }
      };
      if (e.key === "Tab") { open(false); return; }
      if (!acties[e.key]) return;
      e.preventDefault(); e.stopPropagation();
      acties[e.key]();
    });

    return {
      zet: function (sleutel) {
        gekozen = sleutel;
        var item = lijst[sleutel];
        knop.setAttribute("aria-label", "Functie: f(x) = " + item.tekst);
        zetWiskunde(inhoud, item.knoptex, item.tekst);
        opties.forEach(function (li, j) {
          li.setAttribute("aria-selected", String(sleutels[j] === sleutel));
        });
      },
      sluit: function () { open(false); }
    };
  }

  /* --- De functies --------------------------------------------------------- */

  // Elke functie met haar k-de afgeleide in a, het venster waarin ze goed in
  // beeld staat, de plaats waar a mag liggen en de exacte term van graad k
  // van haar Taylorpolynoom rond 0 (null als die term 0 is).
  function breuk(teller, noemer, k) {
    var macht = k === 1 ? "x" : "x^{" + k + "}";
    if (noemer === 1) return (teller === 1 ? "" : teller) + macht;
    return teller === 1 ? "\\frac{" + macht + "}{" + noemer + "}"
                        : "\\frac{" + teller + macht + "}{" + noemer + "}";
  }
  function metFaculteit(k) {
    if (k === 0) return "1";
    if (k === 1) return "x";
    return "\\frac{x^{" + k + "}}{" + k + "!}";
  }

  // Coëfficiënten van sqrt(1+x) rond 0 als breuken: c_k = c_(k-1) (3-2k)/(2k).
  var WORTEL = [[1, 1]];
  for (var w = 1; w <= 20; w++) {
    var t = WORTEL[w - 1][0] * (3 - 2 * w), n0 = WORTEL[w - 1][1] * 2 * w;
    var d = (function ggd(a, b) { return b ? ggd(b, a % b) : Math.abs(a); })(t, n0);
    WORTEL.push([t / d, n0 / d]);
  }

  var FUNCTIES = {
    exp: {
      knoptex: "e^x", tex: "e^x", tekst: "eˣ",
      f: Math.exp,
      afgeleide: function (k, a) { return Math.exp(a); },
      venster: [-5, 9, 4, -2.5], aGrens: [-4, 3], x0: 1.5,
      term0: function (k) { return { teken: 1, tex: metFaculteit(k) }; }
    },
    sin: {
      knoptex: "\\sin x", tex: "\\sin x", tekst: "sin x",
      f: Math.sin,
      afgeleide: function (k, a) {
        return [Math.sin(a), Math.cos(a), -Math.sin(a), -Math.cos(a)][k % 4];
      },
      venster: [-7.5, 3.4, 7.5, -2.6], aGrens: [-7, 7], x0: 2.5,
      term0: function (k) {
        if (k % 2 === 0) return null;
        return { teken: ((k - 1) / 2) % 2 === 0 ? 1 : -1, tex: metFaculteit(k) };
      }
    },
    cos: {
      knoptex: "\\cos x", tex: "\\cos x", tekst: "cos x",
      f: Math.cos,
      afgeleide: function (k, a) {
        return [Math.cos(a), -Math.sin(a), -Math.cos(a), Math.sin(a)][k % 4];
      },
      venster: [-7.5, 3.4, 7.5, -2.6], aGrens: [-7, 7], x0: 2.5,
      term0: function (k) {
        if (k % 2 === 1) return null;
        return { teken: (k / 2) % 2 === 0 ? 1 : -1, tex: metFaculteit(k) };
      }
    },
    ln: {
      knoptex: "\\ln(1+x)", tex: "\\ln(1+x)", tekst: "ln(1+x)",
      f: function (x) { return x > -1 ? Math.log(1 + x) : NaN; },
      afgeleide: function (k, a) {
        if (k === 0) return Math.log(1 + a);
        return (k % 2 === 1 ? 1 : -1) * FAC[k - 1] / Math.pow(1 + a, k);
      },
      venster: [-1.6, 3.4, 5.5, -3.2], aGrens: [-0.8, 5], x0: 1.5,
      term0: function (k) {
        if (k === 0) return null;
        return { teken: k % 2 === 1 ? 1 : -1, tex: k === 1 ? "x" : breuk(1, k, k) };
      }
    },
    meetkundig: {
      knoptex: "1/(1-x)", tex: "\\frac{1}{1-x}", tekst: "1/(1−x)",
      f: function (x) { return Math.abs(1 - x) < 0.01 ? NaN : 1 / (1 - x); },
      afgeleide: function (k, a) { return FAC[k] / Math.pow(1 - a, k + 1); },
      venster: [-3.2, 6.5, 3.2, -3.5], aGrens: [-3, 0.7], x0: -0.6,
      term0: function (k) { return { teken: 1, tex: k === 0 ? "1" : breuk(1, 1, k) }; }
    },
    wortel: {
      knoptex: "\\sqrt{1+x}", tex: "\\sqrt{1+x}", tekst: "√(1+x)",
      f: function (x) { return x >= -1 ? Math.sqrt(1 + x) : NaN; },
      afgeleide: function (k, a) {
        var p = 1;
        for (var j = 0; j < k; j++) p *= 0.5 - j;
        return p * Math.pow(1 + a, 0.5 - k);
      },
      venster: [-1.6, 3.8, 7, -1.6], aGrens: [-0.8, 6.5], x0: 3,
      term0: function (k) {
        if (k === 0) return { teken: 1, tex: "1" };
        var c = WORTEL[k];
        return { teken: c[0] > 0 ? 1 : -1, tex: breuk(Math.abs(c[0]), c[1], k) };
      }
    }
  };

  // Schrijft een som van termen {teken, tex} als TeX. Bij meer dan vijf
  // termen blijven de eerste drie en de laatste staan, met \cdots ertussen.
  function somTex(termen) {
    if (!termen.length) return "0";
    var getoond = termen;
    if (termen.length > 5) {
      getoond = termen.slice(0, 3).concat([{ teken: 1, tex: "\\cdots" }], termen.slice(-1));
    }
    return getoond.map(function (t, i) {
      if (i === 0) return (t.teken < 0 ? "-" : "") + t.tex;
      return (t.teken < 0 ? " - " : " + ") + t.tex;
    }).join("");
  }

  /* --- Inzoomen op e^x ------------------------------------------------------ */

  // De grafiek van e^x met haar raaklijn 1 + x in (0, 1) en, op vraag, de
  // parabool 1 + x + x^2/2. Bij elke zoomstap halveert het venster. De
  // afstand tussen grafiek en raaklijn wordt dan vier keer kleiner, dus
  // tegenover het venster twee keer kleiner: de grafiek lijkt steeds rechter.
  // Bij de parabool gaat dat nog sneller (acht keer kleiner per stap).
  G.registreer("inzoomen", function (ctx) {
    var BREEDTE = 2, MAXSTAP = 7;
    var stap = 0, parabool = false;

    function halveBreedte() { return BREEDTE / Math.pow(2, stap); }
    function venster() {
      var b = halveBreedte();
      return [-b, 1 + 1.6 * b, b, 1 - 0.8 * b];
    }

    var bord = ctx.maakBord({ begrenzing: venster() });

    function raaklijn(x) { return 1 + x; }
    function benadering(x) { return 1 + x + x * x / 2; }

    ctx.stijl(bord.create("functiongraph", [Math.exp], opties({ strokeWidth: 3 })), "kromme");
    ctx.stijl(bord.create("functiongraph", [raaklijn], opties({ strokeWidth: 2 })), "raaklijn");
    var paraboolGraf = ctx.stijl(bord.create("functiongraph", [benadering],
      opties({ strokeWidth: 2, dash: 2, visible: false })), "secante");

    ctx.stijl(bord.create("point", [0, 1], opties({
      name: "", size: 4, showInfobox: false })), "punt");

    // De namen staan rechts in het venster, telkens op dezelfde plaats
    // tegenover het venster, met een kleine verschuiving in pixels.
    function naam(tekst, x, y, dy, rol, zichtbaar) {
      return ctx.stijl(bord.create("text", [
        x,
        function () { return y() + dy / bord.unitY; },
        tekst
      ], opties({ anchorX: "middle", anchorY: "middle", fontSize: 15,
                  display: "html", useMathJax: false,
                  visible: zichtbaar === undefined ? true : zichtbaar })), rol);
    }
    naam("f", function () { return -0.75 * halveBreedte(); },
      function () { return Math.exp(-0.75 * halveBreedte()); }, 16, "kromme");
    naam("t", function () { return 0.8 * halveBreedte(); },
      function () { return raaklijn(0.8 * halveBreedte()); }, -16, "raaklijn");
    var paraboolNaam = naam(label(function () { return "P_2"; },
      function () { return "P2"; }), function () { return -0.5 * halveBreedte(); },
      function () { return benadering(-0.5 * halveBreedte()); }, -18, "secante", false);

    function getal(x) { return klein(ctx, x); }

    // We meten halfweg naar de rand van het venster, waar de grafiek nog in
    // beeld staat: in x = b/2 is de afstand tot de raaklijn e^(b/2) - 1 - b/2.
    function werkBij() {
      var b = halveBreedte(), hoogte = 2.4 * b, x = b / 2;
      var d1 = Math.exp(x) - raaklijn(x);
      var d2 = Math.exp(x) - benadering(x);
      var tekst = "Venster: x van " + getal(-b) + " tot " + getal(b) +
        ". In x = " + getal(x) + " ligt eˣ " + getal(d1) + " boven de raaklijn" +
        " (" + ctx.getal(100 * d1 / hoogte, 3) + "% van de hoogte van het venster)";
      if (parabool) {
        tekst += " en " + getal(d2) + " boven de parabool (" +
          ctx.getal(100 * d2 / hoogte, 4) + "%)";
      }
      ctx.toon(tekst + ".");
    }

    function zoom() {
      var v = venster();
      bord.presBegrenzing = v.slice();
      bord.setBoundingBox(v, false);
      bord.update();
      werkBij();
    }

    ctx.knop("Inzoomen", function () {
      if (stap < MAXSTAP) { stap++; zoom(); }
    });
    ctx.knop("Uitzoomen", function () {
      if (stap > 0) { stap--; zoom(); }
    });
    var knopParabool = ctx.knop("Parabool tonen", function (knop) {
      parabool = !parabool;
      paraboolGraf.setAttribute({ visible: parabool });
      paraboolNaam.setAttribute({ visible: parabool });
      knopAan(knop, parabool, "Parabool verbergen", "Parabool tonen");
      bord.update();
      werkBij();
    });
    knopAan(knopParabool, false);

    function herstel() {
      stap = 0;
      parabool = false;
      paraboolGraf.setAttribute({ visible: false });
      paraboolNaam.setAttribute({ visible: false });
      knopAan(knopParabool, false, "Parabool verbergen", "Parabool tonen");
      zoom();
    }

    werkBij();
    return { reset: herstel };
  });

  /* --- Hoogte, helling en kromming ----------------------------------------- */

  G.registreer("drie-voorwaarden", function (ctx) {
    var stap = 0;
    var bord = ctx.maakBord({ begrenzing: [-1.6, 4.8, 1.6, -0.7] });
    var knoppen = [];
    var voorschriften = ["1", "1+x", "1+x+\\frac{x^2}{2}"];
    var uitleg = [
      "P(0) = f(0) = 1: dezelfde hoogte. De horizontale lijn volgt de stijging nog niet.",
      "Ook P′(0) = f′(0) = 1: dezelfde helling. P is de raaklijn, maar buigt niet mee.",
      "Ook P″(0) = f″(0) = 1: dezelfde tweede afgeleide. De parabool volgt de buiging rond 0."
    ];
    function benadering(x) {
      return 1 + (stap >= 1 ? x : 0) + (stap === 2 ? x * x / 2 : 0);
    }
    ctx.stijl(bord.create("functiongraph", [Math.exp], opties({ strokeWidth: 3 })), "kromme");
    ctx.stijl(bord.create("functiongraph", [benadering], opties({ strokeWidth: 3 })), "secante");
    var raaklijn = ctx.stijl(bord.create("functiongraph", [function (x) { return 1 + x; }],
      opties({ strokeWidth: 1.5, dash: 2, visible: false })), "raaklijn");
    ctx.stijl(bord.create("point", [0, 1], opties({ name: "(0, 1)", size: 4,
      showInfobox: false, label: { offset: [8, -16] } })), "punt");
    ctx.stijl(bord.create("text", [0.95, 3.6, "f"], opties({ fontSize: 18 })), "kromme");
    ctx.stijl(bord.create("text", [-1.2, function () { return benadering(-1.2) + 0.25; }, "P"],
      opties({ fontSize: 18 })), "secante");
    formule(ctx, bord, function () {
      return ["f(x)=e^x,\\qquad P(x)=" + voorschriften[stap],
        "f(x) = eˣ, P(x) = " + ["1", "1+x", "1+x+x²/2"][stap]];
    });
    function kies(n) {
      stap = n;
      raaklijn.setAttribute({ visible: stap === 2 });
      knoppen.forEach(function (knop, i) { knopAan(knop, i === stap); });
      bord.update();
      ctx.toon(uitleg[stap] + (stap === 2 ? " De stippellijn is de raaklijn." : ""));
    }
    ["1. Hoogte", "2. Helling", "3. Kromming"].forEach(function (tekst, i) {
      knoppen.push(ctx.knop(tekst, function () { kies(i); }));
    });
    kies(0);
    return { reset: function () { kies(0); } };
  });

  /* --- Taylorpolynomen verkennen ------------------------------------------- */

  // Een functie naar keuze met haar Taylorpolynoom P_n rond a. De leerling
  // kiest n met twee knoppen, versleept a over de x-as en versleept x om in
  // één punt f(x) en P_n(x) te vergelijken; het verschil staat als een dik
  // verticaal stuk tussen de twee grafieken. Bovenaan staat P_n als formule:
  // exact rond a = 0, met afgeronde coëfficiënten rond een ander punt.
  G.registreer("taylor-verkenner", function (ctx) {
    var BEGIN = "sin", BEGIN_N = 3, MAXN = 14;
    var F = FUNCTIES[BEGIN], n = BEGIN_N, a = 0;
    var coef = [];

    var bord = ctx.maakBord({ begrenzing: F.venster.slice(), raster: true });

    function herbereken() {
      coef = [];
      for (var k = 0; k <= n; k++) coef.push(F.afgeleide(k, a) / FAC[k]);
    }
    function P(x) {
      var s = 0;
      for (var k = n; k >= 0; k--) s = s * (x - a) + coef[k];
      return s;
    }
    function f(x) { return F.f(x); }
    herbereken();

    ctx.stijl(bord.create("functiongraph", [f], opties({ strokeWidth: 3.5 })), "kromme");
    ctx.stijl(bord.create("functiongraph", [P], opties({ strokeWidth: 2.5 })), "raaklijn");

    // a: een punt op de x-as, en het punt van de grafiek erboven.
    var A = ctx.stijl(bord.create("point", [a, 0], {
      name: "a", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [-4, -18] }
    }), "punt");
    ctx.stijl(bord.create("point", [function () { return a; }, function () { return f(a); }],
      opties({ name: "", size: 4, showInfobox: false })), "punt");
    ctx.stijl(bord.create("segment", [[function () { return a; }, 0],
      [function () { return a; }, function () { return f(a); }]],
      opties({ strokeWidth: 1, dash: 2 })), "zwak");

    // x: een punt op de x-as, met f(x) en P_n(x) erboven.
    var Q = ctx.stijl(bord.create("point", [F.x0, 0], {
      name: "x", size: 4, showInfobox: false, precision: GRIJP,
      label: { offset: [6, -16] }
    }), "secante");
    function qx() { return Q.X(); }
    function fq() { var y = f(qx()); return isFinite(y) ? y : 0; }
    ctx.stijl(bord.create("segment", [[qx, 0], [qx, function () {
      var y = P(qx());
      return Math.abs(y) > Math.abs(fq()) ? y : fq();
    }]], opties({ strokeWidth: 1, dash: 2 })), "zwak");
    ctx.stijl(bord.create("segment", [[qx, fq], [qx, function () { return P(qx()); }]],
      opties({ strokeWidth: 4 })), "secante");
    ctx.stijl(bord.create("point", [qx, fq], opties({
      name: "", size: 3, showInfobox: false,
      visible: function () { return isFinite(f(qx())); } })), "kromme");
    ctx.stijl(bord.create("point", [qx, function () { return P(qx()); }], opties({
      name: "", size: 3, showInfobox: false })), "raaklijn");
    // f links van x, P_n rechts ervan: zo vallen ze niet op elkaar als de
    // twee waarden dicht bij elkaar liggen.
    ctx.stijl(bord.create("text", [
      function () { return qx() - 8 / bord.unitX; }, fq,
      label(function () { return "f"; }, function () { return "f"; })
    ], opties({ anchorX: "right", anchorY: "middle", display: "html", useMathJax: false,
                visible: function () { return isFinite(f(qx())); } })), "kromme");
    ctx.stijl(bord.create("text", [
      function () { return qx() + 8 / bord.unitX; },
      function () { return P(qx()); },
      label(function () { return "P_{" + n + "}"; }, function () { return "P" + n; })
    ], opties({ anchorX: "left", anchorY: "middle", display: "html", useMathJax: false })),
      "raaklijn");

    function onder(getal) {
      return String(getal).replace(/\d/g, function (c) { return "₀₁₂₃₄₅₆₇₈₉"[+c]; });
    }

    function termen() {
      var lijst = [];
      for (var k = 0; k <= n; k++) {
        if (a === 0) {
          var t = F.term0(k);
          if (t) lijst.push(t);
          continue;
        }
        var c = coef[k];
        if (Math.abs(c) < 1e-12) continue;
        var basis = a > 0 ? "(x-" + ctx.getal(a, 1) + ")" : "(x+" + ctx.getal(-a, 1) + ")";
        var macht = k === 0 ? "" : k === 1 ? basis : basis + "^{" + k + "}";
        var g = Math.abs(c);
        var getal = g >= 0.001 ? ctx.getal(g, 3)
          : g.toExponential(1).replace(/e([-+]\d+)/, function (m, e) {
              return "\\cdot 10^{" + Number(e) + "}";
            });
        var tex = k === 0 ? getal
          : Math.abs(g - 1) < 1e-9 ? macht : getal + "\\," + macht;
        lijst.push({ teken: c < 0 ? -1 : 1, tex: tex });
      }
      return lijst;
    }

    formule(ctx, bord, function () {
      var tex = "f(x) = " + F.tex + "\\qquad P_{" + n + "}(x) = " + somTex(termen());
      return [tex, "f(x) = " + F.tekst + ", n = " + n + ", a = " + ctx.getal(a, 1)];
    });

    function binnen(x, grens) { return Math.max(grens[0], Math.min(grens[1], x)); }

    function zetA(x) {
      x = binnen(Math.round(x * 10) / 10, F.aGrens);
      if (Math.abs(x) < 1e-9) x = 0;
      a = x;
      A.setPositionDirectly(window.JXG.COORDS_BY_USER, [a, 0]);
      herbereken();
    }
    function zetQ(x) {
      var v = F.venster;
      Q.setPositionDirectly(window.JXG.COORDS_BY_USER,
        [binnen(x, [v[0] + 0.2, v[2] - 0.2]), 0]);
    }

    A.on("drag", function () { zetA(A.X()); bord.update(); });
    Q.on("drag", function () { zetQ(Q.X()); bord.update(); });

    function werkBij() {
      if (toonGraad) toonGraad(n);
      var x = qx(), y = f(x), p = P(x);
      var tekst = "f(x) = " + F.tekst + "; Taylorpolynoom van graad n = " + n +
        " rond a = " + ctx.getal(a, 1) + ". In x = " + ctx.getal(x, 2) + ": ";
      if (!isFinite(y)) {
        tekst += "f(x) bestaat niet, P" + onder(n) + "(x) = " + ctx.getal(p, 4) + ".";
      } else {
        tekst += "f(x) = " + ctx.getal(y, 4) + ", P" + onder(n) + "(x) = " +
          ctx.getal(p, 4) + ", fout f(x) − P" + onder(n) + "(x) = " + klein(ctx, y - p) + ".";
      }
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);

    var toonGraad = graadKiezer(ctx, MAXN, function () {
      if (n > 0) { n--; herbereken(); bord.update(); }
    }, function () {
      if (n < MAXN) { n++; herbereken(); bord.update(); }
    });

    var kiezer = null;
    function kies(nieuw) {
      F = FUNCTIES[nieuw];
      if (kiezer) kiezer.zet(nieuw);
      bord.presBegrenzing = F.venster.slice();
      bord.setBoundingBox(F.venster, false);
      zetA(0);
      zetQ(F.x0);
      bord.update();
    }
    kiezer = functieKiezer(ctx, "f =", FUNCTIES, kies);

    function herstel() {
      n = BEGIN_N;
      kies(BEGIN);
    }
    kies(BEGIN);

    return { reset: herstel };
  });

  /* --- Convergentie van een Taylorreeks ------------------------------------ */

  // Deze grafiek hoort bij het deel over Taylorreeksen dat in de bron na
  // \end{document} staat. Zolang dat deel niet meedoet, gebruikt geen
  // pagina haar; ze blijft hier klaarstaan.

  // De partiële sommen P_n van een Taylorreeks rond 0 naast de functie. Het
  // gekleurde vlak is het convergentie-interval: daar kruipt P_n bij
  // stijgende n tegen de grafiek, daarbuiten zwaait P_n steeds wilder. Bij
  // 1/(1+x^2) valt op dat de functie zelf overal glad is, en de reeks toch
  // enkel tussen -1 en 1 convergeert.
  var REEKSEN = {
    meetkundig: {
      knoptex: "1/(1-x)", tekst: "1/(1−x)",
      tex: "\\frac{1}{1-x} = 1 + x + x^2 + x^3 + \\cdots",
      f: FUNCTIES.meetkundig.f,
      c: function () { return 1; },
      interval: [-1, 1], uitleg: "−1 < x < 1",
      venster: [-1.8, 6.5, 1.8, -3], x0: 0.5
    },
    ln: {
      knoptex: "\\ln(1+x)", tekst: "ln(1+x)",
      tex: "\\ln(1+x) = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\cdots",
      f: FUNCTIES.ln.f,
      c: function (k) { return k === 0 ? 0 : (k % 2 === 1 ? 1 : -1) / k; },
      interval: [-1, 1], uitleg: "−1 < x ≤ 1",
      venster: [-1.6, 2.6, 2.2, -3.2], x0: 0.8
    },
    lorentz: {
      knoptex: "1/(1+x^2)", tekst: "1/(1+x²)",
      tex: "\\frac{1}{1+x^2} = 1 - x^2 + x^4 - x^6 + \\cdots",
      f: function (x) { return 1 / (1 + x * x); },
      c: function (k) { return k % 2 === 1 ? 0 : ((k / 2) % 2 === 0 ? 1 : -1); },
      interval: [-1, 1], uitleg: "−1 < x < 1",
      venster: [-2.4, 2.4, 2.4, -1.2], x0: 0.6
    },
    exp: {
      knoptex: "e^x", tekst: "eˣ",
      tex: "e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots",
      f: Math.exp,
      c: function (k) { return 1 / FAC[k]; },
      interval: null, uitleg: "elke x",
      venster: [-7, 9, 4, -4], x0: -4
    }
  };

  G.registreer("convergentie", function (ctx) {
    var BEGIN = "meetkundig", BEGIN_N = 2, MAXN = 40, TEMPO = 450;
    var R = REEKSEN[BEGIN], n = BEGIN_N, klok = null;

    var bord = ctx.maakBord({ begrenzing: R.venster.slice() });

    function grenzen() {
      var bb = bord.getBoundingBox();
      if (!R.interval) return [bb[0], bb[2]];
      return [Math.max(bb[0], R.interval[0]), Math.min(bb[2], R.interval[1])];
    }
    function hoek(i, j) {
      return [function () { return grenzen()[i]; },
              function () { return bord.getBoundingBox()[j]; }];
    }
    var vlak = bord.create("polygon", [hoek(0, 1), hoek(1, 1), hoek(1, 3), hoek(0, 3)], {
      fixed: true, highlight: false, hasInnerPoints: false,
      fillColor: ctx.kleur("afgeleide"), fillOpacity: 0.14,
      borders: { visible: false }, vertices: { visible: false }
    });

    // De randen van het interval, gestreept.
    [0, 1].forEach(function (i) {
      ctx.stijl(bord.create("segment", [
        [function () { return R.interval ? R.interval[i] : NaN; },
         function () { return bord.getBoundingBox()[1]; }],
        [function () { return R.interval ? R.interval[i] : NaN; },
         function () { return bord.getBoundingBox()[3]; }]
      ], opties({ strokeWidth: 1.5, dash: 2,
                  visible: function () { return Boolean(R.interval); } })), "afgeleide");
    });

    function f(x) { return R.f(x); }
    function P(x) {
      var s = 0;
      for (var k = n; k >= 0; k--) s = s * x + R.c(k);
      return s;
    }

    ctx.stijl(bord.create("functiongraph", [f], opties({ strokeWidth: 3.5 })), "kromme");
    ctx.stijl(bord.create("functiongraph", [P], opties({ strokeWidth: 2.5 })), "raaklijn");

    var Q = ctx.stijl(bord.create("point", [R.x0, 0], {
      name: "x", size: 4, showInfobox: false, precision: GRIJP,
      label: { offset: [6, -16] }
    }), "secante");
    function qx() { return Q.X(); }
    function fq() { var y = f(qx()); return isFinite(y) ? y : 0; }
    ctx.stijl(bord.create("segment", [[qx, fq], [qx, function () { return P(qx()); }]],
      opties({ strokeWidth: 4 })), "secante");
    ctx.stijl(bord.create("point", [qx, function () { return P(qx()); }], opties({
      name: "", size: 3, showInfobox: false })), "raaklijn");

    formule(ctx, bord, function () {
      return [R.tex + "\\qquad n = " + n, R.tekst + ", n = " + n];
    });

    Q.on("drag", function () {
      var v = R.venster;
      Q.setPositionDirectly(window.JXG.COORDS_BY_USER,
        [Math.max(v[0] + 0.1, Math.min(v[2] - 0.1, Q.X())), 0]);
      bord.update();
    });

    function werkBij() {
      if (toonGraad) toonGraad(n);
      var x = qx(), y = f(x), p = P(x);
      var tekst = "f(x) = " + R.tekst + "; de reeks convergeert voor " + R.uitleg +
        ". n = " + n + ". In x = " + ctx.getal(x, 2) + ": P(x) = " +
        (Math.abs(p) < 1e6 ? ctx.getal(p, 5) : p.toExponential(2));
      tekst += isFinite(y) ? ", f(x) = " + ctx.getal(y, 5) + "." : ", f(x) bestaat niet.";
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);

    function stop() {
      if (klok) { clearInterval(klok); klok = null; }
      knopAan(speel, false, "Pauzeren", "Afspelen");
    }

    var toonGraad = graadKiezer(ctx, MAXN,
      function () { stop(); if (n > 0) { n--; bord.update(); } },
      function () { stop(); if (n < MAXN) { n++; bord.update(); } });
    var speel = ctx.knop("Afspelen", function () {
      if (klok) { stop(); return; }
      if (n >= MAXN) n = 0;
      knopAan(speel, true, "Pauzeren", "Afspelen");
      klok = setInterval(function () {
        if (n >= MAXN) { stop(); return; }
        n++;
        bord.update();
      }, TEMPO);
    });
    knopAan(speel, false);

    var kiezer = null;
    function kies(nieuw) {
      stop();
      R = REEKSEN[nieuw];
      if (kiezer) kiezer.zet(nieuw);
      bord.presBegrenzing = R.venster.slice();
      bord.setBoundingBox(R.venster, false);
      Q.setPositionDirectly(window.JXG.COORDS_BY_USER, [R.x0, 0]);
      bord.update();
    }
    kiezer = functieKiezer(ctx, "f =", REEKSEN, kies);

    function herstel() {
      n = BEGIN_N;
      kies(BEGIN);
    }
    kies(BEGIN);

    return {
      reset: herstel,
      vernietig: stop,
      kleur: function (kleuren) {
        vlak.setAttribute({ fillColor: (kleuren || ctx.kleuren()).afgeleide });
      }
    };
  });
})();
