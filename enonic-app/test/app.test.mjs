// Unit tests for the XP app's JavaScript, run in Node: node --test enonic-app/test/
// The processor is loaded with a stand-in for XP's require(), so the exact file XP runs is tested.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const res = (p) => new URL('../src/main/resources/' + p, import.meta.url);
// XP modules are CommonJS; the repo root is "type": "module", so load them the way XP does.
function load(path, libs = {}) {
  const module = { exports: {} };
  const fn = vm.runInThisContext(`(function (exports, require, module) {${readFileSync(res(path), 'utf8')}\n})`);
  fn(module.exports, (id) => libs[id] || assert.fail('unexpected require ' + id), module);
  return module.exports;
}
const tag = load('lib/agentprose/tag.js');

function loadProcessor(siteConfig, apiUrlImpl) {
  const libs = {
    '/lib/xp/portal': {
      getSiteConfig: () => siteConfig,
      getSite: () => ({ _id: 'site-id', _path: '/demo', displayName: 'Demo' }),
      pageUrl: (o) => (o.id === 'site-id' ? 'http://localhost:8080/site/default/master/demo' : 'http://localhost:8080/x'),
      apiUrl: apiUrlImpl || ((o) => `http://localhost:8080/site/default/master/demo/_/${o.api}`),
    },
    '/lib/enonic/asset': { assetUrl: (o) => `/site/default/master/demo/_/no.salnikov.agentprose:asset/fp123/${o.path}` },
    '/lib/agentprose/tag': tag,
  };
  return load('cms/processors/agentprose.js', libs).responseProcessor;
}
const run = (cfg, req, response) => loadProcessor(cfg)(req, response || { body: '<html></html>', pageContributions: {} });

test('pages mode: deferred script from the app itself, local polyfill, nothing else by default', () => {
  const r = run({ source: 'pages' }, { mode: 'live' });
  assert.equal(r.pageContributions.headEnd.length, 1);
  assert.equal(
    r.pageContributions.headEnd[0],
    '<script src="/site/default/master/demo/_/no.salnikov.agentprose:asset/fp123/agentprose/agentprose.min.js" defer' +
      ' data-base="http://localhost:8080/site/default/master/demo/" data-index="http://localhost:8080/site/default/master/demo/agentprose.json"' +
      ' data-polyfill="/site/default/master/demo/_/no.salnikov.agentprose:asset/fp123/agentprose/vendor/webmcp-polyfill.iife.js"></script>',
  );
});

test('an unsaved site config (null) behaves like the defaults', () => {
  const r = run(null, { mode: 'live' });
  assert.match(r.pageContributions.headEnd[0], /^<script src="[^"]+agentprose\.min\.js" defer data-base="[^"]+\/demo\/" data-index="[^"]+\/demo\/agentprose\.json" data-polyfill="[^"]+webmcp-polyfill\.iife\.js"><\/script>$/);
});

test('guillotine mode: enonic adapter, this site\'s Guillotine endpoint unless one is set', () => {
  let r = run({ source: 'guillotine', contentType: 'com.example:article' }, { mode: 'live' });
  const h = r.pageContributions.headEnd[0];
  assert.match(h, / data-adapter="enonic"/);
  assert.match(h, / data-endpoint="http:\/\/localhost:8080\/site\/default\/master\/demo\/_\/com\.enonic\.app\.guillotine:graphql"/);
  assert.match(h, / data-content-type="com\.example:article"/);
  assert.match(h, / data-site-key="\/demo"/);
  assert.doesNotMatch(h, / data-index=/);
  r = run({ source: 'guillotine', contentType: 'a:b', endpoint: 'https://cms.ex/api/com.enonic.app.guillotine:graphql' }, { mode: 'live' });
  assert.match(r.pageContributions.headEnd[0], / data-endpoint="https:\/\/cms\.ex\/api\/com\.enonic\.app\.guillotine:graphql"/);
});

test('skips Content Studio edit and inline modes, injects in live and preview', () => {
  for (const mode of ['edit', 'inline']) assert.equal(run({}, { mode }).pageContributions.headEnd, undefined);
  for (const mode of ['live', 'preview']) assert.equal(run({}, { mode }).pageContributions.headEnd.length, 1);
});

test('keeps contributions from other apps (string or array)', () => {
  let r = run({}, { mode: 'live' }, { pageContributions: { headEnd: '<meta name="a">' } });
  assert.deepEqual(r.pageContributions.headEnd.slice(0, 1), ['<meta name="a">']);
  assert.equal(r.pageContributions.headEnd.length, 2);
  r = run({}, { mode: 'live' }, { pageContributions: { headEnd: ['<x>', '<y>'], bodyEnd: ['<z>'] } });
  assert.equal(r.pageContributions.headEnd.length, 3);
  assert.deepEqual(r.pageContributions.bodyEnd, ['<z>']);
  r = run({}, { mode: 'live' }, {});
  assert.equal(r.pageContributions.headEnd.length, 1);
});

test('Cloud key: analytics + hosted search, opt-out of search, never without a key', () => {
  let a = Object.fromEntries(tag.attributes({ cloudKey: 'pk_test' }, {}));
  assert.equal(a['data-analytics'], 'https://agentprose.cloud/v1/collect');
  assert.equal(a['data-analytics-key'], 'pk_test');
  assert.equal(a['data-search-endpoint'], 'https://agentprose.cloud/v1/search?key=pk_test');
  a = Object.fromEntries(tag.attributes({ cloudKey: 'pk_test', noCloudSearch: true }, {}));
  assert.equal(a['data-search-endpoint'], undefined);
  a = Object.fromEntries(tag.attributes({}, {}));
  assert.equal(a['data-analytics'], undefined);
});

test('checkbox semantics: unchecked = missing property = safe default', () => {
  assert.equal(Object.fromEntries(tag.attributes({ noPolyfill: true }, { polyfill: '/p.js' }))['data-polyfill'], 'false');
  assert.equal(Object.fromEntries(tag.attributes({}, { polyfill: '/p.js' }))['data-polyfill'], '/p.js');
  assert.equal(Object.fromEntries(tag.attributes({ inspector: true }, { mode: 'live' }))['data-inspector'], undefined);
  assert.equal(Object.fromEntries(tag.attributes({ inspector: true }, { mode: 'preview' }))['data-inspector'], '');
  assert.equal(Object.fromEntries(tag.attributes({ navigate: true, debug: true }, {}))['data-navigate'], '');
});

test('escapes every attribute value', () => {
  const h = tag.scriptTag({ prefix: '"><script>alert(1)</script>', contentSelector: 'a&b' }, { src: '/x.js?a=1&b="2"' });
  assert.ok(!h.includes('<script>alert'));
  assert.match(h, /data-prefix="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  assert.match(h, /src="\/x\.js\?a=1&amp;b=&quot;2&quot;"/);
  assert.match(h, /data-content="a&amp;b"/);
});

test('descriptors: processor is wired, Asset API mounted and public', () => {
  const site = readFileSync(res('cms/site.yaml'), 'utf8');
  assert.match(site, /processors:\s*\n\s*- name: "agentprose"/);
  assert.match(site, /apis:\s*\n\s*- "asset"/);
  assert.match(readFileSync(res('apis/asset/asset.yaml'), 'utf8'), /role:system\.everyone/);
  const form = readFileSync(res('cms/cms.yaml'), 'utf8');
  for (const name of ['source', 'contentType', 'endpoint', 'cloudKey', 'noPolyfill', 'inspector']) assert.match(form, new RegExp(`name: "${name}"`));
});

const siteIndex = load('lib/agentprose/site-index.js');

test('site index: the agentprose.json shape, summaries, tags and authors from common field names', () => {
  const j = siteIndex.build(
    [
      { _id: '1', _name: 'a', displayName: 'A post', language: 'nb', publish: { first: '2026-10-01T00:00:00Z' }, modifiedTime: '2026-10-02T00:00:00Z',
        data: { preface: '<p>Short &amp; sweet</p>', tags: ['x', 'y'], author: 'Ada' } },
      { _id: '2', _name: 'b', displayName: 'B', createdTime: '2026-09-01T00:00:00Z', data: { text: '<p>' + 'word '.repeat(100) + '</p>', tags: 'one', author: '0d1b2c3d-1111-2222-3333-444455556666' } },
    ],
    { site: { displayName: 'Demo', data: { description: 'About <b>it</b>' } }, siteUrl: 'https://ex', pageUrl: (c) => 'https://ex/' + c._name, generated: 'now' },
  );
  assert.deepEqual(j.site, { name: 'Demo', url: 'https://ex/', description: 'About it' });
  assert.deepEqual(j.posts[0], { url: 'https://ex/a', slug: 'a', title: 'A post', summary: 'Short & sweet', published: '2026-10-01T00:00:00Z', updated: '2026-10-02T00:00:00Z', tags: ['x', 'y'], authors: ['Ada'], lang: 'nb' });
  assert.equal(j.posts[1].published, '2026-09-01T00:00:00Z');
  assert.deepEqual(j.posts[1].tags, ['one']);
  assert.equal(j.posts[1].authors, undefined, 'a reference id is not an author name');
  assert.ok(j.posts[1].summary.length <= 281 && j.posts[1].summary.endsWith('…'));
});

test('site index query: only this site, page-like types by default, editor types when set (sanitised)', () => {
  const q = siteIndex.query('/my-site', null);
  assert.match(q, /^_path LIKE '\/content\/my-site\/\*'/);
  assert.match(q, /type NOT IN \('portal:site'/);
  assert.match(q, /type NOT LIKE 'media:\*'/);
  const q2 = siteIndex.query('/my-site', ['com.ex:article', "bad') OR true OR ('"]);
  assert.match(q2, /AND type IN \('com\.ex:article'\)$/);
});

test('site index controller: 404 in Guillotine mode or when disabled, JSON otherwise', () => {
  const ctrl = (cfg) =>
    load('cms/agentprose-index.js', {
      '/lib/xp/portal': { getSiteConfig: () => cfg, getSite: () => ({ _id: 's', _path: '/demo', displayName: 'Demo' }), pageUrl: (o) => 'https://ex/' + o.id },
      '/lib/xp/content': { query: (q) => ({ hits: [{ _id: 'p1', _name: 'p1', displayName: 'P1', data: {} }], total: 1, _q: q }) },
      '/lib/agentprose/site-index': siteIndex,
    }).get();
  assert.equal(ctrl({ source: 'guillotine' }).status, 404);
  assert.equal(ctrl({ noIndex: true }).status, 404);
  const r = ctrl({});
  assert.equal(r.status, 200);
  assert.equal(r.contentType, 'application/json');
  assert.deepEqual(JSON.parse(r.body).posts.map((p) => p.url), ['https://ex/p1']);
});
