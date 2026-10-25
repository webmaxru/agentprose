/* oxlint-disable typescript/no-unsafe-type-assertion -- the plugin object is inspected as plain data */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeClient } from './fixtures'

const client = fakeClient({ cors: [] })
vi.mock('sanity', () => ({ useClient: () => client, definePlugin: (f: any) => f }))

const { AgentproseTool } = await import('../src/AgentproseTool')
const { agentprose } = await import('../src/index')

afterEach(cleanup)
const theme = buildTheme()
const mount = (config = {}) => render(<ThemeProvider theme={theme}><AgentproseTool config={config} /></ThemeProvider>)

describe('AI agents tool', () => {
  it('shows the published posts agents will list, and the install snippet for this project', async () => {
    mount({ urlPattern: 'https://ex.com/blog/{slug}/' })
    await waitFor(() => expect(screen.getByText('Agents read blogs now')).toBeTruthy())
    expect(screen.getByText('Fjords, structured')).toBeTruthy()
    expect(screen.queryByText('Secret draft')).toBeNull()
    expect(screen.getByText('2 published')).toBeTruthy()
    expect(document.body.textContent).toContain('data-project="abc123"')
    await waitFor(() => expect(document.body.textContent).toContain('Add https://ex.com to this project'))
  })
  it('searches like search_posts and opens a post like get_post', async () => {
    mount()
    await waitFor(() => screen.getByText('Agents read blogs now'))
    fireEvent.change(screen.getByPlaceholderText(/Search like an agent/), { target: { value: 'fjord' } })
    await act(async () => fireEvent.click(screen.getByText('Search')))
    await waitFor(() => expect(screen.queryByText('Agents read blogs now')).toBeNull())
    await act(async () => fireEvent.click(screen.getByText('Fjords, structured')))
    await waitFor(() => expect(screen.getByTestId('agentprose-post').textContent).toContain('Geirangerfjord is on the UNESCO list.'))
    expect(document.body.textContent).toContain('Tip: set urlPattern')
  })
  it('reads its options from the Studio tool props', async () => {
    render(<ThemeProvider theme={theme}><AgentproseTool tool={{ options: { urlPattern: 'https://tool.example/{slug}' } }} /></ThemeProvider>)
    await waitFor(() => expect(document.body.textContent).toContain('data-url-pattern="https://tool.example/{slug}"'))
  })
  it('registers one Studio tool with a configurable title', () => {
    const p: any = (agentprose as any)({ title: 'Agents' })
    expect(p.name).toBe('sanity-plugin-agentprose')
    expect(p.tools.map((t: any) => [t.name, t.title, t.options])).toEqual([['agentprose', 'Agents', { title: 'Agents' }]])
    expect((agentprose as any)().tools[0].title).toBe('AI agents')
  })
})
