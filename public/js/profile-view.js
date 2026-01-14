function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function fill(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value && value.trim() ? value : "—";
}

// userId aus URL: /profile/5
const userId = Number(window.location.pathname.split("/").pop());

async function loadProfile() {
    const res = await fetch(`/api/profile/${userId}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Only wingmen can comment");
        return;
    }


    const p = await res.json();

    document.getElementById("profileName").textContent =
        `${p.name}, ${p.age}`;

    document.getElementById("profileMeta").textContent =
        `${p.gender} • ${p.location}`;

    fill("profileBio", p.bio);
    fill("profileHobbies", p.hobbies);
    fill("profileZodiac", p.zodiac);
    fill("profileLookingFor", p.lookingFor);
    fill("profileExtra", p.extra);

    const photos = document.getElementById("profilePhotos");
    photos.innerHTML = (p.photos || []).map(src =>
        `<img src="${src}" class="profile-photo">`
    ).join("");
}

async function loadProfilePrompts() {
    const res = await fetch(`/api/profile/${userId}/prompts`);
    if (!res.ok) {
        console.warn("Prompts not available");
        return;
    }

    const data = await res.json();
    const box = document.getElementById("profilePrompts");
    if (!box) return;

    // 🔥 robust gegen Backend-Varianten
    const prompts = Array.isArray(data) ? data : data.prompts;

    if (!prompts || prompts.length === 0) {
        box.innerHTML = "<p>—</p>";
        return;
    }

    box.innerHTML = prompts.map(pr => `
        <div class="profile-section">
            <h4>${escapeHtml(pr.prompt_text)}</h4>
            <div class="profile-box">
                ${escapeHtml(pr.answer || "—")}
            </div>
        </div>
    `).join("");
}


async function loadProfileComments() {
    const res = await fetch(`/api/profile/${userId}/comments`);

    if (!res.ok) {
        console.error("Failed to load comments");
        return;
    }

    const data = await res.json();

    // 🔥 WICHTIG: Array korrekt extrahieren
    const comments = Array.isArray(data) ? data : data.comments;

    const list = document.getElementById("wingmanCommentsList");
    const empty = document.getElementById("noWingmanComments");

    list.innerHTML = "";

    if (!comments || comments.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "wingman-comment";

        div.innerHTML = `
            <p>${escapeHtml(c.text)}</p>
            ${c.canDelete ? `<button class="delete-comment" data-id="${c.id}">Delete</button>` : ""}
        `;

        list.appendChild(div);
    });

    document.querySelectorAll(".delete-comment").forEach(btn => {
        btn.addEventListener("click", async () => {
            await fetch(`/api/profile/comments/${btn.dataset.id}`, {
                method: "DELETE"
            });
            loadProfileComments();
        });
    });
}


async function checkIfWingman() {
    const res = await fetch(`/api/profile/${userId}/is-wingman`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.isWingman === true;
}


async function setupWingmanCommentBox() {
    const box = document.getElementById("wingmanCommentBox");
    if (!box) return;

    // ❗ kein Comment auf eigenem Profil
    if (window.currentUserId === userId) {
        box.classList.add("hidden");
        return;
    }

    const isWingman = await checkIfWingman();

    if (!isWingman) {
        box.classList.add("hidden");
        return;
    }

    box.classList.remove("hidden");

    document.getElementById("postWingmanComment")
        .addEventListener("click", async () => {
            const text = document.getElementById("wingmanCommentText").value.trim();
            if (!text) return;

            const res = await fetch(`/api/profile/${userId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment: text })
            });

            if (!res.ok) {
                alert("Only wingmen can comment");
                return;
            }

            document.getElementById("wingmanCommentText").value = "";
            loadProfileComments();
        });
}


document.addEventListener("DOMContentLoaded", async () => {
    await loadProfile();
    await loadProfilePrompts();
    await loadProfileComments();
    await setupWingmanCommentBox();
});
