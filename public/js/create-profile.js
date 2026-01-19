//create-profile.js
//create-profile.js

// ============================================================
// CREATE PROFILE – GRUND-ELEMENTE AUS HTML HOLEN
// ============================================================

// Holt das Profil-Formular aus dem HTML (damit später Werte gelesen/gespeichert werden können)
const form = document.getElementById("profileForm");

// Holt das Ergebnis-Feld aus dem HTML (hier zeigt die Seite später Erfolg/Fehler an)
const result = document.getElementById("result");

// ============================================================
// CREATE PROFILE – BUTTONS & TEXTE (OBEN IM FORMULAR)
// ============================================================

// Holt den Skip-Button (wird beim Onboarding benutzt, damit man überspringen kann)
const skipBtn = document.getElementById("skipBtn");

// Holt den X-Button (wird im Bearbeiten-Modus benutzt, um zurück zur Startseite zu gehen)
const closeBtn = document.getElementById("closeBtn");

// Holt den My-Pictures-Button (öffnet später die Seite für Bilder verwalten)
const managePics = document.getElementById("managePics");

// Holt den kleinen Hilfstext (wird je nach Modus angezeigt oder versteckt)
const helperText = document.getElementById("helperText");

// ============================================================
// CREATE PROFILE – MODUS ERKENNEN (ONBOARDING ODER BEARBEITEN)
// ============================================================

// Liest Parameter aus der URL (z.B. ?mode=edit oder ?userId=123)
const params = new URLSearchParams(window.location.search);

// Liest userId aus der URL, macht daraus eine Zahl und nutzt sonst null
const profileUserId = Number(params.get("userId")) || null;

// Prüft, ob in der URL mode=edit steht (true = Bearbeiten, false = Onboarding)
const isEditMode = params.get("mode") === "edit";

// ============================================================
// CREATE PROFILE – UI ANPASSEN (OHNE ONBOARDING ZU ZERSTÖREN)
// ============================================================

// Wenn Bearbeiten-Modus aktiv ist:
if (isEditMode) {
  // Homepage edit: zeigt X, versteckt Skip, löscht Hilfstext, zeigt My Pictures

  // Versteckt den Skip-Button, weil man beim Bearbeiten nicht "überspringen" soll
  if (skipBtn) skipBtn.style.display = "none";

  // Zeigt den X-Button, damit man zurück zur Homepage kann
  if (closeBtn) closeBtn.style.display = "block";

  // Macht den Hilfstext leer, damit es sauber aussieht
  if (helperText) helperText.textContent = "";

  // Zeigt den My-Pictures-Button, damit man Bilder verwalten kann
  if (managePics) managePics.style.display = "block";
} else {
  // Onboarding/register: behält Skip + Hilfstext, versteckt X + My Pictures

  // Zeigt den Skip-Button, damit man beim Onboarding überspringen kann
  if (skipBtn) skipBtn.style.display = "block";

  // Versteckt den X-Button, weil man beim Onboarding nicht "schließen" soll
  if (closeBtn) closeBtn.style.display = "none";

  // helperText bleibt wie im HTML (wird hier absichtlich nicht geändert)

  // Versteckt My Pictures, weil das beim Onboarding noch nicht gebraucht wird
  if (managePics) managePics.style.display = "none";
}

// Holt den Bereich für Wingman-Kommentare aus dem HTML (kann später ein-/ausgeblendet werden)
const commentsSection = document.getElementById("wingmanCommentsSection");

// Wenn NICHT edit-mode und eine userId vorhanden ist, dann zeigt er den Kommentar-Bereich an
// (das ist für den Fall: man schaut ein Profil an und will die Wingman-Kommentare sehen)
if (!isEditMode && profileUserId) {
  commentsSection?.classList.remove("hidden");
}

// ============================================================
// CREATE PROFILE – X BUTTON (ZURÜCK ZUR HOMEPAGE)
// ============================================================

// Wenn es den X-Button gibt, setzt er einen Klick-Listener drauf
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    // Schickt die Person zurück zur Homepage
    window.location.href = "/index";
  });
}

// ============================================================
// CREATE PROFILE – MY PICTURES BUTTON (BILDER VERWALTEN)
// ============================================================

// Wenn es den My-Pictures-Button gibt, setzt er einen Klick-Listener drauf
if (managePics) {
  managePics.addEventListener("click", () => {
    // Öffnet die Seite, wo man Bilder verwalten/ersetzen/löschen kann
    window.location.href = "/manage-pictures";
  });
}

// ============================================================
// CREATE PROFILE – DISCOVERY EINSTELLUNGEN (ALTERSBEREICH)
// ============================================================

// Holt den Slider/Input für Mindestalter
const prefAgeMin = document.getElementById("prefAgeMin");

// Holt den Slider/Input für Höchstalter
const prefAgeMax = document.getElementById("prefAgeMax");

// Holt das Label, das den Bereich als Text zeigt (z.B. "18 - 35")
const ageRangeLabel = document.getElementById("ageRangeLabel");

// Aktualisiert den Text, damit immer der aktuelle Bereich angezeigt wird
function updateAgeLabel() {
  // Baut den Text aus beiden Werten zusammen (Min - Max)
  ageRangeLabel.textContent = `${prefAgeMin.value} - ${prefAgeMax.value}`;
}

// Wenn jemand am Mindestalter zieht, aktualisiert er die Anzeige sofort
prefAgeMin.addEventListener("input", updateAgeLabel);

// Wenn jemand am Höchstalter zieht, aktualisiert er die Anzeige sofort
prefAgeMax.addEventListener("input", updateAgeLabel);

// Setzt die Anzeige einmal am Anfang, damit gleich ein Wert da steht
updateAgeLabel();

// ============================================================
// CREATE PROFILE – FEEDBACK (FEHLER ODER ERFOLG ANZEIGEN)
// ============================================================

// Zeigt eine Fehlermeldung an
function showError(msg) {
  // Schreibt die Meldung in das Ergebnis-Feld
  result.textContent = msg;

  // Gibt dem Feld ein rotes Styling (Bootstrap-Klassen)
  result.className = "text-danger fw-bold small";
}

// Zeigt eine Erfolgsmeldung an
function showSuccess(msg) {
  // Schreibt die Meldung in das Ergebnis-Feld
  result.textContent = msg;

  // Gibt dem Feld ein grünes Styling (Bootstrap-Klassen)
  result.className = "text-success fw-bold small";
}

// ============================================================
// CREATE PROFILE – PREFILL (FORMULAR VORAB AUSFÜLLEN)
// ============================================================

// Lädt die Profil-Daten vom Server und setzt sie in die Felder im Formular
async function prefillProfileForm() {
  // Fragt das Profil vom Backend ab (API-Endpunkt)
  const res = await fetch("/api/profile");

  // Wenn etwas schiefgeht, bricht er ab
  if (!res.ok) return;

  if (promptAnswers.length > 0) {
    const resPrompts = await fetch("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promptAnswers)
    });

    if (!resPrompts.ok) {
      showError("Saving prompt answers failed.");
      return;
    }
  }
  // Wandelt die Antwort in JSON um
  const d = await res.json();

  // Setzt die normalen Profil-Felder (oder leer, wenn nichts da ist)
  document.getElementById("name").value = d.name || "";
  document.getElementById("age").value = d.age || "";
  document.getElementById("location").value = d.location || "";
  document.getElementById("bio").value = d.bio || "";
  document.getElementById("hobbies").value = d.hobbies || "";

  // Setzt das Dropdown/Feld für Gender
  document.getElementById("gender").value = d.gender || "";

  // Setzt die neuen optionalen Felder (Sternzeichen, Suche, Extra)
  document.getElementById("zodiac").value = d.zodiac || "";
  document.getElementById("lookingFor").value = d.lookingFor || "";
  document.getElementById("extra").value = d.extra || "";

  // Setzt Discovery-Einstellungen (Interesse + Altersbereich)
  document.getElementById("interestedIn").value = d.interestedIn || "";
  document.getElementById("prefAgeMin").value = d.prefAgeMin ?? 18;
  document.getElementById("prefAgeMax").value = d.prefAgeMax ?? 100;

  // Setzt das Text-Label für den Bereich (damit es sofort passt)
  const label = document.getElementById("ageRangeLabel");
  if (label) label.textContent = `${d.prefAgeMin ?? 18} - ${d.prefAgeMax ?? 100}`;
}

// ============================================================
// CREATE PROFILE – PROMPTS LADEN (NUR UI)
// ============================================================

// Holt Fragen/Prompts vom Backend und baut daraus Eingabefelder im Formular
async function loadPrompts() {
  // Fragt die Prompts vom Backend ab
  const res = await fetch("/api/prompts");

  // Wenn etwas schiefgeht, bricht er ab
  if (!res.ok) return;

  // Wandelt die Antwort in JSON um (Liste mit Prompts)
  const prompts = await res.json();

  // Holt den Container, wo die Prompts rein sollen
  const container = document.getElementById("promptsContainer");

  // Wenn es den Container nicht gibt, bricht er ab
  if (!container) return;

  // Löscht zuerst alles, damit nichts doppelt ist
  container.innerHTML = "";

  // Geht jeden Prompt durch und baut HTML dafür
  prompts.forEach(p => {
    // Erstellt ein Wrapper-DIV für einen Prompt
    const wrapper = document.createElement("div");

    // Gibt dem Wrapper Abstand nach unten
    wrapper.className = "mb-3";

    // Baut Label + Textarea zusammen
    // p.question = Frage-Text
    // data-prompt-id = merkt sich, welcher Prompt das ist
    wrapper.innerHTML = `
      <label class="form-label fw-bold">${p.question}</label>
      <textarea
        class="form-control prompt-answer"
        data-prompt-id="${p.id}"
        rows="2"></textarea>
    `;

    // Fügt den Prompt-Block in den Container ein
    container.appendChild(wrapper);
  });
}

// ============================================================
// CREATE PROFILE – KOMMENTARE ZU EINEM PROFIL LADEN
// ============================================================

// Lädt Wingman-Kommentare für ein bestimmtes Profil (wenn userId vorhanden ist)
async function loadProfileComments() {
  // Wenn keine userId da ist, macht er nichts
  if (!profileUserId) return;

  // Holt Kommentare vom Backend (für das Profil mit dieser userId)
  const res = await fetch(`/api/profile/${profileUserId}/comments`);

  // Wenn etwas schiefgeht, macht er nichts
  if (!res.ok) return;

  // Wandelt die Antwort in JSON um
  const data = await res.json();

  // Holt die Liste im HTML, wo die Kommentare angezeigt werden
  const list = document.getElementById("profileCommentsList");

  // Wenn es die Liste nicht gibt, macht er nichts
  if (!list) return;

  // Setzt die Liste neu (damit es nicht doppelt wird)
  list.innerHTML = data.comments.length
      // Wenn es Kommentare gibt: baut eine Liste daraus
      ? data.comments.map(c => `
        <li class="mb-2">
          <b>${escapeHtml(c.name)}</b>: ${escapeHtml(c.comment)}
        </li>
      `).join("")
      // Wenn es keine Kommentare gibt: zeigt einen Text an
      : `<li class="text-muted">No wingman comments yet.</li>`;
}

// ============================================================
// CREATE PROFILE – PRÜFT, OB DIE PERSON EIN WINGMAN IST
// ============================================================

// Prüft: ist das Profil (profileUserId) in meiner Wingmen-Liste?
async function checkIfWingman() {
  // Wenn keine userId da ist, sagt er sofort „nein“
  if (!profileUserId) return false;

  // Holt die eigene Wingmen-Liste vom Backend
  const res = await fetch("/api/wingmen");

  // Wenn etwas schiefgeht, sagt er „nein“
  if (!res.ok) return false;

  // Wandelt die Antwort in JSON um
  const data = await res.json();

  // Prüft, ob die userId in der Wingmen-Liste vorkommt
  return data.wingmen.some(w => w.id === profileUserId);
}

// ============================================================
// WINGMAN KOMMENTAR-BOX – NUR WINGMEN DÜRFEN KOMMENTIEREN
// ============================================================

async function setupWingmanCommentBox() {
  // Holt die komplette Kommentar-Box (damit man sie später einblenden kann)
  const box = document.getElementById("wingmanCommentBox");

  // Holt den Button zum Absenden des Kommentars
  const btn = document.getElementById("postWingmanComment");

  // Holt das Textfeld, wo der Kommentar hineingeschrieben wird
  const textarea = document.getElementById("wingmanCommentText");

  // Wenn eines der Elemente fehlt, stoppt er sofort (damit nichts kaputt geht)
  if (!box || !btn || !textarea) return;

  // Prüft beim Backend: ist die Person wirklich ein Wingman von diesem Profil?
  const isWingman = await checkIfWingman();

  // Wenn die Person kein Wingman ist, stoppt er (dann bleibt die Box unsichtbar)
  if (!isWingman) return;

  // Wenn die Person ein Wingman ist, zeigt er die Kommentar-Box an
  box.classList.remove("hidden");

  // Reagiert, wenn man auf "Post" / "Kommentieren" klickt
  btn.addEventListener("click", async () => {

    // Holt den Text aus dem Textfeld und entfernt vorne/hinten Leerzeichen
    const text = textarea.value.trim();

    // Wenn der Text leer ist, macht er nichts (kein leerer Kommentar)
    if (!text) return;

    // Sendet den Kommentar an das Backend (POST) für genau dieses Profil (profileUserId)
    const res = await fetch(`/api/profile/${profileUserId}/comments`, {
      method: "POST", // sagt: „ich will etwas speichern“
      headers: { "Content-Type": "application/json" }, // sagt: „ich schicke JSON“
      body: JSON.stringify({ comment: text }) // schickt den Kommentar-Text im JSON
    });

    // Wenn das Backend "nicht ok" zurückgibt, zeigt er eine Warnung
    if (!res.ok) {
      alert("Only wingmen can comment");
      return;
    }

    // Macht das Textfeld wieder leer, nachdem der Kommentar gespeichert wurde
    textarea.value = "";

    // Lädt die Kommentare neu, damit der neue Kommentar sofort sichtbar ist
    loadProfileComments();
  });
}

// ============================================================
// PROMPT-ANTWORTEN LADEN – TEXTFELDER AUTOMATISCH AUSFÜLLEN
// ============================================================

async function loadPromptAnswers() {
  // Holt alle gespeicherten Prompt-Antworten vom Backend
  const res = await fetch("/api/prompts/answers");

  // Wenn etwas schiefgeht, stoppt er
  if (!res.ok) return;

  // Wandelt die Antwort in JSON um (Liste mit Antworten)
  const answers = await res.json();

  // Geht jede gespeicherte Antwort durch
  answers.forEach(a => {

    // Sucht das passende Textfeld, das genau zu dieser Prompt-ID gehört
    const textarea = document.querySelector(
        `.prompt-answer[data-prompt-id="${a.prompt_id}"]`
    );

    // Wenn das Textfeld gefunden wird, setzt er die gespeicherte Antwort hinein
    if (textarea) {
      textarea.value = a.answer;
    }
  });
}



/* -------------------------
   DOM READY
-------------------------- */
// ============================================================
// START – WENN DIE SEITE FERTIG GELADEN IST
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Schreibt in die Konsole: Seite ist geladen (nur für Entwickler)
  console.log("✅ DOM loaded");

  // Füllt das Formular mit vorhandenen Profil-Daten (wenn es welche gibt)
  await prefillProfileForm();

  // Lädt die Prompts (Fragen) und baut dafür Textfelder im Formular
  await loadPrompts();
  console.log("✅ loadPrompts finished");

  // Lädt die gespeicherten Antworten zu den Prompts und setzt sie in die Textfelder
  await loadPromptAnswers();
  console.log("✅ loadPromptAnswers finished");
});

// ============================================================
// CLEAR BUTTONS – FELDER LEER MACHEN
// ============================================================

// Sucht alle Buttons mit der Klasse "clear-btn" und macht sie klickbar
document.querySelectorAll(".clear-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // Holt aus dem Button: welches Feld soll geleert werden (data-target)
    const target = document.getElementById(btn.dataset.target);

    // Wenn das Feld existiert, macht er es leer
    if (target) target.value = "";
  });
});

/* const toggleBtn = document.getElementById("togglePromptsBtn");
 const promptsContainer = document.getElementById("promptsContainer");

 if (toggleBtn && promptsContainer) {
   toggleBtn.addEventListener("click", () => {
     promptsContainer.classList.toggle("d-none");
     toggleBtn.textContent =
         promptsContainer.classList.contains("d-none")
             ? "Tell us more about yourself ▼"
             : "Tell us more about yourself ▲";
   });
 }

 document.querySelectorAll(".clear-btn").forEach(btn => {
   btn.addEventListener("click", () => {
     const targetId = btn.dataset.target;
     const field = document.getElementById(targetId);
     if (field) field.value = "";
   });
 });
});
*/
// ============================================================
// SKIP – ONBOARDING ÜBERSPRINGEN
// ============================================================

/* -------------------------
   SKIP
-------------------------- */
skipBtn.onclick = async () => {

  // Sagt dem Backend: Profil wurde übersprungen (damit es intern gemerkt wird)
  await fetch("/api/profile/skip", { method: "POST" });

  // Schickt die Person zur Foto-Upload-Seite
  location.href = "/upload-photo";
};

// ============================================================
// SUBMIT – PROFIL SPEICHERN
// ============================================================

/* -------------------------
   SUBMIT
-------------------------- */
form.onsubmit = async (e) => {
  // Verhindert das normale Neuladen der Seite beim Absenden
  e.preventDefault();

  // Baut ein Profil-Objekt aus allen Eingabefeldern
  const profile = {
    // Holt Name und macht ihn “sauber” (trim entfernt Leerzeichen außen)
    name: document.getElementById("name").value.trim(),

    // Holt Alter und macht daraus eine Zahl
    age: Number(document.getElementById("age").value),

    // Holt Gender aus dem Feld
    gender: document.getElementById("gender").value,

    // Holt Location und macht sie “sauber”
    location: document.getElementById("location").value.trim(),

    // Holt Bio und macht sie “sauber”
    bio: document.getElementById("bio").value.trim(),

    // Holt Hobbies und macht sie “sauber”
    hobbies: document.getElementById("hobbies").value.trim(),

    // Holt Sternzeichen (optional)
    zodiac: document.getElementById("zodiac").value.trim(),

    // Holt “Ich suche …” (optional)
    lookingFor: document.getElementById("lookingFor").value.trim(),

    // Holt Extra (optional)
    extra: document.getElementById("extra").value.trim(),

    // Holt Interesse (z.B. Men/Women/All)
    interestedIn: document.getElementById("interestedIn").value,

    // Holt Mindestalter und macht daraus eine Zahl
    prefAgeMin: Number(document.getElementById("prefAgeMin").value),

    // Holt Höchstalter und macht daraus eine Zahl
    prefAgeMax: Number(document.getElementById("prefAgeMax").value)
  };

  // Prüft die wichtigsten Pflichtfelder (Name, Gender, Alter >= 18, Location)
  if (!profile.name || !profile.gender || profile.age < 18 || !profile.location) {
    // Zeigt eine Fehlermeldung, wenn etwas fehlt oder falsch ist
    showError("Please fill required fields correctly.");
    return;
  }

  // ============================================================
// PROMPT-ANTWORTEN AUS DEM FORMULAR SAMMELN
// ============================================================

  const promptAnswers = [];

  document.querySelectorAll(".prompt-answer").forEach(t => {
    const answer = t.value.trim();
    const promptId = t.dataset.promptId;

    if (answer && promptId) {
      promptAnswers.push({
        promptId: Number(promptId),
        answer
      });
    }
  });

  // Sendet das Profil an das Backend zum Speichern
  const res = await fetch("/api/profile", {
    method: "POST", // sagt: „ich speichere Daten“
    headers: { "Content-Type": "application/json" }, // sagt: „ich schicke JSON“
    body: JSON.stringify(profile) // schickt das Profil als JSON
  });

  // Wenn Speichern fehlschlägt, zeigt er eine Fehlermeldung
  if (!res.ok) {
    showError("Save failed.");
    return;
  }

  // Zeigt Erfolg an
  showSuccess("Profile saved!");

  // Wartet kurz und geht dann zurück zur Homepage
  setTimeout(() => location.href = "/index", 300);

  // Wenn man NICHT im Edit-Modus ist und eine userId vorhanden ist:
  // dann lädt er Kommentare und zeigt die Wingman-Kommentar-Box (wenn erlaubt)
  if (!isEditMode && profileUserId) {
    await loadProfileComments();
    await setupWingmanCommentBox();
  }

};



