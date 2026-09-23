import type { Preferences, RunResult, Scenario } from '../core/types'

const DB_NAME = 'vimtype'; const DB_VERSION = 1
const PREF_KEY = 'vimtype.preferences'
export const defaultPreferences: Preferences = { theme: 'dark', fontSize: 16, tabSize: 2, relativeLineNumbers: false, sound: true }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('runs')) { const store = db.createObjectStore('runs', { keyPath: 'runId' }); store.createIndex('startedAt', 'startedAt') }
      if (!db.objectStoreNames.contains('scenarios')) db.createObjectStore('scenarios', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
  })
}
async function request<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => { const req = run(db.transaction(storeName, mode).objectStore(storeName)); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
}
export const persistence = {
  async saveRun(run: RunResult) { try { await request('runs', 'readwrite', s => s.put(run)) } catch { memoryRuns.unshift(run) } },
  async getRuns(): Promise<RunResult[]> { try { return ((await request('runs', 'readonly', s => s.getAll())) as RunResult[]).sort((a,b) => b.startedAt.localeCompare(a.startedAt)) } catch { return memoryRuns } },
  async saveScenarios(scenarios: Scenario[]) { try { const db = await openDB(); const tx = db.transaction('scenarios','readwrite'); scenarios.forEach(v => tx.objectStore('scenarios').put(v)); await new Promise<void>((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}) } catch { scenarios.forEach(s => memoryScenarios.set(s.id,s)) } },
  async getScenarios(): Promise<Scenario[]> { try { return await request('scenarios','readonly',s=>s.getAll()) as Scenario[] } catch { return [...memoryScenarios.values()] } },
  async clearAll() { try { const db=await openDB(); await Promise.all(['runs','scenarios'].map(name=>new Promise<void>((resolve,reject)=>{const tx=db.transaction(name,'readwrite');tx.objectStore(name).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)}))) } catch { memoryRuns.length=0; memoryScenarios.clear() } },
}
const memoryRuns: RunResult[] = []; const memoryScenarios = new Map<string,Scenario>()
export function loadPreferences(): Preferences { try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } } catch { return defaultPreferences } }
export function savePreferences(value: Preferences) { localStorage.setItem(PREF_KEY, JSON.stringify(value)); document.documentElement.dataset.theme = value.theme }
export function bestFor(runs: RunResult[], scenarioId: string, mode: RunResult['mode']) { return runs.filter(r=>r.completed&&r.scenarioId===scenarioId&&r.mode===mode).sort((a,b)=>a.elapsedMs-b.elapsedMs||a.metrics.keystrokes-b.metrics.keystrokes)[0] }
