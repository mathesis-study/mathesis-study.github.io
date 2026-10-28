/* De leerlingensite: reeksen extra oefeningen met uitwerkingen, en per
 * deelvraag een status die in de browser bewaard blijft.
 *
 * scripts/leerlingensite.py bouwt de gegevens (data/index.js en per reeks
 * data/r<k>.js); deze module is de hele weergave.
 *
 * Adressen: #3 (reeks 3), #3/12 (oefening 12 van reeks 3). Springveld: "3 12",
 * "3.12" of "3/12", of "12" binnen de reeks die open staat. Alles werkt ook
 * als bestand (file://): de gegevens komen via scripttags, niet met fetch.
 *
 * Status per deelvraag (of per oefening zonder deelvragen): niet gezien,
 * gezien, fout of juist. Wie een antwoord of uitwerking opent van iets dat
 * nog niet gezien is, zet het op gezien. Bewaard in localStorage onder
 * gt:status, met de vaste sleutel van de oefening en de letter.
 *
 * Sneltoetsen: / springen, ← → vorige en volgende, t dag en nacht, h begin.
 *
 * Als bestand geopend (file://) vraagt de pagina om de seconde stempel.js
 * op en herlaadt ze zichzelf zodra de bouw een nieuwe stempel schreef.
 *
 * De gegevens staan versleuteld (AES-GCM). data/index.js geeft GT.slot met
 * het zout, het aantal iteraties en de versleutelde index; de sleutel komt
 * met PBKDF2 uit de toegangscode die de leerling intikt, en blijft daarna in
 * localStorage onder gt:sleutel. Past die sleutel niet meer (een nieuwe
 * code), dan vraagt de pagina de code opnieuw.
 *
 * Op mathesis.study staat links in de kop de link naar de hoofdpagina (meta
 * mathesis-hoofdpagina, enkel over http(s)), en het thema deelt de sleutel
 * pres:thema met de cursussen.
 */
(function (root) {
  "use strict";

  var document = root.document;
  var index = null, reeksen = {}, wachtend = {};
  var slot = null, sleutel = null;
  var lijst = [], perAdres = {};
  var huidig = null;          // de oefening die open staat
  var huidigeReeks = null;    // de reeks die open staat, voor "12"
  var el = {};

  root.GT = {
    stempel: function (s) {
      var eigen = (document.querySelector('script[src^="app.js"]').getAttribute("src").match(/[?&]v=(\w+)/) || [])[1];
      if (eigen && s !== eigen) location.reload();
    },
    slot: function (g) { slot = g; },
    reeks: function (g) {
      ontcijfer(sleutel, g).then(function (inhoud) {
        var r = { nr: g.nr, oefeningen: inhoud.oefeningen };
        reeksen[g.nr] = r;
        (wachtend[g.nr] || []).forEach(function (f) { f(r); });
        delete wachtend[g.nr];
      }, function () {
        (wachtend[g.nr] || []).forEach(function (f) { f(null); });
        delete wachtend[g.nr];
      });
    }
  };

  /* --- Slot ----------------------------------------------------------------- */

  var subtle = root.crypto && root.crypto.subtle;

  function naarBytes(b64) {
    var s = atob(b64), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function naarB64(buffer) {
    var a = new Uint8Array(buffer), s = "";
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  }

  // Zoals scripts/leerlingensite.py: zonder spaties, in kleine letters.
  function sleutelbits(code) {
    var tekst = new TextEncoder().encode(String(code).replace(/\s+/g, "").toLowerCase());
    return subtle.importKey("raw", tekst, "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: naarBytes(slot.zout),
                                 iterations: slot.iteraties }, k, 256);
    });
  }

  function aesSleutel(bits) {
    return subtle.importKey("raw", bits, "AES-GCM", false, ["decrypt"]);
  }

  function ontcijfer(k, blok) {
    if (!k) return Promise.reject(new Error("geen sleutel"));
    return subtle.decrypt({ name: "AES-GCM", iv: naarBytes(blok.iv) }, k, naarBytes(blok.data))
      .then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
  }

  // Open de index met deze sleutelbits; bewaar ze als dat lukt.
  function open(bits) {
    return aesSleutel(bits).then(function (k) {
      return ontcijfer(k, slot.index).then(function (inhoud) {
        sleutel = k;
        index = { titel: slot.titel, ondertitel: slot.ondertitel, reeksen: inhoud.reeksen };
        bewaar("gt:sleutel", naarB64(bits));
      });
    });
  }

  function toonSlot() {
    var app = document.getElementById("gt");
    app.innerHTML = "";
    var m = mathesis();
    if (m) {
      var kop = maak("header", "gt-kop");
      kop.appendChild(m);
      app.appendChild(kop);
    }
    var inhoud = maak("main", "gt-inhoud gt-slotweergave");
    var kaart = maak("form", "gt-held gt-slot");
    var teken = maak("span", "gt-slotteken");
    teken.appendChild(icoon(ICOON.slot));
    kaart.appendChild(teken);
    kaart.appendChild(maak("h1", null, slot.titel));
    kaart.appendChild(maak("p", "gt-held-onder", slot.ondertitel));
    kaart.appendChild(maak("p", null, "Deze oefeningen zijn voor de leerlingen van de klas. " +
      "Vul de toegangscode in die je van je leraar kreeg."));
    var rij = maak("div", "gt-slotrij");
    var veld = maak("input");
    veld.type = "text";
    veld.id = "gt-code";
    veld.placeholder = "Toegangscode";
    veld.setAttribute("aria-label", "Toegangscode");
    veld.autocomplete = "off";
    veld.autocapitalize = "none";
    veld.spellcheck = false;
    veld.setAttribute("enterkeyhint", "go");
    var ga = maak("button", "gt-slotknop", "Openen");
    ga.type = "submit";
    rij.appendChild(veld);
    rij.appendChild(ga);
    kaart.appendChild(rij);
    var melding = maak("p", "gt-slotmelding");
    melding.setAttribute("aria-live", "polite");
    kaart.appendChild(melding);
    kaart.appendChild(maak("p", "gt-slotvoet",
      "Je typt de code maar één keer: deze browser onthoudt ze op dit toestel."));
    kaart.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!veld.value.trim()) { veld.focus(); return; }
      ga.disabled = veld.disabled = true;
      melding.textContent = "Even geduld…";
      sleutelbits(veld.value).then(open).then(function () {
        app.innerHTML = "";
        begin();
      }, function () {
        ga.disabled = veld.disabled = false;
        melding.textContent = "Die code klopt niet.";
        kaart.classList.remove("gt-schud"); void kaart.offsetWidth; kaart.classList.add("gt-schud");
        veld.select();
      });
    });
    inhoud.appendChild(kaart);
    app.appendChild(inhoud);
    document.title = slot.titel + " · " + slot.ondertitel;
    veld.focus();
  }

  // De weg terug naar mathesis.study, zoals in de kop van een cursus.
  function mathesis() {
    var adres = document.querySelector('meta[name="mathesis-hoofdpagina"]');
    if (!adres || !adres.content || !/^https?:$/.test(location.protocol)) return null;
    var a = link("", adres.content, "gt-mathesis");
    a.title = "Naar de hoofdpagina van Mathesis";
    a.setAttribute("aria-label", "Mathesis, hoofdpagina");
    var beeld = document.querySelector('meta[name="mathesis-icoon"]');
    if (beeld) {
      var img = maak("img");
      img.src = beeld.content;
      img.alt = "";
      a.appendChild(img);
    }
    a.appendChild(maak("span", "gt-mathesis-naam", "Mathesis"));
    var groep = maak("span", "gt-mathesis-groep");
    groep.appendChild(a);
    groep.appendChild(maak("span", "gt-kruimel", "\u203a"));
    groep.lastChild.setAttribute("aria-hidden", "true");
    return groep;
  }

  /* --- Opslag ------------------------------------------------------------ */

  function lees(sleutel, standaard) {
    try { var w = localStorage.getItem(sleutel); return w === null ? standaard : w; }
    catch (e) { return standaard; }
  }
  function bewaar(sleutel, waarde) {
    try { localStorage.setItem(sleutel, waarde); } catch (e) { /* niets */ }
  }

  var STATUS = [
    { naam: "", label: "Niet gezien", kort: "nog niet gezien",
      pad: "M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" },
    { naam: "gezien", label: "Gezien", kort: "gezien",
      pad: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
    { naam: "fout", label: "Gemaakt, fout", kort: "fout",
      pad: "M6 6l12 12M18 6L6 18" },
    { naam: "juist", label: "Gemaakt, juist", kort: "juist",
      pad: "M4.5 12.5l5 5 10-11" }
  ];
  var status = {};

  function leesStatus() {
    try { status = JSON.parse(lees("gt:status", "{}")) || {}; } catch (e) { status = {}; }
  }
  function statusVan(o, deel) { return status[o.id + ":" + deel] || ""; }
  function zetStatus(o, deel, naam) {
    if (naam) status[o.id + ":" + deel] = naam;
    else delete status[o.id + ":" + deel];
    bewaar("gt:status", JSON.stringify(status));
    document.dispatchEvent(new CustomEvent("gt:status", { detail: { o: o, deel: deel, naam: naam } }));
  }

  // De delen van een oefening: de letters, of één leeg deel voor het geheel.
  function delen(o) { return o.delen.length ? o.delen : [""]; }

  function telling(oefeningen) {
    var t = { totaal: 0, "": 0, gezien: 0, fout: 0, juist: 0 };
    oefeningen.forEach(function (o) {
      delen(o).forEach(function (d) { t.totaal++; t[statusVan(o, d)]++; });
    });
    return t;
  }

  /* --- Hulp --------------------------------------------------------------- */

  function maak(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }

  function knop(tekst, titel, actie, klasse) {
    var b = maak("button", "gt-knop" + (klasse ? " " + klasse : ""), tekst);
    b.type = "button";
    if (titel) { b.title = titel; b.setAttribute("aria-label", titel); }
    b.addEventListener("click", actie);
    return b;
  }

  function link(tekst, adres, klasse) {
    var a = maak("a", klasse, tekst);
    a.href = adres;
    return a;
  }

  function icoon(pad) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", pad);
    svg.appendChild(p);
    return svg;
  }

  var ICOON = {
    links: "M15 5l-7 7 7 7",
    rechts: "M9 5l7 7-7 7",
    thema: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 3.5v17",
    antwoord: "M5 12h14M5 7h14M5 17h8",
    uitwerking: "M4 6h16M8 12h12M8 18h12M4 11v2M4 17v2",
    slot: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z"
  };

  // Een reeks laadt via een scripttag, ook vanaf file://.
  function laad(nr) {
    return new Promise(function (klaar, fout) {
      if (reeksen[nr]) return klaar(reeksen[nr]);
      (wachtend[nr] = wachtend[nr] || []).push(function (r) {
        if (r) klaar(r); else fout(new Error("reeks " + nr + " laat zich niet openen"));
      });
      if (wachtend[nr].length > 1) return;
      var s = document.createElement("script");
      s.src = "data/r" + nr + ".js?v=" + versie();
      s.onerror = function () { fout(new Error("reeks " + nr + " laadt niet")); };
      document.body.appendChild(s);
    });
  }

  function mathjax(element) {
    var mj = root.MathJax;
    if (!mj || !mj.startup || !mj.startup.promise) return Promise.resolve();
    return mj.startup.promise.then(function () {
      return mj.typesetPromise ? mj.typesetPromise([element]) : null;
    }).catch(function () { /* een formule die niet lukt, laat de rest staan */ });
  }

  function wisMathjax(element) {
    var mj = root.MathJax;
    if (mj && mj.typesetClear) {
      try { mj.typesetClear([element]); } catch (e) { /* niets */ }
    }
  }

  function zichtbaar(element) {
    element.dispatchEvent(new CustomEvent("pres:zichtbaar", { bubbles: true }));
  }

  /* --- Voortgangsbalk ------------------------------------------------------ */

  // Een gestapelde balk: juist, fout, gezien, en de rest leeg.
  function balk(t, klasse) {
    var b = maak("div", "gt-balk" + (klasse ? " " + klasse : ""));
    b.setAttribute("role", "img");
    b.setAttribute("aria-label", t.juist + " juist, " + t.fout + " fout, " + t.gezien +
      " gezien, " + t[""] + " nog niet gezien");
    ["juist", "fout", "gezien"].forEach(function (s) {
      if (!t[s]) return;
      var d = maak("span", "gt-balk-" + s);
      d.style.width = (100 * t[s] / t.totaal) + "%";
      b.appendChild(d);
    });
    return b;
  }

  function cijfers(t) {
    var p = maak("p", "gt-cijfers");
    [["juist", t.juist], ["fout", t.fout], ["gezien", t.gezien]].forEach(function (x) {
      var s = maak("span", "gt-cijfer gt-cijfer-" + x[0]);
      s.appendChild(maak("b", null, String(x[1])));
      s.appendChild(document.createTextNode(" " + x[0]));
      p.appendChild(s);
    });
    p.appendChild(maak("span", "gt-cijfer", "van " + t.totaal));
    return p;
  }

  /* --- Opbouw ---------------------------------------------------------------- */

  function bouwSchil() {
    var app = document.getElementById("gt");
    var kop = maak("header", "gt-kop");
    var m = mathesis();
    if (m) kop.appendChild(m);
    var thuis = link("", "#", "gt-merk");
    thuis.title = "Begin (h)";
    var teken = maak("span", "gt-merkteken");
    teken.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" ' +
      'stroke="currentColor" stroke-width="2.4"/><path d="M16 16L26 9.5" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round"/><path d="M22 16a6 6 0 0 0-.9-3.2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="26" cy="9.5" r="2.6" fill="currentColor"/></svg>';
    thuis.appendChild(teken);
    var naam = maak("span", "gt-merknaam");
    naam.appendChild(maak("b", null, index.titel));
    naam.appendChild(maak("span", null, index.ondertitel));
    thuis.appendChild(naam);
    kop.appendChild(thuis);

    var vorm = maak("form", "gt-spring");
    vorm.setAttribute("role", "search");
    var veld = maak("input");
    veld.type = "text";
    veld.placeholder = "Ga naar… 2 5";
    veld.setAttribute("aria-label", "Ga naar een oefening: reeks en nummer, bv. 2 5");
    veld.autocomplete = "off";
    veld.spellcheck = false;
    veld.setAttribute("inputmode", "decimal");
    veld.setAttribute("enterkeyhint", "go");
    vorm.appendChild(veld);
    vorm.addEventListener("submit", function (e) {
      e.preventDefault();
      var adres = spring(veld.value);
      if (adres) { veld.value = ""; veld.blur(); ga(adres); }
      else { vorm.classList.remove("gt-schud"); void vorm.offsetWidth; vorm.classList.add("gt-schud"); }
    });
    kop.appendChild(vorm);
    var thema = knop("", "Dag of nacht (t)", wisselThema, "gt-rond");
    thema.appendChild(icoon(ICOON.thema));
    kop.appendChild(thema);

    var inhoud = maak("main", "gt-inhoud");
    app.appendChild(kop);
    app.appendChild(inhoud);
    el.veld = veld;
    el.inhoud = inhoud;
  }

  // "3 12", "3.12", "3/12" of "r3 12" geeft een oefening; "3" alleen een
  // reeks, of oefening 3 als er een reeks open staat.
  function spring(vraag) {
    var t = String(vraag || "").trim().toLowerCase().replace(/^(reeks|r)\s*/, "");
    var m = t.match(/^(\d+)[\s.\/,;:-]+(\d+)$/);
    if (m) return perAdres[m[1] + "/" + m[2]] ? "#" + m[1] + "/" + m[2] : null;
    m = t.match(/^(\d+)$/);
    if (!m) return null;
    if (huidigeReeks && perAdres[huidigeReeks + "/" + m[1]]) return "#" + huidigeReeks + "/" + m[1];
    return reeksVan(+m[1]) ? "#" + m[1] : null;
  }

  function reeksVan(nr) {
    for (var i = 0; i < index.reeksen.length; i++) if (index.reeksen[i].nr === nr) return index.reeksen[i];
    return null;
  }

  function adresVan(o) { return "#" + o.reeks + "/" + o.nr; }

  function ga(adres) {
    if (location.hash === adres || (adres === "#" && !location.hash)) toon();
    else location.hash = adres;
  }

  function leeg(klasse) {
    wisMathjax(el.inhoud);
    el.inhoud.innerHTML = "";
    el.inhoud.className = "gt-inhoud " + klasse;
    huidig = null;
  }

  function toon() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var d = h.split("/");
    if (d.length === 2 && perAdres[d[0] + "/" + d[1]]) return toonOefening(perAdres[d[0] + "/" + d[1]]);
    if (d.length === 1 && reeksVan(+d[0])) return toonReeks(reeksVan(+d[0]));
    toonBegin();
  }

  /* --- Begin ------------------------------------------------------------------ */

  function toonBegin() {
    leeg("gt-begin");
    huidigeReeks = null;
    document.title = index.titel + " · " + index.ondertitel;
    var w = el.inhoud;
    var held = maak("section", "gt-held");
    held.appendChild(maak("h1", null, index.titel));
    held.appendChild(maak("p", "gt-held-onder", index.ondertitel));
    var t = telling(lijst);
    held.appendChild(balk(t, "gt-balk-groot"));
    held.appendChild(cijfers(t));
    var laatste = perAdres[lees("gt:laatste", "")];
    if (laatste) {
      var verder = link("", adresVan(laatste), "gt-verder");
      verder.appendChild(maak("span", null, "Verder met"));
      verder.appendChild(maak("b", null, "reeks " + laatste.reeks + ", oefening " + laatste.nr));
      verder.appendChild(icoon(ICOON.rechts));
      held.appendChild(verder);
    }
    w.appendChild(held);

    var rooster = maak("div", "gt-reeksen");
    index.reeksen.forEach(function (r) {
      var kaart = link("", "#" + r.nr, "gt-reekskaart");
      kaart.appendChild(maak("span", "gt-reeksnr", String(r.nr)));
      var tekst = maak("span", "gt-reekstekst");
      tekst.appendChild(maak("span", "gt-reekslabel", "Reeks " + r.nr));
      tekst.appendChild(maak("span", "gt-reekstitel", r.titel));
      var tr = telling(r.oefeningen);
      tekst.appendChild(balk(tr));
      tekst.appendChild(maak("span", "gt-reeksinfo", r.oefeningen.length + " oefeningen · " +
        tr.juist + " van " + tr.totaal + " juist"));
      kaart.appendChild(tekst);
      rooster.appendChild(kaart);
    });
    w.appendChild(rooster);
    w.appendChild(legende());
    w.appendChild(onderaan());
  }

  function legende() {
    var l = maak("div", "gt-legende");
    STATUS.forEach(function (s) {
      var x = maak("span", "gt-legende-item");
      var stip = maak("span", "gt-stip gt-s-" + (s.naam || "niet"));
      stip.appendChild(icoon(s.pad));
      x.appendChild(stip);
      x.appendChild(document.createTextNode(s.label));
      l.appendChild(x);
    });
    return l;
  }

  // Waar de voortgang staat, en ze wissen (twee keer klikken).
  function onderaan() {
    var v = maak("footer", "gt-voet");
    v.appendChild(maak("p", null, "Je voortgang blijft enkel in deze browser op dit toestel bewaard."));
    var wis = knop("Voortgang wissen", "Alle statussen terug op niet gezien", function () {
      if (!wis.classList.contains("gt-zeker")) {
        wis.classList.add("gt-zeker");
        wis.textContent = "Zeker? Klik nog eens om alles te wissen";
        setTimeout(function () {
          wis.classList.remove("gt-zeker");
          wis.textContent = "Voortgang wissen";
        }, 4000);
        return;
      }
      status = {};
      bewaar("gt:status", "{}");
      bewaar("gt:laatste", "");
      toonBegin();
    }, "gt-wis");
    v.appendChild(wis);
    return v;
  }

  /* --- Reeks ------------------------------------------------------------------ */

  function toonReeks(r) {
    leeg("gt-reeksweergave");
    huidigeReeks = r.nr;
    document.title = "Reeks " + r.nr + " · " + index.titel;
    var w = el.inhoud;
    var kop = maak("section", "gt-reekskop");
    kop.appendChild(link("Alle reeksen", "#", "gt-terug"));
    var h = maak("h1");
    h.appendChild(maak("span", "gt-reekslabel", "Reeks " + r.nr));
    h.appendChild(document.createTextNode(r.titel));
    kop.appendChild(h);
    var t = telling(r.oefeningen);
    kop.appendChild(balk(t, "gt-balk-groot"));
    kop.appendChild(cijfers(t));
    w.appendChild(kop);
    var rooster = maak("div", "gt-tegels");
    r.oefeningen.forEach(function (o) {
      o = perAdres[r.nr + "/" + o.nr];
      var tegel = link("", adresVan(o), "gt-tegel");
      var tt = telling([o]);
      if (tt.juist === tt.totaal) tegel.classList.add("gt-tegel-af");
      tegel.appendChild(maak("span", "gt-tegelnr", String(o.nr)));
      tegel.appendChild(stippen(o));
      tegel.title = "Oefening " + o.nr + ": " + tt.juist + " van " + tt.totaal + " juist";
      rooster.appendChild(tegel);
    });
    w.appendChild(rooster);
    w.appendChild(legende());
  }

  // Per deel een stip in de kleur van zijn status, met de letter erin.
  function stippen(o) {
    var rij = maak("span", "gt-stippen");
    delen(o).forEach(function (d) {
      var s = statusVan(o, d);
      var stip = maak("span", "gt-stip gt-stip-klein gt-s-" + (s || "niet"), d || "");
      if (!d) stip.classList.add("gt-stip-geheel");
      rij.appendChild(stip);
    });
    return rij;
  }

  /* --- Oefening --------------------------------------------------------------- */

  function toonOefening(o) {
    leeg("gt-oefeningweergave");
    huidig = o;
    huidigeReeks = o.reeks;
    bewaar("gt:laatste", o.reeks + "/" + o.nr);
    var r = reeksVan(o.reeks);
    document.title = "Reeks " + o.reeks + " · oefening " + o.nr + " · " + index.titel;
    var w = el.inhoud;

    var nav = maak("nav", "gt-oefnav");
    nav.appendChild(link("Reeks " + r.nr + " · " + r.titel, "#" + r.nr, "gt-terug"));
    var rij = maak("div", "gt-oefrij");
    var vorige = knop("", "Vorige oefening (←)", function () { stap(-1); }, "gt-rond");
    vorige.appendChild(icoon(ICOON.links));
    vorige.disabled = !buur(-1);
    var volgende = knop("", "Volgende oefening (→)", function () { stap(1); }, "gt-rond");
    volgende.appendChild(icoon(ICOON.rechts));
    volgende.disabled = !buur(1);
    var titel = maak("h1", "gt-oeftitel");
    titel.appendChild(maak("span", "gt-oefwoord", "Oefening "));
    titel.appendChild(document.createTextNode(String(o.nr)));
    titel.appendChild(maak("span", "gt-oefvan", "/ " + r.oefeningen.length));
    rij.appendChild(vorige);
    rij.appendChild(titel);
    rij.appendChild(volgende);
    nav.appendChild(rij);
    var overzicht = maak("div", "gt-oefoverzicht");
    nav.appendChild(overzicht);
    w.appendChild(nav);

    var kaart = maak("article", "gt-kaart");
    kaart.appendChild(maak("p", "gt-laden", "Laden…"));
    w.appendChild(kaart);

    function vulOverzicht() {
      overzicht.innerHTML = "";
      var t = telling([o]);
      overzicht.appendChild(stippen(o));
      overzicht.appendChild(maak("span", "gt-oefstand", t.juist + " van " + t.totaal + " juist"));
    }
    vulOverzicht();
    el.vulOverzicht = vulOverzicht;

    laad(o.reeks).then(function (g) {
      if (huidig !== o) return;
      var gegevens = null;
      for (var i = 0; i < g.oefeningen.length; i++) if (g.oefeningen[i].nr === o.nr) gegevens = g.oefeningen[i];
      kaart.innerHTML = gegevens ? gegevens.html : "<p>Niet gevonden.</p>";
      bereidVoor(kaart, o);
      mathjax(kaart).then(function () {
        if (huidig !== o) return;
        zichtbaar(kaart);
        [-1, 1].forEach(function (d) { var b = buur(d); if (b) laad(b.reeks); });
      });
    }).catch(function (fout) { kaart.textContent = fout.message; });
  }

  // Bij elke oplossing een balk: Antwoord en Uitwerking openen haar, en bij
  // de eerste oplossing van een deelvraag de vier knoppen van de status.
  // Een oefening zonder deelvragen krijgt haar status onderaan.
  function bereidVoor(kaart, o) {
    var gedaan = {};
    kaart.querySelectorAll(".oplossing").forEach(function (opl) {
      var li = opl.closest("li[data-deel]");
      var deel = li ? li.getAttribute("data-deel") : null;
      var rij = maak("div", "gt-oplbalk");
      opl.parentNode.insertBefore(rij, opl);
      opl.classList.add("gt-dicht");
      var ant = Array.prototype.find.call(opl.querySelectorAll(".oplantwoord"), function (a) {
        return a.closest(".oplossing") === opl;
      });
      // "bewijs" of "zie uitwerking" is geen antwoord: enkel de uitwerking.
      var label = ant ? "Uitwerking" : "Oplossing";
      var soort = ant && ant.textContent.trim().toLowerCase();
      if (soort === "bewijs" || soort === "zie uitwerking") {
        var leeg = ant.parentElement;
        ant.remove();
        if (leeg !== opl && leeg.tagName === "P" && !leeg.textContent.trim()) leeg.remove();
        label = soort === "bewijs" ? "Bewijs" : "Uitwerking";
        ant = null;
      }
      var knoppen = maak("div", "gt-oplknoppen");
      var chip = null;
      var deelStatus = deel !== null ? deel : (o.delen.length ? null : "");
      function gezien() {
        if (deelStatus !== null && !statusVan(o, deelStatus)) zetStatus(o, deelStatus, "gezien");
      }
      if (ant) {
        chip = maak("span", "gt-antwoord");
        var alinea = ant.parentElement;
        chip.appendChild(ant);
        if (alinea !== opl && alinea.tagName === "P" && !alinea.textContent.trim()) alinea.remove();
        var ka = knop("", "Toon het antwoord", function () {
          var open = !chip.classList.contains("gt-open");
          chip.classList.toggle("gt-open", open);
          ka.setAttribute("aria-pressed", String(open));
          if (open) gezien();
        }, "gt-pil");
        ka.appendChild(icoon(ICOON.antwoord));
        ka.appendChild(maak("span", null, "Antwoord"));
        ka.setAttribute("aria-pressed", "false");
        knoppen.appendChild(ka);
      }
      var ku = knop("", "Toon de uitwerking", function () {
        var open = opl.classList.contains("gt-dicht");
        opl.classList.toggle("gt-dicht", !open);
        ku.setAttribute("aria-pressed", String(open));
        if (open) { gezien(); zichtbaar(opl); }
      }, "gt-pil");
      ku.appendChild(icoon(ICOON.uitwerking));
      ku.appendChild(maak("span", null, label));
      ku.setAttribute("aria-pressed", "false");
      knoppen.appendChild(ku);
      rij.appendChild(knoppen);
      if (deel !== null && !gedaan[deel]) {
        gedaan[deel] = true;
        rij.appendChild(statusKnoppen(o, deel));
      }
      if (chip) opl.parentNode.insertBefore(chip, opl);
    });
    if (!o.delen.length) {
      var voet = maak("div", "gt-oefvoet");
      voet.appendChild(maak("span", "gt-oefvraag", "Hoe ging deze oefening?"));
      voet.appendChild(statusKnoppen(o, "", true));
      kaart.appendChild(voet);
    }
  }

  function statusKnoppen(o, deel, metTekst) {
    var groep = maak("div", "gt-status" + (metTekst ? " gt-status-tekst" : ""));
    groep.setAttribute("role", "radiogroup");
    groep.setAttribute("aria-label", deel ? "Status van deelvraag " + deel : "Status van de oefening");
    var knoppen = STATUS.map(function (s) {
      var b = knop("", s.label, function () {
        zetStatus(o, deel, s.naam);
      }, "gt-s-" + (s.naam || "niet"));
      b.setAttribute("role", "radio");
      b.appendChild(icoon(s.pad));
      if (metTekst) b.appendChild(maak("span", null, s.label));
      groep.appendChild(b);
      return b;
    });
    function zet() {
      var nu = statusVan(o, deel);
      knoppen.forEach(function (b, i) { b.setAttribute("aria-checked", String(STATUS[i].naam === nu)); });
      groep.setAttribute("data-status", nu || "niet");
    }
    zet();
    groep.gtZet = zet;
    return groep;
  }

  function buur(d) {
    if (!huidig) return null;
    var i = lijst.indexOf(huidig) + d;
    return i >= 0 && i < lijst.length ? lijst[i] : null;
  }

  function stap(d) {
    var b = buur(d);
    if (b) ga(adresVan(b));
  }

  /* --- Thema, toetsen, vegen -------------------------------------------------- */

  function wisselThema() {
    var nu = document.documentElement.getAttribute("data-thema") === "donker" ? "licht" : "donker";
    document.documentElement.setAttribute("data-thema", nu);
    bewaar("pres:thema", nu);
    document.dispatchEvent(new CustomEvent("pres:thema", { detail: nu }));
  }

  function toetsen(e) {
    var doel = e.target;
    var typend = doel && (doel.tagName === "INPUT" || doel.tagName === "TEXTAREA" || doel.isContentEditable);
    if (e.key === "Escape" && typend) { doel.value = ""; doel.blur(); return; }
    if (typend || e.ctrlKey || e.metaKey || e.altKey) return;
    var actie = {
      "/": function () { el.veld.focus(); },
      "ArrowLeft": function () { stap(-1); },
      "ArrowRight": function () { stap(1); },
      "t": wisselThema,
      "h": function () { ga("#"); }
    }[e.key];
    if (actie) { actie(); e.preventDefault(); }
  }

  function vegen() {
    var x0 = null, y0 = null;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || e.target.closest(".interactieve-grafiek, mjx-container, .gt-oplbalk")) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (x0 === null || !huidig) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy)) stap(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function versie() {
    return (document.querySelector('script[src^="app.js"]').getAttribute("src").match(/[?&]v=(\w+)/) || [])[1] || "";
  }

  function start() {
    var app = document.getElementById("gt");
    if (!slot) {
      app.textContent = "data/index.js ontbreekt: bouw met scripts/leerlingensite.py.";
      return;
    }
    if (!subtle) {
      app.textContent = "Deze browser kan de oefeningen niet openen (geen Web Crypto). Open de pagina via https.";
      return;
    }
    if (location.protocol === "file:") volgBouw();
    // Het manifest van mathesis.study, zodat ook deze pagina de site als app
    // kan installeren; een lokaal bestand mag het niet laden.
    var manifest = document.querySelector('meta[name="mathesis-manifest"]');
    if (manifest && /^https?:$/.test(location.protocol)) {
      var ml = document.createElement("link");
      ml.rel = "manifest";
      ml.href = manifest.content;
      document.head.appendChild(ml);
    }
    var bewaard = lees("gt:sleutel", "");
    var poging = bewaard ? Promise.resolve().then(function () { return open(naarBytes(bewaard)); })
                         : Promise.reject(new Error("geen sleutel"));
    poging.then(begin, toonSlot);
  }

  function begin() {
    leesStatus();
    index.reeksen.forEach(function (r) {
      r.oefeningen.forEach(function (o) {
        var x = { reeks: r.nr, nr: o.nr, id: o.id, delen: o.delen };
        lijst.push(x);
        perAdres[r.nr + "/" + o.nr] = x;
      });
    });
    // De reekslijsten wijzen naar dezelfde ingangen als lijst.
    index.reeksen.forEach(function (r) {
      r.oefeningen = r.oefeningen.map(function (o) { return perAdres[r.nr + "/" + o.nr]; });
    });
    bouwSchil();
    document.addEventListener("keydown", toetsen);
    // Een status kan ook veranderen door een antwoord te openen.
    document.addEventListener("gt:status", function () {
      if (!huidig) return;
      el.vulOverzicht();
      el.inhoud.querySelectorAll(".gt-status").forEach(function (g) { g.gtZet(); });
    });
    vegen();
    root.addEventListener("hashchange", function () { toon(); root.scrollTo(0, 0); });
    var klok = null;
    root.addEventListener("resize", function () {
      clearTimeout(klok);
      klok = setTimeout(function () { if (huidig) zichtbaar(el.inhoud); }, 150);
    });
    toon();
  }

  // Na een nieuwe bouw herlaadt de pagina; de status en het adres blijven.
  function volgBouw() {
    setInterval(function () {
      var s = document.createElement("script");
      s.src = "stempel.js?t=" + Date.now();
      s.onload = s.onerror = function () { s.remove(); };
      document.head.appendChild(s);
    }, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);
