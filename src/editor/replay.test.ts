import { describe, expect, it } from 'vitest'
import { builtins } from '../scenarios/builtins'
import { buildSuggestedReplay } from './replay'

describe('suggested replays', () => {
  it('executes every bundled solution from the authored start to the target', () => {
    for (const scenario of builtins) {
      const result = buildSuggestedReplay(scenario)
      if (!result.ok) throw new Error(`${scenario.id}: ${result.reason}`)
      expect(result.replay.frames[0].document).toBe(scenario.startText)
      expect(result.replay.frames.at(-1)?.document, scenario.id).toBe(scenario.targetText)
      expect(result.replay.frames).toHaveLength(
        (scenario.reference?.suggestedKeystrokes?.length ?? 0) + 1,
      )
    }
  })

  it('rejects application Ex commands in imported replay data', () => {
    const scenario = structuredClone(builtins[0])
    scenario.reference = {
      ...scenario.reference,
      suggestedKeystrokes: [':', 'n', '<Enter>'],
    }

    expect(buildSuggestedReplay(scenario)).toMatchObject({ ok: false })
  })
})
