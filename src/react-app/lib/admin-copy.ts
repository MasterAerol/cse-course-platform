export function adminLabel(value: string): string {
  return value
    .replace(/[_-]+/gu, ' ')
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/^\w/u, (letter) => letter.toUpperCase())
}
