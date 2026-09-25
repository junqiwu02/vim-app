export type Difficulty = 'easy' | 'medium' | 'hard'
export type Language = 'javascript' | 'typescript' | 'python' | 'text'
export type ThemeId = 'dark' | 'light' | 'vscode'

export interface Scenario {
  schemaVersion: 1
  type: 'scenario'
  id: string
  contentVersion: string
  title: string
  description: string
  difficulty: Difficulty
  tags: string[]
  language: Language
  startText: string
  targetText: string
  cursor: { line: number; column: number }
  editor: { tabSize: number; insertSpaces: boolean }
  rules: { allowClipboard: boolean }
  validation: {
    type: 'exact'
    normalizeLineEndings: boolean
    ignoreTrailingWhitespace: boolean
    ignoreBlankLines?: boolean
  }
  reference?: { parKeystrokes?: number; suggestedSolution?: string; hint?: string }
  pack?: string
}

export interface RunMetrics {
  keystrokes: number
  mutations: number
  resets: number
  undoCount: number
  pasteDetected: boolean
  focusChanges: number
}
export interface RunResult {
  runId: string
  mode: 'test' | 'practice'
  scenarioId: string
  scenarioContentVersion: string
  scenarioTitle: string
  seed: string
  startedAt: string
  elapsedMs: number
  completed: boolean
  finalDocumentHash: string
  metrics: RunMetrics
  clientVersion: string
}
export interface Preferences {
  theme: ThemeId
  fontSize: number
  tabSize: number
  relativeLineNumbers: boolean
  sound: boolean
}
