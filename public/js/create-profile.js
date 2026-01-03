// public/js/create-profile.js
const form = document.getElementById("profileForm");
const result = document.getElementById("result");
const skipBtn = document.getElementById("skipBtn");

// Discovery age range UI helpers
const prefAgeMinEl = document.getElementById("prefAgeMin");
const prefAgeMaxEl = document.getElementById("prefAgeMax");
const ageRangeLabel = document.getElementById("ageRangeLabel");

function updateAgeRangeLabel() {
  if (!prefAgeMinEl || !prefAgeMaxEl || !ageRangeLabel) return;

  let minV = Number(prefAgeMinEl.value);
  let maxV = Number(prefAgeMaxEl.value);

  // Keep values valid: min <= max
  if (minV > maxV) {
    // If user moves min above max -> pull max up
    maxV = minV;
    prefAgeMaxEl.value = String(maxV);
  }

  ageRangeLabel.textContent = `${minV} - ${maxV}`;
}

// Live update
if (prefAgeMinEl) prefAgeMinEl.addEventListener("input", updateAgeRangeLabel);
if (prefAgeMaxEl) prefAgeMaxEl.addEventListener("input", () => {
  // If user moves max below min -> pull min down
  if (!prefAgeMinEl) return;
  let minV = Number(prefAgeMinEl.value);
  let maxV = Number(prefAgeMaxEl.value);
  if (maxV < minV) {
    prefAgeMinEl.value = String(maxV);
  }
  updateAgeRangeLabel();
});


function showError(text) {
  result.textContent = text;
  result.className = "text-center small fw-bold text-danger";
}

function showSuccess(text) {
  result.textContent = text;
  result.className = "text-center small fw-bold text-success";
}

// Beim Laden: vorhandene Daten holen und Inputs vorausfüllen
async function prefillProfileForm() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();

    if (!res.ok) return; // still bleiben, falls z.B. nicht eingeloggt

    document.getElementById("name").value = data.name || "";
    document.getElementById("age").value = data.age || "";
    document.getElementById("location").value = data.location || "";
    document.getElementById("bio").value = data.bio || "";
    document.getElementById("hobbies").value = data.hobbies || "";

        // Homepage-only optional fields
        const zodiacEl = document.getElementById("zodiac");
        const lookingForEl = document.getElementById("lookingFor");
        const extraEl = document.getElementById("extra");

        if (zodiacEl) zodiacEl.value = data.zodiac || "";
        if (lookingForEl) lookingForEl.value = data.lookingFor || "";
        if (extraEl) extraEl.value = data.extra || "";

        // Discovery preferences
        const interestedInEl = document.getElementById("interestedIn");
        const prefAgeMinEl = document.getElementById("prefAgeMin");
        const prefAgeMaxEl = document.getElementById("prefAgeMax");

        if (interestedInEl) interestedInEl.value = data.interestedIn || "";

        if (prefAgeMinEl) prefAgeMinEl.value = Number(data.prefAgeMin ?? 18);
        if (prefAgeMaxEl) prefAgeMaxEl.value = Number(data.prefAgeMax ?? 100);

        // Update label once after setting values
        updateAgeRangeLabel();


    // Gender select: nur setzen, wenn es eine Option trifft
    const genderSel = document.getElementById("gender");
    if (data.gender) {
      // passt zu deinen Optionen "Female/Male/Non-binary/Other"
      genderSel.value = data.gender;
    }
  } catch (e) {
    // optional: showError("❌ Network error.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Inputs vorausfüllen (Name/Alter/Gender/Location aus Register + Bio/Hobbies aus Profile)
  await prefillProfileForm();

  // 2) Mode prüfen: onboarding (default) vs edit (von Homepage)
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode"); // "edit" oder null

  const closeBtn = document.getElementById("closeBtn");
  const hintText = document.getElementById("hintText");

  // My Pictures Elemente (existieren im HTML, aber sollen nur im Edit sichtbar sein)
  const myPicturesWrap = document.getElementById("myPicturesWrap");
  const managePicsBtn = document.getElementById("managePics");
    // Homepage-only extra sections
    const moreProfileWrap = document.getElementById("moreProfileWrap");


  if (mode === "edit") {
    // EDIT-MODE (Homepage -> Profil):
    // - Skip + Hint weg
    // - X sichtbar
    // - My Pictures sichtbar
    if (skipBtn) skipBtn.classList.add("d-none");
    if (hintText) hintText.classList.add("d-none");
    if (closeBtn) closeBtn.classList.remove("d-none");

    if (myPicturesWrap) myPicturesWrap.classList.remove("d-none");

    // Show extra fields + discovery preferences ONLY on homepage edit mode
    if (moreProfileWrap) moreProfileWrap.classList.remove("d-none");


    // Button öffnet Manage Pictures Seite
    if (managePicsBtn) {
      managePicsBtn.addEventListener("click", () => {
        window.location.href = "/manage-pictures";
      });
    }

    // X schließt zurück zur Homepage
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        window.location.href = "/index";
      });
    }
  } else {
    // ONBOARDING (nach Register/Login wenn Profil fehlt):
    // - Skip + Hint sichtbar
    // - X weg
    // - My Pictures sicher verstecken
    if (skipBtn) skipBtn.classList.remove("d-none");
    if (hintText) hintText.classList.remove("d-none");
    if (closeBtn) closeBtn.classList.add("d-none");

    if (myPicturesWrap) myPicturesWrap.classList.add("d-none");
    // Keep homepage-only fields hidden during onboarding
    if (moreProfileWrap) moreProfileWrap.classList.add("d-none");

  }
});



skipBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/profile/skip", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      showError(data.message || "❌ Skip failed.");
      return;
    }

    window.location.href = "/upload-photo";
  } catch (e) {
    showError("❌ Network error.");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const profile = {
    name: document.getElementById("name").value.trim(),
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    location: document.getElementById("location").value.trim(),
    bio: document.getElementById("bio").value.trim(),
    hobbies: document.getElementById("hobbies").value.trim(),

    // Homepage-only optional fields (they will be hidden in onboarding)
    zodiac: (document.getElementById("zodiac")?.value || "").trim(),
    lookingFor: (document.getElementById("lookingFor")?.value || "").trim(),
    extra: (document.getElementById("extra")?.value || "").trim(),

    // Discovery preferences (saved now, used later)
    interestedIn: (document.getElementById("interestedIn")?.value || "").trim(),
    prefAgeMin: Number(document.getElementById("prefAgeMin")?.value || 18),
    prefAgeMax: Number(document.getElementById("prefAgeMax")?.value || 100)
  };


  if (!profile.name || !profile.gender || !profile.location || profile.age < 18) {
    showError("❌ Please fill in all required fields correctly.");
    return;
  }

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || "❌ Profile save failed.");
      return;
    }

    showSuccess("✅ Profile saved!");

    // Edit-Mode -> zurück zur Homepage
    // Onboarding -> Pflichtfoto Seite
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    setTimeout(() => {
      if (mode === "edit") window.location.href = "/index";      // Edit-Mode: Homepage
      else window.location.href = "/upload-photo";              // Onboarding: Upload-Seite
    }, 200);
  } catch (e) {
    showError("❌ Network error.");
  }
});
