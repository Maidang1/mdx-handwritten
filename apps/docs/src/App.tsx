import { useState } from 'react'
import { mdxHandwrittenComponents } from '@madinah/mdx-handwritten-react'
import Examples from './content/examples.mdx'
import Reference from './content/reference.mdx'
import Showcase from './content/showcase.mdx'
import showcaseSource from './content/showcase.mdx?raw'

const repositoryUrl =
  import.meta.env.VITE_REPOSITORY_URL ??
  'https://github.com/Maidang1/mdx-handwritten'

const installCommand = `npm install @madinah/mdx-handwritten-remark \\
  @madinah/mdx-handwritten-react \\
  @madinah/mdx-handwritten-theme \\
  remark-directive`

const installCommandCopy =
  'npm install @madinah/mdx-handwritten-remark @madinah/mdx-handwritten-react @madinah/mdx-handwritten-theme remark-directive'

const viteSnippet = `import mdx from '@mdx-js/rollup'
import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'

export default {
  plugins: [
    mdx({
      remarkPlugins: [
        remarkDirective,
        [remarkMdxHandwritten, {
          output: 'component',
          diagnostics: 'strict'
        }]
      ]
    })
  ]
}`

const nextSnippet = `// next.config.mjs / mdx-components
import createMDX from '@next/mdx'
import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkDirective,
      [remarkMdxHandwritten, { output: 'component' }]
    ]
  }
})

export default withMDX({ pageExtensions: ['md', 'mdx', 'tsx'] })`

const renderSnippet = `import { mdxHandwrittenComponents } from
  '@madinah/mdx-handwritten-react'
import '@madinah/mdx-handwritten-theme/styles.css'

// Pass through your host's MDX components prop
export function Article({ Content }) {
  return <Content components={mdxHandwrittenComponents} />
}`

const optionsSnippet = `// Common HandwrittenOptions
[remarkMdxHandwritten, {
  output: 'component',      // or 'element' | 'strip'
  diagnostics: 'strict',    // or 'warn'
  reviewedPlans: {          // optional reviewed scene plans
    projectRoot: process.cwd()
  }
}]`

const packagesSnippet = `# Core consumer stack
@madinah/mdx-handwritten-remark   # compile-time validation
@madinah/mdx-handwritten-react    # Hand* + HandScene components
@madinah/mdx-handwritten-theme    # CSS tokens + font
remark-directive                  # peer: parse :/::/::: directives

# Optional
@madinah/mdx-handwritten-scene    # createScenePlan / createSceneCompiler`

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button className="copy-button" type="button" onClick={() => void copy()}>
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      {copied ? 'Copied' : label}
    </button>
  )
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.88c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.81a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  )
}

export function App() {
  return (
    <div className="site-shell">
      <header className="site-nav">
        <a className="wordmark" href="#top" aria-label="MDX Handwritten home">
          <span className="wordmark-mark" aria-hidden="true">m✦</span>
          <span>mdx handwritten</span>
        </a>

        <nav aria-label="Primary navigation">
          <a href="#showcase">Showcase</a>
          <a href="#reference">Reference</a>
          <a href="#setup">Setup</a>
          <a className="github-link" href={repositoryUrl}>
            <GitHubIcon />
            <span>GitHub</span>
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="overline"><span aria-hidden="true">✦</span> Remark plugin + UI adapters</p>
            <h1 id="hero-title">
              Let your MDX
              <span className="hero-script">write in the margins.</span>
            </h1>
            <p className="hero-intro">
              A strict, accessible language for hand-drawn notes, marks and
              annotations—compiled at build time, rendered with real DOM text.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#showcase">Explore the syntax <span aria-hidden="true">↘</span></a>
              <a className="secondary-action" href={repositoryUrl}>View source</a>
            </div>
            <ul className="hero-facts" aria-label="Project features">
              <li><span aria-hidden="true">✓</span> 8 gestures + recipes</li>
              <li><span aria-hidden="true">✓</span> SSR friendly</li>
              <li><span aria-hidden="true">✓</span> Zero client runtime</li>
            </ul>
          </div>

          <div className="hero-card" aria-label="Example MDX note">
            <div className="window-bar">
              <span aria-hidden="true"><i></i><i></i><i></i></span>
              <code>release-note.mdx</code>
              <span className="window-state">compiled</span>
            </div>
            <div className="hero-paper">
              <span className="issue-key">DOC-042</span>
              <strong>Document the sharp edges</strong>
              <p>The implementation is done. Leave a note where context matters.</p>
              <p className="hero-hand-note"><span aria-hidden="true">✓</span> spec updated in the same commit :)</p>
              <span className="hero-arrow" aria-hidden="true">↙</span>
              <small>reviewers will thank you</small>
            </div>
          </div>
        </section>

        <section className="showcase-section" id="showcase" aria-labelledby="showcase-title">
          <div className="section-heading">
            <div>
              <p className="overline">The complete language</p>
              <h2 id="showcase-title">Eight gestures. One task can explain itself.</h2>
            </div>
            <p>
              Every example below is compiled from the source beside it using
              <code> remark-directive</code> and the real plugin.
            </p>
          </div>

          <div className="workbench">
            <article className="preview-panel">
              <div className="panel-bar">
                <span><i className="live-dot"></i> Live output</span>
                <span className="panel-meta">responsive · semantic HTML</span>
              </div>
              <div className="preview-canvas">
                <Showcase components={mdxHandwrittenComponents} />
              </div>
            </article>

            <article className="source-panel">
              <div className="panel-bar">
                <span>showcase.mdx</span>
                <CopyButton value={showcaseSource} />
              </div>
              <div className="source-scroll">
                <pre><code>{showcaseSource}</code></pre>
              </div>
            </article>
          </div>
        </section>

        <section className="reference-section" id="reference" aria-labelledby="reference-title">
          <div className="reference-heading">
            <div>
              <p className="overline">Syntax reference</p>
              <h2 id="reference-title">Configuration, source and output—side by side.</h2>
            </div>
            <p>
              Every rendered cell is produced by the real MDX compiler. Change
              the attributes in the middle column to tune the same semantic
              gesture without hand-building its layout.
            </p>
          </div>

          <div
            aria-labelledby="reference-title"
            className="syntax-table-scroll"
            role="region"
            tabIndex={0}
          >
            <Reference components={mdxHandwrittenComponents} />
          </div>
          <p className="syntax-scroll-hint">Scroll horizontally to compare every column.</p>

          <div className="syntax-examples-intro">
            <div>
              <p className="overline">More patterns</p>
              <h3 id="examples-title">Live syntax beyond the table defaults.</h3>
            </div>
            <p>
              Alternate tones, placements, icons, and Mark treatments—each card is
              compiled from the source shown above its output.
            </p>
          </div>
          <div className="syntax-examples-shell" aria-labelledby="examples-title">
            <Examples components={mdxHandwrittenComponents} />
          </div>
        </section>

        <section className="setup-section" id="setup" aria-labelledby="setup-title">
          <div className="setup-copy">
            <p className="overline">npm packages · v0.1.0</p>
            <h2 id="setup-title">Install from npm, then wire your MDX host.</h2>
            <p>
              Four scoped packages on the public registry. The remark adapter
              validates author input at build time, React owns semantic markup,
              and the theme is plain CSS you can replace without touching a
              document.
            </p>
          </div>

          <div className="setup-steps">
            <article className="setup-card">
              <span className="step-number">01</span>
              <h3>Install</h3>
              <div className="command-row">
                <code>{installCommand}</code>
                <CopyButton value={installCommandCopy} />
              </div>
              <p className="setup-card-note">
                Peer: <code>remark-directive</code>. Optional for custom recipe
                compilers: <code>@madinah/mdx-handwritten-scene</code>.
              </p>
            </article>

            <article className="setup-card">
              <span className="step-number">02</span>
              <h3>Compile</h3>
              <pre><code>{`import remarkDirective from 'remark-directive'
import remarkMdxHandwritten from '@madinah/mdx-handwritten-remark'

remarkPlugins: [
  remarkDirective,
  [remarkMdxHandwritten, {
    output: 'component',
    diagnostics: 'strict'
  }]
]`}</code></pre>
            </article>

            <article className="setup-card">
              <span className="step-number">03</span>
              <h3>Render</h3>
              <pre><code>{renderSnippet}</code></pre>
            </article>
          </div>

          <div className="usage-recipes" aria-labelledby="usage-recipes-title">
            <div className="usage-recipes-heading">
              <div>
                <p className="overline">Host recipes</p>
                <h3 id="usage-recipes-title">Copy a posture for your stack.</h3>
              </div>
              <p>
                Default export and named export both work:
                <code> import remarkMdxHandwritten from &apos;@madinah/mdx-handwritten-remark&apos;</code>
                {' '}or{' '}
                <code>{'{ remarkMdxHandwritten }'}</code>.
              </p>
            </div>

            <div className="usage-grid">
              <article className="usage-card">
                <header>
                  <h4>Vite + @mdx-js/rollup</h4>
                  <CopyButton value={viteSnippet} label="Copy" />
                </header>
                <pre><code>{viteSnippet}</code></pre>
              </article>

              <article className="usage-card">
                <header>
                  <h4>Next.js + @next/mdx</h4>
                  <CopyButton value={nextSnippet} label="Copy" />
                </header>
                <pre><code>{nextSnippet}</code></pre>
              </article>

              <article className="usage-card">
                <header>
                  <h4>Plugin options</h4>
                  <CopyButton value={optionsSnippet} label="Copy" />
                </header>
                <pre><code>{optionsSnippet}</code></pre>
              </article>

              <article className="usage-card">
                <header>
                  <h4>Package map</h4>
                  <CopyButton value={packagesSnippet} label="Copy" />
                </header>
                <pre><code>{packagesSnippet}</code></pre>
              </article>
            </div>
          </div>
        </section>

        <section className="principles" aria-label="Design principles">
          <article>
            <span aria-hidden="true">01</span>
            <h3>Strict source</h3>
            <p>Unknown attributes and unsafe URLs fail at compile time instead of leaking into your HTML.</p>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <h3>Real words</h3>
            <p>Labels remain DOM text. SVG draws the flourish, never the meaning.</p>
          </article>
          <article>
            <span aria-hidden="true">03</span>
            <h3>Graceful edges</h3>
            <p>Margin notes return to the flow and annotations unwind safely on narrow screens.</p>
          </article>
        </section>
      </main>

      <footer>
        <a className="wordmark" href="#top"><span className="wordmark-mark" aria-hidden="true">m✦</span> mdx handwritten</a>
        <p>Built for documents that deserve a human pulse.</p>
        <a href={repositoryUrl}>MIT · GitHub</a>
      </footer>
    </div>
  )
}
