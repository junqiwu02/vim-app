import { useEffect, useRef, useState } from 'react'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { vim, Vim } from '@replit/codemirror-vim'
import { MousePointer2 } from 'lucide-react'
import type { Scenario } from '../core/types'

type Props = { scenario: Scenario; readOnly?: boolean; fontSize: number; onChange:(doc:string, meta:{paste:boolean;undo:boolean})=>void; onKey?:()=>void; onMode?:(mode:string)=>void; onWrite?:()=>void; onReset?:()=>void; onNew?:()=>void }
export function VimEditor({ scenario, readOnly=false, fontSize, onChange, onKey, onMode, onWrite, onReset, onNew }: Props) {
  const host = useRef<HTMLDivElement>(null); const readOnlyCompartment = useRef(new Compartment()); const view = useRef<EditorView>(); const [focused,setFocused]=useState(false)
  const callback = useRef({onChange,onKey,onMode,onWrite,onReset,onNew}); callback.current={onChange,onKey,onMode,onWrite,onReset,onNew}
  useEffect(() => {
    if (!host.current) return
    const language = scenario.language === 'python' ? python() : scenario.language === 'text' ? [] : javascript({typescript:scenario.language==='typescript'})
    const state = EditorState.create({ doc: scenario.startText, selection:{anchor:offsetAt(scenario.startText,scenario.cursor.line,scenario.cursor.column)}, extensions:[
      vim(), lineNumbers(), highlightActiveLine(), drawSelection(), history(), keymap.of([...defaultKeymap,...historyKeymap]), syntaxHighlighting(defaultHighlightStyle), language,
      EditorView.theme({ '&':{fontSize:`${fontSize}px`}, '.cm-content':{fontFamily:'"JetBrains Mono", "SFMono-Regular", Consolas, monospace',padding:'22px 0'}, '.cm-line':{padding:'0 24px'}, '.cm-gutters':{paddingLeft:'8px'} }),
      readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
      EditorView.domEventHandlers({ keydown:()=>{callback.current.onKey?.(); return false} }),
      EditorView.updateListener.of(update=>{ if(update.docChanged){ callback.current.onChange(update.state.doc.toString(),{paste:update.transactions.some(t=>t.isUserEvent('input.paste')),undo:update.transactions.some(t=>t.isUserEvent('undo'))}) } })
    ]})
    view.current = new EditorView({state,parent:host.current})
    try { Vim.defineEx?.('write','w',()=>callback.current.onWrite?.()); Vim.defineEx?.('edit','e',()=>callback.current.onReset?.()); Vim.defineEx?.('n','n',()=>callback.current.onNew?.()); const status = document.querySelector('.cm-vim-panel'); if(status) callback.current.onMode?.(status.textContent||'NORMAL') } catch { /* optional Vim telemetry */ }
    requestAnimationFrame(()=>view.current?.focus())
    return ()=>view.current?.destroy()
  // Recreating the editor on read-only changes would discard the live document.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scenario.id,scenario.startText,scenario.language,fontSize])
  useEffect(()=>{ view.current?.dispatch({effects:readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly))}) },[readOnly])
  useEffect(()=>{const refocus=(event:KeyboardEvent)=>{if(view.current?.hasFocus||event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.key==='Tab'||event.key==='Escape')return;const target=event.target;if(target instanceof Element&&target.closest('input, textarea, select, button, a, [contenteditable="true"]'))return;event.preventDefault();view.current?.focus()};window.addEventListener('keydown',refocus);return()=>window.removeEventListener('keydown',refocus)},[])
  const focusEditor=()=>view.current?.focus()
  return <div className={`editor-shell ${focused?'is-focused':'is-unfocused'}`} onFocusCapture={event=>{if((event.target as Element).closest('.cm-editor')){setFocused(true);onMode?.('NORMAL')}}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false)}}>
    <div className="editor-host" ref={host}/>
    {!focused&&<button type="button" className="editor-focus-overlay" onMouseDown={event=>{event.preventDefault();focusEditor()}} onClick={focusEditor}><MousePointer2 size={17} aria-hidden="true"/>Click here or press any key to focus</button>}
  </div>
}
function offsetAt(text:string,line:number,column:number){ const lines=text.split('\n'); return lines.slice(0,line).reduce((n,v)=>n+v.length+1,0)+Math.min(column,lines[line]?.length??0) }
