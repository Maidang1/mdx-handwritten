import {spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {readFileSync, statSync} from 'node:fs'
import {basename, dirname, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {build, version as esbuildVersion} from 'esbuild'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
export const projectRoot = resolve(scriptDirectory, '../..')
const requireFromProject = createRequire(resolve(projectRoot, 'package.json'))

export function loadBudgetManifest() {
  return JSON.parse(readFileSync(resolve(projectRoot, 'budgets.json'), 'utf8'))
}

export function gzipSize(bytes) {
  const result = spawnSync('gzip', ['-9', '-n', '-c'], {
    input: bytes,
    maxBuffer: 10 * 1024 * 1024,
  })

  if (result.error) {
    throw new Error(`Unable to run the canonical gzip command: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`The canonical gzip command failed: ${result.stderr.toString().trim()}`)
  }
  return result.stdout.byteLength
}

function readArtifact(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath))
}

function measureBytes(relativePath) {
  const bytes = readArtifact(relativePath)
  return {gzipBytes: gzipSize(bytes), rawBytes: bytes.byteLength}
}

async function measureConsumer(fixture) {
  const consumer = loadBudgetManifest().measurement.consumerBundle
  const result = await build({
    absWorkingDir: projectRoot,
    bundle: consumer.bundle,
    charset: consumer.charset,
    entryPoints: [resolve(scriptDirectory, 'fixtures', fixture)],
    external: consumer.external,
    format: consumer.format,
    legalComments: consumer.legalComments,
    metafile: true,
    minify: consumer.minify,
    platform: consumer.platform,
    treeShaking: consumer.treeShaking,
    write: false,
  })

  const output = result.outputFiles[0]
  const metadata = Object.values(result.metafile.outputs)[0]
  if (!output || !metadata) throw new Error(`esbuild produced no output for ${fixture}.`)

  const sceneBytes = Object.entries(metadata.inputs)
    .filter(([input]) => input.includes('packages/scene/dist/'))
    .reduce((total, [, value]) => total + value.bytesInOutput, 0)

  return {
    exports: metadata.exports,
    gzipBytes: gzipSize(output.contents),
    rawBytes: output.contents.byteLength,
    sceneBytes,
  }
}

function measureTheme() {
  const themePath = resolve(projectRoot, 'packages/theme/styles.css')
  const themeCss = readFileSync(themePath, 'utf8')
  const importMatch = /^@import\s+["']([^"']+)["'];[^\S\r\n]*/u.exec(themeCss)
  if (!importMatch) throw new Error('The default theme must start with one resolvable font CSS import.')

  const fontCssPath = requireFromProject.resolve(importMatch[1])
  const fontCss = readFileSync(fontCssPath, 'utf8')
  const remainingThemeCss = themeCss.slice(importMatch[0].length)
  const resolvedCss = Buffer.from(fontCss + remainingThemeCss)
  const fontUrls = [...fontCss.matchAll(/url\(["']?([^"')]+)["']?\)/gu)]
    .map((match) => resolve(dirname(fontCssPath), match[1]))
  const fontFiles = [...new Set(fontUrls)]
  const fontSizes = fontFiles.map((path) => ({
    bytes: statSync(path).size,
    file: basename(path),
  }))
  const commonLatinFile = loadBudgetManifest().limits.fonts.commonLatinFile
  const commonLatin = fontSizes.find(({file}) => file === commonLatinFile)
  if (!commonLatin) throw new Error(`The default font CSS does not reference ${commonLatinFile}.`)

  return {
    fonts: {
      commonLatinBytes: commonLatin.bytes,
      files: fontSizes,
      totalBytes: fontSizes.reduce((total, font) => total + font.bytes, 0),
    },
    theme: {
      gzipBytes: gzipSize(resolvedCss),
      importsResolved: !/@import\s/iu.test(fontCss) && !/@import\s/iu.test(remainingThemeCss),
      rawBytes: resolvedCss.byteLength,
    },
  }
}

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function runNpm(arguments_, options = {}) {
  const result = spawnSync(npmExecutable(), arguments_, {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`npm ${arguments_.join(' ')} failed:\n${result.stderr.trim()}`)
  }
  return result
}

function measurePackedWorkspace(workspace) {
  const result = runNpm(['pack', '--dry-run', '--json', '-w', workspace])
  const parsed = JSON.parse(result.stdout)
  const pack = parsed[0]
  if (!pack || typeof pack.size !== 'number' || !Array.isArray(pack.files)) {
    throw new Error(`npm returned an invalid pack report for ${workspace}.`)
  }
  return {
    files: pack.files.map(({path}) => path),
    size: pack.size,
  }
}

function readStandardSceneFixture() {
  const mdx = readFileSync(resolve(scriptDirectory, 'fixtures/standard-task-scene.mdx'), 'utf8')
  const lines = mdx.trimEnd().split('\n')
  if (lines.length !== 4 || !lines[0].startsWith(':::hw-scene') || lines[3] !== ':::') {
    throw new Error('The standard task Scene fixture has an unexpected shape.')
  }
  return {mdx, source: lines.slice(1, -1).join('\n')}
}

async function loadSceneTools() {
  const [{compile}, {default: remarkDirective}, {remarkMdxHandwritten}, scene, react, reactDom] =
    await Promise.all([
      import('@mdx-js/mdx'),
      import('remark-directive'),
      import(pathToFileURL(resolve(projectRoot, 'packages/remark/dist/index.js')).href),
      import(pathToFileURL(resolve(projectRoot, 'packages/scene/dist/index.js')).href),
      import(pathToFileURL(resolve(projectRoot, 'packages/react/dist/index.js')).href),
      import('react-dom/server'),
    ])

  return {
    compile,
    createElement: (await import('react')).createElement,
    createScenePlan: scene.createScenePlan,
    HandScene: react.HandScene,
    remarkDirective,
    remarkMdxHandwritten,
    renderToStaticMarkup: reactDom.renderToStaticMarkup,
  }
}

async function prepareStandardScene() {
  const fixture = readStandardSceneFixture()
  const tools = await loadSceneTools()
  const planResult = tools.createScenePlan({
    recipe: 'task-explainer',
    source: fixture.source,
  })
  if (!planResult.ok) throw new Error('The standard task Scene fixture no longer materializes.')

  return {
    compileOptions: {
      remarkPlugins: [
        tools.remarkDirective,
        [tools.remarkMdxHandwritten, {output: 'component'}],
      ],
    },
    element: tools.createElement(tools.HandScene, {plan: planResult.plan}),
    fixture,
    tools,
  }
}

async function measureStandardScene() {
  const standard = await prepareStandardScene()
  const compiled = String(await standard.tools.compile(
    standard.fixture.mdx,
    standard.compileOptions,
  ))
  const html = standard.tools.renderToStaticMarkup(standard.element)
  const scripts = html.match(/<script\b[\s\S]*?<\/script>/giu) ?? []

  return {
    componentTransportBytes: Buffer.byteLength(compiled),
    requiredClientRuntimeBytes: scripts.reduce(
      (total, script) => total + Buffer.byteLength(script),
      0,
    ),
    ssrHtmlBytes: Buffer.byteLength(html),
  }
}

function hasBrowserSpecificEntry(packageJson) {
  if (packageJson.browser !== undefined) return true

  function containsBrowserOrClient(value) {
    if (typeof value === 'string') return /(?:^|[./_-])(browser|client)(?:[./_-]|$)/iu.test(value)
    if (Array.isArray(value)) return value.some(containsBrowserOrClient)
    if (typeof value !== 'object' || value === null) return false

    return Object.entries(value).some(([key, nested]) =>
      /(?:^|[./_-])(browser|client)(?:[./_-]|$)/iu.test(key) || containsBrowserOrClient(nested),
    )
  }

  return containsBrowserOrClient(packageJson.exports)
}

export async function measureBlockingBudgets() {
  const esm = {
    react: measureBytes('packages/react/dist/index.js'),
    remark: measureBytes('packages/remark/dist/index.js'),
    scene: measureBytes('packages/scene/dist/index.js'),
  }
  const [handScene, handText] = await Promise.all([
    measureConsumer('hand-scene-entry.mjs'),
    measureConsumer('hand-text-entry.mjs'),
  ])
  const {fonts, theme} = measureTheme()
  const scene = await measureStandardScene()
  const npmPacked = Object.fromEntries(
    [
      'mdx-handwritten-scene',
      'remark-mdx-handwritten',
      'mdx-handwritten-react',
      'mdx-handwritten-theme',
    ].map((workspace) => [workspace, measurePackedWorkspace(workspace)]),
  )
  const reactPackage = JSON.parse(readFileSync(resolve(projectRoot, 'packages/react/package.json'), 'utf8'))
  const scenePackage = JSON.parse(readFileSync(resolve(projectRoot, 'packages/scene/package.json'), 'utf8'))
  const browserReachable = Buffer.concat([
    readArtifact('packages/react/dist/index.js'),
    readArtifact('packages/scene/dist/index.js'),
  ]).toString('utf8')

  return {
    consumerBundles: {handScene, handText},
    esm,
    combinedEsmGzipBytes: Object.values(esm)
      .reduce((total, entry) => total + entry.gzipBytes, 0),
    fonts,
    invariants: {
      esbuildVersion,
      fontFilesMatch: fonts.files.map(({file}) => file).sort().join('\n') ===
        [...loadBudgetManifest().limits.fonts.files].sort().join('\n'),
      handSceneExported: handScene.exports.includes('HandScene'),
      handTextExported: handText.exports.includes('HandText'),
      noBrowserExport: !hasBrowserSpecificEntry(reactPackage) &&
        !hasBrowserSpecificEntry(scenePackage),
      noUseClientDirective: !browserReachable.includes('use client'),
      remarkSourceMapPacked: npmPacked['remark-mdx-handwritten'].files.includes('dist/index.js.map'),
      sceneSourceMapPacked: npmPacked['mdx-handwritten-scene'].files.includes('dist/index.js.map'),
      themeImportsResolved: theme.importsResolved,
    },
    npmPacked,
    scene,
    theme,
  }
}

function elapsedMilliseconds(started) {
  return Number(process.hrtime.bigint() - started) / 1_000_000
}

function percentile(values, percentile_) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(percentile_ * sorted.length) - 1)]
}

async function measureAsyncSamples({samples, warmups, run}) {
  for (let index = 0; index < warmups; index += 1) await run()
  const values = []
  for (let index = 0; index < samples; index += 1) {
    const started = process.hrtime.bigint()
    await run()
    values.push(elapsedMilliseconds(started))
  }
  return {
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    samples,
  }
}

function measureBuildSamples() {
  runNpm(['run', 'build:packages'], {stdio: 'pipe'})
  const values = []
  for (let index = 0; index < 5; index += 1) {
    const started = process.hrtime.bigint()
    runNpm(['run', 'build:packages'], {stdio: 'pipe'})
    values.push(elapsedMilliseconds(started))
  }
  return {p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), samples: values.length}
}

export async function measurePerformance() {
  const buildMetric = measureBuildSamples()
  const standard = await prepareStandardScene()

  const compileMetric = await measureAsyncSamples({
    samples: 20,
    warmups: 5,
    run: async () => {
      for (let index = 0; index < 100; index += 1) {
        await standard.tools.compile(standard.fixture.mdx, standard.compileOptions)
      }
    },
  })
  const ssrMetric = await measureAsyncSamples({
    samples: 2000,
    warmups: 200,
    run: () => standard.tools.renderToStaticMarkup(standard.element),
  })

  return {
    oneHundredSceneCompile: compileMetric,
    singleSceneSsr: ssrMetric,
    warmPackageBuild: buildMetric,
  }
}

export function npmVersion() {
  return runNpm(['--version']).stdout.trim()
}
