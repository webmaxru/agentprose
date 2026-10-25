/*
 * Serves <site>/agentprose.json: the site's published pages as an agentprose index, so agents can
 * list and search the whole site. Mapped in cms/site.yaml. Off in Guillotine mode or when disabled.
 */
var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');
var index = require('/lib/agentprose/site-index');

var MAX = 2000;

exports.get = function () {
  var cfg = portal.getSiteConfig() || {};
  if (cfg.source === 'guillotine' || cfg.noIndex === true || cfg.noIndex === 'true') return { status: 404 };
  var site = portal.getSite();
  var r = content.query({ start: 0, count: MAX, query: index.query(site._path, cfg.indexTypes), sort: 'publish.first DESC' });
  var body = index.build(r.hits, {
    site: site,
    siteUrl: portal.pageUrl({ id: site._id, type: 'absolute' }),
    pageUrl: function (c) {
      return portal.pageUrl({ id: c._id, type: 'absolute' });
    },
    generated: new Date().toISOString(),
  });
  return {
    status: 200,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' },
    body: JSON.stringify(body),
  };
};
