import {fileURLToPath} from 'node:url'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {defineConfig} from 'vite'
import {ReleaseFixturePage} from './fixture/ReleaseFixturePage.js'

const root = fileURLToPath(new URL('./fixture', import.meta.url))
const fixtureMarkup = renderToStaticMarkup(createElement(ReleaseFixturePage))

export default defineConfig({
  root,
  plugins: [
    {
      name: 'render-release-fixtures',
      transformIndexHtml(html) {
        return html.replace('<main data-release-fixtures=""></main>', fixtureMarkup)
      }
    }
  ],
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('./dist', import.meta.url))
  }
})
