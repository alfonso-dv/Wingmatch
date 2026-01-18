// manage-pictures.js

// ============================================================
// MANAGE PICTURES – ELEMENTE AUS DEM HTML HOLEN
// ============================================================

// Holt den Zurück-Button (geht zurück, wenn es erlaubt ist)
const backBtn = document.getElementById("backBtn");

// Holt den X-Button (schließt das Fenster/Seite, wenn es erlaubt ist)
const closeBtn = document.getElementById("closeBtn");

// Holt den Warntext (zeigt an, wenn man nicht raus darf)
const warning = document.getElementById("warning");

// Holt das Feld für Meldungen (z.B. Erfolg/Fehler beim Ändern)
const msg = document.getElementById("msg");

// ============================================================
// MANAGE PICTURES – BILD-SLOTS (ANZEIGE DER FOTOS)
// ============================================================

// Holt das erste Bild-Element (Foto-Slot 1)
const img1 = document.getElementById("img1");

// Holt das zweite Bild-Element (Foto-Slot 2)
const img2 = document.getElementById("img2");

// ============================================================
// MANAGE PICTURES – DATEI-EINGABEN (NEUES FOTO AUSWÄHLEN)
// ============================================================

// Holt das Dateifeld für Slot 1 (hier wählt man ein neues Foto aus)
const file1 = document.getElementById("file1");

// Holt das Dateifeld für Slot 2
const file2 = document.getElementById("file2");

// ============================================================
// MANAGE PICTURES – BUTTONS ZUM ERSETZEN
// ============================================================

// Holt den Button “Replace” für Foto 1
const replace1 = document.getElementById("replace1");

// Holt den Button “Replace” für Foto 2
const replace2 = document.getElementById("replace2");

// ============================================================
// MANAGE PICTURES – BUTTONS ZUM LÖSCHEN
// ============================================================

// Holt den Button “Delete” für Foto 1
const delete1 = document.getElementById("delete1");

// Holt den Button “Delete” für Foto 2
const delete2 = document.getElementById("delete2");

// ============================================================
// MANAGE PICTURES – SPEICHER FÜR AKTUELLE FOTOS
// ============================================================

// Speichert die aktuellen Foto-Links aus der Datenbank (wird später gefüllt)
let photos = []; // aktueller DB-Stand

// ============================================================
// MANAGE PICTURES – NAVIGATION SPERREN ODER FREIGEBEN
// ============================================================

function setNavLock(locked) {
  // Wenn locked = true, dann darf man nicht zurück oder schließen
  // Das soll verhindern, dass man ohne Foto “weg” geht

  // Sperrt oder entsperrt den Zurück-Button
  backBtn.disabled = locked;

  // Sperrt oder entsperrt den X-Button
  closeBtn.disabled = locked;

  // Zeigt den Warntext an, wenn gesperrt ist
  // und versteckt den Warntext, wenn nicht gesperrt ist
  warning.style.display = locked ? "block" : "none";
}

// ============================================================
// MANAGE PICTURES – BILDER AUF DER SEITE ANZEIGEN
// ============================================================

function render() {
  // ----------------------------
  // SLOT 1 – ERSTES FOTO
  // ----------------------------

  // Setzt die Bild-Quelle auf Foto 1, oder leer wenn nichts da ist
  img1.src = photos[0] ? photos[0] : "";

  // Zeigt das Bild nur, wenn Foto 1 wirklich existiert
  img1.style.display = photos[0] ? "block" : "none";

  // ----------------------------
  // SLOT 2 – ZWEITES FOTO
  // ----------------------------

  // Setzt die Bild-Quelle auf Foto 2, oder leer wenn nichts da ist
  img2.src = photos[1] ? photos[1] : "";

  // Zeigt das Bild nur, wenn Foto 2 wirklich existiert
  img2.style.display = photos[1] ? "block" : "none";

  // ----------------------------
  // SICHERHEIT – WENN GAR KEIN FOTO DA IST
  // ----------------------------

  // Wenn wirklich 0 Fotos da wären (sollte nicht passieren),
  // sperrt er Zurück/Schließen, damit man es nicht “kaputt” macht
  setNavLock(!photos[0]);
}
// ============================================================
// MANAGE PICTURES – FOTOS VOM SERVER LADEN UND ANZEIGEN
// ============================================================

async function loadPhotos() {
  // Macht die Meldung zuerst leer, damit alte Texte weg sind
  msg.textContent = "";

  // Holt die aktuellen Fotos vom Backend
  const res = await fetch("/api/photos");

  // Wandelt die Antwort in JSON um
  const data = await res.json();

  // Prüft, ob beim Laden ein Fehler passiert ist, und zeigt dann eine Meldung
  _toggleError(res, data);

  // Speichert die Foto-Liste (oder eine leere Liste, wenn nichts da ist)
  photos = data.photos || [];

  // Aktualisiert die Anzeige der Bilder auf der Seite
  render();
}

// ============================================================
// MANAGE PICTURES – FEHLER ANZEIGEN (WENN SERVER “NICHT OK” SAGT)
// ============================================================

function _toggleError(res, data) {
  // Wenn der Server einen Fehler zurückgibt, zeigt er eine Meldung an
  if (!res.ok) {
    // Nimmt die Message vom Server, oder nutzt einen Standard-Text
    msg.textContent = data.message || "Error loading pictures.";
  }
}

// ============================================================
// MANAGE PICTURES – VORSCHAU VOM LOKALEN FOTO (BEVOR UPLOAD)
// ============================================================

function previewLocal(imgEl, fileInput) {
  // Holt die erste ausgewählte Datei aus dem Dateifeld
  const f = fileInput.files?.[0];

  // Wenn keine Datei ausgewählt ist, macht er nichts
  if (!f) return;

  // Baut eine lokale Vorschau-URL und zeigt das Bild sofort an
  imgEl.src = URL.createObjectURL(f);

  // Blendet das Bild ein, damit man es sofort sieht
  imgEl.style.display = "block";
}

// ============================================================
// MANAGE PICTURES – WENN DATEI AUSGEWÄHLT WIRD, ZEIGT ER DIE VORSCHAU
// ============================================================

// Wenn bei Slot 1 ein neues Foto gewählt wird, zeigt er die Vorschau in Bild 1
file1.addEventListener("change", () => previewLocal(img1, file1));

// Wenn bei Slot 2 ein neues Foto gewählt wird, zeigt er die Vorschau in Bild 2
file2.addEventListener("change", () => previewLocal(img2, file2));

// ============================================================
// MANAGE PICTURES – NAVIGATION (ZURÜCK / SCHLIESSEN)
// ============================================================

// Wenn man auf “Back” klickt, geht er zurück zur Profil-Seite im Edit-Modus
backBtn.addEventListener("click", () => {
  window.location.href = "/create-profile?mode=edit";
});

// Wenn man auf “X” klickt, geht er zur Homepage
closeBtn.addEventListener("click", () => {
  window.location.href = "/index";
});

// ============================================================
// MANAGE PICTURES – FOTO HOCHLADEN (SLOT 1 ODER SLOT 2)
// ============================================================

async function uploadTo(slotIndex) {
  // Macht die Meldung zuerst leer, damit alte Texte weg sind
  msg.textContent = "";

  // Wählt je nach Slot die richtige Datei aus
  // slotIndex 0 = Foto 1, slotIndex 1 = Foto 2
  const f = slotIndex === 0 ? file1.files?.[0] : file2.files?.[0];

  // Wenn keine Datei ausgewählt wurde, zeigt er eine Meldung und stoppt
  if (!f) {
    msg.textContent = "Please choose a file first.";
    return;
  }

  // Baut FormData, weil man damit Dateien an den Server schicken kann
  const fd = new FormData();

  // Legt die Datei unter dem Namen “photo” hinein (Backend erwartet das so)
  fd.append("photo", f);

  // Wählt je nach Slot den richtigen API-Endpunkt
  // Slot 1 wird “main”, Slot 2 wird “second”
  const url = slotIndex === 0 ? "/api/photos/main" : "/api/photos/second";

  // Schickt die Datei an das Backend (POST = speichern/hochladen)
  const res = await fetch(url, { method: "POST", body: fd });

  // Wandelt die Antwort in JSON um
  const data = await res.json();

  // Wenn Upload fehlschlägt, zeigt er eine Meldung und stoppt
  if (!res.ok) {
    msg.textContent = data.message || "Upload failed.";
    return;
  }

  // Wenn Upload klappt, übernimmt er die neue Foto-Liste vom Server
  // (oder lässt die alte Liste, wenn der Server nichts zurückgibt)
  photos = data.photos || photos;

  // Aktualisiert die Anzeige der Bilder
  render();

  // ============================================================
  // INPUT LEEREN (DAMIT DIE DATEI NICHT “HÄNGEN” BLEIBT)
  // ============================================================

  // Macht das Dateifeld wieder leer, nachdem hochgeladen wurde
  if (slotIndex === 0) file1.value = "";
  else file2.value = "";
}

// ============================================================
// MANAGE PICTURES – FOTO LÖSCHEN (SLOT 1 ODER SLOT 2)
// ============================================================

async function deleteSlot(slotIndex) {
  // Macht die Meldung zuerst leer, damit alte Texte weg sind
  msg.textContent = "";

  // Löscht den Slot beim Backend (DELETE = löschen)
  const res = await fetch(`/api/photos/${slotIndex}`, { method: "DELETE" });

  // Wandelt die Antwort in JSON um
  const data = await res.json();

  // Wenn Löschen fehlschlägt, zeigt er eine Meldung und stoppt
  if (!res.ok) {
    msg.textContent = data.message || "Delete failed.";
    return;
  }

  // Wenn Löschen klappt, nimmt er die neue Foto-Liste vom Server
  photos = data.photos || [];

  // Aktualisiert die Anzeige der Bilder
  render();
}

// ============================================================
// MANAGE PICTURES – BUTTONS VERBINDEN (REPLACE / DELETE)
// ============================================================

// Wenn man Replace bei Foto 1 klickt, lädt er Slot 1 hoch
replace1.addEventListener("click", () => uploadTo(0));

// Wenn man Replace bei Foto 2 klickt, lädt er Slot 2 hoch
replace2.addEventListener("click", () => uploadTo(1));

// Wenn man Delete bei Foto 1 klickt, löscht er Slot 1
delete1.addEventListener("click", () => deleteSlot(0));

// Wenn man Delete bei Foto 2 klickt, löscht er Slot 2
delete2.addEventListener("click", () => deleteSlot(1));

// ============================================================
// MANAGE PICTURES – START (BEIM LADEN DER SEITE)
// ============================================================

// Lädt sofort die Fotos, damit die Seite gleich richtig gefüllt ist
loadPhotos();
