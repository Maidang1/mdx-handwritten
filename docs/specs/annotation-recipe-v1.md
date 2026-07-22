# Built-in Annotation recipe and localization contract V1

## Purpose

This contract defines how first-party Annotation recipes are selected, implemented, localized, versioned, and extended behind `createScenePlan`. It keeps author input minimal while making grammar interpretation, semantic identity, localized reader text, and ambiguity handling deterministic and reviewable.

The three initial built-ins are `task-explainer`, `mdtask-terminal`, and `status-change`. The shipped `task-explainer` vertical slice is compatibility evidence; this document defines the production V1 target shared by all three recipes.

## Author Interface

The only callable Scene Module Interface remains:

```ts
createScenePlan(input: CreateScenePlanInput): ScenePlanResult
```

An ordinary author supplies source plus a recipe. Locale is optional, and Semantic corrections remain sparse:

```ts
createScenePlan({
  recipe: 'task-explainer',
  source: '[ ] CLI-042 Add export command #cli !high',
  locale: 'zh-CN'
})
```

Authors do not provide a grammar, role map, message catalog, formatter, target ID, package name, coordinates, font, or runtime registry. Direct React and `hw-scene` authoring preserve this same `recipe + source + locale` shape.

### Recipe selection

A recipe selector is one bare built-in name:

```text
task-explainer
mdtask-terminal
status-change
```

A name resolves to the exact recipe version installed by the package. The resolved name and version are always materialized into the Scene plan, while the package lockfile pins ordinary builds. V1 rejects `@version`, ranges, `latest`, package specifiers, nearest-version matching, and implicit migration on the author path. Approved candidate JSON already carries an exact recipe version and is accepted only when that version is installed.

Changing the meaning of an existing recipe name requires a new recipe version and a package-major because the same author call changes. Adding a new built-in is package-minor. A new package major may drop an old exact version; an approved candidate that names the dropped version then fails with `scene-recipe-version-unsupported`. Exact recipe versions remain immutable.

`annotationRecipeNames`, while retained as readonly compatibility data, lists names rather than acting as a registry. It has no mutation, lookup callback, or loading behavior.

## Private Recipe Module

First-party recipes are statically imported into a frozen table owned by `mdx-handwritten-scene`:

```ts
const builtInRecipes = {
  'task-explainer@1': taskExplainerV1,
  'mdtask-terminal@1': mdtaskTerminalV1,
  'status-change@1': statusChangeV1
} satisfies BuiltInRecipeTable

const recipeByName = {
  'task-explainer': taskExplainerV1,
  'mdtask-terminal': mdtaskTerminalV1,
  'status-change': statusChangeV1
} satisfies BuiltInRecipeNameTable
```

Each entry conforms to a package-private shape equivalent to:

```ts
interface BuiltInRecipeDefinitionV1<
  Name extends BuiltInRecipeName,
  Version extends number,
  Role extends string,
  MessageKey extends string
> {
  readonly ref: {
    readonly name: Name
    readonly version: Version
  }
  readonly roles: readonly Role[]
  readonly correctionSlots: readonly string[]
  readonly catalog: {
    readonly id: string
    readonly version: number
    readonly messages: Readonly<
      Record<'en' | 'zh-CN', Readonly<Record<MessageKey, RecipeMessage>>>
    >
  }
  compile(context: RecipeCompileContextV1): RecipeDraftResultV1
}
```

This sketch documents ownership, not a public TypeScript ABI. The definition type, compile context, parser values, message keys, builders, and draft never leave the package root. `compile` hides tokenization and parsing and can only return bounded semantic targets, labels, relationships, gestures, or recipe diagnostics. It cannot return a final plan, HTML, Markdown, JSX, CSS, coordinates, Rich-layout envelope values, arbitrary fields, or executable content.

The shared finalizer, not each recipe, owns:

1. source normalization, UTF-16 safety, and fingerprinting;
2. recipe selection and Localization locale resolution;
3. declared Semantic correction validation and application;
4. target, range, reference, relationship, and gesture validation;
5. Localization catalog materialization;
6. canonical ordering, fixed limits, and Plan provenance;
7. stable diagnostic collection; and
8. all-or-nothing Scene plan construction.

These are pure, synchronous, in-process dependencies, so V1 introduces no port or Adapter for them. A new first-party recipe requires a source change, fixtures, review, and a package release.

## Grammar, roles, and target identity

One exact recipe version owns a closed grammar and role vocabulary. A renderer or theme interprets a role only after dispatching on exact recipe name and version; role strings do not form a global extensible styling vocabulary.

A recipe consumes its declared source form completely. Allowed whitespace and punctuation belong to the grammar. Unknown tokens, missing required slots, duplicate singleton slots, conflicting structured records, extra panels, and lines that cannot be classified uniquely are errors. A recipe may ignore no source merely because that source resembles prose.

Target IDs follow the Scene plan identity contract:

- a fixed grammar slot uses a stable slot ID such as `state`, `description`, `before`, or `verdict`;
- a structured value uses a version-owned canonical key such as `tag:cli`, `field:blocked_by`, or `task:AUTH-004`;
- a named Semantic correction anchor uses its declared stable anchor;
- repeated occurrences of the same semantic key become one target with ordered ranges; and
- source text, range offsets, AST paths, selectors, and source-order suffixes such as `tag-2` never define identity.

Recipe V1 owns any key normalization explicitly. It cannot change case folding, Unicode normalization, escaping, or structured-key meaning without a new recipe version. Exact source slices remain unchanged in target ranges.

### Initial role and identity contracts

| Recipe | Closed V1 roles | Identity rules and strictness |
| --- | --- | --- |
| `task-explainer@1` | `state`, `stable-id`, `description`, `tag`, `priority`, `field` | Fixed slots use their role names. Tags use `tag:<canonical-key>` and fields use `field:<canonical-key>`; repeated keys group ranges. Priority is single-valued. A missing task header, duplicate priority, malformed metadata token, or missing description rejects the recipe. |
| `mdtask-terminal@1` | `prompt`, `command`, `task-state`, `task-id`, `description`, `tag`, `priority`, `dependency`, `location`, `detail` | The transcript is inert data. Commands use grammar-defined keys such as `command:list-open` and `command:view:AUTH-005`; repeated appearances of the same structured leaf ID group ranges, and dependencies use their dependent/blocker IDs. Unknown commands, malformed output, conflicting facts for one task, or output not owned by a declared command rejects the recipe. Compilation never executes a command. |
| `status-change@1` | `before`, `after`, `verdict` | The exact slots are `before`, `after`, and `verdict`; the relationship is ordered `before → after`. Missing or duplicate slots, an extra panel, or a verdict that cannot be tied uniquely to the comparison rejects the recipe. |

V1 structured keys are case-sensitive and receive no Unicode normalization beyond the Scene source's existing `trim-lf-v1` processing. A tag key excludes its leading `#`; a field key excludes `@` and its value delimiter; a task key is the exact grammar-validated stable ID. Changing these rules requires a new recipe version.

`mdtask-terminal@1` partitions every recognized token range among non-overlapping leaf targets. Prompt markers share `prompt`; the remaining command syntax uses a grammar key such as `command:list-open` or `command:view:AUTH-005`; structured task leaves use `task:<id>:state`, `task:<id>:id`, `task:<id>:description`, `task:<id>:priority`, `task:<id>:tag:<key>`, `task:<id>:location`, and `task:<id>:detail`; a dependency uses `task:<dependent-id>:depends-on:<blocker-id>`. Repeated appearances of the same leaf group ranges under that ID. A command target excludes a task-ID range it semantically contains, so targets never overlap.

The table fixes semantic vocabulary, not geometry or colors. Recipe-owned Rich-layout envelopes and theme rules must also dispatch on the exact recipe version so a role from one recipe cannot inherit another recipe's meaning accidentally.

## Strict ambiguity and diagnostics

No recipe may resolve ambiguity by choosing the first, last, nearest, shortest, or visually convenient match. It may not use an occurrence number, fuzzy text search, model call, browser measurement, or locale-specific heuristic that is absent from its versioned grammar.

When a declared slot has multiple candidates, the recipe either applies one valid named Semantic correction or fails with the core code `scene-recipe-rejected`. `recipeCode` is stable and namespaced as:

```text
<recipe-name>@<version>/<reason>
```

Examples include:

```text
task-explainer@1/priority-ambiguous
mdtask-terminal@1/task-facts-conflict
status-change@1/panel-count-invalid
```

The complete V1 recipe reason set is:

```text
task-explainer@1/task-syntax-invalid
task-explainer@1/description-missing
task-explainer@1/metadata-invalid
task-explainer@1/priority-ambiguous
task-explainer@1/structured-key-conflict
mdtask-terminal@1/transcript-empty
mdtask-terminal@1/command-unknown
mdtask-terminal@1/command-output-invalid
mdtask-terminal@1/task-facts-conflict
mdtask-terminal@1/dependency-invalid
status-change@1/panel-count-invalid
status-change@1/before-missing
status-change@1/after-missing
status-change@1/verdict-missing
status-change@1/slot-ambiguous
status-change@1/verdict-reference-ambiguous
```

A new failure reason requires a new recipe version unless it maps without information loss to this set. Malformed `createScenePlan` input uses `scene-input-invalid`; an unknown bare author recipe uses `scene-recipe-unknown`; an approved candidate naming a known recipe but an uninstalled exact version uses `scene-recipe-version-unsupported`.

The diagnostic includes a deterministic `sourceRange` when one source region owns the failure and every `candidates` range when a choice is ambiguous. Candidates are deduplicated and sorted by `start`, then `end`. At most 32 candidates may occur in one diagnostic; an overflow returns `scene-plan-limit-exceeded` with no partial candidate list. Diagnostic `message` is developer-facing English convenience text and is not read from the Localization catalog. A failure always returns `plan: null`; no renderer receives a partial or guessed scene.

A Semantic correction may address only a correction slot or semantic anchor declared by that exact recipe version. It cannot add grammar, reinterpret unknown syntax, change a recipe version, add a role, or request geometry.

## Localization locale resolution

`locale` selects the language of recipe-generated title, labels, and legend text. It does not declare or detect the language of author-supplied source. Omission resolves to `en`. The core resolver, not an individual recipe or renderer, performs these deterministic steps:

1. reject an empty value, surrounding whitespace, or a non-string value;
2. compare the whole input case-insensitively against the frozen supported catalog tags;
3. materialize the matched catalog's canonical BCP 47 spelling; and
4. return `scene-locale-unsupported` when there is no exact supported match.

Initial catalog locales are exactly `en` and `zh-CN`. Inputs such as `EN` and `zh-cn` resolve to their canonical catalog spelling. `en-US`, `zh`, `zh-Hans`, `zh-Hans-CN`, `zh-CN-x-blog`, `zh-Hant`, `zh-TW`, `yue`, and all other tags fail. This is exact catalog selection, not RFC 4647 lookup or a claim that neighboring tags are invalid languages.

The resolver does not inspect content, read the process or browser locale, consult the IANA registry at runtime, perform RFC 4647 lookup, call `Intl`, add CLDR likely subtags, apply aliases, translate at runtime, or silently use the package default after an unsupported request. The frozen two-tag comparison cannot drift with platform locale data; changing an existing match is package-major.

A successful production plan keeps the closed Scene plan V1 shape:

```ts
localization: {
  locale: string
  catalog: {
    id: string
    version: number
  }
}
```

`localization.locale` must equal one canonical locale supported by that exact recipe version and identifies the actual Localization catalog language. The current built-in implementation narrows it privately to `'en' | 'zh-CN'`; the public Scene plan remains open to additive locales without changing schema.

## Localization catalogs

Every built-in recipe version ships complete `en` and `zh-CN` catalogs in the same source module or an adjacent private file. A catalog contains every title, label, legend phrase, join rule, and punctuation formatter the recipe can materialize. Compile-time checks and fixtures reject a missing or extra message key across the two locales.

Catalog functions receive bounded semantic values and return plain text. They cannot return message keys, ICU payloads, Markdown, HTML, JSX, URLs, CSS, or arbitrary markup. They do not call the host's translation system, network, filesystem, clock, time zone, or ambient `Intl` formatter.

A catalog ID is globally unique within the Scene Module and stable across versions; the recommended form is `mdx-handwritten/<recipe-name>/reader-text`. Versions are positive integers and increase monotonically within that ID. Every locale of one recipe catalog shares the same ID and version. Changing reader-visible wording, punctuation, ordering inside a formatted sentence, a formatter's output, or the set of complete locales bumps the catalog version. Adding a locale is package-minor plus a catalog-version bump. Changing or removing an existing resolution is package-major. Locale changes never alter targets, roles, relationships, or gestures for the same source and recipe version.

The standards evidence behind canonicalization, lookup, Chinese tagging, real `lang`, and CJK font selection is recorded in [`../research/annotation-recipe-localization-standards.md`](../research/annotation-recipe-localization-standards.md).

## Rendering and CJK fonts

Annotation renderers place `localization.locale` on generated title, label, and legend containers as a real HTML `lang` attribute. Canonical source does not inherit that catalog language: it inherits the surrounding article's language. `data-hw-locale` exposes the catalog locale on the scene root for a stable theme hook, but it does not replace `lang`. Element and component output preserve these nodes directly; strip output carries `lang` on its generated legend container.

The Scene plan contains no font family, glyph choice, line-breaking rule, direction, or layout measurement. `mdx-handwritten-theme` owns language-sensitive Visual style through `:lang()` and `--hw-font-family-cjk`. Chinese handwritten labels prefer Kai-capable system fonts before the Latin handwriting font, while canonical source remains in the independent monospace stack. Hosts may override the token without changing recipe or plan compatibility.

V1 does not bundle a large CJK web font. Issue #13 owns font and bundle budgets. A Rich-layout envelope must be proven for each recipe version and Localization locale without relying on one machine's exact glyph metrics; otherwise the whole scene uses its linear fallback. Issue #14 owns cross-browser CJK visual fixtures.

## Required validation

Production implementation is gated by tests through `createScenePlan`, not by direct tests of private parsers:

- each of the three built-ins in `en` and `zh-CN` has an exact full-plan fixture;
- all three bare recipe names resolve to exact materialized versions, while author version/range syntax and unknown names fail;
- canonical catalog casing, exact `en`/`zh-CN` selection, and unsupported fallback/alias requests are covered;
- the two catalogs produce identical targets, roles, relationships, and gestures for the same source, differing only in localized text and localization metadata;
- every zero/one/many grammar branch and every ambiguity candidate list has a negative fixture;
- repeated structured keys, CRLF, CJK text, emoji, combining marks, full-width characters, and surrogate boundaries are covered;
- catalog completeness and stable catalog identity are checked at build time;
- JSON round-trip and repeated calls are byte-for-byte deterministic; and
- adding a version cannot change an older exact-version fixture.

Theme contract tests assert that CJK handwriting uses the CJK token while source remains monospace and that role selectors are scoped by exact recipe/version. Browser, print, forced-colors, no-CSS, and screenshot validation remain the release matrix owned by issue #14.

## Deferred extension boundary

V1 does not expose `BuiltInRecipeDefinitionV1`, the static table, message accessors, parser helpers, or a registration function. It does not discover npm packages, load dynamic code, accept third-party catalogs, negotiate package ranges, sandbox recipes, or grant a recipe renderer callbacks or DOM access.

Issue #12 must define third-party packaging, trust, compatibility, and discovery as a separate explicit capability. It may consume the semantic lessons of this private contract, but it cannot turn the built-in table into an ambient mutable registry or weaken strict compilation for first-party recipes.
