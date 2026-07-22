import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import remarkDirective from 'remark-directive'
import { remarkMdxHandwritten } from '../../packages/remark/src/index'

const mdxPlugin = mdx({
  remarkPlugins: [
    remarkDirective,
    [remarkMdxHandwritten, { output: 'component' }]
  ]
})
const transformMdx = mdxPlugin.transform

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    {
      ...mdxPlugin,
      enforce: 'pre',
      async transform(value, id) {
        const queryIndex = id.indexOf('?')
        const query = queryIndex === -1
          ? undefined
          : new URLSearchParams(id.slice(queryIndex + 1))

        if (query?.has('raw')) return
        return transformMdx.call(this, value, id)
      }
    },
    react({ include: /\.(?:js|jsx|md|mdx|ts|tsx)$/ })
  ]
})
