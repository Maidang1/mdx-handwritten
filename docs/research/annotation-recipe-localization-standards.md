# Annotation recipe localization standards research

## Scope

This note records the standards evidence needed by GitHub issue #10 for
built-in Annotation recipe localization. It covers language-tag validation and
canonicalization, locale fallback, Chinese language and script tagging, CJK
font selection, and the effects of language metadata on typography and
assistive technology.

Only primary standards and standards-body guidance are used: IETF/RFC Editor,
IANA, Unicode CLDR, WHATWG, and W3C.

The project already has a closed Scene plan V1 with one
`localization.locale`, and its shipped `locale` input selects generated recipe
text rather than declaring the language of canonical author source. The final
#10 contract therefore uses exact supported catalog tags in V1. The broader
matching evidence below records what a future schema would need before it
could represent requested and resolved languages separately.

## Findings

### 1. Keep language-tag identity, canonicalization, and locale matching separate

- A language tag is a BCP 47 value. Its syntax and semantics come from RFC
  5646, and valid subtags come from the IANA Language Subtag Registry rather
  than directly from the underlying ISO lists. The Scene plan should therefore
  validate the complete tag and registry values, not accept an arbitrary
  locale-shaped string. ([RFC 5646 section 2.1](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.1),
  [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtags-tags-extensions/language-subtags-tags-extensions.xhtml))

- BCP 47 tags are case-insensitive. RFC 5646 nevertheless recommends registry
  casing for consistent presentation: lower-case language, title-case script,
  and upper-case alphabetic region. Store one canonical spelling such as
  `zh-Hans-CN`, but never attach semantic meaning to case. ([RFC 5646 section
  2.1.1](https://www.rfc-editor.org/rfc/rfc5646.html#section-2.1.1))

- RFC 5646 canonicalization is registry-driven: it replaces deprecated values
  where a `Preferred-Value` exists and applies the other canonicalization steps
  defined by the RFC. It does not mean "add the most likely script and region".
  Canonicalization and CLDR maximization must remain different operations.
  ([RFC 5646 section 4.5](https://www.rfc-editor.org/rfc/rfc5646.html#section-4.5),
  [Unicode LDML canonical form](https://www.unicode.org/reports/tr35/#Unicode_Locale_Identifiers))

- RFC 5646 recommends using a subtag only when it adds distinguishing
  information, and following `Suppress-Script` guidance. Consequently, a
  recipe should not mechanically expand every tag in its stored identity.
  ([RFC 5646 section 4.1](https://www.rfc-editor.org/rfc/rfc5646.html#section-4.1))

- CLDR likely-subtags are useful for matching and font/script decisions, but
  are heuristic data and may change. For example, current CLDR data maximizes
  `zh` to `zh-Hans-CN`, `zh-TW` to `zh-Hant-TW`, and `zh-Hant` to
  `zh-Hant-TW`. A maximized tag is derived information, not a replacement for
  the author-declared content language. If used, the CLDR data version must be
  part of the implementation contract rather than the Scene plan's language
  identity. ([Unicode LDML likely subtags](https://www.unicode.org/reports/tr35/#Likely_Subtags))

**Decision consequence:** V1 stores only the canonical tag of an exactly
selected Localization catalog. It does not maximize the tag or claim that the
catalog locale declares the language of author source. A future negotiation
feature would need separate requested and resolved fields in a new schema.

### 2. Fallback is an ordered lookup operation, not ad hoc prefix matching

- RFC 4647 lookup selects one best available tag. It first tries the most
  specific request and then progressively removes subtags from the right until
  it finds a supported tag; extension/private-use singletons have an additional
  removal rule. For example, its lookup chain for
  `zh-Hant-CN-x-private1-private2` reaches `zh-Hant-CN`, then `zh-Hant`, then
  `zh`, then the application default. ([RFC 4647 section
  3.4](https://www.rfc-editor.org/rfc/rfc4647.html#section-3.4))

- Basic RFC 4647 lookup does not perform a sideways substitution. In
  particular, looking up `zh-Hans` against a catalog containing only `zh-CN`
  does not make `zh-CN` a truncation candidate. Treating those as equivalent
  requires an explicit application mapping or a versioned CLDR locale-matching
  operation. ([RFC 4647 section
  3.4.1](https://www.rfc-editor.org/rfc/rfc4647.html#section-3.4.1),
  [Unicode LDML language matching](https://www.unicode.org/reports/tr35/#LanguageMatching))

- CLDR warns that simple truncation is not always the best natural-language
  match and supplies distance-based language-matching data for applications
  that need broader negotiation. That is a distinct, more complex policy than
  RFC 4647 lookup. ([Unicode LDML language
  matching](https://www.unicode.org/reports/tr35/#LanguageMatching))

**Decision consequence:** V1 uses a small explicit supported-locale set and
stops after case-insensitive whole-tag matching. It deliberately performs no
RFC 4647 lookup or cross-tag alias. Unsupported requests fail with a stable
diagnostic instead of silently choosing a parent or neighboring Chinese
locale. If lookup is added later, core rather than each recipe must own it and
the plan schema must represent both sides of the match.

### 3. `zh-CN`, `zh-Hans`, and `zh` communicate different facts

- `zh-CN` identifies Chinese as used in mainland China: `CN` is a region
  subtag. `zh-Hans` identifies Chinese written with the Simplified Han script:
  `Hans` is a script subtag. They commonly overlap, but they do not make the
  same assertion. W3C specifically recommends `zh-Hans`/`zh-Hant` when the
  intended distinction is Simplified versus Traditional writing. ([W3C
  Language tags in HTML and XML](https://www.w3.org/International/articles/language-tags/),
  [W3C Authoring HTML: language declarations](https://www.w3.org/International/docs/bp-html-lang/))

- `zh` is a macrolanguage tag and is often treated compatibly as predominant
  Mandarin in existing systems, but more precise language tags should be used
  for other Chinese languages when that distinction matters. Script tags are
  useful when written Simplified/Traditional Chinese is the relevant fact.
  ([W3C Choosing a language tag](https://www.w3.org/International/questions/qa-choosing-language-tags))

- Current CLDR likely-subtag data makes `zh`, `zh-CN`, and `zh-Hans` converge on
  a likely `zh-Hans-CN` form for matching. That supports an explicit product
  alias when the product deliberately serves the same Simplified Chinese
  catalog, but does not erase the original BCP 47 distinction. ([Unicode LDML
  likely subtags](https://www.unicode.org/reports/tr35/#Likely_Subtags))

**Decision consequence:** keep `zh-CN` as the initial supported Localization
locale because it is already part of the project contract. V1 does not accept
`zh`, `zh-Hans`, `zh-Hans-CN`, `zh-Hant`, `zh-TW`, `yue`, or other Chinese tags
as aliases. This avoids erasing their distinctions while the plan contains
only one locale field.

### 4. Render real `lang` attributes; metadata hidden in data attributes is insufficient

- HTML's `lang` attribute represents the language of element content. The
  language declared on the root applies by inheritance, and a nested element
  should declare a different language when its content changes language.
  ([WHATWG HTML `lang`](https://html.spec.whatwg.org/multipage/dom.html#attr-lang),
  [W3C Declaring language in HTML](https://www.w3.org/International/questions/qa-html-language-declarations.html))

- WCAG 2.2 requires the page's default human language to be programmatically
  determinable at Level A and the language of passages or phrases to be
  determinable at Level AA, subject to the stated exceptions. ([WCAG 2.2,
  success criteria 3.1.1 and 3.1.2](https://www.w3.org/TR/WCAG22/#readable))

- Correct language metadata lets screen readers select pronunciation rules and
  helps speech synthesis and Braille translation. It also supports language-
  aware spelling, searching, translation, and other processing. ([W3C
  Understanding Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page),
  [W3C Why use the language attribute?](https://www.w3.org/International/questions/qa-lang-why.en))

- Language and direction are separate. `lang` does not replace `dir`; mixed or
  bidirectional labels need the appropriate HTML direction mechanism. ([W3C
  Declaring language in HTML](https://www.w3.org/International/questions/qa-html-language-declarations.html))

**Decision consequence:** canonical source inherits the host article's
language because the recipe `locale` input does not describe source. Generated
caption and legend containers receive their catalog locale as real `lang`.
React, element, strip, print, and no-CSS output must retain this metadata.

### 5. Language metadata affects CJK glyphs and line layout, not just accessibility

- Simplified Chinese, Traditional Chinese, Japanese, and Korean can share a
  Unicode ideograph code point while expecting language-specific glyph forms.
  Browsers can use the content language when selecting an appropriate font.
  ([W3C Why use the language attribute?](https://www.w3.org/International/questions/qa-lang-why.en#fontselection))

- CSS Text states that language and writing-system conventions can affect line
  breaking, hyphenation, justification, glyph selection, and other typography;
  language-specific tailoring is available only when content language is
  known. Accurate `lang` is therefore part of the layout contract even though
  the Scene plan contains no geometry. ([CSS Text Module Level 4, section
  1.3](https://www.w3.org/TR/css-text-4/#languages))

- CSS `:lang()` is the appropriate selector for language-dependent styling and
  follows language inheritance rather than requiring an attribute directly on
  every selected node. This is preferable to exact `[lang="..."]` matching for
  related subtags. ([W3C Styling using language
  attributes](https://www.w3.org/International/questions/qa-css-lang.en))

**Decision consequence:** theme selectors should be based on `:lang()`, and
the test matrix must include actual `zh-CN` markup rather than only Chinese
characters inside an English scene.

### 6. A robust CJK handwritten font stack needs explicit fallbacks

- `font-family` is a prioritized list. A user agent moves through alternatives
  until it finds an available font containing the glyph, which is essential
  when a Latin handwriting web font has no CJK coverage. ([CSS Fonts Module
  Level 4, section 2.1](https://www.w3.org/TR/css-fonts-4/#font-family-prop))

- CSS Fonts encourages authors to append a generic family for robustness.
  Generic families may map to composite faces based on Unicode coverage,
  content language, user preferences, and system settings. ([CSS Fonts Module
  Level 4, generic families](https://www.w3.org/TR/css-fonts-4/#generic-font-families))

- CSS Fonts Level 4 defines the script-specific `generic(kai)` family for
  Simplified and Traditional Chinese calligraphic/Kai text. Script-specific
  generics may have no installed match, so a universal generic still needs to
  follow it. ([CSS Fonts Module Level 4,
  `generic(kai)`](https://www.w3.org/TR/css-fonts-4/#generic-kai))

- `system-ui` can depend on platform language, locale, Unicode coverage, and
  content language, and CSS Fonts warns that it is intended for UI rather than
  large article text. It is not a sufficient standalone handwritten-CJK
  strategy. ([CSS Fonts Module Level 4,
  `system-ui`](https://www.w3.org/TR/css-fonts-4/#system-ui-def))

**Decision consequence:** keep font selection in the theme rather than the
Annotation recipe or Scene plan. For Chinese handwritten labels, use a theme
token with a Kai-capable named/local stack, optionally enhance with
`generic(kai)` when supported, and finish with a widely implemented universal
generic such as `cursive` or `serif`. Source/code text keeps its independent
monospace stack. Do not require a large CJK web font until issue #13 establishes
the font and bundle budget.

An implementation shape consistent with the standards is:

```css
:lang(zh-CN),
:lang(zh-Hans),
:lang(zh-Hans-CN) {
  --hw-font-hand: "Kaiti SC", KaiTi, STKaiti, cursive;
}

@supports (font-family: generic(kai)) {
  :lang(zh-CN),
  :lang(zh-Hans),
  :lang(zh-Hans-CN) {
    --hw-font-hand: "Kaiti SC", KaiTi, STKaiti, generic(kai), cursive;
  }
}
```

The exact named families remain theme policy, not part of recipe compatibility.

## Recommended contract boundary for issue #10

1. The public input accepts one Localization locale and returns the canonical
   spelling of an exactly supported catalog tag in the Scene plan.
2. Core code, not individual recipes, owns case-insensitive tag comparison and
   supported-locale diagnostics. V1 has no lookup, alias, or fallback.
3. A built-in recipe supplies complete message catalogs keyed by core-approved
   locale IDs.
4. Missing message keys, unsupported locales, and grammar ambiguity fail closed;
   they never fall back to source-order guesses or another Chinese writing
   system.
5. The renderer emits real `lang` on generated reader text while source inherits
   the article language. Theme CSS uses `:lang()` and owns CJK font stacks.
6. Scene plans remain semantic: no font family, glyph choice, line-breaking
   setting, or other presentation detail enters the versioned plan.

This boundary gives built-in recipe developers a small local task—grammar,
semantic IDs, gestures, and complete messages—while the Module absorbs the
standards-heavy localization behavior once.
