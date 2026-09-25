/* Algemene runtime voor de interactieve grafieken van een cursussite.
 *
 * cursus.cls levert per grafiek deze HTML:
 *
 *   <figure class="interactieve-grafiek" data-grafiek="naam" data-hoogte="26rem">
 *     <div class="interactieve-grafiek-terugval"> de statische figuur </div>
 *     <div class="interactieve-grafiek-bord"></div>
 *     <figcaption class="interactieve-grafiek-uitleg"> beschrijving </figcaption>
 *   </figure>
 *
 * Een hoofdstukmodule (<bronnaam>.interactief.js) registreert onder diezelfde
 * naam hoe het bord opgebouwd wordt:
 *
 *   InteractieveGrafieken.registreer("secante-raaklijn", function (ctx) {
 *     var bord = ctx.maakBord({ begrenzing: [-2, 5, 6, -2] });
 *     ...
 *     return { reset: function () {...}, vernietig: function () {...} };
 *   });
 *
 * De volgorde is altijd: bouwen, controleren of het gelukt is, de figuur als
 * actief markeren, en pas dan de statische terugval verbergen. Mislukt een
 * grafiek, dan blijft haar statische figuur staan en gaan de andere grafieken
 * en de presentatienavigatie gewoon door.
 *
 * Dit bestand weet niets van een bepaald hoofdstuk, en een hoofdstukmodule
 * weet niets van de presentatielaag. De koppeling met presentatie.js loopt
 * enkel over gebeurtenissen: pres:zichtbaar (slide in beeld of van grootte
 * veranderd), pres:herstel (beginstand terugzetten) en pres:thema (dag- of
 * nachtstand gewisseld).
 */
(function (window, document) {
  "use strict";

  var STANDAARDHOOGTE = "26rem";
  var MINIMUMHOOGTE = 200;

  // Wat een kleur in een grafiek betekent, met de CSS-variabele uit
  // interactieve-grafieken.css erachter. De hoofdstukken noemen enkel de rol.
  var ROLLEN = {
    vlak: "--grafiek-vlak",
    as: "--grafiek-as",
    raster: "--grafiek-raster",
    tekst: "--grafiek-tekst",
    zwak: "--grafiek-zwak",
    kromme: "--grafiek-kromme",
    hulp: "--grafiek-hulp",
    punt: "--grafiek-punt",
    secante: "--grafiek-secante",
    raaklijn: "--grafiek-raaklijn",
    afgeleide: "--grafiek-afgeleide"
  };

  var TERUGVALKLEUREN = {
    vlak: "#ffffff", as: "#64748b", raster: "#e5eaf0", tekst: "#1c2530",
    zwak: "#64748b", kromme: "#445264", hulp: "#94a3b8", punt: "#1d5fa8",
    secante: "#b45309", raaklijn: "#1d5fa8", afgeleide: "#15803d"
  };

  var definities = Object.create(null);
  var instanties = [];
  var teller = 0;

  /* --- Kleuren ---------------------------------------------------------- */

  // De kleuren staan als variabelen op :root, maar worden hier op de figuur
  // zelf uitgelezen: zo werkt een grafiek ook binnen een blok dat de
  // variabelen overschrijft.
  function kleurenVan(element) {
    var stijl = window.getComputedStyle(element);
    var kleuren = {};
    Object.keys(ROLLEN).forEach(function (rol) {
      var waarde = stijl.getPropertyValue(ROLLEN[rol]).trim();
      kleuren[rol] = waarde || TERUGVALKLEUREN[rol];
    });
    return kleuren;
  }

  /* --- Getalnotatie ----------------------------------------------------- */

  // Nederlandstalige cursus, maar met een punt als decimaalteken, zoals in de
  // rest van het lesmateriaal. Nullen achteraan vallen weg, zodat een waarde
  // die toevallig rond is er ook rond uitziet.
  function getal(waarde, decimalen) {
    if (waarde === null || waarde === undefined || !isFinite(waarde)) {
      return "niet bepaald";
    }
    var d = decimalen === undefined ? 2 : decimalen;
    var tekst = waarde.toFixed(d);
    if (tekst.indexOf(".") >= 0) {
      tekst = tekst.replace(/0+$/, "").replace(/\.$/, "");
    }
    return tekst === "-0" ? "0" : tekst;
  }

  /* --- Afmetingen ------------------------------------------------------- */

  // De hoogte uit data-hoogte is de bedoelde hoogte op een gewoon scherm. Op
  // een telefoon in liggende stand zou ze het hele venster vullen, dus blijft
  // ze onder een deel van de vensterhoogte; ondergrens is een bord waarin nog
  // iets te zien valt.
  // Groot getoond bepaalt niet data-hoogte maar de plaats die overblijft naast
  // de tekstregel, de knoppen en de beschrijving.
  function vrijeHoogte(figuur, element) {
    var stijl = window.getComputedStyle(figuur);
    var over = figuur.clientHeight - parseFloat(stijl.paddingTop) -
      parseFloat(stijl.paddingBottom);
    Array.prototype.forEach.call(figuur.children, function (kind) {
      if (kind === element || !kind.offsetHeight) return;
      // De knoppenbalk van de presentatielaag zweeft over de figuur en neemt
      // dus geen plaats in de stroom in.
      var kindstijl = window.getComputedStyle(kind);
      if (kindstijl.position === "absolute") return;
      over -= kind.offsetHeight + parseFloat(kindstijl.marginTop) +
        parseFloat(kindstijl.marginBottom);
    });
    return over;
  }

  function hoogteVan(figuur, element) {
    if (figuur.hasAttribute("data-grafiek-groot") && element) {
      var vrij = vrijeHoogte(figuur, element);
      if (vrij > MINIMUMHOOGTE) return Math.round(vrij);
    }
    var meter = document.createElement("div");
    meter.style.cssText = "position:absolute;visibility:hidden;height:" +
      (figuur.getAttribute("data-hoogte") || STANDAARDHOOGTE);
    figuur.appendChild(meter);
    var gevraagd = meter.offsetHeight;
    figuur.removeChild(meter);
    if (!gevraagd) gevraagd = 400;
    var ruimte = Math.max(MINIMUMHOOGTE, window.innerHeight * 0.62);
    return Math.round(Math.max(MINIMUMHOOGTE, Math.min(gevraagd, ruimte)));
  }

  /* --- Een grafiek ------------------------------------------------------ */

  function figurenIn(wortel) {
    var lijst = [];
    if (!wortel || !wortel.querySelectorAll) return lijst;
    if (wortel.classList && wortel.classList.contains("interactieve-grafiek")) {
      lijst.push(wortel);
    }
    Array.prototype.push.apply(
      lijst, wortel.querySelectorAll(".interactieve-grafiek"));
    return lijst;
  }

  function figurenVoor(naam) {
    return figurenIn(document).filter(function (figuur) {
      return figuur.getAttribute("data-grafiek") === naam;
    });
  }

  function instantieVan(figuur) {
    for (var i = 0; i < instanties.length; i++) {
      if (instanties[i].figuur === figuur) return instanties[i];
    }
    return null;
  }

  function melder(instantie) {
    if (instantie.status) return instantie.status;
    var status = document.createElement("p");
    status.className = "interactieve-grafiek-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    var uitleg = instantie.figuur.querySelector(".interactieve-grafiek-uitleg");
    instantie.figuur.insertBefore(status, uitleg);
    instantie.status = status;
    return status;
  }

  function knoppenbalk(instantie) {
    if (instantie.knoppen) return instantie.knoppen;
    var balk = document.createElement("div");
    balk.className = "interactieve-grafiek-knoppen";
    var uitleg = instantie.figuur.querySelector(".interactieve-grafiek-uitleg");
    instantie.figuur.insertBefore(balk, uitleg);
    instantie.knoppen = balk;
    return balk;
  }

  function pasStijlToe(object, rol, kleuren) {
    var kleur = kleuren[rol] || kleuren.kromme;
    var eigenschappen = { strokeColor: kleur, highlightStrokeColor: kleur };
    if (object.elType === "point" || object.elType === "glider") {
      eigenschappen.fillColor = kleur;
      eigenschappen.highlightFillColor = kleur;
    }
    try {
      object.setAttribute(eigenschappen);
      // Het opschrift is een eigen object; zonder deze regel blijft het in de
      // nachtstand in de standaardkleur van JSXGraph staan.
      if (object.label) object.label.setAttribute({ strokeColor: kleur });
      // De maatstreepjes van een as hangen ook als eigen object aan de as.
      if (object.defaultTicks) {
        object.defaultTicks.setAttribute({ strokeColor: kleuren.as });
      }
    } catch (fout) { /* een verwijderd object hoeft niets meer. */ }
  }

  // JSXGraph 1.13 kan een kromme in een zeer klein venster (na veel keer
  // inzoomen, een interval van 1e-5 breed) met één enkel punt achterlaten, en
  // dan faalt het opbouwen van haar pad. Die fout breekt de update van het
  // bord halverwege af, en daarna weigert het bord elke volgende update: de
  // grafiek hangt, ook Reset en Beginstand doen niets meer. Zo'n pad blijft
  // daarom leeg; zodra het venster weer groter is, tekent de volgende update
  // het gewoon opnieuw.
  function beschermPaden(bord) {
    var renderer = bord.renderer;
    ["updatePathStringPrim", "updatePathStringBezierPrim"].forEach(function (naam) {
      var origineel = renderer[naam];
      if (typeof origineel !== "function") return;
      renderer[naam] = function () {
        try {
          return origineel.apply(this, arguments);
        } catch (fout) {
          return "";
        }
      };
    });
  }

  function maakContext(instantie) {
    var kleuren = kleurenVan(instantie.figuur);
    return {
      naam: instantie.naam,
      figuur: instantie.figuur,
      element: instantie.element,

      kleur: function (rol) { return kleuren[rol] || kleuren.kromme; },
      kleuren: function () { return kleurenVan(instantie.figuur); },
      getal: getal,

      // Maakt het JSXGraph-bord in de houder van deze figuur. De assen en het
      // raster horen bij de runtime, zodat ze in elk hoofdstuk hetzelfde
      // ogen en bij een themawisseling vanzelf mee veranderen.
      maakBord: function (opties) {
        var keuze = opties || {};
        var begrenzing = keuze.begrenzing || [-5, 5, 5, -5];
        var bord = window.JXG.JSXGraph.initBoard(instantie.element.id, {
          boundingbox: begrenzing,
          axis: false,
          grid: false,
          keepaspectratio: keuze.gelijkeschaal === true,
          showCopyright: false,
          showNavigation: false,
          showInfobox: false,
          // Pannen en zoomen staan uit: een leerling die de bedoelde figuur
          // uit beeld schuift, ziet niet meer waar het over ging.
          pan: { enabled: keuze.verschuiven === true, needTwoFingers: true },
          zoom: { enabled: keuze.zoomen === true, wheel: keuze.zoomen === true },
          registerEvents: true
        });
        beschermPaden(bord);
        bord.presBegrenzing = begrenzing.slice();
        bord.presGelijkeSchaal = keuze.gelijkeschaal === true;
        instantie.borden.push(bord);
        bord.containerObj.style.backgroundColor = kleuren.vlak;

        if (keuze.raster) {
          var raster = bord.create("grid", [], { strokeOpacity: 1 });
          instantie.gestileerd.push([raster, "raster"]);
          pasStijlToe(raster, "raster", kleuren);
        }
        if (keuze.assen !== false) {
          ["x", "y"].forEach(function (richting) {
            var punten = richting === "x"
              ? [[0, 0], [1, 0]]
              : [[0, 0], [0, 1]];
            var maatstrepen = {
              drawZero: false,
              drawLabels: keuze.asgetallen !== false,
              majorHeight: 8,
              minorTicks: 0,
              label: { cssClass: "grafiek-aslabel", anchorX: "middle" }
            };
            if (keuze.schaalstap) {
              maatstrepen.ticksDistance = keuze.schaalstap;
              maatstrepen.insertTicks = false;
            }
            var as = bord.create("axis", punten, {
              name: richting,
              withLabel: true,
              label: { position: "urt", offset: richting === "x" ? [-8, 14] : [12, -6],
                       cssClass: "grafiek-aslabel", useMathJax: false },
              ticks: maatstrepen
            });
            instantie.gestileerd.push([as, "as"]);
            pasStijlToe(as, "as", kleuren);
          });
        }
        return bord;
      },

      // Geeft een object een rol in plaats van een kleur. De runtime zet de
      // kleur nu, en opnieuw bij elke wisseling tussen dag en nacht.
      stijl: function (object, rol) {
        instantie.gestileerd.push([object, rol]);
        pasStijlToe(object, rol, kleurenVan(instantie.figuur));
        return object;
      },

      // De actuele waarden in tekst onder de grafiek, ook voor wie de
      // tekening niet ziet.
      toon: function (tekst) { melder(instantie).textContent = tekst; },

      knop: function (opschrift, functie) {
        var knop = document.createElement("button");
        knop.type = "button";
        knop.textContent = opschrift;
        knop.addEventListener("click", function () { functie(knop); });
        knoppenbalk(instantie).appendChild(knop);
        return knop;
      },

      // Het codeblok met [grafiek=<naam van deze grafiek>]. De grafiek
      // bewaart de toestand en levert met vooraf(waarden) de variabelen aan
      // waarmee de code begint. volg(toestand) krijgt elke melding van
      // python-oefeningen.js: na een uitvoering de eindwaarden, bij het
      // stappen de waarden voor de volgende regel. De laatste melding komt
      // meteen, want de code kan er al staan voor de grafiek gebouwd wordt.
      // Zonder Python blijft de grafiek werken; vooraf en voerUit doen dan
      // niets.
      code: function (volg) {
        function blok() {
          return document.querySelector('.python-oefening[data-grafiek="' +
            instantie.naam + '"]');
        }
        function api() { var b = blok(); return b && b.mathesisCode; }
        // De scripts van de grafieken laden voor die van Python. Vraagt de
        // grafiek variabelen aan voor het codeblok er is, dan onthouden we
        // ze tot de eerste melding van dat blok.
        var gewenst = null;
        function luister(e) {
          if (!e.detail || e.detail.grafiek !== instantie.naam) return;
          if (gewenst && api()) {
            var waarden = gewenst;
            gewenst = null;
            api().vooraf(waarden, true);
          }
          try { volg(e.detail); } catch (fout) {
            if (window.console && console.warn) console.warn(fout);
          }
        }
        document.addEventListener("python:toestand", luister);
        instantie.opruimen.push(function () {
          document.removeEventListener("python:toestand", luister);
        });
        var nu = api();
        if (nu && nu.laatste()) volg(nu.laatste());
        return {
          beschikbaar: function () { return Boolean(api()); },
          // sluitStappen = false laat een open stapopname staan: de grafiek
          // neemt dan net het einde van die opname over als nieuwe toestand.
          vooraf: function (waarden, sluitStappen) {
            var a = api();
            gewenst = a ? null : waarden;
            return a ? a.vooraf(waarden, sluitStappen !== false) : false;
          },
          voerUit: function () { var a = api(); return a ? a.voerUit() : false; }
        };
      }
    };
  }

  function mislukt(instantie, fout) {
    if (window.console && console.warn) {
      console.warn("interactieve grafiek '" + instantie.naam +
                   "' kon niet starten; de statische figuur blijft staan", fout);
    }
    ruimOp(instantie);
    instantie.figuur.classList.remove("interactieve-grafiek-actief");
    instantie.element.style.display = "";
    instantie.figuur.setAttribute("data-grafiek-stand", "mislukt");
  }

  function ruimOp(instantie) {
    if (instantie.api && typeof instantie.api.vernietig === "function") {
      try { instantie.api.vernietig(); } catch (fout) { /* niets */ }
    }
    instantie.borden.forEach(function (bord) {
      try { window.JXG.JSXGraph.freeBoard(bord); } catch (fout) { /* niets */ }
    });
    instantie.borden = [];
    instantie.gestileerd = [];
    instantie.opruimen.forEach(function (werk) { werk(); });
    instantie.opruimen = [];
    if (instantie.status) instantie.status.textContent = "";
    var plaats = instanties.indexOf(instantie);
    if (plaats >= 0) instanties.splice(plaats, 1);
  }

  function bouw(figuur) {
    if (figuur.getAttribute("data-grafiek-stand")) return;
    var naam = figuur.getAttribute("data-grafiek");
    var bouwer = definities[naam];
    var element = figuur.querySelector(".interactieve-grafiek-bord");
    if (!bouwer || !element || !window.JXG) return;
    // Een slide die nog verborgen is, heeft geen bruikbare breedte; de
    // grafiek wacht dan tot ze voor het eerst in beeld komt.
    if (!figuur.clientWidth) return;

    if (!element.id) element.id = "grafiek-" + (++teller);
    element.style.height = hoogteVan(figuur, element) + "px";
    element.style.display = "block";
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "application");
    var uitleg = figuur.querySelector(".interactieve-grafiek-uitleg");
    if (uitleg) element.setAttribute("aria-label", uitleg.textContent.trim());

    var instantie = {
      figuur: figuur, element: element, naam: naam,
      borden: [], gestileerd: [], api: null, status: null, knoppen: null,
      opruimen: []
    };
    instanties.push(instantie);
    try {
      instantie.api = bouwer(maakContext(instantie)) || {};
    } catch (fout) {
      mislukt(instantie, fout);
      return;
    }
    if (!instantie.borden.length) {
      mislukt(instantie, new Error("de definitie maakte geen bord"));
      return;
    }
    figuur.setAttribute("data-grafiek-stand", "actief");
    figuur.classList.add("interactieve-grafiek-actief");
    // Een bord dat later gebouwd wordt op een slide waar al een bord staat
    // (een tweede oefening achter \oefeningenbalk), houdt in de SVG soms de
    // standaardkleuren van JSXGraph, ook na de fullUpdate van het
    // herschalen. Eén beeld later tekent een fullUpdate de kleuren wel.
    window.requestAnimationFrame(function () {
      instantie.borden.forEach(function (bord) {
        try { bord.fullUpdate(); } catch (fout) { /* niets */ }
      });
    });
  }

  /* --- Herschalen, herstellen, herkleuren -------------------------------- */

  function herschaalInstantie(instantie) {
    // JSXGraph schrijft de vorige breedte als inline pixels op de houder.
    // Na Groot zou die breedte anders de gewone (soms halve) kolom zelf
    // uitrekken. Neutraliseer haar vóór we de beschikbare breedte meten.
    instantie.element.style.width = "0px";
    var breedte = instantie.figuur.clientWidth;
    if (!breedte) {
      instantie.element.style.width = "100%";
      return;
    }
    var hoogte = hoogteVan(instantie.figuur, instantie.element);
    // Groot getoond krijgt het bord dezelfde verhouding als in de slide, zo
    // groot als in de vrije plaats past. Anders zet setBoundingBox hetzelfde
    // venster op een andere verhouding en rekt een bord zonder gelijke schaal
    // één as uit: hellingen en hoeken zien er dan anders uit.
    if (!instantie.figuur.hasAttribute("data-grafiek-groot")) {
      instantie.verhouding = breedte / hoogte;
    } else if (instantie.verhouding) {
      if (breedte / hoogte > instantie.verhouding) {
        breedte = Math.round(hoogte * instantie.verhouding);
      } else {
        hoogte = Math.round(breedte / instantie.verhouding);
      }
    }
    instantie.element.style.width = breedte + "px";
    instantie.element.style.height = hoogte + "px";
    instantie.borden.forEach(function (bord) {
      try {
        bord.resizeContainer(breedte, hoogte, true);
        bord.setBoundingBox(bord.presBegrenzing, bord.presGelijkeSchaal);
        bord.fullUpdate();
      } catch (fout) { /* een bord dat net verdween, hoeft niets. */ }
    });
    var rij = instantie.figuur.closest(".center");
    if (rij) {
      var bordKader = instantie.element.getBoundingClientRect();
      var rijKader = rij.getBoundingClientRect();
      var midden = bordKader.top - rijKader.top + bordKader.height / 2;
      rij.style.setProperty("--grafiek-bordmidden", midden + "px");
    }
    if (instantie.api && typeof instantie.api.herschaal === "function") {
      try { instantie.api.herschaal(); } catch (fout) { /* niets */ }
    }
  }

  var gepland = false;
  function planHerschalen() {
    if (gepland) return;
    gepland = true;
    window.requestAnimationFrame(function () {
      gepland = false;
      instanties.forEach(herschaalInstantie);
    });
  }

  function herstelInstantie(instantie) {
    if (instantie.api && typeof instantie.api.reset === "function") {
      try { instantie.api.reset(); } catch (fout) { /* niets */ }
    }
  }

  function herkleurInstantie(instantie) {
    var kleuren = kleurenVan(instantie.figuur);
    instantie.borden.forEach(function (bord) {
      bord.containerObj.style.backgroundColor = kleuren.vlak;
    });
    instantie.gestileerd.forEach(function (paar) {
      pasStijlToe(paar[0], paar[1], kleuren);
    });
    if (instantie.api && typeof instantie.api.kleur === "function") {
      try { instantie.api.kleur(kleuren); } catch (fout) { /* niets */ }
    }
    instantie.borden.forEach(function (bord) {
      try { bord.fullUpdate(); } catch (fout) { /* niets */ }
    });
  }

  function overInstanties(wortel, werk) {
    figurenIn(wortel).forEach(function (figuur) {
      var instantie = instantieVan(figuur);
      if (instantie) werk(instantie);
    });
  }

  /* --- Aanhaken --------------------------------------------------------- */

  function bouwEnHerschaalFiguren(figuren) {
    figuren.forEach(function (figuur) {
      bouw(figuur);
      var instantie = instantieVan(figuur);
      if (instantie) herschaalInstantie(instantie);
    });
  }

  function bouwEnHerschaal(wortel) {
    bouwEnHerschaalFiguren(figurenIn(wortel));
  }

  function bekijkAlles() {
    bouwEnHerschaal(document);
  }

  function registreer(naam, bouwer) {
    if (typeof naam !== "string" || typeof bouwer !== "function") return;
    definities[naam] = bouwer;
    // Een module kan na de eerste slidewissel binnenkomen; dan hoort een
    // grafiek met die naam die al in beeld staat er alsnog te komen.
    bouwEnHerschaalFiguren(figurenVoor(naam));
  }

  // Een slide die zichtbaar wordt of van grootte verandert, meldt dat; de
  // presentatielaag blijft eigenaar van de slidewissel zelf.
  document.addEventListener("pres:zichtbaar", function (e) {
    bouwEnHerschaal(e.target);
  });

  document.addEventListener("pres:herstel", function (e) {
    overInstanties(e.target, herstelInstantie);
  });

  document.addEventListener("pres:thema", function () {
    instanties.forEach(herkleurInstantie);
  });

  window.addEventListener("resize", planHerschalen);
  window.addEventListener("orientationchange", planHerschalen);

  // Zonder presentatielaag (een gewone lwarp-pagina, of een slide die op een
  // andere manier in beeld komt) blijft dit de vangnet: zodra een figuur echt
  // te zien is, wordt ze gebouwd.
  if (window.IntersectionObserver) {
    var kijker = new window.IntersectionObserver(function (waarnemingen) {
      waarnemingen.forEach(function (waarneming) {
        if (waarneming.isIntersecting) bouwEnHerschaal(waarneming.target);
      });
    }, { rootMargin: "200px" });
    figurenIn(document).forEach(function (figuur) { kijker.observe(figuur); });
  }

  if (window.ResizeObserver) {
    var meter = new window.ResizeObserver(planHerschalen);
    figurenIn(document).forEach(function (figuur) { meter.observe(figuur); });
  }

  window.InteractieveGrafieken = {
    registreer: registreer,
    bekijk: bekijkAlles,
    herschaal: function (wortel) { overInstanties(wortel || document, herschaalInstantie); },
    herstel: function (wortel) { overInstanties(wortel || document, herstelInstantie); },
    herkleur: function () { instanties.forEach(herkleurInstantie); },
    getal: getal
  };

  bekijkAlles();
})(window, document);
