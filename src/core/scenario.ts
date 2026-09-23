import { z } from 'zod'
import type { Scenario } from './types'

const scenarioSchema = z.object({
  schemaVersion: z.literal(1), type: z.literal('scenario'), id: z.string().min(3).regex(/^[a-z0-9.-]+$/),
  contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/), title: z.string().min(1), description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']), tags: z.array(z.string()), language: z.enum(['javascript', 'typescript', 'python', 'text']),
  startText: z.string(), targetText: z.string(), cursor: z.object({ line: z.number().int().nonnegative(), column: z.number().int().nonnegative() }),
  editor: z.object({ tabSize: z.number().int().min(1).max(8), insertSpaces: z.boolean() }), rules: z.object({ allowClipboard: z.boolean() }),
  validation: z.object({ type: z.literal('exact'), normalizeLineEndings: z.boolean(), ignoreTrailingWhitespace: z.boolean() }),
  reference: z.object({ parKeystrokes: z.number().int().positive().optional(), suggestedSolution: z.string().optional(), hint: z.string().optional() }).optional(),
  pack: z.string().optional(),
})
const packSchema = z.object({ schemaVersion: z.literal(1), type: z.literal('scenario-pack'), id: z.string(), contentVersion: z.string(), name: z.string(), author: z.string(), scenarios: z.array(scenarioSchema) })

export type ImportResult = { ok: true; scenarios: Scenario[]; packName?: string } | { ok: false; errors: string[] }

export function parseScenarioImport(input: string): ImportResult {
  let raw: unknown
  try { raw = JSON.parse(input) } catch (error) { return { ok: false, errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'unable to parse'}`] } }
  const parsed = (typeof raw === 'object' && raw && 'type' in raw && raw.type === 'scenario-pack') ? packSchema.safeParse(raw) : scenarioSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`) }
  const data = parsed.data
  const scenarios = data.type === 'scenario-pack' ? data.scenarios : [data]
  const ids = new Set<string>(); const duplicates = scenarios.filter(s => ids.size === (ids.add(s.id), ids.size)).map(s => s.id)
  if (duplicates.length) return { ok: false, errors: [`Duplicate scenario IDs: ${[...new Set(duplicates)].join(', ')}`] }
  return { ok: true, scenarios, packName: data.type === 'scenario-pack' ? data.name : undefined }
}

export function normalized(text: string, rules: Scenario['validation']) {
  let value = rules.normalizeLineEndings ? text.replace(/\r\n?/g, '\n') : text
  if (rules.ignoreTrailingWhitespace) value = value.split('\n').map(line => line.trimEnd()).join('\n')
  return value
}
export function isComplete(text: string, scenario: Scenario) { return normalized(text, scenario.validation) === normalized(scenario.targetText, scenario.validation) }

export function seededIndex(seed: string, length: number) {
  let value = 2166136261
  for (let i = 0; i < seed.length; i++) value = Math.imul(value ^ seed.charCodeAt(i), 16777619)
  return Math.abs(value >>> 0) % length
}
