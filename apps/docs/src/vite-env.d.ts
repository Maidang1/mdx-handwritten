/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType, ElementType } from 'react'

  const MDXContent: ComponentType<{
    components?: Record<string, ElementType>
  }>
  export default MDXContent
}

interface ImportMetaEnv {
  readonly VITE_REPOSITORY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
