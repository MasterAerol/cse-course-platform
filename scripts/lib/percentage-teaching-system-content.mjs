const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const example = (title, problem, steps, answer, visual) => ({
  blockType: 'example',
  content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) },
})
const image = (src, alt, caption) => ({ blockType: 'image', content: { src, alt, caption } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const transition = (label, whatChanged, why, source, arrow = 'straight', movement) => ({
  label, whatChanged, why, source, arrow, ...(movement === undefined ? {} : { movement }),
})

export const percentToDecimalVisual = {
  kind: 'decimal-movement',
  ariaLabel: 'Step-by-step conversion of twenty percent to zero point twenty by dividing by one hundred',
  stages: [
    { label: 'Percent form', expression: [{ text: '20', emphasis: 'highlight' }, { text: '%', emphasis: 'crossed' }], annotation: 'Percent means per hundred' },
    { label: 'Per hundred', expression: [{ text: '20 ÷ 100', emphasis: 'highlight' }], annotation: 'Remove % by dividing by 100' },
    { label: 'Decimal starts here', expression: [{ text: '20' }, { text: '.', emphasis: 'circled' }], annotation: 'A whole number hides a decimal at the end' },
    { label: 'Move 1', expression: [{ text: '2' }, { text: '.', emphasis: 'circled' }, { text: '0' }], annotation: 'One place left' },
    { label: 'Move 2', expression: [{ text: '0' }, { text: '.', emphasis: 'circled' }, { text: '20' }], annotation: 'Two places left in total' },
  ],
  transitions: [
    transition('Translate %', 'The percent sign became division by 100.', 'Percent literally means per hundred.', 'The 20 comes directly from 20%.', 'straight'),
    transition('Show the decimal', '20 was written as 20.', 'A whole number and the same number with a decimal at the end are equal.', 'The hidden decimal starts after the zero.', 'curved'),
    transition('Move 1', 'The decimal moved left once.', 'Dividing by 10 moves a decimal one place left.', 'The digits 2 and 0 have not changed.', 'curved', 'left'),
    transition('Move 2', 'The decimal moved left a second time and a placeholder zero was added.', 'Dividing by 100 means two left moves.', '0.20 is the decimal form of 20 ÷ 100.', 'curved', 'left'),
  ],
  memoryTip: {
    title: 'Memory trick — Percent to decimal',
    rule: 'Remove % and move the decimal two places LEFT.',
    reason: 'The shortcut works because percent means divide by 100.',
    examples: ['8% → 0.08', '20% → 0.20', '45% → 0.45', '125% → 1.25'],
  },
}

export const decimalToPercentVisual = {
  kind: 'decimal-movement',
  ariaLabel: 'Step-by-step conversion of zero point twenty-five to twenty-five percent by multiplying by one hundred',
  stages: [
    { label: 'Decimal form', expression: [{ text: '0' }, { text: '.', emphasis: 'circled' }, { text: '25' }] },
    { label: 'Multiply by 100', expression: [{ text: '0.25 × 100', emphasis: 'highlight' }] },
    { label: 'Move 1', expression: [{ text: '2' }, { text: '.', emphasis: 'circled' }, { text: '5' }], annotation: 'One place right' },
    { label: 'Move 2', expression: [{ text: '25' }, { text: '.', emphasis: 'circled' }], annotation: 'Two places right in total' },
    { label: 'Percent form', expression: [{ text: '25', emphasis: 'highlight' }, { text: '%', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Prepare ×100', 'The decimal was multiplied by 100.', 'A percent names how many parts out of 100.', '0.25 is the given decimal.', 'straight'),
    transition('Move 1', 'The decimal moved right once.', 'Multiplying by 10 moves a decimal one place right.', 'The digits still come from 0.25.', 'curved', 'right'),
    transition('Move 2', 'The decimal moved right a second time.', 'Multiplying by 100 means two right moves.', '25 is the result of 0.25 × 100.', 'curved', 'right'),
    transition('Attach %', 'The percent sign was added to 25.', 'The value is now stated per hundred.', '25 came from multiplying 0.25 by 100.', 'straight'),
  ],
  memoryTip: {
    title: 'Memory trick — Decimal to percent',
    rule: 'Move the decimal two places RIGHT, then add %.',
    reason: 'The shortcut works because converting to percent multiplies by 100.',
    examples: ['0.08 → 8%', '0.25 → 25%', '0.45 → 45%', '1.25 → 125%'],
  },
}

export const findingPercentageVisual = {
  kind: 'decimal-movement',
  ariaLabel: 'Finding twenty percent of eighty by converting the rate to a decimal and multiplying',
  stages: [
    { label: 'Given rate', expression: [{ text: '20%', emphasis: 'highlight' }], annotation: 'Find 20% of 80' },
    { label: 'Per hundred', expression: [{ text: '20 ÷ 100' }], annotation: '% means divide by 100' },
    { label: 'Decimal rate', expression: [{ text: '0.20', emphasis: 'circled' }] },
    { label: '“of” means multiply', expression: [{ text: '0.20 × 80', emphasis: 'highlight' }] },
    { label: 'Final part', expression: [{ text: '16', emphasis: 'final' }], annotation: '20% of 80' },
  ],
  transitions: [
    transition('Translate %', '20% became 20 ÷ 100.', 'Percent means per hundred.', '20 is the rate given in the question.'),
    transition('Divide', '20 ÷ 100 became 0.20.', 'Dividing by 100 moves the hidden decimal in 20. two places left.', '0.20 comes from 20%, not from 80.', 'curved', 'left'),
    transition('Translate “of”', 'The decimal rate was multiplied by the whole 80.', 'In this finding-the-part problem, “of” tells us to multiply.', '0.20 is the rate; 80 is the given whole.'),
    transition('Calculate', '0.20 × 80 became 16.', 'Two tenths of 80 is 16.', 'The final number is the requested part.'),
  ],
  memoryTip: {
    title: 'Memory trick — Finding the part',
    rule: 'Decimal rate × whole = part.',
    reason: 'A percentage rate tells what fraction of the whole to take.',
    examples: ['20% → 0.20', '0.20 × 80 = 16'],
  },
}

export const findingBaseVisual = {
  kind: 'transformation',
  ariaLabel: 'Finding the missing whole when twenty is twenty-five percent of it',
  stages: [
    { label: 'Known relationship', expression: [{ text: 'Whole × 0.25 = 20', emphasis: 'highlight' }] },
    { label: 'Undo multiplication', expression: [{ text: 'Whole = 20 ÷ 0.25', emphasis: 'circled' }] },
    { label: 'Compute', expression: [{ text: 'Whole = 80', emphasis: 'final' }] },
    { label: 'Check', expression: [{ text: '0.25 × 80 = 20' }], annotation: 'The original relationship is true' },
  ],
  transitions: [
    transition('Isolate the whole', 'Multiplication by 0.25 was undone with division by 0.25.', 'Division is the inverse of multiplication.', '20 is the known part and 0.25 comes from 25%.'),
    transition('Divide', '20 ÷ 0.25 became 80.', 'Four groups of 20 make the whole because 25% is one fourth.', '80 is the missing whole.'),
    transition('Verify', 'The result was substituted back into the original relationship.', 'A correct whole must produce the known part.', 'One fourth of 80 is 20.'),
  ],
  memoryTip: {
    title: 'Memory trick — Finding the whole',
    rule: 'Known part ÷ decimal rate = whole.',
    reason: 'Divide because you are undoing multiplication by the rate.',
    examples: ['25% → 0.25', '20 ÷ 0.25 = 80'],
  },
}

export const findingRateVisual = {
  kind: 'transformation',
  ariaLabel: 'Finding what percent twenty is of eighty by dividing part by whole',
  stages: [
    { label: 'Label the values', expression: [{ text: 'Part = 20' }, { text: 'Whole = 80' }] },
    { label: 'Part over whole', expression: [{ text: '20 ÷ 80', emphasis: 'highlight' }], annotation: 'Part ÷ Whole' },
    { label: 'Decimal share', expression: [{ text: '0.25', emphasis: 'circled' }] },
    { label: 'Convert to percent', expression: [{ text: '0.25 × 100' }] },
    { label: 'Rate', expression: [{ text: '25%', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Build the ratio', 'The part 20 was divided by the whole 80.', 'Part ÷ whole tells what fraction of the whole the part represents.', '20 and 80 are labeled from the question.'),
    transition('Divide', '20 ÷ 80 became 0.25.', 'Twenty is one fourth of eighty.', '0.25 is the decimal share.'),
    transition('Prepare percent', 'The decimal was multiplied by 100.', 'Percent states the share per hundred.', '0.25 came from part ÷ whole.'),
    transition('Attach %', '0.25 × 100 became 25%.', 'Moving the decimal two places right is multiplication by 100.', '25% is the requested rate.', 'curved', 'right'),
  ],
  memoryTip: {
    title: 'Memory trick — Finding the rate',
    rule: 'Part ÷ whole, then convert the decimal to percent.',
    reason: 'The division measures the part as a share of its reference whole.',
    examples: ['20 ÷ 80 = 0.25', '0.25 → 25%'],
  },
}

export const percentIncreaseVisual = {
  kind: 'transformation',
  ariaLabel: 'Finding the percent increase when a price rises from eight hundred pesos to nine hundred twenty pesos',
  stages: [
    { label: 'Original and new', expression: [{ text: '₱800 → ₱920', emphasis: 'highlight' }] },
    { label: 'Find the change', expression: [{ text: '₱920 − ₱800 = ₱120' }] },
    { label: 'Compare with original', expression: [{ text: '120 ÷ 800', emphasis: 'circled' }] },
    { label: 'Decimal change', expression: [{ text: '0.15' }] },
    { label: 'Percent increase', expression: [{ text: '15%', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Subtract', 'The original value was subtracted from the new value.', 'Percent change first needs the amount of change.', '₱120 comes from ₱920 − ₱800.'),
    transition('Use the original base', 'The change 120 was divided by the original 800.', 'The question asks how large the change is compared with where the value started.', '800 is the original reference value.'),
    transition('Divide', '120 ÷ 800 became 0.15.', 'The decimal is the change as a share of the original.', '120 is the change; 800 is the base.'),
    transition('Convert', '0.15 became 15%.', 'Multiplying by 100 converts a decimal share to percent.', 'The price increased by 15% of its original value.', 'curved', 'right'),
  ],
  memoryTip: {
    title: 'Memory trick — Percent change',
    rule: 'Change ÷ ORIGINAL value, then convert to percent.',
    reason: 'The original value is the reference point from which the change began.',
    examples: ['Change: 920 − 800 = 120', '120 ÷ 800 = 0.15 = 15%'],
  },
}

export const discountVisual = {
  kind: 'transformation',
  ariaLabel: 'Finding the sale price after a twenty percent discount on one thousand five hundred pesos',
  stages: [
    { label: 'Original price', expression: [{ text: '₱1,500', emphasis: 'highlight' }] },
    { label: 'Discount amount', expression: [{ text: '0.20 × ₱1,500 = ₱300' }], annotation: 'This is not yet the final price' },
    { label: 'Subtract discount', expression: [{ text: '₱1,500 − ₱300' }] },
    { label: 'Sale price', expression: [{ text: '₱1,200', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Find the discount', '20% became 0.20 and was multiplied by the original price.', 'A discount rate describes the amount removed from the original price.', '₱300 is 20% of ₱1,500.'),
    transition('Find what remains', 'The discount amount was subtracted from the original price.', 'A discount lowers the price.', '₱1,500 is the original; ₱300 is the amount removed.'),
    transition('Subtract', '₱1,500 − ₱300 became ₱1,200.', 'The result is the amount the buyer pays.', '₱1,200 is the sale price, not the discount amount.'),
  ],
  memoryTip: {
    title: 'Memory trick — Discount',
    rule: 'Find the discount amount first, then subtract it from the original price.',
    reason: 'The percent names the amount removed, not automatically the final price.',
    examples: ['Discount: ₱300', 'Final price: ₱1,500 − ₱300 = ₱1,200'],
  },
}

export const percentageLessonSpecs = [
  {
    slug: 'introduction-to-percentages', title: 'Introduction to Percentages', lessonType: 'reading', estimatedMinutes: 8,
    blocks: [
      heading('Introduction to Percentages', 1),
      paragraph('A percentage describes a part using 100 as the reference. The symbol % means “per hundred,” so 25% means 25 out of every 100 equal parts.'),
      callout('Percent means per hundred', '50% means 50 out of 100, 25% means 25 out of 100, and 100% means the complete reference whole.'),
      image('/images/percentage-grid-25.svg', 'A ten-by-ten grid with twenty-five highlighted squares', 'Twenty-five highlighted squares out of one hundred represent 25%.'),
      example('Four useful landmarks', 'What do 0%, 50%, 100%, and 125% tell us?', ['0% means none of the reference amount.', '50% means half of the reference amount.', '100% means the complete reference amount.', '125% means the amount is one whole plus another 25% of that reference.'], 'Percentages can describe none, part, all, or more than the reference whole.'),
      callout('More than 100% is valid', 'A team that reaches 125% of a target completed the whole target and 25% more. Percentages are not limited to 0% through 100%.', 'important'),
      callout('Common mistake', 'A percent has meaning only with a reference amount. “50%” tells a share; it does not tell an actual quantity until the whole is known.', 'warning'),
      summary(['Percent means per hundred.', 'A percentage compares a part with a reference whole.', '0%, 50%, and 100% mean none, half, and all of the reference.', 'Percentages above 100% describe more than the reference whole.']),
    ],
  },
  {
    slug: 'understanding-percentages', title: 'Understanding Percentages', lessonType: 'reading', estimatedMinutes: 10,
    blocks: [
      heading('Understanding Percentages', 1),
      paragraph('A percentage is a ratio whose reference denominator is 100. This common reference lets us compare shares even when the original totals are different.'),
      formula('25% means 25/100', 'The numerator names the selected parts; 100 is the common percentage reference.'),
      heading('Mental benchmarks'),
      summary(['1% = one hundredth', '10% = one tenth', '25% = one fourth', '50% = one half', '75% = three fourths', '100% = the whole']),
      example('Percentage points are not percent change', 'A success rate rises from 40% to 50%. How should the change be described?', ['The displayed rates differ by 50% − 40% = 10 percentage points.', 'Relative percent change compares the 10-point change with the original 40%.', '10 ÷ 40 = 0.25, so the relative increase is 25%.'], 'The rate rose by 10 percentage points, which is a 25% increase relative to the original rate.'),
      callout('Memory trick — Name the reference', 'Ask “percent of what?” A percentage is always measured against a base or reference amount, even when that base is only implied.', 'important'),
      callout('Common mistakes', '0.5 means one half, or 50%. But 0.5% means 0.5 out of 100, or 0.005 as a decimal. Also remember that percentages may exceed 100%.', 'warning'),
      summary(['Percentages are ratios measured against 100.', 'Benchmarks help estimate answers quickly.', 'Percentage points subtract two displayed rates.', 'Percent change compares the change with the original value.', 'Always identify the reference amount.']),
    ],
  },
  {
    slug: 'fractions-decimals-and-percentages', title: 'Fractions, Decimals and Percentages', lessonType: 'reading', estimatedMinutes: 12,
    blocks: [
      heading('Fractions, Decimals and Percentages', 1),
      paragraph('Fractions, decimals, and percentages can name the same share. The notation changes, but the amount does not.'),
      example('Percent to decimal', 'Convert 20% to decimal form.', ['Percent means divide by 100.', 'Write the whole number as 20. so the starting decimal is visible.', 'Move the decimal two places left: 20. → 2.0 → 0.20.'], '20% = 0.20', percentToDecimalVisual),
      example('Decimal to percent', 'Convert 0.25 to percent form.', ['A percent is a value per 100, so multiply the decimal by 100.', 'Move the decimal two places right: 0.25 → 2.5 → 25.', 'Attach the percent sign after multiplying by 100.'], '0.25 = 25%', decimalToPercentVisual),
      example('Fraction to decimal', 'Convert 1/4 to a decimal.', ['The fraction bar means division.', 'Divide the numerator by the denominator: 1 ÷ 4 = 0.25.', 'The decimal 0.25 names the same one-fourth share.'], '1/4 = 0.25'),
      example('Decimal to fraction', 'Convert 0.25 to a fraction in simplest form.', ['Two decimal places mean hundredths, so 0.25 = 25/100.', 'Divide numerator and denominator by their greatest common factor, 25.', '25 ÷ 25 = 1 and 100 ÷ 25 = 4.'], '0.25 = 25/100 = 1/4'),
      callout('Common mistake', 'Do not move the decimal without naming the operation: percent to decimal divides by 100; decimal to percent multiplies by 100.', 'warning'),
      summary(['Percent → decimal: divide by 100.', 'Decimal → percent: multiply by 100.', 'Fraction → decimal: numerator ÷ denominator.', 'Decimal → fraction: use place value, then simplify.']),
    ],
  },
  {
    slug: 'finding-the-percentage', title: 'Finding the Percentage', lessonType: 'practice', estimatedMinutes: 12,
    blocks: [
      heading('Finding the Percentage', 1),
      paragraph('Here the unknown is the part. You know the percentage rate and the whole amount, so convert the rate to a decimal and multiply it by the whole.'),
      formula('Part = Decimal rate × Whole', 'The rate tells what share of the whole to take.'),
      callout('Worked-example setup', 'For “Find 20% of 80,” 20% is the rate, 80 is the whole, and the missing part is the answer.'),
      example('Find 20% of 80', 'What is 20% of 80?', ['20% means 20 ÷ 100, so 20% = 0.20.', 'In this finding-the-part problem, “of” means multiply.', 'Multiply the decimal rate by the whole: 0.20 × 80 = 16.', 'Check: 20% is one fifth, and one fifth of 80 is 16.'], '20% of 80 = 16', findingPercentageVisual),
      callout('Common mistake', 'Do not multiply 20 × 80. The rate must be 0.20 because 20% means 20 per hundred.', 'warning'),
      summary(['Identify the rate and the whole.', 'Convert the rate from percent to decimal.', 'Multiply decimal rate × whole.', 'Estimate or use a benchmark to check the result.']),
    ],
  },
  {
    slug: 'finding-the-base', title: 'Finding the Base', lessonType: 'practice', estimatedMinutes: 12,
    blocks: [
      heading('Finding the Base', 1),
      paragraph('The base is the whole or original reference amount. When the part and percent are known but the whole is missing, undo multiplication by dividing by the decimal rate.'),
      formula('Whole = Part ÷ Decimal rate', 'Division isolates the whole because it reverses multiplication by the rate.'),
      example('20 is 25% of what number?', 'Find the missing whole.', ['Write the relationship: Whole × 0.25 = 20.', 'The unknown whole is being multiplied by 0.25.', 'Undo that multiplication: Whole = 20 ÷ 0.25.', 'Compute 20 ÷ 0.25 = 80, then check that 25% of 80 is 20.'], 'The whole is 80.', findingBaseVisual),
      callout('Common mistake', 'Do not multiply 20 by 0.25. That finds 25% of the part, not the whole that produced the part.', 'warning'),
      summary(['The base is the whole or original amount.', 'Convert the percent to a decimal rate.', 'Divide part ÷ decimal rate.', 'Division works because it undoes multiplication by the rate.']),
    ],
  },
  {
    slug: 'finding-the-rate', title: 'Finding the Rate', lessonType: 'practice', estimatedMinutes: 12,
    blocks: [
      heading('Finding the Rate', 1),
      paragraph('The rate tells what share the part is of the whole. Label the two values before dividing so their order stays clear.'),
      formula('Rate = Part ÷ Whole', 'The division gives a decimal share; multiply by 100 to state that share as a percent.'),
      example('20 is what percent of 80?', 'Find the missing rate.', ['Label 20 as the part and 80 as the whole.', 'Divide in that order: Part ÷ Whole = 20 ÷ 80.', '20 ÷ 80 = 0.25.', 'Convert the decimal to percent: 0.25 × 100 = 25%.'], '20 is 25% of 80.', findingRateVisual),
      callout('Common mistake', 'Use part ÷ whole, not whole ÷ part. Reversing the order gives 4, which would incorrectly become 400%.', 'warning'),
      summary(['Label the part and whole.', 'Divide part ÷ whole.', 'Convert the decimal result to percent.', 'Check that the percent matches the relative size of the part.']),
    ],
  },
  {
    slug: 'percentage-increase-and-decrease', title: 'Percentage Increase and Decrease', lessonType: 'reading', estimatedMinutes: 14,
    blocks: [
      heading('Percentage Increase and Decrease', 1),
      paragraph('A percent change compares the amount of change with the original value. Keep the original, change, and new value separate.'),
      formula('Percent change = |New − Original| ÷ Original × 100%', 'The original value is the denominator because it is the starting reference.'),
      example('Price increase', 'A price rises from ₱800 to ₱920. What is the percent increase?', ['Change = ₱920 − ₱800 = ₱120.', 'Compare the change with the original ₱800: 120 ÷ 800 = 0.15.', 'Convert 0.15 to 15%.', 'Check: 10% of 800 is 80 and 5% is 40; together they make the ₱120 increase.'], 'The price increased by 15%.', percentIncreaseVisual),
      example('Quantity decrease', 'A stock count falls from 500 to 425. What is the percent decrease?', ['Decrease = 500 − 425 = 75.', 'Use the original 500 as the base: 75 ÷ 500 = 0.15.', 'Convert 0.15 to 15%.', 'Check: 15% of 500 is 75, and 500 − 75 = 425.'], 'The stock count decreased by 15%.'),
      callout('Common mistake', 'Do not divide by the new value. For ₱800 → ₱920, the comparison begins at ₱800, not ₱920.', 'warning'),
      summary(['Find the amount of change first.', 'Divide change by the original value.', 'Convert the decimal to percent.', 'State clearly whether the change is an increase or decrease.']),
    ],
  },
  {
    slug: 'discounts-and-markups', title: 'Discounts and Markups', lessonType: 'reading', estimatedMinutes: 12,
    blocks: [
      heading('Discounts and Markups', 1),
      paragraph('A discount removes an amount from the original price. A markup adds an amount to cost. The percentage amount and final price are different results.'),
      formula('Sale price = Original price − Discount amount', 'First find the discount from the original price.'),
      example('20% discount', 'An item costs ₱1,500 and is discounted by 20%. What is the sale price?', ['Convert 20% to 0.20.', 'Discount amount = 0.20 × ₱1,500 = ₱300.', 'Sale price = ₱1,500 − ₱300 = ₱1,200.', 'Check: the sale price is lower than the original by exactly ₱300.'], 'The discount is ₱300 and the sale price is ₱1,200.', discountVisual),
      formula('Selling price = Cost + Markup amount', 'Markup is normally based on cost unless the problem states another base.'),
      example('25% markup', 'An item costs ₱800 and receives a 25% markup. What is the selling price?', ['Convert 25% to 0.25.', 'Markup amount = 0.25 × ₱800 = ₱200.', 'Selling price = ₱800 + ₱200 = ₱1,000.', 'Check: 25% is one fourth, and one fourth of ₱800 is ₱200.'], 'The markup is ₱200 and the selling price is ₱1,000.'),
      callout('Common mistake', 'Do not stop after finding the discount or markup amount when the question asks for the final price. Subtract a discount; add a markup.', 'warning'),
      summary(['Discount amount is removed from original price.', 'Markup amount is added to cost.', 'Keep the adjustment amount separate from the final price.', 'Use the base named in the problem.']),
    ],
  },
  {
    slug: 'worked-examples', title: 'Worked Examples', lessonType: 'practice', estimatedMinutes: 15,
    blocks: [
      heading('Worked Examples', 1),
      paragraph('Use the labels part, rate, whole, original, change, and new value. The labels reveal the operation and make each answer easier to check.'),
      example('Finding a part', 'What is 35% of 240?', ['Rate = 35% = 0.35; whole = 240.', 'Part = 0.35 × 240 = 84.', 'Why: the rate tells what share of 240 to take.', 'Check: 35% is slightly more than one third, and one third of 240 is 80.'], 'The part is 84.'),
      example('Finding a whole', '36 is 20% of what number?', ['Part = 36; rate = 20% = 0.20.', 'Whole = 36 ÷ 0.20 = 180.', 'Why: division undoes multiplication by the rate.', 'Check: 20% is one fifth, and one fifth of 180 is 36.'], 'The whole is 180.'),
      example('Finding a rate', '24 is what percent of 96?', ['Part = 24; whole = 96.', 'Rate = 24 ÷ 96 = 0.25 = 25%.', 'Why: part ÷ whole measures the share.', 'Check: 24 is one fourth of 96.'], '24 is 25% of 96.'),
      example('Percentage increase', 'A value rises from 150 to 180.', ['Change = 180 − 150 = 30.', '30 ÷ original 150 = 0.20 = 20%.', 'Why: change is compared with the starting value.', 'Check: one fifth of 150 is 30.'], 'The increase is 20%.'),
      example('Percentage decrease', 'A quantity falls from 400 to 340.', ['Decrease = 400 − 340 = 60.', '60 ÷ original 400 = 0.15 = 15%.', 'Why: 400 is the starting reference.', 'Check: 15% of 400 is 60.'], 'The decrease is 15%.'),
      example('Sale price', 'A ₱900 item is discounted by 30%.', ['Discount = 0.30 × ₱900 = ₱270.', 'Sale price = ₱900 − ₱270 = ₱630.', 'Why: the discount is removed from the original.', 'Check: the buyer pays 70% of ₱900, also ₱630.'], 'The sale price is ₱630.'),
      example('Selling price after markup', 'A product costs ₱600 and is marked up by 20%.', ['Markup = 0.20 × ₱600 = ₱120.', 'Selling price = ₱600 + ₱120 = ₱720.', 'Why: markup is added to cost.', 'Check: ₱720 is 120% of ₱600.'], 'The selling price is ₱720.'),
      callout('Review pattern', 'Asked for the part: multiply. Asked for the whole: divide by the rate. Asked for the rate: part ÷ whole. For changes, compare with the original.', 'important'),
      summary(['Label the known values before choosing an operation.', 'Explain why the chosen operation matches the unknown.', 'Keep adjustment amounts separate from final values.', 'Use a benchmark or reverse operation to check.']),
    ],
  },
  {
    slug: 'guided-practice', title: 'Guided Practice', lessonType: 'practice', estimatedMinutes: 15,
    blocks: [
      heading('Guided Practice', 1),
      paragraph('Try each setup before opening the linked practice activity. Use the hint only after you have named the unknown.'),
      example('Convert 35% to decimal', 'Write 35% as a decimal.', ['Hint: percent means divide by 100.', 'Show the hidden decimal: 35.', 'Move left twice: 35. → 3.5 → 0.35.'], '35% = 0.35'),
      example('Find the part', 'What is 15% of 200?', ['Hint: convert 15% to 0.15.', 'Use part = decimal rate × whole.', '0.15 × 200 = 30.'], '15% of 200 is 30.'),
      example('Find the whole', '42 is 30% of what number?', ['Hint: the whole is missing, so undo multiplication.', 'Convert 30% to 0.30.', '42 ÷ 0.30 = 140.'], 'The whole is 140.'),
      example('Find the rate', '18 is what percent of 60?', ['Hint: label 18 as the part and 60 as the whole.', '18 ÷ 60 = 0.30.', '0.30 × 100 = 30%.'], '18 is 30% of 60.'),
      callout('Before you calculate', 'Name the unknown, identify the reference whole or original value, and estimate whether the answer should be smaller or larger.', 'important'),
      summary(['Percent → decimal means divide by 100.', 'Finding the part uses multiplication.', 'Finding the whole divides by the decimal rate.', 'Finding the rate divides part by whole.', 'Use the practice activity below to mix these skills.']),
    ],
  },
  {
    slug: 'percentages-topic-quiz', title: 'Percentages Topic Quiz', lessonType: 'quiz', estimatedMinutes: 10,
    blocks: [
      heading('Percentages Topic Quiz', 1),
      paragraph('This checkpoint covers percentage meaning, conversions, finding the part, whole, and rate, percent change, discounts, and markups.'),
      callout('Before you start', 'Label the known values, identify the reference amount, and estimate before calculating. Answers and explanations appear after submission.', 'important'),
      summary(['10 questions', 'Passing score: 70%', 'Unlimited attempts', 'No time limit', 'Use the original value as the base for percent change.']),
    ],
  },
]

export const percentageLessonBySlug = new Map(
  percentageLessonSpecs.map((lesson) => [lesson.slug, lesson]),
)
