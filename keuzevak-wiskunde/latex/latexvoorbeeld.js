/* latexvoorbeeld.js: een bewerkbaar LaTeX-venster met de uitvoer ernaast.
 *
 * Een latexoefening (zie maakOefening) gebruikt hetzelfde venster.
 *
 * cursus.cls zet een latexvoorbeeld op de site als
 *   <div class="latexvoorbeeld">
 *     <pre class="latexinvoer"><code>...</code></pre>
 *     <div class="latexuitvoer">...</div>
 *   </div>
 * met als uitvoer wat lwarp van de code maakte. Dat blijft de terugval. Dit
 * script maakt van de code een invoerveld en zet de uitvoer bij elke wijziging
 * opnieuw, met een eigen lezer voor het stuk LaTeX dat een inleiding nodig
 * heeft (tekst, lijsten, tabellen, koppen, formules) en MathJax voor de
 * wiskunde. Wat de lezer niet kent, staat als melding onder de uitvoer, zoals
 * een fout bij het compileren.
 *
 * De lezer (zet) staat los van de DOM: bin/tests/latexvoorbeeld.test.js.
 */
(function (wereld) {
  "use strict";

  var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli",
    "augustus", "september", "oktober", "november", "december"];

  function html(tekst) {
    return String(tekst).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* --- Tabellen met commando's ------------------------------------------- */

  var OPMAAK = {
    textbf: ["<b>", "</b>"],
    textit: ["<i>", "</i>"],
    textsl: ["<i>", "</i>"],
    emph: ["<em>", "</em>"],
    underline: ["<u>", "</u>"],
    texttt: ['<span class="lv-tt">', "</span>"],
    textsc: ['<span class="lv-kk">', "</span>"],
    textsf: ['<span class="lv-sf">', "</span>"],
    textrm: ['<span class="lv-rm">', "</span>"],
    textup: ['<span class="lv-recht">', "</span>"],
    textmd: ['<span class="lv-normaal">', "</span>"],
    textnormal: ['<span class="lv-normaal">', "</span>"]
  };

  // Een verklaring geldt tot het einde van de groep of de omgeving.
  var VERKLARING = {
    bfseries: OPMAAK.textbf, itshape: OPMAAK.textit, slshape: OPMAAK.textit,
    em: OPMAAK.emph, ttfamily: OPMAAK.texttt, scshape: OPMAAK.textsc,
    sffamily: OPMAAK.textsf, rmfamily: OPMAAK.textrm, upshape: OPMAAK.textup,
    mdseries: OPMAAK.textmd, normalfont: OPMAAK.textnormal,
    bf: OPMAAK.textbf, it: OPMAAK.textit, tt: OPMAAK.texttt
  };

  // Lettergroottes van article bij 10pt, in verhouding tot normalsize.
  var GROOTTE = {
    tiny: 0.5, scriptsize: 0.7, footnotesize: 0.8, small: 0.9, normalsize: 1,
    large: 1.2, Large: 1.44, LARGE: 1.728, huge: 2.074, Huge: 2.488
  };

  var SYMBOOL = {
    LaTeX: '<span class="lv-logo">L<span class="lv-logo-a">a</span>T<span class="lv-logo-e">e</span>X</span>',
    TeX: '<span class="lv-logo">T<span class="lv-logo-e">e</span>X</span>',
    ldots: "…", dots: "…", textbackslash: "\\", textasciicircum: "^",
    textasciitilde: "~", textbar: "|", textless: "&lt;", textgreater: "&gt;",
    textbullet: "•", textendash: "–", textemdash: "—",
    textdegree: "°", S: "§", P: "¶", copyright: "©",
    euro: "€", i: "ı", j: "ȷ", ss: "ß", ae: "æ",
    AE: "Æ", o: "ø", O: "Ø", aa: "å", AA: "Å",
    quad: '<span class="lv-quad"></span>', qquad: '<span class="lv-qquad"></span>',
    hfill: '<span class="lv-quad"></span>', hfil: '<span class="lv-quad"></span>',
    noindent: "", indent: "", relax: "", centering: "", raggedright: "",
    raggedleft: "", selectlanguage: "", protect: ""
  };

  var ACCENT = {
    "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃",
    "=": "̄", ".": "̇", c: "̧", v: "̌", u: "̆",
    H: "̋", r: "̊"
  };

  var ENKEL_TEKEN = { "%": "%", "&": "&amp;", "$": "$", "#": "#", "_": "_",
    "{": "{", "}": "}", " ": " ", ",": " ", ";": " ", ":": " ",
    "!": "", "-": "­", "/": "", "@": "" };

  // Commando's die bij een volledig document horen. In een kort voorbeeld
  // doen ze niets, maar de lezer krijgt te horen waar ze thuishoren.
  var PREAMBULE = { documentclass: 2, usepackage: 2, graphicspath: 1,
    newcommand: 0, renewcommand: 0, setlength: 2, pagestyle: 1 };

  var WISKUNDE_OMGEVINGEN = { equation: 1, "equation*": 0, align: 1, "align*": 0,
    gather: 1, "gather*": 0, multline: 1, "multline*": 0, displaymath: 0, math: 0,
    flalign: 1, "flalign*": 0, alignat: 1, "alignat*": 0 };

  var LIJSTEN = { itemize: 1, enumerate: 1, description: 1 };
  var BLOKKEN = { center: "lv-midden", flushleft: "lv-links", flushright: "lv-rechts",
    quote: "lv-citaat", quotation: "lv-citaat", verse: "lv-citaat" };
  var BOLLETJES = ["•", "–", "∗", "·"];

  function romeins(n) {
    var r = "", waarden = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    waarden.forEach(function (w) { while (n >= w[0]) { r += w[1]; n -= w[0]; } });
    return r;
  }

  function enumLabel(diepte, n) {
    if (diepte === 0) return { label: n + ".", ref: String(n) };
    if (diepte === 1) {
      var letter = String.fromCharCode(96 + n);
      return { label: "(" + letter + ")", ref: letter };
    }
    if (diepte === 2) return { label: romeins(n) + ".", ref: romeins(n) };
    var hoofd = String.fromCharCode(64 + n);
    return { label: hoofd + ".", ref: hoofd };
  }

  // Een lengte zoals 2cm, 1.5em of 0.5\textwidth in em (bij 10pt).
  function lengte(tekst) {
    var m = /^\s*(-?\d*\.?\d+)?\s*(pt|cm|mm|in|em|ex|bp|pc|\\textwidth|\\linewidth|\\columnwidth)\s*$/.exec(tekst);
    if (!m) return null;
    var getal = m[1] === undefined ? 1 : parseFloat(m[1]);
    var pt = { pt: 1, bp: 1.00375, cm: 28.4528, mm: 2.84528, in: 72.27, pc: 12, em: 10, ex: 4.3 }[m[2]];
    if (pt) return { waarde: getal * pt / 10, eenheid: "em" };
    return { waarde: getal * 100, eenheid: "%" };
  }

  /* --- De lezer ---------------------------------------------------------- */

  function Lezer(bron) {
    this.s = bron;
    this.i = 0;
    this.einde = bron.length;
    this.meldingen = [];
    this.wiskunde = [];
    this.sectie = [0, 0, 0];
    this.deel = 0;
    this.vergelijking = 0;
    this.figuur = 0;
    this.tabelnummer = 0;
    this.voetnoten = [];
    this.labels = {};
    this.huidigLabel = "";
    this.lijsten = [];
    this.tabellen = 0;
    this.drijvers = [];
    this.titel = { title: null, author: null, date: null };
  }

  Lezer.prototype.regel = function (pos) {
    return this.s.slice(0, pos).split("\n").length;
  };

  Lezer.prototype.meld = function (pos, tekst) {
    var regel = this.regel(pos);
    var dubbel = this.meldingen.some(function (m) { return m.regel === regel && m.tekst === tekst; });
    if (!dubbel) this.meldingen.push({ regel: regel, tekst: tekst });
  };

  // Lees binnen [van, tot) met dezelfde tellers, zoals een argument.
  Lezer.prototype.binnen = function (van, tot, doe) {
    var i = this.i, einde = this.einde;
    this.i = van;
    this.einde = tot;
    var uit = doe.call(this);
    this.i = i;
    this.einde = einde;
    return uit;
  };

  Lezer.prototype.slaSpatiesOver = function () {
    while (this.i < this.einde && /[ \t]/.test(this.s[this.i])) this.i++;
    // Een enkel regeleinde na een commando telt niet; een lege regel wel.
    if (this.s[this.i] === "\n") {
      var j = this.i + 1;
      while (j < this.einde && /[ \t]/.test(this.s[j])) j++;
      if (this.s[j] !== "\n") this.i = j;
    }
  };

  // Het volgende argument: tussen accolades, of anders één teken of commando.
  Lezer.prototype.arg = function (naam) {
    var start = this.i;
    while (this.i < this.einde && /\s/.test(this.s[this.i])) this.i++;
    if (this.i >= this.einde || this.s[this.i] === "}") {
      this.meld(start, "\\" + naam + " mist een argument tussen { en }.");
      return { van: this.i, tot: this.i, tekst: "" };
    }
    if (this.s[this.i] !== "{") {
      var van = this.i;
      if (this.s[this.i] === "\\") {
        this.i++;
        if (/[A-Za-z]/.test(this.s[this.i])) while (this.i < this.einde && /[A-Za-z]/.test(this.s[this.i])) this.i++;
        else this.i++;
      } else this.i++;
      return { van: van, tot: this.i, tekst: this.s.slice(van, this.i) };
    }
    var open = this.i, diepte = 0;
    for (; this.i < this.einde; this.i++) {
      var c = this.s[this.i];
      if (c === "\\") { this.i++; continue; }
      if (c === "%") { while (this.i < this.einde && this.s[this.i] !== "\n") this.i++; continue; }
      if (c === "{") diepte++;
      else if (c === "}" && --diepte === 0) {
        this.i++;
        return { van: open + 1, tot: this.i - 1, tekst: this.s.slice(open + 1, this.i - 1) };
      }
    }
    this.meld(open, "De { van \\" + naam + " wordt niet gesloten met een }.");
    return { van: open + 1, tot: this.einde, tekst: this.s.slice(open + 1, this.einde) };
  };

  Lezer.prototype.optie = function () {
    var j = this.i;
    while (j < this.einde && /[ \t]/.test(this.s[j])) j++;
    if (this.s[j] !== "[") return null;
    var diepte = 0;
    for (var k = j + 1; k < this.einde; k++) {
      var c = this.s[k];
      if (c === "\\") { k++; continue; }
      if (c === "{") diepte++;
      else if (c === "}") diepte--;
      else if (c === "]" && diepte === 0) {
        this.i = k + 1;
        return { van: j + 1, tot: k, tekst: this.s.slice(j + 1, k) };
      }
    }
    return null;
  };

  Lezer.prototype.ster = function () {
    if (this.s[this.i] === "*") { this.i++; return true; }
    return false;
  };

  // Een argument als tekst in de regel.
  Lezer.prototype.inline = function (a) {
    return this.binnen(a.van, a.tot, function () { return regelHtml(this.reeks(null)); });
  };

  Lezer.prototype.formule = function (tex, display, pos) {
    var k = this.wiskunde.length;
    this.wiskunde.push({ tex: tex, display: display, regel: this.regel(pos) });
    return display
      ? { blok: '<div class="lv-formule lv-display" data-f="' + k + '"></div>' }
      : '<span class="lv-formule" data-f="' + k + '"></span>';
  };

  // Labels binnen een formule krijgen het nummer van haar regel.
  Lezer.prototype.formuleLabels = function (tex, nummer) {
    var lezer = this;
    return tex.replace(/\\label\s*\{([^}]*)\}/g, function (_, naam) {
      if (nummer !== null) lezer.labels[naam] = String(nummer);
      return "";
    });
  };

  // Houd commando's zoals \% intact. Een regeleinde bewaart de grens na
  // een controlenaam, zodat \alpha% commentaar niet met de volgende letter versmelt.
  function zonderFormuleCommentaar(tex) {
    return tex.replace(/\\(?:[A-Za-z]+|[\s\S])|%[^\n]*(?:\n|$)/g, function (stuk) {
      return stuk[0] === "%" ? "\n" : stuk;
    });
  }

  // Alleen \\ buiten groepen en geneste omgevingen sluit een hoofdregel.
  function formuleRegels(tex) {
    var regels = [], begin = 0, groepen = 0, omgevingen = 0;
    var tokens = /\\(?:begin|end)\s*\{[^}]*\}|\\(?:[A-Za-z]+|[\s\S])|[{}]/g;
    var m;
    while ((m = tokens.exec(tex))) {
      var token = m[0];
      if (/^\\begin\b/.test(token)) omgevingen++;
      else if (/^\\end\b/.test(token)) omgevingen--;
      else if (token === "{") groepen++;
      else if (token === "}") groepen--;
      else if (token === "\\\\" && groepen === 0 && omgevingen === 0) {
        regels.push(tex.slice(begin, m.index));
        begin = tokens.lastIndex;
      }
    }
    regels.push(tex.slice(begin));
    return regels;
  }

  Lezer.prototype.wiskundeOmgeving = function (naam, start) {
    var sluit = "\\end{" + naam + "}";
    var eind = this.i;
    while (eind < this.einde) {
      if (this.s.startsWith(sluit, eind)) break;
      if (this.s[eind] === "%") {
        while (eind < this.einde && this.s[eind] !== "\n") eind++;
      } else if (this.s[eind] === "\\") eind += 2;
      else eind++;
    }
    if (eind >= this.einde) {
      this.meld(start, "\\begin{" + naam + "} wordt niet afgesloten met " + sluit + ".");
      eind = this.einde;
    }
    var inhoud = zonderFormuleCommentaar(this.s.slice(this.i, eind));
    this.i = Math.min(this.einde, eind + sluit.length);
    if (naam === "math") return this.formule(this.formuleLabels(inhoud, null), false, start);
    if (naam === "displaymath") return this.formule(this.formuleLabels(inhoud, null), true, start);
    var basis = naam.replace("*", "");
    var genummerd = WISKUNDE_OMGEVINGEN[naam] === 1;
    var lezer = this;
    if (basis === "equation" || basis === "multline") {
      var nr = genummerd && !/\\no(number|tag)\b/.test(inhoud) ? ++this.vergelijking : null;
      var tex = this.formuleLabels(inhoud, nr).replace(/\\no(number|tag)\b/g, "");
      if (nr !== null) tex += "\\tag{" + nr + "}";
      if (basis === "multline") tex = "\\begin{multline*}" + tex + "\\end{multline*}";
      return this.formule(tex, true, start);
    }
    // align, gather, ... : een nummer per regel, zonder \nonumber.
    var regels = formuleRegels(inhoud);
    var laatste = regels.length - 1;
    if (laatste > 0 && !regels[laatste].trim()) regels.pop();
    var uit = regels.map(function (regel) {
      if (!genummerd || /\\no(number|tag)\b/.test(regel)) {
        return lezer.formuleLabels(regel, null).replace(/\\no(number|tag)\b/g, "");
      }
      var nr = ++lezer.vergelijking;
      return lezer.formuleLabels(regel, nr) + "\\tag{" + nr + "}";
    });
    var ster = basis + "*";
    var hoofd = basis === "alignat" ? "\\begin{alignat*}" : "\\begin{" + ster + "}";
    return this.formule(hoofd + uit.join("\\\\") + "\\end{" + ster + "}", true, start);
  };

  // Een formule tussen $...$, \(...\), \[...\] of $$...$$.
  Lezer.prototype.wiskundeTussen = function (sluit, display, start, naam) {
    var k = this.i;
    for (; k < this.einde; k++) {
      var c = this.s[k];
      if (this.s.startsWith(sluit, k)) break;
      if (c === "\\") { k++; continue; }
      if (c === "%") {
        while (k < this.einde && this.s[k] !== "\n") k++;
        continue;
      }
      // Een lege regel sluit een alinea: LaTeX meldt dan een ontbrekende $.
      if (c === "\n" && /^\n[ \t]*\n/.test(this.s.slice(k, k + 40))) { k = -1; break; }
    }
    if (k < 0 || k >= this.einde) {
      this.meld(start, "De formule die begint met " + naam + " wordt niet afgesloten met " + sluit + ".");
      var eind = k < 0 ? this.s.indexOf("\n", start) : this.einde;
      var tex = zonderFormuleCommentaar(this.s.slice(this.i, eind));
      this.i = eind;
      return this.formule(this.formuleLabels(tex, null), display, start);
    }
    var inhoud = zonderFormuleCommentaar(this.s.slice(this.i, k));
    this.i = k + sluit.length;
    return this.formule(this.formuleLabels(inhoud, null), display, start);
  };

  // Lees tot het einde, een } (stop "}") of \end{naam} (stop {omgeving}).
  Lezer.prototype.reeks = function (stop) {
    var items = [];
    var tekst = "";
    var lezer = this;
    function bewaar() { if (tekst) { items.push(tekst); tekst = ""; } }
    function voeg(item) { bewaar(); items.push(item); }

    while (this.i < this.einde) {
      var c = this.s[this.i];
      var pos = this.i;

      if (c === "%") {
        while (this.i < this.einde && this.s[this.i] !== "\n") this.i++;
        // Het commentaar slikt het regeleinde, en de spaties erna.
        if (this.s[this.i] === "\n") {
          this.i++;
          while (this.i < this.einde && /[ \t]/.test(this.s[this.i])) this.i++;
          if (this.s[this.i] === "\n") { this.i++; voeg({ par: true }); }
        }
        continue;
      }
      if (/\s/.test(c)) {
        var regeleinden = 0;
        while (this.i < this.einde && /\s/.test(this.s[this.i])) {
          if (this.s[this.i] === "\n") regeleinden++;
          this.i++;
        }
        if (regeleinden >= 2) voeg({ par: true });
        else tekst += " ";
        continue;
      }
      if (c === "}") {
        this.i++;
        if (stop === "}") { bewaar(); return items; }
        this.meld(pos, "Er staat een } te veel.");
        continue;
      }
      if (c === "{") {
        this.i++;
        var groep = this.reeks("}");
        bewaar();
        items = items.concat(groep);
        continue;
      }
      if (c === "$") {
        bewaar();
        if (this.s[this.i + 1] === "$") {
          this.i += 2;
          voeg(this.wiskundeTussen("$$", true, pos, "$$"));
        } else {
          this.i++;
          voeg(this.wiskundeTussen("$", false, pos, "$"));
        }
        continue;
      }
      if (c === "&") {
        this.i++;
        if (this.tabellen) voeg({ cel: true });
        else this.meld(pos, "Een & werkt enkel in een tabel of in een formule zoals align*. Schrijf \\& voor het teken zelf.");
        continue;
      }
      if (c === "^" || c === "_") {
        this.i++;
        this.meld(pos, "Een " + c + " werkt enkel in een formule: zet ze tussen $ en $. Schrijf " +
          (c === "_" ? "\\_" : "\\textasciicircum{}") + " voor het teken zelf.");
        tekst += c;
        continue;
      }
      if (c === "#") {
        this.i++;
        this.meld(pos, "Een # mag enkel in de definitie van een commando. Schrijf \\# voor het teken zelf.");
        tekst += "#";
        continue;
      }
      if (c === "~") { this.i++; tekst += " "; continue; }
      if (c === "-") {
        if (this.s.startsWith("---", this.i)) { this.i += 3; tekst += "—"; }
        else if (this.s.startsWith("--", this.i)) { this.i += 2; tekst += "–"; }
        else { this.i++; tekst += "-"; }
        continue;
      }
      if (c === "`") {
        if (this.s[this.i + 1] === "`") { this.i += 2; tekst += "“"; }
        else { this.i++; tekst += "‘"; }
        continue;
      }
      if (c === "'") {
        if (this.s[this.i + 1] === "'") { this.i += 2; tekst += "”"; }
        else { this.i++; tekst += "’"; }
        continue;
      }
      if (c !== "\\") {
        var j = this.i;
        while (j < this.einde && !/[\\{}$&%~^_#\s`'\-]/.test(this.s[j])) j++;
        tekst += html(this.s.slice(this.i, j));
        this.i = j;
        continue;
      }

      // Een commando.
      this.i++;
      var naam;
      if (/[A-Za-z]/.test(this.s[this.i] || "")) {
        var b = this.i;
        while (this.i < this.einde && /[A-Za-z]/.test(this.s[this.i])) this.i++;
        naam = this.s.slice(b, this.i);
      } else {
        naam = this.s[this.i] || "";
        this.i++;
      }

      if (naam === "end") {
        var eindArg = this.arg("end");
        if (stop && stop.omgeving !== undefined) {
          if (eindArg.tekst !== stop.omgeving) {
            this.meld(pos, "\\begin{" + stop.omgeving + "} op regel " + this.regel(stop.start) +
              " wordt afgesloten met \\end{" + eindArg.tekst + "}.");
          }
          bewaar();
          return items;
        }
        this.meld(pos, "\\end{" + eindArg.tekst + "} zonder \\begin{" + eindArg.tekst + "}.");
        continue;
      }
      if (naam === "begin") {
        var omgeving = this.arg("begin").tekst;
        bewaar();
        var resultaat = this.omgeving(omgeving, pos);
        if (resultaat) items = items.concat(resultaat);
        continue;
      }
      if (naam === "[") { bewaar(); voeg(this.wiskundeTussen("\\]", true, pos, "\\[")); continue; }
      if (naam === "(") { bewaar(); voeg(this.wiskundeTussen("\\)", false, pos, "\\(")); continue; }
      if (naam === "]" || naam === ")") {
        this.meld(pos, "\\" + naam + " sluit een formule die niet geopend is.");
        continue;
      }
      if (naam === "\\" || naam === "newline" || naam === "tabularnewline") {
        if (naam === "\\") { this.ster(); this.optie(); }
        if (this.tabellen && naam !== "newline") voeg({ rij: true });
        else tekst += "<br>";
        continue;
      }
      if (ACCENT[naam] !== undefined && (naam.length === 1 && !/[a-z]/i.test(naam) ||
          /^[A-Za-z]$/.test(naam) && /[{\s]/.test(this.s[this.i] || ""))) {
        var letter = this.arg(naam).tekst.replace(/^\\i$/, "ı").replace(/^\\j$/, "ȷ");
        tekst += html((letter + ACCENT[naam]).normalize("NFC"));
        continue;
      }
      if (ENKEL_TEKEN[naam] !== undefined && naam.length === 1) { tekst += ENKEL_TEKEN[naam]; continue; }

      if (/[A-Za-z]/.test(naam[0])) this.slaSpatiesOver();
      var stuk = this.commando(naam, pos, stop);
      if (stuk === undefined) continue;
      if (stuk && stuk.rest) {
        // Een verklaring: de rest van de groep in die opmaak.
        bewaar();
        return items.concat(stuk.rest);
      }
      if (typeof stuk === "string") tekst += stuk;
      else { bewaar(); items.push(stuk); }
    }
    bewaar();
    if (stop === "}") this.meld(this.einde, "Er ontbreekt een } om een groep te sluiten.");
    else if (stop && stop.omgeving !== undefined) {
      this.meld(stop.start, "\\begin{" + stop.omgeving + "} wordt niet afgesloten met \\end{" + stop.omgeving + "}.");
    }
    return items;
  };

  // Geeft een string (in de regel), een item, {rest} of undefined (niets).
  Lezer.prototype.commando = function (naam, pos, stop) {
    if (OPMAAK[naam]) {
      var o = OPMAAK[naam];
      return o[0] + this.inline(this.arg(naam)) + o[1];
    }
    if (VERKLARING[naam] || GROOTTE[naam] !== undefined) {
      var open, sluit;
      if (VERKLARING[naam]) { open = VERKLARING[naam][0]; sluit = VERKLARING[naam][1]; }
      else { open = '<span class="lv-grootte" style="font-size:' + GROOTTE[naam] + 'em">'; sluit = "</span>"; }
      // De rest van de groep, tot en met haar } of \end: elk stuk tekst
      // apart in de opmaak, zodat een alinea of lijst ertussen geen open
      // element doorsnijdt.
      return { rest: this.reeks(stop).map(function (item) {
        return typeof item === "string" ? open + item + sluit : item;
      }) };
    }
    if (SYMBOOL[naam] !== undefined) {
      if (naam === "centering") return { centreer: true };
      if (naam === "selectlanguage") { this.arg(naam); return undefined; }
      return SYMBOOL[naam];
    }
    switch (naam) {
      case "today":
        var nu = new Date();
        return nu.getDate() + " " + MAANDEN[nu.getMonth()] + " " + nu.getFullYear();
      case "par":
        return { par: true };
      case "item":
        var label = this.optie();
        if (!this.lijsten.length) {
          this.meld(pos, "\\item staat buiten een lijst: zet het in itemize, enumerate of description.");
          return undefined;
        }
        var lijst = this.lijsten[this.lijsten.length - 1];
        var item = { item: true, label: label ? this.inline(label) : null };
        if (lijst.soort === "enumerate" && !label) {
          lijst.n++;
          var nummer = enumLabel(lijst.diepte, lijst.n);
          item.label = nummer.label;
          this.huidigLabel = nummer.ref;
        }
        return item;
      case "section": case "subsection": case "subsubsection":
      case "chapter": case "part":
        return this.kop(naam, pos);
      case "paragraph": case "subparagraph":
        this.ster();
        this.optie();
        return { inloop: "<b>" + this.inline(this.arg(naam)) + "</b>" };
      case "label":
        var labelnaam = this.arg(naam).tekst.trim();
        this.labels[labelnaam] = this.huidigLabel || "";
        return undefined;
      case "ref": case "eqref": case "pageref":
        var doel = this.arg(naam).tekst.trim();
        return '<span class="lv-ref" data-soort="' + naam + '" data-ref="' + html(doel) +
          '" data-regel="' + this.regel(pos) + '"></span>';
      case "footnote":
        this.optie();
        var n = this.voetnoten.length + 1;
        this.voetnoten.push(this.inline(this.arg(naam)));
        return '<sup class="lv-voetnoot">' + n + "</sup>";
      case "thanks":
        this.voetnoten.push(this.inline(this.arg(naam)));
        return '<sup class="lv-voetnoot">' + this.voetnoten.length + "</sup>";
      case "title": case "author": case "date":
        this.titel[naam] = this.inline(this.arg(naam));
        return undefined;
      case "maketitle":
        if (this.titel.title === null) {
          this.meld(pos, "\\maketitle zonder \\title: geef eerst een titel.");
        }
        var datum = this.titel.date === null ? this.commando("today", pos, stop) : this.titel.date;
        return { blok: '<div class="lv-titelblok"><div class="lv-titel">' + (this.titel.title || "") +
          '</div><div class="lv-auteur">' + (this.titel.author || "") +
          '</div><div class="lv-datum">' + datum + "</div></div>" };
      case "caption":
        this.optie();
        var drijver = this.drijvers[this.drijvers.length - 1];
        var tekst = this.inline(this.arg(naam));
        if (!drijver) {
          this.meld(pos, "\\caption werkt enkel in een figure of table.");
          return undefined;
        }
        var nr = drijver === "figure" ? ++this.figuur : ++this.tabelnummer;
        this.huidigLabel = String(nr);
        return { blok: '<div class="lv-bijschrift">' + (drijver === "figure" ? "Figuur " : "Tabel ") +
          nr + ": " + tekst + "</div>" };
      case "includegraphics":
        var opties = this.optie();
        var bestand = this.arg(naam).tekst.trim();
        var breedte = opties && /width\s*=\s*([^,]+)/.exec(opties.tekst);
        var maat = breedte && lengte(breedte[1]);
        var stijl = maat ? ' style="width:' + maat.waarde.toFixed(2) + maat.eenheid + '"' : "";
        // Het venster zoekt het bestand naast de pagina (zoekAfbeeldingen).
        return '<span class="lv-afbeelding" data-bestand="' + html(bestand) + '" data-regel="' +
          this.regel(pos) + '"' + stijl + '>afbeelding ' + html(bestand) + "</span>";
      case "hspace": case "vspace":
        this.ster();
        var a = this.arg(naam);
        var l = lengte(a.tekst);
        if (!l) {
          if (!/\\fill/.test(a.tekst)) this.meld(pos, "\\" + naam + "{" + a.tekst + "}: geen geldige lengte (bijvoorbeeld 1cm of 2em).");
          return naam === "hspace" ? SYMBOOL.quad : undefined;
        }
        if (naam === "hspace") {
          return '<span class="lv-ruimte" style="width:' + l.waarde.toFixed(2) + l.eenheid + '"></span>';
        }
        return { blok: '<div class="lv-ruimte" style="height:' + l.waarde.toFixed(2) + l.eenheid + '"></div>' };
      case "smallskip": return { blok: '<div class="lv-ruimte" style="height:.3em"></div>' };
      case "medskip": return { blok: '<div class="lv-ruimte" style="height:.6em"></div>' };
      case "bigskip": return { blok: '<div class="lv-ruimte" style="height:1.2em"></div>' };
      case "newpage": case "clearpage": case "pagebreak":
        return { blok: '<div class="lv-pagina"></div>' };
      case "hline": case "cline":
        if (naam === "cline") {
          var bereik = this.arg(naam).tekst;
          var m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(bereik);
          if (!this.tabellen) break;
          return m ? { cline: [parseInt(m[1], 10), parseInt(m[2], 10)] } : undefined;
        }
        if (!this.tabellen) break;
        return { hline: true };
      case "multicolumn":
        if (!this.tabellen) break;
        var aantal = parseInt(this.arg(naam).tekst, 10) || 1;
        var spec = kolommen(this.arg(naam).tekst);
        return { multi: aantal, kolom: spec[0] || { uitlijning: "l", voor: 0, na: 0 },
          inhoud: this.inline(this.arg(naam)) };
      case "verb":
        var teken = this.s[this.i];
        var eind = this.s.indexOf(teken, this.i + 1);
        var regeleinde = this.s.indexOf("\n", this.i + 1);
        if (!teken || eind < 0 || (regeleinde >= 0 && regeleinde < eind)) {
          this.meld(pos, "\\verb wordt niet afgesloten op dezelfde regel.");
          this.i = regeleinde < 0 ? this.einde : regeleinde;
          return undefined;
        }
        var code = this.s.slice(this.i + 1, eind);
        this.i = eind + 1;
        return '<span class="lv-tt">' + html(code) + "</span>";
    }
    if (PREAMBULE[naam] !== undefined) {
      this.optie();
      var args = PREAMBULE[naam];
      if (naam === "newcommand" || naam === "renewcommand") {
        this.arg(naam);
        this.optie();
        this.arg(naam);
        this.meld(pos, "Een eigen commando maken met \\" + naam + " kan dit venster niet.");
        return undefined;
      }
      for (var k = 0; k < (args === 2 ? 1 : args); k++) this.arg(naam);
      this.meld(pos, "\\" + naam + " hoort in de preamble van een volledig document, niet in dit stuk tekst.");
      return undefined;
    }
    if (naam === "hline" || naam === "cline" || naam === "multicolumn") {
      this.meld(pos, "\\" + naam + " werkt enkel in een tabel (tabular).");
      return undefined;
    }
    this.meld(pos, "Onbekend commando \\" + naam + ": typfout, of iets wat dit venster niet kent.");
    return '<span class="lv-onbekend">\\' + html(naam) + "</span>";
  };

  Lezer.prototype.kop = function (naam, pos) {
    var ster = this.ster();
    this.optie();
    var titel = this.inline(this.arg(naam));
    if (naam === "chapter") {
      this.meld(pos, "\\" + naam + " bestaat enkel in de klassen book en report, niet in article.");
      return { blok: '<div class="lv-kop lv-kop0">' + titel + "</div>" };
    }
    if (naam === "part") {
      var deelnummer = ster ? "" : romeins(++this.deel).toUpperCase();
      if (!ster) this.huidigLabel = deelnummer;
      return { blok: '<div class="lv-kop lv-kop0">' +
        (deelnummer ? '<span class="lv-nummer">' + deelnummer + "</span>" : "") + titel + "</div>" };
    }
    var niveau = { section: 0, subsection: 1, subsubsection: 2 }[naam];
    var nummer = "";
    if (!ster) {
      this.sectie[niveau]++;
      for (var k = niveau + 1; k < 3; k++) this.sectie[k] = 0;
      nummer = this.sectie.slice(0, niveau + 1).join(".");
      this.huidigLabel = nummer;
    }
    return { blok: '<div class="lv-kop lv-kop' + (niveau + 1) + '">' +
      (nummer ? '<span class="lv-nummer">' + nummer + "</span>" : "") + titel + "</div>" };
  };

  Lezer.prototype.omgeving = function (naam, start) {
    var stop = { omgeving: naam, start: start };
    if (WISKUNDE_OMGEVINGEN[naam] !== undefined) return [this.wiskundeOmgeving(naam, start)];
    if (naam === "document") return this.reeks(stop);
    if (naam === "verbatim" || naam === "verbatim*") {
      var sluit = "\\end{" + naam + "}";
      var eind = this.s.indexOf(sluit, this.i);
      if (eind < 0) { this.meld(start, "\\begin{" + naam + "} wordt niet afgesloten."); eind = this.einde; }
      var code = this.s.slice(this.i, eind).replace(/^[ \t]*\n/, "");
      this.i = Math.min(this.einde, eind + sluit.length);
      return [{ blok: '<pre class="lv-verbatim">' + html(code) + "</pre>" }];
    }
    if (LIJSTEN[naam]) return [this.lijst(naam, stop)];
    if (BLOKKEN[naam]) {
      return [{ blok: '<div class="' + BLOKKEN[naam] + '">' + alineas(this.reeks(stop)) + "</div>" }];
    }
    if (naam === "abstract") {
      return [{ blok: '<div class="lv-abstract"><div class="lv-abstract-kop">Abstract</div>' +
        alineas(this.reeks(stop)) + "</div>" }];
    }
    if (naam === "tabular" || naam === "tabular*" || naam === "array") {
      if (naam === "tabular*") this.arg(naam);
      this.optie();
      return [this.tabel(kolommen(this.arg(naam).tekst), stop)];
    }
    if (naam === "figure" || naam === "table" || naam === "figure*" || naam === "table*") {
      this.optie();
      this.drijvers.push(naam.replace("*", ""));
      var inhoud = alineas(this.reeks(stop), true);
      this.drijvers.pop();
      return [{ blok: '<div class="lv-drijver' + (inhoud.centreer ? " lv-midden" : "") + '">' + inhoud.html + "</div>" }];
    }
    if (naam === "minipage") {
      this.optie();
      var maat = lengte(this.arg(naam).tekst);
      var stijl = maat ? ' style="width:' + maat.waarde.toFixed(2) + maat.eenheid + '"' : "";
      return ['<span class="lv-minipage"' + stijl + ">" + alineas(this.reeks(stop)) + "</span>"];
    }
    this.meld(start, "Onbekende omgeving " + naam + ": typfout, of iets wat dit venster niet kent.");
    return [{ blok: '<div class="lv-onbekend-blok">' + alineas(this.reeks(stop)) + "</div>" }];
  };

  Lezer.prototype.lijst = function (soort, stop) {
    var diepte = this.lijsten.filter(function (l) { return l.soort === soort; }).length;
    this.lijsten.push({ soort: soort, n: 0, diepte: diepte });
    var items = this.reeks(stop);
    this.lijsten.pop();
    var punten = [], huidig = null, voor = [];
    items.forEach(function (item) {
      if (item && item.item) {
        huidig = { label: item.label, items: [] };
        punten.push(huidig);
      } else if (huidig) huidig.items.push(item);
      else voor.push(item);
    });
    if (voor.some(function (item) { return typeof item !== "string" || item.trim(); })) {
      this.meld(stop.start, "In " + soort + " moet de tekst na een \\item staan.");
    }
    if (!punten.length) this.meld(stop.start, "Een lijst " + soort + " zonder \\item.");
    var bolletje = BOLLETJES[Math.min(diepte, BOLLETJES.length - 1)];
    var uit = '<div class="lv-lijst lv-' + soort + '">';
    punten.forEach(function (punt) {
      var label = punt.label !== null ? punt.label : (soort === "itemize" ? bolletje : "");
      uit += '<div class="lv-punt"><span class="lv-label">' + label + "</span>" +
        '<div class="lv-inhoud">' + alineas(punt.items) + "</div></div>";
    });
    return { blok: uit + "</div>" };
  };

  Lezer.prototype.tabel = function (spec, stop) {
    this.tabellen++;
    var items = this.reeks(stop);
    this.tabellen--;
    var rijen = [], rij = nieuweRij(), cel = "";
    function nieuweRij() { return { cellen: [], boven: 0, clines: [], inhoud: false }; }
    function sluitCel(item) {
      rij.cellen.push(item || { inhoud: cel.trim() });
      if (cel.trim() || item) rij.inhoud = true;
      cel = "";
    }
    items.forEach(function (item) {
      if (typeof item === "string") { cel += item; return; }
      if (item.cel) { sluitCel(); return; }
      if (item.rij) { sluitCel(); rijen.push(rij); rij = nieuweRij(); return; }
      if (item.hline) {
        if (rij.cellen.length || cel.trim()) return;
        rij.boven++;
        return;
      }
      if (item.cline) { rij.clines.push(item.cline); return; }
      if (item.multi) {
        cel = "";
        rij.cellen.push({ inhoud: item.inhoud, multi: item.multi, kolom: item.kolom });
        rij.inhoud = true;
        rij.multi = true;
        return;
      }
      if (item.blok) cel += item.blok;
    });
    if (cel.trim() || rij.cellen.length) sluitCel();
    // Een laatste lege rij met \hline is de lijn onder de vorige rij.
    if (!rij.inhoud && !rij.cellen.length) {
      if (rijen.length) {
        rijen[rijen.length - 1].onder = rij.boven;
        rijen[rijen.length - 1].onderClines = rij.clines;
      }
    } else rijen.push(rij);
    // Een multicolumn sluit de cel erna al: de lege cel door & valt weg.
    rijen.forEach(function (r) {
      r.cellen = r.cellen.filter(function (c, k) {
        return !(k > 0 && r.cellen[k - 1].multi && c.inhoud === "" && !c.multi);
      });
    });
    var lezer = this;
    var uit = '<table class="lv-tabel"><tbody>';
    rijen.forEach(function (r, ri) {
      var volgende = rijen[ri + 1];
      uit += "<tr>";
      var kolom = 0;
      var aantal = r.cellen.reduce(function (s, c) { return s + (c.multi || 1); }, 0);
      if (aantal > spec.length) {
        lezer.meld(stop.start, "Een rij heeft meer cellen dan de tabel kolommen heeft (" + spec.length + ").");
      }
      r.cellen.forEach(function (c) {
        var breedte = c.multi || 1;
        var k = spec[Math.min(kolom, spec.length - 1)] || { uitlijning: "l", voor: 0, na: 0 };
        var opmaak = c.kolom || k;
        var laatste = spec[Math.min(kolom + breedte - 1, spec.length - 1)] || k;
        var klassen = ["lv-" + opmaak.uitlijning];
        var links = c.kolom ? opmaak.voor : (kolom === 0 ? k.voor : 0);
        var rechts = c.kolom ? opmaak.na : laatste.na;
        if (links) klassen.push("lv-l" + Math.min(links, 2));
        if (rechts) klassen.push("lv-r" + Math.min(rechts, 2));
        if (r.boven || inCline(r.clines, kolom)) klassen.push("lv-b" + Math.min(r.boven || 1, 2));
        var onder = r.onder || (volgende ? 0 : 0);
        if (onder || inCline(r.onderClines, kolom)) klassen.push("lv-o" + Math.min(onder || 1, 2));
        var stijl = opmaak.breedte ? ' style="width:' + opmaak.breedte + '"' : "";
        uit += '<td class="' + klassen.join(" ") + '"' + (breedte > 1 ? ' colspan="' + breedte + '"' : "") +
          stijl + ">" + c.inhoud + "</td>";
        kolom += breedte;
      });
      uit += "</tr>";
    });
    return { blok: '<div class="lv-tabelblok">' + uit + "</tbody></table></div>", tabel: true };
  };

  function inCline(lijst, kolom) {
    return (lijst || []).some(function (c) { return kolom + 1 >= c[0] && kolom + 1 <= c[1]; });
  }

  // De kolommen van een tabular: l, c, r, p{...} met | ertussen.
  function kolommen(spec) {
    var uit = [], strepen = 0, i = 0;
    // *{3}{c|} uitschrijven.
    spec = spec.replace(/\*\{(\d+)\}\{([^}]*)\}/g, function (_, n, deel) {
      return new Array(parseInt(n, 10) + 1).join(deel);
    });
    while (i < spec.length) {
      var c = spec[i];
      if (c === "|") { strepen++; i++; continue; }
      if (c === "@" || c === ">" || c === "<") {
        var eind = spec.indexOf("}", i);
        i = eind < 0 ? spec.length : eind + 1;
        continue;
      }
      if (/[lcr]/.test(c)) {
        uit.push({ uitlijning: c, voor: strepen, na: 0 });
        strepen = 0;
        i++;
        continue;
      }
      if (/[pmb]/.test(c) && spec[i + 1] === "{") {
        var sluit = spec.indexOf("}", i);
        var maat = lengte(spec.slice(i + 2, sluit));
        uit.push({ uitlijning: "p", voor: strepen, na: 0,
          breedte: maat ? maat.waarde.toFixed(2) + maat.eenheid : null });
        strepen = 0;
        i = sluit < 0 ? spec.length : sluit + 1;
        continue;
      }
      i++;
    }
    // Een | rechts van een kolom staat ook links van de volgende.
    for (var k = 0; k + 1 < uit.length; k++) uit[k].na = uit[k + 1].voor;
    if (uit.length) uit[uit.length - 1].na = strepen;
    return uit;
  }

  // Zet een reeks items om in alinea's (<p>) en blokken.
  function alineas(items, metCentreer) {
    var uit = "", p = null, centreer = false;
    function sluit() {
      if (p !== null) {
        var t = p.replace(/^[ \n\t]+|[ \n\t]+$/g, "");
        if (t) uit += "<p>" + t + "</p>";
        p = null;
      }
    }
    items.forEach(function (item) {
      if (typeof item === "string") {
        if (p === null) {
          if (!item.replace(/[ \n\t]/g, "")) return;
          p = "";
        }
        p += item;
      } else if (item.par) sluit();
      else if (item.inloop) {
        sluit();
        p = item.inloop + " ";
      } else if (item.blok) {
        // Een tabel staat in de regel, zoals in LaTeX.
        if (item.tabel && p !== null) { p += item.blok; return; }
        sluit();
        uit += item.blok;
      } else if (item.centreer) centreer = true;
    });
    sluit();
    if (metCentreer) return { html: uit, centreer: centreer };
    return centreer ? '<div class="lv-midden">' + uit + "</div>" : uit;
  }

  function regelHtml(items) {
    return items.map(function (item) {
      if (typeof item === "string") return item;
      if (item.blok) return item.blok;
      if (item.inloop) return item.inloop + " ";
      return item.par ? " " : "";
    }).join("");
  }

  // De hele code: geeft html, de formules en de meldingen.
  function zet(bron) {
    var lezer = new Lezer(bron);
    var begin = bron.indexOf("\\begin{document}");
    if (begin >= 0) {
      // Een volledig document: lees de titelgegevens uit de preamble, toon de rest.
      ["title", "author", "date"].forEach(function (naam) {
        var m = new RegExp("\\\\" + naam + "\\s*\\{").exec(bron.slice(0, begin));
        if (m) {
          lezer.i = m.index + m[0].length - 1;
          lezer.einde = begin;
          lezer.titel[naam] = lezer.inline(lezer.arg(naam));
        }
      });
      var eind = bron.indexOf("\\end{document}", begin);
      lezer.i = begin + "\\begin{document}".length;
      lezer.einde = eind < 0 ? bron.length : eind;
      if (eind < 0) lezer.meld(begin, "\\begin{document} wordt niet afgesloten met \\end{document}.");
    } else if (/\\documentclass\b/.test(bron)) {
      lezer.meld(bron.indexOf("\\documentclass"), "Een document met \\documentclass heeft ook \\begin{document} en \\end{document} nodig.");
    }
    var items = lezer.reeks(null);
    var uit = alineas(items);
    if (lezer.voetnoten.length) {
      uit += '<div class="lv-voetnoten">' + lezer.voetnoten.map(function (v, k) {
        return '<div><sup>' + (k + 1) + "</sup> " + v + "</div>";
      }).join("") + "</div>";
    }
    // Verwijzingen pas nu: een \label mag ook na de \ref staan.
    uit = uit.replace(/<span class="lv-ref" data-soort="(\w+)" data-ref="([^"]*)" data-regel="(\d+)"><\/span>/g,
      function (_, soort, naam, regel) {
        var echt = naam.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        if (soort === "pageref") return "1";
        if (!Object.prototype.hasOwnProperty.call(lezer.labels, echt)) {
          var dubbel = lezer.meldingen.some(function (m) { return m.tekst.indexOf("{" + echt + "}") >= 0; });
          if (!dubbel) lezer.meldingen.push({ regel: parseInt(regel, 10),
            tekst: "Er is geen \\label{" + echt + "}: LaTeX toont dan ??." });
          return "<b>??</b>";
        }
        var waarde = lezer.labels[echt];
        return soort === "eqref" ? "(" + waarde + ")" : waarde;
      });
    lezer.meldingen.sort(function (a, b) { return a.regel - b.regel; });
    return { html: uit, wiskunde: lezer.wiskunde, meldingen: lezer.meldingen };
  }

  // Kleuren in de editor, zoals kleur_latex in bin/mkpi_lib/sitebuild.py.
  function kleur(code) {
    return code.split(/(\\(?:[A-Za-z@]+\*?|.)|(?:^|(?<!\\))%[^\n]*)/).map(function (deel) {
      if (!deel) return "";
      if (deel[0] === "%") return '<span class="tex-commentaar">' + html(deel) + "</span>";
      if (deel[0] === "\\" && deel.length > 1) return '<span class="tex-commando">' + html(deel) + "</span>";
      return html(deel);
    }).join("");
  }

  /* --- Inspringen in de editor ------------------------------------------- */

  var INSPRONG = "  ";

  function regelBegin(tekst, pos) { return tekst.lastIndexOf("\n", pos - 1) + 1; }

  function regelEinde(tekst, pos) {
    var eind = tekst.indexOf("\n", pos);
    return eind < 0 ? tekst.length : eind;
  }

  // Het verschil tussen \begin en \end in een stuk tekst.
  function omgevingDiepte(stuk) {
    return (stuk.match(/\\begin\s*\{/g) || []).length - (stuk.match(/\\end\s*\{/g) || []).length;
  }

  // Wat Enter invoegt: een regeleinde met de inspringing van de regel, een
  // stap verder na een \begin{...} die op die regel niet sluit. Staat de
  // cursor vlak voor de \end{...} van die \begin, dan komt de \end op een
  // eigen regel en de cursor ertussen. Geeft {tekst, cursor}, met cursor de
  // plaats in tekst.
  function enter(tekst, van, tot) {
    var begin = regelBegin(tekst, van);
    var voor = tekst.slice(begin, van);
    var na = tekst.slice(tot, regelEinde(tekst, tot));
    var basis = /^[ \t]*/.exec(voor)[0];
    if (omgevingDiepte(voor) > 0) {
      var binnen = "\n" + basis + INSPRONG;
      if (/^\s*\\end\s*\{/.test(na)) {
        return { tekst: binnen + "\n" + basis, cursor: binnen.length, naSpaties: /^\s*/.exec(na)[0].length };
      }
      return { tekst: binnen, cursor: binnen.length, naSpaties: /^[ \t]*/.exec(na)[0].length };
    }
    return { tekst: "\n" + basis, cursor: basis.length + 1, naSpaties: /^[ \t]*/.exec(na)[0].length };
  }

  // De inspringing van de \begin die een \end op positie pos sluit.
  function inspringingVanBegin(tekst, pos) {
    var diepte = 0;
    var re = /\\(begin|end)\s*\{/g, gevonden = [], m;
    while ((m = re.exec(tekst)) && m.index < pos) gevonden.push(m);
    for (var k = gevonden.length - 1; k >= 0; k--) {
      if (gevonden[k][1] === "end") diepte++;
      else if (diepte === 0) {
        var b = regelBegin(tekst, gevonden[k].index);
        return /^[ \t]*/.exec(tekst.slice(b))[0];
      } else diepte--;
    }
    return "";
  }

  var LatexVoorbeeld = { zet: zet, kleur: kleur, kolommen: kolommen, enter: enter,
    inspringingVanBegin: inspringingVanBegin };
  if (typeof module !== "undefined" && module.exports) module.exports = LatexVoorbeeld;
  wereld.LatexVoorbeeld = LatexVoorbeeld;
  if (typeof document === "undefined") return;

  /* --- Het venster -------------------------------------------------------- */

  // MathJax zet één formule tegelijk: een snelle reeks toetsaanslagen mag
  // geen formule uit een oudere versie van de code laten staan.
  var wachtrij = Promise.resolve();

  function zetFormules(doel, formules, meldingen) {
    var mj = window.MathJax;
    formules.forEach(function (f, k) {
      var plek = doel.querySelector('[data-f="' + k + '"]');
      if (!plek) return;
      if (!mj || !mj.tex2svgPromise) {
        plek.textContent = f.display ? "\\[" + f.tex + "\\]" : "$" + f.tex + "$";
        return;
      }
      wachtrij = wachtrij.then(function () {
        return mj.tex2svgPromise(f.tex, { display: f.display });
      }).then(function (knoop) {
        plek.appendChild(knoop);
        var fout = knoop.querySelector("[data-mjx-error]");
        if (fout) meldingen.push({ regel: f.regel, tekst: "Fout in een formule: " + fout.getAttribute("data-mjx-error") });
        // noundefined tekent een onbekend commando rood, zonder fout.
        var rood = knoop.querySelector('[data-mml-node="mtext"][fill="red"], [data-mml-node="mtext"][color="red"]');
        if (!fout && rood) {
          // In SVG is tekst een reeks glyphs; data-c is hun tekencode.
          var tekst = Array.prototype.map.call(rood.querySelectorAll("[data-c]"), function (g) {
            return String.fromCodePoint(parseInt(g.getAttribute("data-c"), 16));
          }).join("");
          meldingen.push({ regel: f.regel, tekst: "Onbekend commando in een formule" + (tekst ? ": " + tekst : "") + "." });
        }
      }, function (fout) {
        plek.textContent = f.tex;
        meldingen.push({ regel: f.regel, tekst: "Fout in een formule: " + (fout && fout.message || fout) });
      });
    });
    return wachtrij;
  }

  // Een \includegraphics wijst een bestand naast de pagina aan, zonder of met
  // extensie, zoals LaTeX het zoekt. Wat gevonden is, wordt onthouden, zodat
  // de afbeelding bij elke toetsaanslag niet opnieuw geladen wordt.
  var AFBEELDING_EXTENSIES = ["", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp"];
  var gevondenAfbeeldingen = {};

  function zoekAfbeelding(bestand) {
    if (!gevondenAfbeeldingen[bestand]) {
      var pogingen = /\.[A-Za-z0-9]+$/.test(bestand) ? [""] : AFBEELDING_EXTENSIES.slice(1);
      gevondenAfbeeldingen[bestand] = pogingen.reduce(function (vorige, extensie) {
        return vorige.then(function (url) {
          if (url) return url;
          return new Promise(function (klaar) {
            var img = new Image();
            img.onload = function () { klaar(bestand + extensie); };
            img.onerror = function () { klaar(null); };
            img.src = encodeURI(bestand + extensie);
          });
        });
      }, Promise.resolve(null));
    }
    return gevondenAfbeeldingen[bestand];
  }

  function zoekAfbeeldingen(doel, meldingen) {
    return Promise.all(Array.prototype.map.call(doel.querySelectorAll(".lv-afbeelding[data-bestand]"), function (plek) {
      var bestand = plek.getAttribute("data-bestand");
      return zoekAfbeelding(bestand).then(function (url) {
        if (!url) {
          meldingen.push({ regel: parseInt(plek.getAttribute("data-regel"), 10),
            tekst: "Er is geen afbeelding " + bestand + " (met .png, .jpg of een andere extensie)." });
          return;
        }
        var img = document.createElement("img");
        img.className = "lv-beeld";
        img.src = encodeURI(url);
        img.alt = bestand;
        if (plek.style.width) img.style.width = plek.style.width;
        plek.replaceWith(img);
      });
    }));
  }

  function element(soort, klasse, tekst) {
    var e = document.createElement(soort);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }

  // Het venster zelf: links de code, rechts de uitvoer, in raster. Opties:
  //   blok      het element dat lv-actief en lv-fout krijgt
  //   begin     de code waarmee het venster opent
  //   uitvoer   een bestaande div.latexuitvoer (de terugval van lwarp) of niets
  //   label     het opschrift boven de code
  //   keuzes    [{opschrift, code}]: knoppen zoals bij een Python-oefening
  //             (Blanco, Skeleton, Modeloplossing); {opschrift, eigen: true}
  //             is de knop voor de eigen code; zonder keuzes een knop
  //             Beginstand die verschijnt zodra de code gewijzigd is
  //   sleutel   bewaar de code onder die sleutel in de browser
  function bouwVenster(raster, opties) {
    var blok = opties.blok;
    var origineel = opties.begin;
    var codeKant = element("div", "lv-kant lv-codekant");
    var balk = element("div", "lv-balk");
    var veld = element("textarea", "lv-invoer");
    var veldId = "lv-invoer-" + (++bouwVenster.teller);
    veld.id = veldId;
    var label = element("label", "lv-label-code", opties.label);
    label.htmlFor = veldId;
    balk.appendChild(label);
    var herstel = null, keuzeKnoppen = [], eigenKnop = null, eigen = "";
    if (opties.keuzes) {
      var groep = element("div", "lv-keuzes");
      groep.setAttribute("role", "group");
      groep.setAttribute("aria-label", "Code kiezen");
      opties.keuzes.forEach(function (keuze) {
        var knop = element("button", "lv-keuze", keuze.opschrift);
        knop.type = "button";
        if (keuze.eigen) {
          // De eigen code van de leerling: verschijnt zodra die iets typt,
          // zodat hij na een blik op de modeloplossing terug kan.
          eigenKnop = knop;
          knop.hidden = true;
          knop.addEventListener("click", function () {
            zetCode(eigen);
            veld.focus();
          });
        } else {
          knop.dataset.code = keuze.code;
          knop.addEventListener("click", function () {
            zetCode(keuze.code);
            veld.focus();
          });
          keuzeKnoppen.push(knop);
        }
        groep.appendChild(knop);
      });
      balk.appendChild(groep);
    } else {
      herstel = element("button", "lv-herstel", "Beginstand");
      herstel.type = "button";
      herstel.hidden = true;
      herstel.addEventListener("click", function () {
        zetCode(origineel);
        veld.focus();
      });
      balk.appendChild(herstel);
    }
    var editor = element("div", "lv-editor");
    var kleurVlak = element("pre", "lv-kleur");
    kleurVlak.setAttribute("aria-hidden", "true");
    var kleurCode = element("code");
    kleurVlak.appendChild(kleurCode);
    veld.spellcheck = false;
    ["autocapitalize", "autocomplete", "autocorrect"].forEach(function (naam) { veld.setAttribute(naam, "off"); });
    veld.setAttribute("wrap", "off");
    veld.setAttribute("aria-description", "De uitvoer volgt terwijl je typt. Tab springt in, Shift+Tab springt uit. " +
      "Druk Escape en daarna Tab om het veld te verlaten.");
    editor.append(kleurVlak, veld);
    codeKant.append(balk, editor);

    var uitKant = element("div", "lv-kant lv-uitkant");
    uitKant.appendChild(element("div", "lv-balk")).appendChild(element("span", null, "Uitvoer"));
    var uitvoer = opties.uitvoer || element("div", "latexuitvoer");
    var meldingen = element("ul", "lv-meldingen");
    meldingen.hidden = true;
    meldingen.setAttribute("aria-live", "polite");
    uitKant.append(uitvoer, meldingen);
    raster.append(codeKant, uitKant);

    veld.value = origineel;
    if (opties.sleutel) {
      try {
        var bewaard = JSON.parse(localStorage.getItem(opties.sleutel));
        if (bewaard && typeof bewaard.code === "string") veld.value = bewaard.code;
        if (bewaard && typeof bewaard.eigen === "string") eigen = bewaard.eigen;
        else if (!isVast(veld.value)) eigen = veld.value;
      } catch (fout) { /* Bewaren is optioneel. */ }
    }

    var versie = 0, timer = null;

    // Is dit de code van een van de vaste keuzes (Blanco, Skeleton, Modeloplossing)?
    function isVast(tekst) {
      return keuzeKnoppen.some(function (knop) { return knop.dataset.code === tekst; });
    }

    function pasAan() {
      // Een regeleinde achteraan krijgt in een pre geen hoogte zonder extra regel.
      kleurCode.innerHTML = kleur(veld.value) + "\n";
      veld.style.height = "auto";
      // Plus de horizontale schuifbalk, anders bedekt die de laatste regel.
      veld.style.height = veld.scrollHeight + (veld.offsetHeight - veld.clientHeight) + "px";
      kleurVlak.scrollLeft = veld.scrollLeft;
      if (herstel) herstel.hidden = veld.value === origineel;
      keuzeKnoppen.forEach(function (knop) {
        knop.setAttribute("aria-pressed", String(veld.value === knop.dataset.code));
      });
      if (eigenKnop) {
        eigenKnop.hidden = !eigen || isVast(eigen);
        eigenKnop.setAttribute("aria-pressed", String(!eigenKnop.hidden && veld.value === eigen));
      }
    }

    function bewaar() {
      if (!opties.sleutel) return;
      try { localStorage.setItem(opties.sleutel, JSON.stringify({ code: veld.value, eigen: eigen })); }
      catch (fout) { /* Bewaren is optioneel. */ }
    }

    function zetUitvoer() {
      var mijn = ++versie;
      var resultaat;
      try {
        resultaat = zet(veld.value);
      } catch (fout) {
        console.error(fout);
        return;
      }
      var doel = document.createElement("div");
      doel.innerHTML = resultaat.html;
      var lijst = resultaat.meldingen.slice();
      Promise.all([zetFormules(doel, resultaat.wiskunde, lijst), zoekAfbeeldingen(doel, lijst)]).then(function () {
        if (mijn !== versie) return;
        uitvoer.classList.add("lv-live", "mathjax_ignore");
        uitvoer.replaceChildren.apply(uitvoer, Array.prototype.slice.call(doel.childNodes));
        lijst.sort(function (a, b) { return a.regel - b.regel; });
        meldingen.replaceChildren.apply(meldingen, lijst.map(function (m) {
          var li = document.createElement("li");
          li.textContent = "Regel " + m.regel + ": " + m.tekst;
          return li;
        }));
        meldingen.hidden = !lijst.length;
        blok.classList.toggle("lv-fout", lijst.length > 0);
      });
    }

    function zetCode(tekst) {
      veld.value = tekst;
      pasAan();
      bewaar();
      zetUitvoer();
    }

    veld.addEventListener("input", function () {
      if (eigenKnop) eigen = veld.value;
      pasAan();
      bewaar();
      clearTimeout(timer);
      timer = setTimeout(zetUitvoer, 120);
    });
    veld.addEventListener("scroll", function () { kleurVlak.scrollLeft = veld.scrollLeft; });

    // Vervang [van, tot) door tekst. insertText houdt Ctrl+Z bruikbaar;
    // waar de browser het niet kent, doet setRangeText het zonder.
    function voegIn(tekst, van, tot, cursor) {
      veld.setSelectionRange(van, tot);
      var gelukt = false;
      try { gelukt = document.execCommand("insertText", false, tekst); } catch (fout) { gelukt = false; }
      if (!gelukt) {
        veld.setRangeText(tekst, van, tot, "end");
        veld.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (cursor !== undefined) veld.setSelectionRange(cursor, cursor);
    }

    // Tab springt in, zoals in een editor. Na Escape gaat Tab naar het
    // volgende element, zodat wie met het toetsenbord werkt niet vastzit.
    var tabVerlaat = false;
    veld.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { tabVerlaat = true; return; }
      var wasVerlaat = tabVerlaat;
      tabVerlaat = false;
      if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
      var tekst = veld.value, van = veld.selectionStart, tot = veld.selectionEnd;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        var r = enter(tekst, van, tot);
        // Spaties na de cursor schuiven niet mee naar de nieuwe regel.
        voegIn(r.tekst, van, tot + r.naSpaties, van + r.cursor);
        return;
      }
      if (e.key !== "Tab" || wasVerlaat) return;
      e.preventDefault();
      var begin = regelBegin(tekst, van);
      var eind = regelEinde(tekst, tot > van && tekst[tot - 1] === "\n" ? tot - 1 : tot);
      var regels = tekst.slice(begin, eind).split("\n");
      if (!e.shiftKey && van === tot) {
        voegIn(INSPRONG, van, tot);
        return;
      }
      var nieuw = regels.map(function (regel) {
        if (!e.shiftKey) return INSPRONG + regel;
        return regel.replace(new RegExp("^ {1," + INSPRONG.length + "}|^\t"), "");
      });
      var verschilEerste = nieuw[0].length - regels[0].length;
      var totaal = nieuw.join("\n").length - (eind - begin);
      voegIn(nieuw.join("\n"), begin, eind);
      veld.setSelectionRange(Math.max(begin, van + verschilEerste), tot + totaal);
    });

    // Wie \end{ typt op een eigen regel, springt terug tot zijn \begin.
    veld.addEventListener("input", function (e) {
      if (e.data !== "{") return;
      var tekst = veld.value, pos = veld.selectionStart;
      var begin = regelBegin(tekst, pos);
      var m = /^([ \t]*)\\end\{$/.exec(tekst.slice(begin, pos));
      if (!m) return;
      var doel = inspringingVanBegin(tekst, begin);
      if (doel === m[1]) return;
      voegIn(doel, begin, begin + m[1].length, pos - m[1].length + doel.length);
    });
    blok.addEventListener("pres:herstel", function () {
      if (veld.value !== origineel) zetCode(origineel);
    });
    // De hoogte van het veld hangt af van de breedte (schuifbalk): meet
    // opnieuw wanneer het venster in beeld komt of van maat verandert.
    if (window.ResizeObserver) new ResizeObserver(pasAan).observe(codeKant);
    pasAan();
    blok.classList.add("lv-actief");
    zetUitvoer();
  }
  bouwVenster.teller = 0;

  function codeVan(pre) {
    return pre ? pre.textContent.replace(/\n$/, "") : "";
  }

  // Een latexvoorbeeld: het venster komt op de plaats van de code, en de
  // uitvoer van lwarp wordt de live uitvoer.
  function maakVoorbeeld(blok) {
    var raster = blok.querySelector(".lv-raster");
    var pre = blok.querySelector("pre.latexinvoer");
    var uitvoer = blok.querySelector(".latexuitvoer");
    if (!raster || !pre || !uitvoer || blok.dataset.lvKlaar) return;
    blok.dataset.lvKlaar = "1";
    pre.remove();
    uitvoer.remove();
    bouwVenster(raster, { blok: blok, begin: codeVan(pre), uitvoer: uitvoer, label: "Code" });
  }

  // Een latexoefening werkt zoals een Python-oefening: het venster begint
  // met de startcode (of leeg), Blanco, Skeleton en Modeloplossing kiezen de
  // code, en wat de leerling typt, blijft in de browser bewaard. Zodra hij
  // typt, verschijnt Oplossing: zijn eigen code, om naar terug te keren.
  // Bij data-soort="verbeter" zijn dat Opgave, Mijn verbetering en Verbetering.
  function maakOefening(blok) {
    if (blok.dataset.lvKlaar) return;
    blok.dataset.lvKlaar = "1";
    var start = blok.querySelector(".latexoefening-start");
    var startPre = start && start.querySelector("pre.latexinvoer");
    var modelPre = blok.querySelector(".latexoefening-model pre.latexinvoer");
    var begin = codeVan(startPre);
    var verbeter = blok.dataset.soort === "verbeter";
    var keuzes = verbeter ? [{ opschrift: "Opgave", code: begin }] : [{ opschrift: "Blanco", code: "" }];
    if (begin && !verbeter) keuzes.push({ opschrift: "Skeleton", code: begin });
    keuzes.push({ opschrift: verbeter ? "Mijn verbetering" : "Oplossing", eigen: true });
    if (modelPre) keuzes.push({ opschrift: verbeter ? "Verbetering" : "Modeloplossing", code: codeVan(modelPre) });
    var raster = element("div", "lv-raster");
    var plaats = start || blok.querySelector(".latexoefening-model");
    if (plaats) plaats.parentNode.insertBefore(raster, plaats);
    else blok.appendChild(raster);
    if (start) start.remove();
    bouwVenster(raster, { blok: blok, begin: begin, label: "LaTeX-code:", keuzes: keuzes,
      sleutel: "mathesis:latex:" + location.pathname + ":" + blok.dataset.latex });
  }

  // Een volledig document (een latexcode met \documentclass en
  // \begin{document}) krijgt een knop Open in Overleaf. Overleaf maakt van
  // een formulier naar /docs met encoded_snip een nieuw project met die code;
  // daar is geen server voor nodig. Staat er op de slide maar één document,
  // dan komt de knop rechts van de titel, anders boven elk document.
  var OVERLEAF = "https://www.overleaf.com/docs";
  var ICOON_EXTERN = "M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5";

  function overleafKnop(code, naam) {
    var formulier = element("form", "lv-overleaf");
    formulier.method = "post";
    formulier.action = OVERLEAF;
    formulier.target = "_blank";
    [["encoded_snip", encodeURIComponent(code)], ["snip_name", naam]].forEach(function (veld) {
      var invoer = element("input");
      invoer.type = "hidden";
      invoer.name = veld[0];
      invoer.value = veld[1];
      formulier.appendChild(invoer);
    });
    var knop = element("button", "pres-knop");
    knop.type = "submit";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var pad = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pad.setAttribute("d", ICOON_EXTERN);
    svg.appendChild(pad);
    knop.append(svg, document.createTextNode("Open in Overleaf"));
    formulier.appendChild(knop);
    return formulier;
  }

  function maakOverleafKnoppen() {
    var documenten = Array.prototype.filter.call(document.querySelectorAll("pre.latexcode"), function (pre) {
      return /\\documentclass\b/.test(pre.textContent) && /\\begin\{document\}/.test(pre.textContent);
    });
    var perSlide = new Map();
    documenten.forEach(function (pre) {
      var slide = pre.closest(".slide") || document.body;
      if (!perSlide.has(slide)) perSlide.set(slide, []);
      perSlide.get(slide).push(pre);
    });
    perSlide.forEach(function (lijst, slide) {
      var titel = slide.querySelector(":scope > :is(h1, h2, h3, h4, h5, h6)");
      var naam = titel ? titel.textContent.replace(/^[\sIVXLC0-9.]+(?=\s)/, "").trim() : document.title;
      if (lijst.length === 1 && titel) {
        var knop = overleafKnop(lijst[0].textContent, naam);
        knop.classList.add("lv-overleaf-titel");
        titel.parentNode.insertBefore(knop, titel);
        return;
      }
      lijst.forEach(function (pre, i) {
        var knop = overleafKnop(pre.textContent, naam + (lijst.length > 1 ? " " + (i + 1) : ""));
        pre.parentNode.insertBefore(knop, pre);
      });
    });
  }

  // MathJax kan later laden dan dit script: wacht tot het er is, of tot de
  // pagina zonder MathJax geladen is.
  function wachtOpMathJax() {
    return new Promise(function (klaar) {
      (function probeer() {
        var mj = window.MathJax;
        if (mj && mj.startup && mj.startup.promise) mj.startup.promise.then(klaar, klaar);
        else if (document.readyState === "complete") klaar();
        else setTimeout(probeer, 50);
      })();
    });
  }

  function start() {
    try { maakOverleafKnoppen(); } catch (fout) { console.error(fout); }
    var blokken = document.querySelectorAll(".latexvoorbeeld, .latexoefening");
    if (!blokken.length) return;
    wachtOpMathJax().then(function () {
      Array.prototype.forEach.call(blokken, function (blok) {
        try {
          if (blok.classList.contains("latexoefening")) maakOefening(blok);
          else maakVoorbeeld(blok);
        } catch (fout) { console.error(fout); }
      });
    });
  }

  start();
})(typeof window !== "undefined" ? window : globalThis);
