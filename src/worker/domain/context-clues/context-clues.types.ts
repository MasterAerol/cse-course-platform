import type { GeneratorDifficulty } from '../../generators/generator.types'
import type { PartOfSpeech } from '../vocabulary/vocabulary.types'
export type ContextClueType='definition'|'synonym'|'contrast'|'example'|'cause_effect'|'general_sense'|'multiple_meaning'|'two_sentence'
export interface ContextClueEntry{target:string;senseId:string;meaning:string;partOfSpeech:PartOfSpeech;clueType:ContextClueType;signal:string|null;text:string;support:string;alternateSenses:readonly string[];difficulty:GeneratorDifficulty;grammarFrame:string}
export type ContextClueMistakeType='context_wrong_sense'|'context_related_not_equivalent'|'context_reversed_contrast'|'context_example_not_category'|'context_effect_not_meaning'|'context_wrong_part_of_speech'|'context_unsupported_familiar_meaning'|'context_semantic_mismatch'
