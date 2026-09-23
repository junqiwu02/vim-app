import { describe, expect, it } from 'vitest'
import { isComplete, parseScenarioImport, seededIndex } from './scenario'
import { builtins } from '../scenarios/builtins'
describe('scenario core',()=>{
  it('validates every built-in scenario',()=>{for(const scenario of builtins)expect(parseScenarioImport(JSON.stringify(scenario))).toMatchObject({ok:true})})
  it('reports actionable JSON paths',()=>{const result=parseScenarioImport('{"type":"scenario"}');expect(result.ok).toBe(false);if(!result.ok)expect(result.errors.some(e=>e.startsWith('schemaVersion:'))).toBe(true)})
  it('normalizes line endings only when configured',()=>{expect(isComplete(builtins[0].targetText.replace(/\n/g,'\r\n'),builtins[0])).toBe(true)})
  it('resolves seeds deterministically',()=>{expect(seededIndex('abc',12)).toBe(seededIndex('abc',12));expect(seededIndex('abc',12)).toBeLessThan(12)})
})
