import { describe, expect, it } from 'vitest'
import { GameSession, betterRun } from './session'
import { builtins } from '../scenarios/builtins'
describe('GameSession',()=>{it('times first mutation through exact completion once',()=>{let time=100;const session=new GameSession(builtins[0],{now:()=>time});expect(session.status).toBe('ready');session.change('changed');time=875;expect(session.change(builtins[0].targetText)).toBe(true);expect(session.elapsed()).toBe(775);time=2000;expect(session.change('changed again')).toBe(false);expect(session.elapsed()).toBe(775)});it('orders personal best by time then keys',()=>{expect(betterRun({elapsedMs:1000,metrics:{keystrokes:9}},{elapsedMs:1000,metrics:{keystrokes:10}})).toBe(true)})})
