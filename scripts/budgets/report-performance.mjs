import {appendFileSync, writeFileSync} from 'node:fs'
import {
  loadBudgetManifest,
  measurePerformance,
  npmVersion,
} from './measure.mjs'

const manifest = loadBudgetManifest()
const measured = await measurePerformance()
const timing = manifest.limits.timing
const metrics = [
  {
    id: 'warmPackageBuild',
    targetP95Ms: timing.warmPackageBuildP95Ms,
    ...measured.warmPackageBuild,
  },
  {
    id: 'oneHundredSceneCompile',
    targetP95Ms: timing.oneHundredSceneCompileP95Ms,
    ...measured.oneHundredSceneCompile,
  },
  {
    id: 'singleSceneSsr',
    targetP95Ms: timing.singleSceneSsrP95Ms,
    ...measured.singleSceneSsr,
  },
].map((metric) => ({...metric, pass: metric.p95Ms <= metric.targetP95Ms}))

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  enforcement: timing.enforcement,
  calibrationMainRuns: timing.calibrationMainRuns,
  runtime: {node: process.version, npm: npmVersion()},
  metrics,
}
const json = `${JSON.stringify(report, null, 2)}\n`
console.log(json.trimEnd())

if (process.env.PERFORMANCE_REPORT_PATH) {
  writeFileSync(process.env.PERFORMANCE_REPORT_PATH, json)
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = metrics.map((metric) =>
    `| ${metric.id} | ${metric.p50Ms.toFixed(3)} | ${metric.p95Ms.toFixed(3)} | ${metric.targetP95Ms} | ${metric.pass ? 'within target' : 'over target'} |`,
  )
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '## Annotation scene performance calibration',
      '',
      `Enforcement: **${timing.enforcement}** until ${timing.calibrationMainRuns} successful main runs are reviewed.`,
      '',
      '| Metric | p50 ms | p95 ms | target p95 ms | result |',
      '| --- | ---: | ---: | ---: | --- |',
      ...rows,
      '',
    ].join('\n'),
  )
}

if (timing.enforcement === 'block' && metrics.some(({pass}) => !pass)) {
  process.exitCode = 1
}
