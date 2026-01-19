// ============================================================
// FORGOT PASSWORD – RESET-ANFRAGE SENDEN
// ============================================================

// Holt den Button zum Absenden
const resetBtn = document.getElementById("resetBtn");

// Holt das Textfeld für Rückmeldungen (Erfolg / Fehler)
const msg = document.getElementById("msg");

// ============================================================
// BUTTON-KLICK – RESET-ANFRAGE AN BACKEND SENDEN
// ============================================================

resetBtn.addEventListener("click", async () => {

    // Holt die E-Mail aus dem Eingabefeld und entfernt Leerzeichen
    const email = document.getElementById("email").value.trim();

    // Setzt die Meldung zurück
    msg.textContent = "";
    msg.className = "text-center small mb-2 d-none";

    // ============================================================
    // EINFACHE VALIDIERUNG
    // ============================================================

    // Prüft, ob eine E-Mail eingegeben wurde
    if (!email) {
        msg.textContent = "Please enter your email address.";
        msg.className = "text-center text-danger small mb-2";
        return;
    }

    // Prüft grob, ob es wie eine E-Mail aussieht
    if (!email.includes("@")) {
        msg.textContent = "Please enter a valid email address.";
        msg.className = "text-center text-danger small mb-2";
        return;
    }

    // ============================================================
    // RESET-ANFRAGE AN DAS BACKEND SENDEN
    // ============================================================

    try {
        const res = await fetch("/api/forgot-password", {
            method: "POST", // sagt: „Ich sende Daten“
            headers: { "Content-Type": "application/json" }, // JSON-Daten
            body: JSON.stringify({ email }) // schickt die E-Mail
        });

        // Versucht, die Antwort als JSON zu lesen
        const data = await res.json().catch(() => ({}));

        // ============================================================
        // ANTWORT VERARBEITEN
        // ============================================================

        // Falls das Backend einen Fehler zurückgibt
        if (!res.ok) {
            msg.textContent = data.message || "Password reset failed. Please try again.";
            msg.className = "text-center text-danger small mb-2";
            return;
        }

        // Erfolgsnachricht (gleiche Meldung für alle → Sicherheit)
        msg.textContent = "Klick below to reset your password if the email is registered.";
        msg.className = "text-center text-success small mb-2";

        // ============================================================
        // DEMO-MODUS: RESET-LINK ANZEIGEN
        // ============================================================

        // Wenn das Backend einen Reset-Link zurückschickt
        if (data.resetLink) {
            const box = document.getElementById("resetLinkBox");
            const link = document.getElementById("resetLink");

            // Setzt den Link und zeigt ihn an
            link.href = data.resetLink;
            box.classList.remove("d-none");
        }

    } catch (err) {

        // Falls ein Netzwerkfehler passiert
        msg.textContent = "Network error. Please try again later.";
        msg.className = "text-center text-danger small mb-2";
    }
});
