/* Matrixrekenmachine voor de cursussite.
 *
 * Een zelfstandig rekenvenster bij het hoofdstuk over matrices en
 * determinanten: twee matrices die je zelf invult, en alle bewerkingen die in
 * de cursus aan bod komen. Het gaat niet om het antwoord alleen, maar om waar
 * dat antwoord vandaan komt: klik je op een element van het resultaat, dan
 * lichten de elementen op die eraan meegewerkt hebben, en eronder staat de
 * berekening symbolisch, met getallen en uitgerekend.
 *
 * Het script staat los van de rest: presentatie.js bouwt het venster en roept
 * Matrixrekenmachine.maak(houder, opties) aan; opties.zonder noemt de soorten
 * bewerkingen die het hoofdstuk nog niet kent, zoals ["determinant"]. Er komt geen MathJax aan te pas, zodat
 * het venster meteen klaar is; breuken worden met HTML en CSS gezet.
 */
(function () {
  "use strict";

  // Grotere matrices passen niet meer op een telefoonscherm, en de cursus
  // gaat niet verder dan orde vier.
  var MIN_ORDE = 1, MAX_ORDE = 6;
  // Hoe ver een macht mag gaan. Verder gaan de getallen toch over de rand.
  var MAX_MACHT = 8;

  /* --- Breuken ---------------------------------------------------------- */

  // Alles rekent met exacte breuken. Zo blijft 1/3 van een matrix leesbaar en
  // klopt de determinant van een matrix met kommagetallen tot op het cijfer.
  function ggd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function breuk(t, n) {
    if (n === 0) throw new Error("Delen door nul kan niet.");
    if (n < 0) { t = -t; n = -n; }
    if (!Number.isSafeInteger(t) || !Number.isSafeInteger(n)) {
      throw new Error("De getallen worden te groot voor deze rekenmachine. " +
                      "Neem kleinere elementen of een kleinere orde.");
    }
    var d = ggd(t, n);
    return { t: t / d, n: n / d };
  }

  function heel(t) { return breuk(t, 1); }
  function optel(a, b) { return breuk(a.t * b.n + b.t * a.n, a.n * b.n); }
  function aftrek(a, b) { return breuk(a.t * b.n - b.t * a.n, a.n * b.n); }
  function maal(a, b) { return breuk(a.t * b.t, a.n * b.n); }
  function isNul(a) { return a.t === 0; }
  function isGelijk(a, b) { return a.t === b.t && a.n === b.n; }
  function isNegatief(a) { return a.t < 0; }

  /* --- Matrices --------------------------------------------------------- */

  // Een matrix is { r: rijen, k: kolommen, w: [[breuk]] }.
  function matrix(r, k, maakElement) {
    var w = [];
    for (var i = 0; i < r; i++) {
      var rij = [];
      for (var j = 0; j < k; j++) rij.push(maakElement(i, j));
      w.push(rij);
    }
    return { r: r, k: k, w: w };
  }

  function eenheidsmatrix(n) {
    return matrix(n, n, function (i, j) { return heel(i === j ? 1 : 0); });
  }
  function getransponeerde(m) {
    return matrix(m.k, m.r, function (i, j) { return m.w[j][i]; });
  }
  function termsgewijs(a, b, bewerking) {
    return matrix(a.r, a.k, function (i, j) { return bewerking(a.w[i][j], b.w[i][j]); });
  }
  function scalairVeelvoud(r, m) {
    return matrix(m.r, m.k, function (i, j) { return maal(r, m.w[i][j]); });
  }
  function product(a, b) {
    return matrix(a.r, b.k, function (i, j) {
      var s = heel(0);
      for (var t = 0; t < a.k; t++) s = optel(s, maal(a.w[i][t], b.w[t][j]));
      return s;
    });
  }

  // De matrix die overblijft als rij i en kolom j geschrapt worden.
  function minor(m, i, j) {
    var w = [];
    for (var p = 0; p < m.r; p++) {
      if (p === i) continue;
      var rij = [];
      for (var q = 0; q < m.k; q++) if (q !== j) rij.push(m.w[p][q]);
      w.push(rij);
    }
    return { r: m.r - 1, k: m.k - 1, w: w };
  }

  // Ontwikkeling naar de eerste rij, precies zoals in de cursus.
  function determinant(m) {
    if (m.r === 1) return m.w[0][0];
    if (m.r === 2) return aftrek(maal(m.w[0][0], m.w[1][1]), maal(m.w[0][1], m.w[1][0]));
    var totaal = heel(0);
    for (var j = 0; j < m.k; j++) {
      if (isNul(m.w[0][j])) continue;
      var term = maal(m.w[0][j], determinant(minor(m, 0, j)));
      totaal = (j % 2 === 0) ? optel(totaal, term) : aftrek(totaal, term);
    }
    return totaal;
  }

  /* --- Kleine HTML-hulpjes ---------------------------------------------- */

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  function knop(opschrift, klasse, bij) {
    var k = el("button", "mr-knop" + (klasse ? " " + klasse : ""), opschrift);
    k.type = "button";
    if (bij) k.addEventListener("click", bij);
    return k;
  }

  // Een getal als DOM: een breuk krijgt teller en noemer boven elkaar, zodat
  // ze leest zoals in de cursus en niet als een deling.
  function getalNode(b) {
    var wrap = el("span", "mr-getal");
    if (b.t < 0) wrap.appendChild(el("span", "mr-min", "−"));
    if (b.n === 1) {
      wrap.appendChild(el("span", null, String(Math.abs(b.t))));
    } else {
      var f = el("span", "mr-breuk");
      f.appendChild(el("span", "mr-teller", String(Math.abs(b.t))));
      f.appendChild(el("span", "mr-noemer", String(b.n)));
      wrap.appendChild(f);
    }
    return wrap;
  }

  // Hetzelfde getal, maar als factor in een som: een negatief getal krijgt
  // haakjes, want 3 + -2 leest niemand graag.
  function factorNode(b) {
    if (!isNegatief(b)) return getalNode(b);
    var wrap = el("span", "mr-getal");
    wrap.appendChild(el("span", null, "("));
    wrap.appendChild(getalNode(b));
    wrap.appendChild(el("span", null, ")"));
    return wrap;
  }

  function symbool(letter, i, j) {
    var s = el("span", "mr-sym", letter);
    s.classList.add(letter === "a" ? "mr-a" : letter === "b" ? "mr-b" : "mr-c");
    s.appendChild(el("sub", null, j === undefined ? String(i + 1)
                                                  : (i + 1) + "" + (j + 1)));
    return s;
  }

  /* --- Een matrix tekenen ----------------------------------------------- */

  // De haken zijn twee lege spans met randen: ze groeien mee met de inhoud en
  // blijven scherp op elk scherm.
  function inHaken(inhoud, klasse) {
    var wrap = el("span", "mr-mat" + (klasse ? " " + klasse : ""));
    wrap.appendChild(el("span", "mr-haak mr-haak-links"));
    wrap.appendChild(inhoud);
    wrap.appendChild(el("span", "mr-haak mr-haak-rechts"));
    return wrap;
  }

  function cellenraster(k) {
    var raster = el("span", "mr-cellen");
    raster.style.gridTemplateColumns = "repeat(" + k + ", minmax(2.2rem, auto))";
    return raster;
  }

  // Een vaste matrix (resultaat, minor, tussenstap). cel(i, j) krijgt het
  // element in handen, zodat de beller er nog iets aan kan hangen.
  function toonMatrix(m, klasse, cel) {
    var raster = cellenraster(m.k);
    for (var i = 0; i < m.r; i++) {
      for (var j = 0; j < m.k; j++) {
        var c = el("span", "mr-cel");
        c.appendChild(getalNode(m.w[i][j]));
        raster.appendChild(c);
        if (cel) cel(c, i, j);
      }
    }
    return inHaken(raster, klasse);
  }

  /* --- De rekenmachine zelf --------------------------------------------- */

  function maak(houder, opties) {
    var zonder = (opties && opties.zonder) || [];
    // De invoer blijft tekst: zo mag er even iets onaffs staan terwijl de
    // leerling typt, en gaat er niets verloren bij een tikfout.
    var st = {
      A: { r: 2, k: 2, tekst: [["1", "2"], ["3", "4"]] },
      B: { r: 2, k: 2, tekst: [["0", "1"], ["1", "0"]] },
      bewerking: "productAB",
      factor: "2",
      macht: "2",
      richting: "rij",
      lijn: 0
    };

    // De cellen die kunnen oplichten, per matrix in de vergelijking. Ook het
    // resultaat C hoort erbij: bij een getransponeerde wijst een rij in de ene
    // matrix een kolom in de andere aan.
    var kopieen = { A: [], B: [], C: [] };
    var wortel = el("div", "mr");
    var resultaatVak, uitlegVak, keuzeVak, knoppen = {};

    /* --- Invoer -------------------------------------------------------- */

    function zorgVoorMaat(naam) {
      var s = st[naam];
      var t = s.tekst;
      while (t.length < s.r) t.push([]);
      t.length = s.r;
      for (var i = 0; i < s.r; i++) {
        var rij = t[i];
        while (rij.length < s.k) rij.push("0");
        rij.length = s.k;
        for (var j = 0; j < s.k; j++) if (rij[j] === undefined) rij[j] = "0";
      }
    }

    // Wat er onder een matrix in de vergelijking hangt: haar orde en de
    // knoppen om ze in een keer te vullen. Zo staat de bediening van A bij A
    // en die van B bij B.
    function besturing(naam) {
      var s = st[naam];
      var doos = el("div", "mr-besturing");
      doos.appendChild(maatregel(naam, "r", "rijen"));
      doos.appendChild(maatregel(naam, "k", "kolommen"));
      var snel = el("div", "mr-snel");
      snel.appendChild(snelknop(naam, "nul", "O", "Vul de nulmatrix in"));
      var eenheid = snelknop(naam, "eenheid", "I", s.r === s.k
        ? "Vul de eenheidsmatrix in" : "Enkel voor een vierkante matrix");
      eenheid.disabled = s.r !== s.k;
      snel.appendChild(eenheid);
      var toeval = snelknop(naam, "willekeurig", "", "Vul willekeurige gehele getallen in");
      toeval.appendChild(el("span", "mr-lang", "Willekeurig"));
      toeval.appendChild(el("span", "mr-kort", "\u21bb"));
      toeval.setAttribute("aria-label", "Vul " + naam + " met willekeurige getallen");
      snel.appendChild(toeval);
      doos.appendChild(snel);
      return doos;
    }

    function snelknop(naam, soort, opschrift, titel) {
      var k = knop(opschrift, "mr-klein", function () { vulIn(naam, soort); });
      k.dataset.veld = naam + "-" + soort;
      k.title = titel;
      return k;
    }

    function maatregel(naam, sleutel, opschrift) {
      var s = st[naam];
      var groep = el("div", "mr-maatgroep");
      var label = el("span", "mr-maatlabel");
      label.appendChild(el("span", "mr-lang", opschrift));
      label.appendChild(el("span", "mr-kort", opschrift.charAt(0)));
      label.title = opschrift;
      groep.appendChild(label);
      groep.appendChild(maatknop(naam, sleutel, -1, "\u2212",
        "Een " + opschrift.replace(/en$/, "") + " minder in " + naam));
      groep.appendChild(el("span", "mr-maatwaarde", String(s[sleutel])));
      groep.appendChild(maatknop(naam, sleutel, 1, "+",
        "Een " + opschrift.replace(/en$/, "") + " meer in " + naam));
      return groep;
    }

    function maatknop(naam, sleutel, stap, opschrift, label) {
      var k = knop(opschrift, "mr-rond", function () { pasMaatAan(naam, sleutel, stap); });
      k.dataset.veld = naam + "-" + sleutel + "-" + (stap < 0 ? "min" : "plus");
      k.setAttribute("aria-label", label);
      k.title = label;
      k.disabled = stap < 0 ? st[naam][sleutel] <= MIN_ORDE
                            : st[naam][sleutel] >= MAX_ORDE;
      return k;
    }

    function pasMaatAan(naam, sleutel, stap) {
      var nieuw = st[naam][sleutel] + stap;
      if (nieuw < MIN_ORDE || nieuw > MAX_ORDE) return;
      st[naam][sleutel] = nieuw;
      zorgVoorMaat(naam);
      st.lijn = 0;
      werkBij();
    }

    function vulIn(naam, soort) {
      var s = st[naam];
      zorgVoorMaat(naam);
      for (var i = 0; i < s.r; i++) {
        for (var j = 0; j < s.k; j++) {
          if (soort === "nul") s.tekst[i][j] = "0";
          else if (soort === "eenheid") s.tekst[i][j] = i === j ? "1" : "0";
          else s.tekst[i][j] = String(Math.floor(Math.random() * 11) - 5);
        }
      }
      werkBij();
    }

    function lees(naam) {
      var s = st[naam];
      return matrix(s.r, s.k, function (i, j) {
        var tekst = String(s.tekst[i][j]).trim().replace(/\s+/g, "").replace(",", ".");
        if (tekst !== "") {
          var deling = /^([+-]?\d+)\/(\d+)$/.exec(tekst);
          if (deling) return breuk(Number(deling[1]), Number(deling[2]));
          if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(tekst)) {
            var punt = tekst.indexOf(".");
            if (punt < 0) return heel(Number(tekst));
            var cijfers = tekst.length - punt - 1;
            return breuk(Math.round(Number(tekst) * Math.pow(10, cijfers)),
                         Math.pow(10, cijfers));
          }
        }
        throw new Error("In " + naam + " staat op rij " + (i + 1) + ", kolom " +
          (j + 1) + " geen getal. Schrijf bijvoorbeeld 3, -1.5 of 2/3.");
      });
    }

    function schrijf(naam, m) {
      st[naam].r = m.r;
      st[naam].k = m.k;
      st[naam].tekst = m.w.map(function (rij) {
        return rij.map(function (b) {
          return b.n === 1 ? String(b.t) : b.t + "/" + b.n;
        });
      });
      st.lijn = 0;
      werkBij();
    }

    /* --- Markeren ------------------------------------------------------ */

    function roosters(naam) {
      return kopieen[naam] || [];
    }

    function wisMarkeringen() {
      ["A", "B", "C"].forEach(function (naam) {
        roosters(naam).forEach(function (rooster) {
          rooster.forEach(function (rij) {
            rij.forEach(function (cel) {
              cel.classList.remove("mr-licht", "mr-licht-zacht", "mr-geschrapt", "mr-fout");
            });
          });
        });
      });
    }

    function markeer(naam, i, j, klasse) {
      roosters(naam).forEach(function (rooster) {
        var rij = rooster[i];
        if (rij && rij[j]) rij[j].classList.add(klasse || "mr-licht");
      });
    }

    function markeerRij(naam, i, klasse) {
      roosters(naam).forEach(function (rooster) {
        var rij = rooster[i];
        if (rij) rij.forEach(function (cel) { cel.classList.add(klasse || "mr-licht"); });
      });
    }

    function markeerKolom(naam, j, klasse) {
      roosters(naam).forEach(function (rooster) {
        rooster.forEach(function (rij) {
          if (rij[j]) rij[j].classList.add(klasse || "mr-licht");
        });
      });
    }

    // De matrix zoals ze in de vergelijking staat: bewerkbaar, met haar naam
    // en haar bediening eronder. De velden tonen de ruwe invoer, niet het
    // uitgerekende getal, zodat een half getypt getal blijft staan en de
    // vergelijking niet onder je vingers verdwijnt.
    function kopie(naam) {
      var s = st[naam], rooster = [];
      var raster = cellenraster(s.k);
      raster.style.gridTemplateColumns = "repeat(" + s.k + ", minmax(0, 2.8rem))";
      for (var i = 0; i < s.r; i++) {
        rooster.push([]);
        for (var j = 0; j < s.k; j++) {
          var cel = el("span", "mr-cel mr-cel-invoer mr-cel-inline");
          cel.appendChild(inlineVeld(naam, i, j));
          raster.appendChild(cel);
          rooster[i].push(cel);
        }
      }
      kopieen[naam].push(rooster);
      return operand(inHaken(raster, "mr-van-" + naam.toLowerCase()), naam, naam,
                     besturing(naam));
    }

    function inlineVeld(naam, i, j) {
      var veld = el("input", "mr-veld mr-veld-inline");
      veld.type = "text";
      veld.autocomplete = "off";
      veld.spellcheck = false;
      veld.value = st[naam].tekst[i][j];
      veld.dataset.veld = naam + "-" + i + "-" + j;
      veld.setAttribute("aria-label", naam + ", rij " + (i + 1) + ", kolom " + (j + 1));
      veld.addEventListener("keydown", function (e) {
        var stap = e.key === "ArrowUp" ? -1
                 : (e.key === "ArrowDown" || e.key === "Enter") ? 1 : 0;
        if (!stap) return;
        var doel = resultaatVak.querySelector(
          '.mr-veld-inline[data-veld="' + naam + "-" + (i + stap) + "-" + j + '"]');
        if (!doel) return;
        e.preventDefault();
        doel.focus();
        doel.select();
      });
      veld.addEventListener("input", function () {
        st[naam].tekst[i][j] = veld.value;
        werkBij();
      });
      return veld;
    }

    // Hetzelfde voor een los getal in de vergelijking: de factor r en de
    // exponent n. Ook zij tonen de ruwe invoer.
    function inlineGetalveld(sleutel, klasse) {
      var factor = sleutel === "factor";
      var veld = el("input", "mr-veld mr-veld-inline " + klasse);
      veld.type = "text";
      veld.autocomplete = "off";
      veld.spellcheck = false;
      veld.value = st[sleutel];
      veld.dataset.veld = sleutel;
      veld.setAttribute("aria-label", factor ? "Het reële getal r" : "De exponent n");
      veld.title = factor
        ? "Kies r: een getal, ook 0.5 of 2/3."
        : "Kies n: een geheel getal van 0 tot " + MAX_MACHT + ".";
      veld.addEventListener("input", function () {
        st[sleutel] = veld.value;
        werkBij();
      });
      return veld;
    }

    // Waar de cursor stond voor de vergelijking opnieuw getekend werd. Elke
    // toetsaanslag bouwt die rij immers opnieuw op.
    function huidigeInvoerplek() {
      var e = document.activeElement;
      if (!e || !e.dataset || !e.dataset.veld || !resultaatVak.contains(e)) return null;
      return { sleutel: e.dataset.veld, start: e.selectionStart, eind: e.selectionEnd };
    }

    function herstelInvoerplek(plek) {
      if (!plek) return;
      var doel = resultaatVak.querySelector('[data-veld="' + plek.sleutel + '"]');
      if (!doel || doel.disabled) return;
      doel.focus();
      if (plek.start === null || plek.start === undefined || !doel.setSelectionRange) return;
      try { doel.setSelectionRange(plek.start, plek.eind); } catch (fout) { /* niets */ }
    }

    // Zet een exponent (T of een macht) rechtsboven de matrix van een term.
    function metExponent(doos, exponent) {
      var mat = doos.firstChild;
      var wrap = el("span", "mr-machtmat");
      doos.insertBefore(wrap, mat);
      wrap.appendChild(mat);
      var sup = el("sup");
      if (typeof exponent === "string") sup.textContent = exponent;
      else sup.appendChild(exponent);
      wrap.appendChild(sup);
      return doos;
    }

    // Een matrix met haar naam eronder, als een term in de vergelijking.
    function operand(node, label, van, onder) {
      var doos = el("span", "mr-operand");
      doos.appendChild(node);
      doos.appendChild(el("span",
        "mr-operandlabel" + (van ? " mr-" + van.toLowerCase() : ""), label || "\u00a0"));
      doos.appendChild(onder || el("span", "mr-onder"));
      return doos;
    }

    // Een teken in de vergelijking is ook zo'n term, met een lege naamregel:
    // zo staat het op dezelfde hoogte als het midden van de matrices ernaast.
    // Tussen A en B hangt de wisselknop eronder.
    function operatorterm(teken, metWissel) {
      return operand(el("span", "mr-operator", teken), null, null,
                     metWissel ? wisselknop() : null);
    }

    function wisselknop() {
      var doos = el("div", "mr-onder");
      var k = knop("\u21c6", "mr-rond", function () {
        var hulp = st.A; st.A = st.B; st.B = hulp;
        st.lijn = 0;
        werkBij();
      });
      k.dataset.veld = "wissel";
      k.title = "A en B verwisselen";
      k.setAttribute("aria-label", "A en B verwisselen");
      doos.appendChild(k);
      return doos;
    }

    /* --- Bewerkingen kiezen -------------------------------------------- */

    // Per bewerking: het opschrift op de knop, bij welke matrices ze hoort en
    // wat ze nodig heeft. De uitvoering staat in voerUit.
    var BEWERKINGEN = [
      { naam: "som", soort: "som", groep: "AB", opschrift: "A + B" },
      { naam: "verschil", soort: "verschil", groep: "AB", opschrift: "A − B" },
      { naam: "productAB", soort: "product", groep: "AB", opschrift: "A · B" },
      { naam: "productBA", soort: "product", groep: "AB", opschrift: "B · A" },
      { naam: "gelijk", soort: "gelijkheid", groep: "AB", opschrift: "A = B ?" },
      { naam: "scalairA", soort: "veelvoud", groep: "A", opschrift: "r · A" },
      { naam: "transponeerA", soort: "getransponeerde", groep: "A", opschrift: "Aᵀ" },
      { naam: "machtA", soort: "macht", groep: "A", opschrift: "Aⁿ" },
      { naam: "detA", soort: "determinant", groep: "A", opschrift: "det A" },
      { naam: "scalairB", soort: "veelvoud", groep: "B", opschrift: "r · B" },
      { naam: "transponeerB", soort: "getransponeerde", groep: "B", opschrift: "Bᵀ" },
      { naam: "machtB", soort: "macht", groep: "B", opschrift: "Bⁿ" },
      { naam: "detB", soort: "determinant", groep: "B", opschrift: "det B" }
    ].filter(function (b) { return zonder.indexOf(b.soort) < 0; });
    // De beginstand is het product A · B, tenzij het hoofdstuk dat weglaat.
    var BEGIN = BEWERKINGEN.some(function (b) { return b.naam === "productAB"; })
      ? "productAB" : BEWERKINGEN[0].naam;
    st.bewerking = BEGIN;

    function bouwKeuze() {
      keuzeVak = el("div", "mr-keuze");
      [["AB", "met A en B"], ["A", "met A"], ["B", "met B"]].forEach(function (groep) {
        var leden = BEWERKINGEN.filter(function (b) { return b.groep === groep[0]; });
        if (!leden.length) return;
        var rij = el("div", "mr-keuzerij");
        rij.appendChild(el("span", "mr-keuzelabel", groep[1]));
        var doos = el("div", "mr-keuzeknoppen");
        doos.setAttribute("role", "group");
        doos.setAttribute("aria-label", "Bewerkingen " + groep[1]);
        leden.forEach(function (b) {
          var k = knop(b.opschrift, "mr-bewerking", function () {
            st.bewerking = b.naam;
            st.lijn = 0;
            werkBij();
          });
          k.setAttribute("aria-pressed", "false");
          knoppen[b.naam] = k;
          doos.appendChild(k);
        });
        rij.appendChild(doos);
        keuzeVak.appendChild(rij);
      });
      return keuzeVak;
    }

    /* --- Resultaat ----------------------------------------------------- */

    function zetUitleg() {
      uitlegVak.replaceChildren();
      Array.prototype.slice.call(arguments).forEach(function (regel) {
        if (regel === null) return;
        var r = el("div", "mr-uitlegregel");
        (Array.isArray(regel) ? regel : [regel]).forEach(function (deel) {
          r.appendChild(typeof deel === "string" ? document.createTextNode(deel) : deel);
        });
        uitlegVak.appendChild(r);
      });
    }

    function tip(tekst) {
      uitlegVak.replaceChildren(el("div", "mr-uitlegregel mr-tip", tekst));
    }

    function melding(tekst, soort) {
      resultaatVak.appendChild(el("div", "mr-melding" + (soort ? " " + soort : ""), tekst));
    }

    // De vergelijking op een rij: [A] · [B] = [C]. De delen zijn matrices uit
    // kopie(), losse knooppunten of tekens als "+" en "=".
    function zetVergelijking(delen) {
      var rij = el("div", "mr-vergelijking");
      delen.forEach(function (deel) {
        if (deel === null) return;
        // Ook een teken krijgt de lege plaats van een naamlabel onder zich, zodat
        // het op dezelfde hoogte staat als het midden van de matrices ernaast.
        rij.appendChild(typeof deel === "string" ? operatorterm(deel) : deel);
      });
      resultaatVak.appendChild(rij);
      return rij;
    }

    // De linkerkant van de vergelijking, los van de vraag of er een resultaat
    // uitkomt. Ze leest enkel de ruwe invoer, dus ze lukt altijd: zo blijven de
    // matrices staan terwijl de leerling erin typt.
    function exponentveld() {
      return inlineGetalveld("macht", "mr-veld-exponent");
    }

    function linkerdelen() {
      switch (st.bewerking) {
        case "som": return [kopie("A"), operatorterm("+", true), kopie("B")];
        case "verschil": return [kopie("A"), operatorterm("\u2212", true), kopie("B")];
        case "productAB": return [kopie("A"), operatorterm("\u00b7", true), kopie("B")];
        case "productBA": return [kopie("B"), operatorterm("\u00b7", true), kopie("A")];
        case "gelijk": return [kopie("A"), operatorterm("=", true), kopie("B"), "?"];
        case "scalairA": return [factorterm(), "\u00b7", kopie("A")];
        case "scalairB": return [factorterm(), "\u00b7", kopie("B")];
        case "transponeerA": return [metExponent(kopie("A"), "T")];
        case "transponeerB": return [metExponent(kopie("B"), "T")];
        case "machtA": return [metExponent(kopie("A"), exponentveld())];
        case "machtB": return [metExponent(kopie("B"), exponentveld())];
        case "detA": return ["det", kopie("A")];
        case "detB": return ["det", kopie("B")];
      }
      return [];
    }

    function factorterm() {
      return operand(inlineGetalveld("factor", "mr-veld-factor"), "r");
    }

    // De vergelijking met een vraagteken waar het resultaat hoort.
    function toonGeenResultaat(bericht) {
      var delen = linkerdelen();
      if (st.bewerking !== "gelijk") {
        delen = delen.concat(["=", operand(el("span", "mr-uitkomst mr-kan-niet", "?"), null)]);
      }
      zetVergelijking(delen);
      melding(bericht, "mr-kan-niet");
    }

    // Het resultaat als laatste term van die vergelijking, met per element de
    // uitleg eronder. kiesCel krijgt (i, j) en zet zelf de markeringen en de
    // uitlegregels; links zijn de delen die voor het isgelijkteken staan.
    function toonResultaat(links, m, kiesCel, standaardtip) {
      var cellen = [], rooster = [];
      kopieen.C.push(rooster);
      var weergave = toonMatrix(m, "mr-mat-resultaat mr-van-c", function (cel, i, j) {
        cellen.push(cel);
        if (!rooster[i]) rooster[i] = [];
        rooster[i][j] = cel;
        if (!kiesCel) return;
        cel.tabIndex = 0;
        cel.setAttribute("role", "button");
        cel.classList.add("mr-klikbaar");
        cel.setAttribute("aria-label", "Element op rij " + (i + 1) +
          ", kolom " + (j + 1) + ": toon de berekening");
        function kies() {
          wisMarkeringen();
          cellen.forEach(function (c) { c.classList.remove("mr-gekozen"); });
          cel.classList.add("mr-gekozen");
          kiesCel(i, j);
        }
        cel.addEventListener("click", kies);
        cel.addEventListener("mouseenter", kies);
        cel.addEventListener("focus", kies);
        cel.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kies(); }
        });
      });
      zetVergelijking(links.concat(["=", operand(weergave, "C", "c", onderResultaat(m))]));
      if (kiesCel) {
        tip(standaardtip || "Beweeg over een element van het resultaat: " +
          "de elementen die eraan meewerken lichten op.");
      } else if (standaardtip) {
        tip(standaardtip);
      }
    }

    // Onder C hangt wat over C gaat: haar orde, en de knoppen om ze over te
    // nemen in A of B en zo verder te rekenen.
    function onderResultaat(m) {
      var doos = el("div", "mr-onder");
      doos.appendChild(el("div", "mr-orde-resultaat", m.r + " × " + m.k + "-matrix"));
      var knoppenrij = el("div", "mr-snel");
      knoppenrij.appendChild(overnemen("A", m));
      knoppenrij.appendChild(overnemen("B", m));
      doos.appendChild(knoppenrij);
      return doos;
    }

    function overnemen(naam, m) {
      var k = knop("→ " + naam, "mr-klein", function () { schrijf(naam, m); });
      k.dataset.veld = "naar-" + naam;
      k.title = "Neem het resultaat over in " + naam;
      return k;
    }

    /* --- De bewerkingen uitvoeren -------------------------------------- */

    function leesFactor() {
      var tekst = String(st.factor).trim().replace(/\s+/g, "").replace(",", ".");
      var deling = /^([+-]?\d+)\/(\d+)$/.exec(tekst);
      if (deling) return breuk(Number(deling[1]), Number(deling[2]));
      if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(tekst)) {
        var punt = tekst.indexOf(".");
        if (punt < 0) return heel(Number(tekst));
        var cijfers = tekst.length - punt - 1;
        return breuk(Math.round(Number(tekst) * Math.pow(10, cijfers)),
                     Math.pow(10, cijfers));
      }
      throw new Error("Vul bij r een getal in, bijvoorbeeld 3, -0.5 of 2/3.");
    }

    function leesMacht() {
      var tekst = String(st.macht).trim();
      if (!/^\d+$/.test(tekst) || Number(tekst) > MAX_MACHT) {
        throw new Error("Vul bij n een geheel getal van 0 tot " + MAX_MACHT + " in.");
      }
      return Number(tekst);
    }

    function eisVierkant(naam, m) {
      if (m.r !== m.k) {
        throw new Error("Een determinant bestaat enkel voor een vierkante matrix; " +
          naam + " is een " + m.r + " × " + m.k + "-matrix.");
      }
    }

    function voerUit(A, B) {
      switch (st.bewerking) {
        case "som": return toonTermsgewijs(A, B, 1);
        case "verschil": return toonTermsgewijs(A, B, -1);
        case "productAB": return toonProduct("A", A, "B", B);
        case "productBA": return toonProduct("B", B, "A", A);
        case "gelijk": return toonGelijkheid(A, B);
        case "scalairA": return toonScalair("A", A);
        case "scalairB": return toonScalair("B", B);
        case "transponeerA": return toonTransponeren("A", A);
        case "transponeerB": return toonTransponeren("B", B);
        case "machtA": return toonMacht("A", A);
        case "machtB": return toonMacht("B", B);
        case "detA": return toonDeterminant("A", A);
        case "detB": return toonDeterminant("B", B);
      }
    }

    function toonTermsgewijs(A, B, teken) {
      var symbol = teken > 0 ? " + " : " − ";
      if (A.r !== B.r || A.k !== B.k) {
        toonGeenResultaat("Optellen kan enkel bij gelijke dimensies: A is " +
          A.r + " × " + A.k + ", B is " + B.r + " × " + B.k + ".");
        return;
      }
      var m = termsgewijs(A, B, teken > 0 ? optel : aftrek);
      toonResultaat(linkerdelen(), m, function (i, j) {
        markeer("A", i, j);
        markeer("B", i, j);
        zetUitleg(
          [symbool("c", i, j), " = ", symbool("a", i, j), symbol, symbool("b", i, j)],
          [" = ", getalNode(A.w[i][j]), symbol, factorNode(B.w[i][j])],
          [" = ", getalNode(m.w[i][j])]
        );
      });
    }

    function toonProduct(naam1, M, naam2, N) {
      if (M.k !== N.r) {
        toonGeenResultaat("Dit product bestaat niet: " + naam1 + " heeft " + M.k +
          " kolommen en " + naam2 + " heeft " + N.r + " rijen. " +
          "Voor een product moeten die twee gelijk zijn.");
        return;
      }
      var m = product(M, N);
      toonResultaat(linkerdelen(), m, function (i, j) {
        markeerRij(naam1, i);
        markeerKolom(naam2, j);
        var symbolisch = [symbool("c", i, j), " = "];
        var metGetallen = [" = "];
        for (var t = 0; t < M.k; t++) {
          if (t) { symbolisch.push(" + "); metGetallen.push(" + "); }
          symbolisch.push(symbool(naam1 === "A" ? "a" : "b", i, t));
          symbolisch.push("·");
          symbolisch.push(symbool(naam2 === "A" ? "a" : "b", t, j));
          metGetallen.push(factorNode(M.w[i][t]));
          metGetallen.push("·");
          metGetallen.push(factorNode(N.w[t][j]));
        }
        zetUitleg(symbolisch, metGetallen, [" = ", getalNode(m.w[i][j])]);
      }, "Beweeg over een element van het product: de rij van " + naam1 +
         " en de kolom van " + naam2 + " die het maken, lichten op.");
    }

    function toonGelijkheid(A, B) {
      zetVergelijking(linkerdelen());
      if (A.r !== B.r || A.k !== B.k) {
        melding("A en B zijn niet gelijk: hun dimensies verschillen (" +
          A.r + " × " + A.k + " tegenover " + B.r + " × " + B.k + ").",
          "mr-kan-niet");
        tip("Twee matrices zijn gelijk als ze dezelfde dimensies hebben " +
          "én alle overeenkomstige elementen gelijk zijn.");
        return;
      }
      var verschillen = [];
      for (var i = 0; i < A.r; i++) {
        for (var j = 0; j < A.k; j++) {
          if (!isGelijk(A.w[i][j], B.w[i][j])) verschillen.push([i, j]);
        }
      }
      if (!verschillen.length) {
        melding("A = B: alle overeenkomstige elementen zijn gelijk.", "mr-goed");
        for (var p = 0; p < A.r; p++) markeerRij("A", p, "mr-licht-zacht");
        for (var q = 0; q < B.r; q++) markeerRij("B", q, "mr-licht-zacht");
        tip("Twee matrices zijn gelijk als ze dezelfde dimensies hebben " +
          "én alle overeenkomstige elementen gelijk zijn.");
        return;
      }
      melding("A ≠ B: " + verschillen.length + " overeenkomstig" +
        (verschillen.length === 1 ? " paar verschilt." : "e paren verschillen."),
        "mr-kan-niet");
      var regels = verschillen.slice(0, 4).map(function (plaats) {
        markeer("A", plaats[0], plaats[1], "mr-fout");
        markeer("B", plaats[0], plaats[1], "mr-fout");
        return [symbool("a", plaats[0], plaats[1]), " = ",
                getalNode(A.w[plaats[0]][plaats[1]]), " maar ",
                symbool("b", plaats[0], plaats[1]), " = ",
                getalNode(B.w[plaats[0]][plaats[1]])];
      });
      verschillen.slice(4).forEach(function (plaats) {
        markeer("A", plaats[0], plaats[1], "mr-fout");
        markeer("B", plaats[0], plaats[1], "mr-fout");
      });
      zetUitleg.apply(null, regels);
    }

    function toonScalair(naam, M) {
      var r = leesFactor();
      var m = scalairVeelvoud(r, M);
      var letter = naam === "A" ? "a" : "b";
      toonResultaat(linkerdelen(), m, function (i, j) {
        markeer(naam, i, j);
        zetUitleg(
          [symbool("c", i, j), " = r·", symbool(letter, i, j)],
          [" = ", factorNode(r), "·", factorNode(M.w[i][j])],
          [" = ", getalNode(m.w[i][j])]
        );
      });
    }

    function toonTransponeren(naam, M) {
      var m = getransponeerde(M);
      var letter = naam === "A" ? "a" : "b";
      toonResultaat(linkerdelen(), m, function (i, j) {
        markeerRij(naam, j, "mr-licht-zacht");
        markeer(naam, j, i);
        markeerKolom("C", j, "mr-licht-zacht");
        zetUitleg(
          [symbool("c", i, j), " = ", symbool(letter, j, i), " = ", getalNode(m.w[i][j])],
          ["Rij " + (j + 1) + " van " + naam + " wordt kolom " + (j + 1) +
           " van " + naam + "ᵀ."]
        );
      }, "Beweeg over een element: het staat in " + naam + " op de gespiegelde plaats.");
    }

    function toonMacht(naam, M) {
      var n = leesMacht();
      if (M.r !== M.k) {
        toonGeenResultaat("Een macht bestaat enkel voor een vierkante matrix; " +
          naam + " is een " + M.r + " × " + M.k + "-matrix.");
        return;
      }
      if (n === 0) {
        toonResultaat(linkerdelen(), eenheidsmatrix(M.r), null);
        tip("Per afspraak is de nulde macht de eenheidsmatrix I" + M.r + ".");
        return;
      }
      var m = M;
      for (var t = 1; t < n; t++) m = product(m, M);
      // Enkel de uitkomst. Een keten A · A = A² · A = A³ leest alsof al die
      // uitdrukkingen aan elkaar gelijk zijn, en een element van Aⁿ komt niet uit
      // één rij en één kolom van A, dus valt er in A ook niets aan te wijzen.
      toonResultaat(linkerdelen(), m, null);
    }

    function toonDeterminant(naam, M) {
      eisVierkant(naam, M);
      var waarde = determinant(M);
      var n = M.r;
      zetVergelijking(linkerdelen().concat(["=",
                       operand(el("span", "mr-uitkomst"), null)]));
      resultaatVak.querySelector(".mr-uitkomst").appendChild(getalNode(waarde));

      if (n === 1) {
        tip("De determinant van een 1 × 1-matrix is het element zelf.");
        markeer(naam, 0, 0);
        return;
      }

      // Naar welke rij of kolom ontwikkelen we? Dat kiest de leerling zelf,
      // want de cursus laat zien dat elke keuze dezelfde waarde geeft.
      var kiezer = el("div", "mr-ontwikkel");
      kiezer.appendChild(el("span", "mr-keuzelabel", "ontwikkel naar"));
      [["rij", "rij"], ["kolom", "kolom"]].forEach(function (r) {
        var k = knop(r[1], "mr-klein", function () {
          st.richting = r[0];
          werkBij();
        });
        k.dataset.veld = "ontwikkel-" + r[0];
        k.setAttribute("aria-pressed", String(st.richting === r[0]));
        if (st.richting === r[0]) k.classList.add("mr-aan");
        kiezer.appendChild(k);
      });
      for (var p = 0; p < n; p++) {
        (function (p) {
          var k = knop(String(p + 1), "mr-rond", function () {
            st.lijn = p;
            werkBij();
          });
          k.dataset.veld = "ontwikkel-lijn-" + p;
          k.setAttribute("aria-pressed", String(st.lijn === p));
          if (st.lijn === p) k.classList.add("mr-aan");
          k.setAttribute("aria-label", st.richting + " " + (p + 1));
          kiezer.appendChild(k);
        })(p);
      }
      resultaatVak.appendChild(kiezer);

      if (st.lijn >= n) st.lijn = 0;
      var lijn = st.lijn;
      var termen = [];
      for (var q = 0; q < n; q++) {
        var i = st.richting === "rij" ? lijn : q;
        var j = st.richting === "rij" ? q : lijn;
        termen.push({
          i: i, j: j,
          element: M.w[i][j],
          minor: minor(M, i, j),
          teken: (i + j) % 2 === 0 ? 1 : -1
        });
      }

      var ontwikkeling = el("div", "mr-ontwikkeling");
      termen.forEach(function (term, t) {
        var doos = el("span", "mr-term");
        doos.tabIndex = 0;
        doos.setAttribute("role", "button");
        doos.classList.add("mr-klikbaar");
        doos.appendChild(el("span", "mr-termteken",
          t === 0 ? (term.teken < 0 ? "−" : "") : (term.teken < 0 ? "−" : "+")));
        doos.appendChild(factorNode(term.element));
        doos.appendChild(el("span", "mr-termteken", "·"));
        doos.appendChild(toonMatrix(term.minor, "mr-mat-klein"));
        function kies() {
          wisMarkeringen();
          ontwikkeling.querySelectorAll(".mr-term").forEach(function (d) {
            d.classList.remove("mr-gekozen");
          });
          doos.classList.add("mr-gekozen");
          for (var p = 0; p < n; p++) {
            for (var q = 0; q < n; q++) {
              if (p === term.i && q === term.j) markeer(naam, p, q, "mr-licht");
              else if (p === term.i || q === term.j) markeer(naam, p, q, "mr-geschrapt");
              else markeer(naam, p, q, "mr-licht-zacht");
            }
          }
          var deelwaarde = determinant(term.minor);
          var cofactor = maal(heel(term.teken), deelwaarde);
          var kopje = el("span", "mr-sym mr-a");
          kopje.appendChild(document.createTextNode("(−1)"));
          kopje.appendChild(el("sup", null, (term.i + 1) + "+" + (term.j + 1)));
          zetUitleg(
            ["Schrap rij " + (term.i + 1) + " en kolom " + (term.j + 1) +
             " van " + naam + "."],
            ["cofactor = ", kopje, " · ", factorNode(deelwaarde), " = ",
             getalNode(cofactor)],
            ["term = ", factorNode(term.element), " · ", factorNode(cofactor),
             " = ", getalNode(maal(term.element, cofactor))]
          );
        }
        doos.addEventListener("click", kies);
        doos.addEventListener("mouseenter", kies);
        doos.addEventListener("focus", kies);
        doos.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kies(); }
        });
        ontwikkeling.appendChild(doos);
      });
      resultaatVak.appendChild(ontwikkeling);

      if (n === 2) {
        tip("Voor orde twee is dat de bekende regel: het product van de " +
          "hoofddiagonaal min het product van de nevendiagonaal.");
      } else {
        tip("Beweeg over een term: de geschrapte rij en kolom lichten op. " +
          "Ontwikkel gerust naar een andere rij of kolom, de waarde blijft dezelfde.");
      }
      markeerLijn(naam, lijn);
    }

    function markeerLijn(naam, lijn) {
      if (st.richting === "rij") markeerRij(naam, lijn, "mr-licht-zacht");
      else markeerKolom(naam, lijn, "mr-licht-zacht");
    }

    /* --- Alles bijwerken ------------------------------------------------ */

    function wisUitvoer() {
      kopieen = { A: [], B: [], C: [] };
      resultaatVak.replaceChildren();
      uitlegVak.replaceChildren();
    }

    function werkBij() {
      var plek = huidigeInvoerplek();
      wisMarkeringen();
      wisUitvoer();
      BEWERKINGEN.forEach(function (b) {
        var aan = b.naam === st.bewerking;
        knoppen[b.naam].setAttribute("aria-pressed", String(aan));
        knoppen[b.naam].classList.toggle("mr-aan", aan);
      });
      try {
        voerUit(lees("A"), lees("B"));
      } catch (fout) {
        wisUitvoer();
        toonGeenResultaat(fout.message);
      }
      // De vergelijking is opnieuw opgebouwd, dus ook het veld waarin getypt
      // werd; de cursor gaat terug naar waar ze stond.
      herstelInvoerplek(plek);
    }

    /* --- Opbouw --------------------------------------------------------- */

    wortel.appendChild(bouwKeuze());

    var uitvoer = el("div", "mr-uitvoer");
    resultaatVak = el("div", "mr-resultaat");
    uitlegVak = el("div", "mr-uitleg");
    uitlegVak.setAttribute("aria-live", "polite");
    uitvoer.appendChild(resultaatVak);
    uitvoer.appendChild(uitlegVak);
    wortel.appendChild(uitvoer);

    houder.appendChild(wortel);
    werkBij();

    return {
      element: wortel,
      // Terug naar de beginstand, voor de knop Herstel in de kopbalk van het
      // venster.
      herstel: function () {
        st.A = { r: 2, k: 2, tekst: [["1", "2"], ["3", "4"]] };
        st.B = { r: 2, k: 2, tekst: [["0", "1"], ["1", "0"]] };
        st.bewerking = BEGIN;
        st.factor = "2";
        st.macht = "2";
        st.richting = "rij";
        st.lijn = 0;
        werkBij();
      }
    };
  }

  window.Matrixrekenmachine = { maak: maak };
})();
