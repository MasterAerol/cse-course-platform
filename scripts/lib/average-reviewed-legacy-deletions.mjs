import { jsonFingerprint } from './canonical-json.mjs'

export const averagePracticeLinkage=Object.freeze({
 'finding-the-average':'finding-average',
 'finding-a-missing-value':'missing-value-average',
 'combined-average':'combined-average',
 'weighted-average':'weighted-average',
 'average-after-adding-a-value':'average-after-adding',
 'average-after-removing-a-value':'average-after-removing',
 'average-age-problems':'average-age',
 'average-score-and-salary-problems':'average-score-salary',
})

const callout=(text)=>({title:'Common mistakes',text,variant:'warning'})
const summary=(...items)=>({items})
const paragraph=(text)=>({text})
const reviewed=(lessonSlug,legacyBlockId,blockType,expectedIdentifier,expectedContent,canonicalEvidence)=>Object.freeze({topic:'average',lessonSlug,legacyBlockId,blockType,expectedIdentifier,expectedContent:Object.freeze(expectedContent),expectedContentFingerprint:jsonFingerprint(expectedContent),canonicalEvidence})

export const reviewedAverageLegacyDeletions=Object.freeze([
 reviewed('understanding-average',403,'callout','Common mistakes',callout('Do not use the total as the answer, divide by the wrong count, omit a value, or confuse the median with the mean.'),{positions:[7],canonicalBlockIdentifier:'mean-vs-median common mistake',requiredStrings:['arithmetic average','adds all values and divides by the number of values','arranges the values in order and finds the middle value','(2+3+10)÷3=5','median is 3','not necessarily the same']}),
 reviewed('understanding-average',404,'summary','Average represents equal sharing.',summary('Average represents equal sharing.','Use every value exactly once.','Divide the total by the number of observations.','Check how extreme values affect the result.'),{positions:[2,3,8],canonicalBlockIdentifier:'equal-sharing definition and summary',requiredStrings:['redistributing a total equally','Average is equal sharing.','Sum every included value.','Divide total by count']}),
 reviewed('sum-count-and-mean',412,'callout','Common mistakes',callout('Check whether the question asks for a total, count, or average. Use the actual number of observations and choose multiplication or division accordingly.'),{positions:[2,3,4,5,6,7],canonicalBlockIdentifier:'sum-count-mean inverse-operation teaching',requiredStrings:['Identify the unknown','inverse operation','S=A×n','n=S÷A']}),
 reviewed('sum-count-and-mean',413,'summary','Total equals mean times count.',summary('Total equals mean times count.','Count equals total divided by mean.','Label the unknown before calculating.'),{positions:[3,4,5,6,7],canonicalBlockIdentifier:'sum and count derivation summary',requiredStrings:['Average × Count = Sum','126÷18=7','S=A×n','n=S÷A']}),
 reviewed('finding-a-missing-value',428,'summary','Find the required total before subtracting known observations.',summary('Find the required total before subtracting known observations.','Practice reconstructing one missing observation from a target mean.'),{positions:[2,3,5,6],canonicalBlockIdentifier:'required-total-first method',requiredStrings:['Rebuild that required total before subtracting known values','14×4=56','Required total=A×n','Subtract and verify']}),
 reviewed('finding-a-missing-value',429,'paragraph','Practice reconstructing one missing observation from a target mean.',paragraph('Practice reconstructing one missing observation from a target mean.'),{positions:[3,4],canonicalBlockIdentifier:'missing-value worked teaching and linked practice',requiredStrings:['Missing fourth value','Guided target score','328−240=88'],practiceLinkage:'missing-value-average'}),
 reviewed('combined-average',436,'summary','Weight each group mean by its group size.',summary('Weight each group mean by its group size.','Practice combining groups with unequal weights.'),{positions:[2,3,5,6],canonicalBlockIdentifier:'group-size weighting method',requiredStrings:['Convert every group mean back into a total','1,850÷25=74','wrong for unequal groups','Add totals and counts']}),
 reviewed('combined-average',437,'paragraph','Practice combining groups with unequal weights.',paragraph('Practice combining groups with unequal weights.'),{positions:[3,4],canonicalBlockIdentifier:'unequal-group teaching and linked practice',requiredStrings:['Unequal groups','When simple averaging is safe','Equal group sizes give equal weights'],practiceLinkage:'combined-average'}),
 reviewed('weighted-average',445,'paragraph','Practice percentage and quantity-weighted averages.',paragraph('Practice percentage and quantity-weighted averages.'),{positions:[3,4,7],canonicalBlockIdentifier:'percentage and relative weighted examples',requiredStrings:['Percentage weights','Relative weights','830÷10=83'],practiceLinkage:'weighted-average'}),
 reviewed('average-after-adding-a-value',453,'paragraph','Practice recalculating means after a new observation.',paragraph('Practice recalculating means after a new observation.'),{positions:[2,3,6,7],canonicalBlockIdentifier:'adding-observation method and linked practice',requiredStrings:['Recover the old total','130÷6≈21.67','count increases by one','Increase count by one'],practiceLinkage:'average-after-adding'}),
 reviewed('average-after-removing-a-value',461,'paragraph','Practice recalculating means after an observation leaves.',paragraph('Practice recalculating means after an observation leaves.'),{positions:[2,3,5,7],canonicalBlockIdentifier:'removing-observation method and linked practice',requiredStrings:['subtract the removed value','70÷5=14','Removal changes total and count','Reduce count only for removal'],practiceLinkage:'average-after-removing'}),
 reviewed('average-age-problems',468,'summary','Change total age and group count together.',summary('Change total age and group count together.','Practice clear employee, student, team, and group age situations.'),{positions:[2,3,4,6],canonicalBlockIdentifier:'age total-and-count teaching',requiredStrings:['update totals and counts','Person joins','Person leaves','Update the total and number of people together']}),
 reviewed('average-age-problems',469,'paragraph','Practice clear employee, student, team, and group age situations.',paragraph('Practice clear employee, student, team, and group age situations.'),{positions:[3,4,5],canonicalBlockIdentifier:'age application teaching and linked practice',requiredStrings:['Four employees average 30','Six students average 20','Do not average a group mean directly'],practiceLinkage:'average-age'}),
 reviewed('average-score-and-salary-problems',477,'paragraph','Practice earnings, scores, salaries, allowances, and target means.',paragraph('Practice earnings, scores, salaries, allowances, and target means.'),{positions:[2,3,4,5,7],canonicalBlockIdentifier:'score salary and target-mean teaching',requiredStrings:['Scores, salaries, allowances, and sales','Required score','Salary average','target average determines the future total','preserve units'],practiceLinkage:'average-score-salary'}),
])

const reviewedById=new Map(reviewedAverageLegacyDeletions.map((item)=>[item.legacyBlockId,item]))
const identifier=(block)=>String(block.content?.title??block.content?.text??block.content?.expression??block.content?.caption??block.content?.items?.[0]??'(unlabeled block)').replace(/\s+/g,' ').slice(0,160)

export function classifyReviewedAverageDeletion({topic='average',lessonSlug,block,canonicalLesson}){
 const fallback={learnerContentAssessment:'requires-human-review'}
 const review=reviewedById.get(block?.id)
 if(!review||topic!==review.topic||lessonSlug!==review.lessonSlug||block.type!==review.blockType||identifier(block)!==review.expectedIdentifier||jsonFingerprint(block.content)!==review.expectedContentFingerprint)return fallback
 if(!canonicalLesson||canonicalLesson.slug!==lessonSlug)return fallback
 const selected=review.canonicalEvidence.positions.map((position)=>canonicalLesson.blocks[position-1]).filter(Boolean)
 if(selected.length!==review.canonicalEvidence.positions.length)return fallback
 const canonicalText=JSON.stringify(selected)
 if(!review.canonicalEvidence.requiredStrings.every((value)=>canonicalText.includes(value)))return fallback
 const expectedPractice=review.canonicalEvidence.practiceLinkage
 if(expectedPractice!==undefined&&averagePracticeLinkage[lessonSlug]!==expectedPractice)return fallback
 return{learnerContentAssessment:'superseded-with-equivalent-content',replacementEvidence:{canonicalBlockIdentifier:review.canonicalEvidence.canonicalBlockIdentifier,conceptFingerprint:jsonFingerprint({lessonSlug,positions:review.canonicalEvidence.positions,blocks:selected,practiceLinkage:expectedPractice??null})},reviewedLegacyContentFingerprint:review.expectedContentFingerprint}
}