export type DataDisplayType = 'table' | 'bar' | 'line' | 'pie'

export interface DataSeries {
  name: string
  values: readonly number[]
}

export interface DataDisplay {
  type: DataDisplayType
  title: string
  unit: string
  categories: readonly string[]
  series: readonly DataSeries[]
  axis?: { minimum: number; maximum: number; interval: number }
  legend: readonly string[]
  accessibleText: string
}

export type DataOperation =
  | { kind: 'lookup'; series: number; category: number }
  | { kind: 'sum-series'; series: number }
  | { kind: 'difference'; series: number; first: number; second: number }
  | { kind: 'maximum-category'; series: number }
  | { kind: 'percentage-share'; series: number; category: number }
  | { kind: 'percent-change'; series: number; first: number; second: number }
  | { kind: 'ratio'; series: number; first: number; second: number }
  | { kind: 'mean'; series: number }
  | { kind: 'weighted-mean'; valueSeries: number; weightSeries: number }
  | { kind: 'combined-total'; firstSeries: number; secondSeries: number }

export type DataMistakeType =
  | 'data_wrong_row'
  | 'data_wrong_column'
  | 'data_wrong_category'
  | 'data_wrong_series'
  | 'data_misread_scale'
  | 'data_added_instead_subtracted'
  | 'data_reversed_subtraction'
  | 'data_wrong_denominator'
  | 'data_absolute_not_percent'
  | 'data_omitted_times_100'
  | 'data_new_value_denominator'
  | 'data_reversed_ratio'
  | 'data_omitted_value'
  | 'data_total_not_average'
  | 'data_wrong_count'
  | 'data_simple_not_weighted'
  | 'data_rounded_early'
  | 'data_degree_as_percent'
  | 'data_part_to_whole_confusion'
  | 'data_ignored_component'

export interface DataDistractor { value: number; mistakeType: DataMistakeType }

export interface DataScenario {
  display: DataDisplay
  operation: DataOperation
  question: string
  answerSuffix: string
  answerDecimals: number
  distractors: readonly DataDistractor[]
  steps: readonly string[]
  signature: string
}
