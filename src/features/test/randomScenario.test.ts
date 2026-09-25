import { describe, expect, it } from 'vitest'
import { randomScenarioOffset } from './randomScenario'

describe('randomScenarioOffset', () => {
  it('always moves to a different scenario when alternatives exist', () => {
    expect(randomScenarioOffset(1, 42)).toBe(0)
    expect(randomScenarioOffset(4, 0)).toBe(1)
    expect(randomScenarioOffset(4, 1)).toBe(2)
    expect(randomScenarioOffset(4, 2)).toBe(3)
    expect(randomScenarioOffset(4, 3)).toBe(1)
  })
})
