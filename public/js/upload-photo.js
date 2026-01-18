// upload-photo.js

// ============================================================
// UPLOAD PHOTO – ELEMENTE AUS DEM HTML HOLEN
// ============================================================

// Holt das Dateifeld für Foto 1 (hier wählt man das erste Bild aus)
const photoInput1 = document.getElementById("photoInput1");

// Holt das Dateifeld für Foto 2 (hier wählt man das zweite Bild aus)
const photoInput2 = document.getElementById("photoInput2");

// Holt den Upload-Button (startet später den Upload zum Server)
const uploadBtn = document.getElementById("uploadBtn");

// Holt das Meldungsfeld (zeigt Fehler oder Erfolg an)
const msg = document.getElementById("msg");

// ============================================================
// UPLOAD PHOTO – VORSCHAU-BILDER AUS DEM HTML HOLEN
// ============================================================

// Holt die Vorschau für Foto 1 (zeigt das ausgewählte Bild sofort an)
const preview1 = document.getElementById("preview1");

// Holt die Vorschau für Foto 2
const preview2 = document.getElementById("preview2");

// ============================================================
// UPLOAD PHOTO – CROP TOGGLE (ANSICHT DES BILDES)
// ============================================================

// Holt den Toggle/Schalter, der „croppen“ steuert (cover vs contain)
const cropToggle = document.getElementById("cropToggle");

// ============================================================
// UPLOAD PHOTO – HILFSFUNKTION: VORSCHAU SETZEN
// ============================================================

// Setzt die Vorschau für ein Bild (zeigt es an oder versteckt es)
function setPreview(previewEl, file) {

  // Wenn keine Datei da ist, versteckt er das Vorschau-Bild
  if (!file) {
    previewEl.style.display = "none";
    previewEl.src = "";
    return;
  }

  // Baut eine lokale Vorschau-URL (damit man das Bild sofort sieht)
  previewEl.src = URL.createObjectURL(file);

  // Zeigt das Vorschau-Bild an
  previewEl.style.display = "block";
}

// ============================================================
// UPLOAD PHOTO – EVENTS: WENN MAN EIN FOTO AUSWÄHLT
// ============================================================

// Wenn Foto 1 geändert wird (neues Bild ausgewählt)
photoInput1.addEventListener("change", () => {

  // Macht die Meldung leer, damit alte Fehler weg sind
  msg.textContent = "";

  // Zeigt die Vorschau für Foto 1
  setPreview(preview1, photoInput1.files?.[0]);
});

// Wenn Foto 2 geändert wird
photoInput2.addEventListener("change", () => {

  // Macht die Meldung leer, damit alte Fehler weg sind
  msg.textContent = "";

  // Zeigt die Vorschau für Foto 2
  setPreview(preview2, photoInput2.files?.[0]);
});

// ============================================================
// UPLOAD PHOTO – OPTIONAL: CROP TOGGLE (COVER ODER CONTAIN)
// ============================================================

// Stellt ein, wie das Bild in der Vorschau angezeigt wird
function applyCropMode() {

  // Wenn der Toggle aktiv ist: cover (füllt den Rahmen aus, kann abschneiden)
  // Wenn der Toggle aus ist: contain (zeigt ganzes Bild, kann Rand lassen)
  const mode = cropToggle.checked ? "cover" : "contain";

  // Setzt den Modus für beide Vorschau-Bilder
  preview1.style.objectFit = mode;
  preview2.style.objectFit = mode;
}

// Wenn der Toggle geändert wird, setzt er den Modus neu
cropToggle.addEventListener("change", applyCropMode);

// Setzt den Modus einmal am Anfang, damit es sofort richtig aussieht
applyCropMode();

// ============================================================
// UPLOAD PHOTO – UPLOAD BUTTON (STARTET SPÄTER DEN UPLOAD)
// ============================================================

// Reagiert, wenn man auf Upload klickt
uploadBtn.addEventListener("click", async () => {

  // Macht die Meldung leer, damit alte Texte weg sind
  msg.textContent = "";

  // Holt ausgewählten Dateien aus beiden Feldern:
  const file1 = photoInput1.files?.[0];
  const file2 = photoInput2.files?.[0];


// ============================================================
// UPLOAD PHOTO – REGEL: BILD 1 IST PFLICHT
// ============================================================

  // Wenn Bild 1 nicht ausgewählt ist, stoppt er sofort
  if (!file1) {
    // Zeigt eine Meldung, dass man zuerst Bild 1 wählen muss
    msg.textContent = "Please choose Picture 1 first.";
    return;
  }

// ============================================================
// UPLOAD PHOTO – UPLOAD VERSUCH (MIT FEHLER-SCHUTZ)
// ============================================================

  try {
// ============================================================
// 1) MAIN FOTO HOCHLADEN (BILD 1)
// ============================================================

    // Baut FormData, weil man damit Dateien an den Server schicken kann
    const fd1 = new FormData();

    // Legt die Datei unter dem Namen “photo” hinein (Backend erwartet das so)
    fd1.append("photo", file1);

    // Schickt Bild 1 an das Backend (main = erstes Pflichtfoto)
    const res1 = await fetch("/api/photos/main", { method: "POST", body: fd1 });

    // Liest die Antwort vom Server als JSON
    const data1 = await res1.json();

    // Wenn der Upload fehlschlägt, zeigt er eine Meldung und stoppt
    if (!res1.ok) {
      msg.textContent = data1.message || "Upload Picture 1 failed.";
      return;
    }

// ============================================================
// 2) OPTIONAL: SECOND FOTO HOCHLADEN (BILD 2)
// ============================================================

    // Wenn Bild 2 ausgewählt wurde, lädt er es zusätzlich hoch
    if (file2) {
      // Baut FormData für Bild 2
      const fd2 = new FormData();

      // Legt die Datei unter dem Namen “photo” hinein
      fd2.append("photo", file2);

      // Schickt Bild 2 an das Backend (second = zweites optionales Foto)
      const res2 = await fetch("/api/photos/second", { method: "POST", body: fd2 });

      // Liest die Antwort vom Server als JSON
      const data2 = await res2.json();

      // Wenn der Upload von Bild 2 fehlschlägt, zeigt er eine Meldung und stoppt
      if (!res2.ok) {
        msg.textContent = data2.message || "Upload Picture 2 failed.";
        return;
      }
    }

// ============================================================
// WEITERLEITUNG – NACHDEM ALLES FERTIG IST
// ============================================================

    // Wenn Upload erfolgreich war, schickt er die Person zur Homepage
    window.location.href = "/index";

  } catch (e) {
    // Wenn z.B. Internet weg ist oder der Server nicht erreichbar ist:
    msg.textContent = "Network error.";
  }
});


