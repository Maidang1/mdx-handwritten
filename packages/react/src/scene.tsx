import { deriveAnnotationScene, type AnnotationScenePlanV1 } from 'mdx-handwritten-scene'
import { HandConnector } from './icons.js'

export interface HandSceneProps {
  recipe: string
  source: string
  locale?: string
}

interface TargetRange {
  end: number
  start: number
  target: AnnotationScenePlanV1['targets'][number]
}

function targetRanges(plan: AnnotationScenePlanV1): TargetRange[] {
  return plan.targets
    .flatMap((target) => target.ranges.map((range) => ({ ...range, target })))
    .sort((left, right) => left.start - right.start || left.end - right.end)
}

function renderSource(plan: AnnotationScenePlanV1) {
  const ranges = targetRanges(plan)
  const content = []
  let cursor = 0

  for (const [index, range] of ranges.entries()) {
    if (range.start < cursor || range.end <= range.start || range.end > plan.source.length) continue

    content.push(plan.source.slice(cursor, range.start))
    content.push(
      <span data-hw-target={range.target.id} data-hw-target-role={range.target.role} key={index}>
        {plan.source.slice(range.start, range.end)}
      </span>,
    )
    cursor = range.end
  }

  content.push(plan.source.slice(cursor))
  return content
}

/**
 * Renders a deterministic Annotation scene without hydration or browser
 * measurement. The canonical source remains the first readable content and the
 * complete textual legend remains available when presentation styles fail.
 */
export function HandScene({ recipe, source, locale }: HandSceneProps) {
  const result = deriveAnnotationScene(
    locale === undefined ? { recipe, source } : { locale, recipe, source },
  )

  if (!result.ok) {
    return (
      <pre data-hw-scene={recipe} data-hw-scene-invalid="">
        <code>{source}</code>
      </pre>
    )
  }

  const { plan } = result

  return (
    <figure
      data-hw-locale={plan.locale}
      data-hw-scene={plan.recipe.name}
      data-hw-scene-version={plan.recipe.version}
    >
      <figcaption data-hw-scene-caption="" lang={plan.locale}>
        {plan.title}
      </figcaption>
      <pre data-hw-scene-source="">
        <code>{renderSource(plan)}</code>
      </pre>
      <ol data-hw-scene-legend="" lang={plan.locale}>
        {plan.annotations.map((annotation) => {
          const firstTargetId = annotation.targetIds[0]
          const role = plan.targets.find((target) => target.id === firstTargetId)?.role

          return (
            <li
              data-hw-annotation={annotation.id}
              data-hw-annotation-role={role}
              data-hw-targets={annotation.targetIds.join(' ')}
              key={annotation.id}
            >
              <span data-hw-annotation-text="">{annotation.fallback}</span>
              <HandConnector kind="curved" />
            </li>
          )
        })}
      </ol>
    </figure>
  )
}
