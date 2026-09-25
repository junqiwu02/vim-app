import { Link } from 'react-router-dom'
import { BarChart3, Clock3, History as HistoryIcon, Keyboard, Trophy } from 'lucide-react'
import { useApp } from '../../app/AppContext'
import { formatTime } from '../test/RunExperience'
import { Button } from '../../components/ui/Button'

export function HistoryPage() {
  const { runs } = useApp()
  const completed = runs.filter((r) => r.completed)
  const best = completed.length ? Math.min(...completed.map((r) => r.elapsedMs)) : 0
  const avg = completed.length
    ? completed.reduce((n, r) => n + r.elapsedMs, 0) / completed.length
    : 0
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <div className="eyebrow">LOCAL PROGRESS</div>
          <h1>Your run history.</h1>
          <p>Small improvements compound. Every completed edit is saved on this device.</p>
        </div>
      </div>
      <div className="summary-grid">
        <div>
          <span>
            <Trophy size={16} />
            FASTEST RUN
          </span>
          <strong>{best ? formatTime(best) : '—'}</strong>
        </div>
        <div>
          <span>
            <Clock3 size={16} />
            AVERAGE TIME
          </span>
          <strong>{avg ? formatTime(avg) : '—'}</strong>
        </div>
        <div>
          <span>
            <BarChart3 size={16} />
            COMPLETIONS
          </span>
          <strong>{completed.length}</strong>
        </div>
        <div>
          <span>
            <Keyboard size={16} />
            TOTAL KEYS
          </span>
          <strong>{completed.reduce((n, r) => n + r.metrics.keystrokes, 0)}</strong>
        </div>
      </div>
      {runs.length ? (
        <div className="history-table">
          <div className="history-head">
            <span>CHALLENGE</span>
            <span>MODE</span>
            <span>TIME</span>
            <span>KEYS</span>
            <span>DATE</span>
          </div>
          {runs.map((r) => (
            <div className="history-row" key={r.runId}>
              <span>
                <b>{r.scenarioTitle}</b>
                <small>{r.scenarioId}</small>
              </span>
              <span className="caps">{r.mode}</span>
              <strong>{formatTime(r.elapsedMs)}</strong>
              <span>{r.metrics.keystrokes}</span>
              <time>
                {new Date(r.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty history-empty">
          <HistoryIcon />
          <h2>No runs yet</h2>
          <p>Complete your first timed challenge and it’ll appear here.</p>
          <Button asChild>
            <Link to="/">Start a test</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
