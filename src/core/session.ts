import type { RunMetrics, Scenario } from './types'
import { isComplete } from './scenario'

export type SessionStatus = 'ready' | 'active' | 'completed' | 'abandoned'
export interface Clock { now(): number }
export class GameSession {
  status: SessionStatus = 'ready'; private startTime = 0; private endTime = 0
  readonly metrics: RunMetrics = { keystrokes: 0, mutations: 0, resets: 0, undoCount: 0, pasteDetected: false, focusChanges: 0 }
  constructor(readonly scenario: Scenario, private readonly clock: Clock = performance) {}
  change(document: string, meta: { keystrokes?: number; paste?: boolean; undo?: boolean } = {}) {
    if (this.status === 'completed' || this.status === 'abandoned') return false
    if (this.status === 'ready') { this.status = 'active'; this.startTime = this.clock.now() }
    this.metrics.mutations++; this.metrics.keystrokes += meta.keystrokes ?? 1
    if (meta.paste) this.metrics.pasteDetected = true
    if (meta.undo) this.metrics.undoCount++
    if (isComplete(document, this.scenario)) { this.status = 'completed'; this.endTime = this.clock.now(); return true }
    return false
  }
  reset() { this.status = 'ready'; this.startTime = 0; this.endTime = 0; this.metrics.resets++ }
  abandon() { if (this.status !== 'completed') this.status = 'abandoned' }
  elapsed(now = this.clock.now()) { return this.status === 'ready' ? 0 : Math.max(0, (this.status === 'completed' ? this.endTime : now) - this.startTime) }
}

export function betterRun(a: { elapsedMs: number; metrics: { keystrokes: number } }, b?: { elapsedMs: number; metrics: { keystrokes: number } }) {
  return !b || a.elapsedMs < b.elapsedMs || (a.elapsedMs === b.elapsedMs && a.metrics.keystrokes < b.metrics.keystrokes)
}
