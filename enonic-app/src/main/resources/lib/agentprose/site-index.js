/*
 * Builds the agentprose.json site index (the format the agentprose CLI writes) from XP content.
 * Pure: XP calls it from the mapping controller, Node tests call it directly (ES5, CommonJS).
 * With it, list_posts / search_posts / get_post cover the whole site in "rendered pages" mode,
 * even on sites with no sitemap.xml or feed.
 */
var SKIP_TYPES = ['portal:site', 'portal:fragment', 'portal:page-template', 'portal:template-folder', 'base:folder', 'base:shortcut', 'base:unstructured'];
var SUMMARY_FIELDS = ['preface', 'description', 'summary', 'intro', 'ingress', 'lead', 'excerpt', 'text', 'body'];
var TAG_FIELDS = ['tags', 'keywords', 'categories'];
var AUTHOR_FIELDS = ['author', 'authors', 'byline'];

function text(v) {
  return String(v || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function first(data, fields) {
  for (var i = 0; i < fields.length; i++) {
    var v = data && data[fields[i]];
    if (typeof v === 'string' && text(v)) return v;
  }
  return '';
}

function strings(data, fields) {
  for (var i = 0; i < fields.length; i++) {
    var v = data && data[fields[i]];
    if (v === undefined || v === null) continue;
    var list = [].concat(v).filter(function (x) {
      // Plain strings only: references (content ids) are not names.
      return typeof x === 'string' && x && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
    });
    if (list.length) return list;
  }
  return [];
}

function cut(s, n) {
  s = text(s);
  if (s.length <= n) return s;
  var c = s.slice(0, n);
  var sp = c.lastIndexOf(' ');
  return (sp > n * 0.6 ? c.slice(0, sp) : c) + '…';
}

/** The NoQL query for one site's indexable content. */
function query(sitePath, types) {
  var q = "_path LIKE '/content" + String(sitePath).replace(/'/g, '') + "/*'";
  var only = [].concat(types || []).filter(function (t) {
    return typeof t === 'string' && /^[\w.-]+:[\w.-]+$/.test(t);
  });
  if (only.length) q += ' AND type IN (' + only.map(function (t) { return "'" + t + "'"; }).join(', ') + ')';
  else q += ' AND type NOT IN (' + SKIP_TYPES.map(function (t) { return "'" + t + "'"; }).join(', ') + ") AND type NOT LIKE 'media:*'";
  return q;
}

/**
 * @param {Array} hits     content items (content.query().hits)
 * @param {object} o       { site: {displayName, data}, pageUrl: function(content) -> absolute URL, siteUrl, generated }
 */
function build(hits, o) {
  var posts = [];
  for (var i = 0; i < (hits || []).length; i++) {
    var c = hits[i];
    var d = c.data || {};
    var p = { url: o.pageUrl(c), slug: c._name, title: c.displayName };
    var summary = cut(first(d, SUMMARY_FIELDS), 280);
    if (summary) p.summary = summary;
    var published = (c.publish && (c.publish.first || c.publish.from)) || c.createdTime;
    if (published) p.published = published;
    if (c.modifiedTime) p.updated = c.modifiedTime;
    var tags = strings(d, TAG_FIELDS);
    if (tags.length) p.tags = tags;
    var authors = strings(d, AUTHOR_FIELDS);
    if (authors.length) p.authors = authors;
    if (c.language) p.lang = c.language;
    posts.push(p);
  }
  var site = { name: o.site && o.site.displayName, url: o.siteUrl ? String(o.siteUrl).replace(/\/*$/, '/') : undefined };
  var description = o.site && o.site.data && text(o.site.data.description);
  if (description) site.description = description;
  return { version: 1, generator: 'agentprose Enonic XP app', generated: o.generated, site: site, posts: posts };
}

exports.query = query;
exports.build = build;
exports.text = text;
