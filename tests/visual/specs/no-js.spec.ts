import {expect, test} from '@playwright/test'

test('keeps the static Canonical content fixtures readable with JavaScript disabled', async ({page}) => {
  await page.goto('/')

  await expect(page.locator('script')).toHaveCount(0)
  await expect(
    page.locator('[data-fixture-id="task-explainer-1-en"] [data-hw-scene-source]')
  ).toContainText('CLI-042')
  await expect(
    page.locator('[data-fixture-id="task-explainer-1-en"] [data-hw-scene-legend] li')
  ).toHaveCount(6)
})
