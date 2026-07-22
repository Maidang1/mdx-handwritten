# Accessible semantics for multi-target Annotation scenes

## Question

What must a Scene plan and its renderers preserve when an Annotation scene has
labels that point to one, several, or discontinuous targets?

## Decision

Treat an annotation as a semantic relationship, not as an arrow. The canonical
relationship is one real-text label applied to an ordered, non-empty set of
target fragments. The DOM must contain the source content first and a complete,
explicitly worded annotation legend next, in a meaningful reading order. Arrows,
handwritten positioning, highlights, and colors are replaceable presentations of
that relationship.

For short annotations, each target may additionally reference the label with
`aria-describedby`. A label shared by several targets is one element with one
unique ID; every target references that same ID. If one target has several
annotations, its `aria-describedby` value lists those label IDs in the order they
should be computed. WAI-ARIA defines `aria-describedby` as an ID-reference list,
and the accessible-name algorithm processes those references in order and
flattens them to text ([WAI-ARIA 1.2: `aria-describedby`](https://www.w3.org/TR/wai-aria-1.2/#aria-describedby),
[Accessible Name and Description Computation 1.1](https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_description)).

The explicit legend remains the primary fallback. ARIA relationships enhance it;
they do not replace it. WCAG requires relationships conveyed by presentation to
be programmatically determinable **or available in text**, and requires a
meaningful sequence to survive alternative presentation
([WCAG 2.2, Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html),
[WCAG 2.2, Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)).

## Required Scene plan contract

The exact data model can vary, but it must retain these facts independently of
geometry:

| Fact | Constraint |
| --- | --- |
| Source | Preserve the authored semantic content and a canonical plain-text value for copying, especially for code and terminal output. |
| Target | Give every target fragment a scene-unique ID and source-order position. A discontinuous target is represented by multiple fragments, never by moving or duplicating source text. |
| Annotation | Store real text, semantic intent, an ordered `targetIds` array, and an annotation order. `targetIds` must contain at least one existing target. |
| Fallback reference | Store or deterministically derive text that identifies the targets without location, color, shape, or arrow direction—for example, `Priority — applies to “!high”` or `Dependency — applies to both “@blocked_by:” and “CLI-041”`. Allow an author override when literals repeat or the generated wording is ambiguous. |
| Copy policy | Distinguish canonical source copying from whole-scene copying. For code recipes, canonical source is the default copy payload. |
| Detail kind | Distinguish a short flat description from a long, structured explanation. This determines `aria-describedby` versus `aria-details`; it is not a visual-style choice. |

Coordinates, connector paths, lane selection, collision results, breakpoints, and
handwriting variation do **not** belong to the semantic contract. They are
renderer output.

## DOM and ARIA rendering rules

1. **Keep source order meaningful.** Emit targets where their text occurs, then
   emit annotations in a nearby list or other ordinary flow content. CSS may
   position that list around the source on wide screens, but must not reorder a
   meaning-dependent sequence. Matching DOM and visual order is the WAI
   sufficient technique and also makes CSS-disabled and screen-reader reading
   coherent ([WAI technique C27](https://www.w3.org/WAI/WCAG22/Techniques/css/C27)).

2. **Make the textual relationship complete.** A bare label such as `priority`
   plus an arrow is insufficient. The linearized form must identify both the
   label and what it applies to. Do not say only “the item above,” “the purple
   field,” or “the arrow on the right”; WCAG explicitly rejects reliance on
   sensory characteristics such as location, shape, color, and orientation
   ([WCAG 2.2, Sensory Characteristics](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html),
   [WCAG 2.2, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).

3. **Render multi-target relationships as repeated references, not duplicated
   labels.** Each discontinuous target remains a separate wrapper in its original
   location. Each wrapper can carry `aria-describedby="annotation-id"`, while
   the one annotation element names all targets in its fallback wording.

4. **Use description semantics, not naming or tree surgery.**

   - Do not use `aria-labelledby` for commentary: it supplies an accessible name,
     whereas an annotation supplements the target.
   - Use `aria-details` only for one visible, structured extended description.
     ARIA 1.2 allows it to reference a single element and preserves that
     element's structure instead of flattening it into the accessible
     description ([WAI-ARIA 1.2: `aria-details`](https://www.w3.org/TR/wai-aria-1.2/#aria-details)).
     Choose either the short-description or structured-detail relation for a
     given annotation rather than assuming every accessibility API exposes both.
   - Do not use `aria-owns`: it changes accessibility-tree parentage, permits only
     one explicit owner, and ARIA says it should not replace DOM hierarchy
     ([WAI-ARIA 1.2: `aria-owns`](https://www.w3.org/TR/wai-aria-1.2/#aria-owns)).
   - Do not use `aria-flowto`: it offers a user-selected alternate reading path;
     it does not describe an annotation relationship
     ([WAI-ARIA 1.2: `aria-flowto`](https://www.w3.org/TR/wai-aria-1.2/#aria-flowto)).

5. **Keep connectors decorative.** Once the same meaning is exposed in text and
   relationships, connector SVGs, arrowheads, scribbles, and highlight textures
   are redundant. Hide only that overlay with `aria-hidden="true"`; never hide a
   target or meaningful label. ARIA permits hiding visible material only when
   equivalent meaning and functionality remain exposed
   ([WAI-ARIA 1.2: `aria-hidden`](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden)).

6. **Use native document semantics selectively.** A self-contained block scene,
   such as an annotated code listing, may be a `figure` with a real
   `figcaption`; the HTML standard explicitly lists code listings as a figure
   use case. It also recommends referring to figures by a label rather than
   relative position ([HTML: `figure`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-figure-element)).
   Inline prose need not become a figure. `role="note"` is appropriate only when
   the annotation is genuinely parenthetic or ancillary prose, not for every
   tag-like label ([WAI-ARIA 1.2: `note`](https://www.w3.org/TR/wai-aria-1.2/#note)).

### Reference shape

This is a semantic shape, not a required class-name API:

```html
<figure class="hw-scene" aria-labelledby="scene-caption">
  <figcaption id="scene-caption">Anatomy of a task entry</figcaption>
  <pre><code>[ ] <span id="target-id" aria-describedby="ann-id">CLI-042</span>
Add export command <span id="target-tag" aria-describedby="ann-tag">#cli</span>
<span id="target-priority" aria-describedby="ann-priority">!high</span></code></pre>

  <ol class="hw-annotation-legend">
    <li id="ann-id">Stable ID — applies to “CLI-042”.</li>
    <li id="ann-tag">Tag — applies to “#cli”.</li>
    <li id="ann-priority">Priority — applies to “!high”.</li>
  </ol>

  <svg aria-hidden="true"><!-- visual connectors only --></svg>
</figure>
```

For one annotation pointing to two discontinuous targets, both target wrappers
reference the same list-item ID, and that list item names both fragments. No
focusability or interaction is added merely to make a static annotation exist.

## Code and terminal annotations

Preserve native semantics before adding annotation presentation:

- Use `<pre><code>` for a code block. The HTML standard defines `code` as a
  computer-code fragment and shows the paired block form
  ([HTML: `code`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element),
  [HTML: `pre`](https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element)).
  For terminal scenes, use `samp` for program output and `kbd` for user input
  where those distinctions exist.
- Target wrappers may live inside `code`, but annotation labels, legends,
  connector SVGs, and copy-button text must stay outside the `code` subtree.
  Wrappers must not add characters to canonical source text.
- Choose semantic elements from the annotation's intent, not its Visual style.
  `<mark>` is appropriate when text is highlighted for reference or comment; the
  HTML standard even demonstrates it inside code. `<em>` means stress,
  `<strong>` means importance/seriousness/urgency, `<del>`/`<ins>` mean document
  edits, and `<s>` means no longer accurate or relevant
  ([HTML: `mark`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-mark-element),
  [HTML: text-level semantics](https://html.spec.whatwg.org/multipage/text-level-semantics.html),
  [HTML: edits](https://html.spec.whatwg.org/multipage/edits.html)).
  A generic visual underline or colored target therefore normally remains a
  neutral `span` unless the Scene plan carries the matching meaning.

This preserves the repository's distinction between an Annotation gesture and a
Visual style: geometry and handwriting do not silently manufacture document
semantics.

## Copy and paste

The default copy action copies the user's selected contents and user agents are
encouraged to provide both `text/plain` and `text/html`
([Clipboard API: copy action](https://www.w3.org/TR/clipboard-apis/#copy-action)).
Consequently:

- Selecting only source code should yield only source code because labels are
  outside its subtree. Selecting the whole figure may legitimately include the
  visible legend.
- An exact “Copy code” action should copy the canonical source retained by the
  Scene plan or compiler, not reconstruct text from the decorated DOM.
- `user-select: none` may reduce accidental selection of an overlay, but cannot
  define correctness. CSS UI calls it a convenience rather than copy protection,
  allows user agents to bypass it, and makes no normative clipboard guarantee.
  The same specification recommends putting non-decorative generated content in
  the DOM because generated pseudo-content has historically not been selectable
  or copyable ([CSS UI 4: content selection](https://drafts.csswg.org/css-ui-4/#content-selection)).
- Meaningful labels and target references therefore cannot exist only in
  `::before`, `::after`, Canvas, SVG text, or a clipboard event override.

## Responsive, print, and no-CSS fallback

All renderers should emit one semantic DOM and vary only its presentation:

- **Narrow or zoomed layouts:** put labels into normal flow as the explicit
  legend, hide connectors, and let annotation text wrap. Blog annotations should
  not claim the two-dimensional-diagram exception merely because the wide design
  uses arrows. WCAG requires content to work at a width equivalent to 320 CSS
  pixels without losing information or requiring two-dimensional scrolling;
  true diagrams are an exception, but their surrounding text still has to reflow
  ([WCAG 2.2, Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).
- **Print:** use the same linear legend, hide decorative overlays, avoid clipping
  across page breaks, and do not make a highlight background the only cue. User
  agents may omit backgrounds or adjust colors for ink economy
  ([CSS Color Adjustment 1](https://www.w3.org/TR/css-color-adjust-1/#print-color-adjust)).
- **No CSS / failed font:** source followed by the legend must remain a complete
  explanation. Handwritten labels must be real text with ordinary fallback fonts,
  not images of text ([WCAG 2.2, Images of Text](https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html)).
- **User styles and forced colors:** color cannot carry the relationship by
  itself. Label text must meet text contrast, and layouts must not clip or overlap
  when users override line, paragraph, letter, or word spacing
  ([WCAG 2.2, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  [WCAG 2.2, Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)).

The `strip` renderer should therefore produce source content plus explicit
annotation text and target references, not just parenthesized labels whose target
is ambiguous.

## Validation and acceptance checks

The compiler can reject a Scene plan before layout when IDs are duplicated,
targets are missing, `targetIds` is empty, an annotation has no textual fallback,
or canonical code text cannot be recovered. Renderer acceptance should cover:

1. one label to one target, one label to several discontinuous targets, and
   several ordered labels on one target;
2. duplicate target literals that require an unambiguous generated reference;
3. DOM linearization and CSS-disabled output: source, then a complete legend;
4. accessibility-tree inspection for descriptions plus ordinary browse-mode
   access to the legend;
5. selection within code, whole-scene selection, and exact canonical code copy;
6. 320-CSS-pixel reflow, 200% text sizing, WCAG text-spacing overrides, forced
   colors, print preview, and background printing disabled.

These checks verify the semantic contract. Pixel placement and handwriting
variation can then evolve without changing what the Annotation scene means.
