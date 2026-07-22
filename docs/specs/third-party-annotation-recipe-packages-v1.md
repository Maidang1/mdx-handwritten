# Third-party Annotation recipe packages V1

## Purpose

This contract defines the one supported distribution, discovery, trust, and compatibility boundary for third-party Annotation recipes. It lets a host add named scene conventions while preserving minimal author input, deterministic offline builds, the closed Scene plan, and plan-only Annotation renderers. A Recipe package does not add a ninth Annotation gesture.

A third-party Annotation recipe is an explicitly trusted build dependency, not remotely supplied content. V1 standardizes npm package transport and a build-time compiler extension point; it does not create a marketplace, plugin host, runtime loader, or security sandbox.

## Distribution and discovery

A Recipe package is a standard ESM npm package. The host:

1. declares it in `dependencies` or `devDependencies`;
2. pins the resolved package and integrity through the project lockfile;
3. imports its package definition from an explicit module specifier; and
4. supplies that definition while constructing one Configured Scene compiler.

The intended host shape is:

```ts
import taskRecipes from '@acme/mdx-handwritten-recipes'
import { createSceneCompiler } from 'mdx-handwritten-scene/recipes'

const sceneCompiler = createSceneCompiler({
  recipePackages: [{
    packageName: '@acme/mdx-handwritten-recipes',
    definition: taskRecipes
  }]
})

sceneCompiler.createScenePlan({
  recipe: '@acme/mdx-handwritten-recipes/task-summary',
  source: '[ ] CLI-042 Add export command #cli !high',
  locale: 'zh-CN'
})
```

The public names, ownership, and lifecycle shown here are normative; implementation-only generic helpers may vary. Compiler construction synchronously validates the supplied definitions, copies and freezes declarative metadata and collection membership, and captures fixed compile-function references. Later mutation of exported arrays, metadata, or active-version maps cannot change that Configured Scene compiler. JavaScript closure state and external side effects cannot be frozen; purity and repeated-call determinism are publisher obligations checked by conformance evidence. Creating another compiler is the only supported way to change its configured recipe set.

V1 performs no `node_modules` scan, npm registry request, package-name inference, convention-based file search, environment-variable lookup, source-driven `import()`, or global registration. A recipe selector only chooses among definitions the host already imported. A blog author therefore provides the canonical recipe name, source, optional locale, and sparse Semantic corrections, but never a package URL, version range, loader, registry, or executable module path.

npm is the only standardized distribution channel. Git URLs, tarball URLs, CDNs, import maps, network catalogs, copied plugin folders, and packages downloaded during an ordinary build are unsupported even if a host could execute equivalent JavaScript independently.

## Package and compiler boundary

One Recipe package may expose one or more exact Annotation recipe versions. The secondary export `mdx-handwritten-scene/recipes` defines this normative Interface:

```ts
interface AnnotationRecipeLimitsV1 {
  readonly sourceCodeUnits: number
  readonly targets: number
  readonly rangesPerTarget: number
  readonly ranges: number
  readonly labels: number
  readonly relationships: number
  readonly gestures: number
  readonly targetReferencesPerRelationship: number
  readonly localizedTextCodeUnits: number
  readonly textCodeUnits: number
}

interface AnnotationRecipeMessagesV1 {
  readonly title: string
  readonly [key: string]: string
}

interface AnnotationRecipeCatalogV1 {
  readonly id: string
  readonly version: number
  readonly messages: {
    readonly en: AnnotationRecipeMessagesV1
    readonly 'zh-CN': AnnotationRecipeMessagesV1
  }
}

interface AnnotationRecipeCorrectionSlotsV1 {
  readonly targets: readonly string[]
  readonly labels: readonly string[]
  readonly relationships: readonly string[]
}

interface AnnotationRecipeCompileContextV1 {
  readonly source: string
  readonly locale: 'en' | 'zh-CN'
  readonly messages: AnnotationRecipeMessagesV1
  readonly targetCorrections: readonly Extract<
    SemanticCorrectionV1,
    {kind: 'target'}
  >[]
  readonly limits: AnnotationRecipeLimitsV1
}

interface AnnotationRecipeDraftV1 {
  readonly targets: readonly AnnotationTargetV1[]
  readonly labels: readonly AnnotationLabelV1[]
  readonly relationships: readonly AnnotationRelationshipV1[]
  readonly gestures: readonly AnnotationGestureV1[]
}

interface AnnotationRecipeDiagnosticV1 {
  readonly reason: string
  readonly message: string
  readonly sourceRange?: {readonly start: number; readonly end: number}
  readonly candidates?: readonly {
    readonly start: number
    readonly end: number
  }[]
}

type AnnotationRecipeCompileResultV1 =
  | {readonly ok: true; readonly draft: AnnotationRecipeDraftV1}
  | {
      readonly ok: false
      readonly diagnostics: NonEmpty<AnnotationRecipeDiagnosticV1>
    }

interface AnnotationRecipeValidationContextV1 {
  readonly source: string
  readonly locale: 'en' | 'zh-CN'
  readonly messages: AnnotationRecipeMessagesV1
  readonly draft: AnnotationRecipeDraftV1
  readonly appliedCorrections: readonly SemanticCorrectionV1[]
}

type AnnotationRecipeValidationResultV1 =
  | {readonly ok: true}
  | {
      readonly ok: false
      readonly diagnostics: NonEmpty<AnnotationRecipeDiagnosticV1>
    }

interface AnnotationRecipeDefinitionV1 {
  readonly ref: {readonly name: string; readonly version: number}
  readonly roles: readonly string[]
  readonly correctionSlots: AnnotationRecipeCorrectionSlotsV1
  readonly catalog: AnnotationRecipeCatalogV1
  readonly limits: AnnotationRecipeLimitsV1
  compile(
    context: AnnotationRecipeCompileContextV1
  ): AnnotationRecipeCompileResultV1
  validate(
    context: AnnotationRecipeValidationContextV1
  ): AnnotationRecipeValidationResultV1
}

interface AnnotationRecipePackageV1 {
  readonly protocol: 'mdx-handwritten/annotation-recipe-package'
  readonly protocolVersion: 1
  readonly packageName: string
  readonly recipes: readonly AnnotationRecipeDefinitionV1[]
  readonly activeVersions: Readonly<Record<string, number>>
}

interface AnnotationRecipePackageBindingV1 {
  readonly packageName: string
  readonly definition: AnnotationRecipePackageV1
}

interface CreateSceneCompilerOptions {
  readonly recipePackages: readonly AnnotationRecipePackageBindingV1[]
}

interface ConfiguredSceneCompiler {
  readonly createScenePlan: (
    input: CreateScenePlanInput
  ) => ScenePlanResult
}

type SceneCompilerConfigurationErrorCode =
  | 'scene-compiler-package-invalid'
  | 'scene-compiler-package-protocol-unsupported'
  | 'scene-compiler-package-name-mismatch'
  | 'scene-compiler-recipe-duplicate'
  | 'scene-compiler-active-version-missing'

declare class SceneCompilerConfigurationError extends Error {
  readonly name: 'SceneCompilerConfigurationError'
  readonly code: SceneCompilerConfigurationErrorCode
  readonly path: readonly (string | number)[]
}

declare function createSceneCompiler(
  options: CreateSceneCompilerOptions
): ConfiguredSceneCompiler
```

The secondary export also provides frozen `annotationRecipePackageProtocolV1` and `annotationRecipeLimitsV1` values. The latter contains the Scene Module maxima for every recipe-owned limit, so a package can copy the defaults and deliberately lower individual values.

The host configuration binds an expected npm package name to the imported definition. The definition repeats that package name, and compiler construction rejects a mismatch. This explicit binding is the namespace authority; the Scene Module does not introspect ESM resolution or prove which registry served the module. The packed-package conformance check separately compares the definition against its `package.json` name.

Each recipe definition declares:

- one canonical recipe name and positive integer version;
- a closed role vocabulary and exact target, label, and relationship Semantic correction slots;
- complete, versioned plain-text `en` and `zh-CN` Localization catalogs;
- fixed input and draft limits no larger than the Scene Module limits; and
- one synchronous compile function and one synchronous semantic validator that the publisher promises are pure and deterministic.

The compile function receives normalized source, the canonical locale, a frozen copy of the selected catalog messages, validated target corrections needed to resolve parsing ambiguity, and the package limits. Compile and validate are invoked as captured plain functions with an `undefined` receiver; they cannot use `this` to inspect or mutate the compiler's internal recipe contract. The compile function may produce only candidate targets, labels, relationships, gestures, or bounded package diagnostics. It cannot produce a title, final Scene plan, Plan provenance, source fingerprint, HTML, Markdown, JSX, CSS, coordinates, renderer callbacks, arbitrary extension fields, files, URLs, or executable content.

Catalogs contain strings only. `en` and `zh-CN` must have the same identifier-key set, including `title`; values are non-empty, bounded plain text. Core selects the exact catalog and materializes `messages.title` as the plan title. The compile function may combine the remaining selected strings with bounded semantic values to produce label and legend text, after which core validates every resolved string. There is no formatter DSL, ICU payload, locale fallback, function-valued message, or host translation lookup.

Core decodes every Semantic correction before package code runs. A target correction is passed to compile only when its slot is listed in `correctionSlots.targets`; this permits deterministic ambiguity resolution. Label and relationship corrections are not passed to compile. After a strict draft decode, core rejects any correction whose label or relationship ID is not declared, applies all three correction kinds through the shared correction machinery, and then revalidates the complete graph. Recipes with dynamic IDs must omit unsupported correction kinds rather than declare a pattern or wildcard.

The validator receives a frozen read-only graph after corrections and must enforce the exact recipe version's target identity, source meaning, and recipe-specific graph semantics. Core invokes it for both deterministic drafts and Reviewed candidates, but a candidate path never invokes `compile`. Current-source identity binding and generic closed-field, role, range, reference, gesture, provenance, catalog, and limit validation always run in core before the recipe-specific validator, so a Stale or structurally invalid candidate cannot invoke package code and package validation cannot replace or weaken the Scene plan contract.

The Scene Module remains the sole finalizer. It owns source normalization and identity, locale resolution, Semantic correction validation, range and reference integrity, catalog materialization, canonical ordering, limits, Plan provenance, stable diagnostics, and all-or-nothing Scene plan construction. Every successful output is therefore the same closed pure-JSON Scene plan consumed by first-party Annotation renderers.

Invalid package configuration is a host build-configuration failure: `createSceneCompiler` synchronously throws a typed `SceneCompilerConfigurationError` and returns no partial compiler. The error has the fixed `name`, stable `code`, immutable `path`, and explanatory `message` shown above. Validation visits package bindings in supplied order; within one binding it checks protocol, host name, package metadata, recipe definitions in array order, then lexicographically sorted active-version entries, and throws the first problem. Duplicate package bindings use `scene-compiler-package-invalid`; malformed shapes, catalogs, roles, corrections, limits, or functions use the same general code. This construction error is outside `ScenePlanResult` because no scene compilation began.

Once constructed, a recipe failure follows the existing result contract: diagnostics are returned and `plan` is `null`. Valid package diagnostics use a lowercase ASCII reason matching `[a-z][a-z0-9-]{0,79}` and are wrapped as `scene-recipe-rejected` with `<canonical-recipe-name>@<version>/<reason>` as `recipeCode`; a package cannot return a core diagnostic code. Core validates and bounds the message, source range, candidate ranges, count, and field set before wrapping it.

A thrown compile or validate function maps to the fixed suffix `package-compile-threw` or `package-validate-threw` without exposing the exception text or stack. A Promise, `null`, wrong discriminant, missing field, or unknown result field maps to `package-compile-result-invalid` or `package-validate-result-invalid`; rejected Promise results are consumed so their rejection cannot escape as an unhandled build-process error. A malformed package diagnostic maps to `package-diagnostic-invalid`. Result objects and every nested draft value must use enumerable string-keyed data properties: symbols, accessors, non-enumerable properties, and unknown fields are rejected before any value can enter a final plan. Core applies collection and nested-reference limits before traversing or copying package arrays. A structurally valid draft with an unknown field or invalid graph uses the corresponding core Scene plan diagnostic. None of these failures returns a partial plan.

The existing root `createScenePlan` export remains the zero-configuration, first-party-only Interface. It does not consult Configured Scene compiler instances or gain mutable process state. Every Configured Scene compiler always contains the exact first-party recipes supported by the installed Scene Module plus its supplied third-party definitions, so enabling an extension cannot make an existing built-in scene unknown. Built-ins are not re-registered through the public Recipe package protocol.

## Recipe identity

Every third-party canonical recipe name is package-qualified:

```text
<npm-package-name>/<recipe-local-name>
```

For example, package `@acme/mdx-handwritten-recipes` may own `@acme/mdx-handwritten-recipes/task-summary`. Each canonical name must use the host-bound package prefix. First-party bare names such as `task-explainer` remain reserved. V1 has no aliases, shadowing, or host-specific renaming; the longer package-qualified selector is the accepted cost of avoiding a central name registry.

V1 deliberately accepts a conservative ASCII subset of npm names. An unscoped package name matches `[a-z0-9][a-z0-9._-]{0,63}`. A scoped package name matches `@[a-z0-9][a-z0-9._-]{0,31}/[a-z0-9][a-z0-9._-]{0,63}`. A local recipe name matches `[a-z0-9][a-z0-9._-]{0,63}`. The canonical name is the exact package name, one `/`, and the local name, with at most 160 UTF-16 code units. Uppercase, whitespace, percent encoding, empty segments, additional `/` characters in the local name, Unicode aliases, and normalized alternatives are rejected even if a registry could store them.

The compiler rejects duplicate package bindings, duplicate canonical recipe name/version pairs, multiple active versions for one name, and a recipe whose identity does not belong to its host-bound package namespace. Package-qualified names make collision handling deterministic without a central registry. Renaming the npm package or local recipe name creates a new semantic identity; a Reviewed plan artifact that names the old identity becomes incompatible or unsupported, not Stale, unless its canonical source identity also changed.

Authors select the canonical name but never select a version or package range. For deterministic compilation the configured package's `activeVersions` map resolves that name to one exact recipe version; an approved candidate already carries an exact version and is accepted only while that exact version remains in the Configured Scene compiler.

## Independent compatibility versions

The following versions solve different problems and are never substituted for one another:

| Version | Owner | Meaning |
| --- | --- | --- |
| npm SemVer | Recipe package publisher | Distribution and public package API compatibility |
| npm lockfile resolution | Host | Exact reviewed bytes and integrity used by the build |
| Recipe package protocol version | Scene Module | Shape and behavioral obligations of imported definitions and drafts |
| Annotation recipe version | Recipe author | Grammar, target identity, roles, relationships, and Semantic correction meaning |
| Localization catalog version | Recipe author | Exact generated reader-facing wording |
| Scene plan schema version | Scene Module and renderers | Closed materialized JSON graph and invariants |

Every Recipe package declares `mdx-handwritten-scene` as a peer dependency with the range against which it was tested. Package-manager peer resolution is an install-time signal; compiler construction still checks the package protocol and every definition at runtime. A matching peer range alone never makes an invalid definition compatible.

Within an existing npm package major:

- adding a new canonical recipe name or retaining an older exact recipe version is additive;
- changing reader wording bumps its Localization catalog version;
- changing grammar, target identity, roles, relationships, or correction meaning creates a new Annotation recipe version; and
- changing the active version for an existing author selector is package-major because the same author input changes meaning.

Dropping an exposed exact recipe version, renaming a recipe, removing a supported locale, or changing the Recipe package protocol requires a package-major transition. Exact recipe versions are immutable. The compiler never chooses the nearest version, migrates a plan, downloads an older package, or falls back to a built-in with a similar name.

## Trust and security boundary

Explicit import is the trust grant. A Recipe package is arbitrary JavaScript running inside the host's build process with the authority that environment gives ordinary npm dependencies. `mdx-handwritten-scene` does not sandbox it and cannot prevent module evaluation, install scripts, filesystem access, network access, process access, nondeterminism, resource exhaustion, or data exfiltration by a malicious dependency.

Hosts therefore apply their normal dependency policy before installation: registry allow-lists, lockfile and integrity review, package provenance where available, source review, dependency scanning, and restricted CI credentials or networking. MDX Handwritten does not operate a trusted-recipe directory, certificate authority, signature service, or safety badge.

The compiler still contains the semantic output boundary. It passes no renderer, DOM, storage, model, network, or host callback to the recipe; validates every draft independently; enforces closed fields and fixed limits; and mints Plan provenance only after successful finalization. These checks protect Scene plan integrity and readable failure behavior. They do not turn package code into untrusted data or make a security claim about its side effects.

Author source can never name a module to load. Unknown or unconfigured recipe selectors fail without invoking any Recipe package compile function, although npm install scripts and ESM module evaluation may already have executed. Candidate JSON remains untrusted data and never acquires authority to install or import a Recipe package. It may name only an exact recipe version already captured by the host's Configured Scene compiler; after core binds the current source and validates the catalog, provenance, closed graph, and limits, core invokes that captured definition's semantic validator but never its compile function.

## Renderer and authoring boundaries

A Recipe package compile function is invoked only by an explicitly configured build-time compiler. `remark-mdx-handwritten` accepts an optional explicit Configured Scene compiler in host configuration. When present, remark must use it for every deterministic and reviewed-candidate `hw-scene` path in the document; when absent, remark uses the root first-party `createScenePlan`. It must materialize a plan before emitting `component`, `element`, or `strip` output, never stores the compiler in a global singleton, and never serializes recipe code into generated content.

`mdx-handwritten-react`, element output, strip output, SSR, RSC, preview, and the browser consume only a successfully materialized Scene plan. They never import, resolve, or execute Recipe packages. The direct React `recipe + source + locale` convenience form remains first-party-only; callers using third-party Annotation recipes compile explicitly and pass `plan`.

A Recipe package may publish static CSS through an ordinary explicit npm export, but that asset is outside this protocol: the host opts in separately, no renderer discovers or imports it, and the scene must retain its complete source-first linear meaning without it. V1 standardizes neither third-party renderer callbacks nor a theme plugin Interface.

## Compatibility and failure checks

Compiler construction fails closed with `SceneCompilerConfigurationError` when any configured package has an unsupported protocol, mismatched host package binding, invalid declarative definition shape, invalid package-qualified name, duplicate identity, missing active version, incomplete catalog, undeclared role or correction slot, or limits outside the protocol. The error exposes one stable construction code from `scene-compiler-package-invalid`, `scene-compiler-package-protocol-unsupported`, `scene-compiler-package-name-mismatch`, `scene-compiler-recipe-duplicate`, or `scene-compiler-active-version-missing`, plus its immutable path and explanatory message. No subset of an invalid package is silently enabled.

Per-scene compilation returns no plan when a selector is unknown or unconfigured, an exact reviewed version is absent, the recipe rejects its source, the recipe throws, a draft has unknown fields or exceeds a limit, a range is unsafe, a reference is unresolved, catalog output is invalid, or the shared finalizer rejects any invariant. Strict remark policy fails the build. Warning policy emits canonical source and diagnostics. Neither policy retries another version or recipe, preserves a partial scene, loads a package, or migrates data.

The implementation must supply a conformance suite that package authors and the repository can run against packed npm artifacts. The repository runner and case format are documented in [`scripts/recipe-conformance/README.md`](../../scripts/recipe-conformance/README.md). It covers:

- ESM import and peer-dependency metadata from `npm pack` output;
- protocol, host namespace binding, name grammar, active-version, duplicate, metadata-snapshot, catalog, and limit checks;
- exact full-plan fixtures for every declared recipe, version, and locale;
- repeated-call and JSON-round-trip determinism;
- thrown, Promise, `null`, malformed-result, invalid-diagnostic, oversized, unknown-field, unsafe-range, and unresolved-reference compile or validate outcomes with their exact diagnostic mapping;
- an unknown selector not invoking any compile function;
- active and inactive exact versions, proving that a Reviewed candidate invokes only `validate` for its installed exact version;
- declaration checks for all three Semantic correction kinds and target-correction delivery to compile;
- mixed built-in and third-party scenes, plus strict, warning, deterministic, and reviewed-candidate remark behavior through one explicitly supplied compiler;
- identical materialized plans across component, element, strip, SSR, and RSC paths; and
- proof that renderer bundles and browser output contain no Recipe package implementation.

The suite demonstrates protocol conformance for reviewed bytes; it is not malware analysis or a continuing trust endorsement.

## Explicit exclusions

V1 has no automatic discovery, remote loading, mutable registry, global compiler, author version range, aliases, dependency solver, compatibility negotiation, implicit migration, sandbox, worker isolation claim, third-party Plan provenance engine, renderer callback, DOM hook, executable recipe DSL, or marketplace policy. Supporting any of those requires a separate contract and cannot weaken the npm-only, explicit-import, plan-finalization, or fail-closed boundaries defined here.
