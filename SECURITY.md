# Security policy

## Trust boundary

MDX is executable source code. Do not compile untrusted MDX with JSX, ESM, or expressions enabled and then execute the result. `remark-mdx-handwritten` validates only its own `hw-*` directive language; it cannot make arbitrary MDX safe.

For untrusted input:

1. Accept plain Markdown rather than full MDX.
2. Parse directives with `remark-directive`.
3. Run this plugin in `element` mode.
4. Convert to HAST.
5. Run `rehype-sanitize` with the smallest necessary schema.
6. Serialize the sanitized HAST rather than evaluating generated JavaScript.

The directive grammar rejects dynamic attributes, spread attributes, arbitrary event handlers, classes, IDs, styles, and unsafe URL protocols. Auto-import sources are build configuration, never author input.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature for this repository. Include a minimal input document, expected behavior, observed output, and the affected package and runtime.
