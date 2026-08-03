import{contextCluesBankV1}from'./context-clues-bank';import type{ContextClueType}from'./context-clues.types'
export const findContextClue=(word:string)=>contextCluesBankV1.find(x=>x.target===word.toLowerCase())??null
export const signalMatches=(type:ContextClueType,signal:string|null)=>type==='general_sense'||type==='multiple_meaning'||type==='two_sentence'?signal===null:signal!==null
export const senseMatches=(word:string,senseId:string)=>findContextClue(word)?.senseId===senseId
export const partOfSpeechMatches=(word:string,part:string)=>findContextClue(word)?.partOfSpeech===part
export const validSentenceTemplate=(entry:(typeof contextCluesBankV1)[number])=>entry.text.includes(entry.target)&&/[.!?]$/u.test(entry.text)&&entry.text.length>=25
export const replacementFits=(word:string,replacement:string)=>{const x=findContextClue(word);return x!==null&&replacement.trim().length>1&&x.grammarFrame.includes('TARGET')}
export const hasTwoSentenceSupport=(word:string)=>{const x=findContextClue(word);return x?.clueType==='two_sentence'&&x.text.split(/[.!?]/u).filter(Boolean).length===2&&x.text.includes(x.support)}
export const senseIsDisambiguated=(word:string)=>{const x=findContextClue(word);return x!==null&&x.alternateSenses.every(s=>String(s)!==String(x.meaning))&&x.text.includes(x.support)}

