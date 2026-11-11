/* Interactieve grafieken bij N02_FunctiesEnRecursie.tex.
 *
 * callstack: de stapel wachtende aanroepen bij een codeblok met
 * [stap-per-aanroep,grafiek=callstack]. De grafiek verzint niets: ze toont
 * bij elke stap van de debugger de stapel die de worker opnam. Zolang we
 * dieper gaan, is de bovenste aanroep blauw. Keert een functie terug met een
 * waarde, dan is ze oranje. Het bord groeit mee met de diepste stapel van de
 * opname, zodat ook som(8) past.
 *
 * Onder de stapel staat de afleiding, zoals je ze op papier zou schrijven:
 * `som(3)`, `= 3 + som(2)`, `= 3 + (2 + som(1))`, ... Ze wordt uit de stapel
 * opgebouwd (de return-regel van elke aanroep met ingevulde waarden) en
 * markeert het deel dat bij de aanroep hoort die nu aan de beurt is.
 */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  var JXG = window.JXG;
  if (!G || !JXG) return;

  var MINRIJEN = 4;
  var RIJHOOGTE = 30;

  function naam(frame) { return frame.naam + "(" + frame.argumenten.join(", ") + ")"; }

  var BEGIN = "\u27e6", EIND = "\u27e7";

  // De afleiding bij één stap, met de markering rond het actieve deel. Elke
  // wachtende aanroep zet haar return-regel in de regel van de aanroep ervoor.
  function samen(stap) {
    var f = stap.stapel;
    if (!f || !f.length) return null;
    var tekst = "";
    for (var i = 0; i < f.length; i++) {
      var top = i === f.length - 1;
      var oproep = naam(f[i]);
      var deel = top && stap.terug !== undefined ? stap.terug
        : f[i].uitdrukking !== null && f[i].uitdrukking !== undefined ? f[i].uitdrukking : oproep;
      var samengesteld = /[-+*\/%]/.test(deel.replace(/^-/, "")) && deel !== oproep;
      var inhoud = top ? BEGIN + deel + EIND : deel;
      if (i === 0) { tekst = inhoud; continue; }
      var plek = tekst.indexOf(oproep);
      if (plek < 0) break;
      tekst = tekst.slice(0, plek) + (samengesteld ? "(" + inhoud + ")" : inhoud) + tekst.slice(plek + oproep.length);
    }
    return tekst;
  }

  function zonderMarkering(tekst) { return tekst.split(BEGIN).join("").split(EIND).join(""); }

  // De regels tot en met stap `index`: elke nieuwe vorm van de afleiding is een
  // regel. De markering staat enkel in de laatste.
  function afleiding(instructies, index) {
    var regels = [];
    for (var i = 0; i <= index && i < instructies.length; i++) {
      var tekst = samen(instructies[i]);
      if (tekst === null) continue;
      var kaal = zonderMarkering(tekst);
      if (regels.length && zonderMarkering(regels[regels.length - 1]) === kaal) regels[regels.length - 1] = tekst;
      else regels.push(tekst);
    }
    return regels.map(function (tekst, i) {
      return i === regels.length - 1 ? tekst : zonderMarkering(tekst);
    });
  }

  G.registreer("callstack", function (ctx) {
    var rijen = MINRIJEN;
    var bord = ctx.maakBord({ begrenzing: [0, rijen + 0.7, 17, -0.1], assen: false });
    var toestand = { frames: [], terug: null, regel: "" };
    var vlakken = [];
    var teksten = [];

    function rij(i) {
      var f = toestand.frames[i];
      if (!f) return "";
      if (i < toestand.frames.length - 1) return naam(f) + "   wacht op   " + naam(toestand.frames[i + 1]);
      if (toestand.terug !== null) return naam(f) + "   geeft " + toestand.terug + " terug";
      return naam(f) + "   " + toestand.regel;
    }

    function maakRij(i) {
      var y0 = i + 0.08, y1 = i + 0.92;
      vlakken.push(bord.create("polygon", [[0.3, y0], [16.7, y0], [16.7, y1], [0.3, y1]], {
        fixed: true, highlight: false, vertices: { visible: false },
        fillOpacity: 1, borders: { strokeWidth: 1, highlight: false }
      }));
      teksten.push(ctx.stijl(bord.create("text", [0.8, i + 0.5, function () { return rij(i); }], {
        anchorX: "left", anchorY: "middle", fixed: true, highlight: false
      }), "tekst"));
    }
    for (var i = 0; i < rijen; i++) maakRij(i);
    var leeg = ctx.stijl(bord.create("text", [8.5, 2, function () {
      return toestand.leeg || "";
    }], { anchorX: "middle", anchorY: "middle", fixed: true, highlight: false }), "zwak");

    // De hoogte volgt de diepste stapel van de hele opname, zodat de rijen
    // niet krimpen of verspringen tijdens het stappen.
    function pasRijenAan(gewenst) {
      gewenst = Math.max(MINRIJEN, gewenst);
      if (gewenst === rijen) return;
      for (var i = vlakken.length; i < gewenst; i++) maakRij(i);
      rijen = gewenst;
      bord.presBegrenzing = [0, rijen + 0.7, 17, -0.1];
      bord.setBoundingBox(bord.presBegrenzing, false);
      ctx.figuur.setAttribute("data-hoogte", (rijen * RIJHOOGTE + 24) + "px");
      G.herschaal(ctx.figuur);
    }

    // De afleiding staat als wiskunde boven de code en de stapel, over de volle
    // breedte van het codeblok. Zonder MathJax valt ze terug op gewone tekst.
    var paneel = document.createElement("div");
    paneel.className = "python-wiskunde callstack-afleiding";
    paneel.setAttribute("aria-label", "Afleiding");
    paneel.style.cssText = "margin:0 0 .8rem;overflow-x:auto;overflow-y:hidden;text-align:center";
    ctx.figuur.appendChild(paneel);
    // Het codeblok verhuist de grafiek pas na het bouwen naar zichzelf; dan pas
    // is bekend waar het vak, boven alles, hoort te staan.
    function plaats() {
      var editor = ctx.figuur.closest(".python-editor");
      if (editor && editor.firstChild !== paneel) editor.insertBefore(paneel, editor.firstChild);
    }
    var gemeten = "";

    function hex(kleur) {
      var m = document.createElement("span");
      m.style.color = kleur;
      document.body.appendChild(m);
      var c = window.getComputedStyle(m).color.match(/\d+/g) || [0, 0, 0];
      document.body.removeChild(m);
      return "#" + c.slice(0, 3).map(function (x) { return ("0" + Number(x).toString(16)).slice(-2); }).join("");
    }

    // Python naar TeX: functienamen in typemachinelettertype, * en % als in de cursus.
    function tex(tekst) {
      return tekst.replace(/([A-Za-z_]\w*)\(/g, function (m, naam) {
        return "\\texttt{" + naam.replace(/_/g, "\\_") + "}(";
      }).replace(/\*/g, "\\cdot ").replace(/%/g, "\\bmod ");
    }

    function texRegel(tekst, kleur) {
      var delen = tekst.split(BEGIN);
      if (delen.length === 1) return tex(delen[0]);
      var rest = delen[1].split(EIND);
      return tex(delen[0]) + "{\\color{" + kleur + "}\\boxed{" + tex(rest[0]) + "}}" + tex(rest[1] || "");
    }

    function texAfleiding(regels, kleur) {
      if (!regels.length) return "";
      if (regels.length === 1) return texRegel(regels[0], kleur);
      var rijen = [texRegel(regels[0], kleur) + " &= " + texRegel(regels[1], kleur)];
      for (var i = 2; i < regels.length; i++) rijen.push("&= " + texRegel(regels[i], kleur));
      return "\\begin{aligned}" + rijen.join("\\\\") + "\\end{aligned}";
    }

    function zetWiskunde(regels, kleur) {
      var mj = window.MathJax;
      if (!mj || typeof mj.tex2svg !== "function") return false;
      try {
        var svg = mj.tex2svg("\\displaystyle " + texAfleiding(regels, kleur), { display: false }).querySelector("svg");
        paneel.replaceChildren(svg);
        return true;
      } catch (e) { return false; }
    }

    function toonAfleiding(k) {
      plaats();
      var regels = toestand.afleiding || [];
      var kleur = hex(toestand.terug !== null ? k.secante : k.punt);
      // De hoogte van de volledige afleiding, zodat er niets verspringt.
      // Vanaf vijf aanroepen onder elkaar (som(4)) wordt het lettertype stap
      // voor stap kleiner, zodat de afleiding ook breder dan som(3) past.
      var grootte = Math.max(0.7, 1.25 - 0.1 * Math.max(0, (toestand.diepte || 0) - 4));
      paneel.style.fontSize = grootte + "rem";
      var alle = grootte + ":" + (toestand.alle || []).join("|");
      if (alle && alle !== gemeten && zetWiskunde(toestand.alle, kleur)) {
        gemeten = alle;
        paneel.style.minHeight = "";
        paneel.style.minHeight = paneel.offsetHeight + "px";
      }
      if (!zetWiskunde(regels, kleur)) {
        paneel.textContent = regels.map(function (t, i) { return (i ? "= " : "") + zonderMarkering(t); }).join("\n");
        paneel.style.whiteSpace = "pre";
      }
    }

    function teken() {
      var k = ctx.kleuren();
      toonAfleiding(k);
      var n = toestand.frames.length;
      vlakken.forEach(function (v, i) {
        var aanwezig = i < n;
        var boven = i === n - 1;
        v.setAttribute({ visible: aanwezig });
        v.borders.forEach(function (l) { l.setAttribute({ visible: aanwezig, strokeColor: k.as }); });
        v.setAttribute({
          fillColor: boven ? (toestand.terug !== null ? k.secante : k.punt) : k.raster,
          fillOpacity: boven ? 0.45 : 0.6
        });
        teksten[i].setAttribute({ visible: aanwezig });
      });
      bord.fullUpdate();
    }

    // De stapel hoort bij de regel die als volgende aan de beurt is.
    function volg(t) {
      var diepte = toestand.diepte || 0;
      if (t.instructies) {
        diepte = t.instructies.reduce(function (m, s) {
          return Math.max(m, s.stapel ? s.stapel.length : 0);
        }, 0);
        pasRijenAan(diepte);
      }
      var nu = t.soort === "stap" && !t.klaar && t.instructies ? t.instructies[t.index] : null;
      var frames = nu && nu.stapel ? nu.stapel : [];
      toestand = {
        frames: frames,
        terug: nu && nu.terug !== undefined ? nu.terug : null,
        regel: nu ? "regel " + nu.regel + ":  " + (t.regeltekst || "").trim() : "",
        leeg: frames.length ? "" : "Geen enkele functie is bezig.",
        diepte: diepte,
        afleiding: t.instructies && t.soort === "stap" ? afleiding(t.instructies, t.klaar ? t.instructies.length : t.index) : [],
        alle: t.instructies ? afleiding(t.instructies, t.instructies.length).map(zonderMarkering) : []
      };
      teken();
    }

    ctx.code(volg);
    volg({});
    return { kleur: teken };
  });
})();
