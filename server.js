console.log("DB PATH:", require("path").resolve("./database.db"));

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 8080;

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
    res.sendFile(path.join(__dirname, "protected/index.html"));
});

/* ================= BLOCK HTML DIRECT ACCESS ================= */
app.get("/*.html", (req, res) => {
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

            res.json({ message: "Registration successful" });
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
            res.json({ message: "Login successful" });
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

/* ================= START ================= */
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
