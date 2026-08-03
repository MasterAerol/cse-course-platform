import type { GeneratorDifficulty } from '../../generators/generator.types'
import type { Connotation, PartOfSpeech } from '../vocabulary/vocabulary.types'

export type Formality = 'formal' | 'neutral' | 'informal'
export interface SynonymAntonymEntry { word: string; normalized: string; meaning: string; senseId: string; partOfSpeech: PartOfSpeech; synonyms: readonly string[]; antonyms: readonly string[]; intensity: number; connotation: Connotation; formality: Formality; example: string; difficulty: GeneratorDifficulty; usageNote: string }
export type SynonymAntonymMistakeType = 'synant_related_not_equivalent' | 'synant_wrong_relationship' | 'synant_wrong_part_of_speech' | 'synant_intensity_mismatch' | 'synant_connotation_mismatch' | 'synant_register_mismatch' | 'synant_wrong_sense' | 'synant_similar_spelling'
export interface SynonymAntonymScenario { prompt: string; correct: string; targetWord: string; signature: string; explanation: readonly string[]; distractors: readonly { text: string; mistake: SynonymAntonymMistakeType }[] }
