import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { builtins } from '../../scenarios/builtins'
import { RunExperience } from './RunExperience'

const addRun = vi.fn()

vi.mock('../../app/AppContext',()=>({
  useApp:()=>({prefs:{fontSize:14,sound:false},runs:[],addRun})
}))

vi.mock('../../editor/VimEditor',()=>({
  VimEditor:({onChange,onWrite,onReset,onNew}:{onChange:(doc:string,meta:{paste:boolean;undo:boolean})=>void;onWrite:()=>void;onReset:()=>void;onNew?:()=>void})=><>
    <button onClick={onWrite}>write</button>
    <button onClick={onReset}>edit</button>
    <button onClick={onNew}>new</button>
    <button onClick={()=>onChange(builtins[0].targetText,{paste:false,undo:false})}>complete</button>
  </>
}))

vi.mock('../../editor/TargetViewer',()=>({TargetViewer:()=>null}))

describe('RunExperience Ex commands',()=>{
  it('rejects an unfinished document and advances after completion',()=>{
    const onNext=vi.fn()
    render(<RunExperience scenario={builtins[0]} mode="test" onNext={onNext}/>)

    fireEvent.click(screen.getByRole('button',{name:'write'}))
    expect(screen.getByText('Target not matched — keep editing.')).toBeTruthy()
    expect(onNext).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button',{name:'complete'}))
    expect(screen.getByText(':w')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'write'}))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('resets the current test with :e',()=>{
    render(<RunExperience scenario={builtins[0]} mode="test" onNext={vi.fn()}/>)

    fireEvent.click(screen.getByRole('button',{name:'write'}))
    expect(screen.getByText('Target not matched — keep editing.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'edit'}))
    expect(screen.getByText('Match the target exactly to finish.')).toBeTruthy()
    expect(screen.getByText(':e')).toBeTruthy()
  })

  it('starts a random test with :n',()=>{
    const onRandom=vi.fn()
    render(<RunExperience scenario={builtins[0]} mode="test" onRandom={onRandom}/>)

    fireEvent.click(screen.getByRole('button',{name:'new'}))
    expect(onRandom).toHaveBeenCalledOnce()
    expect(screen.getByRole('button',{name:/random :n/i})).toBeTruthy()
  })
})
