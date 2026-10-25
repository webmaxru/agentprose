// Seeds a small blog in the default project when the app starts (idempotent), then publishes it.
var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var project = require('/lib/xp/project');
var auth = require('/lib/xp/auth');

var PAGE = { descriptor: app.name + ':main', config: {}, regions: {} };
var ARTICLES = [
  { name: 'agents-read-blogs', displayName: 'Agents read blogs now', preface: 'Why WebMCP matters for publishers.', author: 'Ada Lovelace', tags: ['WebMCP', 'AI'],
    text: '<h2>Why agents</h2><p>WebMCP gives in-browser agents structured, read-only tools for reading a site.</p><p>No scraping, no guessing.</p>' },
  { name: 'headless-notes', displayName: 'Headless CMS notes', preface: 'Short notes on Guillotine and GraphQL.', author: 'Bo Ek', tags: ['CMS'],
    text: '<p>Guillotine turns the content model into a <strong>GraphQL</strong> API.</p>' },
  { name: 'fjord-guide', displayName: 'A fjord guide for agents', preface: 'Travel content, structured.', author: 'Ada Lovelace', tags: ['Travel'],
    text: '<p>Geirangerfjord and N&aelig;r&oslash;yfjord are on the UNESCO list.</p>' },
];

// Two sites in one project: one reads rendered pages, one reads Guillotine (and must not see the other's articles).
var SITES = [
  { name: 'agentprose-demo', displayName: 'agentprose demo blog', config: { source: 'pages' }, articles: ARTICLES },
  { name: 'agentprose-headless', displayName: 'agentprose headless blog', config: { source: 'guillotine', contentType: app.name + ':article' },
    articles: [
      { name: 'graphql-for-agents', displayName: 'GraphQL for agents', preface: 'Reading Enonic content through Guillotine.', author: 'Bo Ek', tags: ['CMS', 'GraphQL'],
        text: '<h2>Query DSL</h2><p>Agents call search_posts; agentprose turns it into a Guillotine fulltext query.</p>' },
      { name: 'headless-second', displayName: 'Second headless post', preface: 'Only on the headless site.', author: 'Ada Lovelace', tags: ['CMS'],
        text: '<p>This post lives under the headless site only.</p>' },
    ] },
];

function seedSite(s) {
  var key = '/' + s.name;
  if (!content.exists({ key: key })) {
    var site = content.create({
      name: s.name, parentPath: '/', displayName: s.displayName, contentType: 'portal:site',
      data: { siteConfig: [{ applicationKey: app.name, config: {} }, { applicationKey: 'no.salnikov.agentprose', config: s.config }] },
      page: PAGE,
    });
    s.articles.forEach(function (a) {
      content.create({ name: a.name, parentPath: key, displayName: a.displayName, contentType: app.name + ':article',
        data: { preface: a.preface, text: a.text, author: a.author, tags: a.tags }, page: PAGE });
    });
    var r = content.publish({ keys: [site._id], includeDependencies: true });
    log.info('agentprose demo seeded ' + key + ': ' + JSON.stringify(r));
  }
  // Anonymous visitors (and agents) may read the published site, as on a public website.
  content.applyPermissions({ key: key, addPermissions: [{ principal: 'role:system.everyone', allow: ['READ'] }], scope: 'TREE' });
}

function seed() {
  SITES.forEach(seedSite);
}

var ADMIN = { principals: ['role:system.admin'], user: { login: 'su', idProvider: 'system' } };
// A local admin for screenshots of Content Studio on the throwaway sandbox (fixture only, never in the app).
context.run({ repository: 'system-repo', branch: 'master', principals: ADMIN.principals, user: ADMIN.user }, function () {
  try {
    if (!auth.getPrincipal('user:system:demo-admin')) {
      auth.createUser({ idProvider: 'system', name: 'demo-admin', displayName: 'Demo Admin', email: 'demo-admin@example.com' });
      auth.changePassword({ userKey: 'user:system:demo-admin', password: 'agentprose-demo-only' });
      auth.addMembers('role:system.admin', ['user:system:demo-admin']);
      auth.addMembers('role:system.admin.login', ['user:system:demo-admin']);
      auth.addMembers('role:cms.admin', ['user:system:demo-admin']);
    }
  } catch (e) { log.error('agentprose demo admin failed: ' + e); }
});
context.run({ repository: 'system-repo', branch: 'master', principals: ADMIN.principals, user: ADMIN.user }, function () {
  try {
    if (!project.get({ id: 'agentprose' })) {
      project.create({ id: 'agentprose', displayName: 'agentprose demo', readAccess: { public: true } });
    }
  } catch (e) { log.error('agentprose demo project failed: ' + e); }
});
context.run({ repository: 'com.enonic.cms.agentprose', branch: 'draft', principals: ADMIN.principals, user: ADMIN.user }, function () {
  try { seed(); } catch (e) { log.error('agentprose demo seed failed: ' + e); }
});
