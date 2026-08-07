interface VisualScrollShell {
  clientWidth: number
  scrollLeft: number
  scrollWidth: number
  scrollTo(options: ScrollToOptions): void
}

export interface VisualScrollState {
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
  canScrollLeft: boolean
  canScrollRight: boolean
}

const scrollEdgeTolerance = 1

export function measureVisualScroll(shell: VisualScrollShell): VisualScrollState {
  const maximumScrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth)

  return {
    clientWidth: shell.clientWidth,
    scrollWidth: shell.scrollWidth,
    scrollLeft: shell.scrollLeft,
    canScrollLeft: shell.scrollLeft > scrollEdgeTolerance,
    canScrollRight:
      maximumScrollLeft > scrollEdgeTolerance &&
      shell.scrollLeft < maximumScrollLeft - scrollEdgeTolerance,
  }
}

export function scrollVisualShell(
  shell: VisualScrollShell,
  direction: -1 | 1,
): void {
  const amount = Math.round(Math.max(320, shell.clientWidth * 0.7))
  shell.scrollTo({
    left: shell.scrollLeft + direction * amount,
    behavior: 'smooth',
  })
}

interface VisualResizeObserver {
  observe(target: object): void
  disconnect(): void
}

interface VisualMeasurementRuntime {
  requestFrame(callback: () => void): number
  cancelFrame(frameId: number): void
  createResizeObserver(callback: () => void): VisualResizeObserver | null
}

export function createVisualScrollMeasurement(
  shell: object,
  sequence: object,
  onMeasure: () => void,
  runtime: VisualMeasurementRuntime,
): { schedule: () => void; disconnect: () => void } {
  let measurementFrame: number | null = null
  const schedule = () => {
    if (measurementFrame !== null) {
      runtime.cancelFrame(measurementFrame)
    }
    measurementFrame = runtime.requestFrame(() => {
      measurementFrame = null
      onMeasure()
    })
  }
  const resizeObserver = runtime.createResizeObserver(schedule)
  resizeObserver?.observe(shell)
  resizeObserver?.observe(sequence)
  schedule()

  return {
    schedule,
    disconnect: () => {
      if (measurementFrame !== null) {
        runtime.cancelFrame(measurementFrame)
      }
      resizeObserver?.disconnect()
    },
  }
}
