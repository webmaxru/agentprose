# Enonic Market listing: agentprose

Field-by-field, in the order of market.enonic.com/submit.

## Type
Application

## Project name (Maven artifactId)
agentprose

## Display name
agentprose

## Short description
Make your site readable by AI agents through WebMCP: read-only tools for articles, search and citations, in one site setting.

## Long description

AI agents now browse the web for people: in Chrome, in MCP-B, in agentic browsers. agentprose gives them read-only WebMCP tools for your site (`get_current_article`, `search_posts`, `list_posts`, `get_post`, sections and citations), so they answer from your content instead of scraping your pages.

Add the app to a site and you are done:

- **One site setting.** A response processor adds one deferred script to every page. Nothing is injected in Content Studio's edit mode.
- **Nothing from a CDN.** The app serves a fixed agentprose release and the pinned WebMCP polyfill from your own site, fingerprinted and cached.
- **Whole-site tools on any site.** The app publishes `/agentprose.json`, an index of the site's published content, so agents can list and search everything.
- **Headless too.** Switch the source to Guillotine and agents read published content straight from the Guillotine GraphQL API.
- **Private by default.** No cookies, no tracking, nothing sent anywhere unless you add an agentprose Cloud key for analytics.

Settings: content source (rendered pages or Guillotine), content types, article selector, tool prefix, subscribe/about/contact links, Cloud key, polyfill switch, and a 🔌 tool inspector in preview.

Open source (MIT): https://github.com/webmaxru/agentprose

## Icon
`assets/icon.svg` (same file as `enonic-app/src/main/resources/application.svg`)

## Screenshots (16:9, 1600x900) with captions
1. `assets/screenshot-1.png`: "Site settings in Content Studio: pick where agents read from, which content they list and how tools are named."
2. `assets/screenshot-2.png`: "A published page with the agentprose tool inspector (?agentprose-inspect): the read-only WebMCP tools agents get."

## Documentation URL
https://salnikov.no/agentprose/install/enonic/  (source README: https://github.com/webmaxru/agentprose/tree/main/enonic-app)

## Source code URL
https://github.com/webmaxru/agentprose/tree/main/enonic-app

## Maven coordinates (once published, see SUBMISSION.md)
- Repository URL: depends on the hosting chosen (static repo, JitPack or Maven Central)
- groupId: `no.salnikov` (JitPack: `com.github.webmaxru`)
- artifactId: `agentprose`

## Version entry
- Version: 0.1.4
- Minimum XP version: 8.0.0
- Changelog: "First Market release. Bundles agentprose 0.1.4 and the WebMCP polyfill 6.0.3; rendered-pages mode with a site index (/agentprose.json) and Guillotine 8/9 mode."

## License files
`enonic-app/LICENSE.txt` (MIT) and `enonic-app/NOTICE.txt` (agentprose MIT, WebMCP polyfill MIT, lib-asset and lib-portal Apache-2.0).

## Author / vendor (first submission)
Maxim Salnikov, salnikov@gmail.com, https://salnikov.no, GitHub webmaxru
