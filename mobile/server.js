const http = require("http");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "dist");
const indexFile = path.join(publicDir, "index.html");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") {
    sendFile(res, indexFile);
    return;
  }

  const filePath = path.join(publicDir, pathname);
  if (
    filePath.startsWith(publicDir) &&
    fs.existsSync(filePath) &&
    fs.statSync(filePath).isFile()
  ) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, indexFile);
});

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});
