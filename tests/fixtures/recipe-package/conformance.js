const packageName = '@mdx-handwritten-fixtures/recipe-package'
const recipeName = `${packageName}/change`
const source = 'before -> after'
const sourceIdentity = Object.freeze({
  normalization: 'trim-lf-v1',
  algorithm: 'sha256',
  digest: '85b6282e11d00a1f974a5f143bb3de0f5688a07c190655fba9c36a505b844a21',
})

function exactPlan(locale, provenance, {catalogVersion = 1, recipeVersion = 1} = {}) {
  const chinese = locale === 'zh-CN'
  return {
    schema: 'mdx-handwritten/scene-plan',
    schemaVersion: 1,
    recipe: {name: recipeName, version: recipeVersion},
    localization: {
      locale,
      catalog: {id: 'fixture.change.catalog', version: catalogVersion},
    },
    title: chinese ? '从修改前变为修改后' : 'Change from before to after',
    source: {text: source, identity: sourceIdentity},
    targets: [
      {
        id: 'before',
        role: 'before',
        semanticAnchor: {name: 'before'},
        ranges: [{start: 0, end: 6, exactText: 'before'}],
      },
      {
        id: 'after',
        role: 'after',
        semanticAnchor: {name: 'after'},
        ranges: [{start: 10, end: 15, exactText: 'after'}],
      },
    ],
    labels: [{id: 'change-label', text: chinese ? '变为' : 'changes to'}],
    relationships: [{
      id: 'change',
      kind: 'relates',
      relation: 'changes-to',
      labelId: 'change-label',
      fromTargetIds: ['before'],
      toTargetIds: ['after'],
      detailKind: 'short-description',
      legendText: chinese ? '修改前的内容变为修改后的内容。' : 'Before changes to after.',
    }],
    gestures: [{id: 'connect-change', kind: 'connect', relationshipId: 'change'}],
    provenance,
  }
}

const deterministicProvenance = Object.freeze({
  kind: 'deterministic-recipe',
  engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
  appliedCorrections: [],
})
const reviewedProvenance = Object.freeze({
  kind: 'reviewed-proposal',
  engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
  generator: {id: 'fixture-generator'},
  review: {status: 'approved', id: 'fixture-review'},
})
const englishPlan = exactPlan('en', deterministicProvenance)
const chinesePlan = exactPlan('zh-CN', deterministicProvenance)
const reviewedPlan = exactPlan('en', reviewedProvenance)

function recipeDiagnostic(suffix, message = 'The Annotation recipe rejected the source.') {
  return [{
    code: 'scene-recipe-rejected',
    message,
    recipeCode: `${recipeName}@1/${suffix}`,
  }]
}

const corrections = Object.freeze([
  {
    id: 'target-review',
    kind: 'target',
    slot: 'before',
    anchor: 'reviewed-before',
    ranges: [{start: 0, end: 6, exactText: 'before'}],
  },
  {id: 'label-review', kind: 'label', labelId: 'change-label', text: 'becomes'},
  {
    id: 'relationship-review',
    kind: 'relationship',
    relationshipId: 'change',
    change: {legendText: 'Reviewed transition.'},
  },
])

const correctedPlan = exactPlan('en', {
  kind: 'deterministic-recipe',
  engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
  appliedCorrections: [
    {kind: 'target', ref: 'target-review'},
    {kind: 'label', ref: 'label-review'},
    {kind: 'relationship', ref: 'relationship-review'},
  ],
})
correctedPlan.targets[0] = {
  ...correctedPlan.targets[0],
  id: 'reviewed-before',
  semanticAnchor: {name: 'reviewed-before'},
}
correctedPlan.labels[0] = {...correctedPlan.labels[0], text: 'becomes'}
correctedPlan.relationships[0] = {
  ...correctedPlan.relationships[0],
  fromTargetIds: ['reviewed-before'],
  legendText: 'Reviewed transition.',
}

const configurationFailures = Object.freeze([
  {
    name: 'unsupported protocol identifier',
    covers: ['configuration.protocol-identifier'],
    expected: {
      code: 'scene-compiler-package-protocol-unsupported',
      path: ['recipePackages', 0, 'definition', 'protocol'],
    },
  },
  {
    name: 'unsupported protocol version',
    covers: ['configuration.protocol-version'],
    expected: {
      code: 'scene-compiler-package-protocol-unsupported',
      path: ['recipePackages', 0, 'definition', 'protocolVersion'],
    },
  },
  {
    name: 'host package name mismatch',
    covers: ['configuration.host-name'],
    expected: {
      code: 'scene-compiler-package-name-mismatch',
      path: ['recipePackages', 0, 'definition', 'packageName'],
    },
  },
  {
    name: 'invalid host package name grammar',
    covers: ['configuration.host-name-grammar'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 0, 'definition'],
    },
  },
  {
    name: 'recipe outside host namespace',
    covers: ['configuration.recipe-namespace'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 0, 'definition', 'recipes', 0],
    },
  },
  {
    name: 'invalid canonical recipe name grammar',
    covers: ['configuration.recipe-name-grammar'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 0, 'definition', 'recipes', 0],
    },
  },
  {
    name: 'missing active exact version',
    covers: ['configuration.active-version'],
    expected: {
      code: 'scene-compiler-active-version-missing',
      path: ['recipePackages', 0, 'definition', 'activeVersions', recipeName],
    },
  },
  {
    name: 'duplicate exact recipe identity',
    covers: ['configuration.exact-duplicate'],
    expected: {
      code: 'scene-compiler-recipe-duplicate',
      path: ['recipePackages', 0, 'definition', 'recipes', 1, 'ref'],
    },
  },
  {
    name: 'duplicate package binding',
    covers: ['configuration.duplicate-binding'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 1, 'packageName'],
    },
  },
  {
    name: 'incomplete localization catalog',
    covers: ['configuration.catalog'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 0, 'definition', 'recipes', 0, 'catalog', 'messages'],
    },
  },
  {
    name: 'limit above protocol maximum',
    covers: ['configuration.limits'],
    expected: {
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages', 0, 'definition', 'recipes', 0, 'limits'],
    },
  },
])

const compilerLifecycles = Object.freeze([
  {
    name: 'metadata function collection and active-map snapshot',
    covers: [
      'snapshot.metadata',
      'snapshot.functions',
      'snapshot.collections',
      'snapshot.active-map',
    ],
    steps: [{
      name: 'compile after source metadata mutation',
      input: {recipe: recipeName, source, locale: 'en'},
      expected: {ok: true, plan: englishPlan, diagnostics: []},
      expectedObservation: {
        capturedCompile: 1,
        capturedValidate: 1,
        mutatedCompile: 0,
        mutatedValidate: 0,
      },
    }],
  },
  {
    name: 'unknown selector callback isolation',
    covers: ['routing.unknown-selector'],
    steps: [{
      name: 'unknown selector',
      input: {recipe: '@other/recipes/missing', source},
      expected: {
        ok: false,
        plan: null,
        diagnostics: [{
          code: 'scene-recipe-unknown',
          message: 'The Annotation recipe is not supported.',
        }],
      },
      expectedObservation: {compile: 0, validate: 0},
    }],
  },
  {
    name: 'active selector and inactive exact Reviewed candidate routing',
    covers: ['routing.active-inactive'],
    steps: [
      {
        name: 'active author selector chooses version two',
        input: {recipe: recipeName, source, locale: 'en'},
        expected: {
          ok: true,
          plan: exactPlan('en', deterministicProvenance, {
            catalogVersion: 2,
            recipeVersion: 2,
          }),
          diagnostics: [],
        },
        expectedObservation: {
          v1Compile: 0,
          v1Validate: 0,
          v2Compile: 1,
          v2Validate: 1,
        },
      },
      {
        name: 'inactive reviewed version invokes only its validator',
        input: {source, candidateJson: JSON.stringify(reviewedPlan)},
        expected: {ok: true, plan: reviewedPlan, diagnostics: []},
        expectedObservation: {
          v1Compile: 0,
          v1Validate: 1,
          v2Compile: 1,
          v2Validate: 1,
        },
      },
    ],
  },
])

export const recipeConformanceCases = Object.freeze({
  packageName,
  peerDependency: Object.freeze({name: '@madinah/mdx-handwritten-scene', range: '^0.2.0'}),
  expectedFiles: Object.freeze(['conformance.js', 'index.js', 'package.json']),
  configurationFailures,
  plans: Object.freeze([
    {
      name: 'exact full English plan',
      input: {recipe: recipeName, source, locale: 'en'},
      expected: {ok: true, plan: englishPlan, diagnostics: []},
    },
    {
      name: 'exact full Simplified Chinese plan',
      input: {recipe: recipeName, source, locale: 'zh-CN'},
      expected: {ok: true, plan: chinesePlan, diagnostics: []},
    },
  ]),
  reviewedCandidates: Object.freeze([
    {
      name: 'exact reviewed candidate',
      covers: ['reviewed.exact'],
      input: {source, candidateJson: JSON.stringify(reviewedPlan)},
      expected: {ok: true, plan: reviewedPlan, diagnostics: []},
    },
  ]),
  corrections: Object.freeze([
    {
      name: 'all correction kinds and target correction delivery',
      covers: ['corrections.all-kinds'],
      input: {recipe: recipeName, source, locale: 'en', corrections},
      expected: {ok: true, plan: correctedPlan, diagnostics: []},
    },
  ]),
  failures: Object.freeze([
    {
      name: 'compile throw',
      covers: ['failure.compile-throw'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-compile-threw'),
    },
    {
      name: 'compile Promise',
      covers: ['failure.compile-promise'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-compile-result-invalid'),
    },
    {
      name: 'compile null',
      covers: ['failure.compile-null'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-compile-result-invalid'),
    },
    {
      name: 'malformed compile result',
      covers: ['failure.compile-malformed'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-compile-result-invalid'),
    },
    {
      name: 'invalid compile diagnostic',
      covers: ['failure.compile-invalid-diagnostic'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-diagnostic-invalid'),
    },
    {
      name: 'unknown draft field',
      covers: ['failure.unknown-field'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: [{
        code: 'scene-plan-field-unknown',
        message: 'The candidate Scene plan contains an unknown field.',
        path: ['draft', 'extra'],
      }],
    },
    {
      name: 'unsafe range',
      covers: ['failure.unsafe-range'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: [{
        code: 'scene-plan-range-invalid',
        message: 'A Scene plan source range is invalid.',
        path: ['targets', 0, 'ranges', 0],
      }],
    },
    {
      name: 'unresolved reference',
      covers: ['failure.unresolved-reference'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: [{
        code: 'scene-plan-reference-missing',
        message: 'A Scene plan reference does not resolve.',
        path: ['relationships', 0, 'fromTargetIds', 0],
      }],
    },
    {
      name: 'over-limit draft',
      covers: ['failure.over-limit'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: [{
        code: 'scene-plan-limit-exceeded',
        message: 'A fixed Scene plan limit was exceeded.',
        path: ['targets'],
        limit: {name: 'targets', maximum: 1, actual: 2},
      }],
    },
    {
      name: 'validate throw',
      covers: ['failure.validate-throw'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-validate-threw'),
    },
    {
      name: 'validate Promise',
      covers: ['failure.validate-promise'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-validate-result-invalid'),
    },
    {
      name: 'validate null',
      covers: ['failure.validate-null'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-validate-result-invalid'),
    },
    {
      name: 'malformed validate result',
      covers: ['failure.validate-malformed'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-validate-result-invalid'),
    },
    {
      name: 'invalid validate diagnostic',
      covers: ['failure.validate-invalid-diagnostic'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('package-diagnostic-invalid'),
    },
    {
      name: 'recipe-specific validate rejection',
      covers: ['failure.validate-rejection'],
      input: {recipe: recipeName, source},
      expectedDiagnostics: recipeDiagnostic('identity-invalid', 'Unexpected target identity.'),
    },
  ]),
  compilerLifecycles,
})
