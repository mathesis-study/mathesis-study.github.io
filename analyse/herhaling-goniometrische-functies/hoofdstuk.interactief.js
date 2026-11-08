/* Interactieve grafieken bij X_A09_InteractieveHerhalingGoniometrischeFuncties.tex.
 *
 * Een zelfstudiehoofdstuk dat de kern van A09 herhaalt. Elke definitie hoort
 * bij één omgeving interactievegrafiek uit de cursus en draagt dezelfde naam
 * als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert het bord, de kleuren per rol, de
 * getalnotatie, de tekstregel met de actuele waarden en de knoppen.
 *
 * Bovenaan staan de bouwstenen die meerdere grafieken delen: hoeken als
 * breuk van pi, een x-as in stappen van pi/2, schuifregelaars onder het bord
 * en de goniometrische cirkel naast de grafiek.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var PI = Math.PI;
  var GRIJP = { touch: 30, mouse: 6 };           // ruim aanraakgebied
  var EPS = 1e-9;

  function opties(extra) {
    var o = { fixed: true, highlight: false };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  /* --- Getallen en hoeken als tekst --------------------------------------- */

  function ggd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  // Een hoek als veelvoud van pi/12 ("5π/6", "−π/3", "2π"), en anders als
  // decimaal getal. Alle bijzondere waarden van dit hoofdstuk zijn zulke
  // veelvouden.
  function piTekst(ctx, x) {
    var k = Math.round(x * 12 / PI);
    if (Math.abs(x - k * PI / 12) > 1e-6) return ctx.getal(x, 2);
    if (k === 0) return "0";
    var g = ggd(k, 12);
    var t = k / g, n = 12 / g;
    var teller = (t < 0 ? "−" : "") + (Math.abs(t) === 1 ? "" : Math.abs(t)) + "π";
    return n === 1 ? teller : teller + "/" + n;
  }

  // Een decimaal getal met een echt minteken.
  function getalTekst(ctx, x, decimalen) {
    var tekst = ctx.getal(x, decimalen === undefined ? 2 : decimalen);
    return tekst.replace(/^-/, "−");
  }

  /* --- Formules met MathJax ---------------------------------------------- */

  // Een formule als SVG van MathJax, om in een tekst op het bord te zetten,
  // inline en in displaystijl (een display-formule laat de presentatielaag
  // de randen van de slide opnieuw meten). Zolang MathJax er niet is, komt
  // de tekstversie; die wordt niet onthouden, zodat de volgende update het
  // opnieuw probeert.
  // Met krimp = false behoudt de formule haar grootte en schuift haar blok
  // horizontaal als ze te breed is (een uitwerking die niet mag verspringen).
  function maakTex(grootte, krimp) {
    var cache = {};
    return function (tex, tekst) {
      if (cache[tex]) return cache[tex];
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        // interactieve-grafieken.css zet elke tekst op het bord op .82rem;
        // een formule moet groter, dus krijgt ze een eigen span. Op een smal
        // bord krimpt de SVG mee met de plaats die ze krijgt (max-width).
        var svg = mj.tex2svg("\\displaystyle " + tex, { display: false }).querySelector("svg");
        if (krimp !== false) {
          svg.style.maxWidth = "100%";
          svg.style.height = "auto";
        }
        cache[tex] = '<span style="font-size:' + (grootte || "1.25rem") + '">' +
          svg.outerHTML + "</span>";
      } catch (e) {
        return tekst;
      }
      return cache[tex];
    };
  }

  // Een formule bovenaan het bord, met y de bovenrand in coördinaten van het
  // bord. Rechtsboven liggen Groot en Reset (RESERVE px). Op een breed bord
  // staat de formule in het midden; op een smal bord begint ze links, vanaf
  // x = links (of de linkerrand) en krimpt ze tot ze voor de knoppen past.
  var RESERVE = 88, BREED = 560;
  function formule(ctx, bord, y, inhoud, links) {
    var tex = maakTex();
    function plaats() {
      var W = bord.canvasWidth, bb = bord.getBoundingBox();
      if (W >= BREED) return { van: RESERVE, breedte: W - 2 * RESERVE, midden: true };
      var van = links === undefined ? 8 : Math.max(8, (links - bb[0]) * bord.unitX);
      return { van: van, breedte: Math.max(40, W - RESERVE - van), midden: false };
    }
    return ctx.stijl(bord.create("text", [
      function () { return bord.getBoundingBox()[0] + plaats().van / bord.unitX; },
      y,
      function () {
        var p = plaats(), f = inhoud();
        return '<div style="width:' + Math.floor(p.breedte) + "px;text-align:" +
          (p.midden ? "center" : "left") + '">' + tex(f[0], f[1]) + "</div>";
      }
    ], opties({ anchorX: "left", anchorY: "top" })), "tekst");
  }

  /* --- Assen in stappen van pi/2 ------------------------------------------ */

  // De standaardassen van de runtime zetten om de eenheid een streepje. Bij
  // goniometrische functies lezen we de x-as in stappen van pi/2, dus tekenen
  // we de assen hier zelf.
  function assenPi(ctx, bord, x0, x1, y0, y1, yWaarden, xVan, xTot) {
    ctx.stijl(bord.create("arrow", [[x0, 0], [x1, 0]], opties({ strokeWidth: 1.2 })), "as");
    ctx.stijl(bord.create("arrow", [[0, y0], [0, y1]], opties({ strokeWidth: 1.2 })), "as");
    ctx.stijl(bord.create("text", [x1 - 0.1, -0.12, "x"], opties({
      anchorX: "right", anchorY: "top", cssClass: "grafiek-aslabel", fontSize: 14 })), "tekst");
    ctx.stijl(bord.create("text", [0.12, y1 - 0.1, "y"], opties({
      anchorY: "top", cssClass: "grafiek-aslabel", fontSize: 14 })), "tekst");
    var hoogte = (y1 - y0) / 60;
    for (var k = Math.ceil(xVan / (PI / 2)); k * PI / 2 <= xTot + EPS; k++) {
      if (k === 0) continue;
      var x = k * PI / 2;
      ctx.stijl(bord.create("segment", [[x, -hoogte], [x, hoogte]],
        opties({ strokeWidth: 1.2 })), "as");
      ctx.stijl(bord.create("text", [x, -4 * hoogte, piTekst(ctx, x)], opties({
        anchorX: "middle", anchorY: "top", fontSize: 13 })), "tekst");
    }
    var breedte = (x1 - x0) / 150;
    (yWaarden || []).forEach(function (y) {
      ctx.stijl(bord.create("segment", [[-breedte, y], [breedte, y]],
        opties({ strokeWidth: 1.2 })), "as");
      ctx.stijl(bord.create("text", [-3 * breedte, y, getalTekst(ctx, y)], opties({
        anchorX: "right", anchorY: "middle", fontSize: 13 })), "tekst");
    });
  }

  /* --- Schuifregelaars --------------------------------------------------- */

  // Een rij schuifregelaars onder het bord, in de vormgeving van de
  // schuifregelaar onder een Asymptote-figuur (.pres-figuurschuif). De rij
  // staat voor de tekstregel en de knoppen, zodat ze vlak onder de tekening
  // hangt. vernietig() haalt ze weer weg.
  function schuifrij(ctx) {
    var rij = document.createElement("div");
    rij.className = "herhaling-schuiven";
    rij.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;" +
      "gap:0 1rem;margin-top:.5rem";
    var uitleg = ctx.figuur.querySelector(".interactieve-grafiek-uitleg");
    var na = ctx.element.nextSibling;
    ctx.figuur.insertBefore(rij, na && na !== uitleg ? na : uitleg);
    return rij;
  }

  // spec: naam, waarden (lijst), tekst(waarde), index (begin).
  function schuif(rij, spec, bij) {
    var label = document.createElement("label");
    label.className = "pres-figuurschuif";
    label.style.margin = ".25rem 0";
    label.addEventListener("click", function (e) { e.stopPropagation(); });
    var naam = document.createElement("span");
    naam.className = "pres-figuurschuif-naam";
    naam.textContent = spec.naam;
    var invoer = document.createElement("input");
    invoer.type = "range";
    invoer.min = "0";
    invoer.step = "1";
    invoer.setAttribute("aria-label", spec.label || spec.naam);
    var waarde = document.createElement("output");
    waarde.style.minWidth = "3.2em";
    label.appendChild(naam);
    label.appendChild(invoer);
    label.appendChild(waarde);
    rij.appendChild(label);

    var lijst = spec.waarden;
    function toon() {
      var i = Number(invoer.value);
      waarde.textContent = "= " + spec.tekst(lijst[i]);
      invoer.setAttribute("aria-valuetext", spec.naam + " = " + spec.tekst(lijst[i]));
    }
    invoer.addEventListener("input", function () { toon(); bij(); });
    var api = {
      waarde: function () { return lijst[Number(invoer.value)]; },
      index: function () { return Number(invoer.value); },
      zetLijst: function (nieuw, index) {
        lijst = nieuw;
        invoer.max = String(lijst.length - 1);
        invoer.value = String(index);
        toon();
      },
      zet: function (index) { invoer.value = String(index); toon(); },
      zetWaarde: function (w) {
        var beste = 0;
        lijst.forEach(function (v, i) {
          if (Math.abs(v - w) < Math.abs(lijst[beste] - w)) beste = i;
        });
        api.zet(beste);
      }
    };
    api.zetLijst(lijst, spec.index || 0);
    return api;
  }

  function reeks(van, tot, stap) {
    var uit = [];
    var n = Math.round((tot - van) / stap);
    for (var i = 0; i <= n; i++) uit.push(van + i * stap);
    return uit;
  }

  // Een groep knoppen waarvan er één tegelijk ingedrukt is.
  function keuzeknoppen(ctx, lijst, begin, bij) {
    var knoppen = lijst.map(function (keuze) {
      return ctx.knop(keuze.opschrift, function () { kies(keuze.waarde); bij(keuze.waarde); });
    });
    function kies(waarde) {
      lijst.forEach(function (keuze, i) {
        knoppen[i].setAttribute("aria-pressed", String(keuze.waarde === waarde));
      });
    }
    kies(begin);
    return kies;
  }

  /* --- De goniometrische functies ------------------------------------------ */

  // tan en cot bestaan niet in hun asymptoten. Math.tan geeft daar een zeer
  // groot getal; NaN laat JSXGraph de kromme onderbreken in plaats van een
  // verticale streep te tekenen.
  var FUNCTIES = {
    sin: { naam: "sin", f: Math.sin, periode: 2 * PI, periodeTekst: "2π" },
    cos: { naam: "cos", f: Math.cos, periode: 2 * PI, periodeTekst: "2π" },
    tan: {
      naam: "tan", periode: PI, periodeTekst: "π",
      f: function (x) { return Math.abs(Math.cos(x)) < 2e-3 ? NaN : Math.tan(x); }
    }
  };

  // De hoek van een punt op de cirkel met middelpunt (cx, 0), in [0, 2π[.
  function hoekVan(P, cx) {
    var h = Math.atan2(P.Y(), P.X() - cx);
    return h < 0 ? h + 2 * PI : h;
  }

  function knip(y, grens) {
    if (!isFinite(y)) return NaN;
    return Math.max(-grens, Math.min(grens, y));
  }

  /* --- 1. Periode: de grafiek valt samen met een verschoven kopie --------- */

  // Een periodieke functie met periode 4, amplitude 2 en evenwichtsstand
  // y = 3. De leerling schuift een kopie van de grafiek over s eenheden naar
  // rechts. Valt de kopie samen met de grafiek, dan is f(x - s) = f(x): s is
  // een veelvoud van de periode, en de kleinste zo'n s is de periode zelf.
  G.registreer("herhaling-periode", function (ctx) {
    var P = 4, A = 2, D = 3, BEGIN_S = 1.5, MAX_S = 9;
    function f(x) { return D + A * Math.sin(PI / 2 * (x - 1)); }

    var bord = ctx.maakBord({ begrenzing: [-0.8, 7.8, 12.8, -1.1] });

    ctx.stijl(bord.create("functiongraph", [f, -0.8, 12.8],
      opties({ strokeWidth: 2.5 })), "kromme");
    var spoor = bord.create("segment", [[0, 0], [MAX_S, 0]], { visible: false, fixed: true });
    var S = ctx.stijl(bord.create("glider", [BEGIN_S, 0, spoor], {
      name: "s", size: 5, showInfobox: false, precision: GRIJP,
      label: { offset: [6, 14] }
    }), "punt");
    function s() { return S.X(); }
    function valtSamen() {
      var v = s(), k = Math.round(v / P);
      return v > 1e-6 && k >= 1 && Math.abs(v - k * P) < 1e-6;
    }

    // Bovenaan het bord (zie formule), met de echte
    // waarde van s: f(x+1.5) ≠ f(x), of f(x+4) = f(x) als de kopie samenvalt.
    // Valt ze samen, dan staat eronder of s de periode is: P = 4 bij de
    // kleinste zo'n s, P ≠ 8 bij een veelvoud, want 4 is kleiner.
    formule(ctx, bord, 7.65, function () {
      var w = ctx.getal(s(), 2);
      if (!valtSamen()) return ["f(x+" + w + ")\\neq f(x)", "f(x + " + w + ") ≠ f(x)"];
      var periode = Math.round(s() / P) === 1;
      var regel = periode ? "P=" + w : "P\\neq " + w;
      return ["\\begin{array}{c}f(x+" + w + ")=f(x)\\\\ " + regel + "\\end{array}",
        "f(x + " + w + ") = f(x), " + (periode ? "P = " : "P ≠ ") + w];
    }, 0.3);
    ctx.stijl(bord.create("functiongraph", [function (x) { return f(x - s()); }, -0.8, 12.8],
      opties({ strokeWidth: 2.5, dash: 2 })), "secante");
    ctx.stijl(bord.create("arrow", [[0, 5.5], [function () { return s(); }, 5.5]],
      opties({ strokeWidth: 2, visible: function () { return s() > 0.2; } })), "punt");

    // Evenwichtsstand, amplitude en periode, elk op vraag met een eigen knop.
    function verborgen(object, rol) {
      object.setAttribute({ visible: false });
      return ctx.stijl(object, rol);
    }
    var hulp = {
      evenwicht: [
        verborgen(bord.create("line", [[0, D], [1, D]], opties({ strokeWidth: 1.5, dash: 3 })), "hulp"),
        verborgen(bord.create("text", [11.0, D + 0.3, "evenwichtsstand y = 3"],
          opties({ anchorX: "middle", fontSize: 13 })), "hulp")
      ],
      amplitude: [
        verborgen(bord.create("arrow", [[2, D], [2, D + A]],
          opties({ strokeWidth: 2, lastArrow: true, firstArrow: true })), "afgeleide"),
        verborgen(bord.create("text", [2.15, D + A / 2, "A = 2"],
          opties({ anchorY: "middle", fontSize: 13 })), "afgeleide")
      ],
      periode: [
        verborgen(bord.create("arrow", [[4, D - A - 0.45], [8, D - A - 0.45]],
          opties({ strokeWidth: 2, lastArrow: true, firstArrow: true })), "afgeleide"),
        verborgen(bord.create("text", [6, D - A - 0.75, "P = 4"],
          opties({ anchorX: "middle", anchorY: "middle", fontSize: 13 })), "afgeleide")
      ]
    };

    function zet(x) {
      x = Math.max(0, Math.min(MAX_S, x));
      // Dicht bij een veelvoud van een halve eenheid klikt de kopie vast,
      // zodat samenvallen ook echt samenvallen is.
      var rond = Math.round(x * 2) / 2;
      if (Math.abs(x - rond) < 0.12) x = rond;
      S.setPositionDirectly(window.JXG.COORDS_BY_USER, [x, 0]);
    }
    S.on("drag", function () { zet(S.X()); bord.update(); });

    function werkBij() {
      var v = s();
      var k = Math.round(v / P);
      var samen = Math.abs(v - k * P) < 1e-6;
      var tekst = "Verschuiving s = " + ctx.getal(v, 2) + ". ";
      if (v < 1e-6) {
        tekst += "Schuif s naar rechts.";
      } else if (samen && k === 1) {
        tekst += "De kopie valt samen met de grafiek: f(x + 4) = f(x). " +
          "De kleinste zo'n verschuiving is de periode: P = 4.";
      } else if (samen) {
        tekst += "Ook hier valt de kopie samen, want " + ctx.getal(v, 0) +
          " is een veelvoud van 4. De periode is wel de kleinste: P = 4.";
      } else {
        tekst += "De kopie valt niet samen met de grafiek.";
      }
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);

    var knoppen = {};
    [["evenwicht", "Evenwichtsstand"], ["amplitude", "Amplitude"], ["periode", "Periode"]]
      .forEach(function (paar) {
        knoppen[paar[0]] = ctx.knop(paar[1], function (knop) {
          zetHulp(paar[0], knop.getAttribute("aria-pressed") !== "true");
        });
      });
    function zetHulp(naam, aan) {
      hulp[naam].forEach(function (o) { o.setAttribute({ visible: aan }); });
      knoppen[naam].setAttribute("aria-pressed", String(aan));
      bord.update();
    }
    function alleUit() { Object.keys(hulp).forEach(function (n) { zetHulp(n, false); }); }
    function herstel() { zet(BEGIN_S); alleUit(); werkBij(); }
    ctx.knop("Beginstand", herstel);
    alleUit();
    werkBij();
    return { reset: herstel };
  });

  /* --- 2. Van de goniometrische cirkel naar de grafiek -------------------- */

  // Links de goniometrische cirkel, rechts de grafiek op [0, 2π]. De leerling
  // versleept P over de cirkel; de waarde van sin, cos of tan wordt op de
  // cirkel als lijnstuk aangeduid en verschijnt rechts als hoogte boven de
  // hoek. Het stuk grafiek van 0 tot de hoek is volledig getekend, de rest
  // staat zwak, zodat je ziet hoe de grafiek uit de cirkel ontstaat.
  var CX = -1.75, GRENS = 2.35;

  function cirkelBasis(ctx, bord) {
    ctx.stijl(bord.create("segment", [[CX - 1.25, 0], [CX + 1.25, 0]],
      opties({ strokeWidth: 1, dash: 2 })), "zwak");
    ctx.stijl(bord.create("segment", [[CX, -1.25], [CX, 1.25]],
      opties({ strokeWidth: 1, dash: 2 })), "zwak");
    return ctx.stijl(bord.create("circle", [[CX, 0], 1],
      opties({ strokeWidth: 1.5 })), "hulp");
  }

  // De hoek x loopt onbegrensd verder: P draait toer na toer rond. Rechts
  // staat telkens een venster van 2π breed. Zolang x < 2π begint dat venster
  // bij 0; daarna schuift het mee, zodat het punt op de grafiek aan de
  // rechterrand blijft en de getallen op de x-as opschuiven. De y-as hoort
  // dan niet meer bij x = 0 en staat nog maar voor 20% in beeld.
  G.registreer("herhaling-cirkel-grafiek", function (ctx) {
    var BEGIN = PI / 3;
    var modus = "sin";
    var totaal = BEGIN;                         // de hoek x, zonder modulo

    var bord = ctx.maakBord({
      begrenzing: [-3.1, 2.6, 6.9, -2.6], gelijkeschaal: true, assen: false
    });
    var rond = cirkelBasis(ctx, bord);

    function v() { return Math.max(0, totaal - 2 * PI); }   // verschuiving venster
    function X() { return totaal - v(); }                     // plaats op het bord
    function f(x) { return FUNCTIES[modus].f(x); }
    function g(Xb) { return f(Xb + v()); }                     // grafiek in bordcoördinaten

    /* Assen. */
    ctx.stijl(bord.create("arrow", [[-0.3, 0], [6.8, 0]], opties({ strokeWidth: 1.2 })), "as");
    ctx.stijl(bord.create("text", [6.7, -0.12, "x"], opties({
      anchorX: "right", anchorY: "top", cssClass: "grafiek-aslabel", fontSize: 14 })), "tekst");
    var yAs = [];
    yAs.push(ctx.stijl(bord.create("arrow", [[0, -2.5], [0, 2.5]], opties({ strokeWidth: 1.2 })), "as"));
    yAs.push(ctx.stijl(bord.create("text", [0.12, 2.4, "y"], opties({
      anchorY: "top", cssClass: "grafiek-aslabel", fontSize: 14 })), "tekst"));
    [-1, 1].forEach(function (y) {
      yAs.push(ctx.stijl(bord.create("segment", [[-0.07, y], [0.07, y]],
        opties({ strokeWidth: 1.2 })), "as"));
      yAs.push(ctx.stijl(bord.create("text", [-0.2, y, getalTekst(ctx, y)], opties({
        anchorX: "right", anchorY: "middle", fontSize: 13 })), "tekst"));
    });
    var yZwak = null;
    function zetYAs() {
      var zwak = v() > 1e-9;
      if (zwak === yZwak) return;
      yZwak = zwak;
      yAs.forEach(function (o) { o.setAttribute({ strokeOpacity: zwak ? 0.2 : 1 }); });
    }

    // De maatstreepjes in stappen van π/2 schuiven mee met het venster. Elk
    // streepje hoort vast bij de k met k mod STREPEN = j: schuift het venster
    // een stap op, dan krijgt enkel het streepje dat links verdwijnt een
    // nieuwe plaats rechts en een nieuw getal. Zouden alle streepjes één
    // plaats doorschuiven, dan veranderen alle getallen tegelijk en flikkert
    // de hele as.
    var STREPEN = 6;
    function kVan(j) {
      var eerste = Math.floor(v() / (PI / 2) + 1e-9) + 1;
      return eerste + (((j - eerste) % STREPEN) + STREPEN) % STREPEN;
    }
    function streep(j) { return kVan(j) * PI / 2 - v(); }
    for (var j = 0; j < STREPEN; j++) {
      (function (j) {
        function zichtbaar() { var x = streep(j); return x > 1e-6 && x <= 2 * PI + 1e-6; }
        ctx.stijl(bord.create("segment", [
          [function () { return streep(j); }, -0.07], [function () { return streep(j); }, 0.07]
        ], opties({ strokeWidth: 1.2, visible: zichtbaar })), "as");
        ctx.stijl(bord.create("text", [function () { return streep(j); }, -0.28,
          function () { return piTekst(ctx, kVan(j) * PI / 2); }
        ], opties({ anchorX: "middle", anchorY: "top", fontSize: 13, visible: zichtbaar })), "tekst");
      })(j);
    }

    var P = ctx.stijl(bord.create("glider", [CX + Math.cos(BEGIN), Math.sin(BEGIN), rond], {
      name: "P", size: 5, showInfobox: false, precision: GRIJP, label: { offset: [8, 10] }
    }), "punt");
    function h() { return hoekVan(P, CX); }

    // De hoek als boog bij het middelpunt.
    ctx.stijl(bord.create("curve", [
      function (t) { return CX + 0.28 * Math.cos(t); },
      function (t) { return 0.28 * Math.sin(t); },
      0, function () { return h(); }
    ], opties({ strokeWidth: 1.5 })), "punt");
    ctx.stijl(bord.create("segment", [[CX, 0], P], opties({ strokeWidth: 1.5 })), "hulp");

    // De grafiek: zwak over het venster, volledig tot de hoek.
    ctx.stijl(bord.create("functiongraph", [g, 0, 2 * PI],
      opties({ strokeWidth: 1.5, dash: 2 })), "zwak");
    ctx.stijl(bord.create("functiongraph", [g, 0, function () { return X(); }],
      opties({ strokeWidth: 3 })), "kromme");
    // De asymptoten van tan in het venster.
    function asymptoot(j) {
      var n = Math.ceil((v() - PI / 2) / PI - 1e-9) + j;
      return PI / 2 + n * PI - v();
    }
    for (var a = 0; a < 3; a++) {
      (function (a) {
        ctx.stijl(bord.create("segment", [
          [function () { return asymptoot(a); }, -GRENS], [function () { return asymptoot(a); }, GRENS]
        ], opties({ strokeWidth: 1, dash: 3, visible: function () {
          var x = asymptoot(a); return modus === "tan" && x > 1e-6 && x <= 2 * PI + 1e-6;
        } })), "hulp");
      })(a);
    }

    // Het punt boven de hoek op de grafiek, en de waarde als hoogte.
    function waarde() { return knip(f(totaal), GRENS + 0.5); }
    var Q = ctx.stijl(bord.create("point", [function () { return X(); }, waarde], {
      name: "", size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("segment", [[function () { return X(); }, 0], Q],
      opties({ strokeWidth: 4 })), "secante");

    // Op de cirkel: dezelfde waarde als lijnstuk.
    function op(m) { return function () { return modus === m; }; }
    // sin: de tweede coördinaat van P.
    ctx.stijl(bord.create("segment", [[function () { return P.X(); }, 0], P],
      opties({ strokeWidth: 4, visible: op("sin") })), "secante");
    // cos: de eerste coördinaat van P.
    ctx.stijl(bord.create("segment", [[CX, 0], [function () { return P.X(); }, 0]],
      opties({ strokeWidth: 4, visible: op("cos") })), "secante");
    ctx.stijl(bord.create("segment", [P, [function () { return P.X(); }, 0]],
      opties({ strokeWidth: 1, dash: 2, visible: op("cos") })), "zwak");
    // tan: het snijpunt T van OP met de raaklijn x = 1 aan de cirkel.
    function tanHoogte() { return knip(FUNCTIES.tan.f(h()), GRENS); }
    var T = bord.create("point", [CX + 1, tanHoogte], { visible: false, fixed: true });
    ctx.stijl(bord.create("segment", [[CX + 1, -GRENS], [CX + 1, GRENS]],
      opties({ strokeWidth: 1, visible: op("tan") })), "hulp");
    ctx.stijl(bord.create("segment", [[CX + 1, 0], T],
      opties({ strokeWidth: 4, visible: function () { return modus === "tan" && isFinite(tanHoogte()); } })), "secante");
    ctx.stijl(bord.create("segment", [[CX, 0], T],
      opties({ strokeWidth: 1, dash: 2, visible: function () { return modus === "tan" && isFinite(tanHoogte()); } })), "zwak");
    ctx.stijl(bord.create("text", [CX + 1.06, -GRENS + 0.2, "x = 1"],
      opties({ fontSize: 12, visible: op("tan") })), "hulp");

    // De brug: een stippellijn op gelijke hoogte van cirkel naar grafiek.
    ctx.stijl(bord.create("segment", [
      [function () { return modus === "tan" ? CX + 1 : P.X(); },
       function () { return modus === "tan" ? tanHoogte() : P.Y(); }],
      Q
    ], opties({ strokeWidth: 1, dash: 1,
      visible: function () { return modus !== "cos" && isFinite(waarde()); } })), "zwak");

    // Zet de hoek x. Vlak bij een veelvoud van π/12 klikt P vast: dan staat
    // er een exacte hoek in de tekstregel.
    function zet(hoek, vastklikken) {
      if (vastklikken !== false) {
        var k = Math.round(hoek * 12 / PI);
        if (Math.abs(hoek - k * PI / 12) < 0.045) hoek = k * PI / 12;
      }
      totaal = Math.max(0, hoek);
      P.setPositionDirectly(window.JXG.COORDS_BY_USER, [CX + Math.cos(totaal), Math.sin(totaal)]);
    }
    // Slepen telt de toeren mee: over 0 heen naar voren gaat de hoek verder
    // dan 2π, terug blijft ze niet onder 0.
    P.on("drag", function () {
      stop();
      var vorig = ((totaal % (2 * PI)) + 2 * PI) % (2 * PI);
      var verschil = h() - vorig;
      if (verschil > PI) verschil -= 2 * PI;
      if (verschil < -PI) verschil += 2 * PI;
      zet(totaal + verschil);
      bord.update();
    });

    // Afspelen: P draait zelf rond, één toer in TOER ms, zonder einde, tot
    // de leerling pauzeert, P versleept of de beginstand kiest. Staat de
    // figuur niet meer in beeld (een andere slide), dan stopt het vanzelf.
    var TOER = 9000;
    var lopend = null;
    function stap(nu) {
      if (!lopend) return;
      if (!ctx.figuur.offsetParent) { stop(); return; }
      zet(totaal + (nu - lopend.vorige) / TOER * 2 * PI, false);
      lopend.vorige = nu;
      bord.update();
      lopend.frame = window.requestAnimationFrame(stap);
    }
    function start() {
      if (lopend) return;
      lopend = { vorige: window.performance.now(), frame: 0 };
      lopend.frame = window.requestAnimationFrame(stap);
      knopSpeel.textContent = "Pauzeren";
      knopSpeel.setAttribute("aria-pressed", "true");
      ctx.toon("P draait rond. Volg hoe de grafiek ontstaat.");
    }
    function stop() {
      if (!lopend) return;
      window.cancelAnimationFrame(lopend.frame);
      lopend = null;
      knopSpeel.textContent = "Afspelen";
      knopSpeel.setAttribute("aria-pressed", "false");
      zet(totaal);        // vlak bij een exacte hoek klikt P vast, zoals bij slepen
      bord.update();
    }

    function werkBij() {
      zetYAs();
      // Tijdens het afspelen blijft de tekstregel stil: een schermlezer zou
      // anders elk beeld voorlezen.
      if (lopend) return;
      var graden = Math.round(totaal * 180 / PI);
      var naam = FUNCTIES[modus].naam;
      var w = FUNCTIES[modus].f(totaal);
      var tekst = "Hoek x = " + piTekst(ctx, totaal) + " (" + graden + "°). ";
      if (isNaN(w)) {
        tekst += "tan x bestaat niet: OP is evenwijdig met de raaklijn x = 1. " +
          "Hier heeft de grafiek een verticale asymptoot.";
      } else {
        tekst += naam + " x = " + getalTekst(ctx, w) + ".";
        if (Math.abs(w) < 1e-9) tekst += " Een nulwaarde.";
      }
      if (totaal > 2 * PI + 1e-9) {
        tekst += " Het venster toont x van " + piTekst(ctx, v()) + " tot " +
          piTekst(ctx, totaal) + ".";
      }
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);

    var kies = keuzeknoppen(ctx, [
      { opschrift: "sin x", waarde: "sin" },
      { opschrift: "cos x", waarde: "cos" },
      { opschrift: "tan x", waarde: "tan" }
    ], modus, function (m) { modus = m; bord.update(); });

    var knopSpeel = ctx.knop("Afspelen", function () { if (lopend) stop(); else start(); });
    knopSpeel.setAttribute("aria-pressed", "false");

    function herstel() { stop(); modus = "sin"; kies(modus); zet(BEGIN); bord.update(); }
    ctx.knop("Beginstand", herstel);
    bord.update();
    return { reset: herstel, vernietig: stop };
  });

  /* --- 3. De parameters a, b, c en d ---------------------------------------- */

  function periodeTekst(ctx, b) {
    // b is een veelvoud van 1/2, dus P = 2π/b = 4π/(2b).
    var k = Math.round(2 * b);
    if (Math.abs(2 * b - k) > 1e-9 || k === 0) return getalTekst(ctx, 2 * PI / b);
    var g = ggd(4, k);
    var t = 4 / g, n = k / g;
    var teller = (t === 1 ? "" : t) + "π";
    return n === 1 ? teller : teller + "/" + n;
  }

  function factorTekst(ctx, w) {
    return getalTekst(ctx, w, 2);
  }

  // Het voorschrift zoals in de cursus: y = a sin(b(x − c)) + d, zonder
  // factoren 1 en termen 0.
  // Een veelvoud van π/12 in TeX: \frac{5\pi}{6}, \pi, 2\pi.
  function piTex(ctx, x) {
    var k = Math.round(x * 12 / PI);
    if (Math.abs(x - k * PI / 12) > 1e-6) return ctx.getal(x, 2);
    if (k === 0) return "0";
    var g = ggd(k, 12), t = Math.abs(k / g), n = 12 / g;
    var teller = (t === 1 ? "" : t) + "\\pi";
    return (k < 0 ? "-" : "") + (n === 1 ? teller : "\\frac{" + teller + "}{" + n + "}");
  }

  // Hetzelfde voorschrift als voorschrift(), maar in TeX voor MathJax.
  function voorschriftTex(ctx, a, b, c, d) {
    if (Math.abs(a) < EPS) return "y=" + ctx.getal(d, 2);
    var bt = Math.abs(b - 1) < EPS ? "" : ctx.getal(b, 2);
    var hoek;
    if (Math.abs(c) < EPS) {
      hoek = bt + "x";
    } else {
      var verschil = "x" + (c > 0 ? "-" : "+") + piTex(ctx, Math.abs(c));
      hoek = bt === "" ? verschil : bt + "\\left(" + verschil + "\\right)";
    }
    var at = Math.abs(a - 1) < EPS ? "" : Math.abs(a + 1) < EPS ? "-" : ctx.getal(a, 2);
    var sinus = hoek === "x" ? "\\sin x" : "\\sin\\left(" + hoek + "\\right)";
    var tekst = "y=" + at + sinus;
    if (Math.abs(d) > EPS) tekst += (d > 0 ? "+" : "-") + ctx.getal(Math.abs(d), 2);
    return tekst;
  }

  function voorschrift(ctx, a, b, c, d) {
    if (Math.abs(a) < EPS) return "y = " + getalTekst(ctx, d);
    var hoek;
    var bt = Math.abs(b - 1) < EPS ? "" : factorTekst(ctx, b);
    if (Math.abs(c) < EPS) {
      hoek = bt === "" ? "x" : bt + "x";
    } else {
      var verschil = "x " + (c > 0 ? "− " : "+ ") + piTekst(ctx, Math.abs(c));
      hoek = bt === "" ? verschil : bt + "(" + verschil + ")";
    }
    var at = Math.abs(a - 1) < EPS ? "" : Math.abs(a + 1) < EPS ? "−" : factorTekst(ctx, a) + "·";
    var tekst = "y = " + at + (hoek === "x" ? "sin x" : "sin(" + hoek + ")");
    if (Math.abs(d) > EPS) tekst += (d > 0 ? " + " : " − ") + getalTekst(ctx, Math.abs(d));
    return tekst;
  }

  var A_WAARDEN = reeks(-3, 3, 0.5);
  var B_WAARDEN = reeks(0.5, 4, 0.5);
  var C_WAARDEN = reeks(-PI, PI, PI / 12);
  var D_WAARDEN = reeks(-2, 2, 0.5);

  function parameterschuiven(ctx, bij) {
    var rij = schuifrij(ctx);
    var tekstGetal = function (w) { return getalTekst(ctx, w); };
    var a = schuif(rij, { naam: "a", waarden: A_WAARDEN, tekst: tekstGetal, index: 8 }, bij);
    var b = schuif(rij, { naam: "b", waarden: B_WAARDEN, tekst: tekstGetal, index: 1 }, bij);
    var c = schuif(rij, { naam: "c", waarden: C_WAARDEN,
      tekst: function (w) { return piTekst(ctx, w); }, index: 12 }, bij);
    var d = schuif(rij, { naam: "d", waarden: D_WAARDEN, tekst: tekstGetal, index: 4 }, bij);
    return {
      rij: rij, a: a, b: b, c: c, d: d,
      zet: function (av, bv, cv, dv) {
        a.zetWaarde(av); b.zetWaarde(bv); c.zetWaarde(cv); d.zetWaarde(dv);
      }
    };
  }

  G.registreer("herhaling-parameters", function (ctx) {
    // Boven y = 5 blijft plaats voor het voorschrift: |a| + |d| is hoogstens 5.
    var bord = ctx.maakBord({ begrenzing: [-3.7, 6.9, 7.3, -5.2], assen: false });
    assenPi(ctx, bord, -3.6, 7.2, -5.1, 5.1, [-4, -3, -2, -1, 1, 2, 3, 4], -PI, 2 * PI);

    var s = parameterschuiven(ctx, function () { bord.update(); werkBij(); });
    function a() { return s.a.waarde(); }
    function b() { return s.b.waarde(); }

    // Het voorschrift met de gekozen waarden, bovenaan het bord.
    formule(ctx, bord, 6.75, function () {
      return [voorschriftTex(ctx, a(), b(), c(), d()), voorschrift(ctx, a(), b(), c(), d())];
    });
    function c() { return s.c.waarde(); }
    function d() { return s.d.waarde(); }
    function g(x) { return a() * Math.sin(b() * (x - c())) + d(); }
    function per() { return 2 * PI / b(); }

    ctx.stijl(bord.create("functiongraph", [Math.sin, -3.7, 7.3],
      opties({ strokeWidth: 1.5, dash: 2 })), "zwak");
    ctx.stijl(bord.create("line", [[0, function () { return d(); }], [1, function () { return d(); }]],
      opties({ strokeWidth: 1.2, dash: 3 })), "hulp");
    ctx.stijl(bord.create("functiongraph", [g, -3.7, 7.3],
      opties({ strokeWidth: 3 })), "kromme");

    // Eén periode, vanaf x = c op de evenwichtslijn. De maatpijl staat
    // onder de dalen (of boven de toppen als daar geen plaats is), zodat ze
    // niet over de getallen van de x-as valt.
    function yMaat() {
      var onder = d() - Math.abs(a()) - 0.7;
      return onder > -4.7 ? onder : d() + Math.abs(a()) + 0.7;
    }
    var B0 = ctx.stijl(bord.create("point", [function () { return c(); }, function () { return d(); }], {
      name: "", size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    var B1 = ctx.stijl(bord.create("point", [function () { return c() + per(); }, function () { return d(); }], {
      name: "", size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    [B0, B1].forEach(function (B) {
      ctx.stijl(bord.create("segment", [B, [function () { return B.X(); }, yMaat]],
        opties({ strokeWidth: 1, dash: 2 })), "punt");
    });
    ctx.stijl(bord.create("segment", [
      [function () { return c(); }, yMaat], [function () { return c() + per(); }, yMaat]
    ], opties({ strokeWidth: 2.5, firstArrow: true, lastArrow: true })), "punt");
    ctx.stijl(bord.create("text", [
      function () { return c() + per() / 2; },
      function () { return yMaat() - 0.35; },
      function () { return "P = " + periodeTekst(ctx, b()); }
    ], opties({ anchorX: "middle", anchorY: "middle", fontSize: 13 })), "punt");

    // De amplitude: van de evenwichtslijn tot de eerste top na c.
    var xtop = function () { return c() + per() / 4; };
    ctx.stijl(bord.create("segment", [
      [xtop, function () { return d(); }], [xtop, function () { return g(xtop()); }]
    ], opties({ strokeWidth: 3, lastArrow: true,
      visible: function () { return Math.abs(a()) > EPS; } })), "secante");
    ctx.stijl(bord.create("text", [
      function () { return xtop() + 0.12; },
      function () { return d() + a() / 2; },
      function () { return "A = " + getalTekst(ctx, Math.abs(a())); }
    ], opties({ anchorY: "middle", fontSize: 13,
      visible: function () { return Math.abs(a()) > EPS; } })), "secante");

    function werkBij() {
      var av = a(), bv = b(), cv = c(), dv = d();
      var tekst = voorschrift(ctx, av, bv, cv, dv) + ". ";
      if (Math.abs(av) < EPS) {
        tekst += "Met a = 0 is er geen golf meer: de grafiek is de rechte y = " +
          getalTekst(ctx, dv) + ".";
      } else {
        tekst += "Amplitude A = " + getalTekst(ctx, Math.abs(av)) +
          ", periode P = " + (Math.abs(bv - Math.round(bv)) < EPS && bv > 1
            ? "" : "2π/" + getalTekst(ctx, bv) + " = ") + periodeTekst(ctx, bv) +
          ", evenwichtslijn y = " + getalTekst(ctx, dv) + ", ";
        tekst += Math.abs(cv) < EPS ? "geen horizontale verschuiving"
          : "verschoven over " + piTekst(ctx, Math.abs(cv)) + " naar " +
            (cv > 0 ? "rechts" : "links");
        tekst += ", bereik [" + getalTekst(ctx, dv - Math.abs(av)) + ", " +
          getalTekst(ctx, dv + Math.abs(av)) + "].";
        if (av < 0) tekst += " Omdat a < 0, is de golf gespiegeld om de evenwichtslijn.";
      }
      ctx.toon(tekst);
    }

    bord.update();

    function herstel() { s.zet(1, 1, 0, 0); bord.update(); werkBij(); }
    ctx.knop("Beginstand: y = sin x", herstel);
    werkBij();
    return {
      reset: herstel,
      vernietig: function () { if (s.rij.parentNode) s.rij.parentNode.removeChild(s.rij); }
    };
  });

  /* --- 3b. Raad het voorschrift ---------------------------------------------- */

  // Een gegeven sinusoïde en een eigen grafiek met dezelfde vier
  // schuifregelaars. Controleer vergelijkt de functies zelf, niet de
  // parameters: c is niet uniek (een periode verder geeft dezelfde grafiek),
  // en een negatieve a met een halve periode verschuiving ook. Wat niet
  // klopt, wordt per kenmerk gezegd: amplitude, periode en evenwichtslijn
  // liggen wel vast.
  G.registreer("herhaling-raad", function (ctx) {
    var BEGIN_DOEL = { a: 2, b: 2, c: PI / 4, d: 1 };
    var doel = BEGIN_DOEL;

    // Boven y = 5 blijft plaats voor het voorschrift, zoals bij de parameters.
    var bord = ctx.maakBord({ begrenzing: [-3.7, 6.9, 7.3, -5.2], assen: false });
    assenPi(ctx, bord, -3.6, 7.2, -5.1, 5.1, [-4, -3, -2, -1, 1, 2, 3, 4], -PI, 2 * PI);

    var s = parameterschuiven(ctx, function () { bord.update(); werkBij(); });

    // Het eigen voorschrift, dat bij de smalle blauwe grafiek hoort.
    formule(ctx, bord, 6.75, function () {
      var a = s.a.waarde(), b = s.b.waarde(), c = s.c.waarde(), d = s.d.waarde();
      return [voorschriftTex(ctx, a, b, c, d), voorschrift(ctx, a, b, c, d)];
    });
    function eigen(x) {
      return s.a.waarde() * Math.sin(s.b.waarde() * (x - s.c.waarde())) + s.d.waarde();
    }
    function gegeven(x) { return doel.a * Math.sin(doel.b * (x - doel.c)) + doel.d; }

    ctx.stijl(bord.create("functiongraph", [gegeven, -3.7, 7.3],
      opties({ strokeWidth: 6, strokeOpacity: 0.55 })), "secante");
    ctx.stijl(bord.create("functiongraph", [eigen, -3.7, 7.3],
      opties({ strokeWidth: 2.5 })), "punt");

    function valtSamen() {
      for (var x = -3.6; x <= 7.2; x += 0.05) {
        if (Math.abs(eigen(x) - gegeven(x)) > 1e-6) return false;
      }
      return true;
    }

    function werkBij() {
      ctx.toon("Jouw voorschrift: " + voorschrift(ctx, s.a.waarde(), s.b.waarde(),
        s.c.waarde(), s.d.waarde()) + ". Druk op Controleer wanneer je denkt dat het klopt.");
    }

    function controleer() {
      var mijn = voorschrift(ctx, s.a.waarde(), s.b.waarde(), s.c.waarde(), s.d.waarde());
      if (valtSamen()) {
        ctx.toon("Juist! " + mijn + " valt samen met de gegeven grafiek. " +
          "Kies Nieuwe opgave voor een volgende grafiek.");
        return;
      }
      var fouten = [];
      if (Math.abs(Math.abs(s.a.waarde()) - Math.abs(doel.a)) > EPS) {
        fouten.push("de amplitude klopt niet (kijk hoe hoog een top boven de evenwichtslijn ligt)");
      }
      if (Math.abs(s.b.waarde() - doel.b) > EPS) {
        fouten.push("de periode klopt niet (meet de afstand tussen twee toppen en gebruik P = 2π/b)");
      }
      if (Math.abs(s.d.waarde() - doel.d) > EPS) {
        fouten.push("de evenwichtslijn klopt niet (ze ligt midden tussen de toppen en de dalen)");
      }
      var tekst = mijn + ": nog niet. ";
      if (fouten.length) {
        var zin = fouten.join("; ");
        tekst += zin.charAt(0).toUpperCase() + zin.slice(1) + ".";
      } else {
        tekst += "Amplitude, periode en evenwichtslijn kloppen. Zoek nu de verschuiving c: " +
          "waar gaat de gegeven grafiek stijgend door de evenwichtslijn?";
      }
      ctx.toon(tekst);
    }

    function kiesUit(lijst) { return lijst[Math.floor(Math.random() * lijst.length)]; }
    function nieuweOpgave() {
      var nieuw;
      do {
        var b = kiesUit([0.5, 1, 1.5, 2, 3]);
        var a = kiesUit([1, 1.5, 2, 2.5, 3]) * (Math.random() < 0.3 ? -1 : 1);
        var d = kiesUit([-1.5, -1, -0.5, 0, 0.5, 1, 1.5]);
        var c = kiesUit([-3, -2, -1, 0, 1, 2, 3]) * PI / 6;
        nieuw = { a: a, b: b, c: c, d: d };
      } while (Math.abs(nieuw.a) + Math.abs(nieuw.d) > 4 ||
               (nieuw.a === doel.a && nieuw.b === doel.b && nieuw.c === doel.c && nieuw.d === doel.d));
      doel = nieuw;
      s.zet(1, 1, 0, 0);
      bord.update();
      werkBij();
    }

    bord.update();

    ctx.knop("Controleer", controleer);
    ctx.knop("Toon een oplossing", function () {
      s.zet(doel.a, doel.b, doel.c, doel.d);
      bord.update();
      ctx.toon("Een mogelijk voorschrift: " + voorschrift(ctx, doel.a, doel.b, doel.c, doel.d) +
        ". Ook andere waarden van c (en een negatieve a) kunnen dezelfde grafiek geven.");
    });
    ctx.knop("Nieuwe opgave", nieuweOpgave);

    function herstel() { doel = BEGIN_DOEL; s.zet(1, 1, 0, 0); bord.update(); werkBij(); }
    werkBij();
    return {
      reset: herstel,
      vernietig: function () { if (s.rij.parentNode) s.rij.parentNode.removeChild(s.rij); }
    };
  });

  /* --- 4 en 5. Basisvergelijkingen en basisongelijkheden ------------------- */

  var R2 = Math.SQRT2 / 2, R3 = Math.sqrt(3) / 2, R33 = Math.sqrt(3) / 3;
  var WAARDEN = {
    sin: [
      { w: -1.2, t: "−1.2" }, { w: -1, t: "−1" }, { w: -R3, t: "−√3/2" },
      { w: -R2, t: "−√2/2" }, { w: -0.5, t: "−1/2" }, { w: 0, t: "0" },
      { w: 0.5, t: "1/2" }, { w: R2, t: "√2/2" }, { w: R3, t: "√3/2" },
      { w: 1, t: "1" }, { w: 1.2, t: "1.2" }
    ],
    tan: [
      { w: -2 * R3, t: "−√3" }, { w: -1, t: "−1" }, { w: -R33, t: "−√3/3" },
      { w: 0, t: "0" }, { w: R33, t: "√3/3" }, { w: 1, t: "1" }, { w: 2 * R3, t: "√3" }
    ]
  };
  WAARDEN.cos = WAARDEN.sin;
  var BEGINWAARDE = { sin: 6, cos: 6, tan: 5 };     // 1/2 en 1

  // De oplossingen in [0, 2π[ van sin x = a, cos x = a of tan x = a.
  function oplossingen(modus, a) {
    var uit = [];
    function voeg(x) {
      x = ((x % (2 * PI)) + 2 * PI) % (2 * PI);
      if (Math.abs(x - 2 * PI) < 1e-9) x = 0;
      for (var i = 0; i < uit.length; i++) if (Math.abs(uit[i] - x) < 1e-9) return;
      uit.push(x);
    }
    if (modus === "tan") {
      var t = Math.atan(a);
      voeg(t); voeg(t + PI);
    } else {
      if (a < -1 - EPS || a > 1 + EPS) return uit;
      var b = Math.max(-1, Math.min(1, a));
      if (modus === "sin") { var s = Math.asin(b); voeg(s); voeg(PI - s); }
      else { var c = Math.acos(b); voeg(c); voeg(-c); }
    }
    return uit.sort(function (p, q) { return p - q; });
  }

  // Voldoet x aan f(x) R a? Gelijkheid met een kleine marge, anders valt
  // sin(π/6) = 0.49999999999999994 net buiten "≥ 1/2".
  function voldoet(modus, rel, a, x) {
    var y = FUNCTIES[modus].f(x);
    if (isNaN(y)) return false;
    var v = y - a;
    if (Math.abs(v) < 1e-9) v = 0;
    switch (rel) {
      case "=": return v === 0;
      case "<": return v < 0;
      case "≤": return v <= 0;
      case ">": return v > 0;
      case "≥": return v >= 0;
    }
    return false;
  }

  // De oplossingen in [0, 2π[ als unie van intervallen, in de Belgische
  // notatie met omgekeerde haken voor een open grens. We lopen de grens-
  // punten en de stukken ertussen af en voegen wat aansluit samen.
  function intervallen(ctx, modus, rel, a, alsTex) {
    var punten = [0].concat(oplossingen(modus, a).filter(function (x) { return x > 1e-9; }));
    if (modus === "tan") punten.push(PI / 2, 3 * PI / 2);
    punten.sort(function (p, q) { return p - q; });
    punten.push(2 * PI);
    // Reeks: punt, stuk, punt, stuk, ..., het eindpunt 2π (niet in [0, 2π[).
    var delen = [];
    for (var i = 0; i < punten.length - 1; i++) {
      var p = punten[i];
      var asymptoot = modus === "tan" && (Math.abs(p - PI / 2) < 1e-9 || Math.abs(p - 3 * PI / 2) < 1e-9);
      delen.push({ soort: "punt", x: p, ok: !asymptoot && voldoet(modus, rel, a, p) });
      var m = (p + punten[i + 1]) / 2;
      delen.push({ soort: "stuk", van: p, tot: punten[i + 1], ok: voldoet(modus, rel, a, m) });
    }
    var stukken = [], huidig = null;
    delen.forEach(function (deel) {
      if (deel.ok) {
        if (!huidig) huidig = [];
        huidig.push(deel);
      } else if (huidig) { stukken.push(huidig); huidig = null; }
    });
    if (huidig) stukken.push(huidig);
    if (!stukken.length) return alsTex ? "\\emptyset" : "∅";
    var pi = alsTex ? piTex : piTekst;
    var L = alsTex ? "\\left" : "", R = alsTex ? "\\right" : "";
    return stukken.map(function (run) {
      var eerste = run[0], laatste = run[run.length - 1];
      if (run.length === 1 && eerste.soort === "punt") {
        return (alsTex ? "\\left\\{" : "{") + pi(ctx, eerste.x) + (alsTex ? "\\right\\}" : "}");
      }
      var links = eerste.soort === "punt" ? L + "[" + pi(ctx, eerste.x) : L + "]" + pi(ctx, eerste.van);
      var rechts = laatste.soort === "punt" ? pi(ctx, laatste.x) + R + "]" : pi(ctx, laatste.tot) + R + "[";
      return links + "," + rechts;
    }).join(alsTex ? "\\cup" : " ∪ ");
  }

  // Een waarde uit WAARDEN als TeX: "−√3/2" wordt -\frac{\sqrt{3}}{2}.
  function waardeTex(t) {
    return t.replace("−", "-").replace(/√(\d)/, "\\sqrt{$1}")
      .replace(/^(-?)([^/]+)\/(\d)$/, "$1\\frac{$2}{$3}");
  }

  var REL_TEX = { "=": "=", "<": "<", "≤": "\\leq", ">": ">", "≥": "\\geq" };

  // De uitwerking van f(x) = a als regels voor aligned, zoals in de
  // samenvatting: f x = a, f x = f α, de formule met α en de twee reeksen.
  // Een regel die gelijk is aan de vorige valt weg (cos, of één reeks).
  function uitwerkingVergelijking(ctx, modus, a, aTekst) {
    var f = "\\" + modus + " x", at = waardeTex(aTekst);
    if (modus !== "tan" && (a < -1 - EPS || a > 1 + EPS)) {
      return [f + "&=" + at + "\\ \\lightning",
        "\\text{want}\\quad&&&-1\\leq " + f + "\\leq 1",
        "V&=\\emptyset"];
    }
    var b = Math.max(-1, Math.min(1, a));
    var alfa = modus === "sin" ? Math.asin(b) : modus === "cos" ? Math.acos(b) : Math.atan(a);
    var al = piTex(ctx, alfa);
    var per = modus === "tan" ? "k\\cdot\\pi" : "k\\cdot 2\\pi";
    function plus(x) { return x === "0" ? per : x + "+" + per; }
    var of = "\\ \\text{ of }\\ x=";
    var regels = [f + "&=" + at, "\\iff " + f + "&=\\" + modus + (alfa < 0
      ? "\\left(" + al + "\\right)" : " " + al)];
    var opl = oplossingen(modus, a);
    var met, uit;
    if (modus === "tan") {
      met = uit = "x=" + plus(al);
    } else if (modus === "sin") {
      var tweede = al === "0" ? "\\pi" : "\\pi-" + (alfa < 0 ? "\\left(" + al + "\\right)" : al);
      met = "x=" + plus(al) + of + plus(tweede);
      uit = opl.length === 1 ? "x=" + plus(al) : "x=" + plus(al) + of + plus(piTex(ctx, PI - alfa));
    } else {
      // Bij cos x = 1 vallen beide reeksen samen: dan enkel x = k·2π.
      met = al === "0" ? "x=" + per : "x=" + plus(al) + of + plus("-" + al);
      uit = opl.length === 1 ? "x=" + plus(al) : met;
    }
    regels.push("\\iff " + met.replace("x=", "x&="));
    if (uit !== met) regels.push("\\iff " + uit.replace("x=", "x&="));
    regels.push("\\text{in } [0,2\\pi[\\text{:}\\quad&&x&=" + opl.map(function (x) {
      return piTex(ctx, x);
    }).join(of));
    // Onderaan, zoals de leerlingen het schrijven: V met de reeksen van uit.
    regels.push("V&=\\left\\{" + uit.slice(2).split(of).join(",\\ ") +
      "\\ \\middle|\\ k\\in\\mathbb{Z}\\right\\}");
    return regels;
  }

  // De uitwerking van f(x) R a, zoals in de oefeningen: eerst de grens-
  // punten in [0, 2π[, dan V.
  function uitwerkingOngelijkheid(ctx, modus, rel, a, aTekst) {
    var f = "\\" + modus + " x", at = waardeTex(aTekst);
    var regels = [f + "&" + REL_TEX[rel] + at];
    var opl = oplossingen(modus, a);
    if (opl.length) {
      regels.push("\\text{grenspunten:}\\quad&&" + f + "&=" + at);
      regels.push("x&=" + opl.map(function (x) { return piTex(ctx, x); })
        .join("\\ \\text{ of }\\ x=") + "\\qquad\\text{in } [0,2\\pi[");
    } else {
      regels.push(f + "&=" + at + "\\ \\lightning");
      regels.push("&&&\\text{geen grenspunten}");
    }
    var v = intervallen(ctx, modus, rel, a, true);
    regels.push("V&=" + v + (v === "\\emptyset" ? "" : "\\qquad\\text{in } [0,2\\pi["));
    return regels;
  }

  function algemeneOplossing(ctx, modus, a, aTekst) {
    var naam = modus + " x = " + aTekst;
    if (modus !== "tan" && (a < -1 - EPS || a > 1 + EPS)) {
      return naam + " heeft geen oplossingen, want het bereik van " + modus +
        " is [−1, 1]. V = ∅.";
    }
    var opl = oplossingen(modus, a);
    var lijst = opl.map(function (x) { return piTekst(ctx, x); }).join(" of x = ");
    var tekst = naam + ". ";
    if (modus === "sin") {
      var s = Math.asin(Math.max(-1, Math.min(1, a)));
      tekst += "α = " + piTekst(ctx, s) + ". ";
      tekst += opl.length === 1
        ? "Eén reeks: x = " + piTekst(ctx, s) + " + k·2π."
        : "x = α + k·2π of x = π − α + k·2π, dus x = " + piTekst(ctx, s) +
          " + k·2π of x = " + piTekst(ctx, PI - s) + " + k·2π.";
    } else if (modus === "cos") {
      var c = Math.acos(Math.max(-1, Math.min(1, a)));
      tekst += "α = " + piTekst(ctx, c) + ". ";
      tekst += opl.length === 1
        ? "Eén reeks: x = " + piTekst(ctx, c) + " + k·2π."
        : "x = ±α + k·2π, dus x = " + piTekst(ctx, c) + " + k·2π of x = " +
          piTekst(ctx, -c) + " + k·2π.";
    } else {
      var t = Math.atan(a);
      tekst += "α = " + piTekst(ctx, t) + ". x = α + k·π, dus x = " + piTekst(ctx, t) + " + k·π.";
    }
    return tekst.replace(/\.$/, "") + " (k ∈ Z). In [0, 2π[: x = " + lijst + ".";
  }

  function vergelijkingsbord(ctx, ongelijk) {
    var modus = "sin", rel = ongelijk ? "≤" : "=";
    var bord = ctx.maakBord({
      begrenzing: [-3.1, 2.6, 6.9, -2.6], gelijkeschaal: true, assen: false
    });
    assenPi(ctx, bord, -0.3, 6.8, -2.5, 2.5, [-1, 1], 0, 2 * PI);
    cirkelBasis(ctx, bord);

    var s;
    var rij = schuifrij(ctx);
    // De uitwerking staat tussen het bord en de schuifregelaar.
    var uitwerking = document.createElement("div");
    uitwerking.className = "herhaling-uitwerking";
    uitwerking.setAttribute("aria-live", "polite");
    uitwerking.style.cssText = "text-align:center;margin-top:.5rem;overflow-x:auto";
    rij.parentNode.insertBefore(uitwerking, rij);
    // De uitwerking staat op 1rem, of kleiner als het blok smaller is dan de
    // breedste uitwerking (ruim 32 em): één schaal per breedte, zodat de
    // hoogte niet afhangt van de gekozen waarde. Onder 11px blijft ze
    // leesbaar en schuift het blok horizontaal. De kleinste verschillen in
    // hoogte vangt hoogste op.
    var hoogste = 0;
    var tex = maakTex("1em", false);
    s = schuif(rij, { naam: "a", label: "rechterlid a", waarden: lijst().map(function (w) { return w.w; }),
      tekst: function () { return lijst()[s ? s.index() : BEGINWAARDE.sin].t; },
      index: BEGINWAARDE.sin }, vernieuw);
    function lijst() { return WAARDEN[modus]; }
    function a() { return s.waarde(); }
    function f(x) { return FUNCTIES[modus].f(x); }
    function opl() { return oplossingen(modus, a()); }
    function op(m) { return function () { return modus === m; }; }

    // De grafiek en de rechte y = a.
    ctx.stijl(bord.create("functiongraph", [f, 0, 2 * PI],
      opties({ strokeWidth: 2.5 })), "kromme");
    [PI / 2, 3 * PI / 2].forEach(function (x) {
      ctx.stijl(bord.create("segment", [[x, -GRENS], [x, GRENS]],
        opties({ strokeWidth: 1, dash: 3, visible: op("tan") })), "hulp");
    });
    ctx.stijl(bord.create("segment", [[0, function () { return a(); }], [2 * PI, function () { return a(); }]],
      opties({ strokeWidth: 2 })), "secante");
    ctx.stijl(bord.create("text", [2 * PI + 0.08, function () { return a(); },
      function () { return "y = " + lijst()[s.index()].t; }],
      opties({ anchorY: "middle", fontSize: 13 })), "secante");

    // Op de cirkel: de rechte die bij a hoort.
    ctx.stijl(bord.create("segment", [[CX - 1.25, function () { return a(); }],
      [CX + 1.25, function () { return a(); }]],
      opties({ strokeWidth: 2, visible: op("sin") })), "secante");
    ctx.stijl(bord.create("segment", [[function () { return CX + a(); }, -1.25],
      [function () { return CX + a(); }, 1.25]],
      opties({ strokeWidth: 2, visible: op("cos") })), "secante");
    ctx.stijl(bord.create("segment", [[CX + 1, -GRENS], [CX + 1, GRENS]],
      opties({ strokeWidth: 1, visible: op("tan") })), "hulp");
    ctx.stijl(bord.create("segment", [[CX - 1, function () { return -a(); }],
      [CX + 1, function () { return a(); }]],
      opties({ strokeWidth: 2, visible: op("tan") })), "secante");
    ctx.stijl(bord.create("point", [CX + 1, function () { return a(); }], {
      name: "", size: 3, fixed: true, highlight: false, showInfobox: false,
      visible: op("tan") }), "secante");

    // De oplossingen van de ongelijkheid: dikke stukken op cirkel en grafiek.
    if (ongelijk) {
      ctx.stijl(bord.create("functiongraph", [function (x) {
        return voldoet(modus, rel, a(), x) ? f(x) : NaN;
      }, 0, 2 * PI - 1e-6], opties({ strokeWidth: 6, strokeOpacity: 0.75 })), "punt");
      ctx.stijl(bord.create("curve", [
        function (t) { return voldoet(modus, rel, a(), t) ? CX + Math.cos(t) : NaN; },
        function (t) { return voldoet(modus, rel, a(), t) ? Math.sin(t) : NaN; },
        0, 2 * PI
      ], opties({ strokeWidth: 6, strokeOpacity: 0.75, numberPointsHigh: 1600 })), "punt");
    }

    // De grenspunten (bij een vergelijking: de oplossingen). Bij een strikte
    // ongelijkheid zijn ze open bolletjes: de grens hoort er niet bij.
    var open = [];
    for (var i = 0; i < 2; i++) {
      (function (i) {
        function x() { var o = opl(); return i < o.length ? o[i] : NaN; }
        function zichtbaar() { return i < opl().length; }
        var opCirkel = bord.create("point", [
          function () { return CX + Math.cos(x()); }, function () { return Math.sin(x()); }
        ], { name: "", size: 4, fixed: true, highlight: false, showInfobox: false,
             visible: zichtbaar, strokeWidth: 2 });
        var opGrafiek = bord.create("point", [x, function () { return a(); }], {
          name: "", size: 4, fixed: true, highlight: false, showInfobox: false,
          visible: zichtbaar, strokeWidth: 2 });
        open.push(opCirkel, opGrafiek);
        ctx.stijl(bord.create("segment", [[x, 0], [x, function () { return a(); }]],
          opties({ strokeWidth: 1, dash: 2, visible: zichtbaar })), "zwak");
        ctx.stijl(bord.create("text", [x, function () { return a() > 0 ? -0.62 : 0.4; },
          function () { return zichtbaar() ? piTekst(ctx, x()) : ""; }],
          opties({ anchorX: "middle", anchorY: "middle", fontSize: 14,
                   visible: zichtbaar })), "punt");
      })(i);
    }
    function kleurPunten(kleuren) {
      var k = kleuren || ctx.kleuren();
      var leeg = rel === "<" || rel === ">";
      // Het figuurvlak is licht doorschijnend; een open bolletje krijgt de
      // effen achtergrond van de pagina, anders schemert de dikke kromme erdoor.
      var vul = window.getComputedStyle(document.documentElement).getPropertyValue("--kleur-vlak").trim() || "#ffffff";
      open.forEach(function (p) {
        p.setAttribute({ strokeColor: k.punt, highlightStrokeColor: k.punt,
          fillColor: leeg ? vul : k.punt, highlightFillColor: leeg ? vul : k.punt });
      });
    }

    // Altijd vijf regels, elk met de hoogte van een breuk, zodat de schuif-
    // regelaar eronder niet verspringt.
    function zetUitwerking(aTekst, tekst) {
      var regels = ongelijk ? uitwerkingOngelijkheid(ctx, modus, rel, a(), aTekst)
        : uitwerkingVergelijking(ctx, modus, a(), aTekst);
      while (regels.length < (ongelijk ? 4 : 6)) regels.push("&");
      // Twee uitlijnpunten: de ⟺ (of een woord als grenspunten) in een eigen
      // kolom, daarna het gelijkteken. Een regel met && heeft die kolom al.
      var bron = "\\begin{alignedat}{2}" + regels.map(function (r) {
        if (r.indexOf("\\iff ") === 0) r = "\\iff\\quad&&" + r.slice(5);
        else if (r.indexOf("&&") < 0) r = "&&" + r;
        return r + "\\vphantom{\\left[\\frac{\\pi}{6}\\right]\\frac{\\sqrt{3}\\pi}{6}}";
      }).join("\\\\[2pt]") + "\\end{alignedat}";
      var breedte = uitwerking.clientWidth || 512;
      uitwerking.style.fontSize = Math.max(11, Math.min(16, breedte / 32.5)).toFixed(1) + "px";
      uitwerking.innerHTML = tex(bron, "");
      // Als blok, zodat de hoogte niet van de basislijn van de SVG afhangt.
      var svg = uitwerking.querySelector("svg");
      if (svg) svg.style.cssText += ";display:block;margin:0 auto";
      hoogste = Math.max(hoogste, uitwerking.offsetHeight);
      uitwerking.style.minHeight = hoogste + "px";
      if (!uitwerking.innerHTML) {
        uitwerking.textContent = tekst;
        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
          window.MathJax.startup.promise.then(werkBij);
        }
      }
    }

    function werkBij() {
      var aTekst = lijst()[s.index()].t;
      if (!ongelijk) {
        zetUitwerking(aTekst, algemeneOplossing(ctx, modus, a(), aTekst));
        return;
      }
      var o = opl();
      var tekst = modus + " x " + rel + " " + aTekst + ". ";
      tekst += o.length
        ? "Grenspunten in [0, 2π[: " + o.map(function (x) { return piTekst(ctx, x); }).join(" en ") + ". "
        : "Geen grenspunten: de rechte y = " + aTekst + " snijdt de grafiek niet. ";
      var v = intervallen(ctx, modus, rel, a());
      tekst += "Oplossingen in [0, 2π[: " + v + ".";
      if (v !== "∅") tekst += " Alle oplossingen: tel er k·" + FUNCTIES[modus].periodeTekst + " bij op.";
      zetUitwerking(aTekst, tekst);
    }
    function vernieuw() { kleurPunten(); bord.update(); werkBij(); }


    function kiesFunctie(m) {
      modus = m;
      s.zetLijst(lijst().map(function (w) { return w.w; }), BEGINWAARDE[m]);
      vernieuw();
    }
    var kiesF = keuzeknoppen(ctx, [
      { opschrift: "sin x", waarde: "sin" },
      { opschrift: "cos x", waarde: "cos" },
      { opschrift: "tan x", waarde: "tan" }
    ], modus, kiesFunctie);
    var kiesR = null;
    if (ongelijk) {
      kiesR = keuzeknoppen(ctx, ["<", "≤", ">", "≥"].map(function (r) {
        return { opschrift: r, waarde: r };
      }), rel, function (r) { rel = r; vernieuw(); });
    }

    function herstel() {
      rel = ongelijk ? "≤" : "=";
      if (kiesR) kiesR(rel);
      kiesF("sin");
      kiesFunctie("sin");
    }
    ctx.knop("Beginstand", herstel);
    vernieuw();
    return {
      reset: herstel,
      kleur: kleurPunten,
      herschaal: function () { hoogste = 0; uitwerking.style.minHeight = ""; werkBij(); },
      vernietig: function () {
        [rij, uitwerking].forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      }
    };
  }

  G.registreer("herhaling-vergelijking", function (ctx) { return vergelijkingsbord(ctx, false); });
  G.registreer("herhaling-ongelijkheid", function (ctx) { return vergelijkingsbord(ctx, true); });
})();
