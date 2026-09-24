/* Matrixbord: de gedeelde bouwstenen voor interactieve grafieken met
 * matrices.
 *
 * Een matrix is geen kromme, maar wel een rooster waarin plaats alles bepaalt:
 * welke rij, welke kolom, wat er met wat samenwerkt. Net dat gaat op papier
 * verloren, want daar staat elk voorbeeld in zijn eindstand. Hier tekenen we
 * de matrices zelf op een JSXGraph-bord, zodat een rij, een kolom of een cel
 * kan oplichten en de leerling ziet welke getallen bij elkaar horen.
 *
 * Dit bestand begon in L01_Matrices.interactief.js en verhuisde naar web/
 * toen L03_Determinanten hetzelfde werkblad nodig had. Een hoofdstukmodule
 * vraagt het met de regel "mkpi: gebruikt matrixbord.js" in haar kop; mkpi
 * --site laadt het dan na de runtime en voor de hoofdstukmodules. Het zet
 * enkel window.Matrixbord en registreert zelf geen grafiek.
 */
(function (window) {
  "use strict";

  /* --- Kleine hulpjes ---------------------------------------------------- */

  var ONDER = ["₀", "₁", "₂", "₃", "₄",
               "₅", "₆", "₇", "₈", "₉"];
  var BOVEN = ["⁰", "¹", "²", "³", "⁴",
               "⁵", "⁶", "⁷", "⁸", "⁹"];

  function index(n, tekens) {
    return String(n).split("").map(function (cijfer) {
      return tekens[Number(cijfer)];
    }).join("");
  }

  // a_{ij} als leesbare tekst: a₂₃. De cursus gebruikt die notatie ook, en op
  // een bord is een echte formule niet nodig.
  function el(letter, i, j) {
    return letter + index(i, ONDER) + index(j, ONDER);
  }

  function macht(letter, p) {
    return letter + index(p, BOVEN);
  }

  function waarde(v) {
    return typeof v === "function" ? v() : v;
  }

  // Getallen zoals in de cursus: een punt als decimaalteken, en een smalle
  // spatie per duizendtal, zodat 88761 leesbaar blijft.
  function duizend(x) {
    var n = Math.round(x);
    var teken = n < 0 ? "−" : "";
    var cijfers = String(Math.abs(n));
    var stukken = [];
    while (cijfers.length > 3) {
      stukken.unshift(cijfers.slice(-3));
      cijfers = cijfers.slice(0, -3);
    }
    stukken.unshift(cijfers);
    return teken + stukken.join(" ");
  }

  // Een minteken in tekst hoort een echt minteken te zijn, geen koppelteken.
  function net(tekst) {
    return String(tekst).replace(/-/g, "−");
  }

  // Een negatief getal als factor hoort tussen haakjes: 4·(−3), niet 4·−3.
  function haakjes(x) {
    var tekst = net(String(x));
    return x < 0 ? "(" + tekst + ")" : tekst;
  }

  function willekeurigGetal() {
    return Math.floor(Math.random() * 11) - 5;
  }

  function willekeurigeMatrix(m, n) {
    var A = nulmatrix(m, n);
    for (var i = 0; i < m; i++) {
      for (var j = 0; j < n; j++) A[i][j] = willekeurigGetal();
    }
    return A;
  }

  function vulWillekeurig(A) {
    var nieuw = willekeurigeMatrix(A.length, A[0].length);
    for (var i = 0; i < A.length; i++) A[i] = nieuw[i];
  }

  /* --- Matrixrekenen ----------------------------------------------------- */

  function orde(A) {
    return { rijen: A.length, kolommen: A.length ? A[0].length : 0 };
  }

  function nulmatrix(m, n) {
    var uit = [];
    for (var i = 0; i < m; i++) {
      uit.push([]);
      for (var j = 0; j < n; j++) uit[i].push(0);
    }
    return uit;
  }

  function som(A, B) {
    return A.map(function (rij, i) {
      return rij.map(function (a, j) { return a + B[i][j]; });
    });
  }

  function veelvoud(r, A) {
    return A.map(function (rij) {
      return rij.map(function (a) { return r * a; });
    });
  }

  function product(A, B) {
    var uit = nulmatrix(A.length, B[0].length);
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < B[0].length; j++) {
        var s = 0;
        for (var k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
        uit[i][j] = s;
      }
    }
    return uit;
  }

  function getransponeerde(A) {
    var uit = nulmatrix(A[0].length, A.length);
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[0].length; j++) uit[j][i] = A[i][j];
    }
    return uit;
  }

  function eenheidsmatrix(n) {
    var uit = nulmatrix(n, n);
    for (var i = 0; i < n; i++) uit[i][i] = 1;
    return uit;
  }

  // A^0 is de eenheidsmatrix van dezelfde orde, zodat A^p · A^q = A^(p+q)
  // ook voor p = 0 klopt.
  function machtVan(A, p) {
    if (p === 0) return eenheidsmatrix(A.length);
    var uit = A;
    for (var k = 1; k < p; k++) uit = product(uit, A);
    return uit;
  }

  function gelijk(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < A[0].length; j++) {
        if (Math.abs(A[i][j] - B[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  /* --- Werkblad: matrices op een bord ------------------------------------ */

  // Het venster van een matrixbord hangt niet van vaste getallen af maar van
  // wat erin staat: de figuur bepaalt hoe breed en hoe hoog haar inhoud is, en
  // hier wordt daar een begrenzing van gemaakt die past bij de plaats die de
  // slide geeft. Zo blijft dezelfde figuur leesbaar op een breed scherm en in
  // een smalle kolom.
  function pasVenster(bord, breedte, hoogte) {
    var w = bord.canvasWidth;
    var h = bord.canvasHeight;
    if (!w || !h) return 40;
    var schaal = Math.min(w / (breedte * 1.06), h / (hoogte * 1.06));
    var box = [-w / schaal / 2, h / schaal / 2, w / schaal / 2, -h / schaal / 2];
    bord.presBegrenzing = box;
    bord.presGelijkeSchaal = true;
    try { bord.setBoundingBox(box, true); } catch (fout) { /* niets */ }
    return schaal;
  }

  function maakWerkblad(ctx) {
    var teksten = [];    // [tekstobject, lettergroottefactor]
    var vullingen = [];  // [vlak, rol]
    var vensters = [];   // [bord, maatfunctie]
    var wb = {};

    wb.tekst = function (bord, x, y, inhoud, rol, opties) {
      var o = opties || {};
      var t = bord.create("text", [x, y, inhoud], {
        anchorX: o.anchorX || "middle",
        anchorY: o.anchorY || "middle",
        fixed: true,
        highlight: false,
        useMathJax: false,
        cssStyle: o.vet ? "font-weight:600" : "",
        strokeOpacity: o.opaciteit === undefined ? 1 : o.opaciteit,
        visible: o.visible === undefined ? true : o.visible
      });
      ctx.stijl(t, rol || "tekst");
      teksten.push([t, o.factor || 1]);
      return t;
    };

    // Een gekleurd vlak volgt de rol bij een themawisseling niet vanzelf: de
    // runtime kleurt enkel lijnen en punten. Daarom houden we ze hier bij.
    // De markeerkleur krijgt dezelfde waarde: JSXGraph toont een vlak dat
    // net zichtbaar wordt soms in zijn markeerstand, en dan zou het in het
    // standaardgeel van JSXGraph oplichten.
    wb.vulling = function (vlak, rol) {
      vullingen.push([vlak, rol]);
      var kleur = ctx.kleur(rol);
      vlak.setAttribute({ fillColor: kleur, highlightFillColor: kleur });
      return vlak;
    };

    wb.venster = function (bord, maat) {
      vensters.push([bord, maat]);
    };

    // Past elk bord aan zijn inhoud aan en kiest daarna de lettergrootte: een
    // cel van een halve centimeter verdient kleinere cijfers dan een cel van
    // twee centimeter.
    wb.pas = function () {
      var schaal = 40;
      vensters.forEach(function (paar) {
        var maat = paar[1]();
        schaal = Math.min(schaal, pasVenster(paar[0], maat[0], maat[1]));
      });
      teksten.forEach(function (paar) {
        var px = Math.round(schaal * 0.34 * paar[1]);
        paar[0].setAttribute({ fontSize: Math.max(9, Math.min(24, px)) });
      });
      vensters.forEach(function (paar) {
        try { paar[0].fullUpdate(); } catch (fout) { /* niets */ }
      });
    };

    wb.kleur = function (kleuren) {
      var k = kleuren || ctx.kleuren();
      vullingen.forEach(function (paar) {
        var kleur = k[paar[1]] || k.kromme;
        paar[0].setAttribute({ fillColor: kleur, highlightFillColor: kleur });
      });
    };

    // Een matrix met haken. Aantal rijen, aantal kolommen, plaats en inhoud
    // mogen functies zijn: zo kan dezelfde figuur van orde veranderen zonder
    // opnieuw opgebouwd te worden. Met haken: "strepen" wordt het een
    // determinant, met haken: "geen" een los blok getallen. o.opaciteit(i, j)
    // laat cellen verbleken, bijvoorbeeld de geschrapte rij en kolom van een
    // minor.
    wb.matrix = function (bord, o) {
      var bw = o.celbreedte || 1.3;
      var bh = o.celhoogte || 1.0;
      var maxR = o.maxrijen || waarde(o.rijen);
      var maxK = o.maxkolommen || waarde(o.kolommen);
      var HAAK = 0.16;   // afstand van de haak tot de cellen
      var TIP = 0.2;     // de horizontale stukjes van een haak
      var m = {};

      m.R = function () { return waarde(o.rijen); };
      m.K = function () { return waarde(o.kolommen); };
      m.X = function () { return waarde(o.x) || 0; };
      m.Y = function () { return waarde(o.y) || 0; };
      m.zichtbaar = function () {
        return o.zichtbaar === undefined ? true : waarde(o.zichtbaar);
      };
      m.breedte = function () { return m.K() * bw; };
      m.hoogte = function () { return m.R() * bh; };
      m.volleBreedte = function () { return m.breedte() + 2 * (HAAK + TIP); };
      m.volleHoogte = function () { return m.hoogte() + 0.4; };
      m.links = function () { return m.X() - m.breedte() / 2; };
      m.boven = function () { return m.Y() + m.hoogte() / 2; };
      m.celX = function (j) { return m.links() + (j - 0.5) * bw; };
      m.celY = function (i) { return m.boven() - (i - 0.5) * bh; };

      function punt(fx, fy) {
        return bord.create("point", [fx, fy], {
          visible: false, fixed: true, name: "", withLabel: false
        });
      }

      function lijn(a, b) {
        return ctx.stijl(bord.create("segment", [a, b], {
          strokeWidth: 2, fixed: true, highlight: false,
          visible: function () { return m.zichtbaar(); }
        }), o.rol || "tekst");
      }

      function haak(links) {
        var teken = links ? -1 : 1;
        function x0() { return m.X() + teken * (m.breedte() / 2 + HAAK); }
        function x1() { return x0() - teken * TIP; }
        function yb() { return m.Y() + m.hoogte() / 2 + 0.1; }
        function yo() { return m.Y() - m.hoogte() / 2 - 0.1; }
        var boven = punt(x0, yb);
        var onder = punt(x0, yo);
        lijn(boven, onder);
        // Een determinant staat tussen twee rechte strepen, een matrix
        // tussen haken: enkel de korte horizontale stukjes verschillen.
        if (o.haken === "strepen") return;
        lijn(boven, punt(x1, yb));
        lijn(onder, punt(x1, yo));
      }

      var i, j;
      for (i = 1; i <= maxR; i++) {
        for (j = 1; j <= maxK; j++) {
          (function (i, j) {
            wb.tekst(bord,
              function () { return m.celX(j); },
              function () { return m.celY(i); },
              // JSXGraph vraagt de inhoud van elke cel op, ook van een cel die
              // buiten de huidige orde valt en dus niet te zien is.
              function () {
                if (i > m.R() || j > m.K()) return "";
                return o.waarde(i, j);
              },
              o.rol || "tekst",
              {
                factor: o.factor,
                opaciteit: o.opaciteit ? function () {
                  return o.opaciteit(i, j);
                } : undefined,
                visible: function () {
                  return m.zichtbaar() && i <= m.R() && j <= m.K();
                }
              });
          }(i, j));
        }
      }
      // Zonder haken staan er enkel getallen, zoals de twee kolommen die
      // de regel van Sarrus naast een determinant herhaalt.
      if (o.haken !== "geen") {
        haak(true);
        haak(false);
      }

      if (o.naam) {
        wb.tekst(bord,
          function () { return m.X(); },
          function () { return m.boven() + 0.45; },
          o.naam, o.naamrol || "zwak",
          { factor: 0.95, visible: function () { return m.zichtbaar(); } });
      }

      // Licht een rij, een kolom of één cel op. Rij 0 betekent "alle rijen",
      // kolom 0 "alle kolommen": zo is een hele rij, een hele kolom en een
      // enkele cel dezelfde beweging.
      m.markeer = function (rol) {
        var st = { rij: 0, kolom: 0, aan: false };
        function xl() { return st.kolom ? m.celX(st.kolom) - bw / 2 : m.links(); }
        function xr() { return st.kolom ? m.celX(st.kolom) + bw / 2 : m.links() + m.breedte(); }
        function yb() { return st.rij ? m.celY(st.rij) + bh / 2 : m.boven(); }
        function yo() { return st.rij ? m.celY(st.rij) - bh / 2 : m.boven() - m.hoogte(); }
        var vlak = bord.create("polygon",
          [punt(xl, yb), punt(xr, yb), punt(xr, yo), punt(xl, yo)], {
            fixed: true, highlight: false, fillOpacity: 0.32, layer: 0,
            borders: { visible: false, strokeWidth: 0 },
            vertices: { visible: false },
            visible: function () { return st.aan && m.zichtbaar(); }
          });
        wb.vulling(vlak, rol);
        return {
          zet: function (rij, kolom) {
            st.rij = rij || 0;
            st.kolom = kolom || 0;
            st.aan = true;
          },
          verberg: function () { st.aan = false; },
          aan: function () { return st.aan; }
        };
      };

      // Welke cel ligt onder een punt van het bord? Buiten de matrix: niets.
      m.celVan = function (x, y) {
        if (!m.zichtbaar()) return null;
        var kolom = Math.floor((x - m.links()) / bw) + 1;
        var rij = Math.floor((m.boven() - y) / bh) + 1;
        if (rij < 1 || kolom < 1 || rij > m.R() || kolom > m.K()) return null;
        return { rij: rij, kolom: kolom };
      };

      return m;
    };

    return wb;
  }

  // De plaats van een klik of een tik op het bord, in bordcoördinaten.
  function klikPunt(bord, e) {
    try {
      var gebeurtenis = e;
      if (e && e.touches && e.touches.length) gebeurtenis = e.touches[0];
      return bord.getUsrCoordsOfMouse(gebeurtenis);
    } catch (fout) {
      return null;
    }
  }

  // De runtime noemt haar assen altijd x en y. In de toepassingen dragen ze
  // een betekenis (dag, jaar, kans, aantal), en dan is die naam meer waard dan
  // de letter. Verder blijven ze precies zoals de runtime ze zet, inclusief de
  // rol "as" voor de dag- en nachtstand.
  function assenMet(ctx, bord, xnaam, ynaam) {
    [["x", xnaam], ["y", ynaam]].forEach(function (paar) {
      var richting = paar[0];
      var as = bord.create("axis",
        richting === "x" ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], {
          name: paar[1], withLabel: true,
          label: {
            position: "urt",
            offset: richting === "x" ? [-8, 16] : [14, -10],
            anchorX: richting === "x" ? "right" : "left",
            cssClass: "grafiek-aslabel", useMathJax: false
          },
          ticks: {
            drawZero: false, drawLabels: true, majorHeight: 8, minorTicks: 0,
            label: { cssClass: "grafiek-aslabel", anchorX: "middle" }
          }
        });
      ctx.stijl(as, "as");
    });
  }

  function matrixBord(ctx) {
    return ctx.maakBord({
      begrenzing: [-8, 5, 8, -5],
      assen: false,
      gelijkeschaal: true
    });
  }

  /* --- Bouwsteen: A (bewerking) B = C ------------------------------------ */

  // De som, het veelvoud en het product zien er alle drie hetzelfde uit: twee
  // gegevens, een teken, een resultaat. Dit blok tekent die opstelling en
  // houdt de plaatsen bij; wat er in de cellen komt en wat oplicht, bepaalt
  // elke figuur zelf.
  function maakDrieluik(ctx, wb, bord, o) {
    var st = { xA: 0, xB: 0, xC: 0, xOp: 0, xIs: 0 };
    var TUSSEN = 0.55;
    var TEKEN = 0.7;
    var d = {};

    // Een drieluik dat een bord deelt met een andere weergave, kan als geheel
    // verdwijnen; zonder o.zichtbaar staat het er altijd.
    function zicht() {
      return o.zichtbaar === undefined ? true : waarde(o.zichtbaar);
    }

    d.A = wb.matrix(bord, {
      rijen: o.A.rijen, kolommen: o.A.kolommen,
      maxrijen: o.A.maxrijen, maxkolommen: o.A.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.A.waarde, naam: o.A.naam,
      zichtbaar: zicht,
      x: function () { return st.xA; }, y: o.y || 0
    });
    d.B = wb.matrix(bord, {
      rijen: o.B.rijen, kolommen: o.B.kolommen,
      maxrijen: o.B.maxrijen, maxkolommen: o.B.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.B.waarde, naam: o.B.naam,
      zichtbaar: zicht,
      x: function () { return st.xB; }, y: o.y || 0
    });
    d.C = wb.matrix(bord, {
      rijen: o.C.rijen, kolommen: o.C.kolommen,
      maxrijen: o.C.maxrijen, maxkolommen: o.C.maxkolommen,
      celbreedte: o.celbreedte, waarde: o.C.waarde, naam: o.C.naam,
      zichtbaar: function () {
        return zicht() &&
          (o.C.zichtbaar === undefined ? true : waarde(o.C.zichtbaar));
      },
      x: function () { return st.xC; }, y: o.y || 0
    });

    wb.tekst(bord, function () { return st.xOp; }, o.y || 0,
      o.teken, "zwak", { factor: 1.2, visible: zicht });
    wb.tekst(bord, function () { return st.xIs; }, o.y || 0,
      "=", "zwak", { factor: 1.2, visible: zicht });
    wb.tekst(bord, function () { return st.xC; }, o.y || 0,
      o.C.leeg || "bestaat niet", "secante", {
        factor: 1,
        visible: function () {
          return o.C.zichtbaar ? zicht() && !waarde(o.C.zichtbaar) : false;
        }
      });

    d.breedte = function () {
      var cb = d.C.zichtbaar() ? d.C.volleBreedte() : 2.6;
      return d.A.volleBreedte() + d.B.volleBreedte() + cb +
        2 * TEKEN + 4 * TUSSEN;
    };
    d.hoogte = function () {
      return Math.max(d.A.hoogte(), d.B.hoogte(), d.C.hoogte()) + 1.4;
    };

    d.herplaats = function () {
      var x = -d.breedte() / 2;
      st.xA = x + d.A.volleBreedte() / 2;
      x += d.A.volleBreedte() + TUSSEN;
      st.xOp = x + TEKEN / 2;
      x += TEKEN + TUSSEN;
      st.xB = x + d.B.volleBreedte() / 2;
      x += d.B.volleBreedte() + TUSSEN;
      st.xIs = x + TEKEN / 2;
      x += TEKEN + TUSSEN;
      st.xC = x + (d.C.zichtbaar() ? d.C.volleBreedte() : 2.6) / 2;
    };

    return d;
  }

  window.Matrixbord = {
    ONDER: ONDER,
    BOVEN: BOVEN,
    index: index,
    el: el,
    macht: macht,
    waarde: waarde,
    duizend: duizend,
    net: net,
    haakjes: haakjes,
    willekeurigGetal: willekeurigGetal,
    willekeurigeMatrix: willekeurigeMatrix,
    vulWillekeurig: vulWillekeurig,
    orde: orde,
    nulmatrix: nulmatrix,
    som: som,
    veelvoud: veelvoud,
    product: product,
    getransponeerde: getransponeerde,
    eenheidsmatrix: eenheidsmatrix,
    machtVan: machtVan,
    gelijk: gelijk,
    pasVenster: pasVenster,
    maakWerkblad: maakWerkblad,
    klikPunt: klikPunt,
    assenMet: assenMet,
    matrixBord: matrixBord,
    maakDrieluik: maakDrieluik
  };
}(window));
