# Annotation scene performance budgets V1

## Purpose

This contract fixes the performance and delivery limits for the V1 Annotation scene system. The primary experience is a statically compiled blog: the Scene Module and remark Adapter run during the build, an Annotation renderer produces semantic source-first output, and the optional theme supplies Visual style. A host may hydrate React, but no Annotation scene requires client-only code, layout measurement, or hydration to preserve its meaning.

Budget pressure cannot weaken the closed Scene plan, omit its complete legend, move semantic compilation into React, discard Reviewed plan artifact validation, or change an invalid scene into a partial scene. Additional Visual styles and fonts are explicit opt-in and do not increase the default request.

The committed [`../../budgets.json`](../../budgets.json) file is the machine-readable source of truth. All byte limits use `1 KiB = 1,024 bytes`.

## Blocking budgets

| Surface | V1 limit |
| --- | ---: |
| `mdx-handwritten-scene` ESM | 64 KiB raw / 14 KiB gzip |
| `remark-mdx-handwritten` ESM | 64 KiB raw / 15 KiB gzip |
| `mdx-handwritten-react` ESM | 18 KiB raw / 4 KiB gzip |
| Three ESM entries combined | 35 KiB gzip |
| Minified `HandScene` consumer, React external | 42 KiB raw / 13 KiB gzip |
| Minified `HandText` consumer | 4 KiB gzip and 0 Scene Module bytes |
| Resolved default-theme CSS | 40 KiB raw / 6 KiB gzip |
| Default font assets | 225 KiB total / 85 KiB common Latin |
| Standard component Scene-plan transport | 6 KiB raw |
| Standard materialized-plan SSR HTML | 6 KiB raw |
| Required client-only runtime | 0 B |
| Scene and remark npm tarballs | 45 KiB each |
| React and theme npm tarballs | 7 KiB each |

The three-entry combined value is the sum of the three independently compressed ESM entries. It is not a recompressed concatenation.

## Canonical environment

GitHub is authoritative and uses:

- Node.js `22.23.1`;
- npm `11.9.0` with the committed lockfile;
- esbuild `0.27.7` for consumer fixtures; and
- `gzip -9 -n -c`, so filenames and timestamps never enter compressed output.

Local runs on another supported Node or npm version are useful before a push, but the pinned GitHub result resolves any byte-level disagreement. The repository fixes LF endings for the budget manifest and fixtures.

`npm run check:budgets` builds the packages and exercises every blocking measurement. Root `npm run check` includes this command, and the Pages workflow runs it before building deployable documentation.

## ESM and consumer fixtures

Raw ESM is the exact byte length of each built `dist/index.js`. Gzip is the exact stdout length of the canonical gzip command.

Consumer measurements bundle the committed `HandScene` and `HandText` fixtures from the public `mdx-handwritten-react` package root with:

- bundling, tree shaking, and minification enabled;
- ESM output for the browser;
- UTF-8 output and no legal-comment payload; and
- `react` plus `react/*` externalized.

The output metadata must still export the requested symbol. The `HandText` fixture additionally requires zero contributed bytes from `packages/scene/dist`; a small Scene Module cannot hide a broken export seam by fitting under the gzip cap. The frozen `handwrittenComponents`, `handwrittenSceneComponents`, and `mdxHandwrittenComponents` maps remain part of the public Interface.

## CSS and fonts

Resolved theme CSS is the exact default `mdx-handwritten-theme/styles.css` entry with its leading local Fontsource import replaced in place by the referenced CSS. It is not minified. Only the default entry is counted; an explicit opt-in Visual style is measured by its own future contract.

The default font total is the sum of the unique local font files referenced by that resolved Fontsource CSS, not the entire installed Fontsource package. V1 pins these five normal variable-weight subsets:

- `shantell-sans-cyrillic-ext-wght-normal.woff2`;
- `shantell-sans-cyrillic-wght-normal.woff2`;
- `shantell-sans-vietnamese-wght-normal.woff2`;
- `shantell-sans-latin-ext-wght-normal.woff2`; and
- `shantell-sans-latin-wght-normal.woff2`.

The last file is the common-Latin request and has the independent 85 KiB limit. V1 bundles no CJK web font; CJK labels keep the documented system-font fallback.

## Scene transport, SSR, and zero runtime

The canonical fixture is [`../../scripts/budgets/fixtures/standard-task-scene.mdx`](../../scripts/budgets/fixtures/standard-task-scene.mdx). Component transport is the complete MDX ESM produced by `remark-directive` followed by the remark Adapter in component mode. SSR materializes that same task source through `createScenePlan` and passes its plan to `HandScene` before measuring `renderToStaticMarkup` output.

Required client-only runtime measures script bytes inserted by that SSR path and must remain zero. The gate also requires that the browser-reachable Scene and React entries have no `use client` directive, neither package publishes a browser-specific entry, and the SSR HTML contains no script. This does not claim that a host's hydrated React application has a zero-byte application bundle; it says Annotation scene meaning and presentation do not require one.

## Published packages

Tarball size comes from `npm pack --dry-run --json` for each workspace under the pinned npm version. The Scene and remark tarballs must retain their existing source maps; removing them is not a permitted way to meet the budget.

## Timing calibration

Timing initially reports without blocking. The committed targets are:

| Metric | Target p95 |
| --- | ---: |
| Warm package build | 10,000 ms |
| Batch of 100 standard Scene compilations | 100 ms |
| One standard materialized-plan SSR | 0.25 ms |

`npm run report:performance` uses `process.hrtime.bigint()` and nearest-rank p95:

- package build: one warm-up followed by five samples;
- 100-scene compile: five warm-up batches followed by twenty measured batches; and
- SSR: 200 warm-up renders followed by 2,000 measured renders.

Every successful `main` run publishes one JSON report and a GitHub step summary. After five successful `main` reports are reviewed, a separate explicit change may switch `limits.timing.enforcement` in `budgets.json` from `report` to `block`. A measurement error always fails; an over-target timing value exits successfully only while enforcement remains `report`.

## Failure policy

Any blocking byte or structural failure stops `npm run check`, pull-request budget validation, and Pages deployment. A maintainer may deliberately raise a limit only by changing `budgets.json` and this contract together, with the measured effect visible in review. A temporary baseline file, comparison against an untrusted pull-request value, or silent percentage allowance cannot override the fixed V1 limit.
