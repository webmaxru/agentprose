/* oxlint-disable no-console -- a test script that reports its result */
// End-to-end: the plugin inside a real, built Sanity Studio, in headless Chromium.
//   npm run studio:build && node test/studio-e2e.mjs      (SHOTS=<dir> saves screenshots; CHROME=/path optional)

import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parse, evaluate } from 'groq-js';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const dist = here('./studio/dist');
const outDir = process.env.SHOTS || '';
const DATA = JSON.parse(readFileSync(here('./studio/demo-data.json'), 'utf8'));
// A production `sanity build` of test/studio, served locally; the Sanity APIs are answered in the browser by a
// stand-in that runs real GROQ (groq-js) over studio/demo-data.json. No Sanity account or network needed.
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.on('listening', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const user = { id: 'pTest', name: 'Maxim Salnikov', email: 'maxim@example.com', profileImage: null, provider: 'google', role: 'administrator', roles: [{ name: 'administrator', title: 'Administrator' }] };
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const seen = new Set();
await ctx.route(/sanity\.io\//, async (route) => {
  const u = new URL(route.request().url());
  const path = u.pathname.replace(/^\/v[\d-]+|^\/vX/, '');
  seen.add(path);
  const json = (o, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true' }, body: JSON.stringify(o) });
  if (/design-system-static/.test(u.host)) return route.continue();
  if (path.startsWith('/users/me')) return json(user);
  if (path.startsWith('/projects/agentprs/datasets') || path === '/datasets') return json([{ name: 'production', aclMode: 'public' }]);
  if (path.startsWith('/projects/agentprs/cors') || path === '/cors') return json([{ origin: 'https://example.com', allowCredentials: false }]);
  if (path.startsWith('/projects/agentprs/features') || path === '/features') return json(['privateDataset']);
  if (path.startsWith('/projects/agentprs')) return json({ id: 'agentprs', displayName: 'agentprose demo', studioHost: null, isBlocked: false, isDisabled: false, isDisabledByUser: false, metadata: {}, members: [{ id: 'pTest', role: 'administrator', roles: [{ name: 'administrator', title: 'Administrator' }], isCurrentUser: true }], organizationId: null });
  if (path.startsWith('/data/query/')) {
    const params = {};
    u.searchParams.forEach((v, k) => k.startsWith('$') && (params[k.slice(1)] = JSON.parse(v)));
    const perspective = u.searchParams.get('perspective');
    const ds = perspective === 'published' ? DATA.filter((d) => !d._id.startsWith('drafts.')) : DATA;
    let q = u.searchParams.get('query');
    if (route.request().method() === 'POST') { const bd = JSON.parse(route.request().postData() || '{}'); q = bd.query; Object.assign(params, bd.params || {}); }
    try { return json({ result: await (await evaluate(parse(q, { params }), { dataset: ds, params })).get(), ms: 1 }); } catch (e) { return json({ error: { description: String(e) } }, 400); }
  }
  if (path.startsWith('/data/listen')) return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true' }, body: 'event: welcome\ndata: {"listenerName":"x"}\n\n' });
  if (path.startsWith('/access/')) return json({ granted: true, permissions: [] });
  if (path.includes('/acl')) return json([{ filter: '_id in path("**")', permissions: ['read', 'create', 'update', 'history'] }]);
  return json({});
});
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
try {
  await pg.goto(base + '/agentprose', { waitUntil: 'load' });
  await pg.getByText('Agents read blogs now').first().waitFor({ timeout: 30000 });
  const body = () => pg.evaluate(() => document.body.innerText);
  let t = await body();
  assert.match(t, /3 published/);
  assert.match(t, /https:\/\/example\.com\/blog\/agents-read-blogs\//);
  assert.doesNotMatch(t, /Unpublished draft/, 'drafts never reach agents');
  assert.match(t, /data-project="agentprs" data-dataset="production"/);
  await pg.getByText('Agents read blogs now').first().click();
  await pg.getByTestId('agentprose-post').waitFor();
  assert.match(await pg.getByTestId('agentprose-post').innerText(), /## Why agents/);
  if (outDir) await pg.screenshot({ path: join(outDir, 'sanity-studio-tool.png') });
  await pg.getByPlaceholder(/Search like an agent/).fill('portable');
  await pg.getByRole('button', { name: 'Search', exact: true }).click();
  await pg.waitForFunction(() => !document.body.innerText.includes('GROQ on the API CDN'));
  t = await body();
  assert.match(t, /Portable Text, as markdown/);
  await pg.getByText('Put it on your website').scrollIntoViewIfNeeded();
  await pg.getByText('https://example.com is allowed in CORS.').waitFor();
  if (outDir) await pg.screenshot({ path: join(outDir, 'sanity-studio-install.png') });
  assert.deepEqual(errs, []);
  console.log('ok - the plugin renders in a production Studio build: list, get_post, search, install snippet and CORS check');
} finally {
  await b.close();
  srv.close();
}
