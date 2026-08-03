import type { DataDisplay } from './data-interpretation.types'

export function accessibleDataText(display: Omit<DataDisplay, 'accessibleText'>): string {
  const header = ['Category', ...display.series.map(({ name }) => name)].join(' | ')
  const rows = display.categories.map((category, categoryIndex) => [category, ...display.series.map(({ values }) => values[categoryIndex] ?? '')].join(' | '))
  return `${display.title} (${display.unit})\n${header}\n${rows.join('\n')}`
}
export function formatDataAnswer(value: number, suffix: string, decimals: number): string {
  const rounded = value.toFixed(decimals).replace(/\.0+$/u, '').replace(/(\.\d*?)0+$/u, '$1')
  return suffix === '%' ? `${rounded}%` : suffix === '₱' ? `₱${Number(rounded).toLocaleString('en-PH')}` : suffix === ':1' ? `${rounded}:1` : suffix === '' ? rounded : `${rounded} ${suffix}`
}
export const dataNumericValue = (value: number) => Math.round(value * 10000)
