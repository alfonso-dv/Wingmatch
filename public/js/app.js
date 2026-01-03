// app.js:
const seedProfiles = [
    {
        id: "p1",
        name: "Mia",
        age: 24,
        distanceKm: 3,
        bio: "Coffee first, adventure second.",
        photos: [
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1524503033411-fb4b5f1c1854?auto=format&fit=crop&w=1200&q=80",
        ],
    },
    {
        id: "p2",
        name: "Jonas",
        age: 27,
        distanceKm: 8,
        bio: "Gym, books, and terrible jokes.",
        photos: [
            "https://images.unsplash.com/photo-1520975958225-647fd9f76a1a?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1520975979642-5ec8f1b37214?auto=format&fit=crop&w=1200&q=80",
        ],
    },
    {
        id: "p3",
        name: "Sofia",
        age: 26,
        distanceKm: 1,
        bio: "Looking for someone to split dumplings with.",
        photos: [
            "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1524503033411-fb4b5f1c1854?auto=format&fit=crop&w=1200&q=80",
        ],
    },
];

const ACTION = { NOPE: "NOPE", LIKE: "LIKE", SUPER: "SUPER LIKE" };

// Start: Seed bleibt drin, ABER später laden wir zusätzlich echte User-Profile vom Server
let profiles = [...seedProfiles];

const deck = document.getElementById("deck");

const toast = document.getElementById("toast");
const empty = document.getElementById("empty");
const reloadBtn = document.getElementById("reload");

const nopeBtn = document.getElementById("nope");
const likeBtn = document.getElementById("like");
const superBtn = document.getElementById("super");

// Lädt echte Profile (andere User) für die Homepage-Karten
async function loadDiscoverProfiles() {
  try {
    const res = await fetch("/api/discover");
    const data = await res.json();

    if (!res.ok) {
      // Wenn z.B. nicht eingeloggt -> nichts crashen, Seed bleibt
      return;
    }

    const serverProfiles = Array.isArray(data.profiles) ? data.profiles : [];

    // Wichtig: Seed bleibt weiterhin drin (Demo), echte User kommen VORNE dazu
    // damit man sofort echte Leute sieht, wenn vorhanden.
    profiles = [...serverProfiles, ...seedProfiles];

    render();
  } catch (e) {
    // Netzwerkfehler -> Seed bleibt
  }
}


function showToast(text) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => toast.classList.add("hidden"), 900);
}

function setEmptyState(isEmpty) {
    empty.classList.toggle("hidden", !isEmpty);
}

function topProfile() {
    return profiles[0] || null;
}

function nextProfile() {
    return profiles[1] || null;
}

function removeTop() {
    profiles.shift();
    render();
}

function render() {
    deck.innerHTML = "";

    const top = topProfile();
    const next = nextProfile();

    if (!top) {
        setEmptyState(true);
        nopeBtn.disabled = likeBtn.disabled = superBtn.disabled = true;
        return;
    }

    setEmptyState(false);
    nopeBtn.disabled = likeBtn.disabled = superBtn.disabled = false;

    if (next) deck.appendChild(makeCard(next, false));
    deck.appendChild(makeCard(top, true));
}

function makeCard(profile, isTop) {
    let photoIndex = 0;

    const card = document.createElement("div");
    card.className = "card";
    card.style.transform = isTop ? "scale(1)" : "scale(0.98)";
    card.style.zIndex = isTop ? "2" : "1";

    const img = document.createElement("img");
    img.src = profile.photos[photoIndex];
    img.alt = `${profile.name} photo`;
    img.draggable = false;

    const pills = document.createElement("div");
    pills.className = "pills";
    const pillEls = profile.photos.map((_, i) => {
        const p = document.createElement("div");
        p.className = "pill" + (i === photoIndex ? " active" : "");
        pills.appendChild(p);
        return p;
    });

    const badgeLike = document.createElement("div");
    badgeLike.className = "badge like";
    badgeLike.textContent = "LIKE";

    const badgeNope = document.createElement("div");
    badgeNope.className = "badge nope";
    badgeNope.textContent = "NOPE";

    const badgeSuper = document.createElement("div");
    badgeSuper.className = "badge super";
    badgeSuper.textContent = "SUPER LIKE";

    const info = document.createElement("div");
    info.className = "info";

    // About-me Text nur anzeigen, wenn wirklich etwas da ist
    const bioText = (profile.bio || "").trim();
    const bioHtml = bioText ? `<div class="bio">${bioText}</div>` : "";

    info.innerHTML = `
    <div class="row">
      <div class="name">${profile.name} <span class="age">${profile.age}</span></div>
    </div>
    ${bioHtml}
    <div class="hint">Tap left/right for photos • Swipe to decide</div>
  `;


    card.appendChild(img);
    card.appendChild(pills);
    card.appendChild(badgeLike);
    card.appendChild(badgeNope);
    card.appendChild(badgeSuper);
    card.appendChild(info);

    // Tap left/right to change photo
    card.addEventListener("click", (e) => {
        if (!isTop) return;
        const rect = card.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const next = tapX > rect.width / 2;
        const newIndex = Math.max(0, Math.min(profile.photos.length - 1, photoIndex + (next ? 1 : -1)));
        if (newIndex !== photoIndex) {
            photoIndex = newIndex;
            img.src = profile.photos[photoIndex];
            pillEls.forEach((p, i) => p.classList.toggle("active", i === photoIndex));
        }
    });

    if (!isTop) return card;

    // Swipe handling
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;

    function setBadges(dx, dy) {
        // fade badges based on drag amount
        badgeLike.style.opacity = dx > 20 ? Math.min(1, (dx - 20) / 120) : 0;
        badgeNope.style.opacity = dx < -20 ? Math.min(1, (-dx - 20) / 120) : 0;
        badgeSuper.style.opacity = dy < -20 ? Math.min(1, (-dy - 20) / 120) : 0;
    }

    function applyTransform(dx, dy) {
        const rot = dx / 18; // small rotate
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
        setBadges(dx, dy);
    }

    function decide(dx, dy) {
        if (dx > 120) return ACTION.LIKE;
        if (dx < -120) return ACTION.NOPE;
        if (dy < -120) return ACTION.SUPER;
        return null;
    }

    function animateOut(action) {
        card.style.transition = "transform 240ms ease";
        if (action === ACTION.LIKE) card.style.transform = "translate(520px, 40px) rotate(18deg)";
        if (action === ACTION.NOPE) card.style.transform = "translate(-520px, 40px) rotate(-18deg)";
        if (action === ACTION.SUPER) card.style.transform = "translate(0px, -620px) rotate(0deg)";
        showToast(`${action} • ${profile.name}`);
        setTimeout(removeTop, 180);
    }

    function reset() {
        card.style.transition = "transform 180ms ease";
        applyTransform(0, 0);
        setTimeout(() => (card.style.transition = "transform 0ms"), 190);
    }

    card.addEventListener("pointerdown", (e) => {
        dragging = true;
        card.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        dx = dy = 0;
        card.style.transition = "transform 0ms";
    });

    card.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        applyTransform(dx, dy);
    });

    card.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        const action = decide(dx, dy);
        if (action) animateOut(action);
        else reset();
    });

    card.addEventListener("pointercancel", () => {
        dragging = false;
        reset();
    });

    return card;
}

// Buttons
nopeBtn.addEventListener("click", () => {
    const p = topProfile();
    if (!p) return;
    showToast(`${ACTION.NOPE} • ${p.name}`);
    removeTop();
});

likeBtn.addEventListener("click", () => {
    const p = topProfile();
    if (!p) return;
    showToast(`${ACTION.LIKE} • ${p.name}`);
    removeTop();
});

superBtn.addEventListener("click", () => {
    const p = topProfile();
    if (!p) return;
    showToast(`${ACTION.SUPER} • ${p.name}`);
    removeTop();
});

reloadBtn.addEventListener("click", () => {
    // Reload setzt nur die Demo-Profile zurück
    profiles = [...seedProfiles];
    render();

    // Danach echte User wieder nachladen (damit sie wieder vorkommen)
    loadDiscoverProfiles();
});

// Initial: erst Demo rendern, dann echte User nachladen
render();
loadDiscoverProfiles();


// Date Roulette Modal öffnen / schließen
const rouletteBtn = document.getElementById("rouletteBtn");
const rouletteModal = document.getElementById("rouletteModal");
const closeRoulette = document.getElementById("closeRoulette");

// Sicherheitscheck: nur wenn Elemente existieren
if (rouletteBtn && rouletteModal && closeRoulette) {

    // Öffnen beim Klick auf 🎲
    rouletteBtn.addEventListener("click", () => {
        rouletteModal.classList.remove("hidden");
    });

    // Schließen beim Klick auf Close
    closeRoulette.addEventListener("click", () => {
        rouletteModal.classList.add("hidden");
    });
}
// ----------------------
// Roulette Daten (laut Doku)
// ----------------------
const dateIdeas = [
    "Park Walk",
    "Cinema",
    "Cooking Together",
    "Coffee Date",
    "Museum Visit",
    "Picnic",
    "Bowling",
    "Ice Cream Date",
    "Sunset Walk",
    "Mini Golf",
    "Zoo Visit",
    "Street Market",
    "Board Game Night",
    "Hiking",
    "Photography Walk"
];


const foodDining = [
    "Italian",
    "Asian",
    "Mexican",
    "Street Food",
    "Vegetarian",
    "Japanese",
    "Thai",
    "Indian",
    "Greek",
    "Burger",
    "Pizza",
    "Sushi",
    "Vegan",
    "Middle Eastern",
    "Local Cuisine"
];


// Elemente
const dateIdeasBtn = document.getElementById("dateIdeasBtn");
const foodDiningBtn = document.getElementById("foodDiningBtn");
const spinModal = document.getElementById("spinModal");
const spinTitle = document.getElementById("spinTitle");
const spinResult = document.getElementById("spinResult");
const spinBtn = document.getElementById("spinBtn");
const closeSpin = document.getElementById("closeSpin");
const closeRouletteX = document.getElementById("closeRouletteX");


let currentList = [];

// Öffnen Date Ideas
dateIdeasBtn.addEventListener("click", () => {
    currentList = dateIdeas;
    spinTitle.textContent = "Date Ideas Roulette";
    spinResult.textContent = "Tap Spin";
    rouletteModal.classList.add("hidden");
    spinModal.classList.remove("hidden");
});

// Öffnen Food
foodDiningBtn.addEventListener("click", () => {
    currentList = foodDining;
    spinTitle.textContent = "Food & Dining Roulette";
    spinResult.textContent = "Tap Spin";
    rouletteModal.classList.add("hidden");
    spinModal.classList.remove("hidden");
});

// Drehen
spinBtn.addEventListener("click", () => {
    const choice = currentList[Math.floor(Math.random() * currentList.length)];
    spinResult.textContent = choice;
});

// Schließen X
closeSpin.addEventListener("click", () => {
    spinModal.classList.add("hidden");
    rouletteModal.classList.add("hidden");
});


// Element holen:
const backToChoice = document.getElementById("backToChoice");

// Zurück zur Auswahl (Date / Food)
backToChoice.addEventListener("click", () => {
    spinModal.classList.add("hidden");
    rouletteModal.classList.remove("hidden");
});
closeRouletteX.addEventListener("click", () => {
    rouletteModal.classList.add("hidden");
});

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST" });
        window.location.href = "/login";
    });
}

// SETTINGS MODAL (öffnet erst ein Settings-Fenster, dann erst Confirm)
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");

const closeSettings = document.getElementById("closeSettings");
const closeSettingsX = document.getElementById("closeSettingsX");

const deleteAccountBtn = document.getElementById("deleteAccountBtn");

// Helper: Modal schließen
function hideSettingsModal() {
  if (settingsModal) settingsModal.classList.add("hidden");
}

// Helper: Modal öffnen
function showSettingsModal() {
  if (settingsModal) settingsModal.classList.remove("hidden");
}

if (settingsBtn && settingsModal) {
  // 1) Klick auf ⚙️ -> Settings Modal öffnen
  settingsBtn.addEventListener("click", () => {
    showSettingsModal();
  });

  // 2) Close Button -> Settings Modal schließen
  if (closeSettings) {
    closeSettings.addEventListener("click", () => {
      hideSettingsModal();
    });
  }

  // 3) X -> Settings Modal schließen
  if (closeSettingsX) {
    closeSettingsX.addEventListener("click", () => {
      hideSettingsModal();
    });
  }

  // 4) Delete Profile -> Confirm Dialog -> bei Abbrechen zurück im Settings Modal bleiben
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async () => {

      const ok = confirm("Do you really want to delete your account? This cannot be undone.");

      // Wenn Abbrechen -> NICHT schließen, du bleibst im Settings Modal
      if (!ok) return;

      // Wenn OK -> Account löschen
      const res = await fetch("/api/account", { method: "DELETE" });

      // Wenn ok -> wie Logout: zurück zur Login-Page
      if (res.ok) {
        window.location.href = "/login";
        return;
      }

      // Wenn Fehler -> Fehlermeldung zeigen (Settings bleibt offen)
      try {
        const data = await res.json();
        alert(data.message || "Delete failed");
      } catch {
        alert("Delete failed");
      }
    });
  }
}



// PROFILE BUTTON (Homepage)
const profileBtn = document.getElementById("profileBtn");
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "/create-profile?mode=edit";
  });
}


