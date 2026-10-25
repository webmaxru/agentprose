import { useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'
import { Badge, Box, Button, Card, Container, Flex, Heading, Stack, Text, TextInput } from '@sanity/ui'
import { Code } from '@sanity/ui/code'
import { CopyIcon } from '@sanity/icons/Copy'
import { SearchIcon } from '@sanity/icons/Search'
import { checkSetup, DEFAULT_API_VERSION, npmSnippet, previewAdapter, scriptSnippet, type AgentproseConfig, type StudioClient } from './lib'

interface Item {
  url: string
  title: string
  published?: string
  tags?: string[]
  summary?: string
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Stack gap={2}>
      <Flex align="center" justify="space-between">
        <Text size={1} weight="semibold">
          {label}
        </Text>
        <Button
          fontSize={1}
          mode="ghost"
          icon={CopyIcon}
          text={copied ? 'Copied' : 'Copy'}
          onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}
        />
      </Flex>
      <Card padding={3} radius={2} tone="transparent" border overflow="auto">
        <Code size={1} language="html">
          {text}
        </Code>
      </Card>
    </Stack>
  )
}

/** The Studio tool: what agents will read from this dataset, and how to put agentprose on the website. */
export function AgentproseTool(props: { config?: AgentproseConfig; tool?: { options?: AgentproseConfig } }) {
  const config = useMemo<AgentproseConfig>(() => props.config || props.tool?.options || {}, [props.config, props.tool])
  const studioClient = useClient({ apiVersion: config.apiVersion || DEFAULT_API_VERSION })
  // Published perspective, uncached: what an anonymous visitor's agent gets right now.
  // The Studio's SanityClient has the two methods StudioClient names; the cast only narrows its type.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const client = useMemo(() => studioClient.withConfig({ perspective: 'published', useCdn: false }) as unknown as StudioClient, [studioClient])
  const { projectId = '', dataset = '' } = studioClient.config()
  const adapter = useMemo(() => previewAdapter(client, { projectId, dataset, config }), [client, projectId, dataset, config])

  const [items, setItems] = useState<Item[] | null>(null)
  const [total, setTotal] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<{ title: string; url: string; markdown?: string } | null>(null)
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof checkSetup>>>({})

  useEffect(() => {
    let live = true
    adapter
      .list({ limit: 10 })
      .then((r) => live && (setItems(r.items as Item[]), setTotal(r.total)))
      .catch((e) => live && setError(String(e?.message || e)))
    void checkSetup(client, { dataset, config }).then((s) => live && setSetup(s))
    return () => {
      live = false
    }
  }, [adapter, client, dataset, config])

  const search = () => {
    setError(null)
    setOpen(null)
    const run = query.trim() ? adapter.search!(query.trim(), { limit: 10 }) : adapter.list({ limit: 10 })
    run.then((r: any) => (setItems(r.items), setTotal(r.total))).catch((e: any) => setError(String(e?.message || e)))
  }
  const read = (p: Item) => {
    const slug = p.url.replace(/\/+$/, '').split('/').pop()
    adapter
      .get({ url: p.url, slug })
      .then((post) => setOpen(post ? { title: post.title, url: post.url, markdown: post.markdown } : { title: p.title, url: p.url, markdown: '(not found)' }))
      .catch((e) => setError(String(e?.message || e)))
  }

  return (
    <Container width={3} padding={4}>
      <Stack gap={5}>
        <Stack gap={3}>
          <Heading as="h1" size={3}>
            AI agents
          </Heading>
          <Text muted size={2}>
            agentprose gives AI agents in your visitors' browsers read-only WebMCP tools for this content: list, search and read
            posts, with citations. Below is exactly what they get from the <code>{dataset}</code> dataset.
          </Text>
        </Stack>

        <Card padding={4} radius={3} border>
          <Stack gap={4}>
            <Flex align="center" gap={2} wrap="wrap">
              <Heading as="h2" size={1}>
                What agents read
              </Heading>
              {total !== undefined && <Badge tone="primary">{total} published</Badge>}
              <Badge>type: {config.type || 'post'}</Badge>
            </Flex>
            <Flex gap={2}>
              <Box flex={1}>
                <TextInput
                  icon={SearchIcon}
                  placeholder="Search like an agent would (search_posts)"
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                />
              </Box>
              <Button text="Search" tone="primary" onClick={search} />
            </Flex>
            {error && (
              <Card padding={3} tone="critical" radius={2}>
                <Text size={1}>{error}</Text>
              </Card>
            )}
            {items && !items.length && (
              <Card padding={3} tone="caution" radius={2}>
                <Text size={1}>No published documents of type "{config.type || 'post'}" with a slug. Set the type option if your posts use another name.</Text>
              </Card>
            )}
            <Stack gap={2} data-testid="agentprose-items">
              {(items || []).map((p) => (
                <Card key={p.url} padding={3} radius={2} border as="button" onClick={() => read(p)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                  <Stack gap={2}>
                    <Text weight="semibold">{p.title}</Text>
                    <Text size={1} muted>
                      {[p.published?.slice(0, 10), p.url, (p.tags || []).join(', ')].filter(Boolean).join(' · ')}
                    </Text>
                    {p.summary && (
                      <Text size={1} muted textOverflow="ellipsis">
                        {p.summary}
                      </Text>
                    )}
                  </Stack>
                </Card>
              ))}
            </Stack>
            {open && (
              <Card padding={3} radius={2} tone="primary" border data-testid="agentprose-post">
                <Stack gap={3}>
                  <Text size={1} weight="semibold">
                    get_post → {open.title}
                  </Text>
                  <Code size={1} language="markdown" style={{ whiteSpace: 'pre-wrap' }}>
                    {open.markdown || ''}
                  </Code>
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>

        <Card padding={4} radius={3} border>
          <Stack gap={4}>
            <Heading as="h2" size={1}>
              Put it on your website
            </Heading>
            <CopyBlock label="Script tag (any site)" text={scriptSnippet({ projectId, dataset, config })} />
            <CopyBlock label="npm (Next.js, Astro, …)" text={npmSnippet({ projectId, dataset, config })} />
            <Stack gap={2}>
              {setup.dataset === 'private' && (
                <Card padding={3} tone="caution" radius={2}>
                  <Text size={1}>
                    This dataset is private, so visitors' browsers cannot read it. Use agentprose's proxy mode (a small server route that adds a read
                    token) or make the dataset public.
                  </Text>
                </Card>
              )}
              {setup.corsOrigin && setup.corsAllowed === false && (
                <Card padding={3} tone="caution" radius={2}>
                  <Text size={1}>
                    Add {setup.corsOrigin} to this project's CORS origins (manage.sanity.io → API → CORS origins, no credentials needed).
                  </Text>
                </Card>
              )}
              {setup.corsOrigin && setup.corsAllowed && (
                <Card padding={3} tone="positive" radius={2}>
                  <Text size={1}>{setup.corsOrigin} is allowed in CORS.</Text>
                </Card>
              )}
              {!config.urlPattern && (
                <Card padding={3} tone="default" radius={2} border>
                  <Text size={1} muted>
                    Tip: set urlPattern in the plugin options (for example https://example.com/blog/{'{slug}'}/) so agents get real post URLs.
                  </Text>
                </Card>
              )}
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
