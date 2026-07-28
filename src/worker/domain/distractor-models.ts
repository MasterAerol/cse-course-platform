export type NumericChoiceKind = 'number' | 'count' | 'percent' | 'money'

export type DistractorMistakeType =
  | 'used_rate_number_directly'
  | 'used_base_as_answer'
  | 'divided_instead_of_multiplied'
  | 'divided_base_by_percent_number'
  | 'decimal_shift_left'
  | 'decimal_shift_right'
  | 'forgot_percent_conversion'
  | 'subtracted_rate_from_base'
  | 'multiplied_instead_of_divided'
  | 'divided_by_percent_number'
  | 'decimal_shift_rate_low'
  | 'decimal_shift_rate_high'
  | 'used_percentage_amount_as_base'
  | 'subtracted_rate_number'
  | 'added_rate_number'
  | 'treated_rate_as_whole_multiplier'
  | 'forgot_times_100'
  | 'reversed_ratio'
  | 'difference_over_base'
  | 'used_part_as_percent'
  | 'used_base_as_percent'
  | 'discount_amount_only'
  | 'added_discount'
  | 'subtracted_percent_number'
  | 'markup_amount_only'
  | 'subtracted_markup'
  | 'added_markup_percent_number'
  | 'stopped_after_first_step'
  | 'applied_rate_to_original_whole'
  | 'confused_remaining_percent'

export interface DistractorDerivation {
  operation: string
  inputs: number[]
}

export interface DistractorCandidate {
  value: number
  formattedText: string
  mistakeType: DistractorMistakeType
  derivation: DistractorDerivation
  qualityScore: number
}

export interface NumericChoiceValidationContext {
  kind: NumericChoiceKind
  correctValue: number
  countable: boolean
}
