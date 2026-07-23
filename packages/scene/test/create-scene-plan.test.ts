import {describe, expect, it} from 'vitest'
import {
  createScenePlan,
  deriveAnnotationScene,
  type ScenePlanV1
} from '../src/index.js'

const referenceSource = `[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents`

function createReferencePlan(locale?: string): ScenePlanV1 {
  const result = createScenePlan({
    recipe: 'task-explainer',
    source: referenceSource,
    ...(locale === undefined ? {} : {locale})
  })
  if (!result.ok) {
    throw new Error(result.diagnostics.map(({code}) => code).join(', '))
  }
  return result.plan
}

function reviewedReferencePlan(): ScenePlanV1 {
  return {
    ...createReferencePlan(),
    provenance: {
      kind: 'reviewed-proposal',
      engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
      generator: {id: 'test-authoring-tool', version: '1.0.0'},
      review: {status: 'approved', id: 'review_01arz3ndektsv4rrffq69g5fav'}
    }
  }
}

function manyTargetReviewedPlan(): {source: string; plan: ScenePlanV1} {
  const source = `[ ] CLI-1 ${'x'.repeat(40)}`
  const result = createScenePlan({recipe: 'task-explainer', source})
  if (!result.ok) throw new Error('Expected the many-target fixture to compile.')
  const targets = Array.from({length: 33}, (_, index) => ({
    id: `target-${index}`,
    role: 'description' as const,
    semanticAnchor: {name: `target-${index}`},
    ranges: [
      {
        start: index,
        end: index + 1,
        exactText: source.slice(index, index + 1)
      }
    ] as const
  }))
  return {
    source,
    plan: {
      ...result.plan,
      targets,
      labels: [{id: 'fixture-label', text: 'fixture'}],
      relationships: [],
      gestures: [],
      provenance: reviewedReferencePlan().provenance
    }
  }
}

describe('createScenePlan recipe Interface', () => {
  it('materializes the reference task as one closed Scene plan', () => {
    const plan = createReferencePlan()

    expect(plan).toMatchObject({
      schema: 'mdx-handwritten/scene-plan',
      schemaVersion: 1,
      recipe: {name: 'task-explainer', version: 1},
      localization: {
        locale: 'en',
        catalog: {
          id: 'mdx-handwritten/task-explainer/reader-text',
          version: 1
        }
      },
      title: 'Task explainer',
      source: {
        text: referenceSource,
        identity: {
          normalization: 'trim-lf-v1',
          algorithm: 'sha256',
          digest: '2c79b786797663d91d551320a3554d19a4da2aac5a2955f9e3c1286d7ffee1ab'
        }
      },
      provenance: {
        kind: 'deterministic-recipe',
        engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
        appliedCorrections: []
      }
    })
    expect(plan.targets.map(({id}) => id)).toEqual([
      'state',
      'stable-id',
      'description',
      'tag:cli',
      'priority',
      'field:blocked_by'
    ])
    expect(plan.labels.map(({id}) => id)).toEqual([
      'state-label',
      'stable-id-label',
      'description-label',
      'tag-label',
      'priority-label',
      'field-label'
    ])
    expect(plan.relationships.map(({id}) => id)).toEqual([
      'state-annotation',
      'stable-id-annotation',
      'description-annotation',
      'tag-annotation',
      'priority-annotation',
      'field-annotation'
    ])
    expect(plan.gestures).toEqual(
      plan.relationships.map(({id}) => ({
        id: `${id}-gesture`,
        kind: 'annotate',
        relationshipId: id
      }))
    )
  })

  it('keeps the legacy Interface on the same source-safety path', () => {
    const input = {
      recipe: 'task-explainer',
      source: '[ ] CLI-1 unsafe \ud800 source'
    }

    expect(createScenePlan(input)).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-source-unpaired-surrogate'}]
    })
    expect(deriveAnnotationScene(input)).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-source-unpaired-surrogate'}]
    })
  })

  it('matches a published SHA-256 vector through the browser-safe Interface', () => {
    const result = createScenePlan({
      recipe: 'task-explainer',
      source: '[ ] CLI-1 abc'
    })

    expect(result).toMatchObject({
      ok: true,
      plan: {
        source: {
          identity: {
            digest: '1506fd5a9a34749ad0b17d777917f7f2e17122e566caca2d9680d899c86495f4'
          }
        }
      }
    })
  })

  it('rejects runtime union ambiguity and too many corrections', () => {
    expect(
      createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 abc',
        candidateJson: '{}'
      } as never)
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-input-invalid'}]
    })

    const corrections = Array.from({length: 17}, (_, index) => ({
      id: `label-${index}`,
      kind: 'label' as const,
      labelId: 'state-label',
      text: 'state'
    }))
    expect(
      createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 abc',
        corrections
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {name: 'semanticCorrections', maximum: 16, actual: 17}
        }
      ]
    })
  })

  it.each([
    [
      '[ ] CLI-1 #cli',
      'task-explainer@1/description-missing'
    ],
    [
      '[ ] CLI-1 Add export !highest',
      'task-explainer@1/metadata-invalid'
    ],
    [
      '[ ] CLI-1 Add export @owner:cli @owner:platform',
      'task-explainer@1/structured-key-conflict'
    ]
  ])('fails the closed task grammar for %s', (source, recipeCode) => {
    expect(
      createScenePlan({recipe: 'task-explainer', source})
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-recipe-rejected', recipeCode}]
    })
  })

  it('reports every bounded priority candidate instead of choosing one', () => {
    expect(
      createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 Add export !high !urgent'
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {
          code: 'scene-recipe-rejected',
          recipeCode: 'task-explainer@1/priority-ambiguous',
          candidates: [
            {start: 21, end: 26},
            {start: 27, end: 34}
          ]
        }
      ]
    })
  })

  it('applies sparse target, label, and relationship corrections before final validation', () => {
    const source = '[ ] CLI-1 ship export !high'
    const base = createScenePlan({recipe: 'task-explainer', source})
    if (!base.ok) throw new Error('Expected the correction fixture to compile.')
    const priority = base.plan.targets.find(({id}) => id === 'priority')!

    const result = createScenePlan({
      recipe: 'task-explainer',
      source,
      corrections: [
        {
          id: 'priority-target-review',
          kind: 'target',
          slot: 'priority',
          anchor: 'priority-reviewed',
          ranges: priority.ranges
        },
        {
          id: 'priority-label-review',
          kind: 'label',
          labelId: 'priority-label',
          text: 'reviewed urgency'
        },
        {
          id: 'priority-relationship-review',
          kind: 'relationship',
          relationshipId: 'priority-annotation',
          change: {legendText: 'reviewed urgency: !high'}
        }
      ]
    })

    expect(result).toMatchObject({
      ok: true,
      plan: {
        provenance: {
          kind: 'deterministic-recipe',
          appliedCorrections: [
            {kind: 'target', ref: 'priority-target-review'},
            {kind: 'label', ref: 'priority-label-review'},
            {kind: 'relationship', ref: 'priority-relationship-review'}
          ]
        }
      }
    })
    if (!result.ok) throw new Error('Expected corrections to pass.')
    expect(
      result.plan.targets.find(({id}) => id === 'priority-reviewed')
    ).toMatchObject({
      role: 'priority',
      semanticAnchor: {name: 'priority-reviewed'}
    })
    expect(
      result.plan.labels.find(({id}) => id === 'priority-label')?.text
    ).toBe('reviewed urgency')
    expect(
      result.plan.relationships.find(
        ({id}) => id === 'priority-annotation'
      )
    ).toMatchObject({
      targetIds: ['priority-reviewed'],
      legendText: 'reviewed urgency: !high'
    })
  })

  it('uses a declared target correction to resolve priority ambiguity', () => {
    const source = '[ ] CLI-1 ship export !high !urgent'
    const start = source.indexOf('!urgent')
    const result = createScenePlan({
      recipe: 'task-explainer',
      source,
      corrections: [
        {
          id: 'priority-choice',
          kind: 'target',
          slot: 'priority',
          anchor: 'priority-reviewed',
          ranges: [
            {start, end: start + '!urgent'.length, exactText: '!urgent'}
          ]
        }
      ]
    })

    expect(result).toMatchObject({
      ok: true,
      plan: {
        targets: expect.arrayContaining([
          {
            id: 'priority-reviewed',
            role: 'priority',
            semanticAnchor: {name: 'priority-reviewed'},
            ranges: [{start, end: start + 7, exactText: '!urgent'}]
          }
        ]),
        provenance: {
          appliedCorrections: [{kind: 'target', ref: 'priority-choice'}]
        }
      }
    })
  })

  it('rejects malformed, conflicting, and unresolved corrections without a partial plan', () => {
    const source = '[ ] CLI-1 ship export !high'
    const malformed = createScenePlan({
      recipe: 'task-explainer',
      source,
      corrections: [
        {
          id: 'bad-label',
          kind: 'label',
          labelId: 'priority-label',
          text: 'priority',
          executable: true
        }
      ]
    } as never)
    expect(malformed).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-correction-invalid'}]
    })

    const conflicting = createScenePlan({
      recipe: 'task-explainer',
      source,
      corrections: [
        {
          id: 'first-label',
          kind: 'label',
          labelId: 'priority-label',
          text: 'first'
        },
        {
          id: 'second-label',
          kind: 'label',
          labelId: 'priority-label',
          text: 'second'
        }
      ]
    })
    expect(conflicting).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-correction-invalid'}]
    })

    const unresolved = createScenePlan({
      recipe: 'task-explainer',
      source,
      corrections: [
        {
          id: 'missing-label',
          kind: 'label',
          labelId: 'missing',
          text: 'missing'
        }
      ]
    })
    expect(unresolved).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-correction-anchor-missing'}]
    })
  })

  it('rejects relationship corrections that change endpoint kind', () => {
    expect(
      createScenePlan({
        recipe: 'task-explainer',
        source: '[ ] CLI-1 ship export !high',
        corrections: [
          {
            id: 'priority-endpoints',
            kind: 'relationship',
            relationshipId: 'priority-annotation',
            change: {
              endpoints: {
                kind: 'relates',
                fromTargetIds: ['description'],
                toTargetIds: ['priority']
              }
            }
          }
        ]
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-correction-invalid'}]
    })
  })

  it('caps ambiguity candidates without returning a partial list', () => {
    const source = `[ ] CLI-1 title ${Array.from({length: 33}, () => '!high').join(' ')}`

    const result = createScenePlan({recipe: 'task-explainer', source})
    expect(result).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {name: 'diagnosticCandidates', maximum: 32, actual: 33}
        }
      ]
    })
    expect(result.diagnostics[0]).not.toHaveProperty('candidates')
  })
})

describe('createScenePlan candidate Interface', () => {
  it('revalidates one approved JSON candidate without changing its meaning', () => {
    const reviewedPlan = reviewedReferencePlan()

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(reviewedPlan)
      })
    ).toEqual({ok: true, plan: reviewedPlan, diagnostics: []})
  })

  it('rejects unknown fields recursively instead of ignoring them', () => {
    const reviewedPlan = reviewedReferencePlan()
    const target = reviewedPlan.targets[0]!
    const candidate = {
      ...reviewedPlan,
      targets: [{...target, geometry: {x: 1}}, ...reviewedPlan.targets.slice(1)]
    }

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {code: 'scene-plan-field-unknown', path: ['targets', 0, 'geometry']}
      ]
    })
  })

  it('rejects target IDs that do not belong to the installed Recipe grammar', () => {
    const candidate = structuredClone(reviewedReferencePlan())
    const state = candidate.targets.find(({id}) => id === 'state')!
    state.id = 'renamed-state'
    const relationship = candidate.relationships.find(
      ({id}) => id === 'state-annotation'
    )!
    if (relationship.kind !== 'describes') {
      throw new Error('Expected the state relationship to describe a target.')
    }
    relationship.targetIds = ['renamed-state']

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {code: 'scene-plan-id-invalid', path: ['targets', 0, 'id']}
      ]
    })
  })

  it('binds structured target identity to the exact addressed source key', () => {
    const candidate = structuredClone(reviewedReferencePlan())
    const tag = candidate.targets.find(({id}) => id === 'tag:cli')!
    tag.id = 'tag:fake'
    const relationship = candidate.relationships.find(
      ({id}) => id === 'tag-annotation'
    )!
    if (relationship.kind !== 'describes') {
      throw new Error('Expected the tag relationship to describe a target.')
    }
    relationship.targetIds = ['tag:fake']

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-id-invalid'}]
    })
  })

  it('rejects an invalid range without returning a partial plan', () => {
    const candidate = structuredClone(reviewedReferencePlan())
    const range = candidate.targets[0]!.ranges[0]! as {
      start: number
      end: number
      exactText: string
    }
    range.end = range.start

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {code: 'scene-plan-range-invalid', path: ['targets', 0, 'ranges', 0]}
      ]
    })
  })

  it('accepts only normalization-equivalent source and rejects one-character drift', () => {
    const reviewedPlan = reviewedReferencePlan()
    const equivalent = ` \r\n${referenceSource.replace(/\n/gu, '\r\n')}\r\n `

    expect(
      createScenePlan({
        source: equivalent,
        candidateJson: JSON.stringify(reviewedPlan)
      })
    ).toEqual({ok: true, plan: reviewedPlan, diagnostics: []})
    expect(
      createScenePlan({
        source: `${referenceSource}!`,
        candidateJson: JSON.stringify(reviewedPlan)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-source-stale'}]
    })
  })

  it('normalizes equivalent embedded candidate source before validating ranges', () => {
    const candidate = reviewedReferencePlan()
    candidate.source.text = ` \r\n${referenceSource.replace(/\n/gu, '\r\n')}\r\n `

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toEqual({
      ok: true,
      plan: reviewedReferencePlan(),
      diagnostics: []
    })
  })

  it('bounds candidate bytes before parsing JSON', () => {
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: ' '.repeat(65_537)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {name: 'candidateJsonBytes', maximum: 65_536, actual: 65_537}
        }
      ]
    })
  })

  it.each([
    [
      'unsupported schema',
      (plan: Record<string, unknown>) => {
        plan.schemaVersion = 2
      },
      'scene-plan-schema-unsupported'
    ],
    [
      'unsupported recipe',
      (plan: Record<string, unknown>) => {
        plan.recipe = {name: 'task-explainer', version: 2}
      },
      'scene-recipe-version-unsupported'
    ],
    [
      'unsupported catalog',
      (plan: Record<string, unknown>) => {
        plan.localization = {
          locale: 'en',
          catalog: {id: 'mdx-handwritten/task-explainer/reader-text', version: 2}
        }
      },
      'scene-plan-localization-invalid'
    ],
    [
      'deterministic provenance on candidate path',
      (plan: Record<string, unknown>) => {
        plan.provenance = {
          kind: 'deterministic-recipe',
          engine: {name: '@madinah/mdx-handwritten-scene', version: '0.1.0'},
          appliedCorrections: []
        }
      },
      'scene-plan-provenance-invalid'
    ]
  ] as const)('rejects %s', (_label, mutate, code) => {
    const candidate = structuredClone(reviewedReferencePlan()) as unknown as Record<
      string,
      unknown
    >
    mutate(candidate)

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({ok: false, plan: null, diagnostics: [{code}]})
  })

  it('rejects missing references and orphan graph payload', () => {
    const missing = structuredClone(reviewedReferencePlan())
    const firstRelationship = missing.relationships[0] as unknown as {
      targetIds: string[]
    }
    firstRelationship.targetIds = ['missing-target']
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(missing)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-reference-missing'}]
    })

    const orphanLabel = structuredClone(reviewedReferencePlan())
    ;(orphanLabel.labels as Array<{id: string; text: string}>).push({
      id: 'orphan-label',
      text: 'orphan'
    })
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(orphanLabel)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-reference-missing'}]
    })

    const orphanRelationship = structuredClone(reviewedReferencePlan())
    ;(orphanRelationship.relationships as Array<object>).push({
      id: 'orphan-annotation',
      kind: 'describes',
      labelId: 'state-label',
      targetIds: ['state'],
      detailKind: 'short-description',
      legendText: 'orphan: [ ]'
    })
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(orphanRelationship)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-reference-missing'}]
    })
  })

  it('rejects cross-target overlap, exact-text drift, and surrogate splitting', () => {
    const overlap = structuredClone(reviewedReferencePlan())
    const overlappingRange = overlap.targets[1]!.ranges[0]! as {
      start: number
      end: number
      exactText: string
    }
    overlappingRange.start = 2
    overlappingRange.exactText = referenceSource.slice(2, overlappingRange.end)
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(overlap)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-range-overlap'}]
    })

    const textMismatch = structuredClone(reviewedReferencePlan())
    const mismatchRange = textMismatch.targets[0]!.ranges[0]! as {
      exactText: string
    }
    mismatchRange.exactText = '[x]'
    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(textMismatch)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-text-mismatch'}]
    })

    const emojiSource = '[ ] CLI-1 Add 😀 export'
    const emojiResult = createScenePlan({
      recipe: 'task-explainer',
      source: emojiSource
    })
    if (!emojiResult.ok) throw new Error('Expected emoji recipe to compile.')
    expect(emojiResult.plan.source.identity.digest).toBe(
      'cb5d20493fc0823b6105d30487050f239246f9bf1fb76edda68453d5478e80b7'
    )
    const emojiPlan = {
      ...emojiResult.plan,
      provenance: reviewedReferencePlan().provenance
    }
    const emoji = emojiSource.indexOf('😀')
    const description = emojiPlan.targets.find(({id}) => id === 'description')!
    ;(description.ranges as unknown as Array<{
      start: number
      end: number
      exactText: string
    }>)[0] = {
      start: emoji + 1,
      end: emoji + 2,
      exactText: emojiSource.slice(emoji + 1, emoji + 2)
    }
    expect(
      createScenePlan({
        source: emojiSource,
        candidateJson: JSON.stringify(emojiPlan)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-range-surrogate-split'}]
    })
  })

  it('canonicalizes target order after validating the complete graph', () => {
    const candidate = reviewedReferencePlan()
    candidate.targets = [...candidate.targets].reverse()
    const result = createScenePlan({
      source: referenceSource,
      candidateJson: JSON.stringify(candidate)
    })

    expect(result).toMatchObject({ok: true})
    if (!result.ok) throw new Error('Expected candidate to pass.')
    expect(result.plan.targets.map(({id}) => id)).toEqual(
      createReferencePlan().targets.map(({id}) => id)
    )
  })

  it('applies the relationship reference cap to both relates endpoints together', () => {
    const {source, plan} = manyTargetReviewedPlan()
    const targetIds = plan.targets.map(({id}) => id)
    plan.relationships = [
      {
        id: 'fixture-relationship',
        kind: 'relates',
        relation: 'contrasts',
        labelId: 'fixture-label',
        fromTargetIds: targetIds.slice(0, 16) as [string, ...string[]],
        toTargetIds: targetIds.slice(16) as [string, ...string[]],
        detailKind: 'short-description',
        legendText: 'fixture relation'
      }
    ]
    plan.gestures = [
      {
        id: 'fixture-gesture',
        kind: 'connect',
        relationshipId: 'fixture-relationship'
      }
    ]

    expect(
      createScenePlan({source, candidateJson: JSON.stringify(plan)})
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [
        {
          code: 'scene-plan-limit-exceeded',
          limit: {
            name: 'targetReferencesPerRelationship',
            maximum: 32,
            actual: 33
          }
        }
      ]
    })
  })

  it('does not apply the relationship reference cap to emphasize gestures', () => {
    const {source, plan} = manyTargetReviewedPlan()
    const targetIds = plan.targets.map(({id}) => id)
    plan.labels = [
      {id: 'fixture-label-a', text: 'fixture A'},
      {id: 'fixture-label-b', text: 'fixture B'}
    ]
    plan.relationships = [
      {
        id: 'fixture-relationship-a',
        kind: 'describes',
        labelId: 'fixture-label-a',
        targetIds: targetIds.slice(0, 32) as [string, ...string[]],
        detailKind: 'short-description',
        legendText: 'fixture relation A'
      },
      {
        id: 'fixture-relationship-b',
        kind: 'describes',
        labelId: 'fixture-label-b',
        targetIds: [targetIds[32]!],
        detailKind: 'short-description',
        legendText: 'fixture relation B'
      }
    ]
    plan.gestures = [
      {
        id: 'fixture-annotation-a',
        kind: 'annotate',
        relationshipId: 'fixture-relationship-a'
      },
      {
        id: 'fixture-annotation-b',
        kind: 'annotate',
        relationshipId: 'fixture-relationship-b'
      },
      {
        id: 'fixture-emphasis',
        kind: 'emphasize',
        targetIds: targetIds as [string, ...string[]],
        intent: 'attention'
      }
    ]

    expect(
      createScenePlan({source, candidateJson: JSON.stringify(plan)})
    ).toMatchObject({ok: true, diagnostics: []})
  })

  it('requires every emphasized target to retain a readable relationship legend', () => {
    const candidate = structuredClone(reviewedReferencePlan())
    const priority = candidate.targets.find(({id}) => id === 'priority')!
    candidate.targets = [priority]
    candidate.labels = []
    candidate.relationships = []
    candidate.gestures = [
      {
        id: 'priority-warning',
        kind: 'emphasize',
        targetIds: ['priority'],
        intent: 'warning'
      }
    ]

    expect(
      createScenePlan({
        source: referenceSource,
        candidateJson: JSON.stringify(candidate)
      })
    ).toMatchObject({
      ok: false,
      plan: null,
      diagnostics: [{code: 'scene-plan-reference-missing'}]
    })
  })
})
