import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, extname, parse, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import semver from 'semver'

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(' ')} failed:\n${result.stderr.trim()}`,
    )
  }
  return result
}

function packDirectory(packageDirectory, destination, label) {
  const result = run(
    npmExecutable(),
    ['pack', '--json', '--pack-destination', destination, packageDirectory],
    {cwd: packageDirectory},
  )
  const report = JSON.parse(result.stdout)
  const packs = Array.isArray(report)
    ? report
    : report && typeof report === 'object'
      ? typeof report.filename === 'string'
        ? [report]
        : Object.values(report)
      : []
  const [pack] = packs
  if (
    packs.length !== 1 ||
    !pack ||
    typeof pack.filename !== 'string' ||
    typeof pack.name !== 'string' ||
    typeof pack.version !== 'string' ||
    !Array.isArray(pack.files)
  ) {
    throw new Error(`npm returned an invalid pack report for ${label}.`)
  }
  return pack
}

function findInstalledPackage(packageDirectory, packageName) {
  let current = resolve(packageDirectory)
  const filesystemRoot = parse(current).root
  while (true) {
    const candidate = resolve(current, 'node_modules', ...packageName.split('/'))
    const packageJsonPath = resolve(candidate, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      if (packageJson.name === packageName) return realpathSync(candidate)
    }
    if (current === filesystemRoot) break
    current = dirname(current)
  }
  throw new Error(
    `Unable to locate ${packageName} from the Recipe package directory.`,
  )
}

function installedPackageDirectory(consumerDirectory, packageName) {
  if (
    !/^(?:[a-z0-9][a-z0-9._-]{0,63}|@[a-z0-9][a-z0-9._-]{0,31}\/[a-z0-9][a-z0-9._-]{0,63})$/u
      .test(packageName)
  ) {
    throw new Error(`The installed package name ${packageName} is invalid.`)
  }
  return resolve(consumerDirectory, 'node_modules', ...packageName.split('/'))
}

function packageExportSpecifier(packageName, exportName) {
  if (exportName === '.') return packageName
  if (!exportName.startsWith('./') || exportName.length === 2) {
    throw new Error(`The requested package export ${exportName} is not a package subpath.`)
  }
  return `${packageName}/${exportName.slice(2)}`
}

async function createConsumerLoader({
  consumerDirectory,
  conformanceSpecifier,
  includeConformance,
  packageName,
}) {
  const loaderPath = resolve(consumerDirectory, 'loader.mjs')
  const conformanceImport = includeConformance
    ? `export const conformanceModule = await import(${JSON.stringify(conformanceSpecifier)})`
    : 'export const conformanceModule = null'
  writeFileSync(
    loaderPath,
    [
      `export const recipeModuleUrl = import.meta.resolve(${JSON.stringify(packageName)})`,
      `export const recipeModule = await import(${JSON.stringify(packageName)})`,
      conformanceImport,
      "export const sceneRecipes = await import('mdx-handwritten-scene/recipes')",
      '',
    ].join('\n'),
  )
  return import(pathToFileURL(loaderPath).href)
}

function assertResolvedRecipeEntryIsEsm(entryUrl, installedDirectory) {
  assert.ok(
    typeof entryUrl === 'string' && entryUrl.startsWith('file:'),
    'The packed Recipe entry must resolve to a local ESM file.',
  )
  const entryPath = realpathSync(fileURLToPath(entryUrl))
  const packageRoot = realpathSync(installedDirectory)
  assert.ok(
    entryPath === packageRoot || entryPath.startsWith(`${packageRoot}/`),
    'The resolved Recipe entry must belong to the installed packed package.',
  )

  const extension = extname(entryPath)
  if (extension === '.mjs') return
  assert.notEqual(extension, '.cjs', 'CommonJS Recipe package entries are not supported; publish ESM.')

  let current = dirname(entryPath)
  while (current === packageRoot || current.startsWith(`${packageRoot}/`)) {
    const packageJsonPath = resolve(current, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      assert.equal(
        packageJson.type,
        'module',
        'CommonJS Recipe package entries are not supported; the resolved packed entry must be ESM.',
      )
      return
    }
    if (current === packageRoot) break
    current = dirname(current)
  }
  assert.fail('The resolved packed Recipe entry must be .mjs or belong to a type=module package.')
}

function installConsumerPackages(consumerDirectory, archivePaths) {
  writeFileSync(
    resolve(consumerDirectory, 'package.json'),
    JSON.stringify({name: 'mdx-handwritten-recipe-conformance-consumer', private: true, type: 'module'}),
  )
  run(
    npmExecutable(),
    [
      'install',
      '--ignore-scripts',
      '--strict-peer-deps',
      '--no-package-lock',
      '--no-save',
      ...archivePaths,
    ],
    {cwd: consumerDirectory},
  )
}

function assertJsonRoundTrip(value, label) {
  const serialized = JSON.stringify(value)
  assert.deepStrictEqual(JSON.parse(serialized), value, `${label} must survive JSON round-trip.`)
  return serialized
}

function compilerFor(createSceneCompiler, packageDefinition, packageName) {
  return createSceneCompiler({
    recipePackages: [{packageName, definition: packageDefinition}],
  })
}

function singleCoverage(caseValue) {
  assert.equal(
    caseValue.covers?.length,
    1,
    `${caseValue.name} must declare one runner-owned behavioral capability.`,
  )
  return caseValue.covers[0]
}

function recipeForInput(definition, input) {
  const selector = input?.recipe
  assert.equal(typeof selector, 'string', 'Runner-owned Recipe probes require an author selector.')
  const exactMatch = /^(.*)@(\d+)$/u.exec(selector)
  const name = exactMatch?.[1] ?? selector
  const version = exactMatch === null
    ? definition.activeVersions?.[name]
    : Number(exactMatch[2])
  const index = definition.recipes.findIndex(
    (recipe) => recipe.ref.name === name && recipe.ref.version === version,
  )
  assert.notEqual(index, -1, `Runner-owned Recipe probes could not resolve ${selector}.`)
  return {index, recipe: definition.recipes[index]}
}

function withRecipe(definition, index, recipe) {
  const recipes = [...definition.recipes]
  recipes[index] = recipe
  return {...definition, recipes}
}

function successfulPackedCompile(recipe, context) {
  const result = Reflect.apply(recipe.compile, undefined, [context])
  assert.ok(
    result && typeof result === 'object' && result.ok === true,
    'The packed Recipe compile function must first succeed for the runner-owned failure probe.',
  )
  return structuredClone(result)
}

function successfulPackedValidate(recipe, context) {
  const result = Reflect.apply(recipe.validate, undefined, [context])
  assert.deepStrictEqual(
    result,
    {ok: true},
    'The packed Recipe validate function must first accept the runner-owned failure probe.',
  )
  return structuredClone(result)
}

function runnerFailureDefinition(caseValue, definition) {
  const capability = singleCoverage(caseValue)
  const {index, recipe} = recipeForInput(definition, caseValue.input)
  let packedCompileCalls = 0
  let packedValidateCalls = 0
  const callCompile = (context) => {
    packedCompileCalls += 1
    return successfulPackedCompile(recipe, context)
  }
  const callValidate = (context) => {
    packedValidateCalls += 1
    successfulPackedValidate(recipe, context)
  }
  // Validation probes still exercise the packed compiler before replacing only
  // the validation outcome. Count that call through the same runner-owned
  // wrapper used by compile probes so authenticity checks match Scene's order.
  const replacement = {...recipe, compile: callCompile}
  if (capability.startsWith('failure.validate-')) replacement.compile = callCompile

  switch (capability) {
    case 'failure.compile-throw':
      replacement.compile = context => {
        callCompile(context)
        throw new Error('runner-owned compile failure')
      }
      break
    case 'failure.compile-promise':
      replacement.compile = context => {
        callCompile(context)
        return Promise.resolve({ok: true})
      }
      break
    case 'failure.compile-null':
      replacement.compile = context => {
        callCompile(context)
        return null
      }
      break
    case 'failure.compile-malformed':
      replacement.compile = context => ({...callCompile(context), extra: true})
      break
    case 'failure.compile-invalid-diagnostic':
      replacement.compile = context => {
        callCompile(context)
        return {ok: false, diagnostics: [{reason: 'UPPER', message: 'invalid'}]}
      }
      break
    case 'failure.unknown-field':
      replacement.compile = context => {
        const result = callCompile(context)
        return {ok: true, draft: {...result.draft, extra: true}}
      }
      break
    case 'failure.unsafe-range':
      replacement.compile = context => {
        const result = callCompile(context)
        assert.ok(result.draft.targets[0]?.ranges[0], 'The unsafe-range probe needs one range.')
        result.draft.targets[0].ranges[0] = {
          start: 0,
          end: context.source.length + 1,
          exactText: context.source,
        }
        return result
      }
      break
    case 'failure.unresolved-reference':
      replacement.compile = context => {
        const result = callCompile(context)
        const relationship = result.draft.relationships[0]
        assert.ok(relationship, 'The unresolved-reference probe needs one relationship.')
        if (relationship.kind === 'describes') relationship.targetIds = ['missing']
        else relationship.fromTargetIds = ['missing']
        return result
      }
      break
    case 'failure.over-limit':
      replacement.limits = {...recipe.limits, targets: 1}
      replacement.compile = context => {
        const result = callCompile(context)
        assert.ok(result.draft.targets.length > 1, 'The over-limit probe needs multiple targets.')
        return result
      }
      break
    case 'failure.validate-throw':
      replacement.validate = context => {
        callValidate(context)
        throw new Error('runner-owned validation failure')
      }
      break
    case 'failure.validate-promise':
      replacement.validate = context => {
        callValidate(context)
        return Promise.resolve({ok: true})
      }
      break
    case 'failure.validate-null':
      replacement.validate = context => {
        callValidate(context)
        return null
      }
      break
    case 'failure.validate-malformed':
      replacement.validate = context => {
        callValidate(context)
        return {ok: true, extra: true}
      }
      break
    case 'failure.validate-invalid-diagnostic':
      replacement.validate = context => {
        callValidate(context)
        return {ok: false, diagnostics: [{reason: 'UPPER', message: 'invalid'}]}
      }
      break
    case 'failure.validate-rejection':
      replacement.validate = context => {
        callValidate(context)
        return {
          ok: false,
          diagnostics: [{
            reason: 'identity-invalid',
            message: 'Unexpected target identity.',
          }],
        }
      }
      break
    default:
      assert.fail(`No runner-owned failure probe exists for ${capability}.`)
  }

  return {
    definition: withRecipe(definition, index, replacement),
    verify() {
      assert.ok(packedCompileCalls > 0, `${caseValue.name} must execute the packed compile function.`)
      if (capability.startsWith('failure.validate-')) {
        assert.ok(packedValidateCalls > 0, `${caseValue.name} must execute the packed validate function.`)
      }
    },
  }
}

function runnerCorrectionDefinition(caseValue, definition) {
  const {index, recipe} = recipeForInput(definition, caseValue.input)
  let packedCompileCalls = 0
  let packedValidateCalls = 0
  let deliveredTargetCorrections = 0
  const replacement = {
    ...recipe,
    compile(context) {
      packedCompileCalls += 1
      deliveredTargetCorrections += context.targetCorrections.length
      return Reflect.apply(recipe.compile, undefined, [context])
    },
    validate(context) {
      packedValidateCalls += 1
      return Reflect.apply(recipe.validate, undefined, [context])
    },
  }
  return {
    definition: withRecipe(definition, index, replacement),
    verify() {
      assert.ok(packedCompileCalls > 0, `${caseValue.name} must execute the packed compile function.`)
      assert.ok(
        packedValidateCalls > 0,
        `${caseValue.name} must execute the packed validate function.`,
      )
      assert.ok(
        deliveredTargetCorrections > 0,
        `${caseValue.name} must deliver a declared target correction to packed compile.`,
      )
    },
  }
}

function runnerDefinitionForCase(caseValue, definition) {
  assert.equal(
    Object.hasOwn(caseValue, 'packageDefinition'),
    false,
    `${caseValue.name} must not replace the imported packed definition.`,
  )
  const capability = caseValue.covers?.[0]
  if (typeof capability === 'string' && capability.startsWith('failure.')) {
    return runnerFailureDefinition(caseValue, definition)
  }
  if (capability === 'corrections.all-kinds') {
    return runnerCorrectionDefinition(caseValue, definition)
  }
  return {definition}
}

function assertSuccessfulCase({case_: caseValue, createSceneCompiler, definition, packageName}) {
  const {definition: exercisedDefinition, verify} = runnerDefinitionForCase(
    caseValue,
    definition,
  )
  const compiler = compilerFor(createSceneCompiler, exercisedDefinition, packageName)
  const first = compiler.createScenePlan(caseValue.input)
  assert.deepStrictEqual(first, caseValue.expected, `${caseValue.name} must match its exact fixture.`)
  const firstJson = assertJsonRoundTrip(first, caseValue.name)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const repeated = compiler.createScenePlan(caseValue.input)
    assert.deepStrictEqual(repeated, first, `${caseValue.name} must be repeatable.`)
    assert.equal(JSON.stringify(repeated), firstJson, `${caseValue.name} JSON must be deterministic.`)
  }
  verify?.()
}

function assertFailureCase({case_: caseValue, createSceneCompiler, definition, packageName}) {
  const {definition: exercisedDefinition, verify} = runnerDefinitionForCase(
    caseValue,
    definition,
  )
  const compiler = compilerFor(createSceneCompiler, exercisedDefinition, packageName)
  const expected = {ok: false, plan: null, diagnostics: caseValue.expectedDiagnostics}
  const result = compiler.createScenePlan(caseValue.input)
  assert.deepStrictEqual(result, expected, `${caseValue.name} must return its stable diagnostics.`)
  const resultJson = assertJsonRoundTrip(result, caseValue.name)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const repeated = compiler.createScenePlan(caseValue.input)
    assert.deepStrictEqual(repeated, result, `${caseValue.name} diagnostics must be repeatable.`)
    assert.equal(
      JSON.stringify(repeated),
      resultJson,
      `${caseValue.name} diagnostic JSON must be deterministic.`,
    )
  }
  verify?.()
}

function coverageGroups(groups) {
  return Object.freeze(groups.map((group) => Object.freeze(group)))
}

export const requiredRecipeConformanceCoverage = Object.freeze({
  configurationFailures: coverageGroups([
    ['configuration.protocol-identifier'],
    ['configuration.protocol-version'],
    ['configuration.host-name'],
    ['configuration.host-name-grammar'],
    ['configuration.recipe-namespace'],
    ['configuration.recipe-name-grammar'],
    ['configuration.active-version'],
    ['configuration.exact-duplicate'],
    ['configuration.duplicate-binding'],
    ['configuration.catalog'],
    ['configuration.limits'],
  ]),
  compilerLifecycles: coverageGroups([
    [
      'snapshot.metadata',
      'snapshot.functions',
      'snapshot.collections',
      'snapshot.active-map',
    ],
    ['routing.unknown-selector'],
    ['routing.active-inactive'],
  ]),
  reviewedCandidates: coverageGroups([['reviewed.exact']]),
  corrections: coverageGroups([['corrections.all-kinds']]),
  failures: coverageGroups([
    ['failure.compile-throw'],
    ['failure.compile-promise'],
    ['failure.compile-null'],
    ['failure.compile-malformed'],
    ['failure.compile-invalid-diagnostic'],
    ['failure.unknown-field'],
    ['failure.unsafe-range'],
    ['failure.unresolved-reference'],
    ['failure.over-limit'],
    ['failure.validate-throw'],
    ['failure.validate-promise'],
    ['failure.validate-null'],
    ['failure.validate-malformed'],
    ['failure.validate-invalid-diagnostic'],
    ['failure.validate-rejection'],
  ]),
})

function assertExactFixtureCoverage(definition, exactCases) {
  const declared = new Set()
  for (const recipe of definition.recipes) {
    for (const locale of Object.keys(recipe.catalog.messages)) {
      declared.add(`${recipe.ref.name}\0${recipe.ref.version}\0${locale}`)
    }
  }

  const covered = new Set()
  for (const caseValue of exactCases) {
    assert.equal(caseValue.expected?.ok, true, `${caseValue.name} must be an exact successful plan.`)
    const {localization, recipe} = caseValue.expected.plan
    const key = `${recipe.name}\0${recipe.version}\0${localization.locale}`
    assert.ok(
      declared.has(key),
      `${caseValue.name} covers an undeclared recipe/version/locale.`,
    )
    assert.ok(!covered.has(key), `${caseValue.name} duplicates an exact fixture matrix entry.`)
    covered.add(key)
  }

  assert.deepStrictEqual(
    [...covered].sort(),
    [...declared].sort(),
    'The exact full-plan fixture matrix must cover every declared recipe/version/locale once.',
  )
}

export function validateRecipeConformanceCaseSet({definition, cases}) {
  assert.ok(definition && typeof definition === 'object', 'A packed definition is required.')
  assert.ok(cases && typeof cases === 'object', 'The conformance case set must be an object.')
  assert.equal(
    cases.peerDependency?.name,
    'mdx-handwritten-scene',
    'The conformance peer dependency must be mdx-handwritten-scene.',
  )

  const requiredCategories = [
    'plans',
    'reviewedCandidates',
    'corrections',
    'failures',
    'configurationFailures',
    'compilerLifecycles',
  ]
  for (const category of requiredCategories) {
    assert.ok(
      Array.isArray(cases[category]) && cases[category].length > 0,
      `The ${category} conformance category must not be empty.`,
    )
  }

  const globalNames = new Set()
  const globalObjects = new Set()
  for (const category of requiredCategories) {
    const categoryNames = new Set()
    for (const caseValue of cases[category]) {
      assert.ok(
        caseValue && typeof caseValue === 'object',
        `Every ${category} case must be an object.`,
      )
      assert.ok(
        typeof caseValue.name === 'string' && caseValue.name.trim().length > 0,
        `Every ${category} case must have a non-empty name.`,
      )
      assert.ok(
        !categoryNames.has(caseValue.name),
        `The ${category} case name ${caseValue.name} is duplicated.`,
      )
      assert.ok(
        !globalNames.has(caseValue.name),
        `The conformance case name ${caseValue.name} is duplicated globally.`,
      )
      assert.ok(
        !globalObjects.has(caseValue),
        `The conformance case object ${caseValue.name} is reused.`,
      )
      categoryNames.add(caseValue.name)
      globalNames.add(caseValue.name)
      globalObjects.add(caseValue)
      assert.equal(
        Object.hasOwn(caseValue, 'packageDefinition'),
        false,
        `${caseValue.name} must not replace the imported packed definition.`,
      )
    }
  }

  assertExactFixtureCoverage(definition, cases.plans)

  for (const [category, requiredGroups] of Object.entries(
    requiredRecipeConformanceCoverage,
  )) {
    const counts = new Map(
      requiredGroups.map((group) => [JSON.stringify(group), 0]),
    )
    for (const caseValue of cases[category]) {
      assert.ok(
        Array.isArray(caseValue.covers) && caseValue.covers.length > 0,
        `The ${category} case ${caseValue.name} must cover at least one capability.`,
      )
      const groupKey = JSON.stringify(caseValue.covers)
      assert.ok(
        counts.has(groupKey),
        `The ${category} case ${caseValue.name} must use an exact runner-owned coverage group.`,
      )
      counts.set(groupKey, counts.get(groupKey) + 1)
    }
    for (const [groupKey, count] of counts) {
      assert.equal(
        count,
        1,
        `The ${category} coverage group ${groupKey} must be used exactly once.`,
      )
    }
  }

  for (const caseValue of cases.configurationFailures) {
    assert.equal(
      Object.hasOwn(caseValue, 'createBindings'),
      false,
      `${caseValue.name} must use the runner-owned configuration probe.`,
    )
    assert.ok(
      typeof caseValue.expected?.code === 'string' && Array.isArray(caseValue.expected.path),
      `${caseValue.name} must provide an expected configuration code and path.`,
    )
  }
  for (const caseValue of cases.compilerLifecycles) {
    assert.equal(
      Object.hasOwn(caseValue, 'prepare'),
      false,
      `${caseValue.name} must use the runner-owned lifecycle probe.`,
    )
    validatePreparedCompilerLifecycle(caseValue, {
      observe: () => ({}),
      steps: caseValue.steps,
    })
  }
  for (const caseValue of cases.corrections) {
    assert.deepStrictEqual(
      [...new Set(caseValue.input?.corrections?.map(({kind}) => kind))].sort(),
      ['label', 'relationship', 'target'],
      `${caseValue.name} must exercise all three correction kinds.`,
    )
  }
}

export function validatePackedScenePeerCompatibility({
  cases,
  packageJson,
  scenePackageJson,
}) {
  assert.equal(
    scenePackageJson?.name,
    'mdx-handwritten-scene',
    'The packed peer must be mdx-handwritten-scene.',
  )
  assert.equal(
    cases?.peerDependency?.name,
    'mdx-handwritten-scene',
    'The conformance peer dependency must be mdx-handwritten-scene.',
  )

  const range = cases.peerDependency.range
  assert.ok(
    typeof range === 'string' && range.trim().length > 0 && semver.validRange(range) !== null,
    'The mdx-handwritten-scene peer dependency must be a valid non-empty SemVer range.',
  )
  assert.ok(
    semver.valid(scenePackageJson.version) !== null,
    'The packed mdx-handwritten-scene version must be valid SemVer.',
  )
  assert.ok(
    semver.satisfies(scenePackageJson.version, range),
    `Packed mdx-handwritten-scene@${scenePackageJson.version} does not satisfy ${range}.`,
  )
  assert.equal(
    packageJson.peerDependencies?.['mdx-handwritten-scene'],
    range,
    'The tested Scene Module peer dependency must match exactly.',
  )
}

function assertConfigurationFailureCase({
  case_: caseValue,
  definition,
  packageName,
  sceneRecipes,
}) {
  const [capability] = caseValue.covers
  const recipe = definition.recipes[0]
  const recipeName = recipe.ref.name
  let recipePackages
  switch (capability) {
    case 'configuration.protocol-identifier':
      recipePackages = [{
        packageName,
        definition: {...definition, protocol: 'mdx-handwritten/unsupported'},
      }]
      break
    case 'configuration.protocol-version':
      recipePackages = [{packageName, definition: {...definition, protocolVersion: 2}}]
      break
    case 'configuration.host-name':
      recipePackages = [{packageName: '@runner-owned/mismatch', definition}]
      break
    case 'configuration.host-name-grammar': {
      const invalidPackageName = '@Invalid/recipes'
      recipePackages = [{
        packageName: invalidPackageName,
        definition: {...definition, packageName: invalidPackageName},
      }]
      break
    }
    case 'configuration.recipe-namespace': {
      const invalidName = '@runner-owned/other/recipe'
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          recipes: [{...recipe, ref: {...recipe.ref, name: invalidName}}],
          activeVersions: {[invalidName]: recipe.ref.version},
        },
      }]
      break
    }
    case 'configuration.recipe-name-grammar': {
      const invalidName = `${packageName}/Invalid`
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          recipes: [{...recipe, ref: {...recipe.ref, name: invalidName}}],
          activeVersions: {[invalidName]: recipe.ref.version},
        },
      }]
      break
    }
    case 'configuration.active-version':
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          activeVersions: {...definition.activeVersions, [recipeName]: recipe.ref.version + 1},
        },
      }]
      break
    case 'configuration.exact-duplicate':
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          recipes: [recipe, {...recipe, ref: {...recipe.ref}}, ...definition.recipes.slice(1)],
        },
      }]
      break
    case 'configuration.duplicate-binding': {
      const binding = {packageName, definition}
      recipePackages = [binding, binding]
      break
    }
    case 'configuration.catalog':
      {
        const messages = Object.fromEntries(
          Object.entries(recipe.catalog.messages).map(([locale, value]) => [locale, {...value}]),
        )
        const locales = Object.keys(messages)
        const incompleteLocale = locales[1] ?? 'x-runner'
        const completeMessages = messages[locales[0]]
        const [omittedKey] = Object.keys(completeMessages)
        messages[incompleteLocale] = Object.fromEntries(
          Object.entries(completeMessages).filter(([key]) => key !== omittedKey),
        )
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          recipes: [{
            ...recipe,
            catalog: {
              ...recipe.catalog,
              messages,
            },
          }, ...definition.recipes.slice(1)],
        },
      }]
      break
      }
    case 'configuration.limits':
      recipePackages = [{
        packageName,
        definition: {
          ...definition,
          recipes: [{
            ...recipe,
            limits: {...recipe.limits, sourceCodeUnits: Number.MAX_SAFE_INTEGER},
          }, ...definition.recipes.slice(1)],
        },
      }]
      break
    default:
      assert.fail(`No runner-owned configuration probe exists for ${capability}.`)
  }
  let error
  try {
    sceneRecipes.createSceneCompiler({recipePackages})
  } catch (value) {
    error = value
  }

  assert.ok(error, `${caseValue.name} must fail compiler construction.`)
  assert.ok(
    error instanceof sceneRecipes.SceneCompilerConfigurationError,
    `${caseValue.name} must throw SceneCompilerConfigurationError.`,
  )
  assert.deepStrictEqual(
    {name: error.name, code: error.code, path: error.path},
    {
      name: 'SceneCompilerConfigurationError',
      code: caseValue.expected.code,
      path: caseValue.expected.path,
    },
    `${caseValue.name} must expose the exact typed code and path.`,
  )
  assert.equal(Object.isFrozen(error.path), true, `${caseValue.name} path must be frozen.`)
}

export function validatePreparedCompilerLifecycle(caseValue, prepared) {
  assert.ok(
    prepared && typeof prepared === 'object',
    `${caseValue.name} prepare must return an object.`,
  )
  assert.ok(
    Array.isArray(prepared.steps) && prepared.steps.length > 0,
    `${caseValue.name} must prepare at least one lifecycle step.`,
  )
  assert.equal(
    typeof prepared.observe,
    'function',
    `${caseValue.name} must prepare an observe callback.`,
  )
  assert.ok(
    prepared.afterCompilerCreated === undefined ||
      typeof prepared.afterCompilerCreated === 'function',
    `${caseValue.name} afterCompilerCreated must be a function when present.`,
  )
  assert.ok(
    prepared.packageDefinition === undefined ||
      (prepared.packageDefinition !== null && typeof prepared.packageDefinition === 'object'),
    `${caseValue.name} packageDefinition must be an object when present.`,
  )

  const names = new Set()
  const objects = new Set()
  for (const step of prepared.steps) {
    assert.ok(step && typeof step === 'object', `${caseValue.name} lifecycle steps must be objects.`)
    assert.ok(
      typeof step.name === 'string' && step.name.trim().length > 0,
      `${caseValue.name} lifecycle steps must have non-empty names.`,
    )
    assert.ok(!names.has(step.name), `${caseValue.name} lifecycle step ${step.name} is duplicated.`)
    assert.ok(!objects.has(step), `${caseValue.name} reuses a lifecycle step object.`)
    assert.ok(
      step.input && typeof step.input === 'object',
      `${caseValue.name}/${step.name} must provide an input object.`,
    )
    assert.ok(
      step.expected && typeof step.expected === 'object',
      `${caseValue.name}/${step.name} must provide an expected result object.`,
    )
    assert.ok(
      Object.hasOwn(step, 'expectedObservation') &&
        step.expectedObservation !== null &&
        typeof step.expectedObservation === 'object' &&
        !Array.isArray(step.expectedObservation),
      `${caseValue.name}/${step.name} must provide an expectedObservation object.`,
    )
    names.add(step.name)
    objects.add(step)
  }
}

function prepareRunnerCompilerLifecycle(caseValue, definition) {
  const group = JSON.stringify(caseValue.covers)
  const baseRecipe = definition.recipes[0]
  const recipeName = baseRecipe.ref.name
  const capturedCompile = baseRecipe.compile
  const capturedValidate = baseRecipe.validate

  if (group === JSON.stringify(requiredRecipeConformanceCoverage.compilerLifecycles[0])) {
    const observations = {
      capturedCompile: 0,
      capturedValidate: 0,
      mutatedCompile: 0,
      mutatedValidate: 0,
    }
    const recipe = {
      ...baseRecipe,
      ref: {...baseRecipe.ref},
      roles: [...baseRecipe.roles],
      correctionSlots: Object.fromEntries(
        Object.entries(baseRecipe.correctionSlots).map(([key, value]) => [key, [...value]]),
      ),
      catalog: {
        ...baseRecipe.catalog,
        messages: Object.fromEntries(
          Object.entries(baseRecipe.catalog.messages).map(([key, value]) => [key, {...value}]),
        ),
      },
      limits: {...baseRecipe.limits},
      compile: context => {
        observations.capturedCompile += 1
        return capturedCompile(context)
      },
      validate: context => {
        observations.capturedValidate += 1
        return capturedValidate(context)
      },
    }
    const recipes = [recipe, ...definition.recipes.slice(1)]
    const activeVersions = {...definition.activeVersions}
    const packageDefinition = {...definition, recipes, activeVersions}
    return {
      packageDefinition,
      afterCompilerCreated() {
        packageDefinition.packageName = '@runner-owned/mutated'
        recipe.ref.name = '@runner-owned/mutated/recipe'
        recipe.roles.splice(0, recipe.roles.length, 'mutated')
        for (const slots of Object.values(recipe.correctionSlots)) slots.splice(0)
        recipe.catalog.id = 'runner-owned.mutated'
        const [locale] = Object.keys(recipe.catalog.messages)
        recipe.catalog.messages[locale].title = 'Runner-owned mutation'
        recipe.limits.sourceCodeUnits = 1
        recipes.splice(0)
        activeVersions[recipeName] = 99
        recipe.compile = () => {
          observations.mutatedCompile += 1
          throw new Error('mutated compile must not run')
        }
        recipe.validate = () => {
          observations.mutatedValidate += 1
          throw new Error('mutated validate must not run')
        }
      },
      observe: () => ({...observations}),
      steps: caseValue.steps,
    }
  }

  if (group === JSON.stringify(['routing.unknown-selector'])) {
    const observations = {compile: 0, validate: 0}
    return {
      packageDefinition: withRecipe(definition, 0, {
        ...baseRecipe,
        compile(context) {
          observations.compile += 1
          return capturedCompile(context)
        },
        validate(context) {
          observations.validate += 1
          return capturedValidate(context)
        },
      }),
      observe: () => ({...observations}),
      steps: caseValue.steps,
    }
  }

  if (group === JSON.stringify(['routing.active-inactive'])) {
    const observations = {v1Compile: 0, v1Validate: 0, v2Compile: 0, v2Validate: 0}
    const versionOne = {
      ...baseRecipe,
      compile(context) {
        observations.v1Compile += 1
        return capturedCompile(context)
      },
      validate(context) {
        observations.v1Validate += 1
        return capturedValidate(context)
      },
    }
    const versionTwo = {
      ...baseRecipe,
      ref: {...baseRecipe.ref, version: baseRecipe.ref.version + 1},
      catalog: {...baseRecipe.catalog, version: baseRecipe.catalog.version + 1},
      compile(context) {
        observations.v2Compile += 1
        return capturedCompile(context)
      },
      validate(context) {
        observations.v2Validate += 1
        return capturedValidate(context)
      },
    }
    return {
      packageDefinition: {
        ...definition,
        recipes: [versionOne, versionTwo, ...definition.recipes.slice(1)],
        activeVersions: {
          ...definition.activeVersions,
          [recipeName]: versionTwo.ref.version,
        },
      },
      observe: () => ({...observations}),
      steps: caseValue.steps,
    }
  }

  assert.fail(`No runner-owned lifecycle probe exists for ${group}.`)
}

async function assertCompilerLifecycleCase({
  case_: caseValue,
  createSceneCompiler,
  definition,
  packageName,
}) {
  const prepared = prepareRunnerCompilerLifecycle(caseValue, definition)
  validatePreparedCompilerLifecycle(caseValue, prepared)
  const compiler = compilerFor(
    createSceneCompiler,
    prepared.packageDefinition ?? definition,
    packageName,
  )
  await prepared.afterCompilerCreated?.()

  for (const step of prepared.steps) {
    const result = compiler.createScenePlan(step.input)
    assert.deepStrictEqual(result, step.expected, `${caseValue.name}/${step.name} must match exactly.`)
    assertJsonRoundTrip(result, `${caseValue.name}/${step.name}`)
    if (Object.hasOwn(step, 'expectedObservation')) {
      assert.deepStrictEqual(
        prepared.observe(),
        step.expectedObservation,
        `${caseValue.name}/${step.name} must have the expected callback observations.`,
      )
    }
  }
}

function renderedElements(node, predicate, result = []) {
  if (Array.isArray(node)) {
    for (const child of node) renderedElements(child, predicate, result)
  } else if (node && typeof node === 'object' && node.props && typeof node.props === 'object') {
    if (predicate(node)) result.push(node)
    renderedElements(node.props.children, predicate, result)
  }
  return result
}

function renderedText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node && typeof node === 'object' ? renderedText(node.props?.children) : ''
}

function readerMeaningFromPlan(plan) {
  return [plan.title, plan.source.text, ...plan.relationships.map(({legendText}) => legendText)]
}

function readerMeaningFromTree(tree) {
  const [caption] = renderedElements(tree, ({props}) => Object.hasOwn(props, 'data-hw-scene-caption'))
  const [source] = renderedElements(tree, ({type}) => type === 'pre')
  const [legend] = renderedElements(tree, ({type}) => type === 'ol')
  assert.ok(caption && source && legend, 'Materialized output must retain caption, source, and legend.')
  return [
    renderedText(caption).trim(),
    renderedText(source),
    ...renderedElements(legend, ({type}) => type === 'li').map((item) => renderedText(item).trim()),
  ]
}

function sceneDirective({candidateJson, expected, input}, binding) {
  const plan = expected.plan
  const source = input.source ?? JSON.parse(candidateJson).source.text
  const planAttribute = binding === undefined ? '' : ` plan="${binding}"`
  return `:::hw-scene{recipe="${plan.recipe.name}"${planAttribute}}\n${source}\n:::`
}

async function runPackedAdapterProbes({
  cases,
  consumerDirectory,
  definition,
  installedRecipeDirectory,
  installedReactDirectory,
  installedRemarkDirectory,
  installedSceneDirectory,
  sceneRecipes,
}) {
  const adapterLoaderPath = resolve(consumerDirectory, 'adapter-loader.mjs')
  writeFileSync(adapterLoaderPath, [
    "export {compile, evaluate} from '@mdx-js/mdx'",
    "export {default as remarkDirective} from 'remark-directive'",
    "export {default as remarkMdxHandwritten} from 'remark-mdx-handwritten'",
    "export {Fragment, createElement} from 'react'",
    "export {jsx, jsxs} from 'react/jsx-runtime'",
    "export {renderToStaticMarkup} from 'react-dom/server'",
    "export {HandScene} from 'mdx-handwritten-react'",
    "export const remarkUrl = import.meta.resolve('remark-mdx-handwritten')",
    "export const reactUrl = import.meta.resolve('mdx-handwritten-react')",
    "export const sceneRecipesUrl = import.meta.resolve('mdx-handwritten-scene/recipes')",
    '',
  ].join('\n'))
  const adapters = await import(pathToFileURL(adapterLoaderPath).href)
  for (const [url, directory, name] of [
    [adapters.remarkUrl, installedRemarkDirectory, 'remark-mdx-handwritten'],
    [adapters.reactUrl, installedReactDirectory, 'mdx-handwritten-react'],
    [adapters.sceneRecipesUrl, installedSceneDirectory, 'mdx-handwritten-scene/recipes'],
  ]) {
    const resolvedEntry = realpathSync(fileURLToPath(url))
    const packageRoot = realpathSync(directory)
    assert.ok(
      resolvedEntry.startsWith(`${packageRoot}/`),
      `The integration probe must import the installed packed ${name} artifact.`,
    )
  }

  const sceneCompiler = sceneRecipes.createSceneCompiler({
    recipePackages: [{packageName: definition.packageName, definition}],
  })
  const exactCase = cases.plans[0]
  const reviewedCase = cases.reviewedCandidates[0]
  const reviewedPlan = reviewedCase.expected.plan
  const compilerResult = sceneCompiler.createScenePlan(exactCase.input)
  assert.deepStrictEqual(
    compilerResult,
    exactCase.expected,
    'The packed adapter probe must materialize the exact deterministic plan.',
  )

  const compileMdx = (source, options = {}) => adapters.compile(
    {value: source, path: resolve(consumerDirectory, 'packed-probe.mdx')},
    {remarkPlugins: [adapters.remarkDirective, [adapters.remarkMdxHandwritten, options]]},
  )
  const evaluateMdx = (source, options = {}) => adapters.evaluate(
    {value: source, path: resolve(consumerDirectory, 'packed-probe.mdx')},
    {
      Fragment: adapters.Fragment,
      jsx: adapters.jsx,
      jsxs: adapters.jsxs,
      remarkPlugins: [adapters.remarkDirective, [adapters.remarkMdxHandwritten, options]],
    },
  )
  const thirdPartyScene = sceneDirective(exactCase)
  const builtInSource = '[ ] RUNNER-001 Verify packed integration'
  const mixedSource = [
    ':::hw-scene{recipe="task-explainer"}',
    builtInSource,
    ':::',
    '',
    thirdPartyScene,
  ].join('\n')
  const mixedCompiled = await compileMdx(mixedSource, {
    imports: {mode: 'auto', source: 'mdx-handwritten-react'},
    sceneCompiler,
  })
  const mixed = String(mixedCompiled)
  assert.match(mixed, /task-explainer/u, 'Mixed remark output must include the built-in Scene.')
  assert.match(
    mixed,
    new RegExp(definition.packageName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'),
    'Mixed remark output must include the packed third-party Scene.',
  )
  const browserEntryPath = resolve(consumerDirectory, 'packed-mixed-generated.mjs')
  writeFileSync(browserEntryPath, mixed)

  const builtInResult = sceneCompiler.createScenePlan({
    recipe: 'task-explainer',
    source: builtInSource,
  })
  assert.equal(builtInResult.ok, true, 'The configured compiler must materialize the built-in Scene.')
  const mixedModule = await import(pathToFileURL(browserEntryPath).href)
  const mixedTree = mixedModule.default({})
  const mixedScenes = renderedElements(
    mixedTree,
    ({type}) => type === adapters.HandScene,
  )
  assert.deepStrictEqual(
    mixedScenes.map(({props}) => props),
    [{plan: builtInResult.plan}, {plan: compilerResult.plan}],
    'Mixed component output must transport the exact built-in and packed third-party plans.',
  )

  const unknownScene = ':::hw-scene{recipe="@runner-owned/missing"}\nunknown source\n:::'
  await assert.rejects(
    () => compileMdx(unknownScene, {sceneCompiler}),
    (error) => error?.ruleId === 'scene-recipe-unknown',
    'Strict remark policy must reject an unknown selector.',
  )
  const warned = await compileMdx(unknownScene, {diagnostics: 'warn', sceneCompiler})
  assert.ok(
    warned.messages.some(({ruleId}) => ruleId === 'scene-recipe-unknown'),
    'Warning remark policy must preserve the diagnostic.',
  )
  assert.match(String(warned), /unknown source/u, 'Warning output must preserve readable source.')

  const binding = 'rp1_01k5x7t3v0n8s6dym4q2w9c5hc'
  const reviewedDirectory = resolve(consumerDirectory, '.mdx-handwritten', 'plans')
  mkdirSync(reviewedDirectory, {recursive: true})
  writeFileSync(resolve(reviewedDirectory, `${binding}.json`), JSON.stringify(reviewedPlan))
  const reviewedScene = sceneDirective(reviewedCase, binding)
  const options = (output) => ({
    output,
    reviewedPlans: {projectRoot: consumerDirectory},
    sceneCompiler,
  })
  const [componentModule, elementModule, stripModule] = await Promise.all([
    evaluateMdx(reviewedScene, options('component')),
    evaluateMdx(reviewedScene, options('element')),
    evaluateMdx(reviewedScene, options('strip')),
  ])
  const ProbeHandScene = () => null
  const componentTree = componentModule.default({components: {HandScene: ProbeHandScene}})
  const [component] = renderedElements(componentTree, ({type}) => type === ProbeHandScene)
  assert.deepStrictEqual(component?.props, {plan: reviewedPlan}, 'Component output must receive only the reviewed plan.')
  const expectedMeaning = readerMeaningFromPlan(reviewedPlan)
  assert.deepStrictEqual(readerMeaningFromTree(elementModule.default({})), expectedMeaning)
  assert.deepStrictEqual(readerMeaningFromTree(stripModule.default({})), expectedMeaning)

  const ssrHtml = adapters.renderToStaticMarkup(
    adapters.createElement(adapters.HandScene, {plan: reviewedPlan}),
  )
  const ssrText = ssrHtml
    .replace(/<[^>]+>/gu, '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
  for (const meaning of expectedMeaning) {
    assert.ok(
      ssrText.includes(meaning),
      `SSR must preserve plan meaning: ${JSON.stringify(meaning)}.`,
    )
  }
  assert.ok(!ssrHtml.includes('<script'), 'SSR output must remain script-free.')

  const rscProbePath = resolve(consumerDirectory, 'rsc-probe.mjs')
  writeFileSync(rscProbePath, [
    "import {HandScene} from 'mdx-handwritten-react'",
    `const plan = ${JSON.stringify(reviewedPlan)}`,
    'function text(value) {',
    "  if (typeof value === 'string' || typeof value === 'number') return String(value)",
    '  if (Array.isArray(value)) return value.map(text).join(\'\')',
    "  if (!value || typeof value !== 'object') return ''",
    '  if (typeof value.type === \'function\') return text(value.type(value.props))',
    '  return text(value.props?.children)',
    '}',
    'const before = JSON.stringify(plan)',
    'const rendered = text(HandScene({plan}))',
    'console.log(JSON.stringify({before, after: JSON.stringify(plan), rendered}))',
    '',
  ].join('\n'))
  const rsc = run(process.execPath, ['--conditions=react-server', rscProbePath], {
    cwd: consumerDirectory,
  })
  const rscResult = JSON.parse(rsc.stdout)
  assert.equal(rscResult.after, rscResult.before, 'RSC must not mutate the materialized plan.')
  for (const meaning of expectedMeaning) assert.ok(rscResult.rendered.includes(meaning), 'RSC must preserve plan meaning.')

  const browserBundle = await build({
    absWorkingDir: consumerDirectory,
    bundle: true,
    entryPoints: [browserEntryPath],
    format: 'esm',
    metafile: true,
    platform: 'browser',
    write: false,
  })
  const recipeRoot = realpathSync(installedRecipeDirectory)
  const sceneRecipesEntry = realpathSync(fileURLToPath(adapters.sceneRecipesUrl))
  for (const input of Object.keys(browserBundle.metafile.inputs)) {
    const inputPath = resolve(consumerDirectory, input)
    if (existsSync(inputPath)) {
      const realInput = realpathSync(inputPath)
      assert.ok(
        realInput !== recipeRoot && !realInput.startsWith(`${recipeRoot}/`),
        'The browser bundle must exclude the packed Recipe implementation.',
      )
      assert.notEqual(
        realInput,
        sceneRecipesEntry,
        'The browser bundle must exclude the Scene /recipes implementation.',
      )
    }
  }
  const browserText = browserBundle.outputFiles.map(({text}) => text).join('\n')
  assert.ok(
    !browserText.includes('MDX_HANDWRITTEN_PACKED_RECIPE_COMPILE_SENTINEL_v1'),
    'The browser bundle must not contain Recipe implementation bytes.',
  )
}

/**
 * Packs, extracts, imports, and exercises a Recipe package exactly as a consumer receives it.
 * Pass `cases` to keep conformance data outside the package, or expose it from the packed
 * artifact as `./conformance` (or another `conformanceExport`).
 */
export async function runRecipePackageConformance({
  additionalPackageDirectories = [],
  packageDirectory,
  cases,
  conformanceExport = './conformance',
  definitionExport = 'default',
  moduleExportAssertions = [],
  reactPackageDirectory,
  remarkPackageDirectory,
  scenePackageDirectory,
} = {}) {
  if (typeof packageDirectory !== 'string' || packageDirectory.length === 0) {
    throw new TypeError('packageDirectory is required.')
  }
  if (typeof definitionExport !== 'string' || definitionExport.length === 0) {
    throw new TypeError('definitionExport must be a non-empty export name.')
  }
  if (!Array.isArray(additionalPackageDirectories)) {
    throw new TypeError('additionalPackageDirectories must be an array.')
  }
  if (!Array.isArray(moduleExportAssertions)) {
    throw new TypeError('moduleExportAssertions must be an array.')
  }

  const sourceDirectory = resolve(packageDirectory)
  const sceneSourceDirectory = scenePackageDirectory
    ? resolve(scenePackageDirectory)
    : findInstalledPackage(sourceDirectory, 'mdx-handwritten-scene')
  const remarkSourceDirectory = remarkPackageDirectory
    ? resolve(remarkPackageDirectory)
    : findInstalledPackage(sceneSourceDirectory, 'remark-mdx-handwritten')
  const reactSourceDirectory = reactPackageDirectory
    ? resolve(reactPackageDirectory)
    : findInstalledPackage(sceneSourceDirectory, 'mdx-handwritten-react')
  const adapterRuntimeDirectories = [
    '@mdx-js/mdx',
    'remark-directive',
    'react',
    'react-dom',
  ].map((packageName) => findInstalledPackage(sceneSourceDirectory, packageName))
  const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'mdx-handwritten-recipe-conformance-'))
  try {
    const pack = packDirectory(sourceDirectory, temporaryDirectory, 'the Recipe package')
    const scenePack = packDirectory(
      sceneSourceDirectory,
      temporaryDirectory,
      'mdx-handwritten-scene',
    )
    const remarkPack = packDirectory(
      remarkSourceDirectory,
      temporaryDirectory,
      'remark-mdx-handwritten',
    )
    const reactPack = packDirectory(
      reactSourceDirectory,
      temporaryDirectory,
      'mdx-handwritten-react',
    )
    const additionalPacks = additionalPackageDirectories.map((directory, index) =>
      packDirectory(
        resolve(directory),
        temporaryDirectory,
        `additional package ${index + 1}`,
      ),
    )

    const consumerDirectory = resolve(temporaryDirectory, 'consumer')
    mkdirSync(consumerDirectory)
    installConsumerPackages(
      consumerDirectory,
      [
        ...[pack, scenePack, remarkPack, reactPack, ...additionalPacks].map(({filename}) =>
          resolve(temporaryDirectory, filename),
        ),
        ...adapterRuntimeDirectories,
      ],
    )
    const installedRecipeDirectory = installedPackageDirectory(consumerDirectory, pack.name)
    const packageJson = JSON.parse(readFileSync(resolve(
      installedRecipeDirectory,
      'package.json',
    ), 'utf8'))
    const scenePackageJson = JSON.parse(readFileSync(resolve(
      installedPackageDirectory(consumerDirectory, 'mdx-handwritten-scene'),
      'package.json',
    ), 'utf8'))
    assert.equal(
      scenePackageJson.name,
      'mdx-handwritten-scene',
      'The packed peer must be mdx-handwritten-scene.',
    )
    const loader = await createConsumerLoader({
      consumerDirectory,
      conformanceSpecifier: packageExportSpecifier(packageJson.name, conformanceExport),
      includeConformance: cases === undefined,
      packageName: packageJson.name,
    })
    assertResolvedRecipeEntryIsEsm(loader.recipeModuleUrl, installedRecipeDirectory)
    const sceneRecipes = loader.sceneRecipes
    const imported = loader.recipeModule
    const definition = imported[definitionExport]
    const caseSet = cases ?? loader.conformanceModule.recipeConformanceCases

    for (const assertion of moduleExportAssertions) {
      assert.deepStrictEqual(
        imported[assertion.name],
        assertion.expected,
        `The packed definition export ${assertion.name} did not match.`,
      )
    }

    validateRecipeConformanceCaseSet({definition, cases: caseSet})
    validatePackedScenePeerCompatibility({cases: caseSet, packageJson, scenePackageJson})
    assert.equal(packageJson.name, definition?.packageName, 'package.json and definition names must match.')
    assert.equal(packageJson.name, caseSet.packageName, 'The case set must name the packed package.')
    assert.deepStrictEqual(
      pack.files.map(({path}) => path).sort(),
      [...caseSet.expectedFiles].sort(),
      'The npm tarball file set must match the reviewed fixture.',
    )
    assert.equal(
      definition?.protocol,
      sceneRecipes.annotationRecipePackageProtocolV1,
      'The selected packed definition export must use the V1 Recipe package protocol.',
    )

    const successfulCases = [
      ...(caseSet.plans ?? []),
      ...(caseSet.reviewedCandidates ?? []),
      ...(caseSet.corrections ?? []),
    ]
    for (const caseValue of caseSet.configurationFailures ?? []) {
      assertConfigurationFailureCase({
        case_: caseValue,
        definition,
        packageName: packageJson.name,
        sceneRecipes,
      })
    }
    for (const caseValue of successfulCases) {
      assertSuccessfulCase({
        case_: caseValue,
        createSceneCompiler: sceneRecipes.createSceneCompiler,
        definition,
        packageName: packageJson.name,
      })
    }
    for (const caseValue of caseSet.failures ?? []) {
      assertFailureCase({
        case_: caseValue,
        createSceneCompiler: sceneRecipes.createSceneCompiler,
        definition,
        packageName: packageJson.name,
      })
    }
    for (const caseValue of caseSet.compilerLifecycles ?? []) {
      await assertCompilerLifecycleCase({
        case_: caseValue,
        createSceneCompiler: sceneRecipes.createSceneCompiler,
        definition,
        packageName: packageJson.name,
      })
    }
    await runPackedAdapterProbes({
      cases: caseSet,
      consumerDirectory,
      definition,
      installedRecipeDirectory,
      installedReactDirectory: installedPackageDirectory(
        consumerDirectory,
        'mdx-handwritten-react',
      ),
      installedRemarkDirectory: installedPackageDirectory(
        consumerDirectory,
        'remark-mdx-handwritten',
      ),
      installedSceneDirectory: installedPackageDirectory(
        consumerDirectory,
        'mdx-handwritten-scene',
      ),
      sceneRecipes,
    })

    return {
      checks: {
        adapterIntegrations: 1,
        compilerLifecycles: caseSet.compilerLifecycles?.length ?? 0,
        configurationFailures: caseSet.configurationFailures?.length ?? 0,
        corrections: caseSet.corrections?.length ?? 0,
        failures: caseSet.failures?.length ?? 0,
        plans: caseSet.plans?.length ?? 0,
        reviewedCandidates: caseSet.reviewedCandidates?.length ?? 0,
      },
      files: pack.files.map(({path}) => path),
      packageName: packageJson.name,
      peerDependency: caseSet.peerDependency,
      scenePackage: {
        files: scenePack.files.map(({path}) => path),
        name: scenePackageJson.name,
        size: scenePack.size,
        version: scenePackageJson.version,
      },
      additionalPackages: additionalPacks.map((additionalPack) => ({
        files: additionalPack.files.map(({path}) => path),
        name: additionalPack.name,
        size: additionalPack.size,
        version: additionalPack.version,
      })),
      size: pack.size,
    }
  } finally {
    rmSync(temporaryDirectory, {force: true, recursive: true})
  }
}
