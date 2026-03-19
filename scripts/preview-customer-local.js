#!/usr/bin/env node

import fs from "fs";
import http from "http";
import https from "https";
import path from "path";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const customerIdRaw = process.argv[2];
const portArg = process.argv[3];
const backendBaseArg = process.argv[4];

if (!customerIdRaw) {
  fail(
    "Usage: node scripts/preview-customer-local.js <customer-id> [port] [backend-base-url]",
  );
}

const customerId = customerIdRaw.trim().toLowerCase();
const port = Number.parseInt(portArg || "4174", 10);
const backendBaseUrl = new URL(
  (backendBaseArg || "http://127.0.0.1:8000").trim(),
);
const distDir = path.resolve(`dist-${customerId}`);

if (!fs.existsSync(distDir)) {
  fail(`Build folder not found: ${distDir}`);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(content);
  });
}

function proxyBackend(req, res) {
  const incomingUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  const proxiedPath = incomingUrl.pathname.replace(/^\/backend/, "") || "/";
  const targetUrl = new URL(proxiedPath + incomingUrl.search, backendBaseUrl);
  const transport = targetUrl.protocol === "https:" ? https : http;

  const proxyRequest = transport.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    },
  );

  proxyRequest.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: false,
        error: `Local preview proxy error: ${error.message}`,
      }),
    );
  });

  req.pipe(proxyRequest);
}

function resolveStaticPath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = safePath === "/" ? "/index.html" : safePath;
  const candidate = path.resolve(distDir, `.${normalized}`);

  if (!candidate.startsWith(distDir)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  return path.join(distDir, "index.html");
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";

  if (urlPath.startsWith("/backend")) {
    proxyBackend(req, res);
    return;
  }

  const filePath = resolveStaticPath(urlPath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local customer preview running for ${customerId}`);
  console.log(`- URL: http://127.0.0.1:${port}`);
  console.log(`- Dist: ${distDir}`);
  console.log(`- Backend proxy: ${backendBaseUrl.origin}`);
});
