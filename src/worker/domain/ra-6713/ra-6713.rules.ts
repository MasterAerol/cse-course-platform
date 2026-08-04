import type { Ra6713Entry,Ra6713SourceMetadata } from './ra-6713.types'
const validSections=new Set(Array.from({length:17},(_,index)=>`Section ${index+1}`))
export function validRa6713Reference(section:string,rule:string|null):boolean{return validSections.has(section)&&(rule===null||/^Rule [IVXLCDM]+(?:, Section \d+)?$/u.test(rule))}
export function ra6713SourceComplete(source:Ra6713SourceMetadata):boolean{return source.sourceTitle.length>0&&/^https:\/\//u.test(source.sourceUrl)&&source.statuteId==='Republic Act No. 6713'&&validRa6713Reference(source.section,source.rule)&&source.provisionId.length>0&&source.verificationDate==='2026-08-04'&&source.contentVersion==='ra6713-v1'&&source.paraphrasedRule.length>0}
export function rejectsCurrentPersonContent(value:string):boolean{return !/\b(incumbent|current officeholder|candidate|President Marcos|Sara Duterte|named official|pending complaint|recent controversy)\b/iu.test(value)}
export function rejectsExternalLawMisattribution(value:string):boolean{return !/RA\s*3019.*(?:under|penalty of|provided by)\s+RA\s*6713|Revised Penal Code.*RA\s*6713/iu.test(value)}
export function uniqueVisibleChoices(choices:readonly string[]):boolean{return choices.length===4&&new Set(choices.map((choice)=>choice.trim().toLowerCase())).size===4&&choices.every((choice)=>choice.trim().length>0)}
export function uniqueRa6713Answer(choices:readonly string[],answer:string):boolean{return choices.filter((choice)=>choice===answer).length===1}
export function scenarioFactsComplete(entry:Ra6713Entry):boolean{return entry.scenarioFacts.length>0&&entry.scenarioFacts.every((fact)=>fact.trim().length>0)}
export function penaltySourceValid(entry:Ra6713Entry):boolean{return entry.ruleClass!=='penalty'||(entry.section==='Section 11'&&entry.source.classification==='primary_statute'&&entry.source.exactNumbers.length>0)}
export function normClassificationValid(entry:Ra6713Entry):boolean{return entry.category!=='norms'||entry.ruleClass==='norm'}
export function dutyClassificationValid(entry:Ra6713Entry):boolean{return entry.category!=='public_duties'||entry.ruleClass==='duty'}
export function disclosureClassificationValid(entry:Ra6713Entry):boolean{return entry.category!=='saln_disclosure'||entry.ruleClass==='disclosure'}
export function prohibitedActClassificationValid(entry:Ra6713Entry):boolean{return !['financial_interests','outside_information','gifts'].includes(entry.category)||entry.ruleClass==='prohibition'}