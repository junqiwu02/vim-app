import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

const updatePrefs = vi.fn()
const prefs = {
  theme: 'dark' as const,
  fontSize: 16,
  tabSize: 2,
  relativeLineNumbers: false,
  sound: true,
}

vi.mock('../../app/AppContext', () => ({
  useApp: () => ({ prefs, updatePrefs, runs: [], scenarios: [], reload: vi.fn() }),
}))

describe('SettingsPage themes', () => {
  it('offers dark, light, and VS Code themes', () => {
    render(<SettingsPage />)
    const select = screen.getByLabelText('Theme')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Dark',
      'Light',
      'VS Code',
      '2 spaces',
      '4 spaces',
    ])

    fireEvent.change(select, { target: { value: 'vscode' } })
    expect(updatePrefs).toHaveBeenCalledWith({ ...prefs, theme: 'vscode' })
  })
})
