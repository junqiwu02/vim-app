import { EditorState } from '@codemirror/state'
import { indentUnit } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import { CodeMirror, getCM, vim, Vim } from '@replit/codemirror-vim'
import { isComplete } from '../core/scenario'
import type { AttemptReplay, ReplayFrame, ReplayKey, Scenario } from '../core/types'

export function offsetAt(text: string, line: number, column: number) {
  const lines = text.split('\n')
  return (
    lines.slice(0, line).reduce((length, value) => length + value.length + 1, 0) +
    Math.min(column, lines[line]?.length ?? 0)
  )
}

export function initialReplay(scenario: Scenario): AttemptReplay {
  const cursor = offsetAt(scenario.startText, scenario.cursor.line, scenario.cursor.column)
  return {
    frames: [
      {
        document: scenario.startText,
        selection: { anchor: cursor, head: cursor },
        mode: 'NORMAL',
      },
    ],
  }
}

export function normalizeReplayKey(event: KeyboardEvent): ReplayKey | null {
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return null
  const named: Record<string, ReplayKey> = {
    Escape: '<Esc>',
    Enter: '<Enter>',
    Backspace: '<BS>',
    Tab: '<Tab>',
  }
  const key = named[event.key] ?? event.key
  const modifiers = [event.ctrlKey && 'C', event.altKey && 'A', event.metaKey && 'M'].filter(
    Boolean,
  )
  if (!modifiers.length && !event.shiftKey) return key
  if (key.length === 1 && event.shiftKey && !modifiers.length) return key
  return `<${[...modifiers, event.shiftKey && 'S', key].filter(Boolean).join('-')}>`
}

export function replayFrame(view: EditorView, key?: ReplayKey): ReplayFrame {
  const selection = view.state.selection.main
  const vimState = getCM(view)?.state.vim
  const mode = getCM(view)?.state.dialog
    ? 'COMMAND'
    : vimState?.insertMode
      ? 'INSERT'
      : vimState?.visualMode
        ? 'VISUAL'
        : 'NORMAL'
  return {
    key,
    document: view.state.doc.toString(),
    selection: { anchor: selection.anchor, head: selection.head },
    mode,
  }
}

export type SuggestedReplayResult =
  { ok: true; replay: AttemptReplay } | { ok: false; reason: string }

export function buildSuggestedReplay(scenario: Scenario): SuggestedReplayResult {
  const keys = scenario.reference?.suggestedKeystrokes
  if (!keys?.length) return { ok: false, reason: 'No verified suggested replay is available.' }
  if (keys.length > 512 || keys.some((key) => !isAllowedKey(key)))
    return { ok: false, reason: 'The suggested replay contains unsupported input.' }

  const host = document.createElement('div')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '800px',
    visibility: 'hidden',
    pointerEvents: 'none',
  })
  document.body.append(host)
  const language =
    scenario.language === 'python'
      ? python()
      : scenario.language === 'text'
        ? []
        : javascript({ typescript: scenario.language === 'typescript' })
  const state = EditorState.create({
    doc: scenario.startText,
    selection: {
      anchor: offsetAt(scenario.startText, scenario.cursor.line, scenario.cursor.column),
    },
    extensions: [
      vim(),
      language,
      EditorState.tabSize.of(scenario.editor.tabSize),
      indentUnit.of(scenario.editor.insertSpaces ? ' '.repeat(scenario.editor.tabSize) : '\t'),
    ],
  })
  const view = new EditorView({ state, parent: host })
  const replay = initialReplay(scenario)

  try {
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index]
      const cm = getCM(view)
      if (!cm) throw new Error('Vim replay adapter unavailable')

      if (key === ':' && !cm.state.vim?.insertMode && !cm.state.dialog) {
        const command = commandAfter(keys, index + 1)
        if (!/^(?:(?:%|\d+)?s(?:[/#].*)?|\d+d)$/.test(command))
          throw new Error('Unsupported suggested Ex command')
      }
      if ((key === '/' || key === '?') && !cm.state.vim?.insertMode && !cm.state.dialog)
        throw new Error('Search is not supported in isolated suggested replays')

      applyReplayKey(cm, key)
      replay.frames.push(replayFrame(view, key))
    }

    if (!isComplete(view.state.doc.toString(), scenario))
      return { ok: false, reason: 'The suggested replay does not reach the target.' }
    return { ok: true, replay }
  } catch {
    return { ok: false, reason: 'The suggested replay could not be verified.' }
  } finally {
    view.destroy()
    host.remove()
  }
}

function applyReplayKey(cm: CodeMirror, key: ReplayKey) {
  const dialogInput = cm.state.dialog?.querySelector('input')
  if (dialogInput instanceof HTMLInputElement) {
    if (key === '<Enter>' || key === '<Esc>') {
      dialogInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: key === '<Enter>' ? 'Enter' : 'Escape',
          keyCode: key === '<Enter>' ? 13 : 27,
          bubbles: true,
          cancelable: true,
        }),
      )
    } else {
      dialogInput.value += printableKey(key)
      dialogInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    return
  }

  if (cm.state.vim?.insertMode && isPrintableKey(key)) {
    cm.replaceSelection(printableKey(key))
    return
  }
  if (cm.state.vim?.insertMode && key === '<Enter>') {
    CodeMirror.commands.newlineAndIndent(cm)
    return
  }
  Vim.handleKey(cm as Parameters<typeof Vim.handleKey>[0], vimKey(key), 'user')
}

function commandAfter(keys: ReplayKey[], from: number) {
  const command: string[] = []
  for (let index = from; index < keys.length && keys[index] !== '<Enter>'; index++)
    command.push(printableKey(keys[index]))
  return command.join('')
}

function vimKey(key: ReplayKey) {
  return key === '<Enter>' ? '<CR>' : key === '<Space>' ? ' ' : key
}

function printableKey(key: ReplayKey) {
  return key === '<Space>' ? ' ' : key
}

function isPrintableKey(key: ReplayKey) {
  return key === '<Space>' || [...key].length === 1
}

function isAllowedKey(key: ReplayKey) {
  return isPrintableKey(key) || ['<Esc>', '<Enter>', '<Tab>', '<BS>'].includes(key)
}
