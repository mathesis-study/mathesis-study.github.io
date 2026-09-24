/* Hoofdpagina van Mathesis: enkel de dag- en nachtstand, en lokale links.
 *
 * Het thema werkt zoals in presentatie.js en deelt dezelfde sleutel
 * pres:thema, zodat een keuze op de hoofdpagina ook in elk hoofdstuk geldt en
 * omgekeerd. Het script staat in de <head>: data-thema staat dan al vast
 * voor de pagina getekend wordt, en er flitst geen wit blad voorbij. */
(function () {
  "use strict";

  var THEMA = "pres:thema";
  var ICOON = {
    zon: "M12 7a5 5 0 100 10 5 5 0 000-10M12 1v3M12 20v3M4.2 4.2l2.1 2.1" +
         "M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    maan: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
  };
  // Het manifest maakt van de site een installeerbare app. Een lokaal
  // geopend bestand mag het niet laden, dus enkel over http(s).
  var manifest = document.querySelector('meta[name="mathesis-manifest"]');
  if (manifest && /^https?:$/.test(location.protocol)) {
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifest.content;
    document.head.appendChild(link);
  }

  var systeemDonker = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function bewaardThema() {
    try {
      var t = localStorage.getItem(THEMA);
      return t === "licht" || t === "donker" ? t : null;
    } catch (e) { return null; }
  }

  function zetThema(naam, onthouden) {
    document.documentElement.setAttribute("data-thema", naam);
    if (onthouden) {
      try { localStorage.setItem(THEMA, naam); } catch (e) { /* niets */ }
    }
    toonKnop();
  }

  // De knop toont waar je naartoe gaat, niet waar je staat: overdag een maan.
  function toonKnop() {
    var knop = document.querySelector(".thema");
    if (!knop) return;
    var donker = document.documentElement.getAttribute("data-thema") === "donker";
    knop.querySelector("path").setAttribute("d", donker ? ICOON.zon : ICOON.maan);
    knop.title = donker ? "Overschakelen naar de dagstand" : "Overschakelen naar de nachtstand";
    knop.setAttribute("aria-label", knop.title);
  }

  zetThema(bewaardThema() || (systeemDonker && systeemDonker.matches ? "donker" : "licht"), false);
  if (systeemDonker && systeemDonker.addEventListener) {
    systeemDonker.addEventListener("change", function (e) {
      if (!bewaardThema()) zetThema(e.matches ? "donker" : "licht", false);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var knop = document.querySelector(".thema");
    knop.addEventListener("click", function () {
      var donker = document.documentElement.getAttribute("data-thema") === "donker";
      zetThema(donker ? "licht" : "donker", true);
    });
    toonKnop();

    // Op de webserver opent analyse/afgeleiden/ vanzelf de index.html; als
    // lokaal bestand toont de browser dan enkel de inhoud van de map.
    if (location.protocol === "file:") {
      document.querySelectorAll('a[href$="/"]').forEach(function (a) {
        a.setAttribute("href", a.getAttribute("href") + "index.html");
      });
    }
  });
}());
