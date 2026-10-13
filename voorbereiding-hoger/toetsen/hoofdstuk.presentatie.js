/* Presentatie 2027. Inhoud en kalender komen uit de semantische TeX-blokken.
 * Geen accounts, netwerkverzoeken of opslag van leerlinggegevens.
 */
(() => {
  "use strict";
  if (!document.querySelector(".deck-hero")) return;
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  function button(text, action, className = "deck-knop") {
    const el = node("button", className, text);
    el.type = "button";
    el.addEventListener("click", action);
    return el;
  }
  all(".deck-chips .deck-kaart").forEach((card, index) => {
    const targets = ["eerst-even-kiezen", "zet-2027-in-je-agenda", "van-fouten-naar-een-oefenplan"];
    const label = card.lastElementChild;
    const link = node("a", "", label.textContent.trim());
    link.href = "#" + targets[index]; label.replaceChildren(link);
  });
  // Dezelfde kaarten voor het klassengesprek: één kaart per groep benadrukken.
  function selecteerbareKaarten(cards) {
    cards.forEach(card => {
      card.classList.add("deck-selecteerbaar");
      const heading = card.querySelector("p");
      const title = heading.textContent.trim();
      const choice = button(title, () => {
        cards.forEach(r => r.querySelector(".deck-selectieknop").setAttribute("aria-pressed", String(r === card)));
      }, "deck-selectieknop");
      choice.setAttribute("aria-pressed", "false");
      heading.replaceChildren(choice);
      card.addEventListener("click", event => {
        if (event.target.closest("button, a, input, textarea, select, label")) return;
        const selection = window.getSelection();
        if (selection?.toString() && card.contains(selection.anchorNode)) return;
        choice.click();
      });
    });
  }
  selecteerbareKaarten(all(".deck-route"));
  all(".deck-vergelijking, .deck-duo, .deck-stappen").forEach(group => {
    selecteerbareKaarten(all(".deck-kaart", group));
  });
  // Verticale presentertoetsen benadrukken de kaarten in leesvolgorde.
  // Voorbij de eerste of laatste kaart neemt de site het bladeren over.
  document.addEventListener("pres:kaartstap", event => {
    const slide = document.querySelector(".slide.pres-actief");
    if (!slide) return;
    const choices = all(".deck-selectieknop", slide).filter(choice => choice.getClientRects().length);
    if (!choices.length) return;
    event.detail.kaarten = true;
    const current = choices.findIndex(choice => choice.getAttribute("aria-pressed") === "true");
    const next = current < 0 ? (event.detail.richting > 0 ? 0 : choices.length - 1) : current + event.detail.richting;
    if (next < 0 || next >= choices.length) return;
    event.preventDefault();
    choices.forEach(choice => choice.setAttribute("aria-pressed", "false"));
    choices[next].click();
    choices[next].closest(".deck-selecteerbaar").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  // Meerkeuze: elke keuze blijft wijzigbaar, met betekenisvolle feedback.
  all(".deck-quiz").forEach((quiz, q) => {
    const choices = all(".deck-keuze", quiz);
    choices.forEach((choice, i) => {
      const answer = choice.querySelector(".deck-antwoord");
      const feedback = choice.querySelector(".deck-feedback");
      feedback.id = `deck-feedback-${q}-${i}`;
      feedback.hidden = true;
      const status = node("span", "deck-status", choice.classList.contains("keuze-goed") ? "Juist" : "Denk nog eens na");
      feedback.prepend(status);
      const control = button("", () => {
        choices.forEach(c => {
          c.querySelector(".deck-feedback").hidden = c !== choice;
          c.querySelector("button").setAttribute("aria-expanded", String(c === choice));
        });
      }, "deck-antwoordknop");
      control.setAttribute("aria-expanded", "false");
      control.setAttribute("aria-controls", feedback.id);
      while (answer.firstChild) control.append(answer.firstChild);
      answer.replaceWith(control);
    });
    const bar = node("div", "deck-bediening");
    const reset = () => {
      choices.forEach(c => { c.querySelector(".deck-feedback").hidden = true; c.querySelector("button").setAttribute("aria-expanded", "false"); });
    };
    bar.append(button("Opnieuw", reset));
    quiz.append(bar);
    quiz.closest(".slide").addEventListener("pres:herstel", reset);
  });
  all(".deck-tijdlijn").forEach(timeline => {
    const cards = all(".deck-moment", timeline);
    selecteerbareKaarten(cards);
    const calendar = timeline.closest(".slide").querySelector(".deck-kalenders");
    if (!calendar) return;
    const yearMarker = calendar.querySelector("[data-kalenderjaar]");
    const year = Number(yearMarker.dataset.kalenderjaar);
    yearMarker.remove();
    calendar.dataset.jaar = String(year);
    const months = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus"];
    const dates = new Map(cards.map(card => [
      [...card.classList].find(c => /^datum-\d{8}$/.test(c)).slice(6),
      card.textContent.trim().replace(/\s+/g, " ")
    ]));
    calendar.setAttribute("role", "img");
    calendar.setAttribute("aria-label", "Januari tot augustus " + year + ". Gemarkeerd: " + [...dates.values()].join("; "));
    months.forEach((name, month) => {
      const panel = node("div", "deck-maand");
      panel.append(node("span", "deck-maandnaam", name));
      const grid = node("div", "deck-maanddagen");
      const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let cell = 0; cell < 42; cell++) {
        const day = cell - first + 1;
        const square = node("span", "deck-dag");
        if (day < 1 || day > days) square.classList.add("deck-dag-leeg");
        else {
          const code = String(year) + String(month + 1).padStart(2, "0") + String(day).padStart(2, "0");
          square.dataset.datum = code;
          square.title = dates.get(code) || `${day} ${name} ${year}`;
          if (dates.has(code)) square.classList.add("deck-dag-belangrijk");
        }
        grid.append(square);
      }
      panel.append(grid); calendar.append(panel);
    });
    timeline.addEventListener("click", () => {
      const selected = cards.find(card => card.querySelector("button").getAttribute("aria-pressed") === "true");
      const code = selected && [...selected.classList].find(c => /^datum-\d{8}$/.test(c)).slice(6);
      all(".deck-dag", calendar).forEach(day => day.classList.toggle("deck-dag-selectie", day.dataset.datum === code));
    });
  });
  // Checklist en actielijst blijven uitsluitend in deze tab staan.
  all(".deck-checklist, .deck-actieplan").forEach(list => {
    all(".deck-kaart", list).forEach(card => {
      const links = card.querySelector(".deck-actielinks");
      if (links) links.remove();
      const label = node("label", "deck-check");
      const input = node("input"); input.type = "checkbox";
      const content = node("span");
      while (card.firstChild) content.append(card.firstChild);
      label.append(input, content); card.append(label);
      if (links) card.append(links);
    });
  });
  const plan = document.querySelector(".deck-actieplan");
  if (plan) {
    const label = node("label", "deck-notitie", "Mijn opleiding en mijn eerste werkpunt:");
    const notes = node("textarea"); notes.rows = 3;
    label.append(notes);
    plan.after(label);
  }
  // Oefenklok op een monotone klok; pauzeert als je de slide verlaat.
  const clock = document.querySelector(".deck-oefenklok");
  if (clock) {
    const example = clock.closest(".deck-voorbeeld");
    const question = example.querySelector(".deck-vraag");
    const quiz = example.querySelector(".deck-quiz");
    question.id = "deck-timervraag";
    quiz.id = "deck-timerkeuzes";
    function showQuestion(show) {
      question.hidden = !show;
      quiz.hidden = !show;
      toggle.setAttribute("aria-expanded", String(show));
    }
    let remaining = 180000, started = null, interval = null;
    const display = node("output", "deck-klok");
    display.setAttribute("aria-label", "Resterende oefentijd");
    const notice = node("p"); notice.setAttribute("aria-live", "polite");
    const nowRemaining = () => Math.max(0, remaining - (started === null ? 0 : performance.now() - started));
    const render = () => {
      const seconds = Math.ceil(nowRemaining() / 1000);
      display.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,"0")}`;
      if (!seconds && started !== null) { pause(); notice.textContent = "Tijd om je aanpak te bespreken."; }
    };
    function pause() {
      remaining = nowRemaining(); started = null;
      clearInterval(interval); interval = null; toggle.textContent = "Start";
    }
    const toggle = button("Start", () => {
      if (started !== null) pause();
      else if (remaining > 0) { showQuestion(true); started = performance.now(); toggle.textContent = "Pauze"; interval = setInterval(render, 200); }
      render();
    });
    const bar = node("div", "deck-bediening");
    toggle.setAttribute("aria-controls", question.id + " " + quiz.id);
    const reset = () => {
      pause(); remaining = 180000; notice.textContent = "";
      showQuestion(false);
      quiz.querySelector(".deck-bediening button").click();
      render();
    };
    bar.append(display, toggle, button("Herbegin", reset));
    clock.append(bar, notice); showQuestion(false); render();
    clock.closest(".slide").addEventListener("pres:herstel", reset);
    document.addEventListener("pres:slide", () => {
      if (!clock.closest(".slide")?.classList.contains("pres-actief")) { pause(); render(); }
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { pause(); render(); } });
  }
})();
