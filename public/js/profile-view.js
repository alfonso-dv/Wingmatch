// profile-view.js

// ============================================================
// PROFILE VIEW – TEXT SICHER ANZEIGEN (OHNE HTML AUSFÜHREN)
// ============================================================

function escapeHtml(str) {
    // Macht aus dem Wert sicherheitshalber immer einen Text
    return String(str)
        // Ersetzt & damit es nicht als HTML gelesen wird
        .replaceAll("&", "&amp;")
        // Ersetzt < damit niemand HTML-Tags einschleusen kann
        .replaceAll("<", "&lt;")
        // Ersetzt > damit niemand HTML-Tags einschleusen kann
        .replaceAll(">", "&gt;")
        // Ersetzt " damit es nicht kaputt angezeigt wird
        .replaceAll('"', "&quot;")
        // Ersetzt ' damit es nicht kaputt angezeigt wird
        .replaceAll("'", "&#039;");
}

// ============================================================
// PROFILE VIEW – FELDER EINFACH FÜLLEN (ODER STRICH ZEIGEN)
// ============================================================

function fill(id, value) {
    // Holt das Element im HTML über seine ID
    const el = document.getElementById(id);

    // Wenn es das Element nicht gibt, stoppt er
    if (!el) return;

    // Setzt den Text:
    // - wenn value da ist und nicht leer ist, zeigt er value
    // - sonst zeigt er "—"
    el.textContent = value && value.trim() ? value : "—";
}

// ============================================================
// PROFILE VIEW – USER-ID AUS DER URL HOLEN
// ============================================================

// Holt die userId aus der URL (z.B. /profile/5 -> nimmt die 5)
const userId = Number(window.location.pathname.split("/").pop());

// ============================================================
// PROFILE VIEW – PROFIL-DATEN LADEN UND ANZEIGEN
// ============================================================

async function loadProfile() {
    // Holt das Profil vom Backend für genau diese userId
    const res = await fetch(`/api/profile/${userId}`);

    // Wenn das Backend „nicht ok“ zurückgibt:
    if (!res.ok) {
        // Versucht eine Nachricht vom Backend zu holen
        const data = await res.json().catch(() => ({}));

        // Zeigt eine Warnung an (falls message da ist, sonst Standard-Text)
        alert(data.message || "Only wingmen can comment");

        // Stoppt danach, damit nichts weiter passiert
        return;
    }

    // Wandelt die Profil-Daten in JSON um
    const p = await res.json();

    // Setzt oben Name und Alter (z.B. "Anna, 24")
    document.getElementById("profileName").textContent =
        `${p.name}, ${p.age}`;

    // Setzt darunter Gender und Location (z.B. "Female • Vienna")
    document.getElementById("profileMeta").textContent =
        `${p.gender} • ${p.location}`;

    // Füllt alle Bereiche mit Text oder zeigt "—" wenn leer
    fill("profileBio", p.bio);
    fill("profileHobbies", p.hobbies);
    fill("profileZodiac", p.zodiac);
    fill("profileLookingFor", p.lookingFor);
    fill("profileExtra", p.extra);

// ============================================================
// PROFILE VIEW – FOTOS ANZEIGEN
// ============================================================

    // Holt den Foto-Container aus dem HTML
    const photos = document.getElementById("profilePhotos");

    // Baut alle Fotos als <img> Elemente zusammen und setzt sie in den Container
    photos.innerHTML = (p.photos || []).map(src =>
        `<img src="${src}" class="profile-photo">`
    ).join("");
}

// ============================================================
// PROFILE VIEW – PROMPTS (FRAGEN + ANTWORTEN) LADEN UND ANZEIGEN
// ============================================================

async function loadProfilePrompts() {
    // Holt die Prompt-Antworten vom Backend für dieses Profil
    const res = await fetch(`/api/profile/${userId}/prompts`);

    // Wenn es keine Prompts gibt, sagt er es nur in der Konsole und stoppt
    if (!res.ok) {
        console.warn("Prompts not available");
        return;
    }

    // Wandelt die Daten in JSON um
    const data = await res.json();

    // Holt den Container für Prompts aus dem HTML
    const box = document.getElementById("profilePrompts");

    // Wenn es den Container nicht gibt, stoppt er
    if (!box) return;

// ============================================================
// PROMPTS-LISTE ROBUST HOLEN (ZWEI MÖGLICHKEITEN)
// ============================================================

    // Manche Backends schicken direkt ein Array, manche schicken { prompts: [...] }
    const prompts = Array.isArray(data) ? data : data.prompts;

    // Wenn keine Prompts da sind, zeigt er nur einen Strich
    if (!prompts || prompts.length === 0) {
        box.innerHTML = "<p>—</p>";
        return;
    }

    // Baut HTML für jede Frage + Antwort zusammen und zeigt es an
    box.innerHTML = prompts.map(pr => `
        <div class="profile-section">
            <h4>${escapeHtml(pr.prompt_text)}</h4>
            <div class="profile-box">
                ${escapeHtml(pr.answer || "—")}
            </div>
        </div>
    `).join("");
}

// ============================================================
// PROFILE VIEW – WINGMAN-KOMMENTARE LADEN UND ANZEIGEN
// ============================================================

// MUST-RQ 13: Kommentare laden
async function loadProfileComments() {
    // Holt alle Kommentare zu diesem Profil vom Backend
    const res = await fetch(`/api/profile/${userId}/comments`);

    // Wenn das Laden fehlschlägt, schreibt er nur einen Fehler in die Konsole
    if (!res.ok) {
        console.error("Failed to load comments");
        return;
    }

    // Wandelt die Antwort in JSON um
    const data = await res.json();

// ============================================================
// WICHTIG – KOMMENTAR-LISTE RICHTIG HOLEN
// ============================================================

    // Manche Backends schicken direkt ein Array, manche schicken { comments: [...] }
    const comments = Array.isArray(data) ? data : data.comments;

    // Holt die Liste im HTML, wo die Kommentare hineinkommen
    const list = document.getElementById("wingmanCommentsList");

    // Holt den Text, der angezeigt wird, wenn es noch keine Kommentare gibt
    const empty = document.getElementById("noWingmanComments");

    // Löscht zuerst die alte Anzeige, damit nichts doppelt wird
    list.innerHTML = "";

    // Wenn keine Kommentare da sind, zeigt er den „leer“-Text an und stoppt
    if (!comments || comments.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    // Wenn Kommentare da sind, versteckt er den „leer“-Text
    empty.classList.add("hidden");

    // Geht alle Kommentare durch und baut die Anzeige
    comments.forEach(c => {
        // Erstellt einen neuen Block für einen Kommentar
        const div = document.createElement("div");

        // Gibt dem Block eine CSS-Klasse, damit er schön aussieht
        div.className = "wingman-comment";

        // Baut den Kommentar-Text als HTML hinein
        // escapeHtml macht den Text sicher, damit kein HTML eingeschleust wird
        // MUST-RQ 14: c.canDelete --> Delete Button
        div.innerHTML = `
            <p>${escapeHtml(c.text)}</p>
            ${c.canDelete ? `<button class="delete-comment" data-id="${c.id}">Delete</button>` : ""}
        `;

        // Fügt den Kommentar-Block in die Liste ein
        list.appendChild(div);
    });

// ============================================================
// DELETE BUTTONS – KOMMENTAR LÖSCHEN (NUR WENN ERLAUBT)
// ============================================================

    // Sucht alle Delete-Buttons und macht sie klickbar
    document.querySelectorAll(".delete-comment").forEach(btn => {
        btn.addEventListener("click", async () => {

            // Schickt eine DELETE-Anfrage an das Backend mit der Kommentar-ID
            // MUST RQ-14: Delete Request
            await fetch(`/api/profile/comments/${btn.dataset.id}`, {
                method: "DELETE"
            });

            // Lädt die Kommentare danach neu, damit der gelöschte weg ist
            loadProfileComments();
        });
    });
}


// ============================================================
// PROFILE VIEW – PRÜFEN, OB DIE PERSON EIN WINGMAN IST
// ============================================================

async function checkIfWingman() {
    // Fragt das Backend: ist der aktuelle User ein Wingman von diesem Profil?
    // MUST-RQ 12
    const res = await fetch(`/api/profile/${userId}/is-wingman`);

    // Wenn die Anfrage fehlschlägt, sagt er “nein”
    if (!res.ok) return false;

    // Wandelt die Antwort in JSON um
    const data = await res.json();

    // Gibt true zurück, wenn das Backend es bestätigt
    return data.isWingman === true;
}


// ============================================================
// PROFILE VIEW – KOMMENTAR-BOX ZEIGEN (NUR FÜR WINGMEN)
// ============================================================

async function setupWingmanCommentBox() {
    // Holt die Kommentar-Box aus dem HTML
    const box = document.getElementById("wingmanCommentBox");

    // Wenn es die Box nicht gibt, stoppt er
    if (!box) return;

// ============================================================
// REGEL – KEIN KOMMENTAR AUF EIGENEM PROFIL
// ============================================================

    // Wenn das Profil dem eigenen User gehört, versteckt er die Box
    if (window.currentUserId === userId) {
        box.classList.add("hidden");
        return;
    }

    // Prüft, ob die Person ein Wingman ist
    // MUST-RQ 12
    const isWingman = await checkIfWingman();

    // Wenn die Person kein Wingman ist, versteckt er die Box
    if (!isWingman) {
        box.classList.add("hidden");
        return;
    }

    // Wenn die Person ein Wingman ist, zeigt er die Box
    box.classList.remove("hidden");

// ============================================================
// KOMMENTAR ABSENDEN – POST AN BACKEND
// ============================================================

    // Macht den Post-Button klickbar
    document.getElementById("postWingmanComment")
        .addEventListener("click", async () => {

            // Holt den Text aus dem Textfeld und macht ihn “sauber”
            const text = document.getElementById("wingmanCommentText").value.trim();

            // Wenn der Text leer ist, macht er nichts
            if (!text) return;

            // Schickt den Kommentar ans Backend, damit er gespeichert wird
            // MUST-RQ 12: Kommmentar wird gepostet und gespeichert
            const res = await fetch(`/api/profile/${userId}/comments`, {
                method: "POST", // sagt: „ich speichere einen Kommentar“
                headers: { "Content-Type": "application/json" }, // sagt: „ich schicke JSON“
                body: JSON.stringify({ comment: text }) // schickt den Kommentar-Text
            });

            // Wenn das Speichern fehlschlägt, zeigt er eine Warnung
            if (!res.ok) {
                alert("Only wingmen can comment");
                return;
            }

            // Macht das Textfeld wieder leer
            document.getElementById("wingmanCommentText").value = "";

            // Lädt Kommentare neu, damit der neue Kommentar sofort sichtbar ist
            loadProfileComments();
        });
}


// ============================================================
// START - WENN SEITE FERTIG GELADEN IST
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Lädt Profil-Daten (Name, Alter, Fotos, usw.)
    await loadProfile();

    // Lädt Prompt-Fragen und Antworten
    await loadProfilePrompts();

    // Lädt Wingman-Kommentare
    await loadProfileComments();

    // Prüft, ob die Kommentar-Box angezeigt werden darf und richtet sie ein
    await setupWingmanCommentBox();
});
