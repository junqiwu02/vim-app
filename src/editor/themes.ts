import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { ThemeId } from '../core/types'

const palettes: Record<
  ThemeId,
  {
    dark: boolean
    background: string
    foreground: string
    gutter: string
    activeLine: string
    selection: string
    comment: string
    keyword: string
    string: string
    number: string
    variable: string
    type: string
    function: string
    property: string
    operator: string
    invalid: string
  }
> = {
  dark: {
    dark: true,
    background: '#0d100e',
    foreground: '#dfe5df',
    gutter: '#707a72',
    activeLine: '#182019',
    selection: '#40562d',
    comment: '#8b978d',
    keyword: '#d9a8f4',
    string: '#b9db87',
    number: '#f0c886',
    variable: '#dfe5df',
    type: '#86d9cf',
    function: '#9fc8ff',
    property: '#b8d9f2',
    operator: '#d8e3d9',
    invalid: '#ff8b85',
  },
  light: {
    dark: false,
    background: '#ffffff',
    foreground: '#242824',
    gutter: '#8b948d',
    activeLine: '#f1f5ed',
    selection: '#cfe7a7',
    comment: '#6a746c',
    keyword: '#7a3ea1',
    string: '#477a16',
    number: '#9a5b13',
    variable: '#242824',
    type: '#087f76',
    function: '#1558a0',
    property: '#23688f',
    operator: '#39413b',
    invalid: '#c42b2b',
  },
  vscode: {
    dark: true,
    background: '#1f1f1f',
    foreground: '#cccccc',
    gutter: '#858585',
    activeLine: '#262626',
    selection: '#264f78',
    comment: '#6a9955',
    keyword: '#c586c0',
    string: '#ce9178',
    number: '#b5cea8',
    variable: '#9cdcfe',
    type: '#4ec9b0',
    function: '#dcdcaa',
    property: '#9cdcfe',
    operator: '#d4d4d4',
    invalid: '#f44747',
  },
}

export function editorTheme(theme: ThemeId): Extension {
  const p = palettes[theme]
  return [
    EditorView.theme(
      {
        '&': { backgroundColor: p.background, color: p.foreground },
        '.cm-content': { caretColor: 'var(--accent)' },
        '.cm-gutters': { backgroundColor: p.background, color: p.gutter, border: 'none' },
        '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: p.activeLine },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
          backgroundColor: `${p.selection} !important`,
        },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
      },
      { dark: p.dark },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: tags.comment, color: p.comment, fontStyle: 'italic' },
        { tag: [tags.keyword, tags.controlKeyword, tags.modifier], color: p.keyword },
        { tag: [tags.string, tags.special(tags.string)], color: p.string },
        { tag: [tags.number, tags.bool, tags.null], color: p.number },
        { tag: tags.variableName, color: p.variable },
        { tag: [tags.typeName, tags.className, tags.namespace], color: p.type },
        {
          tag: [
            tags.function(tags.variableName),
            tags.function(tags.propertyName),
            tags.definition(tags.function(tags.variableName)),
          ],
          color: p.function,
        },
        { tag: [tags.propertyName, tags.attributeName], color: p.property },
        { tag: [tags.operator, tags.punctuation, tags.bracket], color: p.operator },
        { tag: [tags.heading, tags.link], color: p.function },
        { tag: tags.invalid, color: p.invalid },
      ]),
    ),
  ]
}
