import {describe, expect, it, vi} from 'vitest'
import * as root from '../src/index.js'
import {
  SceneCompilerConfigurationError,
  annotationRecipeLimitsV1,
  annotationRecipePackageProtocolV1,
  createSceneCompiler,
  type AnnotationRecipeDefinitionV1,
  type AnnotationRecipeDraftV1,
  type AnnotationRecipePackageV1
} from '../src/recipes.js'
import type {ScenePlanV1} from '../src/index.js'

const packageName = '@acme/recipes'
const recipeName = '@acme/recipes/simple'

function draft(source: string, label = 'word'): AnnotationRecipeDraftV1 {
  return {
    targets: [
      {
        id: 'word',
        role: 'word',
        ranges: [{start: 0, end: source.length, exactText: source}]
      }
    ],
    labels: [{id: 'word-label', text: label}],
    relationships: [
      {
        id: 'word-relationship',
        kind: 'describes' as const,
        labelId: 'word-label',
        targetIds: ['word'] as const,
        detailKind: 'short-description' as const,
        legendText: `${label}: ${source}`
      }
    ],
    gestures: [
      {
        id: 'word-gesture',
        kind: 'annotate' as const,
        relationshipId: 'word-relationship'
      }
    ]
  }
}

function definition(
  overrides: Partial<AnnotationRecipeDefinitionV1> = {}
): AnnotationRecipeDefinitionV1 {
  return {
    ref: {name: recipeName, version: 1},
    roles: ['word'],
    correctionSlots: {
      targets: ['word'],
      labels: ['word-label'],
      relationships: ['word-relationship']
    },
    catalog: {
      id: 'acme/simple/reader-text',
      version: 1,
      messages: {
        en: {title: 'Simple', word: 'word'},
        'zh-CN': {title: '简单', word: '词语'}
      }
    },
    limits: {...annotationRecipeLimitsV1},
    compile: context => ({
      ok: true,
      draft: draft(context.source, context.messages.word)
    }),
    validate: () => ({ok: true}),
    ...overrides
  }
}

function recipePackage(
  recipes: readonly AnnotationRecipeDefinitionV1[] = [definition()],
  activeVersions: Readonly<Record<string, number>> = {[recipeName]: 1}
): AnnotationRecipePackageV1 {
  return {
    protocol: annotationRecipePackageProtocolV1,
    protocolVersion: 1,
    packageName,
    recipes,
    activeVersions
  }
}

function compiler(recipe = recipePackage()) {
  return createSceneCompiler({
    recipePackages: [{packageName, definition: recipe}]
  })
}

function compilePlan(source = 'hello', recipe = recipePackage()): ScenePlanV1 {
  const result = compiler(recipe).createScenePlan({
    recipe: recipeName,
    source
  })
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.plan
}

function reviewed(plan: ScenePlanV1): ScenePlanV1 {
  return {
    ...plan,
    provenance: {
      kind: 'reviewed-proposal',
      engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
      generator: {id: 'fixture-generator'},
      review: {status: 'approved', id: 'fixture-review'}
    }
  }
}

describe('Recipe package configuration', () => {
  it('keeps the extension ABI isolated from the root export', () => {
    expect('createSceneCompiler' in root).toBe(false)
    expect(annotationRecipePackageProtocolV1).toBe(
      'mdx-handwritten/annotation-recipe-package'
    )
    expect(Object.isFrozen(annotationRecipeLimitsV1)).toBe(true)
  })

  it('returns typed deterministic configuration errors with immutable paths', () => {
    let error: unknown
    try {
      createSceneCompiler({
        recipePackages: [
          {
            packageName,
            definition: {
              ...recipePackage(),
              protocolVersion: 2
            } as never
          }
        ]
      })
    } catch (value) {
      error = value
    }
    expect(error).toBeInstanceOf(SceneCompilerConfigurationError)
    expect(error).toMatchObject({
      name: 'SceneCompilerConfigurationError',
      code: 'scene-compiler-package-protocol-unsupported',
      path: ['recipePackages', 0, 'definition', 'protocolVersion']
    })
    expect(Object.isFrozen((error as SceneCompilerConfigurationError).path)).toBe(
      true
    )
  })

  it.each([
    [
      'accessor',
      () =>
        Object.defineProperty({}, 'recipePackages', {
          get() {
            throw new Error('accessor secret')
          }
        })
    ],
    [
      'Proxy',
      () =>
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error('proxy secret')
            }
          }
        )
    ]
  ])('wraps a throwing configuration %s in one stable typed error', (_label, createOptions) => {
    let error: unknown
    try {
      createSceneCompiler(createOptions() as never)
    } catch (value) {
      error = value
    }
    expect(error).toBeInstanceOf(SceneCompilerConfigurationError)
    expect(error).toMatchObject({
      name: 'SceneCompilerConfigurationError',
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages']
    })
    expect((error as Error).message).toBe(
      'The Scene compiler configuration is invalid.'
    )
    expect(String(error)).not.toContain('secret')
  })

  it.each([
    [
      'public configuration error',
      new SceneCompilerConfigurationError(
        'scene-compiler-recipe-duplicate',
        ['forged'],
        'forged secret'
      )
    ],
    [
      'throwing getPrototypeOf Proxy',
      new Proxy({}, {
        getPrototypeOf() {
          throw new Error('prototype secret')
        }
      })
    ]
  ])('does not rethrow a package-forged %s', (_label, thrown) => {
    expect(() =>
      createSceneCompiler(new Proxy({}, {
        ownKeys() {
          throw thrown
        }
      }) as never)
    ).toThrowError(expect.objectContaining({
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages'],
      message: 'The Scene compiler configuration is invalid.'
    }))
  })

  it('scopes internal configuration errors to one non-reentrant compiler call', () => {
    const capture = (options: unknown) => {
      try {
        createSceneCompiler(options as never)
      } catch (error) {
        return error
      }
      throw new Error('Expected Scene compiler configuration to fail.')
    }
    const invalidOptions = () => ({
      recipePackages: [{
        packageName,
        definition: {...recipePackage(), protocolVersion: 2}
      }]
    })
    const historical = capture(invalidOptions())
    expect(historical).toMatchObject({
      code: 'scene-compiler-package-protocol-unsupported'
    })

    const replayed = capture(new Proxy({}, {
      ownKeys() {
        throw historical
      }
    }))
    expect(replayed).not.toBe(historical)
    expect(replayed).toMatchObject({
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages']
    })

    let nested: unknown
    const outer = capture(new Proxy({}, {
      ownKeys() {
        nested = capture(invalidOptions())
        throw nested
      }
    }))
    expect(nested).toMatchObject({
      code: 'scene-compiler-package-protocol-unsupported'
    })
    expect(outer).not.toBe(nested)
    expect(outer).toMatchObject({
      code: 'scene-compiler-package-invalid',
      path: ['recipePackages']
    })
  })

  it.each([
    ['name mismatch', 'scene-compiler-package-name-mismatch', () => ({
      packageName: '@other/recipes',
      definition: recipePackage()
    })],
    ['duplicate package', 'scene-compiler-package-invalid', () => ({
      packageName,
      definition: recipePackage()
    })],
    ['missing active version', 'scene-compiler-active-version-missing', () => ({
      packageName,
      definition: recipePackage([definition()], {[recipeName]: 2})
    })]
  ])('rejects %s', (_label, code, createBinding) => {
    const first = createBinding()
    const bindings = _label === 'duplicate package' ? [first, createBinding()] : [first]
    expect(() => createSceneCompiler({recipePackages: bindings} as never)).toThrowError(
      expect.objectContaining({code})
    )
  })

  it('accepts canonical names of 159 and 160 code units and rejects 161', () => {
    const longPackage = `@${'s'.repeat(31)}/${'p'.repeat(63)}`
    const make = (length: number) => {
      const name = `${longPackage}/${'r'.repeat(length - longPackage.length - 1)}`
      const recipe = definition({ref: {name, version: 1}})
      return () =>
        createSceneCompiler({
          recipePackages: [
            {
              packageName: longPackage,
              definition: {
                ...recipePackage([recipe], {[name]: 1}),
                packageName: longPackage
              }
            }
          ]
        })
    }
    expect(make(159)).not.toThrow()
    expect(make(160)).not.toThrow()
    expect(make(161)).toThrowError(
      expect.objectContaining({code: 'scene-compiler-package-invalid'})
    )
  })

  it.each([
    ['roles Symbol', () => {
      const recipe = definition()
      Object.defineProperty(recipe.roles, Symbol('hidden'), {value: true})
      return recipePackage([recipe])
    }],
    ['recipes method override', () => {
      const value = recipePackage()
      Object.defineProperty(value.recipes, 'map', {value: () => []})
      return value
    }],
    ['correction-slot accessor', () => {
      const recipe = definition()
      Object.defineProperty(recipe.correctionSlots.targets, 0, {
        enumerable: true,
        get() {
          throw new Error('slot secret')
        }
      })
      return recipePackage([recipe])
    }],
    ['non-enumerable correction-slot index', () => {
      const recipe = definition()
      Object.defineProperty(recipe.correctionSlots.labels, 0, {
        enumerable: false,
        value: 'word-label'
      })
      return recipePackage([recipe])
    }],
    ['hole in correction slots', () => {
      const recipe = definition()
      delete (recipe.correctionSlots.relationships as string[])[0]
      return recipePackage([recipe])
    }]
  ])('rejects a non-dense configuration array with %s', (_label, createPackage) => {
    expect(() => compiler(createPackage())).toThrowError(
      expect.objectContaining({code: 'scene-compiler-package-invalid'})
    )
  })

  it('snapshots metadata, collection membership, active versions, and function refs', () => {
    const compile = vi.fn(context => ({ok: true as const, draft: draft(context.source)}))
    const recipe = definition({compile})
    const recipes = [recipe]
    const activeVersions = {[recipeName]: 1}
    const definitionValue = recipePackage(recipes, activeVersions)
    const configured = compiler(definitionValue)

    ;(recipe.roles as string[]).splice(0, recipe.roles.length, 'mutated')
    ;(recipe.catalog.messages.en as {title: string}).title = 'Mutated'
    recipes.splice(0)
    activeVersions[recipeName] = 99
    recipe.compile = () => {
      throw new Error('mutated')
    }

    const result = configured.createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({ok: true, plan: {title: 'Simple'}})
    expect(compile).toHaveBeenCalledOnce()
  })

  it('requires complete equal-key plain-text catalogs and bounded limits', () => {
    expect(() =>
      compiler(
        recipePackage([
          definition({
            catalog: {
              id: 'acme/simple/reader-text',
              version: 1,
              messages: {
                en: {title: 'Simple', word: 'word'},
                'zh-CN': {title: '简单'}
              }
            }
          })
        ])
      )
    ).toThrowError(expect.objectContaining({code: 'scene-compiler-package-invalid'}))
    expect(() =>
      compiler(
        recipePackage([
          definition({
            limits: {...annotationRecipeLimitsV1, targets: 65}
          })
        ])
      )
    ).toThrowError(expect.objectContaining({code: 'scene-compiler-package-invalid'}))
    expect(() =>
      compiler(
        recipePackage([
          definition({
            limits: {...annotationRecipeLimitsV1, textCodeUnits: 5}
          })
        ])
      )
    ).toThrowError(expect.objectContaining({code: 'scene-compiler-package-invalid'}))
  })
})

describe('Configured Scene compiler', () => {
  it('keeps the built-in root behavior and compiles localized package drafts', () => {
    expect(
      compiler().createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 Ship it'
      })
    ).toEqual(
      root.createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 Ship it'
      })
    )
    expect(
      compiler().createScenePlan({
        recipe: recipeName,
        source: 'hello',
        locale: 'zh-cn'
      })
    ).toMatchObject({
      ok: true,
      plan: {
        recipe: {name: recipeName, version: 1},
        title: '简单',
        labels: [{text: '词语'}],
        localization: {locale: 'zh-CN'}
      }
    })
  })

  it('reports a lowered package source limit consistently without invoking compile', () => {
    const compile = vi.fn()
    const result = compiler(
      recipePackage([
        definition({
          limits: {...annotationRecipeLimitsV1, sourceCodeUnits: 4},
          compile
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'scene-source-too-long',
          message: 'The Annotation scene source exceeds 4 UTF-16 code units.',
          limit: {name: 'sourceCodeUnits', maximum: 4, actual: 5}
        }
      ]
    })
    expect(compile).not.toHaveBeenCalled()
  })

  it('invokes package callbacks without exposing the internal runtime contract as a receiver', () => {
    let compileReceiver: unknown = 'not-called'
    let validateReceiver: unknown = 'not-called'
    const configured = compiler(
      recipePackage([
        definition({
          compile: function (this: unknown, context) {
            compileReceiver = this
            return {ok: true, draft: draft(context.source)}
          },
          validate: function (this: unknown) {
            validateReceiver = this
            return {ok: true}
          }
        })
      ])
    )

    expect(
      configured.createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({ok: true})
    expect(compileReceiver).toBeUndefined()
    expect(validateReceiver).toBeUndefined()
  })

  it('selects the active author version but validates inactive exact candidates without compiling', () => {
    const compileV1 = vi.fn(context => ({ok: true as const, draft: draft(context.source, 'v1')}))
    const validateV1 = vi.fn(() => ({ok: true as const}))
    const compileV2 = vi.fn(context => ({ok: true as const, draft: draft(context.source, 'v2')}))
    const validateV2 = vi.fn(() => ({ok: true as const}))
    const v1 = definition({compile: compileV1, validate: validateV1})
    const v2 = definition({
      ref: {name: recipeName, version: 2},
      catalog: {...definition().catalog, version: 2},
      compile: compileV2,
      validate: validateV2
    })
    const packageWithBoth = recipePackage([v1, v2], {[recipeName]: 2})
    const configured = compiler(packageWithBoth)
    expect(
      configured.createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({ok: true, plan: {recipe: {version: 2}}})
    expect(compileV1).not.toHaveBeenCalled()
    expect(compileV2).toHaveBeenCalledOnce()

    const candidate = reviewed(compilePlan('hello', recipePackage([v1])))
    compileV1.mockClear()
    validateV1.mockClear()
    const result = configured.createScenePlan({
      source: 'hello',
      candidateJson: JSON.stringify(candidate)
    })
    expect(result).toMatchObject({ok: true, plan: {recipe: {version: 1}}})
    expect(compileV1).not.toHaveBeenCalled()
    expect(validateV1).toHaveBeenCalledOnce()
  })

  it('does not invoke package code for unknown selectors or exact versions', () => {
    const compile = vi.fn()
    const validate = vi.fn(() => ({ok: true as const}))
    const configured = compiler(recipePackage([definition({compile, validate})]))
    expect(
      configured.createScenePlan({recipe: '@other/recipes/nope', source: 'hello'})
    ).toMatchObject({ok: false, diagnostics: [{code: 'scene-recipe-unknown'}]})
    const candidate = reviewed(compilePlan())
    candidate.recipe.version = 9
    expect(
      configured.createScenePlan({
        source: 'hello',
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-recipe-version-unsupported'}]
    })
    expect(compile).not.toHaveBeenCalled()
    expect(validate).not.toHaveBeenCalled()
  })

  it('rejects stale Reviewed candidates before invoking package validation', () => {
    const validate = vi.fn(() => ({ok: true as const}))
    const candidate = reviewed(compilePlan())
    const configured = compiler(recipePackage([definition({validate})]))
    validate.mockClear()

    expect(
      configured.createScenePlan({
        source: 'different',
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-source-stale'}]
    })
    expect(validate).not.toHaveBeenCalled()
  })

  it('passes only declared target corrections to compile and applies all declared kinds', () => {
    const compile = vi.fn(context => ({
      ok: true as const,
      draft: draft(context.source, context.messages.word)
    }))
    const validate = vi.fn(() => ({ok: true as const}))
    const result = compiler(recipePackage([definition({compile, validate})])).createScenePlan({
      recipe: recipeName,
      source: 'hello',
      corrections: [
        {
          id: 'target-review',
          kind: 'target',
          slot: 'word',
          anchor: 'reviewed-word',
          ranges: [{start: 0, end: 5, exactText: 'hello'}]
        },
        {id: 'label-review', kind: 'label', labelId: 'word-label', text: 'reviewed'},
        {
          id: 'relationship-review',
          kind: 'relationship',
          relationshipId: 'word-relationship',
          change: {legendText: 'reviewed: hello'}
        }
      ]
    })
    expect(result).toMatchObject({
      ok: true,
      plan: {
        targets: [{id: 'reviewed-word'}],
        labels: [{text: 'reviewed'}],
        relationships: [{targetIds: ['reviewed-word'], legendText: 'reviewed: hello'}]
      }
    })
    expect(compile.mock.calls[0]![0].targetCorrections).toHaveLength(1)
    expect(Object.isFrozen(compile.mock.calls[0]![0].targetCorrections)).toBe(true)
    const validationContext = (validate.mock.calls as unknown[][])[0]![0] as {
      appliedCorrections: readonly unknown[]
    }
    expect(validationContext.appliedCorrections).toHaveLength(3)
  })

  it('rejects unsafe target corrections before invoking compile', () => {
    const compile = vi.fn(context => ({
      ok: true as const,
      draft: draft(context.source)
    }))
    const result = compiler(recipePackage([definition({compile})])).createScenePlan({
      recipe: recipeName,
      source: 'hello',
      corrections: [
        {
          id: 'unsafe-target',
          kind: 'target',
          slot: 'word',
          anchor: 'word',
          ranges: [{start: 0, end: 5, exactText: 'wrong'}]
        }
      ]
    })
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-correction-invalid'}]
    })
    expect(compile).not.toHaveBeenCalled()
  })

  it('bounds target-correction ranges before invoking compile', () => {
    const compile = vi.fn()
    const result = compiler(
      recipePackage([
        definition({
          limits: {
            ...annotationRecipeLimitsV1,
            rangesPerTarget: 1,
            ranges: 1
          },
          compile
        })
      ])
    ).createScenePlan({
      recipe: recipeName,
      source: 'hello',
      corrections: [
        {
          id: 'bounded-target',
          kind: 'target',
          slot: 'word',
          anchor: 'word',
          ranges: [
            {start: 0, end: 2, exactText: 'he'},
            {start: 2, end: 5, exactText: 'llo'}
          ]
        }
      ]
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {name: 'rangesPerTarget', maximum: 1, actual: 2}
        }
      ]
    })
    expect(compile).not.toHaveBeenCalled()
  })

  it.each([
    ['target', {id: 'x', kind: 'target', slot: 'other', anchor: 'x', ranges: [{start: 0, end: 5, exactText: 'hello'}]}],
    ['label', {id: 'x', kind: 'label', labelId: 'other', text: 'x'}],
    ['relationship', {id: 'x', kind: 'relationship', relationshipId: 'other', change: {legendText: 'x'}}]
  ])('rejects undeclared %s corrections', (_kind, correction) => {
    expect(
      compiler().createScenePlan({
        recipe: recipeName,
        source: 'hello',
        corrections: [correction] as never
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-correction-invalid'}]
    })
  })

  it('runs closed graph and role validation before package validation', () => {
    const validate = vi.fn(() => ({ok: true as const}))
    const result = compiler(
      recipePackage([
        definition({
          compile: context => ({
            ok: true,
            draft: {
              ...draft(context.source),
              targets: [{...draft(context.source).targets[0]!, role: 'other'}]
            }
          }),
          validate
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-id-invalid'}]
    })
    expect(validate).not.toHaveBeenCalled()
  })

  it('keeps target identifiers at the core 80-code-unit boundary', () => {
    const id = 'x'.repeat(81)
    const result = compiler(
      recipePackage([
        definition({
          compile: context => {
            const value = draft(context.source)
            return {
              ok: true,
              draft: {
                ...value,
                targets: [{...value.targets[0]!, id}],
                relationships: [
                  {...value.relationships[0]!, targetIds: [id]}
                ]
              }
            }
          }
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-id-invalid'}]
    })
  })

  it('runs recipe identity validation for deterministic and Reviewed plans', () => {
    const validate = vi.fn(context =>
      context.draft.targets[0]?.id === 'word'
        ? {ok: true as const}
        : {
            ok: false as const,
            diagnostics: [
              {reason: 'identity-invalid', message: 'Unexpected identity.'}
            ] as const
          }
    )
    const invalidDefinition = definition({
      compile: context => {
        const value = draft(context.source)
        return {
          ok: true,
          draft: {
            ...value,
            targets: [{...value.targets[0]!, id: 'other'}],
            relationships: [
              {...value.relationships[0]!, targetIds: ['other']}
            ]
          }
        }
      },
      validate
    })
    expect(
      compiler(recipePackage([invalidDefinition])).createScenePlan({
        recipe: recipeName,
        source: 'hello'
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{recipeCode: `${recipeName}@1/identity-invalid`}]
    })

    const candidate = reviewed(compilePlan())
    const candidateRelationship = candidate.relationships[0]!
    if (candidateRelationship.kind !== 'describes') {
      throw new Error('Expected the fixture relationship to describe a target.')
    }
    candidate.targets = [{...candidate.targets[0]!, id: 'other'}]
    candidate.relationships = [
      {...candidateRelationship, targetIds: ['other']}
    ]
    expect(
      compiler(recipePackage([definition({validate})])).createScenePlan({
        source: 'hello',
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      diagnostics: [{recipeCode: `${recipeName}@1/identity-invalid`}]
    })
  })

  it.each([
    ['compile throw', () => { throw new Error('secret') }, 'package-compile-threw'],
    ['compile promise', () => Promise.resolve({ok: true}), 'package-compile-result-invalid'],
    ['compile null', () => null, 'package-compile-result-invalid'],
    [
      'compile result getter throw',
      () => Object.defineProperty({}, 'then', {
        get() {
          throw new Error('secret getter')
        }
      }),
      'package-compile-result-invalid'
    ]
  ])('maps %s to a stable recipe diagnostic', (_label, compile, suffix) => {
    const result = compiler(
      recipePackage([definition({compile: compile as never})])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{
        code: 'scene-recipe-rejected',
        recipeCode: `${recipeName}@1/${suffix}`
      }]
    })
  })

  it('preserves valid package diagnostic text and rejects malformed diagnostics', () => {
    expect(
      compiler(
        recipePackage([
          definition({
            compile: () => ({
              ok: false,
              diagnostics: [{reason: 'word-missing', message: 'Choose a word.'}]
            })
          })
        ])
      ).createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({
      ok: false,
      diagnostics: [{message: 'Choose a word.', recipeCode: `${recipeName}@1/word-missing`}]
    })
    expect(
      compiler(
        recipePackage([
          definition({
            compile: () => ({
              ok: false,
              diagnostics: [{reason: 'UPPER', message: 'invalid'}]
            })
          })
        ])
      ).createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({
      ok: false,
      diagnostics: [{recipeCode: `${recipeName}@1/package-diagnostic-invalid`}]
    })
  })

  it('strict-decodes diagnostic and candidate arrays without invoking accessors', () => {
    const getter = vi.fn(() => {
      throw new Error('candidate secret')
    })
    const diagnostics = [{reason: 'missing', message: 'Missing.'}]
    Object.defineProperty(diagnostics, Symbol('hidden'), {value: true})
    const candidates = [{start: 0, end: 1}]
    Object.defineProperty(candidates, 0, {enumerable: true, get: getter})
    for (const value of [
      diagnostics,
      [{reason: 'missing', message: 'Missing.', candidates}]
    ]) {
      expect(
        compiler(recipePackage([definition({
          compile: (() => ({ok: false, diagnostics: value})) as never
        })])).createScenePlan({recipe: recipeName, source: 'hello'})
      ).toMatchObject({
        ok: false,
        diagnostics: [
          {recipeCode: `${recipeName}@1/package-diagnostic-invalid`}
        ]
      })
    }
    expect(getter).not.toHaveBeenCalled()
  })

  it('consumes rejected async results without leaking their rejection', async () => {
    const compileResult = compiler(
      recipePackage([
        definition({
          compile: (() => Promise.reject(new Error('compile secret'))) as never
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    const validateResult = compiler(
      recipePackage([
        definition({
          validate: (() => Promise.reject(new Error('validate secret'))) as never
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(compileResult).toMatchObject({
      ok: false,
      diagnostics: [
        {recipeCode: `${recipeName}@1/package-compile-result-invalid`}
      ]
    })
    expect(validateResult).toMatchObject({
      ok: false,
      diagnostics: [
        {recipeCode: `${recipeName}@1/package-validate-result-invalid`}
      ]
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })

  it.each(['throwing getter', 'null override'] as const)(
    'consumes a rejected native Promise with a %s',
    async override => {
      const rejected = Promise.reject(new Error('hidden rejection'))
      Object.defineProperty(
        rejected,
        'then',
        override === 'throwing getter'
          ? {
              get() {
                throw new Error('hidden getter')
              }
            }
          : {value: null}
      )
      const result = compiler(
        recipePackage([
          definition({compile: (() => rejected) as never})
        ])
      ).createScenePlan({recipe: recipeName, source: 'hello'})
      expect(result).toMatchObject({
        ok: false,
        diagnostics: [
          {recipeCode: `${recipeName}@1/package-compile-result-invalid`}
        ]
      })
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
  )

  it.each(['compile', 'validate'] as const)(
    'consumes a rejected native Promise Proxy returned from %s',
    async hook => {
      const unhandled: unknown[] = []
      const onUnhandled = (reason: unknown) => unhandled.push(reason)
      process.on('unhandledRejection', onUnhandled)
      try {
        const rejected = Promise.reject(new Error(`${hook} secret`))
        const proxied = new Proxy(rejected, {
          get(target, property) {
            return property === 'then'
              ? target.then.bind(target)
              : Reflect.get(target, property, target)
          }
        })
        const recipe = hook === 'compile'
          ? definition({compile: (() => proxied) as never})
          : definition({validate: (() => proxied) as never})
        const result = compiler(recipePackage([recipe])).createScenePlan({
          recipe: recipeName,
          source: 'hello'
        })

        expect(result).toMatchObject({
          ok: false,
          diagnostics: [
            {recipeCode: `${recipeName}@1/package-${hook}-result-invalid`}
          ]
        })
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        expect(unhandled).toEqual([])
      } finally {
        process.off('unhandledRejection', onUnhandled)
      }
    }
  )

  it('strict-decodes drafts and applies package limits', () => {
    expect(
      compiler(
        recipePackage([
          definition({
            compile: context => ({
              ok: true,
              draft: {...draft(context.source), extra: true}
            } as never)
          })
        ])
      ).createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-field-unknown', path: ['draft', 'extra']}]
    })
    expect(
      compiler(
        recipePackage([
          definition({
            limits: {...annotationRecipeLimitsV1, targets: 1},
            compile: context => {
              const value = draft(context.source)
              return {
                ok: true,
                draft: {
                  ...value,
                  targets: [
                    value.targets[0]!,
                    {...value.targets[0]!, id: 'second'}
                  ]
                }
              }
            }
          })
        ])
      ).createScenePlan({recipe: recipeName, source: 'hello'})
    ).toMatchObject({
      ok: false,
      diagnostics: [
        {code: 'scene-plan-limit-exceeded', limit: {name: 'targets', maximum: 1, actual: 2}}
      ]
    })
  })

  it('rejects non-dense draft collections without invoking accessors', () => {
    const accessor = vi.fn(() => {
      throw new Error('collection secret')
    })
    const cases = [
      (value: AnnotationRecipeDraftV1) => {
        const targets = [...value.targets]
        delete targets[0]
        return {...value, targets}
      },
      (value: AnnotationRecipeDraftV1) => {
        const labels = [...value.labels]
        Object.defineProperty(labels, 'filter', {value: () => []})
        return {...value, labels}
      },
      (value: AnnotationRecipeDraftV1) => {
        const relationships = [...value.relationships]
        Object.defineProperty(relationships, 0, {
          enumerable: true,
          get: accessor
        })
        return {...value, relationships}
      },
      (value: AnnotationRecipeDraftV1) => {
        const gestures = [...value.gestures]
        Object.defineProperty(gestures, 0, {
          enumerable: false,
          value: gestures[0]
        })
        return {...value, gestures}
      }
    ]
    for (const makeDraft of cases) {
      expect(
        compiler(recipePackage([definition({
          compile: context => ({ok: true, draft: makeDraft(draft(context.source))})
        })])).createScenePlan({recipe: recipeName, source: 'hello'})
      ).toMatchObject({
        ok: false,
        diagnostics: [
          {recipeCode: `${recipeName}@1/package-compile-result-invalid`}
        ]
      })
    }
    expect(accessor).not.toHaveBeenCalled()
  })

  it('rejects unsafe ranges and unresolved references from package drafts', () => {
    const unsafeRange = compiler(
      recipePackage([
        definition({
          compile: context => {
            const value = draft(context.source)
            return {
              ok: true,
              draft: {
                ...value,
                targets: [
                  {
                    ...value.targets[0]!,
                    ranges: [
                      {
                        start: 0,
                        end: context.source.length + 1,
                        exactText: context.source
                      }
                    ]
                  }
                ]
              }
            }
          }
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    const unresolvedReference = compiler(
      recipePackage([
        definition({
          compile: context => {
            const value = draft(context.source)
            return {
              ok: true,
              draft: {
                ...value,
                relationships: [
                  {...value.relationships[0]!, targetIds: ['missing']}
                ]
              }
            }
          }
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(unsafeRange).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-range-invalid'}]
    })
    expect(unresolvedReference).toMatchObject({
      ok: false,
      diagnostics: [{code: 'scene-plan-reference-missing'}]
    })
  })

  it('rejects symbol fields and sparse oversized collections before cloning', () => {
    const hidden = Symbol('hidden-callback')
    const symbolResult = compiler(
      recipePackage([
        definition({
          compile: context => {
            const value = draft(context.source)
            const target = {...value.targets[0]!, [hidden]: () => undefined}
            return {
              ok: true,
              draft: {...value, targets: [target]}
            }
          }
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    const sparseTargets: unknown[] = []
    sparseTargets.length = annotationRecipeLimitsV1.targets + 1
    const sparseResult = compiler(
      recipePackage([
        definition({
          compile: context => ({
            ok: true,
            draft: {...draft(context.source), targets: sparseTargets}
          }) as never
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(symbolResult).toMatchObject({
      ok: false,
      diagnostics: [
        {code: 'scene-plan-field-unknown', path: ['draft', 'targets', 0, '<symbol>']}
      ]
    })
    expect(sparseResult).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {
            name: 'targets',
            maximum: annotationRecipeLimitsV1.targets,
            actual: annotationRecipeLimitsV1.targets + 1
          }
        }
      ]
    })
  })

  it.each([
    ['unknown kind', {kind: 'unknown', targetIds: 'targetIds'}],
    [
      'malformed relates endpoints',
      {kind: 'relates', fromTargetIds: 1, toTargetIds: 'toTargetIds'}
    ]
  ])('bounds every present relationship array for %s before iteration', (_label, shape) => {
    const endpointIds = new Array<string>(
      annotationRecipeLimitsV1.targetReferencesPerRelationship + 1
    )
    const iterator = vi.fn(() => {
      throw new Error('must not iterate oversized endpoints')
    })
    Object.defineProperty(endpointIds, Symbol.iterator, {value: iterator})
    const relationship = Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [
        key,
        value === 'targetIds' || value === 'toTargetIds' ? endpointIds : value
      ])
    )
    const result = compiler(
      recipePackage([
        definition({
          compile: context => ({
            ok: true,
            draft: {
              ...draft(context.source),
              relationships: [relationship]
            }
          }) as never
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {
            name: 'targetReferencesPerRelationship',
            maximum: annotationRecipeLimitsV1.targetReferencesPerRelationship,
            actual:
              annotationRecipeLimitsV1.targetReferencesPerRelationship + 1
          }
        }
      ]
    })
    expect(iterator).not.toHaveBeenCalled()
  })

  it('rejects bounded relationship endpoints with a custom iterator without invoking it', () => {
    const endpointIds: [string, ...string[]] = ['word']
    const iterator = vi.fn(() => {
      throw new Error('must not invoke custom iterator')
    })
    Object.defineProperty(endpointIds, Symbol.iterator, {value: iterator})
    const result = compiler(
      recipePackage([
        definition({
          compile: context => {
            const value = draft(context.source)
            const relationship = value.relationships[0]!
            if (relationship.kind !== 'describes') {
              throw new Error('Expected a describes fixture relationship.')
            }
            return {
              ok: true,
              draft: {
                ...value,
                relationships: [
                  {...relationship, targetIds: endpointIds}
                ]
              }
            }
          }
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {recipeCode: `${recipeName}@1/package-compile-result-invalid`}
      ]
    })
    expect(iterator).not.toHaveBeenCalled()
  })

  it('bounds the aggregate relationship endpoint count before copying', () => {
    const maximum = annotationRecipeLimitsV1.targetReferencesPerRelationship
    const result = compiler(
      recipePackage([
        definition({
          compile: context => ({
            ok: true,
            draft: {
              ...draft(context.source),
              relationships: [{
                id: 'relation',
                kind: 'relates',
                relation: 'changes-to',
                labelId: 'word-label',
                fromTargetIds: Array.from(
                  {length: maximum},
                  () => 'word'
                ) as [string, ...string[]],
                toTargetIds: ['word'],
                detailKind: 'short-description',
                legendText: 'changes'
              }]
            }
          })
        })
      ])
    ).createScenePlan({recipe: recipeName, source: 'hello'})

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{
        code: 'scene-plan-limit-exceeded',
        limit: {
          name: 'targetReferencesPerRelationship',
          maximum,
          actual: maximum + 1
        }
      }]
    })
  })

  it.each([
    ['throw', () => { throw new Error('secret') }, 'package-validate-threw'],
    ['promise', () => Promise.resolve({ok: true}), 'package-validate-result-invalid'],
    ['null', () => null, 'package-validate-result-invalid'],
    [
      'result getter throw',
      () => Object.defineProperty({}, 'then', {
        get() {
          throw new Error('secret getter')
        }
      }),
      'package-validate-result-invalid'
    ]
  ])('maps validate %s without exposing package failures', (_label, validate, suffix) => {
    const result = compiler(
      recipePackage([definition({validate: validate as never})])
    ).createScenePlan({recipe: recipeName, source: 'hello'})
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{recipeCode: `${recipeName}@1/${suffix}`}]
    })
  })
})
