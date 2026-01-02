// public/js/upload-photo.js

const photoInput1 = document.getElementById("photoInput1");
const photoInput2 = document.getElementById("photoInput2");
const uploadBtn = document.getElementById("uploadBtn");
const msg = document.getElementById("msg");

const preview1 = document.getElementById("preview1");
const preview2 = document.getElementById("preview2");

const cropToggle = document.getElementById("cropToggle");

// Helper: Preview setzen
function setPreview(previewEl, file) {
  if (!file) {
    previewEl.style.display = "none";
    previewEl.src = "";
    return;
  }
  previewEl.src = URL.createObjectURL(file);
  previewEl.style.display = "block";
}

// Preview Events
photoInput1.addEventListener("change", () => {
  msg.textContent = "";
  setPreview(preview1, photoInput1.files?.[0]);
});

photoInput2.addEventListener("change", () => {
  msg.textContent = "";
  setPreview(preview2, photoInput2.files?.[0]);
});

// Optional: Crop Toggle (cover vs contain)
function applyCropMode() {
  const mode = cropToggle.checked ? "cover" : "contain";
  preview1.style.objectFit = mode;
  preview2.style.objectFit = mode;
}
cropToggle.addEventListener("change", applyCropMode);
applyCropMode();

uploadBtn.addEventListener("click", async () => {
  msg.textContent = "";

  const file1 = photoInput1.files?.[0];
  const file2 = photoInput2.files?.[0];

  // Bild 1 ist Pflicht
  if (!file1) {
    msg.textContent = "Please choose Picture 1 first.";
    return;
  }

  try {
    // 1) Main Foto hochladen
    const fd1 = new FormData();
    fd1.append("photo", file1);

    const res1 = await fetch("/api/photos/main", { method: "POST", body: fd1 });
    const data1 = await res1.json();

    if (!res1.ok) {
      msg.textContent = data1.message || "Upload Picture 1 failed.";
      return;
    }

    // 2) Optional: Second Foto hochladen
    if (file2) {
      const fd2 = new FormData();
      fd2.append("photo", file2);

      const res2 = await fetch("/api/photos/second", { method: "POST", body: fd2 });
      const data2 = await res2.json();

      if (!res2.ok) {
        msg.textContent = data2.message || "Upload Picture 2 failed.";
        return;
      }
    }

    // weiter zur Homepage
    window.location.href = "/index";
  } catch (e) {
    msg.textContent = "Network error.";
  }
});

