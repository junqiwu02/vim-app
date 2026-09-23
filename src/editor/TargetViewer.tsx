import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { Scenario } from '../core/types'

export function TargetViewer({ scenario, fontSize }: { scenario: Scenario; fontSize: number }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current) return

    const language = scenario.language === 'python'
      ? python()
      : scenario.language === 'text'
        ? []
        : javascript({ typescript: scenario.language === 'typescript' })

    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: scenario.targetText,
        extensions: [
          lineNumbers(),
          syntaxHighlighting(defaultHighlightStyle),
          language,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.contentAttributes.of({ tabindex: '-1', 'aria-label': 'Target document' }),
          EditorView.theme({
            '&': { fontSize: `${fontSize}px` },
            '.cm-content': { fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace', padding: '22px 0' },
            '.cm-line': { padding: '0 24px' },
            '.cm-gutters': { paddingLeft: '8px' },
          }),
        ],
      }),
    })

    return () => view.destroy()
  }, [scenario.id, scenario.targetText, scenario.language, fontSize])

  return <div className="target-viewer" ref={host} />
}
