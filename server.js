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

    // --- MATCHING / CHAT TABLES ---

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

app.post("/api/wingman/request", requireLogin, (req, res) => {
    const requesterId = req.session.userId;
    const { receiverId } = req.body;

    db.run(
        `INSERT INTO wingman_requests (requester_id, receiver_id)
         VALUES (?, ?)`,
        [requesterId, receiverId],
        () => res.json({ success: true })
    );
});


app.get("/api/wingman/requests/pending", requireLogin, (req, res) => {
    const userId = req.session.userId;

    db.all(
        `
        SELECT wr.id, u.name AS requesterName
        FROM wingman_requests wr
        JOIN users u ON wr.requester_id = u.id
        WHERE wr.receiver_id = ? AND wr.status = 'PENDING'
        `,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json([]);
            res.json(rows);
        }
    );
});

// Cancel a pending wingman request (only the requester can cancel)
app.delete("/api/wingman/request/:requestId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const requestId = Number(req.params.requestId);

    if (!requestId || Number.isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid requestId" });
    }

    db.get(
        `SELECT id, requester_id, status FROM wingman_requests WHERE id = ?`,
        [requestId],
        (err, row) => {
            if (err) return res.status(500).json({ message: "DB error" });
            if (!row) return res.status(404).json({ message: "Request not found" });
            if (row.requester_id !== me) return res.status(403).json({ message: "Not allowed" });
            if (row.status !== "PENDING") return res.status(400).json({ message: "Request is not pending" });

            db.run(`DELETE FROM wingman_requests WHERE id = ?`, [requestId], (err2) => {
                if (err2) return res.status(500).json({ message: "DB error" });
                return res.json({ ok: true });
            });
        }
    );
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

app.post("/api/wingman/respond", requireLogin, (req, res) => {
    const receiverId = req.session.userId;
    const { requestId, decision } = req.body; // ACCEPTED | DECLINED

    const dec = String(decision || "").toUpperCase();
    if (!["ACCEPTED", "DECLINED"].includes(dec)) {
        return res.status(400).json({ message: "Invalid decision" });
    }

    // Load request and make sure it belongs to me and is pending
    db.get(
        `SELECT id, requester_id, receiver_id, status
         FROM wingman_requests
         WHERE id = ?`,
        [Number(requestId)],
        (err, reqRow) => {
            if (err) return res.status(500).json({ message: "DB error" });
            if (!reqRow) return res.status(404).json({ message: "Request not found" });
            if (reqRow.receiver_id !== receiverId) return res.status(403).json({ message: "Not allowed" });
            if (reqRow.status !== "PENDING") return res.status(400).json({ message: "Request already handled" });

            // Update request status
            db.run(
                `UPDATE wingman_requests
         SET status = ?, responded_at = datetime('now')
         WHERE id = ?`,
                [dec, reqRow.id],
                function (err2) {
                    if (err2) return res.status(500).json({ message: "Update failed" });

                    // If declined -> done
                    if (dec === "DECLINED") {
                        return res.json({ success: true });
                    }

                    //ACCEPTED: enforce requester wingmen limit (max 5)
                    const requesterId = reqRow.requester_id;

                    db.get(
                        `SELECT COUNT(*) AS cnt
             FROM wingman_links
             WHERE user_id = ?`,
                        [requesterId],
                        (err3, rowCount) => {
                            if (err3) return res.status(500).json({ message: "DB error" });

                            if ((rowCount?.cnt || 0) >= 5) {
                                // roll back request to DECLINED (or keep accepted but no link — your choice)
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

                            // Create wingman link
                            db.run(
                                `INSERT OR IGNORE INTO wingman_links (user_id, wingman_user_id)
                 VALUES (?, ?)`,
                                [requesterId, receiverId],
                                (err4) => {
                                    if (err4) return res.status(500).json({ message: "DB error" });
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

app.get("/api/wingman/requests/sent", requireLogin, (req, res) => {
    db.all(
        `
            SELECT wr.id, wr.status, u.name AS receiverName
            FROM wingman_requests wr
                     JOIN users u ON wr.receiver_id = u.id
            WHERE wr.requester_id = ?
            ORDER BY wr.created_at DESC
        `,
        [req.session.userId],
        (err, rows) => res.json(rows || [])
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
            
      -- Hide my wingmen AND my best friends (any wingman link in either direction)
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
        [me, me, me, me, me],
        (err, rows) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            const profiles = (rows || [])
                .map((r) => {
                    let photosArr = [];
                    try { photosArr = JSON.parse(r.photos || "[]"); } catch { photosArr = []; }
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

app.get("/api/profile/:userId/is-wingman", requireLogin, (req, res) => {
    const me = req.session.userId;
    const profileUserId = Number(req.params.userId);

    db.get(
        `
            SELECT 1
            FROM wingman_links
            WHERE (user_id = ? AND wingman_user_id = ?)
               OR (user_id = ? AND wingman_user_id = ?)
        `,
        [profileUserId, me, me, profileUserId],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.json({ isWingman: false });
            }
            res.json({ isWingman: !!row });
        }
    );
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

    // 1) Check accepted wingmen count (limit 5)
    db.get(
        `SELECT COUNT(*) AS cnt
     FROM wingman_links
     WHERE user_id = ?`,
        [me],
        (errCount, rowCount) => {
            if (errCount) {
                console.error("DB ERROR:", errCount.message);
                return res.status(500).json({ message: "DB error" });
            }
            if ((rowCount?.cnt || 0) >= 5) {
                return res.status(400).json({ message: "You can only have up to 5 wingmen." });
            }

            //2) Ensure user exists
            db.get("SELECT id FROM users WHERE id = ?", [wingmanUserId], (err, row) => {
                if (err) {
                    console.error("DB ERROR:", err.message);
                    return res.status(500).json({ message: "DB error" });
                }
                if (!row) return res.status(404).json({ message: "User not found" });

                //3) Don’t allow request if already wingman
                db.get(
                    `SELECT 1 FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
                    [me, wingmanUserId],
                    (errLink, linkRow) => {
                        if (errLink) {
                            console.error("DB ERROR:", errLink.message);
                            return res.status(500).json({ message: "DB error" });
                        }
                        if (linkRow) {
                            return res.status(400).json({ message: "This user is already your wingman." });
                        }

                        //4) Don’t allow duplicate pending request to same person
                        db.get(
                            `SELECT 1 FROM wingman_requests
               WHERE requester_id = ? AND receiver_id = ? AND status = 'PENDING'`,
                            [me, wingmanUserId],
                            (errReq, pendingRow) => {
                                if (errReq) {
                                    console.error("DB ERROR:", errReq.message);
                                    return res.status(500).json({ message: "DB error" });
                                }
                                if (pendingRow) {
                                    return res.status(400).json({ message: "Wingman request already sent." });
                                }

                                //5) Insert request
                                db.run(
                                    `INSERT INTO wingman_requests (requester_id, receiver_id)
                   VALUES (?, ?)`,
                                    [me, wingmanUserId],
                                    (err2) => {
                                        if (err2) {
                                            console.error("DB ERROR:", err2.message);
                                            return res.status(500).json({ message: "DB error" });
                                        }
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

// Remove ME as wingman from someone else's list (removing a "Best Friend")
app.delete("/api/bestfriends/:userId", requireLogin, (req, res) => {
    const me = req.session.userId; // I am the wingman
    const userId = Number(req.params.userId); // the person who added me as wingman

    if (!userId || Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
    }
    if (userId === me) {
        return res.status(400).json({ message: "Invalid userId" });
    }

    db.run(
        `DELETE FROM wingman_links WHERE user_id = ? AND wingman_user_id = ?`,
        [userId, me],
        function (err) {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // If there was nothing to delete, still respond ok (idempotent)
            return res.json({ message: "Removed yourself as wingman" });
        }
    );
});


// ============================
// MATCHING API
// ============================

// POST swipe (LIKE/NOPE/SUPER). Creates match if mutual like.
app.post("/api/swipes", requireLogin, (req, res) => {
    const me = req.session.userId;
    const { toUserId, action } = req.body;

    const other = Number(toUserId);
    const act = String(action || "").toUpperCase();

    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid toUserId" });
    if (other === me) return res.status(400).json({ message: "Cannot swipe yourself" });
    if (!["LIKE", "NOPE", "SUPER"].includes(act)) return res.status(400).json({ message: "Invalid action" });

    // ✅ NEW: if someone says NOPE, reset the interaction so both can reappear later
    if (act === "NOPE") {
        db.run(
            `
      DELETE FROM swipes
      WHERE (from_user_id = ? AND to_user_id = ?)
         OR (from_user_id = ? AND to_user_id = ?)
      `,
            [me, other, other, me],
            (err) => {
                if (err) {
                    console.error("DB ERROR:", err.message);
                    return res.status(500).json({ message: "DB error" });
                }
                return res.json({ ok: true, matched: false, reset: true });
            }
        );
        return;
    }

    // LIKE / SUPER: store it (pending)
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
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }

            // Check if the other user already liked me
            db.get(
                `
                    SELECT action FROM swipes
                    WHERE from_user_id = ? AND to_user_id = ?
                      AND action IN ('LIKE','SUPER')
                `,
                [other, me],
                (err2, row) => {
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    if (!row) return res.json({ ok: true, matched: false });

                    // Create match (store ordered pair so one row per match)
                    const user1 = Math.min(me, other);
                    const user2 = Math.max(me, other);

                    db.run(
                        `
                            INSERT INTO matches (user1_id, user2_id)
                            VALUES (?, ?)
                                ON CONFLICT(user1_id, user2_id) DO NOTHING
                        `,
                        [user1, user2],
                        (err3) => {
                            if (err3) {
                                console.error("DB ERROR:", err3.message);
                                return res.status(500).json({ message: "DB error" });
                            }

                            db.get(
                                `SELECT id, name, age FROM users WHERE id = ?`,
                                [other],
                                (err4, u) => {
                                    if (err4) return res.json({ ok: true, matched: true });
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


// Get my matches list
app.get("/api/matches", requireLogin, (req, res) => {
    const me = req.session.userId;

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
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            res.json({ matches: rows || [] });
        }
    );
});

// DELETE unmatch (removes match + chat + swipes so they can appear again in discover)
app.delete("/api/matches/:otherId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const other = Number(req.params.otherId);

    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });
    if (other === me) return res.status(400).json({ message: "Invalid otherId" });

    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // 1) ensure match exists
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, row) => {
            if (err) {
                console.error("DB ERROR:", err.message);
                return res.status(500).json({ message: "DB error" });
            }
            if (!row) return res.status(404).json({ message: "Not matched" });

            // 2) delete chat messages for this pair
            db.run(
                `DELETE FROM messages WHERE match_user1 = ? AND match_user2 = ?`,
                [user1, user2],
                (err2) => {
                    if (err2) {
                        console.error("DB ERROR:", err2.message);
                        return res.status(500).json({ message: "DB error" });
                    }

                    // 3) delete match row
                    db.run(
                        `DELETE FROM matches WHERE user1_id = ? AND user2_id = ?`,
                        [user1, user2],
                        (err3) => {
                            if (err3) {
                                console.error("DB ERROR:", err3.message);
                                return res.status(500).json({ message: "DB error" });
                            }

                            // 4) delete swipes BOTH ways so they can reappear in discover
                            db.run(
                                `DELETE FROM swipes
                 WHERE (from_user_id = ? AND to_user_id = ?)
                    OR (from_user_id = ? AND to_user_id = ?)`,
                                [me, other, other, me],
                                (err4) => {
                                    if (err4) {
                                        console.error("DB ERROR:", err4.message);
                                        return res.status(500).json({ message: "DB error" });
                                    }

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


// ============================
// CHAT API (only for matches)
// ============================

// helper: validate match pair includes me
function ensureMatchIncludesMe(me, user1, user2) {
    return (me === user1 || me === user2) && user1 !== user2;
}

// Get messages for a match (by pair)
app.get("/api/chat/:otherId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const other = Number(req.params.otherId);
    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });

    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // Verify match exists
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, matchRow) => {
            if (err) return res.status(500).json({ message: "DB error" });
            if (!matchRow) return res.status(403).json({ message: "Not matched" });

            db.all(
                `
        SELECT id, sender_id, text, created_at
        FROM messages
        WHERE match_user1 = ? AND match_user2 = ?
        ORDER BY id ASC
        `,
                [user1, user2],
                (err2, rows) => {
                    if (err2) return res.status(500).json({ message: "DB error" });
                    res.json({ messages: rows || [] });
                }
            );
        }
    );
});

// Send a message to a match
app.post("/api/chat/:otherId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const other = Number(req.params.otherId);
    const text = String(req.body.text || "").trim();

    if (!other || Number.isNaN(other)) return res.status(400).json({ message: "Invalid otherId" });
    if (!text) return res.status(400).json({ message: "Empty message" });

    const user1 = Math.min(me, other);
    const user2 = Math.max(me, other);

    // Verify match exists
    db.get(
        `SELECT 1 FROM matches WHERE user1_id = ? AND user2_id = ?`,
        [user1, user2],
        (err, matchRow) => {
            if (err) return res.status(500).json({ message: "DB error" });
            if (!matchRow) return res.status(403).json({ message: "Not matched" });

            db.run(
                `
        INSERT INTO messages (match_user1, match_user2, sender_id, text)
        VALUES (?, ?, ?, ?)
        `,
                [user1, user2, me, text],
                function (err2) {
                    if (err2) return res.status(500).json({ message: "DB error" });
                    res.json({ ok: true, id: this.lastID });
                }
            );
        }
    );
});


app.get("/api/profile/:userId/comments", requireLogin, (req, res) => {
    const profileUserId = Number(req.params.userId);
    const me = req.session.userId;

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
            if (err) {
                console.error(err);
                return res.json({ comments: [] });
            }
            res.json({ comments: rows || [] });
        }
    );
});


app.post("/api/profile/:userId/comments", requireLogin, (req, res) => {
    const me = req.session.userId;
    const profileUserId = Number(req.params.userId);
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // 🔒 Wingman-Check (beide Richtungen!)
    db.get(
        `
            SELECT 1
            FROM wingman_links
            WHERE (user_id = ? AND wingman_user_id = ?)
               OR (user_id = ? AND wingman_user_id = ?)
        `,
        [profileUserId, me, me, profileUserId],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error" });
            }

            // ❌ KEIN Wingman → STOP
            if (!row) {
                return res.status(403).json({
                    message: "Only wingmen can comment"
                });
            }

            // ✅ Wingman → speichern
            db.run(
                `
                    INSERT INTO profile_comments
                        (profile_user_id, commenter_user_id, comment)
                    VALUES (?, ?, ?)
                `,
                [profileUserId, me, comment.trim()],
                (err2) => {
                    if (err2) {
                        console.error(err2);
                        return res.status(500).json({ message: "DB error" });
                    }
                    res.json({ success: true });
                }
            );
        }
    );
});






app.get("/profile/:userId", requireLogin, (req, res) => {
    res.sendFile(
        path.join(__dirname, "public/profile-view.html")
    );
});
app.get("/api/profile/:userId", requireLogin, (req, res) => {
    const userId = Number(req.params.userId);

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
        if (err || !row) {
            return res.status(404).json({ message: "Profile not found" });
        }

        let photos = [];
        try { photos = JSON.parse(row.photos || "[]"); } catch {}

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
app.get("/api/profile/:userId/prompts", requireLogin, (req, res) => {
    const userId = Number(req.params.userId);

    db.all(`
        SELECT p.prompt_text AS prompt_text, a.answer
        FROM user_prompt_answers a
                 JOIN prompts p ON p.id = a.prompt_id
        WHERE a.user_id = ?
    `, [userId], (err, rows) => {
        if (err) {
            console.error("DB ERROR:", err.message);
            return res.status(500).json({ prompts: [] });
        }

        res.json({ prompts: rows || [] });
    });
});

app.get("/api/me/comments", requireLogin, (req, res) => {
    const me = req.session.userId;

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
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error", comments: [] });
            }
            res.json({ comments: rows || [] });
        }
    );
});

app.delete("/api/me/comments/:commentId", requireLogin, (req, res) => {
    const me = req.session.userId;
    const commentId = Number(req.params.commentId);

    if (!commentId || Number.isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid commentId" });
    }

    db.run(
        `DELETE FROM profile_comments WHERE id = ? AND profile_user_id = ?`,
        [commentId, me],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "DB error" });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: "Comment not found" });
            }
            res.json({ ok: true });
        }
    );
});





/* ================= START (ALWAYS LAST) ================= */
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
