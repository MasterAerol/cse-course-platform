import type { EnvironmentCategory,EnvironmentSource } from './environment-management.types'
const labels:Record<EnvironmentCategory,string>={rights_sustainability:'environmental rights and sustainability',air:'clean-air management',water:'clean-water management',solid_waste:'ecological solid-waste management',hazardous:'toxic substances and hazardous wastes',biodiversity:'biodiversity, wildlife, and protected areas',eia:'environmental impact assessment',climate:'climate mitigation and adaptation',institutions:'environmental institutions and responsible action'}
export function environmentCategoryLabel(category:EnvironmentCategory):string{return labels[category]}
export function formatEnvironmentReference(source:EnvironmentSource):string{return `${source.sourceTitle}, ${source.provisionId} (${source.institution})`}
export function environmentStableNumber(value:string):number{let total=0;for(const char of value)total=(total*43+(char.codePointAt(0)??0))%1_000_003;return total}
