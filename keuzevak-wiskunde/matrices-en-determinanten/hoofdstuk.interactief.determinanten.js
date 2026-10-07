/* Interactieve grafieken bij L03_Determinanten.tex.
 *
 * Een determinant is één getal, maar dat getal komt uit een recept: schrappen,
 * een teken kiezen, vermenigvuldigen, optellen. Op papier staat dat recept in
 * zijn eindstand, en een leerling die het zelf probeert, weet niet waar hij
 * de draad kwijt is. Hier voert de leerling het recept stap voor stap uit en
 * ziet hij bij elke stap welke elementen meedoen. Twee grafieken tonen de
 * determinant ook als oppervlakte, zodat de eigenschappen een beeld krijgen.
 *
 * Elke matrix is een HTML-raster met echte knoppen tussen haken of strepen,
 * en elke formule staat in MathJax, zoals bij det-minor; de figuren met een
 * assenstelsel zetten hun formules in een tekstvak naast het bord. Kleine
 * hulpjes komen uit web/matrixbord.js, samen met L01_Matrices. Dezelfde
 * grafieken staan ook in het keuzevak Matrices en
 * determinanten, dat dit bestand via een link als deelmodule inleest; de
 * namen beginnen daarom allemaal met det-, zodat ze niet botsen met die van
 * L01.
 *
 * mkpi: gebruikt matrixbord.js
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var M = window.Matrixbord;
  if (!G || !M) return;

  var ONDER = M.ONDER;
  var index = M.index;
  var el = M.el;
  var net = M.net;
  var haakjes = M.haakjes;
  var matrixBord = M.matrixBord;

  /* --- Kleine hulpjes ---------------------------------------------------- */

  function sub(n) { return index(n, ONDER); }
  function minorNaam(i, j) { return "M" + sub(i) + sub(j); }
  function cofactorNaam(i, j) { return "A" + sub(i) + sub(j); }
  function teken(i, j) { return (i + j) % 2 === 0 ? 1 : -1; }

  function getal(x) { return net(String(x)); }

  // Regels als lopende tekst voor ctx.toon: elke regel wordt een zin, ook
  // als ze zonder punt eindigt.
  function zinnen(regels) {
    return regels.filter(Boolean).map(function (r) {
      r = r.trim();
      return /[.?:!]$/.test(r) ? r : r + ".";
    }).join(" ");
  }

  function kopie(A) {
    return A.map(function (rij) { return rij.slice(); });
  }

  // Schrap rij i en kolom j (vanaf 1 geteld).
  function minor(A, i, j) {
    var uit = [];
    for (var r = 0; r < A.length; r++) {
      if (r === i - 1) continue;
      var rij = [];
      for (var k = 0; k < A.length; k++) if (k !== j - 1) rij.push(A[r][k]);
      uit.push(rij);
    }
    return uit;
  }

  function det(A) {
    if (A.length === 1) return A[0][0];
    if (A.length === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    var s = 0;
    for (var j = 1; j <= A.length; j++) {
      if (A[0][j - 1] !== 0) s += teken(1, j) * A[0][j - 1] * det(minor(A, 1, j));
    }
    return s;
  }

  function cofactor(A, i, j) { return teken(i, j) * det(minor(A, i, j)); }

  // Welke rij of kolom van het origineel hoort bij rij r van de minor
  // zonder rij i?
  function origineel(r, geschrapt) { return r < geschrapt ? r : r + 1; }

  // Een willekeurige vierkante matrix met kleine gehele getallen en minstens
  // één nul, zodat er altijd iets te kiezen valt.
  function willekeurig(n) {
    var A;
    do {
      A = [];
      for (var i = 0; i < n; i++) {
        A.push([]);
        for (var j = 0; j < n; j++) A[i].push(Math.floor(Math.random() * 11) - 5);
      }
      A[Math.floor(Math.random() * n)][Math.floor(Math.random() * n)] = 0;
    } while (Math.abs(det(A)) > 150);
    return A;
  }

  // Een knop die aan of uit staat, zoals Tekenpatroon.
  function schakel(knop, aan) {
    knop.setAttribute("aria-pressed", String(!!aan));
  }

  // Letters en Voorbeeld als één schakelaar met twee standen, die elkaar
  // uitsluiten. kies(letters) zet de figuur in die stand. Wijzig A hoort
  // enkel bij de getallen: een knop in s.wijzig staat bij Letters uit.
  // s.stand(letters) zet enkel de knoppen, voor een Reset die zelf hertekent.
  function letterSchakelaar(ctx, kies) {
    var s = {};
    var letterKnop = ctx.knop("Letters", function () { s.stand(true); kies(true); });
    var voorbeeldKnop = ctx.knop("Voorbeeld", function () { s.stand(false); kies(false); });
    var groep = document.createElement("span");
    groep.className = "interactieve-grafiek-schakelaar";
    groep.setAttribute("role", "group");
    groep.setAttribute("aria-label", "Weergave van A");
    letterKnop.parentNode.insertBefore(groep, letterKnop);
    groep.appendChild(letterKnop);
    groep.appendChild(voorbeeldKnop);
    s.stand = function (letters) {
      schakel(letterKnop, letters);
      schakel(voorbeeldKnop, !letters);
      if (s.wijzig) s.wijzig.disabled = letters;
    };
    s.stand(false);
    return s;
  }

  /* --- Wiskunde in LaTeX ------------------------------------------------- */

  // Een getal als factor: een negatief getal tussen haakjes, 4\cdot(-3).
  function fac(x) { return x < 0 ? "(" + x + ")" : String(x); }
  function elTex(i, j) { return "a_{" + i + j + "}"; }
  function minTex(i, j) { return "M_{" + i + j + "}"; }
  function cofTex(i, j) { return "A_{" + i + j + "}"; }
  function lijnTex(soort, n) { return (soort === "R" ? "R" : "K") + "_{" + n + "}"; }
  function tekenMachtTex(i, j) { return "(-1)^{" + i + "+" + j + "}"; }

  // Een stuk formule in de kleur van een rol: \class zet een CSS-klasse in
  // de SVG van MathJax, en de klasse volgt de dag- en nachtstand.
  function kleurTex(rol, s) { return "\\class{det-" + rol + "}{" + s + "}"; }

  function rijenTex(rijen) {
    return rijen.map(function (rij) { return rij.join("&"); }).join("\\\\");
  }
  function vmat(rijen) { return "\\begin{vmatrix}" + rijenTex(rijen) + "\\end{vmatrix}"; }
  function pmat(rijen) { return "\\begin{pmatrix}" + rijenTex(rijen) + "\\end{pmatrix}"; }

  // Een som zoals je ze opschrijft: 12-12+4, niet 12+(-12)+4.
  function somTex(getallen) {
    return getallen.map(function (x, k) {
      if (k === 0) return String(x);
      return (x < 0 ? "-" : "+") + Math.abs(x);
    }).join("");
  }

  // Een 2×2-determinant uitgeschreven: p\cdot s-q\cdot r.
  function kruisTex(m) {
    return fac(m[0][0]) + "\\cdot " + fac(m[1][1]) + "-" +
      fac(m[0][1]) + "\\cdot " + fac(m[1][0]);
  }

  // Het teken van de cofactor toegepast op de waarde m van de minor:
  // +M wordt m, -M wordt -m, met -(-6) = 6 uitgeschreven.
  function tekenUitTex(t, m) {
    if (t > 0) return String(m);
    return m < 0 ? "-(" + m + ")=" + (-m) : String(-m);
  }

  // Tekst met wiskunde als gewone zin voor ctx.toon, die een schermlezer
  // voorleest: R_1 \leftarrow 2R_1 wordt R1 ← 2R1.
  var PLAT = {
    leftarrow: " ← ", leftrightarrow: " ↔ ", cdot: "·", det: "det ", ldots: "…",
    mathsf: "", text: "", operatorname: "", vec: ""
  };
  function plat(s) {
    return String(s)
      .replace(/\\[()]/g, "")
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
      .replace(/\^\{([^{}]*)\}/g, "^($1)")
      .replace(/\\([a-zA-Z]+)/g, function (heel, w) { return w in PLAT ? PLAT[w] : w; })
      .replace(/\\[,;! ]/g, " ")
      .replace(/[_{}]/g, "")
      .replace(/-/g, "−")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Regels van een afleiding, uitgelijnd op het gelijkteken. Inline met
  // \displaystyle: een display-formule laat presentatie.js bij elke klik de
  // randen van de hele slide opnieuw meten.
  function uitgelijnd(regels) {
    regels = regels.filter(Boolean);
    if (!regels.length) return "";
    return "\\(\\displaystyle\\begin{aligned}" + regels.join("\\\\[0.35em]") +
      "\\end{aligned}\\)";
  }

  /* --- HTML-matrices en formules ----------------------------------------- */

  // MathJax zet na elkaar: een snelle reeks klikken mag geen verouderde
  // formule achterlaten. Een beurt die al ingehaald is, valt weg, en van de
  // rest wordt enkel vervangen wat echt veranderde. paren is een lijst van
  // [element, tekst]; de tekst mag \(...\) bevatten. Alle zetters van dit
  // bestand delen één wachtrij, want MathJax zet niet twee keer tegelijk.
  var wachtrij = Promise.resolve();
  function maakZetter() {
    var generatie = 0;
    return function (paren) {
      var nummer = ++generatie;
      wachtrij = wachtrij.then(function () {
        if (nummer !== generatie) return;
        var nieuw = paren.filter(function (p) { return p[0].detBron !== p[1]; });
        if (!nieuw.length) return;
        var MJ = window.MathJax;
        if (!MJ || !MJ.typesetPromise) {
          nieuw.forEach(function (p) {
            p[0].detBron = p[1];
            p[0].innerHTML = zonderBreuk(p[1]);
          });
          return;
        }
        // Eerst onzichtbaar zetten, in een kopie naast het doel met dezelfde
        // opmaak, en pas dan de inhoud wisselen: anders staat de ruwe LaTeX
        // een ogenblik in beeld en verspringt alles eromheen.
        var kopieen = nieuw.map(function (p) {
          var k = p[0].cloneNode(false);
          k.removeAttribute("id");
          k.setAttribute("aria-hidden", "true");
          k.style.position = "absolute";
          k.style.visibility = "hidden";
          k.style.left = "0";
          k.style.top = "0";
          k.innerHTML = zonderBreuk(p[1]);
          p[0].parentNode.appendChild(k);
          return k;
        });
        return MJ.typesetPromise(kopieen).then(function () {
          if (MJ.typesetClear) MJ.typesetClear(nieuw.map(function (p) { return p[0]; }));
          nieuw.forEach(function (p, n) {
            p[0].detBron = p[1];
            p[0].textContent = "";
            while (kopieen[n].firstChild) p[0].appendChild(kopieen[n].firstChild);
            kopieen[n].remove();
          });
        }, function (fout) {
          kopieen.forEach(function (k) { k.remove(); });
          throw fout;
        });
      }).catch(function (fout) { console.error(fout); });
      return wachtrij;
    };
  }

  // Een leesteken na een formule hoort bij die formule: zonder deze omhulling
  // breekt de browser de regel soms vlak voor de dubbele punt.
  function zonderBreuk(tekst) {
    var html = String(tekst).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return html.replace(/(\\\((?:(?!\\\))[\s\S])*\\\))([.,:;?!)]+)/g,
      '<span class="det-heel">$1$2</span>');
  }

  function div(klasse) {
    var d = document.createElement("div");
    d.className = klasse;
    return d;
  }

  // De laag over het (lege) bord waarin een figuur haar matrices en formules
  // zet, zoals bij det-minor.
  function maakLaag(ctx, klasse) {
    matrixStijl();
    matrixBord(ctx);
    var laag = div("det-tekenpatroon" + (klasse ? " " + klasse : ""));
    ctx.element.appendChild(laag);
    pasLaagAan(ctx, laag);
    return laag;
  }

  // Meet de volledige HTML-uitwerking, ook na het zetten van MathJax.
  // Verklein alleen als ze niet past; zo blijft alles zichtbaar zonder een
  // tweede scrollvlak binnen de interactieve figuur.
  function pasLaagAan(ctx, laag) {
    var gepland = false;
    function pas() {
      gepland = false;
      var w = ctx.element.clientWidth, h = ctx.element.clientHeight;
      if (!w || !h) return;
      laag.style.width = w + "px";
      laag.style.minHeight = h + "px";
      var breedte = Math.max(w, laag.scrollWidth);
      var hoogte = Math.max(h, laag.scrollHeight);
      var schaal = Math.min(1, w / breedte, h / hoogte);
      laag.style.transform = "translateX(" + ((w - breedte * schaal) / 2) +
        "px) scale(" + schaal + ")";
    }
    function plan() {
      if (gepland) return;
      gepland = true;
      requestAnimationFrame(pas);
    }
    if (window.ResizeObserver) {
      var meter = new ResizeObserver(plan);
      meter.observe(ctx.element);
      meter.observe(laag);
    }
    new MutationObserver(plan).observe(laag, { childList: true, subtree: true });
    plan();
  }

  // Haken rond een raster van vakjes, gezet door MathJax zoals in een
  // pmatrix of vmatrix: \left( en \right) rond een onzichtbare staaf zo hoog
  // als het raster. Verandert het raster van hoogte (een andere orde, Groot,
  // een smaller scherm), dan worden de haken opnieuw gezet. soort is
  // "haken", "strepen" of "geen".
  function maakHaken(raster, soort) {
    var omhulsel = div("det-haken");
    if (soort === "geen") {
      omhulsel.appendChild(raster);
      return omhulsel;
    }
    var links = div("det-haak"), rechts = div("det-haak");
    omhulsel.appendChild(links);
    omhulsel.appendChild(raster);
    omhulsel.appendChild(rechts);
    var teken = soort === "strepen" ? ["|", "|"] : ["(", ")"];
    var zet = maakZetter();
    var hoogte = 0;
    function pas() {
      var h = raster.getBoundingClientRect().height;
      if (!h || Math.abs(h - hoogte) < 1) return;
      hoogte = h;
      // De staaf staat symmetrisch rond de as van de formule (0.25em), zodat
      // de haak rond het midden van het raster komt.
      var half = h / parseFloat(window.getComputedStyle(links).fontSize) / 2;
      var staaf = "\\Rule{0em}{" + (half + 0.25).toFixed(2) + "em}{" +
        (half - 0.25).toFixed(2) + "em}";
      zet([[links, "\\(\\left" + teken[0] + staaf + "\\right.\\)"],
           [rechts, "\\(\\left." + staaf + "\\right" + teken[1] + "\\)"]]).then(function () {
        // MathJax rekent met zijn eigen ex; de laatste kleine afwijking
        // vangt de hoogte van de SVG op.
        [links, rechts].forEach(function (haak) {
          var svg = haak.querySelector("svg");
          if (!svg) return;
          svg.style.height = hoogte + "px";
          svg.style.width = "auto";
          svg.style.verticalAlign = "top";
        });
      });
    }
    if (window.ResizeObserver) new window.ResizeObserver(pas).observe(raster);
    else window.requestAnimationFrame(pas);
    return omhulsel;
  }

  // Een matrix als raster van echte knoppen tussen haken, tussen strepen
  // (een determinant) of zonder rand. Met o.klik(r, k) is elk vakje een knop
  // met een label voor rij en kolom; zonder klik is het een vakje om te
  // lezen. De orde mag veranderen: m.bouw(rijen, kolommen) legt het raster
  // opnieuw. De inhoud gaat via de zetter (m.paren), de stand van elk vakje
  // meteen (m.stand).
  function htmlMatrix(o) {
    var m = { raster: div("det-tekenmatrix"), R: 0, K: 0, vakjes: [] };
    if (o.klasse) m.raster.classList.add(o.klasse);
    m.element = maakHaken(m.raster, o.haken || "haken");
    m.bouw = function (rijen, kolommen) {
      if (rijen === m.R && kolommen === m.K) return;
      if (window.MathJax && window.MathJax.typesetClear) {
        window.MathJax.typesetClear([m.raster]);
      }
      m.R = rijen;
      m.K = kolommen;
      m.raster.textContent = "";
      m.raster.style.gridTemplateColumns = "repeat(" + kolommen + ",var(--det-cel))";
      m.vakjes = [];
      for (var r = 1; r <= rijen; r++) {
        for (var k = 1; k <= kolommen; k++) {
          (function (r, k) {
            var vak;
            if (o.klik) {
              vak = document.createElement("button");
              vak.type = "button";
              vak.setAttribute("aria-label", "Rij " + r + ", kolom " + k);
              vak.addEventListener("click", function () { o.klik(r, k); });
            } else {
              vak = document.createElement("span");
            }
            vak.className = "det-vak";
            vak.dataset.rij = r;
            vak.dataset.kolom = k;
            m.raster.appendChild(vak);
            m.vakjes.push(vak);
          }(r, k));
        }
      }
    };
    // inhoud(r, k): een getal, een tekst of \(...\) voor wiskunde.
    m.paren = function (inhoud) {
      return m.vakjes.map(function (vak) {
        var tekst = String(inhoud(+vak.dataset.rij, +vak.dataset.kolom));
        vak.classList.toggle("det-letters", tekst.indexOf("\\(") >= 0);
        return [vak, tekst];
      });
    };
    // stand(r, k) geeft { gekozen, vaag, merk: "punt" | "secante", teken }.
    m.stand = function (stand) {
      m.vakjes.forEach(function (vak) {
        var s = stand(+vak.dataset.rij, +vak.dataset.kolom) || {};
        if (o.klik) vak.setAttribute("aria-pressed", String(!!s.gekozen));
        vak.classList.toggle("det-gekozen", !!s.gekozen);
        vak.classList.toggle("det-vaag", !!s.vaag);
        vak.classList.toggle("det-merk-punt", s.merk === "punt");
        vak.classList.toggle("det-merk-secante", s.merk === "secante");
        if (s.teken) vak.dataset.teken = s.teken; else delete vak.dataset.teken;
      });
    };
    m.vak = function (r, k) { return m.vakjes[(r - 1) * m.K + (k - 1)]; };
    if (o.rijen) m.bouw(o.rijen, o.kolommen);
    return m;
  }

  // Een matrix met haar naam ervoor, zoals A = (...) of \det A = |...|.
  function matrixGroep(matrix, naam) {
    var g = div("det-matrixgroep");
    g.naam = div("det-matrixnaam");
    g.appendChild(g.naam);
    g.appendChild(matrix.element);
    g.naamTex = naam || "";
    return g;
  }

  // Een paar regels tekst met wiskunde erin. Een lege regel valt weg.
  function tekstRegels(ouder, aantal) {
    var regels = [];
    for (var k = 0; k < aantal; k++) {
      var p = document.createElement("p");
      ouder.appendChild(p);
      regels.push(p);
    }
    return regels;
  }

  // Een tekstvak met formules op een bord met een assenstelsel, breedte
  // pixels breed. Het staat op de plaats die schikBord vrijhoudt en laat de
  // muis door naar het bord eronder. soorten zegt wat er onder elkaar staat:
  // "f" een formule, "t" een regel tekst. p.schik() legt bord en vak samen
  // neer, p.zet(teksten) vult de delen in die volgorde.
  function maakPaneel(ctx, bord, plot, soorten, breedte, hoogte) {
    matrixStijl();
    var p = div("det-paneel");
    var delen = soorten.map(function (s) {
      var d = div(s === "f" ? "det-cofactorstappen" : "det-tekst");
      p.appendChild(d);
      return d;
    });
    ctx.element.appendChild(p);
    var zet = maakZetter();
    p.schik = function () {
      var vak = schikBord(bord, plot, breedte, hoogte);
      bord.fullUpdate();
      var c = new window.JXG.Coords(window.JXG.COORDS_BY_USER, vak, bord);
      var x = c.scrCoords[1], y = c.scrCoords[2];
      var w = Math.min(breedte, bord.canvasWidth - 12);
      // Naast het vlak staat het vak verticaal in het midden, op de hoogte
      // die het vak ooit nodig had: zo springt het niet bij elke stap.
      // Eronder staat het horizontaal in het midden.
      if (vak.naast) y = Math.max(6, (bord.canvasHeight - hoogte) / 2);
      else x = (bord.canvasWidth - w) / 2;
      p.style.left = Math.round(x) + "px";
      p.style.top = Math.round(y) + "px";
      p.style.width = w + "px";
    };
    // Valt het vak hoger uit dan gedacht, dan krijgt het meer plaats. Het bord
    // schuift dus enkel wanneer het vak groeit.
    p.zet = function (teksten) {
      return zet(teksten.map(function (t, k) { return [delen[k], t]; })).then(function () {
        if (p.offsetHeight > hoogte + 1) {
          hoogte = p.offsetHeight;
          p.schik();
        }
      });
    };
    return p;
  }

  // Een sleepbaar roosterpunt dat binnen het bord blijft. De naam is LaTeX,
  // zoals \vec v_1 of P_1.
  function roosterpunt(ctx, bord, xy, naam, rol, grens) {
    var p = ctx.stijl(bord.create("point", xy, {
      name: "\\(" + naam + "\\)", size: 4, showInfobox: false,
      snapToGrid: true, snapSizeX: 1, snapSizeY: 1,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [8, 12], useMathJax: true, fontSize: 18 }
    }), rol);
    p.on("drag", function () {
      var x = Math.max(grens[0], Math.min(grens[2], Math.round(p.X())));
      var y = Math.max(grens[3], Math.min(grens[1], Math.round(p.Y())));
      if (x !== p.X() || y !== p.Y()) {
        p.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
      }
    });
    return p;
  }

  // Een rooster met stap 1 en zonder fijnere lijnen: zo kan de leerling de
  // eenheidsvierkanten tellen en de oppervlakte zelf nagaan.
  function eenheidsrooster(ctx, bord) {
    return ctx.stijl(bord.create("grid", [], {
      majorStep: 1, minorElements: 0, strokeOpacity: 1, fixed: true, highlight: false
    }), "raster");
  }

  // Een assenstelsel met gelijke schaal en een tekstvak ernaast. JSXGraph
  // houdt bij gelijke schaal de hoogte vast en knipt anders links en rechts
  // een stuk van het vlak af. Hier kiezen we zelf het venster: het hele
  // vlak (plot = [links, boven, rechts, onder]) blijft zichtbaar, en het
  // tekstvak (pw bij ph pixels) komt ernaast op een breed bord en eronder op
  // een smal. Het resultaat is de plaats van de linkerbovenhoek van het vak.
  function schikBord(bord, plot, pw, ph) {
    var w = bord.canvasWidth, h = bord.canvasHeight;
    var dx = plot[2] - plot[0], dy = plot[1] - plot[3];
    if (!w || !h) return [plot[2], plot[1]];
    var marge = 12;
    var naast = Math.min((w - pw - marge) / dx, h / dy);
    var onder = Math.min(w / dx, (h - ph - marge) / dy);
    var s = Math.max(Math.max(naast, onder), 4);
    var breed = w / s, hoog = h / s;
    var box, vak;
    if (naast >= onder) {
      var links = plot[0] - (breed - dx - (pw + marge) / s) / 2;
      var boven = plot[1] + (hoog - dy) / 2;
      box = [links, boven, links + breed, boven - hoog];
      vak = [plot[2] + marge / s, plot[1]];
      vak.naast = true;
    } else {
      var boven2 = plot[1] + (hoog - dy - (ph + marge) / s) / 2;
      var links2 = plot[0] - (breed - dx) / 2;
      box = [links2, boven2, links2 + breed, boven2 - hoog];
      vak = [plot[0], plot[3] - marge / s];
    }
    bord.presBegrenzing = box;
    bord.presGelijkeSchaal = true;
    try { bord.setBoundingBox(box, true); } catch (fout) { /* niets */ }
    return vak;
  }

  function zetPunt(p, xy) {
    p.setPosition(window.JXG.COORDS_BY_USER, xy);
  }

  /* --- 1. De determinant als oppervlakte --------------------------------- */

  // De kolommen van een 2×2-matrix zijn twee vectoren. De leerling versleept
  // hun eindpunten en ziet det A en de oppervlakte van het parallellogram
  // samen veranderen, met het teken als oriëntatie. In de variant met
  // eigenschappen doen de knoppen de kolombewerkingen uit het hoofdstuk, en
  // zie je waarom het teken omkeert, de determinant verdubbelt of net gelijk
  // blijft.
  function oppervlakteFiguur(ctx, opties) {
    // Elke vector blijft binnen GRENS, en ook het vierde hoekpunt v₁ + v₂
    // blijft in het vlak, zodat het parallellogram nooit onder het tekstvak
    // verdwijnt.
    var GRENS = [-4, 5, 6, -3];
    var HOEK = [-5, 6, 7, -3];
    var BEGIN = [[3, 0], [1, 2]];
    var PLOT = [-5.6, 6.6, 7.6, -3.6];
    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var st = { vorige: null };
    var paneel = maakPaneel(ctx, bord, PLOT, ["f", "t", "t"], 330,
      opties.eigenschappen ? 300 : 200);
    var schik = paneel.schik;

    var O = bord.create("point", [0, 0], { visible: false, fixed: true, name: "" });
    var v1 = roosterpunt(ctx, bord, BEGIN[0], "\\vec v_1", "punt", GRENS);
    var v2 = roosterpunt(ctx, bord, BEGIN[1], "\\vec v_2", "secante", GRENS);
    var S = bord.create("point", [
      function () { return v1.X() + v2.X(); },
      function () { return v1.Y() + v2.Y(); }
    ], { visible: false, fixed: true, name: "" });

    function waarde() {
      return Math.round(v1.X() * v2.Y() - v2.X() * v1.Y());
    }

    // Het vlak kleurt groen bij een positieve en oranje bij een negatieve
    // determinant; de tekst ernaast zegt hetzelfde in woorden.
    bord.create("polygon", [O, v1, S, v2], {
      fixed: true, highlight: false, fillOpacity: 0.28, layer: 0,
      fillColor: function () {
        return waarde() >= 0 ? kleuren.afgeleide : kleuren.secante;
      },
      borders: { strokeWidth: 1, dash: 2, strokeColor: function () { return kleuren.hulp; } },
      vertices: { visible: false }
    });
    ctx.stijl(bord.create("arrow", [O, v1], { strokeWidth: 3, fixed: true, highlight: false }), "punt");
    ctx.stijl(bord.create("arrow", [O, v2], { strokeWidth: 3, fixed: true, highlight: false }), "secante");

    // Een boogje van v₁ naar v₂ langs de kortste weg: tegen de wijzers van
    // de klok in bij een positieve determinant, met de wijzers mee bij een
    // negatieve.
    function opBoog(v) {
      return function () {
        var r = Math.sqrt(v.X() * v.X() + v.Y() * v.Y()) || 1;
        return [0.9 * v.X() / r, 0.9 * v.Y() / r];
      };
    }
    var b1 = bord.create("point", [function () { return opBoog(v1)()[0]; },
      function () { return opBoog(v1)()[1]; }], { visible: false, fixed: true, name: "" });
    var b2 = bord.create("point", [function () { return opBoog(v2)()[0]; },
      function () { return opBoog(v2)()[1]; }], { visible: false, fixed: true, name: "" });
    ctx.stijl(bord.create("arc", [O, b1, b2], {
      strokeWidth: 1.5, lastArrow: { type: 2, size: 6 }, fixed: true, highlight: false,
      visible: function () { return waarde() > 0; }
    }), "tekst");
    ctx.stijl(bord.create("arc", [O, b2, b1], {
      strokeWidth: 1.5, firstArrow: { type: 2, size: 6 }, fixed: true, highlight: false,
      visible: function () { return waarde() < 0; }
    }), "tekst");

    function werkPaneelBij() {
      var a = Math.round(v1.X()), c = Math.round(v1.Y());
      var b = Math.round(v2.X()), d = Math.round(v2.Y());
      var D = waarde();
      function p(x) { return kleurTex("punt", x); }
      function s(x) { return kleurTex("secante", x); }
      var formule = uitgelijnd([
        "A&=(" + p("\\vec v_1") + "\\ \\ " + s("\\vec v_2") + ")=" +
          pmat([[p(a), s(b)], [p(c), s(d)]]),
        "\\det A&=" + vmat([[p(a), s(b)], [p(c), s(d)]]) + "=" + fac(a) + "\\cdot " +
          fac(d) + "-" + fac(b) + "\\cdot " + fac(c) + "=" + D,
        "\\text{oppervlakte}&=|\\det A|=" + Math.abs(D)
      ]);
      var zin;
      if (D > 0) {
        zin = "\\(\\det A>0\\): van \\(\\vec v_1\\) naar \\(\\vec v_2\\) draai je tegen de " +
          "wijzers van de klok in.";
      } else if (D < 0) {
        zin = "\\(\\det A<0\\): van \\(\\vec v_1\\) naar \\(\\vec v_2\\) draai je met de " +
          "wijzers van de klok mee.";
      } else {
        zin = "\\(\\det A=0\\): \\(\\vec v_1\\) en \\(\\vec v_2\\) liggen op één rechte, " +
          "er is geen parallellogram.";
      }
      paneel.zet([formule, zin, st.vorige ? st.vorige.tex : ""]);
    }

    function beschrijving() {
      var D = waarde();
      return "v1 = (" + getal(Math.round(v1.X())) + ", " + getal(Math.round(v1.Y())) +
        ") en v2 = (" + getal(Math.round(v2.X())) + ", " + getal(Math.round(v2.Y())) +
        "). det A = " + getal(D) + ", de oppervlakte van het parallellogram is " +
        Math.abs(D) + "." + (st.vorige ? " " + st.vorige.tekst : "");
    }
    bord.on("update", function () {
      werkPaneelBij();
      ctx.toon(beschrijving());
    });
    function binnen(p, grens) {
      var g = grens || GRENS;
      return p[0] >= g[0] && p[0] <= g[2] && p[1] >= g[3] && p[1] <= g[1];
    }

    // Het laatste goede roosterpunt van elke vector: valt v₁ + v₂ buiten het
    // vlak, dan springt de gesleepte vector daarheen terug.
    var goed = [BEGIN[0], BEGIN[1]];
    bord.on("update", function () {
      if (binnen([S.X(), S.Y()], HOEK)) {
        goed = [[Math.round(v1.X()), Math.round(v1.Y())],
                [Math.round(v2.X()), Math.round(v2.Y())]];
      }
    });
    [v1, v2].forEach(function (v, k) {
      v.on("drag", function () {
        st.vorige = null;
        if (!binnen([S.X(), S.Y()], HOEK)) zetPunt(v, goed[k]);
      });
    });

    // Een kolombewerking: nieuwe v₁ en v₂, en in woorden wat er met de
    // determinant gebeurt. naam is LaTeX, uitleg tekst met wiskunde erin.
    function bewerk(naam, f, uitleg) {
      var oud = waarde();
      var p = [Math.round(v1.X()), Math.round(v1.Y())];
      var q = [Math.round(v2.X()), Math.round(v2.Y())];
      var nieuw = f(p, q);
      var hoek = [nieuw[0][0] + nieuw[1][0], nieuw[0][1] + nieuw[1][1]];
      if (!binnen(nieuw[0]) || !binnen(nieuw[1]) || !binnen(hoek, HOEK)) {
        st.vorige = {
          tex: "\\(" + naam + "\\) past niet meer op het bord. Maak \\(\\vec v_1\\) en " +
            "\\(\\vec v_2\\) eerst wat korter.",
          tekst: "Die bewerking past niet meer op het bord."
        };
      } else {
        zetPunt(v1, nieuw[0]);
        zetPunt(v2, nieuw[1]);
        st.vorige = {
          tex: "\\(" + naam + "\\): \\(\\det A\\) gaat van \\(" + oud + "\\) naar \\(" +
            waarde() + "\\). " + uitleg,
          tekst: "De determinant gaat van " + getal(oud) + " naar " + getal(waarde()) + "."
        };
      }
      bord.update();
    }

    var knoppen = [];
    function bewerking(naam, f, uitleg) {
      var knop = ctx.knop(naam, function () { bewerk(naam, f, uitleg); });
      knoppen.push([knop, "\\(" + naam + "\\)"]);
    }
    if (opties.eigenschappen) {
      bewerking("K_1\\leftrightarrow K_2", function (p, q) { return [q, p]; },
        "Kolommen gewisseld: de draaizin keert om, dus ook het teken. De oppervlakte blijft.");
      bewerking("K_1\\leftarrow 2K_1", function (p, q) { return [[2 * p[0], 2 * p[1]], q]; },
        "Eén kolom maal \\(2\\): het parallellogram wordt twee keer zo lang, de determinant ook.");
      bewerking("K_1\\leftarrow -K_1", function (p, q) { return [[-p[0], -p[1]], q]; },
        "Eén kolom maal \\(-1\\): de oppervlakte blijft, de draaizin en dus het teken keren om.");
      bewerking("K_2\\leftarrow K_2+K_1", function (p, q) {
        return [p, [q[0] + p[0], q[1] + p[1]]];
      }, "Een kolom erbij opgeteld: het parallellogram schuift scheef, maar basis en hoogte " +
        "blijven. De determinant blijft gelijk.");
      bewerking("K_2\\leftarrow K_2-K_1", function (p, q) {
        return [p, [q[0] - p[0], q[1] - p[1]]];
      }, "Een kolom ervan afgetrokken: het parallellogram schuift terug. De determinant " +
        "blijft gelijk.");
      bewerking("A\\leftarrow 2A", function (p, q) {
        return [[2 * p[0], 2 * p[1]], [2 * q[0], 2 * q[1]]];
      }, "Beide kolommen maal \\(2\\): twee keer zo breed én twee keer zo hoog, dus " +
        "\\(\\det(2A)=2^2\\cdot\\det A\\).");
      maakZetter()(knoppen);
    }

    function herstel() {
      zetPunt(v1, BEGIN[0]);
      zetPunt(v2, BEGIN[1]);
      st.vorige = null;
      bord.update();
    }

    schik();
    werkPaneelBij();
    ctx.toon(beschrijving());
    return {
      reset: herstel,
      herschaal: schik,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  }

  G.registreer("det-oppervlakte", function (ctx) {
    return oppervlakteFiguur(ctx, {});
  });
  G.registreer("det-eigenschappen-meetkundig", function (ctx) {
    return oppervlakteFiguur(ctx, { eigenschappen: true });
  });

  /* --- 2. Minor en cofactor ---------------------------------------------- */

  // De opmaak van een aanklikbare matrix met een formule ernaast, gedeeld door
  // alle figuren met matrices. De grootte van een vakje is --det-cel; een
  // figuur met veel matrices naast elkaar neemt det-klein.
  function matrixStijl() {
    var stijlId = "det-tekenpatroon-stijl";
    if (!document.getElementById(stijlId)) {
      var stijl = document.createElement("style");
      stijl.id = stijlId;
      stijl.textContent = `
        .det-tekenpatroon { position:absolute; top:0; left:0; display:flex;
          box-sizing:border-box; transform-origin:top left;
          align-items:center; justify-content:safe center;
          gap:2rem 4.25rem; padding:2rem 1rem; overflow:visible;
          color:var(--grafiek-tekst); background:var(--grafiek-vlak); }
        .det-tekenpatroon.det-onder { flex-direction:column;
          justify-content:safe center; gap:1.25rem; padding:1.25rem 1rem; }
        .det-matrixnaam { flex-shrink:0; }
        .det-tekenpatroon.det-smal { gap:1.5rem 2.5rem; }
        .det-tekenpatroon.det-boven { justify-content:flex-start; padding-top:1rem; }
        .det-blad { width:min(40rem,100%); display:flex; flex-direction:column;
          align-items:flex-start; gap:.7rem; }
        .det-blad > .det-rij { justify-content:flex-start; flex-wrap:wrap; gap:.75rem 1.5rem; }
        .det-termvak { width:15rem; max-width:100%; display:flex; flex-direction:column;
          align-self:flex-start; padding-top:.6rem;
          gap:.6rem; }
        .det-tekenmatrix { --det-cel:3rem; display:grid;
          grid-template-columns:repeat(3,var(--det-cel)); gap:.35rem; padding:.4rem .15rem;
          flex-shrink:0; }
        .det-haken { display:flex; align-items:center; flex-shrink:0; }
        .det-haak { font-size:1.5rem; line-height:0; display:flex; align-items:center; }
        .det-haak mjx-container { display:block !important; margin:0 !important; }
        .det-tekenmatrix.det-klein { --det-cel:2.6rem; }
        .det-tekenmatrix button, .det-tekenmatrix .det-vak { font:inherit; font-size:2rem;
          width:var(--det-cel); height:var(--det-cel); padding:0; color:inherit;
          background:transparent; border:1px solid transparent; border-radius:.3rem;
          position:relative; display:flex; align-items:center; justify-content:center;
          box-sizing:border-box; white-space:nowrap; }
        .det-tekenmatrix.det-klein .det-vak { font-size:1.65rem; }
        .det-tekenmatrix button { cursor:pointer; }
        .det-tekenmatrix button[aria-pressed="true"], .det-tekenmatrix .det-gekozen {
          background:color-mix(in srgb, var(--grafiek-punt) 16%, transparent);
          color:var(--grafiek-punt); border-color:var(--grafiek-punt); }
        .det-tekenmatrix button:focus-visible { outline:3px solid var(--grafiek-punt); }
        .det-tekenmatrix .det-letters { font-size:1.35rem; }
        .det-tekenmatrix mjx-container { margin:0 !important; }
        .det-tekenmatrix .det-merk-punt {
          background:color-mix(in srgb, var(--grafiek-punt) 18%, transparent); }
        .det-tekenmatrix .det-merk-secante {
          background:color-mix(in srgb, var(--grafiek-secante) 24%, transparent); }
        .det-tekenmatrix .det-vaag { color:color-mix(in srgb, currentColor 28%, transparent); }
        .det-tekenmatrix [data-teken]::after { content:attr(data-teken); position:absolute;
          top:.05rem; right:.2rem; font-size:.95rem; line-height:1; font-weight:700;
          color:var(--grafiek-punt); }
        .det-tekenmatrix [data-teken="−"]::after { color:var(--grafiek-secante); }
        .det-matrixgroep { display:flex; flex-wrap:wrap; align-items:center;
          justify-content:center; gap:.5rem .9rem; flex-shrink:0; }
        .det-matrixnaam { font-size:1.5rem; }
        .det-matrixkolom { display:flex; flex-direction:column; align-items:center;
          gap:.5rem; flex-shrink:0; }
        .det-matrixkolom .det-matrixnaam { font-size:1.25rem; }
        .det-matrixnaam:empty { display:none; }
        .det-kolom { display:flex; flex-direction:column; gap:1rem; min-width:min(14rem,100%);
          max-width:100%; }
        .det-kolom > .det-tekst { width:0; min-width:100%; }
        .det-rij { display:flex; align-items:center; justify-content:center;
          flex-wrap:wrap; gap:1rem 1.25rem; }
        .det-cofactorstappen { font-size:1.25rem; min-width:0; max-width:100%; }
        .det-cofactorstappen:empty { display:none; }
        .det-cofactorstappen mjx-container { margin:0 !important; }
        .det-cofactorstappen mjx-script { font-size:85%; }
        .det-tekst { font-size:1rem; line-height:1.45; max-width:34rem; }
        .det-tekst p { margin:0 0 .4em; }
        .det-tekst p:last-child { margin-bottom:0; }
        .det-tekst p:empty { display:none; }
        .det-onder > .det-tekst { text-align:center; }
        .det-tekst .det-zwak, .det-cofactorstappen .det-zwak { color:var(--grafiek-zwak); }
        .det-heel { white-space:nowrap; }
        /* De verborgen MathML voor schermlezers is even breed als de formule
           en zou de laag anders horizontaal laten schuiven. */
        .det-tekenpatroon mjx-assistive-mml, .det-paneel mjx-assistive-mml {
          width:1px !important; height:1px !important; }
        .det-punt { color:var(--grafiek-punt); }
        .det-secante { color:var(--grafiek-secante); }
        .det-zwak { color:var(--grafiek-zwak); }
        .det-sarrusblok { position:relative; display:flex; align-items:center; gap:.2rem; }
        .det-sarrusuitlijning { display:grid; grid-template-columns:auto auto;
          align-items:center; row-gap:.6rem; }
        .det-sarruslinks { justify-self:end; }
        .det-sarrusrechts { display:flex; align-items:center; gap:.5rem; }
        .det-sarrusblok > svg { position:absolute; inset:0; width:100%; height:100%;
          overflow:visible; pointer-events:none; }
        .det-tekenmatrix .det-tweeling-punt { border:2px dashed var(--grafiek-punt); }
        .det-tekenmatrix .det-tweeling-secante { border:2px dashed var(--grafiek-secante); }
        .det-paneel { position:absolute; box-sizing:border-box; padding:.5rem .75rem;
          border-radius:4px; background:var(--kleur-vlak-zweef); color:var(--grafiek-tekst);
          pointer-events:none; display:flex; flex-direction:column; gap:.6rem; }
        .det-paneel .det-cofactorstappen { font-size:1.1rem; }
        .det-paneel .det-tekst { font-size:.95rem; }
        .det-paneel > :empty { display:none; }
        .interactieve-grafiek-knoppen button mjx-container { margin:0 !important; }
        .det-richting { display:inline-flex; align-items:center; gap:.4rem; }
        @media (max-width:650px) { .det-tekenpatroon { gap:1.5rem 2.25rem; padding:1.5rem .5rem; }
          .det-cofactorstappen { font-size:1.2rem; }
          .det-tekenmatrix { --det-cel:2.5rem; }
          .det-tekenmatrix.det-klein { --det-cel:2.2rem; }
          .det-tekenmatrix .det-vak { font-size:1.6rem; } }
        @media (max-width:450px) { .det-tekenpatroon { flex-direction:column;
          justify-content:safe center; gap:1.25rem; } }
      `;
      document.head.appendChild(stijl);
    }
  }

  G.registreer("det-tekenpatroon", function (ctx) {
    // Echte knoppen voor elk vakje; de formule krijgt gewone MathJax-notatie.
    // De HTML-laag houdt haar lettergrootte bij herschalen en in Groot.
    matrixBord(ctx);
    var i = 1, j = 1;
    var generatie = 0;
    matrixStijl();
    var laag = document.createElement("div");
    laag.className = "det-tekenpatroon";
    var matrix = document.createElement("div");
    matrix.className = "det-tekenmatrix";
    var formule = document.createElement("div");
    formule.className = "det-cofactorstappen";
    laag.appendChild(maakHaken(matrix, "haken"));
    laag.appendChild(formule);
    ctx.element.appendChild(laag);
    pasLaagAan(ctx, laag);
    var vakjes = [];
    for (var r = 1; r <= 3; r++) {
      for (var k = 1; k <= 3; k++) {
        (function (r, k) {
          var knop = document.createElement("button");
          knop.type = "button";
          knop.textContent = teken(r, k) > 0 ? "+" : "−";
          knop.dataset.rij = r;
          knop.dataset.kolom = k;
          knop.setAttribute("aria-label", "Rij " + r + ", kolom " + k);
          knop.addEventListener("click", function () { kies(r, k); });
          matrix.appendChild(knop);
          vakjes.push(knop);
        }(r, k));
      }
    }
    function werkBij() {
      vakjes.forEach(function (knop) {
        knop.setAttribute("aria-pressed", String(+knop.dataset.rij === i && +knop.dataset.kolom === j));
      });
      var nummer = ++generatie;
      var a = "A_{" + i + j + "}", m = "M_{" + i + j + "}";
      var regels = [
        "A_{ij}&=(-1)^{i+j}M_{ij}",
        a + "&=(-1)^{" + i + "+" + j + "}" + m,
        "&=(-1)^{" + (i + j) + "}" + m,
        "&=" + (teken(i,j) > 0 ? "+" : "-") + m
      ];
      // Serialiseer MathJax en sla achterhaalde klikken over.
      wachtrij = wachtrij.then(function () {
        if (nummer !== generatie) return;
        window.MathJax.typesetClear([formule]);
        // Inline met \displaystyle: een display-formule laat presentatie.js
        // bij elke klik de randen van de hele slide opnieuw meten.
        formule.textContent = "\\(\\displaystyle\\begin{aligned}" + regels.join("\\\\[0.35em]") +
          "\\end{aligned}\\)";
        return window.MathJax.typesetPromise([formule]);
      }).catch(function (fout) { console.error(fout); });
      ctx.toon("Rij i = " + i + ", kolom j = " + j + ": i + j = " + (i+j) +
        ((i+j)%2 === 0 ? " is even." : " is oneven."));
    }
    function kies(r, k) { i = r; j = k; werkBij(); }
    ctx.knop("Volgend teken", function () {
      kies(j < 3 ? i : i < 3 ? i+1 : 1, j < 3 ? j+1 : 1);
    });
    werkBij();
    return { reset: function () { kies(1, 1); } };
  });

  // Klik op een element: zijn rij en kolom vervagen en de minor staat ernaast
  // in gewone MathJax-notatie, eerst met letters en dan met getallen.
  G.registreer("det-minor", function (ctx) {
    matrixBord(ctx);
    matrixStijl();
    var n = 3;
    var A = kopie([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    var i = 3, j = 1;
    var generatie = 0;
    var letters = false;
    var laag = document.createElement("div");
    laag.className = "det-tekenpatroon";
    var matrix = document.createElement("div");
    matrix.className = "det-tekenmatrix";
    var formule = document.createElement("div");
    formule.className = "det-cofactorstappen";
    var naam = document.createElement("div");
    naam.className = "det-matrixnaam";
    naam.textContent = "\\(A=\\)";
    var links = document.createElement("div");
    links.className = "det-matrixgroep";
    links.appendChild(naam);
    links.appendChild(maakHaken(matrix, "haken"));
    laag.appendChild(links);
    laag.appendChild(formule);
    ctx.element.appendChild(laag);
    pasLaagAan(ctx, laag);
    var vakjes = [];
    for (var r = 1; r <= n; r++) {
      for (var k = 1; k <= n; k++) {
        (function (r, k) {
          var knop = document.createElement("button");
          knop.type = "button";
          knop.dataset.rij = r;
          knop.dataset.kolom = k;
          knop.setAttribute("aria-label", "Rij " + r + ", kolom " + k);
          knop.addEventListener("click", function () { kies(r, k); });
          matrix.appendChild(knop);
          vakjes.push(knop);
        }(r, k));
      }
    }
    function tex(x) { return x < 0 ? "(" + x + ")" : String(x); }
    function werkBij() {
      var m = minor(A, i, j);
      vakjes.forEach(function (knop) {
        var r = +knop.dataset.rij, k = +knop.dataset.kolom;
        knop.classList.toggle("det-letters", letters);
        knop.textContent = letters ? "\\(a_{" + r + k + "}\\)" : A[r - 1][k - 1];
        knop.setAttribute("aria-pressed", String(r === i && k === j));
        knop.style.opacity = (r === i || k === j) && !(r === i && k === j) ? "0.25" : "1";
      });
      var lettersRij = [], getallen = [];
      for (var r = 1; r <= 2; r++) {
        var l = [], g = [];
        for (var k = 1; k <= 2; k++) {
          l.push("a_{" + origineel(r, i) + origineel(k, j) + "}");
          g.push(m[r - 1][k - 1]);
        }
        lettersRij.push(l.join("&"));
        getallen.push(g.join("&"));
      }
      var regels = [
        "M_{" + i + j + "}&=\\begin{vmatrix}" + lettersRij.join("\\\\") + "\\end{vmatrix}"
      ];
      if (letters) {
        var w = function (r, k) { return "a_{" + origineel(r, i) + origineel(k, j) + "}"; };
        regels.push("&=" + w(1, 1) + w(2, 2) + "-" + w(1, 2) + w(2, 1));
      } else {
        regels.push(
          "&=\\begin{vmatrix}" + getallen.join("\\\\") + "\\end{vmatrix}",
          "&=" + tex(m[0][0]) + "\\cdot" + tex(m[1][1]) + "-" + tex(m[0][1]) + "\\cdot" +
            tex(m[1][0]) + "=" + det(m));
      }
      var nummer = ++generatie;
      // Serialiseer MathJax en sla achterhaalde klikken over.
      wachtrij = wachtrij.then(function () {
        if (nummer !== generatie) return;
        window.MathJax.typesetClear([formule, matrix]);
        formule.textContent = "\\(\\displaystyle\\begin{aligned}" + regels.join("\\\\[0.35em]") +
          "\\end{aligned}\\)";
        return window.MathJax.typesetPromise([formule, matrix]);
      }).catch(function (fout) { console.error(fout); });
      ctx.toon("Schrap rij " + i + " en kolom " + j + ": de minor " + minorNaam(i, j) +
        (letters ? " blijft over." : " is " + det(m) + "."));
    }
    function kies(r, k) { i = r; j = k; werkBij(); }
    ctx.knop("Volgend element", function () {
      kies(j < n ? i : i < n ? i + 1 : 1, j < n ? j + 1 : 1);
    });
    var weergave = letterSchakelaar(ctx, function (l) { letters = l; werkBij(); });
    weergave.wijzig = ctx.knop("Wijzig A", function () { A = willekeurig(n); werkBij(); });
    function herstel() {
      A = kopie([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
      i = 3;
      j = 1;
      letters = false;
      weergave.stand(false);
      werkBij();
    }
    wachtrij = wachtrij.then(function () {
      return window.MathJax.typesetPromise([naam]);
    }).catch(function (fout) { console.error(fout); });
    werkBij();
    return { reset: herstel };
  });

  // Klik op een element: zijn rij en kolom vervagen, en ernaast staat zijn
  // cofactor, het teken uit (−1)^(i+j) maal de minor. Het tekenpatroon kan
  // als schaakbord over de matrix. In de variant voor de adjunctmatrix
  // verzamel je de cofactoren in een eigen matrix en transponeer je die
  // daarna.
  function cofactorFiguur(ctx, opties) {
    var n = 3;
    var A = kopie(opties.begin);
    var st = { i: 0, j: 0, patroon: false, letters: false, adj: false, gedaan: {} };
    // Bij de adjunctmatrix staat de matrix van cofactoren naast A, en de
    // berekening van de gekozen cofactor eronder.
    var laag = maakLaag(ctx, opties.verzamel ? "det-onder" : "det-smal");
    var mA = htmlMatrix({
      rijen: n, kolommen: n, klasse: opties.verzamel ? "det-klein" : "",
      klik: function (r, k) { kies(r, k); }
    });
    var groep = matrixGroep(mA, "\\(A=\\)");
    var kolom = div("det-kolom");
    var formule = div("det-cofactorstappen");
    var verzameld = div("det-cofactorstappen");
    var tekst = div("det-tekst");
    var regels = tekstRegels(tekst, 1);
    kolom.appendChild(formule);
    kolom.appendChild(tekst);
    if (opties.verzamel) {
      var boven = div("det-rij");
      boven.appendChild(groep);
      boven.appendChild(verzameld);
      laag.appendChild(boven);
    } else {
      laag.appendChild(groep);
    }
    laag.appendChild(kolom);
    var zet = maakZetter();

    function gekozen() { return st.i > 0; }

    // A_ij = (−1)^(i+j) M_ij, met de minor als determinant uitgeschreven.
    // De adjunctfiguur heeft ook de matrix van cofactoren te tonen en zet
    // dezelfde stappen daarom op twee regels.
    function cofactorRegels() {
      var i = st.i, j = st.j, t = teken(i, j);
      var s = t > 0 ? "+" : "-";
      var M = minor(A, i, j);
      var mt = M.map(function (rij, r) {
        return rij.map(function (x, k) {
          return st.letters ? elTex(origineel(r + 1, i), origineel(k + 1, j)) : x;
        });
      });
      var kruis = st.letters
        ? mt[0][0] + mt[1][1] + "-" + mt[0][1] + mt[1][0]
        : kruisTex(M);
      var eind = st.letters ? "" : tekenUitTex(t, det(M));
      var begin = cofTex(i, j) + "&=" + tekenMachtTex(i, j) + "\\," + minTex(i, j);
      if (opties.verzamel) {
        return [begin + "=" + s + vmat(mt),
                "&=" + s + "(" + kruis + ")" + (eind ? "=" + eind : "")];
      }
      return [begin, "&=" + s + vmat(mt), "&=" + s + "(" + kruis + ")",
              eind ? "&=" + eind : ""];
    }

    // De matrix van de cofactoren die al berekend zijn; na Transponeer de
    // adjunctmatrix. De cofactor van het gekozen element licht op.
    function verzameldTex() {
      var rijen = [];
      for (var r = 1; r <= n; r++) {
        var rij = [];
        for (var k = 1; k <= n; k++) {
          var a = st.adj ? k : r, b = st.adj ? r : k;
          var c;
          if (st.letters) c = cofTex(a, b);
          else if (st.gedaan[a + "," + b]) c = String(cofactor(A, a, b));
          else c = kleurTex("zwak", cofTex(a, b));
          if (a === st.i && b === st.j) c = kleurTex("punt", c);
          rij.push(c);
        }
        rijen.push(rij);
      }
      return uitgelijnd([(st.adj ? "\\operatorname{adj}A&=" : "[A_{ij}]&=") + pmat(rijen)]);
    }

    function allesGedaan() {
      for (var i = 1; i <= n; i++) {
        for (var j = 1; j <= n; j++) if (!st.gedaan[i + "," + j]) return false;
      }
      return true;
    }

    function zin() {
      if (opties.verzamel && st.adj && allesGedaan() && !st.letters) {
        var D = det(A);
        if (D === 0) return "\\(\\det A=0\\): \\(A\\) heeft geen inverse matrix.";
        var breukTex = D < 0 ? "-\\frac{1}{" + (-D) + "}" : "\\frac{1}{" + D + "}";
        return "\\(\\det A=" + D + "\\), dus \\(A^{-1}=" + breukTex + "\\operatorname{adj}A\\).";
      }
      if (!gekozen()) return "Klik op een element van \\(A\\).";
      return "Schrap rij \\(" + st.i + "\\) en kolom \\(" + st.j + "\\) van \\(A\\): wat " +
        "overblijft, is de minor \\(" + minTex(st.i, st.j) + "\\).";
    }

    function werkBij() {
      mA.stand(function (r, k) {
        var dit = r === st.i && k === st.j;
        return {
          gekozen: dit,
          vaag: gekozen() && !dit && (r === st.i || k === st.j),
          teken: st.patroon ? (teken(r, k) > 0 ? "+" : "−") : ""
        };
      });
      var paren = mA.paren(function (r, k) {
        return st.letters ? "\\(" + elTex(r, k) + "\\)" : getal(A[r - 1][k - 1]);
      });
      paren.push([groep.naam, groep.naamTex]);
      paren.push([formule, uitgelijnd(gekozen() ? cofactorRegels()
        : ["A_{ij}&=(-1)^{i+j}\\,M_{ij}"])]);
      if (opties.verzamel) paren.push([verzameld, verzameldTex()]);
      paren.push([regels[0], zin()]);
      zet(paren);
      if (!gekozen()) {
        ctx.toon("Klik op een element van A.");
      } else {
        var m = det(minor(A, st.i, st.j));
        ctx.toon("Schrap rij " + st.i + " en kolom " + st.j + ": de minor " +
          minorNaam(st.i, st.j) + (st.letters ? "" : " is " + getal(m)) + ", de cofactor " +
          cofactorNaam(st.i, st.j) + " is " + (teken(st.i, st.j) > 0 ? "+" : "−") +
          minorNaam(st.i, st.j) + (st.letters ? "" : " = " + getal(teken(st.i, st.j) * m)) + ".");
      }
    }

    function kies(i, j) {
      st.i = i;
      st.j = j;
      st.gedaan[i + "," + j] = true;
      werkBij();
    }

    ctx.knop("Volgend element", function () {
      if (!gekozen()) return kies(1, 1);
      if (st.j < n) return kies(st.i, st.j + 1);
      kies(st.i < n ? st.i + 1 : 1, 1);
    });
    var patroonKnop = ctx.knop("Tekenpatroon", function () {
      st.patroon = !st.patroon;
      schakel(patroonKnop, st.patroon);
      werkBij();
    });
    var weergave = letterSchakelaar(ctx, function (l) { st.letters = l; werkBij(); });
    var adjKnop = null;
    if (opties.verzamel) {
      ctx.knop("Alle cofactoren", function () {
        for (var i = 1; i <= n; i++) {
          for (var j = 1; j <= n; j++) st.gedaan[i + "," + j] = true;
        }
        werkBij();
      });
      adjKnop = ctx.knop("Transponeer", function () {
        st.adj = !st.adj;
        schakel(adjKnop, st.adj);
        werkBij();
      });
    }
    weergave.wijzig = ctx.knop("Wijzig A", function () {
      A = willekeurig(n);
      st.gedaan = {};
      if (gekozen()) st.gedaan[st.i + "," + st.j] = true;
      werkBij();
    });

    function herstel() {
      A = kopie(opties.begin);
      st.i = st.j = 0;
      st.patroon = st.letters = st.adj = false;
      st.gedaan = {};
      schakel(patroonKnop, false);
      weergave.stand(false);
      if (adjKnop) schakel(adjKnop, false);
      werkBij();
    }

    schakel(patroonKnop, false);
    if (adjKnop) schakel(adjKnop, false);
    werkBij();
    return { reset: herstel };
  }

  G.registreer("det-cofactor", function (ctx) {
    return cofactorFiguur(ctx, { begin: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] });
  });
  G.registreer("det-adjunct", function (ctx) {
    return cofactorFiguur(ctx, {
      begin: [[1, 0, 2], [3, -1, 5], [2, 6, 1]], verzamel: true
    });
  });

  /* --- 3. Ontwikkelen naar een rij of kolom ------------------------------ */

  // Kies een rij of kolom: meteen staat de hele ontwikkeling eronder, tot
  // en met de uitkomst. Klik daarna op een element van die rij voor de
  // berekening van zijn cofactor; die staat naast de matrix, op een vaste
  // plaats, zodat er niets verspringt. Een nul in de gekozen rij maakt een
  // term meteen nul. Onderaan houdt de figuur bij welke rijen en kolommen al
  // geprobeerd zijn: het resultaat is telkens hetzelfde.
  function laplaceFiguur(ctx, orde) {
    var BEGIN = {
      3: [[1, -3, 5], [-2, 1, -2], [1, -5, 0]],
      4: [[2, 1, 0, 3], [1, 0, 0, 2], [4, 3, 1, 1], [0, 2, 0, 1]]
    };
    var st = { n: orde, A: kopie(BEGIN[orde]), soort: "R", nr: 0, term: 0, geprobeerd: [] };
    // Alles hangt aan de bovenkant en links, op een blad van vaste breedte:
    // wat erbij komt, komt eronder of ernaast in een vak dat zijn plaats al
    // had.
    var laag = maakLaag(ctx, "det-onder det-boven");
    var blad = div("det-blad");
    var mA = htmlMatrix({ klik: function (r, k) { klik(r, k); } });
    var groep = matrixGroep(mA, "\\(A=\\)");
    var boven = div("det-rij");
    var termvak = div("det-termvak");
    var term = div("det-cofactorstappen");
    var termTekst = div("det-tekst");
    var termRegel = tekstRegels(termTekst, 1)[0];
    termvak.appendChild(term);
    termvak.appendChild(termTekst);
    boven.appendChild(groep);
    boven.appendChild(termvak);
    var kop = div("det-tekst");
    var kopRegel = tekstRegels(kop, 1)[0];
    var som = div("det-cofactorstappen");
    var tekst = div("det-tekst");
    var regel = tekstRegels(tekst, 1)[0];
    [boven, kop, som, tekst].forEach(function (d) { blad.appendChild(d); });
    laag.appendChild(blad);
    var zet = maakZetter();

    function positie(k) {
      return st.soort === "R" ? { i: st.nr, j: k } : { i: k, j: st.nr };
    }
    function element(k) {
      var p = positie(k);
      return st.A[p.i - 1][p.j - 1];
    }
    function cof(k) {
      var p = positie(k);
      return cofactor(st.A, p.i, p.j);
    }

    // det A = a·A + a·A + ..., dan met de getallen van de gekozen rij, dan
    // met de cofactoren uitgerekend, en de uitkomst. Bij een element 0 blijft
    // de cofactor een naam, want die hoeft niemand uit te rekenen. De term
    // die gekozen is, licht op in elke regel.
    function somRegels() {
      var symbolen = [], namen = [], getallen = [], producten = [];
      for (var k = 1; k <= st.n; k++) {
        var q = positie(k);
        var a = element(k);
        var delen = [
          elTex(q.i, q.j) + cofTex(q.i, q.j),
          fac(a) + "\\cdot " + cofTex(q.i, q.j),
          fac(a) + "\\cdot " + (a !== 0 ? fac(cof(k)) : cofTex(q.i, q.j))
        ];
        if (k === st.term) delen = delen.map(function (d) { return kleurTex("secante", d); });
        symbolen.push(delen[0]);
        namen.push(delen[1]);
        getallen.push(delen[2]);
        producten.push(a * cof(k));
      }
      return ["\\det A&=" + symbolen.join("+"), "&=" + namen.join("+"),
              "&=" + getallen.join("+"), "&=" + somTex(producten) + "=" + det(st.A)];
    }

    function termRegels(k) {
      var p = positie(k);
      if (element(k) === 0) return [];
      var M = minor(st.A, p.i, p.j);
      var m = det(M), t = teken(p.i, p.j);
      var uit = [kleurTex("secante", cofTex(p.i, p.j)) + "&=" + tekenMachtTex(p.i, p.j) +
        "\\," + vmat(M)];
      if (st.n === 3) uit.push("&=" + (t > 0 ? "+" : "-") + "(" + kruisTex(M) + ")");
      uit.push("&=" + tekenUitTex(t, m));
      return uit;
    }

    function werkBij() {
      mA.bouw(st.n, st.n);
      mA.raster.classList.toggle("det-klein", st.n === 4);
      var p = st.term ? positie(st.term) : null;
      mA.stand(function (i, j) {
        var inLijn = st.nr && (st.soort === "R" ? i === st.nr : j === st.nr);
        var dit = p && i === p.i && j === p.j;
        return {
          merk: dit ? "secante" : inLijn ? "punt" : "",
          vaag: p && !dit && (i === p.i || j === p.j)
        };
      });
      var paren = mA.paren(function (i, j) { return getal(st.A[i - 1][j - 1]); });
      var lijn = st.nr ? lijnTex(st.soort, st.nr) : "";
      var woord = st.soort === "R" ? "rij" : "kolom";
      var uitleg;
      if (!st.nr) {
        uitleg = "Klik op een element: we ontwikkelen naar zijn " + woord + ". Welke " +
          "rij of kolom maakt het rekenwerk het kortst?";
      } else if (!st.term) {
        uitleg = "Klik op een element van \\(" + lijn + "\\) voor de berekening van zijn " +
          "cofactor.";
      } else {
        var q = positie(st.term);
        if (element(st.term) === 0) {
          uitleg = "\\(" + elTex(q.i, q.j) + "=0\\): deze term is \\(0\\), \\(" +
            cofTex(q.i, q.j) + "\\) hoef je niet uit te rekenen.";
        } else if (st.n === 4) {
          uitleg = "De minor is een determinant van orde \\(3\\).";
        } else {
          uitleg = "";
        }
      }
      var al = st.geprobeerd.length ? "Al ontwikkeld: " + st.geprobeerd.map(function (g) {
        return "\\(" + g.naam + "\\) geeft \\(" + g.waarde + "\\)";
      }).join(", ") + "." : "";
      paren.push([groep.naam, groep.naamTex]);
      paren.push([term, st.term ? uitgelijnd(termRegels(st.term)) : ""]);
      paren.push([termRegel, uitleg]);
      paren.push([kopRegel, st.nr ? "Ontwikkeling naar \\(" + lijn + "\\):" : ""]);
      paren.push([som, st.nr ? uitgelijnd(somRegels()) : ""]);
      paren.push([regel, al]);
      zet(paren);
      ctx.toon(beschrijving());
    }

    function beschrijving() {
      if (!st.nr) {
        return "Klik op een element: we ontwikkelen naar zijn " +
          (st.soort === "R" ? "rij." : "kolom.");
      }
      var t = "Ontwikkeling naar " + (st.soort === "R" ? "rij " : "kolom ") + st.nr +
        ": det A = " + getal(det(st.A)) + ".";
      if (st.term) {
        var q = positie(st.term);
        t += " Term " + st.term + ": " + el("a", q.i, q.j) + " = " + getal(element(st.term));
        t += element(st.term) === 0 ? ", dus de term is 0."
          : ", " + cofactorNaam(q.i, q.j) + " = " + getal(cof(st.term)) + ".";
      }
      return t;
    }

    function kiesLijn(nr, term) {
      st.nr = nr;
      st.term = term || 0;
      if (nr) {
        var naam = lijnTex(st.soort, nr);
        var al = st.geprobeerd.some(function (g) { return g.naam === naam; });
        if (!al) st.geprobeerd.push({ naam: naam, waarde: det(st.A) });
      }
      werkBij();
    }

    // Een klik buiten de gekozen rij kiest een nieuwe rij; een klik erbinnen
    // toont de cofactor van dat element.
    function klik(i, j) {
      var nr = st.soort === "R" ? i : j;
      if (nr === st.nr) {
        st.term = st.soort === "R" ? j : i;
        werkBij();
      } else {
        kiesLijn(nr);
      }
    }

    ctx.knop("Volgende term", function () {
      if (!st.nr) return kiesLijn(1, 1);
      st.term = st.term % st.n + 1;
      werkBij();
    });
    function richting(soort) {
      if (st.soort === soort) return;
      st.soort = soort;
      richtingStand();
      kiesLijn(st.nr);
    }
    function richtingStand() {
      schakel(rijKnop, st.soort === "R");
      schakel(kolomKnop, st.soort === "K");
    }
    var rijKnop = ctx.knop("rij", function () { richting("R"); });
    var kolomKnop = ctx.knop("kolom", function () { richting("K"); });
    var richtingVak = div("det-richting");
    var richtingGroep = div("interactieve-grafiek-schakelaar");
    richtingGroep.setAttribute("role", "group");
    richtingGroep.setAttribute("aria-label", "Ontwikkelen naar");
    rijKnop.parentNode.insertBefore(richtingVak, rijKnop);
    richtingVak.appendChild(document.createTextNode("Naar:"));
    richtingVak.appendChild(richtingGroep);
    richtingGroep.appendChild(rijKnop);
    richtingGroep.appendChild(kolomKnop);
    richtingStand();
    ctx.knop("Wijzig A", function () {
      st.A = willekeurig(st.n);
      st.geprobeerd = [];
      kiesLijn(0);
    });

    function herstel() {
      st.A = kopie(BEGIN[orde]);
      st.soort = "R";
      st.geprobeerd = [];
      richtingStand();
      kiesLijn(0);
    }

    werkBij();
    return { reset: herstel };
  }

  G.registreer("det-laplace", function (ctx) {
    return laplaceFiguur(ctx, 3);
  });

  G.registreer("det-laplace-orde4", function (ctx) {
    return laplaceFiguur(ctx, 4);
  });

  /* --- 4. De regel van Sarrus -------------------------------------------- */

  // De eerste twee kolommen staan nog eens rechts van de determinant. Een
  // diagonaal licht op bij een klik op een element (eerst een diagonaal door
  // het aangeklikte vakje, bij een tweede klik op hetzelfde element de
  // andere), bij een klik op haar term in de formule, of met Volgende
  // diagonaal: eerst de drie hoofddiagonalen (met een plus), dan de drie
  // nevendiagonalen (met een min). Een diagonaal die al aan bod kwam, blijft
  // in de formule staan; wat nog niet aan bod kwam, staat als \cdots en is
  // ook aanklikbaar.
  G.registreer("det-sarrus", function (ctx) {
    var BEGIN = [[3, -2, 1], [2, 1, 2], [3, 2, 4]];
    var A = kopie(BEGIN);
    var st = { getoond: [], k: -1, cel: null, letters: false };
    var laag = maakLaag(ctx, "det-onder det-boven");
    var mA = htmlMatrix({
      rijen: 3, kolommen: 3, haken: "strepen", klasse: "det-klein",
      klik: function (r, c) { klikCel(r, c); }
    });
    var mK = htmlMatrix({
      rijen: 3, kolommen: 2, haken: "geen", klasse: "det-klein",
      klik: function (r, c) { klikCel(r, c + 3); }
    });
    mK.vakjes.forEach(function (v) {
      var c = +v.dataset.kolom;
      v.setAttribute("aria-label", "Rij " + v.dataset.rij + ", kolom " + (c + 3) +
        ", kopie van kolom " + c);
    });
    var blok = div("det-sarrusblok");
    var SVG = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("aria-hidden", "true");
    blok.appendChild(mA.element);
    blok.appendChild(mK.element);
    blok.appendChild(svg);
    // De determinant en de berekening staan uitgelijnd op het gelijkteken,
    // zoals in een align*: links \det A, rechts = met het blok, en daaronder
    // de regels van de berekening, die elk met = beginnen. Het rooster heeft
    // twee kolommen; het gelijkteken staat telkens vooraan in de rechter.
    var uitlijning = div("det-sarrusuitlijning");
    var links = div("det-cofactorstappen det-sarruslinks");
    var rechts = div("det-sarrusrechts");
    var is = div("det-cofactorstappen");
    var formule = div("det-cofactorstappen det-sarrusformule");
    rechts.appendChild(is);
    rechts.appendChild(blok);
    [links, rechts, div(""), formule].forEach(function (d) { uitlijning.appendChild(d); });
    var tekst = div("det-tekst");
    var regels = tekstRegels(tekst, 2);
    laag.appendChild(uitlijning);
    laag.appendChild(tekst);
    var zet = maakZetter();

    // De zes diagonalen in het blok van vijf kolommen. Kolom 4 en 5 zijn
    // kolom 1 en 2.
    var DIAGONALEN = [];
    [0, 1, 2].forEach(function (d) {
      DIAGONALEN.push({ plus: true, cellen: [[1, 1 + d], [2, 2 + d], [3, 3 + d]] });
    });
    [0, 1, 2].forEach(function (d) {
      DIAGONALEN.push({ plus: false, cellen: [[1, 3 + d], [2, 2 + d], [3, 1 + d]] });
    });

    function echt(c) { return c > 3 ? c - 3 : c; }
    function vak(r, c) { return c <= 3 ? mA.vak(r, c) : mK.vak(r, c - 3); }
    function rest3(x) { return ((x % 3) + 3) % 3; }
    function door(k, r, c) {
      return DIAGONALEN[k].cellen.some(function (p) { return p[0] === r && p[1] === c; });
    }
    // De tweeling van een vakje: hetzelfde element in de andere kolom. Kolom 3
    // heeft er geen.
    function tweeling(c) { return c <= 2 ? c + 3 : c >= 4 ? c - 3 : 0; }
    function rol(k) { return DIAGONALEN[k].plus ? "punt" : "secante"; }

    // Elk element a_ij ligt op één hoofddiagonaal (een plusterm) en één
    // nevendiagonaal (een minterm), al is het soms via zijn kopie. Een diagonaal
    // die door het aangeklikte vakje zelf loopt, komt eerst; een tweede klik
    // op hetzelfde element, ook op zijn kopie, kiest de andere.
    function klikCel(r, c) {
      var j = echt(c);
      var kandidaten = [rest3(j - r), 3 + rest3(j + r - 1)];
      if (!door(kandidaten[0], r, c) && door(kandidaten[1], r, c)) kandidaten.reverse();
      var zelfde = st.cel && st.cel.r === r && echt(st.cel.c) === j;
      var k = zelfde && st.k === kandidaten[0] ? kandidaten[1] : kandidaten[0];
      kies(k, { r: r, c: c });
    }

    function kies(k, cel) {
      st.k = k;
      st.cel = cel || null;
      st.getoond[k] = true;
      werkBij();
    }

    function alleGetoond() {
      for (var k = 0; k < 6; k++) if (!st.getoond[k]) return false;
      return true;
    }

    // De lijnen over de vakjes, gemeten in de lay-out van het blok; ze worden
    // opnieuw getekend wanneer het blok van maat verandert. De gekozen
    // diagonaal staat donker, de andere die al aan bod kwamen licht.
    function tekenLijnen() {
      var basis = blok.getBoundingClientRect();
      if (!basis.width) return;
      svg.setAttribute("viewBox", "0 0 " + basis.width + " " + basis.height);
      svg.textContent = "";
      function midden(c) {
        var b = vak(c[0], c[1]).getBoundingClientRect();
        return [b.left + b.width / 2 - basis.left, b.top + b.height / 2 - basis.top];
      }
      DIAGONALEN.forEach(function (d, k) {
        if (!st.getoond[k]) return;
        var a = midden(d.cellen[0]), b = midden(d.cellen[2]);
        var lijn = document.createElementNS(SVG, "line");
        lijn.setAttribute("x1", a[0] - 0.2 * (b[0] - a[0]));
        lijn.setAttribute("y1", a[1] - 0.2 * (b[1] - a[1]));
        lijn.setAttribute("x2", b[0] + 0.2 * (b[0] - a[0]));
        lijn.setAttribute("y2", b[1] + 0.2 * (b[1] - a[1]));
        var dekking = st.k === k ? 0.85 : st.k < 0 ? 0.55 : 0.25;
        lijn.setAttribute("style", "stroke:var(--grafiek-" + rol(k) +
          ");stroke-width:3;stroke-linecap:round;opacity:" + dekking);
        svg.appendChild(lijn);
      });
    }
    if (window.ResizeObserver) new window.ResizeObserver(tekenLijnen).observe(blok);

    function waarde(c) { return A[c[0] - 1][echt(c[1]) - 1]; }
    function lettersTex(d) {
      return d.cellen.map(function (c) { return elTex(c[0], echt(c[1])); }).join("");
    }
    function factorenTekst(d) {
      return d.cellen.map(function (c) {
        return st.letters ? el("a", c[0], echt(c[1])) : haakjes(waarde(c));
      }).join(st.letters ? "" : "·");
    }
    function product(d) {
      return d.cellen.reduce(function (p, c) { return p * waarde(c); }, 1);
    }

    // Een plaats in de formule die even breed is, wat er ook staat: zicht is
    // wat er nu staat, anderen wat er ooit kan staan (\cdots, de letters, de
    // getallen). Die staan er onzichtbaar boven, in dezelfde stijl, en
    // \overset centreert wat eronder staat; \smash houdt de hoogte van de
    // regel buiten spel. Zo verspringt er niets wanneer een term verschijnt
    // of wanneer je tussen letters en getallen wisselt.
    function plaats(zicht, anderen) {
      return "{\\smash{" + anderen.reduce(function (s, a) {
        return "\\overset{\\displaystyle\\hphantom{" + a + "}}{" + s + "}";
      }, zicht) + "}}";
    }

    // Een term van de formule: aanklikbaar via haar klasse, en in de kleur
    // van haar diagonaal wanneer die gekozen is. Wat nog niet aan bod kwam,
    // staat als \cdots.
    function termTex(k, s, anderen) {
      s = plaats(st.getoond[k] ? s : "\\cdots", ["\\cdots"].concat(anderen || [s]));
      s = "\\class{det-diag-" + k + "}{" + s + "}";
      return st.k === k ? kleurTex(rol(k), s) : s;
    }

    function getallenTex(d) {
      return d.cellen.map(function (c) { return fac(waarde(c)); }).join("\\cdot ");
    }

    // +(… + … + …) voor de hoofddiagonalen, −(… + … + …) voor de
    // nevendiagonalen.
    function groepTex(plus) {
      var begin = plus ? 0 : 3, delen = [];
      for (var k = begin; k < begin + 3; k++) {
        var d = DIAGONALEN[k], L = lettersTex(d), N = getallenTex(d);
        delen.push(termTex(k, st.letters ? L : N, [L, N]));
      }
      return (plus ? "+" : "-") + "\\bigl(" + delen.join("+") + "\\bigr)";
    }

    // De producten van een groep als som, 12-12+4, elk getal aanklikbaar.
    // Het teken van een getal dat nog niet aan bod kwam, is een plus, zoals
    // in +(… + … + …); een min ervoor neemt dezelfde breedte in.
    function productenTex(begin) {
      var delen = [];
      for (var k = begin; k < begin + 3; k++) {
        var x = product(DIAGONALEN[k]);
        var teken = x < 0 && st.getoond[k] ? "-" : "+";
        delen.push(k === begin ? termTex(k, String(x))
          : teken + termTex(k, String(Math.abs(x))));
      }
      return "(" + delen.join("") + ")";
    }

    function alle(begin) {
      return st.getoond[begin] && st.getoond[begin + 1] && st.getoond[begin + 2];
    }

    function som(begin) {
      var s = 0;
      for (var k = begin; k < begin + 3; k++) s += product(DIAGONALEN[k]);
      return s;
    }

    // Wat er bij de gekozen diagonaal te zeggen valt: haar term, en of ze
    // door het aangeklikte vakje loopt of door zijn tweeling.
    function uitleg() {
      if (st.k < 0) {
        return [alleGetoond() ? "Klik op een element of op een term voor zijn diagonaal."
          : "Klik op een element, of op Volgende diagonaal.", ""];
      }
      var d = DIAGONALEN[st.k];
      var term = lettersTex(d);
      if (!st.letters) term += "=" + getallenTex(d) + "=" + product(d);
      var eerste = (d.plus ? "Hoofddiagonaal, met een plus: "
        : "Nevendiagonaal, met een min: ") + "\\(" + term + "\\).";
      if (!st.cel) return [eerste, ""];
      var r = st.cel.r, c = st.cel.c, naam = "\\(" + elTex(r, echt(c)) + "\\)";
      var tweede = "";
      if (!door(st.k, r, c)) {
        tweede = tweeling(c) > 3
          ? "Ze loopt door de kopie van " + naam + " in kolom \\(" + tweeling(c) + "\\). "
          : "Ze loopt door " + naam + " zelf, in kolom \\(" + tweeling(c) + "\\). ";
      }
      tweede += "Klik nog eens op " + naam + " voor de " +
        (d.plus ? "nevendiagonaal" : "hoofddiagonaal") + " erdoor.";
      return [eerste, tweede];
    }

    function werkBij() {
      var gekozen = st.k >= 0 ? DIAGONALEN[st.k] : null;
      function stand(c0) {
        return function (r, c) {
          c += c0;
          var op = gekozen && door(st.k, r, c);
          return { merk: op ? rol(st.k) : "", vaag: c > 3 && !op };
        };
      }
      mA.stand(stand(0));
      mK.stand(stand(3));
      // Hetzelfde element in de andere kolom krijgt een gestippelde rand:
      // zo zie je de term ook in de determinant zelf.
      for (var r = 1; r <= 3; r++) {
        for (var c = 1; c <= 5; c++) {
          var v = vak(r, c), op = gekozen && door(st.k, r, c);
          var tw = gekozen && !op && tweeling(c) && door(st.k, r, tweeling(c));
          v.classList.toggle("det-tweeling-punt", !!tw && gekozen.plus);
          v.classList.toggle("det-tweeling-secante", !!tw && !gekozen.plus);
        }
      }
      var inhoud = function (r, k) {
        return st.letters ? "\\(" + elTex(r, k) + "\\)" : getal(A[r - 1][k - 1]);
      };
      var paren = mA.paren(inhoud).concat(mK.paren(inhoud));
      // Alle regels staan er van bij het begin, met \cdots waar nog niets
      // staat. Met letters zijn er geen getallen, maar de regels houden hun
      // hoogte, zodat de wissel niets verschuift.
      var P = som(0), Mn = som(3);
      function uitkomst(klaar, x) { return plaats(klaar ? x : "\\cdots", ["\\cdots", x]); }
      var onder = ["=" + productenTex(0) + "-" + productenTex(3),
        "=" + uitkomst(alle(0), String(P)) + "-" + uitkomst(alle(3), fac(Mn)) + "=" +
          uitkomst(alleGetoond(), String(P - Mn)) + "\\vphantom{(}"];
      var f = ["&=" + groepTex(true), "&\\phantom{=}{}" + groepTex(false)].concat(
        onder.map(function (r) { return "&" + (st.letters ? "\\phantom{" + r + "}" : r); }));
      var u = uitleg();
      paren.push([links, "\\(\\det A\\)"], [is, "\\({}=\\)"]);
      paren.push([formule, uitgelijnd(f)]);
      paren.push([regels[0], u[0]], [regels[1], u[1]]);
      zet(paren);
      tekenLijnen();
      ctx.toon(gekozen
        ? (gekozen.plus ? "Hoofddiagonaal " + (st.k + 1) + " van 3, met een plus: "
          : "Nevendiagonaal " + (st.k - 2) + " van 3, met een min: ") +
          factorenTekst(gekozen) + (st.letters ? "" : " = " + getal(product(gekozen))) + "." +
          (alleGetoond() && !st.letters ? " det A = " + getal(det(A)) + "." : "")
        : "De eerste twee kolommen staan nog eens rechts van de determinant. " +
          "Klik op een element of op Volgende diagonaal.");
    }

    // Een klik op een term of op \cdots in de formule kiest die diagonaal.
    // MathJax zet de klasse van \class op de groep in de SVG. Die groep is
    // enkel zo groot als haar inktvlek: bij \cdots zijn dat drie puntjes, en
    // tussen de lijnen van een letter raakt een klik geen pad. Daarom telt de
    // term die het dichtst bij de klik ligt, tot op 0.6em, gemeten tot de
    // rechthoek rond haar inkt. Zo is elke term een ruim aanraakgebied, ook
    // op een telefoon.
    function termBij(x, y) {
      var grens = 0.6 * parseFloat(window.getComputedStyle(formule).fontSize);
      var beste = -1;
      formule.querySelectorAll("svg [class*='det-diag-']").forEach(function (g) {
        var b = g.getBoundingClientRect();
        var d = Math.max(b.left - x, x - b.right, b.top - y, y - b.bottom, 0);
        var m = /det-diag-(\d)/.exec(g.getAttribute("class"));
        if (m && d <= grens) {
          grens = d;
          beste = +m[1];
        }
      });
      return beste;
    }
    formule.addEventListener("click", function (e) {
      var k = termBij(e.clientX, e.clientY);
      if (k >= 0) kies(k);
    });
    formule.addEventListener("pointermove", function (e) {
      formule.style.cursor = termBij(e.clientX, e.clientY) >= 0 ? "pointer" : "";
    });

    ctx.knop("Volgende diagonaal", function () {
      if (st.k === 5 && alleGetoond()) st.getoond = [];
      kies((st.k + 1) % 6);
    });
    ctx.knop("Alle diagonalen", function () {
      for (var k = 0; k < 6; k++) st.getoond[k] = true;
      st.k = -1;
      st.cel = null;
      werkBij();
    });
    var weergave = letterSchakelaar(ctx, function (l) { st.letters = l; werkBij(); });
    weergave.wijzig = ctx.knop("Wijzig A", function () {
      A = willekeurig(3);
      st.getoond = [];
      st.k = -1;
      st.cel = null;
      werkBij();
    });

    function herstel() {
      A = kopie(BEGIN);
      st.getoond = [];
      st.k = -1;
      st.cel = null;
      st.letters = false;
      weergave.stand(false);
      werkBij();
    }

    werkBij();
    return { reset: herstel, herschaal: tekenLijnen };
  });

  /* --- 5. Rij- en kolombewerkingen --------------------------------------- */

  // De eigenschappen zeggen wat een bewerking met de determinant doet. Hier
  // doet de leerling de bewerking zelf, denkt na over de nieuwe determinant,
  // en ziet pas daarna of hij juist zat. Klik een eerste rij (blauw) en
  // eventueel een tweede (oranje) aan, en kies de bewerking.
  G.registreer("det-rijbewerkingen", function (ctx) {
    var BEGIN = [[2, 1, 3], [1, 0, 2], [4, 1, 5]];
    var KS = [2, 3, -1, -2, 0];
    var st = {
      A: kopie(BEGIN), vorige: null, stap: "", uitleg: "", verborgen: false,
      soort: "R", eerste: 0, tweede: 0, k: 0, geschiedenis: []
    };
    var laag = maakLaag(ctx, "det-onder");
    var mV = htmlMatrix({ rijen: 3, kolommen: 3, haken: "strepen", klasse: "det-klein" });
    var mA = htmlMatrix({
      rijen: 3, kolommen: 3, haken: "strepen", klasse: "det-klein",
      klik: function (i, j) { klik(i, j); }
    });
    // Voor en na de bewerking, met de waarde van de determinant eronder en
    // de bewerking op de pijl ertussen.
    var rij = div("det-rij");
    var voor = div("det-matrixkolom");
    var voorOnder = div("det-matrixnaam");
    voor.appendChild(mV.element);
    voor.appendChild(voorOnder);
    var pijl = div("det-matrixnaam");
    var na = div("det-matrixkolom");
    var naOnder = div("det-matrixnaam");
    na.appendChild(mA.element);
    na.appendChild(naOnder);
    rij.appendChild(voor);
    rij.appendChild(pijl);
    rij.appendChild(na);
    var tekst = div("det-tekst");
    var regels = tekstRegels(tekst, 3);
    laag.appendChild(rij);
    laag.appendChild(tekst);
    var zet = maakZetter();
    var zetK = maakZetter();

    function k() { return KS[st.k]; }
    function heeftVorige() { return st.vorige !== null; }

    function lijn(A, nr) {
      var uit = [];
      for (var t = 0; t < 3; t++) uit.push(st.soort === "R" ? A[nr - 1][t] : A[t][nr - 1]);
      return uit;
    }
    function zetLijn(A, nr, waarden) {
      for (var t = 0; t < 3; t++) {
        if (st.soort === "R") A[nr - 1][t] = waarden[t]; else A[t][nr - 1] = waarden[t];
      }
    }
    function naam(nr) { return lijnTex(st.soort, nr); }
    function woord() { return st.soort === "R" ? "rij" : "kolom"; }
    function woorden() { return st.soort === "R" ? "rijen" : "kolommen"; }

    // Een nulrij, of twee evenredige rijen (of kolommen): dan is de
    // determinant 0, en dat verdient een aparte zin.
    function nulrij(A) {
      for (var a = 1; a <= 3; a++) {
        if (lijn(A, a).every(function (x) { return x === 0; })) return a;
      }
      return 0;
    }
    function evenredig(A) {
      for (var a = 1; a <= 3; a++) {
        for (var b = a + 1; b <= 3; b++) {
          var p = lijn(A, a), q = lijn(A, b);
          if (p[0] * q[1] === p[1] * q[0] && p[0] * q[2] === p[2] * q[0] &&
              p[1] * q[2] === p[2] * q[1]) {
            return [a, b];
          }
        }
      }
      return null;
    }

    function selectieTekst() {
      if (!st.eerste) return "Klik op een " + woord() + " van de determinant.";
      var t = "Gekozen: \\(" + naam(st.eerste) + "\\) (blauw)";
      if (st.tweede) t += " en \\(" + naam(st.tweede) + "\\) (oranje)";
      return t + ", \\(k=" + k() + "\\).";
    }

    function werkBij() {
      mA.stand(function (i, j) {
        var nr = st.soort === "R" ? i : j;
        return { merk: nr === st.eerste ? "punt" : nr === st.tweede ? "secante" : "" };
      });
      var paren = mA.paren(function (i, j) { return getal(st.A[i - 1][j - 1]); });
      voor.style.display = heeftVorige() ? "" : "none";
      if (heeftVorige()) {
        paren = paren.concat(mV.paren(function (i, j) { return getal(st.vorige[i - 1][j - 1]); }));
      }
      var waarde = st.verborgen ? "\\,?" : String(det(st.A));
      paren.push([voorOnder, heeftVorige() ? "\\(\\det=" + det(st.vorige) + "\\)" : ""]);
      paren.push([pijl, heeftVorige() ? "\\(\\xrightarrow{\\ " + st.stap + "\\ }\\)" : ""]);
      paren.push([naOnder, "\\(\\det" + (heeftVorige() ? "" : " A") + "=" + waarde + "\\)"]);
      var r = [selectieTekst(), "", ""];
      if (heeftVorige()) {
        if (st.verborgen) {
          r[1] = "Denk vooraf na: wat wordt de determinant na \\(" + st.stap + "\\)?";
          r[2] = "Klik daarna op Toon det.";
        } else {
          r[1] = st.uitleg;
          var leeg = nulrij(st.A);
          var nul = evenredig(st.A);
          if (leeg) {
            r[2] = "\\(" + naam(leeg) + "\\) bevat enkel nullen, dus de determinant is \\(0\\).";
          } else if (nul) {
            r[2] = "\\(" + naam(nul[0]) + "\\) en \\(" + naam(nul[1]) +
              "\\) zijn evenredig, dus de determinant is \\(0\\).";
          }
        }
      }
      r.forEach(function (t, n) { paren.push([regels[n], t]); });
      zet(paren);
      ctx.toon(plat(r.filter(Boolean).join(" ")) +
        (st.verborgen ? "" : " det = " + getal(det(st.A)) + "."));
    }

    function voerUit(stap, nieuw, uitleg) {
      st.geschiedenis.push({ A: st.A, vorige: st.vorige, stap: st.stap, uitleg: st.uitleg,
                             verborgen: st.verborgen });
      st.vorige = st.A;
      st.A = nieuw;
      st.stap = stap;
      st.uitleg = uitleg;
      st.verborgen = true;
      werkBij();
    }

    function nodig(twee) {
      if (!st.eerste || (twee && !st.tweede)) {
        var t = twee
          ? "Deze bewerking heeft twee " + woorden() + " nodig: klik er nog een aan."
          : "Klik eerst op een " + woord() + ".";
        zet([[regels[0], selectieTekst()], [regels[1], t], [regels[2], ""]]);
        ctx.toon(plat(selectieTekst()) + " " + t);
        return false;
      }
      return true;
    }

    function klik(i, j) {
      var nr = st.soort === "R" ? i : j;
      if (!st.eerste || st.tweede || nr === st.eerste) {
        st.eerste = nr;
        st.tweede = 0;
      } else {
        st.tweede = nr;
      }
      werkBij();
    }

    ctx.knop("Wissel", function () {
      if (!nodig(true)) return;
      var B = kopie(st.A);
      var p = lijn(B, st.eerste), q = lijn(B, st.tweede);
      zetLijn(B, st.eerste, q);
      zetLijn(B, st.tweede, p);
      voerUit(naam(st.eerste) + "\\leftrightarrow " + naam(st.tweede), B,
        "Twee " + woorden() + " verwisseld: de determinant verandert van teken.");
    });
    ctx.knop("Maal k", function () {
      if (!nodig(false)) return;
      var B = kopie(st.A);
      zetLijn(B, st.eerste, lijn(B, st.eerste).map(function (x) { return k() * x; }));
      voerUit(naam(st.eerste) + "\\leftarrow " + (k() === -1 ? "-" : k()) + naam(st.eerste), B,
        "Eén " + woord() + " maal \\(" + k() + "\\): de determinant wordt ook met \\(" +
        k() + "\\) vermenigvuldigd.");
    });
    ctx.knop("Tel k keer op", function () {
      if (!nodig(true)) return;
      var B = kopie(st.A);
      var q = lijn(B, st.tweede);
      zetLijn(B, st.eerste, lijn(B, st.eerste).map(function (x, t) { return x + k() * q[t]; }));
      var factor = Math.abs(k()) === 1 ? "" : Math.abs(k());
      voerUit(naam(st.eerste) + "\\leftarrow " + naam(st.eerste) + (k() < 0 ? "-" : "+") +
        factor + naam(st.tweede), B,
        "Een veelvoud van een andere " + woord() + " opgeteld: de determinant blijft gelijk.");
    });
    var kKnop = ctx.knop("k = 2", function () {
      st.k = (st.k + 1) % KS.length;
      zetKnopK();
      werkBij();
    });
    function zetKnopK() {
      kKnop.setAttribute("aria-label", "k = " + getal(k()));
      zetK([[kKnop, "\\(k=" + k() + "\\)"]]);
    }
    ctx.knop("Transponeer", function () {
      voerUit("\\text{transponeren}", M.getransponeerde(st.A),
        "Rijen en kolommen van rol gewisseld: \\(\\det A^{\\mathsf T}=\\det A\\).");
    });
    ctx.knop("Toon det", function () {
      st.verborgen = false;
      werkBij();
    });
    ctx.knop("Terug", function () {
      var vorige = st.geschiedenis.pop();
      if (!vorige) return;
      st.A = vorige.A;
      st.vorige = vorige.vorige;
      st.stap = vorige.stap;
      st.uitleg = vorige.uitleg;
      st.verborgen = vorige.verborgen;
      werkBij();
    });
    var soortKnop = ctx.knop("Kolommen", function () {
      st.soort = st.soort === "R" ? "K" : "R";
      soortKnop.textContent = st.soort === "R" ? "Kolommen" : "Rijen";
      st.eerste = st.tweede = 0;
      werkBij();
    });
    ctx.knop("Wijzig A", function () {
      st.A = willekeurig(3);
      st.vorige = null;
      st.geschiedenis = [];
      st.verborgen = false;
      werkBij();
    });

    function herstel() {
      st.A = kopie(BEGIN);
      st.vorige = null;
      st.geschiedenis = [];
      st.verborgen = false;
      st.soort = "R";
      st.eerste = st.tweede = 0;
      st.k = 0;
      zetKnopK();
      soortKnop.textContent = "Kolommen";
      werkBij();
    }

    zetKnopK();
    werkBij();
    return { reset: herstel };
  });

  /* --- 6. Verlaging van de orde ------------------------------------------ */

  // Exacte breuken: bij een spil die geen 1 of −1 is, verschijnen er breuken,
  // en die horen er net zo exact te staan als op papier.
  function ggd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function breuk(t, n) {
    if (n === undefined) n = 1;
    if (n < 0) { t = -t; n = -n; }
    var g = ggd(t, n);
    return { t: t / g, n: n / g };
  }
  var Q = {
    plus: function (a, b) { return breuk(a.t * b.n + b.t * a.n, a.n * b.n); },
    min: function (a, b) { return breuk(a.t * b.n - b.t * a.n, a.n * b.n); },
    maal: function (a, b) { return breuk(a.t * b.t, a.n * b.n); },
    deel: function (a, b) { return breuk(a.t * b.n, a.n * b.t); },
    nul: function (a) { return a.t === 0; },
    een: function (a) { return a.t === 1 && a.n === 1; },
    // In LaTeX: -\frac{3}{2}.
    tex: function (a) {
      if (a.n === 1) return String(a.t);
      return (a.t < 0 ? "-" : "") + "\\frac{" + Math.abs(a.t) + "}{" + a.n + "}";
    },
    // Als factor: een negatief getal of een breuk tussen haakjes.
    factor: function (a) {
      var s = Q.tex(a);
      return a.t < 0 || a.n !== 1 ? "\\left(" + s + "\\right)" : s;
    },
    // In een vakje van de matrix: een geheel getal als tekst, een breuk
    // als wiskunde.
    vak: function (a) {
      return a.n === 1 ? net(String(a.t)) : "\\(" + Q.tex(a) + "\\)";
    }
  };
  function naarQ(A) {
    return A.map(function (rij) { return rij.map(function (x) { return breuk(x); }); });
  }
  function detQ(A) {
    if (A.length === 1) return A[0][0];
    var s = breuk(0);
    for (var j = 1; j <= A.length; j++) {
      if (Q.nul(A[0][j - 1])) continue;
      var term = Q.maal(A[0][j - 1], detQ(minor(A, 1, j)));
      s = teken(1, j) > 0 ? Q.plus(s, term) : Q.min(s, term);
    }
    return s;
  }

  // Kies een spil. Maak nullen in haar kolom met rijbewerkingen (of in haar
  // rij met kolombewerkingen), en ontwikkel dan naar die kolom: van de hele
  // ontwikkeling blijft maar één term over, en de orde zakt met één. Zo
  // verder tot er een 2×2-determinant overblijft. De figuur zegt bij elke
  // stap welke bewerking ze doet, zodat de leerling dezelfde regels op papier
  // kan schrijven.
  G.registreer("det-verlaging", function (ctx) {
    var VOORBEELDEN = [
      [[6, 9, 2], [2, 3, 1], [3, 5, 2]],
      [[3, 2, 0], [4, -2, 1], [1, 3, -4]],
      [[2, 3, 1, -1], [1, 2, 0, 3], [-3, 1, 2, 2], [4, 0, 1, 5]]
    ];
    var st = { voorbeeld: 0, stadia: [], i: 0, j: 0, soort: "K", melding: "" };
    var laag = maakLaag(ctx, "det-smal");
    var mB = htmlMatrix({ haken: "strepen", klik: function (i, j) { klik(i, j); } });
    var groep = matrixGroep(mB, "");
    var kolom = div("det-kolom");
    var tekst = div("det-tekst");
    var regels = tekstRegels(tekst, 4);
    var einde = div("det-cofactorstappen");
    kolom.appendChild(tekst);
    kolom.appendChild(einde);
    laag.appendChild(groep);
    laag.appendChild(kolom);
    var zet = maakZetter();

    function nu() { return st.stadia[st.stadia.length - 1]; }
    function orde() { return nu().B.length; }

    function begin(A) {
      st.stadia = [{ B: naarQ(A), f: breuk(1), stap: "" }];
      st.i = st.j = 0;
      st.melding = "";
    }
    begin(VOORBEELDEN[0]);

    // Alle elementen van de lijn door de spil, behalve de spil zelf, zijn 0?
    function klaarOmTeOntwikkelen() {
      var B = nu().B;
      for (var t = 1; t <= orde(); t++) {
        if (st.soort === "K" && t !== st.i && !Q.nul(B[t - 1][st.j - 1])) return false;
        if (st.soort === "R" && t !== st.j && !Q.nul(B[st.i - 1][t - 1])) return false;
      }
      return true;
    }

    // De factor die al voor de determinant staat, zoals \det A = -2\cdot|…|.
    function naamTex() {
      var f = nu().f;
      return "\\(\\det A=" + (Q.een(f) ? "" : Q.tex(f) + "\\cdot") + "\\)";
    }

    function eindeTex() {
      var s = nu();
      if (orde() > 2) return "";
      var eind = Q.maal(s.f, detQ(s.B));
      var voor = Q.een(s.f) ? "" : Q.factor(s.f) + "\\cdot";
      var binnen = orde() === 2
        ? Q.factor(s.B[0][0]) + "\\cdot " + Q.factor(s.B[1][1]) + "-" +
          Q.factor(s.B[0][1]) + "\\cdot " + Q.factor(s.B[1][0])
        : Q.tex(s.B[0][0]);
      return uitgelijnd(["\\det A&=" + voor + "(" + binnen + ")", "&=" + Q.tex(eind)]);
    }

    function werkBij() {
      mB.bouw(orde(), orde());
      var lijnAan = st.i && orde() > 2;
      mB.stand(function (i, j) {
        if (i === st.i && j === st.j) return { gekozen: true };
        var inLijn = st.soort === "K" ? j === st.j : i === st.i;
        return { merk: lijnAan && inLijn ? "secante" : "" };
      });
      var paren = mB.paren(function (i, j) { return Q.vak(nu().B[i - 1][j - 1]); });
      var stappen = st.stadia.slice(1).map(function (s, k) {
        return (k + 1) + ". " + s.stap;
      });
      var r = stappen.slice(-3);
      var slot = "";
      var lijn = lijnTex(st.soort, st.soort === "K" ? st.j : st.i);
      if (st.melding) {
        slot = st.melding;
      } else if (orde() <= 2) {
        slot = "Orde \\(" + orde() + "\\): reken de determinant uit.";
      } else if (!st.i) {
        slot = "Klik op een spil: liefst een \\(1\\) of \\(-1\\), in een " +
          (st.soort === "K" ? "kolom" : "rij") + " met veel nullen.";
      } else if (klaarOmTeOntwikkelen()) {
        slot = "Buiten de spil staan er enkel nullen in \\(" + lijn + "\\): klik op Ontwikkel.";
      } else {
        slot = "Klik op Maak nullen: de andere elementen van \\(" + lijn + "\\) worden \\(0\\).";
      }
      r.push(slot);
      while (r.length < 4) r.push("");
      r.forEach(function (t, k) { paren.push([regels[k], t]); });
      paren.push([groep.naam, naamTex()]);
      paren.push([einde, st.melding ? "" : eindeTex()]);
      zet(paren);
      var toon = stappen.concat([slot]);
      if (orde() <= 2 && !st.melding) {
        toon.push("det A = " + plat(Q.tex(Q.maal(nu().f, detQ(nu().B)))) + ".");
      }
      ctx.toon(plat(zinnen(toon)));
    }

    function nieuwStadium(B, f, stap) {
      st.stadia.push({ B: B, f: f, stap: stap });
    }

    // R_2 \leftarrow R_2-2R_1, met een breuk als coëfficiënt:
    // R_2 \leftarrow R_2-\frac{3}{2}R_1.
    function bewerkingTex(doel, factor, bron) {
      var min = factor.t > 0;
      var abs = breuk(Math.abs(factor.t), factor.n);
      var f = Q.een(abs) ? "" : Q.tex(abs);
      return "\\(" + doel + "\\leftarrow " + doel + (min ? "-" : "+") + f + bron + "\\)";
    }

    ctx.knop("Maak nullen", function () {
      st.melding = "";
      if (orde() <= 2) return werkBij();
      if (!st.i) {
        st.melding = "Kies eerst een spil: klik op een element dat niet \\(0\\) is.";
        return werkBij();
      }
      if (klaarOmTeOntwikkelen()) {
        st.melding = "Er staan al nullen: klik op Ontwikkel.";
        return werkBij();
      }
      var s = nu();
      var B = s.B.map(function (rij) { return rij.slice(); });
      var spil = B[st.i - 1][st.j - 1];
      var ops = [];
      for (var t = 1; t <= orde(); t++) {
        if (st.soort === "K") {
          if (t === st.i || Q.nul(B[t - 1][st.j - 1])) continue;
          var c = Q.deel(B[t - 1][st.j - 1], spil);
          for (var u = 0; u < orde(); u++) B[t - 1][u] = Q.min(B[t - 1][u], Q.maal(c, B[st.i - 1][u]));
          ops.push(bewerkingTex(lijnTex("R", t), c, lijnTex("R", st.i)));
        } else {
          if (t === st.j || Q.nul(B[st.i - 1][t - 1])) continue;
          var d = Q.deel(B[st.i - 1][t - 1], spil);
          for (var v = 0; v < orde(); v++) B[v][t - 1] = Q.min(B[v][t - 1], Q.maal(d, B[v][st.j - 1]));
          ops.push(bewerkingTex(lijnTex("K", t), d, lijnTex("K", st.j)));
        }
      }
      var zin = ops.join(", ") + ": de determinant blijft gelijk.";
      if (!Q.een(spil) && !Q.een(breuk(-spil.t, spil.n))) {
        zin += " (Spil \\(" + Q.tex(spil) + "\\): daarom de breuken.)";
      }
      nieuwStadium(B, s.f, zin);
      werkBij();
    });

    ctx.knop("Ontwikkel", function () {
      st.melding = "";
      if (orde() <= 2) return werkBij();
      if (!st.i) {
        st.melding = "Kies eerst een spil.";
        return werkBij();
      }
      if (!klaarOmTeOntwikkelen()) {
        st.melding = "Er staan nog getallen naast de spil. Klik eerst op Maak nullen.";
        return werkBij();
      }
      var s = nu();
      var spil = s.B[st.i - 1][st.j - 1];
      var t = teken(st.i, st.j);
      var f = Q.maal(Q.maal(s.f, breuk(t)), spil);
      var lijn = lijnTex(st.soort, st.soort === "K" ? st.j : st.i);
      nieuwStadium(minor(s.B, st.i, st.j), f,
        "Ontwikkel naar \\(" + lijn + "\\): enkel \\(" + tekenMachtTex(st.i, st.j) + "\\cdot " +
        Q.factor(spil) + "\\cdot " + minTex(st.i, st.j) + "\\) blijft over.");
      st.i = st.j = 0;
      werkBij();
    });

    ctx.knop("Tip", function () {
      // De beste spil: een 1 of −1 met zoveel mogelijk nullen in haar kolom
      // (of rij); anders het kleinste getal dat geen 0 is.
      var B = nu().B, beste = null;
      for (var i = 1; i <= orde(); i++) {
        for (var j = 1; j <= orde(); j++) {
          var a = B[i - 1][j - 1];
          if (Q.nul(a)) continue;
          var nullen = 0;
          for (var t = 1; t <= orde(); t++) {
            var b = st.soort === "K" ? B[t - 1][j - 1] : B[i - 1][t - 1];
            if (Q.nul(b)) nullen++;
          }
          var score = (a.n === 1 && Math.abs(a.t) === 1 ? 100 : 0) + 10 * nullen -
            Math.abs(a.t / a.n);
          if (!beste || score > beste.score) beste = { i: i, j: j, score: score, a: a };
        }
      }
      if (!beste || orde() <= 2) return werkBij();
      st.i = beste.i;
      st.j = beste.j;
      st.melding = "Tip: kies \\(" + elTex(beste.i, beste.j) + "=" + Q.tex(beste.a) + "\\)" +
        (beste.a.n === 1 && Math.abs(beste.a.t) === 1
          ? ": met een spil \\(1\\) of \\(-1\\) blijven alle getallen geheel." : ".");
      werkBij();
    });
    var soortKnop = ctx.knop("Nullen in een rij", function () {
      st.soort = st.soort === "K" ? "R" : "K";
      soortKnop.textContent = st.soort === "K" ? "Nullen in een rij" : "Nullen in een kolom";
      st.melding = "";
      werkBij();
    });
    ctx.knop("Terug", function () {
      if (st.stadia.length > 1) st.stadia.pop();
      st.i = st.j = 0;
      st.melding = "";
      werkBij();
    });
    ctx.knop("Andere determinant", function () {
      st.voorbeeld = (st.voorbeeld + 1) % VOORBEELDEN.length;
      begin(VOORBEELDEN[st.voorbeeld]);
      werkBij();
    });

    function klik(i, j) {
      if (orde() <= 2) return;
      st.melding = "";
      if (Q.nul(nu().B[i - 1][j - 1])) {
        st.i = st.j = 0;
        st.melding = "Een spil mag geen \\(0\\) zijn: daarmee maak je geen nullen.";
      } else {
        st.i = i;
        st.j = j;
      }
      werkBij();
    }

    function herstel() {
      st.voorbeeld = 0;
      st.soort = "K";
      soortKnop.textContent = "Nullen in een rij";
      begin(VOORBEELDEN[0]);
      werkBij();
    }

    werkBij();
    return { reset: herstel };
  });

  /* --- 7. Meetkundige toepassingen --------------------------------------- */

  // Drie punten en de determinant met hun coördinaten. Die determinant is het
  // dubbele van de georiënteerde oppervlakte van de driehoek: nul als de
  // punten op één rechte liggen, positief als je tegen de wijzers van de klok
  // in van het eerste naar het tweede en het derde punt gaat. Eén figuur,
  // drie vragen: ligt P op de rechte door P₁ en P₂, zijn A, B en C
  // collineair, en hoe groot is de oppervlakte van driehoek ABC?
  function meetkundeFiguur(ctx, soort) {
    var GRENS = [-5, 7, 9, -3];
    var BEGIN = {
      rechte: [[0, 0], [2, 3], [-4, 7]],
      collineair: [[3, 2], [-2, -1], [8, 5]],
      driehoek: [[1, 0], [7, 2], [4, 2]]
    }[soort];
    var NAMEN = soort === "rechte" ? ["P", "P_1", "P_2"] : ["A", "B", "C"];
    var PLOT = [-5.6, 7.8, 9.6, -3.8];
    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var paneel = maakPaneel(ctx, bord, PLOT, soort === "rechte" ? ["f", "f", "t", "f"] : ["f", "t"],
      320, { rechte: 300, collineair: 140, driehoek: 190 }[soort]);
    var schik = paneel.schik;

    var punten = BEGIN.map(function (xy, k) {
      return roosterpunt(ctx, bord, xy, NAMEN[k], k === 0 ? "punt" : "secante", GRENS);
    });
    var P = punten[0], P1 = punten[1], P2 = punten[2];

    function co(p) { return [Math.round(p.X()), Math.round(p.Y())]; }
    function waarde() {
      var a = co(P), b = co(P1), c = co(P2);
      return a[0] * (b[1] - c[1]) - a[1] * (b[0] - c[0]) + (b[0] * c[1] - c[0] * b[1]);
    }

    if (soort === "rechte") {
      ctx.stijl(bord.create("line", [P1, P2], {
        strokeWidth: 2, fixed: true, highlight: false,
        visible: function () { return co(P1)[0] !== co(P2)[0] || co(P1)[1] !== co(P2)[1]; }
      }), "kromme");
    }
    bord.create("polygon", punten, {
      fixed: true, highlight: false, layer: 0,
      fillOpacity: soort === "rechte" ? 0.12 : 0.25,
      fillColor: function () { return waarde() >= 0 ? kleuren.afgeleide : kleuren.secante; },
      borders: {
        strokeWidth: soort === "rechte" ? 1 : 2, dash: soort === "rechte" ? 2 : 0,
        strokeColor: function () { return kleuren.hulp; }
      },
      vertices: { visible: false }
    });

    // ux + vy + w = 0 met de gewone schrijfwijze: geen 1x, geen +-.
    function vergelijking(u, v, w) {
      var delen = [];
      [[u, "x"], [v, "y"], [w, ""]].forEach(function (paar) {
        var c = paar[0];
        if (c === 0) return;
        var abs = Math.abs(c);
        var t = (abs === 1 && paar[1] ? "" : abs) + paar[1];
        delen.push((c < 0 ? "-" : delen.length ? "+" : "") + t);
      });
      return (delen.join("") || "0") + "=0";
    }

    function werkPaneelBij() {
      var a = co(P), b = co(P1), c = co(P2);
      var D = waarde();
      var rijen = [[a[0], a[1], 1], [b[0], b[1], 1], [c[0], c[1], 1]];
      var delen;
      if (soort === "rechte") {
        var u = b[1] - c[1], v = -(b[0] - c[0]), w = b[0] * c[1] - c[0] * b[1];
        var regels = [
          "P_1P_2&\\leftrightarrow " + vmat([["x", "y", "1"], rijen[1], rijen[2]]) + "=0",
          "&\\Leftrightarrow " + vergelijking(u, v, w)
        ];
        // Zoals in de cursus: deel nog door de ggd van de coëfficiënten en
        // begin met een positieve coëfficiënt.
        var g = ggd(ggd(u, v), w);
        if (u < 0 || (u === 0 && v < 0)) g = -g;
        if ((u || v) && g !== 1) regels.push("&\\Leftrightarrow " + vergelijking(u / g, v / g, w / g));
        delen = [
          uitgelijnd(regels),
          uitgelijnd(["P(" + a[0] + "," + a[1] + ")\\colon\\ " + vmat(rijen) + "=" + D]),
          D === 0 ? "De determinant is \\(0\\): \\(P\\) ligt op de rechte."
                  : "De determinant is niet \\(0\\): \\(P\\) ligt niet op de rechte.",
          uitgelijnd([kleurTex("zwak", "|" + D + "|=2\\cdot\\operatorname{Opp}\\triangle PP_1P_2")])
        ];
      } else if (soort === "collineair") {
        delen = [
          uitgelijnd([vmat(rijen) + "=" + D]),
          D === 0 ? "De determinant is \\(0\\): \\(A\\), \\(B\\) en \\(C\\) zijn collineair."
                  : "De determinant is niet \\(0\\): \\(A\\), \\(B\\) en \\(C\\) liggen niet op " +
                    "één rechte."
        ];
      } else {
        delen = [
          uitgelijnd([
            "\\operatorname{Opp}\\triangle ABC&=\\tfrac12\\left|" + vmat(rijen) + "\\right|",
            "&=\\tfrac12\\cdot|" + D + "|=" + ctx.getal(Math.abs(D) / 2, 1)
          ]),
          D > 0 ? "\\(\\det>0\\): \\(A\\to B\\to C\\) gaat tegen de wijzers van de klok in."
            : D < 0 ? "\\(\\det<0\\): \\(A\\to B\\to C\\) gaat met de wijzers van de klok mee."
              : "\\(\\det=0\\): de punten liggen op één rechte, de driehoek is plat."
        ];
      }
      paneel.zet(delen);
    }

    function beschrijving() {
      var D = waarde();
      var t = NAMEN.map(function (n, k) {
        var c = co(punten[k]);
        return n.replace("_", "") + "(" + getal(c[0]) + ", " + getal(c[1]) + ")";
      }).join(", ");
      var slot = soort === "driehoek"
        ? " De oppervlakte van driehoek ABC is " + ctx.getal(Math.abs(D) / 2, 1) + "."
        : (D === 0 ? " De punten liggen op één rechte." : " De punten liggen niet op één rechte.");
      return t + ". De determinant is " + getal(D) + "." + slot;
    }
    bord.on("update", function () {
      werkPaneelBij();
      ctx.toon(beschrijving());
    });

    function herstel() {
      punten.forEach(function (p, k) { zetPunt(p, BEGIN[k]); });
      bord.update();
    }

    schik();
    werkPaneelBij();
    ctx.toon(beschrijving());
    return {
      reset: herstel,
      herschaal: schik,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  }

  G.registreer("det-rechte", function (ctx) { return meetkundeFiguur(ctx, "rechte"); });
  G.registreer("det-collineair", function (ctx) { return meetkundeFiguur(ctx, "collineair"); });
  G.registreer("det-driehoek", function (ctx) { return meetkundeFiguur(ctx, "driehoek"); });

}());
