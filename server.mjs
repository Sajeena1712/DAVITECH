import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";

async function loadEnvFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1) continue;
      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing local env files.
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

await loadEnvFile(path.join(__dirname, ".env.local"));
await loadEnvFile(path.join(__dirname, ".env"));

if (!process.env.HF_TOKEN && typeof process.env.GEMINI_API_KEY === "string" && process.env.GEMINI_API_KEY.startsWith("hf_")) {
  process.env.HF_TOKEN = process.env.GEMINI_API_KEY;
}

const chatHandler = (await import("./api/chat.js")).default;
const authHandler = (await import("./api/auth.js")).default;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function createApiResponse(resolve) {
  let statusCode = 200;
  const headers = {};
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
    json(payload) {
      resolve({ statusCode, headers, payload });
      return this;
    },
    send(payload) {
      resolve({ statusCode, headers, payload });
      return this;
    },
  };
}

async function invokeHandler(handler, req) {
  const body = await readBody(req);
  return new Promise((resolve, reject) => {
    const res = createApiResponse(resolve);
    Promise.resolve(handler({ method: req.method, body }, res)).catch(reject);
  });
}

async function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(distDir, safePath));

  if (!filePath.startsWith(distDir)) {
    send(res, 400, "Bad request");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      const content = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, content, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      });
      return;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  const indexPath = path.join(distDir, "index.html");
  const indexContent = await readFile(indexPath);
  send(res, 200, indexContent, {
    "Content-Type": MIME_TYPES[".html"],
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");

    if (url.pathname === "/api/chat") {
      const result = await invokeHandler(chatHandler, req);
      sendJson(res, result.statusCode || 200, result.payload ?? {});
      return;
    }

    if (url.pathname === "/api/auth") {
      const result = await invokeHandler(authHandler, req);
      sendJson(res, result.statusCode || 200, result.payload ?? {});
      return;
    }

    await serveStatic(res, decodeURIComponent(url.pathname));
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

const port = Number(process.env.PORT || 4173);
const host = "0.0.0.0";

server.listen(port, host, () => {
  console.log(`DaivAI server running at http://${host}:${port}`);
});
