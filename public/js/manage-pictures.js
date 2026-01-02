// public/js/manage-pictures.js

const backBtn = document.getElementById("backBtn");
const closeBtn = document.getElementById("closeBtn");
const warning = document.getElementById("warning");
const msg = document.getElementById("msg");

const img1 = document.getElementById("img1");
const img2 = document.getElementById("img2");

const file1 = document.getElementById("file1");
const file2 = document.getElementById("file2");

const replace1 = document.getElementById("replace1");
const replace2 = document.getElementById("replace2");

const delete1 = document.getElementById("delete1");
const delete2 = document.getElementById("delete2");

let photos = []; // aktueller DB-Stand

function setNavLock(locked) {
  // Wenn kein Bild vorhanden wäre (sollte durch Backend verhindert sein),
  // sperren wir Zurück/Schließen
  backBtn.disabled = locked;
  closeBtn.disabled = locked;
  warning.style.display = locked ? "block" : "none";
}

function render() {
  // Slot 1
  img1.src = photos[0] ? photos[0] : "";
  img1.style.display = photos[0] ? "block" : "none";

  // Slot 2
  img2.src = photos[1] ? photos[1] : "";
  img2.style.display = photos[1] ? "block" : "none";

  // Wenn wirklich 0 Fotos (sollte nicht passieren) -> sperren
  setNavLock(!photos[0]);
}

async function loadPhotos() {
  msg.textContent = "";
  const res = await fetch("/api/photos");
  const data = await res.json();
_toggleError(res, data);
  photos = data.photos || [];
  render();
}

function _toggleError(res, data) {
  if (!res.ok) {
    msg.textContent = data.message || "Error loading pictures.";
  }
}

function previewLocal(imgEl, fileInput) {
  const f = fileInput.files?.[0];
  if (!f) return;
  imgEl.src = URL.createObjectURL(f);
  imgEl.style.display = "block";
}

file1.addEventListener("change", () => previewLocal(img1, file1));
file2.addEventListener("change", () => previewLocal(img2, file2));

backBtn.addEventListener("click", () => {
  window.location.href = "/create-profile?mode=edit";
});

closeBtn.addEventListener("click", () => {
  window.location.href = "/index";
});

async function uploadTo(slotIndex) {
  msg.textContent = "";

  const f = slotIndex === 0 ? file1.files?.[0] : file2.files?.[0];
  if (!f) {
    msg.textContent = "Please choose a file first.";
    return;
  }

  const fd = new FormData();
  fd.append("photo", f);

  const url = slotIndex === 0 ? "/api/photos/main" : "/api/photos/second";
  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.message || "Upload failed.";
    return;
  }

  photos = data.photos || photos;
  render();

  // Input leeren
  if (slotIndex === 0) file1.value = "";
  else file2.value = "";
}

async function deleteSlot(slotIndex) {
  msg.textContent = "";

  const res = await fetch(`/api/photos/${slotIndex}`, { method: "DELETE" });
  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.message || "Delete failed.";
    return;
  }

  photos = data.photos || [];
  render();
}

replace1.addEventListener("click", () => uploadTo(0));
replace2.addEventListener("click", () => uploadTo(1));

delete1.addEventListener("click", () => deleteSlot(0));
delete2.addEventListener("click", () => deleteSlot(1));

loadPhotos();
