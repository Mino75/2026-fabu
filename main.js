const app = document.getElementById("app");

const APP_CONFIG = window.__APP_CONFIG__ || {};
const CONTENT_TYPE = APP_CONFIG.defaultContentType || "article";
const INDEX_URL = `/${CONTENT_TYPE}.index.json`;

const DB_NAME = "fabu-db";
const DB_VERSION = 2;
const INDEX_STORE = "content_index";
const RECORD_STORE = "content_records";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

const I18N = {
  en: {
    heroBadge: "Lightweight Publisher",
    heroTitle: "Articles",
    heroText: "Fast public publishing with search, filters, offline sync, and local-first rendering.",
    searchLabel: "Search",
    searchPlaceholder: "Search by title, excerpt, tag...",
    filterLabel: "Filter",
    allTags: "All tags",
    sortLabel: "Sort by date",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    loadMore: "Load more",
    readArticle: "Read article",
    backToArticles: "← Back to articles",
    loadingArticle: "Loading article...",
    notFoundTitle: "Not found",
    notFoundText: "The requested resource could not be found.",
    goBackHome: "Go back home",
    unableToLoadArticles: "Unable to load articles",
    unableToLoadArticle: "Unable to load article",
    noMatchingArticlesTitle: "No matching articles",
    noMatchingArticlesText: "Try a different search term or filter.",
    articleCount: count => `${count} article${count === 1 ? "" : "s"}`,
    showingCount: (shown, total) => `Showing ${shown} of ${total}`,
    untitled: "Untitled"
  },
  fr: {
    heroBadge: "Éditeur léger",
    heroTitle: "Articles",
    heroText: "Publication rapide avec recherche, filtres, synchronisation hors ligne et rendu local.",
    searchLabel: "Rechercher",
    searchPlaceholder: "Rechercher par titre, extrait, tag...",
    filterLabel: "Filtrer",
    allTags: "Tous les tags",
    sortLabel: "Trier par date",
    newestFirst: "Plus récents d’abord",
    oldestFirst: "Plus anciens d’abord",
    loadMore: "Afficher plus",
    readArticle: "Lire l’article",
    backToArticles: "← Retour aux articles",
    loadingArticle: "Chargement de l’article...",
    notFoundTitle: "Introuvable",
    notFoundText: "La ressource demandée est introuvable.",
    goBackHome: "Retour à l’accueil",
    unableToLoadArticles: "Impossible de charger les articles",
    unableToLoadArticle: "Impossible de charger l’article",
    noMatchingArticlesTitle: "Aucun article correspondant",
    noMatchingArticlesText: "Essayez une autre recherche ou un autre filtre.",
    articleCount: count => `${count} article${count === 1 ? "" : "s"}`,
    showingCount: (shown, total) => `${shown} affiché(s) sur ${total}`,
    untitled: "Sans titre"
  },
  mg: {
    heroBadge: "Mpanonta maivana",
    heroTitle: "Lahatsoratra",
    heroText: "Famoahana haingana miaraka amin’ny fikarohana, sivana, sync offline ary rendu eo an-toerana.",
    searchLabel: "Hikaroka",
    searchPlaceholder: "Hikaroka amin’ny lohateny, famintinana, tag...",
    filterLabel: "Sivana",
    allTags: "Tag rehetra",
    sortLabel: "Alahatra araka ny daty",
    newestFirst: "Vaovao indrindra aloha",
    oldestFirst: "Tranainy indrindra aloha",
    loadMore: "Asehoy misimisy kokoa",
    readArticle: "Vakio ny lahatsoratra",
    backToArticles: "← Hiverina amin’ny lahatsoratra",
    loadingArticle: "Ampidirina ny lahatsoratra...",
    notFoundTitle: "Tsy hita",
    notFoundText: "Tsy hita ilay loharano nangatahana.",
    goBackHome: "Hiverina amin’ny fandraisana",
    unableToLoadArticles: "Tsy afaka mampiditra lahatsoratra",
    unableToLoadArticle: "Tsy afaka mampiditra lahatsoratra",
    noMatchingArticlesTitle: "Tsy misy lahatsoratra mifanaraka",
    noMatchingArticlesText: "Andramo teny fikarohana na sivana hafa.",
    articleCount: count => `${count} lahatsoratra`,
    showingCount: (shown, total) => `Aseho ${shown} amin’ny ${total}`,
    untitled: "Tsy misy lohateny"
  },
  "zh-CN": {
    heroBadge: "轻量发布",
    heroTitle: "文章",
    heroText: "支持搜索、筛选、离线同步和本地优先渲染的快速发布。",
    searchLabel: "搜索",
    searchPlaceholder: "按标题、摘要、标签搜索...",
    filterLabel: "筛选",
    allTags: "全部标签",
    sortLabel: "按日期排序",
    newestFirst: "最新优先",
    oldestFirst: "最早优先",
    loadMore: "加载更多",
    readArticle: "阅读文章",
    backToArticles: "← 返回文章列表",
    loadingArticle: "正在加载文章...",
    notFoundTitle: "未找到",
    notFoundText: "未找到请求的资源。",
    goBackHome: "返回首页",
    unableToLoadArticles: "无法加载文章",
    unableToLoadArticle: "无法加载文章",
    noMatchingArticlesTitle: "没有匹配的文章",
    noMatchingArticlesText: "请尝试其他搜索词或筛选条件。",
    articleCount: count => `${count} 篇文章`,
    showingCount: (shown, total) => `显示 ${shown} / ${total}`,
    untitled: "未命名"
  },
  ru: {
    heroBadge: "Лёгкая публикация",
    heroTitle: "Статьи",
    heroText: "Быстрая публикация с поиском, фильтрами, офлайн-синхронизацией и локальным рендерингом.",
    searchLabel: "Поиск",
    searchPlaceholder: "Искать по заголовку, описанию, тегу...",
    filterLabel: "Фильтр",
    allTags: "Все теги",
    sortLabel: "Сортировать по дате",
    newestFirst: "Сначала новые",
    oldestFirst: "Сначала старые",
    loadMore: "Показать ещё",
    readArticle: "Читать статью",
    backToArticles: "← Назад к статьям",
    loadingArticle: "Загрузка статьи...",
    notFoundTitle: "Не найдено",
    notFoundText: "Запрошенный ресурс не найден.",
    goBackHome: "Вернуться на главную",
    unableToLoadArticles: "Не удалось загрузить статьи",
    unableToLoadArticle: "Не удалось загрузить статью",
    noMatchingArticlesTitle: "Подходящих статей нет",
    noMatchingArticlesText: "Попробуйте другой запрос или фильтр.",
    articleCount: count => `${count} ${pluralizeRuArticles(count)}`,
    showingCount: (shown, total) => `Показано ${shown} из ${total}`,
    untitled: "Без названия"
  },
  ja: {
    heroBadge: "軽量パブリッシング",
    heroTitle: "記事",
    heroText: "検索、フィルター、オフライン同期、ローカル優先レンダリングに対応した高速公開。",
    searchLabel: "検索",
    searchPlaceholder: "タイトル、概要、タグで検索...",
    filterLabel: "絞り込み",
    allTags: "すべてのタグ",
    sortLabel: "日付順",
    newestFirst: "新しい順",
    oldestFirst: "古い順",
    loadMore: "もっと見る",
    readArticle: "記事を読む",
    backToArticles: "← 記事一覧へ戻る",
    loadingArticle: "記事を読み込み中...",
    notFoundTitle: "見つかりません",
    notFoundText: "要求されたリソースは見つかりませんでした。",
    goBackHome: "ホームへ戻る",
    unableToLoadArticles: "記事を読み込めません",
    unableToLoadArticle: "記事を読み込めません",
    noMatchingArticlesTitle: "一致する記事がありません",
    noMatchingArticlesText: "別の検索語またはフィルターを試してください。",
    articleCount: count => `${count}件の記事`,
    showingCount: (shown, total) => `${total}件中 ${shown}件を表示`,
    untitled: "無題"
  },
  es: {
    heroBadge: "Publicación ligera",
    heroTitle: "Artículos",
    heroText: "Publicación rápida con búsqueda, filtros, sincronización offline y renderizado local.",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar por título, extracto, etiqueta...",
    filterLabel: "Filtrar",
    allTags: "Todas las etiquetas",
    sortLabel: "Ordenar por fecha",
    newestFirst: "Más recientes primero",
    oldestFirst: "Más antiguos primero",
    loadMore: "Cargar más",
    readArticle: "Leer artículo",
    backToArticles: "← Volver a los artículos",
    loadingArticle: "Cargando artículo...",
    notFoundTitle: "No encontrado",
    notFoundText: "No se pudo encontrar el recurso solicitado.",
    goBackHome: "Volver al inicio",
    unableToLoadArticles: "No se pudieron cargar los artículos",
    unableToLoadArticle: "No se pudo cargar el artículo",
    noMatchingArticlesTitle: "No hay artículos coincidentes",
    noMatchingArticlesText: "Prueba otra búsqueda o filtro.",
    articleCount: count => `${count} artículo${count === 1 ? "" : "s"}`,
    showingCount: (shown, total) => `Mostrando ${shown} de ${total}`,
    untitled: "Sin título"
  }
};

function pluralizeRuArticles(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "статья";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "статьи";
  return "статей";
}

function getTranslations() {
  const language = String(APP_CONFIG.siteLanguage || "en").trim();
  return I18N[language] || I18N.en;
}

const t = getTranslations();

// --------------------------------------------------
// IndexedDB
// --------------------------------------------------

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(INDEX_STORE)) {
        db.createObjectStore(INDEX_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        const store = db.createObjectStore(RECORD_STORE, { keyPath: "key" });
        store.createIndex("slug", "slug", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
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

function getIndexStoreKey(type) {
  return `${type}:main`;
}

function getRecordStoreKey(type, slug) {
  return `${type}:${slug}`;
}

async function saveIndexToDb(type, items) {
  const normalizedItems = Array.isArray(items)
    ? items.map(item => normalizeIndexItem(item, type))
    : [];

  await withStore(INDEX_STORE, "readwrite", async store => {
    store.put({
      key: getIndexStoreKey(type),
      type,
      items: normalizedItems,
      savedAt: new Date().toISOString()
    });
  });
}

async function readIndexFromDb(type) {
  return withStore(INDEX_STORE, "readonly", async store => {
    const record = await requestToPromise(store.get(getIndexStoreKey(type)));
    return record?.items || [];
  });
}

async function saveRecordToDb(type, record) {
  const normalized = normalizeRecord(record, type);

  await withStore(RECORD_STORE, "readwrite", async store => {
    store.put({
      key: getRecordStoreKey(type, normalized.slug),
      ...normalized,
      savedAt: new Date().toISOString()
    });
  });
}

async function readRecordFromDb(type, slug) {
  return withStore(RECORD_STORE, "readonly", async store => {
    return requestToPromise(store.get(getRecordStoreKey(type, slug)));
  });
}

// --------------------------------------------------
// Data normalization
// --------------------------------------------------

function normalizeIndexItem(item, type = CONTENT_TYPE) {
  const slug = String(item?.slug || "").trim();

  return {
    type,
    slug,
    title: String(item?.title || "").trim(),
    excerpt: String(item?.excerpt || "").trim(),
    publishedAt: String(item?.publishedAt || "").trim(),
    createdAt: String(item?.createdAt || "").trim(),
    updatedAt: String(item?.updatedAt || item?.createdAt || "").trim(),
    tags: Array.isArray(item?.tags) ? item.tags.map(String) : [],
    file: String(item?.file || buildRecordUrl(type, slug)).trim()
  };
}

function normalizeRecord(record, type = CONTENT_TYPE) {
  return {
    type,
    slug: String(record?.slug || "").trim(),
    title: String(record?.title || "").trim(),
    excerpt: String(record?.excerpt || "").trim(),
    publishedAt: String(record?.publishedAt || "").trim(),
    createdAt: String(record?.createdAt || "").trim(),
    updatedAt: String(record?.updatedAt || record?.createdAt || "").trim(),
    tags: Array.isArray(record?.tags) ? record.tags.map(String) : [],
    html: String(record?.html || "")
  };
}

function buildRecordUrl(type, slug) {
  return `/${encodeURIComponent(slug)}.${encodeURIComponent(type)}.json`;
}

function getComparableTimestamp(value) {
  const ts = Date.parse(String(value || "").trim());
  return Number.isNaN(ts) ? 0 : ts;
}

function isRemoteRecordNewer(remoteMeta, localRecord) {
  if (!localRecord) {
    return true;
  }

  const remoteUpdated = getComparableTimestamp(remoteMeta.updatedAt || remoteMeta.createdAt);
  const localUpdated = getComparableTimestamp(localRecord.updatedAt || localRecord.createdAt);

  return remoteUpdated > localUpdated;
}

// --------------------------------------------------
// HTTP
// --------------------------------------------------

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

async function syncChangedRecordsFromIndex(type, indexItems) {
  for (const item of indexItems) {
    if (!item.slug || !item.file) {
      continue;
    }

    try {
      const localRecord = await readRecordFromDb(type, item.slug);

      if (!isRemoteRecordNewer(item, localRecord)) {
        continue;
      }

      const remoteRecord = await fetchJson(item.file);
      const normalized = normalizeRecord(remoteRecord, type);
      await saveRecordToDb(type, normalized);
    } catch {
      // Keep sync resilient and non-blocking.
    }
  }
}

async function loadContentIndex(type) {
  try {
    const remoteItems = await fetchJson(INDEX_URL);

    if (!Array.isArray(remoteItems)) {
      throw new Error("Index endpoint must return an array.");
    }

    const normalized = remoteItems.map(item => normalizeIndexItem(item, type));
    await saveIndexToDb(type, normalized);

    syncChangedRecordsFromIndex(type, normalized).catch(() => {});

    return normalized;
  } catch (networkError) {
    const offlineItems = await readIndexFromDb(type);

    if (offlineItems.length) {
      return offlineItems;
    }

    throw networkError;
  }
}

async function loadRecordBySlug(type, slug) {
  const indexItems = await loadContentIndex(type);
  const indexItem = indexItems.find(item => item.slug === slug);
  const offlineRecord = await readRecordFromDb(type, slug);

  if (!indexItem) {
    return offlineRecord || null;
  }

  if (offlineRecord && !isRemoteRecordNewer(indexItem, offlineRecord)) {
    return offlineRecord;
  }

  try {
    const remoteRecord = await fetchJson(indexItem.file);
    const normalized = normalizeRecord(
      {
        ...indexItem,
        ...remoteRecord
      },
      type
    );

    await saveRecordToDb(type, normalized);
    return normalized;
  } catch (networkError) {
    if (offlineRecord) {
      return offlineRecord;
    }

    throw networkError;
  }
}

// --------------------------------------------------
// UI helpers
// --------------------------------------------------

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
  return `/article/${encodeURIComponent(slug)}`;
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

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function sortItemsByDate(items, order = "desc") {
  return [...items].sort((a, b) => {
    const dateA = getComparableTimestamp(a.publishedAt || a.updatedAt || a.createdAt);
    const dateB = getComparableTimestamp(b.publishedAt || b.updatedAt || b.createdAt);
    return order === "asc" ? dateA - dateB : dateB - dateA;
  });
}

function getUniqueTags(items) {
  const tags = new Set();

  items.forEach(item => {
    (item.tags || []).forEach(tag => tags.add(tag));
  });

  return [...tags].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
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


function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function getPageSize() {
  const url = new URL(window.location.href);
  const raw = Number(url.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);

  if (!Number.isFinite(raw)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(raw)));
}

// --------------------------------------------------
// Routing
// --------------------------------------------------

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

// --------------------------------------------------
// Views
// --------------------------------------------------

function renderHomeError(error) {
  app.innerHTML = `
    <main class="page-shell narrow-shell">
      <section class="surface empty-state">
        <h1>${escapeHtml(t.unableToLoadArticles)}</h1>
        <p>${escapeHtml(error.message || "Unknown error")}</p>
      </section>
    </main>
  `;
  document.title = `${t.unableToLoadArticles} · ${APP_CONFIG.siteTitle || "Publisher"}`;
}

function renderArticleError(message) {
  app.innerHTML = `
    <main class="page-shell article-shell">
      <section class="surface empty-state">
        <h1>${escapeHtml(t.unableToLoadArticle)}</h1>
        <p>${escapeHtml(message || "Unknown error")}</p>
        <a href="/" data-link class="button-link">${escapeHtml(t.goBackHome)}</a>
      </section>
    </main>
  `;
  document.title = `${t.unableToLoadArticle} · ${APP_CONFIG.siteTitle || "Publisher"}`;
}

async function renderHome() {
  try {
    const items = await loadContentIndex(CONTENT_TYPE);
    const view = cloneTemplate("tpl-home");
    app.replaceChildren(view);

    qs("#heroBadge").textContent = APP_CONFIG.heroBadge       || t.heroBadge;
    qs("#heroTitle").textContent = APP_CONFIG.siteTitle       || t.heroTitle;
    qs("#heroText").textContent  = APP_CONFIG.siteDescription || t.heroText;

    qs("#searchLabel").textContent = t.searchLabel;
    qs("#searchInput").placeholder = t.searchPlaceholder;

    qs("#tagLabel").textContent = t.filterLabel;
    qs("#sortLabel").textContent = t.sortLabel;

    const tagSelect = qs("#tagSelect");
    const sortSelect = qs("#sortSelect");

    qs("#tagOptionAll").textContent = t.allTags;
    qs("#sortNewest").textContent = t.newestFirst;
    qs("#sortOldest").textContent = t.oldestFirst;

    const searchInput = qs("#searchInput");
    const resultsCount = qs("#resultsCount");
    const showingCount = qs("#showingCount");
    const articleList = qs("#articleList");
    const loadMoreButton = qs("#loadMoreButton");

    let visibleCount = getPageSize();
    let currentFiltered = [];

    getUniqueTags(items).forEach(tag => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      tagSelect.appendChild(option);
    });

    function renderCards(itemsToRender) {
      articleList.innerHTML = "";

      if (!itemsToRender.length) {
        articleList.innerHTML = `
          <section class="surface empty-state">
            <h2>${escapeHtml(t.noMatchingArticlesTitle)}</h2>
            <p>${escapeHtml(t.noMatchingArticlesText)}</p>
          </section>
        `;
        loadMoreButton.hidden = true;
        showingCount.textContent = "";
        return;
      }

      const slice = itemsToRender.slice(0, visibleCount);

      slice.forEach(article => {
        const card = cloneTemplate("tpl-card");

        qs(".card-date", card).textContent = formatDate(article.publishedAt || article.updatedAt);
        qs(".card-title", card).textContent = article.title || t.untitled;
        qs(".card-excerpt", card).textContent = article.excerpt || "";

        const link = qs(".card-link", card);
        link.href = articleUrl(article.slug);
        link.setAttribute("data-link", "");
        link.textContent = t.readArticle;

        renderTagList(qs(".tag-list", card), article.tags || []);
        articleList.appendChild(card);
      });

      resultsCount.textContent = t.articleCount(itemsToRender.length);
      showingCount.textContent = t.showingCount(slice.length, itemsToRender.length);
      loadMoreButton.hidden = slice.length >= itemsToRender.length;
      loadMoreButton.textContent = t.loadMore;
    }

    function applyFilters() {
      const query = normalizeText(searchInput.value);
      const selectedTag = normalizeText(tagSelect.value);
      const sortOrder = sortSelect.value;

      let filtered = items.filter(item => {
        const haystack = normalizeText([
          item.title,
          item.excerpt,
          (item.tags || []).join(" "),
          item.publishedAt,
          item.updatedAt
        ].join(" "));

        const matchesQuery = !query || haystack.includes(query);
        const matchesTag =
          !selectedTag ||
          (item.tags || []).some(tag => normalizeText(tag) === selectedTag);

        return matchesQuery && matchesTag;
      });

      filtered = sortItemsByDate(filtered, sortOrder);
      currentFiltered = filtered;
      visibleCount = Math.min(visibleCount, Math.max(getPageSize(), filtered.length || getPageSize()));
      renderCards(filtered);
    }

    function resetAndApplyFilters() {
      visibleCount = getPageSize();
      applyFilters();
    }

    searchInput.addEventListener("input", resetAndApplyFilters);
    tagSelect.addEventListener("change", resetAndApplyFilters);
    sortSelect.addEventListener("change", resetAndApplyFilters);

    loadMoreButton.addEventListener("click", () => {
      visibleCount += getPageSize();
      renderCards(currentFiltered);
    });

    applyFilters();
    document.title = APP_CONFIG.siteTitle || "Publisher";
  } catch (error) {
    renderHomeError(error);
  }
}

async function renderArticlePage(slug) {
  try {
    const article = await loadRecordBySlug(CONTENT_TYPE, slug);

    if (!article) {
      renderNotFound();
      return;
    }

    const view = cloneTemplate("tpl-article");
    app.replaceChildren(view);

    qs("#backToArticles").textContent = t.backToArticles;
    qs("#articleDate").textContent = formatDate(article.publishedAt || article.updatedAt);
    qs("#articleTitle").textContent = article.title || t.untitled;
    qs("#articleExcerpt").textContent = article.excerpt || "";

    renderTagList(qs("#articleTags"), article.tags || []);

    const articleBody = qs("#articleBody");
    articleBody.innerHTML = article.html;

    document.title = `${article.title || t.untitled} · ${APP_CONFIG.siteTitle || "Publisher"}`;
  } catch (error) {
    renderArticleError(error.message);
  }
}

function renderNotFound() {
  const view = cloneTemplate("tpl-not-found");
  app.replaceChildren(view);

  qs("#notFoundTitle").textContent = t.notFoundTitle;
  qs("#notFoundText").textContent = t.notFoundText;
  qs("#notFoundBackHome").textContent = t.goBackHome;

  document.title = `${t.notFoundTitle} · ${APP_CONFIG.siteTitle || "Publisher"}`;
}

// --------------------------------------------------
// App
// --------------------------------------------------

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
