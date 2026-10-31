var portal = require('/lib/xp/portal');
var content = require('/lib/xp/content');

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.get = function () {
  var c = portal.getContent();
  var site = portal.getSite();
  var main;
  if (c.type === app.name + ':article') {
    main = '<article><h1>' + esc(c.displayName) + '</h1><p class="lead">' + esc(c.data.preface) + '</p>' +
      '<p class="byline">By ' + esc(c.data.author) + '</p>' + portal.processHtml({ value: c.data.text || '' }) + '</article>';
  } else {
    var r = content.query({ count: 20, query: "type = '" + app.name + ":article' AND _path LIKE '/content" + site._path + "/*'", sort: 'publish.first DESC' });
    main = '<h1>' + esc(site.displayName) + '</h1><ul>' + r.hits.map(function (h) {
      return '<li><a href="' + portal.pageUrl({ id: h._id }) + '">' + esc(h.displayName) + '</a> - ' + esc(h.data.preface) + '</li>';
    }).join('') + '</ul>';
  }
  return {
    body: '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(c.displayName) + '</title></head><body><main>' + main + '</main></body></html>',
    contentType: 'text/html',
  };
};
