/* Functierekenmachine voor de cursussite.
 *
 * Een rekenvenster bij het hoofdstuk over afgeleiden, met twee delen die
 * dezelfde functies delen:
 *  - CAS: de leerling typt f(x) = ..., f'(x), f'(2), raaklijn(f, 2) of
 *    D(...), en krijgt het antwoord exact, met de afleiding stap voor stap en
 *    bij elke stap de rekenregel uit de cursus;
 *  - Grafiek: de grafieken van alle functies uit de CAS, met een lege rij om
 *    de volgende te definiëren, en op één ervan een punt P dat over de
 *    grafiek schuift, met op vraag de afgeleide functie, de raaklijn en de
 *    normaal in P, en de vergelijkingen exact eronder.
 *
 * Het rekenwerk zit in functiecas.js (window.FunctieCAS), de tekening in
 * JSXGraph en de formules in MathJax, die de cursuspagina allebei al laadt.
 * presentatie.js bouwt het venster en roept Functierekenmachine.maak(houder)
 * aan. Het venster onthoudt niets tussen twee bezoeken aan de pagina.
 */
(function () {
  "use strict";

  var CAS = window.FunctieCAS;

  var VOORBEELDEN = [
    ["f(x) = x^3 - 3x", "een functie definiëren"],
    ["f'(x)", "de afgeleide functie, stap voor stap"],
    ["f'(2)", "een afgeleid getal"],
    ["raaklijn(f, 2)", "de raaklijn in het punt met x = 2"],
    ["normaal(f, 2)", "de normaal in dat punt"],
    ["f''(x)", "de tweede afgeleide"],
    ["D((x^2 + 1)/(x - 1))", "een afgeleide zonder naam"],
    ["(sqrt(x^2 - 1))'", "met de kettingregel"]
  ];

  var SCHRIJFWIJZE = [
    ["x^2", "x^{2}"], ["2x", "2x"], ["(x+1)/(x-1)", "\\frac{x+1}{x-1}"],
    ["sqrt(x)", "\\sqrt{x}"], ["cbrt(x)", "\\sqrt[3]{x}"], ["root(x, 4)", "\\sqrt[4]{x}"],
    ["x^(1/3)", "x^{\\frac{1}{3}}"], ["1.5", "1.5"],
    ["f(x) = ...", "\\text{definieert } f"], ["f'(x),\\ f''(x)", "\\text{afgeleiden}"],
    ["D(...)  of  (...)'", "\\text{afgeleide van een uitdrukking}"],
    ["raaklijn(f, a)", "t \\text{ in } P(a, f(a))"], ["normaal(f, a)", "n \\text{ in } P(a, f(a))"],
    ["wis(f),\\ wis(f, g),\\ wis()", "\\text{wist } f, \\text{ meer functies, of alles}"],
    ["sin(x),\\ sin x,\\ sin^2 x", "\\sin x,\\ \\sin^{2} x"], ["cos, tan, cot", "\\cos x,\\ \\tan x,\\ \\cot x"],
    ["bgsin, bgcos, bgtan", "\\operatorname{bgsin} x, \\ldots"],
    ["e^x,\\ 2^x", "e^{x},\\ 2^{x}"], ["ln x,\\ log_2(x),\\ log x", "\\ln x,\\ \\log_{2} x,\\ \\log x"],
    ["pi", "\\pi"], ["h(t) = ...", "\\text{een andere veranderlijke}"]
  ];

  /* --- Kleine hulpjes ---------------------------------------------------- */

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  function knop(opschrift, klasse, bij) {
    var k = el("button", "fr-knop" + (klasse ? " " + klasse : ""), opschrift);
    k.type = "button";
    if (bij) k.addEventListener("click", bij);
    return k;
  }

  // Een formule als knooppunt. MathJax is er meestal al; zo niet, dan staat er
  // even de LaTeX-bron, die vervangen wordt zodra MathJax klaar is.
  function wiskunde(tex, blok) {
    var houder = el(blok ? "div" : "span", blok ? "fr-formule" : "fr-inline");
    var mj = window.MathJax;
    function zet() {
      try {
        var uit = window.MathJax.tex2svg(tex, { display: !!blok });
        houder.replaceChildren(uit);
      } catch (e) {
        houder.textContent = tex;
      }
    }
    if (mj && mj.tex2svg) zet();
    else {
      houder.textContent = tex;
      if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(zet);
    }
    return houder;
  }

  // Tekst met formules tussen $...$.
  function tekstMetWiskunde(tekst, klasse) {
    var p = el("p", klasse);
    tekst.split("$").forEach(function (deel, i) {
      if (!deel) return;
      p.appendChild(i % 2 ? wiskunde(deel, false) : document.createTextNode(deel));
    });
    return p;
  }

  function kleur(naam, terug) {
    var w = window.getComputedStyle(document.documentElement).getPropertyValue(naam).trim();
    return w || terug;
  }

  /* --- De rekenmachine ---------------------------------------------------- */

  function maak(houder) {
    var omgeving = new CAS.Omgeving();
    var geschiedenis = [], terugblik = -1;
    var wortel = el("div", "fr");

    /* --- Tabbladen ------------------------------------------------------ */

    var tabs = el("div", "fr-tabs");
    tabs.setAttribute("role", "tablist");
    var panelen = {}, tabknoppen = {};
    function tab(naam, opschrift) {
      var k = knop(opschrift, "fr-tab", function () { kies(naam); });
      k.setAttribute("role", "tab");
      tabknoppen[naam] = k;
      tabs.appendChild(k);
      var paneel = el("div", "fr-paneel fr-paneel-" + naam);
      paneel.setAttribute("role", "tabpanel");
      panelen[naam] = paneel;
      return paneel;
    }
    var casPaneel = tab("cas", "CAS");
    var grafiekPaneel = tab("grafiek", "Grafiek");
    wortel.appendChild(tabs);
    wortel.appendChild(casPaneel);
    wortel.appendChild(grafiekPaneel);
    var huidigeTab = null;

    // Op een breed scherm staan CAS en grafiek naast elkaar, zodat je ziet
    // hoe een definitie in de ene meteen in de andere verschijnt. Op een smal
    // scherm is er daar geen plaats voor, en kies je met de tabbladen.
    var breed = window.matchMedia ? window.matchMedia("(min-width: 72rem)") : null;
    function naastElkaar() { return !!(breed && breed.matches); }

    function kies(naam) {
      huidigeTab = naam;
      var naast = naastElkaar();
      wortel.classList.toggle("fr-naast", naast);
      tabs.hidden = naast;
      Object.keys(panelen).forEach(function (n) {
        var aan = n === naam;
        panelen[n].hidden = !naast && !aan;
        tabknoppen[n].setAttribute("aria-selected", String(aan));
        tabknoppen[n].classList.toggle("fr-aan", aan);
      });
      if (naam === "grafiek") grafiek.toon(true);
      else invoer.focus({ preventScroll: true });
    }
    if (breed) {
      var wissel = function () { kies(huidigeTab || "cas"); };
      if (breed.addEventListener) breed.addEventListener("change", wissel);
      else if (breed.addListener) breed.addListener(wissel);
    }

    /* --- CAS ------------------------------------------------------------ */

    var verloop = el("div", "fr-verloop");
    verloop.setAttribute("aria-live", "polite");
    var leeg = el("div", "fr-leeg");
    leeg.appendChild(el("p", null, "Typ hieronder een opdracht, of kies een voorbeeld."));
    var voorbeelden = el("div", "fr-voorbeelden");
    VOORBEELDEN.forEach(function (v) {
      var k = knop(v[0], "fr-voorbeeld", function () { voerUit(v[0]); });
      k.title = v[1];
      voorbeelden.appendChild(k);
    });
    leeg.appendChild(voorbeelden);
    verloop.appendChild(leeg);

    var invoerrij = el("form", "fr-invoerrij");
    var label = el("label", "fr-label", "Invoer:");
    var invoer = el("input", "fr-invoer");
    invoer.type = "text";
    invoer.id = "fr-invoer";
    invoer.autocomplete = "off";
    invoer.spellcheck = false;
    invoer.setAttribute("autocapitalize", "off");
    invoer.placeholder = "bijvoorbeeld f(x) = x^3 - 3x";
    label.htmlFor = invoer.id;
    // De knop toont het entersymbool: Enter doet hetzelfde als erop klikken.
    var reken = knop("", "fr-hoofdknop fr-enter");
    reken.type = "submit";
    reken.title = "Reken (Enter)";
    reken.setAttribute("aria-label", "Reken");
    reken.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" ' +
      'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M19 5v7a3 3 0 0 1-3 3H6"/><path d="M10 10l-5 5 5 5"/></svg>';
    invoerrij.appendChild(label);
    invoerrij.appendChild(invoer);
    invoerrij.appendChild(reken);

    // Terwijl de leerling typt, staat eronder hoe de rekenmachine het leest.
    var voorproef = el("div", "fr-voorproef");
    var voorproefTimer = null;
    function toonVoorproef() {
      voorproef.replaceChildren();
      voorproef.classList.remove("fr-fout");
      var t = invoer.value.trim();
      if (!t) return;
      try {
        var boom = CAS.lees(t);
        voorproef.appendChild(el("span", "fr-zwak", "gelezen als "));
        voorproef.appendChild(wiskunde(CAS.tex(boom), false));
      } catch (fout) {
        if (!(fout instanceof CAS.Invoerfout)) return;
        voorproef.classList.add("fr-fout");
        voorproef.appendChild(foutMetPlaats(t, fout));
      }
    }
    invoer.addEventListener("input", function () {
      terugblik = -1;
      clearTimeout(voorproefTimer);
      voorproefTimer = setTimeout(toonVoorproef, 180);
    });
    // Pijltjes omhoog en omlaag halen vorige opdrachten terug, zoals op een GRM.
    invoer.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!geschiedenis.length) return;
      e.preventDefault();
      if (e.key === "ArrowUp") terugblik = terugblik < 0 ? geschiedenis.length - 1 : Math.max(0, terugblik - 1);
      else terugblik = terugblik < 0 ? -1 : terugblik + 1;
      if (terugblik >= geschiedenis.length) terugblik = -1;
      invoer.value = terugblik < 0 ? "" : geschiedenis[terugblik];
      toonVoorproef();
    });
    invoerrij.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = invoer.value.trim();
      if (t) voerUit(t);
    });

    function foutMetPlaats(tekst, fout) {
      var d = el("span", "fr-foutmelding");
      d.appendChild(document.createTextNode(fout.message));
      if (typeof fout.plaats === "number") {
        var code = el("code", "fr-foutplaats");
        var p = Math.min(fout.plaats, tekst.length);
        code.appendChild(document.createTextNode(tekst.slice(0, p)));
        code.appendChild(el("mark", null, tekst.slice(p, p + 1) || " "));
        code.appendChild(document.createTextNode(tekst.slice(p + 1)));
        d.appendChild(document.createTextNode(" "));
        d.appendChild(code);
      }
      return d;
    }

    var hulp = el("details", "fr-hulp");
    hulp.appendChild(el("summary", null, "Hoe typ ik dat?"));
    var tabel = el("table", "fr-schrijfwijze");
    SCHRIJFWIJZE.forEach(function (r) {
      var tr = el("tr");
      var td1 = el("td");
      td1.appendChild(el("code", null, r[0].replace(/\\ /g, " ")));
      var td2 = el("td");
      td2.appendChild(wiskunde(r[1], false));
      tr.appendChild(td1);
      tr.appendChild(td2);
      tabel.appendChild(tr);
    });
    hulp.appendChild(tabel);
    hulp.appendChild(el("p", "fr-zwak",
      "Decimalen schrijf je met een punt. Een letter voor een haakje is een functie als je ze gedefinieerd hebt; " +
      "anders is het een product: a(x+1) is a · (x+1). De pijltjes ↑ en ↓ halen vorige opdrachten terug."));

    casPaneel.appendChild(verloop);
    casPaneel.appendChild(invoerrij);
    casPaneel.appendChild(voorproef);
    casPaneel.appendChild(hulp);

    // Eén regel invoer uitvoeren en zijn antwoord onderaan het verloop zetten.
    // Komt de regel uit de grafiek (stil), dan blijft een fout uit het
    // verloop: de grafiek toont ze zelf, en krijgt ze hier terug.
    function voerUit(tekst, stil) {
      var r = null, fout = null;
      try { r = omgeving.voerUit(tekst); }
      catch (e) {
        if (!(e instanceof CAS.Rekenfout || e instanceof CAS.Invoerfout)) {
          if (window.console) console.error(e);
          e = new CAS.Rekenfout("Daar liep iets mis in de rekenmachine zelf.");
        }
        fout = e;
      }
      if (stil && fout) return fout;
      if (leeg.parentNode) leeg.remove();
      geschiedenis.push(tekst);
      terugblik = -1;
      var item = el("div", "fr-item");
      var kop = el("div", "fr-itemkop");
      var getypt = knop(tekst, "fr-getypt", function () {
        invoer.value = tekst;
        toonVoorproef();
        invoer.focus();
      });
      getypt.title = "Opnieuw in het invoerveld zetten";
      kop.appendChild(getypt);
      item.appendChild(kop);
      if (r) {
        r.blokken.forEach(function (b) { item.appendChild(blok(b)); });
        if (r.functie || r.gewist) grafiek.functieGewijzigd(r.functie || null);
      } else {
        var f = el("div", "fr-fout");
        f.appendChild(foutMetPlaats(tekst, fout));
        item.appendChild(f);
      }
      verloop.appendChild(item);
      verloop.scrollTop = verloop.scrollHeight;
      if (stil) return null;
      invoer.value = "";
      voorproef.replaceChildren();
      item.scrollIntoView({ block: "nearest" });
      return fout;
    }

    function blok(b) {
      switch (b.soort) {
        case "vergelijking": {
          var v = wiskunde(b.tex, true);
          if (b.zwak) v.classList.add("fr-zwak");
          return v;
        }
        case "benadering": {
          var n = wiskunde(b.tex, true);
          n.classList.add("fr-benadering");
          return n;
        }
        case "tekst": {
          var d = el("div", "fr-tekst" + (b.fout ? " fr-fout" : ""));
          d.appendChild(tekstMetWiskunde(b.tekst));
          if (b.formule) {
            var fm = wiskunde(b.formule, true);
            fm.classList.add("fr-zwak");
            d.appendChild(fm);
          }
          return d;
        }
        case "stappen": return stappenblok(b);
      }
      return el("div");
    }

    // Een afleiding: bovenaan de uitkomst, eronder op vraag elke stap met
    // de rekenregel ernaast.
    function stappenblok(b) {
      var d = el("div", "fr-stappen");
      var links = b.links ? b.links + " = " : b.stappen[0].tex + " = ";
      var kop = el("div", "fr-stappenkop");
      kop.appendChild(wiskunde(links + b.resultaat, true));
      var wissel = knop("", "fr-klein fr-stappenknop");
      kop.appendChild(wissel);
      d.appendChild(kop);

      var tabel = el("div", "fr-stappenlijst");
      var rijen = [];
      b.stappen.forEach(function (s, i) {
        rijen.push({ tex: (i === 0 ? (b.links ? b.links + " = " : "") : "= ") + s.tex,
                     uitleg: s.uitleg || s.regels.map(function (t) { return { formule: t, met: [] }; }) });
      });
      b.uitkomst.forEach(function (t, j) {
        var naam = b.uitkomstNamen ? b.uitkomstNamen[j] : (j === b.uitkomst.length - 1 && b.uitkomst.length > 1 ? "op één noemer" : "vereenvoudigd");
        rijen.push({ tex: "= " + t, uitleg: [], eind: true, naam: naam });
      });
      rijen.forEach(function (r, i) {
        var rij = el("div", "fr-stap" + (r.eind ? " fr-stap-eind" : ""));
        rij.appendChild(wiskunde("\\displaystyle " + r.tex, false));
        var regels = el("div", "fr-regels");
        // Elke regel met eronder wat f, g, ... in deze stap zijn: zo zie je
        // hoe de formule uit de cursus op deze uitdrukking past.
        r.uitleg.forEach(function (u) {
          var regel = el("div", "fr-regel");
          regel.appendChild(wiskunde("\\displaystyle " + u.formule, false));
          u.met.forEach(function (m) {
            var met = wiskunde("\\text{met } " + m, false);
            met.classList.add("fr-met");
            regel.appendChild(met);
          });
          regels.appendChild(regel);
        });
        if (r.eind) regels.appendChild(el("span", "fr-regelnaam", r.naam));
        rij.appendChild(regels);
        tabel.appendChild(rij);
      });
      d.appendChild(tabel);
      function zet(open) {
        tabel.hidden = !open;
        wissel.textContent = open ? "Verberg de stappen" : "Toon de stappen";
        wissel.setAttribute("aria-expanded", String(open));
      }
      wissel.addEventListener("click", function () { zet(tabel.hidden); });
      zet(!!b.open);
      if (b.stappen.length <= 1) wissel.hidden = true;
      return d;
    }

    /* --- Grafiek ------------------------------------------------------- */

    // Een definitie in de grafiek komt als gewone regel in het verloop van
    // de CAS, zodat daar altijd te zien is waar f vandaan komt.
    var grafiek = maakGrafiek(grafiekPaneel, omgeving, function (tekst) {
      kies("cas");
      voerUit(tekst);
    }, function (tekst) {
      return voerUit(tekst, true);
    });

    houder.appendChild(wortel);
    kies("cas");

    return {
      element: wortel,
      herstel: function () {
        omgeving.wis();
        geschiedenis = [];
        verloop.replaceChildren(leeg);
        invoer.value = "";
        voorproef.replaceChildren();
        grafiek.herstel();
        kies("cas");
      }
    };
  }

  /* --- De grafiekmodule --------------------------------------------------- */

  // De grafiek toont precies de functies van de CAS: wat daar gedefinieerd
  // is, staat hier getekend, en wat hier gedefinieerd wordt, gaat als regel
  // naar de CAS. Onder de functies staat altijd een lege rij voor de
  // volgende naam, te beginnen met f.
  var NAMEN_OP_VOLGORDE = "fghkpqrsuvw";
  // Kleuren per functie, in volgorde van de namen; de variabelen staan in
  // functierekenmachine.css, met een eigen reeks voor de nachtstand.
  var KROMMEKLEUREN = [["--fr-kromme", "#445264"], ["--fr-kromme-2", "#7c3aed"],
                       ["--fr-kromme-3", "#be185d"], ["--fr-kromme-4", "#0e7490"]];

  function maakGrafiek(paneel, omgeving, naarCas, definieerInCas) {
    var st = { actief: null, a: CAS.Q(3, 2), gelijk: false,
               toon: { afgeleide: false, raaklijn: true, normaal: false } };
    // Per naam: { v, tekst, analyse } of { fout } als ze niet te tekenen is.
    var functies = {};
    var bord = null, objecten = {}, bouwklaar = false;

    var lijst = el("div", "fr-functielijst");
    lijst.setAttribute("role", "group");
    lijst.setAttribute("aria-label", "Functies");
    paneel.appendChild(lijst);

    var balk = el("div", "fr-grafiekbalk");
    var arij = el("label", "fr-veldgroep");
    arij.appendChild(wiskunde("a =", false));
    var aveld = el("input", "fr-invoer fr-aveld");
    aveld.type = "text";
    aveld.spellcheck = false;
    aveld.autocomplete = "off";
    aveld.setAttribute("inputmode", "decimal");
    aveld.setAttribute("aria-label", "x-coördinaat van P");
    aveld.title = "De x-coördinaat van P; ↑ en ↓ schuiven 0.1 op";
    arij.appendChild(aveld);
    balk.appendChild(arij);

    var schakelaars = el("div", "fr-schakelaars");
    schakelaars.setAttribute("role", "group");
    schakelaars.setAttribute("aria-label", "Tonen");
    var sknoppen = {};
    [["afgeleide", "grafiek van "], ["raaklijn", "raaklijn t"], ["normaal", "normaal n"]].forEach(function (s) {
      var k = knop(s[1], "fr-schakel fr-schakel-" + s[0], function () {
        st.toon[s[0]] = !st.toon[s[0]];
        zetSchakelaars();
        tekenBij();
      });
      sknoppen[s[0]] = k;
      schakelaars.appendChild(k);
    });
    balk.appendChild(schakelaars);
    var passend = knop("Passend", "fr-klein", function () { pasVensterAan(); });
    passend.title = "Het venster aan de grafiek aanpassen";
    // Enkel op gelijke schaal staat de normaal ook zichtbaar loodrecht op de
    // raaklijn; anders krijgt de grafiek meer plaats in de hoogte.
    var gelijk = knop("1 : 1", "fr-klein", function () {
      st.gelijk = !st.gelijk;
      zetSchakelaars();
      pasVensterAan();
    });
    gelijk.title = "Gelijke schaal op beide assen";
    var vensterknoppen = el("div", "fr-schakelaars");
    vensterknoppen.appendChild(gelijk);
    vensterknoppen.appendChild(passend);
    balk.appendChild(vensterknoppen);
    paneel.appendChild(balk);

    var melding = el("div", "fr-grafiekmelding");
    paneel.appendChild(melding);
    var bordvak = el("div", "fr-bord");
    bordvak.id = "fr-bord-" + Math.random().toString(36).slice(2, 8);
    paneel.appendChild(bordvak);
    paneel.appendChild(el("p", "fr-zwak fr-bordtip",
      "Versleep P over de grafiek; a schuift per 0.1. Scroll of knijp om te zoomen, sleep het vlak om te verschuiven."));
    var uitlees = el("div", "fr-uitlees");
    uitlees.setAttribute("aria-live", "polite");
    paneel.appendChild(uitlees);
    var naarBerekening = knop("Toon de berekening in de CAS", "fr-klein fr-naarcas", function () {
      if (!st.actief) return;
      naarCas((st.toon.normaal && !st.toon.raaklijn ? "normaal" : "raaklijn") + "(" + st.actief + ", " + CAS.qtekst(st.a) + ")");
    });
    paneel.appendChild(naarBerekening);

    /* --- De functies uit de CAS ------------------------------------------ */

    function namen() {
      return Object.keys(omgeving.functies).sort(function (p, q) {
        var i = NAMEN_OP_VOLGORDE.indexOf(p), j = NAMEN_OP_VOLGORDE.indexOf(q);
        if (i < 0) i = 100;
        if (j < 0) j = 100;
        return i - j || (p < q ? -1 : p > q ? 1 : 0);
      });
    }
    // De eerste naam die nog vrij is: f, dan g, h, ...
    function vrijeNaam() {
      for (var i = 0; i < NAMEN_OP_VOLGORDE.length; i++) {
        if (!omgeving.functies[NAMEN_OP_VOLGORDE[i]]) return NAMEN_OP_VOLGORDE[i];
      }
      return null;
    }
    // Elke functie houdt haar kleur zolang ze bestaat: wissen of opnieuw
    // definiëren van een andere functie verkleurt haar niet. Een nieuwe
    // functie krijgt de eerste kleur die geen andere functie draagt.
    var kleurVanNaam = {};
    function kleurnummer(naam) {
      var bestaand = namen();
      Object.keys(kleurVanNaam).forEach(function (n) {
        if (bestaand.indexOf(n) < 0) delete kleurVanNaam[n];
      });
      if (!(naam in kleurVanNaam)) {
        if (bestaand.indexOf(naam) < 0) return 0;
        var bezet = bestaand.filter(function (n) { return n in kleurVanNaam; })
          .map(function (n) { return kleurVanNaam[n]; });
        var k = 0;
        while (bezet.indexOf(k) >= 0 && k < KROMMEKLEUREN.length) k++;
        kleurVanNaam[naam] = k % KROMMEKLEUREN.length;
      }
      return kleurVanNaam[naam];
    }
    function kleurVan(naam) { return kleuren["kromme" + kleurnummer(naam)]; }
    function actieveAnalyse() {
      var f = st.actief && functies[st.actief];
      return f && f.analyse || null;
    }

    // Leest de functies opnieuw uit de CAS.
    function leesFuncties() {
      functies = {};
      namen().forEach(function (n) {
        var f = omgeving.functies[n];
        try {
          var lijf = omgeving.voorschrift(n);
          functies[n] = { v: f.v, tekst: f.tekst || CAS.tex(lijf), analyse: CAS.analyseer(lijf, f.v) };
        } catch (fout) {
          if (!(fout instanceof CAS.Rekenfout)) throw fout;
          functies[n] = { v: f.v, tekst: f.tekst || "", fout: fout.message };
        }
      });
      if (!functies[st.actief]) st.actief = namen()[0] || null;
    }

    // Een rij per functie, en een lege rij voor de volgende naam.
    function bouwLijst() {
      var focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.naam : null;
      lijst.replaceChildren();
      namen().forEach(function (n) { lijst.appendChild(rij(n, functies[n])); });
      var vrij = vrijeNaam();
      if (vrij) lijst.appendChild(rij(vrij, null));
      if (focus) {
        var veld = lijst.querySelector('input[data-naam="' + focus + '"]');
        if (veld) veld.focus({ preventScroll: true });
      }
    }

    function rij(naam, f) {
      var r = el("div", "fr-functierij" + (f ? "" : " fr-functierij-nieuw") + (naam === st.actief ? " fr-aan" : ""));
      var kiezer = knop("", "fr-klein fr-kiezer", function () { kies(naam); });
      kiezer.disabled = !f || !f.analyse;
      kiezer.setAttribute("aria-pressed", String(naam === st.actief));
      kiezer.title = f ? "P, de raaklijn en de normaal op de grafiek van " + naam : "Nog niet gedefinieerd";
      kiezer.setAttribute("aria-label", "P op " + naam);
      if (f) kiezer.style.setProperty("--fr-rol", "var(" + KROMMEKLEUREN[kleurnummer(naam)][0] + ")");
      r.appendChild(kiezer);
      var label = el("label", "fr-veldgroep");
      var v = f ? f.v : "x";
      label.appendChild(wiskunde(naam + "(" + v + ") =", false));
      var veld = el("input", "fr-invoer fr-fveld");
      veld.type = "text";
      veld.spellcheck = false;
      veld.autocomplete = "off";
      veld.dataset.naam = naam;
      veld.value = f ? f.tekst : "";
      veld.placeholder = f ? "" : "bijvoorbeeld x^3 - 3x";
      veld.setAttribute("aria-label", "Voorschrift van " + naam);
      if (f && f.fout) { veld.classList.add("fr-veld-fout"); veld.title = f.fout; }
      veld.addEventListener("focus", function () { if (f && f.analyse && st.actief !== naam) kies(naam); });
      veld.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        definieer(naam, v, veld);
      });
      veld.addEventListener("change", function () { definieer(naam, v, veld); });
      if (f) {
        // Een klein kruisje rechts in het veld wist de functie, ook in de CAS.
        var vak = el("span", "fr-fvak");
        vak.appendChild(veld);
        // Wissen loopt langs de CAS, zoals definiëren: de regel wis(f)
        // komt in het verloop en is daar met één klik terug te halen.
        var wis = knop("×", "fr-wisknop", function () { definieerInCas("wis(" + naam + ")"); });
        wis.title = naam + " wissen";
        wis.setAttribute("aria-label", "Wis " + naam);
        vak.appendChild(wis);
        label.appendChild(vak);
      } else label.appendChild(veld);
      r.appendChild(label);
      return r;
    }

    // Wat in een rij getypt wordt, gaat als definitie naar de CAS; die
    // meldt het terug met functieGewijzigd. Een volledige definitie mag ook.
    function definieer(naam, v, veld) {
      var t = veld.value.trim();
      var f = functies[naam];
      if (!t) {
        // Leegmaken wist niets: de functie blijft in de CAS bestaan.
        veld.value = f ? f.tekst : "";
        return;
      }
      if (f && t === f.tekst) return;
      var regel = t;
      if (!/^[A-Za-z]\s*\(\s*[A-Za-z]\s*\)\s*=/.test(t)) {
        var w = f ? f.v : "x";
        try { if (!f) w = CAS.kiesVeranderlijke(CAS.lees(t)); } catch (e) { w = "x"; }
        regel = naam + "(" + w + ") = " + t;
      }
      var fout = definieerInCas(regel);
      melding.replaceChildren();
      if (fout) {
        veld.classList.add("fr-veld-fout");
        melding.appendChild(el("span", "fr-foutmelding", naam + ": " + fout.message));
      }
    }

    function kies(naam) {
      if (!functies[naam] || !functies[naam].analyse) return;
      st.actief = naam;
      lijst.querySelectorAll(".fr-functierij").forEach(function (r) {
        var aan = r.querySelector("input").dataset.naam === naam;
        r.classList.toggle("fr-aan", aan);
        r.querySelector(".fr-kiezer").setAttribute("aria-pressed", String(aan));
      });
      zetSchakelaars();
      if (bouwklaar) { tekenFuncties(); zetSleepOpP(); if (!inBeeld()) pasVensterAan(); schrijfUit(); }
    }

    /* --- Bediening ------------------------------------------------------- */

    function zetSchakelaars() {
      gelijk.setAttribute("aria-pressed", String(st.gelijk));
      gelijk.classList.toggle("fr-aan", st.gelijk);
      sknoppen.afgeleide.textContent = "grafiek van " + (st.actief || "f") + "′";
      Object.keys(sknoppen).forEach(function (n) {
        sknoppen[n].setAttribute("aria-pressed", String(st.toon[n]));
        sknoppen[n].classList.toggle("fr-aan", st.toon[n]);
        sknoppen[n].disabled = !actieveAnalyse();
      });
      aveld.disabled = !actieveAnalyse();
      naarBerekening.hidden = !actieveAnalyse();
    }

    function aTekst(a) {
      var t = CAS.qtekst(a);
      var m = /^(-?\d+)\/(\d+)$/.exec(t);
      if (m && /^(2|4|5|8|10|20|25|50|100)$/.test(m[2])) return String(Number(m[1]) / Number(m[2]));
      return t;
    }

    function leesA() {
      try {
        var s = CAS.normaal(CAS.lees(aveld.value));
        if (s.length > 1 || s.length === 1 && s[0].f.length) throw new CAS.Rekenfout("a is een rationaal getal, zoals 1.5 of 2/3.");
        st.a = s.length ? s[0].c : CAS.Q(0);
        aveld.classList.remove("fr-veld-fout");
        return true;
      } catch (fout) {
        if (!(fout instanceof CAS.Rekenfout || fout instanceof CAS.Invoerfout)) throw fout;
        aveld.classList.add("fr-veld-fout");
        return false;
      }
    }

    function getalA() { return Number(st.a.n) / Number(st.a.d); }

    var kleuren = {};
    function leesKleuren() {
      kleuren = {
        afgeleide: kleur("--fr-afgeleide", "#15803d"),
        raaklijn: kleur("--fr-raaklijn", "#1d5fa8"), normaal: kleur("--fr-normaal", "#b45309"),
        as: kleur("--fr-as", "#64748b"), raster: kleur("--fr-raster", "#e5eaf0"),
        tekst: kleur("--kleur-tekst", "#1c2530"), vlak: kleur("--kleur-vlak", "#ffffff")
      };
      KROMMEKLEUREN.forEach(function (k, i) { kleuren["kromme" + i] = kleur(k[0], k[1]); });
    }

    /* --- Het bord -------------------------------------------------------- */

    function bouwBord() {
      if (!window.JXG) {
        melding.replaceChildren(el("span", "fr-foutmelding", "De grafiekmodule kon niet laden."));
        return false;
      }
      leesKleuren();
      if (bord) JXG.JSXGraph.freeBoard(bord);
      objecten = { krommen: [] };
      bord = JXG.JSXGraph.initBoard(bordvak.id, {
        boundingbox: [-4, 4, 4, -4], keepaspectratio: false,
        axis: false, grid: false, showCopyright: false, showNavigation: false,
        pan: { enabled: true, needShift: false, needTwoFingers: true },
        zoom: { enabled: true, wheel: true, needShift: false, pinch: true, min: 0.05, max: 50 },
        defaultAxes: {}
      });
      bord.containerObj.style.backgroundColor = kleuren.vlak;
      objecten.raster = bord.create("grid", [], { strokeColor: kleuren.raster, strokeOpacity: 1 });
      ["x", "y"].forEach(function (r) {
        objecten["as" + r] = bord.create("axis", r === "x" ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], {
          name: r, withLabel: true, strokeColor: kleuren.as, highlight: false,
          label: { position: "urt", offset: r === "x" ? [-10, 14] : [10, -8], strokeColor: kleuren.as, cssClass: "fr-aslabel" },
          ticks: { drawZero: false, majorHeight: 6, minorTicks: 0, strokeColor: kleuren.as,
                   label: { strokeColor: kleuren.as, cssClass: "fr-aslabel" } }
        });
      });
      function f(x) { var a = actieveAnalyse(); return a ? a.f(x) : NaN; }
      function fa(x) { var a = actieveAnalyse(); return a ? a.fAccent(x) : NaN; }
      objecten.afgeleide = bord.create("functiongraph", [fa], {
        strokeColor: kleuren.afgeleide, strokeWidth: 2, dash: 2, highlight: false,
        visible: function () { return st.toon.afgeleide && !!actieveAnalyse(); }
      });
      // De grafiek waarop P glijdt: altijd die van de actieve functie. De
      // zichtbare krommen tekent tekenFuncties, elk in haar eigen kleur.
      objecten.drager = bord.create("functiongraph", [f], { strokeOpacity: 0, highlight: false });
      // P zelf staat altijd op een veelvoud van 0.1 (of op de a uit het
      // veld), zodat alles eronder exact kan. Het onzichtbare sleeppunt
      // volgt de muis over de grafiek.
      function A() { return getalA(); }
      function FA() { return f(A()); }
      function M() { return fa(A()); }
      objecten.sleep = bord.create("glider", [A(), 0, objecten.drager], {
        name: "", size: 14, fillOpacity: 0, strokeOpacity: 0, highlight: false, showInfobox: false,
        precision: { touch: 30, mouse: 8 }
      });
      objecten.sleep.on("drag", function () {
        var x = Math.round(objecten.sleep.X() * 10) / 10;
        var nieuw = CAS.Q(Math.round(x * 10), 10);
        if (nieuw.n === st.a.n && nieuw.d === st.a.d) return;
        st.a = nieuw;
        aveld.value = aTekst(st.a);
        aveld.classList.remove("fr-veld-fout");
        schrijfUit();
      });
      objecten.sleep.on("up", zetSleepOpP);
      objecten.P = bord.create("point", [A, FA], {
        name: "P", withLabel: false, fixed: true, size: 4, fillColor: kleuren.raaklijn, strokeColor: kleuren.raaklijn,
        highlight: false, showInfobox: false,
        visible: function () { return isFinite(FA()); }
      });
      objecten.raaklijn = bord.create("line", [[A, FA], [function () { return A() + 1; }, function () { return FA() + M(); }]], {
        strokeColor: kleuren.raaklijn, strokeWidth: 2, highlight: false, fixed: true, name: "t", withLabel: false,
        visible: function () { return st.toon.raaklijn && isFinite(M()) && isFinite(FA()); }
      });
      objecten.normaal = bord.create("line", [[A, FA], [function () { return A() - M(); }, function () { return FA() + 1; }]], {
        strokeColor: kleuren.normaal, strokeWidth: 2, highlight: false, fixed: true, name: "n", withLabel: false,
        visible: function () { return st.toon.normaal && isFinite(M()) && isFinite(FA()); }
      });
      // Op de grafiek van f' het punt (a, f'(a)): de rico van t als hoogte.
      objecten.Pa = bord.create("point", [A, M], {
        name: "", fixed: true, size: 3, fillColor: kleuren.afgeleide, strokeColor: kleuren.afgeleide,
        highlight: false, showInfobox: false,
        visible: function () { return st.toon.afgeleide && isFinite(M()); }
      });
      objecten.verbinding = bord.create("segment", [[A, FA], [A, M]], {
        strokeColor: kleuren.afgeleide, strokeOpacity: 0.5, dash: 1, highlight: false, fixed: true,
        visible: function () { return st.toon.afgeleide && isFinite(M()) && isFinite(FA()); }
      });
      labels = maakLabels(bord, bordvak);
      bord.on("update", plaatsLabels);
      tekenFuncties();
      return true;
    }

    // De namen bij P, t, n en de krommen. JSXGraph zet een label op een
    // vaste afstand van zijn object, en dan ligt het geregeld op een andere
    // kromme. Na elke update kiezen we daarom zelf voor elke naam de plek
    // met de meeste vrije ruimte (zie Labels onderaan).
    var labels = null;
    function plaatsLabels() {
      if (!labels) return;
      function toont(obj) { return !!JXG.evaluate(obj.visProp.visible); }
      var P = toont(objecten.P) ? [objecten.P.X(), objecten.P.Y()] : null;
      var lijst = [];
      if (P) lijst.push({ naam: "P", punt: P, kleur: kleuren.tekst, klasse: "fr-puntlabel" });
      function lijn(obj, naam, kleur) {
        if (!toont(obj)) return;
        lijst.push({ naam: naam, lijn: [obj.point1.coords.usrCoords.slice(1), obj.point2.coords.usrCoords.slice(1)], kleur: kleur });
      }
      lijn(objecten.raaklijn, "t", kleuren.raaklijn);
      lijn(objecten.normaal, "n", kleuren.normaal);
      if (toont(objecten.afgeleide)) {
        lijst.push({ naam: (st.actief || "f") + "′", kromme: objecten.afgeleide, kleur: kleuren.afgeleide });
      }
      objecten.krommen.forEach(function (k) {
        lijst.push({ naam: k.name, kromme: k, kleur: k.frKleur });
      });
      labels.zet(lijst, [objecten.asx, objecten.asy]);
    }

    // Een kromme per functie, met haar naam erbij: kleur is zo nooit de
    // enige drager. De actieve functie staat vooraan en iets dikker.
    function tekenFuncties() {
      if (!bord) return;
      objecten.krommen.forEach(function (k) { bord.removeObject(k); });
      objecten.krommen = [];
      namen().forEach(function (n) {
        var a = functies[n] && functies[n].analyse;
        if (!a) return;
        var actief = n === st.actief;
        var k = bord.create("functiongraph", [a.f], {
          strokeColor: kleurVan(n), strokeWidth: actief ? 2.6 : 1.8, highlight: false, fixed: true,
          name: n, withLabel: false, layer: actief ? 6 : 5
        });
        k.frKleur = kleurVan(n);
        objecten.krommen.push(k);
      });
      objecten.afgeleide.setAttribute({ name: (st.actief || "f") + "′" });
      bord.update();
    }

    function zetSleepOpP() {
      if (!objecten.sleep) return;
      var a = actieveAnalyse();
      var x = getalA(), y = a ? a.f(x) : NaN;
      if (isFinite(y)) objecten.sleep.moveTo([x, y]);
      bord.update();
    }

    // Een venster rond de oorsprong en P. De hoogte volgt uit de waarden in
    // het midden en rond P, niet aan de randen: daar schiet een veelterm al
    // snel weg, en dan zou alles wat interessant is plat liggen. Alle
    // getekende functies tellen mee.
    function pasVensterAan() {
      if (!bord) return;
      var a = getalA(), actief = actieveAnalyse();
      var xmin = Math.min(-5, a - 2), xmax = Math.max(5, a + 2);
      var ys = [];
      var getekend = namen().map(function (n) { return functies[n].analyse; }).filter(Boolean);
      function neem(x) {
        getekend.forEach(function (an) { var y = an.f(x); if (isFinite(y)) ys.push(y); });
        if (st.toon.afgeleide && actief) { var y2 = actief.fAccent(x); if (isFinite(y2)) ys.push(y2); }
      }
      for (var i = 0; i <= 100; i++) neem(-2.5 + 5 * i / 100);
      if (actief) for (var j = 0; j <= 20; j++) neem(a - 1 + 2 * j / 20);
      ys.sort(function (p, q) { return p - q; });
      var ymin = -4, ymax = 4, fa = actief ? actief.f(a) : NaN;
      if (ys.length) {
        ymin = ys[Math.floor(ys.length * 0.05)];
        ymax = ys[Math.ceil(ys.length * 0.95) - 1];
        if (isFinite(fa)) { ymin = Math.min(ymin, fa); ymax = Math.max(ymax, fa); }
        ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0);
        var marge = Math.max((ymax - ymin) * 0.2, 1);
        ymin -= marge; ymax += marge;
      }
      if (st.gelijk) {
        // Zelfde eenheid op beide assen: de breedte blijft, de hoogte volgt
        // uit de verhouding van het bord, rond het midden van de waarden.
        var r = bordvak.clientHeight / Math.max(bordvak.clientWidth, 1);
        var h = (xmax - xmin) * r, midden = (ymin + ymax) / 2;
        if (isFinite(fa) && Math.abs(fa - midden) > h / 2 * 0.8) midden = fa;
        ymin = midden - h / 2; ymax = midden + h / 2;
      }
      bord.setBoundingBox([xmin, ymax, xmax, ymin], false);
      bord.fullUpdate();
    }

    function schrijfUit() {
      uitlees.replaceChildren();
      var analyse = actieveAnalyse();
      if (!analyse) {
        uitlees.appendChild(tekstMetWiskunde(
          "Nog geen functie. Typ hierboven een voorschrift voor $f(x)$, of definieer $f$ in de CAS.", "fr-zwak"));
        return;
      }
      var n = st.actief;
      var r = CAS.inPunt(analyse, st.a);
      var v = analyse.v || "x";
      var fx = n + "(" + v + ") = " + analyse.tex;
      uitlees.appendChild(wiskunde(fx + (analyse.afgeleideTex ? "\\qquad " + n + "'(" + v + ") = " + analyse.afgeleideTex : ""), true));
      if (r.fout) {
        uitlees.appendChild(tekstMetWiskunde("Voor $a = " + r.aTex + "$ bestaat $" + n + "(a)$ niet: " + r.fout.charAt(0).toLowerCase() + r.fout.slice(1), "fr-fout"));
        bord && bord.update();
        return;
      }
      var regel = "P\\left(" + r.aTex + ",\\ " + r.faTex + "\\right)";
      if (r.mFout) {
        uitlees.appendChild(wiskunde(regel, true));
        uitlees.appendChild(tekstMetWiskunde("$" + n + "'(" + r.aTex + ")$ bestaat niet: " + n + " is niet afleidbaar in $" + r.aTex + "$.", "fr-fout"));
        bord && bord.update();
        return;
      }
      var benaderd = /\\sqrt|\\frac|\\pi|e\^/.test(r.mTex) ? " \\approx " + CAS.decimaal(r.mGetal) : "";
      uitlees.appendChild(wiskunde(regel + "\\qquad " + n + "'\\left(" + r.aTex + "\\right) = " + r.mTex + benaderd, true));
      if (st.toon.raaklijn) uitlees.appendChild(kleurregel(r.raaklijnTex, "fr-raaklijn"));
      if (st.toon.normaal) uitlees.appendChild(kleurregel(r.normaalTex, "fr-normaal"));
      bord && bord.update();
    }

    function kleurregel(tex, klasse) {
      var w = wiskunde(tex, true);
      w.classList.add(klasse);
      return w;
    }

    function tekenBij() {
      schrijfUit();
      if (bord) bord.update();
    }

    aveld.addEventListener("change", function () {
      if (!leesA()) return;
      zetSleepOpP();
      if (!inBeeld()) pasVensterAan();
      tekenBij();
    });

    // Staat P nog in het venster? Een getypte a kan er ver buiten liggen.
    function inBeeld() {
      var analyse = actieveAnalyse();
      if (!bord || !analyse) return true;
      var b = bord.getBoundingBox(), x = getalA(), y = analyse.f(x);
      return x > b[0] && x < b[2] && (!isFinite(y) || y < b[1] && y > b[3]);
    }
    aveld.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); aveld.dispatchEvent(new Event("change")); return; }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      var stap = e.key === "ArrowUp" ? 1 : -1;
      var tiende = Math.round(getalA() * 10) + stap;
      st.a = CAS.Q(tiende, 10);
      aveld.value = aTekst(st.a);
      aveld.classList.remove("fr-veld-fout");
      zetSleepOpP();
      tekenBij();
    });

    // De CAS veranderde iets aan de functies: lijst, krommen en uitlezing
    // volgen. Verschijnt de eerste functie, of verandert de actieve, dan
    // past het venster zich aan.
    function werkBij(naam) {
      var voor = st.actief;
      leesFuncties();
      bouwLijst();
      zetSchakelaars();
      if (!bouwklaar) return;
      // Verborgen meet JSXGraph niets: toon() werkt dan bij.
      if (!zichtbaar()) { st.bijwerken = true; return; }
      tekenFuncties();
      zetSleepOpP();
      if (st.actief && (st.actief !== voor || naam === st.actief)) pasVensterAan();
      schrijfUit();
    }

    // Het bord kan pas gebouwd worden als het paneel zichtbaar is: JSXGraph
    // meet de houder.
    // Toont de grafiek. Met focus (de leerling koos het tabblad) staat de
    // cursor in de lege rij als er nog geen functie is.
    function toon(focus) {
      if (!zichtbaar()) return;
      aveld.value = aTekst(st.a);
      if (!bouwklaar) {
        leesFuncties();
        bouwLijst();
        zetSchakelaars();
        if (!bouwBord()) return;
        bouwklaar = true;
        pasVensterAan();
        zetSleepOpP();
      } else {
        bord.resizeContainer(bordvak.clientWidth, bordvak.clientHeight, true, true);
        if (st.bijwerken) { tekenFuncties(); pasVensterAan(); zetSleepOpP(); }
        bord.fullUpdate();
      }
      st.bijwerken = false;
      schrijfUit();
      // Nog geen functie: het lege veld van f staat klaar om te typen.
      if (focus && !st.actief) {
        var leeg = lijst.querySelector(".fr-functierij-nieuw input");
        if (leeg) leeg.focus({ preventScroll: true });
      }
    }

    document.addEventListener("pres:thema", function () {
      if (!bouwklaar) return;
      bouwBord();
      bouwLijst();
      zetSleepOpP();
      pasVensterAan();
      schrijfUit();
    });
    // JSXGraph meet het bord. Het krijgt pas een maat als het venster open
    // is en het paneel zichtbaar; naast de CAS is dat zonder klik op een
    // tabblad, dus letten we op de maat zelf.
    function zichtbaar() { return !paneel.hidden && bordvak.clientWidth > 0; }
    var gemeten = "";
    function maatVeranderd() {
      if (!zichtbaar()) return;
      var maat = bordvak.clientWidth + "x" + bordvak.clientHeight;
      if (maat === gemeten && bouwklaar) return;
      gemeten = maat;
      if (!bouwklaar || st.bijwerken) { toon(false); return; }
      bord.resizeContainer(bordvak.clientWidth, bordvak.clientHeight, true, true);
      bord.fullUpdate();
    }
    if (window.ResizeObserver) new ResizeObserver(maatVeranderd).observe(bordvak);
    window.addEventListener("resize", maatVeranderd);

    leesFuncties();
    bouwLijst();
    zetSchakelaars();

    return {
      toon: toon,
      // De CAS definieerde een functie (opnieuw): de grafiek neemt ze over.
      functieGewijzigd: werkBij,
      herstel: function () {
        st.actief = null;
        st.a = CAS.Q(3, 2);
        st.toon = { afgeleide: false, raaklijn: true, normaal: false };
        st.gelijk = false;
        aveld.value = aTekst(st.a);
        melding.replaceChildren();
        werkBij(null);
      }
    };
  }

  /* --- Labels ------------------------------------------------------------ */

  // Plaatst de namen van punten, rechten en krommen op het bord, zo dat ze
  // niet op een andere kromme, rechte of as liggen. Alles gebeurt in
  // schermpixels:
  //   - elke getekende lijn wordt een rij lijnstukjes (de hindernissen);
  //   - voor een kromme of rechte zijn de kandidaten plekken vlak naast
  //     haarzelf, om de 30 px en aan beide kanten; voor een punt een krans
  //     van acht plekken eromheen;
  //   - een kandidaat scoort met zijn vrije ruimte: de afstand van het
  //     labelkader tot de dichtste andere hindernis, afgetopt op 24 px,
  //     want verder weg helpt niet meer;
  //   - bij gelijke ruimte wint een plek rechts (daar zoekt het oog een
  //     naam) en een plek dicht bij waar het label al stond, zodat het niet
  //     springt terwijl P over de grafiek schuift.
  // Een geplaatst label is voor de volgende een hindernis.
  function maakLabels(bord, vak) {
    var oud = vak.querySelector(".fr-labels");
    if (oud) oud.remove();
    var laag = el("div", "fr-labels");
    laag.setAttribute("aria-hidden", "true");
    vak.appendChild(laag);
    var spans = {}, vorige = {};

    function scherm(p) {
      var c = new JXG.Coords(JXG.COORDS_BY_USER, p, bord).scrCoords;
      return [c[1], c[2]];
    }

    // De lijnstukjes van een kromme, gebroken waar ze onderbroken is of
    // verticaal wegschiet (een pool).
    function stukjesKromme(k) {
      var uit = [], vorig = null, H = bord.canvasHeight;
      (k.points || []).forEach(function (c) {
        var x = c.scrCoords[1], y = c.scrCoords[2];
        var ok = isFinite(x) && isFinite(y) && Math.abs(y) < 20 * H;
        if (ok && vorig && Math.abs(y - vorig[1]) < 4 * H) uit.push([vorig[0], vorig[1], x, y]);
        vorig = ok ? [x, y] : null;
      });
      return uit;
    }

    // Een rechte als één lang lijnstuk door twee van haar punten.
    function stukRechte(p, q) {
      var a = scherm(p), b = scherm(q);
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (!(l > 0)) return [];
      var s = 4 * (bord.canvasWidth + bord.canvasHeight) / l;
      return [[a[0] - s * dx, a[1] - s * dy, a[0] + s * dx, a[1] + s * dy]];
    }

    // Afstand van het punt (px, py) tot een kader {x0, y0, x1, y1}.
    function puntKader(px, py, r) {
      var dx = Math.max(r.x0 - px, 0, px - r.x1), dy = Math.max(r.y0 - py, 0, py - r.y1);
      return Math.hypot(dx, dy);
    }
    function puntStuk(px, py, s) {
      var dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy;
      var t = l2 ? Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / l2)) : 0;
      return Math.hypot(px - s[0] - t * dx, py - s[1] - t * dy);
    }
    // Snijdt het lijnstuk het kader? (Liang-Barsky)
    function snijdt(s, r) {
      var t0 = 0, t1 = 1, dx = s[2] - s[0], dy = s[3] - s[1];
      var p = [-dx, dx, -dy, dy], q = [s[0] - r.x0, r.x1 - s[0], s[1] - r.y0, r.y1 - s[1]];
      for (var i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false; continue; }
        var t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
        else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
      return true;
    }
    function stukKader(s, r) {
      if (snijdt(s, r)) return 0;
      return Math.min(puntKader(s[0], s[1], r), puntKader(s[2], s[3], r),
        puntStuk(r.x0, r.y0, s), puntStuk(r.x1, r.y0, s), puntStuk(r.x0, r.y1, s), puntStuk(r.x1, r.y1, s));
    }

    var GENOEG = 24;
    // De vrije ruimte rond een kader: afstand tot de dichtste hindernis,
    // hoogstens GENOEG. Stukjes die ver weg liggen, slaan we snel over.
    function ruimte(r, hindernissen) {
      var best = GENOEG;
      for (var i = 0; i < hindernissen.length; i++) {
        var h = hindernissen[i];
        if (h.kader) { best = Math.min(best, kaderKader(h.kader, r)); continue; }
        var st = h.stukjes;
        for (var j = 0; j < st.length; j++) {
          var s = st[j];
          if (Math.min(s[0], s[2]) > r.x1 + best || Math.max(s[0], s[2]) < r.x0 - best ||
              Math.min(s[1], s[3]) > r.y1 + best || Math.max(s[1], s[3]) < r.y0 - best) continue;
          best = Math.min(best, stukKader(s, r));
          if (best === 0) return 0;
        }
      }
      return best;
    }
    function kaderKader(a, b) {
      var dx = Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), dy = Math.max(a.y0 - b.y1, 0, b.y0 - a.y1);
      return Math.hypot(dx, dy);
    }

    function kader(cx, cy, w, h) { return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }; }

    // Kandidaten langs de eigen lijnstukjes: om de 30 px een plek links en
    // rechts van de lijn, loodrecht erop, met het kader 5 px van de lijn.
    function langs(stukjes, w, h) {
      var uit = [], rest = 15;
      stukjes.forEach(function (s) {
        var dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy);
        if (!(l > 0)) return;
        var nx = -dy / l, ny = dx / l, a = rest;
        var d = 5 + Math.abs(nx) * w / 2 + Math.abs(ny) * h / 2;
        for (; a < l; a += 30) {
          var px = s[0] + dx * a / l, py = s[1] + dy * a / l;
          uit.push([px + nx * d, py + ny * d], [px - nx * d, py - ny * d]);
        }
        rest = a - l;
      });
      return uit;
    }

    function zet(lijst, assen) {
      var W = bord.canvasWidth, H = bord.canvasHeight;
      var hindernissen = [];
      assen.forEach(function (as) {
        hindernissen.push({ stukjes: stukRechte(as.point1.coords.usrCoords.slice(1), as.point2.coords.usrCoords.slice(1)) });
      });
      lijst.forEach(function (l) {
        l.stukjes = l.kromme ? stukjesKromme(l.kromme) : l.lijn ? stukRechte(l.lijn[0], l.lijn[1]) : [];
        if (l.punt) {
          var p = scherm(l.punt);
          l.stukjes = [];
          l.kader = kader(p[0], p[1], 12, 12);
          hindernissen.push({ kader: l.kader });
        } else hindernissen.push({ stukjes: l.stukjes, eigen: l });
      });

      var gebruikt = {};
      lijst.forEach(function (l) {
        var span = spans[l.naam];
        if (!span) {
          span = spans[l.naam] = el("span", "fr-labelnaam " + (l.klasse || "fr-lijnlabel"), l.naam);
          laag.appendChild(span);
        }
        gebruikt[l.naam] = true;
        span.style.color = l.kleur;
        var w = span.offsetWidth || 10, h = span.offsetHeight || 16;

        var kandidaten;
        if (l.punt) {
          var p = scherm(l.punt);
          kandidaten = [];
          for (var i = 0; i < 8; i++) {
            var hoek = Math.PI / 4 * i - Math.PI / 4, d = 9;
            kandidaten.push([p[0] + Math.cos(hoek) * (d + w / 2), p[1] - Math.sin(hoek) * (d + h / 2)]);
          }
        } else kandidaten = langs(l.stukjes, w, h);

        var andere = hindernissen.filter(function (x) { return x.eigen !== l; });
        var eigen = l.stukjes.length ? [{ stukjes: l.stukjes }] : [];
        var best = null, bestScore = -Infinity;
        kandidaten.forEach(function (c) {
          var r = kader(c[0], c[1], w, h);
          if (r.x0 < 3 || r.y0 < 3 || r.x1 > W - 3 || r.y1 > H - 3) return;
          if (eigen.length && ruimte(r, eigen) < 3) return;   // niet op de eigen lijn
          var score = ruimte(r, andere);
          score += 3 * c[0] / W;                              // liefst rechts
          var v = vorige[l.naam];
          if (v) score += 4 * Math.max(0, 1 - Math.hypot(c[0] - v[0], c[1] - v[1]) / 40);
          if (score > bestScore) { bestScore = score; best = c; }
        });
        if (!best) { span.hidden = true; delete vorige[l.naam]; return; }
        span.hidden = false;
        span.style.left = (best[0] - w / 2) + "px";
        span.style.top = (best[1] - h / 2) + "px";
        vorige[l.naam] = best;
        hindernissen.push({ kader: kader(best[0], best[1], w, h) });
      });
      Object.keys(spans).forEach(function (n) {
        if (!gebruikt[n]) { spans[n].hidden = true; delete vorige[n]; }
      });
    }

    return { zet: zet };
  }

  window.Functierekenmachine = { maak: maak };
})();
