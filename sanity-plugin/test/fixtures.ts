import { evaluate, parse } from 'groq-js'

const block = (text: string, style = 'normal') => ({ _type: 'block', _key: text.slice(0, 6), style, markDefs: [], children: [{ _type: 'span', _key: 's', text, marks: [] }] })

/** A small published dataset in Sanity's blog-template shape, plus a draft that must never show. */
export const DATA: any[] = [
  { _id: 'author-ada', _type: 'author', name: 'Ada Lovelace' },
  { _id: 'cat-webmcp', _type: 'category', title: 'WebMCP' },
  { _id: 'post-1', _type: 'post', _createdAt: '2026-09-01T08:00:00Z', _updatedAt: '2026-09-02T08:00:00Z', title: 'Agents read blogs now', slug: { current: 'agents-read-blogs' }, publishedAt: '2026-09-02T08:00:00Z', excerpt: 'Why WebMCP matters.', author: { _type: 'reference', _ref: 'author-ada' }, categories: [{ _type: 'reference', _ref: 'cat-webmcp' }], body: [block('Why agents', 'h2'), block('Structured tools for reading a site.')] },
  { _id: 'post-2', _type: 'post', _createdAt: '2026-10-01T08:00:00Z', _updatedAt: '2026-10-01T08:00:00Z', title: 'Fjords, structured', slug: { current: 'fjords' }, publishedAt: '2026-10-01T08:00:00Z', body: [block('Geirangerfjord is on the UNESCO list.')] },
  { _id: 'drafts.post-3', _type: 'post', title: 'Secret draft', slug: { current: 'draft' }, body: [block('draft')] },
]

/** A stand-in for the Studio client: real GROQ (groq-js) over DATA, and project-settings endpoints. */
export function fakeClient(o: { aclMode?: string; cors?: string[] } = {}) {
  const queries: { query: string; params: Record<string, unknown> }[] = []
  const client = {
    queries,
    async fetch(query: string, params: Record<string, unknown> = {}) {
      queries.push({ query, params })
      for (const v of Object.values(params)) if (v === undefined) throw new Error('undefined param')
      return (await evaluate(parse(query, { params }), { dataset: DATA.filter((d) => !d._id.startsWith('drafts.')), params })).get()
    },
    async request({ uri }: { uri: string }) {
      if (uri === '/datasets') return [{ name: 'production', aclMode: o.aclMode || 'public' }]
      if (uri === '/cors') return (o.cors || []).map((origin) => ({ origin, allowCredentials: false }))
      throw new Error('unexpected ' + uri)
    },
    withConfig() {
      return client
    },
    config: () => ({ projectId: 'abc123', dataset: 'production' }),
  }
  return client
}
