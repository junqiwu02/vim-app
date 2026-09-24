export function randomScenarioOffset(count:number,randomValue:number){
  return count<2?0:1+(randomValue%(count-1))
}
