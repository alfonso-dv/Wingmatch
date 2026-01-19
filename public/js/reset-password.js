// ============================================================
// RESET PASSWORD – NEUES PASSWORT SPEICHERN
// ============================================================

// Holt den „Passwort zurücksetzen“-Button
const saveBtn = document.getElementById("saveBtn");

// Holt das Textfeld für Erfolg- oder Fehlermeldungen
const msg = document.getElementById("msg");

// ============================================================
// TOKEN AUS DER URL HOLEN
// ============================================================

// Liest die URL-Parameter (z. B. ?token=xyz)
const params = new URLSearchParams(window.location.search);

// Holt den Reset-Token aus der URL
const token = params.get("token");

// ============================================================
// BUTTON-KLICK – NEUES PASSWORT AN BACKEND SENDEN
// ============================================================

saveBtn.addEventListener("click", async () => {

    // Holt das neue Passwort und die Bestätigung
    const password = document.getElementById("password").value.trim();
    const confirm = document.getElementById("confirm").value.trim();

    // Setzt die Meldung zurück
    msg.textContent = "";
    msg.className = "text-center small";

    // ============================================================
    // VALIDIERUNG
    // ============================================================

    // Prüft, ob beide Felder ausgefüllt sind
    if (!password || !confirm) {
        msg.textContent = "Please fill in all fields.";
        msg.classList.add("text-danger");
        return;
    }

    // Prüft, ob beide Passwörter gleich sind
    if (password !== confirm) {
        msg.textContent = "Passwords do not match.";
        msg.classList.add("text-danger");
        return;
    }

    // ============================================================
    // RESET-ANFRAGE AN DAS BACKEND SENDEN
    // ============================================================

    const res = await fetch("/api/reset-password", {
        method: "POST", // sagt: „Ich sende neue Daten“
        headers: { "Content-Type": "application/json" }, // JSON-Daten
        body: JSON.stringify({ token, password }) // Token + neues Passwort
    });

    // Antwort vom Backend als JSON lesen
    const data = await res.json().catch(() => ({}));

    // ============================================================
    // ANTWORT VERARBEITEN
    // ============================================================

    // Falls ein Fehler zurückkommt
    if (!res.ok) {
        msg.textContent = data.message || "An error occurred. Please try again.";
        msg.classList.add("text-danger");
        return;
    }

    // Erfolgsmeldung anzeigen
    msg.textContent = "Password has been reset successfully. Redirecting to login...";
    msg.classList.add("text-success");

    // Nach kurzer Zeit zur Login-Seite weiterleiten
    setTimeout(() => {
        window.location.href = "/login";
    }, 1500);
});
