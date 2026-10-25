/*
 * Adds the agentprose script to every HTML page of a site that has this app, as a headEnd page
 * contribution. The script and its adapter are served by this app (lib-asset), not by a CDN.
 */
var portal = require('/lib/xp/portal');
var asset = require('/lib/enonic/asset');
var tag = require('/lib/agentprose/tag');

function guillotineEndpoint() {
  try {
    return portal.apiUrl({ api: 'com.enonic.app.guillotine:graphql', type: 'absolute' });
  } catch (e) {
    return '';
  }
}

exports.responseProcessor = function (req, res) {
  if (!tag.shouldInject(req.mode)) return res;
  var cfg = portal.getSiteConfig() || {};
  var site = portal.getSite();
  var guillotine = cfg.source === 'guillotine';
  var html = tag.scriptTag(cfg, {
    mode: req.mode,
    src: asset.assetUrl({ path: 'agentprose/agentprose.min.js' }),
    polyfill: asset.assetUrl({ path: 'agentprose/vendor/webmcp-polyfill.iife.js' }),
    guillotine: guillotine && !cfg.endpoint ? guillotineEndpoint() : '',
    siteKey: guillotine && site ? site._path : '',
    siteUrl: site ? portal.pageUrl({ id: site._id, type: 'absolute' }) : '',
  });
  var pc = res.pageContributions || (res.pageContributions = {});
  var head = pc.headEnd;
  pc.headEnd = !head ? [] : typeof head === 'string' ? [head] : head;
  pc.headEnd.push(html);
  return res;
};
