import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Search, Upload, X } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { parseScenarioImport } from '../../core/scenario'

export function PracticePage(){
  const {scenarios,importScenarios}=useApp();const [query,setQuery]=useState('');const [difficulty,setDifficulty]=useState('all');const [language,setLanguage]=useState('all');const input=useRef<HTMLInputElement>(null);const [notice,setNotice]=useState<{kind:'error'|'success';text:string}|null>(null)
  const filtered=useMemo(()=>scenarios.filter(s=>(difficulty==='all'||s.difficulty===difficulty)&&(language==='all'||s.language===language)&&`${s.title} ${s.description} ${s.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[scenarios,query,difficulty,language])
  const importFile=async(file?:File)=>{
    if(!file)return
    const result=parseScenarioImport(await file.text())
    if(!result.ok) setNotice({kind:'error',text:result.errors.slice(0,3).join(' · ')})
    else {
      const conflicts=result.scenarios.filter(item=>scenarios.some(existing=>existing.id===item.id)).map(item=>item.id)
      if(conflicts.length&&!window.confirm(`Replace ${conflicts.length} existing scenario${conflicts.length===1?'':'s'}?\n\n${conflicts.join('\n')}`)) return
      await importScenarios(result.scenarios)
      setNotice({kind:'success',text:`Imported ${result.scenarios.length} scenario${result.scenarios.length===1?'':'s'}${result.packName?` from ${result.packName}`:''}.`})
    }
  }
  return <div className="page practice-page"><div className="page-title"><div><div className="eyebrow">SKILL LIBRARY</div><h1>Practice with intent.</h1><p>Choose a focused drill. Repeat until the movement feels automatic.</p></div><Button variant="outline" onClick={()=>input.current?.click()}><Upload size={16}/>Import JSON</Button><input ref={input} hidden type="file" accept="application/json,.json" onChange={e=>void importFile(e.target.files?.[0])}/></div>
    {notice&&<div className={`notice ${notice.kind}`}><span>{notice.text}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss"><X size={15}/></button></div>}
    <div className="filterbar"><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search skills or scenarios…"/></label><select value={difficulty} onChange={e=>setDifficulty(e.target.value)} aria-label="Difficulty"><option value="all">All difficulty</option><option>easy</option><option>medium</option><option>hard</option></select><select value={language} onChange={e=>setLanguage(e.target.value)} aria-label="Language"><option value="all">All languages</option><option>javascript</option><option>typescript</option><option>python</option><option>text</option></select><span>{filtered.length} drills</span></div>
    <div className="scenario-grid">{filtered.map((s,i)=><Link to={`/practice/${s.id}`} className="scenario-card" key={s.id}><div className="card-number">{String(i+1).padStart(2,'0')}</div><div className="card-top"><Badge tone={s.difficulty==='easy'?'green':s.difficulty==='hard'?'amber':'default'}>{s.difficulty}</Badge><span>{s.language}</span></div><h2>{s.title}</h2><p>{s.description}</p><div className="tag-row">{s.tags.slice(0,3).map(t=><span key={t}>#{t}</span>)}</div><div className="card-action"><BookOpen size={15}/>Start drill<ArrowRight size={15}/></div></Link>)}</div>
    {!filtered.length&&<div className="empty"><Search/><h2>No drills found</h2><p>Try clearing a filter or importing a scenario pack.</p></div>}
  </div>
}
