import { createScenePlan, type ScenePlanV1 } from '@madinah/mdx-handwritten-scene'
import { HandConnector } from './icons.js'

export type HandSceneProps =
  | {
      plan: ScenePlanV1
      recipe?: never
      source?: never
      locale?: never
    }
  | {
      plan?: never
      recipe: string
      source: string
      locale?: string
    }

interface TargetRange {
  end: number
  start: number
  target: ScenePlanV1['targets'][number]
}

function targetRanges(plan: ScenePlanV1): TargetRange[] {
  return plan.targets
    .flatMap((target) => target.ranges.map((range) => ({ ...range, target })))
    .sort((left, right) => left.start - right.start || left.end - right.end)
}

function renderSource(plan: ScenePlanV1) {
  const source = plan.source.text
  const ranges = targetRanges(plan)
  const content = []
  let cursor = 0

  for (const [index, range] of ranges.entries()) {
    if (range.start < cursor || range.end <= range.start || range.end > source.length) continue

    content.push(source.slice(cursor, range.start))
    const emphases = plan.gestures.filter(
      (
        gesture,
      ): gesture is Extract<
        ScenePlanV1['gestures'][number],
        { kind: 'emphasize' }
      > =>
        gesture.kind === 'emphasize' &&
        gesture.targetIds.includes(range.target.id),
    )
    const exactText = source.slice(range.start, range.end)
    content.push(
      emphases.length > 0 ? (
        <mark
          data-hw-gesture="emphasize"
          data-hw-gestures={emphases.map(({ id }) => id).join(' ')}
          data-hw-intent={emphases.map(({ intent }) => intent).join(' ')}
          data-hw-target={range.target.id}
          data-hw-target-role={range.target.role}
          key={index}
        >
          {exactText}
        </mark>
      ) : (
        <span data-hw-target={range.target.id} data-hw-target-role={range.target.role} key={index}>
          {exactText}
        </span>
      ),
    )
    cursor = range.end
  }

  content.push(source.slice(cursor))
  return content
}

function relationshipTargetIds(
  relationship: ScenePlanV1['relationships'][number],
): readonly string[] {
  return relationship.kind === 'describes'
    ? relationship.targetIds
    : [...relationship.fromTargetIds, ...relationship.toTargetIds]
}

function renderPlan(plan: ScenePlanV1) {
  const locale = plan.localization.locale

  return (
    <figure
      data-hw-locale={locale}
      data-hw-scene={plan.recipe.name}
      data-hw-scene-version={plan.recipe.version}
      data-hw-scene-schema={plan.schemaVersion}
    >
      <figcaption data-hw-scene-caption="" lang={locale}>
        {plan.title}
      </figcaption>
      <pre data-hw-scene-source="">
        <code>{renderSource(plan)}</code>
      </pre>
      <ol data-hw-scene-legend="" lang={locale}>
        {plan.relationships.map((relationship) => {
          const targetIds = relationshipTargetIds(relationship)
          const firstTargetId = targetIds[0]
          const role = plan.targets.find((target) => target.id === firstTargetId)?.role
          const gestures = plan.gestures.filter(
            (gesture) =>
              gesture.kind !== 'emphasize' &&
              gesture.relationshipId === relationship.id,
          )
          const gestureKinds = gestures.map(({ kind }) => kind)
          const verdictIntents = gestures.flatMap((gesture) =>
            gesture.kind === 'verdict' ? [gesture.intent] : [],
          )
          const connectorKind = gestureKinds.includes('connect')
            ? 'straight'
            : gestureKinds.includes('annotate')
              ? 'curved'
              : undefined
          const isVerdict = gestureKinds.includes('verdict')

          return (
            <li
              data-hw-annotation={relationship.id}
              data-hw-annotation-role={role}
              data-hw-gesture={gestureKinds.join(' ') || undefined}
              data-hw-gestures={gestures.map(({ id }) => id).join(' ') || undefined}
              data-hw-intent={verdictIntents.join(' ') || undefined}
              data-hw-relation={relationship.kind === 'relates' ? relationship.relation : undefined}
              data-hw-relationship={relationship.kind}
              data-hw-targets={targetIds.join(' ')}
              key={relationship.id}
            >
              {isVerdict ? (
                <mark data-hw-annotation-text="" data-hw-verdict="">
                  {relationship.legendText}
                </mark>
              ) : (
                <span data-hw-annotation-text="">{relationship.legendText}</span>
              )}
              {connectorKind === undefined ? null : <HandConnector kind={connectorKind} />}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

function hasMaterializedPlan(
  props: HandSceneProps,
): props is Extract<HandSceneProps, { plan: ScenePlanV1 }> {
  return props.plan !== undefined
}

/**
 * Renders a deterministic Annotation scene without hydration or browser
 * measurement. The canonical source remains the first readable content and the
 * complete textual legend remains available when presentation styles fail.
 */
export function HandScene(props: HandSceneProps) {
  if (hasMaterializedPlan(props)) return renderPlan(props.plan)

  const { recipe, source, locale } = props
  const result = createScenePlan(
    locale === undefined ? { recipe, source } : { locale, recipe, source },
  )

  if (!result.ok) {
    return (
      <pre data-hw-scene={recipe} data-hw-scene-invalid="">
        <code>{source}</code>
      </pre>
    )
  }

  return renderPlan(result.plan)
}
