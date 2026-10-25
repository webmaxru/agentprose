import type { ContentAdapter, ListOptions, Post } from '../core/types';
import { toMarkdown } from '../core/markdown';
import { parseHtml } from '../core/util';
import { type BaseOptions, via, finish, getJson, lim, pick, postUrl } from './_shared';

export interface EnonicOptions extends BaseOptions {
  /** Guillotine GraphQL endpoint, e.g. https://example.com/site/myproject/master (or /api for the Guillotine app). */
  endpoint: string;
  /** Content type of posts, e.g. "com.example.myapp:article". */
  contentType: string;
  /**
   * Site key (id or path, e.g. "/my-site"): the scope for page URLs. Sent as the `scopeKey` argument
   * (Guillotine 8+, XP 8) or the X-Guillotine-SiteKey header (Guillotine 7, XP 7).
   */
  siteKey?: string;
  /** Project and branch, only for the shared /api endpoint of Guillotine 8+ (a site-mounted endpoint fixes both). */
  project?: string;
  branch?: string;
  /** Paths inside dataAsJson. Defaults fit Enonic's starters. */
  fields?: { body?: string; summary?: string; tags?: string; author?: string; published?: string; image?: string };
}

// Guillotine 8+ (XP 8) returns pageUrl as parts; Guillotine 7 (XP 7) as a string with a type argument.
const BASE = `_id _name _path type displayName language modifiedTime dataAsJson publish { first from }`;
const FIELDS = { 8: `${BASE} pageUrl { baseUrl path queryString }`, 7: `${BASE} pageUrl(type: absolute)` };
const OTHER_SHAPE = /PageUrl|pageUrl|Unknown field argument 'type'|scopeKey/;

/** Enonic XP via Guillotine GraphQL (Query DSL). https://developer.enonic.com/docs/guillotine/stable/usage */
export function enonic(o: EnonicOptions): ContentAdapter {
  const f = o.fetch || fetch.bind(globalThis);
  const F = { body: 'text', summary: 'preface', tags: 'tags', author: 'author', published: '', image: '', ...o.fields };
  // Site root for site-mounted endpoints (…/my-site/_/com.enonic.app.guillotine:graphql): page paths are relative to it.
  const root = /\/_\//.test(o.endpoint) ? o.endpoint.split('/_/')[0] : '';
  let shape: 7 | 8 = 8;
  const send = async (query: (v: 7 | 8) => string, variables: Record<string, unknown>, v: 7 | 8) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (o.siteKey && v === 7) headers['X-Guillotine-SiteKey'] = o.siteKey;
    const { json } = await getJson(f, via(o, o.endpoint), { method: 'POST', headers, body: JSON.stringify({ query: query(v), variables }) });
    return json;
  };
  const gql = async (query: (v: 7 | 8) => string, variables: Record<string, unknown>) => {
    let json = await send(query, variables, shape);
    // Unknown server version: a validation error naming the other schema's fields means "try the other shape".
    if (json.errors?.length && OTHER_SHAPE.test(json.errors[0].message || '')) {
      const other = shape === 8 ? 7 : 8;
      const retry = await send(query, variables, other);
      if (!retry.errors?.length) shape = other;
      json = retry;
    }
    if (json.errors?.length) throw new Error('Guillotine: ' + json.errors[0].message);
    return json.data.guillotine;
  };
  // guillotine(...) arguments, Guillotine 8+ only.
  const scope = (v: 7 | 8) => {
    if (v === 7) return '';
    const args = [o.siteKey && `scopeKey: ${JSON.stringify(o.siteKey)}`, o.project && `project: ${JSON.stringify(o.project)}`, o.project && `branch: ${JSON.stringify(o.branch || 'master')}`].filter(Boolean);
    return args.length ? `(${args.join(', ')})` : '';
  };
  const pageUrl = (u: any): string | undefined => {
    if (!u) return undefined;
    if (typeof u === 'string') return u;
    if (u.path == null) return undefined;
    const path = u.path + (u.queryString ? (u.queryString.startsWith('?') ? '' : '?') + u.queryString : '');
    const base = u.baseUrl || root || (typeof location !== 'undefined' ? location.origin : '');
    return base.replace(/\/+$/, '') + (path.startsWith('/') ? path : '/' + path) || undefined;
  };
  const map = (c: any): Post => {
    const d = c.dataAsJson || {};
    const body = pick(d, F.body);
    const url = (!o.urlPattern && pageUrl(c.pageUrl)) || postUrl(o.urlPattern, c._name);
    const list = (v: any) => [].concat(v || []).filter((x) => typeof x === 'string') as string[];
    return finish({
      url,
      id: c._id,
      slug: c._name,
      title: c.displayName,
      summary: typeof pick(d, F.summary) === 'string' ? pick(d, F.summary).replace(/<[^>]+>/g, '') : undefined,
      published: (F.published && pick(d, F.published)) || c.publish?.first || c.publish?.from,
      updated: c.modifiedTime,
      lang: c.language,
      tags: list(pick(d, F.tags)),
      authors: list(pick(d, F.author)).filter((a) => !/^[0-9a-f-]{36}$/.test(a)),
      markdown: typeof body === 'string' ? (/<[a-z]/i.test(body) ? toMarkdown(parseHtml(body).body, url) : body) : undefined,
      source: 'enonic',
    });
  };
  const must = (x: ListOptions, extra: unknown[] = []) => ({
    boolean: {
      must: [
        { term: { field: 'type', value: { string: o.contentType } } },
        // Query DSL searches the whole project: keep to this site when the site key is a path.
        ...(o.siteKey?.startsWith('/') ? [{ like: { field: '_path', value: '/content' + o.siteKey.replace(/\/+$/, '') + '/*' } }] : []),
        ...(x.tag ? [{ term: { field: `data.${F.tags}`, value: { string: x.tag } } }] : []),
        ...(x.since || x.until ? [{ range: { field: 'publish.first', ...(x.since ? { gte: { instant: new Date(x.since).toISOString() } } : {}), ...(x.until ? { lte: { instant: new Date(x.until).toISOString() } } : {}) } }] : []),
        ...extra,
      ],
    },
  });
  const run = async (query: unknown, x: ListOptions, sort?: unknown) => {
    const limit = lim(x, 20, 100);
    const g = await gql(
      (v) => `query($q: QueryDSLInput!, $first: Int, $offset: Int, $sort: [SortDslInput]) { guillotine${scope(v)} { queryDsl(query: $q, first: $first, offset: $offset, sort: $sort) { ${FIELDS[v]} } } }`,
      { q: query, first: limit, offset: x.offset || 0, sort: sort ? [sort] : undefined },
    );
    return (g.queryDsl || []).map(map);
  };
  return {
    name: 'enonic',
    async list(x: ListOptions = {}) {
      return { items: await run(must(x), x, { field: 'publish.first', direction: x.sort === 'oldest' ? 'ASC' : 'DESC' }) };
    },
    async search(q: string, x: ListOptions = {}) {
      return { items: await run(must(x, [{ fulltext: { fields: ['displayName^3', `data.${F.summary}`, `data.${F.body}`], query: q, operator: 'AND' } }]), x) };
    },
    async get(ref) {
      if (ref.id) {
        const g = await gql((v) => `query($k: ID) { guillotine${scope(v)} { get(key: $k) { ${FIELDS[v]} } } }`, { k: ref.id });
        // Only posts: an id of another content type (a folder, the site) is not a post.
        return g.get && (!g.get.type || g.get.type === o.contentType) ? map(g.get) : null;
      }
      const name = ref.slug || (ref.url ? new URL(ref.url, location.href).pathname.split('/').filter(Boolean).pop() : '');
      const r = await run(must({}, [{ term: { field: '_name', value: { string: name } } }]), { limit: 1 });
      return r[0] || null;
    },
  };
}

/** Script-tag factory: data-endpoint, data-content-type, data-site-key, data-url-pattern, data-project, data-branch. */
export const fromAttributes = (a: Record<string, string>) =>
  enonic({ proxy: a.proxy, endpoint: a.endpoint || a.api, contentType: a.contentType, siteKey: a.siteKey, urlPattern: a.urlPattern, project: a.project, branch: a.branch });
