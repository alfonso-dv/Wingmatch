//login.js:

// ============================================================
// LOGIN – BUTTON KLICKEN UND ANMELDEN
// ============================================================

// Reagiert, wenn man auf den Login-Button klickt
document.getElementById("loginBtn").onclick = async () => {

    // Holt die E-Mail aus dem Eingabefeld und entfernt Leerzeichen außen
    const email = document.getElementById("email").value.trim();

    // Holt das Passwort aus dem Eingabefeld und entfernt Leerzeichen außen
    const password = document.getElementById("password").value.trim();

    // Holt das Textfeld für Meldungen (Fehler oder Erfolg)
    const msg = document.getElementById("msg");

    // Macht die Meldung zuerst leer, damit alte Texte weg sind
    msg.textContent = "";

    // Versteckt die Meldung erstmal (d-none = „nicht anzeigen“)
    msg.classList.add("d-none");

// ============================================================
// LOGIN – PRÜFEN OB FELDER AUSGEFÜLLT SIND
// ============================================================

    // Prüft: Sind E-Mail und Passwort überhaupt eingegeben?
    if (!email || !password) {
        // Zeigt eine Meldung, dass etwas fehlt
        msg.textContent = "Please fill in all fields.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

    // Prüft ganz einfach: enthält die E-Mail ein „@“?
    if (!email.includes("@")) {
        // Zeigt eine Meldung, dass die E-Mail so nicht passt
        msg.textContent = "Please enter a valid email address.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// LOGIN – ANFRAGE AN DEN SERVER SCHICKEN
// ============================================================

    // Schickt E-Mail und Passwort an das Backend, damit es prüfen kann
    const res = await fetch("/api/login", {
        method: "POST", // sagt: „ich sende Daten zum Einloggen“
        headers: { "Content-Type": "application/json" }, // sagt: „die Daten sind JSON“
        body: JSON.stringify({ email, password }) // baut die Login-Daten als JSON
    });

    // Holt die Antwort vom Backend als JSON (z. B. message oder needsProfile)
    const data = await res.json();

    // Wenn das Backend sagt „nicht ok“, zeigt er die Fehlermeldung vom Server
    if (!res.ok) {
        msg.textContent = data.message;
        msg.classList.remove("d-none");
        return;
    }

    // Wenn alles passt, zeigt er eine Erfolgsmeldung
    msg.textContent = "Login successful!";

    // Wartet kurz, damit man die Meldung sieht, und leitet dann weiter
    setTimeout(() => {

        // Wenn das Backend sagt: Profil fehlt noch, geht er zur Profil-Erstellung
        if (data.needsProfile) {
            window.location.href = "/create-profile";
        } else {
            // Sonst geht er zur Homepage
            window.location.href = "/index";
        }
    }, 700);//

};
