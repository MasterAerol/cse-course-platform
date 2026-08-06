export const percentageOfVisual = {
  kind: 'decimal-movement',
  ariaLabel: 'Board demonstration converting twenty percent to a decimal and finding twenty percent of eighty',
  stages: [
    { label: 'Start', expression: [{ text: '20', emphasis: 'highlight' }, { text: '%', emphasis: 'crossed' }], annotation: 'Twenty percent' },
    { label: 'Remove percent sign', expression: [{ text: '20', emphasis: 'highlight' }], annotation: 'The digits stay the same' },
    { label: 'Decimal starts here', expression: [{ text: '20' }, { text: '.', emphasis: 'circled' }], annotation: 'Whole numbers hide a decimal at the end' },
    { label: 'Move 1', expression: [{ text: '2' }, { text: '.', emphasis: 'circled' }, { text: '0' }], annotation: 'One place left' },
    { label: 'Move 2', expression: [{ text: '0' }, { text: '.', emphasis: 'circled' }, { text: '20' }], annotation: 'Final decimal' },
    { label: '“of” means multiply', expression: [{ text: '0.20', emphasis: 'highlight' }, { text: ' × ' }, { text: '80', emphasis: 'highlight' }] },
    { label: 'Final answer', expression: [{ text: '16', emphasis: 'final' }], annotation: '20% of 80' },
  ],
  transitions: [
    { label: 'Remove %', whatChanged: 'The percent sign was removed; 20 remains.', why: 'We are preparing to write the rate as an ordinary decimal.', source: '20 comes directly from 20%.', arrow: 'straight' },
    { label: 'Reveal the decimal', whatChanged: 'A decimal point was shown after 20.', why: 'Every whole number can be written with a decimal point at the end.', source: '20 and 20. name the same number.', arrow: 'curved' },
    { label: 'Move 1', whatChanged: 'The decimal moved left past the ones digit.', why: 'Percent means divide by 100, so the decimal must move two places left in total.', source: 'The decimal starts after 20 in the whole number 20.', arrow: 'curved', movement: 'left' },
    { label: 'Move 2', whatChanged: 'The decimal moved left past the tens digit; a zero fills the empty ones place.', why: 'This completes the two-place movement for division by 100.', source: '20 ÷ 100 = 0.20.', arrow: 'curved', movement: 'left' },
    { label: 'Translate “of”', whatChanged: 'The decimal rate was placed beside the base 80 with a multiplication sign.', why: 'In a percentage question, “of” tells us to multiply the rate by the whole.', source: '0.20 came from 20%; 80 is the given whole.', arrow: 'straight' },
    { label: 'Multiply', whatChanged: '0.20 × 80 was evaluated as 16.', why: 'Two tenths of 80 is 16.', source: '0.20 × 80 = 16.', arrow: 'straight' },
  ],
  memoryTip: {
    title: 'Memory trick — Percent → Decimal',
    rule: 'Remove % and move the decimal point 2 places LEFT.',
    reason: 'Moving a decimal point two places left is another way of dividing by 100, and percent means “per hundred.”',
    examples: ['8% → 0.08', '20% → 0.20', '45% → 0.45', '125% → 1.25'],
  },
}

export const fractionCommonDenominatorVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Board demonstration giving one fourth and one sixth a common denominator before adding',
  stages: [
    { label: 'Unlike parts', expression: [{ text: '1/4 + 1/6', emphasis: 'highlight' }], annotation: 'Fourths and sixths are different-sized parts' },
    { label: 'Scale both fractions', expression: [{ text: '(1×3)/(4×3) + (1×2)/(6×2)' }], annotation: '12 is the least common denominator' },
    { label: 'Equal-sized parts', expression: [{ text: '3/12 + 2/12', emphasis: 'circled' }] },
    { label: 'Add selected parts', expression: [{ text: '5/12', emphasis: 'final' }] },
  ],
  transitions: [
    { label: 'Choose 12', whatChanged: 'Both fractions are prepared to use denominator 12.', why: 'Fractions can be added only when they describe equal-sized parts.', source: '12 is the smallest common multiple of 4 and 6.', arrow: 'curved' },
    { label: 'Multiply top and bottom', whatChanged: '1/4 became 3/12 and 1/6 became 2/12.', why: 'Multiplying numerator and denominator by the same number preserves each fraction’s value.', source: '4×3=12 and 6×2=12.', arrow: 'straight' },
    { label: 'Add numerators', whatChanged: '3 selected twelfths plus 2 selected twelfths became 5 twelfths.', why: 'The parts now have the same size, so only their counts are combined.', source: '3 and 2 are the scaled numerators; 12 remains the common denominator.', arrow: 'straight' },
  ],
  memoryTip: { title: 'Memory trick — same-sized parts first', rule: 'Find a common denominator, scale top and bottom together, then add the numerators.', reason: 'A denominator names the size of each part; unlike part sizes cannot be counted together directly.', examples: ['1/4 → 3/12', '1/6 → 2/12', '3/12 + 2/12 = 5/12'] },
}

export const ratioScalingVisual = {
  kind: 'ratio-scaling',
  ariaLabel: 'Board demonstration scaling a three-to-five ratio when three parts equal twenty-four',
  stages: [
    { label: 'Original ratio', expression: [{ text: '3 : 5', emphasis: 'highlight' }], annotation: 'Male : female' },
    { label: 'Find one part', expression: [{ text: '24 ÷ 3 = 8' }], annotation: 'Each ratio part equals 8 people' },
    { label: 'Scale both sides', expression: [{ text: '3×8 : 5×8' }], annotation: 'Use the same scale factor' },
    { label: 'Actual counts', expression: [{ text: '24 : 40', emphasis: 'final' }] },
  ],
  transitions: [
    { label: 'Use the known side', whatChanged: 'The known 24 people were divided by the matching 3 ratio parts.', why: 'This reveals the value of one part.', source: '24 is the given male count and 3 is the male ratio term.', arrow: 'straight' },
    { label: 'Scale by 8', whatChanged: 'Each ratio term was multiplied by 8.', why: 'A ratio stays equivalent only when both terms use the same scale factor.', source: 'The scale factor 8 came from 24 ÷ 3.', arrow: 'curved' },
    { label: 'Evaluate', whatChanged: 'The scaled terms became 24 and 40.', why: '3×8=24 and 5×8=40.', source: '3 and 5 are the ratio terms; 8 is the value of one part.', arrow: 'straight' },
  ],
  memoryTip: { title: 'Memory trick — find one part', rule: 'Known amount ÷ matching ratio term = one part; then multiply the other term by one part.', reason: 'Ratio terms count equal shares, so one share is the bridge from the ratio to actual amounts.', examples: ['24 ÷ 3 = 8', '5 × 8 = 40'] },
}

export const averageSharingVisual = {
  kind: 'average-sharing',
  ariaLabel: 'Board demonstration finding the average of four, six, and eight',
  stages: [
    { label: 'Values', expression: [{ text: '4 + 6 + 8', emphasis: 'highlight' }], annotation: 'Three values' },
    { label: 'Find the total', expression: [{ text: '18', emphasis: 'circled' }], annotation: 'All values combined' },
    { label: 'Share equally', expression: [{ text: '18 ÷ 3' }], annotation: 'Total ÷ number of values' },
    { label: 'Average', expression: [{ text: '6', emphasis: 'final' }] },
  ],
  transitions: [
    { label: 'Add every value', whatChanged: '4, 6, and 8 were combined into the total 18.', why: 'An average redistributes the complete total.', source: '18 comes from 4+6+8.', arrow: 'straight' },
    { label: 'Count the values', whatChanged: 'The total 18 was paired with divisor 3.', why: 'There are exactly three original values to share the total among.', source: '3 comes from counting 4, 6, and 8.', arrow: 'curved' },
    { label: 'Divide', whatChanged: '18 divided into 3 equal shares became 6 per share.', why: 'The arithmetic mean is total ÷ number of values.', source: '18 is the total and 3 is the count of original values.', arrow: 'straight' },
  ],
  memoryTip: { title: 'Memory trick — total, count, share', rule: 'Add to get the total, count the values, then divide total by count.', reason: 'The mean is the equal share each value would have if the total were redistributed evenly.', examples: ['Total = 18', 'Count = 3', '18 ÷ 3 = 6'] },
}

export const workRateVisual = {
  kind: 'rate-table',
  ariaLabel: 'Board demonstration turning one job in six hours into a work rate',
  stages: [
    { label: 'Given time', expression: [{ text: '1 job in 6 hours', emphasis: 'highlight' }] },
    { label: 'Identify rate', expression: [{ text: 'rate = work ÷ time' }], annotation: 'Amount of job completed each hour' },
    { label: 'Substitute', expression: [{ text: '1 job ÷ 6 hours' }] },
    { label: 'Rate', expression: [{ text: '1/6 job per hour', emphasis: 'final' }] },
  ],
  transitions: [
    { label: 'Ask “per hour?”', whatChanged: 'Completion time was re-framed as work completed in one hour.', why: 'Rates must describe work per unit of time before rates can be combined.', source: 'The whole job is represented by 1.', arrow: 'curved' },
    { label: 'Place known values', whatChanged: 'Work became 1 and time became 6 in the rate formula.', why: 'The formula is rate = work ÷ time.', source: '1 job and 6 hours are given.', arrow: 'straight' },
    { label: 'Divide', whatChanged: '1 ÷ 6 became the fraction 1/6.', why: 'The worker completes one of six equal job-parts each hour at a constant rate.', source: '1 is the whole job and 6 is the given completion time in hours.', arrow: 'straight' },
  ],
  memoryTip: { title: 'Memory trick — rate before teamwork', rule: 'Convert each completion time into work per hour before adding or subtracting rates.', reason: 'Times cannot be combined directly; rates use the same “job per hour” unit.', examples: ['6 hours → 1/6 job/hour', '3 hours → 1/3 job/hour'] },
}

export const distanceFormulaVisual = {
  kind: 'formula-choice',
  ariaLabel: 'Board demonstration choosing distance equals speed times time when distance is missing',
  stages: [
    { label: 'Given', expression: [{ text: 'speed = 60 km/h' }, { text: '  time = 3 h' }], annotation: 'Distance is missing' },
    { label: 'Choose formula', expression: [{ text: 'distance = speed × time', emphasis: 'circled' }] },
    { label: 'Substitute', expression: [{ text: '60 km/h × 3 h' }] },
    { label: 'Distance', expression: [{ text: '180 km', emphasis: 'final' }] },
  ],
  transitions: [
    { label: 'Identify the unknown', whatChanged: 'The missing quantity was labeled distance.', why: 'The unknown determines which distance–speed–time formula to use.', source: 'Speed and time are supplied; distance is asked for.', arrow: 'curved' },
    { label: 'Insert known values', whatChanged: '60 replaced speed and 3 replaced time.', why: 'Both quantities use compatible hour units.', source: '60 km/h and 3 h come from the problem.', arrow: 'straight' },
    { label: 'Multiply and cancel', whatChanged: '60×3 became 180 and hours canceled from km/h × h.', why: 'Multiplying speed by travel time gives distance.', source: '60 km/h is the given speed and 3 h is the given time.', arrow: 'straight' },
  ],
  memoryTip: { title: 'Memory trick — circle what is missing', rule: 'Missing distance: multiply speed × time. Missing speed or time: divide distance by the known quantity.', reason: 'All three forms come from the same relationship d = st.', examples: ['d = s × t', 's = d ÷ t', 't = d ÷ s'] },
}