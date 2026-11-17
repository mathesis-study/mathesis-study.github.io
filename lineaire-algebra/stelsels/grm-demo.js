/* ---------------------------------------------------------------------------
 * grm-demo.js — een stap-voor-stap demo op een echte TI-84 (ti84-calculator).
 *
 * \begin{grmdemo} (grm.sty) zet <div class="grm-demo"> om stappen heen, elk
 * een <div class="grm-stap" data-toetsen="[y=]..."> met links de tekst en
 * rechts het statische scherm (grm-toetsen.js zet de toetsen om). Hier komt de
 * rekenmachine als iframe naast de tekst, met een knop die per klik de toetsen
 * van één stap traag afspeelt, zodat de leraar tussen de stappen kan uitleggen,
 * knoppen voor begin, één stap terug en einde, een klik op de tekst van een stap, en dezelfde stappen op ↓ en ↑ (presentatiewijzer).
 * De rekenmachine draait met ?embed en praat enkel via postMessage (zie vendor/ti84/js/embed.js):
 *
 *   naar het frame: { ti84: 'reset', keys } | { ti84: 'press', keys, delay, id } | { ti84: 'stop' }
 *                   { ti84: 'theme', theme: 'light' | 'dark' }
 *   van het frame:  { ti84: 'ready' } | { ti84: 'done', id }
 *
 * Een demo met de klasse grm-demo-vervolg (\begin{grmdemo}[vervolg]) gaat verder
 * waar de vorige demo op de pagina eindigde: haar beginstand is de rekenmachine
 * na alle stappen van die vorige (reset met keys).
 *
 * Wat later op de pagina komt (een oefening op de vbtl-site), krijgt zijn
 * demo bij pres:zichtbaar.
 *
 * Mislukt het laden, dan blijven de statische schermen van de PDF-opmaak
 * staan: pas bij 'ready' krijgt de demo de klasse grm-demo-actief.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  var BRON = "vendor/ti84/index.html?embed";
  var TOETSTEMPO = 1000;    // ms na een toets die je aanwijst: [y=], [enter]
  var TYPTEMPO = 400;       // ms na een getypt teken: 3X^4+8
  var langzaam = false;
  var tempoVolgers = [];

  // De rekenmachine volgt de dag- en nachtstand van de site: overdag de witte
  // behuizing, 's nachts de donkere.
  // Zonder gekozen stand volgt de site het toestel (vbtl).
  function thema() {
    var gekozen = document.documentElement.getAttribute("data-thema");
    if (!gekozen) gekozen = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "donker" : "licht";
    return gekozen === "donker" ? "dark" : "light";
  }

  // De pictogrammen van de knoppen komen uit presentatie.js; een pagina
  // zonder (de vbtl-site) tekent dezelfde zelf.
  var PICTOGRAM = {
    begin: "M5 5v14M19 6l-9 6 9 6z",
    links: "M15 18l-6-6 6-6",
    rechts: "M9 18l6-6-6-6",
    einde: "M19 5v14M5 6l9 6-9 6z",
    schildpad: "M10 6V4a2 2 0 0 1 4 0v2M8 8 5 6 3 8l4 3m9-3 3-2 2 2-4 3M7 15l-4 3 2 2 4-3m8-2 4 3-2 2-4-3m-4 3 1 2 1-2M18 12c0 4-2.7 7-6 7s-6-3-6-7 2.7-6 6-6 6 2 6 6ZM12 9l3 2-1 4h-4l-1-4 3-2Zm0-3v3m-6 3 3-1m9 1-3-1m-7 6 2-2m6 2-2-2"
  };

  function pictogram(naam) {
    if (window.mathesisIcoon && naam !== "schildpad") return window.mathesisIcoon(naam);
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", PICTOGRAM[naam]);
    svg.appendChild(p);
    return svg;
  }

  // De toetsen van alle stappen van de vorige demo op de pagina, met wat
  // daaraan voorafging: de beginstand van een demo met vervolg.
  var vorigeToetsen = null;

  function maak(demo) {
    // Een pagina die oefeningen pas later toont (vbtl), meldt ze met
    // pres:zichtbaar; een demo die al gemaakt is, blijft zoals ze is.
    if (demo._grmDemo) return;
    demo._grmDemo = true;
    var stappen;
    var vervolg = demo.classList.contains("grm-demo-vervolg");
    var vooraf = vervolg ? vorigeToetsen : "";
    vorigeToetsen = null;
    try {
      stappen = Array.prototype.map.call(demo.querySelectorAll(".grm-stap"), function (blok) {
        // Een getypt teken krijgt zijn eigen, kortere wachttijd (id:ms).
        var toetsen = window.GrmToetsen.lees(blok.getAttribute("data-toetsen")).map(function (t) {
          return t.letterlijk ? t.id + ":" + TYPTEMPO : t.id;
        });
        return { toetsen: toetsen.join(" "), blok: blok };
      });
    } catch (fout) {
      // Dan blijft de demo zoals op papier: de statische schermen blijven staan.
      console.error("grmdemo: " + fout.message);
      return;
    }
    if (!stappen.length) return;
    if (vooraf === null) {
      console.error("grmdemo: een demo met vervolg heeft geen bruikbare demo voor zich");
      return;
    }
    vorigeToetsen = (vooraf + " " + stappen.map(function (s) { return s.toetsen; }).join(" ")).trim();

    var tekst = document.createElement("div");
    tekst.className = "grm-demo-tekst";
    while (demo.firstChild) tekst.appendChild(demo.firstChild);

    var kolom = document.createElement("div");
    kolom.className = "grm-demo-rekenmachine";
    var klaar = false, bezig = false, volgende = 0, volgId = 0, generatie = 0, wachtend = null, actief = null;
    // Heeft de gebruiker zelf op de rekenmachine gedrukt, dan is haar stand
    // niet meer wat de stappen zeggen (embed.js meldt dat).
    var aangeraakt = false;
    // Een stap die traag voor wordt gedaan, en wat er daarna moet gebeuren als
    // ze vroegtijdig wordt afgerond (↓ tijdens het voordoen).
    var traag = false, naStap = null;

    // Dezelfde knoppen als de constructiestappen van een figuur: pictogrammen
    // in een pres-figuurbalk, met de tekst enkel voor een schermlezer.
    var balk = document.createElement("div");
    balk.className = "pres-figuurbalk grm-demo-balk";
    function stapknop(naam, actie) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pres-knop pres-stapknop";
      b.appendChild(pictogram(naam));
      b.appendChild(document.createElement("span"));
      b.addEventListener("click", actie);
      balk.appendChild(b);
      return b;
    }
    function zetTitel(knop, titel) {
      knop.title = titel;
      knop.setAttribute("aria-label", titel);
      knop.querySelector("span").textContent = titel;
    }
    var begin = stapknop("begin", function () { if (klaar && !(!bezig && volgende === 0)) terug(); });
    var vorige = stapknop("links", function () { if (klaar && !bezig && volgende > 0) eenTerug(); });
    var knop = stapknop("rechts", function () { if (klaar && !bezig && volgende < stappen.length) volgendeStap(); });
    var einde = stapknop("einde", function () { if (klaar && volgende < stappen.length) naarStand(stappen.length); });
    zetTitel(begin, "Begin opnieuw");
    zetTitel(einde, "Toon alle stappen meteen");
    zetTitel(vorige, "Toon de vorige stap");
    var stand = document.createElement("span");
    stand.className = "grm-demo-stand";
    stand.setAttribute("aria-live", "polite");
    balk.appendChild(stand);
    var tempoKnop = stapknop("schildpad", function () {
      langzaam = !langzaam;
      tempoVolgers.forEach(function (volg) { volg(); });
    });
    function volgTempo() {
      tempoKnop.setAttribute("aria-pressed", String(langzaam));
      if (!langzaam && traag) stuur({ ti84: "finish" });
    }
    tempoVolgers.push(volgTempo);
    tempoKnop.classList.add("grm-demo-tempo");
    volgTempo();
    zetTitel(tempoKnop, "Toetsen langzaam invoeren");

    var frame = document.createElement("iframe");
    frame.src = BRON + "&theme=" + thema();
    // De kolom blijft verborgen tot 'ready'; lazy loading zou daardoor
    // wachten op een zichtbaar frame dat pas na het laden zichtbaar wordt.
    frame.loading = "eager";
    frame.title = "Rekenmachine TI-84";
    kolom.appendChild(balk);
    kolom.appendChild(frame);
    demo.appendChild(tekst);
    demo.appendChild(kolom);

    // Op een slide met één demo mag de GRM ook de ruimte naast de kop van de
    // demo en haar inleiding gebruiken: ze begint op de hoogte van de laatste
    // kop vóór de demo, niet bovenaan de slide, waar nog andere leerstof kan
    // staan. Meet opnieuw wanneer de slide of haar breedte wijzigt.
    function plaats() {
      var slide = demo.closest("section.slide");
      if (!slide || demo.parentElement !== slide ||
          slide.querySelectorAll(".grm-demo").length !== 1 || !demo.getClientRects().length) return;
      slide.classList.add("grm-slide");
      var kop = demo.previousElementSibling;
      while (kop && !/^H[1-6]$/.test(kop.tagName)) kop = kop.previousElementSibling;
      for (var el = slide.firstElementChild; el && el !== demo; el = el.nextElementSibling) {
        var naast = !kop || el === kop || !!(kop.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        el.classList.toggle("grm-naast", naast);
      }
      var boven = slide.getBoundingClientRect().top + parseFloat(getComputedStyle(slide).paddingTop);
      var start = kop ? Math.max(boven, kop.getBoundingClientRect().top) : boven;
      var aanloop = Math.max(0, demo.getBoundingClientRect().top - start);
      var waarde = String(Math.round(aanloop));
      if (kolom.style.getPropertyValue("--grm-aanloop") !== waarde) {
        kolom.style.setProperty("--grm-aanloop", waarde);
      }
      var scrollvak = slide.parentElement;
      while (scrollvak && !/auto|scroll/.test(getComputedStyle(scrollvak).overflowY)) {
        scrollvak = scrollvak.parentElement;
      }
      if (scrollvak) {
        var ruimteBoven = boven - scrollvak.getBoundingClientRect().top + scrollvak.scrollTop;
        var balkHoogte = balk.getBoundingClientRect().height + parseFloat(getComputedStyle(balk).marginBottom);
        // Houd de toetsen ook in een lager venster voldoende hoog. De kolom
        // mag daarvoor iets doorlopen onder de zichtbare rand van de slide.
        var minimumHoogte = Math.round(frame.getBoundingClientRect().width * 2.1);
        var hoogte = Math.max(320, minimumHoogte,
          Math.floor(scrollvak.clientHeight - ruimteBoven - balkHoogte - 16)) + "px";
        if (kolom.style.getPropertyValue("--grm-hoogte") !== hoogte) {
          kolom.style.setProperty("--grm-hoogte", hoogte);
        }
      }
    }
    var plaatsFrame;
    function planPlaats() {
      cancelAnimationFrame(plaatsFrame);
      plaatsFrame = requestAnimationFrame(plaats);
    }
    document.addEventListener("pres:zichtbaar", planPlaats);
    window.addEventListener("resize", planPlaats);
    new ResizeObserver(planPlaats).observe(tekst);
    document.fonts.ready.then(planPlaats);

    function stuur(bericht) {
      if (frame.contentWindow) frame.contentWindow.postMessage(bericht, "*");
    }

    // De beginstand: een nieuwe rekenmachine, bij een vervolg met de stappen
    // van de vorige demo er al op.
    function herbegin() {
      stuur({ ti84: "reset", keys: vooraf });
      aangeraakt = false;
    }

    window.addEventListener("message", function (e) {
      if (e.source !== frame.contentWindow || !e.data || typeof e.data !== "object") return;
      if (e.data.ti84 === "ready") {
        klaar = true;
        // Tijdens het laden kan het thema gewisseld zijn.
        stuur({ ti84: "theme", theme: thema() });
        if (vooraf) herbegin();
        demo.classList.add("grm-demo-actief");
        planPlaats();
        // Eenmalig de aandacht op de knop voor de eerste stap, zoals de
        // playknop van een figuur met constructiestappen.
        knop.addEventListener("animationend", function () {
          knop.classList.remove("pres-speel-attentie");
        }, { once: true });
        knop.classList.add("pres-speel-attentie");
      } else if (e.data.ti84 === "touched") {
        aangeraakt = true;
      } else if (e.data.ti84 === "done" && wachtend && wachtend.id === e.data.id) {
        var w = wachtend;
        wachtend = null;
        w.klaar();
      }
    });

    document.addEventListener("pres:thema", function () {
      stuur({ ti84: "theme", theme: thema() });
    });

    function markeer(i) {
      if (actief) actief.classList.remove("grm-stap-actief");
      actief = i === null ? null : stappen[i].blok;
      if (actief) actief.classList.add("grm-stap-actief");
    }

    function opschrift(bezigStap) {
      begin.disabled = !bezig && volgende === 0;
      vorige.disabled = bezig || volgende === 0;
      knop.disabled = bezig || volgende >= stappen.length;
      einde.disabled = volgende >= stappen.length && !bezig;
      zetTitel(knop, volgende < stappen.length ? "Toon stap " + (volgende + 1) + " van " + stappen.length
                                                : "Alle stappen getoond");
      stand.textContent = "Stap " + (bezig ? bezigStap : volgende) + " van " + stappen.length;
    }

    // Een eerdere opdracht aan de rekenmachine telt niet meer mee.
    function breek() {
      generatie++;
      traag = false;
      naStap = null;
      if (wachtend) { var w = wachtend; wachtend = null; w.klaar(); }
    }

    function speel(toetsen, tempo, daarna) {
      var mijn = ++generatie;
      return new Promise(function (klaarMet) {
        var id = ++volgId;
        wachtend = { id: id, klaar: klaarMet };
        stuur({ ti84: "press", keys: toetsen, delay: tempo, id: id });
      }).then(function () {
        if (mijn === generatie) daarna();
      });
    }

    function terug() {
      breek();
      herbegin();
      bezig = false;
      volgende = 0;
      markeer(null);
      opschrift();
    }

    // Eén stap per klik: de uitleg tussen de stappen is aan de leraar.
    function stap() {
      var i = volgende;
      bezig = true;
      traag = langzaam;
      markeer(i);
      opschrift(i + 1);
      speel(stappen[i].toetsen, langzaam ? TOETSTEMPO : 0, function () {
        bezig = false;
        traag = false;
        volgende = i + 1;
        opschrift();
        var vervolg = naStap;
        naStap = null;
        if (vervolg) vervolg();
      });
    }

    // ↓ terwijl een stap traag wordt voorgedaan: die stap meteen afwerken en
    // met de volgende beginnen. Is er geen volgende, dan blijft het bij afwerken
    // en gaat de volgende druk gewoon verder met de pagina.
    function rondAf() {
      naStap = function () {
        if (volgende < stappen.length) volgendeStap();
      };
      stuur({ ti84: "finish" });
    }

    // Naar de stand na n stappen, zo snel mogelijk. De rekenmachine heeft
    // geen geschiedenis, dus begin opnieuw en speel de stappen zonder pauze af.
    // Dat dient voor één stap terug en voor naar het einde.
    function naarStand(n, vervolg) {
      if (n <= 0) { terug(); if (vervolg) vervolg(); return; }
      breek();
      bezig = true;
      herbegin();
      markeer(n - 1);
      opschrift(n);
      var toetsen = stappen.slice(0, n).map(function (s) { return s.toetsen; }).join(" ");
      speel(toetsen, 0, function () {
        bezig = false;
        volgende = n;
        opschrift();
        if (vervolg) vervolg();
      });
    }

    function eenTerug() { naarStand(volgende - 1); }

    // De volgende stap. Is de rekenmachine ondertussen met de hand veranderd,
    // dan eerst terug naar de bekende stand na de stappen die al getoond zijn.
    function volgendeStap() {
      if (aangeraakt) naarStand(volgende, stap);
      else stap();
    }

    // Een klik op de tekst van een stap toont die stap, met alles ervoor in
    // orde. Staan we nog voor die stap en is er niets met de hand veranderd,
    // dan gaat het gewoon verder: de tussenliggende stappen meteen, die stap
    // zelf traag. Anders (terug, midden in een stap, of aangeraakt) beginnen
    // we van de bekende beginstand.
    function toonStap(i) {
      if (!klaar) return;
      if (bezig || aangeraakt || volgende > i) { naarStand(i, stap); return; }
      if (volgende === i) { stap(); return; }
      var toetsen = stappen.slice(volgende, i).map(function (s) { return s.toetsen; }).join(" ");
      bezig = true;
      markeer(i);
      opschrift(i);
      speel(toetsen, 0, function () {
        bezig = false;
        volgende = i;
        stap();
      });
    }

    stappen.forEach(function (st, i) {
      var blok = st.blok;
      blok.classList.add("grm-stap-klik");
      blok.title = "Toon deze stap op de rekenmachine";
      blok.addEventListener("click", function (e) {
        // Tekst selecteren (om iets aan te wijzen) is geen klik op de stap.
        if (String(window.getSelection()).length) return;
        if (e.target.closest("a, button")) return;
        toonStap(i);
      });
    });

    // presentatie.js zet dit op de verticale toetsen: een presentatiewijzer
    // (Page Down en Page Up) speelt dan de volgende of vorige stap. Terwijl er
    // een stap speelt, doet een druk niets maar gaat de pagina ook niet door.
    demo._codestappen = {
      kan: function (richting) {
        return klaar && (bezig || (richting > 0 ? volgende < stappen.length : volgende > 0));
      },
      doe: function (richting) {
        if (!klaar) return;
        if (bezig) {
          if (traag && richting > 0 && !naStap) rondAf();
          return;
        }
        if (richting > 0) volgendeStap(); else eenTerug();
      },
      // Waar de pagina naartoe scrolt: de tekst van de stap die aan de beurt is.
      doel: function (richting) {
        // Tijdens het voordoen van stap i is de volgende stap i + 1.
        var i = richting > 0 ? volgende + (bezig ? 1 : 0) : volgende - 1;
        return stappen[Math.max(0, Math.min(i, stappen.length - 1))].blok;
      }
    };

    // Een slide die uit beeld gaat, zet de demo terug op het begin.
    document.addEventListener("pres:slide", function () {
      if (klaar && (bezig || volgende > 0)) terug();
    });
    opschrift();
  }

  function maakIn(wortel) {
    if (wortel.matches && wortel.matches(".grm-demo")) maak(wortel);
    if (wortel.querySelectorAll) Array.prototype.forEach.call(wortel.querySelectorAll(".grm-demo"), maak);
  }

  maakIn(document);
  document.addEventListener("pres:zichtbaar", function (e) { maakIn(e.target); });
})();
