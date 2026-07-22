# MDX Handwritten

An accessible, deterministic handwritten annotation language for MDX. It turns eight strict annotation gestures and recipe-driven annotation scenes into semantic React components or plain HTML, then adds the handwritten look with CSS and decorative SVG only.

[Live playground](https://maidang1.github.io/mdx-handwritten/) · [Syntax reference](#syntax) · [Security model](#security)

## Why

Handwritten UI is useful for editorial emphasis, margin notes, code annotations, callouts, and playful navigation. It should not require Canvas, layout measurement, client-side JavaScript, or content hidden in CSS pseudo-elements. MDX Handwritten keeps every meaningful word in the DOM and degrades safely when CSS, fonts, masks, or JavaScript are unavailable.

## Packages

| Package | Responsibility |
| --- | --- |
| `mdx-handwritten-scene` | Pure, versioned scene-plan derivation from compact author input |
| `remark-mdx-handwritten` | Validation and MDX/HTML/strip compilation |
| `mdx-handwritten-react` | Server-safe React components and SVG decoration |
| `mdx-handwritten-theme` | Tokens, self-hosted font, responsive and print CSS |

## Installation

The repository is an npm workspace. Until the packages are published to npm, clone the repository to try or develop them:

```bash
git clone https://github.com/Maidang1/mdx-handwritten.git
cd mdx-handwritten
npm install
npm run check
npm run dev
```

For an MDX build, register `remark-directive` before the handwritten transformer:

```ts
import remarkDirective from 'remark-directive'
import remarkHandwritten from 'remark-mdx-handwritten'

export const mdxOptions = {
  remarkPlugins: [
    remarkDirective,
    [remarkHandwritten, { output: 'component', diagnostics: 'strict' }]
  ]
}
```

Inject the components through your framework's MDX component mechanism and import the theme once:

```tsx
import { mdxHandwrittenComponents } from 'mdx-handwritten-react'
import 'mdx-handwritten-theme/styles.css'

<MDXContent components={mdxHandwrittenComponents} />
```

The React adapter has no hooks, context dependency, client directive, or browser measurement. It can render on the server and in React Server Components.

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
npm run build
```

`npm run check` includes the blocking budgets. `npm run report:performance`
records the report-only timing calibration described in
[`docs/specs/performance-budgets-v1.md`](./docs/specs/performance-budgets-v1.md).
The Pages workflow runs the blocking checks before deploying the Vite output.
The preview is built from an actual `.mdx` file using the local remark
transformer, not from hard-coded lookalike markup.

## License

[MIT](./LICENSE)
