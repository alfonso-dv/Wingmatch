//register.js:

// ============================================================
// REGISTER – BUTTON KLICKEN UND REGISTRIEREN
// ============================================================

// Reagiert, wenn man auf den Register-Button klickt
document.getElementById("registerBtn").onclick = async () => {

    // Holt den Namen aus dem Eingabefeld und entfernt Leerzeichen außen
    const name = document.getElementById("name").value.trim();

    // Holt das Alter als Text aus dem Feld (weil Input erstmal Text ist)
    const ageValue = document.getElementById("age").value;

    // Macht aus dem Alter eine Zahl, damit man damit rechnen kann
    const age = Number(ageValue);

    // Holt das Gender aus dem Dropdown/Feld
    const gender = document.getElementById("gender").value;

    // Holt die Location und entfernt Leerzeichen außen
    const location = document.getElementById("location").value.trim();

    // Holt die E-Mail und entfernt Leerzeichen außen
    const email = document.getElementById("email").value.trim();

    // Holt das Passwort (hier wird absichtlich NICHT trim benutzt)
    // damit Leerzeichen im Passwort nicht ungewollt entfernt werden
    const password = document.getElementById("password").value;

    // Holt das Feld, wo Fehlertexte angezeigt werden
    const msg = document.getElementById("errorMsg");

// ============================================================
// REGISTER – MELDUNG ZURÜCKSETZEN
// ============================================================

    // Macht die alte Meldung leer, damit nichts Altes stehen bleibt
    msg.textContent = "";

    // Versteckt die Meldung zuerst (d-none = „nicht anzeigen“)
    msg.classList.add("d-none");

// ============================================================
// REGISTER – PRÜFEN: LEERE FELDER
// ============================================================

    // Prüft, ob irgendein Feld leer ist
    if (!name || !ageValue || !gender || !location || !email || !password) {
        // Zeigt eine Meldung, dass alles ausgefüllt werden muss
        msg.textContent = "Please fill in all fields.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – PRÜFEN: NAME DARF KEINE ZAHL ENTHALTEN
// ============================================================

    // Prüft mit einem Muster: enthält der Name irgendeine Zahl?
    if (/\d/.test(name)) {
        // Zeigt eine Meldung, dass Zahlen im Namen nicht erlaubt sind
        msg.textContent = "Name must not contain numbers.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – PRÜFEN: ALTER MINDESTENS 18
// ============================================================

    // Prüft, ob die Person jünger als 18 ist
    if (age < 18) {
        // Zeigt eine Meldung, dass man mindestens 18 sein muss
        msg.textContent = "You must be at least 18 years old.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – PRÜFEN: GENDER DARF NICHT NUR PLATZHALTER SEIN
// ============================================================

    // Prüft, ob noch der Platzhalter ausgewählt ist
    if (gender === "placeholder") {
        // Zeigt eine Meldung, dass man ein Gender auswählen muss
        msg.textContent = "Please select a gender.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – PRÜFEN: PASSWORT MINDESTLÄNGE
// ============================================================

    // Prüft, ob das Passwort zu kurz ist
    if (password.length < 6) {
        // Zeigt eine Meldung, dass das Passwort länger sein muss
        msg.textContent = "Password must be at least 6 characters.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – ANFRAGE AN DEN SERVER SCHICKEN
// ============================================================

    // Schickt die Daten an das Backend, damit ein neues Konto erstellt wird
    const res = await fetch("/api/register", {
        method: "POST", // sagt: „ich sende Daten zum Registrieren“
        headers: { "Content-Type": "application/json" }, // sagt: „die Daten sind JSON“
        body: JSON.stringify({
            // Schickt alle Werte als JSON zum Server
            name,
            age,
            gender,
            location,
            email,
            password
        })
    });

    // Holt die Antwort vom Server als JSON (z.B. message oder needsProfile)
    const data = await res.json();

// ============================================================
// REGISTER – FEHLER BEHANDELN
// ============================================================

    // Wenn der Server „nicht ok“ zurückgibt, zeigt er die Fehlermeldung
    if (!res.ok) {
        // Nimmt die Nachricht vom Server, oder nutzt einen Standard-Text
        msg.textContent = data.message || "Registration failed.";

        // Blendet die Meldung ein
        msg.classList.remove("d-none");
        return;
    }

// ============================================================
// REGISTER – ERFOLG UND WEITERLEITEN
// ============================================================

    // Wenn der Server sagt: Profil ist noch nicht fertig, geht er zu Create Profile
    if (data.needsProfile) {
        window.location.href = "/create-profile";
    } else {
        // Sonst geht er direkt zur Homepage
        window.location.href = "/index";
    }

};
