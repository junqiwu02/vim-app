import { Download, RotateCcw, Trash2 } from 'lucide-react'
import type { ThemeId } from '../../core/types'
import { useApp } from '../../app/AppContext'
import { Button } from '../../components/ui/Button'
import { NativeSelect, NativeSelectOption } from '../../components/ui/NativeSelect'
import { Switch } from '../../components/ui/Switch'
import { getDefaultPreferences, persistence } from '../../persistence/db'

const themes: { value: ThemeId; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'vscode', label: 'VS Code' },
]

export function SettingsPage() {
  const { prefs, updatePrefs, runs, scenarios, reload } = useApp()
  const update = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) =>
    updatePrefs({ ...prefs, [key]: value })
  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            runs,
            scenarios: scenarios.filter((s) => !s.pack),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'vimtype-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="page settings-page">
      <div className="page-title">
        <div>
          <div className="eyebrow">PREFERENCES</div>
          <h1>Make it yours.</h1>
          <p>Settings are stored locally and apply to every drill.</p>
        </div>
      </div>
      <section className="settings-section">
        <div>
          <h2>Appearance</h2>
          <p>Set the visual tone of your editor.</p>
        </div>
        <div className="settings-panel">
          <div className="setting">
            <div>
              <label htmlFor="theme-select">
                <b>Theme</b>
              </label>
              <span>Choose an interface and editor color theme.</span>
            </div>
            <NativeSelect
              id="theme-select"
              value={prefs.theme}
              onChange={(e) => update('theme', e.target.value as ThemeId)}
            >
              {themes.map((theme) => (
                <NativeSelectOption key={theme.value} value={theme.value}>
                  {theme.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="setting">
            <div>
              <b>Editor font size</b>
              <span>Adjust code readability.</span>
            </div>
            <div className="stepper">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease editor font size"
                onClick={() => update('fontSize', Math.max(12, prefs.fontSize - 1))}
              >
                −
              </Button>
              <b>{prefs.fontSize}px</b>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase editor font size"
                onClick={() => update('fontSize', Math.min(24, prefs.fontSize + 1))}
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Editor</h2>
          <p>Control editing defaults.</p>
        </div>
        <div className="settings-panel">
          <Toggle
            label="Relative line numbers"
            detail="Show distance from the cursor line."
            value={prefs.relativeLineNumbers}
            onChange={(v) => update('relativeLineNumbers', v)}
          />
          <Toggle
            label="Completion sound"
            detail="Play a subtle tone when a run finishes."
            value={prefs.sound}
            onChange={(v) => update('sound', v)}
          />
          <div className="setting">
            <div>
              <b>Tab width</b>
              <span>Used by imported and bundled scenarios.</span>
            </div>
            <NativeSelect
              aria-label="Tab width"
              value={prefs.tabSize}
              onChange={(e) => update('tabSize', Number(e.target.value))}
            >
              <NativeSelectOption value="2">2 spaces</NativeSelectOption>
              <NativeSelectOption value="4">4 spaces</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Your data</h2>
          <p>Runs never leave this browser.</p>
        </div>
        <div className="settings-panel data-actions">
          <div>
            <div>
              <b>Export local data</b>
              <span>Download runs and imported scenarios as JSON.</span>
            </div>
            <Button variant="outline" onClick={exportData}>
              <Download size={15} />
              Export
            </Button>
          </div>
          <div>
            <div>
              <b>Reset preferences</b>
              <span>Restore the default editor configuration.</span>
            </div>
            <Button variant="outline" onClick={() => updatePrefs(getDefaultPreferences())}>
              <RotateCcw size={15} />
              Reset
            </Button>
          </div>
          <div>
            <div>
              <b>Delete all local data</b>
              <span>Permanently erase history and imported content.</span>
            </div>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm('Delete all Vimtype data from this browser?')) {
                  await persistence.clearAll()
                  await reload()
                }
              }}
            >
              <Trash2 size={15} />
              Delete data
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string
  detail: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="setting">
      <div>
        <b>{label}</b>
        <span>{detail}</span>
      </div>
      <Switch aria-label={label} checked={value} onCheckedChange={onChange} />
    </div>
  )
}
