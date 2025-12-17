//server.js:
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
};

function send(res, status, contentType, body) {
    res.writeHead(status, { "Content-Type": contentType });
    res.end(body);
}

function serveStatic(req, res) {
    const urlPath = req.url === "/" ? "/index.html" : req.url;

    // basic safety: prevent path traversal
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, "public", safePath);

    fs.readFile(filePath, (err, data) => {
        if (err) return false;

        const ext = path.extname(filePath).toLowerCase();
        const type = MIME[ext] || "application/octet-stream";
        send(res, 200, type, data);
        return true;
    });

    return true;
}

const server = http.createServer((req, res) => {
    // Serve frontend files
    // (If you later want APIs, add routes BEFORE this call.)
    serveStatic(req, res);

    // Note: For a missing file, we return a simple 404
    // (We do it async-safe by checking existence quickly)
    const urlPath = req.url === "/" ? "/index.html" : req.url;
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, "public", safePath);
    if (!fs.existsSync(filePath)) {
        send(res, 404, "text/plain; charset=utf-8", "404 Not Found");
    }
});

server.listen(PORT, () => {
    console.log(`Website running on http://localhost:${PORT}`);
});
