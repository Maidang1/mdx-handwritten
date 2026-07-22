# Annotation scene layout V1

## Purpose

Layout V1 defines what an Annotation renderer may promise without reading viewport geometry or measuring rendered content. It consumes a valid Scene plan V1 and preserves the same meaning in wide, narrow, print, forced-colors, and no-CSS contexts.

The universal experience is source-first. Rich placement is a deterministic enhancement, not a requirement for understanding the Annotation scene.

## Universal linear form

Every rendered scene keeps this document order:

1. Scene caption.
2. Canonical source as real text.
3. One complete, ordered text legend.

Every legend entry identifies its Annotation relationship and all ordered Annotation targets without relying on color, location, shape, or connector direction. Styled renderers add numbered markers to target ranges and may associate those ranges with legend entries through ordered `aria-describedby` references. Connectors are always decorative.

With CSS unavailable, marker styling may disappear; canonical source and the self-contained legend remain sufficient and keep the same order. Copying or reading the document never requires SVG, generated connector geometry, or client JavaScript.

## Rich-layout envelopes

A renderer may select a rich topology only when the recipe version, container, and canonical source satisfy the complete Rich-layout envelope below. An unknown or unproved capacity predicate selects the linear form.

| Annotation recipe | Minimum container | Accepted content capacity | Rich topology |
| --- | ---: | --- | --- |
| `task-explainer@1` | `42rem` | At most two canonical-source lines and exactly six recipe roles | Source cell plus one six-entry label rail |
| `mdtask-terminal@1` | `42rem` | Exactly three command groups, seven task rows, and at most 59 ASCII columns | Inert transcript cell plus one row-local label rail |
| `status-change@1` | `64rem` | Exactly two comparison panels and one factual verdict | Before/after panel cells plus one verdict cell and one label rail |

These thresholds are closed V1 capacities, not hints. Repeated or extra roles, an eighth terminal task row, a third comparison panel, an opaque row, a fragmented target, content outside the declared column budget, or any route that crosses groups is over capacity.

The renderer owns these constants by Annotation recipe name and version. They are not author input and are never serialized into the Scene plan.

## Collision guarantee

Within a Rich-layout envelope, the renderer guarantees only that its declared source, label, and connector cells do not overlap. It may draw a bounded decorative connector between adjacent known cells. It does not promise:

- global label packing;
- obstacle routing;
- connectors across wrapped prose or opaque code;
- a connector to the exact painted bounds of an Annotation target;
- layout chosen from `ResizeObserver`, `getBoundingClientRect`, hydration, or another client measurement;
- rich layout for arbitrary prose.

Arbitrary prose and opaque code receive the universal linear form. Anchor Positioning or other platform features may enhance Visual style later, but they cannot change eligibility, document order, or fallback meaning.

## Degrade and fail-closed behavior

The renderer selects one result for the whole Annotation scene; it never mixes a partial rich rail with a fallback legend.

| Condition | Required result |
| --- | --- |
| Valid plan inside its complete Rich-layout envelope in ordinary screen media | The recipe's finite rich topology, with the complete legend still present |
| Container below the recipe threshold | Canonical source + numbered markers + complete legend |
| A recipe-owned capacity check cannot rule out wrapping, fragmentation, over-capacity content, opaque geometry, or an unsupported route | Canonical source + numbered markers + complete legend |
| Print | Canonical source + numbered markers + complete legend in normal paged flow; no internal source clipping and no connectors |
| Forced colors | Canonical source + system-color numbered markers + complete legend; no connectors |
| No CSS | Canonical source + complete self-contained legend in document order |
| Invalid semantics, missing references, unsupported Scene plan version, or a Scene plan V1 safety-limit violation | Canonical source only; fail closed and report diagnostics |

## Determinism

Rich eligibility is a pure function of the recipe version, materialized Scene plan, and CSS container/media conditions. Renderers do not estimate coordinates, observe layout, or retry placement. The same valid plan and declared conditions therefore choose the same topology during SSR, hydration, static export, and client navigation.

The `matrix`, `rails`, and `article` prototypes on `prototype/deterministic-scene-layout` are validation evidence, not production renderer APIs. Production package ownership and compatibility remain the responsibility of the package-boundary decision.
