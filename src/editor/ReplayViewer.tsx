import { useEffect, useRef } from 'react'
import { EditorSelection, EditorState } from '@codemirror/state'
import { indentUnit } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { drawSelection, EditorView, highlightActiveLine, lineNumbers } from '@codemirror/view'
import type { ReplayFrame, Scenario, ThemeId } from '../core/types'
import { editorTheme } from './themes'

export function ReplayViewer({
  frame,
  scenario,
  fontSize,
  theme,
  label,
}: {
  frame: ReplayFrame
  scenario: Scenario
  fontSize: number
  theme: ThemeId
  label: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView>()

  useEffect(() => {
    if (!host.current) return
    const language =
      scenario.language === 'python'
        ? python()
        : scenario.language === 'text'
          ? []
          : javascript({ typescript: scenario.language === 'typescript' })
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: frame.document,
        selection: selectionFor(frame, frame.document.length),
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          editorTheme(theme),
          language,
          EditorState.tabSize.of(scenario.editor.tabSize),
          indentUnit.of(scenario.editor.insertSpaces ? ' '.repeat(scenario.editor.tabSize) : '\t'),
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.contentAttributes.of({ tabindex: '-1', 'aria-label': label }),
          EditorView.theme({
            '&': { fontSize: `${fontSize}px` },
            '.cm-content': {
              fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
              padding: '22px 0',
            },
            '.cm-line': { padding: '0 24px' },
            '.cm-gutters': { paddingLeft: '8px' },
          }),
        ],
      }),
    })
    view.current = editor
    return () => editor.destroy()
    // Frame updates are dispatched without recreating the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, scenario.language, scenario.editor, fontSize, theme, label])

  useEffect(() => {
    const editor = view.current
    if (!editor) return
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: frame.document },
      selection: selectionFor(frame, frame.document.length),
      scrollIntoView: true,
    })
  }, [frame])

  return <div className="replay-viewer" ref={host} />
}

function selectionFor(frame: ReplayFrame, documentLength: number) {
  return EditorSelection.single(
    Math.min(frame.selection.anchor, documentLength),
    Math.min(frame.selection.head, documentLength),
  )
}
