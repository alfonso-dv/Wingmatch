// /js/app.js
document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // Demo Profiles (Fallback)
    // =========================
    const seedProfiles = [
        {
            id: "p1",
            name: "Mia",
            age: 24,
            gender: "Female",
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
            gender: "Male",
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
            gender: "Female",
            distanceKm: 1,
            bio: "Looking for someone to split dumplings with.",
            photos: [
                "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1524503033411-fb4b5f1c1854?auto=format&fit=crop&w=1200&q=80",
            ],
        },
    ];

    const ACTION = { NOPE: "NOPE", LIKE: "LIKE", SUPER: "SUPER LIKE" };

    // Seed first, then load server profiles
    let profiles = [...seedProfiles];

    // =========================
    // Grab elements (may not exist on every page)
    // =========================
    const deck = document.getElementById("deck");
    const toast = document.getElementById("toast");
    const empty = document.getElementById("empty");
    const reloadBtn = document.getElementById("reload");

    const nopeBtn = document.getElementById("nope");
    const likeBtn = document.getElementById("like");
    const superBtn = document.getElementById("super");

    const onHome = !!deck;

    // =========================
    // Utilities
    // =========================
    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showToast(text) {
        if (!toast) return;
        toast.textContent = text;
        toast.classList.remove("hidden");
        clearTimeout(window.__toastT);
        window.__toastT = setTimeout(() => toast.classList.add("hidden"), 900);
    }

    function setEmptyState(isEmpty) {
        if (!empty) return;
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

    // =========================
    // Preferences filtering
    // =========================
    async function loadMyPreferences() {
        try {
            const res = await fetch("/api/profile");
            const data = await res.json();

            if (!res.ok) return { interestedIn: "", prefAgeMin: 18, prefAgeMax: 100 };

            return {
                interestedIn: (data.interestedIn || "").trim(),
                prefAgeMin: Number(data.prefAgeMin ?? 18),
                prefAgeMax: Number(data.prefAgeMax ?? 100),
            };
        } catch {
            return { interestedIn: "", prefAgeMin: 18, prefAgeMax: 100 };
        }
    }

    function allowedGendersFromInterestedIn(interestedInRaw) {
        const v = (interestedInRaw || "").toLowerCase();
        if (!v || v === "everyone") return null;
        if (v === "men") return ["Male"];
        if (v === "women") return ["Female"];
        if (v === "other") return ["Non-binary", "Other"];
        return null;
    }

    function matchesPreferences(profile, prefs) {
        const age = Number(profile?.age);
        const gender = (profile?.gender || "").trim();

        if (!Number.isNaN(age)) {
            if (age < prefs.prefAgeMin || age > prefs.prefAgeMax) return false;
        }

        const allowed = allowedGendersFromInterestedIn(prefs.interestedIn);
        if (allowed && gender) {
            if (!allowed.includes(gender)) return false;
        }

        return true;
    }

    async function loadDiscoverProfiles() {
        if (!onHome) return;

        try {
            const res = await fetch("/api/discover");
            const data = await res.json();
            if (!res.ok) return;

            const serverProfiles = Array.isArray(data.profiles) ? data.profiles : [];

            const prefs = await loadMyPreferences();

            const filteredServer = serverProfiles.filter((p) => matchesPreferences(p, prefs));
            const filteredSeed = seedProfiles.filter((p) => matchesPreferences(p, prefs));

            profiles = [...filteredServer, ...filteredSeed];
            render();
        } catch {
            // keep seed
        }
    }

    // =========================
    // Render + Card creation
    // =========================
    function render() {
        if (!onHome) return;

        deck.innerHTML = "";

        const top = topProfile();
        const next = nextProfile();

        if (!top) {
            setEmptyState(true);
            if (nopeBtn) nopeBtn.disabled = true;
            if (likeBtn) likeBtn.disabled = true;
            if (superBtn) superBtn.disabled = true;
            return;
        }

        setEmptyState(false);
        if (nopeBtn) nopeBtn.disabled = false;
        if (likeBtn) likeBtn.disabled = false;
        if (superBtn) superBtn.disabled = false;

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
        img.src = profile.photos?.[photoIndex] || "";
        img.alt = `${profile.name} photo`;
        img.draggable = false;

        const pills = document.createElement("div");
        pills.className = "pills";

        const photos = Array.isArray(profile.photos) ? profile.photos : [];
        const pillEls = photos.map((_, i) => {
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

        const bioText = (profile.bio || "").trim();
        const bioHtml = bioText ? `<div class="bio">${escapeHtml(bioText)}</div>` : "";

        info.innerHTML = `
      <div class="row">
        <div class="name">${escapeHtml(profile.name)} <span class="age">${escapeHtml(String(profile.age))}</span></div>
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
            const goNext = tapX > rect.width / 2;

            const newIndex = Math.max(0, Math.min(photos.length - 1, photoIndex + (goNext ? 1 : -1)));
            if (newIndex !== photoIndex) {
                photoIndex = newIndex;
                img.src = photos[photoIndex];
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
            badgeLike.style.opacity = dx > 20 ? Math.min(1, (dx - 20) / 120) : 0;
            badgeNope.style.opacity = dx < -20 ? Math.min(1, (-dx - 20) / 120) : 0;
            badgeSuper.style.opacity = dy < -20 ? Math.min(1, (-dy - 20) / 120) : 0;
        }

        function applyTransform(dx, dy) {
            const rot = dx / 18;
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
            dx = 0;
            dy = 0;
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

    // =========================
    // Buttons (Nope/Like/Super)
    // =========================
    if (onHome && nopeBtn) {
        nopeBtn.addEventListener("click", () => {
            const p = topProfile();
            if (!p) return;
            showToast(`${ACTION.NOPE} • ${p.name}`);
            removeTop();
        });
    }

    if (onHome && likeBtn) {
        likeBtn.addEventListener("click", () => {
            const p = topProfile();
            if (!p) return;
            showToast(`${ACTION.LIKE} • ${p.name}`);
            removeTop();
        });
    }

    if (onHome && superBtn) {
        superBtn.addEventListener("click", () => {
            const p = topProfile();
            if (!p) return;
            showToast(`${ACTION.SUPER} • ${p.name}`);
            removeTop();
        });
    }

    if (onHome && reloadBtn) {
        reloadBtn.addEventListener("click", () => {
            profiles = [...seedProfiles];
            render();
            loadDiscoverProfiles();
        });
    }

    // Initial load on homepage
    if (onHome) {
        render();
        loadDiscoverProfiles();
    }

    // =========================
    // Date Roulette Modal
    // =========================
    const rouletteBtn = document.getElementById("rouletteBtn");
    const rouletteModal = document.getElementById("rouletteModal");
    const closeRoulette = document.getElementById("closeRoulette");
    const closeRouletteX = document.getElementById("closeRouletteX");

    if (rouletteBtn && rouletteModal) {
        rouletteBtn.addEventListener("click", () => rouletteModal.classList.remove("hidden"));
    }
    if (closeRoulette && rouletteModal) {
        closeRoulette.addEventListener("click", () => rouletteModal.classList.add("hidden"));
    }
    if (closeRouletteX && rouletteModal) {
        closeRouletteX.addEventListener("click", () => rouletteModal.classList.add("hidden"));
    }

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
        "Photography Walk",
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
        "Local Cuisine",
    ];

    const dateIdeasBtn = document.getElementById("dateIdeasBtn");
    const foodDiningBtn = document.getElementById("foodDiningBtn");
    const spinModal = document.getElementById("spinModal");
    const spinTitle = document.getElementById("spinTitle");
    const spinResult = document.getElementById("spinResult");
    const spinBtn = document.getElementById("spinBtn");
    const closeSpin = document.getElementById("closeSpin");
    const backToChoice = document.getElementById("backToChoice");

    let currentList = [];

    if (dateIdeasBtn && rouletteModal && spinModal && spinTitle && spinResult) {
        dateIdeasBtn.addEventListener("click", () => {
            currentList = dateIdeas;
            spinTitle.textContent = "Date Ideas Roulette";
            spinResult.textContent = "Tap Spin";
            rouletteModal.classList.add("hidden");
            spinModal.classList.remove("hidden");
        });
    }

    if (foodDiningBtn && rouletteModal && spinModal && spinTitle && spinResult) {
        foodDiningBtn.addEventListener("click", () => {
            currentList = foodDining;
            spinTitle.textContent = "Food & Dining Roulette";
            spinResult.textContent = "Tap Spin";
            rouletteModal.classList.add("hidden");
            spinModal.classList.remove("hidden");
        });
    }

    if (spinBtn && spinResult) {
        spinBtn.addEventListener("click", () => {
            if (!currentList.length) return;
            const choice = currentList[Math.floor(Math.random() * currentList.length)];
            spinResult.textContent = choice;
        });
    }

    if (closeSpin && spinModal && rouletteModal) {
        closeSpin.addEventListener("click", () => {
            spinModal.classList.add("hidden");
            rouletteModal.classList.add("hidden");
        });
    }

    if (backToChoice && spinModal && rouletteModal) {
        backToChoice.addEventListener("click", () => {
            spinModal.classList.add("hidden");
            rouletteModal.classList.remove("hidden");
        });
    }

    // =========================
    // Logout
    // =========================
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/login";
        });
    }

    // =========================
    // Settings Modal + Delete
    // =========================
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettings = document.getElementById("closeSettings");
    const closeSettingsX = document.getElementById("closeSettingsX");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

    function hideSettingsModal() {
        if (settingsModal) settingsModal.classList.add("hidden");
    }
    function showSettingsModal() {
        if (settingsModal) settingsModal.classList.remove("hidden");
    }

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener("click", showSettingsModal);
    }
    if (closeSettings) closeSettings.addEventListener("click", hideSettingsModal);
    if (closeSettingsX) closeSettingsX.addEventListener("click", hideSettingsModal);

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", async () => {
            const ok = confirm("Do you really want to delete your account? This cannot be undone.");
            if (!ok) return;

            const res = await fetch("/api/account", { method: "DELETE" });
            if (res.ok) {
                window.location.href = "/login";
                return;
            }

            try {
                const data = await res.json();
                alert(data.message || "Delete failed");
            } catch {
                alert("Delete failed");
            }
        });
    }

    // =========================
    // Profile button
    // =========================
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
        profileBtn.addEventListener("click", () => {
            window.location.href = "/create-profile?mode=edit";
        });
    }

    // =========================
    // Info Modal (Wingmen / Best Friends)
    // =========================
    const infoModal = document.getElementById("infoModal");
    const infoTitle = document.getElementById("infoTitle");
    const infoText = document.getElementById("infoText");
    const closeInfoX = document.getElementById("closeInfoX");
    const closeInfo = document.getElementById("closeInfo");

    const wingmenInfoBtn = document.getElementById("wingmenInfoBtn");
    const bestFriendsInfoBtn = document.getElementById("bestFriendsInfoBtn");

    function openInfo(title, text) {
        if (!infoModal || !infoTitle || !infoText) return;
        infoTitle.textContent = title;
        infoText.textContent = text;
        infoModal.classList.remove("hidden");
    }

    function closeInfoModal() {
        if (!infoModal) return;
        infoModal.classList.add("hidden");
    }

    if (wingmenInfoBtn) {
        wingmenInfoBtn.addEventListener("click", () => {
            openInfo(
                "Wingmen",
                "Wingmen are your trusted helpers. You can assign users as wingmen, and they can hype you up."
            );
        });
    }

    if (bestFriendsInfoBtn) {
        bestFriendsInfoBtn.addEventListener("click", () => {
            openInfo(
                "Best Friends",
                "Best Friends are users who assigned YOU as their wingman. They appear automatically here."
            );
        });
    }

    if (closeInfoX) closeInfoX.addEventListener("click", closeInfoModal);
    if (closeInfo) closeInfo.addEventListener("click", closeInfoModal);

    if (infoModal) {
        infoModal.addEventListener("click", (e) => {
            if (e.target === infoModal) closeInfoModal();
        });
    }

    // =========================
    // Wingmen / Best Friends Lists
    // =========================
    async function refreshWingmanLists() {
        const wingmenList = document.getElementById("wingmenList");
        const bestFriendsList = document.getElementById("bestFriendsList");
        if (!wingmenList || !bestFriendsList) return;

        try {
            const res = await fetch("/api/wingmen");
            const data = await res.json();
            if (!res.ok) return;

            const wingmen = Array.isArray(data.wingmen) ? data.wingmen : [];
            const bestFriends = Array.isArray(data.bestFriends) ? data.bestFriends : [];

            wingmenList.innerHTML = wingmen.length
                ? wingmen
                    .map(
                        (u) => `
          <li class="side-item">
            <div class="side-item-row">
              <div>
                <div class="side-name">${escapeHtml(u.name || "User")}</div>
                <div class="side-sub">${escapeHtml(String(u.age ?? ""))}${u.gender ? " • " + escapeHtml(u.gender) : ""}</div>
              </div>
              <div class="side-item-actions">
                <button class="small-btn danger" data-remove-wingman="${u.id}">Remove</button>
              </div>
            </div>
          </li>
        `
                    )
                    .join("")
                : `<li class="side-item"><div class="side-name">No wingmen yet</div><div class="side-sub">Tap ＋ to add one</div></li>`;

            bestFriendsList.innerHTML = bestFriends.length
                ? bestFriends
                    .map(
                        (u) => `
          <li class="side-item">
            <div class="side-item-row">
              <div>
                <div class="side-name">${escapeHtml(u.name || "User")}</div>
                <div class="side-sub">${escapeHtml(String(u.age ?? ""))}${u.gender ? " • " + escapeHtml(u.gender) : ""}</div>
              </div>
              <div class="side-item-actions">
                <span class="side-sub">Assigned you</span>
              </div>
            </div>
          </li>
        `
                    )
                    .join("")
                : `<li class="side-item"><div class="side-name">No best friends yet</div><div class="side-sub">They appear when someone picks you</div></li>`;

            // remove buttons
            wingmenList.querySelectorAll("[data-remove-wingman]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = Number(btn.getAttribute("data-remove-wingman"));
                    if (!id) return;

                    const ok = confirm("Remove this wingman?");
                    if (!ok) return;

                    const r = await fetch(`/api/wingmen/${id}`, { method: "DELETE" });
                    if (r.ok) {
                        refreshWingmanLists();
                    } else {
                        try {
                            const err = await r.json();
                            alert(err.message || "Remove failed");
                        } catch {
                            alert("Remove failed");
                        }
                    }
                });
            });
        } catch {
            // ignore
        }
    }

    // =========================
    // Add Wingman Modal + Search
    // =========================
    const addWingmanBtn = document.getElementById("addWingmanBtn");
    const addWingmanModal = document.getElementById("addWingmanModal");
    const closeAddWingman = document.getElementById("closeAddWingman");
    const closeAddWingmanX = document.getElementById("closeAddWingmanX");

    const wingmanSearchInput = document.getElementById("wingmanSearchInput");
    const wingmanSearchResults = document.getElementById("wingmanSearchResults");
    const wingmanSearchHint = document.getElementById("wingmanSearchHint");

    function openAddWingmanModal() {
        if (!addWingmanModal) return;
        addWingmanModal.classList.remove("hidden");

        if (wingmanSearchInput) {
            wingmanSearchInput.value = "";
            wingmanSearchInput.focus();
        }
        if (wingmanSearchResults) wingmanSearchResults.innerHTML = "";
        if (wingmanSearchHint) wingmanSearchHint.textContent = "Type at least 2 characters.";
    }

    function closeAddWingmanModal() {
        if (!addWingmanModal) return;
        addWingmanModal.classList.add("hidden");
    }

    if (addWingmanBtn) addWingmanBtn.addEventListener("click", openAddWingmanModal);
    if (closeAddWingman) closeAddWingman.addEventListener("click", closeAddWingmanModal);
    if (closeAddWingmanX) closeAddWingmanX.addEventListener("click", closeAddWingmanModal);

    if (addWingmanModal) {
        addWingmanModal.addEventListener("click", (e) => {
            if (e.target === addWingmanModal) closeAddWingmanModal();
        });
    }

    let searchTimer = null;

    async function runWingmanSearch(q) {
        if (!wingmanSearchResults) return;

        if (!q || q.length < 2) {
            wingmanSearchResults.innerHTML = "";
            if (wingmanSearchHint) wingmanSearchHint.textContent = "Type at least 2 characters.";
            return;
        }

        if (wingmanSearchHint) wingmanSearchHint.textContent = "Searching...";

        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            const users = Array.isArray(data.users) ? data.users : [];

            if (!users.length) {
                wingmanSearchResults.innerHTML = `
          <li class="search-result-item">
            <div class="search-result-name">No users found</div>
            <div class="search-result-sub">Try a different name/email</div>
          </li>
        `;
                if (wingmanSearchHint) wingmanSearchHint.textContent = "";
                return;
            }

            wingmanSearchResults.innerHTML = users
                .map(
                    (u) => `
        <li class="search-result-item">
          <div class="search-result-top">
            <div class="search-result-name">${escapeHtml(u.name || "User")}</div>
            <button class="small-btn" data-add-wingman="${u.id}">Add</button>
          </div>
          <div class="search-result-sub">
            ${escapeHtml(String(u.age ?? ""))}${u.gender ? " • " + escapeHtml(u.gender) : ""}${u.location ? " • " + escapeHtml(u.location) : ""}
          </div>
        </li>
      `
                )
                .join("");

            if (wingmanSearchHint) wingmanSearchHint.textContent = "";

            wingmanSearchResults.querySelectorAll("[data-add-wingman]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = Number(btn.getAttribute("data-add-wingman"));
                    if (!id) return;

                    const r = await fetch("/api/wingmen", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ wingmanUserId: id }),
                    });

                    if (r.ok) {
                        await refreshWingmanLists();
                        showToast("Wingman added ✅");
                        closeAddWingmanModal();
                    } else {
                        try {
                            const err = await r.json();
                            alert(err.message || "Add failed");
                        } catch {
                            alert("Add failed");
                        }
                    }
                });
            });
        } catch {
            if (wingmanSearchHint) wingmanSearchHint.textContent = "Search failed.";
        }
    }

    if (wingmanSearchInput) {
        wingmanSearchInput.addEventListener("input", () => {
            const q = wingmanSearchInput.value.trim();
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => runWingmanSearch(q), 250);
        });
    }

    // Load lists on page open (safe even if lists don't exist on other pages)
    refreshWingmanLists();
});
