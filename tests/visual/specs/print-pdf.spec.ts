import {expect, test} from '@playwright/test'

test('emits a real multi-page tagged PDF for the complete fixture document', async ({
  page
}) => {
  await page.goto('/')
  await page.evaluate(async () => document.fonts.ready)

  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    tagged: true
  })
  const pdfSource = pdf.toString('latin1')
  const pageObjects = pdfSource.match(/\/Type\s*\/Page\b/gu) ?? []

  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  expect(pageObjects.length).toBeGreaterThanOrEqual(4)
  expect(pdfSource).toContain('/Marked true')
})
