import {expect, type Locator, type Page, test} from '@playwright/test'
import manifest from '../../../visual-fixtures.json' with {type: 'json'}

const {narrow} = manifest.viewports

async function openSettledFixture(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => document.fonts.ready)
}

async function expectFixtureScreenshot(locator: Locator, name: string) {
  await expect.soft(locator).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0,
    scale: 'css'
  })
}

test.beforeEach(async ({page}, testInfo) => {
  test.skip(
    process.env.VISUAL_SNAPSHOTS !== '1' || testInfo.project.name !== 'chromium',
    'Pixel baselines run only in the pinned Chromium Linux release job.'
  )
  await openSettledFixture(page)
})

test('matches the wide LTR and RTL gesture fixtures', async ({page}) => {
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="gestures-ltr"]'),
    'gestures-ltr-wide.png'
  )
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="gestures-rtl"]'),
    'gestures-rtl-wide.png'
  )
})

test('matches the narrow LTR and RTL gesture fixtures', async ({page}) => {
  await page.setViewportSize(narrow)

  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="gestures-ltr"]'),
    'gestures-ltr-narrow.png'
  )
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="gestures-rtl"]'),
    'gestures-rtl-narrow.png'
  )
})

test('matches both localized wide Scene fixtures', async ({page}) => {
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-en"]'),
    'task-explainer-1-en-wide.png'
  )
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-zh-CN"]'),
    'task-explainer-1-zh-CN-wide.png'
  )
})

test('matches both localized narrow Scene fallbacks', async ({page}) => {
  await page.setViewportSize(narrow)

  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-en"]'),
    'task-explainer-1-en-narrow.png'
  )
  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-zh-CN"]'),
    'task-explainer-1-zh-CN-narrow.png'
  )
})

test('matches print and forced-color Scene fallbacks', async ({page}) => {
  const englishFixture = page.locator('[data-fixture-id="task-explainer-1-en"]')
  const chineseFixture = page.locator('[data-fixture-id="task-explainer-1-zh-CN"]')

  await page.emulateMedia({media: 'print'})
  await expectFixtureScreenshot(englishFixture, 'task-explainer-1-en-print.png')
  await expectFixtureScreenshot(chineseFixture, 'task-explainer-1-zh-CN-print.png')

  await page.emulateMedia({forcedColors: 'active', media: 'screen'})
  await expectFixtureScreenshot(
    englishFixture,
    'task-explainer-1-en-forced-colors.png'
  )
  await expectFixtureScreenshot(
    chineseFixture,
    'task-explainer-1-zh-CN-forced-colors.png'
  )
})

test('matches the readable no-CSS fallback', async ({page}) => {
  await page.locator('link[rel="stylesheet"], style').evaluateAll((nodes) =>
    nodes.forEach((node) => node.remove())
  )

  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-en"]'),
    'task-explainer-1-en-no-css.png'
  )
})

test('matches the localized fallback when web fonts fail', async ({page}) => {
  await page.unrouteAll({behavior: 'wait'})
  await page.route(/\.woff2(?:\?.*)?$/u, (route) => route.abort())
  await page.reload()
  await page.evaluate(async () => document.fonts.ready)

  await expectFixtureScreenshot(
    page.locator('[data-fixture-id="task-explainer-1-zh-CN"]'),
    'task-explainer-1-zh-CN-font-failure.png'
  )
})
