import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultPreferences, loadPreferences, savePreferences } from './db'

function preferLight(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('preferences', () => {
  it('uses the system color scheme when no theme has been saved', () => {
    preferLight(true)
    expect(getDefaultPreferences().theme).toBe('light')
    expect(loadPreferences().theme).toBe('light')

    preferLight(false)
    expect(getDefaultPreferences().theme).toBe('dark')
    expect(loadPreferences().theme).toBe('dark')
  })

  it('persists all supported themes', () => {
    const preferences = { ...getDefaultPreferences(), theme: 'vscode' as const }
    savePreferences(preferences)
    expect(loadPreferences()).toEqual(preferences)
  })

  it('falls back to the system theme for an invalid saved theme', () => {
    preferLight(true)
    localStorage.setItem('vimtype.preferences', JSON.stringify({ theme: 'unknown', fontSize: 18 }))
    expect(loadPreferences()).toMatchObject({ theme: 'light', fontSize: 18 })
  })
})
