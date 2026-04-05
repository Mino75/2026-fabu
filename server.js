const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const app = express();

// --------------------------------------------------
// Static capability maps
// --------------------------------------------------

const SUPPORTED_LANGUAGES = new Set(["en", "fr", "mg", "zh-CN", "ru", "ja", "es"]);
const SUPPORTED_TYPES = new Set(["article"]);



// --------------------------------------------------
// Config
// --------------------------------------------------

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();

const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, "data");

const CACHE_VERSION = process.env.CACHE_VERSION || "v2";
const APP_NAME = process.env.APP_NAME || "fabu";

const SITE_TITLE = process.env.SITE_TITLE || "Publisher";
const SITE_DESCRIPTION =
  process.env.SITE_DESCRIPTION ||
  "A minimal publication frontend with offline sync and local-first rendering.";
const SITE_LANGUAGE = normalizeLanguage(process.env.SITE_LANGUAGE || "en");

const DEFAULT_CONTENT_TYPE = normalizeType(process.env.DEFAULT_CONTENT_TYPE || "article") || "article";

const FAVICON_BASE64 = process.env.FAVICON_BASE64 || "";
const ICON_192_BASE64 = process.env.ICON_192_BASE64 || "";
const ICON_512_BASE64 = process.env.ICON_512_BASE64 || "";

app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// Bootstrap
// --------------------------------------------------

async function ensureDataLayout() {
  await fsp.mkdir(DATA_DIR, { recursive: true });

  for (const type of SUPPORTED_TYPES) {
    const indexPath = getIndexFilePath(type);
    try {
      await fsp.access(indexPath);
    } catch {
      await writeJsonFileAtomic(indexPath, []);
    }
  }
}

// --------------------------------------------------
// Generic helpers
// --------------------------------------------------

async function seedDataDirIfEmpty() {
  const runtimeIndexPath = path.join(DATA_DIR, "article.index.json");
  const bundledDataDir = path.join(ROOT_DIR, "data");
  const bundledIndexPath = path.join(bundledDataDir, "article.index.json");

  const runtimeIndex = await readJsonFile(runtimeIndexPath, []);

  const runtimeFiles = await fsp.readdir(DATA_DIR).catch(() => []);
  const hasOnlyEmptyIndex =
    runtimeFiles.length <= 1 &&
    Array.isArray(runtimeIndex) &&
    runtimeIndex.length === 0;

  if (!hasOnlyEmptyIndex) {
    return;
  }

  const bundledIndex = await readJsonFile(bundledIndexPath, []);

  if (!Array.isArray(bundledIndex) || bundledIndex.length === 0) {
    return;
  }

  const bundledFiles = await fsp.readdir(bundledDataDir);

  for (const fileName of bundledFiles) {
    const sourcePath = path.join(bundledDataDir, fileName);
    const targetPath = path.join(DATA_DIR, fileName);

    const stat = await fsp.stat(sourcePath);
    if (!stat.isFile()) {
      continue;
    }

    const exists = await fsp.access(targetPath).then(() => true).catch(() => false);
    if (!exists) {
      await fsp.copyFile(sourcePath, targetPath);
    }
  }
}

function normalizeLanguage(value) {
  const raw = String(value || "").trim();
  return SUPPORTED_LANGUAGES.has(raw) ? raw : "en";
}

function normalizeType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "");
}

function ensureSupportedType(type) {
  const normalized = normalizeType(type);
  if (!normalized || !SUPPORTED_TYPES.has(normalized)) {
    throw new Error(`Unsupported content type "${type}".`);
  }
  return normalized;
}

function ensureAdminPasswordConfigured() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }
}

function adminAuth(req, res, next) {
  try {
    ensureAdminPasswordConfigured();
  } catch {
    return res.status(500).json({
      ok: false,
      error: "Server admin password is not configured."
    });
  }

  const providedPassword = req.get("x-admin-password") || "";

  if (providedPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized."
    });
  }

  next();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(tag => String(tag || "").trim())
    .filter(Boolean);
}

function isValidUtcIsoDate(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const raw = String(value).trim();
  const utcIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

  if (!utcIsoPattern.test(raw)) {
    return false;
  }

  return !Number.isNaN(Date.parse(raw));
}

function nowUtcIso() {
  return new Date().toISOString();
}

function getIndexFilePath(type) {
  return path.join(DATA_DIR, `${type}.index.json`);
}

function getDefaultRecordFile(slug, type) {
  if (type !== "article") {
    throw new Error(`Unsupported content type "${type}".`);
  }

  return `${slug}.article.json`;
}

function buildPublicRecordPath(type, slug) {
  if (type !== "article") {
    throw new Error(`Unsupported content type "${type}".`);
  }

  return `/${encodeURIComponent(slug)}.article.json`;
}

function resolveRecordFilePathBySlug(type, slug) {
  const safeType = ensureSupportedType(type);
  const safeSlug = normalizeSlug(slug);

  if (!safeSlug) {
    throw new Error("A valid slug is required.");
  }

  const fileName = getDefaultRecordFile(safeSlug, safeType);
  const resolved = path.resolve(DATA_DIR, fileName);

  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error("Invalid record path.");
  }

  return resolved;
}


async function readJsonFile(filePath, fallback = null) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });

  const tempPath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2) + "\n";

  await fsp.writeFile(tempPath, json, "utf8");
  await fsp.rename(tempPath, filePath);
}

async function readTypeIndex(type) {
  const safeType = ensureSupportedType(type);
  const index = await readJsonFile(getIndexFilePath(safeType), []);

  if (!Array.isArray(index)) {
    throw new Error(`${safeType}.index.json must contain an array.`);
  }

  return index;
}

async function writeTypeIndex(type, index) {
  const safeType = ensureSupportedType(type);
  await writeJsonFileAtomic(getIndexFilePath(safeType), index);
}

function extractRequestedSlugs(req) {
  const slugs = [];

  if (req.query.slug) {
    const slugValues = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
    slugValues.forEach(value => {
      const normalized = normalizeSlug(value);
      if (normalized) slugs.push(normalized);
    });
  }

  if (req.query.slugs) {
    String(req.query.slugs)
      .split(",")
      .map(value => normalizeSlug(value))
      .filter(Boolean)
      .forEach(value => slugs.push(value));
  }

  return [...new Set(slugs)];
}

function sortIndexByUpdatedAtThenPublishedAt(items) {
  return [...items].sort((a, b) => {
    const updatedA = Date.parse(a.updatedAt || 0);
    const updatedB = Date.parse(b.updatedAt || 0);
    if (updatedB !== updatedA) {
      return updatedB - updatedA;
    }

    const publishedA = Date.parse(a.publishedAt || 0);
    const publishedB = Date.parse(b.publishedAt || 0);
    return publishedB - publishedA;
  });
}

function buildIndexEntry(type, record) {
  const safeType = ensureSupportedType(type);

  return {
    type: safeType,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: Array.isArray(record.tags) ? record.tags : [],
    file: buildPublicRecordPath(safeType, record.slug)
  };
}

async function loadRecordContent(type, entry) {
  const filePath = resolveRecordFilePathBySlug(type, entry.slug);
  return readJsonFile(filePath);
}

// --------------------------------------------------
// Content validation
// --------------------------------------------------

function validateArticlePayload(payload, options = {}) {
  const {
    requireSlug = true,
    requireHtml = true,
    currentRecord = null
  } = options;

  const slug = normalizeSlug(payload.slug ?? currentRecord?.slug);

  if (requireSlug && !slug) {
    throw new Error("A valid slug is required.");
  }

  if (!isNonEmptyString(payload.title ?? currentRecord?.title)) {
    throw new Error("A non-empty title is required.");
  }

  const publishedAt = String(payload.publishedAt ?? currentRecord?.publishedAt ?? "").trim();
  if (!isValidUtcIsoDate(publishedAt)) {
    throw new Error('A valid UTC ISO date is required for "publishedAt" (example: 2026-04-05T10:00:00Z).');
  }

  const html = String(payload.html ?? currentRecord?.html ?? "");
  if (requireHtml && !html.trim()) {
    throw new Error("A non-empty html field is required.");
  }

  const createdAt =
    String(payload.createdAt ?? currentRecord?.createdAt ?? "").trim() || nowUtcIso();
  if (!isValidUtcIsoDate(createdAt)) {
    throw new Error('A valid UTC ISO date is required for "createdAt".');
  }

  const updatedAt =
    String(payload.updatedAt ?? currentRecord?.updatedAt ?? "").trim() || nowUtcIso();
  if (!isValidUtcIsoDate(updatedAt)) {
    throw new Error('A valid UTC ISO date is required for "updatedAt".');
  }

  return {
    type: "article",
    slug,
    title: String(payload.title ?? currentRecord?.title ?? "").trim(),
    excerpt: String(payload.excerpt ?? currentRecord?.excerpt ?? "").trim(),
    publishedAt,
    createdAt,
    updatedAt,
    tags: normalizeTags(payload.tags ?? currentRecord?.tags),
    html
  };
}

function validateRecordPayload(type, payload, options = {}) {
  const safeType = ensureSupportedType(type);

  if (safeType === "article") {
    return validateArticlePayload(payload, options);
  }

  throw new Error(`No validator is registered for "${safeType}".`);
}

// --------------------------------------------------
// Branding assets
// --------------------------------------------------

function parseBase64Asset(rawValue, fallbackMime = "image/png") {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return null;
  }

  let mimeType = fallbackMime;
  let base64Payload = raw;

  const dataUrlMatch = raw.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64Payload = dataUrlMatch[2];
  }

  try {
    return {
      mimeType,
      buffer: Buffer.from(base64Payload, "base64")
    };
  } catch {
    return null;
  }
}

function sendBase64Asset(res, rawValue, fallbackMime) {
  const asset = parseBase64Asset(rawValue, fallbackMime);

  if (!asset) {
    res.status(404).end();
    return;
  }

  res.setHeader("Content-Type", asset.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(asset.buffer);
}

// --------------------------------------------------
// Dynamic app config / branding routes
// --------------------------------------------------

app.get("/app-config.js", (req, res) => {
  const payload = {
    siteTitle: SITE_TITLE,
    siteDescription: SITE_DESCRIPTION,
    siteLanguage: SITE_LANGUAGE,
    defaultContentType: DEFAULT_CONTENT_TYPE
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(payload, null, 2)};\n`);
});

app.get("/manifest.webmanifest", (req, res) => {
  const manifest = {
    name: SITE_TITLE,
    short_name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#2563eb",
    icons: [
      ICON_192_BASE64
        ? {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          }
        : null,
      ICON_512_BASE64
        ? {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        : null
    ].filter(Boolean)
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(JSON.stringify(manifest, null, 2));
});

app.get("/favicon.ico", (req, res) => {
  sendBase64Asset(res, FAVICON_BASE64, "image/x-icon");
});

app.get("/icon-192.png", (req, res) => {
  sendBase64Asset(res, ICON_192_BASE64, "image/png");
});

app.get("/icon-512.png", (req, res) => {
  sendBase64Asset(res, ICON_512_BASE64, "image/png");
});

// --------------------------------------------------
// Public content routes
// --------------------------------------------------


app.get("/article.index.json", async (req, res) => {
  try {
    const index = await readTypeIndex("article");
    res.json(index);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/:recordFile", async (req, res, next) => {
  try {
    const recordFile = String(req.params.recordFile || "").trim();

    if (!recordFile.endsWith(".article.json")) {
      return next();
    }

    const filePath = path.resolve(DATA_DIR, recordFile);

    if (!filePath.startsWith(DATA_DIR)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid record path."
      });
    }

    const record = await readJsonFile(filePath, null);

    if (!record) {
      return res.status(404).json({
        ok: false,
        error: "Record not found."
      });
    }

    return res.json(record);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// Protected CRUD API
// --------------------------------------------------

app.get("/api/:type/items", adminAuth, async (req, res) => {
  try {
    const type = ensureSupportedType(req.params.type);
    const index = await readTypeIndex(type);
    const requestedSlugs = extractRequestedSlugs(req);
    const withContent = String(req.query.withContent || "").toLowerCase() === "true";

    let results = index;

    if (requestedSlugs.length > 0) {
      results = index.filter(item => requestedSlugs.includes(normalizeSlug(item.slug)));
    }

    if (!withContent) {
      return res.json({
        ok: true,
        type,
        count: results.length,
        items: results
      });
    }

    const expanded = [];
    for (const item of results) {
      try {
        const record = await loadRecordContent(type, item);
        expanded.push(record);
      } catch {
        expanded.push({
          ...item,
          loadError: "Unable to read record file."
        });
      }
    }

    return res.json({
      ok: true,
      type,
      count: expanded.length,
      items: expanded
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/:type/items", adminAuth, async (req, res) => {
  try {
    const type = ensureSupportedType(req.params.type);
    const index = await readTypeIndex(type);

    const now = nowUtcIso();
    const record = validateRecordPayload(type, {
      ...req.body,
      createdAt: req.body.createdAt || now,
      updatedAt: req.body.updatedAt || now
    }, {
      requireSlug: true,
      requireHtml: true
    });

    const existing = index.find(item => normalizeSlug(item.slug) === record.slug);
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: `A record with slug "${record.slug}" already exists.`
      });
    }

    const filePath = resolveRecordFilePathBySlug(type, record.slug);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({
        ok: false,
        error: `A record file already exists for slug "${record.slug}".`
      });
    }

    await writeJsonFileAtomic(filePath, record);

    const nextIndex = sortIndexByUpdatedAtThenPublishedAt([
      ...index,
      buildIndexEntry(type, record)
    ]);

    await writeTypeIndex(type, nextIndex);

    res.status(201).json({
      ok: true,
      type,
      item: buildIndexEntry(type, record)
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.put("/api/:type/items", adminAuth, async (req, res) => {
  try {
    const type = ensureSupportedType(req.params.type);

    const targetSlug = normalizeSlug(req.body.targetSlug || req.body.slug);
    if (!targetSlug) {
      return res.status(400).json({
        ok: false,
        error: "targetSlug or slug is required."
      });
    }

    const index = await readTypeIndex(type);
    const existingIndexPosition = index.findIndex(
      item => normalizeSlug(item.slug) === targetSlug
    );

    if (existingIndexPosition === -1) {
      return res.status(404).json({
        ok: false,
        error: `A record with slug "${targetSlug}" was not found.`
      });
    }

    const currentEntry = index[existingIndexPosition];
    const currentFilePath = resolveRecordFilePathBySlug(type, currentEntry.slug);
    const currentRecord = await readJsonFile(currentFilePath);

    const nextSlug = normalizeSlug(req.body.slug || currentRecord.slug);
    const slugConflict = index.find(
      item =>
        normalizeSlug(item.slug) === nextSlug &&
        normalizeSlug(item.slug) !== targetSlug
    );

    if (slugConflict) {
      return res.status(409).json({
        ok: false,
        error: `Another record already uses slug "${nextSlug}".`
      });
    }

    const updatedRecord = validateRecordPayload(type, {
      ...currentRecord,
      ...req.body,
      slug: nextSlug,
      createdAt: currentRecord.createdAt,
      updatedAt: nowUtcIso()
    }, {
      requireSlug: true,
      requireHtml: true,
      currentRecord
    });

    const newFilePath = resolveRecordFilePathBySlug(type, updatedRecord.slug);

    await writeJsonFileAtomic(newFilePath, updatedRecord);

    if (newFilePath !== currentFilePath && fs.existsSync(currentFilePath)) {
      await fsp.unlink(currentFilePath);
    }

    index[existingIndexPosition] = buildIndexEntry(type, updatedRecord);

    const nextIndex = sortIndexByUpdatedAtThenPublishedAt(index);
    await writeTypeIndex(type, nextIndex);

    res.json({
      ok: true,
      type,
      item: buildIndexEntry(type, updatedRecord)
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.delete("/api/:type/items", adminAuth, async (req, res) => {
  try {
    const type = ensureSupportedType(req.params.type);
    const targetSlug = normalizeSlug(req.query.slug || req.body?.slug);

    if (!targetSlug) {
      return res.status(400).json({
        ok: false,
        error: "slug is required."
      });
    }

    const index = await readTypeIndex(type);
    const existingEntry = index.find(item => normalizeSlug(item.slug) === targetSlug);

    if (!existingEntry) {
      return res.status(404).json({
        ok: false,
        error: `A record with slug "${targetSlug}" was not found.`
      });
    }

    const filePath = resolveRecordFilePathBySlug(type, existingEntry.slug);

    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
    }

    const nextIndex = index.filter(item => normalizeSlug(item.slug) !== targetSlug);
    await writeTypeIndex(type, nextIndex);

    res.json({
      ok: true,
      type,
      deletedSlug: targetSlug
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// Dynamic HTML
// --------------------------------------------------

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderIndexHtml() {
  const template = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");

  return template
    .replaceAll("__HTML_LANG__", escapeHtml(SITE_LANGUAGE))
    .replaceAll("__SITE_TITLE__", escapeHtml(SITE_TITLE))
    .replaceAll("__SITE_DESCRIPTION__", escapeHtml(SITE_DESCRIPTION));
}

app.get("/main.js", (req, res) => {
  try {
    let jsContent = fs.readFileSync(path.join(ROOT_DIR, "main.js"), "utf8");

    const rescueCode = `
// Service worker bootstrap
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" }).catch(() => {});
}
`;

    jsContent = `${rescueCode}\n${jsContent}`;

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(jsContent);
  } catch {
    res.status(500).send("Error loading main.js");
  }
});

app.get("/service-worker.js", (req, res) => {
  try {
    const swPath = path.join(ROOT_DIR, "service-worker.js");

    if (!fs.existsSync(swPath)) {
      return res.status(404).send("Service worker not found");
    }

    let swContent = fs.readFileSync(swPath, "utf8");

    const versionInjection = `
// Version injected by server
self.SW_CACHE_NAME = self.SW_CACHE_NAME || "${APP_NAME}-${CACHE_VERSION}";
self.SW_TEMP_CACHE_NAME = self.SW_TEMP_CACHE_NAME || "${APP_NAME}-temp-${CACHE_VERSION}";
`;

    swContent = `${versionInjection}\n${swContent}`;

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(swContent);
  } catch {
    res.status(500).send("Error loading service worker");
  }
});

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderIndexHtml());
});

app.get("/article/:slug", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderIndexHtml());
});

// --------------------------------------------------
// Static files
// --------------------------------------------------

app.use(express.static(ROOT_DIR));

// --------------------------------------------------
// Boot
// --------------------------------------------------

ensureDataLayout()
  .then(seedDataDirIfEmpty)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Data directory: ${DATA_DIR}`);
      console.log(`Default content type: ${DEFAULT_CONTENT_TYPE}`);
      console.log(`Site language: ${SITE_LANGUAGE}`);
    });
  })
  .catch(error => {
    console.error("Failed to initialize data directory:", error);
    process.exit(1);
  });
