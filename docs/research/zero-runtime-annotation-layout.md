# Zero-runtime layout primitives for dense annotation scenes

_Research date: 2026-07-22_

## Decision

MDX Handwritten can support dense annotation scenes without client-side
measurement, but only by separating two promises:

1. The portable baseline can promise readable, non-overlapping labels when
   labels remain in normal flow: local `inline-grid` pairs, recipe-defined CSS
   Grid tracks, or a numbered target marker plus an ordered legend.
2. Floating labels and connectors can be a progressive enhancement. CSS Anchor
   Positioning can tether a label to a target and try alternate positions when
   that label overflows its containing block, but it does not globally pack
   labels or route connectors around other content. Dense or structurally
   unknown scenes therefore must fall back rather than claim collision-free
   geometry.

This keeps the **scene plan** geometric-free: it records targets, labels,
relationships, and annotation gestures. An **annotation recipe** additionally
declares a finite layout topology and capacity. The renderer may choose a richer
layout only when that topology is still valid at the current container size.

"Zero runtime" here means no author JavaScript, DOM measurement, observers, or
hydration. Browser CSS layout is expected. Build-time pixel coordinates are not
portable because the final font, writing mode, container width, zoom, and line
wrapping are browser inputs.

## Primitive assessment

| Primitive | Appropriate use | Boundary |
| --- | --- | --- |
| CSS Grid / `inline-grid` | Keep labels in flow; allocate label, connector, and target tracks; auto-place labels into unoccupied cells; align nested recipe parts with `subgrid` | Safe only when the recipe exposes structural slots. Grid cannot discover which visual line an arbitrary inline target wrapped onto. Use sparse placement so visual order continues forward; `dense` packing can reorder content visually. |
| Size container queries | Select a wide annotated composition or its compact stacked/legend form from the scene's own inline size | A threshold chooses a known layout; it does not measure label-to-label collisions. Grid has been broadly available since 2017, size containers since 2023, and subgrid since 2023, so these are the portable modern baseline. |
| Relative/absolute positioning | Local decorative marks or a bounded one-label annotation for which the recipe reserves space | Absolute boxes are out of flow and may overlap in-flow content or one another. They cannot be the basis of a collision-free dense-mode promise. |
| CSS Anchor Positioning Level 1 | Associate a floating label with a target using `anchor-name`, `position-anchor`, and `position-area`; use `anchor()` / `anchor-size()` for a known connector cell; reuse a finite set of logical-side placements | Progressive enhancement only. It is newly interoperable in current browsers, not an old-browser baseline. A fragmented inline target is represented by an axis-aligned rectangle around its fragments, not a chosen glyph or line fragment. |
| `position-try-fallbacks` / `@position-try` | Flip or replace one anchored label's position when its own margin box would overflow its containing block | The selection algorithm tests whether that box is fully contained. It does not test collision with sibling labels, connectors, or article content. If every option fails, the original position remains. |
| `position-visibility` | Hide a purely decorative positioned enhancement whose anchor is invalid/hidden or whose box still overflows | Never use it to hide the only copy of a meaningful label. The in-flow fallback must remain available. |
| Inline SVG | Draw a connector inside a layout cell whose endpoints are structurally known; use a normalized `viewBox`, `preserveAspectRatio="none"`, and `vector-effect="non-scaling-stroke"`; use a generated-ID `marker-end` with `orient="auto"` for a non-distorted arrowhead | SVG owns coordinates inside its own viewport. It does not discover arbitrary HTML box coordinates or avoid obstacles. One connector should represent one scene-plan relationship; a many-target label emits several bounded connector cells. |

CSS Grid's auto-placement algorithm explicitly searches for an area that does
not overlap occupied grid cells, while its default sparse mode keeps moving
forward. That is the useful collision guarantee for a label rail—not a general
geometry solver. [CSS Grid Layout Level 2, placement algorithm](https://www.w3.org/TR/css-grid-2/#auto-placement-algo)
documents the occupied-cell rule; MDN records Grid as broadly available since
2017, size container queries since 2023, and subgrid since 2023
([Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid),
[container](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/container),
[subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid)).

Do not use `grid-auto-flow: dense` for semantic labels. It may backfill an
earlier hole with a later DOM item, so the visual sequence can diverge from the
reading sequence
([MDN, Grid layout and accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility)).

## Baseline rendering contract

Each compiled annotation scene should contain the source content, visible target
markers, one canonical set of meaningful label nodes, and decorative,
assistive-technology-hidden connectors. The label nodes are in flow by default:
CSS arranges those same nodes as a local pair, recipe grid, or legend, and only
the supported enhancement takes them out of flow. Thus no-CSS output remains
understandable without duplicating label text.

The renderer chooses among these layouts:

### A. Local pair

For one short target and one short label, use `inline-grid` with label,
connector, and target on separate tracks. All meaningful text participates in
layout. This may increase line height or cause the pair to wrap, but it does not
silently overlap neighboring labels.

### B. Recipe grid

For structurally parsed content such as a task record, build a scene grid from
semantic slots (status, stable ID, description, tag, priority, custom field).
Place labels in block-start/block-end or side rails, with dedicated connector
cells spanning from each label slot to its target slot. Use logical properties
and sparse placement. This is suitable for an annotation recipe because the
recipe, not rendered pixel measurement, knows the topology.

This does **not** apply to arbitrary prose or an opaque code block. Browser line
breaking can move a target to another visual line without exposing that line as
a Grid track.

### C. Numbered markers plus legend

For arbitrary or over-capacity content, render small stable markers adjacent to
targets and an ordered, in-flow legend below the content. A label that describes
multiple targets repeats the same marker at each target and appears once in the
legend. Connectors are omitted. This is the universal compact, print, no-CSS,
and unsupported-feature fallback.

Container queries may switch A or B to C based on the component's own width,
not the viewport. They are a responsive selector, not a collision detector.

## Anchor-positioned enhancement

On supporting browsers, a target can become an anchor and its label an
absolutely positioned box. `position-area` provides logical 3-by-3 placement;
`anchor()` can reference more than one named anchor, and `min()` / `max()` can
derive a bounding region for a connector when the recipe already knows the
relative quadrant
([CSS Anchor Positioning Level 1, anchor-based positioning](https://www.w3.org/TR/css-anchor-position-1/#anchor-pos),
[multiple-anchor example](https://www.w3.org/TR/css-anchor-position-1/#anchor-functions)).

Use the enhancement only inside a feature query and after the in-flow form is
correct. Prefer build-generated unique anchor names. Repeated names otherwise
select the last matching anchor in source order; `anchor-scope` can constrain
that lookup, but it is itself newly available
([MDN, `anchor-name`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name),
[MDN, `anchor-scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-scope)).
Targets must also precede their positioned dependents in layout/tree order as
required by the specification's acceptable-anchor rules.

`position-try-fallbacks` is useful for edge avoidance, not dense packing. The
normative algorithm accepts the first candidate whose **own margin box** is
fully contained by its inset-modified containing block; it has no sibling-box
collision test
([CSS Anchor Positioning Level 1, applying position fallback](https://www.w3.org/TR/css-anchor-position-1/#apply-position-fallback)).
Absolute positioning itself is defined as out of flow and explicitly allowed to
overlap other absolute or in-flow boxes
([CSS Positioned Layout Level 3](https://www.w3.org/TR/css-position-3/#intro)).

Level 2 anchored container queries can detect which fallback won and restyle a
descendant connector so its arrow still points toward the target. This is an
Editor's Draft enhancement, and the first-party shipping documentation confirms
it in Chrome 143; it is not part of the portable contract
([CSS Anchor Positioning Level 2](https://drafts.csswg.org/css-anchor-position-2/),
[Chrome 143 anchored container queries](https://developer.chrome.com/blog/anchored-container-queries/)).
Without that feature, either keep a connector valid for every allowed placement,
disable position flipping, or omit the connector.

## SVG connector contract

A connector SVG should fill a box that CSS already established. A normalized
path can stretch to that box with `viewBox` and
`preserveAspectRatio="none"`; `vector-effect="non-scaling-stroke"` prevents
non-uniform stretching from changing stroke width. SVG markers place an
arrowhead at a path endpoint and `orient="auto"` follows the path direction
([SVG 2 coordinate systems](https://www.w3.org/TR/SVG2/coords.html#ViewBoxAttribute),
[SVG 2 vector effects and markers](https://www.w3.org/TR/SVG2/painting.html#VectorEffects)).

These primitives improve rendering only after CSS has provided a valid
connector cell. They do not bridge independent HTML and SVG coordinate systems.
Therefore:

- local target-to-label connectors may be curved or straight;
- recipe-grid connectors may join known adjacent/corner cells;
- one-to-many relationships use one bounded connector per target;
- arbitrary cross-line or obstacle-avoiding routes fall back to markers and a
  legend.

Use generated marker IDs when `<marker>` is used, because fragment URLs resolve
within the document. A baked arrowhead avoids IDs for small fixed-aspect
connectors, but it will distort when a `preserveAspectRatio="none"` viewport is
stretched non-uniformly.

## Browser and media constraints

Anchor positioning reached current-engine interoperability only recently.
Firefox enabled it by default in Firefox 147 (January 2026); Safari first shipped
it in Safari 26.0 and added fallback refinements in 26.2; Chromium's initial
Chrome 125 syntax was renamed to the current `position-area` and
`position-try-fallbacks` names in Chrome 129
([Firefox 147 developer notes](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/147),
[Safari 26.0 notes](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/),
[Safari 26.2 notes](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/),
[Chrome anchor positioning documentation](https://developer.chrome.com/blog/anchor-positioning-api/)).
MDN consequently marks core anchor pieces as Baseline 2026/newly available and
warns that older browsers and some subfeatures vary
([MDN, `position-area`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-area)).
Never emit the obsolete `inset-area` or `position-try-options` spellings.

An inline anchor that wraps across lines is treated as an axis-aligned bounding
rectangle of its fragments. That rectangle cannot identify the intended line or
glyph, so a connector to a fragmented target is not precise
([CSS Anchor Positioning Level 1, anchor box](https://www.w3.org/TR/css-anchor-position-1/#anchor-box)).
The recipe may prevent wrapping only for a short token; otherwise choose the
legend form.

For print, force labels and legends into flow and hide decorative connectors.
The positioned-layout specification allows an absolute box whose resolved print
position is on an already-rendered or different page to be moved to another
page or omitted, so absolute annotation geometry is not a dependable paged-media
contract
([CSS Positioned Layout Level 3, fragmentation](https://www.w3.org/TR/css-position-3/#abspos-breaking)).

## Required fallback triggers

The renderer must select the compact marker-plus-legend representation when any
of these is true:

- anchor positioning or the exact enhancement subfeature is unsupported;
- the scene container is below the recipe's tested width;
- label count, label length, or target count exceeds the recipe's declared
  capacity;
- a target can wrap/fragment and the route requires a precise endpoint;
- the source is arbitrary prose/opaque code with no structural grid slots;
- a relationship would require obstacle avoidance or crossing detection;
- a chosen fallback placement would require connector restyling but anchored
  container queries are unavailable; or
- the output medium is print (and, conservatively, other fragmented media).

The system may still expose an author-level advanced escape hatch for explicit
placement. That escape hatch changes the promise from automatic collision-free
layout to author-owned geometry; it must not weaken the default annotation
recipe contract.

## Consequence for implementation planning

The next design decision should specify an annotation recipe's layout contract,
not a generic collision algorithm. Each recipe needs:

- semantic target slots and allowed one-to-many relationships;
- wide and compact renderings;
- maximum rich-layout density;
- whether targets may wrap;
- connector topologies that remain valid without measurement; and
- deterministic fallback triggers.

A future measured client renderer could be a separate opt-in runtime, but it is
not required—and must not be implied—by the zero-runtime destination.
