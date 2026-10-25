import type { ContentAdapter } from 'agentprose'
import { sanity, type SanityOptions } from 'agentprose/adapters/sanity'

/** The plugin options (all optional). */
export interface AgentproseConfig {
  /** Document type of posts. Default "post". */
  type?: string
  /**
   * Where posts live on your website, e.g. "https://example.com/blog/\{slug\}/". Used for the install
   * snippet, the post URLs agents get, and the CORS check.
   */
  urlPattern?: string
  /** GROQ projection, only if your schema differs from Sanity's blog template / Next.js starter. */
  projection?: string
  /** API version date used by the website script. Default "2025-02-19". */
  apiVersion?: string
  /** Tool title in the Studio navbar. Default "AI agents". */
  title?: string
}

export const DEFAULT_API_VERSION = '2025-02-19'
export const CDN = 'https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js'

/** Minimal shape of the Studio client this plugin uses. */
export interface StudioClient {
  fetch: (query: string, params?: Record<string, unknown>) => Promise<any>
  request?: (o: { uri: string; withCredentials?: boolean }) => Promise<any>
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** The one-line install for the website, with this project's settings filled in. */
export function scriptSnippet(o: { projectId: string; dataset: string; config?: AgentproseConfig }): string {
  const c = o.config || {}
  const attrs: [string, string | undefined][] = [
    ['data-adapter', 'sanity'],
    ['data-project', o.projectId],
    ['data-dataset', o.dataset],
    ['data-type', c.type && c.type !== 'post' ? c.type : undefined],
    ['data-url-pattern', c.urlPattern],
    ['data-api-version', c.apiVersion && c.apiVersion !== DEFAULT_API_VERSION ? c.apiVersion : undefined],
  ]
  return `<script src="${CDN}" defer ${attrs
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(' ')}></script>`
}

/** The same setup for a bundled site (Next.js, Astro, …). */
export function npmSnippet(o: { projectId: string; dataset: string; config?: AgentproseConfig }): string {
  const c = o.config || {}
  const opts = [`projectId: '${o.projectId}'`, `dataset: '${o.dataset}'`, c.type && c.type !== 'post' && `type: '${c.type}'`, c.urlPattern && `urlPattern: '${c.urlPattern}'`]
    .filter(Boolean)
    .join(', ')
  return `import { createAgentTools } from 'agentprose'\nimport { sanity } from 'agentprose/adapters/sanity'\n\ncreateAgentTools({ adapter: sanity({ ${opts} }) })`
}

/**
 * A fetch that answers the adapter's Content Lake URLs through the Studio client, so the preview runs
 * the exact GROQ the website will run, without CORS and against the published perspective.
 * Works with every agentprose version (older ones have no `client` option).
 */
export function clientFetch(client: StudioClient): typeof fetch {
  return async (input: RequestInfo | URL) => {
    const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const params: Record<string, unknown> = {}
    u.searchParams.forEach((v, k) => {
      if (k.startsWith('$') && v !== 'undefined') params[k.slice(1)] = JSON.parse(v)
    })
    const result = await client.fetch(u.searchParams.get('query') || '', params)
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

/** The adapter the website script will use, pointed at this Studio's project and dataset. */
export function previewAdapter(client: StudioClient, o: { projectId: string; dataset: string; config?: AgentproseConfig }): ContentAdapter {
  const c = o.config || {}
  const opts: SanityOptions & { client?: StudioClient } = {
    projectId: o.projectId,
    dataset: o.dataset,
    type: c.type,
    projection: c.projection,
    apiVersion: c.apiVersion,
    urlPattern: c.urlPattern || '/posts/{slug}/',
    client,
    fetch: clientFetch(client),
  }
  return sanity(opts)
}

/** What the website needs from the project: a public dataset (or a proxy) and its origin in CORS. */
export async function checkSetup(client: StudioClient, o: { dataset: string; config?: AgentproseConfig }) {
  const out: { dataset?: 'public' | 'private' | 'unknown'; corsOrigin?: string; corsAllowed?: boolean } = {}
  if (!client.request) return out
  try {
    const ds: { name: string; aclMode: string }[] = await client.request({ uri: '/datasets', withCredentials: true })
    const d = ds.find((x) => x.name === o.dataset)
    out.dataset = d ? (d.aclMode === 'public' ? 'public' : 'private') : 'unknown'
  } catch {
    out.dataset = 'unknown'
  }
  const pattern = o.config?.urlPattern
  if (pattern && /^https?:\/\//.test(pattern)) {
    out.corsOrigin = new URL(pattern.replace(/\{[^}]+\}/g, 'x')).origin
    try {
      const cors: { origin: string }[] = await client.request({ uri: '/cors', withCredentials: true })
      out.corsAllowed = cors.some((c) => c.origin === out.corsOrigin || c.origin === '*' || (c.origin.includes('*') && new RegExp('^' + c.origin.replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$').test(out.corsOrigin!)))
    } catch {
      /* no access to project settings: skip the check */
    }
  }
  return out
}
