// A minimal Studio (Sanity's blog schema) used to prove the plugin bundles into a real Studio build:
//   npm run studio:build      (no Sanity account needed to build; logging in needs a real project)
import { defineConfig, defineField, defineType } from 'sanity'
import { structureTool } from 'sanity/structure'
import { agentprose } from '../../src'

const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'excerpt', type: 'text' }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({ name: 'categories', type: 'array', of: [{ type: 'reference', to: [{ type: 'category' }] }] }),
    defineField({ name: 'mainImage', type: 'image' }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }),
  ],
})
const author = defineType({ name: 'author', title: 'Author', type: 'document', fields: [defineField({ name: 'name', type: 'string' })] })
const category = defineType({ name: 'category', title: 'Category', type: 'document', fields: [defineField({ name: 'title', type: 'string' })] })

export default defineConfig({
  name: 'default',
  title: 'agentprose plugin test studio',
  projectId: 'agentprs',
  dataset: 'production',
  plugins: [structureTool(), agentprose({ urlPattern: 'https://example.com/blog/{slug}/' })],
  schema: { types: [post, author, category] },
})
