/* Interactieve grafieken bij de oefeningen van matricesdeterminanten.tex.
 *
 * Deze oefeningen staan enkel in het keuzevak, niet in L01_Matrices.tex,
 * daarom horen ze in een eigen deelmodule en niet in die van L01.
 *
 * mkpi: gebruikt matrixbord.js
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var M = window.Matrixbord;
  if (!G || !M) return;

  var net = M.net;
  var haakjes = M.haakjes;
  var maakWerkblad = M.maakWerkblad;
  var klikPunt = M.klikPunt;
  var matrixBord = M.matrixBord;

  /* --- Gelijke matrices: x, y en z bepalen ------------------------------- */

  // Op papier worden de kandidaten na elkaar in de vergelijkingen gezet. Hier
  // zet een klik ze in beide matrices tegelijk, en zie je per paar
  // overeenkomstige elementen of het klopt: de matrices zijn pas gelijk
  // wanneer alle vier de paren kloppen. Bij de drie foute kandidaten loopt
  // telkens hetzelfde paar mis, rechtsboven, en dat is vergelijking (2).
  G.registreer("gelijke-matrices-xyz", function (ctx) {
    var wb = maakWerkblad(ctx);
    var bord = matrixBord(ctx);

    // z komt telkens uit (4), zoals in de oplossing.
    var KANDIDATEN = [[2, 3], [2, -3], [-2, 1], [-2, -1]].map(function (p) {
      return { x: p[0], y: p[1], z: -p[0] - p[1] };
    });
    var PLAATS = [["Linksboven", "Rechtsboven"], ["Linksonder", "Rechtsonder"]];
    var NUMMER = [[1, 2], [3, 4]];
    var LINKS_SYMBOOL = [["4", "x"], ["y²", "0"]];
    var RECHTS_SYMBOOL = [["x²", "y + 5z"], ["2x + 5", "x + y + z"]];

    var st = { k: -1, rij: 0, kolom: 0 };

    function kandidaat() { return st.k < 0 ? null : KANDIDATEN[st.k]; }

    function links(i, j, c) {
      return [[4, c.x], [c.y * c.y, 0]][i - 1][j - 1];
    }
    function rechts(i, j, c) {
      return [[c.x * c.x, c.y + 5 * c.z],
              [2 * c.x + 5, c.x + c.y + c.z]][i - 1][j - 1];
    }
    function klopt(i, j, c) { return links(i, j, c) === rechts(i, j, c); }
    function allesKlopt(c) {
      return klopt(1, 1, c) && klopt(1, 2, c) && klopt(2, 1, c) && klopt(2, 2, c);
    }

    // De uitwerking van één paar, met de getallen ingevuld.
    function uitwerking(i, j, c) {
      var l = [["4", "x = " + net(c.x)],
               ["y² = " + haakjes(c.y) + "² = " + (c.y * c.y), "0"]][i - 1][j - 1];
      var r = [["x² = " + haakjes(c.x) + "² = " + (c.x * c.x),
                "y + 5z = " + net(c.y) + " + 5·" + haakjes(c.z) + " = " + net(c.y + 5 * c.z)],
               ["2x + 5 = 2·" + haakjes(c.x) + " + 5 = " + net(2 * c.x + 5),
                "x + y + z = " + net(c.x) + " + " + haakjes(c.y) + " + " + haakjes(c.z) +
                " = " + net(c.x + c.y + c.z)]][i - 1][j - 1];
      return PLAATS[i - 1][j - 1] + ", vergelijking (" + NUMMER[i - 1][j - 1] +
        "): links " + l + ", rechts " + r + ".";
    }

    // JSXGraph vraagt de plaatsen al op terwijl de matrices gebouwd worden,
    // dus rekenen we met hun vaste breedte: twee kolommen plus de haken.
    function plaats() {
      var HAKEN = 2 * (0.16 + 0.2);
      var BL = 2 * 1.5 + HAKEN;
      var BR = 2 * 2.4 + HAKEN;
      var TUSSEN = 0.55;
      var TEKEN = 0.7;
      var totaal = BL + BR + TEKEN + 2 * TUSSEN;
      return {
        x: totaal / 2 - BL / 2,
        x2: totaal / 2 - BR / 2,
        is: -totaal / 2 + BL + TUSSEN + TEKEN / 2,
        breedte: totaal
      };
    }

    var L = wb.matrix(bord, {
      rijen: 2, kolommen: 2, celbreedte: 1.5,
      x: function () { return -plaats().x; },
      waarde: function (i, j) {
        var c = kandidaat();
        return c ? net(links(i, j, c)) : LINKS_SYMBOOL[i - 1][j - 1];
      }
    });
    var R = wb.matrix(bord, {
      rijen: 2, kolommen: 2, celbreedte: 2.4,
      x: function () { return plaats().x2; },
      waarde: function (i, j) {
        var c = kandidaat();
        if (!c) return RECHTS_SYMBOOL[i - 1][j - 1];
        // Een kruisje zou je lezen als de letter x; een paar dat verschilt,
        // toont daarom met ≠ ook de waarde links.
        return net(rechts(i, j, c)) +
          (klopt(i, j, c) ? "  ✓" : " ≠ " + net(links(i, j, c)));
      }
    });

    // Het teken tussen de matrices wordt ≠ zodra één paar niet klopt: zo
    // hangt het besluit niet enkel aan de kleur.
    wb.tekst(bord, function () { return plaats().is; }, 0, function () {
      var c = kandidaat();
      return c && !allesKlopt(c) ? "≠" : "=";
    }, "zwak", { factor: 1.3 });

    // Per cel een markering in elk van beide kleuren: groen voor een paar
    // dat klopt, rood voor een paar dat verschilt. Die kleuren zijn geen rol
    // van de runtime; ze komen uit --kleur-goed en --kleur-fout van de site.
    var merken = [];
    [L, R].forEach(function (m) {
      for (var i = 1; i <= 2; i++) {
        for (var j = 1; j <= 2; j++) {
          merken.push({ i: i, j: j, goed: m.markeer("goed"), fout: m.markeer("fout") });
        }
      }
    });

    function kleuren(k) {
      var uit = k || ctx.kleuren();
      var stijl = window.getComputedStyle(ctx.figuur);
      uit.goed = stijl.getPropertyValue("--kleur-goed").trim() || "#27823b";
      uit.fout = stijl.getPropertyValue("--kleur-fout").trim() || "#c43535";
      return uit;
    }
    function herkleur(k) { wb.kleur(kleuren(k)); }
    herkleur();

    wb.venster(bord, function () {
      return [plaats().breedte + 1.2, 2 + 1.4];
    });

    function werkBij() {
      var c = kandidaat();
      merken.forEach(function (mk) {
        mk.goed.verberg();
        mk.fout.verberg();
        if (!c) return;
        var geselecteerd = !st.rij || (st.rij === mk.i && st.kolom === mk.j);
        if (!geselecteerd) return;
        (klopt(mk.i, mk.j, c) ? mk.goed : mk.fout).zet(mk.i, mk.j);
      });
      wb.pas();

      if (!c) {
        ctx.toon("Kies een kandidaat. Uit (1) en (3) volgen vier " +
          "mogelijkheden voor x en y; z halen we telkens uit (4).");
        return;
      }
      var kop = "x = " + net(c.x) + ", y = " + net(c.y) + ", z = " + net(c.z) + ". ";
      if (st.rij) {
        ctx.toon(kop + uitwerking(st.rij, st.kolom, c) + " " +
          (klopt(st.rij, st.kolom, c) ? "Dit paar klopt." : "Dit paar klopt niet.") +
          " Klik opnieuw op het element om alle paren te zien.");
        return;
      }
      if (allesKlopt(c)) {
        ctx.toon(kop + "Alle vier de paren kloppen, dus de matrices zijn " +
          "gelijk: dit is de oplossing.");
        return;
      }
      var fout = [];
      for (var i = 1; i <= 2; i++) {
        for (var j = 1; j <= 2; j++) {
          if (!klopt(i, j, c)) fout.push(uitwerking(i, j, c));
        }
      }
      ctx.toon(kop + fout.join(" ") + " Dat paar verschilt, dus de matrices " +
        "zijn niet gelijk. Klik op een element voor de uitwerking.");
    }

    bord.on("down", function (e) {
      var p = klikPunt(bord, e);
      if (!p || !kandidaat()) return;
      var cel = L.celVan(p[0], p[1]) || R.celVan(p[0], p[1]);
      if (!cel) return;
      if (st.rij === cel.rij && st.kolom === cel.kolom) {
        st.rij = 0;
        st.kolom = 0;
      } else {
        st.rij = cel.rij;
        st.kolom = cel.kolom;
      }
      werkBij();
    });

    // De eerste knop zet de uitdrukkingen terug, de andere vullen elk een
    // kandidaat in.
    var knoppen = [ctx.knop("x, y, z", function () { kies(-1); })].concat(
      KANDIDATEN.map(function (c, k) {
        return ctx.knop("x = " + net(c.x) + ", y = " + net(c.y) +
          ", z = " + net(c.z), function () { kies(k); });
      }));

    function kies(k) {
      st.k = k;
      st.rij = 0;
      st.kolom = 0;
      knoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(i === k + 1));
      });
      werkBij();
    }

    function herstel() { kies(-1); }

    kies(-1);
    return { reset: herstel, herschaal: wb.pas, kleur: herkleur };
  });
})();
