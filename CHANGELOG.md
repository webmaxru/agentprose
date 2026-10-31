# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.6] - 2026-10-31

### Fixed
- Inspector (`?agentprose-inspect`, `data-inspector`): styles now come from a constructed stylesheet (`adoptedStyleSheets`), so a strict Content Security Policy without `'unsafe-inline'` in `style-src` no longer leaves it unstyled (seen on agentprose.cloud, which sends `style-src 'self'`). Browsers without constructable stylesheets get the inline `<style>` as before.

Tooling around the library:

### Changed
- Sanity Studio plugin 0.1.5 (`sanity-plugin/`): depends on `agentprose ^0.1.5`; published to npm by hand on 2026-10-31 (the first version, so the npm trusted publisher could be added).
- Sanity Studio plugin 0.1.6: no functional changes; the first plugin release published from GitHub Actions (`release-sanity-plugin.yml`, trusted publishing + provenance), which also validates the npm trusted-publisher configuration.
- Enonic XP app 0.1.5 (`enonic-app/`): bundles agentprose 0.1.5 (`node enonic-app/sync.mjs 0.1.5`), so Guillotine mode works on Guillotine 8/9.

### Added
- Static Maven repository for the Enonic app at [salnikov.no/agentprose/maven](https://salnikov.no/agentprose/maven/) (`no.salnikov:agentprose`), rebuilt by the docs deploy from every `enonic-v*` release (`enonic-app/scripts/maven-site.mjs`); `release-enonic-app.yml` starts that deploy after attaching the files.
- Release workflows for the CMS integrations: `release-sanity-plugin.yml` (GitHub Release tagged `sanity-plugin-v*` → npm, trusted publishing + provenance, approval in the `npm` environment) and `release-enonic-app.yml` (GitHub Release tagged `enonic-v*` → jar and a static Maven repository attached to the release). `release.yml` now only handles library tags (`v*`).

## [0.1.5] - 2026-10-31

The first version published from GitHub Actions (npm trusted publishing, with a provenance attestation). 0.1.4 was tagged and has a GitHub Release, but it was created before the release workflow was on `main`, so it was never published to npm; 0.1.5 is the first npm release after 0.1.3 and contains everything below.

### Added
- **Sanity Studio plugin** (`sanity-plugin/`, npm `sanity-plugin-agentprose`, not published yet): an **AI agents** tool showing the published posts agents list, search as `search_posts` does, each post as `get_post` markdown, the install snippet for the project, and checks for a private dataset or a missing CORS origin. Studio v5 and v6. Tested with vitest (real GROQ via groq-js) and in a production `sanity build` driven by headless Chromium.
- **Enonic XP app** (`enonic-app/`, `no.salnikov.agentprose`, XP 8, not published yet): adds agentprose to a site from one site setting through a response processor, serves the release and the WebMCP polyfill from the site (lib-asset), publishes `/agentprose.json` as a site index, and has a Guillotine mode. Tested on an XP 8.1.1 sandbox with Guillotine 9 (`enonic-app/test/sandbox-e2e.mjs`).
- Marketplace submission kits for Sanity Exchange and Enonic Market in `docs/marketplaces/`, and docs pages *Install → Sanity* and *Install → Enonic XP*.
- Documentation site at [salnikov.no/agentprose](https://salnikov.no/agentprose/) (Astro + Starlight, `website/`), deployed to GitHub Pages by `.github/workflows/docs.yml`: quick start, every install path, concepts, platform guides, a WordPress plugin section, and an API reference generated from the TypeScript source. The site runs agentprose on its own pages, with an index built by `agentprose build`.

### Fixed
- **Enonic adapter on Guillotine 8 and 9 (XP 8).** 0.1.3 failed on Guillotine 9 (`sort` is now a list of `SortDslInput`). The adapter sends the v8+ query shape (`sort` list, `pageUrl` with `baseUrl`, `scopeKey`/`project`/`branch`), falls back to the Guillotine 7 shape automatically, keeps results inside the site, builds site-relative URLs from the endpoint, and `get` by id no longer returns other content types. `project` and `branch` options (and `data-project`, `data-branch`).
- **Sanity adapter.** Summaries from Portable Text used string slicing that GROQ does not have; `get` and search sent `undefined` parameters, which the API rejects; drafts could be returned. Now: a GROQ-valid 280-character summary, no undefined parameters, `perspective=published`, search over `body` and `content`, and the Next.js starter's fields (`content`, `date`, `coverImage`). A new `client` option takes a Sanity client (anything with `fetch(query, params)`). The GROQ is tested by running it with groq-js.

### Changed
- `package.json` `homepage` points to the documentation site (npm shows it from the next release).
- The repository moved to [github.com/webmaxru/agentprose](https://github.com/webmaxru/agentprose) (the old `vibeprogrammer/agentprose` URL redirects). `package.json` `repository` and `bugs`, the bundle banner, the docs and the agent skill command (`npx skills add webmaxru/agentprose`) name the new home; npm shows it from the next release.

## [0.1.3] - 2026-10-18

### Added
- **Notes for AI agents** (`agentNotes`) and **contact details** (`contact`: `email`, `phone`, `url`, `booking`, `hours`, `address`), written by the site owner. Agents get them from `get_site_info` (`notesForAgents`, `contact`) and from a new read-only tool, **`get_contact_info`**, which is registered when the page sets `contact`, `data-contact`, or uses agentprose Cloud (`data-key`). Sources, highest priority first: page config, agentprose Cloud (`/v1/site`, fetched only when an agent first asks, never on page load; `siteInfo` overrides or disables it), `agentprose.json` (`site.agentNotes`, `site.contact`). Everything is cleaned and capped, and links must be http(s). See docs/configuration.md.
- `agentprose build --site <file.json>` publishes `name`, `description`, `lang`, `logo`, `links`, `agentNotes` and `contact` in `agentprose.json`, and warns about every field it leaves out. With `--out`, the CLI prints the `<link rel="agentprose-index">` tag to add.
- `skills/agentprose/SKILL.md`: an agent skill that teaches coding agents to install agentprose correctly (`npx skills add webmaxru/agentprose`).

### Changed
- The 🔌 inspector passes object input to the browser's `executeTool`, retries once with a JSON string on a `TypeError` (older Chrome builds), and accepts both string and value results.
- Size budget: core + engine raised from 16,640 B to 17,408 B gzipped (+768 B) for owner details and `get_contact_info`. The core stays under 10,240 B.

### Docs
- `<link rel="agentprose-index">` (already supported) is now documented, with a section on owner notes and contact details, a security note on owner-written text, dated browser evidence, and docs/roadmap/2026-10-ideas.md.

### Tests
- A contract test calls every built-in tool with empty and malformed input and asserts it returns a JSON object and never `null`, `undefined` or a throw. Unit tests cover cleaning, precedence and the Cloud fetch; an e2e test shows the Cloud details load only when an agent asks.

## [0.1.2] - 2026-10-18

### Security
- The default MCP-B polyfill tag now carries Subresource Integrity: `integrity="sha384-aEnX8+GGpZs7j3YINfHJw5npl4H6AkfYHQ5KqdgJzScZ5s76I533BzlPrceDInPx"` and `crossorigin="anonymous"` for `@mcp-b/webmcp-polyfill@6.0.3`. If a CDN ever served a different file, the browser refuses it and agentprose settles in mode `none`. A polyfill URL you supply yourself (`data-polyfill="/js/…"`) is used as given, without a hash; the npm API also accepts `polyfill: { src, integrity }`. New export: `POLYFILL_SRI`.
- Tests keep the pin and the hash in step: `@mcp-b/webmcp-polyfill` is now an exact devDependency, a unit test compares the hash with the npm package and with jsDelivr, and an e2e test shows a tampered file being refused.

### Changed
- A copy served by agentprose Cloud (a `/v/<version>/` folder, including the evergreen `/v/0/`) loads the polyfill from the same Cloud (`/v/<exact version>/webmcp-polyfill.js`, same hash) instead of jsDelivr, so the Cloud snippet needs one domain in a CSP.
- A core loaded through a moving channel (`agentprose@0` on jsDelivr, `/v/0/` on the Cloud) loads its engine, adapters, inspector and polyfill from its own exact version, so a cached core never pairs with a newer engine.
- Docs recommend `agentprose@0` (latest 0.x) instead of `agentprose@0.1`, and `https://agentprose.cloud/v/0/` for the Cloud. Pinning an exact version with SRI is documented as the advanced option ([docs/versioning.md](docs/versioning.md)).
- Size budget: core + engine raised from 16,384 B to 16,640 B gzipped (+256 B) for the hash and the version pinning. Core is 9,893 B gzipped (was 9,636 B); the engine is unchanged (6,744 B).

### Added
- Docs: what the polyfill is, when and from where it loads, the pinned version and hash, opting out, self-hosting and a CSP table ([docs/security.md](docs/security.md#the-mcp-b-polyfill)); [docs/versioning.md](docs/versioning.md).
- [RELEASING.md](RELEASING.md) and `scripts/purge-jsdelivr.mjs` (purges `@0` and `@0.1` for every file in `dist/`).

## [0.1.1] - 2026-10-18

### Changed
- The MCP-B WebMCP polyfill is on by default in the script-tag build. After the page's `load` event, if the page still has no WebMCP (no native `document.modelContext`, no `@mcp-b/global`, no legacy `navigator.modelContext`), agentprose loads `@mcp-b/webmcp-polyfill@6.0.3` from jsDelivr (was unpkg) and registers into it. `data-polyfill="off"` (or `false`) opts out; a URL self-hosts it; the 0.1.0 flag form still works. The npm `createAgentTools()` default is unchanged (off). A blocked or slow polyfill (CSP, offline, 10 s) settles as mode `none` without errors.
- Core bundle unchanged in size (9,636 B gzipped, was 9,637 B): the four script loaders are merged into one shared `addScript` helper.

### Added
- Tutorial: [your blog inside Claude Desktop/Cursor with agentprose + MCP-B](docs/tutorials/mcp-b-claude-desktop.md), and [examples/mcp-b-desktop](examples/mcp-b-desktop/) with an end-to-end check (official MCP SDK client → `@mcp-b/webmcp-local-relay` → headless Chromium page).
- WordPress plugin (`wordpress-plugin/`), prepared for WordPress.org: bundles the MCP-B polyfill locally (no CDN), opt-in agentprose Cloud disclosed under "External services", Plugin Check and PHPCS clean, plus WP adapter fixes for custom post types. It lives in this repository and is released separately as a WordPress plugin zip; it is not part of the npm package.
- Tests: 7 unit tests for polyfill loading; e2e for the default polyfill, opt-out, a blocked polyfill and a page that already has WebMCP.

### Fixed
- WordPress adapter: titles, excerpts, term and site names are decoded to plain text (WordPress renders `&#8217;`, `[&hellip;]`); several post types are merged into one date-ordered page of at most `limit`.

## [0.1.0] - 2026-10-18

### Changed
- Renamed from `readmcp` to `agentprose` before the first release: package, CLI, `window.AgentProse` global, `agentprose:*` events, `data-agentprose-*` attributes, `agentprose.json` index and the WordPress plugin slug. No `readmcp` package was ever published.

### Added
- agentprose Cloud hooks: `data-cloud` with `data-key` turns on hosted analytics (`/v1/collect`) and hosted search (`/v1/search`) in one attribute. `data-cloud` is optional when the script is served by the Cloud itself (its origin is used); it stays required on jsDelivr and unpkg, with a console warning when missing.
- Analytics beacon v2: `{v, key, tool, ok, ms, page, query?, n?, found?, post?, err?, sid}` (result count, citation verdict, post URL argument, short error code, random per-page-load id). Never sends post content or the quote text.
- `search_posts` with `searchEndpoint` falls back to the site's own search when the endpoint throws (network, CORS) or answers non-OK (e.g. 429 over quota).
- One-line script install (`agentprose.min.js`, 9.4 KB gzipped). Zero-config discovery from JSON-LD, OpenGraph, `<article>`, the prebuilt `agentprose.json`, RSS/Atom/JSON Feed, sitemap.xml (and indexes), llms.txt and Pagefind.
- Tools: `get_current_article`, `search_posts`, `list_posts`, `get_post`, `get_table_of_contents`, `get_section`, `get_related_posts`, `list_taxonomies`, `get_citation` (quote verification + text-fragment links), `get_site_info`; opt-in `get_subscribe_link`, `get_comments_link`, `navigate_to`.
- WebMCP registration on `document.modelContext` with `AbortSignal` and `exposedTo`; legacy `navigator.modelContext` fallback; opt-in MCP-B polyfill (`data-polyfill`).
- Lazily loaded site-wide engine (6.6 KB gzipped): BM25F search with prefix matching and accent folding, related posts, session cache.
- Adapters: WordPress (auto-detected), Ghost, Sanity, Contentful, Enonic XP (Guillotine), Strapi 5/4, Storyblok, generic/static. Proxy mode, and refusal of management credentials.
- `agentprose build` (static index with sharded Markdown and llms.txt) and `agentprose inspect` (agent-readiness report) CLI.
- 🔌 Inspector panel (`?agentprose-inspect`, `data-inspector`).
- WordPress plugin with a settings page.
- Analytics hooks: `onToolCall`, the `agentprose:call` event, `data-analytics` beacons.
- 87 unit tests, 12 end-to-end tests in headless Chromium against fixture sites (native WebMCP and the polyfill).
