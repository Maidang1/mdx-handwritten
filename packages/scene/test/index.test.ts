import {describe, expect, it} from 'vitest'
import {
  annotationRecipeNames,
  deriveAnnotationScene,
  type AnnotationSceneDiagnosticCode,
  type AnnotationScenePlanV1
} from '../src/index.js'

const referenceSource = `[ ] CLI-042 Add export command #cli !high @blocked_by:CLI-041
Write task output as JSON for scripts and agents`

function derivePlan(
  source: string,
  locale?: string
): AnnotationScenePlanV1 {
  const input = locale
    ? {recipe: 'task-explainer', source, locale}
    : {recipe: 'task-explainer', source}
  const result = deriveAnnotationScene(input)
  if (!result.ok) {
    throw new Error(result.diagnostics.map(({code}) => code).join(', '))
  }
  return result.plan
}

describe('public Interface', () => {
  it('exports the supported Annotation recipe names', () => {
    expect(annotationRecipeNames).toEqual(['task-explainer'])
  })

  it('derives the reference task with exact roles and UTF-16 ranges', () => {
    const plan = derivePlan(referenceSource)

    expect(plan).toMatchObject({
      schemaVersion: 1,
      recipe: {name: 'task-explainer', version: 1},
      locale: 'en',
      title: 'Task explainer',
      source: referenceSource
    })
    expect(plan.targets).toEqual([
      {
        id: 'state',
        role: 'state',
        exactText: '[ ]',
        ranges: [{start: 0, end: 3}]
      },
      {
        id: 'stable-id',
        role: 'stable-id',
        exactText: 'CLI-042',
        ranges: [{start: 4, end: 11}]
      },
      {
        id: 'description',
        role: 'description',
        exactText:
          'Add export command\nWrite task output as JSON for scripts and agents',
        ranges: [
          {start: 12, end: 30},
          {start: 62, end: 110}
        ]
      },
      {
        id: 'tag',
        role: 'tag',
        exactText: '#cli',
        ranges: [{start: 31, end: 35}]
      },
      {
        id: 'priority',
        role: 'priority',
        exactText: '!high',
        ranges: [{start: 36, end: 41}]
      },
      {
        id: 'field',
        role: 'field',
        exactText: '@blocked_by:CLI-041',
        ranges: [{start: 42, end: 61}]
      }
    ])
    expect(plan.annotations).toEqual([
      {
        id: 'state-annotation',
        label: 'open task',
        targetIds: ['state'],
        fallback: 'open task: [ ]'
      },
      {
        id: 'stable-id-annotation',
        label: 'stable ID',
        targetIds: ['stable-id'],
        fallback: 'stable ID: CLI-042'
      },
      {
        id: 'description-annotation',
        label: 'description',
        targetIds: ['description'],
        fallback:
          'description: Add export command\nWrite task output as JSON for scripts and agents'
      },
      {
        id: 'tag-annotation',
        label: 'tag',
        targetIds: ['tag'],
        fallback: 'tag: #cli'
      },
      {
        id: 'priority-annotation',
        label: 'priority',
        targetIds: ['priority'],
        fallback: 'priority: !high'
      },
      {
        id: 'field-annotation',
        label: 'custom field',
        targetIds: ['field'],
        fallback: 'custom field: @blocked_by:CLI-041'
      }
    ])
  })
})

describe('task semantics', () => {
  it('recognizes a checked task with the optional list prefix', () => {
    const plan = derivePlan('- [x] AUTH-004 Add passwordless login')

    expect(plan.targets[0]).toEqual({
      id: 'state',
      role: 'state',
      exactText: '[x]',
      ranges: [{start: 2, end: 5}]
    })
    expect(plan.annotations[0]).toEqual({
      id: 'state-annotation',
      label: 'completed task',
      targetIds: ['state'],
      fallback: 'completed task: [x]'
    })
  })

  it('localizes the title, labels, and linear fallbacks', () => {
    const plan = derivePlan('[ ] AUTH-004 添加无密码登录 #认证 !urgent', 'zh-CN')

    expect(plan.title).toBe('任务解析')
    expect(plan.annotations.map(({label, fallback}) => ({label, fallback}))).toEqual([
      {label: '未完成任务', fallback: '未完成任务：[ ]'},
      {label: '稳定 ID', fallback: '稳定 ID：AUTH-004'},
      {label: '描述', fallback: '描述：添加无密码登录'},
      {label: '标签', fallback: '标签：#认证'},
      {label: '优先级', fallback: '优先级：!urgent'}
    ])
  })

  it.each([
    ['EN', 'en'],
    ['zh-cn', 'zh-CN'],
    ['ZH-CN', 'zh-CN']
  ] as const)('canonicalizes the exact catalog locale %s', (locale, canonical) => {
    expect(derivePlan('[ ] AUTH-004 Add passwordless login', locale).locale).toBe(
      canonical
    )
  })

  it('omits absent optional metadata and groups repeated metadata targets', () => {
    const minimal = derivePlan('[ ] AUTH-004 Add passwordless login')
    expect(minimal.targets.map(({role}) => role)).toEqual([
      'state',
      'stable-id',
      'description'
    ])

    const repeated = derivePlan(
      '[ ] AUTH-004 Add passwordless login #auth #security @owner:iam @team:platform'
    )
    expect(repeated.targets.map(({id}) => id)).toEqual([
      'state',
      'stable-id',
      'description',
      'tag',
      'tag-2',
      'field',
      'field-2'
    ])
    expect(repeated.annotations.find(({id}) => id === 'tag-annotation')).toMatchObject({
      targetIds: ['tag', 'tag-2'],
      fallback: 'tag: #auth, #security'
    })
  })
})

describe('stable diagnostics', () => {
  const cases: Array<[
    string,
    Parameters<typeof deriveAnnotationScene>[0],
    AnnotationSceneDiagnosticCode
  ]> = [
    [
      'unknown recipe',
      {recipe: 'unknown', source: '[ ] CLI-042 Add export command'},
      'scene-recipe-unknown'
    ],
    [
      'unsupported locale',
      {
        recipe: 'task-explainer',
        source: '[ ] CLI-042 Add export command',
        locale: 'fr'
      },
      'scene-locale-unsupported'
    ],
    [
      'empty source',
      {recipe: 'task-explainer', source: ' \r\n '},
      'scene-source-empty'
    ],
    [
      'source over 4096 UTF-16 code units',
      {recipe: 'task-explainer', source: 'x'.repeat(4097)},
      'scene-source-too-long'
    ],
    [
      'invalid task syntax',
      {recipe: 'task-explainer', source: '[ ] cli-42 invalid identifier'},
      'scene-task-syntax-invalid'
    ],
    [
      'ambiguous priority',
      {
        recipe: 'task-explainer',
        source: '[ ] CLI-042 Add export command !high !urgent'
      },
      'scene-task-priority-ambiguous'
    ]
  ]

  for (const [label, input, code] of cases) {
    it(`returns ${label} without throwing`, () => {
      expect(() => deriveAnnotationScene(input)).not.toThrow()
      const result = deriveAnnotationScene(input)
      expect(result).toMatchObject({
        ok: false,
        plan: null,
        diagnostics: [{code}]
      })
    })
  }

  it.each(['task-explainer@1', 'task-explainer@^1'])(
    'rejects author-facing recipe version syntax for %s',
    recipe => {
      expect(
        deriveAnnotationScene({
          recipe,
          source: '[ ] CLI-042 Add export command'
        })
      ).toMatchObject({
        ok: false,
        plan: null,
        diagnostics: [{code: 'scene-recipe-unknown'}]
      })
    }
  )

  it.each(['en-US', 'zh', 'zh-Hans', 'zh-CN-x-blog', ' zh-CN'])(
    'rejects unsupported locale lookup or trimming for %s',
    locale => {
      expect(
        deriveAnnotationScene({
          recipe: 'task-explainer',
          source: '[ ] CLI-042 Add export command',
          locale
        })
      ).toMatchObject({
        ok: false,
        plan: null,
        diagnostics: [{code: 'scene-locale-unsupported'}]
      })
    }
  )
})

describe('normalization and determinism', () => {
  it('normalizes line endings before assigning ranges', () => {
    const plan = derivePlan(
      '  \r\n[ ] CLI-9 Add 🧭 export #工具\r\n  细节 😀  \r\n'
    )

    expect(plan.source).toBe('[ ] CLI-9 Add 🧭 export #工具\n  细节 😀')
    expect(plan.targets.find(({id}) => id === 'description')).toMatchObject({
      exactText: 'Add 🧭 export\n细节 😀',
      ranges: [
        {start: 10, end: 23},
        {start: 30, end: 35}
      ]
    })
  })

  it('is deterministic and every range slices to its declared exact text', () => {
    const first = derivePlan(referenceSource)
    const second = derivePlan(referenceSource)
    expect(second).toEqual(first)

    for (const target of first.targets) {
      expect(
        target.ranges
          .map(({start, end}) => first.source.slice(start, end))
          .join('\n')
      ).toBe(target.exactText)
    }
  })
})
