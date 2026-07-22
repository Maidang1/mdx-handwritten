#!/usr/bin/env node
import {resolve} from 'node:path'
import {runRecipePackageConformance} from './index.mjs'

function usage() {
  return 'Usage: node scripts/recipe-conformance/cli.mjs <package-directory> [--definition-export=default] [--conformance-export=./conformance] [--scene-package-directory=./node_modules/mdx-handwritten-scene]'
}

const arguments_ = process.argv.slice(2)
const packageDirectory = arguments_.find((argument) => !argument.startsWith('--'))
const exportArgument = arguments_.find((argument) => argument.startsWith('--conformance-export='))
const definitionExportArgument = arguments_.find(
  (argument) => argument.startsWith('--definition-export='),
)
const scenePackageArgument = arguments_.find(
  (argument) => argument.startsWith('--scene-package-directory='),
)
if (arguments_.includes('--help')) {
  console.log(usage())
} else if (!packageDirectory) {
  console.error(usage())
  process.exitCode = 1
} else {
  try {
    const result = await runRecipePackageConformance({
      packageDirectory: resolve(packageDirectory),
      conformanceExport: exportArgument?.slice('--conformance-export='.length),
      definitionExport: definitionExportArgument?.slice('--definition-export='.length),
      scenePackageDirectory: scenePackageArgument
        ? resolve(scenePackageArgument.slice('--scene-package-directory='.length))
        : undefined,
    })
    const total = Object.values(result.checks).reduce((sum, count) => sum + count, 0)
    console.log(`PASS ${result.packageName}: ${total} packed conformance cases`)
    console.log(`PASS packed peer: ${result.scenePackage.name}@${result.scenePackage.version}`)
    console.log(`PASS npm tarball: ${result.files.sort().join(', ')}`)
  } catch (error) {
    console.error(`FAIL Recipe package conformance: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
