import { describe, expect, it } from 'vitest'
import { checkSetup, clientFetch, npmSnippet, previewAdapter, scriptSnippet } from '../src/lib'
import { fakeClient } from './fixtures'

const P = { projectId: 'abc123', dataset: 'production' }

describe('install snippets', () => {
  it('script tag carries this project, and only non-default options', () => {
    expect(scriptSnippet(P)).toBe('<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer data-adapter="sanity" data-project="abc123" data-dataset="production"></script>')
    const s = scriptSnippet({ ...P, config: { type: 'article', urlPattern: 'https://ex.com/blog/{slug}/', apiVersion: '2026-01-01' } })
    expect(s).toContain('data-type="article"')
    expect(s).toContain('data-url-pattern="https://ex.com/blog/{slug}/"')
    expect(s).toContain('data-api-version="2026-01-01"')
    expect(scriptSnippet({ ...P, config: { urlPattern: '"><x' } })).not.toContain('"><x')
  })
  it('npm snippet uses the documented entry points', () => {
    expect(npmSnippet({ ...P, config: { urlPattern: 'https://ex.com/{slug}' } })).toContain("sanity({ projectId: 'abc123', dataset: 'production', urlPattern: 'https://ex.com/{slug}' })")
  })
})

describe('preview through the Studio client (real GROQ via groq-js)', () => {
  it('lists published posts only, newest first, with URLs from urlPattern', async () => {
    const a = previewAdapter(fakeClient(), { ...P, config: { urlPattern: 'https://ex.com/blog/{slug}/' } })
    const r = await a.list({ limit: 10 })
    expect(r.items.map((p) => p.title)).toEqual(['Fjords, structured', 'Agents read blogs now'])
    expect(r.items[1]).toMatchObject({ url: 'https://ex.com/blog/agents-read-blogs/', tags: ['WebMCP'], authors: ['Ada Lovelace'], summary: 'Why WebMCP matters.' })
  })
  it('searches and reads a post as markdown, never sending undefined params', async () => {
    const c = fakeClient()
    const a = previewAdapter(c, P)
    expect((await a.search!('fjord')).items.map((p) => p.title)).toEqual(['Fjords, structured'])
    const post = await a.get({ slug: 'agents-read-blogs' })
    expect(post?.markdown).toBe('## Why agents\n\nStructured tools for reading a site.')
    expect(await a.get({ slug: 'draft' })).toBeNull()
    for (const q of c.queries) expect(Object.values(q.params)).not.toContain(undefined)
  })
  it('clientFetch answers Content Lake URLs with the client result', async () => {
    const f = clientFetch(fakeClient())
    const u = new URL('https://abc123.apicdn.sanity.io/v2025-02-19/data/query/production')
    u.searchParams.set('query', 'count(*[_type == $t])')
    u.searchParams.set('$t', '"post"')
    u.searchParams.set('$id', 'undefined')
    expect(await (await f(u)).json()).toEqual({ result: 2 })
  })
})

describe('setup checks', () => {
  it('flags a private dataset and a website origin missing from CORS', async () => {
    expect(await checkSetup(fakeClient({ aclMode: 'private' }), { dataset: 'production', config: { urlPattern: 'https://ex.com/blog/{slug}/' } })).toEqual({ dataset: 'private', corsOrigin: 'https://ex.com', corsAllowed: false })
  })
  it('accepts an exact or wildcard CORS origin', async () => {
    expect((await checkSetup(fakeClient({ cors: ['https://ex.com'] }), { dataset: 'production', config: { urlPattern: 'https://ex.com/{slug}' } })).corsAllowed).toBe(true)
    expect((await checkSetup(fakeClient({ cors: ['https://*.ex.com'] }), { dataset: 'production', config: { urlPattern: 'https://www.ex.com/{slug}' } })).corsAllowed).toBe(true)
    expect(await checkSetup(fakeClient(), { dataset: 'production' })).toEqual({ dataset: 'public' })
  })
})
