const css = `
:root {
  --bg: #f7f8fb;
  --bg-2: #eef2f7;
  --surface: rgba(255, 255, 255, 0.92);
  --surface-2: rgba(255, 255, 255, 0.98);
  --line: rgba(15, 23, 42, 0.1);
  --text: #111827;
  --muted: #5b6472;
  --accent: #2563eb;
  --accent-2: #1d4ed8;
  --shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  --radius: 20px;
  --radius-sm: 14px;
  --max-width: 1120px;
  --font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  font-size: 16px;
}

body {
  margin: 0;
  min-width: 320px;
  color: var(--text);
  font-family: var(--font);
  line-height: 1.6;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 28%),
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent 24%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

input,
select {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.9rem 1rem;
  background: #ffffff;
  color: var(--text);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

input::placeholder {
  color: #8a93a3;
}

input:focus,
select:focus {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.page-shell {
  width: min(var(--max-width), calc(100% - 1rem));
  margin: 0 auto;
  padding: 1rem 0 4rem;
}

.narrow-shell {
  max-width: 760px;
}

.hero {
  padding: 1rem 0 1.25rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.14);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-title {
  margin: 0.8rem 0 0.45rem;
  font-size: clamp(2.2rem, 10vw, 4.5rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.hero-text {
  margin: 0;
  max-width: 46rem;
  color: var(--muted);
  font-size: 1rem;
}

.surface {
  background: var(--surface);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
  padding: 0.9rem;
}

.field label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
}

.results-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 0 1rem;
  color: var(--muted);
  font-size: 0.95rem;
}

.showing-count {
  font-size: 0.9rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1rem;
  min-height: 220px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-date,
.article-date {
  color: var(--muted);
  font-size: 0.92rem;
}

.card-title {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.card-excerpt,
.article-excerpt {
  margin: 0;
  color: var(--muted);
}

.card-footer {
  margin-top: auto;
  padding-top: 0.25rem;
}

.button-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.05));
  color: #0f172a;
  font-weight: 650;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.button-link:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.32);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.07));
}

.button-secondary {
  width: 100%;
  background: #ffffff;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding-top: 1.2rem;
}

.load-more-row .button-link {
  min-width: 180px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: rgba(37, 99, 235, 0.06);
  color: var(--accent);
  font-size: 0.8rem;
  white-space: nowrap;
}

.article-shell {
  max-width: 860px;
}

.top-nav {
  padding: 0.3rem 0 1rem;
}

.back-link {
  color: var(--muted);
  font-weight: 650;
}

.article-header {
  padding: 1.1rem;
  margin-bottom: 1rem;
}

.article-title {
  margin: 0.35rem 0 0.7rem;
  font-size: clamp(2rem, 8vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.article-body {
  padding: 1.1rem;
  overflow-wrap: anywhere;
  background: var(--surface-2);
}

.article-body h1,
.article-body h2,
.article-body h3,
.article-body h4 {
  margin-top: 1.5em;
  margin-bottom: 0.55em;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.article-body p,
.article-body li,
.article-body blockquote {
  color: var(--text);
}

.article-body p:first-child {
  margin-top: 0;
}

.article-body img,
.article-body video,
.article-body audio,
.article-body iframe,
.article-body table {
  max-width: 100%;
}

.article-body pre,
.article-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.article-body pre {
  overflow: auto;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #f3f6fb;
}

.article-body blockquote {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-left: 3px solid var(--accent);
  border-radius: 0 14px 14px 0;
  background: rgba(37, 99, 235, 0.06);
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
}

@media (min-width: 700px) {
  .page-shell {
    width: min(var(--max-width), calc(100% - 2rem));
    padding-top: 1.4rem;
  }

  .toolbar {
    grid-template-columns: 1.8fr 1fr 1fr;
    padding: 1rem;
  }

  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-meta {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .article-header,
  .article-body {
    padding: 1.35rem;
  }

  .button-secondary {
    width: auto;
  }
}

@media (min-width: 1040px) {
  .cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);
