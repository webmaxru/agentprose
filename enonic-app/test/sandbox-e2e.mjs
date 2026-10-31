#!/usr/bin/env node
// End-to-end test of the XP app on a real Enonic XP 8 sandbox, in headless Chromium.
//
//   1. enonic sandbox create agentprose -f && enonic sandbox start agentprose --prod
//   2. drop into the sandbox's home/deploy/: Guillotine 9 (repo.enonic.com/public/com/enonic/app/guillotine/9.0.0/),
//      build/libs/agentprose.jar (this app) and test/fixture/build/libs/agentprose-demo.jar (the fixture blog)
//   3. node enonic-app/test/sandbox-e2e.mjs        (XP_URL=http://localhost:8080 by default; CHROME=/path optional)
//
// The fixture seeds two sites in project "agentprose": /agentprose-demo (source: rendered pages) and
// /agentprose-headless (source: Guillotine). Guillotine mode needs an agentprose build with the Guillotine 8+
// adapter (0.1.4+, or `node enonic-app/sync.mjs --from-dist` from this checkout); set SKIP_GUILLOTINE=1 otherwise.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const XP = (process.env.XP_URL || 'http://localhost:8080').replace(/\/$/, '');
const PAGES = `${XP}/site/agentprose/master/agentprose-demo`;
const HEADLESS = `${XP}/site/agentprose/master/agentprose-headless`;
const ORIGIN = new URL(XP).origin;
let browser, native, hasNative = false;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  native = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--enable-features=WebMCPTesting'] });
  const p = await native.newPage();
  await p.goto(PAGES);
  hasNative = await p.evaluate(() => !!document.modelContext?.registerTool && !window.__mcpb);
  await p.close();
  console.log(`# ${browser.version()}; XP at ${XP}`);
});
after(async () => {
  await browser?.close();
  await native?.close();
});

async function open(b, url) {
  const page = await b.newPage();
  const errors = [];
  const foreign = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource/.test(m.text()) && errors.push(m.text()));
  // Optional files a site may not have (agentprose probes llms.txt; browsers ask for a favicon): fine as 404.
  page.on('response', (r) => r.status() >= 400 && !/\/(llms\.txt|favicon\.ico)$/.test(new URL(r.url()).pathname) && errors.push(`${r.status()} ${r.url()}`));
  page.on('request', (r) => new URL(r.url()).origin !== ORIGIN && foreign.push(r.url()));
  const res = await page.goto(url);
  assert.equal(res.status(), 200, url);
  await page.waitForFunction(() => window.AgentProse?.ready, null, { timeout: 15000 });
  await page.evaluate(() => window.AgentProse.ready);
  return { page, errors, foreign };
}
const call = (page, name, input = {}) => page.evaluate(([n, i]) => window.AgentProse.instance.call(n, i), [name, input]);

test('the processor adds one deferred script tag in <head>, served by the app itself', async () => {
  for (const url of [PAGES, `${PAGES}/agents-read-blogs`]) {
    const html = await (await fetch(url)).text();
    const tags = html.match(/<script src="[^"]*no\.salnikov\.agentprose:asset\/[^"]*\/agentprose\/agentprose\.min\.js"[^>]*><\/script>/g) || [];
    assert.equal(tags.length, 1, url);
    assert.ok(html.indexOf(tags[0]) < html.indexOf('</head>'), 'in head');
    assert.match(tags[0], / defer /);
    const src = new URL(tags[0].match(/src="([^"]+)"/)[1], XP);
    const poly = new URL(tags[0].match(/data-polyfill="([^"]+)"/)[1], XP);
    for (const u of [src, poly, new URL('adapters/enonic.min.js', src), new URL('agentprose.inspector.min.js', src)]) {
      const r = await fetch(u);
      assert.equal(r.status, 200, String(u));
      assert.match(r.headers.get('content-type'), /javascript/);
    }
    const version = (await (await fetch(new URL('VERSION', src))).text()).trim();
    assert.match(await (await fetch(src)).text(), new RegExp(`agentprose v${version.replace(/\./g, '\\.')}`));
  }
});

test('rendered-pages site: tools work in a browser without WebMCP, polyfill from the site, nothing from other origins', async () => {
  const { page, errors, foreign } = await open(browser, `${PAGES}/agents-read-blogs`);
  const reg = await page.evaluate(() => window.AgentProse.instance.ready);
  const art = await call(page, 'get_current_article');
  assert.equal(art.title, 'Agents read blogs now');
  assert.match(art.markdown, /WebMCP gives in-browser agents structured, read-only tools/);
  assert.match(art.markdown, /## Why agents/);
  // The polyfill (served by the app) supplies document.modelContext once the page has loaded.
  await page.waitForFunction(() => document.modelContext?.getTools, null, { timeout: 15000 });
  const tools = await page.evaluate(async () => (await document.modelContext.getTools()).map((t) => t.name));
  for (const n of ['get_current_article', 'search_posts', 'list_posts', 'get_post']) assert.ok(tools.includes(n), `${n} in ${tools}`);
  const viaWebMcp = await page.evaluate(async () => {
    const t = (await document.modelContext.getTools()).find((x) => x.name === 'get_current_article');
    return JSON.parse(await document.modelContext.executeTool(t, {})).title;
  });
  assert.equal(viaWebMcp, 'Agents read blogs now');
  // Site-wide tools: the app's /agentprose.json index lists this site's pages (and not the other site's).
  const list = await call(page, 'list_posts');
  assert.deepEqual(list.items.map((p) => p.title).sort(), ['A fjord guide for agents', 'Agents read blogs now', 'Headless CMS notes']);
  for (const p of list.items) assert.ok(p.url.startsWith(`${PAGES}/`), p.url);
  const tagged = await call(page, 'list_posts', { tag: 'Travel' });
  assert.deepEqual(tagged.items.map((p) => p.title), ['A fjord guide for agents']);
  const found = await call(page, 'search_posts', { query: 'fjord' });
  assert.equal(found.results[0].title, 'A fjord guide for agents');
  const other = await call(page, 'get_post', { url: `${PAGES}/headless-notes` });
  assert.equal(other.title, 'Headless CMS notes');
  assert.match(other.markdown, /\*\*GraphQL\*\*/);
  const site = await call(page, 'get_site_info');
  assert.equal(site.url, `${PAGES}/`);
  assert.equal(site.name, 'agentprose demo blog');
  console.log(`# pages mode: registration ${reg.mode}, ${tools.length} tools`);
  assert.deepEqual(foreign, []);
  assert.deepEqual(errors, []);
  await page.close();
});

test('native WebMCP (Chromium WebMCPTesting): tools register on document.modelContext', async (t) => {
  if (!hasNative) return t.skip('this Chromium has no native WebMCP');
  const { page, errors } = await open(native, `${PAGES}/headless-notes`);
  const r = await page.evaluate(async () => {
    const t = (await document.modelContext.getTools()).find((x) => x.name === 'get_current_article');
    return { mode: (await window.AgentProse.instance.ready).mode, title: JSON.parse(await document.modelContext.executeTool(t, {})).title };
  });
  assert.deepEqual(r, { mode: 'native', title: 'Headless CMS notes' });
  assert.deepEqual(errors, []);
  await page.close();
});

test('Guillotine site: list, search and read only this site\'s articles through Guillotine', async (t) => {
  if (process.env.SKIP_GUILLOTINE) return t.skip('SKIP_GUILLOTINE set');
  const { page, errors, foreign } = await open(browser, HEADLESS);
  const list = await call(page, 'list_posts');
  const items = list.items || list.posts || list;
  const titles = items.map((p) => p.title).sort();
  assert.deepEqual(titles, ['GraphQL for agents', 'Second headless post']);
  for (const p of items) assert.ok(p.url.startsWith(`${HEADLESS}/`), p.url);
  const found = await call(page, 'search_posts', { query: 'Guillotine' });
  const hits = found.results || found.items || found;
  assert.equal(hits[0].title, 'GraphQL for agents');
  const post = await call(page, 'get_post', { url: `${HEADLESS}/graphql-for-agents` });
  assert.equal(post.title, 'GraphQL for agents');
  assert.match(post.markdown, /## Query DSL/);
  assert.deepEqual(post.tags, ['CMS', 'GraphQL']);
  const bySlug = await call(page, 'get_post', { slug: 'headless-second' });
  assert.equal(bySlug.title, 'Second headless post');
  const tagged = await call(page, 'list_posts', { tag: 'GraphQL' });
  assert.deepEqual((tagged.items || tagged.posts || tagged).map((p) => p.title), ['GraphQL for agents']);
  assert.deepEqual(foreign, []);
  assert.deepEqual(errors, []);
  await page.close();
});
