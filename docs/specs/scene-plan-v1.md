# Scene plan V1

## Purpose

Scene plan V1 is the common, reviewable result of compiling an Annotation recipe or accepting an already approved proposal. It is a fully materialized semantic graph over canonical source. Renderers consume the same graph for component, element, strip, print, and no-CSS outputs without reconstructing author intent.

The contract is deliberately closed. A plan contains no coordinates, connector paths, CSS, SVG paths, React values, executable markup, renderer settings, model prompts, provider responses, timestamps, or arbitrary extension data.

## Public Interface

The pure Scene module exposes one synchronous entry point:

```ts
type CreateScenePlanInput =
  | {
      source: string
      recipe: string
      locale?: string
      corrections?: readonly SemanticCorrectionV1[]
      candidateJson?: never
    }
  | {
      source: string
      candidateJson: string
      recipe?: never
      locale?: never
      corrections?: never
    }

type ScenePlanResult =
  | {
      ok: true
      plan: ScenePlanV1
      diagnostics: readonly []
    }
  | {
      ok: false
      plan: null
      diagnostics: NonEmpty<SceneDiagnosticV1>
    }

declare function createScenePlan(input: CreateScenePlanInput): ScenePlanResult
```

`candidateJson` is a string rather than an arbitrary JavaScript value. The implementation checks its byte size before parsing, accepts JSON data only, and rejects unknown fields. Both input variants enter the same normalizer, graph validator, canonical ordering step, and limit checker. Expected input errors do not throw, and no failure returns a partial plan.

The candidate path is for a proposal that an upstream review workflow has approved. `createScenePlan` validates the approval reference's shape; it cannot establish that an external review occurred. It does not call a model, perform review, or persist review records.

The upstream generation, disclosure, approval, sidecar storage, and ordinary-build behavior are defined by [Optional AI Scene authoring V1](./optional-ai-authoring-v1.md). In particular, provider output is never passed through as trusted approval: the authoring tool creates reviewed provenance only after approval, and every ordinary build revalidates the stored raw JSON against current source.

When omitted on the recipe path, `locale` resolves to `en`. A successful plan always records the canonical Localization locale used for generated reader text and the exact catalog version. Locale resolution follows the centralized exact-match policy in the built-in Annotation recipe contract; it does not declare the language of author-supplied source.

## Materialized plan

```ts
interface ScenePlanV1 {
  schema: 'mdx-handwritten/scene-plan'
  schemaVersion: 1
  recipe: {
    name: string
    version: number
  }
  localization: {
    locale: string
    catalog: {
      id: string
      version: number
    }
  }
  title: string
  source: {
    text: string
    identity: {
      normalization: 'trim-lf-v1'
      algorithm: 'sha256'
      digest: string
    }
  }
  targets: readonly AnnotationTargetV1[]
  labels: readonly AnnotationLabelV1[]
  relationships: readonly AnnotationRelationshipV1[]
  gestures: readonly AnnotationGestureV1[]
  provenance: ScenePlanProvenanceV1
}

interface SourceRangeV1 {
  start: number
  end: number
  exactText: string
}

interface AnnotationTargetV1 {
  id: string
  role: string
  semanticAnchor?: {
    name: string
  }
  ranges: NonEmpty<SourceRangeV1>
}

interface AnnotationLabelV1 {
  id: string
  text: string
}

type AnnotationRelationshipV1 =
  | {
      id: string
      kind: 'describes'
      labelId: string
      targetIds: NonEmpty<string>
      detailKind: 'short-description'
      legendText: string
    }
  | {
      id: string
      kind: 'relates'
      relation: 'depends-on' | 'contrasts' | 'changes-to'
      labelId: string
      fromTargetIds: NonEmpty<string>
      toTargetIds: NonEmpty<string>
      detailKind: 'short-description'
      legendText: string
    }

type AnnotationGestureV1 =
  | {
      id: string
      kind: 'annotate'
      relationshipId: string
    }
  | {
      id: string
      kind: 'emphasize'
      targetIds: NonEmpty<string>
      intent: 'attention' | 'positive' | 'warning' | 'negative'
    }
  | {
      id: string
      kind: 'group' | 'connect'
      relationshipId: string
    }
  | {
      id: string
      kind: 'verdict'
      relationshipId: string
      intent: 'positive' | 'negative' | 'warning'
    }
```

`NonEmpty<T>` means a readonly array with at least one item. `localization.locale` is the canonical BCP 47 language of the Localization catalog that produced the plan's plain-text `title`, label text, and legend text. Renderers put that language on generated reader text, while canonical source inherits its host document language. The plan never stores localization keys, HTML, Markdown, ICU messages, or other executable content.

Every label is referenced by an Annotation relationship, and every Annotation relationship is referenced by an Annotation gesture. The graph cannot contain orphan presentation payload. A renderer chooses geometry and Visual style from semantic gesture kind, relationship kind, relation, and intent; those rendering choices do not become plan data.

Every relationship is canonically a real-text label applied to one ordered, non-empty target sequence. A `describes` relationship uses `targetIds`; a `relates` relationship uses the flattened sequence `[...fromTargetIds, ...toTargetIds]`. `legendText` is a complete flat description that identifies both the label and every target without relying on location, color, shape, or connector direction. A relationship Semantic correction may override ambiguous generated wording, including when target literals repeat.

V1 supports only `short-description` relationships. Renderers may connect each referenced target to the shared label with ordered `aria-describedby` ID references, but the visible linear legend remains primary. Structured extended explanations and `aria-details` require a later schema version; V1 rejects them rather than flattening them silently.

These kinds describe higher-level scene intent. They do not register new `hw-*` directives or React components and do not expand or alter the fixed eight low-level Annotation gesture contracts. Each renderer maps scene intent onto those existing contracts and its accessible legend.

## Semantic corrections

The caller-facing parsed correction contract is:

```ts
type SemanticCorrectionV1 =
  | {
      id: string
      kind: 'target'
      slot: string
      anchor: string
      ranges: NonEmpty<SourceRangeV1>
    }
  | {
      id: string
      kind: 'label'
      labelId: string
      text: string
    }
  | {
      id: string
      kind: 'relationship'
      relationshipId: string
      change: RelationshipCorrectionChangeV1
    }

type RelationshipEndpointsV1 =
  | {
      kind: 'describes'
      targetIds: NonEmpty<string>
    }
  | {
      kind: 'relates'
      fromTargetIds: NonEmpty<string>
      toTargetIds: NonEmpty<string>
    }

type RelationshipCorrectionChangeV1 =
  | {
      endpoints: RelationshipEndpointsV1
      legendText?: string
    }
  | {
      endpoints?: never
      legendText: string
    }
```

Authors do not type numeric offsets. Author-facing syntax or tooling selects source content and is responsible for producing these scene-local ranges. A correction may resolve only an Annotation target, label, or Annotation relationship. It cannot change an Annotation gesture, Visual style, geometry, or renderer behavior. The concrete author-facing syntax remains a separate contract.

## Plan provenance

```ts
type ScenePlanProvenanceV1 =
  | {
      kind: 'deterministic-recipe'
      engine: {
        name: 'mdx-handwritten-scene'
        version: string
      }
      appliedCorrections: readonly {
        kind: 'target' | 'label' | 'relationship'
        ref: string
      }[]
    }
  | {
      kind: 'reviewed-proposal'
      engine: {
        name: 'mdx-handwritten-scene'
        version: string
      }
      generator: {
        id: string
        version?: string
      }
      review: {
        status: 'approved'
        id: string
      }
    }
```

Plan provenance is compact review context, not cryptographic proof. It contains no prompts, provider responses, private source copies, arbitrary metadata, or timestamps. The review system owns storage, privacy, and the evidence referenced by `review.id`.

For a reviewed proposal, the private Review record binds `review.id` to the exact source, candidate, schema, recipe, catalog, and Generation disclosure identities. That record is not part of the plan and is not required by ordinary offline compilation; integrations that require proof enforce it at the authoring or CI policy boundary.

## Source and identity invariants

`trim-lf-v1` replaces CRLF and lone CR with LF, then removes outer ECMAScript whitespace. It rejects unpaired UTF-16 surrogates. `source.identity.digest` is the lowercase 64-character hexadecimal SHA-256 digest of the normalized source encoded as UTF-8.

The `source` argument is authoritative on both paths. A candidate's embedded source text and digest must exactly match it after normalization. Any mismatch stales the whole candidate; old ranges are never reused and fuzzy relocation is forbidden.

An Annotation target's identity is the tuple of exact recipe name, exact recipe version, and target ID. A target ID is minted only from a recipe grammar slot, structured key, or named Semantic correction anchor. Source text, source-order ordinal, numeric offset, AST path, and selector never define identity.

Ranges are non-empty, integer, half-open UTF-16 intervals over canonical source. They must be in bounds, must not split a surrogate pair, must be strictly increasing and disjoint within a target, and must not overlap ranges owned by another target. Adjacent ranges are allowed. `exactText` must equal the corresponding source slice.

IDs and semantic anchors are unique. Semantic anchors are case-sensitive; a correction that names no parsed anchor fails with `scene-correction-anchor-missing`. Every reference resolves. Target-reference arrays are ordered and deduplicated, and one target cannot occur in both endpoint arrays of a `relates` relationship. Targets are canonically sorted by first range and then ID; Annotation relationships remain in legend order. Endpoint order is semantic: `changes-to` means before then after, `depends-on` means dependent then blocker, and `contrasts` means the first stated comparison group then the second. Array position never defines identity.

An internal exact-text locator is allowed only for a non-empty literal with exactly one match. An empty literal fails with `target-text-empty`; zero matches fail with `target-text-not-found`. More than one match, including overlapping occurrences, fails with `target-text-ambiguous` and returns every candidate range. It never accepts an occurrence number and never falls back to contextual or fuzzy matching.

## Fixed V1 limits

Limits belong to the implementation-owned V1 validator and are not plan fields that a producer can change.

| Limit | Maximum |
| --- | ---: |
| Candidate JSON, UTF-8 bytes | 65,536 |
| Canonical source, UTF-16 code units | 4,096 |
| Semantic corrections | 16 |
| Annotation targets | 64 |
| Ranges in one target | 16 |
| Ranges in the whole plan | 128 |
| Labels | 64 |
| Annotation relationships | 64 |
| Annotation gestures | 64 |
| Target references in one relationship | 32 |
| ID, role, or semantic anchor, UTF-16 code units | 80 |
| One label, title, or legend string, UTF-16 code units | 240 |
| All localized text, UTF-16 code units | 16,384 |
| Returned diagnostics | 32 |
| Candidates in one diagnostic | 32 |

These are safety caps, not layout promises or a performance budget. Oversized input fails closed; an author must split a larger explanation into multiple Annotation scenes.

## Diagnostics

```ts
interface SceneDiagnosticV1 {
  code: SceneDiagnosticCodeV1
  message: string
  path?: readonly (string | number)[]
  sourceRange?: {
    start: number
    end: number
  }
  candidates?: readonly {
    start: number
    end: number
  }[]
  recipeCode?: string
  limit?: {
    name: keyof typeof scenePlanLimitsV1
    maximum: number
    actual: number
  }
}
```

`code` is machine-stable; `message` is explanatory convenience. V1 defines these core codes:

```text
scene-input-invalid
scene-recipe-unknown
scene-recipe-version-unsupported
scene-locale-unsupported
scene-source-empty
scene-source-too-long
scene-source-unpaired-surrogate
scene-recipe-rejected
scene-correction-invalid
scene-correction-anchor-missing
scene-plan-json-invalid
scene-plan-schema-unsupported
scene-plan-shape-invalid
scene-plan-field-unknown
scene-plan-limit-exceeded
scene-plan-source-stale
scene-plan-id-invalid
scene-plan-id-duplicate
scene-plan-anchor-duplicate
scene-plan-reference-missing
scene-plan-range-invalid
scene-plan-range-surrogate-split
scene-plan-range-overlap
scene-plan-text-mismatch
scene-plan-localization-invalid
scene-plan-provenance-invalid
target-text-empty
target-text-not-found
target-text-ambiguous
```

A recipe-specific failure uses `scene-recipe-rejected` plus a stable `recipeCode`, avoiding an open-ended core union. Diagnostics are sorted deterministically by validation phase—input, source, schema, shape, range, text, reference, gesture, provenance, then limit—and then by path and code. The result is truncated to 32 diagnostics. All Module diagnostics are errors; a remark integration's warning, stripping, or build-failure policy is outside this Interface.

## Versioning and compatibility

Schema version, recipe version, localization catalog version, and source normalization version evolve independently:

- Adding a required field, changing field meaning or an invariant, or changing an Annotation relationship or Annotation gesture shape requires a new schema version.
- Changing a recipe grammar, target identity, or relationship semantics requires a new recipe version.
- Changing resolved localized text requires a new catalog version.
- Changing CSS, geometry, layout fallback, or Visual style requires none of those version bumps.

Unknown schema versions and unsupported exact recipe versions are rejected. V1 performs no implicit migration. Author source may name an installed recipe without writing its version; the plan records the resolved exact version and the package lockfile makes that resolution reproducible. A reviewed candidate is accepted only while its exact recipe version is installed and supported.

## Hidden implementation

The Scene module privately owns source normalization and fingerprinting, built-in recipe lookup, parsers, semantic ID minting, localization catalogs, correction conflict resolution, bounded JSON decoding, unknown-field rejection, graph and provenance validation, canonical ordering, limits, and diagnostic collection.

Those responsibilities are synchronous, pure, and in-process. The Module performs no file, network, clock, model, DOM, React, or remark access. Optional AI and review sit upstream; renderers sit downstream. There is no public adapter or recipe registry in V1 because the contract has no varying external dependency.
