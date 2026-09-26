import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AttemptReplay } from '../../core/types'
import { builtins } from '../../scenarios/builtins'
import { initialReplay } from '../../editor/replay'
import { RunResults } from './RunResults'

const scenario = builtins[0]
const attemptReplay: AttemptReplay = {
  frames: [
    ...initialReplay(scenario).frames,
    {
      key: 'd',
      document: scenario.startText,
      selection: { anchor: 9, head: 9 },
      mode: 'NORMAL',
    },
    {
      key: 'w',
      document: scenario.targetText,
      selection: { anchor: 9, head: 9 },
      mode: 'NORMAL',
    },
  ],
}
const longReplay: AttemptReplay = {
  frames: [
    ...initialReplay(scenario).frames,
    ...['i', 'a', '<Esc>', '0', 'x'].map((key, index) => ({
      key,
      document: scenario.startText,
      selection: { anchor: index, head: index },
      mode: key === '<Esc>' || index > 2 ? 'NORMAL' : 'INSERT',
    })),
  ],
}

function renderResults(overrides: Partial<React.ComponentProps<typeof RunResults>> = {}) {
  const props: React.ComponentProps<typeof RunResults> = {
    scenario,
    attemptReplay,
    elapsed: 1234,
    keystrokes: 2,
    isPersonalBest: true,
    fontSize: 14,
    theme: 'dark',
    onRetry: vi.fn(),
    onRandom: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<RunResults {...props} />) }
}

describe('RunResults', () => {
  it('steps both replays with Vim and arrow controls', () => {
    renderResults()
    const results = screen.getByRole('region', { name: 'Run complete' })

    fireEvent.keyDown(results, { key: 'l' })
    expect(screen.getByText('Step 1 / 2')).toBeTruthy()
    expect(screen.getAllByText('1 / 2 · NORMAL')).toHaveLength(2)

    fireEvent.keyDown(results, { key: 'ArrowRight' })
    expect(screen.getByText('Step 2 / 2')).toBeTruthy()
    fireEvent.keyDown(results, { key: 'h' })
    expect(screen.getByText('Step 1 / 2')).toBeTruthy()
  })

  it('groups semantic key sequences and keeps the current key within the viewport', () => {
    renderResults({ attemptReplay: longReplay })
    const results = screen.getByRole('region', { name: 'Run complete' })
    const pane = screen.getByRole('region', { name: 'Your replay' })
    const viewport = pane.querySelector<HTMLElement>('.replay-keys')!
    const firstKey = viewport.querySelector<HTMLElement>('kbd')!
    expect(viewport.querySelectorAll('.replay-key-group')).toHaveLength(2)

    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(rect(0, 50))
    vi.spyOn(firstKey, 'getBoundingClientRect').mockReturnValue(rect(60, 80))
    fireEvent.keyDown(results, { key: 'l' })
    expect(viewport.scrollTop).toBe(34)

    fireEvent.keyDown(results, { key: 'h' })
    expect(viewport.scrollTop).toBe(0)
  })

  it('preserves result-level Ex commands after the editor is replaced', () => {
    const { props } = renderResults()
    const results = screen.getByRole('region', { name: 'Run complete' })

    for (const key of [':', 'e', 'Enter']) fireEvent.keyDown(results, { key })
    expect(props.onRetry).toHaveBeenCalledOnce()
  })

  it('shows a safe fallback when a scenario has no structured solution', () => {
    const withoutReplay = structuredClone(scenario)
    delete withoutReplay.reference?.suggestedKeystrokes
    renderResults({ scenario: withoutReplay })

    expect(screen.getByText('No verified suggested replay is available.')).toBeTruthy()
  })
})

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}
