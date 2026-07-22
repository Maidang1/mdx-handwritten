import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import {expect, type Page, test} from '@playwright/test'
import {annotationRecipeNames} from 'mdx-handwritten-scene'

interface FixtureManifest {
  fixtures: Array<{
    id: string
    kind: string
    locale?: string
    recipe?: string
    recipeVersion?: number
    source?: string
    sourceLanguage?: string
    expected?: {
      caption: string
      legend: Array<{targets: string[]; text: string}>
    }
  }>
  fallbackStates: string[]
  localizationLocales: string[]
  runner: {
    container: string
    playwrightVersion: string
    screenshotProject: string
  }
  viewports: Record<'narrow' | 'wide', {height: number; width: number}>
}

const manifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../visual-fixtures.json', import.meta.url)),
    'utf8'
  )
) as FixtureManifest

async function openFixtures(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-release-fixtures]')).toBeVisible()
  await page.evaluate(async () => document.fonts.ready)
}

test('the manifest covers both directions and every shipped recipe catalog', () => {
  const ids = manifest.fixtures.map(({id}) => id)
  expect(ids).toContain('gestures-ltr')
  expect(ids).toContain('gestures-rtl')

  for (const recipe of annotationRecipeNames) {
    for (const locale of manifest.localizationLocales) {
      expect(
        manifest.fixtures.some(
          (fixture) =>
            fixture.kind === 'scene' &&
            fixture.recipe === recipe &&
            fixture.locale === locale
        )
      ).toBe(true)
    }
  }
})

test('renders each Annotation gesture exactly once in both directions', async ({page}) => {
  await openFixtures(page)

  const gestureNames = [
    'text',
    'link',
    'mark',
    'annotate',
    'note',
    'brace',
    'margin',
    'watermark'
  ]
  for (const direction of ['ltr', 'rtl']) {
    const fixture = page.locator(`[data-fixture-id="gestures-${direction}"]`)
    await expect(fixture.locator('[data-hw]')).toHaveCount(gestureNames.length)
    for (const gestureName of gestureNames) {
      await expect(fixture.locator(`[data-hw="${gestureName}"]`)).toHaveCount(1)
    }
  }
})

test('marks English reader text explicitly inside the RTL gesture Canonical content fixture', async ({
  page
}) => {
  await openFixtures(page)

  expect(
    await page
      .locator('[data-fixture-id="gestures-rtl"]')
      .evaluate((fixture) => {
        const mismatches: string[] = []
        const walker = document.createTreeWalker(fixture, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent?.trim() ?? ''
          if (!/[A-Za-z]/u.test(text)) {
            continue
          }
          const language = node.parentElement?.closest('[lang]')?.getAttribute('lang')
          if (language !== 'en') {
            mismatches.push(`${language ?? 'missing'}: ${text}`)
          }
        }
        return mismatches
      })
  ).toEqual([])
})

test('keeps the manifest viewport and fallback matrix aligned with browser coverage', async ({
  page
}) => {
  expect(page.viewportSize()).toEqual(manifest.viewports.wide)
  expect(Object.keys(manifest.viewports).sort()).toEqual(['narrow', 'wide'])
  expect([...manifest.fallbackStates].sort()).toEqual(
    [
      'font-failure',
      'forced-colors',
      'no-css',
      'no-js',
      'print',
      'reduced-motion'
    ].sort()
  )

  await page.setViewportSize(manifest.viewports.narrow)
  expect(page.viewportSize()).toEqual(manifest.viewports.narrow)
})

test('pins one package-matched Linux visual environment across manifest and CI', () => {
  const packageJson = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../../package.json', import.meta.url)),
      'utf8'
    )
  ) as {devDependencies: Record<string, string>}
  const workflow = readFileSync(
    fileURLToPath(
      new URL('../../../.github/workflows/release-validation.yml', import.meta.url)
    ),
    'utf8'
  )

  expect(packageJson.devDependencies['@playwright/test']).toBe(
    manifest.runner.playwrightVersion
  )
  expect(workflow).toContain(manifest.runner.container)
  expect(workflow).toContain(`
      - name: Validate Firefox and WebKit semantics
        env:
          HOME: /root
          RELEASE_FIXTURE_PROJECTS: firefox,webkit
  `)
})

test('renders the canonical task-explainer Annotation scene from the public React package without client script', async ({
  page
}) => {
  await openFixtures(page)

  await expect(page.locator('script')).toHaveCount(0)
  await expect(
    page.locator(
      '[data-fixture-id="task-explainer-1-en"] figure[data-hw-scene="task-explainer"]'
    )
  ).toHaveCount(1)
})

test('preserves source-first Annotation scene semantics and exact localized reader meaning', async ({page}) => {
  await openFixtures(page)

  for (const fixture of manifest.fixtures.filter(({kind}) => kind === 'scene')) {
    const root = page.locator(`[data-fixture-id="${fixture.id}"]`)
    const figure = root.locator('figure[data-hw-scene]')
    const source = figure.locator('[data-hw-scene-source]')
    const caption = figure.locator('[data-hw-scene-caption]')
    const legend = figure.locator('[data-hw-scene-legend]')
    const expected = fixture.expected!

    await expect(figure).toHaveAttribute('data-hw-scene', fixture.recipe!)
    await expect(figure).toHaveAttribute(
      'data-hw-scene-version',
      String(fixture.recipeVersion)
    )
    await expect(figure).toHaveAttribute('data-hw-scene-schema', '1')
    await expect(caption).toHaveAttribute('lang', fixture.locale!)
    expect(await caption.textContent()).toBe(expected.caption)
    await expect(legend).toHaveAttribute('lang', fixture.locale!)
    expect(await source.textContent()).toBe(fixture.source)
    expect(
      await source.evaluate((element) =>
        element.closest('[lang]')?.getAttribute('lang')
      )
    ).toBe(fixture.sourceLanguage)
    await expect(legend.locator('li')).toHaveCount(expected.legend.length)
    expect(
      await legend.locator('li').evaluateAll((items) =>
        items.map((item) => ({
          targets: (item.getAttribute('data-hw-targets') ?? '')
            .split(/\s+/u)
            .filter(Boolean),
          text: item.querySelector('[data-hw-annotation-text]')?.textContent
        }))
      )
    ).toEqual(expected.legend)

    expect(
      await figure.evaluate((element) =>
        Array.from(element.children).map(({tagName}) => tagName)
      )
    ).toEqual(['FIGCAPTION', 'PRE', 'OL'])

    expect(
      await figure.evaluate((element) => {
        const targets = new Set(
          Array.from(element.querySelectorAll('[data-hw-target]'))
            .map((target) => target.getAttribute('data-hw-target'))
            .filter((value): value is string => Boolean(value))
        )
        return Array.from(element.querySelectorAll('[data-hw-targets]')).every(
          (annotation) =>
            (annotation.getAttribute('data-hw-targets') ?? '')
              .split(/\s+/u)
              .filter(Boolean)
              .every((target) => targets.has(target))
        )
      })
    ).toBe(true)

    expect(
      await figure.locator('[data-hw-connector]').evaluateAll((connectors) =>
        connectors.every(
          (connector) =>
            connector.getAttribute('aria-hidden') === 'true' &&
            (connector.textContent ?? '').trim() === ''
        )
      )
    ).toBe(true)
  }
})

test('keeps invalid recipe input readable and fail-closed', async ({page}) => {
  await openFixtures(page)

  const invalid = page.locator('[data-fixture-id="task-explainer-1-invalid"]')
  await expect(invalid.locator('[data-hw-scene-invalid]')).toHaveText(
    'This is not a structured task.'
  )
  await expect(invalid.locator('[data-hw-scene-legend]')).toHaveCount(0)
})

test('has no automated WCAG 2.0, 2.1, or 2.2 A or AA violations', async ({page}) => {
  await openFixtures(page)

  const tags = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22a',
    'wcag22aa'
  ]
  const semanticResults = await new AxeBuilder({page})
    .include('[data-release-fixtures]')
    .withTags(tags)
    .disableRules(['color-contrast'])
    .analyze()
  const contrastResults = await new AxeBuilder({page})
    .include('[data-release-fixtures]')
    .exclude('[data-hw="watermark"] > [data-hw-label]')
    .withRules(['color-contrast'])
    .analyze()

  const violations = [
    ...semanticResults.violations,
    ...contrastResults.violations
  ].map(({id, impact, nodes}) => ({
    id,
    impact,
    nodes: nodes.map(({any, failureSummary, target}) => ({
      checks: any.map(({data, message}) => ({data, message})),
      failureSummary,
      target
    }))
  }))

  expect(violations).toEqual([])
})

test('keeps the page contained and linearizes connectors at the narrow viewport', async ({
  page
}) => {
  await page.setViewportSize(manifest.viewports.narrow)
  await openFixtures(page)

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)
  expect(
    await page.locator('[data-hw-connector]').evaluateAll((connectors) =>
      connectors.every((connector) => getComputedStyle(connector).display === 'none')
    )
  ).toBe(true)
  const invalid = page.locator('[data-fixture-id="task-explainer-1-invalid"]')
  await expect(invalid.locator('[data-hw-scene-invalid]')).toHaveText(
    'This is not a structured task.'
  )
  await expect(invalid.locator('[data-hw-scene-invalid]')).toBeVisible()
  await expect(invalid.locator('[data-hw-scene-legend]')).toHaveCount(0)
})

test('keeps margin labels inside wide gesture screenshot boundaries', async ({page}) => {
  await openFixtures(page)

  for (const direction of ['ltr', 'rtl']) {
    const fixture = page.locator(`[data-fixture-id="gestures-${direction}"]`)
    const marginLabel = fixture.locator('[data-hw="margin"] > [data-hw-label]')
    const [fixtureBox, labelBox] = await Promise.all([
      fixture.boundingBox(),
      marginLabel.boundingBox()
    ])

    expect(fixtureBox).not.toBeNull()
    expect(labelBox).not.toBeNull()
    expect(labelBox!.x).toBeGreaterThanOrEqual(fixtureBox!.x)
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(
      fixtureBox!.x + fixtureBox!.width
    )
    expect(labelBox!.y).toBeGreaterThanOrEqual(fixtureBox!.y)
    expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(
      fixtureBox!.y + fixtureBox!.height
    )
  }
})

test('keeps annotation labels clear of the preceding handwritten mark', async ({page}) => {
  await openFixtures(page)

  for (const direction of ['ltr', 'rtl']) {
    const fixture = page.locator(`[data-fixture-id="gestures-${direction}"]`)
    const [markBox, annotationLabelBox] = await Promise.all([
      fixture.locator('[data-hw="mark"]').boundingBox(),
      fixture.locator('[data-hw="annotate"] > [data-hw-label]').boundingBox()
    ])

    expect(markBox).not.toBeNull()
    expect(annotationLabelBox).not.toBeNull()
    const inlineOverlap = Math.max(
      0,
      Math.min(markBox!.x + markBox!.width, annotationLabelBox!.x + annotationLabelBox!.width) -
        Math.max(markBox!.x, annotationLabelBox!.x)
    )
    const blockOverlap = Math.max(
      0,
      Math.min(markBox!.y + markBox!.height, annotationLabelBox!.y + annotationLabelBox!.height) -
        Math.max(markBox!.y, annotationLabelBox!.y)
    )

    expect(inlineOverlap * blockOverlap).toBe(0)
  }
})

test('preserves readable linear content in print and forced colors', async ({page}) => {
  await openFixtures(page)

  await page.emulateMedia({media: 'print'})
  const printCjkFontFamilies = await page
    .locator(
      '[data-fixture-id="task-explainer-1-zh-CN"] :is([data-hw-scene-source], [data-hw-scene-caption], [data-hw-scene-legend] > li, [data-hw-annotation-text])'
    )
    .evaluateAll((elements) =>
      elements.map((element) =>
        getComputedStyle(element)
          .fontFamily.split(',')
          .map((family) => family.trim().replace(/^["']|["']$/gu, ''))
      )
    )
  expect(printCjkFontFamilies).not.toHaveLength(0)
  expect(printCjkFontFamilies).toEqual(
    Array(printCjkFontFamilies.length).fill([
      'Arial Unicode MS',
      'Noto Sans CJK SC',
      'Noto Sans SC',
      'Source Han Sans SC',
      'Hiragino Sans GB',
      'Microsoft YaHei',
      'sans-serif'
    ])
  )
  expect(
    await page.locator('[data-hw-connector]').evaluateAll((connectors) =>
      connectors.every((connector) => getComputedStyle(connector).display === 'none')
    )
  ).toBe(true)

  await page.emulateMedia({forcedColors: 'active', media: 'screen'})
  expect(
    await page
      .locator('figure[data-hw-scene] [data-hw-connector]')
      .evaluateAll((connectors) =>
        connectors.every((connector) => getComputedStyle(connector).display === 'none')
      )
  ).toBe(true)
  await expect(
    page.locator('[data-fixture-id="task-explainer-1-en"] [data-hw-scene-source]')
  ).toContainText('CLI-042')
  await expect(
    page.locator('[data-fixture-id="task-explainer-1-en"] [data-hw-scene-legend]')
  ).toContainText('stable ID')
})

test('removes motion and remains readable when fonts fail', async ({page}) => {
  await page.route(/\.woff2(?:\?.*)?$/u, (route) => route.abort())
  await openFixtures(page)
  await page.emulateMedia({reducedMotion: 'reduce'})

  const motion = await page.locator('[data-hw="note"]').first().evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      animationName: style.animationName,
      scrollBehavior: style.scrollBehavior,
      transitionDuration: style.transitionDuration
    }
  })
  expect(motion.animationName).toBe('none')
  expect(motion.scrollBehavior).toBe('auto')
  expect(motion.transitionDuration).toBe('0s')
  await expect(page.locator('[data-fixture-id="task-explainer-1-zh-CN"]')).toBeVisible()
})

test('retains canonical source and the complete legend without CSS', async ({page}) => {
  await openFixtures(page)
  await page.locator('link[rel="stylesheet"], style').evaluateAll((nodes) =>
    nodes.forEach((node) => node.remove())
  )

  const fixture = page.locator('[data-fixture-id="task-explainer-1-en"]')
  await expect(fixture.locator('[data-hw-scene-source]')).toContainText('CLI-042')
  await expect(fixture.locator('[data-hw-scene-legend] li')).toHaveCount(6)
  await expect(fixture.locator('[data-hw-scene-source]')).toBeVisible()
  await expect(fixture.locator('[data-hw-scene-legend]')).toBeVisible()
  expect(
    await page.locator('svg').evaluateAll((svgs) =>
      svgs.every((svg) => {
        const {height, width} = svg.getBoundingClientRect()
        return width <= 72 && height <= 100
      })
    )
  ).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)
})

test('keeps the handwritten link keyboard-focusable with a visible focus indicator', async ({
  page
}, testInfo) => {
  await openFixtures(page)

  const link = page.locator('[data-fixture-id="gestures-ltr"] [data-hw="link"]')
  if (testInfo.project.name === 'webkit') {
    await link.focus()
  } else {
    await page.keyboard.press('Tab')
  }
  await expect(link).toBeFocused()
  expect(
    await link.evaluate((element) => {
      const style = getComputedStyle(element)
      return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0
    })
  ).toBe(true)
})
