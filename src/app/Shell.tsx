import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, BookOpen, History, Settings, TerminalSquare } from 'lucide-react'

export function Shell(){
  const location=useLocation()
  const nav=[['/','Test',Activity],['/practice','Practice',BookOpen],['/history','History',History],['/settings','Settings',Settings]] as const
  return <div className="app-shell">
    <header className="site-header"><NavLink to="/" className="brand"><span className="brand-mark"><TerminalSquare size={18}/></span><span>vimtype</span><span className="beta">BETA</span></NavLink><nav aria-label="Main navigation">{nav.map(([to,label,Icon])=><NavLink key={to} end={to==='/'} to={to} className={({isActive})=>isActive?'active':''}><Icon size={16}/><span>{label}</span></NavLink>)}</nav><div className="header-status"><span className="status-dot"/> local mode</div></header>
    <main key={location.pathname}><Outlet/></main>
    <footer><span>vimtype <em>·</em> deliberate practice for modal editing</span><span>runs stay on this device</span></footer>
  </div>
}
