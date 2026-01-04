const form = document.getElementById("profileForm");
const result = document.getElementById("result");
const skipBtn = document.getElementById("skipBtn");

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
};



