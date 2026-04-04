const app = document.getElementById("app");

const INDEX_URL = "./articles.json";
const DB_NAME = "fabu-db";
const DB_VERSION = 1;
const INDEX_STORE = "article_index";
const ARTICLE_STORE = "articles";

// -----------------------------
// IndexedDB
// -----------------------------

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(INDEX_STORE)) {
        db.createObjectStore(INDEX_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(ARTICLE_STORE)) {
        const store = db.createObjectStore(ARTICLE_STORE, { keyPath: "slug" });
        store.createIndex("publishedAt", "publishedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, work) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    Promise.resolve()
      .then(() => work(store))
      .then(value => {
        result = value;
      })
      .catch(error => {
        transaction.abort();
        reject(error);
      });
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveIndexToDb(items) {
  const normalizedItems = Array.isArray(items)
    ? items.map(normalizeIndexItem)
    : [];

  await withStore(INDEX_STORE, "readwrite", async store => {
    store.put({
      key: "main",
      items: normalizedItems,
      savedAt: new Date().toISOString()
    });
  });
}

async function readIndexFromDb() {
  return withStore(INDEX_STORE, "readonly", async store => {
    const record = await requestToPromise(store.get("main"));
    return record?.items || [];
  });
}

async function saveArticleToDb(article) {
  const normalized = normalizeArticle(article);

  await withStore(ARTICLE_STORE, "readwrite", async store => {
    store.put({
      ...normalized,
      savedAt: new Date().toISOString()
    });
  });
}

async function readArticleFromDb(slug) {
  return withStore(ARTICLE_STORE, "readonly", async store => {
    return requestToPromise(store.get(slug));
  });
}

// -----------------------------
// Data normalization
// -----------------------------

function normalizeIndexItem(item) {
  return {
    slug: String(item?.slug || "").trim(),
    title: String(item?.title || "").trim(),
    excerpt: String(item?.excerpt || "").trim(),
    publishedAt: String(item?.publishedAt || item?.date || "").trim(),
    tags: Array.isArray(item?.tags) ? item.tags.map(String) : [],
    file: String(item?.file || "").trim()
  };
}

function normalizeArticle(article) {
  return {
    slug: String(article?.slug || "").trim(),
    title: String(article?.title || "").trim(),
    excerpt: String(article?.excerpt || "").trim(),
    publishedAt: String(article?.publishedAt || article?.date || "").trim(),
    tags: Array.isArray(article?.tags) ? article.tags.map(String) : [],
    html: String(article?.html || "")
  };
}

// -----------------------------
// HTTP
// -----------------------------

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.json();
}

async function loadArticlesIndex() {
  try {
    const remoteItems = await fetchJson(INDEX_URL);

    if (!Array.isArray(remoteItems)) {
      throw new Error("articles.json must contain an array.");
    }

    const normalized = remoteItems.map(normalizeIndexItem);
    await saveIndexToDb(normalized);
    return normalized;
  } catch (networkError) {
    const offlineItems = await readIndexFromDb();

    if (offlineItems.length) {
      return offlineItems;
    }

    throw networkError;
  }
}

async function loadArticleBySlug(slug) {
  const indexItems = await loadArticlesIndex();
  const indexItem = indexItems.find(item => item.slug === slug);

  if (!indexItem || !indexItem.file) {
    const offlineArticle = await readArticleFromDb(slug);
    return offlineArticle || null;
  }

  try {
    const remoteArticle = await fetchJson(indexItem.file);
    const normalized = normalizeArticle({
      ...indexItem,
      ...remoteArticle
    });

    await saveArticleToDb(normalized);
    return normalized;
  } catch (networkError) {
    const offlineArticle = await readArticleFromDb(slug);

    if (offlineArticle) {
      return offlineArticle;
    }

    throw networkError;
  }
}

// -----------------------------
// UI helpers
// -----------------------------

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl ? tpl.content.cloneNode(true) : document.createDocumentFragment();
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function articleUrl(slug) {
  return "/article/" + encodeURIComponent(slug);
}

function navigateTo(url) {
  history.pushState({}, "", url);
  render();
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function sortArticlesByDate(items, order = "desc") {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0).getTime();
    const dateB = new Date(b.publishedAt || 0).getTime();
    return order === "asc" ? dateA - dateB : dateB - dateA;
  });
}

function getUniqueTags(items) {
  const tags = new Set();

  items.forEach(item => {
    (item.tags || []).forEach(tag => tags.add(tag));
  });

  return [...tags].sort((a, b) => a.localeCompare(b, "en"));
}

function renderTagList(container, tags) {
  container.innerHTML = "";

  (tags || []).forEach(tag => {
    const el = document.createElement("span");
    el.className = "tag";
    el.textContent = tag;
    container.appendChild(el);
  });
}

function sanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";

  const blockedSelectors = [
    "script",
    "iframe",
    "object",
    "embed",
    "link[rel='import']",
    "meta[http-equiv]"
  ];

  blockedSelectors.forEach(selector => {
    template.content.querySelectorAll(selector).forEach(node => node.remove());
  });

  template.content.querySelectorAll("*").forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

// -----------------------------
// Routing
// -----------------------------

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    return { name: "home" };
  }

  if (path.startsWith("/article/")) {
    return {
      name: "article",
      slug: decodeURIComponent(path.slice("/article/".length))
    };
  }

  return { name: "not-found" };
}

// -----------------------------
// Views
// -----------------------------

function renderHomeError(error) {
  app.innerHTML = `
    <main class="page-shell narrow-shell">
      <section class="surface empty-state">
        <h1>Unable to load articles</h1>
        <p>${escapeHtml(error.message || "Unknown error")}</p>
      </section>
    </main>
  `;
  document.title = "Error · Publisher";
}

function renderArticleError(message) {
  app.innerHTML = `
    <main class="page-shell article-shell">
      <section class="surface empty-state">
        <h1>Unable to load article</h1>
        <p>${escapeHtml(message || "Unknown error")}</p>
        <a href="/" data-link class="button-link">Go back home</a>
      </section>
    </main>
  `;
  document.title = "Error · Publisher";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

async function renderHome() {
  try {
    const articles = await loadArticlesIndex();
    const view = cloneTemplate("tpl-home");
    app.replaceChildren(view);

    const searchInput = qs("#searchInput");
    const tagSelect = qs("#tagSelect");
    const sortSelect = qs("#sortSelect");
    const resultsCount = qs("#resultsCount");
    const articleList = qs("#articleList");

    getUniqueTags(articles).forEach(tag => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      tagSelect.appendChild(option);
    });

    function renderCards(items) {
      articleList.innerHTML = "";

      if (!items.length) {
        articleList.innerHTML = `
          <section class="surface empty-state">
            <h2>No matching articles</h2>
            <p>Try a different search term or tag filter.</p>
          </section>
        `;
        return;
      }

      items.forEach(article => {
        const card = cloneTemplate("tpl-card");

        qs(".card-date", card).textContent = formatDate(article.publishedAt);
        qs(".card-title", card).textContent = article.title || "Untitled";
        qs(".card-excerpt", card).textContent = article.excerpt || "";

        const link = qs(".card-link", card);
        link.href = articleUrl(article.slug);
        link.setAttribute("data-link", "");

        renderTagList(qs(".tag-list", card), article.tags || []);
        articleList.appendChild(card);
      });
    }

    function applyFilters() {
      const query = normalizeText(searchInput.value);
      const selectedTag = normalizeText(tagSelect.value);
      const sortOrder = sortSelect.value;

      let filtered = articles.filter(article => {
        const haystack = normalizeText([
          article.title,
          article.excerpt,
          (article.tags || []).join(" "),
          article.publishedAt
        ].join(" "));

        const matchesQuery = !query || haystack.includes(query);
        const matchesTag =
          !selectedTag ||
          (article.tags || []).some(tag => normalizeText(tag) === selectedTag);

        return matchesQuery && matchesTag;
      });

      filtered = sortArticlesByDate(filtered, sortOrder);
      renderCards(filtered);

      resultsCount.textContent =
        filtered.length + " article" + (filtered.length === 1 ? "" : "s");
    }

    searchInput.addEventListener("input", applyFilters);
    tagSelect.addEventListener("change", applyFilters);
    sortSelect.addEventListener("change", applyFilters);

    applyFilters();
    document.title = "Publisher";
  } catch (error) {
    renderHomeError(error);
  }
}

async function renderArticlePage(slug) {
  try {
    const article = await loadArticleBySlug(slug);

    if (!article) {
      renderNotFound();
      return;
    }

    const view = cloneTemplate("tpl-article");
    app.replaceChildren(view);

    qs("#articleDate").textContent = formatDate(article.publishedAt);
    qs("#articleTitle").textContent = article.title || "Untitled";
    qs("#articleExcerpt").textContent = article.excerpt || "";

    renderTagList(qs("#articleTags"), article.tags || []);

    const articleBody = qs("#articleBody");
    articleBody.innerHTML = sanitizeHtml(article.html);

    document.title = (article.title || "Article") + " · Publisher";
  } catch (error) {
    renderArticleError(error.message);
  }
}

function renderNotFound() {
  const view = cloneTemplate("tpl-not-found");
  app.replaceChildren(view);
  document.title = "Not found · Publisher";
}

// -----------------------------
// App
// -----------------------------

async function render() {
  const route = getRoute();

  if (route.name === "home") {
    await renderHome();
    return;
  }

  if (route.name === "article") {
    await renderArticlePage(route.slug);
    return;
  }

  renderNotFound();
}

document.addEventListener("click", event => {
  const link = event.target.closest("[data-link]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || !href.startsWith("/")) return;

  event.preventDefault();
  navigateTo(href);
});

window.addEventListener("popstate", render);

render();
