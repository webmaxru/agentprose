# agentprose for Enonic XP

An Enonic XP application that makes a site readable by AI agents through [WebMCP](https://salnikov.no/agentprose/webmcp/). Add the app to a site and every page gets agentprose's read-only tools: `get_current_article`, `search_posts`, `list_posts`, `get_post`, sections, citations and more. Agents running in the visitor's browser call them instead of scraping the page.

- **One site setting.** Install the app, add it to the site in Content Studio, done. A response processor adds one deferred `<script>` to every page.
- **Nothing from a CDN.** The app serves a fixed agentprose release and the pinned MCP-B WebMCP polyfill from the site itself (lib-asset, fingerprinted, immutable cache).
- **Whole-site tools on any site.** The app publishes `<site>/agentprose.json`, an index of the site's published pages, so agents can list and search everything, even without a sitemap or feed.
- **Headless too.** Switch the source to Guillotine and agents read content straight from the Guillotine GraphQL API.
- **Private by default.** No cookies, no tracking. Nothing is sent anywhere unless you enter an [agentprose Cloud](https://agentprose.cloud) site key.
- **Stays out of the editor.** Nothing is injected in Content Studio's edit and inline modes.

Requires Enonic XP 8.0 or later. Guillotine mode needs [Guillotine](https://market.enonic.com/vendors/enonic/guillotine) 8+ mounted on the site, and an app built with agentprose 0.1.4 or later (see Versions).

## Install

1. In XP, open **Applications → Install**, search for **agentprose** (Enonic Market) and install it. Or drop the jar into `$XP_HOME/deploy/`.
2. In Content Studio, edit the site, add **agentprose** under **Applications**, open its settings (pencil icon) and save.
3. Publish the site. Open any page: the tools are live. Add `?agentprose-inspect` to a URL to see them in the inspector.

## Settings

| Setting | What it does |
|---|---|
| Where agents read the content from | **Rendered pages** (default, any site): agentprose reads the page and the app's `/agentprose.json` site index. **Guillotine**: agentprose reads published content through the Guillotine GraphQL API. |
| Guillotine: content type of articles | e.g. `com.example.myapp:article`. Required in Guillotine mode. |
| Guillotine: GraphQL endpoint | Empty = this site's own `/_/com.enonic.app.guillotine:graphql`. Mount it in your site app's `cms/site.yaml` (`apis: ["com.enonic.app.guillotine:graphql"]`). |
| Guillotine: article URL pattern | Only when Guillotine cannot return page URLs, e.g. `/blog/{slug}/`. |
| CSS selector of the article body | Rendered pages: where the article text is. Default: `main`, `article` or the largest text block. |
| Content types to list | Which content `/agentprose.json` lists. Default: page-like content in the site (no folders, media, fragments or templates). |
| Do not publish /agentprose.json | Turns the site index off. |
| Tool name prefix, navigate tool, subscribe/about/contact links | Same as the script tag's `data-prefix`, `data-navigate`, `data-subscribe`, `data-about`, `data-contact`. |
| agentprose Cloud site key | A `pk_` key turns on usage analytics and hosted search (agentprose.cloud). Your Cloud site's allowed domains must include the site's host. |
| Keep search local | With a Cloud key: analytics only, no hosted search. |
| Do not load the bundled polyfill | Browsers without native WebMCP then get no `document.modelContext` (tools stay callable through `window.AgentProse`). |
| Inspector in preview | Shows the 🔌 inspector in Content Studio preview. |
| Debug | Logs to the browser console. |

## What it adds to a page

```html
<script src="/_/no.salnikov.agentprose:asset/<fingerprint>/agentprose/agentprose.min.js" defer
        data-base="https://example.com/" data-index="https://example.com/agentprose.json"
        data-polyfill="/_/no.salnikov.agentprose:asset/<fingerprint>/agentprose/vendor/webmcp-polyfill.iife.js"></script>
```

In Guillotine mode: `data-adapter="enonic" data-endpoint="…/_/com.enonic.app.guillotine:graphql" data-content-type="…" data-site-key="/my-site"`. Every value is HTML-escaped.

## Privacy

The script runs in the visitor's browser and reads only this site: its pages, `/agentprose.json`, or its Guillotine endpoint. It sets no cookies and stores nothing beyond a short sessionStorage cache of the site index. With a Cloud key, each tool call an agent makes sends the tool name, the page URL and timing to agentprose Cloud (see [privacy](https://salnikov.no/agentprose/concepts/privacy/)).

## Build and test

```sh
node enonic-app/sync.mjs            # bundle the agentprose release in package.json (from npm, integrity-checked)
node enonic-app/sync.mjs --check    # versions agree, files present (CI)
cd enonic-app && ./gradlew build    # → build/libs/agentprose.jar (JDK 25; the XP SDK's bundled JDK works)
node --test enonic-app/test/*.test.mjs
```

End-to-end on a real XP 8 sandbox (headless Chromium): see the header of [`test/sandbox-e2e.mjs`](test/sandbox-e2e.mjs). The fixture app in `test/fixture/` seeds two sites (rendered pages and Guillotine); it is never published.

## Versions

The app version follows the agentprose release it bundles: `node enonic-app/sync.mjs 0.1.4` copies that release from npm and sets `version` in `gradle.properties`. agentprose 0.1.3's Enonic adapter predates Guillotine 8/9 (XP 8), so Guillotine mode needs 0.1.4 or later; rendered-pages mode works with 0.1.3.

## License

MIT, see [LICENSE.txt](LICENSE.txt). Third-party notices: [NOTICE.txt](NOTICE.txt).

Maintainer: Maxim Salnikov (salnikov@gmail.com). Issues: https://github.com/webmaxru/agentprose/issues
