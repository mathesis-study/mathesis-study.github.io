/* Statistieken voor mathesis.study, met GoatCounter (zonder cookies en zonder
 * persoonsgegevens). mkpi --site en mkpi --hoofdpagina zetten dit script en
 * <meta name="mathesis-statistieken" content="<code>"> enkel in een pagina als
 * web/site.txt `statistieken = <code>` heeft. Het telscript van GoatCounter
 * laadt pas over http(s), dus een lokaal geopend bestand meldt niets.
 *
 * Naast de paginalading telt GoatCounter hier wat de lezer doet, als
 * gebeurtenissen met een pad per soort:
 *   slide/<pagina>/<slide>      een slide die minstens 3 seconden in beeld was
 *   oplossing/<pagina>/<slide>  een oplossing of invulvak dat opengaat
 *   oplossing/alle              meerdere tegelijk (de toets o)
 *   antwoord/<pagina>/<slide>   enkel het korte antwoord van een oplossing
 *   knop/<naam>                 een knop in de kopbalk, bij een figuur of rekenmachine
 *   python/<actie>              een codeblok dat loopt of stapt
 *   grafiek/<naam>              een interactieve grafiek waar de lezer mee speelt
 * Elke slide en grafiek telt hoogstens één keer per paginalading.
 */
(function () {
  "use strict";

  var meta = document.querySelector('meta[name="mathesis-statistieken"]');
  if (!meta || !/^[a-z0-9-]+$/.test(meta.content) || !/^https?:$/.test(location.protocol)) return;

  var klaar = false;
  var wachtrij = [];

  function verstuur(gegevens) {
    window.goatcounter.count({ path: gegevens[0], title: gegevens[1], event: true });
  }

  function tel(pad, titel) {
    var gegevens = [pad, titel || ""];
    if (klaar && window.goatcounter && window.goatcounter.count) verstuur(gegevens);
    else if (wachtrij.length < 50) wachtrij.push(gegevens);
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

  function slideVan(element) {
    return element && element.closest ? element.closest("[data-titel]") : null;
  }

  function naam(tekst) {
    return tekst.replace(/\s*\([^)]*\)\s*$/, "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function slideNaam(slide) {
    return slide && slide.id ? slide.id : "onbekend";
  }

  /* --- Slides: alleen wie even blijft staan telt mee ------------------- */

  var gezien = {};
  var wacht = null;

  document.addEventListener("pres:slide", function (e) {
    clearTimeout(wacht);
    var slide = e.detail;
    if (!slide || !slide.id || gezien[slide.id]) return;
    wacht = setTimeout(function () {
      if (document.visibilityState !== "visible") return;
      gezien[slide.id] = true;
      tel("slide/" + pagina() + "/" + slide.id, slide.titel);
    }, 3000);
  });

  /* --- Knoppen ---------------------------------------------------------- */

  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var knop = e.target.closest("button");
    if (!knop) return;
    var python = /\bpython-(uitvoerknop|bugknop|stapknop)\b/.exec(knop.className);
    if (python) {
      tel("python/" + (python[1] === "uitvoerknop" ? "uitvoeren"
        : python[1] === "bugknop" ? "regel-voor-regel" : "stappen"), pagina());
      return;
    }
    if (!knop.matches(".pres-knop, .interactieve-grafiek button")) return;
    var tekst = naam(knop.getAttribute("aria-label") || knop.title || knop.textContent || "");
    if (tekst) tel("knop/" + tekst, pagina());
  }, true);

  /* --- Interactieve grafieken ------------------------------------------ */

  var gespeeld = {};

  document.addEventListener("pointerdown", function (e) {
    var figuur = e.target.closest && e.target.closest("figure.interactieve-grafiek");
    var id = figuur && figuur.dataset.grafiek;
    if (!id || gespeeld[id]) return;
    gespeeld[id] = true;
    tel("grafiek/" + id, pagina());
  }, true);

  /* --- Oplossingen ------------------------------------------------------ */

  // Een oplossing opent bij een klik, bij een toets (pijl omlaag, o) of door
  // de bladerstand. presentatie.js zet het opengaan altijd als de klasse
  // pres-verborgen die verdwijnt; het korte antwoord (\antwoord) is de klasse
  // pres-kortopen op de alinea van de vraag. De waarnemer start pas bij de
  // eerste handeling van de lezer, zodat een herstelde stand bij het laden
  // niet telt.
  var OPLOSSING = ".oplossing, .opl, .opl-math";

  function klasseErbij(record, klasse) {
    var was = (record.oldValue || "").split(/\s+/).indexOf(klasse) >= 0;
    return !was && record.target.classList.contains(klasse);
  }

  function klasseEraf(record, klasse) {
    var was = (record.oldValue || "").split(/\s+/).indexOf(klasse) >= 0;
    return was && !record.target.classList.contains(klasse);
  }

  function waarneemOplossingen() {
    new MutationObserver(function (records) {
      var geopend = [];
      var antwoorden = [];
      records.forEach(function (r) {
        var doel = r.target;
        if (!doel.matches) return;
        if (doel.matches(OPLOSSING) && klasseEraf(r, "pres-verborgen")) geopend.push(doel);
        else if (doel.matches(".pres-oplanker") && klasseErbij(r, "pres-kortopen")) antwoorden.push(doel);
      });
      if (geopend.length > 1) {
        tel("oplossing/alle", pagina());
      } else if (geopend.length === 1) {
        var slide = slideVan(geopend[0]);
        tel("oplossing/" + pagina() + "/" + slideNaam(slide), slide ? slide.dataset.titel : "");
      }
      if (antwoorden.length === 1) {
        var kort = slideVan(antwoorden[0]);
        tel("antwoord/" + pagina() + "/" + slideNaam(kort), kort ? kort.dataset.titel : "");
      }
    }).observe(document.body, { subtree: true, attributes: true,
                                attributeFilter: ["class"], attributeOldValue: true });
  }

  function start() {
    laad();
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
