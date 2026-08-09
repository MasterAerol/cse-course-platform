import type { CseReadiness } from './readiness-api'
export function readinessBandLabel(band: CseReadiness['readinessBand']): string {
  return { building_foundations: 'Building foundations', developing: 'Developing', getting_closer: 'Getting closer', nearly_ready: 'Nearly ready', strong_readiness: 'Strong readiness' }[band]
}
export function confidenceLabel(confidence: CseReadiness['confidence']): string { return `${confidence[0]?.toUpperCase()}${confidence.slice(1)} evidence` }
