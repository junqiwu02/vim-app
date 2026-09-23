import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Preferences, RunResult, Scenario } from '../core/types'
import { builtins } from '../scenarios/builtins'
import { loadPreferences, persistence, savePreferences } from '../persistence/db'

type State = { scenarios: Scenario[]; runs: RunResult[]; prefs: Preferences; addRun:(run:RunResult)=>void; importScenarios:(items:Scenario[])=>Promise<void>; updatePrefs:(p:Preferences)=>void; reload:()=>Promise<void> }
const Context=createContext<State|null>(null)
export function AppProvider({children}:{children:React.ReactNode}){
  const [imported,setImported]=useState<Scenario[]>([]); const [runs,setRuns]=useState<RunResult[]>([]); const [prefs,setPrefs]=useState(loadPreferences)
  const reload=async()=>{ const [s,r]=await Promise.all([persistence.getScenarios(),persistence.getRuns()]);setImported(s);setRuns(r) }
  useEffect(()=>{ void Promise.all([persistence.getScenarios(),persistence.getRuns()]).then(([s,r])=>{setImported(s);setRuns(r)}) },[])
  useEffect(()=>{ document.documentElement.dataset.theme=prefs.theme },[prefs.theme])
  const scenarios=useMemo(()=>{const map=new Map(builtins.map(s=>[s.id,s])); imported.forEach(s=>map.set(s.id,s)); return [...map.values()]},[imported])
  const value:State={scenarios,runs,prefs,addRun(run){setRuns(r=>[run,...r]);void persistence.saveRun(run)},async importScenarios(items){await persistence.saveScenarios(items);await reload()},updatePrefs(p){setPrefs(p);savePreferences(p)},reload}
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export const useApp=()=>{const c=useContext(Context);if(!c)throw new Error('Missing AppProvider');return c}
