# Sanity Exchange listing: agentprose

Copy for the listing form. Character counts are given where Exchange listings visibly keep text short; the exact field limits are not published (unverified).

## Title
agentprose

## Listing type
Plugin (Studio v5 and v6)

## npm package
sanity-plugin-agentprose

## Short description (one line, 120 chars)
See what AI agents read from your dataset, and make your Sanity-powered site agent-readable through WebMCP in one line.

## Long description

AI agents now browse the web for people: in Chrome, in MCP-B, in agentic browsers. agentprose gives them read-only WebMCP tools for your content (`search_posts`, `list_posts`, `get_post`, sections and citations), so they answer from your published posts instead of scraping your pages.

This plugin adds an **AI agents** tool to Sanity Studio:

- **What agents read.** The published posts agents will list, newest first, with the URLs they will cite. Search the way agents do, and open a post to see the exact markdown they get. Drafts never show.
- **Put it on your website.** The script tag (or npm setup) for this project and dataset, ready to copy into your site's layout.
- **Setup checks.** Warns when the dataset is private or your website's origin is missing from the project's CORS origins.

On your website, agentprose reads published content from the API CDN with GROQ. No tokens in the page, no cookies, no tracking, nothing sent anywhere unless you opt in to agentprose Cloud analytics. MIT licensed.

## Install

```sh
npm install sanity-plugin-agentprose
```

```ts
import {agentprose} from 'sanity-plugin-agentprose'

export default defineConfig({
  plugins: [agentprose({urlPattern: 'https://example.com/blog/{slug}/'})],
})
```

## Categories / tags (pick from Exchange's list at submission time)
AI, Developer tools, SEO, Content discovery. Keywords: WebMCP, AI agents, MCP, GROQ, blog.

## Links
- Repository: https://github.com/webmaxru/agentprose/tree/main/sanity-plugin
- npm: https://www.npmjs.com/package/sanity-plugin-agentprose
- Docs: https://salnikov.no/agentprose/install/sanity/
- Issues / support: https://github.com/webmaxru/agentprose/issues
- Author: Maxim Salnikov, salnikov@gmail.com

## Images (assets/)
- `screenshot-1.png` 1600x900: the AI agents tool with the post list and a post opened as markdown
- `screenshot-2.png` 1600x900: search results, the install snippet and the CORS check
- `banner-1544x500.png`, `banner-772x250.png`: cover image
- `icon.svg`, `icon-256x256.png`: logo

The screenshots come from a production `sanity build` of `sanity-plugin/test/studio` driven by `test/studio-e2e.mjs` (demo content, the Sanity API answered locally), so they show the real plugin UI.

## License
MIT (`sanity-plugin/LICENSE`); dependencies agentprose (MIT), @sanity/ui and @sanity/icons (MIT).
