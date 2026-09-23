import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Lightbulb, RotateCcw, Timer, Zap } from 'lucide-react'
import type { RunResult, Scenario } from '../../core/types'
import { GameSession } from '../../core/session'
import { VimEditor } from '../../editor/VimEditor'
import { TargetViewer } from '../../editor/TargetViewer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { bestFor } from '../../persistence/db'
import { useApp } from '../../app/AppContext'

export function formatTime(ms:number){return `${(ms/1000).toFixed(2)}s`}
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0')}
export function RunExperience({scenario,mode,onNext}:{scenario:Scenario;mode:'test'|'practice';onNext?:()=>void}){
  const {prefs,runs,addRun}=useApp(); const [attempt,setAttempt]=useState(0); const session=useRef(new GameSession(scenario)); const [status,setStatus]=useState(session.current.status); const [elapsed,setElapsed]=useState(0); const [showHint,setShowHint]=useState(false); const [keys,setKeys]=useState(0)
  const previousBest=bestFor(runs,scenario.id,mode)
  useEffect(()=>{ session.current=new GameSession(scenario);setStatus('ready');setElapsed(0);setKeys(0);setShowHint(false) },[scenario,attempt])
  useEffect(()=>{if(status!=='active')return;const id=setInterval(()=>setElapsed(session.current.elapsed()),31);return()=>clearInterval(id)},[status])
  const reset=useCallback(()=>{session.current.reset();setAttempt(a=>a+1)},[])
  const change=(doc:string,meta:{paste:boolean;undo:boolean})=>{
    const completed=session.current.change(doc,{paste:meta.paste,undo:meta.undo});setStatus(session.current.status);setElapsed(session.current.elapsed())
    if(completed){ const run:RunResult={runId:crypto.randomUUID(),mode,scenarioId:scenario.id,scenarioContentVersion:scenario.contentVersion,scenarioTitle:scenario.title,seed:'builtin-v1',startedAt:new Date().toISOString(),elapsedMs:session.current.elapsed(),completed:true,finalDocumentHash:hash(doc),metrics:{...session.current.metrics,keystrokes:keys},clientVersion:'0.1.0'};addRun(run);if(prefs.sound)ping() }
  }
  const isPb=status==='completed'&&(!previousBest||elapsed<previousBest.elapsedMs)
  return <section className="run-experience">
    <div className="run-heading"><div><div className="eyebrow">{mode==='test'?'Daily test':'Practice drill'} <span>/</span> {scenario.language}</div><h1>{scenario.title}</h1><p>{scenario.description}</p></div><div className="run-meta"><Badge>{scenario.difficulty}</Badge><span>{scenario.tags.join(' · ')}</span></div></div>
    <div className="stats-strip"><div><span>TIME</span><strong>{status==='ready'?'0.00s':formatTime(elapsed)}</strong></div><div><span>KEYS</span><strong>{keys}</strong></div><div><span>BEST</span><strong>{previousBest?formatTime(previousBest.elapsedMs):'—'}</strong></div><div className="mode-chip"><i/> NORMAL</div></div>
    <div className="diff-workspace">
      <section className="diff-pane diff-source" aria-label="Editable document">
        <div className="diff-pane-header"><span><i/>YOUR DOCUMENT</span><span className="editor-ready">{status==='ready'?'READY':status.toUpperCase()}</span></div>
        <VimEditor key={`${scenario.id}-${attempt}`} scenario={scenario} readOnly={status==='completed'} fontSize={prefs.fontSize} onKey={()=>setKeys(k=>k+1)} onChange={change}/>
        <div className="editor-footer"><span><kbd>Esc</kbd> normal mode</span><span><kbd>:</kbd> command</span><span>timer starts on first edit</span></div>
      </section>
      <section className="diff-pane diff-target" aria-label="Target document">
        <div className="diff-pane-header"><span><i/>TARGET</span><span className="read-only-label">READ ONLY</span></div>
        <TargetViewer scenario={scenario} fontSize={prefs.fontSize}/>
        <div className="editor-footer target-footer"><span>Match this document exactly</span><span>{scenario.language}</span></div>
      </section>
    </div>
    {mode==='practice'&&<div className="practice-tools"><Button variant="outline" onClick={()=>setShowHint(v=>!v)}><Lightbulb size={15}/>{showHint?'Hide hint':'Show hint'}</Button>{showHint&&<span>{scenario.reference?.hint||'Compare the start and target carefully.'}</span>}</div>}
    {status==='completed'?<div className="result-card"><div className="result-icon"><Check/></div><div><span className="eyebrow">{isPb?'New personal best':'Challenge complete'}</span><h2>{formatTime(elapsed)} <small>{keys} keystrokes</small></h2>{mode==='practice'&&scenario.reference?.suggestedSolution&&<p>Suggested: <code>{scenario.reference.suggestedSolution}</code></p>}</div><div className="result-actions"><Button variant="outline" onClick={reset}><RotateCcw size={16}/>Retry</Button>{onNext&&<Button onClick={onNext}>Next drill<ArrowRight size={16}/></Button>}</div></div>:<div className="under-editor"><div><Zap size={16}/> Match the target exactly to finish.</div><Button variant="ghost" onClick={reset}><RotateCcw size={15}/> reset <kbd>Ctrl R</kbd></Button></div>}
    <div className="goal-row"><Timer size={14}/><span>PAR</span><b>{scenario.reference?.parKeystrokes??'—'} keys</b><span className="line"/><span>{scenario.validation.ignoreTrailingWhitespace?'trailing whitespace ignored':'exact text match'}</span></div>
  </section>
}
function ping(){try{const c=new AudioContext();const o=c.createOscillator();const g=c.createGain();o.frequency.value=660;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.12)}catch{/* no audio */}}
