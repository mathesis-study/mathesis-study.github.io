/* Gemeenschappelijke bediening voor vensters boven de cursusslides.
 * De inhoud, aanmaak en eventuele URL-afhandeling blijven bij de aanvrager.
 */
(function () {
  "use strict";

  function maak(opties) {
    var actief = null;
    opties = opties || {};

    function registreer(element, instellingen) {
      var kader = element.firstChild;
      var terug = null;
      instellingen = instellingen || {};
      var venster = {
        open: function () {
          if (actief === venster) return;
          if (actief) actief.sluit();
          var oorsprong = document.activeElement;
          terug = opties.focusTerug ? opties.focusTerug(oorsprong) : oorsprong;
          if (opties.voorOpen) opties.voorOpen();
          element.setAttribute("open", "");
          actief = venster;
          kader.scrollTop = 0;
          kader.focus();
        },
        sluit: function () {
          if (actief !== venster) return;
          element.removeAttribute("open");
          actief = null;
          if (instellingen.naSluiten) instellingen.naSluiten();
          if (kader.contains(document.activeElement)) {
            if (terug && terug !== document.body && terug.isConnected && terug.focus) terug.focus();
            else kader.blur();
          }
          terug = null;
        },
        wissel: function (open) {
          if (open === undefined) open = actief !== venster;
          if (open) venster.open();
          else venster.sluit();
        },
        sluittoetsen: instellingen.sluittoetsen || []
      };
      element.addEventListener("click", function (e) {
        if (e.target === element) venster.sluit();
      });
      return venster;
    }

    return {
      registreer: registreer,
      isOpen: function () { return actief !== null; },
      verwerkToets: function (e) {
        if (!actief) return false;
        if (e.key === "Escape" || actief.sluittoetsen.indexOf(e.key.toLowerCase()) >= 0) {
          actief.sluit();
          e.preventDefault();
        }
        // Andere toetsen horen bij het venster, niet bij de slides erachter.
        return true;
      }
    };
  }

  window.Cursusvensters = { maak: maak };
})();
