import type {ComponentProps} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import type {ScenePlanV1} from '@madinah/mdx-handwritten-scene'
import {
  annotationRecipeLimitsV1,
  annotationRecipePackageProtocolV1,
  createSceneCompiler,
  type AnnotationRecipePackageV1
} from '@madinah/mdx-handwritten-scene/recipes'
import {HandScene} from '../src/index.js'

const packageName = '@evidence/transition-recipes'
const recipeName = `${packageName}/status-transition`
const source = 'draft -> shipped'
const sharedPlan = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../tests/fixtures/materialized-transition-scene-plan.json',
        import.meta.url
      )
    ),
    'utf8'
  )
) as ScenePlanV1
const sharedPlanFingerprint =
  '5809fc2bb011eb01410528b21c2a5901af5f83a3acd15932de71585f8ee098a7'

describe('third-party Scene plan server rendering', () => {
  it('renders a materialized third-party plan from plan-only serializable props', () => {
    let recipeAvailable = true
    let compileCalls = 0
    const recipePackage: AnnotationRecipePackageV1 = {
      protocol: annotationRecipePackageProtocolV1,
      protocolVersion: 1,
      packageName,
      recipes: [
        {
          ref: {name: recipeName, version: 1},
          roles: ['before', 'after'],
          correctionSlots: {targets: [], labels: [], relationships: []},
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
            compileCalls += 1
            if (!recipeAvailable) {
              throw new Error('The Recipe package is unavailable at render time.')
            }
            return {
              ok: true,
              draft: {
                targets: [
                  {
                    id: 'before',
                    role: 'before',
                    ranges: [{start: 0, end: 5, exactText: 'draft'}]
                  },
                  {
                    id: 'after',
                    role: 'after',
                    ranges: [{start: 9, end: 16, exactText: 'shipped'}]
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
          validate: () => ({ok: true})
        }
      ],
      activeVersions: {[recipeName]: 1}
    }
    const compiler = createSceneCompiler({
      recipePackages: [{packageName, definition: recipePackage}]
    })
    const result = compiler.createScenePlan({recipe: recipeName, source})
    if (!result.ok) {
      throw new Error('Expected the third-party Recipe to materialize.')
    }
    expect({...result.plan, provenance: sharedPlan.provenance}).toEqual(
      sharedPlan
    )
    expect(
      createHash('sha256')
        .update(JSON.stringify(sharedPlan))
        .digest('hex')
    ).toBe(sharedPlanFingerprint)

    recipeAvailable = false
    const compileCallsBeforeRender = compileCalls
    const props = JSON.parse(
      JSON.stringify({plan: sharedPlan})
    ) as ComponentProps<typeof HandScene>
    const html = renderToStaticMarkup(<HandScene {...props} />)

    expect(Object.keys(props)).toEqual(['plan'])
    expect(compileCallsBeforeRender).toBe(1)
    expect(compileCalls).toBe(compileCallsBeforeRender)
    expect(html).toContain(
      '<figure data-hw-locale="en" data-hw-scene="@evidence/transition-recipes/status-transition"'
    )
    expect(html).toContain('Release transition')
    expect(html).toContain(
      'data-hw-target="before" data-hw-target-role="before">draft</span>'
    )
    expect(html).toContain(
      'data-hw-target="after" data-hw-target-role="after">shipped</span>'
    )
    expect(html).toContain('data-hw-relation="changes-to"')
    expect(html).toContain('data-hw-connector="straight"')
    expect(html).toContain('status transition: draft -&gt; shipped')
    expect(html.indexOf('<pre data-hw-scene-source="">')).toBeLessThan(
      html.indexOf('<ol data-hw-scene-legend="" lang="en">')
    )
    expect(html).not.toContain('data-hw-scene-invalid')
    expect(html).not.toContain('<script')
  })
})
