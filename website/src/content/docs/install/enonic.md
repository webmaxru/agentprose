---
title: "Enonic XP"
description: "The agentprose app for Enonic XP 8: one site setting, assets served from your own site, a site index, and a Guillotine mode for headless sites."
---

The agentprose app makes an Enonic XP site readable by AI agents with one site setting. Requires XP 8.0 or later.

## Install the app

1. Install **agentprose** from Enonic Market (XP admin → Applications → Install), or drop the jar into `$XP_HOME/deploy/`.
2. In Content Studio, edit your site, add **agentprose** under **Applications**, open its settings (pencil icon) and save.
3. Publish. Every page now loads one deferred script from the app itself, and the read-only tools are live. Add `?agentprose-inspect` to a page URL to see them.

What the app does:

- Serves a fixed agentprose release and the pinned [WebMCP polyfill](../../concepts/polyfill/) from your site (lib-asset, fingerprinted URLs). No CDN.
- Publishes `<site>/agentprose.json`, an [index](../../guides/large-archives/) of the site's published content, so `list_posts` and `search_posts` cover the whole site.
- Injects nothing in Content Studio's edit and inline modes; the 🔌 inspector can be switched on for preview.

## Settings

- **Where agents read the content from**: *Rendered pages* (default, any site) or *Guillotine* (headless).
- **Guillotine**: the content type of articles (for example `com.example.myapp:article`), and optionally the endpoint and a URL pattern. By default the app uses the site's own `/_/com.enonic.app.guillotine:graphql`; mount it in your site app's `cms/site.yaml` with `apis: ["com.enonic.app.guillotine:graphql"]`.
- **Content types to list** and **CSS selector of the article body** for rendered pages.
- **Tool name prefix**, the **navigate** tool, **subscribe / about / contact** links.
- **agentprose Cloud site key** (optional analytics and hosted search) and **Keep search local**.
- **Do not load the bundled polyfill**, **Inspector in preview**, **Debug**.

## Without the app

The script tag works on XP too, reading Guillotine mounted on the site (`<site URL>/_/com.enonic.app.guillotine:graphql`; here the site is served at the domain root):

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="enonic" data-endpoint="https://example.com/_/com.enonic.app.guillotine:graphql"
        data-content-type="com.example.myapp:article" data-site-key="/mysite"></script>
```

Guillotine 8 and 9 (XP 8) need agentprose 0.1.4 or later; older releases speak the Guillotine 7 schema.

## Maven repository

Every release of the app is in a public Maven repository (no login), which is where Enonic Market downloads it from:

- Repository URL: `https://salnikov.no/agentprose/maven`
- groupId `no.salnikov`, artifactId `agentprose`, app key `no.salnikov.agentprose`
- The jars are also attached to the [GitHub Releases](https://github.com/webmaxru/agentprose/releases) tagged `enonic-v*`.

Source, build and tests: [enonic-app/](https://github.com/webmaxru/agentprose/tree/main/enonic-app).
