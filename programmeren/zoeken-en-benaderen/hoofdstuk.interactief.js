/* Interactieve grafieken bij N01_ZoekenEnBenaderen.tex.
 *
 * Elke definitie hoort bij één omgeving interactievegrafiek uit de cursus en
 * draagt dezelfde naam als het tweede argument daarvan. De algemene runtime
 * (web/interactieve-grafieken.js) levert het bord, de kleuren per rol, de
 * tekstregel met de actuele waarden en de knoppen.
 *
 * De figuren tonen algoritmen, dus ze gaan stap voor stap: een klik is één
 * stap van het algoritme, en een tabel onder de grafiek houdt bij wat er al
 * gebeurde, zoals de strook bij een codeblok dat regel per regel loopt.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var JXG = window.JXG;
  if (!G || !JXG) return;

  /* --- Gedeelde hulpjes -------------------------------------------------- */

  // Een getal met een vast aantal decimalen, zoals Python het in een tabel
  // zou tonen: met een punt, en zonder "-0".
  function vast(x, d) {
    if (!isFinite(x)) return "—";
    var tekst = x.toFixed(d);
    return /^-0\.?0*$/.test(tekst) ? tekst.slice(1) : tekst;
  }

  // Genoeg decimalen om binnen een interval van deze breedte nog verschil te
  // zien, maar niet meer dan een float kan dragen.
  function decimalenVoor(breedte) {
    return Math.min(15, Math.max(3, Math.ceil(-Math.log10(breedte)) + 2));
  }

  // Een index als subscript, zodat x₁₂ ook zonder MathJax leesbaar is.
  var SUB = "₀₁₂₃₄₅₆₇₈₉";
  function sub(n) {
    return String(n).split("").map(function (c) { return SUB[+c]; }).join("");
  }

  // Een tabel onder de grafiek, net boven de beschrijving. toon(rijen, i)
  // zet de rijen en laat rij i oplichten; het kader schuift daar zelf heen,
  // zonder de pagina te laten verspringen.
  function tabel(ctx, koppen) {
    var kader = document.createElement("div");
    kader.className = "interactieve-grafiek-tabel";
    var t = document.createElement("table");
    var kop = document.createElement("tr");
    koppen.forEach(function (tekst) {
      var th = document.createElement("th");
      th.textContent = tekst;
      kop.appendChild(th);
    });
    var thead = document.createElement("thead");
    thead.appendChild(kop);
    var tbody = document.createElement("tbody");
    t.appendChild(thead);
    t.appendChild(tbody);
    kader.appendChild(t);
    var uitleg = ctx.figuur.querySelector(".interactieve-grafiek-uitleg");
    ctx.figuur.insertBefore(kader, uitleg);
    return {
      toon: function (rijen, huidig) {
        tbody.textContent = "";
        kader.hidden = !rijen.length;
        var gekozen = null;
        rijen.forEach(function (rij, i) {
          var tr = document.createElement("tr");
          if (i === huidig) { tr.className = "huidig"; gekozen = tr; }
          rij.forEach(function (cel) {
            var td = document.createElement("td");
            td.textContent = cel;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        if (gekozen) {
          var boven = gekozen.offsetTop - thead.offsetHeight;
          var onder = gekozen.offsetTop + gekozen.offsetHeight;
          if (boven < kader.scrollTop) kader.scrollTop = boven;
          else if (onder > kader.scrollTop + kader.clientHeight) {
            kader.scrollTop = onder - kader.clientHeight;
          }
        }
      },
      verwijder: function () { if (kader.parentNode) kader.parentNode.removeChild(kader); }
    };
  }

  // Knoppen die samen één keuze vormen, aaneengesloten zoals Kort, Lang en
  // Volledig in de kopbalk. Geeft een functie terug die de keuze zet.
  function schakelaar(ctx, label, namen, kies) {
    var knoppen = namen.map(function (naam, i) {
      return ctx.knop(naam, function () { zet(i); kies(i); });
    });
    var groep = document.createElement("span");
    groep.className = "interactieve-grafiek-schakelaar";
    groep.setAttribute("role", "group");
    groep.setAttribute("aria-label", label);
    groep.style.marginRight = "1rem";
    knoppen[0].parentNode.insertBefore(groep, knoppen[0]);
    knoppen.forEach(function (knop) { groep.appendChild(knop); });
    function zet(i) {
      knoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === i));
      });
    }
    return zet;
  }

  function schakel(knop, aan) { knop.setAttribute("aria-pressed", String(aan)); }

  // Laat het venster van het bord vloeiend naar een ander venster gaan. De
  // breedte en de hoogte veranderen logaritmisch: van 1 naar 0.001 inzoomen
  // gaat dan even vlot als van 0.001 naar 0.000001. Het doel wordt ook de
  // begrenzing die de runtime terugzet na een herschaling.
  // naElkBeeld wordt opgeroepen telkens het venster verschoof, voor het
  // tekenen: voor wat aan het venster vastzit maar versleepbaar moet blijven.
  function beweger(bord, naElkBeeld) {
    var lopend = null;
    function stop() {
      if (lopend) { window.cancelAnimationFrame(lopend); lopend = null; }
    }
    function naar(doel, duur) {
      stop();
      var begin = bord.getBoundingBox();
      bord.presBegrenzing = doel.slice();
      if (!duur) {
        bord.setBoundingBox(doel, false);
        if (naElkBeeld) naElkBeeld();
        bord.fullUpdate();
        return;
      }
      var b0 = begin[2] - begin[0], h0 = begin[1] - begin[3];
      var b1 = doel[2] - doel[0], h1 = doel[1] - doel[3];
      var mx0 = (begin[0] + begin[2]) / 2, my0 = (begin[1] + begin[3]) / 2;
      var mx1 = (doel[0] + doel[2]) / 2, my1 = (doel[1] + doel[3]) / 2;
      var start = null;
      function stap(tijd) {
        if (start === null) start = tijd;
        var t = Math.min(1, (tijd - start) / duur);
        var s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var b = b0 * Math.pow(b1 / b0, s), h = h0 * Math.pow(h1 / h0, s);
        // Het midden volgt de breedte, zodat wat in beeld blijft niet eerst
        // wegschuift en dan terugkomt.
        var u = Math.abs(b1 - b0) < 1e-300 ? s : (b - b0) / (b1 - b0);
        var mx = mx0 + (mx1 - mx0) * u, my = my0 + (my1 - my0) * u;
        bord.setBoundingBox([mx - b / 2, my + h / 2, mx + b / 2, my - h / 2], false);
        if (naElkBeeld) naElkBeeld();
        bord.fullUpdate();
        if (t < 1) lopend = window.requestAnimationFrame(stap);
        else lopend = null;
      }
      lopend = window.requestAnimationFrame(stap);
    }
    return { naar: naar, stop: stop };
  }

  // Een groot of klein getal zoals Python het toont: 1.19e-07, 2.10e+05.
  function wetenschappelijk(x) {
    var a = Math.abs(x);
    if (a === 0) return "0";
    if (a >= 0.001 && a < 100000) return String(Math.round(x * 1e6) / 1e6);
    var tekst = x.toExponential(2);
    return tekst.replace(/e([+-])(\d)$/, "e$10$2");
  }

  // De grafiek van f over het hele venster, met een vast aantal punten.
  // JSXGraph plot een functie adaptief, en in een venster van 1e-8 breed
  // houdt die methode er soms maar één punt aan over: de kromme verdwijnt.
  // Wie inzoomt tot de laatste decimalen, tekent de functie dus zelf.
  function functiekromme(bord, f, attributen) {
    var kromme = bord.create("curve", [[0], [0]], attributen);
    kromme.updateDataArray = function () {
      var v = bord.getBoundingBox();
      var aantal = 240;
      var stap = (v[2] - v[0]) / aantal;
      this.dataX = [];
      this.dataY = [];
      for (var i = -2; i <= aantal + 2; i++) {
        var x = v[0] + i * stap;
        this.dataX.push(x);
        this.dataY.push(f(x));
      }
    };
    return kromme;
  }

  function venster(bord) {
    var b = bord.getBoundingBox();
    return { links: b[0], boven: b[1], rechts: b[2], onder: b[3],
             breedte: b[2] - b[0], hoogte: b[1] - b[3] };
  }

  // De pijltjes en de spatie gaan naar een grafiek die de focus heeft.
  function toetsen(ctx, acties) {
    ctx.element.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      var actie = acties[e.key];
      if (!actie) return;
      e.preventDefault();
      actie();
    });
  }

  /* --- 1. Raad het getal ------------------------------------------------- */

  // Een raster van 1 tot 100, tien per rij. Wat nog kan, staat in het wit;
  // wat een gok uitsloot, wordt grijs. Zo is het halveren letterlijk te zien:
  // na een goede gok verdwijnt de helft van wat nog wit was.
  G.registreer("raadspel", function (ctx) {
    var N = 100;
    var KOLOMMEN = 10;
    var RIJEN = N / KOLOMMEN;
    var TEMPO = 1300;

    var bord = ctx.maakBord({
      begrenzing: [-0.2, RIJEN + 0.2, KOLOMMEN + 0.2, -0.2],
      assen: false,
      gelijkeschaal: true
    });

    function plaats(n) {
      var i = n - 1;
      return { x: i % KOLOMMEN, y: RIJEN - 1 - Math.floor(i / KOLOMMEN) };
    }

    var cellen = [];
    bord.suspendUpdate();
    for (var n = 1; n <= N; n++) {
      var p = plaats(n);
      var g = 0.05;
      var vak = bord.create("polygon", [
        [p.x + g, p.y + g], [p.x + 1 - g, p.y + g],
        [p.x + 1 - g, p.y + 1 - g], [p.x + g, p.y + 1 - g]], {
        fixed: true, highlight: false, hasInnerPoints: true,
        vertices: { visible: false },
        borders: { strokeWidth: 1, highlight: false, fixed: true }
      });
      var tekst = bord.create("text", [p.x + 0.5, p.y + 0.5, String(n)], {
        anchorX: "middle", anchorY: "middle", fixed: true, highlight: false
      });
      cellen.push({ vak: vak, tekst: tekst });
    }
    bord.unsuspendUpdate();

    var st;
    var knoppen = {};
    var speler = null;

    // Een korte melding midden op het bord. Bij Computer raadt gebeurt er
    // niets zolang er geen getal gekozen is; zonder deze melding lijkt een
    // klik op Afspelen dan een fout. De statusregel eronder zegt hetzelfde
    // voor een schermlezer, dus deze melding blijft voor hem verborgen.
    var melding = document.createElement("div");
    melding.setAttribute("aria-hidden", "true");
    melding.style.cssText = "position:absolute; left:50%; top:50%; " +
      "transform:translate(-50%,-50%); padding:.6rem 1.2rem; " +
      "background:var(--kleur-vlak); color:var(--kleur-accent); " +
      "border:2px solid var(--kleur-accent); border-radius:var(--straal); " +
      "font-size:1.15rem; font-weight:600; white-space:nowrap; " +
      "pointer-events:none; opacity:0; transition:opacity .25s; z-index:10;";
    ctx.element.appendChild(melding);
    var meldingKlok = null;

    function flits(tekst) {
      melding.textContent = tekst;
      melding.style.opacity = "1";
      window.clearTimeout(meldingKlok);
      meldingKlok = window.setTimeout(function () {
        melding.style.opacity = "0";
      }, 1800);
    }

    function wachtOpGetal() {
      if (st.modus !== 1 || st.geheim !== null) return false;
      flits("Klik eerst op een getal");
      return true;
    }

    function nieuwGeheim() { return 1 + Math.floor(Math.random() * N); }

    function begin(modus) {
      stopSpeler();
      st = {
        modus: modus === undefined ? (st ? st.modus : 0) : modus,
        geheim: null, links: 1, rechts: N, gokken: [], klaar: false,
        midden: false, bericht: "", invoer: ""
      };
      if (st.modus === 0) st.geheim = nieuwGeheim();
      teken();
    }

    // Wat de runtime ons als kleur per rol geeft; zo volgt ook het raster de
    // dag- en nachtstand.
    function kleurCel(n, k) {
      var cel = cellen[n - 1];
      var gok = null;
      st.gokken.forEach(function (x) { if (x.n === n) gok = x; });
      var mogelijk = n >= st.links && n <= st.rechts && !st.klaar;
      var gevonden = st.klaar && n === st.geheim;
      var vul = k.vlak, dekking = 0, tekst = k.tekst, rand = k.raster, dikte = 1;
      if (!mogelijk && !gevonden) { vul = k.zwak; dekking = 0.38; tekst = k.zwak; }
      if (mogelijk) { vul = k.punt; dekking = 0.08; }
      if (st.midden && mogelijk && n === Math.floor((st.links + st.rechts) / 2)) {
        rand = k.punt; dikte = 3;
      }
      if (gok) {
        rand = gok.oordeel < 0 ? k.punt : k.secante;
        dikte = 3;
      }
      if (gevonden) { vul = k.afgeleide; dekking = 0.45; rand = k.afgeleide; dikte = 3; tekst = k.tekst; }
      if (st.modus === 1 && n === st.geheim && !gevonden) { rand = k.afgeleide; dikte = 3; }
      var vet = gok || gevonden ? "700" : "";
      // Enkel wat veranderde, en rechtstreeks in visProp: setAttribute laat
      // na elke oproep het hele bord opnieuw tekenen, en met zes oproepen per
      // vakje duurde één klik enkele seconden.
      var sleutel = [vul, dekking, rand, dikte, tekst, vet].join("|");
      if (cel.sleutel === sleutel) return;
      cel.sleutel = sleutel;
      zet(cel.vak, { fillcolor: vul, fillopacity: dekking,
                     highlightfillcolor: vul, highlightfillopacity: dekking });
      cel.vak.borders.forEach(function (b) {
        zet(b, { strokecolor: rand, strokewidth: dikte, highlightstrokecolor: rand });
      });
      zet(cel.tekst, { strokecolor: tekst, highlightstrokecolor: tekst,
                       cssstyle: vet ? "font-weight:700" : "" });
      // JSXGraph 1.13 bewaart een nieuwe vulkleur van een vaste veelhoek wel,
      // maar zet ze niet altijd op het SVG-element; daarom ook rechtstreeks.
      if (cel.vak.rendNode) {
        cel.vak.rendNode.setAttribute("fill", vul);
        cel.vak.rendNode.setAttribute("fill-opacity", String(dekking));
      }
      if (cel.tekst.rendNode) {
        cel.tekst.rendNode.style.color = tekst;
        cel.tekst.rendNode.style.fontWeight = vet;
      }
    }

    function zet(el, eigenschappen) {
      for (var naam in eigenschappen) el.visProp[naam] = eigenschappen[naam];
    }

    function teken() {
      var k = ctx.kleuren();
      // Eerst alle vakjes, dan één keer het bord tekenen.
      for (var n = 1; n <= N; n++) kleurCel(n, k);
      bord.fullUpdate();
      var jij = st.modus === 0;
      knoppen.nieuw.hidden = !jij;
      knoppen.midden.hidden = !jij;
      knoppen.gok.hidden = jij;
      knoppen.speel.hidden = jij;
      // Zonder gekozen getal blijven ze klikbaar (aria-disabled), zodat een
      // klik de melding kan tonen; na het vinden is er echt niets meer te doen.
      var wacht = String(st.geheim === null);
      knoppen.gok.disabled = st.klaar;
      knoppen.speel.disabled = st.klaar;
      knoppen.gok.setAttribute("aria-disabled", wacht);
      knoppen.speel.setAttribute("aria-disabled", wacht);
      schakel(knoppen.midden, st.midden);
      schakel(knoppen.speel, speler !== null);
      ctx.toon(bericht());
    }

    function over() {
      return "Het getal ligt tussen " + st.links + " en " + st.rechts +
        " (" + (st.rechts - st.links + 1) + " mogelijkheden).";
    }

    function bericht() {
      if (st.bericht) return st.bericht;
      if (st.modus === 0) {
        return "Ik denk aan een getal van 1 tot 100. Klik op een vakje, of typ " +
          "een getal en druk Enter.";
      }
      return "Klik op het getal waaraan je denkt. De computer raadt het daarna.";
    }

    function oordeel(gok) {
      var pogingen = st.gokken.length;
      if (gok === st.geheim) {
        st.klaar = true;
        return "Juist, het was " + gok + "! Gevonden na " + pogingen +
          (pogingen === 1 ? " poging." : " pogingen.") +
          (pogingen <= 7 ? "" : " Met telkens het midden lukt het altijd in hoogstens 7.");
      }
      return null;
    }

    // Jij raadt: de computer kent het geheim en zegt te hoog of te laag.
    function jijGokt(gok) {
      if (st.klaar) return;
      if (gok < st.links || gok > st.rechts) {
        st.bericht = gok + " kan niet meer: dat weet je al. " + over();
        teken();
        return;
      }
      var richting = gok < st.geheim ? -1 : gok > st.geheim ? 1 : 0;
      st.gokken.push({ n: gok, oordeel: richting });
      var klaar = oordeel(gok);
      if (klaar) { st.bericht = klaar; teken(); return; }
      if (richting < 0) st.links = gok + 1;
      else st.rechts = gok - 1;
      st.bericht = "Poging " + st.gokken.length + ": " + gok + " is te " +
        (richting < 0 ? "laag" : "hoog") + ". " + over();
      teken();
    }

    // De computer raadt: telkens het midden, met de berekening erbij zoals
    // ze in het programma van de cursus staat.
    function computerGokt() {
      if (st.geheim === null || st.klaar) { stopSpeler(); return; }
      var l = st.links, r = st.rechts;
      var gok = Math.floor((l + r) / 2);
      var richting = gok < st.geheim ? -1 : gok > st.geheim ? 1 : 0;
      st.gokken.push({ n: gok, oordeel: richting });
      var reken = "gok = (" + l + " + " + r + ") // 2 = " + gok + ". ";
      var klaar = oordeel(gok);
      if (klaar) { st.bericht = reken + klaar; stopSpeler(); teken(); return; }
      if (richting < 0) {
        st.links = gok + 1;
        reken += "Te laag, dus links = " + st.links + ". ";
      } else {
        st.rechts = gok - 1;
        reken += "Te hoog, dus rechts = " + st.rechts + ". ";
      }
      st.bericht = reken + over();
      teken();
    }

    function stopSpeler() {
      if (speler !== null) { window.clearInterval(speler); speler = null; }
    }

    function kies(gok) {
      if (st.modus === 0) { jijGokt(gok); return; }
      if (st.gokken.length) return;       // het geheim ligt vast tijdens het raden
      st.geheim = gok;
      st.bericht = "Je denkt aan " + gok + ". Klik op Volgende gok en kijk hoe " +
        "de computer het vindt.";
      teken();
    }

    bord.on("down", function (e) {
      var c = bord.getUsrCoordsOfMouse(e);
      var kol = Math.floor(c[0]);
      var rij = RIJEN - 1 - Math.floor(c[1]);
      if (kol < 0 || kol >= KOLOMMEN || rij < 0 || rij >= RIJEN) return;
      kies(rij * KOLOMMEN + kol + 1);
    });

    // Typen werkt ook: cijfers en Enter, met de focus op de grafiek.
    ctx.element.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (/^[0-9]$/.test(e.key)) {
        st.invoer = (st.invoer + e.key).slice(-3);
        ctx.toon("Je typt: " + st.invoer + " (Enter om te kiezen)");
        e.preventDefault();
      } else if (e.key === "Enter" && st.invoer) {
        var gok = parseInt(st.invoer, 10);
        st.invoer = "";
        e.preventDefault();
        if (gok >= 1 && gok <= N) kies(gok);
      } else if (e.key === "Enter" || e.key === " ") {
        if (st.modus === 1) {
          e.preventDefault();
          if (!wachtOpGetal()) computerGokt();
        }
      }
    });

    var zetModus = schakelaar(ctx, "Wie raadt", ["Jij raadt", "Computer raadt"],
      function (i) { begin(i); if (i === 1) wachtOpGetal(); });
    knoppen.nieuw = ctx.knop("Nieuw getal", function () { begin(0); });
    knoppen.midden = ctx.knop("Toon het midden", function () {
      st.midden = !st.midden;
      teken();
    });
    knoppen.gok = ctx.knop("Volgende gok", function () {
      if (wachtOpGetal()) return;
      stopSpeler();
      computerGokt();
    });
    knoppen.speel = ctx.knop("Afspelen", function () {
      if (speler !== null) { stopSpeler(); teken(); return; }
      if (wachtOpGetal()) return;
      computerGokt();
      if (!st.klaar) speler = window.setInterval(computerGokt, TEMPO);
      teken();
    });
    knoppen.opnieuw = ctx.knop("Opnieuw", function () { begin(); });

    function herstel() { zetModus(0); begin(0); }
    herstel();

    return {
      reset: herstel,
      vernietig: function () { stopSpeler(); window.clearTimeout(meldingKlok); },
      kleur: function () { teken(); }
    };
  });

  /* --- 1b. Pogingen en logaritmen ---------------------------------------- */

  // Het aantal pogingen bij N getallen is een trap: telkens N verdubbelt,
  // komt er één trede bij. Eronder ligt de kromme log2(N+1), die de trap
  // raakt aan het einde van elke trede. Aftellen is de rechte y = N, die er
  // meteen bovenuit schiet.
  G.registreer("pogingen", function (ctx) {
    var VENSTERS = [
      { max: 128, begrenzing: [-14, 10, 142, -0.95] },
      { max: 1000, begrenzing: [-110, 11.6, 1110, -1.6] }
    ];
    var BEGIN = 50;
    var keuze = 0;
    var N = BEGIN;
    var aftellenZichtbaar = false;

    function log2(x) { return Math.log(x) / Math.LN2; }
    function pogingen(n) { return n < 1 ? 0 : Math.ceil(log2(n + 1) - 1e-12); }

    var bord = ctx.maakBord({
      begrenzing: VENSTERS[0].begrenzing, raster: true, assen: false
    });
    var zoom = beweger(bord);

    // Eigen assen, met N en pogingen als naam in plaats van x en y.
    // De getallen op de verticale as staan links, want rechts ervan loopt de
    // trap bij "Tot 1000" vlak langs de as.
    [["N", [[0, 0], [1, 0]], [-8, 14], { anchorX: "middle" }],
     ["pogingen", [[0, 0], [0, 1]], [10, -4], { anchorX: "right", anchorY: "middle", offset: [-7, 0] }]]
      .forEach(function (a) {
        a[3].cssClass = "grafiek-aslabel";
        ctx.stijl(bord.create("axis", a[1], {
          name: a[0], withLabel: true,
          label: { position: "urt", offset: a[2], cssClass: "grafiek-aslabel", useMathJax: false },
          ticks: { drawZero: false, majorHeight: 8, minorTicks: 0, label: a[3] }
        }), "as");
      });

    // De trap: trede k loopt van 2^(k-1) - 1 tot 2^k - 1, met de stijgers erbij.
    var trapX = [0], trapY = [0];
    for (var k = 1; k <= 11; k++) {
      trapX.push(Math.pow(2, k - 1) - 1, Math.pow(2, k) - 1);
      trapY.push(k, k);
    }
    ctx.stijl(bord.create("curve", [trapX, trapY], {
      strokeWidth: 3, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("functiongraph", [function (x) { return log2(x + 1); }, 0, 2000], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "kromme");
    var aftellen = ctx.stijl(bord.create("functiongraph", [function (x) { return x; }, 0, 20], {
      strokeWidth: 2.5, dash: 2, fixed: true, highlight: false, visible: false
    }), "secante");

    function vmax() { return VENSTERS[keuze].max; }
    ctx.stijl(bord.create("text", [
      function () { return 0.62 * vmax(); },
      function () { return pogingen(0.62 * vmax()) + 0.55; }, "halveren"], {
      anchorX: "middle", fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("text", [
      function () { return 0.8 * vmax(); },
      function () { return log2(0.8 * vmax() + 1) - 0.75; }, "log₂(N + 1)"], {
      anchorX: "middle", fixed: true, highlight: false
    }), "kromme");
    var aftellenNaam = ctx.stijl(bord.create("text", [
      function () { return 0.02 * vmax() + 8.6; }, 8.6, "aftellen: N"], {
      anchorX: "left", fixed: true, highlight: false, visible: false
    }), "secante");

    var as = bord.create("line", [[0, 0], [1, 0]], { visible: false, fixed: true });
    var P = ctx.stijl(bord.create("glider", [BEGIN, 0, as], {
      name: "N", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [7, 13] }
    }), "kromme");
    P.on("drag", function () { zet(P.X()); });

    ctx.stijl(bord.create("segment", [
      [function () { return N; }, 0],
      [function () { return N; }, function () { return pogingen(N); }]
    ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("segment", [
      [0, function () { return pogingen(N); }],
      [function () { return N; }, function () { return pogingen(N); }]
    ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("point", [function () { return N; }, function () { return pogingen(N); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("point", [function () { return N; }, function () { return log2(N + 1); }], {
      withLabel: false, size: 2.5, fixed: true, highlight: false, showInfobox: false
    }), "kromme");

    function werkBij() {
      var tekst = "N = " + N + ": log₂(" + (N + 1) + ") ≈ " + ctx.getal(log2(N + 1), 2) +
        ", naar boven afgerond " + pogingen(N) + (pogingen(N) === 1 ? " poging." : " pogingen.");
      if (aftellenZichtbaar) tekst += " Aftellen: tot " + N + " pogingen.";
      ctx.toon(tekst);
    }

    function zet(x) {
      N = Math.max(1, Math.min(vmax(), Math.round(x)));
      P.setPosition(JXG.COORDS_BY_USER, [N, 0]);
      bord.update();
      werkBij();
    }

    var kiesVenster = schakelaar(ctx, "Bereik", ["Tot 128", "Tot 1000"], function (i) {
      keuze = i;
      zoom.naar(VENSTERS[i].begrenzing, 600);
      zet(N);
    });
    ctx.knop("N verdubbelen", function () { zet(2 * N); });
    var knopAftellen = ctx.knop("Aftellen", function (knop) {
      aftellenZichtbaar = !aftellenZichtbaar;
      schakel(knop, aftellenZichtbaar);
      aftellen.setAttribute({ visible: aftellenZichtbaar });
      aftellenNaam.setAttribute({ visible: aftellenZichtbaar });
      bord.fullUpdate();
      werkBij();
    });

    function herstel() {
      keuze = 0;
      kiesVenster(0);
      zoom.naar(VENSTERS[0].begrenzing, 0);
      aftellenZichtbaar = false;
      schakel(knopAftellen, false);
      aftellen.setAttribute({ visible: false });
      aftellenNaam.setAttribute({ visible: false });
      zet(BEGIN);
    }
    ctx.knop("Beginstand", herstel);
    toetsen(ctx, {
      ArrowLeft: function () { zet(N - 1); },
      ArrowRight: function () { zet(N + 1); },
      ArrowUp: function () { zet(2 * N); },
      ArrowDown: function () { zet(Math.floor(N / 2)); }
    });
    herstel();
    return { reset: herstel, vernietig: zoom.stop };
  });

  /* --- 1c. De strook boven "De computer raadt" --------------------------- */

  // Eén strook van 1 tot 100 in het codeblok met [grafiek=raadstrook], tussen
  // de code en de stapinterface (de optie ingebed).
  // Bij elke stap van de bugknop kleurt ze wat de code op dat ogenblik weet:
  // grijs valt al weg, lichtblauw kan nog (van links tot rechts), oranje is
  // de gok. Een driehoekje onder de strook wijst het geheim aan.
  G.registreer("raadstrook", function (ctx) {
    var MIN = 1, MAX = 100;
    var bord = ctx.maakBord({
      begrenzing: [MIN - 0.8, 1.15, MAX + 0.8, -1.05], assen: false
    });
    var toestand = {};

    function bekend() {
      return typeof toestand.links === "number" && typeof toestand.rechts === "number";
    }
    function heeftGok() {
      return typeof toestand.gok === "number" && toestand.gok >= MIN && toestand.gok <= MAX;
    }
    function heeftGeheim() {
      return typeof toestand.geheim === "number" && toestand.geheim >= MIN && toestand.geheim <= MAX;
    }
    // Wat nog kan, van links tot rechts, afgeknipt tot de strook.
    function van() { return bekend() ? Math.max(MIN, Math.min(MAX + 1, toestand.links)) : MIN; }
    function tot() { return bekend() ? Math.max(van() - 1, Math.min(MAX, toestand.rechts)) : MAX; }

    function vlak(x0, x1, y0, y1) {
      return bord.create("polygon", [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], {
        fixed: true, highlight: false, withLines: false,
        vertices: { visible: false }, fillOpacity: 1
      });
    }
    // Eén grijze achtergrond, met daarop het blauwe stuk dat nog kan en de gok.
    var achter = vlak(MIN - 0.5, MAX + 0.5, 0, 1);
    var kan = vlak(function () { return van() - 0.5; }, function () { return tot() + 0.5; }, 0, 1);
    var gok = vlak(function () { return toestand.gok - 0.5; }, function () { return toestand.gok + 0.5; }, 0, 1);
    var rand = bord.create("polygon", [[MIN - 0.5, 0], [MAX + 0.5, 0], [MAX + 0.5, 1], [MIN - 0.5, 1]], {
      fixed: true, highlight: false, fillOpacity: 0, vertices: { visible: false },
      borders: { strokeWidth: 1, highlight: false }
    });
    ctx.stijl(bord.create("text", [MIN - 0.5, -0.55, String(MIN)], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false
    }), "zwak");
    ctx.stijl(bord.create("text", [MAX + 0.5, -0.55, String(MAX)], {
      anchorX: "right", anchorY: "middle", fixed: true, highlight: false
    }), "zwak");
    var pijl = bord.create("polygon", [
      [function () { return toestand.geheim - 1.2; }, -0.75],
      [function () { return toestand.geheim + 1.2; }, -0.75],
      [function () { return toestand.geheim; }, -0.15]], {
      fixed: true, highlight: false, withLines: false, vertices: { visible: false },
      fillOpacity: 1
    });
    // De naam staat aan de kant van het midden, zodat ze niet op 1 of 100 valt.
    function rechtsHelft() { return toestand.geheim > (MIN + MAX) / 2; }
    var pijlnaam = ctx.stijl(bord.create("text", [
      function () { return toestand.geheim + (rechtsHelft() ? -1.8 : 1.8); }, -0.5, "geheim"], {
      anchorX: function () { return rechtsHelft() ? "right" : "left"; },
      anchorY: "middle", fixed: true, highlight: false
    }), "tekst");

    function kleur() {
      var k = ctx.kleuren();
      achter.setAttribute({ fillColor: k.raster });
      kan.setAttribute({ fillColor: k.punt, fillOpacity: bekend() ? 0.35 : 0.15 });
      gok.setAttribute({ fillColor: k.secante, visible: heeftGok() });
      rand.borders.forEach(function (lijn) { lijn.setAttribute({ strokeColor: k.as }); });
      pijl.setAttribute({ fillColor: k.tekst, visible: heeftGeheim() });
      pijlnaam.setAttribute({ visible: heeftGeheim() });
      bord.fullUpdate();
    }

    // Geen tekstregel met de waarden: de stapinterface er vlak onder toont
    // ze al, als tekst die ook een schermlezer voorleest.
    function volg(t) {
      toestand = (t.soort === "stap" || t.soort === "uitvoering") && t.getallen ? t.getallen : {};
      kleur();
    }

    ctx.code(volg);
    kleur();
    return { kleur: kleur };
  });

  /* --- 2. Waar snijden 2^x en x^2? --------------------------------------- */

  // Een punt x op de x-as met de twee functiewaarden erboven, en onder de as
  // een band die zegt welke grafiek boven ligt. Die band is het idee achter
  // de bisectiemethode: waar hij van kleur wisselt, ligt een snijpunt.
  G.registreer("snijpunten", function (ctx) {
    var S = -0.7666646959621231;
    var BEGIN = -1.6;
    function f(x) { return Math.pow(2, x); }
    function g(x) { return x * x; }

    var bord = ctx.maakBord({ begrenzing: [-2.8, 21, 5.8, -4.2], raster: true });

    ctx.stijl(bord.create("functiongraph", [f, -2.8, 4.5], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("functiongraph", [g, -2.8, 4.5], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");
    // De namen links, waar de twee grafieken ver uit elkaar liggen.
    ctx.stijl(bord.create("text", [-2.65, 1.3, "y = 2ˣ"], {
      fixed: true, highlight: false
    }), "punt");
    ctx.stijl(bord.create("text", [-1.95, 7, "y = x²"], {
      fixed: true, highlight: false
    }), "secante");

    // De band: vier stukken, telkens tussen twee snijpunten.
    var BAND = -2.3;
    var stukken = [[-2.7, S, "<"], [S, 2, ">"], [2, 4, "<"], [4, 5.7, ">"]];
    stukken.forEach(function (stuk) {
      var rol = stuk[2] === ">" ? "punt" : "secante";
      ctx.stijl(bord.create("segment", [[stuk[0], BAND], [stuk[1], BAND]], {
        strokeWidth: 9, strokeOpacity: 0.55, fixed: true, highlight: false,
        lastArrow: false, firstArrow: false
      }), rol);
      ctx.stijl(bord.create("text", [(stuk[0] + stuk[1]) / 2, BAND - 1.1,
        stuk[2] === ">" ? "2ˣ > x²" : "2ˣ < x²"], {
        anchorX: "middle", anchorY: "middle", fixed: true, highlight: false
      }), "tekst");
    });

    // De drie snijpunten; het derde kennen we enkel bij benadering.
    [[2, 4, "(2, 4)"], [4, 16, "(4, 16)"], [S, f(S), "?"]].forEach(function (s) {
      ctx.stijl(bord.create("point", [s[0], s[1]], {
        name: s[2], size: 3, fixed: true, highlight: false, showInfobox: false,
        label: { offset: s[2] === "?" ? [-14, 12] : [-44, 8] }
      }), "kromme");
    });

    var as = bord.create("line", [[0, 0], [1, 0]], { visible: false, fixed: true });
    var X = ctx.stijl(bord.create("glider", [BEGIN, 0, as], {
      name: "x", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [6, -14] }
    }), "kromme");

    function beperk() {
      var x = Math.max(-2.6, Math.min(4.35, X.X()));
      if (x !== X.X()) X.setPosition(JXG.COORDS_BY_USER, [x, 0]);
    }
    X.on("drag", beperk);

    ctx.stijl(bord.create("segment", [
      [function () { return X.X(); }, BAND + 0.6],
      [function () { return X.X(); }, function () { return Math.max(f(X.X()), g(X.X())); }]
    ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("point", [function () { return X.X(); }, function () { return f(X.X()); }], {
      withLabel: false, size: 3.5, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("point", [function () { return X.X(); }, function () { return g(X.X()); }], {
      withLabel: false, size: 3.5, fixed: true, highlight: false, showInfobox: false
    }), "secante");

    function werkBij() {
      var x = X.X(), a = f(x), b = g(x);
      var tekst = "x = " + ctx.getal(x, 2) + ": 2ˣ = " + ctx.getal(a, 3) +
        " en x² = " + ctx.getal(b, 3);
      if (Math.abs(a - b) < 0.03) tekst += ". Hier snijden de grafieken elkaar bijna.";
      else tekst += ", dus 2ˣ " + (a > b ? ">" : "<") + " x²" +
        (a > b ? ": de blauwe grafiek ligt boven." : ": de oranje grafiek ligt boven.");
      ctx.toon(tekst);
    }
    bord.on("update", werkBij);

    function zet(x) {
      X.setPosition(JXG.COORDS_BY_USER, [x, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("x = −1", function () { zet(-1); });
    ctx.knop("x = 0", function () { zet(0); });
    ctx.knop("x = 3", function () { zet(3); });
    function herstel() { zet(BEGIN); }
    ctx.knop("Beginstand", herstel);
    toetsen(ctx, {
      ArrowLeft: function () { zet(Math.max(-2.6, X.X() - 0.1)); },
      ArrowRight: function () { zet(Math.min(4.35, X.X() + 0.1)); }
    });
    herstel();
    return { reset: herstel };
  });

  /* --- 3. De bisectiemethode --------------------------------------------- */

  // Eén klik is één stap. In elke stand staat het huidige interval als balk,
  // met het midden en de vergelijking van 2^m met m² erboven. De helft die
  // overblijft is al donkerder: zo zie je waarom de volgende stap die kant
  // op gaat. Met Inzoomen volgt het venster het interval, anders is het na
  // een stap of acht te smal om nog iets te zien.
  G.registreer("bisectie", function (ctx) {
    var BEGIN = [-1, 0];
    var DOEL = 1e-12;
    var MAX = 44;
    var BASIS = [-1.3, 1.4, 0.3, -0.8];
    function f(x) { return Math.pow(2, x); }
    function g(x) { return x * x; }

    // Alle intervallen ineens, zoals het programma ze zou doorlopen.
    var stappen = [{ l: BEGIN[0], r: BEGIN[1] }];
    while (stappen.length < MAX) {
      var laatste = stappen[stappen.length - 1];
      if (laatste.r - laatste.l <= DOEL) break;
      var m = (laatste.l + laatste.r) / 2;
      stappen.push(f(m) > g(m) ? { l: laatste.l, r: m } : { l: m, r: laatste.r });
    }

    var bord = ctx.maakBord({ begrenzing: BASIS, raster: true });
    var beweeg = beweger(bord);
    var st = { i: 0, zoom: true };

    function huidig() { return stappen[st.i]; }
    function midden() { return (huidig().l + huidig().r) / 2; }
    function nietLaatste() { return st.i < stappen.length - 1; }

    ctx.stijl(functiekromme(bord, f, {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(functiekromme(bord, g, {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");

    // De balk hangt vast aan de onderkant van het venster, niet aan de x-as,
    // want na het inzoomen is die as allang uit beeld.
    function balkY() { var v = venster(bord); return v.onder + v.hoogte * 0.1; }
    function naamY() { var v = venster(bord); return v.onder + v.hoogte * 0.035; }

    ctx.stijl(bord.create("segment", [
      [function () { return huidig().l; }, balkY],
      [function () { return huidig().r; }, balkY]
    ], { strokeWidth: 8, strokeOpacity: 0.28, fixed: true, highlight: false,
         lineCap: "butt" }), "punt");
    // De helft die overblijft na deze stap.
    function blijft() {
      if (!nietLaatste()) return huidig();
      return stappen[st.i + 1];
    }
    ctx.stijl(bord.create("segment", [
      [function () { return blijft().l; }, balkY],
      [function () { return blijft().r; }, balkY]
    ], { strokeWidth: 8, strokeOpacity: 0.75, fixed: true, highlight: false,
         lineCap: "butt" }), "punt");

    function streep(x) {
      return ctx.stijl(bord.create("segment", [
        [x, function () { var v = venster(bord); return balkY() - v.hoogte * 0.03; }],
        [x, function () { var v = venster(bord); return balkY() + v.hoogte * 0.03; }]
      ], { strokeWidth: 2, fixed: true, highlight: false }), "kromme");
    }
    streep(function () { return huidig().l; });
    streep(function () { return huidig().r; });

    // Het midden, met de twee functiewaarden erboven.
    ctx.stijl(bord.create("segment", [
      [midden, balkY],
      [midden, function () { return Math.max(f(midden()), g(midden())); }]
    ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("point", [midden, function () { return f(midden()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("point", [midden, function () { return g(midden()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "secante");

    // Namen bij de balk. Wordt het interval op het scherm te smal, dan
    // schuiven ze op elkaar; dan laten we ze weg en spreekt de tabel.
    function breedGenoeg() {
      var v = venster(bord);
      var pixels = (huidig().r - huidig().l) / v.breedte * bord.canvasWidth;
      return pixels > 120;
    }
    [["links", function () { return huidig().l; }],
     ["midden", midden],
     ["rechts", function () { return huidig().r; }]].forEach(function (naam) {
      ctx.stijl(bord.create("text", [naam[1], naamY, function () {
        return breedGenoeg() ? naam[0] : "";
      }], { anchorX: "middle", anchorY: "middle", fixed: true, highlight: false }), "tekst");
    });

    // Na het inzoomen is de x-as uit beeld; deze regel zegt hoe ver we zitten.
    ctx.stijl(bord.create("text", [
      function () { var v = venster(bord); return v.links + v.breedte * 0.02; },
      function () { var v = venster(bord); return v.boven - v.hoogte * 0.09; },
      function () {
        var v = venster(bord);
        var factor = (BASIS[2] - BASIS[0]) / v.breedte;
        if (factor < 1.5) return "";
        return "vergroting ×" + (factor < 1e5 ? Math.round(factor) : wetenschappelijk(factor)) + ", van x = " +
          vast(v.links, decimalenVoor(v.breedte)) + " tot " + vast(v.rechts, decimalenVoor(v.breedte));
      }], { fixed: true, highlight: false }), "zwak");

    var logboek;

    function venstervoor(stap) {
      if (!st.zoom || stap === 0) return BASIS;
      var s = stappen[stap];
      var b = Math.max(s.r - s.l, 2e-11) * 1.7;
      var h = b * (BASIS[1] - BASIS[3]) / (BASIS[2] - BASIS[0]);
      var mx = (s.l + s.r) / 2;
      var my = f(mx) - h * 0.1;
      return [mx - b / 2, my + h / 2, mx + b / 2, my - h / 2];
    }

    function werkBij(duur) {
      var s = huidig();
      var m = midden();
      var d = decimalenVoor(s.r - s.l);
      var tekst = "Stap " + st.i + ": interval [" + vast(s.l, d) + ", " + vast(s.r, d) +
        "], breedte " + ctx.getal(s.r - s.l, d) + ". ";
      if (nietLaatste()) {
        var groter = f(m) > g(m);
        tekst += "Midden m = " + vast(m, d + 1) + ": 2ᵐ " + (groter ? ">" : "≤") +
          " m², dus m ligt " + (groter ? "rechts" : "links") + " van het snijpunt en " +
          (groter ? "rechts" : "links") + " = m.";
      } else {
        tekst += "Het interval is smaller dan 10⁻¹²: x ≈ " + vast(s.l, 12) + ".";
      }
      ctx.toon(tekst);

      var rijen = [];
      for (var i = 0; i <= st.i; i++) {
        var t = stappen[i];
        var dd = decimalenVoor(t.r - t.l);
        var mm = (t.l + t.r) / 2;
        rijen.push([String(i), vast(t.l, dd), vast(t.r, dd),
                    i < stappen.length - 1 ? vast(mm, dd + 1) : "",
                    i < stappen.length - 1 ? (f(mm) > g(mm) ? "ja" : "nee") : "",
                    wetenschappelijk(t.r - t.l)]);
      }
      logboek.toon(rijen, st.i);
      knoppen.volgende.disabled = !nietLaatste();
      knoppen.tien.disabled = !nietLaatste();
      knoppen.terug.disabled = st.i === 0;
      beweeg.naar(venstervoor(st.i), duur === undefined ? 650 : duur);
    }

    function ga(i, duur) {
      st.i = Math.max(0, Math.min(stappen.length - 1, i));
      werkBij(duur);
    }

    var knoppen = {};
    knoppen.volgende = ctx.knop("Halveer", function () { ga(st.i + 1); });
    knoppen.terug = ctx.knop("Terug", function () { ga(st.i - 1); });
    knoppen.tien = ctx.knop("Tien keer", function () { ga(st.i + 10, 1100); });
    knoppen.zoom = ctx.knop("Inzoomen", function () {
      st.zoom = !st.zoom;
      schakel(knoppen.zoom, st.zoom);
      werkBij();
    });
    schakel(knoppen.zoom, st.zoom);
    function herstel() { ga(0, 0); }
    ctx.knop("Beginstand", herstel);
    logboek = tabel(ctx, ["stap", "links", "rechts", "midden m", "2ᵐ > m²?", "breedte"]);

    toetsen(ctx, {
      ArrowRight: function () { ga(st.i + 1); },
      " ": function () { ga(st.i + 1); },
      ArrowLeft: function () { ga(st.i - 1); }
    });

    herstel();
    return {
      reset: herstel,
      vernietig: beweeg.stop,
      herschaal: function () { bord.fullUpdate(); }
    };
  });

  /* --- 3b. Eén ronde, gekoppeld aan de code ----------------------------- */

  // Deze figuur staat boven het codeblok met [grafiek=bisectie-stap]. De code
  // is de romp van de lus: ze definieert links en rechts niet zelf, maar
  // krijgt ze van de figuur, alsof de vorige ronde ze achterliet. Na elke
  // uitvoering neemt de figuur het nieuwe interval over, dus nog eens
  // uitvoeren is de volgende ronde. Zo doet de lezer met de hand wat de
  // while-lus straks doet, en ziet hij dat de toestand in links en rechts
  // van ronde tot ronde meegaat. Bij het stappen toont de figuur de waarden
  // voor de volgende regel: het midden, de vergelijking van de if, en de
  // helft die overblijft.
  G.registreer("bisectie-stap", function (ctx) {
    var BEGIN = { links: -1, rechts: 0 };
    var BASIS = [-1.3, 1.4, 0.3, -0.8];
    function f(x) { return Math.pow(2, x); }
    function g(x) { return x * x; }
    function kopie(iv) { return { links: iv.links, rechts: iv.rechts }; }
    function gelijk(a, b) { return a && b && a.links === b.links && a.rechts === b.rechts; }

    var bord = ctx.maakBord({ begrenzing: BASIS, raster: true });
    var beweeg = beweger(bord, function () { plaatsGrepen(); });

    // De toestand van de figuur: het interval waarmee de volgende ronde
    // begint. Wat er getoond wordt, staat in weergave.
    var interval = kopie(BEGIN);
    var logboek = [kopie(BEGIN)];
    var weergave = {
      nu: kopie(BEGIN), vorig: null, midden: null, conditie: null,
      stap: false, regel: null, regeltekst: "", leeg: false, soort: "code"
    };
    var sleept = false;

    ctx.stijl(functiekromme(bord, f, {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "punt");
    ctx.stijl(functiekromme(bord, g, {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");
    ctx.stijl(bord.create("text", [
      function () { var v = venster(bord); return v.links + v.breedte * 0.02; },
      function () { var v = venster(bord); return v.boven - v.hoogte * 0.07; },
      function () {
        var m = weergave.midden;
        if (m === null) return "";
        var tekst = "2ᵐ = " + ctx.getal(f(m), 4) + (f(m) > g(m) ? " > " : " ≤ ") +
          "m² = " + ctx.getal(g(m), 4);
        if (weergave.conditie) tekst += "  →  " + (weergave.conditie.waarde ? "True" : "False");
        return tekst;
      }], { fixed: true, highlight: false }), "tekst");

    function balkY() { var v = venster(bord); return v.onder + v.hoogte * 0.12; }

    // Het interval van de vorige ronde, licht, onder het huidige.
    function vorig() { return weergave.vorig || weergave.nu; }
    ctx.stijl(bord.create("segment", [
      [function () { return vorig().links; }, balkY],
      [function () { return vorig().rechts; }, balkY]
    ], { strokeWidth: 8, strokeOpacity: 0.2, fixed: true, highlight: false,
         lineCap: "butt" }), "punt");
    ctx.stijl(bord.create("segment", [
      [function () { return weergave.nu.links; }, balkY],
      [function () { return weergave.nu.rechts; }, balkY]
    ], { strokeWidth: 8, strokeOpacity: 0.4, fixed: true, highlight: false,
         lineCap: "butt" }), "punt");
    // Bij het stappen staat, zodra het midden er is, de helft die overblijft
    // al donker: zo zie je vooraf wat de if gaat beslissen.
    function blijft() {
      var m = weergave.midden;
      if (!weergave.stap || m === null || weergave.regel === null) return weergave.nu;
      return f(m) > g(m)
        ? { links: weergave.nu.links, rechts: Math.min(weergave.nu.rechts, m) }
        : { links: Math.max(weergave.nu.links, m), rechts: weergave.nu.rechts };
    }
    ctx.stijl(bord.create("segment", [
      [function () { return blijft().links; }, balkY],
      [function () { return blijft().rechts; }, balkY]
    ], { strokeWidth: 8, strokeOpacity: 0.75, fixed: true, highlight: false,
         lineCap: "butt" }), "punt");

    // Het midden, zodra het in een variabele zit.
    function m() { return weergave.midden === null ? NaN : weergave.midden; }
    ctx.stijl(bord.create("segment", [
      [m, balkY], [m, function () { return Math.max(f(m()), g(m())); }]
    ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    ctx.stijl(bord.create("point", [m, function () { return f(m()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("point", [m, function () { return g(m()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "secante");
    // Boven de balk, want na de ronde valt het midden samen met een grens,
    // en die heeft haar naam eronder.
    ctx.stijl(bord.create("text", [m, function () {
      var v = venster(bord); return balkY() + v.hoogte * 0.06;
    }, function () {
      return weergave.midden === null ? "" : "midden";
    }], { anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
          cssStyle: "padding-left:4px" }), "tekst");

    var code;
    var knoppen = {};
    var tabelLog = null;

    // De grenzen zijn grepen op de balk: slepen kiest een ander beginterval.
    function greep(naam) {
      var p = ctx.stijl(bord.create("point", [weergave.nu[naam], balkY()], {
        name: naam, size: 6, showInfobox: false,
        precision: { touch: 30, mouse: 8 },
        label: { offset: [naam === "links" ? -34 : 6, -18] }
      }), "kromme");
      p.on("down", function () { sleept = true; beweeg.stop(); });
      p.on("drag", function () {
        // Op vier decimalen, zoals een leerling het zou intypen, en altijd
        // minstens 0.0001 van de andere grens: een leeg interval halveert niets.
        var x = Number(Math.max(-2, Math.min(1, p.X())).toFixed(4));
        var ander = naam === "links" ? interval.rechts : interval.links;
        x = naam === "links" ? Math.min(x, Number((ander - 0.0001).toFixed(4)))
                             : Math.max(x, Number((ander + 0.0001).toFixed(4)));
        interval[naam] = x;
        toonInterval();
        p.setPosition(JXG.COORDS_BY_USER, [interval[naam], balkY()]);
        schrijfTekst();
      });
      p.on("up", function () {
        if (!sleept) return;
        sleept = false;
        logboek = [kopie(interval)];
        code.vooraf(kopie(interval));
        toon();
      });
      return p;
    }
    var grepen = { links: greep("links"), rechts: greep("rechts") };

    function plaatsGrepen() {
      ["links", "rechts"].forEach(function (naam) {
        var p = grepen[naam];
        p.setPosition(JXG.COORDS_BY_USER, [weergave.nu[naam], balkY()]);
        // De grens die de volgende regel verandert, staat wat groter.
        var komt = weergave.stap &&
          new RegExp("^\\s*" + naam + "\\s*=").test(weergave.regeltekst);
        p.setAttribute({ size: komt ? 9 : 6 });
      });
    }

    function venstervoor() {
      var l = Math.min(weergave.nu.links, vorig().links);
      var r = Math.max(weergave.nu.rechts, vorig().rechts);
      var b = (r - l) * 1.6;
      if (!(b > 0) || b >= (BASIS[2] - BASIS[0]) * 0.9) return BASIS;
      b = Math.max(b, 2e-11);
      var h = b * (BASIS[1] - BASIS[3]) / (BASIS[2] - BASIS[0]);
      var mx = (l + r) / 2;
      var my = f(mx) - h * 0.12;
      return [mx - b / 2, my + h / 2, mx + b / 2, my - h / 2];
    }

    function tekstVan(iv) {
      var d = decimalenVoor(Math.max(1e-15, iv.rechts - iv.links));
      return "links = " + ctx.getal(iv.links, d) + ", rechts = " + ctx.getal(iv.rechts, d);
    }

    function schrijfTekst() {
      var w = weergave;
      var tekst;
      if (sleept) {
        tekst = "De volgende ronde begint met " + tekstVan(interval) + ".";
      } else if (w.stap) {
        var d = decimalenVoor(Math.max(1e-15, w.nu.rechts - w.nu.links));
        tekst = w.regel === null
          ? "Alle regels zijn uitgevoerd: " + tekstVan(w.nu) + "."
          : "Nu is " + tekstVan(w.nu) +
            (w.midden !== null ? ", midden = " + ctx.getal(w.midden, d + 1) : "") +
            ". Volgende regel (" + w.regel + "): " + w.regeltekst.trim();
      } else if (w.soort === "uitvoering" && w.vorig) {
        tekst = "Ronde " + (logboek.length - 1) + ": " + tekstVan(w.nu) +
          ", half zo breed als ervoor. Voer de code opnieuw uit voor de volgende ronde.";
      } else if (w.soort === "fout") {
        tekst = "De code gaf een fout. Het interval blijft " + tekstVan(interval) + ".";
      } else {
        tekst = "De code begint met " + tekstVan(interval) +
          ". Voer ze uit, of stap er regel per regel door met de bugknop.";
      }
      ctx.toon(tekst);
    }

    function schrijfLog() {
      if (!tabelLog) return;
      tabelLog.toon(logboek.map(function (iv, i) {
        var d = decimalenVoor(Math.max(1e-15, iv.rechts - iv.links));
        return [String(i), vast(iv.links, d), vast(iv.rechts, d), wetenschappelijk(iv.rechts - iv.links)];
      }), logboek.length - 1);
    }

    function toonInterval() {
      weergave = { nu: kopie(interval), vorig: null, midden: null, conditie: null,
                   stap: false, regel: null, regeltekst: "", leeg: false, soort: "code" };
    }

    function toon(duur) {
      plaatsGrepen();
      schrijfTekst();
      schrijfLog();
      if (knoppen.ronde) knoppen.ronde.disabled = !code.beschikbaar();
      beweeg.naar(venstervoor(), duur === undefined ? 600 : duur);
    }

    function getal(waarde, anders) {
      return typeof waarde === "number" && isFinite(waarde) ? waarde : anders;
    }

    // Een ronde is klaar: neem het nieuwe interval over. Enkel wanneer ze
    // begon waar de figuur nu staat, anders telt een opname twee keer.
    function neemOver(t, w) {
      if (!code) return false;
      var begon = { links: getal(t.vooraf.links, NaN), rechts: getal(t.vooraf.rechts, NaN) };
      var nieuw = { links: getal(w.links, NaN), rechts: getal(w.rechts, NaN) };
      if (!gelijk(begon, interval) || !isFinite(nieuw.links) || !isFinite(nieuw.rechts)) return false;
      interval = nieuw;
      if (!gelijk(nieuw, logboek[logboek.length - 1])) logboek.push(kopie(nieuw));
      code.vooraf(kopie(interval), false);
      return true;
    }

    function volg(t) {
      if (sleept) return;
      var w = t.getallen || {};
      if (t.soort === "stap") {
        var voor = { links: getal(t.vooraf.links, interval.links), rechts: getal(t.vooraf.rechts, interval.rechts) };
        weergave = {
          nu: { links: getal(w.links, voor.links), rechts: getal(w.rechts, voor.rechts) },
          vorig: voor, midden: getal(w.midden, null),
          conditie: t.conditie && /^\s*if\b/.test(t.regeltekst || "") ? t.conditie : null,
          stap: true, regel: t.regel, regeltekst: t.regeltekst || "",
          leeg: false, soort: "stap"
        };
        if (t.klaar && !t.fout) neemOver(t, w);
      } else if (t.soort === "uitvoering") {
        var oud = kopie(interval);
        if (neemOver(t, w)) {
          weergave = { nu: kopie(interval), vorig: oud, midden: getal(w.midden, null),
                       conditie: null, stap: false, regel: null, regeltekst: "",
                       leeg: false, soort: "uitvoering" };
        }
      } else {
        toonInterval();
        weergave.soort = t.soort;
      }
      if (tabelLog) toon();
    }

    code = ctx.code(volg);
    code.vooraf(kopie(interval));

    knoppen.ronde = ctx.knop("Volgende ronde", function () { code.voerUit(); });
    function herstel() {
      interval = kopie(BEGIN);
      logboek = [kopie(BEGIN)];
      code.vooraf(kopie(interval));
      toonInterval();
      toon();
    }
    ctx.knop("Beginstand", herstel);
    tabelLog = tabel(ctx, ["ronde", "links", "rechts", "breedte"]);

    toon(0);
    return {
      reset: herstel,
      vernietig: beweeg.stop,
      herschaal: function () { plaatsGrepen(); }
    };
  });

  /* --- 4. Tekenwissel ---------------------------------------------------- */

  // Twee schuifbare grenzen op de x-as en de functie x³ − 8x − 3 met drie
  // nulwaarden. Is er een tekenwissel, dan rekent de figuur de bisectie
  // meteen uit en toont ze de eerste middens als genummerde stippen: zo zie
  // je welke nulwaarde de methode kiest, en dat je die keuze niet maakt.
  G.registreer("tekenwissel", function (ctx) {
    var NULWAARDEN = [-2.618033988749895, -0.3819660112501051, 3];
    var BEGIN = [-4, 4];
    var STIPPEN = 8;
    function f(x) { return x * x * x - 8 * x - 3; }

    var bord = ctx.maakBord({ begrenzing: [-4.9, 40, 4.9, -42], raster: true });
    ctx.stijl(bord.create("functiongraph", [f, -4.3, 4.3], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");
    ctx.stijl(bord.create("text", [-3.4, -30, "f"], { fixed: true, highlight: false }), "kromme");

    var as = bord.create("segment", [[-4.6, 0], [4.6, 0]], { visible: false, fixed: true });
    function grens(x, naam, verschuiving) {
      return ctx.stijl(bord.create("glider", [x, 0, as], {
        name: naam, size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 }, label: { offset: verschuiving }
      }), "kromme");
    }
    var L = grens(BEGIN[0], "l", [-3, 14]);
    var R = grens(BEGIN[1], "r", [-3, 14]);

    function teken(x) { return f(x) > 0 ? "positief" : f(x) < 0 ? "negatief" : "nul"; }
    function rolVan(x) { return f(x) >= 0 ? "punt" : "secante"; }

    // Een punt op de grafiek boven elke grens, gekleurd naar het teken.
    var boven = [L, R].map(function (grenspunt) {
      ctx.stijl(bord.create("segment", [
        [function () { return grenspunt.X(); }, 0],
        [function () { return grenspunt.X(); }, function () { return f(grenspunt.X()); }]
      ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
      return bord.create("point", [
        function () { return grenspunt.X(); }, function () { return f(grenspunt.X()); }
      ], { withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false });
    });

    // De middens van de eerste stappen, en de nulwaarde die eruit komt.
    var middens = [];
    for (var i = 0; i < STIPPEN; i++) {
      middens.push(ctx.stijl(bord.create("point", [0, 0], {
        name: String(i + 1), size: 2.5, fixed: true, highlight: false,
        showInfobox: false, visible: false, label: { offset: [-3, 12] }
      }), "hulp"));
    }
    var gevonden = ctx.stijl(bord.create("point", [0, 0], {
      name: "", size: 5, face: "o", fixed: true, highlight: false,
      showInfobox: false, visible: false, label: { offset: [8, -16] }
    }), "afgeleide");

    function bisectie(l, r) {
      var reeks = [];
      var stappen = 0;
      while (r - l > 1e-12 && stappen < 80) {
        var m = (l + r) / 2;
        reeks.push(m);
        if (f(l) * f(m) > 0) l = m; else r = m;
        stappen++;
      }
      return { x: l, stappen: stappen, middens: reeks };
    }

    function werkBij() {
      var l = Math.min(L.X(), R.X()), r = Math.max(L.X(), R.X());
      var k = ctx.kleuren();
      [L, R].forEach(function (p, i) {
        var kleur = k[rolVan(p.X())];
        boven[i].setAttribute({ fillColor: kleur, strokeColor: kleur,
                                highlightFillColor: kleur, highlightStrokeColor: kleur });
      });
      var binnen = NULWAARDEN.filter(function (z) { return z > l && z < r; }).length;
      var tekst = "f(" + ctx.getal(l, 2) + ") = " + ctx.getal(f(l), 2) + " is " + teken(l) +
        ", f(" + ctx.getal(r, 2) + ") = " + ctx.getal(f(r), 2) + " is " + teken(r) + ". ";
      var wissel = f(l) * f(r) < 0 && r - l > 1e-9;
      if (wissel) {
        var uit = bisectie(l, r);
        // Een nummer enkel waar het niet op een vorig nummer valt: de
        // middens komen al snel vlak bij elkaar te liggen.
        var pixel = (bord.getBoundingBox()[2] - bord.getBoundingBox()[0]) / bord.canvasWidth;
        var benoemd = [];
        middens.forEach(function (p, i) {
          var zichtbaar = i < uit.middens.length;
          p.setAttribute({ visible: zichtbaar });
          if (!zichtbaar) return;
          var x = uit.middens[i];
          p.setPosition(JXG.COORDS_BY_USER, [x, 0]);
          var vrij = benoemd.every(function (y) { return Math.abs(x - y) > 16 * pixel; }) &&
            Math.abs(x - uit.x) > 30 * pixel;
          if (vrij) benoemd.push(x);
          p.setAttribute({ withLabel: vrij });
        });
        gevonden.setAttribute({ visible: true, name: "x ≈ " + ctx.getal(uit.x, 4) });
        gevonden.setPosition(JXG.COORDS_BY_USER, [uit.x, 0]);
        tekst += "Tekenwissel: er ligt zeker een nulwaarde tussen. De bisectiemethode vindt x ≈ " +
          ctx.getal(uit.x, 9) + " na " + uit.stappen + " stappen" +
          (binnen > 1 ? ", maar er liggen er " + binnen + " in dit interval." : ".");
      } else {
        middens.forEach(function (p) { p.setAttribute({ visible: false }); });
        gevonden.setAttribute({ visible: false });
        tekst += "Geen tekenwissel: de methode kan niet starten." +
          (binnen ? " Toch liggen er " + binnen + " nulwaarden in dit interval!" : "");
      }
      ctx.toon(tekst);
    }

    // De middens en de gevonden nulwaarde hangen van beide grenzen af; na
    // het verplaatsen rekenen we alles opnieuw uit en tekenen we pas dan.
    function vernieuw() { werkBij(); bord.update(); }
    L.on("drag", vernieuw);
    R.on("drag", vernieuw);

    function zet(paar) {
      L.setPosition(JXG.COORDS_BY_USER, [paar[0], 0]);
      R.setPosition(JXG.COORDS_BY_USER, [paar[1], 0]);
      vernieuw();
    }
    [[-4, 4], [-3, -2], [-1, 1], [-1, 4], [0, 4]].forEach(function (paar) {
      ctx.knop("[" + paar[0] + ", " + paar[1] + "]", function () { zet(paar); });
    });
    function herstel() { zet(BEGIN); }
    ctx.knop("Beginstand", herstel);
    herstel();
    return {
      reset: herstel,
      kleur: vernieuw
    };
  });

  /* --- 5. De secantmethode ----------------------------------------------- */

  // Twee benaderingen op de x-as, de secante door hun punten op de grafiek
  // en haar snijpunt met de x-as: de volgende benadering. Volgende stap
  // schuift alles één plaats op. De benaderingen zijn vrij versleepbaar,
  // ook naar plaatsen waar de methode misloopt.
  G.registreer("secant", function (ctx) {
    var FUNCTIES = [
      { naam: "x² − 2", f: function (x) { return x * x - 2; },
        start: [1, 2], basis: [-1.6, 3.4, 2.7, -2.6] },
      { naam: "2ˣ − x²", f: function (x) { return Math.pow(2, x) - x * x; },
        start: [-1, 0], basis: [-1.7, 1.6, 0.7, -1.6] },
      { naam: "x³ − 8x − 3", f: function (x) { return x * x * x - 8 * x - 3; },
        start: [-3, -2], basis: [-4.9, 24, 4.9, -24] }
    ];
    var DOEL = 1e-12;

    var st = { keuze: 0, reeks: [], i: 0, zoom: true };
    function F() { return FUNCTIES[st.keuze]; }
    function f(x) { return F().f(x); }

    var bord = ctx.maakBord({ begrenzing: FUNCTIES[0].basis, raster: true });
    var beweeg = beweger(bord);

    ctx.stijl(functiekromme(bord, function (x) { return f(x); }, {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "kromme");

    var as = bord.create("line", [[0, 0], [1, 0]], { visible: false, fixed: true });
    function benadering(naam) {
      return ctx.stijl(bord.create("glider", [0, 0, as], {
        name: naam, size: 5, showInfobox: false,
        precision: { touch: 30, mouse: 6 }, label: { offset: [-6, -24] }
      }), "punt");
    }
    var P0 = benadering("x₀");
    var P1 = benadering("x₁");

    function x0() { return P0.X(); }
    function x1() { return P1.X(); }
    function volgende() {
      var f0 = f(x0()), f1 = f(x1());
      if (f1 === f0) return NaN;
      return x1() - f1 * (x1() - x0()) / (f1 - f0);
    }

    [P0, P1].forEach(function (p) {
      ctx.stijl(bord.create("segment", [
        [function () { return p.X(); }, 0],
        [function () { return p.X(); }, function () { return f(p.X()); }]
      ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false }), "hulp");
    });
    var A = ctx.stijl(bord.create("point", [x0, function () { return f(x0()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    var B = ctx.stijl(bord.create("point", [x1, function () { return f(x1()); }], {
      withLabel: false, size: 4, fixed: true, highlight: false, showInfobox: false
    }), "punt");
    ctx.stijl(bord.create("line", [A, B], {
      strokeWidth: 2, fixed: true, highlight: false
    }), "secante");
    var X2 = ctx.stijl(bord.create("point", [volgende, 0], {
      name: "x₂", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-6, 14] }
    }), "secante");
    ctx.stijl(bord.create("segment", [
      [volgende, 0], [volgende, function () { return f(volgende()); }]
    ], { strokeWidth: 1, dash: 3, fixed: true, highlight: false }), "hulp");

    function benoem() {
      P0.setAttribute({ name: "x" + sub(st.i) });
      P1.setAttribute({ name: "x" + sub(st.i + 1) });
      X2.setAttribute({ name: "x" + sub(st.i + 2) });
    }

    var logboek;
    var knoppen = {};

    function venstervoor() {
      var basis = F().basis;
      if (!st.zoom || st.i === 0) return basis;
      var xs = [x0(), x1()];
      var nx = volgende();
      if (isFinite(nx)) xs.push(nx);
      var lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
      var b = Math.max((hi - lo) * 1.8, 4e-11);
      var verhouding = (basis[1] - basis[3]) / (basis[2] - basis[0]);
      var mx = (lo + hi) / 2;
      // De schaal van y volgt de helling van f, zodat de secante er schuin
      // blijft uitzien en niet plat wordt.
      var helling = Math.abs((f(x1()) - f(x0())) / (x1() - x0())) || 1;
      var h = Math.max(b * helling * 1.4, b * verhouding * 0.2);
      var ys = [0, f(x0()), f(x1())];
      var my = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
      h = Math.max(h, (Math.max.apply(null, ys) - Math.min.apply(null, ys)) * 1.5);
      if (!isFinite(h) || !isFinite(mx) || b > (basis[2] - basis[0])) return basis;
      return [mx - b / 2, my + h / 2, mx + b / 2, my - h / 2];
    }

    function klaar() { return Math.abs(x1() - x0()) < DOEL; }

    function werkBij(duur) {
      benoem();
      var nx = volgende();
      var tekst = "x" + sub(st.i) + " = " + vast(x0(), 12) + ", x" + sub(st.i + 1) + " = " +
        vast(x1(), 12) + ". ";
      if (klaar()) {
        tekst += "Twee opeenvolgende benaderingen verschillen minder dan 10⁻¹²: klaar na " +
          st.i + " stappen.";
      } else if (!isFinite(nx)) {
        tekst += "f(x" + sub(st.i) + ") = f(x" + sub(st.i + 1) + "): de secante is horizontaal " +
          "en snijdt de x-as niet. In het programma deel je hier door nul.";
      } else {
        tekst += "De secante snijdt de x-as in x" + sub(st.i + 2) + " = " + vast(nx, 12) + ".";
        var v = F().basis;
        if (nx < v[0] || nx > v[2]) tekst += " Dat ligt ver buiten beeld: de methode springt weg.";
      }
      ctx.toon(tekst);

      var rijen = st.reeks.slice(0, st.i + 2).map(function (x, n) {
        return [String(n), vast(x, 12), vast(f(x), 12)];
      });
      logboek.toon(rijen, st.i + 1);
      knoppen.volgende.disabled = klaar() || !isFinite(nx);
      knoppen.terug.disabled = st.i === 0;
      beweeg.naar(venstervoor(), duur === undefined ? 650 : duur);
    }

    function zetPaar() {
      P0.setPosition(JXG.COORDS_BY_USER, [st.reeks[st.i], 0]);
      P1.setPosition(JXG.COORDS_BY_USER, [st.reeks[st.i + 1], 0]);
      bord.update();
    }

    function stap() {
      var nx = volgende();
      if (!isFinite(nx) || klaar()) return;
      st.reeks = st.reeks.slice(0, st.i + 2);
      st.reeks.push(nx);
      st.i++;
      zetPaar();
      werkBij();
    }

    function terug() {
      if (st.i === 0) return;
      st.i--;
      zetPaar();
      werkBij();
    }

    // Slepen begint een nieuwe reeks vanuit de twee versleepte waarden.
    [P0, P1].forEach(function (p) {
      p.on("drag", function () {
        beweeg.stop();
        st.reeks = [x0(), x1()];
        st.i = 0;
        bord.presBegrenzing = bord.getBoundingBox();
        benoem();
        werkBij(0);
      });
    });

    function begin(keuze, duur) {
      if (keuze !== undefined) st.keuze = keuze;
      st.reeks = F().start.slice();
      st.i = 0;
      zetPaar();
      werkBij(duur);
    }

    var zetKeuze = schakelaar(ctx, "Functie", FUNCTIES.map(function (fn) { return fn.naam; }),
      function (i) { begin(i); });
    knoppen.volgende = ctx.knop("Volgende stap", stap);
    knoppen.terug = ctx.knop("Terug", terug);
    knoppen.zoom = ctx.knop("Inzoomen", function () {
      st.zoom = !st.zoom;
      schakel(knoppen.zoom, st.zoom);
      werkBij();
    });
    schakel(knoppen.zoom, st.zoom);
    ctx.knop("Horizontaal", function () {
      // Het voorbeeld uit de cursus: symmetrisch rond de top van x² − 2.
      zetKeuze(0);
      st.keuze = 0;
      st.reeks = [-1, 1];
      st.i = 0;
      zetPaar();
      werkBij();
    });
    function herstel() { zetKeuze(0); begin(0, 0); }
    ctx.knop("Beginstand", herstel);
    logboek = tabel(ctx, ["n", "xₙ", "f(xₙ)"]);

    toetsen(ctx, { ArrowRight: stap, " ": stap, ArrowLeft: terug });

    herstel();
    return { reset: herstel, vernietig: beweeg.stop };
  });

  /* --- 6. Bisectie tegen secant ------------------------------------------ */

  // Het aantal juiste decimalen na elke stap, voor beide methoden naast
  // elkaar. De bisectie klimt als een rechte, de secant als een kromme die
  // steeds steiler wordt. Voor de hoogte nemen we −log₁₀ van de fout, dus
  // ook de halve decimalen: zo zie je het verloop, niet enkel de trappen.
  G.registreer("wedstrijd", function (ctx) {
    var STAPPEN = 40;
    var TEMPO = 220;
    var MAXDEC = 16;
    var VERGELIJKINGEN = [
      { naam: "√2", f: function (x) { return x * x - 2; }, start: [1, 2],
        exact: Math.SQRT2 },
      { naam: "2ˣ = x²", f: function (x) { return Math.pow(2, x) - x * x; }, start: [-1, 0],
        exact: -0.7666646959621231 }
    ];

    function decimalen(fout) {
      if (fout === 0) return MAXDEC;
      return Math.max(0, Math.min(MAXDEC, -Math.log10(Math.abs(fout))));
    }

    function reeksen(v) {
      var l = v.start[0], r = v.start[1], bis = [];
      for (var n = 0; n <= STAPPEN; n++) {
        var m = (l + r) / 2;
        bis.push(decimalen(m - v.exact));
        if (v.f(l) * v.f(m) > 0) l = m; else r = m;
      }
      var x0 = v.start[0], x1 = v.start[1], sec = [decimalen(x1 - v.exact)];
      while (sec.length <= STAPPEN && Math.abs(x1 - x0) >= 1e-15) {
        var f0 = v.f(x0), f1 = v.f(x1);
        if (f0 === f1) break;
        var x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
        x0 = x1; x1 = x2;
        sec.push(decimalen(x1 - v.exact));
      }
      return { bis: bis, sec: sec };
    }

    var bord = ctx.maakBord({ begrenzing: [-4, 18.5, 45, -2.6], raster: true, assen: false });
    [["stap", [[0, 0], [1, 0]], [-10, 14]], ["decimalen", [[0, 0], [0, 1]], [12, -6]]]
      .forEach(function (a) {
        ctx.stijl(bord.create("axis", a[1], {
          name: a[0], withLabel: true,
          label: { position: "urt", offset: a[2], cssClass: "grafiek-aslabel", useMathJax: false },
          ticks: { drawZero: true, majorHeight: 8, minorTicks: 0, insertTicks: false,
                   ticksDistance: a[0] === "stap" ? 5 : 4,
                   label: { cssClass: "grafiek-aslabel", anchorX: "middle" } }
        }), "as");
      });

    var st = { keuze: 0, n: 0, data: null };
    var speler = null;

    function lijn(rol) {
      var kromme = bord.create("curve", [[0], [0]], {
        strokeWidth: 2.5, fixed: true, highlight: false
      });
      return ctx.stijl(kromme, rol);
    }
    var lijnBis = lijn("punt");
    var lijnSec = lijn("secante");
    var kopBis = ctx.stijl(bord.create("point", [0, 0], {
      name: "bisectie", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [-30, -16] }
    }), "punt");
    var kopSec = ctx.stijl(bord.create("point", [0, 0], {
      name: "secant", size: 4, fixed: true, highlight: false, showInfobox: false,
      label: { offset: [8, 6] }
    }), "secante");

    function tot(reeks, n) {
      var m = Math.min(n, reeks.length - 1);
      var xs = [], ys = [];
      for (var i = 0; i <= m; i++) { xs.push(i); ys.push(reeks[i]); }
      return { xs: xs, ys: ys, laatste: m };
    }

    function werkBij() {
      var d = st.data;
      var b = tot(d.bis, st.n), s = tot(d.sec, st.n);
      lijnBis.dataX = b.xs; lijnBis.dataY = b.ys;
      lijnSec.dataX = s.xs; lijnSec.dataY = s.ys;
      kopBis.setPosition(JXG.COORDS_BY_USER, [b.laatste, d.bis[b.laatste]]);
      kopSec.setPosition(JXG.COORDS_BY_USER, [s.laatste, d.sec[s.laatste]]);
      bord.update();
      var secKlaar = s.laatste < st.n;
      function juist(k) { k = Math.floor(k); return k + (k === 1 ? " juiste decimaal" : " juiste decimalen"); }
      var tekst = "Na " + st.n + (st.n === 1 ? " stap" : " stappen") + ": bisectie " +
        juist(d.bis[b.laatste]) + ", secant " + juist(d.sec[s.laatste]) + ".";
      if (secKlaar) {
        tekst += " De secantmethode stopte na " + s.laatste +
          " stappen: twee benaderingen vallen samen.";
      }
      if (st.n >= STAPPEN) tekst += " De bisectie heeft 40 stappen nodig voor 12 decimalen.";
      ctx.toon(tekst);
      knoppen.stap.disabled = st.n >= STAPPEN;
      schakel(knoppen.start, speler !== null);
    }

    function stopSpeler() {
      if (speler !== null) { window.clearInterval(speler); speler = null; }
    }

    function ga(n) {
      st.n = Math.max(0, Math.min(STAPPEN, n));
      if (st.n >= STAPPEN) stopSpeler();
      werkBij();
    }

    function kies(i) {
      stopSpeler();
      st.keuze = i;
      st.data = reeksen(VERGELIJKINGEN[i]);
      ga(0);
    }

    var knoppen = {};
    var zetKeuze = schakelaar(ctx, "Vergelijking",
      VERGELIJKINGEN.map(function (v) { return v.naam; }), kies);
    knoppen.start = ctx.knop("Start", function () {
      if (speler !== null) { stopSpeler(); werkBij(); return; }
      if (st.n >= STAPPEN) st.n = 0;
      speler = window.setInterval(function () { ga(st.n + 1); }, TEMPO);
      werkBij();
    });
    knoppen.stap = ctx.knop("Eén stap", function () { stopSpeler(); ga(st.n + 1); });
    ctx.knop("Alles", function () { stopSpeler(); ga(STAPPEN); });
    function herstel() { zetKeuze(0); kies(0); }
    ctx.knop("Beginstand", herstel);
    toetsen(ctx, {
      ArrowRight: function () { stopSpeler(); ga(st.n + 1); },
      ArrowLeft: function () { stopSpeler(); ga(st.n - 1); }
    });

    herstel();
    return { reset: herstel, vernietig: stopSpeler };
  });
})();
