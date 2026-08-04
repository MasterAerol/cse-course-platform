import type { EnvironmentDistractor,EnvironmentMistakeType } from './environment-management.types'
export interface ScoredEnvironmentDistractor extends EnvironmentDistractor{qualityScore:number}
export function environmentDistractor(text:string,mistakeType:EnvironmentMistakeType):ScoredEnvironmentDistractor{return{text:text.trim(),mistakeType,qualityScore:text.trim().length>=20?1:0}}
export function selectEnvironmentDistractors(correct:string,candidates:readonly ScoredEnvironmentDistractor[]):readonly ScoredEnvironmentDistractor[]{const seen=new Set([correct.trim().toLowerCase()]);return candidates.filter((item)=>item.qualityScore>0&&item.mistakeType.startsWith('env_')&&!seen.has(item.text.toLowerCase())&&(seen.add(item.text.toLowerCase()),true)).slice(0,3)}
