const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const IMAGES_SOURCE = path.resolve("/Users/joeypescatore/Desktop/Film Pics 2");
const PORT = process.env.PORT || 3456;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".ico": "image/x-icon",
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath.startsWith("/public/images/")) {
    const filename = path.basename(urlPath);
    const filePath = path.resolve(IMAGES_SOURCE, filename);
    if (!filePath.startsWith(IMAGES_SOURCE + path.sep) && filePath !== IMAGES_SOURCE) {
      return send(res, 403, "Forbidden");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) return send(res, 404, "Not found");
      send(res, 200, data, MIME[path.extname(filename).toLowerCase()] || "application/octet-stream");
    });
    return;
  }

  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden");

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found");
    send(res, 200, data, MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
});

server.listen(PORT, () => {
  console.log(`Film library → http://localhost:${PORT}`);
});
