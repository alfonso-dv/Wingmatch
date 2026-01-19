// app.js - Frontend

// ============================================================
// START – WARTET BIS DIE SEITE FERTIG GELADEN IST
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // WINGMAN REQUESTS – PRÜFT OB JEMAND DICH ALS WINGMAN WILL
    // ============================================================

    // fragt den Server: gibt es offene Wingman-Anfragen für den eingeloggten User?
    fetch("/api/wingman/requests/pending")
        .then(res => res.json()) // macht aus der Server-Antwort ein JSON-Objekt
        .then(requests => {
            // schaut, ob mindestens eine Anfrage da ist
            if (requests.length > 0) {
                // nimmt die erste Anfrage aus der Liste (hier wird nur die erste angezeigt)
                const r = requests[0];

                // erstellt ein Overlay (dunkler Hintergrund), damit das Popup im Fokus ist
                const overlay = document.createElement("div");
                overlay.className = "popup-overlay";

                // füllt das Overlay mit HTML: Text + Accept + Deny
                overlay.innerHTML = `
    <div class="popup">
        <p><b>${r.requesterName}</b> is asking you to be their Wingman</p>
        <button id="accept">Accept</button>
        <button id="decline">Deny</button>
    </div>
`;

                // hängt das Overlay an den Body, damit es sichtbar wird
                document.body.appendChild(overlay);

                // wenn man auf Accept klickt: schickt er "ACCEPTED" an den Server
                document.getElementById("accept").onclick = () => respond(r.id, "ACCEPTED");

                // wenn man auf Deny klickt: schickt er "DECLINED" an den Server
                document.getElementById("decline").onclick = () => respond(r.id, "DECLINED");
            }
        });

    // ============================================================
    // WINGMAN REQUEST – ANTWORT AN DEN SERVER SCHICKEN
    // ============================================================
    function respond(id, decision) {

        // schickt die Entscheidung an das Backend (annehmen oder ablehnen)
        fetch("/api/wingman/respond", {
            method: "POST", // sagt: es wird etwas „gesendet“
            headers: { "Content-Type": "application/json" }, // sagt: der Body ist JSON
            body: JSON.stringify({ requestId: id, decision }) // sendet ID + Entscheidung
        }).then(() => {

            // entfernt das Overlay wieder, damit das Popup verschwindet
            document.querySelector(".popup-overlay")?.remove();

            // lädt die Wingman-Listen neu, damit es direkt aktualisiert ist
            refreshWingmanLists(); // optional, aber gut
        });

    }




    // ============================================================
    // DEMO PROFILES – FALLBACK, FALLS SERVER NOCH NICHTS LIEFERT
    // ============================================================

    // enthält Beispiel-Profile, damit man swipen kann, auch ohne echte Daten
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

    // legt fest, welche Aktionen es beim Swipen geben kann
    const ACTION = { NOPE: "NOPE", LIKE: "LIKE", SUPER: "SUPER LIKE" };

    // kopiert die Demo-Profile in die echte Profil-Liste
    // damit man sofort Karten im Deck hat
    let profiles = [...seedProfiles];

    // ============================================================
    // HTML ELEMENTE HOLEN – NUR WENN SIE AUF DER SEITE EXISTIEREN
    // ============================================================

    // holt den Kartenbereich (wo die Swipe-Karten drin sind)
    const deck = document.getElementById("deck");

    // holt das kleine Textfeld für kurze Meldungen (Toast)
    const toast = document.getElementById("toast");

    // holt die Box, die erscheint, wenn keine Karten mehr da sind
    const empty = document.getElementById("empty");

    // holt den Reload Button, um neue Demo-Profile zu laden
    const reloadBtn = document.getElementById("reload");

    // holt den X Button (Nope)
    const nopeBtn = document.getElementById("nope");

    // holt den Herz Button (Like)
    const likeBtn = document.getElementById("like");

    // holt den Stern Button (Super Like)
    const superBtn = document.getElementById("super");

    // merkt sich: ist man auf der Homepage mit Swipe-Deck?
    // wenn deck existiert, ist man auf Home
    const onHome = !!deck;

    // ============================================================
    // HILFSFUNKTION – TEXT SICHER IN HTML ANZEIGEN
    // ============================================================
    function escapeHtml(str) {

        // macht aus allem zuerst Text, damit es sicher verarbeitet wird
        return String(str)

            // ersetzt Sonderzeichen, damit niemand HTML/Code einschleusen kann
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

// ============================================================
// HILFSFUNKTIONEN – TOAST, EMPTY STATE, PROFIL-STAPEL
// ============================================================

    // Zeigt eine kurze Meldung (Toast) unten/oben im UI an:
    function showToast(text) {
        // Wenn das Toast-Element nicht existiert, macht es nichts:
        if (!toast) return;
        // Setzt den angezeigten Text:
        toast.textContent = text;
        // Macht das Toast sichtbar:
        toast.classList.remove("hidden");
        // Löscht einen eventuell alten Timer, damit es nicht zu früh verschwindet:
        clearTimeout(window.__toastT);
        // Startet einen neuen Timer, der das Toast nach 900ms wieder versteckt:
        window.__toastT = setTimeout(() => toast.classList.add("hidden"), 900);
    }

    // Zeigt oder versteckt den „leer“-Zustand (zB. „You’re all caught up“):
    function setEmptyState(isEmpty) {
        // Wenn das Empty-Element nicht existiert, macht es nichts:
        if (!empty) return;
        // Zeigt es, wenn isEmpty = true, und versteckt es sonst:
        empty.classList.toggle("hidden", !isEmpty);
    }

    // Gibt das oberste Profil im Stapel zurück (aktuelle Karte):
    function topProfile() {
        // Nimmt das erste Element im Array oder null, wenn nichts da ist:
        return profiles[0] || null;
    }

    // Gibt das nächste Profil unter der Top-Karte zurück:
    function nextProfile() {
        // Nimmt das zweite Element im Array oder null, wenn nichts da ist:
        return profiles[1] || null;
    }

    // Entfernt die oberste Karte und baut das Deck neu:
    function removeTop() {
        // Löscht das erste Profil aus der Liste:
        profiles.shift();
        // Zeichnet die Karten neu, damit die nächste Karte nachrückt:
        render();
    }

// =========================
// Preferences filtering
// =========================

// Lädt die eigenen „Discovery“-Einstellungen (Interesse + Altersbereich) vom Backend:
    async function loadMyPreferences() {
        // Versucht alles sicher abzufangen, damit die Seite auch bei Fehlern weiterläuft:
        try {
            // Fragt das eigene Profil beim Backend ab (damit die gespeicherten Preferences geladen werden):
            const res = await fetch("/api/profile");
            // Wandelt die Antwort in JSON um, damit man mit den Daten arbeiten kann:
            const data = await res.json();

            // Wenn das Backend „nicht ok“ zurückgibt, nimmt es sichere Standardwerte:
            if (!res.ok) return { interestedIn: "", prefAgeMin: 18, prefAgeMax: 100 };

            // Gibt die Preferences zurück, die später fürs Filtern benutzt werden:
            return {
                // Nimmt interestedIn aus dem Profil, entfernt Leerzeichen, oder nutzt sonst einen leeren Text:
                interestedIn: (data.interestedIn || "").trim(),
                // Macht prefAgeMin sicher zu einer Zahl, und nutzt sonst 18:
                prefAgeMin: Number(data.prefAgeMin ?? 18),
                // Macht prefAgeMax sicher zu einer Zahl, und nutzt sonst 100:
                prefAgeMax: Number(data.prefAgeMax ?? 100),
            };
        } catch {
            // Wenn etwas schiefgeht (zB. kein Internet oder Server down), nimmt es Standardwerte:
            return { interestedIn: "", prefAgeMin: 18, prefAgeMax: 100 };
        }
    }

// Wandelt „interestedIn“ (zB. men/women/everyone/other) in erlaubte Gender-Werte um:
    function allowedGendersFromInterestedIn(interestedInRaw) {
        // Macht den Text klein, damit Vergleiche sicher funktionieren:
        const v = (interestedInRaw || "").toLowerCase();
        // Wenn nichts gesetzt ist oder „everyone“, dann ist alles erlaubt (kein Gender-Filter):
        if (!v || v === "everyone") return null;
        // Wenn „men“ gewählt ist, erlaubt es nur „Male“:
        if (v === "men") return ["Male"];
        // Wenn „women“ gewählt ist, erlaubt es nur „Female“:
        if (v === "women") return ["Female"];
        // Wenn „other“ gewählt ist, erlaubt es diese Werte:
        if (v === "other") return ["Non-binary", "Other"];
        // Wenn etwas Unbekanntes kommt, filtert es lieber nicht:
        return null;
    }

// Prüft, ob ein Profil zu den eigenen Preferences passt:
    function matchesPreferences(profile, prefs) {
        // Holt das Alter aus dem Profil und macht es zu einer Zahl:
        const age = Number(profile?.age);
        // Holt das Geschlecht aus dem Profil und entfernt Leerzeichen:
        const gender = (profile?.gender || "").trim();

        // Prüft zuerst den Altersbereich:
        if (!Number.isNaN(age)) {
            // Wenn Alter kleiner als Minimum oder größer als Maximum ist, passt es nicht:
            if (age < prefs.prefAgeMin || age > prefs.prefAgeMax) return false;
        }

        // Holt die erlaubten Gender basierend auf den Preferences:
        const allowed = allowedGendersFromInterestedIn(prefs.interestedIn);
        // Wenn es eine Liste gibt und das Profil ein Gender hat, wird geprüft:
        if (allowed && gender) {
            // Wenn das Profil-Gender nicht in der erlaubten Liste ist, passt es nicht:
            if (!allowed.includes(gender)) return false;
        }

        // Wenn nichts dagegen spricht, passt das Profil:
        return true;
    }

// Lädt Profile für „Discover“ und filtert sie nach den eigenen Preferences:
    async function loadDiscoverProfiles() {
        // Wenn man nicht auf der Homepage ist, macht es gar nichts:
        if (!onHome) return;

        // Versucht das Laden sicher abzufangen:
        try {
            // Fragt neue Profile vom Backend ab:
            const res = await fetch("/api/discover");
            // Wandelt die Antwort in JSON um:
            const data = await res.json();
            // Wenn die Antwort nicht ok ist, bricht es ab:
            if (!res.ok) return;

            // Holt die Profile-Liste aus der Server-Antwort oder nimmt sonst eine leere Liste:
            const serverProfiles = Array.isArray(data.profiles) ? data.profiles : [];

            // Lädt die eigenen Preferences (interestedIn + Altersbereich):
            const prefs = await loadMyPreferences();

            // Filtert die Server-Profile nach den Preferences:
            const filteredServer = serverProfiles.filter((p) => matchesPreferences(p, prefs));
            // Filtert auch die Seed-Profile (Demo/Beispiel-Daten) nach den Preferences:
            const filteredSeed = seedProfiles.filter((p) => matchesPreferences(p, prefs));

            // Baut die finale Liste aus Server-Profilen + Seed-Profilen:
            profiles = [...filteredServer, ...filteredSeed];
            // Zeichnet die Karten neu:
            render();
        } catch {
            // Wenn etwas schiefgeht, bleibt es bei den Seed-Profilen (kein Crash):
            // keep seed
        }
    }

// =========================
// Render + Card creation
// =========================

    // Baut die sichtbaren Karten im Deck neu auf:
    function render() {
        // Wenn man nicht auf der Homepage ist, wird nichts gerendert:
        if (!onHome) return;

        // Leert das Karten-Deck komplett, damit es frisch aufgebaut wird:
        deck.innerHTML = "";

        // Holt das oberste Profil (die aktuelle Karte):
        const top = topProfile();
        // Holt das nächste Profil (Karte darunter):
        const next = nextProfile();

        // Wenn es kein Profil mehr gibt, zeigt es den „leer“-Zustand:
        if (!top) {
            // Aktiviert den Empty-State (zB. „You’re all caught up“):
            setEmptyState(true);
            // Deaktiviert die Buttons, weil man nichts mehr swipen kann:
            if (nopeBtn) nopeBtn.disabled = true;
            if (likeBtn) likeBtn.disabled = true;
            if (superBtn) superBtn.disabled = true;
            // Bricht ab, weil es nichts zu rendern gibt:
            return;
        }

        // Wenn es ein Profil gibt, schaltet es den Empty-State aus:
        setEmptyState(false);
        // Aktiviert die Buttons wieder:
        if (nopeBtn) nopeBtn.disabled = false;
        if (likeBtn) likeBtn.disabled = false;
        if (superBtn) superBtn.disabled = false;

        // Wenn es eine „nächste“ Karte gibt, wird sie zuerst als Hintergrund-Karte hinzugefügt:
        if (next) deck.appendChild(makeCard(next, false));
        // Dann kommt die Top-Karte oben drauf:
        deck.appendChild(makeCard(top, true));
    }


// ============================================================
// KARTE ERSTELLEN – PROFIL ANZEIGEN (BILD, TEXT, BADGES)
// ============================================================

    // Baut eine Profil-Karte als HTML-Element auf und gibt sie zurück:
    function makeCard(profile, isTop) {
        // Merkt sich, welches Foto gerade angezeigt wird (startet bei 0 = erstes Foto):
        let photoIndex = 0;

        // Erstellt das Karten-Element (das ist die große Swipe-Karte):
        const card = document.createElement("div");
        // Gibt der Karte die CSS-Klasse, damit sie wie eine Karte aussieht:
        card.className = "card";
        // Macht die obere Karte minimal größer als die darunterliegende:
        card.style.transform = isTop ? "scale(1)" : "scale(0.98)";
        // Setzt die Reihenfolge: Top-Karte liegt visuell oben:
        card.style.zIndex = isTop ? "2" : "1";

        // Erstellt das Bild-Element für das Profilfoto:
        const img = document.createElement("img");
        // Nimmt das aktuelle Foto aus profile.photos, oder sonst einen leeren Text:
        img.src = profile.photos?.[photoIndex] || "";
        // Setzt einen Alternativtext fürs Bild (für bessere Anzeige bei Fehlern):
        img.alt = `${profile.name} photo`;
        // Verhindert, dass man das Bild aus Versehen ziehen kann:
        img.draggable = false;

        // Erstellt den Bereich für die kleinen Foto-Punkte (Pills) oben im Bild:
        const pills = document.createElement("div");
        // Gibt dem Bereich die CSS-Klasse:
        pills.className = "pills";

        // Holt die Foto-Liste sicher als Array, sonst nimmt es eine leere Liste:
        const photos = Array.isArray(profile.photos) ? profile.photos : [];
        // Baut für jedes Foto einen „Pill“ (kleinen Punkt) und merkt sich alle Elemente:
        const pillEls = photos.map((_, i) => {
            // Erstellt einen einzelnen Pill:
            const p = document.createElement("div");
            // Markiert den Pill als „active“, wenn es das aktuell sichtbare Foto ist:
            p.className = "pill" + (i === photoIndex ? " active" : "");
            // Hängt den Pill in den Pills-Container:
            pills.appendChild(p);
            // Gibt den Pill zurück, damit er später aktualisiert werden kann:
            return p;
        });

        // Erstellt das LIKE-Badge (Anzeige beim Rechts-Swipe):
        const badgeLike = document.createElement("div");
        // Gibt die passende CSS-Klasse fürs Styling:
        badgeLike.className = "badge like";
        // Setzt den Text im Badge:
        badgeLike.textContent = "LIKE";

        // Erstellt das NOPE-Badge (Anzeige beim Links-Swipe):
        const badgeNope = document.createElement("div");
        // Gibt die passende CSS-Klasse fürs Styling:
        badgeNope.className = "badge nope";
        // Setzt den Text im Badge:
        badgeNope.textContent = "NOPE";

        // Erstellt das SUPER LIKE-Badge (Anzeige beim Hoch-Swipe):
        const badgeSuper = document.createElement("div");
        // Gibt die passende CSS-Klasse fürs Styling:
        badgeSuper.className = "badge super";
        // Setzt den Text im Badge:
        badgeSuper.textContent = "SUPER LIKE";

        // Erstellt den Info-Bereich unten auf der Karte (Name, Alter, Bio, Hinweis):
        const info = document.createElement("div");
        // Gibt dem Info-Bereich die CSS-Klasse:
        info.className = "info";

        // Holt die Bio sicher als Text und entfernt Leerzeichen:
        const bioText = (profile.bio || "").trim();
        // Baut den Bio-HTML-Block nur dann, wenn wirklich Text vorhanden ist:
        const bioHtml = bioText ? `<div class="bio">${escapeHtml(bioText)}</div>` : "";

        // ============================================================
        // ✅ WINGMAN KOMMENTARE (werden vom Server als profile.wingmanComments geliefert)
        // ============================================================

        const wingmanComments = Array.isArray(profile.wingmanComments) ? profile.wingmanComments : [];

        // optional: nur die letzten 3 anzeigen
        const limitedComments = wingmanComments.slice(0, 3);

        const commentsHtml = limitedComments.length
            ? `
        <div class="card-comments">
          <div class="card-comments-title">Wingmen say</div>
          ${limitedComments.map(c => `
            <div class="card-comment">
              <span class="card-comment-name">${escapeHtml(c.commenterName || "Wingman")}:</span>
              <span class="card-comment-text">${escapeHtml(c.text || "")}</span>
            </div>
          `).join("")}
        </div>
      `
            : "";

        // Setzt den Info-Text als HTML (Name, Alter, Bio, Kommentare und kleiner Hinweis):
        info.innerHTML = `
      <div class="row">
        <div class="name">${escapeHtml(profile.name)} <span class="age">${escapeHtml(String(profile.age))}</span></div>
      </div>
      ${bioHtml}
      ${commentsHtml}
      <div class="hint">Tap left/right for photos • Swipe to decide</div>
    `;

        // Hängt das Bild in die Karte:
        card.appendChild(img);
        // Hängt die Foto-Pills in die Karte:
        card.appendChild(pills);
        // Hängt die drei Badges in die Karte:
        card.appendChild(badgeLike);
        card.appendChild(badgeNope);
        card.appendChild(badgeSuper);
        // Hängt den Info-Bereich in die Karte:
        card.appendChild(info);

        // ============================================================
        // FOTO WECHSELN – TIPPSEN LINKS/RECHTS AUF DER KARTE
        // ============================================================

        // Reagiert auf Klick/Tap auf der Karte, um das Foto zu wechseln:
        card.addEventListener("click", (e) => {
            // Nur die oberste Karte darf reagieren, damit die Hintergrundkarte nicht mitklickt:
            if (!isTop) return;
            // Holt die Position und Größe der Karte am Bildschirm:
            const rect = card.getBoundingClientRect();
            // Rechnet aus, wo genau innerhalb der Karte geklickt wurde:
            const tapX = e.clientX - rect.left;
            // Wenn rechts geklickt wurde, geht es zum nächsten Foto, sonst zurück:
            const goNext = tapX > rect.width / 2;

            // Rechnet den neuen Foto-Index aus und verhindert „zu weit links/rechts“:
            const newIndex = Math.max(0, Math.min(photos.length - 1, photoIndex + (goNext ? 1 : -1)));
            // Wenn sich der Index wirklich geändert hat, wird das Foto aktualisiert:
            if (newIndex !== photoIndex) {
                // Speichert den neuen Index:
                photoIndex = newIndex;
                // Zeigt das neue Foto an:
                img.src = photos[photoIndex];
                // Aktualisiert die Pills: nur der aktuelle Pill wird „active“:
                pillEls.forEach((p, i) => p.classList.toggle("active", i === photoIndex));
            }
        });

        // Wenn es nicht die Top-Karte ist, wird hier beendet und nur die Karte zurückgegeben:
        if (!isTop) return card;

        // ============================================================
        // SWIPE – VORBEREITUNG FÜR DRAG (ZIEHEN MIT MAUS/FINGER)
        // ============================================================

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

            (async () => {
                try {
                    const serverAction =
                        action === ACTION.LIKE ? "LIKE" :
                            action === ACTION.NOPE ? "NOPE" :
                                action === ACTION.SUPER ? "SUPER" : null;

                    if (!serverAction) return;

                    const r = await sendSwipeToServer(profile, serverAction);
                    if (r?.matched) showToast("It's a match! ✨");
                } catch {
                    // ignore network errors; UI already moved on
                }
            })();

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

    // ============================================================
    // BUTTON – NOPE (X) – PROFIL ABLEHNEN
    // ============================================================

    // Prüft: Nur auf der Homepage und nur wenn der Button existiert, wird der Klick aktiviert:
    if (onHome && nopeBtn) {
        // Reagiert auf Klick auf den NOPE-Button:
        nopeBtn.addEventListener("click", async () => {
            // Holt das aktuelle Profil oben auf dem Stapel:
            const p = topProfile();
            // Wenn es kein Profil gibt, macht es nichts:
            if (!p) return;

            // Entfernt die Karte sofort aus der UI, damit es schnell wirkt:
            removeTop(); // UI first (fast)
            // Versucht dann den Swipe ans Backend zu senden:
            try {
                // Sendet „NOPE“ an den Server:
                await sendSwipeToServer(p, "NOPE");
            } catch (e) {
                // Zeigt eine Fehlermeldung, wenn etwas schiefgeht:
                showToast(e.message || "Swipe failed");
            }
        });
    }

    // ============================================================
    // BUTTON – LIKE (HERZ) – PROFIL LIKEN
    // ============================================================

    // Prüft: Nur auf der Homepage und nur wenn der Button existiert, wird der Klick aktiviert:
    if (onHome && likeBtn) {
        // Reagiert auf Klick auf den LIKE-Button:
        likeBtn.addEventListener("click", async () => {
            // Holt das aktuelle Profil oben auf dem Stapel:
            const p = topProfile();
            // Wenn es kein Profil gibt, macht es nichts:
            if (!p) return;

            // Entfernt die Karte sofort aus der UI:
            removeTop();
            // Versucht dann den Swipe ans Backend zu senden:
            try {
                // Sendet „LIKE“ an den Server und wartet auf die Antwort:
                const r = await sendSwipeToServer(p, "LIKE");
                // Wenn der Server sagt „matched“, zeigt es eine Match-Nachricht:
                if (r?.matched) showToast("It's a match! ✨");
            } catch (e) {
                // Zeigt eine Fehlermeldung, wenn etwas schiefgeht:
                showToast(e.message || "Swipe failed");
            }
        });
    }

    // ============================================================
    // BUTTON – SUPER LIKE (STAR) – PROFIL SUPER LIKEN
    // ============================================================

    // Prüft: Nur auf der Homepage und nur wenn der Button existiert, wird der Klick aktiviert:
    if (onHome && superBtn) {
        // Reagiert auf Klick auf den SUPER-Button:
        superBtn.addEventListener("click", async () => {
            // Holt das aktuelle Profil oben auf dem Stapel:
            const p = topProfile();
            // Wenn es kein Profil gibt, macht es nichts:
            if (!p) return;

            // Entfernt die Karte sofort aus der UI:
            removeTop();
            // Versucht dann den Swipe ans Backend zu senden:
            try {
                // Sendet „SUPER“ an den Server und wartet auf die Antwort:
                const r = await sendSwipeToServer(p, "SUPER");
                // Wenn der Server sagt „matched“, zeigt es eine Match-Nachricht:
                if (r?.matched) showToast("It's a match! ⭐");
            } catch (e) {
                // Zeigt eine Fehlermeldung, wenn etwas schiefgeht:
                showToast(e.message || "Swipe failed");
            }
        });
    }


    // ============================================================
    // BUTTON – RELOAD – PROFIL-LISTE NEU LADEN
    // ============================================================

    // Prüft: Nur auf der Homepage und nur wenn der Button existiert, wird der Klick aktiviert:
    if (onHome && reloadBtn) {
        // Reagiert auf Klick auf den Reload-Button:
        reloadBtn.addEventListener("click", () => {
            // Setzt die Profile-Liste zurück auf die Beispiel-Profile:
            profiles = [...seedProfiles];
            // Zeichnet die Karten neu:
            render();
            // Lädt zusätzlich frische Discover-Profile vom Server:
            loadDiscoverProfiles();
        });
    }

    // ============================================================
    // START – ERSTER AUFBAU AUF DER HOMEPAGE
    // ============================================================

    // Wenn man auf der Homepage ist, startet die Anzeige sofort:
    if (onHome) {
        // Baut die Karten im Deck auf:
        render();
        // Lädt Profile vom Server und filtert sie nach Preferences:
        loadDiscoverProfiles();
    }

    // =========================
    // Date Roulette Modal
    // =========================

    // ============================================================
    // DATE ROULETTE – BUTTON + MODAL (FENSTER) Oeffnen/Schliessen
    // ============================================================

    // Holt den Button, der das Date-Roulette öffnet:
    const rouletteBtn = document.getElementById("rouletteBtn");
    // Holt das Date-Roulette-Fenster:
    const rouletteModal = document.getElementById("rouletteModal");
    // Holt den normalen Close-Button im Date-Roulette:
    const closeRoulette = document.getElementById("closeRoulette");
    // Holt das X oben zum Schließen:
    const closeRouletteX = document.getElementById("closeRouletteX");

    // Wenn Button und Modal da sind, öffnet der Klick das Fenster:
    if (rouletteBtn && rouletteModal) {
        rouletteBtn.addEventListener("click", () => rouletteModal.classList.remove("hidden"));
    }
    // Wenn Close-Button und Modal da sind, schließt der Klick das Fenster:
    if (closeRoulette && rouletteModal) {
        closeRoulette.addEventListener("click", () => rouletteModal.classList.add("hidden"));
    }
    // Wenn Close-X und Modal da sind, schließt der Klick das Fenster:
    if (closeRouletteX && rouletteModal) {
        closeRouletteX.addEventListener("click", () => rouletteModal.classList.add("hidden"));
    }

    // ============================================================
    // DATE ROULETTE – LISTEN MIT IDEEN (DATE IDEAS)
    // ============================================================

    // Enthält verschiedene Date-Ideen, aus denen später zufällig gewählt wird:
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

    // Enthält verschiedene Essen-/Restaurant-Ideen, aus denen später zufällig gewählt wird:
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

    // ============================================================
    // DATE ROULETTE – ELEMENTE FUER DIE AUSWAHL UND DAS SPIN-FENSTER
    // ============================================================

    // Button für Date-Ideen:
    const dateIdeasBtn = document.getElementById("dateIdeasBtn");
    // Button für Essen/Restaurants:
    const foodDiningBtn = document.getElementById("foodDiningBtn");
    // Zweites Fenster für das „Drehen/Spin“-Ergebnis:
    const spinModal = document.getElementById("spinModal");
    // Überschrift im Spin-Fenster:
    const spinTitle = document.getElementById("spinTitle");
    // Ergebnis-Text im Spin-Fenster:
    const spinResult = document.getElementById("spinResult");
    // Button, der „dreht“ und ein Ergebnis auswählt:
    const spinBtn = document.getElementById("spinBtn");
    // Button zum Schließen vom Spin-Fenster:
    const closeSpin = document.getElementById("closeSpin");
    // Pfeil/Zurück-Button, um wieder zur Auswahl zu gehen:
    const backToChoice = document.getElementById("backToChoice");

    // Merkt sich, welche Liste gerade aktiv ist (Date-Ideen oder Essen):
    let currentList = [];


// ============================================================
// DATE ROULETTE – AUSWAHL (DATE IDEAS / FOOD) + SPIN + ZURUECK
// ============================================================

// Prüft: Nur wenn alle wichtigen Elemente da sind, wird der Klick aktiviert:
    if (dateIdeasBtn && rouletteModal && spinModal && spinTitle && spinResult) {
        // Reagiert auf Klick auf „Date Ideas“:
        dateIdeasBtn.addEventListener("click", () => {
            // Setzt die aktuelle Liste auf die Date-Ideen:
            currentList = dateIdeas;
            // Setzt die Überschrift im Spin-Fenster:
            spinTitle.textContent = "Date Ideas Roulette";
            // Setzt den Start-Text im Ergebnisfeld:
            spinResult.textContent = "Tap Spin";
            // Versteckt das erste Fenster (Auswahl):
            rouletteModal.classList.add("hidden");
            // Zeigt das zweite Fenster (Spin):
            spinModal.classList.remove("hidden");
        });
    }

// Prüft: Nur wenn alle wichtigen Elemente da sind, wird der Klick aktiviert:
    if (foodDiningBtn && rouletteModal && spinModal && spinTitle && spinResult) {
        // Reagiert auf Klick auf „Food & Dining“:
        foodDiningBtn.addEventListener("click", () => {
            // Setzt die aktuelle Liste auf die Food-Liste:
            currentList = foodDining;
            // Setzt die Überschrift im Spin-Fenster:
            spinTitle.textContent = "Food & Dining Roulette";
            // Setzt den Start-Text im Ergebnisfeld:
            spinResult.textContent = "Tap Spin";
            // Versteckt das erste Fenster (Auswahl):
            rouletteModal.classList.add("hidden");
            // Zeigt das zweite Fenster (Spin):
            spinModal.classList.remove("hidden");
        });
    }

// ============================================================
// DATE ROULETTE – SPIN (ZUFALLS-AUSWAHL)
// ============================================================

// Prüft: Nur wenn der Spin-Button und das Ergebnisfeld da sind, wird der Klick aktiviert:
    if (spinBtn && spinResult) {
        // Reagiert auf Klick auf „Spin“:
        spinBtn.addEventListener("click", () => {
            // Wenn keine Liste gesetzt ist, wird nichts gemacht:
            if (!currentList.length) return;
            // Wählt zufällig einen Eintrag aus der aktuellen Liste:
            const choice = currentList[Math.floor(Math.random() * currentList.length)];
            // Zeigt das Ergebnis im Spin-Fenster an:
            spinResult.textContent = choice;
        });
    }

// ============================================================
// DATE ROULETTE – SPIN-FENSTER SCHLIESSEN
// ============================================================

// Prüft: Nur wenn Buttons und Fenster da sind, wird der Klick aktiviert:
    if (closeSpin && spinModal && rouletteModal) {
        // Reagiert auf Klick auf „Close“ im Spin-Fenster:
        closeSpin.addEventListener("click", () => {
            // Versteckt das Spin-Fenster:
            spinModal.classList.add("hidden");
            // Versteckt auch das Auswahl-Fenster (damit alles zu ist):
            rouletteModal.classList.add("hidden");
        });
    }

// ============================================================
// DATE ROULETTE – ZURUECK ZUR AUSWAHL
// ============================================================

// Prüft: Nur wenn Buttons und Fenster da sind, wird der Klick aktiviert:
    if (backToChoice && spinModal && rouletteModal) {
        // Reagiert auf Klick auf „Back“:
        backToChoice.addEventListener("click", () => {
            // Versteckt das Spin-Fenster:
            spinModal.classList.add("hidden");
            // Zeigt wieder das Auswahl-Fenster:
            rouletteModal.classList.remove("hidden");
        });
    }


// ============================================================
// LOGOUT – AUSLOGGEN UND ZUR LOGIN-SEITE GEHEN
// ============================================================

// Holt den Logout-Button aus der Seite:
    const logoutBtn = document.getElementById("logoutBtn");
// Prüft: Nur wenn der Button existiert, wird der Klick aktiviert:
    if (logoutBtn) {
        // Reagiert auf Klick auf Logout:
        logoutBtn.addEventListener("click", async () => {
            // Sendet ans Backend: Session soll beendet werden:
            await fetch("/api/logout", { method: "POST" });
            // Geht danach zur Login-Seite zurück:
            window.location.href = "/login";
        });
    }



// ============================================================
// SETTINGS – FENSTER Oeffnen/Schliessen + ACCOUNT LÖSCHEN
// ============================================================

// Holt den Settings-Button:
    const settingsBtn = document.getElementById("settingsBtn");
// Holt das Settings-Fenster:
    const settingsModal = document.getElementById("settingsModal");
// Holt den normalen Close-Button im Settings-Fenster:
    const closeSettings = document.getElementById("closeSettings");
// Holt das X oben zum Schließen:
    const closeSettingsX = document.getElementById("closeSettingsX");
// Holt den Delete-Button für Account löschen:
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

// Versteckt das Settings-Fenster:
    function hideSettingsModal() {
        // Prüft sicher, ob es das Fenster gibt:
        if (settingsModal) settingsModal.classList.add("hidden");
    }
// Zeigt das Settings-Fenster:
    function showSettingsModal() {
        // Prüft sicher, ob es das Fenster gibt:
        if (settingsModal) settingsModal.classList.remove("hidden");
    }

// Prüft: Nur wenn Button und Fenster da sind, wird der Klick aktiviert:
    if (settingsBtn && settingsModal) {
        // Öffnet das Settings-Fenster beim Klick:
        settingsBtn.addEventListener("click", showSettingsModal);
    }
// Schließt das Settings-Fenster über den normalen Close-Button:
    if (closeSettings) closeSettings.addEventListener("click", hideSettingsModal);
// Schließt das Settings-Fenster über das X:
    if (closeSettingsX) closeSettingsX.addEventListener("click", hideSettingsModal);

// ============================================================
// ACCOUNT LOESCHEN – ABFRAGE + BACKEND DELETE + FEHLER ANZEIGEN
// ============================================================

// Prüft: Nur wenn der Delete-Button existiert, wird der Klick aktiviert:
    if (deleteAccountBtn) {
        // Reagiert auf Klick auf „Delete Account“:
        deleteAccountBtn.addEventListener("click", async () => {
            // Fragt zur Sicherheit nach, ob es wirklich gelöscht werden soll:
            const ok = confirm("Do you really want to delete your account? This cannot be undone.");
            // Wenn abgebrochen wird, passiert nichts:
            if (!ok) return;

            // Sendet ans Backend: Account soll gelöscht werden:
            const res = await fetch("/api/account", { method: "DELETE" });
            // Wenn es geklappt hat, geht es zurück zur Login-Seite:
            if (res.ok) {
                window.location.href = "/login";
                return;
            }

            // Wenn es nicht geklappt hat, versucht es eine Fehlermeldung aus JSON zu lesen:
            try {
                // Liest die Fehlermeldung vom Backend:
                const data = await res.json();
                // Zeigt die Fehlermeldung an, oder eine Standard-Meldung:
                alert(data.message || "Delete failed");
            } catch {
                // Wenn JSON nicht lesbar ist, zeigt es eine Standard-Meldung:
                alert("Delete failed");
            }
        });
    }



// ============================================================
// PROFILE – WECHSEL ZUR CREATE-PROFILE SEITE IM EDIT-MODUS
// ============================================================

// Holt den Profile-Button:
    const profileBtn = document.getElementById("profileBtn");
// Prüft: Nur wenn der Button existiert, wird der Klick aktiviert:
    if (profileBtn) {
        // Reagiert auf Klick auf Profile:
        profileBtn.addEventListener("click", () => {
            // Geht zur Profil-Seite und startet direkt im Edit-Modus:
            window.location.href = "/create-profile?mode=edit";
        });
    }



// ============================================================
// INFO-FENSTER – ERKLAERUNG FÜR WINGMEN UND BEST FRIENDS
// ============================================================

// Holt das Info-Fenster:
    const infoModal = document.getElementById("infoModal");
// Holt die Überschrift im Info-Fenster:
    const infoTitle = document.getElementById("infoTitle");
// Holt den Textbereich im Info-Fenster:
    const infoText = document.getElementById("infoText");
// Holt das X zum Schließen:
    const closeInfoX = document.getElementById("closeInfoX");
// Holt den normalen Close-Button:
    const closeInfo = document.getElementById("closeInfo");

// Holt den Info-Button bei „Wingmen“:
    const wingmenInfoBtn = document.getElementById("wingmenInfoBtn");
// Holt den Info-Button bei „Best Friends“:
    const bestFriendsInfoBtn = document.getElementById("bestFriendsInfoBtn");

// Öffnet das Info-Fenster und setzt Titel und Text:
    function openInfo(title, text) {
        // Wenn etwas fehlt, wird abgebrochen:
        if (!infoModal || !infoTitle || !infoText) return;
        // Setzt den Titel:
        infoTitle.textContent = title;
        // Setzt den Text:
        infoText.textContent = text;
        // Zeigt das Fenster:
        infoModal.classList.remove("hidden");
    }

// Schließt das Info-Fenster:
    function closeInfoModal() {
        // Wenn das Fenster fehlt, wird abgebrochen:
        if (!infoModal) return;
        // Versteckt das Fenster:
        infoModal.classList.add("hidden");
    }

// ============================================================
// INFO – BUTTONS FUER WINGMEN UND BEST FRIENDS
// ============================================================

// Prüft: Nur wenn der Button existiert, wird der Klick aktiviert:
    if (wingmenInfoBtn) {
        // Öffnet beim Klick die Erklärung zu Wingmen:
        wingmenInfoBtn.addEventListener("click", () => {
            openInfo(
                "Wingmen",
                "Wingmen are your trusted helpers. You can assign users as wingmen, and they can hype you up."
            );
        });
    }

// Prüft: Nur wenn der Button existiert, wird der Klick aktiviert:
    if (bestFriendsInfoBtn) {
        // Öffnet beim Klick die Erklärung zu Best Friends:
        bestFriendsInfoBtn.addEventListener("click", () => {
            openInfo(
                "Best Friends",
                "Best Friends are users who assigned YOU as their wingman. They appear automatically here."
            );
        });
    }

// Schließt das Info-Fenster über das X:
    if (closeInfoX) closeInfoX.addEventListener("click", closeInfoModal);
// Schließt das Info-Fenster über den normalen Close-Button:
    if (closeInfo) closeInfo.addEventListener("click", closeInfoModal);

// ============================================================
// INFO – KLICK AUSSERHALB SCHLIESST DAS FENSTER
// ============================================================

// Prüft: Nur wenn das Fenster existiert, wird der Klick aktiviert:
    if (infoModal) {
        // Reagiert auf Klick in den Hintergrund des Fensters:
        infoModal.addEventListener("click", (e) => {
            // Wenn wirklich der Hintergrund geklickt wurde, wird geschlossen:
            if (e.target === infoModal) closeInfoModal();
        });
    }


// ============================================================
// MESSAGES / MATCHES / CHAT – ELEMENTE HOLEN (BUTTONS, FENSTER, LISTEN)
// ============================================================

// Holt den Button, der das Messages-Fenster öffnet:
    const messagesBtn = document.getElementById("messagesBtn");
// Holt das Messages-Fenster (Modal):
    const messagesModal = document.getElementById("messagesModal");
// Holt den normalen Close-Button:
    const closeMessages = document.getElementById("closeMessages");
// Holt das X oben zum Schließen:
    const closeMessagesX = document.getElementById("closeMessagesX");

// Holt die Liste, in der die Matches angezeigt werden:
    const matchesList = document.getElementById("matchesList");
// Holt den Bereich, wo die Chat-Überschrift steht:
    const chatHeader = document.getElementById("chatHeader");
// Holt den Bereich, wo die Chat-Nachrichten angezeigt werden:
    const chatMessages = document.getElementById("chatMessages");
// Holt das Eingabefeld für neue Chat-Nachrichten:
    const chatInput = document.getElementById("chatInput");
// Holt den Button zum Senden der Chat-Nachricht:
    const sendChatBtn = document.getElementById("sendChatBtn");

// ============================================================
// CHAT-STATUS – MERKT SICH, MIT WEM GERADE GECHATTET WIRD
// ============================================================

// Merkt sich die User-ID von der anderen Person im aktuellen Chat:
    let currentChatOtherId = null;
// Merkt sich die eigene User-ID, damit sie nicht ständig neu geladen werden muss:
    let myUserIdCache = null;

// ============================================================
// EIGENE USER-ID HOLEN – WIRD GESPEICHERT (CACHE)
// ============================================================

// Holt die eigene User-ID aus der Session (Debug-Route) und merkt sie sich:
    async function getMyUserId() {
        // Wenn die ID schon gemerkt wurde, wird sie sofort zurückgegeben:
        if (myUserIdCache) return myUserIdCache;
        // Versucht die Anfrage sicher abzufangen:
        try {
            // Fragt die Debug-Session ab (enthält zB. userId):
            const res = await fetch("/debug-session");
            // Liest die Antwort als JSON:
            const data = await res.json();
            // Speichert die eigene User-ID oder null, wenn nichts da ist:
            myUserIdCache = data?.userId || null;
            // Gibt die gemerkte ID zurück:
            return myUserIdCache;
        } catch {
            // Wenn etwas schiefgeht, wird null zurückgegeben:
            return null;
        }
    }

// ============================================================
// MESSAGES-FENSTER OEFFNEN / SCHLIESSEN
// ============================================================

// Öffnet das Messages-Fenster und lädt direkt die Matches:
    function openMessagesModal() {
        // Wenn das Fenster fehlt, wird abgebrochen:
        if (!messagesModal) return;
        // Zeigt das Fenster:
        messagesModal.classList.remove("hidden");
        // Lädt die Matches-Liste neu:
        loadMatches();
    }

// Schließt das Messages-Fenster:
    function closeMessagesModal() {
        // Wenn das Fenster fehlt, wird abgebrochen:
        if (!messagesModal) return;
        // Versteckt das Fenster:
        messagesModal.classList.add("hidden");
    }

// Aktiviert den Klick auf den Messages-Button:
    if (messagesBtn) messagesBtn.addEventListener("click", openMessagesModal);
// Aktiviert den Klick auf den Close-Button:
    if (closeMessages) closeMessages.addEventListener("click", closeMessagesModal);
// Aktiviert den Klick auf das X:
    if (closeMessagesX) closeMessagesX.addEventListener("click", closeMessagesModal);

// ============================================================
// KLICK AUSSERHALB – SCHLIESST DAS MESSAGES-FENSTER
// ============================================================

// Wenn das Fenster existiert, wird ein Klick-Handler gesetzt:
    if (messagesModal) {
        messagesModal.addEventListener("click", (e) => {
            // Wenn wirklich der Hintergrund geklickt wurde, wird geschlossen:
            if (e.target === messagesModal) closeMessagesModal();
        });
    }

// ============================================================
// MATCHES LADEN – LISTE ANZEIGEN + CHAT + UNMATCH
// ============================================================

// Lädt die Matches vom Backend und baut die Liste neu:
    async function loadMatches() {
        // Wenn die Liste fehlt, wird abgebrochen:
        if (!matchesList) return;

        // Zeigt zuerst einen Lade-Text in der Liste:
        matchesList.innerHTML =
            `<li class="search-result-item"><div class="search-result-name">Loading...</div></li>`;

        // Versucht die Server-Anfrage sicher abzufangen:
        try {
            // Fragt die Matches beim Backend ab:
            const res = await fetch("/api/matches");
            // Liest JSON ein, oder nimmt leere Daten, wenn JSON kaputt ist:
            const data = await res.json().catch(() => ({}));

            // Wenn die Antwort nicht ok ist, zeigt es eine Fehlermeldung:
            if (!res.ok) {
                matchesList.innerHTML =
                    `<li class="search-result-item"><div class="search-result-name">Failed to load matches</div></li>`;
                return;
            }

            // Holt die Matches-Liste sicher als Array:
            const matches = Array.isArray(data.matches) ? data.matches : [];

            // Wenn es keine Matches gibt, zeigt es eine Info:
            if (!matches.length) {
                matchesList.innerHTML =
                    `<li class="search-result-item"><div class="search-result-name">No matches yet</div></li>`;
                return;
            }

            // ============================================================
            // MATCHES LISTE BAUEN – JE MATCH: NAME, ALTER, BUTTONS
            // ============================================================

            // Baut die HTML-Liste für alle Matches:
            // - Name ist klickbar (Profil öffnen)
            // - Button „Chat“ öffnet Chat
            // - Button „❌“ macht Unmatch
            matchesList.innerHTML = matches.map(m => `
      <li class="search-result-item" data-other-id="${m.otherId}">
        <div class="search-result-top">
          <div class="search-result-name match-profile-link" data-profile-id="${m.otherId}">
  ${escapeHtml(m.name || "Match")}
</div>

          <div style="display:flex; gap:8px;">
            <button class="small-btn" data-open-chat="${m.otherId}">Chat</button>
            <button class="small-btn danger" data-unmatch="${m.otherId}">❌</button>
          </div>
        </div>
        <div class="search-result-sub">
          ${escapeHtml(String(m.age ?? ""))}${m.gender ? " • " + escapeHtml(m.gender) : ""}
        </div>
      </li>
    `).join("");

            // ============================================================
            // PROFIL-LINK – KLICK AUF NAME Oeffnet PROFIL-SEITE
            // ============================================================

            // Sucht alle klickbaren Namen und setzt Klick-Handler:
            matchesList.querySelectorAll(".match-profile-link").forEach(el => {
                el.addEventListener("click", (e) => {
                    // Verhindert, dass der Klick andere Klicks auslöst:
                    e.stopPropagation();
                    // Holt die ID vom Profil aus dem data-Attribut:
                    const otherId = Number(el.dataset.profileId);
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!otherId) return;
                    // Wechselt zur Profil-Seite der anderen Person:
                    window.location.href = `/profile/${otherId}`;
                });
            });


            // ============================================================
            // CHAT BUTTON – STARTET CHAT MIT DEM MATCH
            // ============================================================

            // Findet alle Chat-Buttons und setzt Klick-Handler:
            matchesList.querySelectorAll("[data-open-chat]").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    // Verhindert, dass der Klick andere Klicks auslöst:
                    e.stopPropagation();
                    // Holt die ID aus dem Button:
                    const otherId = Number(btn.getAttribute("data-open-chat"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!otherId) return;

                    // Merkt sich: mit dieser Person ist jetzt der Chat offen:
                    currentChatOtherId = otherId;
                    // Setzt die Überschrift im Chat:
                    if (chatHeader) chatHeader.textContent = "Chat";
                    // Lädt die Chat-Nachrichten vom Backend:
                    await loadChat(otherId);
                });
            });

            // ============================================================
            // UNMATCH BUTTON – MATCH LOESCHEN + CHAT VERLIEREN
            // ============================================================

            // Findet alle Unmatch-Buttons und setzt Klick-Handler:
            matchesList.querySelectorAll("[data-unmatch]").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    // Verhindert, dass der Klick andere Klicks auslöst:
                    e.stopPropagation();
                    // Holt die ID aus dem Button:
                    const otherId = Number(btn.getAttribute("data-unmatch"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!otherId) return;

                    // Fragt zur Sicherheit nach, ob wirklich unmatch passieren soll:
                    const ok = confirm("Do you really want to unmatch? You will lose this chat.");
                    // Wenn abgebrochen wird, passiert nichts:
                    if (!ok) return;

                    // Versucht die Unmatch-Anfrage sicher abzufangen:
                    try {
                        // Sendet ans Backend: Match löschen:
                        const r = await fetch(`/api/matches/${otherId}`, { method: "DELETE" });
                        // Liest die Antwort, oder nimmt leere Daten:
                        const out = await r.json().catch(() => ({}));

                        // Wenn es nicht geklappt hat, zeigt es eine Fehlermeldung:
                        if (!r.ok) {
                            alert(out.message || "Unmatch failed");
                            return;
                        }

                        // ============================================================
                        // CHAT LEEREN – WENN MAN GERADE DIESEN CHAT OFFEN HAT
                        // ============================================================

                        // Wenn genau dieser Chat offen war, wird er zurückgesetzt:
                        if (currentChatOtherId === otherId) {
                            // Merkt sich: kein Chat ist mehr offen:
                            currentChatOtherId = null;
                            // Setzt die Überschrift zurück:
                            if (chatHeader) chatHeader.textContent = "Select a match";
                            // Leert die Chat-Nachrichten im UI:
                            if (chatMessages) chatMessages.innerHTML = "";
                        }

                        // Zeigt eine kurze Erfolgsmeldung:
                        showToast("Unmatched ✅");

                        // ============================================================
                        // MATCHES LISTE NEU LADEN – DAMIT ES SOFORT AKTUELL IST
                        // ============================================================

                        // Lädt die Matches-Liste neu:
                        await loadMatches();

                        // Optional: Lädt Discover neu, damit das Profil wieder auftauchen kann:
                        if (typeof loadDiscoverProfiles === "function") loadDiscoverProfiles();

                    } catch {
                        // Wenn etwas schiefgeht, zeigt es eine Standard-Fehlermeldung:
                        alert("Unmatch failed");
                    }
                });
            });

        } catch {
            // Wenn Match-Laden komplett fehlschlägt, zeigt es eine Fehlermeldung:
            matchesList.innerHTML =
                `<li class="search-result-item"><div class="search-result-name">Failed to load matches</div></li>`;
        }
    }
// ============================================================
// CHAT – NACHRICHTEN LADEN + SENDEN
// ============================================================

// Lädt alle Nachrichten für den Chat mit einer bestimmten Person:
    async function loadChat(otherId) {
        // Wenn der Chat-Bereich fehlt, wird abgebrochen:
        if (!chatMessages) return;

        // Zeigt zuerst einen Lade-Text:
        chatMessages.innerHTML = "Loading...";
        // Holt die eigene User-ID, damit „me“ richtig markiert werden kann:
        const me = await getMyUserId();

        // Versucht die Server-Anfrage sicher abzufangen:
        try {
            // Fragt die Chat-Nachrichten vom Backend ab:
            const res = await fetch(`/api/chat/${otherId}`);
            // Liest JSON, oder nimmt leere Daten, wenn JSON nicht klappt:
            const data = await res.json().catch(() => ({}));

            // Wenn die Antwort nicht ok ist, zeigt es eine Fehlermeldung:
            if (!res.ok) {
                chatMessages.innerHTML = escapeHtml(data.message || "Failed to load chat");
                return;
            }

            // Holt die Nachrichten sicher als Array:
            const msgs = Array.isArray(data.messages) ? data.messages : [];

            // Wenn es noch keine Nachrichten gibt, zeigt es einen freundlichen Hinweis:
            if (!msgs.length) {
                chatMessages.innerHTML = `<div class="side-sub">No messages yet. Say hi 👋</div>`;
                return;
            }

            // Baut alle Nachrichten als HTML:
            // - Wenn die Nachricht von „mir“ ist, bekommt sie die Klasse „me“:
            chatMessages.innerHTML = msgs.map(m => `
      <div class="msg ${m.sender_id === me ? "me" : ""}">
        ${escapeHtml(m.text)}
      </div>
    `).join("");

            // Scrollt automatisch ganz nach unten, damit die neuesten Nachrichten sichtbar sind:
            chatMessages.scrollTop = chatMessages.scrollHeight;

        } catch {
            // Wenn etwas schiefgeht, zeigt es eine Standard-Fehlermeldung:
            chatMessages.innerHTML = "Failed to load chat";
        }
    }

    // Sendet eine neue Chat-Nachricht an das Backend:
    async function sendChat() {
        // Holt die ID der Person, mit der gerade gechattet wird:
        const otherId = currentChatOtherId;
        // Wenn kein Chat ausgewählt ist, zeigt es eine Info:
        if (!otherId) {
            showToast("Select a match first");
            return;
        }

        // Holt den Text aus dem Eingabefeld und entfernt Leerzeichen:
        const text = (chatInput?.value || "").trim();
        // Wenn der Text leer ist, wird nichts gesendet:
        if (!text) return;

        // Leert das Eingabefeld sofort, damit es direkt „weg“ ist:
        if (chatInput) chatInput.value = "";

        // Versucht die Server-Anfrage sicher abzufangen:
        try {
            // Sendet die Nachricht als JSON ans Backend:
            const res = await fetch(`/api/chat/${otherId}`, {
                // Verwendet POST, weil etwas Neues gespeichert wird:
                method: "POST",
                // Sagt dem Backend: es kommt JSON:
                headers: { "Content-Type": "application/json" },
                // Packt den Text als JSON in den Body:
                body: JSON.stringify({ text })
            });

            // Liest die Antwort, oder nimmt leere Daten:
            const data = await res.json().catch(() => ({}));
            // Wenn es nicht geklappt hat, zeigt es eine Fehlermeldung:
            if (!res.ok) {
                showToast(data.message || "Send failed");
                return;
            }

            // Lädt danach den Chat neu, damit die neue Nachricht sofort erscheint:
            await loadChat(otherId);
        } catch {
            // Wenn etwas schiefgeht, zeigt es eine Standard-Fehlermeldung:
            showToast("Send failed");
        }
    }

// Aktiviert den Klick auf den Send-Button:
    if (sendChatBtn) sendChatBtn.addEventListener("click", sendChat);
// Aktiviert „Enter“ im Eingabefeld zum Senden:
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            // Wenn Enter gedrückt wird, wird gesendet:
            if (e.key === "Enter") sendChat();
        });
    }



// ============================================================
// WINGMEN / BEST FRIENDS – LISTEN LADEN UND UI AKTUALISIEREN
// ============================================================

// Lädt Wingmen, Best Friends und offene Requests und baut die Listen neu:
    async function refreshWingmanLists() {
        // Holt alle Requests, die man selbst gesendet hat:
        const sentReqRes = await fetch("/api/wingman/requests/sent");
        // Liest die Antwort als JSON:
        const sentReqData = await sentReqRes.json();
        // Macht daraus sicher ein Array (oder nimmt leere Liste):
        const sentRequests = Array.isArray(sentReqData) ? sentReqData : [];

        // Holt die Wingmen-Liste aus dem UI:
        const wingmenList = document.getElementById("wingmenList");
        // Holt die Best-Friends-Liste aus dem UI:
        const bestFriendsList = document.getElementById("bestFriendsList");
        // Filtert die Requests, die noch offen sind:
        const pendingRequests = sentRequests.filter(r => r.status === "PENDING");

        // Wenn die Listen nicht existieren, wird abgebrochen:
        if (!wingmenList || !bestFriendsList) return;

        // Versucht das Laden sicher abzufangen:
        try {
            // Holt die aktuellen Wingmen/BestFriends vom Backend:
            // MUST-RQ 10: holt die Daten
            const res = await fetch("/api/wingmen");
            // Liest die Antwort als JSON:
            const data = await res.json();
            // Wenn es nicht geklappt hat, wird abgebrochen:
            if (!res.ok) return;

            // Holt Wingmen sicher als Array:
            // MUST-RQ: 10
            const wingmen = Array.isArray(data.wingmen) ? data.wingmen : [];
            // Holt Best Friends sicher als Array:
            // MUST-RQ 11: holt Bestfriends
            const bestFriends = Array.isArray(data.bestFriends) ? data.bestFriends : [];



            // ============================================================
            // WINGMEN HTML BAUEN – JEDER WINGMAN MIT REMOVE-BUTTON
            // ============================================================

            // Baut Wingmen-Liste als HTML:
            // Must-RQ 10: rendert Wingman links
            const wingmenHtml = wingmen.map(
                (u) => `
    <li class="side-item">
        <div class="side-item-row">
            <div>
                <div class="side-name profile-link" data-profile-id="${u.id}">
  ${escapeHtml(u.name || "User")}
</div>

                <div class="side-sub">
                    ${escapeHtml(String(u.age ?? ""))}${u.gender ? " • " + escapeHtml(u.gender) : ""}
                </div>
            </div>
            <div class="side-item-actions">
                <button class="small-btn danger" data-remove-wingman="${u.id}">Remove</button>
            </div>
        </div>
    </li>
`
            ).join("");

            // ============================================================
            // PENDING REQUESTS HTML BAUEN – REQUESTS, DIE NOCH OFFEN SIND
            // ============================================================

            // Baut die offenen Requests als HTML:
            const pendingHtml = pendingRequests.map(
                (r) => `
    <li class="side-item pending">
      <div class="side-item-row">
        <div>
          <div class="side-name">${escapeHtml(r.receiverName)}</div>
          <div class="side-sub">Request pending ⏳</div>
        </div>
        <div class="side-item-actions">
          <button class="small-btn danger" data-cancel-wingman-request="${r.id}">Cancel</button>
        </div>
      </div>
    </li>
  `
            ).join("");



            // ============================================================
            // WINGMEN LISTE SETZEN – WINGMEN + PENDING ODER LEER-HINWEIS
            // ============================================================

            // Setzt den Inhalt der Wingmen-Liste:
            // - Wenn es Wingmen oder Pending gibt, wird beides angezeigt
            // - Sonst kommt ein leerer Hinweis
            wingmenList.innerHTML =
                (wingmenHtml || pendingHtml)
                    ? wingmenHtml + pendingHtml
                    : `<li class="side-item">
         <div class="side-name">No wingmen yet</div>
         <div class="side-sub">Tap ＋ to add one</div>
       </li>`;
            // Jetzt existieren Buttons im DOM, deshalb können jetzt die Klick-Handler angehängt werden

            // ============================================================
            // PENDING – CANCEL BUTTONS AKTIVIEREN (REQUEST ABBRECHEN)
            // ============================================================

            // Findet alle Cancel-Buttons und setzt Klick-Handler:
            wingmenList.querySelectorAll("[data-cancel-wingman-request]").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    // Stoppt andere Klicks (damit kein anderer Handler mitläuft):
                    e.stopPropagation();

                    // Holt die Request-ID:
                    const requestId = Number(btn.getAttribute("data-cancel-wingman-request"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!requestId) return;

                    // Fragt zur Sicherheit nach:
                    const ok = confirm("Cancel this wingman request?");
                    // Wenn abgebrochen wird, passiert nichts:
                    if (!ok) return;

                    // Sendet ans Backend: Request löschen:
                    const r = await fetch(`/api/wingman/request/${requestId}`, { method: "DELETE" });
                    // Liest die Antwort, oder nimmt leere Daten:
                    const out = await r.json().catch(() => ({}));

                    // Wenn es nicht geklappt hat, zeigt es eine Fehlermeldung:
                    if (!r.ok) {
                        alert(out.message || "Cancel failed");
                        return;
                    }

                    // Zeigt eine kurze Info:
                    showToast("Request cancelled");
                    // Lädt die Listen neu, damit es sofort aktualisiert ist:
                    refreshWingmanLists();
                });
            });



            // ============================================================
            // BEST FRIENDS LISTE SETZEN – MIT REMOVE-BUTTON
            // ============================================================

            // Setzt die Best-Friends-Liste:
            // MUST-RQ 11: rendert die Liste rechts
            bestFriendsList.innerHTML = bestFriends.length
                ? bestFriends
                    .map(
                        (u) => `
  <li class="side-item">
    <div class="side-item-row">
      <div>
       <div class="side-name profile-link" data-profile-id="${u.id}">
    ${escapeHtml(u.name || "User")}
</div>

        <div class="side-sub">${escapeHtml(String(u.age ?? ""))}${u.gender ? " • " + escapeHtml(u.gender) : ""}</div>
      </div>

      <div class="side-item-actions" style="display:flex; gap:8px; align-items:center;">
        <span class="side-sub">Assigned you</span>
        <button class="small-btn danger" data-remove-bestfriend="${u.id}">Remove</button>
      </div>
    </div>
  </li>
`
                    )
                    .join("")
                : `<li class="side-item"><div class="side-name">No best friends yet</div><div class="side-sub">They appear when someone picks you</div></li>`;

            // ============================================================
            // PROFIL-LINKS AKTIVIEREN – KLICK Oeffnet PROFIL-SEITE
            // ============================================================

            // Findet alle Elemente mit „profile-link“ und setzt Klick-Handler:
            document.querySelectorAll(".profile-link").forEach(el => {
                el.addEventListener("click", () => {
                    // Holt die User-ID aus dem data-Attribut:
                    const userId = el.dataset.profileId;
                    // Wenn keine ID da ist, wird abgebrochen:
                    if (!userId) return;

                    // Öffnet Profilansicht
                    // Wechselt zur Profil-Seite dieser Person:
                    window.location.href = `/profile/${userId}`;

                });
            });

            // ============================================================
            // WINGMEN REMOVE BUTTONS – WINGMAN ENTFERNEN
            // ============================================================

            // Findet alle Remove-Buttons in der Wingmen-Liste:
            wingmenList.querySelectorAll("[data-remove-wingman]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    // Holt die Wingman-ID:
                    const id = Number(btn.getAttribute("data-remove-wingman"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!id) return;

                    // Fragt zur Sicherheit nach:
                    const ok = confirm("Remove this wingman?");
                    // Wenn abgebrochen wird, passiert nichts:
                    if (!ok) return;

                    // Sendet ans Backend: Wingman entfernen:
                    const r = await fetch(`/api/wingmen/${id}`, { method: "DELETE" });
                    // Wenn es geklappt hat, werden die Listen neu geladen:
                    if (r.ok) {
                        refreshWingmanLists();
                    } else {
                        // Wenn es nicht geklappt hat, versucht es eine genaue Fehlermeldung zu zeigen:
                        try {
                            const err = await r.json();
                            alert(err.message || "Remove failed");
                        } catch {
                            // Wenn JSON nicht klappt, zeigt es eine Standard-Meldung:
                            alert("Remove failed");
                        }
                    }
                });
            });

            // ============================================================
            // BEST FRIEND REMOVE BUTTONS – SICH SELBST ALS WINGMAN ENTFERNEN
            // ============================================================

            // Findet alle Remove-Buttons in der Best-Friends-Liste:
            bestFriendsList.querySelectorAll("[data-remove-bestfriend]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    // Holt die User-ID aus dem Button:
                    const userId = Number(btn.getAttribute("data-remove-bestfriend"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!userId) return;

                    // Fragt zur Sicherheit nach:
                    const ok = confirm("Remove yourself as this user's wingman?");
                    // Wenn abgebrochen wird, passiert nichts:
                    if (!ok) return;

                    // Sendet ans Backend: Entfernt sich selbst als Wingman bei dieser Person:
                    const r = await fetch(`/api/bestfriends/${userId}`, { method: "DELETE" });
                    // Wenn es geklappt hat, zeigt es eine Info und lädt neu:
                    if (r.ok) {
                        showToast("Removed");
                        refreshWingmanLists();
                    } else {
                        // Wenn es nicht geklappt hat, versucht es eine genaue Fehlermeldung zu zeigen:
                        try {
                            const err = await r.json();
                            alert(err.message || "Remove failed");
                        } catch {
                            // Wenn JSON nicht klappt, zeigt es eine Standard-Meldung:
                            alert("Remove failed");
                        }
                    }
                });
            });


        } catch {
            // ignore
        }
    }

// ============================================================
// WINGMAN HINZUFUEGEN – FENSTER (MODAL) + SUCHE + REQUEST SENDEN
// ============================================================

// Holt den Button „Add Wingman“:
    const addWingmanBtn = document.getElementById("addWingmanBtn");
// Holt das Fenster zum Wingman-Hinzufügen:
    const addWingmanModal = document.getElementById("addWingmanModal");
// Holt den normalen Close-Button:
    const closeAddWingman = document.getElementById("closeAddWingman");
// Holt das X oben zum Schließen:
    const closeAddWingmanX = document.getElementById("closeAddWingmanX");

// Holt das Suchfeld:
    const wingmanSearchInput = document.getElementById("wingmanSearchInput");
// Holt die Ergebnis-Liste:
    const wingmanSearchResults = document.getElementById("wingmanSearchResults");
// Holt den Hinweis-Text (zB. „Type at least 2 characters.“):
    const wingmanSearchHint = document.getElementById("wingmanSearchHint");

// Öffnet das Add-Wingman-Fenster und setzt alles auf „Start“:
    function openAddWingmanModal() {
        // Wenn das Fenster fehlt, wird abgebrochen:
        if (!addWingmanModal) return;
        // Zeigt das Fenster:
        addWingmanModal.classList.remove("hidden");

        // Setzt das Suchfeld zurück und setzt den Cursor hinein:
        if (wingmanSearchInput) {
            wingmanSearchInput.value = "";
            wingmanSearchInput.focus();
        }
        // Leert die Ergebnis-Liste:
        if (wingmanSearchResults) wingmanSearchResults.innerHTML = "";
        // Setzt den Hinweis-Text:
        if (wingmanSearchHint) wingmanSearchHint.textContent = "Type at least 2 characters.";
    }

// Schließt das Add-Wingman-Fenster:
    function closeAddWingmanModal() {
        // Wenn das Fenster fehlt, wird abgebrochen:
        if (!addWingmanModal) return;
        // Versteckt das Fenster:
        addWingmanModal.classList.add("hidden");
    }

// Aktiviert den Klick auf „Add Wingman“:
    if (addWingmanBtn) addWingmanBtn.addEventListener("click", openAddWingmanModal);
// Aktiviert den Klick auf Close:
    if (closeAddWingman) closeAddWingman.addEventListener("click", closeAddWingmanModal);
// Aktiviert den Klick auf das X:
    if (closeAddWingmanX) closeAddWingmanX.addEventListener("click", closeAddWingmanModal);

// ============================================================
// KLICK AUSSERHALB – SCHLIESST DAS ADD-WINGMAN-FENSTER
// ============================================================

// Wenn das Fenster existiert, wird ein Klick-Handler gesetzt:
    if (addWingmanModal) {
        addWingmanModal.addEventListener("click", (e) => {
            // Wenn wirklich der Hintergrund geklickt wurde, wird geschlossen:
            if (e.target === addWingmanModal) closeAddWingmanModal();
        });
    }

// Merkt sich einen Timer, damit die Suche nicht bei jedem Tipp sofort startet:
    let searchTimer = null;

// ============================================================
// WINGMAN SUCHE – FRAGT BACKEND AB UND ZEIGT USERS AN
// ============================================================

// Führt die Wingman-Suche aus (mit Text „q“):
    async function runWingmanSearch(q) {
        // Wenn die Ergebnis-Liste fehlt, wird abgebrochen:
        if (!wingmanSearchResults) return;

        // Wenn der Text leer ist oder zu kurz ist, wird alles zurückgesetzt:
        if (!q || q.length < 2) {
            // Leert die Ergebnisse:
            wingmanSearchResults.innerHTML = "";
            // Zeigt den Hinweis, dass mindestens 2 Zeichen nötig sind:
            if (wingmanSearchHint) wingmanSearchHint.textContent = "Type at least 2 characters.";
            return;
        }

        // Zeigt kurz an, dass gesucht wird:
        if (wingmanSearchHint) wingmanSearchHint.textContent = "Searching...";

        // Versucht die Server-Anfrage sicher abzufangen:
        try {
            // Fragt das Backend nach Usern, die zum Suchtext passen:
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
            // Liest die Antwort als JSON:
            const data = await res.json();
            // Holt die User-Liste sicher als Array:
            const users = Array.isArray(data.users) ? data.users : [];

            // Wenn keine User gefunden wurden, zeigt es eine leere Info:
            if (!users.length) {
                wingmanSearchResults.innerHTML = `
          <li class="search-result-item">
            <div class="search-result-name">No users found</div>
            <div class="search-result-sub">Try a different name/email</div>
          </li>
        `;
                // Entfernt den Hint-Text:
                if (wingmanSearchHint) wingmanSearchHint.textContent = "";
                return;
            }

            // Baut die Ergebnis-Liste für alle gefundenen User:
            // - Name
            // - Button „Add“
            // - Alters-/Gender-/Location-Zeile
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

            // Entfernt den Hint-Text, weil Ergebnisse da sind:
            if (wingmanSearchHint) wingmanSearchHint.textContent = "";

            // ============================================================
            // ADD BUTTONS – WINGMAN REQUEST SENDEN
            // ============================================================

            // Findet alle Add-Buttons und setzt Klick-Handler:
            wingmanSearchResults.querySelectorAll("[data-add-wingman]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    // Holt die User-ID vom Button:
                    const id = Number(btn.getAttribute("data-add-wingman"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!id) return;

                    // Sendet ans Backend: Wingman-Request erstellen:
                    const r = await fetch("/api/wingmen", {
                        // POST, weil etwas Neues angelegt wird:
                        method: "POST",
                        // Sagt dem Backend: es kommt JSON:
                        headers: { "Content-Type": "application/json" },
                        // Sendet die Ziel-User-ID:
                        body: JSON.stringify({ wingmanUserId: id }),
                    });

                    // Wenn es geklappt hat, wird alles aktualisiert:
                    if (r.ok) {
                        // Lädt Wingmen/BestFriends Listen neu:
                        await refreshWingmanLists();
                        // Zeigt eine kurze Info:
                        showToast("Request Sent");
                        // Schließt das Fenster:
                        closeAddWingmanModal();
                    } else {
                        // Wenn es nicht klappt, versucht es eine genaue Fehlermeldung zu zeigen:
                        try {
                            const err = await r.json();
                            alert(err.message || "Add failed");
                        } catch {
                            // Wenn JSON nicht klappt, zeigt es eine Standard-Meldung:
                            alert("Add failed");
                        }
                    }
                });
            });
        } catch {
            // Wenn die Suche schiefgeht, zeigt es eine Fehlermeldung im Hint:
            if (wingmanSearchHint) wingmanSearchHint.textContent = "Search failed.";
        }
    }

// ============================================================
// SUCHE „ENTSPANNT“ STARTEN – 250ms WARTEN NACH DEM TIPPN
// ============================================================

// Wenn das Suchfeld existiert, wird ein Input-Handler gesetzt:
    if (wingmanSearchInput) {
        wingmanSearchInput.addEventListener("input", () => {
            // Holt den Text aus dem Feld:
            const q = wingmanSearchInput.value.trim();
            // Stoppt den alten Timer, damit nicht zu viel gesucht wird:
            clearTimeout(searchTimer);
            // Startet die Suche erst nach kurzer Pause:
            searchTimer = setTimeout(() => runWingmanSearch(q), 250);
        });
    }

// ============================================================
// SERVER-PROFIL-ID LESEN – „u_12“ → 12
// ============================================================

// Wandelt eine Server-Profil-ID wie „u_12“ in eine Zahl um:
    function parseServerUserId(profileId) {
        // real users come like "u_12"

        // Wenn nichts da ist oder es kein Text ist, kommt null zurück:
        if (!profileId || typeof profileId !== "string") return null;
        // Wenn es nicht mit „u_“ beginnt, ist es kein echter User:
        if (!profileId.startsWith("u_")) return null;
        // Schneidet „u_“ weg und macht den Rest zur Zahl:
        const n = Number(profileId.slice(2));
        // Wenn das keine Zahl ist, kommt null zurück, sonst die Zahl:
        return Number.isNaN(n) ? null : n;
    }

// ============================================================
// SWIPE AN SERVER SENDEN – NUR FUER ECHTE USER (NICHT SEED)
// ============================================================

// Sendet einen Swipe (LIKE/NOPE/SUPER) ans Backend:
    async function sendSwipeToServer(profile, action) {
        // Holt die echte User-ID aus profile.id (zB. „u_12“ → 12):
        const toUserId = parseServerUserId(profile?.id);
        // Wenn keine echte ID da ist, ist es ein Seed-Profil und wird nicht gespeichert:
        if (!toUserId) return { matched: false }; // seed profiles won't be in DB

        // Sendet den Swipe ans Backend:
        const res = await fetch("/api/swipes", {
            // POST, weil ein neuer Swipe gespeichert wird:
            method: "POST",
            // Sagt dem Backend: es kommt JSON:
            headers: { "Content-Type": "application/json" },
            // Sendet Ziel-User und Aktion:
            body: JSON.stringify({ toUserId, action })
        });

        // Liest die Antwort, oder nimmt leere Daten:
        const data = await res.json().catch(() => ({}));
        // Wenn es nicht ok ist, wirft es einen Fehler mit Server-Text:
        if (!res.ok) throw new Error(data.message || "Swipe failed");
        // Gibt Server-Antwort zurück (zB. matched: true):
        return data;
    }



// ============================================================
// KOMMENTARE ÜBER MICH – „WAS MEINE WINGMEN ÜBER MICH SAGEN“
// ============================================================

// Lädt die Kommentare, die Wingmen auf MEIN Profil geschrieben haben:
    async function loadMyWingmenComments() {
        // Holt die Liste im UI, wo die Kommentare angezeigt werden:
        const myCommentsList = document.getElementById("myCommentsList");
        // Wenn die Liste nicht existiert, wird abgebrochen:
        if (!myCommentsList) return;

        // Zeigt zuerst einen Lade-Zustand:
        myCommentsList.innerHTML = `
      <li class="side-item">
        <div class="side-name">Loading...</div>
        <div class="side-sub"> </div>
      </li>
    `;

        // Versucht alles sicher abzufangen:
        try {
            // ============================================================
            // PRUEFT LOGIN – EIGENE USER-ID AUS DER SESSION HOLEN
            // ============================================================

            // Holt die eigene User-ID aus der Session (über getMyUserId):
            const me = await getMyUserId();
            // Wenn keine User-ID da ist, ist man nicht eingeloggt:
            if (!me) {
                // Zeigt eine klare Meldung im UI:
                myCommentsList.innerHTML = `
              <li class="side-item">
                <div class="side-name">Not logged in</div>
                <div class="side-sub">Please re-login</div>
              </li>
            `;
                return;
            }

            // ============================================================
            // KOMMENTARE LADEN – BACKEND ENDPOINT /api/me/comments
            // ============================================================

            // IMPORTANT: we need commenter name too, so we call a NEW endpoint (see server.js change below)

            // Fragt die Kommentare zu „mir“ beim Backend ab:
            const res = await fetch(`/api/me/comments`);
            // Liest die Antwort als JSON, oder nimmt leere Daten:
            const data = await res.json().catch(() => ({}));

            // Wenn die Antwort nicht ok ist, zeigt es eine Fehlermeldung:
            if (!res.ok) {
                myCommentsList.innerHTML = `
              <li class="side-item">
                <div class="side-name">Failed to load</div>
                <div class="side-sub">${escapeHtml(data.message || "")}</div>
              </li>
            `;
                return;
            }

            // Holt die Kommentare sicher als Array:
            const comments = Array.isArray(data.comments) ? data.comments : [];

            // Wenn es keine Kommentare gibt, zeigt es eine Info:
            if (!comments.length) {
                myCommentsList.innerHTML = `
              <li class="side-item">
                <div class="side-name">No comments yet</div>
                <div class="side-sub">Your wingmen haven’t posted anything</div>
              </li>
            `;
                return;
            }

            // ============================================================
            // KOMMENTAR-LISTE BAUEN – NAME + TEXT + OPTIONAL DELETE
            // ============================================================

            // Baut die Liste aus allen Kommentaren:
            myCommentsList.innerHTML = comments.map(c => `
          <li class="side-item">
            <div class="side-item-row" style="align-items:flex-start; gap:10px;">
              <div style="flex:1;">
                <div class="side-name">${escapeHtml(c.commenterName || "Wingman")}</div>
                <div class="side-sub">${escapeHtml(c.text || "")}</div>
              </div>

              ${c.canDelete ? `
                <div class="side-item-actions">
                  <button class="small-btn danger" data-delete-my-comment="${c.id}">Delete</button>
                </div>
              ` : ``}
            </div>
          </li>
        `).join("");

            // ============================================================
            // DELETE BUTTONS – KOMMENTAR VOM EIGENEN PROFIL LOESCHEN
            // ============================================================

            // Findet alle Delete-Buttons und setzt Klick-Handler:
            myCommentsList.querySelectorAll("[data-delete-my-comment]").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    // Verhindert andere Klicks (zB. List-Klicks):
                    e.stopPropagation();
                    // Holt die Kommentar-ID aus dem Button:
                    const commentId = Number(btn.getAttribute("data-delete-my-comment"));
                    // Wenn keine gültige ID da ist, wird abgebrochen:
                    if (!commentId) return;

                    // Fragt zur Sicherheit nach:
                    const ok = confirm("Delete this comment from your profile?");
                    // Wenn abgebrochen wird, passiert nichts:
                    if (!ok) return;

                    // Sendet ans Backend: Kommentar löschen:
                    const r = await fetch(`/api/me/comments/${commentId}`, { method: "DELETE" });
                    // Liest die Antwort, oder nimmt leere Daten:
                    const out = await r.json().catch(() => ({}));

                    // Wenn es nicht klappt, zeigt es eine Fehlermeldung:
                    if (!r.ok) {
                        alert(out.message || "Delete failed");
                        return;
                    }

                    // Zeigt eine kurze Erfolgsmeldung:
                    showToast("Comment deleted");
                    // Lädt die Kommentare neu, damit die Liste sofort stimmt:
                    loadMyWingmenComments();
                });
            });

        } catch {
            // Wenn irgendwas schiefgeht (zB. Netzwerk), zeigt es eine klare Meldung:
            myCommentsList.innerHTML = `
          <li class="side-item">
            <div class="side-name">Failed to load</div>
            <div class="side-sub">Network error</div>
          </li>
        `;
        }
    }

// ============================================================
// START – LISTEN LADEN, WENN DIE SEITE OFFEN IST
// ============================================================

// Load lists on page open (safe even if lists don't exist on other pages)

// Lädt Wingmen- und Best-Friends-Listen:
    refreshWingmanLists();
// Lädt die Kommentare über mich:
    loadMyWingmenComments();

// ============================================================
// PROFIL-LINKS – KLICK Oeffnet PROFIL-SEITE (MIT STOPP)
// ============================================================

// Findet alle Profil-Links und setzt Klick-Handler:
    document.querySelectorAll(".profile-link").forEach(el => {
        el.addEventListener("click", (e) => {
            // Stoppt den Klick, damit nichts anderes mit auslöst:
            e.stopPropagation(); // wichtig

            // Holt die User-ID aus dem data-Attribut:
            const userId = el.dataset.profileId;
            // Wenn keine ID da ist, wird abgebrochen:
            if (!userId) return;

            // Wechselt zur Profil-Seite:
            window.location.href = `/profile/${userId}`;
        });
    });


});
