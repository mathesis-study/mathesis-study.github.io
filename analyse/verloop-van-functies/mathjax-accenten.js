/* Letters met een accent in tekst binnen formules, voor MathJax.
 *
 * De lettertypes van MathJax hebben geen é, ë, ï, ç, ... Staat zo'n letter in
 * \text{...}, dan tekent MathJax ze als SVG-tekst in het lettertype serif van de
 * browser, en dat valt naast de rest van de formule op. De accenten van
 * textmacros (\'e, \"e, \c c, ...) bouwen de letter wel uit glyphs van MathJax
 * zelf. Dit bestand zet daarom, vlak voor de TeX-invoer wordt gelezen, elke
 * letter met een accent binnen \text, \textrm, \textit, \textbf, \textsf,
 * \texttt, \textnormal en \mbox om in die schrijfwijze. De bron blijft gewoon
 * é schrijven, op papier en op de website.
 *
 * Buiten die commando's blijft de invoer ongemoeid: in wiskundemodus zou \'e
 * een fout geven.
 *
 * De pagina laadt dit script na het instellingenblok van lwarp en voor
 * tex-svg-full.js: het wikkelt startup.ready in en hangt zijn filter na de
 * standaardinitialisatie aan de TeX-invoer.
 */
(function () {
  "use strict";

  var config = (window.MathJax = window.MathJax || {});
  config.startup = config.startup || {};
  var vorigeReady = config.startup.ready;

  var TEKSTCOMMANDOS = /\\(?:text|textrm|textit|textbf|textsf|texttt|textnormal|mbox)\s*\{/g;
  // Combinerende teken na NFD-ontbinding naar het accentcommando van textmacros.
  var ACCENTEN = {
    "̀": "\\`", "́": "\\'", "̂": "\\^", "̃": "\\~",
    "̈": '\\"', "̧": "\\c ", "̌": "\\v "
  };
  var ACCENTLETTER = /[A-Za-z][̧̀́̂̃̈̌]/g;

  function accentueer(tekst) {
    return tekst.normalize("NFD").replace(ACCENTLETTER, function (paar) {
      var letter = paar.charAt(0) === "i" ? "\\i " : paar.charAt(0);
      return ACCENTEN[paar.charAt(1)] + "{" + letter.replace(/ $/, "") + "}";
    }).normalize("NFC");
  }

  // Vervangt enkel binnen de accolades van een tekstcommando, ook als die
  // genest zijn (\text{a {b} c}).
  function omzetten(invoer) {
    if (!/[^\u0000-\u007F]/.test(invoer)) return invoer;
    var uit = "";
    var vanaf = 0;
    var m;
    TEKSTCOMMANDOS.lastIndex = 0;
    while ((m = TEKSTCOMMANDOS.exec(invoer))) {
      var begin = TEKSTCOMMANDOS.lastIndex;
      var diepte = 1;
      var i = begin;
      while (i < invoer.length && diepte > 0) {
        var c = invoer.charAt(i);
        if (c === "\\") i++;
        else if (c === "{") diepte++;
        else if (c === "}") diepte--;
        i++;
      }
      var einde = diepte === 0 ? i - 1 : invoer.length;
      uit += invoer.slice(vanaf, begin) + accentueer(invoer.slice(begin, einde));
      vanaf = einde;
      TEKSTCOMMANDOS.lastIndex = einde;
    }
    return uit + invoer.slice(vanaf);
  }

  config.startup.ready = function () {
    if (vorigeReady) vorigeReady();
    else MathJax.startup.defaultReady();
    var invoer = MathJax.startup.input && MathJax.startup.input[0];
    if (invoer && invoer.preFilters) {
      invoer.preFilters.add(function (data) {
        data.math.math = omzetten(data.math.math);
      });
    }
  };
})();
