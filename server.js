/* server.js */
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
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "");
        // if session isn't set for some reason, fall back to "anon"
        const uid = req.session?.userId ?? "anon";
        cb(null, `user_${uid}_${Date.now()}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only images allowed"));
    }
    cb(null, true);
}

const upload = multer({ storage, fileFilter });

/* ================= DATABASE ================= */
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

db.serialize(() => {
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

    // Prompts tables (safe) — needed for your /api/prompts endpoints
    db.run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_text TEXT NOT NULL
    )
  `);

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

    // Wingman Relationships
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


    // Safe add columns for older DBs
    function addColumnSafe(sql) {
        db.run(sql, (err) => {
            if (err && !err.message.includes("duplicate column")) {
                console.error("ALTER TABLE ERROR:", err.message);
            }
        });
    }

    addColumnSafe(`ALTER TABLE profiles ADD COLUMN hobbies TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN zodiac TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN looking_for TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN extra TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN interested_in TEXT DEFAULT ''`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN pref_age_min INTEGER DEFAULT 18`);
    addColumnSafe(`ALTER TABLE profiles ADD COLUMN pref_age_max INTEGER DEFAULT 100`);
});

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "wingmatch-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
    })
);

/* ================= STATIC ASSETS ================= */
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= DEBUG (optional) ================= */
app.get("/debug-session", (req, res) => {
    res.json(req.session);
});

/* ================= AUTH GUARD ================= */
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect("/login");
    next();
}

/* ================= PUBLIC ROUTES ================= */
app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
    if (req.session.userId) return res.redirect("/index");
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
    if (req.session.userId) return res.redirect("/index");
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

            if (!row) return res.redirect("/create-profile");

            let photos = [];
            try {
                photos = JSON.parse(row.photos || "[]");
            } catch {
                photos = [];
            }

            if (!photos[0]) return res.redirect("/upload-photo");

            return res.sendFile(path.join(__dirname, "protected/index.html"));
        }
    );
});

app.get("/create-profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/create-profile.html"));
});

app.get("/upload-photo", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/upload-photo.html"));
});

app.get("/manage-pictures", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/manage-pictures.html"));
});

/* ================= BLOCK HTML DIRECT ACCESS ================= */
app.get(/.*\.html$/, (req, res) => {
    res.status(403).send("Access denied");
});

/* ================= AUTH API ================= */
app.post("/api/register", async (req, res) => {
    const { email, password, name, age, gender, location } = req.body;

    if (!email || !password || !name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }
    if (Number(age) < 18) return res.status(400).json({ message: "User must be at least 18" });
    if (/\d/.test(name)) return res.status(400).json({ message: "Invalid name format" });
    if (gender === "placeholder") return res.status(400).json({ message: "Please select a gender" });

    const hash = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (email, password, name, age, gender, location)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hash, name, Number(age), gender, location],
        function (err) {
            if (err) {
                console.error("DB ERROR:", err.message);
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ message: "User already exists" });
                }
                return res.status(400).json({ message: "Registration failed" });
            }

            req.session.userId = this.lastID;
            res.json({ message: "Registration successful", needsProfile: true });
        }
    );
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        req.session.userId = user.id;

        db.get("SELECT user_id FROM profiles WHERE user_id = ?", [user.id], (err2, row) => {
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }
            const needsProfile = !row;
            res.json({ message: "Login successful", needsProfile });
        });
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});

/* ================= PROFILE API ================= */
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
            res.json({ message: "Skipped" });
        }
    );
});

app.get("/api/profile", requireLogin, (req, res) => {
    const userId = req.session.userId;

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
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            res.json({
                name: row?.name ?? "",
                age: row?.age ?? "",
                gender: row?.gender ?? "",
                location: row?.location ?? "",
                bio: row?.bio ?? "",
                hobbies: row?.hobbies ?? "",
                zodiac: row?.zodiac ?? "",
                lookingFor: row?.looking_for ?? "",
                extra: row?.extra ?? "",
                interestedIn: row?.interested_in ?? "",
                prefAgeMin: row?.pref_age_min ?? 18,
                prefAgeMax: row?.pref_age_max ?? 100,
            });
        }
    );
});

app.post("/api/profile", requireLogin, (req, res) => {
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

    const userId = req.session.userId;

    if (!name || !age || !gender || !location) {
        return res.status(400).json({ message: "Missing fields" });
    }
    if (Number(age) < 18) {
        return res.status(400).json({ message: "User must be at least 18" });
    }

    db.run(
        `UPDATE users SET name = ?, age = ?, gender = ?, location = ? WHERE id = ?`,
        [name, Number(age), gender, location, userId],
        (err) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

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
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }
                    res.json({ message: "✅ Profile saved!" });
                }
            );
        }
    );
});

/* ================= DISCOVER API (Homepage Karten) ================= */
app.get("/api/discover", requireLogin, (req, res) => {
    const me = req.session.userId;

    db.all(
        `SELECT
      u.id AS userId,
      u.name,
      u.age,
      u.gender,
      p.bio,
      p.photos
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     WHERE u.id != ?
     ORDER BY p.updated_at DESC`,
        [me],
        (err, rows) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            const profiles = (rows || [])
                .map((r) => {
                    let photosArr = [];
                    try {
                        photosArr = JSON.parse(r.photos || "[]");
                    } catch {
                        photosArr = [];
                    }

                    photosArr = photosArr.filter((x) => typeof x === "string" && x.trim().length > 0);

                    return {
                        id: `u_${r.userId}`,
                        name: r.name || "",
                        age: r.age || "",
                        gender: r.gender || "",
                        bio: (r.bio || "").trim(),
                        photos: photosArr,
                    };
                })
                .filter((p) => p.photos.length >= 1);

            res.json({ profiles });
        }
    );
});

/* ================= DELETE ACCOUNT ================= */
app.delete("/api/account", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }

        let photos = [];
        try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

        db.run("DELETE FROM users WHERE id = ?", [userId], (err2) => {
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }

            try {
                photos
                    .filter((p) => typeof p === "string" && p.startsWith("/uploads/"))
                    .forEach((p) => {
                        const safePath = path.join(__dirname, p.replace("/uploads/", "uploads/"));
                        if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
                    });
            } catch {}

            req.session.destroy(() => {
                res.clearCookie("connect.sid");
                res.json({ message: "Account deleted" });
            });
        });
    });
});

/* ================= PHOTO API (Pflichtfoto) ================= */
app.post("/api/photos/main", requireLogin, upload.single("photo"), (req, res) => {
    const userId = req.session.userId;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;

    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ message: "DB error" });

        let photos = [];
        try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

        photos[0] = fileUrl;
        photos = photos.slice(0, 2);

        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(photos), userId],
            (err2) => {
                if (err2) return res.status(500).json({ message: "DB error" });
                res.json({ message: "Main photo saved", photos });
            }
        );
    });
});

app.post("/api/photos/second", requireLogin, upload.single("photo"), (req, res) => {
    const userId = req.session.userId;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;

    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ message: "DB error" });

        let photos = [];
        try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

        if (!photos[0]) return res.status(400).json({ message: "Please upload Picture 1 first." });

        photos[1] = fileUrl;
        photos = photos.slice(0, 2);

        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(photos), userId],
            (err2) => {
                if (err2) return res.status(500).json({ message: "DB error" });
                res.json({ message: "Second photo saved", photos });
            }
        );
    });
});

app.get("/api/photos", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.get("SELECT photos FROM profiles WHERE user_id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ message: "DB error" });

        let photos = [];
        try { photos = JSON.parse(row?.photos || "[]"); } catch { photos = []; }

        res.json({ photos });
    });
});

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

        if (!photos[idx]) return res.json({ photos });

        const existingCount = photos.filter(Boolean).length;
        if (existingCount <= 1) {
            return res.status(400).json({ message: "You must keep at least 1 picture." });
        }

        try {
            const safePath = path.join(__dirname, photos[idx].replace("/uploads/", "uploads/"));
            if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
        } catch {}

        photos[idx] = null;

        if (idx === 0 && photos[1]) {
            photos[0] = photos[1];
            photos[1] = null;
        }

        const cleaned = [photos[0] || null, photos[1] || null].filter((v) => v !== null);

        db.run(
            "UPDATE profiles SET photos = ?, updated_at = datetime('now') WHERE user_id = ?",
            [JSON.stringify(cleaned), userId],
            (err2) => {
                if (err2) return res.status(500).json({ message: "DB error" });
                res.json({ photos: cleaned });
            }
        );
    });
});

/* ================= PROMPTS API ================= */
app.get("/api/prompts", requireLogin, (req, res) => {
    db.all("SELECT * FROM prompts", [], (err, rows) => {
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }
        res.json(rows);
    });
});

app.post("/api/prompts/answer", requireLogin, (req, res) => {
    const userId = req.session.userId;
    const { prompt_id, answer } = req.body;

    if (!prompt_id || !answer) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.run(
        `
      INSERT INTO user_prompt_answers (user_id, prompt_id, answer)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, prompt_id)
      DO UPDATE SET answer = excluded.answer
    `,
        [userId, prompt_id, answer],
        function (err) {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            res.json({ success: true });
        }
    );
});

app.delete("/api/prompts/answer/:promptId", requireLogin, (req, res) => {
    const userId = req.session.userId;
    const promptId = Number(req.params.promptId);

    db.run(
        `DELETE FROM user_prompt_answers WHERE user_id = ? AND prompt_id = ?`,
        [userId, promptId],
        function (err) {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            res.json({ deleted: true });
        }
    );
});

app.get("/api/prompts/answers", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.all(
        `SELECT prompt_id, answer FROM user_prompt_answers WHERE user_id = ?`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            res.json(rows);
        }
    );
});

/* ================= WINGMEN / BEST FRIENDS API ================= */

// Search users (for adding as wingman)
app.get("/api/users/search", requireLogin, (req, res) => {
    const me = req.session.userId;
    const q = String(req.query.q || "").trim();

    if (!q) return res.json({ users: [] });

    // basic protection against wildcards; still allows partial search
    const like = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;

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
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            res.json({ users: rows || [] });
        }
    );
});

// Get my wingmen + my best friends
app.get("/api/wingmen", requireLogin, (req, res) => {
    const me = req.session.userId;

    // Wingmen = users I chose
    const wingmenSql = `
    SELECT u.id, u.name, u.age, u.gender, u.location
    FROM wingman_links w
    JOIN users u ON u.id = w.wingman_user_id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `;

    // Best Friends = users who chose me
    const bestFriendsSql = `
    SELECT u.id, u.name, u.age, u.gender, u.location
    FROM wingman_links w
    JOIN users u ON u.id = w.user_id
    WHERE w.wingman_user_id = ?
    ORDER BY w.created_at DESC
  `;

    db.all(wingmenSql, [me], (err1, wingmen) => {
        if (err1) {
            console.error("DB ERROR:", err1.message);
            return res.status(500).json({ message: "DB error" });
        }

        db.all(bestFriendsSql, [me], (err2, bestFriends) => {
            if (err2) {
                console.error("DB ERROR:", err2.message);
                return res.status(500).json({ message: "DB error" });
            }

            res.json({
                wingmen: wingmen || [],
                bestFriends: bestFriends || [],
            });
        });
    });
});

// Add wingman
app.post("/api/wingmen", requireLogin, (req, res) => {
    const me = req.session.userId;
    const wingmanUserId = Number(req.body.wingmanUserId);

    if (!wingmanUserId || Number.isNaN(wingmanUserId)) {
        return res.status(400).json({ message: "Invalid wingmanUserId" });
    }
    if (wingmanUserId === me) {
        return res.status(400).json({ message: "You cannot add yourself as wingman" });
    }

    // ensure user exists
    db.get("SELECT id FROM users WHERE id = ?", [wingmanUserId], (err, row) => {
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ message: "DB error" });
        }
        if (!row) {
            return res.status(404).json({ message: "User not found" });
        }

        db.run(
            `
      INSERT INTO wingman_links (user_id, wingman_user_id)
      VALUES (?, ?)
      ON CONFLICT(user_id, wingman_user_id) DO NOTHING
      `,
            [me, wingmanUserId],
            (err2) => {
                if (err2) {
                    console.error("DB ERROR:", err2.message);
                    return res.status(500).json({ message: "DB error" });
                }
                return res.json({ message: "Wingman added" });
            }
        );
    });
});

// Remove wingman
app.delete("/api/wingmen/:wingmanUserId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const wingmanUserId = Number(req.params.wingmanUserId);

    if (!wingmanUserId || Number.isNaN(wingmanUserId)) {
        return res.status(400).json({ message: "Invalid wingmanUserId" });
    }

    db.run(
        `DELETE FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
        [me, wingmanUserId],
        (err) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            return res.json({ message: "Wingman removed" });
        }
    );
});


/* ================= START (ALWAYS LAST) ================= */
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
