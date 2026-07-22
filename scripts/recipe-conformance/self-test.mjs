import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import definition from '../../tests/fixtures/recipe-package/index.js'
import {recipeConformanceCases} from '../../tests/fixtures/recipe-package/conformance.js'
import {
  requiredRecipeConformanceCoverage,
  runRecipePackageConformance,
  validatePackedScenePeerCompatibility,
  validatePreparedCompilerLifecycle,
  validateRecipeConformanceCaseSet,
} from './index.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')

assert.doesNotThrow(() => {
  validateRecipeConformanceCaseSet({definition, cases: recipeConformanceCases})
})

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      plans: [],
      reviewedCandidates: [],
      corrections: [],
      failures: [],
      configurationFailures: [],
      compilerLifecycles: [],
    },
  }),
  /plans conformance category must not be empty/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {...recipeConformanceCases, plans: recipeConformanceCases.plans.slice(0, 1)},
  }),
  /fixture matrix must cover every declared recipe\/version\/locale once/u,
)

const undeclaredPlan = structuredClone(recipeConformanceCases.plans[0])
undeclaredPlan.name = 'undeclared exact fixture'
undeclaredPlan.expected.plan.recipe.name = '@other/recipes/change'
assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      plans: [...recipeConformanceCases.plans, undeclaredPlan],
    },
  }),
  /covers an undeclared recipe\/version\/locale/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      plans: [...recipeConformanceCases.plans, recipeConformanceCases.plans[0]],
    },
  }),
  /plans case name exact full English plan is duplicated/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      plans: [{...recipeConformanceCases.plans[0], packageDefinition: definition}, ...recipeConformanceCases.plans.slice(1)],
    },
  }),
  /must not replace the imported packed definition/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      configurationFailures: [
        {
          ...recipeConformanceCases.configurationFailures[0],
          createBindings: () => [],
        },
        ...recipeConformanceCases.configurationFailures.slice(1),
      ],
    },
  }),
  /must use the runner-owned configuration probe/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      compilerLifecycles: [
        {
          ...recipeConformanceCases.compilerLifecycles[0],
          prepare: () => ({}),
        },
        ...recipeConformanceCases.compilerLifecycles.slice(1),
      ],
    },
  }),
  /must use the runner-owned lifecycle probe/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      failures: recipeConformanceCases.failures.filter(
        ({covers}) => !covers.includes('failure.unsafe-range'),
      ),
    },
  }),
  /coverage group \["failure\.unsafe-range"\] must be used exactly once/u,
)

function replaceCaseCoverage(category, index, covers) {
  const caseValues = [...recipeConformanceCases[category]]
  caseValues[index] = {...caseValues[index], covers}
  return {...recipeConformanceCases, [category]: caseValues}
}

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: replaceCaseCoverage('reviewedCandidates', 0, [
      'reviewed.exact',
      'failure.unsafe-range',
    ]),
  }),
  /exact reviewed candidate must use an exact runner-owned coverage group/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: replaceCaseCoverage('failures', 0, [
      'failure.compile-throw',
      'failure.compile-throw',
    ]),
  }),
  /compile throw must use an exact runner-owned coverage group/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: replaceCaseCoverage('failures', 0, []),
  }),
  /compile throw must cover at least one capability/u,
)

for (const category of ['failures', 'configurationFailures', 'compilerLifecycles']) {
  const collapsedCase = {
    ...recipeConformanceCases[category][0],
    covers: requiredRecipeConformanceCoverage[category].flat(),
  }
  assert.throws(
    () => validateRecipeConformanceCaseSet({
      definition,
      cases: {...recipeConformanceCases, [category]: [collapsedCase]},
    }),
    new RegExp(`${category} case .* exact runner-owned coverage group`, 'u'),
  )
}

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      configurationFailures: [
        ...recipeConformanceCases.configurationFailures,
        recipeConformanceCases.configurationFailures[0],
      ],
    },
  }),
  /configurationFailures case name .* is duplicated/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      failures: [
        ...recipeConformanceCases.failures,
        {...recipeConformanceCases.failures[0], name: 'duplicate compile throw'},
      ],
    },
  }),
  /coverage group \["failure\.compile-throw"\] must be used exactly once/u,
)

assert.throws(
  () => validatePreparedCompilerLifecycle(
    recipeConformanceCases.compilerLifecycles[0],
    {observe: () => ({}), steps: []},
  ),
  /must prepare at least one lifecycle step/u,
)

assert.throws(
  () => validatePreparedCompilerLifecycle(
    recipeConformanceCases.compilerLifecycles[0],
    {
      observe: () => ({}),
      steps: [{name: 'missing observation', input: {}, expected: {}}],
    },
  ),
  /must provide an expectedObservation object/u,
)

assert.throws(
  () => validateRecipeConformanceCaseSet({
    definition,
    cases: {
      ...recipeConformanceCases,
      peerDependency: {name: 'unrelated-package', range: '^1.0.0'},
    },
  }),
  /peer dependency must be mdx-handwritten-scene/u,
)

function peerCompatibility(range) {
  return {
    cases: {
      ...recipeConformanceCases,
      peerDependency: {name: 'mdx-handwritten-scene', range},
    },
    packageJson: {peerDependencies: {'mdx-handwritten-scene': range}},
    scenePackageJson: {name: 'mdx-handwritten-scene', version: '0.1.0'},
  }
}

assert.doesNotThrow(() => {
  validatePackedScenePeerCompatibility(peerCompatibility('^0.1.0'))
})
assert.throws(
  () => validatePackedScenePeerCompatibility(peerCompatibility('^99.0.0')),
  /does not satisfy \^99\.0\.0/u,
)
assert.throws(
  () => validatePackedScenePeerCompatibility(peerCompatibility('not a semver range')),
  /must be a valid non-empty SemVer range/u,
)
const mismatchedPackagePeer = peerCompatibility('^0.1.0')
mismatchedPackagePeer.packageJson.peerDependencies['mdx-handwritten-scene'] = '^0.2.0'
assert.throws(
  () => validatePackedScenePeerCompatibility(mismatchedPackagePeer),
  /peer dependency must match exactly/u,
)

const consumerFixtureRoot = mkdtempSync(resolve(tmpdir(), 'recipe-conformance-consumer-'))
try {
  const noTypePackageDirectory = resolve(consumerFixtureRoot, 'recipe')
  const helperPackageDirectory = resolve(consumerFixtureRoot, 'helper')
  mkdirSync(noTypePackageDirectory)
  mkdirSync(helperPackageDirectory)

  writeFileSync(
    resolve(helperPackageDirectory, 'package.json'),
    JSON.stringify({
      name: 'recipe-conformance-helper',
      version: '1.0.0',
      type: 'module',
      files: ['node.mjs', 'import.mjs'],
      exports: {'.': {node: './node.mjs', import: './import.mjs'}},
    }),
  )
  writeFileSync(
    resolve(helperPackageDirectory, 'node.mjs'),
    "export const resolvedCondition = 'node'\n",
  )
  writeFileSync(
    resolve(helperPackageDirectory, 'import.mjs'),
    "export const resolvedCondition = 'import'\n",
  )
  writeFileSync(
    resolve(noTypePackageDirectory, 'definition.mjs'),
    readFileSync(resolve(projectRoot, 'tests/fixtures/recipe-package/index.js')),
  )
  writeFileSync(
    resolve(noTypePackageDirectory, 'node-entry.mjs'),
    [
      "export {default, changeRecipe, recipePackage} from './definition.mjs'",
      "export {resolvedCondition as dependencyProbe} from 'recipe-conformance-helper'",
      "export const recipeEntryCondition = 'node'",
      '',
    ].join('\n'),
  )
  writeFileSync(
    resolve(noTypePackageDirectory, 'import-entry.mjs'),
    [
      "export {default, changeRecipe, recipePackage} from './definition.mjs'",
      "export const dependencyProbe = 'import-entry'",
      "export const recipeEntryCondition = 'import'",
      '',
    ].join('\n'),
  )
  writeFileSync(
    resolve(noTypePackageDirectory, 'broken-entry.mjs'),
    [
      "import {recipePackage} from './definition.mjs'",
      'const [recipe] = recipePackage.recipes',
      'export default {...recipePackage, recipes: [{...recipe, compile() { return null }}]}',
      'export {recipePackage}',
      '',
    ].join('\n'),
  )

  const expectedFiles = [
    'broken-entry.mjs',
    'definition.mjs',
    'import-entry.mjs',
    'node-entry.mjs',
    'package.json',
  ]
  function writeRecipePackage(range, entry = './node-entry.mjs') {
    writeFileSync(
      resolve(noTypePackageDirectory, 'package.json'),
      JSON.stringify({
        name: recipeConformanceCases.packageName,
        version: '1.0.0',
        files: ['definition.mjs', 'node-entry.mjs', 'import-entry.mjs', 'broken-entry.mjs'],
        exports: {'.': {node: entry, import: './import-entry.mjs'}},
        dependencies: {'recipe-conformance-helper': '1.0.0'},
        peerDependencies: {'mdx-handwritten-scene': range},
      }),
    )
  }
  function runConsumerFixture(
    range,
    moduleExportAssertions = [],
    caseSet,
    entry,
    definitionExport = 'recipePackage',
  ) {
    writeRecipePackage(range, entry)
    return runRecipePackageConformance({
      additionalPackageDirectories: [helperPackageDirectory],
      packageDirectory: noTypePackageDirectory,
      cases: caseSet ?? {
        ...recipeConformanceCases,
        expectedFiles,
        peerDependency: {name: 'mdx-handwritten-scene', range},
      },
      definitionExport,
      moduleExportAssertions,
      scenePackageDirectory: resolve(projectRoot, 'packages/scene'),
    })
  }

  const result = await runConsumerFixture('^0.1.0', [
    {name: 'dependencyProbe', expected: 'node'},
    {name: 'recipeEntryCondition', expected: 'node'},
  ])
  assert.equal(result.packageName, recipeConformanceCases.packageName)
  assert.deepStrictEqual(
    result.additionalPackages.map(({name}) => name),
    ['recipe-conformance-helper'],
  )

  const forgedFailures = recipeConformanceCases.failures.map((caseValue) => ({...caseValue}))
  const unsafeIndex = forgedFailures.findIndex(({covers}) => covers[0] === 'failure.unsafe-range')
  ;[forgedFailures[0].covers, forgedFailures[unsafeIndex].covers] = [
    forgedFailures[unsafeIndex].covers,
    forgedFailures[0].covers,
  ]
  await assert.rejects(
    () => runConsumerFixture(
      '^0.1.0',
      [],
      {...recipeConformanceCases, expectedFiles, failures: forgedFailures},
    ),
    /must return its stable diagnostics/u,
  )

  const alternateDefinitionCases = Object.fromEntries(
    Object.entries({...recipeConformanceCases, expectedFiles}).map(([key, value]) => [
      key,
      ['plans', 'reviewedCandidates', 'corrections', 'failures'].includes(key)
        ? value.map((caseValue) => ({...caseValue, packageDefinition: definition}))
        : value,
    ]),
  )
  await assert.rejects(
    () => runConsumerFixture(
      '^0.1.0',
      [],
      alternateDefinitionCases,
      './broken-entry.mjs',
      'default',
    ),
    /must not replace the imported packed definition/u,
  )

  await assert.rejects(
    () => runConsumerFixture('^99.0.0'),
    /(?:ERESOLVE|could not resolve|unable to resolve|conflicting peer dependency)/iu,
  )
  await assert.rejects(
    () => runConsumerFixture('not a semver range'),
    /(?:invalid|EINVALIDTAGNAME|semver)/iu,
  )
} finally {
  rmSync(consumerFixtureRoot, {force: true, recursive: true})
}

const commonJsFixtureRoot = mkdtempSync(resolve(tmpdir(), 'recipe-conformance-commonjs-'))
try {
  writeFileSync(
    resolve(commonJsFixtureRoot, 'package.json'),
    JSON.stringify({
      name: recipeConformanceCases.packageName,
      version: '1.0.0',
      type: 'commonjs',
      files: ['index.cjs', 'conformance.mjs'],
      exports: {'.': './index.cjs', './conformance': './conformance.mjs'},
      peerDependencies: {'mdx-handwritten-scene': '^0.1.0'},
    }),
  )
  writeFileSync(resolve(commonJsFixtureRoot, 'index.cjs'), 'module.exports = {}\n')
  writeFileSync(
    resolve(commonJsFixtureRoot, 'conformance.mjs'),
    `export const recipeConformanceCases = ${JSON.stringify(recipeConformanceCases)}\n`,
  )
  for (const externalCases of [recipeConformanceCases, undefined]) {
    await assert.rejects(
      () => runRecipePackageConformance({
        packageDirectory: commonJsFixtureRoot,
        cases: externalCases,
        scenePackageDirectory: resolve(projectRoot, 'packages/scene'),
      }),
      /CommonJS Recipe package entries are not supported/u,
    )
  }
} finally {
  rmSync(commonJsFixtureRoot, {force: true, recursive: true})
}

console.log(
  'PASS Recipe conformance guards and real npm consumer dependency, condition, and peer checks.',
)
