import type { VocabularyEntry, WordFamilyForm, WordSense } from './vocabulary.types'

type EntryInput = Omit<VocabularyEntry, 'normalized' | 'family' | 'senses' | 'tags'> & {
  family?: readonly WordFamilyForm[]
  senses?: readonly WordSense[]
  tags?: readonly string[]
}

function entry(input: EntryInput): VocabularyEntry {
  return {
    ...input,
    normalized: input.word.trim().toLowerCase(),
    family: input.family ?? [{ word: input.word, partOfSpeech: input.partOfSpeech }],
    senses: input.senses ?? [{ meaning: input.definition, example: input.example, partOfSpeech: input.partOfSpeech }],
    tags: input.tags ?? [],
  }
}

const neutral = 'neutral' as const
const easy = 'easy' as const
const medium = 'medium' as const

export const vocabularyBankV1 = [
  entry({ word: 'rewrite', definition: 'write something again in a clearer or different form', partOfSpeech: 'verb', base: 'write', prefix: 're-', suffix: null, denotation: 'write again', connotation: neutral, confusedWith: null, example: 'Please rewrite the notice before posting it.', difficulty: easy, tags: ['root', 'prefix'] }),
  entry({ word: 'misunderstand', definition: 'understand something incorrectly', partOfSpeech: 'verb', base: 'understand', prefix: 'mis-', suffix: null, denotation: 'understand wrongly', connotation: neutral, confusedWith: null, example: 'Do not misunderstand the revised schedule.', difficulty: easy, tags: ['prefix'] }),
  entry({ word: 'prearrange', definition: 'arrange something before it is needed', partOfSpeech: 'verb', base: 'arrange', prefix: 'pre-', suffix: null, denotation: 'arrange in advance', connotation: neutral, confusedWith: null, example: 'The office will prearrange the interview slots.', difficulty: medium, tags: ['prefix'] }),
  entry({ word: 'underpaid', definition: 'paid less than is fair or expected', partOfSpeech: 'adjective', base: 'paid', prefix: 'under-', suffix: null, denotation: 'paid too little', connotation: 'negative', confusedWith: null, example: 'The report described the temporary staff as underpaid.', difficulty: medium, tags: ['prefix'] }),
  entry({ word: 'helpful', definition: 'providing useful assistance', partOfSpeech: 'adjective', base: 'help', prefix: null, suffix: '-ful', denotation: 'full of help or use', connotation: 'positive', confusedWith: null, example: 'The clerk gave a helpful explanation.', difficulty: easy, tags: ['root', 'suffix'] }),
  entry({ word: 'careless', definition: 'not giving enough attention or care', partOfSpeech: 'adjective', base: 'care', prefix: null, suffix: '-less', denotation: 'without enough care', connotation: 'negative', confusedWith: null, example: 'A careless entry can delay the report.', difficulty: easy, tags: ['root', 'suffix'] }),
  entry({ word: 'agreement', definition: 'a shared decision or accepted arrangement', partOfSpeech: 'noun', base: 'agree', prefix: null, suffix: '-ment', denotation: 'the result or state of agreeing', connotation: neutral, confusedWith: null, example: 'The teams recorded their agreement in writing.', difficulty: easy, tags: ['suffix', 'family'], family: [{ word: 'agree', partOfSpeech: 'verb' }, { word: 'agreement', partOfSpeech: 'noun' }, { word: 'agreeable', partOfSpeech: 'adjective' }] }),
  entry({ word: 'readable', definition: 'clear enough to be read easily', partOfSpeech: 'adjective', base: 'read', prefix: null, suffix: '-able', denotation: 'able to be read', connotation: 'positive', confusedWith: null, example: 'Use a readable font in the public notice.', difficulty: easy, tags: ['suffix'] }),
  entry({ word: 'decision', definition: 'a choice made after considering options', partOfSpeech: 'noun', base: 'decide', prefix: null, suffix: '-sion', denotation: 'the result of deciding', connotation: neutral, confusedWith: null, example: 'The committee explained its decision.', difficulty: easy, tags: ['family'], family: [{ word: 'decide', partOfSpeech: 'verb' }, { word: 'decision', partOfSpeech: 'noun' }, { word: 'decisive', partOfSpeech: 'adjective' }, { word: 'decisively', partOfSpeech: 'adverb' }] }),
  entry({ word: 'employment', definition: 'paid work or the state of being employed', partOfSpeech: 'noun', base: 'employ', prefix: null, suffix: '-ment', denotation: 'the state or act of employing', connotation: neutral, confusedWith: null, example: 'The form asks for current employment details.', difficulty: medium, tags: ['family'], family: [{ word: 'employ', partOfSpeech: 'verb' }, { word: 'employee', partOfSpeech: 'noun' }, { word: 'employment', partOfSpeech: 'noun' }, { word: 'employable', partOfSpeech: 'adjective' }] }),
  entry({ word: 'creative', definition: 'able to produce useful new ideas', partOfSpeech: 'adjective', base: 'create', prefix: null, suffix: '-ive', denotation: 'having the ability to create', connotation: 'positive', confusedWith: null, example: 'The team proposed a creative filing method.', difficulty: medium, tags: ['family'], family: [{ word: 'create', partOfSpeech: 'verb' }, { word: 'creation', partOfSpeech: 'noun' }, { word: 'creative', partOfSpeech: 'adjective' }, { word: 'creatively', partOfSpeech: 'adverb' }] }),
  entry({ word: 'economical', definition: 'using money or resources carefully', partOfSpeech: 'adjective', base: 'economy', prefix: null, suffix: '-ical', denotation: 'avoiding waste', connotation: 'positive', confusedWith: 'economic', example: 'Printing on both sides is an economical choice.', difficulty: medium, tags: ['connotation', 'confused'] }),
  entry({ word: 'temporary', definition: 'lasting for a limited time', partOfSpeech: 'adjective', base: 'temporary', prefix: null, suffix: null, denotation: 'not permanent', connotation: neutral, confusedWith: null, example: 'The office moved to a temporary location.', difficulty: easy, tags: ['definition'] }),
  entry({ word: 'accurate', definition: 'correct and free from mistakes', partOfSpeech: 'adjective', base: 'accurate', prefix: null, suffix: null, denotation: 'correct in detail', connotation: 'positive', confusedWith: null, example: 'Submit an accurate count of the supplies.', difficulty: easy, tags: ['definition'] }),
  entry({ word: 'inspect', definition: 'examine something carefully', partOfSpeech: 'verb', base: 'inspect', prefix: null, suffix: null, denotation: 'look at closely to check condition', connotation: neutral, confusedWith: null, example: 'Inspect the document before signing it.', difficulty: easy, tags: ['definition'] }),
  entry({ word: 'affect', definition: 'to influence or change something', partOfSpeech: 'verb', base: 'affect', prefix: null, suffix: null, denotation: 'influence', connotation: neutral, confusedWith: 'effect', example: 'The delay may affect the delivery date.', difficulty: easy, tags: ['confused'] }),
  entry({ word: 'effect', definition: 'a result produced by a cause', partOfSpeech: 'noun', base: 'effect', prefix: null, suffix: null, denotation: 'result', connotation: neutral, confusedWith: 'affect', example: 'The new schedule had a positive effect.', difficulty: easy, tags: ['confused'] }),
  entry({ word: 'advice', definition: 'a recommendation about what someone should do', partOfSpeech: 'noun', base: 'advice', prefix: null, suffix: null, denotation: 'recommendation', connotation: neutral, confusedWith: 'advise', example: 'The supervisor gave practical advice.', difficulty: easy, tags: ['confused'] }),
  entry({ word: 'advise', definition: 'to recommend a course of action', partOfSpeech: 'verb', base: 'advise', prefix: null, suffix: null, denotation: 'recommend', connotation: neutral, confusedWith: 'advice', example: 'Please advise the applicants about the change.', difficulty: easy, tags: ['confused'] }),
  entry({ word: 'principal', definition: 'the head of a school or the main person or amount', partOfSpeech: 'noun', base: 'principal', prefix: null, suffix: null, denotation: 'a chief person or main amount', connotation: neutral, confusedWith: 'principle', example: 'The principal approved the school notice.', difficulty: medium, tags: ['confused'] }),
  entry({ word: 'principle', definition: 'a basic rule or belief that guides action', partOfSpeech: 'noun', base: 'principle', prefix: null, suffix: null, denotation: 'guiding rule', connotation: neutral, confusedWith: 'principal', example: 'Fairness is an important public-service principle.', difficulty: medium, tags: ['confused'] }),
  entry({ word: 'light', definition: 'brightness that makes things visible', partOfSpeech: 'noun', base: 'light', prefix: null, suffix: null, denotation: 'illumination', connotation: neutral, confusedWith: null, example: 'The light above the counter is bright.', difficulty: easy, tags: ['multiple'], senses: [{ meaning: 'illumination', example: 'The light above the counter is bright.', partOfSpeech: 'noun' }, { meaning: 'not heavy', example: 'The package is light enough to carry.', partOfSpeech: 'adjective' }] }),
  entry({ word: 'file', definition: 'a collection of related records', partOfSpeech: 'noun', base: 'file', prefix: null, suffix: null, denotation: 'organized set of records', connotation: neutral, confusedWith: null, example: 'Place the report in the correct file.', difficulty: easy, tags: ['multiple'], senses: [{ meaning: 'a collection of records', example: 'Open the employee file.', partOfSpeech: 'noun' }, { meaning: 'to officially submit a document', example: 'File the request before Friday.', partOfSpeech: 'verb' }] }),
  entry({ word: 'draft', definition: 'an early version prepared for revision', partOfSpeech: 'noun', base: 'draft', prefix: null, suffix: null, denotation: 'preliminary version', connotation: neutral, confusedWith: null, example: 'Review the draft before sending the letter.', difficulty: medium, tags: ['multiple'], senses: [{ meaning: 'a preliminary version', example: 'Review the draft of the memo.', partOfSpeech: 'noun' }, { meaning: 'to prepare an initial version', example: 'Draft the response this morning.', partOfSpeech: 'verb' }] }),
] as const satisfies readonly VocabularyEntry[]

export function findVocabularyEntry(word: string): VocabularyEntry | null {
  const normalized = word.trim().toLowerCase()
  return vocabularyBankV1.find((item) => item.normalized === normalized) ?? null
}
