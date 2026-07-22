#!/usr/bin/env node
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runRecipePackageConformance} from './index.mjs'

export function usage() {
  return 'Usage: node scripts/recipe-conformance/cli.mjs <package-directory> [--definition-export=default] [--conformance-export=./conformance] [--scene-package-directory=./node_modules/mdx-handwritten-scene]'
}

const optionNames = new Set([
  'conformance-export',
  'definition-export',
  'scene-package-directory',
])

export function parseRecipeConformanceArguments(arguments_) {
  const options = {}
  let packageDirectory
  let help = false

  for (const argument of arguments_) {
    if (argument === '--help') {
      if (help) throw new TypeError('Duplicate option: --help.')
      help = true
      continue
    }
    if (argument.startsWith('-')) {
      const match = /^--([^=]+)=(.*)$/u.exec(argument)
      if (!match || !optionNames.has(match[1])) {
        throw new TypeError(`Unknown option: ${argument}.`)
      }
      const [, name, value] = match
      if (Object.hasOwn(options, name)) {
        throw new TypeError(`Duplicate option: --${name}.`)
      }
      if (value.length === 0) {
        throw new TypeError(`Option --${name} requires a non-empty value.`)
      }
      options[name] = value
      continue
    }
    if (argument.length === 0) throw new TypeError('Package directory must not be empty.')
    if (packageDirectory !== undefined) {
      throw new TypeError(`Unexpected extra positional argument: ${argument}.`)
    }
    packageDirectory = argument
  }

  if (help) {
    if (packageDirectory !== undefined || Object.keys(options).length > 0) {
      throw new TypeError('--help cannot be combined with other arguments.')
    }
    return {help: true}
  }
  if (packageDirectory === undefined) throw new TypeError('Package directory is required.')
  return {
    conformanceExport: options['conformance-export'],
    definitionExport: options['definition-export'],
    help: false,
    packageDirectory,
    scenePackageDirectory: options['scene-package-directory'],
  }
}

async function main() {
  try {
    const parsed = parseRecipeConformanceArguments(process.argv.slice(2))
    if (parsed.help) {
      console.log(usage())
      return
    }
    const result = await runRecipePackageConformance({
      packageDirectory: resolve(parsed.packageDirectory),
      conformanceExport: parsed.conformanceExport,
      definitionExport: parsed.definitionExport,
      scenePackageDirectory: parsed.scenePackageDirectory
        ? resolve(parsed.scenePackageDirectory)
        : undefined,
    })
    const total = Object.values(result.checks).reduce((sum, count) => sum + count, 0)
    console.log(`PASS ${result.packageName}: ${total} packed conformance cases`)
    console.log(`PASS packed peer: ${result.scenePackage.name}@${result.scenePackage.version}`)
    console.log(`PASS npm tarball: ${result.files.sort().join(', ')}`)
  } catch (error) {
    console.error(`FAIL Recipe package conformance: ${error instanceof Error ? error.message : String(error)}`)
    console.error(usage())
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
