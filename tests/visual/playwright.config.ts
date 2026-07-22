import {defineConfig, devices} from '@playwright/test'
import manifest from '../../visual-fixtures.json' with {type: 'json'}

const {wide} = manifest.viewports

const projects = [
  {
    name: 'chromium',
    testIgnore: /no-js\.spec\.ts$/,
    use: {
      ...devices['Desktop Chrome'],
      userAgent: undefined,
      viewport: wide
    }
  },
  {
    name: 'chromium-no-js',
    testMatch: /no-js\.spec\.ts$/,
    use: {
      ...devices['Desktop Chrome'],
      javaScriptEnabled: false,
      userAgent: undefined,
      viewport: wide
    }
  },
  {
    name: 'firefox',
    testIgnore: /(?:no-js|print-pdf|visual-regression)\.spec\.ts$/,
    use: {
      ...devices['Desktop Firefox'],
      userAgent: undefined,
      viewport: wide
    }
  },
  {
    name: 'webkit',
    testIgnore: /(?:no-js|print-pdf|visual-regression)\.spec\.ts$/,
    use: {
      ...devices['Desktop Safari'],
      userAgent: undefined,
      viewport: wide
    }
  }
]

const requestedProjectNames = process.env.RELEASE_FIXTURE_PROJECTS
  ?.split(',')
  .map((name) => name.trim())
  .filter(Boolean)
const requestedProjectSet = requestedProjectNames
  ? new Set(requestedProjectNames)
  : undefined
const selectedProjects = requestedProjectSet
  ? projects.filter(({name}) => requestedProjectSet.has(name))
  : projects

if (
  requestedProjectSet &&
  selectedProjects.length !== requestedProjectSet.size
) {
  const knownProjectNames = new Set(projects.map(({name}) => name))
  const unknownProjectNames = [...requestedProjectSet].filter(
    (name) => !knownProjectNames.has(name)
  )
  throw new Error(
    `Unknown RELEASE_FIXTURE_PROJECTS: ${unknownProjectNames.join(', ')}`
  )
}

export default defineConfig({
  testDir: './specs',
  snapshotPathTemplate:
    '{testDir}/../__screenshots__/{projectName}-{platform}/{arg}{ext}',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? {workers: 1} : {}),
  reporter: process.env.CI
    ? [['line'], ['html', {open: 'never'}]]
    : 'line',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
    viewport: wide
  },
  projects: selectedProjects,
  webServer: {
    command: 'npm run preview:release-fixtures',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    url: 'http://127.0.0.1:4174'
  }
})
