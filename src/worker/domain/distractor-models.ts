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
  | 'multiplied_numerator_only'
  | 'multiplied_denominator_only'
  | 'added_scale_factor'
  | 'reversed_fraction'
  | 'divided_numerator_only'
  | 'divided_denominator_only'
  | 'used_non_common_divisor'
  | 'stopped_simplifying_too_early'
  | 'subtracted_common_factor'
  | 'compared_numerators_only'
  | 'compared_denominators_only'
  | 'reversed_inequality'
  | 'chose_larger_denominator'
  | 'added_denominators'
  | 'added_straight_across'
  | 'wrong_common_denominator'
  | 'forgot_to_simplify_fraction'
  | 'converted_mixed_number_incorrectly'
  | 'subtracted_denominators'
  | 'reversed_subtraction'
  | 'converted_numerators_incorrectly'
  | 'added_instead_of_multiplied'
  | 'multiplied_numerator_added_denominator'
  | 'cross_multiplied'
  | 'inverted_unnecessarily'
  | 'multiplied_without_flipping'
  | 'flipped_first_fraction'
  | 'flipped_both_fractions'
  | 'divided_straight_across'
  | 'added_instead_of_divided'
  | 'ignored_decimal_point'
  | 'misaligned_decimal_places'
  | 'rounded_to_wrong_place'
  | 'truncated_instead_of_rounded'
  | 'ordered_by_digit_count'
  | 'decimal_place_shift'
  | 'used_wrong_operation'
  | 'converted_fraction_denominator_incorrectly'
  | 'simplified_one_ratio_term_only'
  | 'used_wrong_common_divisor'
  | 'compared_ratio_terms_only'
  | 'chose_larger_group_total'
  | 'multiplied_one_ratio_term_only'
  | 'used_ratio_difference'
  | 'used_wrong_cross_products'
  | 'divided_by_wrong_coefficient'
  | 'added_across_proportion'
  | 'used_inverse_relationship'
  | 'used_direct_relationship'
  | 'used_wrong_scale_factor'
  | 'used_wrong_unit_rate'
  | 'used_wrong_constant_product'
  | 'divided_by_one_ratio_term'
  | 'forgot_total_ratio_parts'
  | 'treated_ratio_as_percentage'
  | 'reversed_ratio_shares'

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
