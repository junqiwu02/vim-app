import { useMemo, useState } from 'react'
import { useApp } from '../../app/AppContext'
import { seededIndex } from '../../core/scenario'
import { RunExperience } from './RunExperience'

export function TestPage(){const {scenarios}=useApp();const [round,setRound]=useState(0);const index=useMemo(()=>seededIndex(new Date().toISOString().slice(0,10),scenarios.length),[scenarios.length]);const scenario=scenarios[(index+round)%scenarios.length];return scenario?<RunExperience scenario={scenario} mode="test" onNext={()=>setRound(v=>v+1)}/>:null}
