/*
 * Builds the agentprose <script> tag from the site configuration. Pure: no XP imports, so it runs
 * in XP's JS engine and in Node tests alike (ES5, CommonJS).
 */
var CLOUD = 'https://agentprose.cloud';

function str(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}

function escapeAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {object} cfg  site config from portal.getSiteConfig()
 * @param {object} ctx  { src, polyfill, mode, guillotine, siteKey } — asset URLs, request mode, this site's Guillotine endpoint and path
 * @returns {Array<Array<string>>} ordered [name, value] pairs; value '' means a bare attribute
 */
function attributes(cfg, ctx) {
  cfg = cfg || {};
  ctx = ctx || {};
  var a = [];
  var add = function (name, value) {
    value = str(value);
    if (value) a.push([name, value]);
  };
  if (str(cfg.source) === 'guillotine') {
    a.push(['data-adapter', 'enonic']);
    add('data-endpoint', str(cfg.endpoint) || ctx.guillotine);
    add('data-content-type', cfg.contentType);
    add('data-site-key', ctx.siteKey);
    add('data-url-pattern', cfg.urlPattern);
  } else {
    add('data-content', cfg.contentSelector);
    // The site may live under a path (/site/<project>/<branch>/<site>/ or a vhost sub-path): tell agentprose
    // where its root is, and where the app's site index is.
    if (ctx.siteUrl) {
      var root = String(ctx.siteUrl).replace(/\/*$/, '/');
      add('data-base', root);
      if (!(cfg.noIndex === true || cfg.noIndex === 'true')) add('data-index', root + 'agentprose.json');
    }
  }
  add('data-prefix', cfg.prefix);
  if (cfg.navigate === true || cfg.navigate === 'true') a.push(['data-navigate', '']);
  add('data-subscribe', cfg.subscribe);
  add('data-about', cfg.about);
  add('data-contact', cfg.contact);
  // The bundled polyfill (served by this app) or none: the app never loads a polyfill from a CDN.
  a.push(['data-polyfill', cfg.noPolyfill === true || cfg.noPolyfill === 'true' ? 'false' : str(ctx.polyfill) || 'false']);
  var key = str(cfg.cloudKey);
  if (key) {
    var cloud = str(ctx.cloud) || CLOUD;
    a.push(['data-analytics', cloud + '/v1/collect']);
    a.push(['data-analytics-key', key]);
    if (!(cfg.noCloudSearch === true || cfg.noCloudSearch === 'true')) a.push(['data-search-endpoint', cloud + '/v1/search?key=' + encodeURIComponent(key)]);
  }
  if ((cfg.inspector === true || cfg.inspector === 'true') && ctx.mode === 'preview') a.push(['data-inspector', '']);
  if (cfg.debug === true || cfg.debug === 'true') a.push(['data-debug', '']);
  return a;
}

/** The full tag, deferred so it never blocks rendering. */
function scriptTag(cfg, ctx) {
  var html = '<script src="' + escapeAttr(ctx.src) + '" defer';
  var attrs = attributes(cfg, ctx);
  for (var i = 0; i < attrs.length; i++) {
    html += ' ' + attrs[i][0] + (attrs[i][1] === '' ? '' : '="' + escapeAttr(attrs[i][1]) + '"');
  }
  return html + '></script>';
}

/** Content Studio's edit and inline modes render inside the editor: no agent tools there. */
function shouldInject(mode) {
  return mode === 'live' || mode === 'preview';
}

exports.attributes = attributes;
exports.scriptTag = scriptTag;
exports.shouldInject = shouldInject;
exports.escapeAttr = escapeAttr;
