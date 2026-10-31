# sanity-plugin-agentprose

A Sanity Studio tool for [agentprose](https://salnikov.no/agentprose/): see exactly what AI agents read from your dataset through WebMCP, and get the one-line install for your website with your project already filled in.

agentprose gives AI agents in your visitors' browsers read-only tools for your content (`search_posts`, `list_posts`, `get_post`, sections, citations) through [WebMCP](https://salnikov.no/agentprose/webmcp/). On a Sanity-backed site, the tools query your dataset's API CDN with GROQ. This plugin adds an **AI agents** tool to the Studio that runs those same queries:

- **What agents read**: the published posts agents list, newest first, with the URLs they will cite; search the way `search_posts` does; open a post to see the markdown `get_post` returns.
- **Put it on your website**: the script tag and the npm setup for this project and dataset, ready to copy.
- **Setup checks**: warns when the dataset is private (browsers cannot read it) or your site's origin is missing from the project's CORS origins.

The preview uses the published perspective, so drafts never show, just as on the website.

![The AI agents tool in Sanity Studio](https://raw.githubusercontent.com/webmaxru/agentprose/main/docs/marketplaces/sanity/assets/screenshot-1.png)

## Install

```sh
npm install sanity-plugin-agentprose
```

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {agentprose} from 'sanity-plugin-agentprose'

export default defineConfig({
  // ...
  plugins: [agentprose({urlPattern: 'https://example.com/blog/{slug}/'})],
})
```

Works with Sanity Studio v5 and v6 (React 19).

## Options

| Option | Default | |
|---|---|---|
| `urlPattern` | `/posts/{slug}/` | Where posts live on your website. Used for the post URLs agents get, the install snippet and the CORS check. |
| `type` | `post` | Document type of posts. |
| `projection` | fits Sanity's blog template and the Next.js starter | A GROQ projection, only if your schema uses other field names. |
| `apiVersion` | `2025-02-19` | API version the website script uses. |
| `title` | `AI agents` | Tool title in the Studio navbar. |

## On your website

The tool shows this, filled in for your project:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="sanity" data-project="abc123" data-dataset="production"
        data-url-pattern="https://example.com/blog/{slug}/"></script>
```

The dataset must be public, or use [proxy mode](https://salnikov.no/agentprose/guides/proxy/) for private datasets. Add your site's origin to the project's CORS origins (manage.sanity.io → API → CORS origins), without credentials. Full guide: [salnikov.no/agentprose/install/sanity](https://salnikov.no/agentprose/install/sanity/).

## Develop

```sh
npm install
npm test               # unit + component tests (real GROQ via groq-js)
npm run build          # plugin-kit verify-package + pkg-utils
npm run test:studio    # builds test/studio (a real Studio) and drives the tool in headless Chromium
npm run link-watch     # try it in your own Studio (yalc)
```

`AGENTPROSE_SRC=1 npm test` runs the tests against this repository's adapter source instead of the npm release.

## License

MIT © Maxim Salnikov and agentprose contributors. Issues: https://github.com/webmaxru/agentprose/issues
