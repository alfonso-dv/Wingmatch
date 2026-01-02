/* server.js: */
console.log("DB PATH:", require("path").resolve("./database.db"));

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const multer = require("multer");


const app = express();
const PORT = 8080;

/* ================= UPLOAD SETUP (Pflichtfoto) ================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");

// falls Ordner nicht existiert -> anlegen
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // eindeutig: userId + timestamp + ext
    const ext = path.extname(file.originalname || "");
    cb(null, `user_${req.session.userId}_${Date.now()}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  // nur Bilder erlauben
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images allowed"));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter });


/* ================= DATABASE ================= */
const db = new sqlite3.Database(
    path.join(__dirname, "database.db")
);

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

db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
                                           user_id INTEGER PRIMARY KEY,
                                           bio TEXT DEFAULT '',
                                           prompts TEXT DEFAULT '[]',
                                           photos TEXT DEFAULT '[]',
                                           created_at TEXT DEFAULT (datetime('now')),
                                           updated_at TEXT DEFAULT (datetime('now')),
                                           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);
// Nachrüsten für bestehende DB: hobbies-Spalte hinzufügen (wenn schon vorhanden, ignorieren)
db.run(`ALTER TABLE profiles ADD COLUMN hobbies TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
        console.error("ALTER TABLE ERROR:", err.message);
    }
});



/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "wingmatch-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 // 1 Stunde
        }
    })
);

/* ================= STATIC ASSETS ================= */
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Profilbilder aus /uploads ausliefern (damit Browser sie anzeigen kann)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


/* ================= DEBUG (optional) ================= */
app.get("/debug-session", (req, res) => {
    res.json(req.session);
});

/* ================= AUTH GUARD ================= */
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
}

/* ================= PUBLIC ROUTES ================= */
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/index");
    }
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/index");
    }
    res.sendFile(path.join(__dirname, "public/register.html"));
});

/* ================= PROTECTED ROUTES ================= */
app.get("/index", requireLogin, (req, res) => {
  const userId = req.session.userId;

  db.get(
    "SELECT user_id, photos FROM profiles WHERE user_id = ?",
    [userId],
    (err, row) => {
      if (err) {
        console.error("DB ERROR:", err.message);
        return res.status(500).send("DB error");
      }

      // 1) Profil existiert noch nicht -> zuerst Profil erstellen
      if (!row) return res.redirect("/create-profile");

      // 2) Pflichtfoto prüfen
      let photos = [];
      try { photos = JSON.parse(row.photos || "[]"); } catch { photos = []; }

      if (!photos[0]) return res.redirect("/upload-photo");

      // 3) Alles ok -> Homepage
      return res.sendFile(path.join(__dirname, "protected/index.html"));
    }
  );
});


app.get("/create-profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/create-profile.html"));
});

// Pflichtfoto-Seite
app.get("/upload-photo", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public/upload-photo.html"));
});

// My Pictures Seite (nur von Edit-Mode aus erreichbar)
app.get("/manage-pictures", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public/manage-pictures.html"));
});

/* ================= BLOCK HTML DIRECT ACCESS ================= */
// neu – statt "/*.html" eine Regex verwenden, damit Express 5 keinen Fehler wirft
app.get(/.*\.html$/, (req, res) => {
    res.status(403).send("Access denied");
});


/* ================= AUTH API ================= */

// REGISTER
app.post("/api/register", async (req, res) => {
    console.log("REGISTER BODY:", req.body);

    const { email, password, name, age, gender, location } = req.body;

    if (!email || !password || !name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }

    if (age < 18) {
        return res.status(400).json({ message: "User must be at least 18" });
    }

    if (/\d/.test(name)) {
        return res.status(400).json({ message: "Invalid name format" });
    }

    if (gender === "placeholder") {
        return res.status(400).json({ message: "Please select a gender" });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (email, password, name, age, gender, location)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hash, name, age, gender, location],
        function (err) {
            if (err) {
                console.error("DB ERROR:", err.message);
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ message: "User already exists" });
                }
                return res.status(400).json({ message: "Registration failed" });
            }

            // 🔐 Auto-Login nach Registrierung
             req.session.userId = this.lastID;

             // Profil ist nach Register noch nicht angelegt → als nächstes Profil-Seite
             res.json({ message: "Registration successful", needsProfile: true });

        }
    );
});

/* ================= PROFILE API ================= */

// CREATE/UPSERT PROFILE (wird von create-profile.js genutzt)
// SKIP: erstellt nur den profiles-Eintrag, damit /index nicht mehr zurück umleitet
app.post("/api/profile/skip", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.run(
        `INSERT INTO profiles (user_id)
         VALUES (?)
         ON CONFLICT(user_id) DO NOTHING`,
        [userId],
        (err) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            return res.json({ message: "Skipped" });
        }
    );
});

// GET PROFILE (für Prefill in create-profile.js)
app.get("/api/profile", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.get(
        `SELECT
            u.name, u.age, u.gender, u.location,
            p.bio, p.hobbies
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [userId],
        (err, row) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            return res.json({
                name: row?.name ?? "",
                age: row?.age ?? "",
                gender: row?.gender ?? "",
                location: row?.location ?? "",
                bio: row?.bio ?? "",
                hobbies: row?.hobbies ?? ""
            });
        }
    );
});


// CREATE/UPSERT PROFILE (wird von create-profile.js genutzt)
app.post("/api/profile", requireLogin, (req, res) => {
    const { name, age, gender, location, bio = "", hobbies = "" } = req.body;
    const userId = req.session.userId;

    if (!name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }

    if (Number(age) < 18) {
        return res.status(400).json({ message: "User must be at least 18" });
    }

    // 1) Basisdaten im users-Table updaten (damit Login immer alles hat)
    db.run(
        `UPDATE users
         SET name = ?, age = ?, gender = ?, location = ?
         WHERE id = ?`,
        [name, Number(age), gender, location, userId],
        (err) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // 2) profiles-Eintrag anlegen/aktualisieren
            db.run(
                `INSERT INTO profiles (user_id, bio, hobbies)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                   bio = excluded.bio,
                   hobbies = excluded.hobbies,
                   updated_at = datetime('now')`,
                [userId, bio, hobbies],
                (err2) => {
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    return res.json({ message: "✅ Profile saved!" });
                }
            );
        }
    );
});

// LOGIN
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {
            if (!user) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            const ok = await bcrypt.compare(password, user.password);
            if (!ok) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            req.session.userId = user.id;

            db.get(
                "SELECT user_id FROM profiles WHERE user_id = ?",
                [user.id],
                (err2, row) => {
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    const needsProfile = !row;
                    res.json({ message: "Login successful", needsProfile });
                }
            );

        }
    );
});

// LOGOUT
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});

/* ================= PHOTO API (Pflichtfoto) ================= */

// Foto hochladen/ersetzen -> wird als profiles.photos[0] gespeichert
app.post("/api/photos/main", requireLogin, upload.single("photo"), (req, res) => {
  const userId = req.session.userId;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });

    let photos = [];
    try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

    photos[0] = fileUrl;         // Pflichtfoto setzen
    photos = photos.slice(0, 2); // später max 2 (für später vorbereitet)

    db.run(
      "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
      [JSON.stringify(photos), userId],
      (err2) => {
        if (err2) return res.status(500).json({ message: "DB error" });
        return res.json({ message: "Main photo saved", photos });
      }
    );
  });
});

// Zweites Foto hochladen/ersetzen -> wird als profiles.photos[1] gespeichert (optional)
app.post("/api/photos/second", requireLogin, upload.single("photo"), (req, res) => {
  const userId = req.session.userId;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });

    let photos = [];
    try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

    // Sicherheit: main muss existieren, bevor second gesetzt wird
    if (!photos[0]) {
      return res.status(400).json({ message: "Please upload Picture 1 first." });
    }

    photos[1] = fileUrl;         // optionales Foto setzen
    photos = photos.slice(0, 2);

    db.run(
      "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
      [JSON.stringify(photos), userId],
      (err2) => {
        if (err2) return res.status(500).json({ message: "DB error" });
        return res.json({ message: "Second photo saved", photos });
      }
    );
  });
});


// Fotos holen (für Manage Pictures UI)
app.get("/api/photos", requireLogin, (req, res) => {
  const userId = req.session.userId;

  db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });

    let photos = [];
    try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

    return res.json({ photos });
  });
});

// Foto löschen: /api/photos/0 oder /api/photos/1
app.delete("/api/photos/:idx", requireLogin, (req, res) => {
  const userId = req.session.userId;
  const idx = Number(req.params.idx);

  if (![0, 1].includes(idx)) {
    return res.status(400).json({ message: "Invalid photo index" });
  }

  db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });

    let photos = [];
    try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

    // Wenn dieses Foto gar nicht existiert -> ok, nichts zu tun
    if (!photos[idx]) {
      return res.json({ photos });
    }

    // Regel: mind. 1 Foto muss bleiben
    const existingCount = photos.filter(Boolean).length;
    if (existingCount <= 1) {
      return res.status(400).json({ message: "You must keep at least 1 picture." });
    }

    // Datei optional auch von Disk entfernen
    try {
      const filePath = path.join(__dirname, photos[idx]); // photos[idx] ist "/uploads/..."
      // path.join mit "/uploads/.." würde rooten, daher normalize:
      const safePath = path.join(__dirname, photos[idx].replace("/uploads/", "uploads/"));
      if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
    } catch (e) {
      // wenn löschen fehlschlägt -> DB trotzdem updaten
    }

    // Entfernen:
    photos[idx] = null;

    // Wenn main gelöscht wurde und second existiert -> nach vorne schieben
    if (idx === 0 && photos[1]) {
      photos[0] = photos[1];
      photos[1] = null;
    }

    // clean auf Länge 2
    const cleaned = [photos[0] || null, photos[1] || null].filter(v => v !== null);

    db.run(
      "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
      [JSON.stringify(cleaned), userId],
      (err2) => {
        if (err2) return res.status(500).json({ message: "DB error" });
        return res.json({ photos: cleaned });
      }
    );
  });
});


/* ================= START ================= */
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
