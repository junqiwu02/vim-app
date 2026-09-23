import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { RunExperience } from '../test/RunExperience'
export function PracticeRunPage(){const {id}=useParams();const nav=useNavigate();const {scenarios}=useApp();const index=scenarios.findIndex(s=>s.id===id);if(index<0)return <Navigate to="/practice" replace/>;return <RunExperience scenario={scenarios[index]} mode="practice" onNext={()=>nav(`/practice/${scenarios[(index+1)%scenarios.length].id}`)}/>} 
