# Annotation release validation V1

## Purpose

This contract defines the Canonical content fixtures, viewport and language matrix, accessibility assertions, visual regression evidence, and exact-commit gates required before MDX Handwritten packages may be released. It validates the public output without making screenshots part of Annotation gesture or Annotation scene meaning.

## Canonical content fixtures

A Canonical content fixture fixes stable author input plus expected reader meaning. The committed [`visual-fixtures.json`](../../visual-fixtures.json) manifest owns fixture IDs, sources, catalog locales, viewports, fallback states, and the pinned visual runner. Tests fail when a shipped built-in Annotation recipe lacks a fixture for one complete Localization catalog.

V1 contains:

1. the exact eight Annotation gestures in one LTR and one RTL document;
2. `task-explainer@1` at its accepted two-line, six-role source shape in `en` and `zh-CN`;
3. one invalid `task-explainer` input that must remain readable and fail closed; and
4. one additive slot for every future shipped recipe/version and complete Localization catalog.

Fixtures render through the public `@madinah/mdx-handwritten-react` package root and import `@madinah/mdx-handwritten-theme/styles.css`. Vite injects `renderToStaticMarkup` output into a static HTML document at build time. The resulting page contains no client script, copied production markup, hydration, browser measurement, clock, randomness, remote asset, or interactive documentation dependency.

Changing a fixture's author input or expected meaning is a contract change. Changing only screenshot pixels cannot redefine a fixture.

## Required matrix

| Dimension | V1 coverage | Blocking assertion |
| --- | --- | --- |
| Viewport | `1280×960` wide; `390×844` narrow | No document-level horizontal overflow; narrow content retains its linear form and hides decorative connectors where the layout contract requires it. |
| Localization catalog | Every shipped recipe in `en` and `zh-CN` | Caption and legend carry the exact generated-copy `lang`; canonical source retains its own inherited language. |
| Direction | Exact-eight gesture suites in LTR and RTL | Logical placement, readable labels, and document containment are preserved. |
| Print | Emulated print media plus a real tagged PDF smoke test | Canonical source and complete legend stay in paged flow; connectors disappear; the complete fixture document produces a multi-page PDF. Chinese print text uses a system-only, cross-platform font stack so PDF generation does not depend on a non-embeddable handwriting font. |
| Forced colors | Active forced-colors media | Scene source and complete legend remain system-color readable; Scene connectors disappear. |
| Reduced motion | Reduced-motion media | Annotation gesture animation and transition durations resolve to none or zero. |
| Font failure | All fixture web-font requests aborted | Canonical source, generated reader text, and CJK text remain visible with fallback fonts. |
| No CSS | Every stylesheet removed after load | Canonical source precedes a complete visible legend; invalid source remains readable; intrinsic SVG dimensions prevent decorative glyphs from overwhelming the document. |
| No JavaScript | Chromium context with JavaScript disabled | The same static fixture source and legend are present, and the document contains no script element. |

The whole page may not overflow horizontally. A canonical-source `pre` may remain an explicitly scrollable region when its own content requires it; that local overflow does not permit document overflow.

## Semantic and accessibility gates

For each valid Annotation scene, automated tests assert:

- `figcaption → pre/code canonical source → ordered legend` as the direct document order;
- exact recipe name, recipe version, Scene plan schema, and Localization locale metadata;
- exact canonical source text and real-text generated labels;
- every legend target reference resolves to a rendered Annotation target;
- every connector is decorative and never owns reader text; and
- a non-empty complete legend remains available in wide and fallback states.

The static fixture page must pass Axe rules tagged WCAG 2.0/2.1/2.2 A and AA. Decorative `aria-hidden` watermark text is excluded from the color-contrast scan because it is intentionally not reader content. Explicit tests additionally cover keyboard focus visibility, source/legend order, language metadata, no-JavaScript rendering, no-CSS text preservation, font failure, reduced motion, and document overflow.

Automated accessibility checks do not prove that a label expresses the right meaning, that CJK handwriting is culturally appropriate, or that a reviewed pixel change is desirable. Those remain explicit review responsibilities when fixture content or baselines change.

## Visual regression evidence

Playwright is pinned to `1.61.1`. Chromium screenshots are generated and compared only in the package-matched Linux image recorded in `visual-fixtures.json`; the image digest is part of the contract. Expected screenshots live under `tests/visual/__screenshots__/chromium-linux/`.

The blocking screenshot set covers:

- wide and narrow LTR and RTL exact-eight gesture suites;
- wide and narrow `task-explainer@1` in `en` and `zh-CN`;
- print and forced-color Scene fallbacks in `en` and `zh-CN`;
- no-CSS source-first fallback; and
- `zh-CN` with web fonts unavailable.

The comparison accepts no differing pixels after Playwright's normal screenshot stabilization. Screenshot assertions are soft only so one failed run collects every candidate and diff; any collected mismatch still fails the test. CI never runs `--update-snapshots` and never commits generated files. An intentional Visual style change updates baselines in a separately reviewable source commit and explains why the change preserves fixture meaning.

Firefox and WebKit do not consume Chromium pixels. They run the same semantic, Axe, overflow, language, print, forced-color, reduced-motion, font-failure, and no-CSS checks on `main` and manual release validation. This catches engine differences without creating false cross-platform pixel equivalence.

## GitHub and release gates

The `Validate release fixtures` workflow is blocking evidence for an exact commit:

1. every pull request runs the complete ordinary repository check plus the Chromium, no-JavaScript, accessibility, and screenshot gate in the pinned image;
2. every successful `main` push and manual run then runs Firefox and WebKit after Chromium;
3. failures retain the HTML report, traces, screenshots, and diffs for 30 days; and
4. a version tag or npm publication may proceed only when that exact commit has a successful full release-validation run plus the existing type, unit, package-build, deterministic budget, and npm-pack checks.

`npm run test:release-fixtures` builds public packages and the static fixture before invoking Playwright. `npm run check:release` composes the ordinary repository check with the complete local browser matrix. Future publication automation must depend on the exact-commit release-validation result rather than rerunning a weaker subset after tagging.

## Additive rule

A new built-in Annotation recipe, exact recipe version, Localization catalog, output mode that changes reader markup, default Visual style, or fallback promise is incomplete until it adds or updates the corresponding Canonical content fixture and passes this matrix. Third-party recipe distribution remains owned by its separate compatibility contract; it may not weaken these first-party gates.
