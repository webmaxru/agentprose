import { definePlugin } from 'sanity'
import { RobotIcon } from '@sanity/icons/Robot'
import { AgentproseTool } from './AgentproseTool'
import type { AgentproseConfig } from './lib'

export type { AgentproseConfig } from './lib'
export { scriptSnippet, npmSnippet, clientFetch, previewAdapter, checkSetup } from './lib'

/**
 * agentprose for Sanity Studio: adds an "AI agents" tool that shows what AI agents read from this
 * dataset through WebMCP, and the one-line install for your website.
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {agentprose} from 'sanity-plugin-agentprose'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [agentprose({urlPattern: 'https://example.com/blog/{slug}/'})],
 * })
 * ```
 *
 * @public
 */
export const agentprose = definePlugin<AgentproseConfig | void>((config) => {
  const c: AgentproseConfig = config || {}
  return {
    name: 'sanity-plugin-agentprose',
    tools: [
      {
        name: 'agentprose',
        title: c.title || 'AI agents',
        icon: RobotIcon,
        component: AgentproseTool,
        options: c,
      },
    ],
  }
})
