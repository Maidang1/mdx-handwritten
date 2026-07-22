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

if (typeof transformMdx !== 'function') {
  throw new TypeError('Expected the MDX Rollup plugin to expose a transform hook')
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    {
      ...mdxPlugin,
      enforce: 'pre',
      transform(value, id) {
        const queryIndex = id.indexOf('?')
        const query = queryIndex === -1
          ? undefined
          : new URLSearchParams(id.slice(queryIndex + 1))

        if (query?.has('raw')) return null
        return transformMdx.call(this, value, id)
      }
    },
    react({ include: /\.(?:js|jsx|md|mdx|ts|tsx)$/ })
  ]
})
