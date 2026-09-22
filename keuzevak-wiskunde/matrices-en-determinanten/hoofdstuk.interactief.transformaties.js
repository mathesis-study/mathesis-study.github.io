/* Interactieve grafieken bij Transformaties van het vlak in matricesdeterminanten.tex.
 *
 * Op papier staat bij elke transformatie één driehoek en één beeld. Hier
 * verandert de matrix onder je handen en schuift, rekt, spiegelt of draait
 * het beeld mee, zodat je ziet wat elk getal in de matrix doet. Het tekstvak
 * rekent telkens het product uit dat in de cursus staat.
 *
 * Intern is elke transformatie een 3×3-matrix in homogene coördinaten: zo
 * gaan verschuiven en de lineaire transformaties door dezelfde functie.
 *
 * schikBord, eenheidsrooster en roosterpunt komen overeen met die in
 * L03_Determinanten.interactief.js. Ze staan hier apart omdat dit de enige
 * andere gebruiker is; bij een derde horen ze in web/.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G || !window.JXG) return;

  /* --- Figuren ----------------------------------------------------------- */

  // De driehoek uit de cursus, en een letter F: die heeft geen enkele
  // symmetrie, dus een spiegeling of een draaiing is er altijd aan te zien.
  // Het icoon van de driehoek is de rechthoekige driehoek ABC zelf.
  var DRIEHOEK = {
    naam: "driehoek",
    knop: 'Driehoek <svg viewBox="0 0 12 9" width="1.1em" height=".85em" ' +
      'aria-hidden="true" style="vertical-align:-.05em">' +
      '<polygon points="1,8 11,8 1,1.5" fill="currentColor" fill-opacity=".25" ' +
      'stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    punten: [[1, 1], [3, 1], [1, 2]],
    letters: ["A", "B", "C"]
  };
  var LETTER_F = {
    naam: "letter F",
    knop: "Letter F",
    punten: [[1, 0.5], [1.4, 0.5], [1.4, 1.3], [2, 1.3], [2, 1.7], [1.4, 1.7],
             [1.4, 2.1], [2.2, 2.1], [2.2, 2.5], [1, 2.5]],
    letters: null
  };
  var FIGUREN = [DRIEHOEK, LETTER_F];

  /* --- Rekenen ----------------------------------------------------------- */

  function eenheid() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }

  function lineair(m) {
    return [[m[0][0], m[0][1], 0], [m[1][0], m[1][1], 0], [0, 0, 1]];
  }

  function verschuiving(a, b) { return [[1, 0, a], [0, 1, b], [0, 0, 1]]; }

  function draaiing(graden) {
    var a = graden * Math.PI / 180;
    return lineair([[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]]);
  }

  function maal(A, B) {
    var C = [];
    for (var i = 0; i < A.length; i++) {
      C.push([]);
      for (var j = 0; j < B[0].length; j++) {
        var s = 0;
        for (var k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
        C[i].push(s);
      }
    }
    return C;
  }

  function beeld(M, p) {
    return [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2],
            M[1][0] * p[0] + M[1][1] * p[1] + M[1][2]];
  }

  function links2(M) { return [[M[0][0], M[0][1]], [M[1][0], M[1][1]]]; }

  function gelijk(A, B) {
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[i].length; j++) {
        if (Math.abs(A[i][j] - B[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  // De figuur als matrix: een rij x, een rij y en eventueel een rij enen.
  function figuurMatrix(figuur, M, homogeen) {
    var punten = figuur.punten.map(function (p) { return beeld(M, p); });
    var rijen = [punten.map(function (p) { return p[0]; }),
                 punten.map(function (p) { return p[1]; })];
    if (homogeen) rijen.push(punten.map(function () { return 1; }));
    return rijen;
  }

  /* --- Tekst ------------------------------------------------------------- */

  // Twee decimalen, geen nullen achteraan, en een echt minteken.
  function tekenGetal(x, d) {
    var t = (Math.abs(x) < 5e-10 ? 0 : x).toFixed(d === undefined ? 2 : d);
    if (t.indexOf(".") >= 0) t = t.replace(/0+$/, "").replace(/\.$/, "");
    if (t === "-0") t = "0";
    return t.replace("-", "−");
  }

  function kleurtekst(tekst, rol) {
    return '<span style="color:var(--grafiek-' + rol + ')">' + tekst + "</span>";
  }

  // Een matrix tussen ronde haken, als klein HTML-tabelletje. Kolomkleuren
  // en rijkleuren zijn rollen, zodat ze de dag- en nachtstand volgen.
  function matrixHtml(rijen, o) {
    o = o || {};
    var html = '<table style="display:inline-table;vertical-align:middle;' +
      "border-collapse:separate;border-spacing:0;border:0;" +
      "border-left:1.5px solid currentColor;border-right:1.5px solid currentColor;" +
      'border-radius:.6em;margin:0 .25em">';
    rijen.forEach(function (rij, i) {
      html += "<tr>" + rij.map(function (c, j) {
        var rol = (o.kolommen && o.kolommen[j]) || (o.rijen && o.rijen[i]);
        var kleur = rol ? "color:var(--grafiek-" + rol + ");" : "";
        var tekst = typeof c === "number" ? tekenGetal(c, o.decimalen) : c;
        return '<td style="' + kleur + 'border:0;padding:.02em .4em;' +
          'text-align:right">' + tekst + "</td>";
      }).join("") + "</tr>";
    });
    return html + "</table>";
  }

  function tekstvak(ctx, bord, x, y, inhoud) {
    var t = bord.create("text", [x, y, inhoud], {
      anchorX: "left", anchorY: "top", fixed: true, highlight: false,
      useMathJax: false, fontSize: 15,
      cssStyle: "background:var(--kleur-vlak-zweef);padding:.35em .6em;" +
        "line-height:1.55;border-radius:4px;white-space:nowrap"
    });
    return ctx.stijl(t, "tekst");
  }

  function zonderHtml(tekst) {
    return tekst.replace(/<br>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  }

  /* --- Invoervelden ------------------------------------------------------ */

  // Een matrix waarvan de leerling de elementen zelf intypt, staat in een
  // tabel met dezelfde ronde haken als matrixHtml, maar met een invoerveld in
  // elke cel. Zo'n tekstvak wordt één keer opgebouwd en daarna enkel
  // bijgewerkt: zou het bij elke update opnieuw geschreven worden, dan
  // verdween het veld waarin de leerling typt.
  var VELD = 2.9; // breedte van een invoerveld, in em

  function haakTabel() {
    var tabel = document.createElement("table");
    tabel.style.cssText = "display:inline-table;vertical-align:middle;" +
      "border-collapse:separate;border-spacing:0;border:0;" +
      "border-left:1.5px solid currentColor;border-right:1.5px solid currentColor;" +
      "border-radius:.6em;margin:0 .25em";
    return tabel;
  }

  // Wat in een veld staat: een minteken als koppelteken, zodat het getal
  // gewoon verder te bewerken is.
  function veldtekst(x) { return tekenGetal(x).replace("−", "-"); }

  // Een getal zoals in de cursus: met een decimale punt, eventueel een
  // minteken, en tussen laag en hoog. Anders null.
  function leesGetal(tekst, laag, hoog) {
    var t = tekst.trim().replace("−", "-");
    if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
    var x = parseFloat(t);
    return x >= laag && x <= hoog ? x : null;
  }

  // Een invoerveld voor één getal. Een geldig getal gaat meteen naar
  // o.zet; een ongeldig kleurt de rand en zegt onder de grafiek wat er
  // scheelt. Bij het verlaten zet o.terug de actuele waarde er weer in.
  function getalVeld(ctx, o) {
    var veld = document.createElement("input");
    veld.type = "text";
    veld.inputMode = "decimal";
    veld.autocomplete = "off";
    veld.spellcheck = false;
    veld.setAttribute("aria-label", o.label);
    veld.style.cssText = "width:" + VELD + "em;box-sizing:border-box;text-align:right;" +
      "font:inherit;padding:.1em .25em;border-radius:3px;" +
      "border:1px solid var(--grafiek-hulp);background:var(--grafiek-vlak);" +
      "color:var(--grafiek-" + o.rol + ")";
    veld.addEventListener("input", function () {
      var x = leesGetal(veld.value, o.laag, o.hoog);
      veld.style.borderColor = x === null ? "var(--grafiek-secante)" : "var(--grafiek-hulp)";
      if (x === null) {
        ctx.toon(o.naam + " moet een getal tussen " + tekenGetal(o.laag) + " en " +
          tekenGetal(o.hoog) + " zijn.");
        return;
      }
      o.zet(x);
    });
    veld.addEventListener("blur", function () {
      veld.style.borderColor = "var(--grafiek-hulp)";
      o.terug();
    });
    // JSXGraph zou een klik in het veld als het begin van een sleep op het
    // bord lezen.
    ["pointerdown", "mousedown", "touchstart"].forEach(function (soort) {
      veld.addEventListener(soort, function (e) { e.stopPropagation(); });
    });
    return veld;
  }

  // Zet waarde in het veld. Dat gebeurt enkel na een sleep, een knop of het
  // verlaten van een veld, nooit terwijl de leerling typt: een half getypt
  // getal blijft dus staan.
  function vulVeld(veld, waarde) { veld.value = veldtekst(waarde); }

  // Wie een punt sleept, is klaar met typen. JSXGraph neemt de focus niet
  // over, dus zonder deze stap bleef het veld gekozen staan.
  function verlaatVeld(velden) {
    var actief = document.activeElement;
    if (velden.indexOf(actief) >= 0) actief.blur();
  }

  /* --- Bord -------------------------------------------------------------- */

  // Een assenstelsel met gelijke schaal en een tekstvak ernaast op een breed
  // bord, eronder op een smal. Het resultaat is de linkerbovenhoek van het
  // vak. Zie L03_Determinanten.interactief.js voor de uitleg.
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

  // Het venster voor een figuur die buiten het gewone venster kan komen:
  // minstens plot, en ruim genoeg dat elk punt er met een marge in staat.
  // Het wordt enkel na het typen of het loslaten opnieuw berekend, nooit
  // tijdens een sleep, zodat het rooster niet onder de muis verschuift.
  function omvat(plot, punten) {
    var marge = 0.8;
    var r = plot.slice();
    punten.forEach(function (p) {
      r[0] = Math.min(r[0], p[0] - marge);
      r[2] = Math.max(r[2], p[0] + marge);
      r[3] = Math.min(r[3], p[1] - marge);
      r[1] = Math.max(r[1], p[1] + marge);
    });
    return r;
  }

  // Het bereik van getypte en gesleepte coördinaten, als [links, boven,
  // rechts, onder].
  var INVOER = [-10, 10, 10, -10];

  function eenheidsrooster(ctx, bord) {
    return ctx.stijl(bord.create("grid", [], {
      majorStep: 1, minorElements: 0, strokeOpacity: 1, fixed: true, highlight: false
    }), "raster");
  }

  // Een sleepbaar roosterpunt dat binnen grens = [links, boven, rechts,
  // onder] blijft, op veelvouden van stap (standaard 1).
  function roosterpunt(ctx, bord, xy, naam, rol, grens, stap) {
    stap = stap || 1;
    var p = ctx.stijl(bord.create("point", xy, {
      name: naam, size: 4, showInfobox: false,
      snapToGrid: true, snapSizeX: stap, snapSizeY: stap,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [8, 12] }
    }), rol);
    p.on("drag", function () {
      var x = Math.max(grens[0], Math.min(grens[2], Math.round(p.X() / stap) * stap));
      var y = Math.max(grens[3], Math.min(grens[1], Math.round(p.Y() / stap) * stap));
      if (x !== p.X() || y !== p.Y()) {
        p.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
      }
    });
    return p;
  }

  function zetPunt(p, xy) {
    p.setPosition(window.JXG.COORDS_BY_USER, xy);
  }

  // Een getypte coördinaat mag tussen de roosterlijnen liggen. snapToGrid
  // werkt enkel bij het plaatsen en het slepen, dus staat het daarvoor even uit.
  function zetGetypt(p, xy) {
    p.setAttribute({ snapToGrid: false });
    zetPunt(p, xy);
    p.setAttribute({ snapToGrid: true });
  }

  function verborgenPunt(bord, f) {
    return bord.create("point", [
      function () { return f()[0]; },
      function () { return f()[1]; }
    ], { visible: false, fixed: true, name: "", withLabel: false });
  }

  function pijl(ctx, bord, van, naar, rol, o) {
    o = o || {};
    return ctx.stijl(bord.create("arrow", [verborgenPunt(bord, van), verborgenPunt(bord, naar)], {
      strokeWidth: o.dikte || 2, dash: o.streep || 0, strokeOpacity: o.opaciteit || 1,
      fixed: true, highlight: false,
      lastArrow: { type: 2, size: o.punt || 5 },
      visible: o.zichtbaar || true
    }), rol);
  }

  /* --- Een figuur en haar beelden ---------------------------------------- */

  // Hoe een beeld eruitziet: de gegeven figuur grijs en gestreept, een
  // tussenstap oranje en gestreept, het eindbeeld blauw en vol.
  var SOORTEN = {
    origineel: { rol: "hulp", vul: "zwak", opaciteit: 0.12, streep: 2, dikte: 1.5 },
    tussen: { rol: "secante", vul: "secante", opaciteit: 0.10, streep: 2, dikte: 2 },
    beeld: { rol: "punt", vul: "punt", opaciteit: 0.25, streep: 0, dikte: 2.5 }
  };

  // Tekent elke figuur uit FIGUREN één keer als beeld onder matrix(); enkel
  // de figuur die st.figuur aanwijst, is zichtbaar. accent is het
  // aanhangsel van de namen: "", "'" of "''".
  function maakVorm(ctx, bord, st, soort, matrix, accent, kleurVan) {
    var s = SOORTEN[soort];
    var vormen = FIGUREN.map(function (figuur, f) {
      var punten = figuur.punten.map(function (p) {
        return verborgenPunt(bord, function () { return beeld(matrix(), p); });
      });
      var veelhoek = bord.create("polygon", punten, {
        fixed: true, highlight: false, hasInnerPoints: false, layer: soort === "beeld" ? 3 : 2,
        fillColor: function () { return kleurVan(s.vul); },
        fillOpacity: s.opaciteit,
        borders: {
          strokeWidth: s.dikte, dash: s.streep, fixed: true, highlight: false,
          strokeColor: function () { return kleurVan(s.rol); }
        },
        vertices: { visible: false }
      });
      var namen = [];
      if (figuur.letters && accent !== null) {
        namen = figuur.letters.map(function (letter, k) {
          // Het opschrift staat een eindje buiten de figuur, weg van het
          // zwaartepunt, zodat het nooit op een zijde valt.
          function plaats() {
            var M = matrix();
            var q = figuur.punten.map(function (p) { return beeld(M, p); });
            var gx = 0, gy = 0;
            q.forEach(function (p) { gx += p[0] / q.length; gy += p[1] / q.length; });
            var dx = q[k][0] - gx, dy = q[k][1] - gy;
            var r = Math.sqrt(dx * dx + dy * dy) || 1;
            return [q[k][0] + 0.32 * dx / r, q[k][1] + 0.32 * dy / r];
          }
          return ctx.stijl(bord.create("text", [
            function () { return plaats()[0]; },
            function () { return plaats()[1]; },
            letter + accent
          ], {
            anchorX: "middle", anchorY: "middle", fixed: true, highlight: false,
            fontSize: 14, useMathJax: false, cssStyle: "font-style:italic"
          }), soort === "origineel" ? "zwak" : s.rol);
        });
      }
      return { f: f, veelhoek: veelhoek, namen: namen };
    });

    var zichtbaar = true;
    function toon() {
      vormen.forEach(function (v) {
        var aan = zichtbaar && FIGUREN[st.figuur] === FIGUREN[v.f];
        v.veelhoek.setAttribute({ visible: aan });
        v.veelhoek.borders.forEach(function (b) { b.setAttribute({ visible: aan }); });
        v.namen.forEach(function (n) { n.setAttribute({ visible: aan }); });
      });
    }
    toon();
    return {
      toon: toon,
      zichtbaar: function (aan) { zichtbaar = aan; toon(); }
    };
  }

  // Het gemeenschappelijke skelet: een bord met rooster en assen, een
  // tekstvak, de gegeven figuur en de knop om van figuur te wisselen.
  function transformatieBord(ctx, opties) {
    var PLOT = opties.plot;
    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var st = { figuur: 0, vak: [PLOT[2], PLOT[1]] };
    var vormen = [];

    function kleurVan(rol) { return kleuren[rol]; }
    function vorm(soort, matrix, accent) {
      var v = maakVorm(ctx, bord, st, soort, matrix, accent, kleurVan);
      vormen.push(v);
      return v;
    }
    function schik() {
      st.vak = schikBord(bord, PLOT, opties.paneel[0], opties.paneel[1]);
      bord.fullUpdate();
    }
    function paneel(inhoud) {
      tekstvak(ctx, bord, function () { return st.vak[0]; },
        function () { return st.vak[1]; }, inhoud);
    }

    // De keuze van de figuur is een schakelaar: één knop per figuur, samen
    // in één groep, en de gekozen knop staat ingedrukt.
    var figuurKnoppen = [];
    if (opties.figuurKnop !== false) {
      var groep = document.createElement("span");
      groep.className = "interactieve-grafiek-schakelaar";
      groep.setAttribute("role", "group");
      groep.setAttribute("aria-label", "Figuur");
      figuurKnoppen = FIGUREN.map(function (figuur, f) {
        var knop = ctx.knop(figuur.naam, function () { zetFiguur(f); });
        if (!f) knop.parentNode.insertBefore(groep, knop);
        groep.appendChild(knop);
        knop.innerHTML = figuur.knop;
        return knop;
      });
    }
    function zetFiguur(f) {
      st.figuur = f;
      figuurKnoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", k === f ? "true" : "false");
      });
      vormen.forEach(function (v) { v.toon(); });
      bord.update();
    }

    vorm("origineel", eenheid, "");
    zetFiguur(0);

    return {
      bord: bord, st: st, vorm: vorm, schik: schik, paneel: paneel,
      zetFiguur: zetFiguur,
      zetPlot: function (p) { PLOT = p; },
      driehoek: function () { return FIGUREN[st.figuur] === DRIEHOEK; },
      figuur: function () { return FIGUREN[st.figuur]; },
      api: function (herstel) {
        return {
          reset: herstel,
          herschaal: schik,
          kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
        };
      }
    };
  }

  /* --- 0. Een figuur als matrix ------------------------------------------ */

  // De figuur en haar matrix zijn twee kanten van hetzelfde: sleep je een
  // hoekpunt, dan verandert zijn kolom; typ je een getal in de matrix, dan
  // verspringt het hoekpunt. Met + en − komt er een kolom bij of gaat de
  // laatste weg.
  //
  // De matrix staat in het tekstvak als invoervelden (zie getalVeld).
  G.registreer("figuur-als-matrix", function (ctx) {
    var BEGIN = [[1, 1], [3, 1], [1, 2]];
    var MIN = 2, MAX = 8;
    var LETTERS = "ABCDEFGH";
    var GRENS = [-3, 4, 6, -2]; // waar een nieuw hoekpunt mag komen
    var PLOT = [-3.6, 4.6, 6.6, -2.6];

    var bord = ctx.maakBord({ begrenzing: PLOT, gelijkeschaal: true });
    eenheidsrooster(ctx, bord);
    var kleuren = ctx.kleuren();
    var punten = [];
    var veelhoek = null;
    var vak = [PLOT[2], PLOT[1]];

    function kleurVan(rol) { return kleuren[rol]; }

    function tekenVeelhoek() {
      if (veelhoek) bord.removeObject(veelhoek);
      veelhoek = bord.create("polygon", punten, {
        fixed: true, highlight: false, hasInnerPoints: false, layer: 2,
        fillColor: function () { return kleurVan("punt"); },
        fillOpacity: 0.2,
        borders: {
          strokeWidth: 2.5, fixed: true, highlight: false,
          strokeColor: function () { return kleurVan("punt"); }
        },
        vertices: { visible: false }
      });
    }

    function voegPuntToe(xy) {
      var p = roosterpunt(ctx, bord, xy, LETTERS[punten.length], "punt", INVOER);
      p.on("drag", function () {
        verlaatVeld([].concat.apply([], velden));
        schrijfVelden();
      });
      p.on("up", schik);
      punten.push(p);
    }

    function coord(p) { return [p.X(), p.Y()]; }

    // Een vrij roosterpunt voor een nieuw hoekpunt: naast het midden van de
    // sluitende zijde, aan de kant weg van de figuur, zodat de veelhoek er
    // een hoek bij krijgt en niet over zichzelf plooit.
    function nieuwPunt() {
      var q = punten.map(coord);
      var a = q[q.length - 1], b = q[0];
      var gx = 0, gy = 0;
      q.forEach(function (p) { gx += p[0] / q.length; gy += p[1] / q.length; });
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var nx = -(b[1] - a[1]), ny = b[0] - a[0];
      if (nx * (mx - gx) + ny * (my - gy) < 0) { nx = -nx; ny = -ny; }
      var r = Math.sqrt(nx * nx + ny * ny) || 1;
      var kandidaten = [];
      [1, 0.5, 1.5, 2].forEach(function (d) {
        kandidaten.push([Math.round(mx + d * nx / r), Math.round(my + d * ny / r)]);
      });
      for (var x = GRENS[0]; x <= GRENS[2]; x++) {
        for (var y = GRENS[3]; y <= GRENS[1]; y++) kandidaten.push([x, y]);
      }
      for (var k = 0; k < kandidaten.length; k++) {
        var c = kandidaten[k];
        var binnen = c[0] >= GRENS[0] && c[0] <= GRENS[2] && c[1] >= GRENS[3] && c[1] <= GRENS[1];
        var bezet = q.some(function (p) { return p[0] === c[0] && p[1] === c[1]; });
        if (binnen && !bezet) return c;
      }
      return [0, 0];
    }

    /* Het tekstvak met de matrix. */

    var paneel = tekstvak(ctx, bord, function () { return vak[0]; },
      function () { return vak[1]; }, "");
    var velden = [];

    function bouwPaneel() {
      var n = punten.length;
      var node = paneel.rendNode;
      node.innerHTML = "";
      velden = [];
      var kop = document.createElement("div");
      kop.textContent = "F =";
      kop.style.cssText = "display:inline-block;vertical-align:middle;margin-right:.2em";
      node.appendChild(kop);

      var tabel = haakTabel();
      var namen = document.createElement("tr");
      for (var j = 0; j < n; j++) {
        var td = document.createElement("td");
        td.textContent = LETTERS[j];
        td.style.cssText = "border:0;padding:0 .15em;text-align:center;font-style:italic;" +
          "font-size:.8em;color:var(--grafiek-zwak)";
        namen.appendChild(td);
      }
      tabel.appendChild(namen);
      [0, 1].forEach(function (as) {
        var rij = document.createElement("tr");
        velden.push([]);
        for (var j = 0; j < n; j++) {
          (function (j) {
            var td = document.createElement("td");
            td.style.cssText = "border:0;padding:.1em .15em";
            var laag = as === 0 ? INVOER[0] : INVOER[3], hoog = as === 0 ? INVOER[2] : INVOER[1];
            var veld = getalVeld(ctx, {
              label: (as === 0 ? "x" : "y") + "-coördinaat van " + LETTERS[j],
              naam: (as === 0 ? "x" : "y") + " van " + LETTERS[j],
              rol: "punt", laag: laag, hoog: hoog,
              zet: function (x) {
                var p = punten[j];
                zetGetypt(p, as === 0 ? [x, p.Y()] : [p.X(), x]);
                schik();
              },
              terug: schrijfVelden
            });
            td.appendChild(veld);
            rij.appendChild(td);
            velden[as].push(veld);
          }(j));
        }
        tabel.appendChild(rij);
      });
      node.appendChild(tabel);

      var orde = document.createElement("div");
      orde.textContent = n + " hoekpunten: een 2 × " + n + "-matrix";
      orde.style.cssText = "font-size:.85em;color:var(--grafiek-zwak)";
      node.appendChild(orde);
      schrijfVelden();
    }

    // Zet de coördinaten in de velden.
    function schrijfVelden() {
      velden.forEach(function (rij, as) {
        rij.forEach(function (veld, j) {
          vulVeld(veld, as === 0 ? punten[j].X() : punten[j].Y());
        });
      });
    }

    function schik() {
      var breedte = (punten.length * (VELD + 0.3) + 4.5) * 15;
      var plot = omvat(PLOT, punten.map(coord));
      vak = schikBord(bord, plot, breedte, 130);
      // Naast het assenstelsel zakt het vak onder de knoppen Groot en Reset
      // rechtsboven; de invoervelden zijn hoger dan de tekst in de andere vakken.
      if (vak[0] > plot[2] && bord.unitY) vak = [vak[0], vak[1] - 36 / bord.unitY];
      bord.fullUpdate();
    }

    function beschrijving() {
      return "De figuur heeft " + punten.length + " hoekpunten: " + punten.map(function (p, j) {
        return LETTERS[j] + "(" + tekenGetal(p.X()) + ", " + tekenGetal(p.Y()) + ")";
      }).join(", ") + ". Dat is een 2 × " + punten.length + "-matrix.";
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    function zetAantal(lijst) {
      while (punten.length) bord.removeObject(punten.pop());
      if (veelhoek) { bord.removeObject(veelhoek); veelhoek = null; }
      lijst.forEach(voegPuntToe);
      tekenVeelhoek();
      bouwPaneel();
      schik();
      werkKnoppen();
    }

    var plus = ctx.knop("+ punt", function () {
      if (punten.length >= MAX) return;
      zetAantal(punten.map(coord).concat([nieuwPunt()]));
    });
    var min = ctx.knop("− punt", function () {
      if (punten.length <= MIN) return;
      zetAantal(punten.map(coord).slice(0, -1));
    });
    plus.setAttribute("aria-label", "Voeg een hoekpunt toe");
    min.setAttribute("aria-label", "Verwijder het laatste hoekpunt");
    function werkKnoppen() {
      plus.disabled = punten.length >= MAX;
      min.disabled = punten.length <= MIN;
    }

    function herstel() { zetAantal(BEGIN); }
    zetAantal(BEGIN);
    ctx.toon(beschrijving());
    return {
      reset: herstel,
      herschaal: schik,
      kleur: function (k) { kleuren = k || ctx.kleuren(); bord.update(); }
    };
  });

  /* --- 1. Verschuiven ---------------------------------------------------- */

  // De verschuivingsvector hangt aan de oorsprong en wordt versleept, of de
  // leerling typt zijn coördinaten in het tekstvak. Elk hoekpunt krijgt een
  // stippelpijl naar zijn beeld: allemaal even lang en evenwijdig, want elke
  // kolom van T is dezelfde vector.
  G.registreer("transformatie-verschuiven", function (ctx) {
    var BEGIN = [3, -1];
    var PLOT = [-5.6, 5.6, 7.6, -4.6];
    var t = transformatieBord(ctx, { plot: PLOT, paneel: [330, 160] });
    var bord = t.bord;
    var v = roosterpunt(ctx, bord, BEGIN, "", "secante", INVOER);
    function M() { return verschuiving(v.X(), v.Y()); }

    t.vorm("beeld", M, "'");
    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [v.X(), v.Y()]; },
      "secante", { dikte: 3 });
    ctx.stijl(bord.create("text", [
      function () { return v.X() / 2; }, function () { return v.Y() / 2; }, "v"
    ], { fixed: true, highlight: false, fontSize: 15, useMathJax: false,
         anchorX: "right", anchorY: "bottom", cssStyle: "font-weight:bold;font-style:italic" }),
      "secante");
    DRIEHOEK.punten.forEach(function (p) {
      pijl(ctx, bord, function () { return t.driehoek() ? p : [0, 0]; },
        function () { return t.driehoek() ? beeld(M(), p) : [0, 0]; },
        "secante", { dikte: 1.2, streep: 2, opaciteit: 0.8 });
    });

    // Slepen houdt v op het rooster; getypt mag het ook een decimaal getal
    // zijn.
    function a() { return v.X(); }
    function b() { return v.Y(); }

    // Het tekstvak: bovenaan v met twee invoervelden, eronder de som, die
    // bij elke update opnieuw geschreven wordt.
    var vak = tekstvak(ctx, bord, function () { return t.st.vak[0]; },
      function () { return t.st.vak[1]; }, "");
    var kop = document.createElement("div");
    var tabel = haakTabel();
    var velden = [0, 1].map(function (as) {
      var laag = as === 0 ? INVOER[0] : INVOER[3], hoog = as === 0 ? INVOER[2] : INVOER[1];
      var veld = getalVeld(ctx, {
        label: (as === 0 ? "x" : "y") + "-coördinaat van de verschuivingsvector v",
        naam: (as === 0 ? "x" : "y") + " van v",
        rol: "secante", laag: laag, hoog: hoog,
        zet: function (x) {
          zetGetypt(v, as === 0 ? [x, v.Y()] : [v.X(), x]);
          schik();
        },
        terug: schrijfVelden
      });
      var rij = document.createElement("tr");
      var td = document.createElement("td");
      td.style.cssText = "border:0;padding:.1em .15em";
      td.appendChild(veld);
      rij.appendChild(td);
      tabel.appendChild(rij);
      return veld;
    });
    kop.appendChild(document.createTextNode("v ="));
    kop.appendChild(tabel);
    var rest = document.createElement("div");
    vak.rendNode.appendChild(kop);
    vak.rendNode.appendChild(rest);

    function schrijfVelden() {
      vulVeld(velden[0], v.X());
      vulVeld(velden[1], v.Y());
    }
    v.on("drag", function () {
      verlaatVeld(velden);
      schrijfVelden();
    });
    v.on("up", function () { schik(); });

    // De vector, de figuur en haar beeld moeten in beeld blijven.
    function schik() {
      var punten = [[v.X(), v.Y()]];
      t.figuur().punten.forEach(function (p) { punten.push(p, beeld(M(), p)); });
      t.zetPlot(omvat(PLOT, punten));
      t.schik();
    }

    function inhoud() {
      var html = "";
      if (t.driehoek()) {
        var F = figuurMatrix(DRIEHOEK, eenheid());
        var T = [[a(), a(), a()], [b(), b(), b()]];
        html += "F + T = F′<br>" + matrixHtml(F) + "+" +
          matrixHtml(T, { kolommen: ["secante", "secante", "secante"] }) + "=" +
          matrixHtml(figuurMatrix(DRIEHOEK, M()));
      } else {
        html += "Elk punt schuift over v:<br>x′ = x " + plusGetal(a()) +
          " en y′ = y " + plusGetal(b());
      }
      return html;
    }
    function werkVakBij() { rest.innerHTML = inhoud(); }

    function beschrijving() {
      var tekst = "De verschuivingsvector is v = (" + tekenGetal(a()) + ", " +
        tekenGetal(b()) + ").";
      if (t.driehoek()) {
        var Fb = figuurMatrix(DRIEHOEK, M());
        tekst += " A′(" + tekenGetal(Fb[0][0]) + ", " + tekenGetal(Fb[1][0]) + "), B′(" +
          tekenGetal(Fb[0][1]) + ", " + tekenGetal(Fb[1][1]) + "), C′(" +
          tekenGetal(Fb[0][2]) + ", " + tekenGetal(Fb[1][2]) + ").";
      }
      return tekst;
    }
    bord.on("update", function () {
      werkVakBij();
      ctx.toon(beschrijving());
    });

    function herstel() {
      zetPunt(v, BEGIN);
      t.zetFiguur(0);
      schrijfVelden();
      schik();
    }
    schrijfVelden();
    werkVakBij();
    schik();
    ctx.toon(beschrijving());
    var api = t.api(herstel);
    api.herschaal = schik;
    return api;
  });

  function plusGetal(x) {
    return (x < 0 ? "− " : "+ ") + tekenGetal(Math.abs(x));
  }

  /* --- 2. De kolommen van de matrix -------------------------------------- */

  // De bekende transformaties uit de cursus, voor de knoppen en om te
  // herkennen wat de leerling zelf gesleept heeft.
  var BEKEND = [
    { knop: "Eenheid", naam: "de eenheidsmatrix: alles blijft staan", m: [[1, 0], [0, 1]] },
    { knop: "Schaal ×2", naam: "vergroting met factor 2", m: [[2, 0], [0, 2]] },
    { knop: "Spiegel x-as", naam: "spiegeling om de x-as", m: [[1, 0], [0, -1]] },
    { knop: "Spiegel y-as", naam: "spiegeling om de y-as", m: [[-1, 0], [0, 1]] },
    { knop: "Spiegel y = x", naam: "spiegeling om de rechte y = x", m: [[0, 1], [1, 0]] },
    { knop: "Draai 90°", naam: "draaiing over 90° om de oorsprong", m: [[0, -1], [1, 0]] },
    { knop: "Afschuiving", naam: "afschuiving: x′ = x + y", m: [[1, 1], [0, 1]] },
    { naam: "spiegeling om de rechte y = −x", m: [[0, -1], [-1, 0]] },
    { naam: "draaiing over 180°, of puntspiegeling om O", m: [[-1, 0], [0, -1]] },
    { naam: "draaiing over −90° om de oorsprong", m: [[0, 1], [-1, 0]] },
    { naam: "projectie op de x-as", m: [[1, 0], [0, 0]] },
    { naam: "projectie op de y-as", m: [[0, 0], [0, 1]] }
  ];

  function herken(m) {
    for (var k = 0; k < BEKEND.length; k++) {
      if (gelijk(BEKEND[k].m, m)) return BEKEND[k].naam;
    }
    if (m[0][1] === 0 && m[1][0] === 0) {
      return "schaling met k = " + tekenGetal(m[0][0]) + " en l = " + tekenGetal(m[1][1]);
    }
    return "";
  }

  /* --- Schalen ---------------------------------------------------------- */

  // Dit blok staat na BEKEND en herken: een grafiek waarvan de slide al in
  // beeld is, wordt meteen bij registreer gebouwd.

  function naamSchaling(k, l) {
    var bekend = herken([[k, 0], [0, l]]);
    if (bekend && !/^schaling/.test(bekend)) return bekend;
    if (k === l) {
      var f = Math.abs(k);
      var soort = f > 1 ? "vergroting" : "verkleining";
      return k > 0 ? soort + " met factor " + tekenGetal(k)
        : "puntspiegeling om O met een " + soort + " met factor " + tekenGetal(f);
    }
    return "schaling met k = " + tekenGetal(k) + " en l = " + tekenGetal(l);
  }

  // Omdat A(1, 1) is, valt het beeld A′ samen met (k, l): wie A′ versleept,
  // kiest dus de twee factoren. Bij de letter F blijft de hendel op (k, l),
  // het beeld van (1, 1). Of de leerling typt k en l op de diagonaal
  // van S. De stippellijnen vanuit O tonen dat een vergroting vanuit de
  // oorsprong werkt.
  G.registreer("transformatie-schalen", function (ctx) {
    var BEGIN = [2, 2];
    var BEREIK = [-4, 4, 4, -4];
    var PLOT = [-4.6, 5.6, 7.6, -3.6];
    var t = transformatieBord(ctx, { plot: PLOT, paneel: [360, 190] });
    var bord = t.bord;
    var hendel = roosterpunt(ctx, bord, BEGIN, "", "secante", BEREIK, 0.5);
    var st = t.st;
    st.gekoppeld = false;
    function k() { return hendel.X(); }
    function l() { return hendel.Y(); }
    function S() { return lineair([[k(), 0], [0, l()]]); }

    DRIEHOEK.punten.forEach(function (p) {
      ctx.stijl(bord.create("segment", [
        verborgenPunt(bord, function () { return [0, 0]; }),
        verborgenPunt(bord, function () { return beeld(S(), p); })
      ], { strokeWidth: 1, dash: 1, fixed: true, highlight: false, layer: 1,
           visible: function () { return t.driehoek(); } }), "hulp");
    });
    t.vorm("beeld", S, "'");
    // Met k = l ingedrukt kan A′ enkel over de rechte y = x: daar is k = l.
    ctx.stijl(bord.create("line", [[0, 0], [1, 1]], {
      strokeWidth: 1.2, dash: 2, fixed: true, highlight: false, layer: 1,
      visible: function () { return st.gekoppeld; }
    }), "secante");
    // Bij de letter F is de hendel geen hoekpunt: hij heet dan gewoon (k, l).
    ctx.stijl(bord.create("text", [
      function () { return hendel.X() + 0.25; }, function () { return hendel.Y() + 0.3; }, "(k, l)"
    ], { fixed: true, highlight: false, fontSize: 14, useMathJax: false,
         anchorX: "left", anchorY: "bottom", cssStyle: "font-style:italic",
         visible: function () { return !t.driehoek(); } }), "secante");

    // Het tekstvak: S met k en l als invoervelden, eronder het product.
    var vak = tekstvak(ctx, bord, function () { return t.st.vak[0]; },
      function () { return t.st.vak[1]; }, "");
    var kop = document.createElement("div");
    var tabel = haakTabel();
    var velden = [];
    [0, 1].forEach(function (i) {
      var rij = document.createElement("tr");
      [0, 1].forEach(function (j) {
        var td = document.createElement("td");
        td.style.cssText = "border:0;padding:.1em .15em;text-align:right";
        if (i !== j) {
          td.textContent = "0";
        } else {
          var veld = getalVeld(ctx, {
            label: i === 0 ? "factor k in de x-richting" : "factor l in de y-richting",
            naam: i === 0 ? "k" : "l",
            rol: "secante", laag: BEREIK[i === 0 ? 0 : 3], hoog: BEREIK[i === 0 ? 2 : 1],
            zet: function (x) {
              if (st.gekoppeld) {
                zetGetypt(hendel, [x, x]);
                // Enkel het andere veld: in dit veld typt de leerling nog.
                vulVeld(velden[1 - i], x);
              } else {
                zetGetypt(hendel, i === 0 ? [x, hendel.Y()] : [hendel.X(), x]);
              }
              schik();
            },
            terug: schrijfVelden
          });
          td.appendChild(veld);
          velden.push(veld);
        }
        rij.appendChild(td);
      });
      tabel.appendChild(rij);
    });
    kop.appendChild(document.createTextNode("S ="));
    kop.appendChild(tabel);
    var rest = document.createElement("div");
    vak.rendNode.appendChild(kop);
    vak.rendNode.appendChild(rest);

    function schrijfVelden() {
      vulVeld(velden[0], k());
      vulVeld(velden[1], l());
    }
    // Na de afronding van roosterpunt: gekoppeld komt A′ op het dichtste
    // punt van y = x, op een veelvoud van 0.5.
    hendel.on("drag", function () {
      if (st.gekoppeld) {
        var g = Math.round((hendel.X() + hendel.Y()) / 2 / 0.5) * 0.5;
        g = Math.max(BEREIK[0], Math.min(BEREIK[2], g));
        if (g !== hendel.X() || g !== hendel.Y()) zetPunt(hendel, [g, g]);
      }
      verlaatVeld(velden);
      schrijfVelden();
    });
    hendel.on("up", function () { schik(); });

    function werkVakBij() {
      var html = naamSchaling(k(), l());
      if (t.driehoek()) {
        html += "<br>S · F = F′<br>" +
          matrixHtml(links2(S()), { rijen: ["secante", "secante"] }) +
          matrixHtml(figuurMatrix(DRIEHOEK, eenheid())) + "=" +
          matrixHtml(figuurMatrix(DRIEHOEK, S()));
      } else {
        html += "<br>Elk punt: x′ = " + tekenGetal(k()) + " · x en y′ = " +
          tekenGetal(l()) + " · y";
      }
      rest.innerHTML = html;
    }

    function schik() {
      var punten = [[k(), l()]];
      t.figuur().punten.forEach(function (p) { punten.push(p, beeld(S(), p)); });
      t.zetPlot(omvat(PLOT, punten));
      t.schik();
    }

    function beschrijving() {
      var tekst = "k = " + tekenGetal(k()) + " en l = " + tekenGetal(l()) + ": " +
        naamSchaling(k(), l()) + ".";
      if (t.driehoek()) {
        var Fb = figuurMatrix(DRIEHOEK, S());
        tekst += " A′(" + tekenGetal(Fb[0][0]) + ", " + tekenGetal(Fb[1][0]) +
          "), B′(" + tekenGetal(Fb[0][1]) + ", " + tekenGetal(Fb[1][1]) + "), C′(" +
          tekenGetal(Fb[0][2]) + ", " + tekenGetal(Fb[1][2]) + ").";
      }
      return tekst;
    }
    bord.on("update", function () {
      werkVakBij();
      ctx.toon(beschrijving());
    });

    // Koppelen neemt k over in l, zodat de figuur meteen haar vorm behoudt.
    var koppelKnop = ctx.knop("k = l", function () { zetGekoppeld(!st.gekoppeld); });
    koppelKnop.title = "Gelijke factoren: de figuur behoudt haar vorm";
    function zetGekoppeld(aan) {
      st.gekoppeld = aan;
      koppelKnop.setAttribute("aria-pressed", aan ? "true" : "false");
      if (aan && k() !== l()) zetGetypt(hendel, [k(), k()]);
      verlaatVeld(velden);
      schrijfVelden();
      bord.update();
      schik();
    }

    function herstel() {
      zetPunt(hendel, BEGIN);
      zetGekoppeld(false);
      t.zetFiguur(0);
      schrijfVelden();
      schik();
    }
    koppelKnop.setAttribute("aria-pressed", "false");
    schrijfVelden();
    werkVakBij();
    schik();
    ctx.toon(beschrijving());
    var api = t.api(herstel);
    api.herschaal = schik;
    return api;
  });

  /* --- Spiegelen -------------------------------------------------------- */

  // De matrix van de spiegeling om de rechte door O die een hoek van g
  // graden met de x-as maakt. Afgerond, zodat 45° echte nullen en enen geeft.
  function spiegelMatrix(g) {
    var a = 2 * g * Math.PI / 180;
    function r(x) { return Math.round(x * 1e12) / 1e12; }
    return [[r(Math.cos(a)), r(Math.sin(a))], [r(Math.sin(a)), r(-Math.cos(a))]];
  }

  // De hoek van de spiegelas in [0°, 180°), of null als m geen spiegeling is.
  function spiegelHoek(m) {
    var e = 1e-9;
    if (Math.abs(m[0][0] + m[1][1]) > e || Math.abs(m[0][1] - m[1][0]) > e ||
        Math.abs(m[0][0] * m[0][0] + m[1][0] * m[1][0] - 1) > e) return null;
    var g = Math.atan2(m[1][0], m[0][0]) * 90 / Math.PI;
    if (g < 0) g += 180;
    return Math.abs(g - 180) < 1e-9 ? 0 : g;
  }

  function naamSpiegeling(m) {
    var bekend = herken(m);
    var g = spiegelHoek(m);
    if (g !== null) {
      return bekend || "spiegeling om de rechte door O onder " + tekenGetal(g, 1) + "°";
    }
    return (bekend ? bekend + ", " : "") + "geen spiegeling";
  }

  function omloopzin(m) {
    var d = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (Math.abs(d) < 1e-12) return "de figuur wordt platgedrukt";
    return d < 0 ? "de omloopzin keert om" : "de omloopzin blijft";
  }

  // De spiegelas gaat door O en door een hendel op een cirkel met straal 3.
  // Slepen draait de as in stappen van 45°, zodat de matrix de spiegelingen
  // uit de cursus geeft. Of de leerling typt zelf de vier elementen van M:
  // is dat een spiegeling, dan springt de as mee, anders verdwijnt ze en
  // zegt het tekstvak dat het geen spiegeling is.
  G.registreer("transformatie-spiegelen", function (ctx) {
    var BEGIN = 90;
    var STRAAL = 3;
    var BEREIK = [-5, 5];
    var PLOT = [-4.6, 4.6, 4.6, -3.6];
    var t = transformatieBord(ctx, { plot: PLOT, paneel: [360, 200] });
    var bord = t.bord;
    var st = t.st;
    st.m = spiegelMatrix(BEGIN);
    function M() { return lineair(st.m); }
    function as() { return spiegelHoek(st.m); }

    var O = bord.create("point", [0, 0], { visible: false, fixed: true, name: "" });
    var hendel = ctx.stijl(bord.create("point", [0, STRAAL], {
      name: "", size: 5, showInfobox: false, precision: { touch: 30, mouse: 6 }
    }), "secante");
    ctx.stijl(bord.create("line", [O, hendel], {
      strokeWidth: 2, fixed: true, highlight: false,
      visible: function () { return as() !== null; }
    }), "secante");
    ctx.stijl(bord.create("text", [
      function () { return hendel.X() * 1.12; }, function () { return hendel.Y() * 1.12 + 0.3; }, "s"
    ], { fixed: true, highlight: false, fontSize: 15, useMathJax: false,
         anchorX: "middle", anchorY: "middle", cssStyle: "font-style:italic;font-weight:bold",
         visible: function () { return as() !== null; } }), "secante");

    // Van elk hoekpunt een stippellijn naar zijn beeld: bij een spiegeling
    // staat ze loodrecht op de as en wordt ze door de as middendoor gedeeld.
    DRIEHOEK.punten.forEach(function (p) {
      ctx.stijl(bord.create("segment", [
        verborgenPunt(bord, function () { return p; }),
        verborgenPunt(bord, function () { return beeld(M(), p); })
      ], { strokeWidth: 1.2, dash: 2, fixed: true, highlight: false, layer: 1,
           visible: function () { return t.driehoek() && as() !== null; } }), "secante");
    });
    t.vorm("beeld", M, "'");

    function plaatsHendel(g) {
      var a = g * Math.PI / 180;
      // De hendel blijft aan de kant van de cirkel waar hij stond.
      var kant = hendel.X() * Math.cos(a) + hendel.Y() * Math.sin(a) < 0 ? -1 : 1;
      zetPunt(hendel, [kant * STRAAL * Math.cos(a), kant * STRAAL * Math.sin(a)]);
    }
    hendel.on("drag", function () {
      var g = Math.round(Math.atan2(hendel.Y(), hendel.X()) * 180 / Math.PI / 45) * 45;
      var a = g * Math.PI / 180;
      zetPunt(hendel, [STRAAL * Math.cos(a), STRAAL * Math.sin(a)]);
      st.m = spiegelMatrix(((g % 180) + 180) % 180);
      verlaatVeld(velden);
      schrijfVelden();
    });
    hendel.on("up", function () { schik(); });

    // Het tekstvak: M met vier invoervelden, eronder wat M doet.
    var vak = tekstvak(ctx, bord, function () { return st.vak[0]; },
      function () { return st.vak[1]; }, "");
    var kop = document.createElement("div");
    var tabel = haakTabel();
    var velden = [];
    [0, 1].forEach(function (i) {
      var rij = document.createElement("tr");
      [0, 1].forEach(function (j) {
        var td = document.createElement("td");
        td.style.cssText = "border:0;padding:.1em .15em";
        var veld = getalVeld(ctx, {
          label: "element in rij " + (i + 1) + ", kolom " + (j + 1) + " van M",
          naam: "Een element van M", rol: "secante", laag: BEREIK[0], hoog: BEREIK[1],
          zet: function (x) {
            st.m[i][j] = x;
            var g = as();
            if (g !== null) plaatsHendel(g);
            bord.update();
            schik();
          },
          terug: schrijfVelden
        });
        td.appendChild(veld);
        velden.push(veld);
        rij.appendChild(td);
      });
      tabel.appendChild(rij);
    });
    kop.appendChild(document.createTextNode("M ="));
    kop.appendChild(tabel);
    var rest = document.createElement("div");
    vak.rendNode.appendChild(kop);
    vak.rendNode.appendChild(rest);

    function schrijfVelden() {
      velden.forEach(function (veld, n) { vulVeld(veld, st.m[n >> 1][n & 1]); });
    }

    function werkVakBij() {
      var html = naamSpiegeling(st.m) + "<br>" + omloopzin(st.m);
      if (t.driehoek()) {
        html += "<br>M · F = F′<br>" + matrixHtml(st.m, { rijen: ["secante", "secante"] }) +
          matrixHtml(figuurMatrix(DRIEHOEK, eenheid())) + "=" +
          matrixHtml(figuurMatrix(DRIEHOEK, M()));
      }
      rest.innerHTML = html;
    }

    function schik() {
      var punten = [];
      t.figuur().punten.forEach(function (p) { punten.push(p, beeld(M(), p)); });
      t.zetPlot(omvat(PLOT, punten));
      t.schik();
    }

    function beschrijving() {
      var m = st.m;
      var tekst = "M heeft rijen (" + tekenGetal(m[0][0]) + ", " + tekenGetal(m[0][1]) +
        ") en (" + tekenGetal(m[1][0]) + ", " + tekenGetal(m[1][1]) + "): " +
        naamSpiegeling(m) + "; " + omloopzin(m) + ".";
      if (t.driehoek()) {
        var Fb = figuurMatrix(DRIEHOEK, M());
        tekst += " A′(" + tekenGetal(Fb[0][0]) + ", " + tekenGetal(Fb[1][0]) + "), B′(" +
          tekenGetal(Fb[0][1]) + ", " + tekenGetal(Fb[1][1]) + "), C′(" +
          tekenGetal(Fb[0][2]) + ", " + tekenGetal(Fb[1][2]) + ").";
      }
      return tekst;
    }
    bord.on("update", function () {
      werkVakBij();
      ctx.toon(beschrijving());
    });

    function zetAs(g) {
      st.m = spiegelMatrix(g);
      zetPunt(hendel, [STRAAL * Math.cos(g * Math.PI / 180), STRAAL * Math.sin(g * Math.PI / 180)]);
      verlaatVeld(velden);
      schrijfVelden();
      bord.update();
      schik();
    }
    ctx.knop("Om x-as", function () { zetAs(0); });
    ctx.knop("Om y-as", function () { zetAs(90); });
    ctx.knop("Om y = x", function () { zetAs(45); });
    ctx.knop("Om y = −x", function () { zetAs(135); });

    function herstel() {
      t.zetFiguur(0);
      zetAs(BEGIN);
    }
    zetAs(BEGIN);
    ctx.toon(beschrijving());
    var api = t.api(herstel);
    api.herschaal = schik;
    return api;
  });

  // De leerling versleept de beelden van e₁ en e₂, dus de kolommen van M.
  // Het rooster vervormt mee: de beelden van de roosterlijnen blijven
  // evenwijdig en even ver uit elkaar, en dat is precies wat een matrix doet.
  G.registreer("transformatie-matrix", function (ctx) {
    var BEGIN = [[1, 0], [1, 1]];
    var GRENS = [-3, 3, 3, -3];
    var t = transformatieBord(ctx, { plot: [-6.6, 6.6, 6.6, -4.6], paneel: [330, 190] });
    var bord = t.bord;

    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [1, 0]; }, "hulp",
      { dikte: 1.5 });
    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [0, 1]; }, "hulp",
      { dikte: 1.5 });
    var e1 = roosterpunt(ctx, bord, BEGIN[0], "e₁′", "punt", GRENS);
    var e2 = roosterpunt(ctx, bord, BEGIN[1], "e₂′", "secante", GRENS);
    function m() {
      return [[Math.round(e1.X()), Math.round(e2.X())],
              [Math.round(e1.Y()), Math.round(e2.Y())]];
    }
    function M() { return lineair(m()); }

    // Het vervormde rooster ligt met layer 1 onder de rest. Het komt pas na
    // e₁′ en e₂′, want elke roosterlijn leest die twee punten uit.
    for (var k = -8; k <= 8; k++) {
      (function (k) {
        [[[k, 0], [k, 1]], [[0, k], [1, k]]].forEach(function (paar) {
          ctx.stijl(bord.create("line", [
            verborgenPunt(bord, function () { return beeld(M(), paar[0]); }),
            verborgenPunt(bord, function () { return beeld(M(), paar[1]); })
          ], { strokeWidth: k === 0 ? 1.5 : 1, strokeOpacity: k === 0 ? 0.45 : 0.2,
               fixed: true, highlight: false, layer: 1 }), "punt");
        });
      }(k));
    }
    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [e1.X(), e1.Y()]; },
      "punt", { dikte: 3 });
    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [e2.X(), e2.Y()]; },
      "secante", { dikte: 3 });
    t.vorm("beeld", M, "'");

    function inhoud() {
      var html = "M = (" + kleurtekst("e₁′", "punt") + " " + kleurtekst("e₂′", "secante") +
        ") = " + matrixHtml(m(), { kolommen: ["punt", "secante"] });
      var naam = herken(m());
      html += "<br>" + (naam ? naam : "&nbsp;");
      if (t.driehoek()) {
        html += "<br>M · F = F′<br>" + matrixHtml(m(), { kolommen: ["punt", "secante"] }) +
          matrixHtml(figuurMatrix(DRIEHOEK, eenheid())) + "=" +
          matrixHtml(figuurMatrix(DRIEHOEK, M()));
      }
      return html;
    }
    t.paneel(inhoud);

    function beschrijving() {
      var a = m();
      var naam = herken(a);
      return "M heeft als kolommen e₁′ = (" + tekenGetal(a[0][0]) + ", " + tekenGetal(a[1][0]) +
        ") en e₂′ = (" + tekenGetal(a[0][1]) + ", " + tekenGetal(a[1][1]) + ")." +
        (naam ? " Dat is de " + naam.replace(/^de /, "") + "." : "");
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    function zet(a) {
      zetPunt(e1, [a[0][0], a[1][0]]);
      zetPunt(e2, [a[0][1], a[1][1]]);
      bord.update();
    }
    BEKEND.forEach(function (b) {
      if (b.knop) ctx.knop(b.knop, function () { zet(b.m); });
    });

    function herstel() {
      t.zetFiguur(0);
      zet([[BEGIN[0][0], BEGIN[1][0]], [BEGIN[0][1], BEGIN[1][1]]]);
    }
    t.schik();
    ctx.toon(beschrijving());
    return t.api(herstel);
  });

  /* --- 3. Draaien -------------------------------------------------------- */

  // Het beeld van e₁ ligt op de goniometrische cirkel en is de hendel: wie
  // het versleept, kiest de hoek. Het beeld van e₂ loopt een kwartslag
  // voor, en samen zijn ze de kolommen van R_α.
  G.registreer("transformatie-draaien", function (ctx) {
    var BEGIN = 90;
    var t = transformatieBord(ctx, { plot: [-4.1, 4.1, 4.1, -4.1], paneel: [330, 200] });
    var bord = t.bord;
    var st = t.st;
    st.alfa = BEGIN;

    function R() { return draaiing(st.alfa); }
    function rad() { return st.alfa * Math.PI / 180; }

    ctx.stijl(bord.create("circle", [[0, 0], 1], {
      strokeWidth: 1, dash: 2, fixed: true, highlight: false
    }), "hulp");
    t.vorm("beeld", R, "'");

    // De boog van e₁ naar zijn beeld, met de hoek erbij.
    var a1 = verborgenPunt(bord, function () { return [0.55, 0]; });
    var a2 = verborgenPunt(bord, function () {
      return [0.55 * Math.cos(rad()), 0.55 * Math.sin(rad())];
    });
    var O = bord.create("point", [0, 0], { visible: false, fixed: true, name: "" });
    ctx.stijl(bord.create("arc", [O, a1, a2], {
      strokeWidth: 1.5, lastArrow: { type: 2, size: 5 }, fixed: true, highlight: false,
      visible: function () { return st.alfa > 0; }
    }), "secante");
    ctx.stijl(bord.create("arc", [O, a2, a1], {
      strokeWidth: 1.5, firstArrow: { type: 2, size: 5 }, fixed: true, highlight: false,
      visible: function () { return st.alfa < 0; }
    }), "secante");

    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [1, 0]; }, "hulp",
      { dikte: 1.5 });
    pijl(ctx, bord, function () { return [0, 0]; }, function () { return [0, 1]; }, "hulp",
      { dikte: 1.5 });
    pijl(ctx, bord, function () { return [0, 0]; },
      function () { return [-Math.sin(rad()), Math.cos(rad())]; }, "secante", { dikte: 3 });
    ctx.stijl(bord.create("text", [
      function () { return -1.25 * Math.sin(rad()); },
      function () { return 1.25 * Math.cos(rad()); }, "e₂′"
    ], { fixed: true, highlight: false, fontSize: 14, useMathJax: false,
         anchorX: "middle", anchorY: "middle" }), "secante");
    pijl(ctx, bord, function () { return [0, 0]; },
      function () { return [Math.cos(rad()), Math.sin(rad())]; }, "punt", { dikte: 3 });

    var hendel = ctx.stijl(bord.create("point", [0, 1], {
      name: "e₁′", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [10, 10] }
    }), "punt");
    function plaatsHendel() {
      zetPunt(hendel, [Math.cos(rad()), Math.sin(rad())]);
    }
    // Slepen kiest de hoek in stappen van 5°; het punt blijft op de cirkel.
    hendel.on("drag", function () {
      var g = Math.round(Math.atan2(hendel.Y(), hendel.X()) * 180 / Math.PI / 5) * 5;
      st.alfa = g <= -180 ? 180 : g;
      plaatsHendel();
    });

    function hoek() { return tekenGetal(st.alfa, 0) + "°"; }
    function inhoud() {
      var r = links2(R());
      var html = "α = " + kleurtekst(hoek(), "secante") + "<br>R<sub>α</sub> = " +
        matrixHtml([["cos " + hoek(), "−sin " + hoek()], ["sin " + hoek(), "cos " + hoek()]],
          { kolommen: ["punt", "secante"] }) + "<br>&nbsp;&nbsp;&nbsp;&nbsp;= " +
        matrixHtml(r, { kolommen: ["punt", "secante"] });
      if (t.driehoek()) {
        html += "<br>R<sub>α</sub> · F = " + matrixHtml(figuurMatrix(DRIEHOEK, R()));
      }
      return html;
    }
    t.paneel(inhoud);

    function beschrijving() {
      var r = links2(R());
      return "De hoek is " + hoek() + ". R is de matrix met rijen (" + tekenGetal(r[0][0]) +
        ", " + tekenGetal(r[0][1]) + ") en (" + tekenGetal(r[1][0]) + ", " +
        tekenGetal(r[1][1]) + ").";
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    function zetHoek(g) {
      while (g > 180) g -= 360;
      while (g <= -180) g += 360;
      st.alfa = g;
      plaatsHendel();
      bord.update();
    }
    ctx.knop("α − 15°", function () { zetHoek(st.alfa - 15); });
    ctx.knop("α + 15°", function () { zetHoek(st.alfa + 15); });

    function herstel() {
      t.zetFiguur(0);
      zetHoek(BEGIN);
    }
    plaatsHendel();
    t.schik();
    ctx.toon(beschrijving());
    return t.api(herstel);
  });

  /* --- 4. Transformaties na elkaar --------------------------------------- */

  var KEUZES = [
    { naam: "draai 90°", m: [[0, -1], [1, 0]] },
    { naam: "spiegel om x-as", m: [[1, 0], [0, -1]] },
    { naam: "spiegel om y-as", m: [[-1, 0], [0, 1]] },
    { naam: "spiegel om y = x", m: [[0, 1], [1, 0]] },
    { naam: "draai −90°", m: [[0, 1], [-1, 0]] },
    { naam: "x maal 2", m: [[2, 0], [0, 1]] },
    { naam: "afschuiving", m: [[1, 1], [0, 1]] }
  ];

  // Eerst M₁, dan M₂. De tussenstap staat gestreept, het eindbeeld vol, en
  // het tekstvak zet M₂·M₁ naast M₁·M₂. Wissel volgorde ruilt de twee om.
  G.registreer("transformatie-samenstellen", function (ctx) {
    var t = transformatieBord(ctx, { plot: [-5.6, 5.6, 7.6, -5.6], paneel: [360, 190] });
    var bord = t.bord;
    var st = t.st;
    st.eerste = 0;
    st.tweede = 1;

    function M1() { return lineair(KEUZES[st.eerste].m); }
    function M2() { return lineair(KEUZES[st.tweede].m); }
    function samen() { return maal(M2(), M1()); }

    t.vorm("tussen", M1, "'");
    t.vorm("beeld", samen, "''");

    function inhoud() {
      var a = KEUZES[st.eerste].m, b = KEUZES[st.tweede].m;
      var ba = links2(samen()), ab = links2(maal(M1(), M2()));
      var html = "eerst " + kleurtekst("M₁: " + KEUZES[st.eerste].naam, "secante") +
        "<br>dan " + kleurtekst("M₂: " + KEUZES[st.tweede].naam, "punt") + "<br>" +
        "M₂ · M₁ = " + matrixHtml(b) + matrixHtml(a) + "=" +
        kleurtekst(matrixHtml(ba), "punt") + "<br>" +
        "M₁ · M₂ = " + matrixHtml(a) + matrixHtml(b) + "=" + matrixHtml(ab) + "<br>";
      html += gelijk(ba, ab)
        ? "Hier geeft de volgorde hetzelfde resultaat."
        : "Andere volgorde, ander resultaat.";
      return html;
    }
    t.paneel(inhoud);

    function beschrijving() {
      var ba = links2(samen());
      return "Eerst " + KEUZES[st.eerste].naam + ", dan " + KEUZES[st.tweede].naam +
        ". Samen: de matrix met rijen (" + tekenGetal(ba[0][0]) + ", " + tekenGetal(ba[0][1]) +
        ") en (" + tekenGetal(ba[1][0]) + ", " + tekenGetal(ba[1][1]) + "). " +
        (gelijk(ba, links2(maal(M1(), M2()))) ? "De omgekeerde volgorde geeft hetzelfde."
          : "De omgekeerde volgorde geeft iets anders.");
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    var knopEerste = ctx.knop("", function () {
      st.eerste = (st.eerste + 1) % KEUZES.length;
      werkBij();
    });
    var knopTweede = ctx.knop("", function () {
      st.tweede = (st.tweede + 1) % KEUZES.length;
      werkBij();
    });
    ctx.knop("Wissel volgorde", function () {
      var k = st.eerste;
      st.eerste = st.tweede;
      st.tweede = k;
      werkBij();
    });
    function werkBij() {
      knopEerste.textContent = "M₁: " + KEUZES[st.eerste].naam;
      knopTweede.textContent = "M₂: " + KEUZES[st.tweede].naam;
      bord.update();
    }

    function herstel() {
      st.eerste = 0;
      st.tweede = 1;
      t.zetFiguur(0);
      werkBij();
    }
    werkBij();
    t.schik();
    ctx.toon(beschrijving());
    return t.api(herstel);
  });

  /* --- 5. Verschuiven als product ---------------------------------------- */

  // Draaien om een punt P in drie stappen. Het bord toont het beeld na de
  // stappen tot nu; het tekstvak de 3×3-matrix van die stappen samen.
  G.registreer("transformatie-homogeen", function (ctx) {
    var BEGIN = { p: [1, 2], alfa: 90, stap: 3 };
    var t = transformatieBord(ctx, {
      plot: [-4.6, 5.6, 6.6, -4.6], paneel: [370, 220]
    });
    var bord = t.bord;
    var st = t.st;
    st.alfa = BEGIN.alfa;
    st.stap = BEGIN.stap;

    var P = roosterpunt(ctx, bord, BEGIN.p, "P", "secante", [-3, 4, 4, -3]);
    function px() { return Math.round(P.X()); }
    function py() { return Math.round(P.Y()); }

    function stappen() {
      return [verschuiving(-px(), -py()), draaiing(st.alfa), verschuiving(px(), py())];
    }
    function tot(n) {
      var M = eenheid();
      stappen().slice(0, n).forEach(function (S) { M = maal(S, M); });
      return M;
    }
    function nu() { return tot(st.stap); }
    function vorig() { return tot(Math.max(0, st.stap - 1)); }

    var tussen = t.vorm("tussen", vorig, null);
    t.vorm("beeld", nu, "'");

    // Het beeld van P tijdens de stappen, en bij een verschuiving de pijl.
    ctx.stijl(bord.create("point", [
      function () { return beeld(nu(), [px(), py()])[0]; },
      function () { return beeld(nu(), [px(), py()])[1]; }
    ], { name: "P′", size: 3, fixed: true, highlight: false, showInfobox: false,
         visible: function () { return st.stap === 1 || st.stap === 2; },
         label: { offset: [8, -12] } }), "secante");
    pijl(ctx, bord,
      function () { return st.stap === 1 ? [px(), py()] : [0, 0]; },
      function () { return st.stap === 1 ? [0, 0] : [px(), py()]; },
      "secante", {
        dikte: 1.5, streep: 2,
        zichtbaar: function () { return st.stap === 1 || st.stap === 3; }
      });

    function ts(a, b) {
      return "T<sub>(" + tekenGetal(a) + ", " + tekenGetal(b) + ")</sub>";
    }
    function formule() {
      var delen = [ts(-px(), -py()), "R<sub>" + tekenGetal(st.alfa, 0) + "°</sub>", ts(px(), py())];
      return delen.slice(0, st.stap).reverse().join(" · ");
    }
    var UITLEG = [
      "Stap 0 van 3: de gegeven figuur.",
      "Stap 1 van 3: verschuif P naar de oorsprong.",
      "Stap 2 van 3: draai om de oorsprong.",
      "Stap 3 van 3: verschuif terug naar P."
    ];
    function inhoud() {
      var html = UITLEG[st.stap] + "<br>";
      // De letter F heeft tien hoekpunten: haar matrix past niet in het vak,
      // dus daar staat enkel de 3×3-matrix van de stappen.
      if (st.stap === 0) {
        html += t.driehoek() ? "F = " + matrixHtml(figuurMatrix(DRIEHOEK, eenheid(), true))
          : "F is de letter F, met " + LETTER_F.punten.length + " hoekpunten.";
      } else {
        html += formule() + "<br>&nbsp;&nbsp;&nbsp;&nbsp;= " +
          matrixHtml(nu(), { rijen: ["punt", "punt", "zwak"] });
        if (t.driehoek()) {
          html += "<br>beeld: " + matrixHtml(figuurMatrix(DRIEHOEK, nu(), true));
        }
      }
      return html;
    }
    t.paneel(inhoud);

    function beschrijving() {
      var tekst = zonderHtml(UITLEG[st.stap]) + " Draaipunt P(" + px() + ", " + py() +
        "), hoek " + tekenGetal(st.alfa, 0) + "°.";
      if (t.driehoek()) {
        var Fb = figuurMatrix(DRIEHOEK, nu());
        tekst += " Hoekpunten: (" + tekenGetal(Fb[0][0]) + ", " +
          tekenGetal(Fb[1][0]) + "), (" + tekenGetal(Fb[0][1]) + ", " + tekenGetal(Fb[1][1]) +
          "), (" + tekenGetal(Fb[0][2]) + ", " + tekenGetal(Fb[1][2]) + ").";
      }
      return tekst;
    }
    bord.on("update", function () { ctx.toon(beschrijving()); });

    function werkBij() {
      tussen.zichtbaar(st.stap > 0);
      bord.update();
    }
    ctx.knop("Vorige stap", function () { st.stap = Math.max(0, st.stap - 1); werkBij(); });
    ctx.knop("Volgende stap", function () { st.stap = Math.min(3, st.stap + 1); werkBij(); });
    function zetHoek(g) {
      while (g > 180) g -= 360;
      while (g <= -180) g += 360;
      st.alfa = g;
      werkBij();
    }
    ctx.knop("α − 15°", function () { zetHoek(st.alfa - 15); });
    ctx.knop("α + 15°", function () { zetHoek(st.alfa + 15); });

    function herstel() {
      zetPunt(P, BEGIN.p);
      st.alfa = BEGIN.alfa;
      st.stap = BEGIN.stap;
      t.zetFiguur(0);
      werkBij();
    }
    werkBij();
    t.schik();
    ctx.toon(beschrijving());
    return t.api(herstel);
  });
}());
