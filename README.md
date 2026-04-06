# 📰 fabu

**fabu** (发布) — from the Mandarin 发布 *fābù*, meaning "to publish". Simplified publication PWA with offline sync and local-first rendering.

## 🧱 Stack

- **Runtime**: Node.js 24 + Express
- **Frontend**: Vanilla JS (ES modules, no build step)
- **Storage**: JSON files on disk (no database)
- **Offline**: Service Worker + IndexedDB
- **Container**: Docker (Alpine)

## 🗂 Architecture

```
fabu/
├── server.js          # Express server — static files, content API, config injection
├── main.js            # Frontend SPA — routing, IndexedDB sync, rendering
├── styles.js          # CSS injected at runtime via JS
├── service-worker.js  # Offline cache strategy (network-first with timeout fallback)
├── index.html         # Shell — templates, script tags
├── manifest.json      # PWA manifest (static fallback)
├── data/
│   ├── article.index.json              # Article index array
│   ├── *.article.json                  # Individual article records
│   └── template.article.json          # Article schema reference
└── dockerfile
```

## 📄 Content model

An article record (`*.article.json`) has the following fields:

```json
{
  "slug": "article-slug",
  "title": "Article Title",
  "publishedAt": "2026-04-05T10:00:00Z",
  "createdAt": "2026-04-05T10:00:00Z",
  "updatedAt": "2026-04-05T10:00:00Z",
  "tags": ["tag-one", "tag-two"],
  "excerpt": "Short summary used in the article listing.",
  "html": "<article><p>Published HTML content.</p></article>"
}
```

The index file (`article.index.json`) is an array of lightweight index entries (no `html` field) used for listing and filtering.

## ⚙️ Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `ADMIN_PASSWORD` | *(none)* | 🔐 Required for all write operations |
| `DATA_DIR` | `./data` | Path to JSON data directory |
| `APP_NAME` | `fabu` | Used as service worker cache prefix |
| `CACHE_VERSION` | `v2` | Appended to cache name to force SW refresh |
| `SITE_TITLE` | `Publisher` | Displayed as page title and hero title |
| `SITE_DESCRIPTION` | *(default string)* | Displayed as hero text |
| `SITE_HERO_BADGE` | *(empty)* | Small badge above hero title — falls back to i18n |
| `SITE_LANGUAGE` | `en` | UI language — see supported values below |
| `DEFAULT_CONTENT_TYPE` | `article` | Content type (only `article` is supported) |
| `FAVICON_BASE64` | *(empty)* | Base64-encoded favicon (with or without data URI prefix) |
| `ICON_192_BASE64` | *(empty)* | Base64-encoded 192×192 PNG icon |
| `ICON_512_BASE64` | *(empty)* | Base64-encoded 512×512 PNG icon |

### 🌍 Supported languages

`en` `fr` `mg` `zh-CN` `ru` `ja` `es`

UI labels (search, filter, sort) are translated. Hero content (title, text, badge) uses `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_HERO_BADGE` with i18n as fallback.

## 🔌 API

All write endpoints require the header:

```
x-admin-password: <ADMIN_PASSWORD>
```

### 🌐 Public endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/article.index.json` | Returns the full article index array |
| `GET` | `/:slug.article.json` | Returns a single article record |

### 🔐 Protected endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/article/items` | List index entries (add `?withContent=true` for full records) |
| `POST` | `/api/article/items` | ✅ Create a new article |
| `PUT` | `/api/article/items` | ✏️ Update an existing article (`targetSlug` required in body) |
| `DELETE` | `/api/article/items?slug=` | 🗑️ Delete an article by slug |

### POST body example

```json
{
  "slug": "my-article",
  "title": "My Article",
  "excerpt": "Short summary.",
  "publishedAt": "2026-04-06T10:00:00Z",
  "tags": ["tag-one"],
  "html": "<article><p>Content.</p></article>"
}
```

### PUT body example

```json
{
  "targetSlug": "my-article",
  "title": "Updated Title",
  "excerpt": "Updated summary.",
  "publishedAt": "2026-04-06T10:00:00Z",
  "tags": ["tag-one"],
  "html": "<article><p>Updated content.</p></article>"
}
```

## 📶 Offline strategy

The service worker uses **network-first with adaptive timeouts**:

- 🆕 **First visit** (no cache): 30s timeout, error on failure.
- 🔄 **Returning visitor** (cache exists): 5s timeout, fallback to cache on failure.
- Cache is updated atomically — partial updates are discarded.
- IndexedDB stores the article index and individual records locally for offline browsing.

## 🐳 Docker

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose example

```yaml
version: '2.4'
services:
  fabu-node:
    image: mino189/fabu:latest
    restart: unless-stopped
    networks:
      - web
    volumes:
      - ./fabu-data:/data
    environment:
      PORT: 3000
      ADMIN_PASSWORD: "your-password"
      DATA_DIR: /data
      APP_NAME: fabu
      CACHE_VERSION: "v2"
      SITE_TITLE: "My Publication"
      SITE_DESCRIPTION: "My site description."
      SITE_HERO_BADGE: "My Badge"
      SITE_LANGUAGE: "fr"
      DEFAULT_CONTENT_TYPE: article
    labels:
      - "traefik.enable=true"
      - "traefik.frontend.rule=Host:mysite.example.com"
      - "traefik.docker.network=web"
      - "traefik.http.services.fabu-node.loadbalancer.server.port=3000"

networks:
  web:
    external: true
```

## 🌱 Data seeding

On first start, if `DATA_DIR` contains an empty index, the server copies the bundled sample articles from `./data` into `DATA_DIR`. If the index file already exists (even empty), seeding is skipped.

To force a reseed, remove the contents of `DATA_DIR` and restart the container.

## 🔤 Slug rules

Slugs are normalized on write: lowercased, non-alphanumeric characters replaced with `-`, leading and trailing dashes removed. A slug must be unique within the index.

## 📜 License

MIT — Copyright (c) 2026 Mino Randriamanivo
