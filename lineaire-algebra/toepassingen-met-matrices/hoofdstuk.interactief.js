/* Interactieve grafieken bij L02_ToepassingenMetMatrices.tex. */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

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

  /* --- 11. Overgangsmatrix: het weer van Thomas -------------------------- */

  // Een overgangsmatrix gaat over een evolutie, en dan is een assenstelsel de
  // juiste tekening: de drie kansen dag na dag, met de kansboom van de cursus
  // als tweede dag. Wie de begintoestand verandert, ziet dat de drie krommen
  // altijd naar hetzelfde evenwicht lopen.
  G.registreer("overgangsmatrix", function (ctx) {
    var A = [
      [0.6, 0.3, 0.1],
      [0.3, 0.4, 0.5],
      [0.1, 0.3, 0.4]
    ];
    var NAMEN = ["warm (W)", "bewolkt (B)", "regen (R)"];
    var KORT = ["W", "B", "R"];
    var ROLLEN = ["secante", "punt", "afgeleide"];
    var DAGEN = 8;
    var START = [
      { naam: "Warm", v: [1, 0, 0] },
      { naam: "Bewolkt", v: [0, 1, 0] },
      { naam: "Regen", v: [0, 0, 1] }
    ];
    var REGEN = 2;
    var st = { keuze: REGEN, dag: 2 };

    // De rij toestanden vanaf de gekozen begintoestand.
    function verloop() {
      var rij = [START[st.keuze].v.slice()];
      for (var n = 1; n <= DAGEN; n++) {
        var vorige = rij[n - 1];
        var nieuw = [0, 0, 0];
        for (var i = 0; i < 3; i++) {
          for (var k = 0; k < 3; k++) nieuw[i] += A[i][k] * vorige[k];
        }
        rij.push(nieuw);
      }
      return rij;
    }

    var rijen = verloop();

    var bord = ctx.maakBord({
      begrenzing: [-0.8, 1.16, DAGEN + 0.9, -0.16],
      assen: false
    });
    assenMet(ctx, bord, "dag", "kans");

    // De drie krommen lopen op het einde naar elkaar toe, dus een opschrift
    // aan het uiteinde zou daar op elkaar vallen. De legende staat daarom in
    // de hoek, met dezelfde kleur als haar kromme.
    var krommen = [0, 1, 2].map(function (i) {
      var kromme = ctx.stijl(bord.create("curve", [[], []], {
        strokeWidth: 2.5, fixed: true, highlight: false
      }), ROLLEN[i]);
      ctx.stijl(bord.create("text",
        [DAGEN - 3, 0.93 - i * 0.1, NAMEN[i]], {
          anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
          fontSize: 14, cssStyle: "font-weight:600"
        }), ROLLEN[i]);
      return kromme;
    });

    // De dag die uitgelezen wordt: een schuifbaar punt op de x-as.
    var spoor = bord.create("segment", [[0, 0], [DAGEN, 0]], {
      visible: false, fixed: true
    });
    var wijzer = ctx.stijl(bord.create("glider", [st.dag, 0, spoor], {
      name: "dag", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      snapToGrid: false,
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    var lijn = ctx.stijl(bord.create("segment",
      [[function () { return dag(); }, 0],
       [function () { return dag(); }, 1.02]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");

    var merkers = [0, 1, 2].map(function (i) {
      return ctx.stijl(bord.create("point",
        [function () { return dag(); },
         function () { return rijen[dag()][i]; }], {
          name: "", size: 4, fixed: true, highlight: false, withLabel: false
        }), ROLLEN[i]);
    });

    function dag() {
      return Math.max(0, Math.min(DAGEN, Math.round(wijzer.X())));
    }

    function tekenKrommen() {
      krommen.forEach(function (kromme, i) {
        var xs = [];
        var ys = [];
        for (var n = 0; n <= DAGEN; n++) {
          xs.push(n);
          ys.push(rijen[n][i]);
        }
        kromme.dataX = xs;
        kromme.dataY = ys;
      });
    }

    // De matrix bij de gekozen dag: A^n maal de begintoestand geeft de
    // kansen van die dag. Omdat het weer van vandaag zeker is, is dat
    // precies een kolom van A^n, en die staat vet.
    function machten() {
      var I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      var rij = [I];
      for (var n = 1; n <= DAGEN; n++) {
        var P = rij[n - 1];
        var Q = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var i = 0; i < 3; i++) {
          for (var j = 0; j < 3; j++) {
            for (var k = 0; k < 3; k++) Q[i][j] += P[i][k] * A[k][j];
          }
        }
        rij.push(Q);
      }
      return rij;
    }
    var AN = machten();

    var formule = document.createElement("div");
    formule.className = "overgang-formule";
    formule.style.cssText = "text-align:center;overflow-x:auto;margin:0.4rem 0";
    ctx.element.parentNode.insertBefore(formule, ctx.element.nextSibling);

    // A^n heeft precies n decimalen, zoals A en A^2 in de cursus; vanaf A^3
    // houden we het bij drie. Een vaste lengte houdt de kolommen recht.
    function matrixTex(M, vet, decimalen) {
      return "\\begin{pmatrix}" + M.map(function (rij) {
        return rij.map(function (x, j) {
          var t = decimalen === undefined ? ctx.getal(x, 3) : x.toFixed(decimalen);
          return j === vet ? "\\mathbf{" + t + "}" : t;
        }).join(" & ");
      }).join("\\\\") + "\\end{pmatrix}";
    }

    function kolomTex(v, decimalen) {
      return matrixTex(v.map(function (x) { return [x]; }), -1, decimalen);
    }

    var vorigeTex = null;

    function toonFormule() {
      var n = dag();
      var v0 = START[st.keuze].v;
      var vet = v0.indexOf(1);
      var macht = n === 1 ? "A" : "A^{" + n + "}";
      var tex = macht + "\\cdot" + kolomTex(v0) + "=" +
        matrixTex(AN[n], vet, Math.min(n, 3)) + kolomTex(v0) + "=" +
        kolomTex(rijen[n], Math.min(n, 3));
      if (tex === vorigeTex) return;
      vorigeTex = tex;
      var mj = window.MathJax;
      try {
        if (!mj || typeof mj.tex2svg !== "function") throw new Error("geen MathJax");
        formule.replaceChildren(mj.tex2svg(tex, { display: true }));
      } catch (e) {
        formule.textContent = "A^" + n + " = " + AN[n].map(function (rij) {
          return "(" + rij.map(function (x) { return ctx.getal(x, 3); }).join("  ") + ")";
        }).join(" ");
      }
    }

    function werkBij() {
      var n = dag();
      var v = rijen[n];
      toonFormule();
      var tekst = "Dag " + n + ": " + KORT.map(function (naam, i) {
        return naam + " = " + ctx.getal(v[i], 3);
      }).join(", ") + ".";
      if (n === 2 && st.keuze === REGEN) {
        tekst += " Vandaag regent het, dus overmorgen is de kans op mooi weer " +
          "0.25, ofwel 25 %: precies wat de kansboom en de kolom R van A² geven.";
      } else if (n >= 6) {
        tekst += " Na een aantal dagen verandert er nog nauwelijks iets: de " +
          "kansen naderen een evenwicht dat niet meer van het weer van vandaag afhangt.";
      }
      ctx.toon(tekst);
    }

    bord.on("update", werkBij);

    // Het weer van vandaag is een schakelaar: Vandaag: [Warm|Bewolkt|Regen].
    var groep = document.createElement("span");
    groep.className = "interactieve-grafiek-schakelaar";
    groep.setAttribute("role", "group");
    groep.setAttribute("aria-label", "Vandaag");
    groep.style.marginRight = "1.2rem";
    var vandaag = document.createElement("span");
    vandaag.textContent = "Vandaag:";
    vandaag.style.cssText = "align-self:center;font-size:.82rem;margin-right:-0.1rem";

    function kiesStart(i) {
      st.keuze = i;
      rijen = verloop();
      tekenKrommen();
      keuzeknoppen.forEach(function (knop, k) {
        knop.setAttribute("aria-pressed", String(k === i));
      });
    }

    var keuzeknoppen = START.map(function (keuze, i) {
      var knop = ctx.knop(keuze.naam, function () {
        kiesStart(i);
        bord.fullUpdate();
        werkBij();
      });
      if (!i) {
        knop.parentNode.insertBefore(vandaag, knop);
        knop.parentNode.insertBefore(groep, knop);
      }
      groep.appendChild(knop);
      knop.setAttribute("aria-pressed", String(i === REGEN));
      return knop;
    });

    function zetDag(n) {
      wijzer.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Vorige dag", function () { zetDag(Math.max(0, dag() - 1)); });
    ctx.knop("Volgende dag", function () { zetDag(Math.min(DAGEN, dag() + 1)); });

    function herstel() {
      kiesStart(REGEN);
      zetDag(2);
    }

    tekenKrommen();
    zetDag(2);
    return { reset: herstel };
  });

  /* --- 12. Migratiematrix: naar een evenwicht ---------------------------- */

  // De cursus rekent M¹⁰, M²⁰, M³⁰ en M⁵⁰ uit en besluit dat er een evenwicht
  // ontstaat. Hier is de startverdeling sleepbaar: het evenwicht 90 000 / 60 000
  // blijft staan, waar je ook begint. Dat maakt de exacte berekening erna
  // meteen begrijpelijk.
  G.registreer("migratie-evenwicht", function (ctx) {
    var M = [[0.90, 0.15], [0.10, 0.85]];
    var TOTAAL = 150;     // duizendtallen; zo blijven de asgetallen leesbaar
    var JAREN = 50;
    var EVENWICHT = [90, 60];
    var st = { jaar: 10 };

    var bord = ctx.maakBord({
      begrenzing: [-7, 172, JAREN + 7, -18],
      assen: false
    });
    assenMet(ctx, bord, "jaar", "aantal (×1000)");

    var spoorStart = bord.create("segment", [[0, 0], [0, TOTAAL]], {
      visible: false, fixed: true
    });
    var beginpunt = ctx.stijl(bord.create("glider", [0, 68, spoorStart], {
      name: "start", size: 6, showInfobox: false,
      precision: { touch: 30, mouse: 8 },
      label: { anchorX: "right", offset: [-10, 0] }
    }), "punt");

    var spoorJaar = bord.create("segment", [[0, 0], [JAREN, 0]], {
      visible: false, fixed: true
    });
    var jaarpunt = ctx.stijl(bord.create("glider", [st.jaar, 0, spoorJaar], {
      name: "jaar", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    function jaar() {
      return Math.max(0, Math.min(JAREN, Math.round(jaarpunt.X())));
    }

    function verloop() {
      var s = Math.max(0, Math.min(TOTAAL, beginpunt.Y()));
      var rij = [[s, TOTAAL - s]];
      for (var n = 1; n <= JAREN; n++) {
        var v = rij[n - 1];
        rij.push([M[0][0] * v[0] + M[0][1] * v[1],
                  M[1][0] * v[0] + M[1][1] * v[1]]);
      }
      return rij;
    }

    var rijen = verloop();

    var kromS = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "secante");
    var kromP = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2.5, fixed: true, highlight: false
    }), "punt");

    [0, 1].forEach(function (i) {
      ctx.stijl(bord.create("segment",
        [[0, EVENWICHT[i]], [JAREN, EVENWICHT[i]]], {
          strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
        }), "hulp");
      ctx.stijl(bord.create("text",
        [JAREN + 0.6, EVENWICHT[i], i === 0 ? "S" : "P"], {
          anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
          fontSize: 15, cssStyle: "font-weight:600"
        }), i === 0 ? "secante" : "punt");
    });

    var merkS = ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return rijen[jaar()][0]; }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "secante");
    var merkP = ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return rijen[jaar()][1]; }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "punt");

    ctx.stijl(bord.create("segment",
      [[function () { return jaar(); }, 0],
       [function () { return jaar(); }, TOTAAL]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");

    function tekenKrommen() {
      var xs = [];
      var ys = [];
      var zs = [];
      for (var n = 0; n <= JAREN; n++) {
        xs.push(n);
        ys.push(rijen[n][0]);
        zs.push(rijen[n][1]);
      }
      kromS.dataX = xs;
      kromS.dataY = ys;
      kromP.dataX = xs;
      kromP.dataY = zs;
    }

    // De krommen hangen enkel van de startverdeling af, de tekstregel ook van
    // het gekozen jaar. Het hertekenen gebeurt daarom bij het slepen van het
    // startpunt, niet bij elke update van het bord: anders zou de kromme een
    // beeld achterlopen op de hand die haar versleept.
    function hertekenen() {
      rijen = verloop();
      tekenKrommen();
      bord.update();
    }

    function werkBij() {
      var n = jaar();
      var v = rijen[n];
      ctx.toon("Start (" + (2002) + "): " + duizend(rijen[0][0] * 1000) +
        " in de stad en " + duizend(rijen[0][1] * 1000) + " op het platteland. " +
        "Na " + n + " jaar (" + (2002 + n) + "): S = " +
        duizend(v[0] * 1000) + " en P = " + duizend(v[1] * 1000) + ". " +
        (n >= 25
          ? "Het evenwicht 90 000 / 60 000 is bereikt."
          : "Sleep het startpunt: waar je ook begint, beide krommen lopen " +
            "naar 90 000 en 60 000."));
    }

    bord.on("update", werkBij);
    beginpunt.on("drag", hertekenen);

    function zetJaar(n) {
      jaarpunt.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Volgend jaar", function () { zetJaar(Math.min(JAREN, jaar() + 1)); });
    ctx.knop("Vorig jaar", function () { zetJaar(Math.max(0, jaar() - 1)); });
    ctx.knop("2012 (na 10 jaar)", function () { zetJaar(10); });
    ctx.knop("Na 50 jaar", function () { zetJaar(JAREN); });

    function herstel() {
      beginpunt.setPosition(window.JXG.COORDS_BY_USER, [0, 68]);
      hertekenen();
      zetJaar(10);
    }

    hertekenen();
    werkBij();
    return { reset: herstel };
  });

  /* --- 13. Lesliematrix: sterft de soort uit? ---------------------------- */

  // Op papier staan P₀, P₁, P₁₆ en P₃₂, en het besluit dat de populatie om de
  // 16 jaar halveert. Met een schuifknop op de overlevingskans van de eieren
  // wordt zichtbaar waar de kentering ligt: onder een bepaalde waarde sterft
  // de soort uit, erboven groeit ze.
  G.registreer("leslie-populatie", function (ctx) {
    var P0 = [180, 80, 50, 30, 20];
    var GEBOORTE = [0, 0, 2, 2, 1];
    var OVERLEEF = [null, 0.6, 0.6, 0.6];   // 1j->2j, 2j->3j, 3j->4j
    var JAREN = 40;
    var KLASSEN = ["0j", "1j", "2j", "3j", "4j"];

    var bord = ctx.maakBord({
      begrenzing: [-6, 430, JAREN + 6, -60],
      assen: false
    });
    assenMet(ctx, bord, "jaar", "aantal");

    // Onderaan links: daar is het bord leeg, en de knoppen Groot en Reset
    // zweven rechtsboven over de figuur.
    var schuif = bord.create("slider",
      [[2, -38], [16, -38], [0.1, 0.4, 1]], {
        name: "overleving eieren", snapWidth: 0.05, withTicks: false,
        size: 6, precision: 2,
        label: { fontSize: 13 }
      });
    ctx.stijl(schuif, "punt");
    ctx.stijl(schuif.baseline, "zwak");
    ctx.stijl(schuif.highline, "punt");

    function eiOverleving() {
      return Math.round(schuif.Value() * 20) / 20;
    }

    function volgende(P) {
      var uit = [0, 0, 0, 0, 0];
      for (var k = 0; k < 5; k++) uit[0] += GEBOORTE[k] * P[k];
      uit[1] = eiOverleving() * P[0];
      for (var i = 2; i < 5; i++) uit[i] = OVERLEEF[i - 1] * P[i - 1];
      return uit;
    }

    function verloop() {
      var rij = [P0.slice()];
      for (var n = 1; n <= JAREN; n++) rij.push(volgende(rij[n - 1]));
      return rij;
    }

    var rijen = verloop();

    function totaal(P) {
      return P.reduce(function (a, b) { return a + b; }, 0);
    }

    var kromTotaal = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 3, fixed: true, highlight: false
    }), "kromme");
    var kromEieren = ctx.stijl(bord.create("curve", [[], []], {
      strokeWidth: 2, dash: 2, fixed: true, highlight: false
    }), "secante");

    ctx.stijl(bord.create("segment", [[0, 360], [JAREN, 360]], {
      strokeWidth: 1.5, dash: 1, fixed: true, highlight: false
    }), "hulp");
    ctx.stijl(bord.create("text", [0.4, 372, "startaantal 360"], {
      anchorX: "left", fixed: true, highlight: false, fontSize: 13
    }), "hulp");
    ctx.stijl(bord.create("text", [JAREN + 0.6,
      function () { return totaal(rijen[JAREN]); }, "totaal"], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      fontSize: 14, cssStyle: "font-weight:600"
    }), "kromme");
    ctx.stijl(bord.create("text", [JAREN + 0.6,
      function () { return rijen[JAREN][0]; }, "eieren"], {
      anchorX: "left", anchorY: "middle", fixed: true, highlight: false,
      fontSize: 14
    }), "secante");

    var spoorJaar = bord.create("segment", [[0, 0], [JAREN, 0]], {
      visible: false, fixed: true
    });
    var jaarpunt = ctx.stijl(bord.create("glider", [16, 0, spoorJaar], {
      name: "jaar", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { anchorX: "middle", offset: [0, -20] }
    }), "hulp");

    function jaar() {
      return Math.max(0, Math.min(JAREN, Math.round(jaarpunt.X())));
    }

    ctx.stijl(bord.create("segment",
      [[function () { return jaar(); }, 0],
       [function () { return jaar(); }, 420]], {
        strokeWidth: 1.5, dash: 2, fixed: true, highlight: false
      }), "hulp");
    ctx.stijl(bord.create("point",
      [function () { return jaar(); },
       function () { return totaal(rijen[jaar()]); }], {
        name: "", size: 4, fixed: true, highlight: false, withLabel: false
      }), "kromme");

    function tekenKrommen() {
      var xs = [];
      var ys = [];
      var zs = [];
      for (var n = 0; n <= JAREN; n++) {
        xs.push(n);
        ys.push(totaal(rijen[n]));
        zs.push(rijen[n][0]);
      }
      kromTotaal.dataX = xs;
      kromTotaal.dataY = ys;
      kromEieren.dataX = xs;
      kromEieren.dataY = zs;
    }

    // Zoals bij de migratiematrix: het rekenwerk hoort bij het verzetten van de
    // schuifknop, de tekstregel bij elke update van het bord.
    function hertekenen() {
      rijen = verloop();
      tekenKrommen();
      bord.update();
    }

    function werkBij() {
      var n = jaar();
      var P = rijen[n];
      var groeit = totaal(rijen[JAREN]) > totaal(rijen[0]);
      ctx.toon("Overlevingskans van de eieren: " +
        ctx.getal(eiOverleving(), 2) + ". Na " + n + " jaar: " +
        KLASSEN.map(function (naam, i) {
          return naam + " = " + Math.round(P[i]);
        }).join(", ") + ", samen " +
        P.reduce(function (a, b) { return a + Math.round(b); }, 0) +
        " vogels. " +
        (groeit
          ? "Met deze overlevingskans groeit de populatie."
          : "Met deze overlevingskans krimpt de populatie: bij 0.4 halveert " +
            "ze ongeveer om de 16 jaar en sterft de soort uit."));
    }

    bord.on("update", werkBij);
    schuif.on("drag", hertekenen);

    function zetJaar(n) {
      jaarpunt.setPosition(window.JXG.COORDS_BY_USER, [n, 0]);
      bord.update();
      werkBij();
    }

    ctx.knop("Volgend jaar", function () { zetJaar(Math.min(JAREN, jaar() + 1)); });
    ctx.knop("Na 16 jaar", function () { zetJaar(16); });
    ctx.knop("Na 32 jaar", function () { zetJaar(32); });
    ctx.knop("Overleving 0.4", function () {
      schuif.setValue(0.4);
      hertekenen();
      werkBij();
    });
    ctx.knop("Overleving 0.7", function () {
      schuif.setValue(0.7);
      hertekenen();
      werkBij();
    });

    function herstel() {
      schuif.setValue(0.4);
      hertekenen();
      zetJaar(16);
    }

    hertekenen();
    werkBij();
    return { reset: herstel };
  });


}());
