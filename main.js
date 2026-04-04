const app = document.getElementById("app");

const INDEX_FILE = "./articles.json";

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl ? tpl.content.cloneNode(true) : document.createDocumentFragment();
}

function normalize(value) {
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
    const dateA = new Date(a.publishedAt || a.date || 0).getTime();
    const dateB = new Date(b.publishedAt || b.date || 0).getTime();

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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Request failed: " + response.status + " " + url);
  }

  return response.json();
}

async function fetchArticlesIndex() {
  const data = await fetchJson(INDEX_FILE);

  if (!Array.isArray(data)) {
    throw new Error("articles.json must contain an array.");
  }

  return data.map(item => ({
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt || "",
    publishedAt: item.publishedAt || item.date || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    file: item.file || ""
  }));
}

async function fetchArticleBySlug(slug) {
  const index = await fetchArticlesIndex();
  const match = index.find(item => item.slug === slug);

  if (!match || !match.file) {
    return null;
  }

  const article = await fetchJson(match.file);

  return {
    slug: article.slug || match.slug,
    title: article.title || match.title,
    excerpt: article.excerpt || match.excerpt || "",
    publishedAt: article.publishedAt || article.date || match.publishedAt || "",
    tags: Array.isArray(article.tags) ? article.tags : match.tags || [],
    html: article.html || ""
  };
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

function renderHomeError(error) {
  app.innerHTML = `
    <main class="page-shell narrow-shell">
      <section class="surface empty-state">
        <h1>Unable to load articles</h1>
        <p>${error.message}</p>
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
        <p>${message}</p>
        <a href="/" data-link class="button-link">Go back home</a>
      </section>
    </main>
  `;
  document.title = "Error · Publisher";
}

async function renderHome() {
  try {
    const articles = await fetchArticlesIndex();
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
      const query = normalize(searchInput.value);
      const selectedTag = normalize(tagSelect.value);
      const sortOrder = sortSelect.value;

      let filtered = articles.filter(article => {
        const haystack = normalize([
          article.title,
          article.excerpt,
          (article.tags || []).join(" "),
          article.publishedAt
        ].join(" "));

        const matchesQuery = !query || haystack.includes(query);
        const matchesTag =
          !selectedTag ||
          (article.tags || []).some(tag => normalize(tag) === selectedTag);

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
    const article = await fetchArticleBySlug(slug);

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
