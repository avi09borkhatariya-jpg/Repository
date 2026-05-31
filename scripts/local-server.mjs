import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import createOrder from "../api/create-order.js";
import verifyPayment from "../api/verify-payment.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function serveApi(handler, req, res) {
  handler(req, res).catch(error => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error.message || "Server error" }));
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/LectureAI_Working.html" : url.pathname);
  const filePath = path.resolve(root, `.${pathname}`);

  if (!filePath.startsWith(root) || filePath.includes(`${path.sep}api${path.sep}`)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", types[path.extname(filePath)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/create-order")) return serveApi(createOrder, req, res);
  if ((req.url || "").startsWith("/api/verify-payment")) return serveApi(verifyPayment, req, res);
  return serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`LectureAI local server: http://localhost:${port}/LectureAI_Working.html`);
});
