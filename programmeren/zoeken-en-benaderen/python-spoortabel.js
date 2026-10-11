/* Herbruikbare MathJax-sporentabellen bij pythonspoor. */
(function () {
  "use strict";
  // De hele array blijft staan; we onthullen enkel haar MathJax-groepen.
  // Daardoor houden ook lege rijen precies dezelfde afmetingen.
  var spoortabelWachtrij = Promise.resolve();
  var spoortabelStanden = new WeakMap();
  function volg(e) {
    var t = e.detail;
    if (!t || !t.spoor) return;
    var kader = Array.from(document.querySelectorAll(".python-spoortabel"))
      .find(function (tabel) { return tabel.dataset.spoor === t.spoor; });
    if (!kader) return;
    var namen = kader.dataset.variabelen.split(",").map(function (naam) { return naam.trim(); });
    var vergelijk = (kader.dataset.vergelijk || "").split(",").map(function (naam) { return naam.trim(); }).filter(Boolean);
    var regel = Number(kader.dataset.regel);
    var reserve = Number(kader.dataset.rijen);
    var stand = spoortabelStanden.get(kader);
    if (!stand) {
      var formule = document.createElement("div");
      formule.className = "python-spoorformule";
      kader.appendChild(formule);
      stand = { formule: formule, bron: null, generatie: 0, aantal: 0 };
      spoortabelStanden.set(kader, stand);
    }
    var opname = t.soort === "stap" ? t.instructies : null;
    var stappen = opname || [];
    var meetmomenten = stappen.filter(function (stap) { return stap.regel === regel; });
    stand.aantal = stappen.slice(0, t.index + 1).filter(function (stap) {
      return stap.regel === regel;
    }).length;
    function onthul() {
      stand.formule.querySelectorAll(".python-spoorcel").forEach(function (cel) {
        var rij = Number(cel.getAttribute("class").match(/python-spoorrij-(\d+)/)[1]);
        cel.style.visibility = rij < stand.aantal ? "visible" : "hidden";
        cel.classList.toggle("python-spoorhuidig", rij === stand.aantal - 1);
      });
    }
    onthul();
    // De opname verandert niet bij stappen: zet de array maar één keer.
    if (stand.opname === opname) return;
    stand.opname = opname;
    function tekst(waarde) {
      return "\\text{" + String(waarde).replace(/[\\{}%$&#_^~]/g, function (c) {
        return "\\" + c;
      }) + "}";
    }
    var breedtes = namen.map(function (naam) {
      var lengte = Math.max(1, ...meetmomenten.map(function (stap) {
        return String(stap.waarden[naam] || "").length;
      }));
      return "\\texttt{" + "0".repeat(lengte) + "}";
    });
    if (vergelijk.length) breedtes.push(tekst("te hoog"));
    var rijen = [];
    for (var i = 0; i < Math.max(reserve, meetmomenten.length); i++) {
      var v = meetmomenten[i] && meetmomenten[i].waarden;
      var waarden = namen.map(function (naam) { return v ? v[naam] || "" : ""; });
      if (vergelijk.length) {
        var a = v && v[vergelijk[0]], b = v && v[vergelijk[1]];
        var numeriek = a !== undefined && b !== undefined && a !== null && b !== null &&
          Number.isFinite(Number(a)) && Number.isFinite(Number(b));
        waarden.push(!numeriek ? "" : Number(a) < Number(b) ? "te laag" :
          Number(a) > Number(b) ? "te hoog" : "juist");
      }
      rijen.push(waarden.map(function (waarde, kolom) {
        var inhoud = "\\phantom{" + breedtes[kolom] + "}\\llap{" + tekst(waarde) + "}";
        return "\\class{python-spoorcel python-spoorrij-" + i + "}{" + inhoud + "}";
      }).join(" & "));
    }
    var koppen = namen.map(function (naam) { return "\\texttt{" + naam.replace(/_/g, "\\_") + "}"; });
    if (vergelijk.length) koppen.push("");
    var bron = "\\[\\begin{array}{" + koppen.map(function (_, i) {
      return vergelijk.length && i === koppen.length - 1 ? "l" : "c";
    }).join("|") + "}" + koppen.join(" & ") + " \\\\ \\hline " +
      rijen.join(" \\\\ ") + "\\end{array}\\]";
    if (stand.bron === bron) return;
    stand.bron = bron;
    var generatie = ++stand.generatie;
    // Zet naast de zichtbare formule, zoals bij de determinantvoorbeelden.
    spoortabelWachtrij = spoortabelWachtrij.then(function () {
      if (generatie !== stand.generatie) return;
      var MJ = window.MathJax;
      if (!MJ || !MJ.typesetPromise) return;
      var kopie = stand.formule.cloneNode(false);
      kopie.style.cssText = "position:absolute;display:block;visibility:hidden;left:0;top:0;width:100%";
      kopie.setAttribute("aria-hidden", "true");
      kopie.textContent = bron;
      kader.appendChild(kopie);
      return MJ.typesetPromise([kopie]).then(function () {
        if (generatie !== stand.generatie) return;
        MJ.typesetClear([stand.formule]);
        stand.formule.replaceChildren();
        while (kopie.firstChild) stand.formule.appendChild(kopie.firstChild);
        onthul();
        // De papieren oplossing verdwijnt pas als de opname en de gezette
        // tabel beschikbaar zijn. Zonder werkende runtime blijft zij staan.
        if (opname && meetmomenten.length && !t.fout &&
            stand.formule.querySelector("mjx-container") &&
            !stand.formule.querySelector('[data-mml-node="merror"], .mjx-merror')) {
          kader.classList.add("python-spoortabel-actief");
        }
      }).finally(function () { kopie.remove(); });
    }).catch(function (fout) {
      kader.classList.remove("python-spoortabel-actief");
      stand.opname = undefined;
      stand.bron = null;
      console.warn("De interactieve sporentabel kon niet starten; de gewone oplossing blijft staan.", fout);
    });
  }
  document.addEventListener("python:toestand", volg);
  // De algemene Pythonruntime kan haar eerste melding al verstuurd hebben.
  document.querySelectorAll(".python-oefening").forEach(function (blok) {
    if (blok.mathesisPythonToestand) volg({ detail: blok.mathesisPythonToestand });
  });
})();
