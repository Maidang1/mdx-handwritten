import {
  loadBudgetManifest,
  measureBlockingBudgets,
  npmVersion,
} from './measure.mjs'

const manifest = loadBudgetManifest()
const actual = await measureBlockingBudgets()
const checks = []

function budget(id, value, maximum) {
  checks.push({actual: value, expected: `<= ${maximum} B`, id, pass: value <= maximum})
}

function invariant(id, pass, expected = 'true') {
  checks.push({actual: String(pass), expected, id, pass})
}

function equal(id, value, expected) {
  checks.push({actual: String(value), expected: String(expected), id, pass: value === expected})
}

for (const name of ['scene', 'remark', 'react']) {
  budget(`esm.${name}.raw`, actual.esm[name].rawBytes, manifest.limits.esm[name].rawBytes)
  budget(`esm.${name}.gzip`, actual.esm[name].gzipBytes, manifest.limits.esm[name].gzipBytes)
}
budget('esm.combined.gzip', actual.combinedEsmGzipBytes, manifest.limits.esm.combinedGzipBytes)
budget('consumer.handScene.raw', actual.consumerBundles.handScene.rawBytes, manifest.limits.consumerBundles.handScene.rawBytes)
budget('consumer.handScene.gzip', actual.consumerBundles.handScene.gzipBytes, manifest.limits.consumerBundles.handScene.gzipBytes)
budget('consumer.handText.gzip', actual.consumerBundles.handText.gzipBytes, manifest.limits.consumerBundles.handText.gzipBytes)
budget('consumer.handText.scene', actual.consumerBundles.handText.sceneBytes, manifest.limits.consumerBundles.handText.sceneBytes)
budget('theme.resolved.raw', actual.theme.rawBytes, manifest.limits.theme.rawBytes)
budget('theme.resolved.gzip', actual.theme.gzipBytes, manifest.limits.theme.gzipBytes)
budget('fonts.default.total', actual.fonts.totalBytes, manifest.limits.fonts.totalBytes)
budget('fonts.default.commonLatin', actual.fonts.commonLatinBytes, manifest.limits.fonts.commonLatinBytes)
budget('scene.componentTransport', actual.scene.componentTransportBytes, manifest.limits.scene.componentTransportBytes)
budget('scene.ssrHtml', actual.scene.ssrHtmlBytes, manifest.limits.scene.ssrHtmlBytes)
budget('scene.requiredClientRuntime', actual.scene.requiredClientRuntimeBytes, manifest.limits.scene.requiredClientRuntimeBytes)

for (const [workspace, maximum] of Object.entries(manifest.limits.npmPacked)) {
  budget(`npmPacked.${workspace}`, actual.npmPacked[workspace].size, maximum)
}

invariant('consumer.handScene.exported', actual.invariants.handSceneExported)
invariant('consumer.handText.exported', actual.invariants.handTextExported)
invariant('fonts.default.fileSet', actual.invariants.fontFilesMatch)
invariant('runtime.noBrowserExport', actual.invariants.noBrowserExport)
invariant('runtime.noUseClientDirective', actual.invariants.noUseClientDirective)
invariant('theme.importsResolved', actual.invariants.themeImportsResolved)
invariant('npmPacked.sceneSourceMap', actual.invariants.sceneSourceMapPacked)
invariant('npmPacked.remarkSourceMap', actual.invariants.remarkSourceMapPacked)
equal(
  'tooling.esbuildVersion',
  actual.invariants.esbuildVersion,
  manifest.measurement.consumerBundle.bundler.split(' ')[1],
)

const localRuntime = {node: process.versions.node, npm: npmVersion()}
if (localRuntime.node !== manifest.measurement.node || localRuntime.npm !== manifest.measurement.npm) {
  console.log(
    `INFO canonical CI uses Node ${manifest.measurement.node} and npm ${manifest.measurement.npm}; ` +
    `this local run uses Node ${localRuntime.node} and npm ${localRuntime.npm}.`,
  )
}

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.id}: ${check.actual} (expected ${check.expected})`)
}

const failures = checks.filter(({pass}) => !pass)
if (failures.length > 0) {
  console.error(`\n${failures.length} blocking budget check(s) failed.`)
  process.exitCode = 1
} else {
  console.log(`\nAll ${checks.length} blocking budget checks passed.`)
}
