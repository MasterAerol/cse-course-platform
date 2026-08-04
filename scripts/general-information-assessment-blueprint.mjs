export const requiredTopics = [
  'philippine-constitution-fundamentals',
  'ra-6713-code-of-conduct',
  'peace-and-human-rights',
  'environment-management-and-protection',
]

export const topicTitles = [
  'Philippine Constitution Fundamentals',
  'RA 6713: Code of Conduct and Ethical Standards',
  'Peace and Human Rights Issues and Concepts',
  'Environment Management and Protection',
]

export const generatorPools = [
  ['constitution-structure-principles','bill-of-rights','citizenship-suffrage','legislative-department','executive-department','judicial-department','constitutional-commissions','public-officer-accountability','local-government-economy-amendments','mixed-philippine-constitution'],
  ['ra6713-policy-coverage-definitions','ra6713-norms-of-conduct','ra6713-public-facing-duties','ra6713-saln-disclosure','ra6713-conflict-divestment','ra6713-financial-material-interests','ra6713-outside-employment-information','ra6713-gifts-favors','ra6713-incentives-penalties','mixed-ra6713-ethics'],
  ['human-dignity-universality','civil-political-rights','economic-social-cultural-rights','equality-nondiscrimination','rights-duties-responsibilities','peace-conflict-nonviolence','conflict-prevention-resolution','peacebuilding-concepts','human-rights-institutions','mixed-peace-human-rights'],
  ['environmental-rights-sustainability','clean-air-management','clean-water-management','ecological-solid-waste','toxic-hazardous-substances','biodiversity-wildlife-protected-areas','environmental-impact-assessment','climate-mitigation-adaptation','environmental-institutions-action','mixed-environment-management'],
]

export const generalInformationBlueprintV1 = {
  subjectSlug: 'general-information',
  version: 1,
  totalQuestions: 40,
  passingScorePercent: 70,
  topics: requiredTopics.map((topicSlug,index)=>({
    topicSlug,
    topicTitle: topicTitles[index],
    position: index+1,
    count: 10,
    difficulty: { easy:4,medium:4,hard:2 },
    generators: generatorPools[index].map((slug,generatorIndex)=>({slug,version:1,rotationPosition:generatorIndex+1,selectionWeight:1})),
  })),
}
