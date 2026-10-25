# Submitting sanity-plugin-agentprose to Sanity Exchange

Steps marked **[Maxim]** need Maxim's own accounts. Nothing has been published or submitted.

## What Sanity asks for (research, 2026-10-25)

| Requirement | Source | Status here |
|---|---|---|
| Plugins are npm packages named `sanity-plugin-*`, built with `@sanity/plugin-kit` (verify-package on `prepublishOnly`) | [Developing plugins](https://www.sanity.io/docs/studio/developing-plugins) | done: scaffolded with plugin-kit 10.1.0, `npm run build` passes `plugin-kit verify-package --silent` and `pkg-utils build --strict` |
| Peer dependency on `sanity` (Studio v5/v6), React 19 | [Developing plugins](https://www.sanity.io/docs/studio/developing-plugins); current plugins on npm | done: `sanity ^5 \|\| ^6.0.0-0`, `react ^19.2`, `styled-components ^6.1` |
| A README with install and usage, a LICENSE | plugin-kit `verify-package` | done |
| Listings on [sanity.io/exchange](https://www.sanity.io/exchange) / [sanity.io/plugins](https://www.sanity.io/plugins) are submitted with a Sanity account through Sanity's community studio | sanity.io/exchange ("Submit" links to community.sanity.tools) | **unverified**: the form behind the login was not visible without an account; field names below are what public listings show |
| Listing shows: title, description, npm package, Studio version, categories, images, author, repo link | public listing pages, e.g. sanity.io/plugins/bubblav | copy in [listing.md](listing.md) |
| Name free on npm | `npm view sanity-plugin-agentprose` → 404 on 2026-10-25 | free |

## What was tested

- `npm test`: 10 vitest tests (helpers, real GROQ through groq-js, the tool component rendered with Testing Library), against the published agentprose 0.1.3 and again with `AGENTPROSE_SRC=1` against this repo's adapter.
- `npm run build`: plugin-kit verify-package + pkg-utils strict build.
- `npm run test:studio`: a production `sanity build` (Sanity 6.20) of `test/studio` with the plugin, then headless Chromium loads it, with the Sanity HTTP API answered locally by real GROQ over demo data: post list, drafts hidden, get_post markdown, search, install snippet, CORS check, no page errors.
- Not tested: a Studio logged in to a real Sanity project (needs an account). Expected to behave the same; the plugin only uses `useClient` and the documented `/datasets` and `/cors` project endpoints.

## Steps

1. **Release agentprose 0.1.4 first** **[Maxim]** (RELEASING.md). The plugin depends on `agentprose ^0.1.3` and works with 0.1.3, but 0.1.4 carries the Sanity adapter fixes (summary from Portable Text, starter schema fields, no `undefined` params) that the website snippet uses.
2. In `sanity-plugin/`, set `version` (start at `1.0.0` or keep in step with agentprose; Sanity plugins usually start at 1.0.0) and update the `agentprose` dependency to `^0.1.4`.
3. `npm ci && npm test && npm run build && npm run test:studio` (Node 24; plugin-kit 10 needs Node 24).
4. `npm publish --access public` from `sanity-plugin/` **[Maxim]** (npm account that owns `agentprose`; 2FA). `prepublishOnly` runs the verify and build again.
5. Check https://www.npmjs.com/package/sanity-plugin-agentprose shows the README with the screenshot (the image URL points at `docs/marketplaces/sanity/assets/screenshot-1.png` on `main`, so merge first).
6. Go to https://www.sanity.io/exchange → **Submit** (or https://www.sanity.io/plugins), sign in with a Sanity account **[Maxim]**.
7. Choose listing type **Plugin**, fill the fields from [listing.md](listing.md), upload `assets/screenshot-1.png`, `screenshot-2.png`, the banner as cover and `icon.svg` / `icon-256x256.png` as the logo.
8. Submit; Sanity reviews community listings before they appear (review time not published).

Optional: a second listing of type **Tool** for the website script itself ("agentprose for Sanity-powered sites", Studio version N/A, like sanity.io/plugins/bubblav) pointing at https://salnikov.no/agentprose/install/sanity/.

Support contact for the listing: Maxim Salnikov, salnikov@gmail.com.
