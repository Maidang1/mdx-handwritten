import {defineConfig} from 'tsup'

export default defineConfig({
  terserOptions: {
    compress: {passes: 4},
    ecma: 2022,
    module: true
  },
  esbuildOptions(options) {
    options.sourcesContent = false
  }
})
