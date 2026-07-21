import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import remarkDirective from 'remark-directive'
import { remarkMdxHandwritten } from '../../packages/remark/src/index'

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [
          remarkDirective,
          [remarkMdxHandwritten, { output: 'component' }]
        ]
      })
    },
    react({ include: /\.(?:js|jsx|md|mdx|ts|tsx)$/ })
  ]
})
