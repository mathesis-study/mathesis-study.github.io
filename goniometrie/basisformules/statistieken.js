/* Statistieken voor mathesis.study, met GoatCounter (zonder cookies en zonder
 * persoonsgegevens). mkpi --site en mkpi --hoofdpagina zetten dit script en
 * <meta name="mathesis-statistieken" content="<code>"> enkel in een pagina als
 * web/site.txt `statistieken = <code>` heeft. Het telscript van GoatCounter
 * laadt pas over http(s), dus een lokaal geopend bestand meldt niets.
 *
 * De telling is met opzet grof: per hoofdstuk, niet per slide of per knop.
 * Naast de paginalading, die GoatCounter zelf telt, komen er per lading
 * hoogstens drie gebeurtenissen bij:
 *   oplossing/<pagina>          de lezer opende minstens één oplossing
 *   interactief/<pagina>        de lezer gebruikte een codeblok, een
 *                               interactieve grafiek of de rekenmachine
 *   gelezen/<pagina>/<deel>     bij het verlaten: welk deel van de slides
 *                               minstens 3 seconden in beeld was, afgerond
 *                               naar beneden op 0, 25, 50, 75 of 90 procent
 */
(function () {
  "use strict";

  var meta = document.querySelector('meta[name="mathesis-statistieken"]');
  if (!meta || !/^[a-z0-9-]+$/.test(meta.content) || !/^https?:$/.test(location.protocol)) return;

  var klaar = false;
  var wachtrij = [];
  var geteld = {};

  function verstuur(gegevens) {
    window.goatcounter.count({ path: gegevens[0], title: gegevens[1], event: true });
  }

  // Elk pad telt hoogstens één keer per paginalading.
  function tel(pad, titel) {
    if (geteld[pad]) return;
    geteld[pad] = true;
    var gegevens = [pad, titel || ""];
    if (klaar && window.goatcounter && window.goatcounter.count) verstuur(gegevens);
    else wachtrij.push(gegevens);
  }

  // Het telscript van GoatCounter telt zelf de paginalading. Het wordt hier
  // pas ingehaakt, zodat elke pagina dezelfde weg volgt.
  function laad() {
    var script = document.createElement("script");
    script.dataset.goatcounter = "https://" + meta.content + ".goatcounter.com/count";
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.addEventListener("load", function () {
      klaar = true;
      wachtrij.splice(0).forEach(verstuur);
    });
    document.head.appendChild(script);
  }

  function pagina() {
    return location.pathname.replace(/index\.html$/, "").replace(/^\/+|\/+$/g, "") || "hoofdpagina";
  }

  /* --- Gelezen: welk deel van de slides even in beeld was --------------- */

  var gezien = {};
  var aantalGezien = 0;
  var aantalSlides = 0;
  var wacht = null;

  function volgSlide(slide) {
    clearTimeout(wacht);
    if (!slide || !slide.id) return;
    aantalSlides = slide.aantal || aantalSlides;
    if (gezien[slide.id]) return;
    wacht = setTimeout(function () {
      if (document.visibilityState !== "visible") return;
      gezien[slide.id] = true;
      aantalGezien++;
    }, 3000);
  }

  document.addEventListener("pres:slide", function (e) { volgSlide(e.detail); });

  // presentatie.js meldt de eerste slide al voor dit script geladen is. De
  // hash wijst ze aan, want die zet het bij elke slidewissel.
  function beginSlide() {
    var slides = document.querySelectorAll(".slide[data-titel]");
    if (!slides.length) return;
    var doel = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    var slide = (doel && doel.closest(".slide[data-titel]")) ||
      document.querySelector(".slide.pres-actief[data-titel]") || slides[0];
    volgSlide({ id: slide.id, aantal: slides.length });
  }

  function deelGelezen() {
    var procent = aantalGezien / aantalSlides * 100;
    return [90, 75, 50, 25].filter(function (grens) { return procent >= grens; })[0] || 0;
  }

  // GoatCounter verstuurt met sendBeacon, dus dit komt ook bij het verlaten
  // nog aan. Is het telscript dan nog niet geladen, dan valt het weg.
  function meldGelezen() {
    if (!aantalSlides || !klaar) return;
    var deel = deelGelezen();
    tel("gelezen/" + pagina() + "/" + deel, "minstens " + deel + "% van de slides");
  }

  /* --- Interactie: codeblokken, grafieken en de rekenmachine ------------ */

  var INTERACTIEF = "figure.interactieve-grafiek, .pres-rekenmachine";

  function interactie() {
    tel("interactief/" + pagina(), "codeblok, grafiek of rekenmachine");
  }

  function waarneemInteractie() {
    document.addEventListener("click", function (e) {
      var knop = e.target.closest && e.target.closest("button");
      if (knop && /\bpython-(uitvoerknop|bugknop|stapknop)\b/.test(knop.className)) interactie();
    }, true);
    ["pointerdown", "keydown"].forEach(function (soort) {
      document.addEventListener(soort, function (e) {
        if (e.target.closest && e.target.closest(INTERACTIEF)) interactie();
      }, true);
    });
  }

  /* --- Oplossingen ------------------------------------------------------ */

  // Een oplossing opent bij een klik, bij een toets (pijl omlaag, o) of door
  // de bladerstand. presentatie.js zet het opengaan altijd als de klasse
  // pres-verborgen die verdwijnt; het korte antwoord (\antwoord) is de klasse
  // pres-kortopen op de alinea van de vraag. De waarnemer start pas bij de
  // eerste handeling van de lezer, zodat een herstelde stand bij het laden
  // niet telt.
  var OPLOSSING = ".oplossing, .opl, .opl-math";

  function heeftKlasse(lijst, klasse) {
    return (lijst || "").split(/\s+/).indexOf(klasse) >= 0;
  }

  function waarneemOplossingen() {
    var waarnemer = new MutationObserver(function (records) {
      var open = records.some(function (r) {
        var doel = r.target;
        if (!doel.matches) return false;
        if (doel.matches(OPLOSSING)) {
          return heeftKlasse(r.oldValue, "pres-verborgen") && !doel.classList.contains("pres-verborgen");
        }
        return doel.matches(".pres-oplanker") &&
          !heeftKlasse(r.oldValue, "pres-kortopen") && doel.classList.contains("pres-kortopen");
      });
      if (!open) return;
      tel("oplossing/" + pagina(), "oplossing geopend");
      waarnemer.disconnect();
    });
    waarnemer.observe(document.body, { subtree: true, attributes: true,
                                       attributeFilter: ["class"], attributeOldValue: true });
  }

  function start() {
    laad();
    beginSlide();
    waarneemInteractie();
    window.addEventListener("pagehide", meldGelezen);
    var begonnen = false;
    function eerste() {
      if (begonnen) return;
      begonnen = true;
      waarneemOplossingen();
    }
    ["pointerdown", "keydown"].forEach(function (soort) {
      document.addEventListener(soort, eerste, { capture: true, once: true });
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
