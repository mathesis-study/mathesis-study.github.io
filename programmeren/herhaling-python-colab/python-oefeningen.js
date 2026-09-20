/* Kleine Pythonwerkplek; opgaven, hints en oplossingen komen uit LaTeX. */
(function () {
  "use strict";
  const config = window.MathesisPython;
  if (!config) return;
  let bundel, worker, workerURL, workerKlaar, initialisatie, bezig, klok;
  let namespacesInGebruik = false, runtimeVerloren = false;
  const editors = [];

  function element(tag, klasse, tekst) {
    const node = document.createElement(tag);
    if (klasse) node.className = klasse;
    if (tekst !== undefined) node.textContent = tekst;
    return node;
  }

  // Een codeblok stapt per instructie (step-by-step) of per regel
  // (stap-per-regel); enkel de tweede gaat de lus in.
  function eenheid(editor) {
    return editor.stapsoort === "regel" ? "regel" : "instructie";
  }

  function kanVoorbeeldinvoer(editor, sessie = editor.invoerSessie) {
    return Boolean(!bezig && sessie && editor.voorbeeldinvoer &&
      sessie.antwoorden.length < editor.voorbeeldinvoer.length);
  }

  function gebruikVoorbeeldinvoer(editor, sessie = editor.invoerSessie) {
    if (!kanVoorbeeldinvoer(editor, sessie)) return false;
    sessie.antwoorden.push(editor.voorbeeldinvoer[sessie.antwoorden.length]);
    start(editor, false, sessie);
    return true;
  }

  function herstelIcoon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const pad = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pad.setAttribute("d", "M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8M3 3v5h5");
    svg.appendChild(pad);
    return svg;
  }

  // Een kevertje voor de knop die de stapinterface opent: de vorm die overal
  // voor foutzoeken staat, in dezelfde lijnstijl als de resetknop.
  function bugIcoon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    ["M8 2l1.9 1.9M16 2l-1.9 1.9",
     "M9 7.1v-1a3 3 0 0 1 6 0v1",
     "M12 20a6 6 0 0 1-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6z",
     "M12 20v-9",
     "M6.5 9A3.5 3.5 0 0 1 3 5.5M6 13H2M6.5 17A3.5 3.5 0 0 0 3 20.5",
     "M17.5 9A3.5 3.5 0 0 0 21 5.5M18 13h4M17.5 17a3.5 3.5 0 0 1 3.5 3.5"
    ].forEach(d => {
      const pad = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pad.setAttribute("d", d);
      svg.appendChild(pad);
    });
    return svg;
  }

  // Volgende ronde: een boog die over de inhoud van de lus heen springt, met
  // die inhoud als stip eronder. Geen cirkelpijl, die is hier de resetknop.
  function rondeIcoon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    [["M4 17a8 8 0 0 1 16 0", "none"],
     ["M16.6 14.4 20 17l-3.4 2.6", "none"],
     ["M12 17.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2", "currentColor"]
    ].forEach(([d, vulling]) => {
      const pad = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pad.setAttribute("d", d);
      pad.setAttribute("fill", vulling);
      svg.appendChild(pad);
    });
    return svg;
  }

  function laadBundel() {
    if (!bundel) bundel = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = config.runtime;
      script.onload = () => resolve(window.MathesisPythonBestanden);
      script.onerror = () => {
        script.remove();
        bundel = null;
        reject(new Error("Python kon niet laden. Je code blijft bewaard; probeer opnieuw."));
      };
      document.head.appendChild(script);
    });
    return bundel;
  }

  function knoppen() {
    editors.forEach(editor => {
      const actief = Boolean(bezig && bezig.editor === editor);
      const laden = Boolean(actief && bezig.fase === "laden");
      const stapActief = Boolean(actief && bezig.stapsgewijs);
      const gewoonActief = actief && !stapActief;
      editor.uitvoerknop.disabled = Boolean(bezig && !gewoonActief);
      editor.uitvoerknop.classList.toggle("laden", laden && gewoonActief);
      editor.uitvoerknop.classList.toggle("bezig", gewoonActief && !laden);
      const knoptekst = laden && gewoonActief ? "Laden stoppen" : gewoonActief ? "Stop" : "Uitvoeren";
      editor.uitvoerknop.setAttribute("aria-label", knoptekst);
      editor.uitvoerknop.title = knoptekst;
      if (editor.resetknop) editor.resetknop.disabled = Boolean(bezig);
      // De bugknop opent en sluit de stapinterface; zolang die dicht is, laadt
      // hij bij de eerste klik Python en maakt hij de opname.
      if (editor.bugknop) {
        const open = Boolean(editor.stap) || stapActief;
        editor.bugknop.disabled = Boolean(bezig && !stapActief);
        editor.bugknop.classList.toggle("laden", stapActief);
        editor.bugknop.setAttribute("aria-pressed", String(open));
        const bugTekst = stapActief ? "Laden stoppen" : open ? "Stap per regel sluiten" : "Stap per regel";
        editor.bugknop.setAttribute("aria-label", bugTekst);
        editor.bugknop.title = bugTekst;
      }
      // De knoppen van de stapinterface bladeren door een opname die al bestaat,
      // dus ze staan enkel uit aan de randen ervan.
      if (editor.beginknop) {
        const bladeren = Boolean(editor.stap) && !bezig;
        const speelt = Boolean(editor.speeltimer);
        editor.beginknop.disabled = !bladeren || editor.stap.index === 0;
        editor.eindeknop.disabled = !bladeren || editor.stap.index >= editor.stap.instructies.length;
        editor.rondeknop.disabled = !bladeren || volgendeRonde(editor) === null;
        editor.speelknop.disabled = !bladeren;
        editor.speelknop.classList.toggle("python-stappauze", speelt);
        editor.speelknop.classList.toggle("python-stapspeel", !speelt);
        const speeltekst = speelt ? "Pauzeer" : "Speel af";
        editor.speelknop.setAttribute("aria-label", speeltekst);
        editor.speelknop.title = speeltekst;
      }
      if (editor.stapknop) {
        const klaar = Boolean(editor.stap && editor.stap.index >= editor.stap.instructies.length);
        editor.stapknop.disabled = Boolean((bezig && !stapActief) || klaar);
        editor.stapknop.classList.toggle("laden", stapActief && !editor.bugknop);
        const stapTekst = stapActief && !editor.bugknop ? "Laden stoppen" : "Volgende " + eenheid(editor);
        editor.stapknop.setAttribute("aria-label", stapTekst);
        editor.stapknop.title = stapTekst;
        // Terug in de gutter sluit het stappen; in de stapinterface doet de
        // bugknop dat, dus daar staat de knop op de eerste stap uit.
        editor.terugknop.disabled = Boolean(bezig || !editor.stap ||
          (editor.bugknop && editor.stap.index === 0));
      }
    });
  }

  function vernietigWorker(runtimeKwijt = false, fout) {
    if (runtimeKwijt && namespacesInGebruik) runtimeVerloren = true;
    if (workerKlaar && fout) workerKlaar.reject(fout);
    if (worker) worker.terminate();
    worker = null;
    workerKlaar = null;
    if (workerURL) URL.revokeObjectURL(workerURL);
    workerURL = null;
  }

  function afronden(tekst, afbreken) {
    clearTimeout(klok);
    if (bezig) {
      if (bezig.outputTimer) clearTimeout(bezig.outputTimer);
      if (bezig.outputKlaar) bezig.outputKlaar();
      const draaide = bezig.editor.markering.classList.contains("python-uitvoer-draaien");
      bezig.editor.markering.classList.remove("python-uitvoer-draaien");
      bezig.editor.markering.style.removeProperty("--python-spinner-duur");
      if (draaide) bezig.editor.markering.hidden = true;
      if (tekst.startsWith("Gestopt.")) {
        bezig.editor.resultaat.classList.remove("goed", "zelfcontrole");
        bezig.editor.resultaat.classList.add("fout");
        bezig.editor.resultaat.hidden = false;
        bezig.editor.markering.textContent = "×";
        bezig.editor.markering.setAttribute("aria-label", "Uitvoering onderbroken");
        bezig.editor.markering.hidden = false;
      }
      bezig.editor.status.textContent = tekst;
    }
    if (afbreken) vernietigWorker(!tekst.startsWith("Gestopt.") && !tekst.startsWith("Code vervangen."));
    bezig = null;
    knoppen();
  }

  function zend(taak) {
    taak.fase = "uitvoeren";
    knoppen();
    taak.editor.status.textContent = taak.editor.codeblok ? "Python voert je code uit…" : "Python voert je code uit en controleert het resultaat…";
    clearTimeout(klok);
    klok = setTimeout(() => afronden("Gestopt na 5 seconden. Controleer of je lus stopt.", true), 5000);
    worker.postMessage({ actie: "uitvoeren", naam: taak.editor.naam,
      bron: taak.bron, invoer: taak.invoer, stapsgewijs: taak.stapsgewijs,
      namespace: taak.namespace, modeloplossing: taak.modeloplossing,
      outputDelay: taak.editor.outputDelay });
  }

  function werkUitvoerBij(taak) {
    if (bezig !== taak) return;
    if (!taak.uitvoerwachtrij.length) {
      if (taak.uitvoerGesloten) {
        if (taak.outputTimer) clearTimeout(taak.outputTimer);
        taak.outputTimer = null;
        if (taak.outputKlaar) taak.outputKlaar();
      }
      return;
    }
    const deel = taak.uitvoerwachtrij.shift();
    const uitvoer = taak.editor.uitvoer;
    uitvoer.hidden = false;
    taak.editor.resultaat.hidden = false;
    taak.editor.markering.hidden = false;
    taak.editor.markering.classList.add("python-uitvoer-draaien");
    taak.editor.markering.style.setProperty("--python-spinner-duur", taak.editor.outputDelay * 12 + "ms");
    taak.editor.markering.setAttribute("aria-label", "Uitvoer verschijnt");
    taak.getoondeUitvoerregels++;
    uitvoer.append(document.createTextNode(deel));
    uitvoer.scrollTop = uitvoer.scrollHeight;
    taak.editor.status.textContent = "De uitvoer verschijnt regel voor regel…";
    taak.outputTimer = setTimeout(() => {
      taak.outputTimer = null;
      werkUitvoerBij(taak);
    }, taak.editor.outputDelay);
  }

  function voegUitvoerToe(taak, tekst) {
    taak.uitvoerbuffer += tekst;
    let einde;
    while ((einde = taak.uitvoerbuffer.indexOf("\n")) >= 0) {
      taak.uitvoerwachtrij.push(taak.uitvoerbuffer.slice(0, einde + 1));
      taak.uitvoerbuffer = taak.uitvoerbuffer.slice(einde + 1);
    }
    if (!taak.outputTimer) werkUitvoerBij(taak);
  }

  function sluitUitvoerAf(taak) {
    if (taak.uitvoerbuffer) taak.uitvoerwachtrij.push(taak.uitvoerbuffer);
    taak.uitvoerbuffer = "";
    taak.uitvoerGesloten = true;
    return new Promise(resolve => {
      taak.outputKlaar = resolve;
      if (!taak.outputTimer) werkUitvoerBij(taak);
    });
  }

  function beperkUitvoerNaFout(taak) {
    // Een oneindige lus kan duizenden regels uitsturen voordat de begrenzing
    // ingrijpt. Laat er nog enkele in het gekozen tempo zien: genoeg om het
    // probleem te herkennen, zonder de foutmelding minutenlang uit te stellen.
    taak.uitvoerwachtrij = taak.uitvoerwachtrij.slice(0,
      Math.max(0, taak.editor.outputMax - taak.getoondeUitvoerregels));
    taak.uitvoerbuffer = "";
    taak.uitvoerGesloten = true;
  }

  async function verwerkWorkerBericht(event) {
    if (event.data.klaar) {
      if (workerKlaar) workerKlaar.resolve();
      return;
    }
    if (!bezig) return;
    if (event.data.uitvoerDeel !== undefined) {
      if (bezig.editor.outputDelay) voegUitvoerToe(bezig, event.data.uitvoerDeel);
      return;
    }
    const huidig = bezig.editor;
    const resultaat = event.data;
    if (bezig.stapsgewijs && !resultaat.invoer) {
      const mislukt = resultaat.instructies === undefined;
      const melding = bezig.runtimeVerloren ? "De runtime is herstart. Voer de cellen opnieuw van boven naar onder uit." : "";
      afronden("", mislukt);
      beginInstructies(huidig, resultaat);
      if (melding) huidig.status.textContent = melding;
      return;
    }
    const wachtOpInvoer = resultaat.invoer;
    huidig.code.markeerInvoer(wachtOpInvoer ? resultaat.invoer.positie : null);
    const taak = bezig;
    clearTimeout(klok); // De code is klaar; een eventuele uitvoeranimatie mag duren.
    if (resultaat.fout && huidig.outputDelay) beperkUitvoerNaFout(taak);
    await toonUitvoer(huidig, resultaat, taak.invoerSessie, taak);
    if (bezig !== taak) return; // De lezer stopte terwijl de uitvoer verscheen.
    if (resultaat.foutgegevens) huidig.code.setDiagnostic(resultaat.foutgegevens);
    else huidig.code.clearDiagnostics();
    huidig.feedback.textContent = huidig.codeblok ? "" : resultaat.feedback;
    huidig.feedback.hidden = huidig.codeblok || !resultaat.feedback;
    const foutloos = Boolean(resultaat.goed || resultaat.onbeoordeeld);
    const fout = Boolean(resultaat.fout || resultaat.goed === false);
    huidig.resultaat.classList.toggle("goed", foutloos);
    huidig.resultaat.classList.toggle("fout", fout);
    huidig.resultaat.classList.toggle("zelfcontrole", !huidig.codeblok && resultaat.onbeoordeeld && !resultaat.goed);
    huidig.markering.classList.remove("python-uitvoer-draaien");
    huidig.markering.style.removeProperty("--python-spinner-duur");
    huidig.markering.hidden = huidig.codeblok ? !foutloos && !fout : (resultaat.goed == null && !resultaat.onbeoordeeld);
    huidig.markering.textContent = foutloos ? "✓" : "×";
    huidig.markering.setAttribute("aria-label", foutloos ?
      (resultaat.onbeoordeeld ? "Voorbeeld van een juiste oplossing" : "Correct") :
      (huidig.codeblok ? "Pythonfout" : (resultaat.onbeoordeeld ? "Foutloos uitgevoerd; controleer zelf de oplossing" : "Niet correct")));
    huidig.resultaat.hidden = false;
    if (resultaat.stappen && resultaat.stappen.length) toonStappen(huidig, resultaat.stappen, bezig.bron);
    // Een mislukte initialisatie mag de volgende poging niet vergiftigen.
    afronden(taak.runtimeVerloren ? "De runtime is herstart. Voer de cellen opnieuw van boven naar onder uit." : "", Boolean(resultaat.fout && resultaat.uitvoer === undefined));
    if (wachtOpInvoer) huidig.status.textContent = kanVoorbeeldinvoer(huidig) ?
      "Druk op ↓ voor de voorbeeldinvoer." : "Vul je antwoord in en druk op Enter.";
  }

  async function toonUitvoer(editor, resultaat, sessie, taak) {
    const uitvoer = resultaat.uitvoer || "";
    const traceback = resultaat.fout || "";
    if (editor.outputDelay) {
      await sluitUitvoerAf(taak);
    } else {
      editor.uitvoer.replaceChildren(document.createTextNode(uitvoer));
      editor.uitvoer.hidden = false;
    }
    if (traceback) {
      if (uitvoer) editor.uitvoer.append("\n");
      voegTracebackToe(editor.uitvoer, traceback);
    }
    if (resultaat.invoer) {
      const formulier = element("form", "python-invoer");
      const veld = element("input", "python-invoerveld");
      const verzenden = element("button", "python-verzendknop");
      veld.type = "text";
      veld.autocomplete = "off";
      veld.setAttribute("aria-label", resultaat.invoer.vraag || "Invoer");
      verzenden.type = "submit";
      verzenden.setAttribute("aria-label", "Verzend");
      verzenden.title = "Verzend";
      verzenden.textContent = "↵";
      formulier.append(veld, verzenden);
      if (editor.voorbeeldinvoer && sessie.antwoorden.length < editor.voorbeeldinvoer.length) {
        formulier.appendChild(element("span", "python-voorbeeldinvoer", "↓"));
      }
      formulier.addEventListener("submit", event => {
        event.preventDefault();
        if (bezig) return;
        sessie.antwoorden.push(veld.value);
        veld.disabled = true;
        verzenden.disabled = true;
        start(editor, false, sessie);
      });
      veld.addEventListener("keydown", event => {
        if (event.key !== "ArrowDown" || event.ctrlKey || event.altKey || event.metaKey) return;
        if (gebruikVoorbeeldinvoer(editor, sessie)) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      editor.uitvoer.appendChild(formulier);
      setTimeout(() => veld.focus(), 0);
    } else if (!(uitvoer + traceback).trim()) {
      editor.uitvoer.textContent = "Geen uitvoer. Gebruik print() om een waarde te tonen.";
    }
    requestAnimationFrame(() => {
      editor.uitvoer.scrollTop = editor.uitvoer.scrollHeight;
    });
  }

  // De foutmelding begint bij de laatste regel van de vorm "Soort: uitleg" die
  // niet inspringt, en loopt tot het einde. Zo licht ook een melding over
  // meerdere regels volledig op, en blijven de koppen van een geketende
  // uitzondering ("Traceback ...", "During handling ...") erbuiten.
  function beginFoutboodschap(regels) {
    for (let nummer = regels.length - 1; nummer >= 0; nummer--) {
      if (/^[A-Za-z_][\w.]*(?::|$)/.test(regels[nummer])) return nummer;
    }
    return regels.length - 1;
  }

  function voegTracebackToe(ouder, traceback) {
    const blok = element("span", "python-traceback");
    // Enkel rechts snoeien: een syntaxfout begint met een ingesprongen
    // "  File ..." en die inspringing hoort te blijven staan.
    const regels = traceback.replace(/\s+$/, "").split("\n");
    const begin = beginFoutboodschap(regels);
    // Enkel frames van de leerling tellen mee, zodat de gemarkeerde regel
    // dezelfde is als die welke de editor onderstreept.
    let laatsteLijn = -1;
    regels.forEach((regel, nummer) => {
      if (nummer < begin && regel.includes("<oefening>") && /\bline \d+\b/i.test(regel)) laatsteLijn = nummer;
    });
    regels.slice(0, begin).forEach((regel, nummer) => {
      const match = nummer === laatsteLijn && /\bline \d+\b/i.exec(regel);
      if (match) {
        blok.append(document.createTextNode(regel.slice(0, match.index)));
        blok.appendChild(element("span", "python-foutregel", match[0]));
        blok.append(document.createTextNode(regel.slice(match.index + match[0].length)));
      } else {
        blok.append(document.createTextNode(regel));
      }
      blok.append("\n");
    });
    blok.appendChild(element("span", "python-foutboodschap", regels.slice(begin).join("\n")));
    ouder.appendChild(blok);
  }

  async function initialiseerWorker() {
    if (workerKlaar) return workerKlaar.promise;
    if (initialisatie) return initialisatie;
    initialisatie = (async () => {
      const bestanden = await laadBundel();
      if (!worker) {
        workerURL = URL.createObjectURL(new Blob([config.worker], { type: "text/javascript" }));
        worker = new Worker(workerURL);
        worker.onmessage = verwerkWorkerBericht;
        worker.onerror = () => {
          if (workerKlaar) workerKlaar.reject(new Error("Python kon niet uitvoeren. Je code blijft staan; probeer opnieuw."));
          else if (bezig) afronden("Python kon niet uitvoeren. Je code blijft staan; probeer opnieuw.", true);
        };
      }
      let resolve, reject;
      const promise = new Promise((goed, fout) => { resolve = goed; reject = fout; });
      workerKlaar = { promise, resolve, reject };
      worker.postMessage({ actie: "init", bestanden, controle: config.controle });
      return promise;
    })().finally(() => { initialisatie = null; });
    return initialisatie;
  }

  function warmPython() {
    if (worker || bezig) return;
    initialiseerWorker().catch(() => vernietigWorker());
  }

  async function start(editor, stapsgewijs, invoerSessie) {
    if (bezig) return;
    const sessie = invoerSessie || { antwoorden: [] };
    editor.invoerSessie = sessie;
    editor.code.markeerInvoer(null);
    const bron = editor.code.getValue();
    const taak = { editor, bron, invoer: sessie.antwoorden,
      invoerSessie: sessie, fase: "laden", stapsgewijs: stapsgewijs || false, namespace: editor.namespace,
      modeloplossing: Boolean(editor.modeloplossing && bron === editor.modeloplossing),
      runtimeVerloren: Boolean(editor.namespace && runtimeVerloren), uitvoerbuffer: "",
      uitvoerwachtrij: [], uitvoerGesloten: false, outputTimer: null, outputKlaar: null,
      getoondeUitvoerregels: 0 };
    if (taak.namespace) namespacesInGebruik = true;
    if (taak.runtimeVerloren) runtimeVerloren = false;
    bezig = taak;
    wisInstructies(editor);
    editor.feedback.hidden = true;
    editor.stappen.hidden = true;
    if (editor.toestand) editor.toestand.hidden = true;
    editor.uitvoer.hidden = true;
    editor.resultaat.hidden = true;
    editor.status.textContent = workerKlaar ? "Python staat klaar…" : "Python wordt geladen. De eerste keer duurt dit even…";
    knoppen();
    klok = setTimeout(() => afronden("Python laden duurde te lang. Probeer opnieuw.", true), 45000);
    try {
      await initialiseerWorker();
      if (bezig !== taak) return; // Stop tijdens het laden.
      zend(taak);
    } catch (fout) {
      if (bezig === taak) afronden(fout.message, true);
    }
  }

  // Stapsgewijs uitvoeren (pythoncode[step-by-step] en [stap-per-regel]): de
  // worker voert de hele code eenmalig uit en onthoudt per instructie, of per
  // uitgevoerde regel, haar regels, haar uitvoer en de waarden van de
  // variabelen. De knoppen en de toetsen bladeren daarna door die opname; er
  // loopt niets meer in Python. Index is het aantal uitgevoerde stappen; de
  // gemarkeerde regel is de stap die als volgende aan de beurt is.
  function beginInstructies(editor, resultaat) {
    if (!resultaat.instructies || !resultaat.instructies.length) {
      editor.uitvoer.textContent = (resultaat.fout || "Geen " + eenheid(editor) + "s om uit te voeren.").trim();
      editor.uitvoer.hidden = false;
      editor.resultaat.hidden = false;
      editor.markering.hidden = true;
      if (resultaat.foutgegevens) editor.code.setDiagnostic(resultaat.foutgegevens);
      editor.status.textContent = "";
      return;
    }
    editor.stap = { instructies: resultaat.instructies, fout: resultaat.fout,
      foutgegevens: resultaat.foutgegevens, lussen: resultaat.lussen || [],
      afgekapt: Boolean(resultaat.afgekapt), index: 0 };
    toonInstructies(editor);
  }

  function wisInstructies(editor) {
    stopSpel(editor);
    if (!editor.stap) return;
    editor.stap = null;
    editor.blok.classList.remove("python-stappend");
    editor.code.markeerRegels(null);
    if (editor.toestand) editor.toestand.hidden = true;
    knoppen();
  }

  // Alle lusbanden van het nest waarin de volgende regel ligt: de buitenste lus
  // die haar omvat, met alles wat daarbinnen ligt, van buiten naar binnen. Zo
  // blijft het bandje van de buitenste lus staan terwijl de binnenste draait,
  // en verspringt er niets wanneer de beurt van de ene naar de andere gaat. De
  // lus die op dit ogenblik niet aan de beurt is, staat gedempt.
  function lussenRond(stap, regel) {
    const omvat = lus => regel >= lus.regel && regel <= lus.eindregel;
    const lussen = stap.lussen || [];
    const buitenste = lussen.filter(omvat).sort((a, b) => a.regel - b.regel)[0];
    if (!buitenste) return [];
    return lussen
      .filter(lus => lus.regel >= buitenste.regel && lus.eindregel <= buitenste.eindregel)
      .sort((a, b) => a.regel - b.regel)
      .map(lus => ({ lus, actief: omvat(lus) }));
  }

  // De stapinterface onder de code bij [stap-per-regel]: bovenaan de twee
  // stapknoppen met waar we staan, daaronder het bandje van de range met de
  // waarde die de lusvariabele nu heeft, elke geteste voorwaarde met haar
  // waarde, en de waarden van de andere variabelen. Alles hoort bij de regel
  // die als volgende aan de beurt is, dus na het uitvoeren van een regel staat
  // er wat die regel heeft opgeleverd. De bugknop opent en sluit dit blok.
  function toonToestand(editor) {
    const strook = editor.toestand;
    if (!strook) return;
    const stap = editor.stap;
    const nu = stap && stap.index < stap.instructies.length ? stap.instructies[stap.index] : null;
    const inhoud = editor.toestandinhoud;
    inhoud.replaceChildren();
    if (!stap) { strook.hidden = true; return; }
    strook.hidden = false;
    if (!nu) {
      editor.toestandkop.replaceChildren(document.createTextNode(
        stap.fout ? "Gestopt door een fout." : "Alle regels zijn uitgevoerd."));
      return;
    }
    const nest = lussenRond(stap, nu.regel);
    editor.toestandkop.replaceChildren(document.createTextNode("Volgende regel: " + nu.regel +
      " (stap " + (stap.index + 1) + " van " + stap.instructies.length + ")"));
    // Elke lus van het nest krijgt haar eigen bandje, met haar ronde erachter;
    // bij nesting zou één teller bovenaan niet zeggen bij welke lus hij hoort.
    const vorige = stap.index > 0 ? stap.instructies[stap.index - 1] : null;
    nest.forEach(({ lus, actief }) => {
      // Wie op de kopregel van buiten de lus komt, staat aan haar begin: wat er
      // dan in de variabele zit, is een restje van de vorige keer en hoort niet
      // meer bij deze reeks rondes.
      const begint = nu.regel === lus.regel &&
        (!vorige || vorige.regel < lus.regel || vorige.regel > lus.eindregel);
      const huidig = actief && !begint ? nu.waarden[lus.variabele] : undefined;
      const positie = lus.waarden.findIndex(waarde => String(waarde) === huidig);
      const band = element("div", "python-lusband" + (actief ? "" : " slapend"));
      band.appendChild(element("span", "python-lusnaam", lus.variabele));
      lus.waarden.forEach((waarde, index) => {
        const cel = element("span", "python-luswaarde", String(waarde));
        if (index === positie) cel.classList.add("actief");
        else if (positie >= 0 && index < positie) cel.classList.add("gehad");
        band.appendChild(cel);
      });
      band.appendChild(element("span", "python-lusstop", String(lus.stop)));
      band.appendChild(element("span", "python-lusuitleg", "stopt vlak voor " + lus.stop));
      if (positie >= 0) band.appendChild(element("span", "python-ronde",
        "ronde " + (positie + 1) + " van " + lus.waarden.length));
      inhoud.appendChild(band);
    });
    if (nu.conditie) {
      const conditie = element("div", "python-conditie");
      conditie.append(element("span", "python-conditie-label", "Geteste voorwaarde"),
        element("code", "", nu.conditie.tekst));
      conditie.appendChild(element("strong", "python-conditie-uitkomst " +
        (nu.conditie.waarde ? "python-waar" : "python-onwaar"),
        nu.conditie.waarde ? "True" : "False"));
      inhoud.appendChild(conditie);
    }
    // De lusvariabelen staan al in hun bandje; twee keer hetzelfde leidt af, en
    // de waarde van een lus die nu niet draait, is een restje van de vorige keer.
    const lusnamen = nest.map(({ lus }) => lus.variabele);
    const alle = Object.keys(nu.waarden);
    const namen = alle.filter(naam => !lusnamen.includes(naam));
    const waarden = element("div", "python-waarden");
    namen.forEach(naam => {
      const vak = element("span", "python-waarde");
      vak.append(element("code", "", naam), document.createTextNode(" = "),
        element("code", "", nu.waarden[naam]));
      waarden.appendChild(vak);
    });
    // Zonder bandjes verdient een leeg geheugen een woord; staan de bandjes er
    // al, dan zou die regel enkel de hoogte doen springen zodra er een waarde is.
    if (!alle.length && !nest.length) waarden.appendChild(element("span", "python-leeg", "Er zijn nog geen variabelen."));
    if (waarden.childElementCount) inhoud.appendChild(waarden);
    if (stap.afgekapt) inhoud.appendChild(element("p", "python-afgekapt",
      "De opname stopt na " + stap.instructies.length + " regels."));
  }

  function toonInstructies(editor) {
    const stap = editor.stap;
    const aantal = stap.instructies.length;
    const klaar = stap.index >= aantal;
    editor.blok.classList.add("python-stappend");
    editor.uitvoer.replaceChildren();
    stap.instructies.slice(0, stap.index).forEach((instructie, i) => {
      if (!instructie.uitvoer) return;
      const deel = element("span", i === stap.index - 1 ? "python-nieuw" : "", instructie.uitvoer);
      editor.uitvoer.appendChild(deel);
    });
    const fout = klaar && stap.fout;
    if (fout) {
      if (editor.uitvoer.textContent) editor.uitvoer.append("\n");
      voegTracebackToe(editor.uitvoer, stap.fout);
    }
    if (fout && stap.foutgegevens) editor.code.setDiagnostic(stap.foutgegevens);
    else editor.code.clearDiagnostics();
    editor.uitvoer.hidden = !editor.uitvoer.textContent;
    editor.resultaat.hidden = editor.uitvoer.hidden;
    // Bij een lange uitvoer moet de pas uitgevoerde regel meteen zichtbaar
    // zijn, ook wanneer de uitvoer in zijn eigen scrollvak past.
    if (!editor.uitvoer.hidden) editor.uitvoer.scrollTop = editor.uitvoer.scrollHeight;
    editor.markering.hidden = true;
    editor.feedback.hidden = true;
    if (klaar) {
      editor.code.markeerRegels(null);
      editor.status.textContent = fout ? "Gestopt door een fout." : "Alle " + eenheid(editor) + "s zijn uitgevoerd.";
    } else {
      const volgende = stap.instructies[stap.index];
      editor.code.markeerRegels(volgende.regel, volgende.eindregel);
      const regels = volgende.regel === volgende.eindregel ? "regel " + volgende.regel : "regel " + volgende.regel + " tot " + volgende.eindregel;
      editor.status.textContent = "Volgende " + eenheid(editor) + ": " + regels + " (" + (stap.index + 1) + " van " + aantal + ").";
    }
    toonToestand(editor);
    knoppen();
  }

  // Springen binnen de opname; de knoppen begin, einde en volgende ronde en het
  // afspelen lopen hierlangs. Er wordt niets opnieuw uitgevoerd.
  function zetStap(editor, index) {
    if (bezig || !editor.stap) return;
    editor.stap.index = Math.max(0, Math.min(editor.stap.instructies.length, index));
    toonInstructies(editor);
  }

  // Een stap vooruit; de eerste keer voert ze de code uit om de opname te maken.
  function stapVooruit(editor) {
    if (bezig) return;
    stopSpel(editor);
    if (!editor.stap) start(editor, editor.stapsoort);
    else if (editor.stap.index < editor.stap.instructies.length) { editor.stap.index++; toonInstructies(editor); }
  }

  // Een stap terug; vanaf de eerste stap sluit ze het stappen weer.
  function stapTerug(editor) {
    if (bezig || !editor.stap) return;
    stopSpel(editor);
    if (editor.stap.index > 0) { editor.stap.index--; toonInstructies(editor); return; }
    sluitStappen(editor);
  }

  // De stap waarop dezelfde lus haar volgende ronde begint: de eerstvolgende
  // keer dat de kopregel van de binnenste lus rond de huidige regel aan de
  // beurt is. Sta je op de kopregel van de buitenste lus, dan slaat die sprong
  // de hele binnenste lus over.
  function volgendeRonde(editor) {
    const stap = editor.stap;
    if (!stap || stap.index >= stap.instructies.length) return null;
    const nest = lussenRond(stap, stap.instructies[stap.index].regel).filter(deel => deel.actief);
    if (!nest.length) return null;
    const kopregel = nest[nest.length - 1].lus.regel;
    for (let index = stap.index + 1; index < stap.instructies.length; index++) {
      if (stap.instructies[index].regel === kopregel) return index;
    }
    return null;
  }

  // Afspelen in hetzelfde tempo als de constructiestappen van een figuur, zodat
  // je kunt praten terwijl de lus loopt. Elke handmatige stap zet het stil.
  const SPEELTEMPO = 1500;

  function stopSpel(editor) {
    if (!editor.speeltimer) return;
    clearInterval(editor.speeltimer);
    editor.speeltimer = null;
    knoppen();
  }

  function speelOfPauzeer(editor) {
    if (bezig || !editor.stap) return;
    if (editor.speeltimer) { stopSpel(editor); return; }
    if (editor.stap.index >= editor.stap.instructies.length) zetStap(editor, 0);
    editor.speeltimer = setInterval(() => {
      if (!editor.stap || editor.stap.index >= editor.stap.instructies.length) stopSpel(editor);
      else zetStap(editor, editor.stap.index + 1);
    }, SPEELTEMPO);
    knoppen();
  }

  function sluitStappen(editor) {
    wisInstructies(editor);
    editor.code.clearDiagnostics();
    editor.uitvoer.hidden = true;
    editor.resultaat.hidden = true;
    editor.status.textContent = editor.bugknop
      ? "Klik op de bugknop om de code regel per regel te doorlopen."
      : "Klik op de stapknop om de " + eenheid(editor) + "s een voor een uit te voeren.";
  }

  // De bugknop: de eerste klik maakt de opname en opent de stapinterface, een
  // tweede klik sluit ze en laat de code weer met rust.
  function wisselStappen(editor) {
    if (bezig && bezig.editor === editor) {
      afronden("Gestopt. Je kunt de code aanpassen en opnieuw uitvoeren.", true);
      return;
    }
    if (bezig) return;
    if (editor.stap) sluitStappen(editor);
    else stapVooruit(editor);
  }

  function knop(ouder, tekst, actie, naam) {
    const button = element("button", "", tekst);
    button.type = "button";
    if (naam) button.dataset.actie = naam;
    button.addEventListener("click", actie);
    ouder.appendChild(button);
    return button;
  }

  function toonStappen(editor, stappen, bron) {
    editor.stappen.replaceChildren();
    editor.stappen.hidden = false;
    let index = -1;
    const uitleg = element("p", "", "Volg hieronder de waarden na elke uitgevoerde regel.");
    const balk = element("div", "python-knoppen");
    const regel = element("p");
    regel.setAttribute("aria-live", "polite");
    const tabel = element("table");
    tabel.appendChild(element("caption", "", "Waarden van de variabelen"));
    const kop = tabel.createTHead().insertRow();
    for (const naam of ["Naam", "Waarde"]) {
      const th = element("th", "", naam); th.scope = "col"; kop.appendChild(th);
    }
    const body = tabel.createTBody();
    function toon() {
      body.replaceChildren();
      const stap = stappen[index];
      regel.replaceChildren();
      regel.appendChild(element("span", "", stap ? "Na regel " + stap.regel + ": " : "Begin: er zijn nog geen variabelen."));
      if (stap) {
        regel.appendChild(element("code", "", bron.split("\n")[stap.regel - 1] || ""));
        Object.entries(stap.waarden).forEach(([naam, waarde]) => {
          const row = body.insertRow();
          const th = element("th", "", naam); th.scope = "row"; row.appendChild(th);
          row.insertCell().textContent = waarde;
        });
      }
      vorige.disabled = index < 0;
      volgende.disabled = index >= stappen.length - 1;
    }
    const vorige = knop(balk, "Vorige stap", () => { index--; toon(); }, "vorige-stap");
    const volgende = knop(balk, "Volgende stap", () => { index++; toon(); }, "volgende-stap");
    editor.stappen.append(uitleg, balk, regel, tabel);
    toon();
  }

  document.querySelectorAll(".python-oefening").forEach((blok, nummer) => {
    const bron = blok.querySelector(".python-startcode pre.pythoncode");
    if (!bron) return;
    const codeblok = blok.classList.contains("python-codeblok");
    // Een programma met input moet na iedere vraag kunnen pauzeren; dat past
    // niet bij de vooraf opgenomen stapweergave.
    const soorten = { "1": "instructie", regel: "regel" };
    const stapsoort = codeblok && !/\binput\s*\(/.test(bron.textContent)
      ? soorten[bron.dataset.stappen] || "" : "";
    const stapsgewijs = Boolean(stapsoort);
    const editor = { naam: blok.dataset.python, codeblok, blok, stapsoort, namespace: bron.dataset.namespace || "",
      outputDelay: Number(bron.dataset.outputDelay) || 0,
      outputMax: Number(bron.dataset.outputMax) || 30,
      voorbeeldinvoer: blok.hasAttribute("data-input") ? blok.dataset.input.split(",").map(waarde => waarde.trim()) : [] };
    const sleutel = "mathesis:python:" + location.pathname + ":" + editor.naam;
    const paneel = element("div", "python-editor");
    const code = element("textarea", "python-code");
    code.id = "python-code-" + nummer;
    code.spellcheck = false;
    code.autocapitalize = "off";
    code.setAttribute("autocorrect", "off");
    code.rows = Math.max(4, Math.min(16, bron.textContent.split("\n").length + 1));
    const begin = bron.textContent;
    const oplossingscode = blok.querySelector(".python-modelcode pre.pythoncode") ||
      blok.querySelector(".oplossing pre.pythoncode");
    const oplossing = oplossingscode ? oplossingscode.textContent : "";
    editor.modeloplossing = oplossing || null;

    code.value = begin;
    const label = element("label", "", "Pythoncode:"); label.htmlFor = code.id;
    const codekop = element("div", "python-codekop");
    const codekeuzes = element("div", "python-codekeuzes");
    codekeuzes.setAttribute("role", "group");
    codekeuzes.setAttribute("aria-label", "Code kiezen");
    if (!codeblok) codekop.append(label, codekeuzes);
    const codevak = element("div", "python-codevak");
    const codegutter = element("div", "python-codegutter");
    editor.uitvoerknop = knop(codegutter, "", () => {
      if (bezig && bezig.editor === editor) {
        afronden("Gestopt. Je kunt de code aanpassen en opnieuw uitvoeren.", true);
      } else {
        start(editor);
      }
    }, "uitvoeren");
    editor.uitvoerknop.className = "python-uitvoerknop";
    editor.uitvoerknop.setAttribute("aria-label", "Uitvoeren");
    editor.uitvoerknop.title = "Uitvoeren";
    // Per instructie stappen gebeurt met twee knoppen onder de playknop. Per
    // regel stappen heeft een eigen interface met die knoppen erin; onder de
    // playknop staat dan enkel de bugknop die ze opent.
    if (stapsoort === "instructie") {
      editor.stapknop = knop(codegutter, "", () => {
        if (bezig && bezig.editor === editor) afronden("Gestopt. Je kunt de code aanpassen en opnieuw uitvoeren.", true);
        else stapVooruit(editor);
      }, "volgende-instructie");
      editor.stapknop.className = "python-stapknop python-stapvooruit";
      editor.terugknop = knop(codegutter, "", () => stapTerug(editor), "vorige-instructie");
      editor.terugknop.className = "python-stapknop python-stapterug";
      editor.terugknop.setAttribute("aria-label", "Vorige instructie");
      editor.terugknop.title = "Vorige instructie";
      editor.terugknop.disabled = true;
    } else if (stapsoort === "regel") {
      editor.bugknop = knop(codegutter, "", () => wisselStappen(editor), "stap-per-regel");
      editor.bugknop.className = "python-bugknop";
      editor.bugknop.setAttribute("aria-pressed", "false");
      editor.bugknop.setAttribute("aria-label", "Stap per regel");
      editor.bugknop.title = "Stap per regel";
      editor.bugknop.appendChild(bugIcoon());
    }
    codevak.append(codegutter, code);
    if (codeblok) {
      const resetbalk = element("div", "pres-figuurbalk python-resetbalk");
      editor.resetknop = element("button", "pres-knop");
      editor.resetknop.type = "button";
      editor.resetknop.title = "Herstel de oorspronkelijke code en start de runtime opnieuw";
      editor.resetknop.setAttribute("aria-label", "Reset");
      editor.resetknop.append(herstelIcoon(), element("span", null, "Reset"));
      resetbalk.appendChild(editor.resetknop);
      codevak.appendChild(resetbalk);
      editor.resetbalk = resetbalk;
    }
    const bewaren = element("p", "python-bewaren", "Je code wordt in deze browser bewaard. Elke uitvoering begint met lege variabelen.");
    try {
      const opgeslagen = JSON.parse(localStorage.getItem(sleutel));
      if (opgeslagen && typeof opgeslagen.code === "string") code.value = opgeslagen.code;
    } catch (_) { bewaren.textContent = "Bewaren is hier niet beschikbaar. Kopieer je code voor je de pagina sluit."; }
    function bewaar() {
      try { localStorage.setItem(sleutel, JSON.stringify({ code: editor.code.getValue() })); }
      catch (_) { bewaren.textContent = "Je code kon niet bewaard worden. Kopieer ze voor je de pagina sluit."; }
    }
    function gewijzigd() {
      bewaar();
      werkResetknopBij();
      for (const keuze of codekeuzes.querySelectorAll("button")) {
        keuze.setAttribute("aria-pressed", String(editor.code.getValue() === keuze.dataset.code));
      }
      wisInstructies(editor);
      editor.feedback.hidden = true;
      editor.stappen.hidden = true;
      if (editor.toestand) editor.toestand.hidden = true;
      editor.uitvoer.hidden = true;
      editor.resultaat.hidden = true;
      editor.code.clearDiagnostics();
      editor.code.markeerInvoer(null);
      editor.invoerSessie = null;
      if (bezig && bezig.editor === editor) afronden("Code gewijzigd. Voer opnieuw uit.", true);
      else editor.status.textContent = "Code gewijzigd. Voer opnieuw uit.";
    }
    function werkResetknopBij() {
      if (editor.resetbalk) editor.resetbalk.hidden = editor.code.getValue() === begin;
    }
    async function herstel() {
      if (bezig) return;
      const lopendeInitialisatie = initialisatie;
      vernietigWorker(true, new Error("De runtime is herstart."));
      if (lopendeInitialisatie) {
        try { await lopendeInitialisatie; } catch (_) { /* De oude worker is bewust gestopt. */ }
      }
      editor.code.setValue(begin);
      try { localStorage.removeItem(sleutel); } catch (_) { /* Bewaren is optioneel. */ }
      editor.status.textContent = "Standaardcode en runtime hersteld. Voer de cellen opnieuw van boven naar onder uit.";
      editor.invoerSessie = null;
      knoppen();
    }
    function maakTextareaEditor() {
      code.addEventListener("input", gewijzigd);
      code.addEventListener("keydown", event => {
        const beginSelectie = code.selectionStart, eindeSelectie = code.selectionEnd;
        if (event.key === "Tab") {
          event.preventDefault();
          if (event.shiftKey) {
            const voor = code.value.slice(0, beginSelectie).replace(/ {1,4}$/, "");
            const weg = code.value.slice(0, beginSelectie).length - voor.length;
            code.setRangeText("", beginSelectie - weg, beginSelectie, "end");
          } else code.setRangeText("    ", beginSelectie, eindeSelectie, "end");
        } else if (event.key === "Enter") {
          event.preventDefault();
          const regel = code.value.slice(0, beginSelectie).split("\n").pop();
          const inspringing = /^\s*/.exec(regel)[0] + (/:\s*(?:#.*)?$/.test(regel) ? "    " : "");
          code.setRangeText("\n" + inspringing, beginSelectie, eindeSelectie, "end");
        }
      });
      return {getValue: () => code.value, setValue(tekst) { code.value = tekst; gewijzigd(); }, focus: () => code.focus(), clearDiagnostics() {}, setDiagnostic() {}, markeerRegels() {}, markeerInvoer() {}};
    }
    editor.code = maakTextareaEditor();
    if (editor.resetknop) editor.resetknop.addEventListener("click", herstel);
    function codekeuze(opschrift, waarde) {
      const keuze = knop(codekeuzes, opschrift, () => {
        if (bezig && bezig.editor === editor) afronden("Code vervangen.", true);
        editor.code.setValue(waarde);
        editor.status.textContent = opschrift + " geladen.";
        code.focus();
      });
      keuze.dataset.code = waarde;
      keuze.setAttribute("aria-pressed", String(editor.code.getValue() === waarde));
    }
    if (!codeblok) {
      codekeuze("Blanco", "");
      if (begin) codekeuze("Skeleton", begin);
      if (oplossingscode) codekeuze("Oplossing", oplossing);
    }
    if (window.MathesisCodeMirror && window.MathesisCodeMirror.maakEditor) {
      let ouder;
      try {
        ouder = element("div", "python-codemirror");
        code.before(ouder);
        const oud = editor.code;
        const codeMirror = window.MathesisCodeMirror.maakEditor({parent: ouder, value: oud.getValue(), label: "Pythoncode", onChange: gewijzigd});
        code.remove();
        editor.code = codeMirror;
        if (codeblok) ouder.addEventListener("keydown", event => {
          if (event.key !== "Enter" || (!event.shiftKey && !event.ctrlKey) || event.altKey || event.metaKey) return;
          event.preventDefault();
          event.stopPropagation();
          start(editor);
          if (event.shiftKey) setTimeout(() => {
            const volgende = blok.parentElement && blok.parentElement.querySelectorAll(".python-codeblok");
            const index = volgende ? Array.prototype.indexOf.call(volgende, blok) : -1;
            const doel = index >= 0 && volgende[index + 1];
            if (doel) (doel.querySelector("[contenteditable='true']") || doel.querySelector("textarea"))?.focus();
          }, 0);
        }, true);
      } catch (_) { if (ouder) ouder.remove(); /* Het toegankelijke tekstvak blijft de terugval. */ }
    }
    werkResetknopBij();
    // De pijltjes blijven bij het tekstveld; Tab blijft bruikbaar om het te
    // verlaten. Inspringen kan met vier spaties, zoals in de startcode.
    editor.status = element("p", "python-status",
      stapsoort === "regel" ? "Klik op de playknop om alles uit te voeren of op de bugknop om de code regel per regel te doorlopen." :
      stapsoort ? "Klik op de playknop om alles uit te voeren of op de stapknop om de instructies een voor een uit te voeren." :
      codeblok ? "Klik op de playknop om uit te voeren." : "Vul de startcode aan en klik op Uitvoeren.");
    editor.runtimeVerloren = false;
    editor.status.setAttribute("role", "status");
    editor.uitvoer = element("div", "python-uitvoer"); editor.uitvoer.hidden = true;
    editor.uitvoer.setAttribute("aria-label", "Pythonuitvoer");
    editor.feedback = element("p", "python-feedback"); editor.feedback.hidden = true;
    editor.feedback.setAttribute("role", "status");
    editor.resultaat = element("div", "python-resultaat"); editor.resultaat.hidden = true;
    editor.markering = element("span", "python-markering");
    editor.markering.setAttribute("role", "img");
    const resultaatinhoud = element("div", "python-resultaatinhoud");
    resultaatinhoud.append(editor.uitvoer, editor.feedback);
    editor.resultaat.append(editor.markering, resultaatinhoud);
    editor.stappen = element("div", "python-stappen"); editor.stappen.hidden = true;
    paneel.append(codekop, codevak);
    // De stapinterface staat tussen de code en de uitvoer: bij het stappen lees
    // je van boven naar onder wat er is, wat er nu gebeurt en wat eruit komt.
    // Enkel [stap-per-regel] heeft ze; per instructie valt er tussen twee
    // stappen te weinig te tonen.
    if (stapsoort === "regel") {
      editor.toestand = element("div", "python-toestand");
      editor.toestand.hidden = true;
      editor.toestand.setAttribute("aria-live", "polite");
      editor.toestand.setAttribute("aria-label", "Stap per regel");
      const balk = element("div", "python-toestandbalk");
      const stapknop = (naam, klasse, opschrift, actie) => {
        const gemaakt = knop(balk, "", () => { stopSpel(editor); actie(); }, naam);
        gemaakt.className = "python-stapknop " + klasse;
        gemaakt.setAttribute("aria-label", opschrift);
        gemaakt.title = opschrift;
        return gemaakt;
      };
      editor.beginknop = stapknop("naar-begin", "python-stapbegin", "Naar het begin",
        () => zetStap(editor, 0));
      editor.terugknop = stapknop("vorige-regel", "python-stapterug", "Vorige regel",
        () => stapTerug(editor));
      editor.stapknop = stapknop("volgende-regel", "python-stapvooruit", "Volgende regel",
        () => stapVooruit(editor));
      editor.eindeknop = stapknop("naar-einde", "python-stapeinde", "Naar het einde",
        () => zetStap(editor, editor.stap.instructies.length));
      // Speel en pauze delen één knop; speelOfPauzeer zet het afspelen zelf stil.
      editor.speelknop = knop(balk, "", () => speelOfPauzeer(editor), "speel-af");
      editor.speelknop.className = "python-stapknop python-stapspeel";
      editor.speelknop.setAttribute("aria-label", "Speel af");
      editor.speelknop.title = "Speel af";
      editor.rondeknop = stapknop("volgende-ronde", "python-stapronde", "Volgende ronde",
        () => { const doel = volgendeRonde(editor); if (doel !== null) zetStap(editor, doel); });
      editor.rondeknop.appendChild(rondeIcoon());
      editor.toestandkop = element("p", "python-toestandkop");
      balk.appendChild(editor.toestandkop);
      editor.toestandinhoud = element("div", "python-toestandinhoud");
      editor.toestand.append(balk, editor.toestandinhoud);
      paneel.appendChild(editor.toestand);
    }
    paneel.append(editor.resultaat, editor.stappen);
    bron.parentElement.after(paneel);
    blok.querySelectorAll(".hint").forEach((hint, index) => {
      if (hint.closest(".oplossing")) return;
      // Behoud `hint`: presentatie.js en presentatie.css gebruiken die gedeelde
      // klasse voor de globale hintkeuze in de kopbalk.
      const details = element("details", "hint python-hint");
      details.appendChild(element("summary", "", "Hint " + (index + 1)));
      while (hint.firstChild) details.appendChild(hint.firstChild);
      hint.replaceWith(details);
    });
    blok.classList.add("python-actief");
    // presentatie.js zet deze stappen op de verticale toetsen en de pijltjes.
    if (stapsgewijs) {
      blok.classList.add("python-stapblok");
      blok._codestappen = {
        kan: richting => richting > 0
          ? !editor.stap || editor.stap.index < editor.stap.instructies.length
          : Boolean(editor.stap),
        doe: richting => richting > 0 ? stapVooruit(editor) : stapTerug(editor)
      };
    }
    if (editor.voorbeeldinvoer.length) {
      blok.classList.add("python-stapblok");
      blok._codestappen = {
        kan: richting => richting > 0 && kanVoorbeeldinvoer(editor),
        doe: richting => { if (richting > 0) gebruikVoorbeeldinvoer(editor); }
      };
    }
    editors.push(editor);
  });
  knoppen();

  // Laad en initialiseer Python alvast wanneer de browser niets dringends doet.
  // Op tragere browsers blijft de normale eerste-klik-fallback beschikbaar.
  if (editors.length) {
    if ("requestIdleCallback" in window) requestIdleCallback(warmPython, { timeout: 3000 });
    else setTimeout(warmPython, 1000);
  }

  document.querySelectorAll(".python-notebook-link[data-colab]").forEach(link => {
    const repository = /^([^/]+\/[^/]+)\/(.+)$/.exec(link.dataset.colab);
    if (!repository || !/^https?:$/.test(location.protocol)) return;
    const pad = new URL(link.getAttribute("href"), location.href).pathname;
    // Bewaar de download; voeg Colab als tweede keuze toe.
    const colab = element("a", "", "Open in Colab");
    colab.href = "https://colab.research.google.com/github/" + repository[1] + "/blob/" + repository[2] + pad;
    colab.target = "_blank"; colab.rel = "noopener";
    link.after(document.createTextNode(" · "), colab);
  });
})();
