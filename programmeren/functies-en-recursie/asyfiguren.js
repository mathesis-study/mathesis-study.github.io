/* Asymptote-iframes: laad alleen figuren in beeld en bedien hun viewer. */
(function () {
  "use strict";

  function maak(opties) {
    var el = opties.el, icoon = opties.icoon, ICOON = opties.iconen;

    // De iframes krijgen hun src pas wanneer hun slide in beeld komt. Browsers
    // staan maar een handvol WebGL-contexten tegelijk toe, dus een figuur die
    // uit beeld gaat, geeft de zijne weer vrij.
    // Dezelfde lijst staat in de figuren zelf (bin/mkpi_lib/asyviewer.py).
    var DOORGESTUURDE_TOETSEN = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "PageUp", "PageDown", "Escape", " "];

    function bereidFigurenVoor() {
      document.querySelectorAll("iframe").forEach(function (frame) {
        var bron = frame.getAttribute("src");
        if (!bron) return;
        frame.dataset.bron = bron;
        frame.removeAttribute("src");
        frame.removeAttribute("loading");

        var doos = el("div", "pres-figuur");
        // De breedte kwam uit \asyinclude[width=..]; de hoogte houden we, de
        // breedte laten we het slidekader vullen.
        var hoogte = (frame.style.height || "40vh");
        frame.style.cssText = "";
        frame.style.height = hoogte;
        doos.style.maxWidth = "100%";

        // Geeft de figuur zelf haar verhouding op (data-verhouding="7/5"), dan
        // volgt de hoogte uit de breedte die ze krijgt. Zo blijft een figuur
        // naast de tekst even goed in beeld als een die de kolom vult, zonder
        // dat de bron een hoogte in vh moet raden.
        if (frame.dataset.verhouding) {
          frame.style.aspectRatio = frame.dataset.verhouding;
          frame.style.height = "auto";
        }

        // Een vaste figuur bevat één SVG-afbeelding. Gebruik haar intrinsieke
        // verhouding, zodat het iframe geen cameraruimte reserveert die alleen
        // voor een draaibare WebGL-scene zin heeft. Als de inhoud niet leesbaar
        // is, blijft de hoogte uit \asyinclude als veilige terugval staan.
        if (frame.hasAttribute("data-vast")) {
          frame.addEventListener("load", function () {
            try {
              var afbeelding = frame.contentDocument.querySelector("img");
              if (afbeelding && afbeelding.naturalWidth && afbeelding.naturalHeight) {
                frame.style.aspectRatio = afbeelding.naturalWidth + " / " + afbeelding.naturalHeight;
                frame.style.height = "auto";
              }
            } catch (e) {
              /* Een niet-lokale figuur behoudt de opgegeven terugvalhoogte. */
            }
          });
        }

        frame.parentNode.insertBefore(doos, frame);
        doos.appendChild(frame);

        var balk = el("div", "pres-figuurbalk");
        // Een figuur kan in een verbergbare oplossing staan. Bedieningsklikken
        // horen uitsluitend bij de figuur en mogen die bovenliggende oplossing
        // nooit open- of dichtklappen.
        balk.addEventListener("click", function (e) { e.stopPropagation(); });

        frame._stappen = { stap: 1, aantal: 0, timer: null, knoppen: null };
        // Het iframe kan vanuit de lokale file:-site al geladen zijn voordat
        // zijn eerste melding verwerkt wordt. Deze vraag is tegelijk de
        // expliciete beginstand bij iedere nieuwe WebGL-context.
        frame.addEventListener("load", function () {
          var stap = frame._herstelStap || 1;
          frame._herstelStap = null;
          frame.contentWindow.postMessage({ type: "asy-stap", stap: stap }, "*");
        });

        // Op een beamer is een figuur van 28vh klein voor de achterste bank.
        // Deze knop legt ze over het hele podium; Escape brengt ze terug.
        var groot = el("button", "pres-knop");
        groot.classList.add("pres-figuur-grootknop");
        groot.type = "button";
        groot.title = "Deze figuur groot tonen (Escape sluit ze weer)";
        groot.setAttribute("aria-pressed", "false");
        groot.appendChild(icoon(ICOON.vergroot));
        groot.appendChild(el("span", null, "Groot"));
        groot.addEventListener("click", function () {
          opties.zetGroteFiguur(doos, !doos.classList.contains("pres-figuur-groot"));
        });
        balk.appendChild(groot);

        // Een figuur met data-vast is een vaste tekening in plaats van een
        // WebGL-scene, dus valt er niets te herstellen.
        if (!frame.hasAttribute("data-vast")) {
          var reset = el("button", "pres-knop");
          reset.type = "button";
          reset.title = "Herstel de oorspronkelijke rotatie en zoom";
          reset.appendChild(icoon(ICOON.herstel));
          reset.appendChild(el("span", null, "Reset"));
          reset.addEventListener("click", function () { herstelFiguur(frame); });
          balk.appendChild(reset);
        }
        opties.voegFiguurnavigatieToe(balk);
        doos.appendChild(balk);
      });

      window.addEventListener("message", function (e) {
        var frame = Array.prototype.find.call(document.querySelectorAll("iframe"),
          function (kandidaat) { return kandidaat.contentWindow === e.source; });
        var bericht = e.data;
        // Wie de figuur met de muis draaide, heeft de focus in het iframe. De
        // figuur stuurt daarom de bladertoetsen door, en die lopen hier langs
        // dezelfde weg als een toets in de pagina.
        if (frame && bericht && bericht.type === "asy-toets" &&
            DOORGESTUURDE_TOETSEN.indexOf(bericht.key) >= 0) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: bericht.key, bubbles: true }));
          return;
        }
        if (frame && bericht && bericht.type === "asy-schuif") {
          werkFiguurschuifBij(frame, bericht);
          return;
        }
        if (frame && bericht && bericht.type === "asy-wissel") {
          werkFiguurwisselBij(frame, bericht);
          return;
        }
        if (!frame || !bericht || bericht.type !== "asy-stappen") return;
        var toestand = frame._stappen;
        toestand.stap = bericht.stap;
        toestand.aantal = bericht.aantal;
        if (frame._toonEindstap) {
          frame._toonEindstap = false;
          zetFiguurstap(frame, toestand.aantal);
        }
        if (toestand.timer && toestand.stap >= toestand.aantal) stopStapspel(frame);
        if (!toestand.knoppen) voegStapknoppenToe(frame);
        werkStapknoppenBij(frame);
      });
    }

    // Een figuur met een parameter (zoals k in k·P) meldt zich met asy-schuif:
    // de naam, de mogelijke waarden en de gekozen index. Onder de figuur komt
    // dan een schuifregelaar, die de figuur met asy-zet-schuif een andere
    // variant van dezelfde scene laat tonen. Laadt de figuur opnieuw, dan
    // meldt ze haar beginwaarde, en krijgt ze de gekozen waarde terug.
    function werkFiguurschuifBij(frame, bericht) {
      var waarden = Array.isArray(bericht.waarden) ? bericht.waarden.map(String) : [];
      if (!waarden.length || !frame.parentNode) return;
      var schuif = frame._schuif;
      if (!schuif) {
        var rij = el("label", "pres-figuurschuif");
        rij.addEventListener("click", function (e) { e.stopPropagation(); });
        var naam = el("span", "pres-figuurschuif-naam", String(bericht.naam || ""));
        var invoer = el("input", "");
        invoer.type = "range";
        invoer.min = "0";
        invoer.max = String(waarden.length - 1);
        invoer.step = "1";
        invoer.setAttribute("aria-label", String(bericht.naam || "waarde"));
        var waarde = el("output", "pres-figuurschuif-waarde");
        rij.appendChild(naam);
        rij.appendChild(invoer);
        rij.appendChild(waarde);
        frame.parentNode.classList.add("pres-met-schuif");
        frame.parentNode.appendChild(rij);
        schuif = frame._schuif = { invoer: invoer, waarde: waarde, waarden: waarden, index: null };
        invoer.addEventListener("input", function () {
          schuif.index = Number(invoer.value);
          toonSchuifwaarde(schuif);
          frame.contentWindow.postMessage({ type: "asy-zet-schuif", index: schuif.index }, "*");
        });
      }
      if (schuif.index === null) {
        schuif.index = Math.max(0, Math.min(waarden.length - 1, Math.round(Number(bericht.index) || 0)));
      } else if (schuif.index !== bericht.index) {
        frame.contentWindow.postMessage({ type: "asy-zet-schuif", index: schuif.index }, "*");
      }
      schuif.invoer.value = String(schuif.index);
      toonSchuifwaarde(schuif);
    }

    // Een figuur met iets dat aan of uit kan, zoals de omgeschreven bol rond
    // een platonisch lichaam, meldt zich met asy-wissel: het opschrift en haar
    // stand. Onder de figuur komt dan een knop, die de figuur met
    // asy-zet-wissel aan of uit zet. In een groep asyvarianten geldt de stand
    // voor de hele groep, zodat de bol blijft staan bij een ander geval. Laadt
    // de figuur opnieuw, dan krijgt ze de gekozen stand terug.
    function werkFiguurwisselBij(frame, bericht) {
      if (!frame.parentNode) return;
      var drager = frame.closest("[data-figuurgevallen]") || frame;
      var stand = drager._wissel;
      if (!stand) stand = drager._wissel = { aan: Boolean(bericht.aan), frames: [] };
      if (!frame._wisselknop) {
        var knop = el("button", "pres-knop pres-figuurwissel", String(bericht.naam || "Toon"));
        knop.type = "button";
        knop.addEventListener("click", function (e) {
          e.stopPropagation();
          stand.aan = !stand.aan;
          stand.frames.forEach(function (ander) {
            ander._wisselknop.setAttribute("aria-pressed", String(stand.aan));
            if (ander.contentWindow) {
              ander.contentWindow.postMessage({ type: "asy-zet-wissel", aan: stand.aan }, "*");
            }
          });
        });
        frame._wisselknop = knop;
        stand.frames.push(frame);
        frame.parentNode.classList.add("pres-met-wissel");
        frame.parentNode.appendChild(knop);
      }
      frame._wisselknop.setAttribute("aria-pressed", String(stand.aan));
      if (Boolean(bericht.aan) !== stand.aan) {
        frame.contentWindow.postMessage({ type: "asy-zet-wissel", aan: stand.aan }, "*");
      }
    }

    function toonSchuifwaarde(schuif) {
      var tekst = "= " + schuif.waarden[schuif.index];
      schuif.waarde.textContent = tekst;
      schuif.invoer.setAttribute("aria-valuetext", schuif.waarden[schuif.index]);
    }

    function stapknop(icoonpad, tekst, titel, actie) {
      var knop = el("button", "pres-knop pres-stapknop");
      knop.type = "button";
      knop.title = titel;
      knop.setAttribute("aria-label", titel);
      knop.appendChild(icoon(icoonpad));
      knop.appendChild(el("span", null, tekst));
      knop.addEventListener("click", actie);
      return knop;
    }

    function stopStapspel(frame) {
      var toestand = frame._stappen;
      if (toestand.timer) clearInterval(toestand.timer);
      toestand.timer = null;
    }

    function zetFiguurstap(frame, stap) {
      stopStapspel(frame);
      frame.contentWindow.postMessage({ type: "asy-stap", stap: stap }, "*");
    }

    function voegStapknoppenToe(frame) {
      var toestand = frame._stappen;
      var balk = frame.parentNode.querySelector(".pres-figuurbalk");
      var groot = balk.querySelector(".pres-figuur-grootknop");
      var begin = stapknop(ICOON.begin, "Begin", "Toon de eerste constructiestap",
        function () { zetFiguurstap(frame, 1); });
      var vorige = stapknop(ICOON.links, "Vorige", "Toon de vorige constructiestap",
        function () { zetFiguurstap(frame, toestand.stap - 1); });
      var volgende = stapknop(ICOON.rechts, "Volgende", "Toon de volgende constructiestap",
        function () { zetFiguurstap(frame, toestand.stap + 1); });
      var einde = stapknop(ICOON.einde, "Einde", "Toon de volledige constructie",
        function () { zetFiguurstap(frame, toestand.aantal); });
      var speel = stapknop(ICOON.speel, "Play", "Speel de constructiestappen af", function () {
        if (toestand.timer) {
          stopStapspel(frame);
          werkStapknoppenBij(frame);
          return;
        }
        if (toestand.stap === toestand.aantal) {
          frame.contentWindow.postMessage({ type: "asy-stap", stap: 1 }, "*");
          toestand.stap = 1;
        }
        toestand.timer = setInterval(function () {
          if (toestand.stap >= toestand.aantal) {
            stopStapspel(frame);
            werkStapknoppenBij(frame);
          } else {
            frame.contentWindow.postMessage({ type: "asy-stap", stap: toestand.stap + 1 }, "*");
          }
        }, 1500);
        werkStapknoppenBij(frame);
      });
      [begin, vorige, volgende, einde, speel].forEach(function (knop) {
        balk.insertBefore(knop, groot);
      });
      toestand.knoppen = { begin: begin, vorige: vorige, volgende: volgende,
        einde: einde, speel: speel };
      // De bediening verschijnt pas wanneer de actieve WebGL-figuur meldt dat
      // ze stappen ondersteunt. Vestig dan eenmalig en zonder maatverandering
      // de aandacht op de knop waarmee de constructie afgespeeld wordt.
      speel.addEventListener("animationend", function () {
        speel.classList.remove("pres-speel-attentie");
      }, { once: true });
      requestAnimationFrame(function () {
        speel.classList.add("pres-speel-attentie");
      });
    }

    function werkStapknoppenBij(frame) {
      var toestand = frame._stappen;
      var knoppen = toestand.knoppen;
      if (!knoppen) return;
      knoppen.begin.disabled = knoppen.vorige.disabled = toestand.stap <= 1;
      knoppen.einde.disabled = knoppen.volgende.disabled = toestand.stap >= toestand.aantal;
      knoppen.speel.replaceChild(icoon(toestand.timer ? ICOON.pauze : ICOON.speel),
        knoppen.speel.firstChild);
      knoppen.speel.querySelector("span").textContent = toestand.timer ? "Pauze" : "Play";
      knoppen.speel.title = toestand.timer ? "Pauzeer de constructiestappen" :
        "Speel de constructiestappen af";
      knoppen.speel.setAttribute("aria-label", knoppen.speel.title);
      knoppen.speel.setAttribute("aria-pressed", String(Boolean(toestand.timer)));
    }

    // Een figuur laadt wanneer ze in de buurt van het beeld komt en geeft haar
    // WebGL-context vrij wanneer ze er ver genoeg vandaan is. Een verborgen
    // slide telt als uit beeld. Zo blijft een volledig hoofdstuk met veel
    // figuren onder de grens die de browser oplegt.
    function volgFiguren(podium) {
      var waarnemer = new IntersectionObserver(function (items) {
        items.forEach(function (item) {
          var aan = item.isIntersecting || Boolean(item.target.closest(".pres-figuur-groot"));
          if (item.target.matches("[data-figuurgevallen]")) {
            item.target.querySelectorAll("iframe[data-bron]").forEach(function (frame) {
              activeerFiguur(frame, aan);
            });
          } else {
            activeerFiguur(item.target, aan);
          }
        });
      }, { root: podium, rootMargin: "50% 0px" });
      document.querySelectorAll("iframe[data-bron]").forEach(function (frame) {
        if (!frame.closest("[data-figuurgevallen]")) waarnemer.observe(frame);
      });
      document.querySelectorAll("[data-figuurgevallen]").forEach(function (groep) {
        waarnemer.observe(groep);
      });
    }

    function bereidFiguurgevallenVoor() {
      document.querySelectorAll("[data-figuurgevallen]").forEach(function (groep) {
        var gevallen = Array.from(groep.querySelectorAll(".pres-figuurgeval"));
        if (!gevallen.length) return;
        var keuze = el("div", "pres-figuurgevallen-keuze");
        keuze.setAttribute("role", "group");
        keuze.setAttribute("aria-label", groep.dataset.keuzenaam);
        var opschrift = el("span", "");
        opschrift.textContent = groep.dataset.keuzenaam + ":";
        keuze.appendChild(opschrift);
        var schakelaar = el("div", "pres-figuurgevallen-schakelaar");
        var knoppen = gevallen.map(function (geval, index) {
          var knop = el("button", "");
          knop.type = "button";
          knop.textContent = geval.dataset.naam;
          knop.setAttribute("aria-pressed", String(index === 0));
          schakelaar.appendChild(knop);
          return knop;
        });
        keuze.appendChild(schakelaar);
        groep.appendChild(keuze);
        var wachtendeKeuze = null;
        gevallen.forEach(function (geval) {
          geval.inert = geval.hidden;
          var frame = geval.querySelector("iframe");
          // Enkel een figuur die bij een wissel nog moest laden, krijgt bij het
          // laden de stand van de camera (rotatie, zoom en verschuiving). Elke
          // andere keer dat ze laadt, zoals na Reset of bij een terugkeer naar
          // de slide, begint ze vooraan.
          if (frame) frame.addEventListener("load", function () {
            frame._figuurGereed = Boolean(frame.getAttribute("src"));
            var stand = frame._wachtendeStand;
            frame._wachtendeStand = null;
            if (stand && frame._figuurGereed) {
              frame.contentWindow.postMessage({ type: "asy-zet-stand", stand: stand }, "*");
            }
          });
        });
        function toonGeval(index) {
          var vorig = gevallen.find(function (geval) { return !geval.hidden; });
          var vorigFrame = vorig && vorig.querySelector("iframe");
          var stap = vorigFrame && vorigFrame._stappen && vorigFrame._stappen.aantal
            ? vorigFrame._stappen.stap : null;
          gevallen.forEach(function (geval, i) {
            geval.hidden = i !== index;
            // Het verborgen geval staat nog in beeld, onder het gekozen.
            geval.inert = i !== index;
            knoppen[i].setAttribute("aria-pressed", String(i === index));
          });
          var frame = gevallen[index].querySelector("iframe");
          if (frame) {
            if (stap && frame !== vorigFrame) {
              if (frame.getAttribute("src") && frame._figuurGereed &&
                  frame._stappen && frame._stappen.aantal) {
                zetFiguurstap(frame, stap);
              } else {
                frame._herstelStap = stap;
              }
            }
            activeerFiguur(frame, true);
          }
        }
        window.addEventListener("message", function (e) {
          if (!e.data || e.data.type !== "asy-stand" || wachtendeKeuze === null) return;
          var actief = gevallen.find(function (geval) { return !geval.hidden; });
          var frame = actief && actief.querySelector("iframe");
          if (!frame || e.source !== frame.contentWindow) return;
          var stand = e.data.stand;
          var index = wachtendeKeuze;
          wachtendeKeuze = null;
          // Het andere geval staat al geladen onder het huidige. Het krijgt
          // eerst de stand van de camera en tekent die, pas daarna wisselen
          // we, zodat er geen beeld zonder of met een oude scene tussen zit.
          var doel = gevallen[index].querySelector("iframe");
          if (doel && doel._figuurGereed) {
            doel.contentWindow.postMessage({ type: "asy-zet-stand", stand: stand }, "*");
            requestAnimationFrame(function () {
              requestAnimationFrame(function () { toonGeval(index); });
            });
          } else {
            if (doel) doel._wachtendeStand = stand;
            toonGeval(index);
          }
        });
        knoppen.forEach(function (knop, index) {
          knop.addEventListener("click", function (e) {
            e.stopPropagation();
            var actief = gevallen.find(function (geval) { return !geval.hidden; });
            var huidig = actief && actief.querySelector("iframe");
            if (groep.dataset.camera !== "apart" && huidig &&
                huidig.getAttribute("src") && huidig._figuurGereed &&
                actief !== gevallen[index]) {
              wachtendeKeuze = index;
              huidig.contentWindow.postMessage({ type: "asy-vraag-stand" }, "*");
            } else {
              wachtendeKeuze = null;
              toonGeval(index);
            }
          });
        });
      });
    }

    function activeerFiguur(frame, aan) {
      if (aan) {
        if (frame.getAttribute("src")) return;
        frame._toonEindstap = opties.oplossingenZichtbaar() && Boolean(frame.closest(".oplossing"));
        frame._figuurGereed = false;
        frame.setAttribute("src", frame.dataset.bron);
      } else if (frame.getAttribute("src")) {
        if (frame._stappen) stopStapspel(frame);
        frame.removeAttribute("src");
      }
    }

    // De WebGL-viewer van Asymptote luistert naar de toets "h" om de camera
    // terug naar huis te sturen. Lukt dat niet, dan herladen we het frame.
    function herstelFiguur(frame) {
      var stap = frame._stappen && frame._stappen.aantal ? frame._stappen.stap : null;
      try {
        var doc = frame.contentDocument;
        if (doc && doc.readyState === "complete") {
          doc.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));
          if (stap) {
            frame.contentWindow.postMessage({ type: "asy-stap", stap: stap }, "*");
          }
          return;
        }
      } catch (e) {
        /* ander origin of nog niet geladen: hieronder herladen we gewoon. */
      }
      frame._herstelStap = stap;
      frame._wachtendeStand = null;
      frame._figuurGereed = false;
      frame.removeAttribute("src");
      frame.setAttribute("src", frame.dataset.bron);
    }

    function eersteMetStappen(element) {
      return Array.prototype.find.call(element.querySelectorAll("iframe"), function (frame) {
        return frame._stappen && frame._stappen.aantal > 0;
      });
    }

    function kanStap(frame, richting) {
      if (!frame || !frame._stappen) return false;
      var volgende = frame._stappen.stap + richting;
      return volgende >= 1 && volgende <= frame._stappen.aantal;
    }

    function stapVerder(frame, richting) {
      if (!kanStap(frame, richting)) return false;
      zetFiguurstap(frame, frame._stappen.stap + richting);
      return true;
    }

    function toonEindstap(frame, toon) {
      if (!frame._stappen) return;
      frame._toonEindstap = toon;
      if (toon && frame._stappen.aantal > 0) {
        frame._toonEindstap = false;
        zetFiguurstap(frame, frame._stappen.aantal);
      }
    }

    return {
      bereidVoor: function () {
        bereidFigurenVoor();
        bereidFiguurgevallenVoor();
      },
      volg: volgFiguren,
      activeer: activeerFiguur,
      herstel: herstelFiguur,
      eersteMetStappen: eersteMetStappen,
      kanStap: kanStap,
      stapVerder: stapVerder,
      toonEindstap: toonEindstap,
    };
  }

  window.Cursusfiguren = { maak: maak };
})();
