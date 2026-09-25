/* Stelselrekenmachine voor de cursussite.
 *
 * Een rekenvenster bij het hoofdstuk over stelsels: de leerling typt een
 * stelsel, één vergelijking per regel, en ziet het oplossen zoals in de
 * cursus. De uitgebreide matrix wordt met de methode van Gauss-Jordan stap
 * voor stap herleid, met de rij-operaties naast de rijen, de spil in een
 * kadertje en op vraag de controlekolom; daarna het stelsel dat we aflezen,
 * de oplossingenverzameling en de rangen. Staat er een parameter in, dan
 * wordt het stelsel besproken, met een geval per waarde die de spil nul
 * maakt en onderaan een overzicht.
 *
 * Het rekenwerk zit in stelselcas.js (window.StelselCAS), de formules in
 * MathJax, dat de cursuspagina al laadt. presentatie.js bouwt het venster en
 * roept Stelselrekenmachine.maak(houder) aan. Het venster onthoudt niets
 * tussen twee bezoeken aan de pagina.
 */
(function () {
  "use strict";

  var CAS = window.StelselCAS;

  // De voorbeelden uit het hoofdstuk, elk met wat het laat zien.
  var VOORBEELDEN = [
    ["Voorbeeld 1", "juist één oplossing", "2x - y + 3z = 5\n3x + 2y + 2z = 4\n5x + 3y - z = 7"],
    ["Voorbeeld 2", "vier vergelijkingen, drie onbekenden",
     "2x + 4y - z = -7\n3x + 6y + 2z = 0\n-2x + 2y - 3z = -17\n4x - 3y + 4z = 26"],
    ["Voorbeeld 3", "oneindig veel oplossingen", "3x - 7y + 2z = 2\n-x + 3y = -2\nx - 2y + z = 0"],
    ["Voorbeeld 4", "een strijdig stelsel", "x - 3y - z = 2\n-2x + 5y + 3z = 4\n4x - 11y - 5z = 5"],
    ["Vraagstuk", "zoals het opgesteld wordt", "x + y + z = 1110\nx = 2(y + z)\ny = 2(x - 600 + z)"],
    ["Homogeen", "met een parameter m", "mx + 2y + 4z = 0\n2x + 4y + mz = 0\n4x + my + 2z = 0"],
    ["Bespreken", "met een parameter m", "x + 4y + 2mz = 3\nx + y - mz = 0\nmx + (m+1)y + (m-1)z = m"],
    ["Coëxistentie", "wanneer is het stelsel oplosbaar?", "-x + 3y + 2z = 2\n2x - 2y + az = 3\nx + y + z = a"]
  ];

  var SCHRIJFWIJZE = [
    ["2x - y + 3z = 5", "één vergelijking per regel, of gescheiden door ;"],
    ["x = 2(y + z)", "haakjes, en onbekenden in beide leden"],
    ["0.5x + 1/3y = 1", "decimalen met een punt, breuken met /"],
    ["mx + (m+1)y = m", "een andere letter is een parameter (hoogstens twee)"],
    ["x_1 + x_2 = 3", "onbekenden met een index, ook als x1"],
    ["a + b + c = 6", "zonder x, y, z, u, v of w zijn alle letters onbekenden"]
  ];

  /* --- Kleine hulpjes ---------------------------------------------------- */

  function el(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  function knop(opschrift, klasse, bij) {
    var k = el("button", "sr-knop" + (klasse ? " " + klasse : ""), opschrift);
    k.type = "button";
    if (bij) k.addEventListener("click", bij);
    return k;
  }

  // Een formule als knooppunt. MathJax is er meestal al; zo niet, dan staat er
  // even de LaTeX-bron, die vervangen wordt zodra MathJax klaar is.
  function wiskunde(tex, blok) {
    var houder = el(blok ? "div" : "span", blok ? "sr-formule" : "sr-inline");
    var mj = window.MathJax;
    function zet() {
      try {
        houder.replaceChildren(window.MathJax.tex2svg(tex, { display: !!blok }));
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
  function tekstMetWiskunde(tekst, tag, klasse) {
    var p = el(tag || "p", klasse);
    tekst.split("$").forEach(function (deel, i) {
      if (!deel) return;
      p.appendChild(i % 2 ? wiskunde(deel, false) : document.createTextNode(deel));
    });
    return p;
  }

  /* --- De rekenmachine ---------------------------------------------------- */

  function maak(houder) {
    var controle = false;
    var wortel = el("div", "sr");

    /* --- Invoer --------------------------------------------------------- */

    var voorbeelden = el("div", "sr-voorbeelden");
    voorbeelden.appendChild(el("span", "sr-zwak", "Voorbeelden:"));
    VOORBEELDEN.forEach(function (v) {
      var k = knop(v[0], "sr-klein", function () {
        invoer.value = v[2];
        pasHoogteAan();
        reken();
        invoer.focus({ preventScroll: true });
      });
      k.title = v[1];
      voorbeelden.appendChild(k);
    });

    var invoerrij = el("div", "sr-invoerrij");
    var label = el("label", "sr-label", "Stelsel:");
    var invoer = el("textarea", "sr-invoer");
    invoer.id = "sr-invoer";
    invoer.rows = 3;
    invoer.spellcheck = false;
    invoer.autocomplete = "off";
    invoer.setAttribute("autocapitalize", "off");
    invoer.placeholder = "één vergelijking per regel, bijvoorbeeld\n2x - y + 3z = 5\n3x + 2y + 2z = 4";
    label.htmlFor = invoer.id;
    invoerrij.appendChild(label);
    invoerrij.appendChild(invoer);

    var bediening = el("div", "sr-bediening");
    var knopControle = knop("Controlekolom", "sr-klein sr-schakelaar", function () {
      controle = !controle;
      zetControle();
      reken();
    });
    knopControle.title = "Toon naast elke matrix de som van elke rij";
    function zetControle() {
      knopControle.classList.toggle("sr-aan", controle);
      knopControle.setAttribute("aria-pressed", String(controle));
    }
    zetControle();
    var wis = knop("Wissen", "sr-klein", function () {
      invoer.value = "";
      pasHoogteAan();
      reken();
      invoer.focus();
    });
    bediening.appendChild(knopControle);
    bediening.appendChild(wis);

    var hulp = el("details", "sr-hulp");
    hulp.appendChild(el("summary", null, "Hoe typ ik dat?"));
    var tabel = el("table", "sr-schrijfwijze");
    SCHRIJFWIJZE.forEach(function (r) {
      var tr = el("tr");
      var td1 = el("td");
      td1.appendChild(el("code", null, r[0]));
      tr.appendChild(td1);
      tr.appendChild(el("td", null, r[1]));
      tabel.appendChild(tr);
    });
    hulp.appendChild(tabel);
    hulp.appendChild(el("p", "sr-zwak",
      "De rekenmachine herleidt zoals in de cursus: zonder breuken, met de combinatiemethode " +
      "(R₂ → 2R₂ − 3R₁), en deelt een rij door wat alle elementen gemeen hebben."));

    var uitvoer = el("div", "sr-uitvoer");
    uitvoer.setAttribute("aria-live", "polite");

    wortel.appendChild(voorbeelden);
    wortel.appendChild(invoerrij);
    wortel.appendChild(bediening);
    wortel.appendChild(hulp);
    wortel.appendChild(uitvoer);

    // Het veld groeit mee met het aantal vergelijkingen.
    function pasHoogteAan() {
      var regels = invoer.value.split("\n").length;
      invoer.rows = Math.max(3, Math.min(8, regels + 1));
    }

    var timer = null;
    invoer.addEventListener("input", function () {
      pasHoogteAan();
      clearTimeout(timer);
      timer = setTimeout(reken, 300);
    });

    /* --- Uitvoer -------------------------------------------------------- */

    function leeg() {
      var d = el("div", "sr-leeg");
      d.appendChild(el("p", null, "Typ hierboven een stelsel, of kies een voorbeeld."));
      return d;
    }

    // De fout met de regel waarin ze staat, en het teken aangewezen.
    function foutblok(tekst, fout) {
      var d = el("div", "sr-fout");
      d.appendChild(tekstMetWiskunde(fout.message, "p", "sr-foutmelding"));
      if (typeof fout.plaats === "number") {
        var p = Math.min(fout.plaats, tekst.length);
        var begin = Math.max(tekst.lastIndexOf("\n", p - 1), tekst.lastIndexOf(";", p - 1)) + 1;
        var einde = tekst.slice(p).search(/[\n;]/);
        einde = einde < 0 ? tekst.length : p + einde;
        var code = el("code", "sr-foutplaats");
        code.appendChild(document.createTextNode(tekst.slice(begin, p)));
        code.appendChild(el("mark", null, tekst.slice(p, p + 1).replace(/[\n;]/, " ") || " "));
        code.appendChild(document.createTextNode(tekst.slice(p + 1, einde)));
        d.appendChild(code);
      }
      return d;
    }

    function reken() {
      clearTimeout(timer);
      var tekst = invoer.value;
      var r = null, fout = null;
      try { r = CAS.los(tekst, { controle: controle }); }
      catch (e) {
        if (!(e instanceof CAS.Rekenfout || e instanceof CAS.Invoerfout)) {
          if (window.console) console.error(e);
          e = new CAS.Rekenfout("Daar liep iets mis in de rekenmachine zelf.");
        }
        fout = e;
      }
      invoer.classList.toggle("sr-veld-fout", !!(fout && fout instanceof CAS.Invoerfout));
      if (fout) { uitvoer.replaceChildren(foutblok(tekst, fout)); return; }
      if (!r) { uitvoer.replaceChildren(leeg()); return; }
      uitvoer.replaceChildren(toon(r));
    }

    function toon(r) {
      var d = el("div", "sr-oplossing");

      // Hoe de rekenmachine het stelsel leest: in standaardvorm, met A_b.
      var n = r.n;
      var gelezen = "Los op in $\\R^{" + n + "}$ naar $" + r.onbekenden.map(naamTex).join(",") + "$";
      if (r.parameters.length) {
        gelezen += ", met " + (r.parameters.length === 1 ? "parameter" : "parameters") + " $" +
                   r.parameters.join(",") + "$";
      }
      d.appendChild(tekstMetWiskunde(gelezen + ":", "p", "sr-gelezen"));
      // Het stelsel en A_b naast elkaar, of onder elkaar op een smal scherm.
      var paar = el("div", "sr-paar");
      paar.appendChild(wiskunde(r.stelsel, true));
      paar.appendChild(wiskunde(r.Ab, true));
      d.appendChild(paar);
      r.info.forEach(function (t) { d.appendChild(tekstMetWiskunde(t, "p", "sr-info")); });
      if (r.det) d.appendChild(wiskunde(r.det, true));

      d.appendChild(el("h3", "sr-kop", "Methode van Gauss-Jordan"));
      knoop(d, r.knoop, "");

      if (r.overzicht.length) {
        d.appendChild(el("h3", "sr-kop", "Overzicht"));
        var rijen = r.overzicht.map(function (o) { return o.voorwaarden + ": & " + o.V; });
        var ov = wiskunde("\\begin{array}{ll}" + rijen.join("\\\\[6pt] ") + "\\end{array}", true);
        ov.classList.add("sr-overzicht");
        d.appendChild(ov);
      }
      return d;
    }

    function naamTex(x) {
      var m = /^(.)_(\d+)$/.exec(x);
      return m ? m[1] + "_{" + m[2] + "}" : x;
    }

    // Eén knoop van de herleiding: haar stappen, en dan de gevallen of het
    // besluit. Gevallen binnen een geval krijgen een nummer als 2.1.
    function knoop(ouder, k, nummer) {
      var stappen = el("div", "sr-stappen");
      k.lijnen.forEach(function (l) {
        if (l.kop) stappen.appendChild(tekstMetWiskunde(l.kop, "p", "sr-stapkop"));
        stappen.appendChild(wiskunde(l.tex, true));
      });
      if (k.lijnen.length) ouder.appendChild(stappen);
      if (k.gevallen) {
        k.gevallen.forEach(function (g, i) {
          var nr = (nummer ? nummer + "." : "") + (i + 1);
          var geval = el("section", "sr-geval");
          var kop = tekstMetWiskunde("Geval " + nr + ": $" + g.voorwaarden + "$", "h4", "sr-gevalkop");
          geval.appendChild(kop);
          knoop(geval, g, nr);
          ouder.appendChild(geval);
        });
        return;
      }
      var b = k.besluit;
      ouder.appendChild(wiskunde(b.oplossing, true));
      var V = wiskunde(b.V, true);
      V.classList.add("sr-V");
      ouder.appendChild(V);
      var rang = el("p", "sr-rangen");
      rang.appendChild(wiskunde(b.rangen, false));
      rang.appendChild(document.createTextNode(": " + b.uitleg.charAt(0).toLowerCase() + b.uitleg.slice(1)));
      ouder.appendChild(rang);
    }

    houder.appendChild(wortel);
    reken();
    setTimeout(function () { invoer.focus({ preventScroll: true }); }, 0);

    return {
      element: wortel,
      herstel: function () {
        invoer.value = "";
        controle = false;
        zetControle();
        hulp.open = false;
        pasHoogteAan();
        reken();
        invoer.focus();
      }
    };
  }

  window.Stelselrekenmachine = { maak: maak };
})();
