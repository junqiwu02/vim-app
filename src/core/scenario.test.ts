import { describe, expect, it } from 'vitest'
import { isComplete, parseScenarioImport, seededIndex } from './scenario'
import { builtins } from '../scenarios/builtins'
describe('scenario core', () => {
  it('validates every built-in scenario', () => {
    for (const scenario of builtins)
      expect(parseScenarioImport(JSON.stringify(scenario))).toMatchObject({ ok: true })
  })
  it('reports actionable JSON paths', () => {
    const result = parseScenarioImport('{"type":"scenario"}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.startsWith('schemaVersion:'))).toBe(true)
  })
  it('normalizes line endings only when configured', () => {
    expect(isComplete(builtins[0].targetText.replace(/\n/g, '\r\n'), builtins[0])).toBe(true)
  })
  it('ignores extra blank and whitespace-only lines while preserving nonblank content', () => {
    const target = builtins[1].targetText
    expect(isComplete(`\n${target.replace('\n', '\n  \t\n')}\n\t\n`, builtins[1])).toBe(true)
    expect(isComplete(`${target}not blank\n`, builtins[1])).toBe(false)
    expect(isComplete(target.replace('const size', 'const  size'), builtins[1])).toBe(false)
  })
  it('keeps legacy imports compatible by enabling blank-line normalization', () => {
    const legacy = JSON.parse(JSON.stringify(builtins[0]))
    delete legacy.validation.ignoreBlankLines
    const result = parseScenarioImport(JSON.stringify(legacy))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.scenarios[0].validation.ignoreBlankLines).toBe(true)
  })
  it('newline-terminates every built-in start and target at a new content version', () => {
    for (const scenario of builtins) {
      expect(scenario.startText.endsWith('\n')).toBe(true)
      expect(scenario.targetText.endsWith('\n')).toBe(true)
      expect(scenario.contentVersion).toBe('1.1.0')
    }
  })
  it('resolves seeds deterministically', () => {
    expect(seededIndex('abc', 12)).toBe(seededIndex('abc', 12))
    expect(seededIndex('abc', 12)).toBeLessThan(12)
  })
})
