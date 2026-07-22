import {readFile} from 'node:fs/promises'
import {describe, expect, it} from 'vitest'

const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8')

describe('mdx-handwritten-theme language and recipe contracts', () => {
  it('publishes a system-only CJK font stack that remains printable', () => {
    expect(styles).toContain(
      '--hw-font-family-print-cjk: "Arial Unicode MS", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;',
    )
  })

  it('uses the CJK handwriting token through inherited language selectors', () => {
    expect(styles).toContain(
      '--hw-font-family-cjk: "Kaiti SC", "KaiTi", "STKaiti", "Klee One", cursive;',
    )
    expect(styles).toContain(':is(:lang(zh-CN), :lang(zh-Hans), :lang(zh-Hans-CN))')
    expect(styles).toContain('font-family: var(--hw-font-family-cjk);')

    const languageSelectorEnd = styles.indexOf(
      '):is(:lang(zh-CN), :lang(zh-Hans), :lang(zh-Hans-CN))',
    )
    const languageSelectorStart = styles.lastIndexOf(':where(', languageSelectorEnd)
    const languageSelector = styles.slice(languageSelectorStart, languageSelectorEnd)

    expect(languageSelectorStart).toBeGreaterThan(-1)
    expect(languageSelector).not.toContain('[data-hw-scene-source]')
    expect(languageSelector).not.toContain('[data-hw-scene-invalid]')
    expect(styles).toContain(
      'font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace;',
    )
  })

  it('scopes grammar roles to the exact recipe version', () => {
    for (const role of ['state', 'stable-id', 'description', 'tag', 'priority', 'field']) {
      expect(styles).toContain(
        `figure[data-hw-scene="task-explainer"][data-hw-scene-version="1"] [data-hw-target-role="${role}"]`,
      )
      expect(styles).toContain(
        `figure[data-hw-scene="task-explainer"][data-hw-scene-version="1"] [data-hw-annotation-role="${role}"]`,
      )
      expect(styles).not.toContain(
        `figure[data-hw-scene] [data-hw-target-role="${role}"]`,
      )
      expect(styles).not.toContain(
        `figure[data-hw-scene] [data-hw-annotation-role="${role}"]`,
      )
    }
  })

  it('maps scene gesture intent without changing plan meaning', () => {
    for (const intent of ['attention', 'positive', 'warning', 'negative']) {
      expect(styles).toContain(`[data-hw-intent~="${intent}"]`)
    }
    expect(styles).toContain('[data-hw-verdict]')
    expect(styles).toContain('li[data-hw-gesture~="group"]')
  })
})
