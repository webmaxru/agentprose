---
title: "Sanity"
description: "agentprose on a Sanity-powered site: the script tag that reads your dataset with GROQ, and the Studio plugin that shows what agents read."
---

On a site whose posts live in Sanity, agentprose's tools read published content straight from your dataset's API CDN with GROQ. No token goes in the page.

## On your website

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="sanity" data-project="abc123" data-dataset="production"
        data-url-pattern="https://example.com/blog/{slug}/"></script>
```

1. The dataset must be **public**. For a private dataset, use [proxy mode](../../guides/proxy/).
2. Add your site's origin (for example `https://example.com`) to the project's **CORS origins** in manage.sanity.io → API, without credentials.
3. `data-type` (default `post`) names the document type of posts; `data-url-pattern` turns a slug into the post's URL on your site.

The default projection fits Sanity's blog template and the Next.js starter: `title`, `slug`, `excerpt`, `body` or `content` (Portable Text), `publishedAt` or `date`, `author->name`, `categories[]->title`, `mainImage` or `coverImage`. Other schemas set `projection` through the [npm package](../npm/). Search uses GROQ `match` with `score()`. Only published documents are read (`perspective=published`).

## Studio plugin

`sanity-plugin-agentprose` adds an **AI agents** tool to Sanity Studio (v5 and v6): the posts agents will list, search the way `search_posts` does, each post as the markdown `get_post` returns, the install snippet for this project, and warnings for a private dataset or a missing CORS origin.

```sh
npm install sanity-plugin-agentprose
```

```ts
// sanity.config.ts
import {agentprose} from 'sanity-plugin-agentprose'

export default defineConfig({
  // ...
  plugins: [agentprose({urlPattern: 'https://example.com/blog/{slug}/'})],
})
```

Options: `urlPattern`, `type`, `projection`, `apiVersion`, `title`. Source and tests: [sanity-plugin/](https://github.com/webmaxru/agentprose/tree/main/sanity-plugin).
