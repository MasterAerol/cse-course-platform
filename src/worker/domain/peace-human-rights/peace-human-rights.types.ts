import type { GeneratorDifficulty } from '../../generators/generator.types'
export type PeaceHumanRightsCategory='dignity_universality'|'civil_political'|'economic_social_cultural'|'equality_nondiscrimination'|'rights_responsibilities'|'peace_conflict_nonviolence'|'conflict_prevention_resolution'|'peacebuilding'|'institutions'
export type PeaceHumanRightsConceptClass='dignity'|'universality'|'civil'|'political'|'economic'|'social'|'cultural'|'equality'|'responsibility'|'peace'|'conflict_resolution'|'peacebuilding'|'institution'
export type PeaceHumanRightsSourceType='constitution'|'declaration'|'treaty'|'constitutional_mandate'|'un_educational_material'
export type PeaceHumanRightsClassification='philippine'|'international'
export type PeaceHumanRightsMistakeType='phr_rights_citizens_only'|'phr_equality_identical'|'phr_conflict_is_violence'|'phr_peace_is_silence'|'phr_nonviolence_inaction'|'phr_rights_unlimited'|'phr_escr_charity_only'|'phr_reconciliation_impunity'|'phr_chr_is_court'|'phr_treaty_body_domestic'
export interface PeaceHumanRightsSource{sourceTitle:string;sourceUrl:string;sourceType:PeaceHumanRightsSourceType;provisionId:string;institution:string;classification:PeaceHumanRightsClassification;verificationDate:'2026-08-04';contentVersion:'peace-human-rights-v1';paraphrasedRule:string}
export interface PeaceHumanRightsDistractor{text:string;mistakeType:PeaceHumanRightsMistakeType}
export interface PeaceHumanRightsEntry{id:string;category:PeaceHumanRightsCategory;conceptClass:PeaceHumanRightsConceptClass;concept:string;explanation:string;exactTerms:readonly string[];misconception:string;scenarioTemplates:readonly string[];difficulty:GeneratorDifficulty;distractors:readonly PeaceHumanRightsDistractor[];source:PeaceHumanRightsSource;active:true}
