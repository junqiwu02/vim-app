import { useCallback, useEffect, useRef, useState } from 'react'
import { Lightbulb, RotateCcw, Shuffle, Timer, Zap } from 'lucide-react'
import type { ReplayFrame, ReplayKey, RunResult, Scenario } from '../../core/types'
import { GameSession } from '../../core/session'
import { VimEditor } from '../../editor/VimEditor'
import { TargetViewer } from '../../editor/TargetViewer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { bestFor } from '../../persistence/db'
import { useApp } from '../../app/AppContext'
import { initialReplay } from '../../editor/replay'
import { RunResults } from './RunResults'

export function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`
}
const RESULT_TRANSITION_MS = 160
function hash(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}
export function RunExperience({
  scenario,
  mode,
  onNext,
  onRandom,
}: {
  scenario: Scenario
  mode: 'test' | 'practice'
  onNext?: () => void
  onRandom?: () => void
}) {
  const { prefs, runs, addRun } = useApp()
  const [attempt, setAttempt] = useState(0)
  const session = useRef(new GameSession(scenario))
  const [status, setStatus] = useState(session.current.status)
  const [elapsed, setElapsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [keys, setKeys] = useState(0)
  const keyTokens = useRef<ReplayKey[]>([])
  const replayRef = useRef(initialReplay(scenario))
  const [attemptReplay, setAttemptReplay] = useState(replayRef.current)
  const [showResults, setShowResults] = useState(false)
  const [writeMessage, setWriteMessage] = useState('')
  const previousBest = bestFor(runs, scenario.id, mode)
  useEffect(() => {
    session.current = new GameSession(scenario)
    setStatus('ready')
    setElapsed(0)
    setKeys(0)
    keyTokens.current = []
    replayRef.current = initialReplay(scenario)
    setAttemptReplay(replayRef.current)
    setShowResults(false)
    setShowHint(false)
    setWriteMessage('')
  }, [scenario, attempt])
  useEffect(() => {
    if (status !== 'active') return
    const id = setInterval(() => setElapsed(session.current.elapsed()), 31)
    return () => clearInterval(id)
  }, [status])
  useEffect(() => {
    if (status !== 'completed') {
      setShowResults(false)
      return
    }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(
      () => setShowResults(true),
      reduceMotion ? 0 : RESULT_TRANSITION_MS,
    )
    return () => window.clearTimeout(id)
  }, [status])
  const reset = useCallback(() => {
    session.current.reset()
    setAttempt((a) => a + 1)
  }, [])
  const change = (doc: string, meta: { paste: boolean; undo: boolean }) => {
    setWriteMessage('')
    const completed = session.current.change(doc, { paste: meta.paste, undo: meta.undo })
    setStatus(session.current.status)
    setElapsed(session.current.elapsed())
    if (completed) {
      const run: RunResult = {
        runId: crypto.randomUUID(),
        mode,
        scenarioId: scenario.id,
        scenarioContentVersion: scenario.contentVersion,
        scenarioTitle: scenario.title,
        seed: 'builtin-v1',
        startedAt: new Date().toISOString(),
        elapsedMs: session.current.elapsed(),
        completed: true,
        finalDocumentHash: hash(doc),
        metrics: { ...session.current.metrics, keystrokes: keyTokens.current.length },
        clientVersion: '0.1.0',
      }
      addRun(run)
      if (prefs.sound) ping()
    }
  }
  const write = () => {
    if (status === 'completed') {
      onNext?.()
      return
    }
    setWriteMessage('Target not matched — keep editing.')
  }
  const isPb = status === 'completed' && (!previousBest || elapsed < previousBest.elapsedMs)
  const recordKey = (key: ReplayKey) => {
    keyTokens.current.push(key)
    setKeys(keyTokens.current.length)
  }
  const recordFrame = (frame: ReplayFrame) => {
    replayRef.current = { frames: [...replayRef.current.frames, frame] }
    setAttemptReplay(replayRef.current)
  }
  return (
    <section className="run-experience">
      <div className="run-heading">
        <div>
          <div className="eyebrow">
            {mode === 'test' ? 'Daily test' : 'Practice drill'} <span>/</span> {scenario.language}
          </div>
          <h1>{scenario.title}</h1>
          <p>{scenario.description}</p>
        </div>
        <div className="run-meta">
          <Badge>{scenario.difficulty}</Badge>
          <span>{scenario.tags.join(' · ')}</span>
        </div>
      </div>
      <div className="stats-strip">
        <div>
          <span>TIME</span>
          <strong>{status === 'ready' ? '0.00s' : formatTime(elapsed)}</strong>
        </div>
        <div>
          <span>KEYS</span>
          <strong>{keys}</strong>
        </div>
        <div>
          <span>BEST</span>
          <strong>{previousBest ? formatTime(previousBest.elapsedMs) : '—'}</strong>
        </div>
        <div className="mode-chip">
          <i /> {status === 'completed' ? 'RESULTS' : 'NORMAL'}
        </div>
      </div>
      {status === 'completed' && showResults ? (
        <RunResults
          scenario={scenario}
          attemptReplay={attemptReplay}
          elapsed={elapsed}
          keystrokes={keys}
          isPersonalBest={isPb}
          fontSize={prefs.fontSize}
          theme={prefs.theme}
          onRetry={reset}
          onRandom={onRandom}
          onNext={onNext}
        />
      ) : (
        <>
          <div className={`diff-workspace ${status === 'completed' ? 'is-completing' : ''}`}>
            <section className="diff-pane diff-source" aria-label="Editable document">
              <div className="diff-pane-header">
                <span>
                  <i />
                  YOUR DOCUMENT
                </span>
                <span className="editor-ready">
                  {status === 'ready' ? 'READY' : status.toUpperCase()}
                </span>
              </div>
              <VimEditor
                key={`${scenario.id}-${attempt}`}
                scenario={scenario}
                readOnly={status === 'completed'}
                fontSize={prefs.fontSize}
                theme={prefs.theme}
                onKey={recordKey}
                onReplayFrame={recordFrame}
                onChange={change}
                onWrite={write}
                onReset={reset}
                onNew={onRandom}
              />
              <div className="editor-footer">
                <span>
                  <kbd>Esc</kbd> normal mode
                </span>
                <span>
                  <kbd>:</kbd> command
                </span>
                <span>timer starts on first edit</span>
              </div>
            </section>
            <section className="diff-pane diff-target" aria-label="Target document">
              <div className="diff-pane-header">
                <span>
                  <i />
                  TARGET
                </span>
                <span className="read-only-label">READ ONLY</span>
              </div>
              <TargetViewer scenario={scenario} fontSize={prefs.fontSize} theme={prefs.theme} />
              <div className="editor-footer target-footer">
                <span>Match this document exactly</span>
                <span>{scenario.language}</span>
              </div>
            </section>
          </div>
          {status !== 'completed' && mode === 'practice' && (
            <div className="practice-tools">
              <Button variant="outline" onClick={() => setShowHint((v) => !v)}>
                <Lightbulb size={15} />
                {showHint ? 'Hide hint' : 'Show hint'}
              </Button>
              {showHint && (
                <span>{scenario.reference?.hint || 'Compare the start and target carefully.'}</span>
              )}
            </div>
          )}
          {status !== 'completed' && (
            <div className="under-editor">
              <div aria-live="polite" className={writeMessage ? 'write-message' : ''}>
                <Zap size={16} /> {writeMessage || 'Match the target exactly to finish.'}
              </div>
              <div className="under-actions">
                <Button variant="ghost" onClick={reset}>
                  <RotateCcw size={15} /> reset <kbd>:e</kbd>
                </Button>
                {onRandom && (
                  <Button variant="ghost" onClick={onRandom}>
                    <Shuffle size={15} /> random <kbd>:n</kbd>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div className="goal-row">
        <Timer size={14} />
        <span>PAR</span>
        <b>{scenario.reference?.parKeystrokes ?? '—'} keys</b>
        <span className="line" />
        <span>
          {scenario.validation.ignoreBlankLines !== false
            ? 'blank-only lines ignored'
            : scenario.validation.ignoreTrailingWhitespace
              ? 'trailing whitespace ignored'
              : 'exact text match'}
        </span>
      </div>
    </section>
  )
}
function ping() {
  try {
    const context = new AudioContext()
    const start = context.currentTime + 0.01
    const tone = (
      frequency: number,
      delay: number,
      duration: number,
      volume: number,
      type: OscillatorType = 'sine',
    ) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const begins = start + delay
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, begins)
      gain.gain.setValueAtTime(0.0001, begins)
      gain.gain.exponentialRampToValueAtTime(volume, begins + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, begins + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(begins)
      oscillator.stop(begins + duration)
      return oscillator
    }
    tone(659.25, 0, 0.13, 0.055, 'triangle')
    const bell = tone(1318.51, 0.085, 0.34, 0.075)
    tone(2637.02, 0.085, 0.2, 0.018)
    bell.onended = () => {
      void context.close()
    }
  } catch {
    /* no audio */
  }
}
