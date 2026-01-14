//create-profile.js
const form = document.getElementById("profileForm");
const result = document.getElementById("result");

// Buttons / UI (Skip = onboarding, Close/MyPictures = homepage edit)
const skipBtn = document.getElementById("skipBtn");
const closeBtn = document.getElementById("closeBtn");
const managePics = document.getElementById("managePics");
const helperText = document.getElementById("helperText");

// Detect mode (?mode=edit means homepage edit)
const params = new URLSearchParams(window.location.search);
const profileUserId = Number(params.get("userId")) || null;

const isEditMode = params.get("mode") === "edit";

// Apply UI differences WITHOUT touching onboarding flow
if (isEditMode) {
  // Homepage edit: show X, hide Skip, remove helper text, show My Pictures
  if (skipBtn) skipBtn.style.display = "none";
  if (closeBtn) closeBtn.style.display = "block";
  if (helperText) helperText.textContent = "";
  if (managePics) managePics.style.display = "block";
} else {
  // Onboarding/register: keep Skip + helper text, hide X + My Pictures
  if (skipBtn) skipBtn.style.display = "block";
  if (closeBtn) closeBtn.style.display = "none";
  // helperText bleibt wie im HTML
  if (managePics) managePics.style.display = "none";
}
const commentsSection = document.getElementById("wingmanCommentsSection");

if (!isEditMode && profileUserId) {
  commentsSection?.classList.remove("hidden");
}


// NEW: X closes and returns to homepage
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.location.href = "/index";
  });
}

// NEW: My Pictures opens manage-pictures page
if (managePics) {
  managePics.addEventListener("click", () => {
    window.location.href = "/manage-pictures";
  });
}


const prefAgeMin = document.getElementById("prefAgeMin");
const prefAgeMax = document.getElementById("prefAgeMax");
const ageRangeLabel = document.getElementById("ageRangeLabel");

function updateAgeLabel() {
  ageRangeLabel.textContent = `${prefAgeMin.value} - ${prefAgeMax.value}`;
}

prefAgeMin.addEventListener("input", updateAgeLabel);
prefAgeMax.addEventListener("input", updateAgeLabel);

// einmal initial setzen
updateAgeLabel();
/* -------------------------
   FEEDBACK
-------------------------- */
function showError(msg) {
  result.textContent = msg;
  result.className = "text-danger fw-bold small";
}

function showSuccess(msg) {
  result.textContent = msg;
  result.className = "text-success fw-bold small";
}

/* -------------------------
   PREFILL
-------------------------- */
async function prefillProfileForm() {
  const res = await fetch("/api/profile");
  if (!res.ok) return;

  const d = await res.json();

  document.getElementById("name").value = d.name || "";
  document.getElementById("age").value = d.age || "";
  document.getElementById("location").value = d.location || "";
  document.getElementById("bio").value = d.bio || "";
  document.getElementById("hobbies").value = d.hobbies || "";

  document.getElementById("gender").value = d.gender || "";

  document.getElementById("zodiac").value = d.zodiac || "";
  document.getElementById("lookingFor").value = d.lookingFor || "";
  document.getElementById("extra").value = d.extra || "";

  document.getElementById("interestedIn").value = d.interestedIn || "";
  document.getElementById("prefAgeMin").value = d.prefAgeMin ?? 18;
  document.getElementById("prefAgeMax").value = d.prefAgeMax ?? 100;

  const label = document.getElementById("ageRangeLabel");
  if (label) label.textContent = `${d.prefAgeMin ?? 18} - ${d.prefAgeMax ?? 100}`;
}

/* -------------------------
   PROMPTS (UI ONLY)
-------------------------- */
async function loadPrompts() {
  const res = await fetch("/api/prompts");
  if (!res.ok) return;

  const prompts = await res.json();
  const container = document.getElementById("promptsContainer");
  if (!container) return;

  container.innerHTML = "";

  prompts.forEach(p => {
    const wrapper = document.createElement("div");
    wrapper.className = "mb-3";

    wrapper.innerHTML = `
      <label class="form-label fw-bold">${p.question}</label>
      <textarea
        class="form-control prompt-answer"
        data-prompt-id="${p.id}"
        rows="2"></textarea>
    `;

    container.appendChild(wrapper);
  });
}

async function loadProfileComments() {
  if (!profileUserId) return;

  const res = await fetch(`/api/profile/${profileUserId}/comments`);
  if (!res.ok) return;

  const data = await res.json();
  const list = document.getElementById("profileCommentsList");
  if (!list) return;

  list.innerHTML = data.comments.length
      ? data.comments.map(c => `
        <li class="mb-2">
          <b>${escapeHtml(c.name)}</b>: ${escapeHtml(c.comment)}
        </li>
      `).join("")
      : `<li class="text-muted">No wingman comments yet.</li>`;
}
async function checkIfWingman() {
  if (!profileUserId) return false;

  const res = await fetch("/api/wingmen");
  if (!res.ok) return false;

  const data = await res.json();
  return data.wingmen.some(w => w.id === profileUserId);
}

async function setupWingmanCommentBox() {
  const box = document.getElementById("wingmanCommentBox");
  const btn = document.getElementById("postWingmanComment");
  const textarea = document.getElementById("wingmanCommentText");

  if (!box || !btn || !textarea) return;

  const isWingman = await checkIfWingman();
  if (!isWingman) return;

  box.classList.remove("hidden");

  btn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) return;

    const res = await fetch(`/api/profile/${profileUserId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: text })
    });

    if (!res.ok) {
      alert("Only wingmen can comment");
      return;
    }

    textarea.value = "";
    loadProfileComments();
  });
}

async function loadPromptAnswers() {
  const res = await fetch("/api/prompts/answers");
  if (!res.ok) return;

  const answers = await res.json();

  answers.forEach(a => {
    const textarea = document.querySelector(
        `.prompt-answer[data-prompt-id="${a.prompt_id}"]`
    );
    if (textarea) {
      textarea.value = a.answer;
    }
  });
}



/* -------------------------
   DOM READY
-------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ DOM loaded");

  await prefillProfileForm();

  await loadPrompts();
  console.log("✅ loadPrompts finished");

  await loadPromptAnswers();
  console.log("✅ loadPromptAnswers finished");
});

document.querySelectorAll(".clear-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (target) target.value = "";
  });
});

 /* const toggleBtn = document.getElementById("togglePromptsBtn");
  const promptsContainer = document.getElementById("promptsContainer");

  if (toggleBtn && promptsContainer) {
    toggleBtn.addEventListener("click", () => {
      promptsContainer.classList.toggle("d-none");
      toggleBtn.textContent =
          promptsContainer.classList.contains("d-none")
              ? "Tell us more about yourself ▼"
              : "Tell us more about yourself ▲";
    });
  }

  document.querySelectorAll(".clear-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const field = document.getElementById(targetId);
      if (field) field.value = "";
    });
  });
});
*/
/* -------------------------
   SKIP
-------------------------- */
skipBtn.onclick = async () => {
  await fetch("/api/profile/skip", { method: "POST" });
  location.href = "/upload-photo";
};

/* -------------------------
   SUBMIT
-------------------------- */
form.onsubmit = async (e) => {
  e.preventDefault();

  const profile = {
    name: document.getElementById("name").value.trim(),
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    location: document.getElementById("location").value.trim(),

    bio: document.getElementById("bio").value.trim(),
    hobbies: document.getElementById("hobbies").value.trim(),

    zodiac: document.getElementById("zodiac").value.trim(),
    lookingFor: document.getElementById("lookingFor").value.trim(),
    extra: document.getElementById("extra").value.trim(),

    interestedIn: document.getElementById("interestedIn").value,
    prefAgeMin: Number(document.getElementById("prefAgeMin").value),
    prefAgeMax: Number(document.getElementById("prefAgeMax").value)
  };

  if (!profile.name || !profile.gender || profile.age < 18 || !profile.location) {
    showError("Please fill required fields correctly.");
    return;
  }

  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });

  if (!res.ok) {
    showError("Save failed.");
    return;
  }

  showSuccess("Profile saved!");
  setTimeout(() => location.href = "/index", 300);

  if (!isEditMode && profileUserId) {
    await loadProfileComments();
    await setupWingmanCommentBox();
  }

};



