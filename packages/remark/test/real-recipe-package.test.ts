import {compile, evaluate} from '@mdx-js/mdx'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'
import remarkDirective from 'remark-directive'
import {describe, expect, it} from 'vitest'
import type {ScenePlanV1} from '@madinah/mdx-handwritten-scene'
import {
  annotationRecipeLimitsV1,
  annotationRecipePackageProtocolV1,
  createSceneCompiler,
  type AnnotationRecipePackageV1
} from '@madinah/mdx-handwritten-scene/recipes'
import remarkMdxHandwritten, {
  type HandwrittenOptions
} from '../src/index.js'

const packageName = '@evidence/transition-recipes'
const recipeName = `${packageName}/status-transition`
const transitionSource = 'draft -> shipped'
const sharedPlanBytes = readFileSync(
  fileURLToPath(
    new URL(
      '../../../tests/fixtures/materialized-transition-scene-plan.json',
      import.meta.url
    )
  ),
  'utf8'
)
const sharedPlan = JSON.parse(sharedPlanBytes) as ScenePlanV1
const sharedPlanFingerprint =
  '5809fc2bb011eb01410528b21c2a5901af5f83a3acd15932de71585f8ee098a7'

interface RenderedElement {
  props: Record<string, unknown>
  type: unknown
}

function isRenderedElement(value: unknown): value is RenderedElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'props' in value &&
    'type' in value &&
    typeof value.props === 'object' &&
    value.props !== null
  )
}

function renderedElements(
  node: unknown,
  predicate: (element: RenderedElement) => boolean,
  result: RenderedElement[] = []
): RenderedElement[] {
  if (Array.isArray(node)) {
    for (const child of node) renderedElements(child, predicate, result)
  } else if (isRenderedElement(node)) {
    if (predicate(node)) result.push(node)
    renderedElements(node.props.children, predicate, result)
  }
  return result
}

function renderedText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return isRenderedElement(node) ? renderedText(node.props.children) : ''
}

function readerMeaningFromPlan(plan: ScenePlanV1): string[] {
  return [
    plan.title,
    plan.source.text,
    ...plan.relationships.map(relationship => relationship.legendText)
  ]
}

function readerMeaningFromTree(tree: unknown): string[] {
  const [caption] = renderedElements(
    tree,
    element => 'data-hw-scene-caption' in element.props
  )
  const [source] = renderedElements(tree, element => element.type === 'pre')
  const [legend] = renderedElements(tree, element => element.type === 'ol')
  if (!caption || !source || !legend) {
    throw new Error('Expected complete reader-facing Scene output.')
  }
  const items = renderedElements(legend, element => element.type === 'li')
  return [
    renderedText(caption).trim(),
    renderedText(source),
    ...items.map(item => renderedText(item).trim())
  ]
}

function transitionPackage(): AnnotationRecipePackageV1 {
  return {
    protocol: annotationRecipePackageProtocolV1,
    protocolVersion: 1,
    packageName,
    recipes: [
      {
        ref: {name: recipeName, version: 1},
        roles: ['before', 'after'],
        correctionSlots: {
          targets: [],
          labels: ['transition-label'],
          relationships: ['transition-relationship']
        },
        catalog: {
          id: 'evidence/status-transition/reader-text',
          version: 1,
          messages: {
            en: {title: 'Release transition', transition: 'status transition'},
            'zh-CN': {title: '发布状态变化', transition: '状态变化'}
          }
        },
        limits: {...annotationRecipeLimitsV1},
        compile: context => {
          const transitionMessage = context.messages.transition!
          const separator = ' -> '
          const separatorStart = context.source.indexOf(separator)
          if (
            separatorStart <= 0 ||
            separatorStart + separator.length >= context.source.length
          ) {
            return {
              ok: false,
              diagnostics: [
                {
                  reason: 'transition-missing',
                  message: 'Write a transition as "before -> after".'
                }
              ]
            }
          }

          const afterStart = separatorStart + separator.length
          return {
            ok: true,
            draft: {
              targets: [
                {
                  id: 'before',
                  role: 'before',
                  ranges: [
                    {
                      start: 0,
                      end: separatorStart,
                      exactText: context.source.slice(0, separatorStart)
                    }
                  ]
                },
                {
                  id: 'after',
                  role: 'after',
                  ranges: [
                    {
                      start: afterStart,
                      end: context.source.length,
                      exactText: context.source.slice(afterStart)
                    }
                  ]
                }
              ],
              labels: [
                {id: 'transition-label', text: transitionMessage}
              ],
              relationships: [
                {
                  id: 'transition-relationship',
                  kind: 'relates',
                  relation: 'changes-to',
                  labelId: 'transition-label',
                  fromTargetIds: ['before'],
                  toTargetIds: ['after'],
                  detailKind: 'short-description',
                  legendText: `${transitionMessage}: ${context.source}`
                }
              ],
              gestures: [
                {
                  id: 'transition-connector',
                  kind: 'connect',
                  relationshipId: 'transition-relationship'
                }
              ]
            }
          }
        },
        validate: context =>
          context.draft.targets.map(target => target.id).join(',') ===
          'before,after'
            ? {ok: true}
            : {
                ok: false,
                diagnostics: [
                  {
                    reason: 'target-identity-invalid',
                    message: 'The reviewed transition target identities changed.'
                  }
                ]
              }
      }
    ],
    activeVersions: {[recipeName]: 1}
  }
}

function sceneCompiler() {
  return createSceneCompiler({
    recipePackages: [
      {packageName, definition: transitionPackage()}
    ]
  })
}

function transitionScene(
  source = transitionSource,
  plan?: string
): string {
  const planAttribute = plan === undefined ? '' : ` plan="${plan}"`
  return `:::hw-scene{recipe="${recipeName}"${planAttribute}}\n${source}\n:::`
}

function compileMdx(source: string, options: HandwrittenOptions = {}) {
  return compile(
    {value: source, path: '/checkout/project/docs/recipe-evidence.mdx'},
    {
      remarkPlugins: [
        remarkDirective,
        [remarkMdxHandwritten, options]
      ]
    }
  )
}

function evaluateMdx(source: string, options: HandwrittenOptions = {}) {
  return evaluate(
    {value: source, path: '/checkout/project/docs/recipe-evidence.mdx'},
    {
      Fragment,
      jsx,
      jsxs,
      remarkPlugins: [
        remarkDirective,
        [remarkMdxHandwritten, options]
      ]
    }
  )
}

async function compileFailure(
  source: string,
  options: HandwrittenOptions
): Promise<{reason?: string; ruleId?: string}> {
  try {
    await compileMdx(source, options)
  } catch (error) {
    return error as {reason?: string; ruleId?: string}
  }
  throw new Error('Expected MDX compilation to fail.')
}

function reviewed(plan: ScenePlanV1): ScenePlanV1 {
  return {
    ...plan,
    labels: plan.labels.map(label => ({
      ...label,
      text: 'reviewed status transition'
    })),
    relationships: plan.relationships.map(relationship => ({
      ...relationship,
      legendText: 'reviewed status transition: draft becomes shipped'
    })),
    provenance: {
      kind: 'reviewed-proposal',
      engine: plan.provenance.engine,
      generator: {id: 'recipe-package-integration-fixture', version: '1'},
      review: {status: 'approved', id: 'review-recipe-package-1'}
    }
  }
}

describe('real Configured Scene compiler integration', () => {
  it('compiles a mixed built-in and third-party document with one real compiler', async () => {
    const source = `:::hw-scene{recipe="task-explainer"}\n[ ] CLI-007 Ship adapter evidence\n:::\n\n${transitionScene()}`
    const output = String(
      await compileMdx(source, {
        imports: {mode: 'auto', source: '@madinah/mdx-handwritten-react'},
        sceneCompiler: sceneCompiler()
      })
    )

    expect(output.match(/_jsx\(HandScene/gu)).toHaveLength(2)
    expect(output).toContain('"name": "task-explainer"')
    expect(output).toContain('"name": "@evidence/transition-recipes/status-transition"')
    expect(output).toContain('Task explainer')
    expect(output).toContain('Release transition')
    expect(output).toContain('status transition: draft -> shipped')
  })

  it('adapts one shared materialized third-party plan to component, element, and strip output', async () => {
    const compiler = sceneCompiler()
    const deterministic = compiler.createScenePlan({
      recipe: recipeName,
      source: transitionSource
    })
    if (!deterministic.ok) {
      throw new Error('Expected the third-party Recipe to materialize.')
    }
    expect({...deterministic.plan, provenance: sharedPlan.provenance}).toEqual(
      sharedPlan
    )
    expect(
      createHash('sha256')
        .update(JSON.stringify(sharedPlan))
        .digest('hex')
    ).toBe(sharedPlanFingerprint)

    const binding = 'rp1_01k5x7t3v0n8s6dym4q2w9c5hb'
    const projectRoot = await mkdtemp(join(tmpdir(), 'mdx-handwritten-parity-'))
    try {
      const directory = join(projectRoot, '.mdx-handwritten', 'plans')
      await mkdir(directory, {recursive: true})
      await writeFile(join(directory, `${binding}.json`), sharedPlanBytes)
      const scene = transitionScene(transitionSource, binding)
      const options = (
        output: NonNullable<HandwrittenOptions['output']>
      ): HandwrittenOptions => ({
        output,
        reviewedPlans: {projectRoot},
        sceneCompiler: compiler
      })
      const [componentModule, elementModule, stripModule] = await Promise.all([
        evaluateMdx(scene, options('component')),
        evaluateMdx(scene, options('element')),
        evaluateMdx(scene, options('strip'))
      ])

      const component = componentModule.default({
        components: {HandScene: () => null}
      })
      if (!isRenderedElement(component)) {
        throw new Error('Expected component output to contain HandScene.')
      }
      const componentPlan = component.props.plan as ScenePlanV1
      const element = elementModule.default({})
      const strip = stripModule.default({})
      const expectedMeaning = readerMeaningFromPlan(sharedPlan)

      expect(Object.keys(component.props)).toEqual(['plan'])
      expect(componentPlan).toEqual(sharedPlan)
      expect(readerMeaningFromPlan(componentPlan)).toEqual(expectedMeaning)
      expect(readerMeaningFromTree(element)).toEqual(expectedMeaning)
      expect(readerMeaningFromTree(strip)).toEqual(expectedMeaning)
      expect(
        renderedElements(
          element,
          rendered => 'data-hw-target' in rendered.props
        ).map(rendered => [
          rendered.props['data-hw-target'],
          rendered.props['data-hw-target-role'],
          renderedText(rendered)
        ])
      ).toEqual([
        ['before', 'before', 'draft'],
        ['after', 'after', 'shipped']
      ])
      expect(renderedElements(strip, rendered =>
        typeof rendered.type === 'function' && rendered.type.name === 'HandScene'
      )).toHaveLength(0)
    } finally {
      await rm(projectRoot, {force: true, recursive: true})
    }
  })

  it('revalidates a reviewed third-party candidate with the real compiler', async () => {
    const compiler = sceneCompiler()
    const deterministic = compiler.createScenePlan({
      recipe: recipeName,
      source: transitionSource
    })
    if (!deterministic.ok) {
      throw new Error('Expected the third-party Recipe to materialize.')
    }

    const binding = 'rp1_01k5x7t3v0n8s6dym4q2w9c5ha'
    const projectRoot = await mkdtemp(join(tmpdir(), 'mdx-handwritten-recipe-'))
    try {
      const directory = join(projectRoot, '.mdx-handwritten', 'plans')
      await mkdir(directory, {recursive: true})
      await writeFile(
        join(directory, `${binding}.json`),
        JSON.stringify(reviewed(deterministic.plan))
      )

      const output = String(
        await compileMdx(transitionScene(transitionSource, binding), {
          reviewedPlans: {projectRoot},
          sceneCompiler: compiler
        })
      )

      expect(output).toContain('Release transition')
      expect(output).toContain(
        'reviewed status transition: draft becomes shipped'
      )
      expect(output).toContain('"kind": "reviewed-proposal"')
      expect(output).not.toContain(binding)
      expect(output).not.toContain(projectRoot)
    } finally {
      await rm(projectRoot, {force: true, recursive: true})
    }
  })

  it('rejects a package diagnostic in strict mode and preserves only readable source in warn mode', async () => {
    const compiler = sceneCompiler()
    const invalidSource = 'draft eventually shipped'
    const scene = transitionScene(invalidSource)
    const failure = await compileFailure(scene, {sceneCompiler: compiler})

    expect(failure).toMatchObject({
      ruleId: 'scene-recipe-rejected',
      reason: 'Write a transition as "before -> after".'
    })

    const warned = await compileMdx(scene, {
      diagnostics: 'warn',
      imports: {mode: 'auto', source: '@madinah/mdx-handwritten-react'},
      sceneCompiler: compiler
    })
    const output = String(warned)

    expect(
      warned.messages.some(
        message =>
          message.ruleId === 'scene-recipe-rejected' &&
          message.reason === 'Write a transition as "before -> after".'
      )
    ).toBe(true)
    expect(output).toContain(invalidSource)
    expect(output).not.toContain('Release transition')
    expect(output).not.toContain('status transition:')
    expect(output).not.toContain('HandScene')
    expect(output).not.toContain('_components.ol')
  })
})
