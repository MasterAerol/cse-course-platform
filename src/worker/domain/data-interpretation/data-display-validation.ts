import { sum } from './data-interpretation-math'
import type { DataDisplay } from './data-interpretation.types'

export function validateDataDisplay(display: DataDisplay): readonly string[] {
  const failures: string[] = []
  if (display.title.trim() === '' || display.unit.trim() === '') failures.push('Title and unit are required.')
  if (display.categories.length < 2 || new Set(display.categories).size !== display.categories.length) failures.push('Categories must be distinct and nonempty.')
  if (display.series.length === 0 || new Set(display.series.map(({ name }) => name)).size !== display.series.length) failures.push('Series must be distinct and nonempty.')
  for (const series of display.series) if (series.values.length !== display.categories.length || series.values.some((value) => !Number.isFinite(value) || value < 0)) failures.push(`Series ${series.name} has invalid dimensions or values.`)
  if (display.legend.length !== display.series.length || display.series.some(({ name }) => !display.legend.includes(name))) failures.push('Legend does not match the series.')
  if (display.axis !== undefined && (!(display.axis.minimum <= 0) || display.axis.maximum <= display.axis.minimum || display.axis.interval <= 0 || !Number.isFinite(display.axis.interval))) failures.push('Axis scale is invalid.')
  if (display.type === 'pie' && (display.series.length !== 1 || Math.abs(sum(display.series[0]?.values ?? []) - 100) > 1e-9)) failures.push('Pie values must sum to exactly 100 percent.')
  if (display.accessibleText.trim() === '') failures.push('Accessible text is required.')
  return failures
}
export const isValidDataDisplay = (display: DataDisplay) => validateDataDisplay(display).length === 0
export const hasUniqueDataChoices = (choices: readonly string[]) => new Set(choices.map((choice) => choice.trim().toLowerCase())).size === choices.length
