import { describe, expect, it } from 'vitest';
import { parse, evaluate } from 'groq-js';
import { sanity } from '../../src/adapters/sanity';

/**
 * Runs the adapter's real GROQ against an in-memory dataset with groq-js (Sanity's own GROQ engine),
 * so query syntax and semantics are checked, not just the URL. Two schemas: Sanity's "blog" Studio
 * template (body, mainImage, publishedAt, categories, author) and the Next.js starter
 * (content, coverImage, date, excerpt, author).
 */
const block = (text: string, style = 'normal', marks: string[] = []) => ({ _type: 'block', _key: text.slice(0, 8), style, markDefs: [], children: [{ _type: 'span', _key: 's', text, marks }] });
const DATA: any[] = [
  { _id: 'author-ada', _type: 'author', name: 'Ada Lovelace' },
  { _id: 'author-bo', _type: 'author', name: 'Bo Ek' },
  { _id: 'cat-webmcp', _type: 'category', title: 'WebMCP' },
  { _id: 'cat-cms', _type: 'category', title: 'CMS' },
  { _id: 'img-1', _type: 'sanity.imageAsset', url: 'https://cdn.sanity.io/images/p1/production/img-1.png' },
  {
    _id: 'post-1', _type: 'post', _createdAt: '2026-09-01T08:00:00Z', _updatedAt: '2026-09-03T08:00:00Z',
    title: 'Agents read blogs now', slug: { _type: 'slug', current: 'agents-read-blogs' }, publishedAt: '2026-09-02T08:00:00Z',
    author: { _type: 'reference', _ref: 'author-ada' }, categories: [{ _type: 'reference', _ref: 'cat-webmcp' }],
    mainImage: { _type: 'image', asset: { _type: 'reference', _ref: 'img-1' }, alt: 'cover' },
    body: [block('Why agents', 'h2'), block('WebMCP gives agents structured tools for reading a site.'), { _type: 'image', _key: 'im', asset: { _type: 'reference', _ref: 'img-1' }, alt: 'diagram' }],
  },
  {
    _id: 'post-2', _type: 'post', _createdAt: '2026-10-01T08:00:00Z', _updatedAt: '2026-10-01T09:00:00Z',
    title: 'Headless CMS notes', slug: { _type: 'slug', current: 'headless-notes' }, publishedAt: '2026-10-01T08:00:00Z', excerpt: 'Short notes on headless CMSes.',
    authors: [{ _type: 'reference', _ref: 'author-ada' }, { _type: 'reference', _ref: 'author-bo' }], categories: [{ _type: 'reference', _ref: 'cat-cms' }],
    body: [block('Content lakes and GROQ.', 'normal', ['strong'])],
  },
  // Next.js starter shape: content/coverImage/date instead of body/mainImage/publishedAt
  {
    _id: 'post-3', _type: 'post', _createdAt: '2026-08-01T08:00:00Z', _updatedAt: '2026-08-01T08:00:00Z',
    title: 'Starter shaped post', slug: { _type: 'slug', current: 'starter-post' }, date: '2026-08-01T08:00:00Z', excerpt: 'From the Next.js starter.',
    author: { _type: 'reference', _ref: 'author-bo' }, coverImage: { _type: 'image', asset: { _type: 'reference', _ref: 'img-1' } },
    content: [block('Starter body text about agents.')],
  },
  // never listed: draft copy, a post without slug, another type
  { _id: 'drafts.post-1', _type: 'post', title: 'DRAFT agents', slug: { current: 'agents-read-blogs' }, body: [block('draft')] },
  { _id: 'post-noslug', _type: 'post', title: 'No slug yet' },
  { _id: 'page-1', _type: 'page', title: 'About agents', slug: { current: 'about' } },
];

function groqFetch() {
  const calls: URL[] = [];
  const f = (async (input: RequestInfo | URL) => {
    const u = new URL(String(input));
    calls.push(u);
    const params: Record<string, unknown> = {};
    u.searchParams.forEach((v, k) => { if (k.startsWith('$')) params[k.slice(1)] = JSON.parse(v); });
    const tree = parse(u.searchParams.get('query')!, { params });
    const result = await (await evaluate(tree, { dataset: DATA, params })).get();
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { f, calls };
}

describe('sanity adapter against a real GROQ engine', () => {
  const g = groqFetch();
  const a = sanity({ projectId: 'p1', urlPattern: 'https://site.ex/blog/{slug}/', fetch: g.f });

  it('lists published posts newest first, skipping drafts, slugless posts and other types', async () => {
    const r = await a.list();
    expect(r.total).toBe(3);
    expect(r.items.map((p) => p.slug)).toEqual(['headless-notes', 'agents-read-blogs', 'starter-post']);
    expect(r.items[1]).toMatchObject({ title: 'Agents read blogs now', url: 'https://site.ex/blog/agents-read-blogs/', authors: ['Ada Lovelace'], tags: ['WebMCP'], image: 'https://cdn.sanity.io/images/p1/production/img-1.png' });
    expect(r.items[0].authors).toEqual(['Ada Lovelace', 'Bo Ek']);
  });

  it('fills summary from excerpt, else from the body text', async () => {
    const r = await a.list();
    expect(r.items[0].summary).toBe('Short notes on headless CMSes.');
    expect(r.items[1].summary).toMatch(/^Why agents/);
  });

  it('understands the Next.js starter schema (date, coverImage, content)', async () => {
    const p = await a.get({ slug: 'starter-post' });
    expect(p).toMatchObject({ title: 'Starter shaped post', published: '2026-08-01T08:00:00.000Z', authors: ['Bo Ek'], image: 'https://cdn.sanity.io/images/p1/production/img-1.png' });
    expect(p?.markdown).toContain('Starter body text about agents.');
  });

  it('pages, sorts oldest first and filters by tag, author and date', async () => {
    expect((await a.list({ sort: 'oldest', limit: 1 })).items.map((p) => p.slug)).toEqual(['starter-post']);
    expect((await a.list({ limit: 1, offset: 1 })).items.map((p) => p.slug)).toEqual(['agents-read-blogs']);
    expect((await a.list({ tag: 'CMS' })).items.map((p) => p.slug)).toEqual(['headless-notes']);
    expect((await a.list({ author: 'Bo Ek' })).items.map((p) => p.slug).sort()).toEqual(['headless-notes', 'starter-post']);
    expect((await a.list({ since: '2026-09-15' })).items.map((p) => p.slug)).toEqual(['headless-notes']);
    expect((await a.list({ until: '2026-08-15' })).items.map((p) => p.slug)).toEqual(['starter-post']);
  });

  it('searches titles and body text with ranking, without drafts', async () => {
    const r = await a.search!('agents');
    const slugs = r.items.map((p) => p.slug);
    expect(slugs[0]).toBe('agents-read-blogs');
    expect(slugs).toContain('starter-post');
    expect(slugs).not.toContain('about');
    expect(r.items.every((p) => !p.title.startsWith('DRAFT'))).toBe(true);
  });

  it('gets a full post by slug, id or URL and renders Portable Text with images', async () => {
    const p = await a.get({ slug: 'agents-read-blogs' });
    expect(p?.title).toBe('Agents read blogs now');
    expect(p?.markdown).toContain('## Why agents');
    expect(p?.markdown).toContain('WebMCP gives agents structured tools');
    expect(p?.markdown).toContain('![diagram](https://cdn.sanity.io/images/p1/production/img-1.png)');
    expect((await a.get({ id: 'post-2' }))?.markdown).toBe('**Content lakes and GROQ.**');
    expect((await a.get({ url: 'https://site.ex/blog/headless-notes/' }))?.slug).toBe('headless-notes');
    expect(await a.get({ slug: 'about' })).toBeNull();
    expect(await a.get({ id: 'drafts.post-1' })).toBeNull();
  });

  it('counts tags and authors from references', async () => {
    const t = await a.taxonomies!();
    expect(t.tags).toEqual(expect.arrayContaining([{ name: 'WebMCP', count: 1 }, { name: 'CMS', count: 1 }]));
    expect(t.authors).toEqual(expect.arrayContaining([{ name: 'Ada Lovelace', count: 2 }, { name: 'Bo Ek', count: 2 }]));
  });

  it('asks for the published perspective explicitly', async () => {
    await a.list();
    expect(g.calls.at(-1)!.searchParams.get('perspective')).toBe('published');
  });

  it('runs through a client (e.g. @sanity/client or the Studio client) without building URLs', async () => {
    const seen: string[] = [];
    const client = {
      fetch: async (query: string, params: Record<string, unknown> = {}) => {
        seen.push(query);
        expect(Object.values(params)).not.toContain(undefined);
        return (await evaluate(parse(query, { params }), { dataset: DATA, params })).get();
      },
    };
    const c = sanity({ projectId: 'p1', client, fetch: () => Promise.reject(new Error('fetch must not be used')) });
    expect((await c.list()).total).toBe(3);
    expect((await c.get({ slug: 'headless-notes' }))?.title).toBe('Headless CMS notes');
    expect(seen.length).toBe(2);
  });
});
