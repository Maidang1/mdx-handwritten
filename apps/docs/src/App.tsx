import { useState } from 'react'
import { handwrittenComponents } from 'mdx-handwritten-react'
import Showcase from './content/showcase.mdx'
import showcaseSource from './content/showcase.mdx?raw'

const repositoryUrl =
  import.meta.env.VITE_REPOSITORY_URL ??
  'https://github.com/Maidang1/mdx-handwritten'

const installCommand =
  'git clone https://github.com/Maidang1/mdx-handwritten.git && cd mdx-handwritten && npm install'

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
              <li><span aria-hidden="true">✓</span> 8 fixed directives</li>
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
              <h2 id="showcase-title">One MDX file. Eight useful gestures.</h2>
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
                <Showcase components={handwrittenComponents} />
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

        <section className="setup-section" id="setup" aria-labelledby="setup-title">
          <div className="setup-copy">
            <p className="overline">Build-time by design</p>
            <h2 id="setup-title">Add the language, then bring your own MDX host.</h2>
            <p>
              The remark package owns parsing and validation. The React package
              owns semantic markup. The theme is plain CSS, so it stays easy to
              replace without changing a single document.
            </p>
          </div>

          <div className="setup-steps">
            <article className="setup-card">
              <span className="step-number">01</span>
              <h3>Install</h3>
              <div className="command-row">
                <code>{installCommand}</code>
                <CopyButton value={installCommand} />
              </div>
            </article>

            <article className="setup-card">
              <span className="step-number">02</span>
              <h3>Compile</h3>
              <pre><code>{`remarkPlugins: [
  remarkDirective,
  [remarkMdxHandwritten, { output: 'component' }]
]`}</code></pre>
            </article>

            <article className="setup-card">
              <span className="step-number">03</span>
              <h3>Render</h3>
              <pre><code>{`import { handwrittenComponents } from
  'mdx-handwritten-react'
import 'mdx-handwritten-theme/styles.css'

<Article components={handwrittenComponents} />`}</code></pre>
            </article>
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
