# Annotation scene package boundary V1

## Purpose

This contract assigns Annotation scene compilation, rendering, theming, and security responsibilities without changing the existing eight Annotation gesture contracts. It defines the target V1 package shape; the shipped task-explainer vertical slice remains a compatibility bridge while the production contracts are implemented.

The authoring default stays minimal:

```md
:::hw-scene{recipe="task-explainer" locale="en"}
[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents
:::
```

Authors do not select packages, coordinates, renderers, sanitizer attributes, or Rich-layout envelopes.

## Package topology

The first-party dependency direction is:

```text
mdx-handwritten-scene
  ↑                 ↑
remark-mdx-handwritten   mdx-handwritten-react

mdx-handwritten-theme ── semantic DOM contract only
```

`mdx-handwritten-scene` is a normal first-party dependency of remark and React, not a peer dependency that every author must install and coordinate. First-party releases declare a compatible Scene Module range and are validated as one release line. Theme has no JavaScript dependency on the other packages.

There is no `mdx-handwritten-render` package in V1. Scene plan V1 is already the semantic Seam between compilation and Annotation renderers. A second public JSON view tree would duplicate the plan, add another schema and migration policy, and make callers learn DOM-oriented Implementation details. Contract fixtures compare the independent renderers instead. A shared render Module is reconsidered only after another real Adapter or repeated semantic drift proves that the extra Interface earns its cost.

## Module ownership

### `mdx-handwritten-scene`

The Scene Module owns the one public callable Interface defined by Scene plan V1:

```ts
createScenePlan(input: CreateScenePlanInput): ScenePlanResult
```

It privately owns source normalization and identity, built-in Annotation recipe selection, parsing, localization, Semantic correction application, reviewed-candidate decoding, graph validation, canonical ordering, limits, provenance, and deterministic diagnostics. It is synchronous, pure, in-process, side-effect-free, and independent of remark, React, DOM, CSS, files, networks, clocks, models, and runtime registries.

The Module exports its closed V1 plan, input, result, correction, and diagnostic types. It does not export parser fragments, normalizers, hashers, localization services, recipe registries, renderer settings, or dependency-injection ports.

### `remark-mdx-handwritten`

The remark Module is the author-source Adapter. It owns:

- recognition and strict validation of the `hw-scene` container;
- extraction of canonical source and parsed Semantic corrections;
- calling `createScenePlan` during compilation;
- mapping Scene diagnostics to VFile strict or warning policy;
- selecting `component`, `element`, or `strip` output;
- optional component import generation and stable per-document IDs.

It does not own Annotation recipe semantics, localization catalogs, plan validation, React rendering, Visual style, sanitizer policy, or browser layout.

### `mdx-handwritten-react`

The React Module is a server-safe Annotation renderer. It maps a valid Scene plan to semantic React elements without hooks, context, effects, `use client`, hydration, browser measurement, or global state. React escapes all plan text; decorative connector graphics remain hidden from assistive technology.

`HandScene` accepts two mutually exclusive forms:

```ts
type HandSceneProps =
  | {
      plan: ScenePlanV1
      recipe?: never
      source?: never
      locale?: never
    }
  | {
      plan?: never
      recipe: string
      source: string
      locale?: string
    }
```

The plan form accepts only a plan returned by `createScenePlan`; arbitrary objects or untrusted JSON are unsupported. Untrusted candidate JSON must pass through `createScenePlan` first. The source form preserves the shipped direct-React Interface and materializes through the same Scene Module. Expected author errors render canonical source with the invalid-scene marker and never throw or call a client callback.

Advanced callers that need diagnostics call `createScenePlan` themselves and render the successful plan. The convenience source form intentionally does not add `onDiagnostic`, render props, context, layout props, or recipe injection.

### `mdx-handwritten-theme`

Theme is optional CSS, not an Annotation renderer. It consumes stable elements and `data-hw-*` semantics, applies Visual style, and selects only recipe-owned rich topologies allowed by the Rich-layout envelope. It does not change the Scene plan, infer Annotation relationships, hide required legend text, require JavaScript, or accept author coordinates and breakpoints.

Custom themes target documented elements and data attributes rather than package-private classes. With no theme or no CSS, caption, canonical source, and complete legend remain readable in document order.

## Exact-eight compatibility

`hw-scene` is a composed authoring construct and `HandScene` is an Annotation renderer. Neither is a ninth Annotation gesture.

These contracts remain distinct and frozen:

```ts
handwrittenDirectiveNames // exactly eight hw-* gesture directives
handwrittenComponentNames // exactly eight configurable component bindings
handwrittenComponents     // exactly eight React gesture components

handwrittenSceneComponents // { HandScene }
mdxHandwrittenComponents   // eight gestures plus HandScene convenience map
```

The remark `components` option continues to rename only the eight gesture components. `HandScene` keeps its fixed binding so generated component output cannot silently replace scene semantics. Auto-import mode adds `HandScene` only when a valid scene uses component output; documents without scenes remain a true no-op.

Existing React re-exports of Scene plan types remain compatibility exports. New compiler capabilities are documented from `mdx-handwritten-scene`; neither remark nor React re-exports the `createScenePlan` runtime function.

## Output-mode contract

All successful modes consume a plan materialized by `mdx-handwritten-scene`. They preserve the same caption, canonical source, ordered Annotation targets, Annotation relationships, and complete legend; byte-for-byte markup equality is not required.

| Mode | Plan timing and transport | Required output | React/theme requirement | Untrusted-author use |
| --- | --- | --- | --- | --- |
| `component` | remark materializes once and emits `HandScene` with the plain-JSON plan | Server-safe React semantic scene | React required; theme optional | No; MDX is executable |
| `element` | remark materializes and serializes standard elements directly | Caption, real-text source and targets, complete legend, ARIA references, optional decorative graphics | Neither React nor theme required | Yes, only for plain Markdown followed by sanitization |
| `strip` | remark materializes and emits the linear projection | Caption, canonical source, complete ordered legend; no connectors or scene styling hooks | Neither React nor theme required | Still sanitize the whole untrusted document |

Component output embeds only closed Scene plan JSON. It never embeds executable recipe code, JSX from an author, provider responses, CSS, coordinates, or renderer configuration. The build and server bundle budget for this transport belongs to the performance contract; budget pressure may change encoding but cannot move semantic compilation into React or discard plan information.

In warning mode, an invalid scene emits canonical source only and reports VFile diagnostics. In strict mode, the same diagnostics fail compilation. Element and strip do not attempt a partial scene, while direct React source usage produces the readable invalid-scene fallback.

## Semantic DOM contract

Component and element Annotation renderers produce the same source-first structure:

1. `figure[data-hw-scene]` with recipe, version, locale, and plan-schema metadata;
2. a real-text `figcaption[data-hw-scene-caption]`;
3. `pre[data-hw-scene-source] > code` containing the exact canonical source;
4. real-text target spans with stable target identity and role data;
5. `ol[data-hw-scene-legend]` containing every Annotation relationship in canonical order;
6. target-to-legend ARIA references where the output can assign stable document IDs;
7. optional SVG or glyph connectors that are decorative and removable.

The documented element names, reading order, target/relationship identity attributes, and ARIA meaning are compatibility surface. Package-private classes, connector paths, CSS custom-property values, and geometry are not. Removing semantic nodes or attributes, reordering source after legend, or turning real text into generated or graphical content is breaking.

## Sanitizer boundary

No core package claims to make MDX safe, and V1 exports no universal sanitizer. For untrusted authors, a host must accept plain Markdown, parse directives, run remark in `element` mode, convert to HAST, apply `rehype-sanitize` with a host-owned explicit allow-list, and serialize rather than execute the result.

The scene allow-list needs only the standard structure above plus the exact generated `data-hw-*`, `id`, `lang`, `aria-labelledby`, `aria-describedby`, and decorative SVG attributes the host chooses to retain. A sanitizer may remove connectors and all presentation data without removing caption, canonical source, or the complete legend. It must never allow event handlers, `style`, arbitrary classes, MDX expressions, ESM, executable URLs, or wildcard attributes merely because they have a handwritten prefix.

A future documented schema fragment may reduce integration work, but the host still owns the final trust policy. Such a helper must live in an explicit secondary export, return new data without mutating the host schema, and state that it does not make executable MDX safe.

## Compatibility and versioning

Scene schema, Annotation recipe, localization catalog, source normalization, semantic DOM, and npm package versions solve different compatibility problems.

- Plan field or invariant changes create a new Scene plan schema version. Renderers reject unsupported versions and never migrate implicitly.
- Annotation recipe grammar, target identity, or relationship semantics change the recipe version.
- Resolved localized wording changes the localization catalog version.
- Visual style and geometry can change without changing those semantic versions, provided the linear reading order and meaning remain intact.
- Removing or renaming an exact-eight directive/component, changing its props, changing an output mode's meaning, removing the direct React source form, or breaking the semantic DOM requires a package-major transition.
- Adding an Annotation recipe does not add a gesture. Adding support for a new plan schema alongside V1 is additive; dropping V1 support is breaking.
- First-party remark and React packages must declare Scene Module versions that support every plan schema they emit or accept. CI tests the supported version matrix and every renderer against the same canonical fixtures.

During migration from the task-explainer vertical slice:

1. add `createScenePlan` and the closed V1 types without immediately removing `deriveAnnotationScene`;
2. add the `plan` branch to `HandScene` while preserving `recipe + source + locale`;
3. switch remark component output from source props to the materialized plan;
4. keep the exact-eight maps, combined map, output mode names, default import behavior, semantic DOM, and readable invalid fallback;
5. deprecate compatibility exports only with an explicit major migration; the direct React source form remains supported because it is the minimal common call.

## Deferred capabilities

This boundary intentionally does not decide:

- built-in Annotation recipe registration, configuration, or localization extension;
- optional AI generation, review storage, privacy, or stale-plan policy;
- third-party Annotation recipe discovery and trust;
- build, SSR, CSS, font, or client bundle budgets;
- the canonical cross-renderer fixture and release matrix.

Those are owned by their downstream roadmap tickets. V1 also rejects a public recipe registry, global singleton, renderer callbacks, parts/slot Interface, author-authored plan JSON, author layout controls, and browser-measured core layout.
