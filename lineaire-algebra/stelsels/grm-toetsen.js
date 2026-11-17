/* ---------------------------------------------------------------------------
 * grm-toetsen.js: de toetsenreeks van \begin{grmstap}{...} (grm.sty) omzetten
 * naar de toets-id's van ti84-calculator.
 *
 * Een reeks schrijf je zoals je de toetsen indrukt:
 *
 *   [y=][(-)]3X^4+8X^3+144X^2+432
 *   [window][down]15[enter][down][(-)]100[enter]
 *   [table]                           (de tweede functie van graph: 2nd graph)
 *
 *   [naam]   een toets met de naam waarmee je ze in de tekst aanroept,
 *            \grm{naam}: ook de naam van een tweede of alfafunctie, dan
 *            komt er 2nd of alpha voor
 *   cijfers, . + - * / ^ ( ) ,   de toets zelf (- is de minknop, (-) staat
 *                                 tussen haken: [(-)])
 *   X of x   de toets X,T,theta,n
 *   spaties  mogen overal, ze doen niets
 *
 * lees() geeft per toets ook of hij letterlijk getypt is; de pagina speelt
 * die sneller af dan een toets in haken (grm-demo.js).
 *
 * De namen komen uit .texmf/tex/latex/grm/grm-ti84plusce-t.def; een test
 * (bin/tests/grmtoetsen.test.js) vergelijkt de tabel hieronder met dat bestand.
 * ------------------------------------------------------------------------- */
(function (root) {
  "use strict";

  // grm-naam (zonder spaties) naar [laag, toets-id van de calculator].
  var NAMEN = {
    "y=": ["", "yeq"],
    "statplot": ["2nd", "yeq"],
    "f1": ["alpha", "yeq"],
    "window": ["", "window"],
    "tblset": ["2nd", "window"],
    "f2": ["alpha", "window"],
    "zoom": ["", "zoom"],
    "format": ["2nd", "zoom"],
    "f3": ["alpha", "zoom"],
    "trace": ["", "trace"],
    "calc": ["2nd", "trace"],
    "f4": ["alpha", "trace"],
    "graph": ["", "graph"],
    "table": ["2nd", "graph"],
    "f5": ["alpha", "graph"],
    "boven": ["", "up"],
    "onder": ["", "down"],
    "links": ["", "left"],
    "rechts": ["", "right"],
    "2nd": ["", "second"],
    "mode": ["", "mode"],
    "quit": ["2nd", "mode"],
    "del": ["", "del"],
    "ins": ["2nd", "del"],
    "alpha": ["", "alpha"],
    "A-lock": ["2nd", "alpha"],
    "xttn": ["", "xtn"],
    "link": ["2nd", "xtn"],
    "stat": ["", "stat"],
    "list": ["2nd", "stat"],
    "math": ["", "math"],
    "test": ["2nd", "math"],
    "A": ["alpha", "math"],
    "apps": ["", "apps"],
    "angle": ["2nd", "apps"],
    "B": ["alpha", "apps"],
    "prgm": ["", "prgm"],
    "draw": ["2nd", "prgm"],
    "C": ["alpha", "prgm"],
    "vars": ["", "vars"],
    "distr": ["2nd", "vars"],
    "clear": ["", "clear"],
    "inverse": ["", "inv"],
    "matrix": ["2nd", "inv"],
    "D": ["alpha", "inv"],
    "sin": ["", "sin"],
    "sin-1": ["2nd", "sin"],
    "E": ["alpha", "sin"],
    "cos": ["", "cos"],
    "cos-1": ["2nd", "cos"],
    "F": ["alpha", "cos"],
    "tan": ["", "tan"],
    "tan-1": ["2nd", "tan"],
    "G": ["alpha", "tan"],
    "macht": ["", "pow"],
    "pi": ["2nd", "pow"],
    "H": ["alpha", "pow"],
    "kwadraat": ["", "sq"],
    "wortel": ["2nd", "sq"],
    "I": ["alpha", "sq"],
    "komma": ["", "comma"],
    "EE": ["2nd", "comma"],
    "J": ["alpha", "comma"],
    "(": ["", "lp"],
    "{": ["2nd", "lp"],
    "K": ["alpha", "lp"],
    ")": ["", "rp"],
    "}": ["2nd", "rp"],
    "L": ["alpha", "rp"],
    "deel": ["", "div"],
    "e": ["2nd", "div"],
    "M": ["alpha", "div"],
    "log": ["", "log"],
    "10^x": ["2nd", "log"],
    "N": ["alpha", "log"],
    "7": ["", "n7"],
    "u": ["2nd", "n7"],
    "O": ["alpha", "n7"],
    "8": ["", "n8"],
    "v": ["2nd", "n8"],
    "P": ["alpha", "n8"],
    "9": ["", "n9"],
    "w": ["2nd", "n9"],
    "Q": ["alpha", "n9"],
    "maal": ["", "mul"],
    "[": ["2nd", "mul"],
    "R": ["alpha", "mul"],
    "ln": ["", "ln"],
    "e^x": ["2nd", "ln"],
    "S": ["alpha", "ln"],
    "4": ["", "n4"],
    "L4": ["2nd", "n4"],
    "T": ["alpha", "n4"],
    "5": ["", "n5"],
    "L5": ["2nd", "n5"],
    "U": ["alpha", "n5"],
    "6": ["", "n6"],
    "L6": ["2nd", "n6"],
    "V": ["alpha", "n6"],
    "min": ["", "sub"],
    "]": ["2nd", "sub"],
    "W": ["alpha", "sub"],
    "sto": ["", "sto"],
    "rcl": ["2nd", "sto"],
    "X": ["alpha", "sto"],
    "1": ["", "n1"],
    "L1": ["2nd", "n1"],
    "Y": ["alpha", "n1"],
    "2": ["", "n2"],
    "L2": ["2nd", "n2"],
    "Z": ["alpha", "n2"],
    "3": ["", "n3"],
    "L3": ["2nd", "n3"],
    "theta": ["alpha", "n3"],
    "plus": ["", "add"],
    "mem": ["2nd", "add"],
    "aanhalingsteken": ["alpha", "add"],
    "on": ["", "on"],
    "off": ["2nd", "on"],
    "0": ["", "n0"],
    "catalog": ["2nd", "n0"],
    "spatie": ["alpha", "n0"],
    "punt": ["", "dot"],
    "i": ["2nd", "dot"],
    "dubbelpunt": ["alpha", "dot"],
    "neg": ["", "negate"],
    "ans": ["2nd", "negate"],
    "vraagteken": ["alpha", "negate"],
    "enter": ["", "enter"],
    "entry": ["2nd", "enter"],
    "solve": ["alpha", "enter"],
    "up": ["", "up"],
    "down": ["", "down"],
    "left": ["", "left"],
    "right": ["", "right"],
    "x,t,theta,n": ["", "xtn"],
    "x^-1": ["", "inv"],
    "^": ["", "pow"],
    "x^2": ["", "sq"],
    "sqrt": ["2nd", "sq"],
    ",": ["", "comma"],
    "/": ["", "div"],
    "*": ["", "mul"],
    "-": ["", "sub"],
    "sto->": ["", "sto"],
    "+": ["", "add"],
    ".": ["", "dot"],
    "(-)": ["", "negate"]
  };

  function zoek(naam) {
    var sleutel = naam.replace(/\s+/g, "");
    if (Object.prototype.hasOwnProperty.call(NAMEN, sleutel)) return NAMEN[sleutel];
    var klein = sleutel.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMEN, klein) ? NAMEN[klein] : null;
  }

  function toetsen(laag, id, uit) {
    if (laag === "2nd") uit.push({ id: "second", letterlijk: false });
    else if (laag === "alpha") uit.push({ id: "alpha", letterlijk: false });
    uit.push({ id: id, letterlijk: false });
  }

  // De toetsen van een reeks, elk met hoe ze geschreven stonden: een toets in
  // haken is een toets die je aanwijst (en de calculator laat traag zien), een
  // letterlijk teken is getypt (en gaat sneller). Gooit een Error met de
  // plaats van de fout.
  function lees(tekst) {
    var uit = [];
    var s = String(tekst);
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (/\s/.test(c)) continue;
      if (c === "[") {
        // Een naam mag zelf een haak zijn: [[] en []].
        var open = i + 1;
        var sluit = s.charAt(open) === "]" ? open + 1 : s.indexOf("]", open);
        if (sluit < 0) throw new Error("toets niet afgesloten bij teken " + (i + 1) + " van '" + s + "'");
        var naam = s.slice(open, sluit);
        var gevonden = zoek(naam);
        if (!gevonden) throw new Error("onbekende toets [" + naam + "] in '" + s + "'");
        toetsen(gevonden[0], gevonden[1], uit);
        i = sluit;
      } else if (c === "X" || c === "x") {
        uit.push({ id: NAMEN["x,t,theta,n"][1], letterlijk: true });
      } else {
        var toets = NAMEN[c];
        if (!toets || toets[0] !== "" || /[A-Za-z]/.test(c)) {
          throw new Error("onbekend teken '" + c + "' in '" + s + "' (een toets schrijf je als [naam])");
        }
        uit.push({ id: toets[1], letterlijk: true });
      }
    }
    return uit;
  }

  // Alleen de toets-id's.
  function parse(tekst) {
    return lees(tekst).map(function (t) { return t.id; });
  }

  var api = { parse: parse, lees: lees, NAMEN: NAMEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GrmToetsen = api;
})(typeof window !== "undefined" ? window : globalThis);
