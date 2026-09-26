import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, RotateCcw, Shuffle } from 'lucide-react'
import type { AttemptReplay, Scenario, ThemeId } from '../../core/types'
import { Button } from '../../components/ui/Button'
import { ReplayViewer } from '../../editor/ReplayViewer'
import { buildSuggestedReplay } from '../../editor/replay'

const formatTime = (ms: number) => `${(ms / 1000).toFixed(2)}s`

type Props = {
  scenario: Scenario
  attemptReplay: AttemptReplay
  elapsed: number
  keystrokes: number
  isPersonalBest: boolean
  fontSize: number
  theme: ThemeId
  onRetry: () => void
  onRandom?: () => void
  onNext?: () => void
}

export function RunResults({
  scenario,
  attemptReplay,
  elapsed,
  keystrokes,
  isPersonalBest,
  fontSize,
  theme,
  onRetry,
  onRandom,
  onNext,
}: Props) {
  const region = useRef<HTMLElement>(null)
  const command = useRef('')
  const [commandText, setCommandText] = useState('')
  const [step, setStep] = useState(0)
  const [suggested, setSuggested] = useState<ReturnType<typeof buildSuggestedReplay>>()

  useEffect(() => {
    setStep(0)
    setSuggested(buildSuggestedReplay(scenario))
    requestAnimationFrame(() => region.current?.focus())
  }, [scenario])

  const attemptTotal = Math.max(0, attemptReplay.frames.length - 1)
  const suggestedReplay = suggested?.ok ? suggested.replay : undefined
  const suggestedTotal = suggestedReplay ? suggestedReplay.frames.length - 1 : 0
  const total = Math.max(attemptTotal, suggestedTotal)
  const currentStep = Math.min(step, total)
  const move = (amount: number) => setStep((value) => Math.max(0, Math.min(total, value + amount)))
  const runCommand = (value: string) => {
    if (value === ':e') onRetry()
    if (value === ':n') onRandom?.()
    if (value === ':w') onNext?.()
  }

  return (
    <section
      ref={region}
      className="run-results"
      aria-labelledby="result-title"
      tabIndex={-1}
      onKeyDown={(event) => {
        const target = event.target
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          (target instanceof Element &&
            target.closest('button, a, input, textarea, select, [contenteditable="true"]'))
        )
          return

        if (command.current) {
          event.preventDefault()
          if (event.key === 'Escape') command.current = ''
          else if (event.key === 'Enter') {
            runCommand(command.current)
            command.current = ''
          } else if (event.key.length === 1) command.current += event.key.toLowerCase()
          setCommandText(command.current)
          return
        }
        if (event.key === ':') {
          event.preventDefault()
          command.current = ':'
          setCommandText(':')
        } else if (event.key === 'h' || event.key === 'ArrowLeft') {
          event.preventDefault()
          move(-1)
        } else if (event.key === 'l' || event.key === 'ArrowRight') {
          event.preventDefault()
          move(1)
        }
      }}
    >
      <div className="result-summary" aria-live="polite">
        <div className="result-icon">
          <Check aria-hidden="true" />
        </div>
        <div>
          <span className="eyebrow">
            {isPersonalBest ? 'New personal best' : 'Challenge complete'}
          </span>
          <h2 id="result-title">Run complete</h2>
        </div>
        <div className="result-metric">
          <span>TIME</span>
          <strong>{formatTime(elapsed)}</strong>
        </div>
        <div className="result-metric">
          <span>KEYS</span>
          <strong>{keystrokes}</strong>
        </div>
      </div>

      <div className="replay-toolbar" aria-label="Replay controls">
        <div>
          <span>COMPARE REPLAYS</span>
          <strong>
            Step {currentStep} / {total}
          </strong>
        </div>
        <div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous replay step"
            disabled={currentStep === 0}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={16} />
          </Button>
          <span>
            <kbd>h</kbd> / <kbd>l</kbd>
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next replay step"
            disabled={currentStep === total}
            onClick={() => move(1)}
          >
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      <div className="replay-grid">
        <ReplayPane
          title="Your replay"
          replay={attemptReplay}
          step={currentStep}
          scenario={scenario}
          fontSize={fontSize}
          theme={theme}
        />
        {suggestedReplay ? (
          <ReplayPane
            title="Suggested solution"
            replay={suggestedReplay}
            step={currentStep}
            scenario={scenario}
            fontSize={fontSize}
            theme={theme}
          />
        ) : (
          <section className="replay-pane" aria-label="Suggested solution">
            <div className="replay-pane-header">
              <span>SUGGESTED SOLUTION</span>
              <span>UNAVAILABLE</span>
            </div>
            <div className="replay-unavailable">
              {suggested && !suggested.ok ? suggested.reason : 'Verifying suggested replay…'}
            </div>
          </section>
        )}
      </div>

      <div className="result-footer">
        <span className="result-command" aria-live="polite">
          {commandText || 'Use h/l or the arrow keys to step through both replays.'}
        </span>
        <div className="result-actions">
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw size={16} />
            Retry <kbd>:e</kbd>
          </Button>
          {onRandom && (
            <Button variant="outline" onClick={onRandom}>
              <Shuffle size={16} />
              Random <kbd>:n</kbd>
            </Button>
          )}
          {onNext && (
            <Button onClick={onNext}>
              Next drill <kbd>:w</kbd>
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function ReplayPane({
  title,
  replay,
  step,
  scenario,
  fontSize,
  theme,
}: {
  title: string
  replay: AttemptReplay
  step: number
  scenario: Scenario
  fontSize: number
  theme: ThemeId
}) {
  const total = replay.frames.length - 1
  const paneStep = Math.min(step, total)
  const frame = replay.frames[paneStep]
  const keys = useMemo(() => replay.frames.slice(1).map((item) => item.key ?? ''), [replay])
  const keyGroups = useMemo(() => {
    const groups: { key: string; index: number }[][] = [[]]
    keys.forEach((key, index) => {
      groups.at(-1)!.push({ key, index })
      if (index < keys.length - 1 && (key === '<Esc>' || key === '<Enter>')) groups.push([])
    })
    return groups
  }, [keys])
  const keyViewport = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const viewport = keyViewport.current
    if (!viewport) return
    if (paneStep === 0) {
      viewport.scrollTop = 0
      return
    }
    const current = viewport.querySelector<HTMLElement>('.is-current')
    if (!current) return
    const padding = 4
    const viewportRect = viewport.getBoundingClientRect()
    const currentRect = current.getBoundingClientRect()
    if (currentRect.top < viewportRect.top)
      viewport.scrollTop -= viewportRect.top - currentRect.top + padding
    else if (currentRect.bottom > viewportRect.bottom)
      viewport.scrollTop += currentRect.bottom - viewportRect.bottom + padding
  }, [paneStep])

  return (
    <section className="replay-pane" aria-label={title}>
      <div className="replay-pane-header">
        <span>{title.toUpperCase()}</span>
        <span>
          {paneStep} / {total} · {frame.mode}
        </span>
      </div>
      <ReplayViewer
        frame={frame}
        scenario={scenario}
        fontSize={fontSize}
        theme={theme}
        label={`${title} document replay`}
      />
      <div ref={keyViewport} className="replay-keys" aria-label={`${title} keystrokes`}>
        {keyGroups.map((group, groupIndex) => (
          <span className="replay-key-group" key={groupIndex}>
            {group.map(({ key, index }) => (
              <kbd
                key={`${index}-${key}`}
                className={
                  index === paneStep - 1
                    ? 'is-current'
                    : index < paneStep
                      ? 'is-executed'
                      : undefined
                }
                title={key === ' ' ? 'Space' : key}
              >
                {key === ' ' || key === '<Space>' ? '␠' : key}
              </kbd>
            ))}
          </span>
        ))}
      </div>
    </section>
  )
}
