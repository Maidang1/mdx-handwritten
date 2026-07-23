# MDX Handwritten

An accessible, deterministic handwritten annotation language for MDX. It turns eight strict annotation gestures and recipe-driven annotation scenes into semantic React components or plain HTML, then adds the handwritten look with CSS and decorative SVG only.

[Live playground](https://maidang1.github.io/mdx-handwritten/) · [Syntax reference](#syntax) · [Security model](#security)

## Why

Handwritten UI is useful for editorial emphasis, margin notes, code annotations, callouts, and playful navigation. It should not require Canvas, layout measurement, client-side JavaScript, or content hidden in CSS pseudo-elements. MDX Handwritten keeps every meaningful word in the DOM and degrades safely when CSS, fonts, masks, or JavaScript are unavailable.

## Packages

| Package | Responsibility |
| --- | --- |
| `@madinah/mdx-handwritten-scene` | Pure, versioned scene-plan derivation from compact author input |
| `@madinah/mdx-handwritten-remark` | Validation and MDX/HTML/strip compilation |
| `@madinah/mdx-handwritten-react` | Server-safe React components and SVG decoration |
| `@madinah/mdx-handwritten-theme` | Tokens, self-hosted font, responsive and print CSS |

## Installation

Install the packages you need from npm (scope `@madinah`). All four libraries share the same version:

```bash
npm install @madinah/mdx-handwritten-remark \
  @madinah/mdx-handwritten-react \
  @madinah/mdx-handwritten-theme \
  remark-directive

# optional when building custom recipe compilers
npm install @madinah/mdx-handwritten-scene
```

`@madinah/mdx-handwritten-scene` is also pulled in transitively by the remark and React packages.

For local development of this monorepo:

```bash
git clone https://github.com/Maidang1/mdx-handwritten.git
cd mdx-handwritten
npm install
npm run check
npm run dev
```

### Releasing (maintainers)

Versions are locked together with [Changesets](https://github.com/changesets/changesets) in **fixed** mode:

```bash
npm run changeset          # record a change
npm run version-packages   # bump all four packages to the same version
npm run release            # build + publish all public packages
```

You must be logged into npm with publish rights on the `madinah` org (`npm whoami`).

### Quick start (consumer)

Register `remark-directive` **before** the handwritten transformer, then inject the React component map and theme CSS:

```ts
import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'
// or: import { remarkMdxHandwritten } from '@madinah/mdx-handwritten-remark'

export const mdxOptions = {
  remarkPlugins: [
    remarkDirective,
    [remarkMdxHandwritten, { output: 'component', diagnostics: 'strict' }]
  ]
}
```

```tsx
import { mdxHandwrittenComponents } from '@madinah/mdx-handwritten-react'
import '@madinah/mdx-handwritten-theme/styles.css'

<MDXContent components={mdxHandwrittenComponents} />
```

The React adapter has no hooks, context dependency, client directive, or browser measurement. It can render on the server and in React Server Components.

### Host recipes

**Vite + `@mdx-js/rollup`**

```ts
import mdx from '@mdx-js/rollup'
import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'

export default {
  plugins: [
    mdx({
      remarkPlugins: [
        remarkDirective,
        [remarkMdxHandwritten, { output: 'component', diagnostics: 'strict' }]
      ]
    })
  ]
}
```

**Next.js + `@next/mdx`**

```js
// next.config.mjs
import createMDX from '@next/mdx'
import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkDirective,
      [remarkMdxHandwritten, { output: 'component' }]
    ]
  }
})

export default withMDX({ pageExtensions: ['md', 'mdx', 'tsx'] })
```

In `mdx-components.tsx` (or your MDX provider), merge the map and import the theme once in a root layout:

```tsx
import type { MDXComponents } from 'mdx/types'
import { mdxHandwrittenComponents } from '@madinah/mdx-handwritten-react'
import '@madinah/mdx-handwritten-theme/styles.css'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...mdxHandwrittenComponents, ...components }
}
```

**Common plugin options**

| Option | Values | Purpose |
| --- | --- | --- |
| `output` | `component` · `element` · `strip` | React components, semantic HTML, or decoration-free content |
| `diagnostics` | `strict` · `warn` | Fail the build or strip invalid nodes after warning |
| `reviewedPlans.projectRoot` | absolute path | Resolve `plan="rp1_…"` sidecars under `.mdx-handwritten/plans/` |
| `sceneCompiler` | from `createSceneCompiler` | Trust explicit third-party recipe packages |

```ts
[remarkMdxHandwritten, {
  output: 'component',
  diagnostics: 'strict',
  reviewedPlans: { projectRoot: process.cwd() }
}]
```

Live walkthrough: [docs site Setup](https://maidang1.github.io/mdx-handwritten/#setup).

## Syntax

The eight annotation gestures remain a deliberately fixed language. Annotation
recipes add higher-level automation without expanding that low-level surface.

### Automated annotation scenes

Choose a recipe and provide only the source readers should see. The
`task-explainer` recipe recognizes the task state, stable ID, description, tags,
priority, and custom fields, then generates the labels and relationships:

```mdx
:::hw-scene{recipe="task-explainer"}
[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents
:::
```

The canonical source stays intact and comes first in the DOM. A complete text
legend follows it, so narrow layouts, print, forced colors, and missing CSS do
not depend on connector geometry.

#### Third-party npm Recipe packages

Trusted Recipe packages are explicit ESM npm dependencies. The host imports a
package definition once, constructs a Configured Scene compiler, and supplies
that compiler to the remark Adapter:

```ts
import acmeRecipes from '@acme/mdx-handwritten-recipes'
import { createSceneCompiler } from '@madinah/mdx-handwritten-scene/recipes'

const sceneCompiler = createSceneCompiler({
  recipePackages: [{
    packageName: '@acme/mdx-handwritten-recipes',
    definition: acmeRecipes
  }]
})

export const mdxOptions = {
  remarkPlugins: [
    remarkDirective,
    [remarkHandwritten, { sceneCompiler }]
  ]
}
```

Authors still write only a package-qualified recipe name and readable source.
There is no package scan, registry request, source-driven import, browser
loader, or global registry. Recipe code runs during compilation; component,
element, strip, SSR, and RSC rendering receive only the materialized JSON Scene
plan. The root `createScenePlan` and direct React `recipe + source` forms remain
first-party-only.

Package authors can validate the bytes they will publish with a real
`npm pack` round trip:

```bash
npm run build:packages
node scripts/recipe-conformance/cli.mjs ./path/to/recipe-package
```

See the [V1 npm Recipe package contract](./docs/specs/third-party-annotation-recipe-packages-v1.md)
and [conformance format](./scripts/recipe-conformance/README.md).

#### Reviewed scene plans

The ordinary path above remains fully deterministic and needs no extra files.
When an upstream authoring tool has produced and an author has approved a Scene
plan, the tool adds one opaque binding while leaving the readable source in
place:

```mdx
:::hw-scene{recipe="task-explainer" locale="en" plan="rp1_01k4m6h8q2w9c5x7t3v0n8s6dy"}
[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents
:::
```

The binding resolves exactly one committed JSON artifact at
`.mdx-handwritten/plans/<binding>.json` under an explicitly configured absolute
project root:

```ts
[remarkHandwritten, {
  output: 'component',
  diagnostics: 'strict',
  reviewedPlans: { projectRoot: process.cwd() }
}]
```

Authors do not write the JSON, source offsets, digest, or path. Every build
reads the bounded artifact again and validates it against the current canonical
source. A missing, stale, incompatible, or malformed bound plan fails strict
compilation; warning mode reports the problem and retains source only. It never
falls back to different inferred meaning or calls a model. The sidecar is a
build input, not an emitted asset, unless a host separately publishes it. The
opaque binding is never interpreted as a path, URL, or glob; the resolver also
rejects symlinked artifacts, out-of-root files, invalid UTF-8, and artifacts
over 64 KiB.

### Inline text, link, mark, and annotation

```mdx
:hw-text[handwritten copy]{tone="muted" rotate="-2"}

:hw-link[Get Started]{href="#setup" size="display" underline="strong" icon="arrow-forward" rotate="-2"}

:hw-mark[Spec updated]{kind="underline" tone="success" strength="subtle"}

:hw-annotate[`CLI-042`]{label="stable ID" placement="block-start" tone="info" arrow="curved"}
```

### One-line note

One primitive covers status lines, warning tape, panels, and display copy:

```mdx
::hw-note[:hw-mark[Spec updated]{kind="underline" tone="success"} in the same commit :)]{appearance="line" tone="success" icon="check"}

::hw-note[Forgot to add magic-link login behavior]{appearance="tape" tone="warning" icon="warning"}
```

### Brace, margin note, and watermark containers

```mdx
:::hw-brace[spec]{side="inline-end" align="center" distance="loose"}
Content grouped by a stretchable brace.
:::

:::hw-margin[the backlog]{side="inline-start" align="end" icon="arrow-toward"}
Content with a note outside its edge on wide screens.
:::

:::hw-watermark[DRAFT]{placement="block-start-inline-end" strength="faint" rotate="3"}
Content with an always-decorative watermark.
:::
```

Nested layout containers have one canonical order:

```text
hw-watermark → hw-margin → hw-brace → content
```

Use a longer colon fence when containers are nested. A container cannot recursively contain another container of the same kind.

## Compiler modes

```ts
type OutputMode = 'component' | 'element' | 'strip'
```

- `component` emits `HandScene` for automated scenes and preserves the existing `HandText`, `HandLink`, `HandMark`, `HandAnnotate`, `HandNote`, `HandBrace`, `HandMargin`, and `HandWatermark` mapping for gestures.
- `element` emits semantic HTML data contracts for framework-free rendering and sanitization pipelines.
- `strip` removes decoration while retaining readable content, links, captions, and annotation labels.

Unknown `hw-*` names, wrong directive forms, unsafe URLs, dynamic or unknown attributes, invalid enums, empty content, and invalid nesting are build errors in strict mode. Directives outside the `hw-*` namespace are left untouched for other plugins.

## Accessibility and responsive behavior

- Labels and notes are real DOM text; essential content never exists only in `::before`, `::after`, Canvas, masks, or SVG text.
- Links remain native anchors with a visible focus ring. Decorative icons and connectors are hidden from assistive technology.
- Logical placement values support RTL. Short labels use `dir="auto"`.
- Annotations become inline labels, braces become captions, and margin notes return to document flow in narrow containers and print.
- Forced-colors, reduced-motion, print, font failure, no-CSS, and no-JavaScript states retain readable content.
- Watermarks are always decorative. Use a note or margin directive when the words matter.

## Security

MDX itself can execute JavaScript and must be considered trusted code. The transformer additionally rejects expression attributes, spreads, event handlers, arbitrary classes/styles/IDs, unknown attributes, and unsafe link protocols.

For untrusted authors, accept plain Markdown only, compile with `output: 'element'`, and run `rehype-sanitize` with an explicit allow-list after the handwritten transform. See [SECURITY.md](./SECURITY.md).

## Development

```bash
npm install
npm run typecheck
npm test
npm run check:budgets
npm run report:performance
npm run test:release-fixtures
npm run build
```

`npm run check` includes the blocking budgets. `npm run report:performance`
records the report-only timing calibration described in
[`docs/specs/performance-budgets-v1.md`](./docs/specs/performance-budgets-v1.md).
The Pages workflow runs the blocking checks before deploying the Vite output.
The preview is built from an actual `.mdx` file using the local remark
transformer, not from hard-coded lookalike markup.

`npm run test:release-fixtures` builds a separate static, zero-client-script
page from the public React package and checks its semantic, accessibility,
fallback, and browser behavior. `npm run check:release` adds that complete
Playwright matrix to the ordinary repository check. Chromium screenshot pixels
are compared only in the pinned Linux workflow described in
[`docs/specs/release-validation-v1.md`](./docs/specs/release-validation-v1.md).

## License

[MIT](./LICENSE)
