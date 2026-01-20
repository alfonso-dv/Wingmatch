// ============================================================
// SERVER.JS – START UND GRUNDLEGENDE MODULE
// ============================================================

// Gibt den genauen Speicherort der Datenbank im Terminal aus
/* server.js */
console.log("DB PATH:", require("path").resolve("./database.db"));

// Lädt Express, damit der Server Webseiten ausliefern kann
const express = require("express");

// Lädt Session, damit der Server sich merkt, wer eingeloggt ist
const session = require("express-session");

// Lädt bcrypt, um Passwörter sicher zu verschlüsseln
const bcrypt = require("bcrypt");

// Lädt SQLite, die Datenbank
const sqlite3 = require("sqlite3").verbose();

// Lädt path, um sichere Dateipfade zu bauen
const path = require("path");

// Lädt fs, um Ordner und Dateien zu prüfen oder zu erstellen
const fs = require("fs");

// Lädt multer, um Bilder hochzuladen
const multer = require("multer");

// Erstellt die Express-App
const app = express();

// Legt den Port fest, auf dem der Server läuft
const PORT = 8080;


// ============================================================
// BILD-UPLOAD EINRICHTUNG (PFLICHTFOTO)
// ============================================================

/* ================= UPLOAD SETUP (Pflichtfoto) ================= */

// Legt den Pfad zum Ordner „uploads“ fest
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Prüft, ob der Ordner existiert – wenn nicht, wird er erstellt
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Definiert, wie hochgeladene Bilder gespeichert werden
const storage = multer.diskStorage({

    // Sagt: speichere alle Bilder im Upload-Ordner
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),

    // Bestimmt den Namen jeder hochgeladenen Bilddatei
    filename: (req, file, cb) => {

        // Holt die Dateiendung, z. B. .jpg oder .png
        const ext = path.extname(file.originalname || "");

        // Holt die User-ID aus der Session
        // Wenn keine Session da ist, wird „anon“ genommen
        // if session isn't set for some reason, fall back to "anon"
        const uid = req.session?.userId ?? "anon";

        // Baut einen eindeutigen Dateinamen mit Zeitstempel
        cb(null, `user_${uid}_${Date.now()}${ext}`);
    },
});

// Prüft, ob die hochgeladene Datei ein Bild ist
function fileFilter(req, file, cb) {

    // Wenn es kein Bild ist, wird ein Fehler geworfen
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only images allowed"));
    }

    // Erlaubt das Hochladen, wenn es ein Bild ist
    cb(null, true);
}

// Erstellt die Upload-Funktion mit Speicherort und Filter
const upload = multer({ storage, fileFilter });


// ============================================================
// DATENBANK – VERBINDUNG UND TABELLEN
// ============================================================

/* ================= DATABASE ================= */

// Öffnet (oder erstellt) die SQLite-Datenbank
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

// Führt alle folgenden Befehle geordnet nacheinander aus
db.serialize(() => {

    // ================= USERS TABELLE =================
    // Speichert Grunddaten jedes Users

    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      age INTEGER,
      gender TEXT,
      location TEXT
    )
    
  `);
    addColumnSafe(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
    addColumnSafe(`ALTER TABLE users ADD COLUMN reset_expires INTEGER`);


    // ================= PROFILES TABELLE =================
    // Speichert zusätzliche Profil-Infos zu jedem User

    db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,

      bio TEXT DEFAULT '',
      hobbies TEXT DEFAULT '',
      zodiac TEXT DEFAULT '',
      looking_for TEXT DEFAULT '',
      extra TEXT DEFAULT '',

      interested_in TEXT DEFAULT '',
      pref_age_min INTEGER DEFAULT 18,
      pref_age_max INTEGER DEFAULT 100,

      prompts TEXT DEFAULT '[]',
      photos TEXT DEFAULT '[]',

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // ================= PROFILE COMMENTS TABELLE =================
    // Speichert Kommentare, die Wingmen über Profile schreiben

    db.run(`
        CREATE TABLE IF NOT EXISTS profile_comments (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        profile_user_id INTEGER NOT NULL,
                                                        commenter_user_id INTEGER NOT NULL,
                                                        comment TEXT NOT NULL,
                                                        created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (profile_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (commenter_user_id) REFERENCES users(id) ON DELETE CASCADE
            )

    `);


    // Wingman Requests (PENDING / ACCEPTED / DECLINED)
    // ================= WINGMAN REQUESTS TABELLE =================
    // Speichert Anfragen: Wer will wessen Wingman sein

    db.run(`
        CREATE TABLE IF NOT EXISTS wingman_requests (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        requester_id INTEGER NOT NULL,
                                                        receiver_id INTEGER NOT NULL,
                                                        status TEXT CHECK (status IN ('PENDING','ACCEPTED','DECLINED')) DEFAULT 'PENDING',
            created_at TEXT DEFAULT (datetime('now')),
            responded_at TEXT,
            FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )
    `);


    // Prompts tables (safe) — needed for your /api/prompts endpoints
    // ================= PROMPTS TABELLE =================
    // Speichert mögliche Profil-Fragen (z. B. „Mein Traumdate ist…“)

    db.run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_text TEXT NOT NULL
    )
  `);

    // ================= USER PROMPT ANSWERS TABELLE =================
    // Speichert die Antworten der User auf die Prompts

    db.run(`
    CREATE TABLE IF NOT EXISTS user_prompt_answers (
      user_id INTEGER NOT NULL,
      prompt_id INTEGER NOT NULL,
      answer TEXT NOT NULL,
      PRIMARY KEY (user_id, prompt_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )
  `);


    // ============================================================
// WINGMAN BEZIEHUNGEN
// ============================================================

// Wingman Relationships
// Speichert feste Wingman-Verbindungen zwischen zwei Usern
    db.run(`
  CREATE TABLE IF NOT EXISTS wingman_links (
    user_id INTEGER NOT NULL,
    wingman_user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, wingman_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wingman_user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);


// ============================================================
// MATCHING UND CHAT – TABELLEN
// ============================================================

// --- MATCHING / CHAT TABLES ---

// Speichert alle Swipes (LIKE, NOPE, SUPER)
    db.run(`
        CREATE TABLE IF NOT EXISTS swipes (
                                              from_user_id INTEGER NOT NULL,
                                              to_user_id INTEGER NOT NULL,
                                              action TEXT NOT NULL CHECK (action IN ('LIKE','NOPE','SUPER')),
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (from_user_id, to_user_id),
            FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
            )
    `);

// Speichert Matches zwischen zwei Usern
    db.run(`
        CREATE TABLE IF NOT EXISTS matches (
                                               user1_id INTEGER NOT NULL,
                                               user2_id INTEGER NOT NULL,
                                               created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user1_id, user2_id),
            FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
            )
    `);

// Speichert Chat-Nachrichten zwischen gematchten Usern
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                match_user1 INTEGER NOT NULL,
                                                match_user2 INTEGER NOT NULL,
                                                sender_id INTEGER NOT NULL,
                                                text TEXT NOT NULL,
                                                created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            )
    `);



// ============================================================
// SICHERES HINZUFÜGEN VON SPALTEN (FÜR ALTE DATENBANKEN)
// ============================================================

// Hilfsfunktion, um neue Spalten nur dann hinzuzufügen,
// wenn sie noch nicht existieren
    function addColumnSafe(sql) {
        db.run(sql, (err) => {

            // Wenn der Fehler NICHT „Spalte existiert schon“ ist,
            // wird er im Terminal ausgegeben
            if (err && !err.message.includes("duplicate column")) {
                console.error("ALTER TABLE ERROR:", err.message);
            }
        });
    }

// Fügt fehlende Spalten in der profiles-Tabelle nachträglich hinzu
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN hobbies TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN zodiac TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN looking_for TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN extra TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN interested_in TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN pref_age_min INTEGER DEFAULT 18`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN pref_age_max INTEGER DEFAULT 100`);
});


// ============================================================
// MIDDLEWARE (ZWISCHENSCHRITTE BEI JEDER ANFRAGE)
// ============================================================

/* ================= MIDDLEWARE ================= */

// Liest JSON aus dem Request-Body
app.use(express.json());

// Liest Formulardaten aus dem Request-Body
app.use(express.urlencoded({ extended: true }));

// Richtet die Session ein (merkt sich eingeloggte User)
app.use(
    session({
        secret: "wingmatch-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
    })
);


// ============================================================
// STATISCHE DATEIEN (CSS, JS, BILDER)
// ============================================================

/* ================= STATIC ASSETS ================= */

// Liefert CSS-Dateien aus
app.use("/css", express.static(path.join(__dirname, "public/css")));

// Liefert JavaScript-Dateien aus
app.use("/js", express.static(path.join(__dirname, "public/js")));

// Liefert normale Bilder aus
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Liefert hochgeladene Bilder aus
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ============================================================
// DEBUG ROUTE (OPTIONAL)
// ============================================================

/* ================= DEBUG (optional) ================= */

// Gibt die aktuelle Session als JSON zurück
app.get("/debug-session", (req, res) => {
    res.json(req.session);
});


// ============================================================
// AUTH GUARD (SCHUTZ VOR ZUGRIFF OHNE LOGIN)
// ============================================================

/* ================= AUTH GUARD ================= */

// Prüft, ob der User eingeloggt ist
function requireLogin(req, res, next) {

    // Wenn keine userId in der Session ist, wird auf Login umgeleitet
    if (!req.session.userId) return res.redirect("/login");

    // Sonst geht es weiter zur nächsten Funktion
    next();
}


// ============================================================
// ÖFFENTLICHE ROUTEN (OHNE LOGIN ZUGÄNGLICH)
// ============================================================

/* ================= PUBLIC ROUTES ================= */

// Leitet die Startseite automatisch auf /login um
app.get("/", (req, res) => res.redirect("/login"));

// Zeigt die Login-Seite
app.get("/login", (req, res) => {

    // Wenn der User schon eingeloggt ist, geht er zur Homepage
    if (req.session.userId) return res.redirect("/index");

    // Sonst wird die Login-Seite gesendet
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// Zeigt die Registrierungs-Seite
app.get("/register", (req, res) => {

    // Wenn der User schon eingeloggt ist, geht er zur Homepage
    if (req.session.userId) return res.redirect("/index");

    // Sonst wird die Register-Seite gesendet
    res.sendFile(path.join(__dirname, "public/register.html"));
});


// ============================================================
// GESCHÜTZTE SEITEN (NUR FÜR EINGELOGGTE USER)
// ============================================================

/* ================= PROTECTED ROUTES ================= */

// Lädt die Hauptseite (Swipe-Startseite), aber nur wenn der User eingeloggt ist
app.get("/index", requireLogin, (req, res) => {

    // Holt die User-ID aus der Session
    const userId = req.session.userId;

    // Fragt in der Datenbank nach dem Profil und den Fotos dieses Users
    db.get(
        "SELECT user_id, photos FROM profiles WHERE user_id = ?",
        [userId],
        (err, row) => {

            // Wenn ein Datenbankfehler passiert, wird er geloggt und ein Fehler gesendet
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).send("DB error");
            }

            // Wenn es noch kein Profil gibt, wird der User zur Profil-Erstellung geschickt
            if (!row) return res.redirect("/create-profile");

            // Startet mit einer leeren Fotoliste
            let photos = [];

            // Versucht, die gespeicherten Fotos aus JSON zu lesen
            try {
                photos = JSON.parse(row.photos || "[]");
            } catch {

                // Falls das JSON kaputt ist, bleibt die Liste leer
                photos = [];
            }

            // Wenn kein erstes Foto existiert, wird der User zum Foto-Upload geschickt
            if (!photos[0]) return res.redirect("/upload-photo");

            // Wenn alles passt, wird die geschützte Startseite geladen
            return res.sendFile(path.join(__dirname, "protected/index.html"));
        }
    );
});

// Lädt die Profil-Bearbeitungsseite für eingeloggte User
app.get("/create-profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/create-profile.html"));
});

// Lädt die Seite zum Hochladen eines Pflichtfotos
app.get("/upload-photo", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/upload-photo.html"));
});

// Lädt die Seite zum Verwalten von Bildern
app.get("/manage-pictures", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/manage-pictures.html"));
});


// ============================================================
// BLOCKIERT DIREKTEN ZUGRIFF AUF HTML-DATEIEN
// ============================================================

/* ================= BLOCK HTML DIRECT ACCESS ================= */

// Sperrt alle direkten Aufrufe von .html-Dateien im Browser
app.get(/.*\.html$/, (req, res) => {
    res.status(403).send("Access denied");
});


// ============================================================
// AUTHENTIFIZIERUNG – API (REGISTER, LOGIN)
// ============================================================

/* ================= AUTH API ================= */

// Registriert einen neuen User
app.post("/api/register", async (req, res) => {

    // Holt die Eingaben aus dem Formular
    const { email, password, name, age, gender, location } = req.body;

    // Prüft, ob alle Felder ausgefüllt sind
    if (!email || !password || !name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }

    // Prüft, ob der User mindestens 18 ist
    if (Number(age) < 18) return res.status(400).json({ message: "User must be at least 18" });
    // Prüft, ob der Name keine Zahlen enthält
    if (/\d/.test(name)) return res.status(400).json({ message: "Invalid name format" });
    // Prüft, ob ein echtes Geschlecht ausgewählt wurde
    if (gender === "placeholder") return res.status(400).json({ message: "Please select a gender" });

    // Verschlüsselt das Passwort sicher
    const hash = await bcrypt.hash(password, 10);

    // Speichert den neuen User in der Datenbank
    db.run(
        `INSERT INTO users (email, password, name, age, gender, location)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hash, name, Number(age), gender, location],
        function (err) {

            // Wenn ein Fehler passiert, wird er geloggt
            if (err) {
                console.error("DB ERROR:", err.message);

                // Wenn die E-Mail schon existiert, wird eine passende Antwort gesendet
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ message: "User already exists" });
                }

                // Allgemeiner Fehler bei Registrierung
                return res.status(400).json({ message: "Registration failed" });
            }

            // Speichert die neue User-ID in der Session (User ist jetzt eingeloggt)
            req.session.userId = this.lastID;

            // Sendet Erfolgsmeldung zurück – sagt: Profil fehlt noch
            res.json({ message: "Registration successful", needsProfile: true });
        }
    );
});

// Loggt einen bestehenden User ein
app.post("/api/login", (req, res) => {

    // Holt E-Mail und Passwort aus dem Formular
    const { email, password } = req.body;

    // Sucht den User in der Datenbank nach E-Mail
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

        // Datenbankfehler
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }

        // Wenn kein User gefunden wird
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        // Vergleicht das eingegebene Passwort mit dem gespeicherten Hash
        const ok = await bcrypt.compare(password, user.password);

        // Wenn das Passwort falsch ist
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        // Speichert die User-ID in der Session (User ist jetzt eingeloggt)
        req.session.userId = user.id;

        // Prüft, ob der User schon ein Profil hat
        db.get("SELECT user_id FROM profiles WHERE user_id = ?", [user.id], (err2, row) => {

            // Datenbankfehler
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Wenn kein Profil existiert, muss der User eines erstellen
            const needsProfile = !row;

            // Sendet Login-Erfolg zurück
            res.json({ message: "Login successful", needsProfile });
        });
    });
});


// ============================================================
// WINGMAN ANFRAGEN – API
// ============================================================

// Sendet eine Wingman-Anfrage an einen anderen User
app.post("/api/wingman/request", requireLogin, (req, res) => {

    // Holt die eigene User-ID aus der Session
    const requesterId = req.session.userId;

    // Holt die ID des Users, der angefragt wird
    const { receiverId } = req.body;

    // Speichert die Anfrage in der Datenbank
    db.run(
        `INSERT INTO wingman_requests (requester_id, receiver_id)
         VALUES (?, ?)`,
        [requesterId, receiverId],

        // Sendet Erfolg zurück
        () => res.json({ success: true })
    );
});

// ============================================================
// WINGMAN ANFRAGEN – ABRUF (PENDING)
// ============================================================
// Must 7
// Gibt alle offenen (PENDING) Wingman-Anfragen zurück,
// die ANDERE User an MICH geschickt haben
app.get("/api/wingman/requests/pending", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const userId = req.session.userId;

    // Fragt in der Datenbank nach allen offenen Anfragen an mich
    db.all(
        `
        SELECT wr.id, u.name AS requesterName
        FROM wingman_requests wr
        JOIN users u ON wr.requester_id = u.id
        WHERE wr.receiver_id = ? AND wr.status = 'PENDING'
        `,
        [userId],
        (err, rows) => {

            // Wenn ein Datenbankfehler passiert, gibt er ein leeres Array zurück
            if (err) return res.status(500).json([]);

            // Schickt die Liste der offenen Anfragen als JSON zurück
            res.json(rows);
        }
    );
});


// ============================================================
// WINGMAN ANFRAGE ABBRECHEN (NUR DER ABSENDER DARF)
// ============================================================

// Löscht eine eigene, noch offene Wingman-Anfrage
app.delete("/api/wingman/request/:requestId", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const me = req.session.userId;

    // Holt die Anfrage-ID aus der URL und macht daraus eine Zahl
    const requestId = Number(req.params.requestId);

    // Prüft, ob die Anfrage-ID gültig ist
    if (!requestId || Number.isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid requestId" });
    }

    // Lädt die Anfrage aus der Datenbank
    db.get(
        `SELECT id, requester_id, status FROM wingman_requests WHERE id = ?`,
        [requestId],
        (err, row) => {

            // Datenbankfehler
            if (err) return res.status(500).json({ message: "DB error" });

            // Wenn die Anfrage nicht existiert
            if (!row) return res.status(404).json({ message: "Request not found" });

            // Prüft: Nur der ursprüngliche Absender darf löschen
            if (row.requester_id !== me) return res.status(403).json({ message: "Not allowed" });

            // Prüft: Anfrage darf nur gelöscht werden, wenn sie noch offen ist
            if (row.status !== "PENDING") return res.status(400).json({ message: "Request is not pending" });

            // Löscht die Anfrage aus der Datenbank
            db.run(`DELETE FROM wingman_requests WHERE id = ?`, [requestId], (err2) => {

                // Fehler beim Löschen
                if (err2) return res.status(500).json({ message: "DB error" });

                // Erfolgsmeldung zurück
                return res.json({ ok: true });
            });
        }
    );
});



// ============================================================
// LOGOUT
// ============================================================

// Loggt den User aus
app.post("/api/logout", (req, res) => {

    // Löscht die Session auf dem Server
    req.session.destroy(() => {

        // Löscht das Session-Cookie im Browser
        res.clearCookie("connect.sid");

        // Schickt Bestätigung zurück
        res.json({ message: "Logged out" });
    });
});


// ============================================================
// PROFIL – API
// ============================================================

/* ================= PROFILE API ================= */

// Überspringt die Profilerstellung
// Legt einen leeren Profileintrag an, falls keiner existiert
app.post("/api/profile/skip", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Fügt einen Eintrag in die profiles-Tabelle ein,
    // aber nur, wenn es noch keinen gibt
    db.run(
        `INSERT INTO profiles (user_id)
     VALUES (?)
     ON CONFLICT(user_id) DO NOTHING`,
        [userId],
        (err) => {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Erfolgsmeldung zurück
            res.json({ message: "Skipped" });
        }
    );
});


// ============================================================
// WINGMAN ANFRAGE BEANTWORTEN (ACCEPT / DECLINE)
// ============================================================
//Must 8
// Nimmt eine Wingman-Anfrage an oder lehnt sie ab
app.post("/api/wingman/respond", requireLogin, (req, res) => {

    // Holt meine User-ID (ich bin der Empfänger)
    const receiverId = req.session.userId;

    // Holt Anfrage-ID und Entscheidung aus dem Body
    const { requestId, decision } = req.body; // ACCEPTED | DECLINED

    // Wandelt Entscheidung in Großbuchstaben um
    const dec = String(decision || "").toUpperCase();

    // Prüft, ob die Entscheidung gültig ist
    if (!["ACCEPTED", "DECLINED"].includes(dec)) {
        return res.status(400).json({ message: "Invalid decision" });
    }

    // Lädt die Anfrage und prüft, ob sie mir gehört und noch offen ist
    db.get(
        `SELECT id, requester_id, receiver_id, status
         FROM wingman_requests
         WHERE id = ?`,
        [Number(requestId)],
        (err, reqRow) => {

            // Datenbankfehler
            if (err) return res.status(500).json({ message: "DB error" });

            // Wenn die Anfrage nicht existiert
            if (!reqRow) return res.status(404).json({ message: "Request not found" });

            // Prüft: Ich muss der Empfänger sein
            if (reqRow.receiver_id !== receiverId) return res.status(403).json({ message: "Not allowed" });

            // Prüft: Anfrage muss noch offen sein
            if (reqRow.status !== "PENDING") return res.status(400).json({ message: "Request already handled" });

            // Setzt den neuen Status der Anfrage
            db.run(
                `UPDATE wingman_requests
         SET status = ?, responded_at = datetime('now')
         WHERE id = ?`,
                [dec, reqRow.id],
                function (err2) {

                    // Fehler beim Update
                    if (err2) return res.status(500).json({ message: "Update failed" });

                    // Wenn abgelehnt -> fertig
                    if (dec === "DECLINED") {
                        return res.json({ success: true });
                    }

                    // Wenn angenommen: prüft, ob der Anfragende schon 5 Wingmen hat
                    const requesterId = reqRow.requester_id;

                    db.get(
                        `SELECT COUNT(*) AS cnt
             FROM wingman_links
             WHERE user_id = ?`,
                        [requesterId],
                        (err3, rowCount) => {

                            // Datenbankfehler
                            if (err3) return res.status(500).json({ message: "DB error" });

                            // Wenn der User schon 5 Wingmen hat
                            if ((rowCount?.cnt || 0) >= 5) {

                                // Setzt die Anfrage wieder auf DECLINED zurück
                                db.run(
                                    `UPDATE wingman_requests
                   SET status = 'DECLINED', responded_at = datetime('now')
                   WHERE id = ?`,
                                    [reqRow.id],
                                    () => {
                                        return res.status(400).json({ message: "Requester already has 5 wingmen." });
                                    }
                                );
                                return;
                            }

                            // Erstellt die Wingman-Verbindung in der Datenbank
                            db.run(
                                `INSERT OR IGNORE INTO wingman_links (user_id, wingman_user_id)
                 VALUES (?, ?)`,
                                [requesterId, receiverId],
                                (err4) => {

                                    // Datenbankfehler
                                    if (err4) return res.status(500).json({ message: "DB error" });

                                    // Erfolg zurück
                                    return res.json({ success: true });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});


// ============================================================
// PROFIL ABRUFEN (GET)
// ============================================================

// Gibt das eigene Profil zurück (Name, Alter, Einstellungen usw.)
app.get("/api/profile", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Fragt alle wichtigen Profil-Daten aus der Datenbank ab
    // Verbindet users- und profiles-Tabelle miteinander
    db.get(
        `SELECT
      u.name, u.age, u.gender, u.location,
      p.bio, p.hobbies,
      p.zodiac, p.looking_for, p.extra,
      p.interested_in, p.pref_age_min, p.pref_age_max
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
        [userId],
        (err, row) => {

            // Wenn ein Datenbankfehler passiert, wird er geloggt
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Baut eine saubere JSON-Antwort mit allen Profilfeldern
            // Falls etwas fehlt, wird ein leerer Standardwert gesetzt
            res.json({
                // Grunddaten aus users-Tabelle
                name: row?.name ?? "",
                age: row?.age ?? "",
                gender: row?.gender ?? "",
                location: row?.location ?? "",

                // Profiltexte aus profiles-Tabelle
                bio: row?.bio ?? "",
                hobbies: row?.hobbies ?? "",
                zodiac: row?.zodiac ?? "",
                lookingFor: row?.looking_for ?? "",
                extra: row?.extra ?? "",

                // Discovery-Einstellungen
                interestedIn: row?.interested_in ?? "",
                prefAgeMin: row?.pref_age_min ?? 18,
                prefAgeMax: row?.pref_age_max ?? 100,
            });
        }
    );
});


// ============================================================
// WINGMAN ANFRAGEN – GESENDET (VON MIR)
// ============================================================

// Gibt alle Wingman-Anfragen zurück, die ICH geschickt habe
app.get("/api/wingman/requests/sent", requireLogin, (req, res) => {

    // Holt alle Anfragen aus der Datenbank, bei denen ich der Absender bin
    db.all(
        `
            SELECT wr.id, wr.status, u.name AS receiverName
            FROM wingman_requests wr
                     JOIN users u ON wr.receiver_id = u.id
            WHERE wr.requester_id = ?
            ORDER BY wr.created_at DESC
        `,
        [req.session.userId],

        // Schickt die Liste als JSON zurück (oder leeres Array)
        (err, rows) => res.json(rows || [])
    );
});


// ============================================================
// PROFIL SPEICHERN / AKTUALISIEREN (POST)
// ============================================================

// Speichert oder aktualisiert Profil
app.post("/api/profile", requireLogin, (req, res) => {

    // Holt alle Felder aus dem Request-Body
    const {
        name,
        age,
        gender,
        location,
        bio = "",
        hobbies = "",
        zodiac = "",
        lookingFor = "",
        extra = "",
        interestedIn = "",
        prefAgeMin = 18,
        prefAgeMax = 100,
    } = req.body;

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Prüft, ob alle Pflichtfelder vorhanden sind
    if (!name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }

    // Prüft, ob User mindestens 18 Jahre alt ist
    if (Number(age) < 18) {
        return res.status(400).json({ message: "User must be at least 18" });
    }

    // Aktualisiert zuerst die Grunddaten in der users-Tabelle
    db.run(
        `UPDATE users SET name = ?, age = ?, gender = ?, location = ? WHERE id = ?`,
        [name, Number(age), gender, location, userId],
        (err) => {

            // Datenbankfehler beim Update von users
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Fügt Profil-Daten ein ODER aktualisiert sie,
            // falls schon ein Profil existiert
            db.run(
                `INSERT INTO profiles (
          user_id, bio, hobbies,
          zodiac, looking_for, extra,
          interested_in, pref_age_min, pref_age_max
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          bio = excluded.bio,
          hobbies = excluded.hobbies,
          zodiac = excluded.zodiac,
          looking_for = excluded.looking_for,
          extra = excluded.extra,
          interested_in = excluded.interested_in,
          pref_age_min = excluded.pref_age_min,
          pref_age_max = excluded.pref_age_max,
          updated_at = datetime('now')`,
                [
                    userId,
                    bio,
                    hobbies,
                    zodiac,
                    lookingFor,
                    extra,
                    interestedIn,
                    Number(prefAgeMin),
                    Number(prefAgeMax),
                ],
                (err2) => {

                    // Datenbankfehler beim Speichern des Profils
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    // Erfolgsmeldung zurück an den Client
                    res.json({ message: "✅ Profile saved!" });
                }
            );
        }
    );
});

// ============================================================
// DISCOVER API – HOMEPAGE KARTEN (SWIPE DECK)
// ============================================================

/* ================= DISCOVER API (Homepage Karten) ================= */

// Lädt alle Profile für die Swipe-Startseite (Discover)
app.get("/api/discover", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // MUST RQ 15 + 16: Fragt passende Profile aus der Datenbank ab
    db.all(
        `
            SELECT
                u.id AS userId,
                u.name,
                u.age,
                u.gender,
                p.bio,
                p.photos
            FROM users u
            JOIN profiles p ON p.user_id = u.id
            WHERE u.id != ?

            -- Hide my wingmen AND my best friends (any wingman link in either direction) Must 9
            AND u.id NOT IN (
                SELECT wingman_user_id FROM wingman_links WHERE user_id = ?
                UNION
                SELECT user_id FROM wingman_links WHERE wingman_user_id = ?
            )

            -- Hide people I already MATCHED with
            AND u.id NOT IN (
                SELECT CASE
                    WHEN user1_id = ? THEN user2_id
                    ELSE user1_id
                END
                FROM matches
                WHERE user1_id = ? OR user2_id = ?
            )

            -- Hide people I already LIKED/SUPER-LIKED (pending response)
            AND u.id NOT IN (
                SELECT to_user_id
                FROM swipes
                WHERE from_user_id = ?
                  AND action IN ('LIKE','SUPER')
            )

            ORDER BY p.updated_at DESC
        `,
        [me, me, me, me, me, me, me],
        (err, rows) => {

            // Wenn ein Datenbankfehler passiert, wird er geloggt und ein Fehler gesendet
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Wandelt die rohen Datenbank-Zeilen in saubere Profil-Objekte um
            const profiles = (rows || [])
                .map((r) => {

                    // Startet mit leerer Fotoliste
                    let photosArr = [];

                    // Versucht, die gespeicherten Fotos aus JSON zu lesen
                    try { photosArr = JSON.parse(r.photos || "[]"); }
                    catch { photosArr = []; }

                    // Entfernt leere oder ungültige Foto-Einträge
                    photosArr = photosArr.filter((x) => typeof x === "string" && x.trim().length > 0);

                    // Baut ein Profil-Objekt für das Frontend
                    return {
                        // Interne Hilfs-ID für das Frontend
                        id: `u_${r.userId}`,

                        // Numerische User-ID (wird später für Kommentare gebraucht)
                        userId: r.userId,

                        // Grunddaten des Profils
                        name: r.name || "",
                        age: r.age || "",
                        gender: r.gender || "",
                        bio: (r.bio || "").trim(),

                        // Gefilterte Fotos
                        photos: photosArr,

                        // Platzhalter für Wingman-Kommentare (werden später gefüllt)
                        wingmanComments: [],
                    };
                })

                // Zeigt nur Profile mit mindestens einem Foto
                .filter((p) => p.photos.length >= 1);

            // Wenn keine Profile gefunden wurden, sofort leere Liste zurückgeben
            if (!profiles.length) {
                return res.json({ profiles: [] });
            }

            // Holt alle User-IDs der gefundenen Profile
            const userIds = profiles.map(p => p.userId).filter(Boolean);

            // Baut eine Liste von Fragezeichen für die SQL-Abfrage
            const placeholders = userIds.map(() => "?").join(",");

            // Lädt neuesten Wingman-Kommentare für diese Profile
            db.all(
                `
                SELECT
                    c.profile_user_id AS profileUserId,
                    c.comment AS text,
                    c.created_at AS createdAt,
                    u.name AS commenterName
                FROM profile_comments c
                JOIN users u ON u.id = c.commenter_user_id
                WHERE c.profile_user_id IN (${placeholders})
                ORDER BY c.profile_user_id ASC, c.created_at DESC
                `,
                userIds,
                (err2, commentRows) => {

                    // Falls Kommentare nicht geladen werden können,
                    // gibt er trotzdem die Profile ohne Kommentare zurück
                    if (err2) {
                        console.error("DB ERROR (comments):", err2.message);

                        // Entfernt die Hilfs-Felder vor der Antwort
                        const out = profiles.map(({ userId, ...rest }) => rest);
                        return res.json({ profiles: out });
                    }

                    // Erstellt eine Map: profileUserId -> Liste von Kommentaren
                    const map = new Map();

                    // Geht alle Kommentar-Zeilen durch
                    for (const r of (commentRows || [])) {

                        const pid = r.profileUserId;

                        // Falls noch keine Liste existiert, wird sie erstellt
                        if (!map.has(pid)) map.set(pid, []);

                        const arr = map.get(pid);

                        // Begrenzt auf maximal 3 Kommentare pro Profil
                        if (arr.length >= 3) continue;

                        // Fügt Kommentar in die Liste ein
                        arr.push({
                            commenterName: r.commenterName || "Wingman",
                            text: r.text || "",
                            createdAt: r.createdAt,
                        });
                    }

                    // Hängt die Kommentare an die Profile an
                    const out = profiles.map(p => {

                        // Holt Kommentare für dieses Profil
                        const comments = map.get(p.userId) || [];

                        // Entfernt die interne userId vor der Antwort
                        const { userId, ...rest } = p;

                        // Gibt Profil mit Kommentaren zurück
                        return { ...rest, wingmanComments: comments };
                    });

                    // Schickt alle Profile mit Kommentaren an den Client
                    return res.json({ profiles: out });
                }
            );
        }
    );
});

// ============================================================
// ACCOUNT LÖSCHEN
// ============================================================


// Löscht den gesamten Account des eingeloggten Users
app.delete("/api/account", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Lädt zuerst meine gespeicherten Fotos aus der Datenbank,
    // damit sie später auch aus dem Ordner gelöscht werden können
    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {

        // Wenn ein Datenbankfehler passiert, wird er geloggt und zurückgegeben
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }

        // Startet mit einer leeren Fotoliste
        let photos = [];

        // Versucht, die gespeicherten Fotos aus JSON zu lesen
        try { photos = JSON.parse(row?.photos || "[]"); }
        catch { photos = []; }

        // Löscht den User komplett aus der users-Tabelle
        db.run("DELETE FROM users WHERE id = ?", [userId], (err2) => {

            // Wenn ein Fehler beim Löschen des Users passiert
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Versucht nun, die hochgeladenen Bilddateien auch vom Server zu löschen
            try {

                // Nimmt nur Einträge, die wirklich aus /uploads/ stammen
                photos
                    .filter((p) => typeof p === "string" && p.startsWith("/uploads/"))
                    .forEach((p) => {

                        // Baut einen sicheren lokalen Dateipfad zur Bilddatei
                        const safePath = path.join(__dirname, p.replace("/uploads/", "uploads/"));

                        // Wenn die Datei existiert, wird sie gelöscht
                        if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
                    });

            } catch {}

            // Zerstört die Session (User wird ausgeloggt)
            req.session.destroy(() => {

                // Löscht das Session-Cookie im Browser
                res.clearCookie("connect.sid");

                // Sendet Bestätigung zurück
                res.json({ message: "Account deleted" });
            });
        });
    });
});


// ============================================================
// FOTO API – PFLICHTFOTO (BILDER UPLOAD)
// ============================================================

// Lädt das ERSTE (Haupt-)Profilfoto hoch
app.post("/api/photos/main", requireLogin, upload.single("photo"), (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Prüft, ob wirklich eine Datei hochgeladen wurde
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Baut die öffentliche URL zum Bild
    const fileUrl = `/uploads/${req.file.filename}`;

    // Lädt die aktuelle Fotoliste aus der Datenbank
    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {

        // Datenbankfehler
        if (err) return res.status(500).json({ message: "DB error" });

        // Startet mit leerer Liste
        let photos = [];

        // Versucht, die Fotos aus JSON zu lesen
        try { photos = JSON.parse(row?.photos || "[]"); }
        catch { photos = []; }

        // Setzt das erste Foto auf das neue Bild
        photos[0] = fileUrl;

        // Begrenzt die Liste auf maximal 2 Fotos
        photos = photos.slice(0, 2);

        // Speichert die neue Fotoliste in der Datenbank
        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(photos), userId],
            (err2) => {

                // Fehler beim Speichern
                if (err2) return res.status(500).json({ message: "DB error" });

                // Erfolgsmeldung mit aktueller Fotoliste zurück
                res.json({ message: "Main photo saved", photos });
            }
        );
    });
});

/* ================= Lädt das ZWEITE Profilfoto hoch ================= */

app.post("/api/photos/second", requireLogin, upload.single("photo"), (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Prüft, ob wirklich eine Datei hochgeladen wurde
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Baut die öffentliche URL zum Bild
    const fileUrl = `/uploads/${req.file.filename}`;

    // Lädt die aktuelle Fotoliste aus der Datenbank
    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {

        // Datenbankfehler
        if (err) return res.status(500).json({ message: "DB error" });

        // Startet mit leerer Liste
        let photos = [];

        // Versucht, die Fotos aus JSON zu lesen
        try { photos = JSON.parse(row?.photos || "[]"); }
        catch { photos = []; }

        // Prüft: Erstes Foto MUSS vorhanden sein
        if (!photos[0]) return res.status(400).json({ message: "Please upload Picture 1 first." });

        // Setzt das zweite Foto
        photos[1] = fileUrl;

        // Begrenzt die Liste auf maximal 2 Fotos
        photos = photos.slice(0, 2);

        // Speichert die neue Fotoliste in der Datenbank
        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(photos), userId],
            (err2) => {

                // Fehler beim Speichern
                if (err2) return res.status(500).json({ message: "DB error" });

                // Erfolgsmeldung mit aktueller Fotoliste zurück
                res.json({ message: "Second photo saved", photos });
            }
        );
    });
});

// ============================================================
// WINGMAN – PRÜFEN OB JEMAND MEIN WINGMAN IST
// ============================================================

// Prüft, ob eine bestimmte Person mein Wingman ist
// MUST-RQ 12: Wingmen-Check
app.get("/api/profile/:userId/is-wingman", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die User-ID des Profils aus der URL und macht daraus eine Zahl
    const profileUserId = Number(req.params.userId);

    // Fragt in der Datenbank nach, ob eine Wingman-Verbindung existiert
    db.get(
        `
            SELECT 1
            FROM wingman_links
            WHERE (user_id = ? AND wingman_user_id = ?)
               OR (user_id = ? AND wingman_user_id = ?)
        `,
        [profileUserId, me, me, profileUserId],
        (err, row) => {

            // Wenn ein Fehler passiert, wird false zurückgegeben
            if (err) {
                console.error(err);
                return res.json({ isWingman: false });
            }

            // Gibt true zurück, wenn ein Eintrag gefunden wurde, sonst false
            res.json({ isWingman: !!row });
        }
    );
});


// ============================================================
// FOTO API – FOTOS ANZEIGEN UND LÖSCHEN
// ============================================================

// Gibt alle meine gespeicherten Profilfotos zurück
app.get("/api/photos", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Lädt die Fotos aus der Datenbank
    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {

        // Datenbankfehler
        if (err) return res.status(500).json({ message: "DB error" });

        // Startet mit leerer Liste
        let photos = [];

        // Versucht, die Fotos aus JSON zu lesen
        try { photos = JSON.parse(row?.photos || "[]"); }
        catch { photos = []; }

        // Schickt die Fotoliste an den Client
        res.json({ photos });
    });
});


// Löscht eines meiner Profilfotos (Index 0 oder 1)
app.delete("/api/photos/:idx", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Holt den Foto-Index aus der URL und macht daraus eine Zahl
    const idx = Number(req.params.idx);

    // Prüft, ob der Index gültig ist (nur 0 oder 1 erlaubt)
    if (![0, 1].includes(idx)) {
        return res.status(400).json({ message: "Invalid photo index" });
    }

    // Lädt die aktuelle Fotoliste aus der Datenbank
    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {

        // Datenbankfehler
        if (err) return res.status(500).json({ message: "DB error" });

        // Startet mit leerer Liste
        let photos = [];

        // Versucht, die Fotos aus JSON zu lesen
        try { photos = JSON.parse(row?.photos || "[]"); }
        catch { photos = []; }

        // Wenn an dieser Stelle kein Foto existiert, wird nichts gemacht
        if (!photos[idx]) return res.json({ photos });

        // Zählt, wie viele echte Fotos es aktuell gibt
        const existingCount = photos.filter(Boolean).length;

        // Wenn nur noch ein Foto übrig ist, darf nicht gelöscht werden
        if (existingCount <= 1) {
            return res.status(400).json({ message: "You must keep at least 1 picture." });
        }

        // Versucht, die Bilddatei auch vom Server zu löschen
        try {
            const safePath = path.join(__dirname, photos[idx].replace("/uploads/", "uploads/"));
            if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
        } catch {}

        // Setzt das gelöschte Foto auf null
        photos[idx] = null;

        // Falls das ERSTE Foto gelöscht wurde, aber ein ZWEITES existiert,
        // wird das zweite nach vorne geschoben
        if (idx === 0 && photos[1]) {
            photos[0] = photos[1];
            photos[1] = null;
        }

        // Baut eine saubere Liste ohne null-Werte
        const cleaned = [photos[0] || null, photos[1] || null].filter((v) => v !== null);

        // Speichert die neue Fotoliste in der Datenbank
        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(cleaned), userId],
            (err2) => {

                // Datenbankfehler
                if (err2) return res.status(500).json({ message: "DB error" });

                // Gibt die bereinigte Fotoliste zurück
                res.json({ photos: cleaned });
            }
        );
    });
});


// ============================================================
// PROMPTS API (FRAGEN FÜR DAS PROFIL)
// ============================================================

// Lädt alle verfügbaren Prompts aus der Datenbank
app.get("/api/prompts", requireLogin, (req, res) => {

    db.all("SELECT * FROM prompts", [], (err, rows) => {

        // Datenbankfehler
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }

        // Schickt alle Prompts an den Client
        res.json(rows);
    });
});


// Speichert oder aktualisiert meine Antwort auf einen Prompt
app.post("/api/prompts/answer", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Holt Prompt-ID und Antwort aus dem Request
    const { prompt_id, answer } = req.body;

    // Prüft, ob alle Daten vorhanden sind
    if (!prompt_id || !answer) {
        return res.status(400).json({ message: "Missing data" });
    }

    // Fügt die Antwort ein oder aktualisiert sie, falls sie schon existiert
    db.run(
        `
      INSERT INTO user_prompt_answers (user_id, prompt_id, answer)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, prompt_id)
      DO UPDATE SET answer = excluded.answer
    `,
        [userId, prompt_id, answer],
        function (err) {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Erfolgsmeldung zurück
            res.json({ success: true });
        }
    );
});
// ============================================================
// PROMPTS – ANTWORT LÖSCHEN UND LADEN
// ============================================================

// Löscht meine Antwort auf einen bestimmten Prompt
app.delete("/api/prompts/answer/:promptId", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Holt die Prompt-ID aus der URL und macht daraus eine Zahl
    const promptId = Number(req.params.promptId);

    // Löscht genau diese eine Antwort aus der Datenbank
    db.run(
        `DELETE FROM user_prompt_answers WHERE user_id = ? AND prompt_id = ?`,
        [userId, promptId],
        function (err) {

            // Wenn ein Datenbankfehler passiert
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Meldet zurück, dass die Antwort gelöscht wurde
            res.json({ deleted: true });
        }
    );
});


// Lädt ALLE meine Prompt-Antworten
app.get("/api/prompts/answers", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const userId = req.session.userId;

    // Fragt alle Antworten von mir aus der Tabelle ab
    db.all(
        `SELECT prompt_id, answer FROM user_prompt_answers WHERE user_id = ?`,
        [userId],
        (err, rows) => {

            // Wenn ein Datenbankfehler passiert
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Schickt die Liste mit allen Antworten zurück
            res.json(rows);
        }
    );
});


// ============================================================
// WINGMEN / BEST FRIENDS API
// ============================================================

/* ================= WINGMEN / BEST FRIENDS API ================= */


// Sucht nach anderen Nutzern (zum Hinzufügen als Wingman)
app.get("/api/users/search", requireLogin, (req, res) => {

    // Holt meine eigene User-ID
    const me = req.session.userId;

    // Holt den Suchtext aus der URL und entfernt Leerzeichen am Anfang/Ende
    const q = String(req.query.q || "").trim();

    // Wenn nichts eingegeben wurde, gibt es sofort eine leere Liste zurück
    if (!q) return res.json({ users: [] });

    // Baut einen sicheren Suchbegriff für SQL (verhindert Joker-Tricks)
    const like = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;

    // Sucht passende Nutzer in der Datenbank
    db.all(
        `
    SELECT id, name, age, gender, location
    FROM users
    WHERE id != ?
      AND (name LIKE ? OR email LIKE ?)
    ORDER BY name ASC
    LIMIT 20
    `,
        [me, like, like],
        (err, rows) => {

            // Wenn ein Datenbankfehler passiert
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Schickt die gefundenen Nutzer zurück (oder leere Liste)
            res.json({ users: rows || [] });
        }
    );
});


// Lädt meine Wingmen UND meine Best Friends
// MUST-RQ 10: Endpoint der wingmen liefert.
// MUST-RQ 11: Endpoint der Bestfriend liefert.
app.get("/api/wingmen", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const me = req.session.userId;

    // SQL für Wingmen: Leute, die ICH als Wingman gewählt habe
    const wingmenSql = `
    SELECT u.id, u.name, u.age, u.gender, u.location
    FROM wingman_links w
    JOIN users u ON u.id = w.wingman_user_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `;

    // SQL für Best Friends: Leute, die MICH als Wingman gewählt haben
    const bestFriendsSql = `
    SELECT u.id, u.name, u.age, u.gender, u.location
    FROM wingman_links w
    JOIN users u ON u.id = w.user_id
    WHERE w.wingman_user_id = ?
    ORDER BY w.created_at DESC
  `;

    // Lädt zuerst meine Wingmen
    db.all(wingmenSql, [me], (err1, wingmen) => {

        // Wenn ein Fehler bei Wingmen passiert
        if (err1) {
            console.error("DB ERROR:", err1.message);
            return res.status(500).json({ message: "DB error" });
        }

        // Lädt danach meine Best Friends
        db.all(bestFriendsSql, [me], (err2, bestFriends) => {

            // Wenn ein Fehler bei Best Friends passiert
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Schickt beide Listen zusammen zurück
            // MUST-RQ 11:
            res.json({
                wingmen: wingmen || [],
                bestFriends: bestFriends || [],
            });
        });
    });
});
// ============================================================
// WINGMAN HINZUFÜGEN (ANFRAGE SENDEN)
// ============================================================

// Sendet eine Wingman-Anfrage an eine andere Person
app.post("/api/wingmen", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die User-ID der Person, die ich als Wingman hinzufügen will
    // und macht daraus eine Zahl
    const wingmanUserId = Number(req.body.wingmanUserId);

    // Prüft, ob eine gültige ID übergeben wurde
    if (!wingmanUserId || Number.isNaN(wingmanUserId)) {
        return res.status(400).json({ message: "Invalid wingmanUserId" });
    }

    // Verhindert, dass ich mich selbst als Wingman hinzufüge
    if (wingmanUserId === me) {
        return res.status(400).json({ message: "You cannot add yourself as wingman" });
    }

//Must 6
    // 1) Zählt, wie viele Wingmen ich bereits habe (maximal 5 erlaubt)
    db.get(
        `SELECT COUNT(*) AS cnt
     FROM wingman_links
     WHERE user_id = ?`,
        [me],
        (errCount, rowCount) => {

            // Datenbankfehler beim Zählen
            if (errCount) {
                console.error("DB ERROR:", errCount.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Wenn ich schon 5 Wingmen habe, wird abgebrochen
            if ((rowCount?.cnt || 0) >= 5) {
                return res.status(400).json({ message: "You can only have up to 5 wingmen." });
            }

            // 2) Prüft, ob die Ziel-Person wirklich in der Datenbank existiert
            db.get("SELECT id FROM users WHERE id = ?", [wingmanUserId], (err, row) => {

                // Datenbankfehler
                if (err) {
                    console.error("DB ERROR:", err.message);
                    return res.status(500).json({ message: "DB error" });
                }

                // Wenn der User nicht existiert, wird abgebrochen
                if (!row) return res.status(404).json({ message: "User not found" });

                // 3) Prüft, ob diese Person nicht schon mein Wingman ist
                db.get(
                    `SELECT 1 FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
                    [me, wingmanUserId],
                    (errLink, linkRow) => {

                        // Datenbankfehler
                        if (errLink) {
                            console.error("DB ERROR:", errLink.message);
                            return res.status(500).json({ message: "DB error" });
                        }

                        // Falls es diese Verbindung schon gibt
                        if (linkRow) {
                            return res.status(400).json({ message: "This user is already your wingman." });
                        }

                        // 4) Prüft, ob ich dieser Person nicht schon eine offene Anfrage geschickt habe
                        db.get(
                            `SELECT 1 FROM wingman_requests
               WHERE requester_id = ? AND receiver_id = ? AND status = 'PENDING'`,
                            [me, wingmanUserId],
                            (errReq, pendingRow) => {

                                // Datenbankfehler
                                if (errReq) {
                                    console.error("DB ERROR:", errReq.message);
                                    return res.status(500).json({ message: "DB error" });
                                }

                                // Falls bereits eine offene Anfrage existiert
                                if (pendingRow) {
                                    return res.status(400).json({ message: "Wingman request already sent." });
                                }

                                // 5) Legt die Wingman-Anfrage in der Datenbank an
                                db.run(
                                    `INSERT INTO wingman_requests (requester_id, receiver_id)
                   VALUES (?, ?)`,
                                    [me, wingmanUserId],
                                    (err2) => {

                                        // Fehler beim Speichern der Anfrage
                                        if (err2) {
                                            console.error("DB ERROR:", err2.message);
                                            return res.status(500).json({ message: "DB error" });
                                        }

                                        // Erfolgsmeldung zurück
                                        return res.json({ message: "Wingman request sent" });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        }
    );
});

// ============================================================
// WINGMEN ENTFERNEN
// ============================================================

// Entfernt eine Person aus MEINER Wingman-Liste
app.delete("/api/wingmen/:wingmanUserId", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die User-ID des Wingmans aus der URL und macht daraus eine Zahl
    const wingmanUserId = Number(req.params.wingmanUserId);

    // Prüft, ob eine gültige ID übergeben wurde
    if (!wingmanUserId || Number.isNaN(wingmanUserId)) {
        return res.status(400).json({ message: "Invalid wingmanUserId" });
    }

    // Löscht genau diese Wingman-Verbindung aus der Datenbank
    db.run(
        `DELETE FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
        [me, wingmanUserId],
        (err) => {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Erfolgsmeldung zurück
            return res.json({ message: "Wingman removed" });
        }
    );
});


// Entfernt MICH aus der Wingman-Liste einer ANDEREN Person
// (ich entferne mich als „Best Friend“ bei jemand anderem)
app.delete("/api/bestfriends/:userId", requireLogin, (req, res) => {

    // Holt meine eigene User-ID (ich bin der Wingman)
    const me = req.session.userId;

    // Holt die User-ID der Person, die mich hinzugefügt hat
    const userId = Number(req.params.userId);

    // Prüft, ob die ID gültig ist
    if (!userId || Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
    }

    // Verhindert, dass ich mich selbst lösche
    if (userId === me) {
        return res.status(400).json({ message: "Invalid userId" });
    }

    // Löscht die Verbindung, bei der die ANDERE Person mich als Wingman hat
    db.run(
        `DELETE FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
        [userId, me],
        function (err) {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Gibt trotzdem OK zurück, auch wenn nichts gelöscht wurde
            return res.json({ message: "Removed yourself as wingman" });
        }
    );
});


// ============================================================
// MATCHING UND SWIPES
// ============================================================

// ============================
// MATCHING API
// ============================

// Verarbeitet einen Swipe: LIKE, NOPE oder SUPER
// Erstellt ein Match, wenn beide sich geliked haben
// MUST-RQ 7 + SHOULD-RQ 26: Endpoint
app.post("/api/swipes", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const me = req.session.userId;

    // Holt Ziel-User und Aktion aus dem Request
    const { toUserId, action } = req.body;

    // Wandelt Ziel-ID in Zahl um
    const other = Number(toUserId);

    // Wandelt Aktion in Großbuchstaben um
    const act = String(action || "").toUpperCase();

    // Prüft, ob Ziel-ID gültig ist
    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid toUserId" });

    // Verhindert, dass ich mich selbst swipe
    if (other === me) return res.status(400).json({ message: "Cannot swipe yourself" });

    // Prüft, ob die Aktion erlaubt ist
    if (!["LIKE", "NOPE", "SUPER"].includes(act)) return res.status(400).json({ message: "Invalid action" });

    // =============================
    // FALL 1: NOPE (ABLEHNEN)
    // =============================

    // Wenn jemand NOPE sagt, wird die Interaktion komplett zurückgesetzt,
    // damit sich beide später wieder sehen können
    if (act === "NOPE") {
        db.run(
            `
      DELETE FROM swipes
      WHERE (from_user_id = ? AND to_user_id = ?)
         OR (from_user_id = ? AND to_user_id = ?)
      `,
            [me, other, other, me],
            (err) => {

                // Datenbankfehler
                if (err) {
                    console.error("DB ERROR:", err.message);
                    return res.status(500).json({ message: "DB error" });
                }

                // Gibt zurück: kein Match, aber zurückgesetzt
                return res.json({ ok: true, matched: false, reset: true });
            }
        );
        return;
    }

    // =============================
    // FALL 2: LIKE ODER SUPER
    // =============================

    // Speichert meinen Swipe in der Datenbank (oder aktualisiert ihn)
    db.run(
        `
            INSERT INTO swipes (from_user_id, to_user_id, action)
            VALUES (?, ?, ?)
                ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET
                                                             action = excluded.action,
                                                             created_at = datetime('now')
        `,
        [me, other, act],
        (err) => {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Prüft, ob die andere Person mich schon geliked hat
            db.get(
                `
                    SELECT action FROM swipes
                    WHERE from_user_id = ? AND to_user_id = ?
                      AND action IN ('LIKE','SUPER')
                `,
                [other, me],
                (err2, row) => {

                    // Datenbankfehler
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    // Wenn die andere Person mich noch NICHT geliked hat:
                    // kein Match, aber Swipe gespeichert
                    if (!row) return res.json({ ok: true, matched: false });

                    // =============================
                    // ES IST EIN MATCH!
                    // =============================

                    // Sortiert die IDs, damit es immer gleich gespeichert wird
                    const user1 = Math.min(me, other);
                    const user2 = Math.max(me, other);

                    // Speichert das Match in der Datenbank
                    db.run(
                        `
                            INSERT INTO matches (user1_id, user2_id)
                            VALUES (?, ?)
                                ON CONFLICT(user1_id, user2_id) DO NOTHING
                        `,
                        [user1, user2],
                        (err3) => {

                            // Datenbankfehler
                            if (err3) {
                                console.error("DB ERROR:", err3.message);
                                return res.status(500).json({ message: "DB error" });
                            }

                            // Lädt Name und Alter der gematchten Person
                            db.get(
                                `SELECT id, name, age FROM users WHERE id = ?`,
                                [other],
                                (err4, u) => {

                                    // Falls Fehler: gibt trotzdem Match zurück
                                    if (err4) return res.json({ ok: true, matched: true });

                                    // Gibt Match zurück + Infos zur anderen Person
                                    return res.json({ ok: true, matched: true, matchUser: u || null });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// ============================================================
// MATCHES LISTE (MEINE MATCHES ANZEIGEN) MUST RQ 19
// ============================================================

// Lädt meine gesamte Match-Liste
app.get("/api/matches", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Fragt alle meine Matches aus der Datenbank ab
    db.all(
        `
    SELECT
      CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END AS otherId,
      u.name, u.age, u.gender, u.location,
      m.user1_id, m.user2_id, m.created_at
    FROM matches m
    JOIN users u ON u.id = (CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END)
    WHERE m.user1_id = ? OR m.user2_id = ?
    ORDER BY m.created_at DESC
    `,
        [me, me, me, me],
        (err, rows) => {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Schickt alle Matches zurück (oder leere Liste)
            res.json({ matches: rows || [] });
        }
    );
});


// ============================================================
// UNMATCH (MATCH AUFLÖSEN)
// ============================================================

// Löscht ein Match komplett (inkl. Chat und Swipes)
app.delete("/api/matches/:otherId", requireLogin, (req, res) => {

    // Holt meine eigene User-ID
    const me = req.session.userId;

    // Holt die ID der anderen Person aus der URL
    const other = Number(req.params.otherId);

    // Prüft, ob die ID gültig ist
    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });

    // Verhindert, dass ich mich selbst entmatche
    if (other === me) return res.status(400).json({ message: "Invalid otherId" });

    // Sortiert die IDs, damit sie immer gleich in der DB stehen
    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // 1) Prüft zuerst, ob das Match wirklich existiert
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, row) => {

            // Datenbankfehler
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Falls kein Match existiert
            if (!row) return res.status(404).json({ message: "Not matched" });

            // 2) Löscht zuerst alle Chat-Nachrichten zwischen den beiden
            db.run(
                `DELETE FROM messages WHERE match_user1 = ? AND match_user2 = ?`,
                [user1, user2],
                (err2) => {

                    // Datenbankfehler
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    // 3) Löscht dann den Match-Eintrag selbst
                    db.run(
                        `DELETE FROM matches WHERE user1_id = ? AND user2_id = ?`,
                        [user1, user2],
                        (err3) => {

                            // Datenbankfehler
                            if (err3) {
                                console.error("DB ERROR:", err3.message);
                                return res.status(500).json({ message: "DB error" });
                            }

                            // 4) Löscht ALLE Swipes in BEIDE Richtungen,
                            // damit sich beide wieder in Discover sehen können
                            db.run(
                                `DELETE FROM swipes
                 WHERE (from_user_id = ? AND to_user_id = ?)
                    OR (from_user_id = ? AND to_user_id = ?)`,
                                [me, other, other, me],
                                (err4) => {

                                    // Datenbankfehler
                                    if (err4) {
                                        console.error("DB ERROR:", err4.message);
                                        return res.status(500).json({ message: "DB error" });
                                    }

                                    // Erfolgsmeldung zurück
                                    return res.json({ ok: true, message: "Unmatched" });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});


// ============================================================
// CHAT API (NUR FÜR MATCHES) MUST RQ 18
// ============================================================

// Hilfsfunktion: prüft, ob ich Teil dieses Matches bin
function ensureMatchIncludesMe(me, user1, user2) {
    return (me === user1 || me === user2) && user1 !== user2;
}

// Lädt alle Chat-Nachrichten für ein Match
app.get("/api/chat/:otherId", requireLogin, (req, res) => {

    // Holt meine User-ID aus der Session
    const me = req.session.userId;

    // Holt die andere User-ID aus der URL
    const other = Number(req.params.otherId);

    // Prüft, ob ID gültig ist
    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });

    // Sortiert die IDs für die Datenbank
    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // Prüft zuerst, ob dieses Match existiert
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, matchRow) => {

            // Datenbankfehler
            if (err) return res.status(500).json({ message: "DB error" });

            // Falls kein Match existiert, darf kein Chat geladen werden
            if (!matchRow) return res.status(403).json({ message: "Not matched" });

            // Lädt alle Nachrichten dieses Matches
            db.all(
                `
        SELECT id, sender_id, text, created_at
        FROM messages
        WHERE match_user1 = ? AND match_user2 = ?
        ORDER BY id ASC
        `,
                [user1, user2],
                (err2, rows) => {

                    // Datenbankfehler
                    if (err2) return res.status(500).json({ message: "DB error" });

                    // Schickt die Nachrichten zurück
                    res.json({ messages: rows || [] });
                }
            );
        }
    );
});

// ============================================================
// CHAT – NACHRICHT SENDEN
// ============================================================

// Sendet eine Chat-Nachricht an eine gematchte Person
app.post("/api/chat/:otherId", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die ID der anderen Person aus der URL und macht daraus eine Zahl
    const other = Number(req.params.otherId);

    // Holt den Nachrichtentext aus dem Request und entfernt Leerzeichen außen
    const text = String(req.body.text || "").trim();

    // Prüft, ob die andere ID gültig ist
    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });

    // Prüft, ob der Nachrichtentext leer ist
    if (!text) return res.status(400).json({ message: "Empty message" });

    // Sortiert die beiden User-IDs für die Datenbank
    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // Prüft zuerst, ob dieses Match wirklich existiert
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, matchRow) => {

            // Datenbankfehler
            if (err) return res.status(500).json({ message: "DB error" });

            // Falls kein Match existiert, darf keine Nachricht gesendet werden
            if (!matchRow) return res.status(403).json({ message: "Not matched" });

            // Speichert die Nachricht in der Datenbank
            db.run(
                `
        INSERT INTO messages (match_user1, match_user2, sender_id, text)
        VALUES (?, ?, ?, ?)
        `,
                [user1, user2, me, text],
                function (err2) {

                    // Datenbankfehler beim Speichern
                    if (err2) return res.status(500).json({ message: "DB error" });

                    // Gibt Erfolg zurück und die ID der neuen Nachricht
                    res.json({ ok: true, id: this.lastID });
                }
            );
        }
    );
});


// ============================================================
// PROFIL KOMMENTARE – LESEN UND SCHREIBEN
// ============================================================

// Lädt alle Kommentare zu einem Profil
app.get("/api/profile/:userId/comments", requireLogin, (req, res) => {

    // Holt die Profil-User-ID aus der URL
    const profileUserId = Number(req.params.userId);

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Lädt alle Kommentare zu diesem Profil aus der Datenbank
    db.all(
        `
            SELECT
                c.id,
                c.comment AS text,
                (c.profile_user_id = ?) AS canDelete
            FROM profile_comments c
            WHERE c.profile_user_id = ?
            ORDER BY c.created_at DESC
        `,
        [me, profileUserId],
        (err, rows) => {

            // Wenn ein Fehler passiert, gibt es eine leere Liste zurück
            if (err) {
                console.error(err);
                return res.json({ comments: [] });
            }

            // Schickt die gefundenen Kommentare zurück
            res.json({ comments: rows || [] });
        }
    );
});


// Fügt einen neuen Kommentar zu einem Profil hinzufügen
// MUST-RQ 12: Kommentar wird angelegt
app.post("/api/profile/:userId/comments", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die Profil-User-ID aus der URL
    const profileUserId = Number(req.params.userId);

    // Holt den Kommentar-Text aus dem Request
    const { comment } = req.body;

    // Prüft, ob der Kommentar leer ist
    if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // 🔒 Prüft, ob wir gegenseitig Wingmen sind (in beide Richtungen!)
    db.get(
        `
            SELECT 1
            FROM wingman_links
            WHERE (user_id = ? AND wingman_user_id = ?)
               OR (user_id = ? AND wingman_user_id = ?)
        `,
        [profileUserId, me, me, profileUserId],
        (err, row) => {

            // Datenbankfehler beim Wingman-Check
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error" });
            }

            // ❌ Falls KEINE Wingman-Verbindung existiert → STOP
            if (!row) {
                return res.status(403).json({
                    message: "Only wingmen can comment"
                });
            }

            // ✅ Falls Wingman → Kommentar in der Datenbank speichern
            db.run(
                `
                    INSERT INTO profile_comments
                        (profile_user_id, commenter_user_id, comment)
                    VALUES (?, ?, ?)
                `,
                [profileUserId, me, comment.trim()],
                (err2) => {

                    // Datenbankfehler beim Speichern
                    if (err2) {
                        console.error(err2);
                        return res.status(500).json({ message: "DB error" });
                    }

                    // Erfolgsmeldung zurück
                    res.json({ success: true });
                }
            );
        }
    );
});



// ============================================================
// PROFIL ANSICHT (ÖFFENTLICHES PROFIL LADEN)
// ============================================================

// Lädt die HTML-Seite für die Profilansicht im Browser
app.get("/profile/:userId", requireLogin, (req, res) => {

    // Schickt die statische HTML-Datei für das Profil-View an den Client
    res.sendFile(
        path.join(__dirname, "public/profile-view.html")
    );
});


// Lädt die PROFIL-DATEN einer bestimmten Person als JSON
app.get("/api/profile/:userId", requireLogin, (req, res) => {

    // Holt die Profil-User-ID aus der URL und macht daraus eine Zahl
    const userId = Number(req.params.userId);

    // Fragt alle wichtigen Profil-Daten aus der Datenbank ab
    db.get(`
        SELECT
            u.name, u.age, u.gender, u.location,
            p.bio, p.hobbies, p.zodiac, p.looking_for,
            p.extra, p.interested_in,
            p.pref_age_min, p.pref_age_max,
            p.photos
        FROM users u
                 JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?
    `, [userId], (err, row) => {

        // Falls ein Fehler passiert ODER kein Profil gefunden wurde
        if (err || !row) {
            return res.status(404).json({ message: "Profile not found" });
        }

        // Startet mit leerer Fotoliste
        let photos = [];

        // Versucht, die gespeicherten Fotos aus JSON zu lesen
        try { photos = JSON.parse(row.photos || "[]"); } catch {}

        // Baut das Antwort-Objekt mit allen Profilfeldern
        res.json({
            name: row.name,
            age: row.age,
            gender: row.gender,
            location: row.location,
            bio: row.bio,
            hobbies: row.hobbies,
            zodiac: row.zodiac,
            lookingFor: row.looking_for,
            extra: row.extra,
            interestedIn: row.interested_in,
            prefAgeMin: row.pref_age_min,
            prefAgeMax: row.pref_age_max,
            photos
        });
    });
});


// Lädt ALLE Prompt-Antworten eines bestimmten Profils
app.get("/api/profile/:userId/prompts", requireLogin, (req, res) => {

    // Holt die Profil-User-ID aus der URL
    const userId = Number(req.params.userId);

    // Fragt alle beantworteten Prompts dieses Users aus der Datenbank ab
    db.all(`
        SELECT p.prompt_text AS prompt_text, a.answer
        FROM user_prompt_answers a
                 JOIN prompts p ON p.id = a.prompt_id
        WHERE a.user_id = ?
    `, [userId], (err, rows) => {

        // Falls ein Datenbankfehler passiert
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ prompts: [] });
        }

        // Schickt die Liste der Prompts mit Antworten zurück
        res.json({ prompts: rows || [] });
    });
});


// Lädt ALLE Kommentare, die auf MEINEM Profil stehen
// MUST-RQ 13: lädt all Kommentae
app.get("/api/me/comments", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Fragt alle Kommentare zu meinem Profil aus der Datenbank ab
    db.all(
        `
        SELECT
            c.id,
            c.comment AS text,
            u.name AS commenterName,
            1 AS canDelete
        FROM profile_comments c
        JOIN users u ON u.id = c.commenter_user_id
        WHERE c.profile_user_id = ?
        ORDER BY c.created_at DESC
        `,
        [me],
        (err, rows) => {

            // Falls ein Fehler passiert
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error", comments: [] });
            }

            // Schickt alle Kommentare zurück
            res.json({ comments: rows || [] });
        }
    );
});


// Löscht EINEN Kommentar von MEINEM Profil
// MUST-RQ 14: Kommentar wird gelöscht
app.delete("/api/me/comments/:commentId", requireLogin, (req, res) => {

    // Holt meine eigene User-ID aus der Session
    const me = req.session.userId;

    // Holt die Kommentar-ID aus der URL und macht daraus eine Zahl
    const commentId = Number(req.params.commentId);

    // Prüft, ob die ID gültig ist
    if (!commentId || Number.isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid commentId" });
    }

    // Löscht genau diesen Kommentar, aber NUR wenn er auf meinem Profil steht
    db.run(
        `DELETE FROM profile_comments WHERE id = ? AND profile_user_id = ?`,
        [commentId, me],
        function (err) {

            // Falls ein Datenbankfehler passiert
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error" });
            }

            // Falls kein Kommentar gelöscht wurde → existiert nicht oder gehört mir nicht
            if (this.changes === 0) {
                return res.status(404).json({ message: "Comment not found" });
            }

            // Erfolgsmeldung zurück
            res.json({ ok: true });
        }
    );
});
const crypto = require("crypto");

// ============================================================
// FORGOT PASSWORD – CREATE RESET TOKEN
// ============================================================

app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email required" });
    }

    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {

        // Always return same message (security)
        if (!user) {
            return res.json({
                message: "If the email exists, a reset link was created."
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expires = Date.now() + 30 * 60 * 1000;

        db.run(
            `UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`,
            [token, expires, user.id]
        );

        // DEMO: return link directly
        res.json({
            message: "Reset link created",
            resetLink: `/reset-password?token=${token}`
        });
    });
});

// ============================================================
// RESET PASSWORD – APPLY NEW PASSWORD
// ============================================================

app.post("/api/reset-password", async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.get(
        `
        SELECT id FROM users
        WHERE reset_token = ?
          AND reset_expires > ?
        `,
        [token, Date.now()],
        async (err, user) => {

            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            if (!user) {
                return res.status(400).json({
                    message: "Invalid or expired token"
                });
            }

            // Hash new password
            const hash = await bcrypt.hash(password, 10);

            // Update password + remove token
            db.run(
                `
                UPDATE users
                SET password = ?, reset_token = NULL, reset_expires = NULL
                WHERE id = ?
                `,
                [hash, user.id],
                (err2) => {

                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    res.json({ message: "Password reset successful" });
                }
            );
        }
    );
});


app.get("/forgot-password", (req, res) => {
    res.sendFile(__dirname + "/public/forgot-password.html");
});

app.get("/reset-password", (req, res) => {
    res.sendFile(__dirname + "/public/reset-password.html");
});




// ============================================================
// SERVER START (MUSS IMMER GANZ UNTEN STEHEN)
// ============================================================


/* ================= START (ALWAYS LAST) ================= */

// Startet den Server und hört auf dem festgelegten Port
app.listen(PORT, () => {

    // Gibt eine Meldung in der Konsole aus, dass der Server läuft
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
