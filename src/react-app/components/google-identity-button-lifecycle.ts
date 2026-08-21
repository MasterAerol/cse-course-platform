export interface GoogleButtonRenderOptions {
  type: 'standard'
  theme: 'outline'
  size: 'large'
  text: 'continue_with'
  shape: 'rectangular'
  logo_alignment: 'left'
  locale: 'en'
  width: number
}

const GOOGLE_BUTTON_MIN_WIDTH = 220
const GOOGLE_BUTTON_MAX_WIDTH = 400
const mountedGoogleButtonContainers = new WeakSet<HTMLElement>()

export function getGoogleButtonWidth(availableWidth: number): number {
  const measuredWidth = Number.isFinite(availableWidth)
    ? Math.floor(availableWidth)
    : GOOGLE_BUTTON_MIN_WIDTH

  return Math.min(
    GOOGLE_BUTTON_MAX_WIDTH,
    Math.max(GOOGLE_BUTTON_MIN_WIDTH, measuredWidth),
  )
}

export function mountGoogleIdentityButton(
  container: HTMLElement,
  renderButton: (parent: HTMLElement, options: GoogleButtonRenderOptions) => void,
  options: GoogleButtonRenderOptions,
): boolean {
  if (mountedGoogleButtonContainers.has(container)) {
    return false
  }

  mountedGoogleButtonContainers.add(container)
  container.replaceChildren()

  try {
    renderButton(container, options)
    return true
  } catch (error) {
    mountedGoogleButtonContainers.delete(container)
    container.replaceChildren()
    throw error
  }
}

export function clearGoogleIdentityButton(container: HTMLElement): void {
  mountedGoogleButtonContainers.delete(container)
  container.replaceChildren()
}

