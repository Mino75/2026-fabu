const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const app = express();

// --------------------------------------------------
// Config
// --------------------------------------------------

const CACHE_VERSION = process.env.CACHE_VERSION || "v2";
const APP_NAME = process.env.APP_NAME || "karaoke";
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const ROOT_DIR = __dirname;
const INDEX_FILE_PATH = path.join(ROOT_DIR, "articles.json");

app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function ensureAdminPasswordConfigured() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }
}

function adminAuth(req, res, next) {
  try {
    ensureAdminPasswordConfigured();
  } catch (error) {
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

function isValidIsoDate(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getDefaultArticleFile(slug) {
  return `./${slug}.article.json`;
}

function resolveArticleFilePath(fileValue) {
  const normalized = String(fileValue || "").trim();

  if (!normalized.startsWith("./")) {
    throw new Error("Article file must start with './'.");
  }

  if (!normalized.endsWith(".json")) {
    throw new Error("Article file must end with '.json'.");
  }

  const resolved = path.resolve(ROOT_DIR, normalized);

  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error("Invalid article file path.");
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
  const tempPath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2) + "\n";

  await fsp.writeFile(tempPath, json, "utf8");
  await fsp.rename(tempPath, filePath);
}

async function readArticlesIndex() {
  const index = await readJsonFile(INDEX_FILE_PATH, []);

  if (!Array.isArray(index)) {
    throw new Error("articles.json must contain an array.");
  }

  return index;
}

async function writeArticlesIndex(index) {
  await writeJsonFileAtomic(INDEX_FILE_PATH, index);
}

function validateArticlePayload(payload, { requireHtml = true, requireSlug = true } = {}) {
  const rawSlug = payload.slug;
  const slug = normalizeSlug(rawSlug);

  if (requireSlug && !slug) {
    throw new Error("A valid slug is required.");
  }

  if (!isNonEmptyString(payload.title)) {
    throw new Error("A non-empty title is required.");
  }

  const publishedAt = String(payload.publishedAt || payload.date || "").trim();
  if (!isValidIsoDate(publishedAt)) {
    throw new Error("A valid publishedAt date is required.");
  }

  const excerpt = String(payload.excerpt || "").trim();
  const html = String(payload.html || "");

  if (requireHtml && !html.trim()) {
    throw new Error("A non-empty html field is required.");
  }

  const tags = normalizeTags(payload.tags);
  const file = isNonEmptyString(payload.file)
    ? String(payload.file).trim()
    : getDefaultArticleFile(slug);

  resolveArticleFilePath(file);

  return {
    slug,
    title: String(payload.title).trim(),
    publishedAt,
    tags,
    excerpt,
    html,
    file
  };
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

function buildIndexEntry(article) {
  return {
    slug: article.slug,
    title: article.title,
    publishedAt: article.publishedAt,
    tags: article.tags,
    excerpt: article.excerpt,
    file: article.file
  };
}

async function loadArticleContent(entry) {
  const fullPath = resolveArticleFilePath(entry.file);
  return readJsonFile(fullPath);
}

// --------------------------------------------------
// Existing main.js route with injected SW registration
// --------------------------------------------------

app.get("/main.js", (req, res) => {
  try {
    let jsContent = fs.readFileSync(path.join(ROOT_DIR, "main.js"), "utf8");

    const rescueCode = `
// Cache Lock Rescue - Check for ${CACHE_VERSION} users and free older versions
if ("serviceWorker" in navigator) {
  caches.keys().then(cacheNames => {
    const hasCurrentVersion = cacheNames.some(name => name.includes("-${CACHE_VERSION}"));

    if (!hasCurrentVersion && cacheNames.length > 0) {
      console.log("Cache lock detected - rescuing to ${CACHE_VERSION}...");
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.unregister().then(() => location.reload());
      });
      return;
    }

    navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" });
  });
}
`;

    const finalContent = rescueCode + "\n\n" + jsContent;

    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.send(finalContent);
  } catch (error) {
    console.error("Error serving main.js:", error);
    res.status(500).send("Error loading main.js");
  }
});

// --------------------------------------------------
// Existing service worker route with version injection
// --------------------------------------------------

app.get("/service-worker.js", (req, res) => {
  try {
    let swContent = fs.readFileSync(path.join(ROOT_DIR, "service-worker.js"), "utf8");

    const versionInjection = `
// Version injected by server
self.SW_CACHE_NAME = self.SW_CACHE_NAME || "${APP_NAME}-${CACHE_VERSION}";
self.SW_TEMP_CACHE_NAME = self.SW_TEMP_CACHE_NAME || "${APP_NAME}-temp-${CACHE_VERSION}";
self.SW_FIRST_TIME_TIMEOUT = "${process.env.SW_FIRST_TIME_TIMEOUT || "20000"}";
self.SW_RETURNING_USER_TIMEOUT = "${process.env.SW_RETURNING_USER_TIMEOUT || "5000"}";
self.SW_ENABLE_LOGS = "${process.env.SW_ENABLE_LOGS || "true"}";
`;

    swContent = versionInjection + "\n" + swContent;

    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(swContent);
  } catch (error) {
    console.error("Error serving service worker:", error);
    res.status(500).send("Error loading service worker");
  }
});

// --------------------------------------------------
// Protected article API
// --------------------------------------------------

app.get("/findArticles", adminAuth, async (req, res) => {
  try {
    const index = await readArticlesIndex();
    const requestedSlugs = extractRequestedSlugs(req);
    const withContent = String(req.query.withContent || "").toLowerCase() === "true";

    let results = index;

    if (requestedSlugs.length > 0) {
      results = index.filter(item => requestedSlugs.includes(normalizeSlug(item.slug)));
    }

    if (withContent) {
      const expanded = [];
      for (const item of results) {
        try {
          const article = await loadArticleContent(item);
          expanded.push(article);
        } catch (error) {
          expanded.push({
            ...item,
            loadError: `Unable to read article file: ${item.file}`
          });
        }
      }

      return res.json({
        ok: true,
        count: expanded.length,
        articles: expanded
      });
    }

    return res.json({
      ok: true,
      count: results.length,
      articles: results
    });
  } catch (error) {
    console.error("findArticles error:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/createArticle", adminAuth, async (req, res) => {
  try {
    const article = validateArticlePayload(req.body, {
      requireHtml: true,
      requireSlug: true
    });

    const index = await readArticlesIndex();

    const existing = index.find(item => normalizeSlug(item.slug) === article.slug);
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: `Article with slug "${article.slug}" already exists.`
      });
    }

    const articleFilePath = resolveArticleFilePath(article.file);

    if (fs.existsSync(articleFilePath)) {
      return res.status(409).json({
        ok: false,
        error: `Article file already exists: ${article.file}`
      });
    }

    await writeJsonFileAtomic(articleFilePath, article);

    const nextIndex = [...index, buildIndexEntry(article)].sort((a, b) => {
      const da = new Date(a.publishedAt).getTime();
      const db = new Date(b.publishedAt).getTime();
      return db - da;
    });

    await writeArticlesIndex(nextIndex);

    res.status(201).json({
      ok: true,
      article: buildIndexEntry(article)
    });
  } catch (error) {
    console.error("createArticle error:", error);
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.put("/updateArticle", adminAuth, async (req, res) => {
  try {
    const targetSlug = normalizeSlug(req.body.targetSlug || req.body.slug);

    if (!targetSlug) {
      return res.status(400).json({
        ok: false,
        error: "targetSlug or slug is required."
      });
    }

    const index = await readArticlesIndex();
    const existingIndexPosition = index.findIndex(
      item => normalizeSlug(item.slug) === targetSlug
    );

    if (existingIndexPosition === -1) {
      return res.status(404).json({
        ok: false,
        error: `Article with slug "${targetSlug}" was not found.`
      });
    }

    const currentEntry = index[existingIndexPosition];
    const currentFilePath = resolveArticleFilePath(currentEntry.file);
    const currentArticle = await readJsonFile(currentFilePath);

    const mergedPayload = {
      ...currentArticle,
      ...req.body,
      slug: req.body.slug ? req.body.slug : currentArticle.slug,
      file: req.body.file ? req.body.file : currentArticle.file
    };

    const updatedArticle = validateArticlePayload(mergedPayload, {
      requireHtml: true,
      requireSlug: true
    });

    const newFilePath = resolveArticleFilePath(updatedArticle.file);

    const slugConflict = index.find(
      item =>
        normalizeSlug(item.slug) === updatedArticle.slug &&
        normalizeSlug(item.slug) !== targetSlug
    );

    if (slugConflict) {
      return res.status(409).json({
        ok: false,
        error: `Another article already uses slug "${updatedArticle.slug}".`
      });
    }

    if (
      updatedArticle.file !== currentEntry.file &&
      fs.existsSync(newFilePath)
    ) {
      return res.status(409).json({
        ok: false,
        error: `Target file already exists: ${updatedArticle.file}`
      });
    }

    await writeJsonFileAtomic(newFilePath, updatedArticle);

    if (newFilePath !== currentFilePath && fs.existsSync(currentFilePath)) {
      await fsp.unlink(currentFilePath);
    }

    index[existingIndexPosition] = buildIndexEntry(updatedArticle);

    const nextIndex = [...index].sort((a, b) => {
      const da = new Date(a.publishedAt).getTime();
      const db = new Date(b.publishedAt).getTime();
      return db - da;
    });

    await writeArticlesIndex(nextIndex);

    res.json({
      ok: true,
      article: buildIndexEntry(updatedArticle)
    });
  } catch (error) {
    console.error("updateArticle error:", error);
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

app.delete("/deleteArticle", adminAuth, async (req, res) => {
  try {
    const targetSlug = normalizeSlug(req.query.slug || req.body?.slug);

    if (!targetSlug) {
      return res.status(400).json({
        ok: false,
        error: "slug is required."
      });
    }

    const index = await readArticlesIndex();
    const existingEntry = index.find(item => normalizeSlug(item.slug) === targetSlug);

    if (!existingEntry) {
      return res.status(404).json({
        ok: false,
        error: `Article with slug "${targetSlug}" was not found.`
      });
    }

    const articleFilePath = resolveArticleFilePath(existingEntry.file);

    if (fs.existsSync(articleFilePath)) {
      await fsp.unlink(articleFilePath);
    }

    const nextIndex = index.filter(
      item => normalizeSlug(item.slug) !== targetSlug
    );

    await writeArticlesIndex(nextIndex);

    res.json({
      ok: true,
      deletedSlug: targetSlug
    });
  } catch (error) {
    console.error("deleteArticle error:", error);
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// --------------------------------------------------
// Static files + SPA routes
// --------------------------------------------------

app.use(express.static(ROOT_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.get("/article/:slug", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

// --------------------------------------------------
// Boot
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
