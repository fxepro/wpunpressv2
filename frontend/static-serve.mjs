import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = process.argv[2] || "out";
const PORT = Number(process.argv[3] || 8772);
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon",
  ".txt": "text/plain", ".wpress": "application/octet-stream",
};

http
  .createServer(async (req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const fp = normalize(join(ROOT, p));
    let data, used = fp;
    try {
      data = await readFile(fp);
    } catch {
      try {
        data = await readFile(fp + ".html");
        used = fp + ".html";
      } catch {
        data = await readFile(join(ROOT, "index.html"));
        used = "index.html";
      }
    }
    res.writeHead(200, { "content-type": TYPES[extname(used)] || "application/octet-stream" });
    res.end(data);
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on ${PORT}`));
