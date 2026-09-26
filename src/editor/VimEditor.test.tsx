import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Scenario } from '../core/types'
import { VimEditor } from './VimEditor'

const scenario: Scenario = {
  schemaVersion: 1,
  type: 'scenario',
  id: 'test.tab-insert',
  contentVersion: '1.0.0',
  title: 'Tab insertion',
  description: 'Test fixture',
  difficulty: 'easy',
  tags: ['insert'],
  language: 'text',
  startText: 'text\n',
  targetText: '  text\n',
  cursor: { line: 0, column: 0 },
  editor: { tabSize: 2, insertSpaces: true },
  rules: { allowClipboard: false },
  validation: {
    type: 'exact',
    normalizeLineEndings: true,
    ignoreTrailingWhitespace: false,
  },
}

describe('VimEditor Tab handling', () => {
  it('inserts and records the scenario indentation in Insert mode instead of moving focus', async () => {
    const onChange = vi.fn()
    const onKey = vi.fn()
    const onReplayFrame = vi.fn()
    const { container } = render(
      <VimEditor
        scenario={scenario}
        fontSize={14}
        theme="dark"
        onChange={onChange}
        onKey={onKey}
        onReplayFrame={onReplayFrame}
      />,
    )
    const content = container.querySelector<HTMLElement>('.cm-content')
    expect(content).not.toBeNull()

    content!.focus()
    fireEvent.keyDown(content!, { key: 'i', code: 'KeyI' })
    const handled = fireEvent.keyDown(content!, { key: 'Tab', code: 'Tab' })

    expect(handled).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith('  text\n', { paste: false, undo: false })
    expect(onKey.mock.calls.map(([key]) => key)).toEqual(['i', '<Tab>'])
    await waitFor(() =>
      expect(onReplayFrame).toHaveBeenLastCalledWith(
        expect.objectContaining({ key: '<Tab>', document: '  text\n', mode: 'INSERT' }),
      ),
    )
    expect(document.activeElement).toBe(content)
  })

  it('leaves Tab available for focus navigation in Normal mode', () => {
    const onChange = vi.fn()
    const { container } = render(
      <VimEditor scenario={scenario} fontSize={14} theme="dark" onChange={onChange} />,
    )
    const content = container.querySelector<HTMLElement>('.cm-content')
    expect(content).not.toBeNull()

    const handled = fireEvent.keyDown(content!, { key: 'Tab', code: 'Tab' })

    expect(handled).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })
})
