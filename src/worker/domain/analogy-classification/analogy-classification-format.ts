export function formatAnalogy(left: string, right: string, next: string): string {
  return `${left} : ${right} :: ${next} : ?`
}

export function normalizeAnalogyText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, ' ')
}

export function repeatSymbol(symbol: string, count: number): string {
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error('Symbol repetitions must be integers from 1 through 4.')
  return symbol.repeat(count)
}
