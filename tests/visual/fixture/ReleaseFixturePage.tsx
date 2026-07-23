import {
  HandAnnotate,
  HandBrace,
  HandLink,
  HandMargin,
  HandMark,
  HandNote,
  HandScene,
  HandText,
  HandWatermark
} from '@madinah/mdx-handwritten-react'
import manifest from '../../../visual-fixtures.json'

interface SceneFixture {
  expected: {
    caption: string
    legend: Array<{targets: string[]; text: string}>
  }
  id: string
  kind: 'scene'
  locale: string
  recipe: string
  recipeVersion: number
  source: string
  sourceLanguage: string
}

interface InvalidSceneFixture {
  id: string
  kind: 'invalid-scene'
  recipe: string
  source: string
  sourceLanguage: string
}

function GestureSuite({direction}: {direction: 'ltr' | 'rtl'}) {
  const rtl = direction === 'rtl'
  const labels = rtl
    ? {
        annotate: 'معرّف ثابت',
        brace: 'وحدة إصدار واحدة',
        link: 'اقرأ الإعداد',
        mark: 'تحقّق من هذا الافتراض',
        margin: 'أبقِ هذا قريبًا من القرار',
        note: 'تم تحديث المواصفات في الالتزام نفسه',
        text: 'الملاحظات البشرية الصغيرة تبني الثقة.',
        watermark: 'تمت المراجعة'
      }
    : {
        annotate: 'stable ID',
        brace: 'one release unit',
        link: 'Read the setup',
        mark: 'Check this assumption',
        margin: 'keep this near the decision',
        note: 'Spec updated in the same commit',
        text: 'Small human notes make technical documents easier to trust.',
        watermark: 'reviewed'
      }

  return (
    <div
      className="gesture-capture"
      data-fixture-id={`gestures-${direction}`}
      dir={direction}
      lang={rtl ? 'ar' : 'en'}
    >
      <section className="hw-scope release-fixture">
        <header className="fixture-heading">
          <p lang="en">Canonical content fixture</p>
          <h1 lang="en">Eight Annotation gestures</h1>
        </header>

        <div className="gesture-grid">
          <article>
            <h2 lang="en">Text, link, mark, annotate</h2>
            <p><HandText rotate="-1" size="lg" tone="muted">{labels.text}</HandText></p>
            <p><HandLink href="#fixture-end" icon="arrow-forward" tone="accent">{labels.link}</HandLink></p>
            <p><HandMark kind="highlight" strength="strong" tone="warning">{labels.mark}</HandMark></p>
            <p className="gesture-annotation">
              <span lang="en">Reference</span>{' '}
              <HandAnnotate label={labels.annotate} placement="block-start-inline-end" tone="info"><span lang="en">CLI-042</span></HandAnnotate>
            </p>
          </article>

          <article>
            <h2 lang="en">Note, brace, margin, watermark</h2>
            <HandNote appearance="tape" icon="check" tone="success">{labels.note}</HandNote>
            <HandBrace label={labels.brace} side="inline-end" tone="accent">
              <ul lang="en"><li>source</li><li>tests</li><li>specification</li></ul>
            </HandBrace>
            <HandMargin label={labels.margin} side="inline-start">
              <p lang="en">The decision remains in document flow.</p>
            </HandMargin>
            <HandWatermark label={labels.watermark} placement="block-end-inline-end" tone="success">
              <p id="fixture-end" lang="en">Meaningful content stays readable.</p>
            </HandWatermark>
          </article>
        </div>
      </section>
    </div>
  )
}

function isSceneFixture(value: (typeof manifest.fixtures)[number]): value is SceneFixture {
  return value.kind === 'scene'
}

function isInvalidSceneFixture(
  value: (typeof manifest.fixtures)[number]
): value is InvalidSceneFixture {
  return value.kind === 'invalid-scene'
}

export function ReleaseFixturePage() {
  const scenes = manifest.fixtures.filter(isSceneFixture)
  const invalidScenes = manifest.fixtures.filter(isInvalidSceneFixture)

  return (
    <main data-release-fixtures="">
      <GestureSuite direction="ltr" />
      <GestureSuite direction="rtl" />

      {scenes.map((fixture) => (
        <section
          className="hw-scope release-fixture"
          data-fixture-id={fixture.id}
          key={fixture.id}
          lang={fixture.sourceLanguage}
        >
          <header className="fixture-heading">
            <p>Canonical content fixture</p>
            <h1>{fixture.recipe}@{fixture.recipeVersion} · {fixture.locale}</h1>
          </header>
          <HandScene
            locale={fixture.locale}
            recipe={fixture.recipe}
            source={fixture.source}
          />
        </section>
      ))}

      {invalidScenes.map((fixture) => (
        <section
          className="hw-scope release-fixture"
          data-fixture-id={fixture.id}
          key={fixture.id}
          lang={fixture.sourceLanguage}
        >
          <header className="fixture-heading">
            <p>Fail-closed fixture</p>
            <h1>{fixture.recipe} · invalid input</h1>
          </header>
          <HandScene recipe={fixture.recipe} source={fixture.source} />
        </section>
      ))}
    </main>
  )
}
