# Recipe package conformance

Run the conformance suite against the bytes that package authors actually publish:

```sh
npm run build:packages
node scripts/recipe-conformance/cli.mjs ./path/to/recipe-package
```

The command performs a real `npm pack` for the Recipe package, the installed
`mdx-handwritten-scene` peer, `remark-mdx-handwritten`, and `mdx-handwritten-react`. A temporary consumer runs
`npm install --ignore-scripts --strict-peer-deps` against those tarballs, resolving ordinary
Recipe dependencies through npm. Its generated `loader.mjs` imports the Recipe, its conformance subpath, and
`mdx-handwritten-scene/recipes` through real bare package specifiers. Node therefore owns
conditional `exports` resolution exactly as it does for a consumer. The runner executes
every case against that same packed Scene build and removes the temporary directory when
finished.
Use `--scene-package-directory=./path/to/mdx-handwritten-scene` to select an explicit
built Scene package instead of the nearest installed peer.
Programmatic callers can supply local dependency package directories through
`additionalPackageDirectories`; each is packed and installed into the same consumer.
The CLI accepts exactly one package-directory positional and the documented options.
Unknown or duplicate options, extra positionals, empty option values, and options combined
with `--help` fail instead of being ignored.

The Recipe definition defaults to the packed entry's `default` export. Every case is based on
that same imported definition; a case cannot provide an alternate `packageDefinition`. Use
`--definition-export=recipePackage` (or the programmatic `definitionExport` option) for a
named export. Conformance resolves the entry selected by Node's real package conditions and
requires that resolved file to be ESM. CommonJS entries are rejected explicitly; `.mjs`
exports in packages without `type: "module"` remain valid.

By default the packed package must export `./conformance` with a named
`recipeConformanceCases` object. Use `--conformance-export=./another-export` when needed.
The object declares:

- `packageName`, the fixed `mdx-handwritten-scene` peer name and range, and the reviewed
  `expectedFiles` tarball list;
- `plans` with exact full `ScenePlanResult` fixtures for every recipe/version/locale;
- `reviewedCandidates` and `corrections` with exact successful results. For corrections, the
  runner wraps the packed compile and validate functions, verifies all three correction kinds,
  and proves that a declared target correction reaches compile;
- `failures` with one runner-owned `covers` capability, an author-selector `input`, and exact
  stable `expectedDiagnostics`. The runner derives the fault from and wraps the selected packed
  Recipe's compile and validate functions; case-authored `packageDefinition` values are forbidden;
- `configurationFailures` with one runner-owned `covers` capability and the exact expected typed
  configuration-error `code` and `path`. The runner constructs invalid bindings from the packed
  definition; `createBindings` is forbidden; and
- `compilerLifecycles` with one exact runner-owned coverage group and ordered `steps`. Every step
  supplies `name`, `input`, exact `expected`, and `expectedObservation`; the runner owns package
  clones, post-construction mutation, callback counters, and observation. `prepare` is forbidden.

The runner rejects an empty or partial suite. `plans` must form an exact, duplicate-free,
two-way matrix with every recipe/version/locale declared by the selected packed definition:
neither missing nor undeclared entries pass. Every other required category must be non-empty.
Cases declare `covers` capability identifiers, but they cannot choose or implement their own coverage.
The exported `requiredRecipeConformanceCoverage` object is the runner-owned, category-fixed
capability matrix for construction, snapshot, routing, correction, reviewed-candidate, and
failure behavior. A capability in the wrong category, an unknown or duplicate capability,
or any missing capability fails validation. Coverage groups are also exact: every
`configurationFailures` and `failures` case covers exactly one declared capability;
`reviewedCandidates` and `corrections` use their fixed singleton groups; and
`compilerLifecycles` contains exactly the four-capability snapshot group plus the two separate
singleton routing groups. Coalescing a category's required tags into one case is invalid.
Every failure mutation first executes the corresponding function from the packed definition,
so a forged label or alternate case definition cannot stand in for the published Recipe bytes.
Case names are unique within and across categories, and case objects cannot be reused.
Lifecycle cases must declare at least one uniquely named step with an input, exact result, and
exact observation object; the runner owns the observation callback. The package's fixed
`mdx-handwritten-scene` peer range must equal the case-set range and accept the exact packed
Scene version under npm SemVer rules; strict npm installation enforces the same contract before
any conformance case executes.

Every successful case is called three times and compared both structurally and as JSON.
Failure diagnostics are also repeated three times. Every result must survive a JSON round
trip. Lifecycle steps run once so callback counts remain reviewable. Programmatic callers may import
`runRecipePackageConformance` from `index.mjs` and pass the same object as `cases`; this
keeps the case set outside the published package while preserving pack/install/import and still
executing the packed definition.

The same installed consumer also runs runner-owned adapter probes. One explicitly supplied
compiler handles mixed built-in and packed third-party scenes through deterministic, reviewed,
strict, and warning remark paths. The mixed component output must transport both plans exactly;
the built-in expectation is independently materialized by that same configured compiler. A
reviewed materialized plan is checked across component, element, strip, packed React SSR, and a
`--conditions=react-server` process. Esbuild bundles the actual generated mixed remark module
from inside the packed consumer, proving its automatic imports resolve. The bundle metafile must
contain neither the installed Recipe package nor the Scene `/recipes` entry, and its output must
exclude the Recipe implementation sentinel bytes.

Run the case-set guard self-test when changing the runner contract:

```sh
node scripts/recipe-conformance/self-test.mjs
```

The root `npm run check` command runs this self-test in CI. It proves that blank categories,
a missing locale/version fixture, an undeclared fixture, wrong-category/duplicate/missing or
behaviorally forged coverage, alternate case definitions, duplicate cases, empty lifecycle
steps, CommonJS entries, incompatible peers, invalid peer ranges, and malformed CLI invocations
all fail.
It also proves ordinary dependencies resolve and ordered `node`/`import` conditions choose the
real Node branch from packages without a `type` field.
