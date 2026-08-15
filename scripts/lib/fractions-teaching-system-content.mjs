const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const example = (title, problem, steps, answer, visual) => ({ blockType: 'example', content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) } })
const image = (src, alt, caption) => ({ blockType: 'image', content: { src, alt, caption } })
const summary = (items) => ({ blockType: 'summary', content: { items } })
const transition = (label, whatChanged, why, source, arrow = 'straight', movement) => ({ label, whatChanged, why, source, arrow, ...(movement === undefined ? {} : { movement }) })

export const fractionPartsVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Five equal parts with three selected, showing the numerator, denominator, and fraction bar in three fifths',
  stages: [
    { label: 'One whole', expression: [{ text: '■■■■■', emphasis: 'highlight' }], annotation: 'Start with one complete strip' },
    { label: 'Five equal parts', expression: [{ text: '□ □ □ □ □', emphasis: 'circled' }], annotation: 'Denominator 5 names the total equal parts' },
    { label: 'Select three', expression: [{ text: '■ ■ ■', emphasis: 'highlight' }, { text: ' □ □' }], annotation: 'Numerator 3 counts selected parts' },
    { label: 'Fraction name', expression: [{ text: '3', emphasis: 'highlight' }, { text: ' / ', emphasis: 'circled' }, { text: '5', emphasis: 'final' }], annotation: '3 out of 5 equal parts' },
  ],
  transitions: [
    transition('Divide equally', 'The whole became five pieces of the same size.', 'A denominator counts equal parts, not arbitrary pieces.', 'The 5 comes from the five equal pieces.'),
    transition('Count selected parts', 'Three of the five equal pieces were highlighted.', 'The numerator tells how many equal parts are selected.', 'The 3 comes from counting the highlighted pieces.'),
    transition('Write the fraction', 'The selected count was written above the fraction bar and the total count below it.', 'The fraction bar means the numerator is divided by the denominator.', '3 is selected; 5 is the total number of equal parts.'),
  ],
  memoryTip: { title: 'Memory trick — top selected, bottom total', rule: 'Numerator on top counts selected parts; denominator below counts all equal parts.', reason: 'A fraction compares selected equal parts with the complete set of equal parts.', examples: ['3/5 → 3 selected', '3/5 → 5 equal parts total'] },
}

export const mixedImproperVisual = {
  kind: 'transformation',
  ariaLabel: 'Converting seven fifths to one and two fifths and converting it back without a magic shortcut',
  stages: [
    { label: 'Improper fraction', expression: [{ text: '7/5', emphasis: 'highlight' }], annotation: 'Seven pieces, each one fifth' },
    { label: 'Separate one whole', expression: [{ text: '5/5 + 2/5', emphasis: 'circled' }], annotation: 'Five fifths make one whole' },
    { label: 'Mixed number', expression: [{ text: '1 2/5', emphasis: 'final' }], annotation: 'One whole and two fifths' },
    { label: 'Build fifths again', expression: [{ text: '(1×5 + 2)/5' }], annotation: 'One whole contains five fifths' },
    { label: 'Return to improper', expression: [{ text: '7/5', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Make a whole', 'Seven fifths were separated into five fifths and two fifths.', 'The denominator says five fifths make one complete whole.', '5/5 uses five of the seven fifths; 2/5 remain.'),
    transition('Rename the whole', '5/5 became 1 while 2/5 stayed unchanged.', 'A complete five fifths equals one.', 'The whole 1 came from 5/5.'),
    transition('Count fifths in the whole', 'The whole number was multiplied by denominator 5, then the extra numerator 2 was added.', 'One whole contains five fifths; the mixed number also has two more fifths.', '1×5=5 and 5+2=7.'),
    transition('Keep the denominator', 'The seven counted fifths were written over denominator 5.', 'The size of each piece remains one fifth.', '7 is the total fifths; 5 still names the piece size.'),
  ],
  memoryTip: { title: 'Memory trick — whole × bottom + top', rule: 'For mixed to improper: whole × denominator + numerator; keep the denominator.', reason: 'The multiplication counts how many denominator-sized parts are inside all wholes before adding the extra parts.', examples: ['1 2/5 → 1×5+2=7', '1 2/5 = 7/5'] },
}

export const equivalentFractionsVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Scaling one half to two fourths and three sixths while preserving the same amount',
  stages: [
    { label: 'Start', expression: [{ text: '1/2', emphasis: 'highlight' }], annotation: 'One of two equal parts' },
    { label: 'Scale by 2', expression: [{ text: '(1×2)/(2×2)' }], annotation: 'Double top and bottom together' },
    { label: 'Equivalent form', expression: [{ text: '2/4', emphasis: 'circled' }] },
    { label: 'Scale by 3', expression: [{ text: '(1×3)/(2×3)' }] },
    { label: 'Another equal form', expression: [{ text: '3/6', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Double both counts', 'The numerator and denominator were both multiplied by 2.', 'Dividing each original half into two smaller equal pieces doubles selected and total pieces without changing the amount.', '1×2=2 and 2×2=4.'),
    transition('Evaluate', 'The scaled expression became 2/4.', 'Two fourths cover the same amount as one half.', 'The 2 and 4 come from the two multiplications.'),
    transition('Try a different scale', 'The original numerator and denominator were both multiplied by 3.', 'The same nonzero scale factor preserves the fraction value.', '1×3=3 and 2×3=6.'),
    transition('Evaluate again', 'The scaled expression became 3/6.', 'Three sixths still cover one half of the whole.', '3/6 came from scaling both parts of 1/2.'),
  ],
  memoryTip: { title: 'Memory trick — scale top and bottom together', rule: 'Multiply or divide numerator and denominator by the same nonzero number.', reason: 'You change the number and size of the pieces together, so the represented amount stays equal.', examples: ['1/2 = 2/4', '1/2 = 3/6'] },
}

export const compareOrderVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Ordering one half, two thirds, and three fourths by converting all three to twelfths',
  stages: [
    { label: 'Unlike fractions', expression: [{ text: '1/2, 2/3, 3/4', emphasis: 'highlight' }], annotation: 'The pieces have different sizes' },
    { label: 'Choose twelfths', expression: [{ text: 'LCM(2,3,4)=12', emphasis: 'circled' }] },
    { label: 'Scale each fraction', expression: [{ text: '6/12, 8/12, 9/12' }], annotation: 'Top and bottom scaled together' },
    { label: 'Compare equal pieces', expression: [{ text: '6/12 < 8/12 < 9/12' }] },
    { label: 'Original order', expression: [{ text: '1/2 < 2/3 < 3/4', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Find one piece size', 'A common denominator of 12 was selected.', 'Fractions become directly comparable when every denominator names the same-sized part.', '12 is the least common multiple of 2, 3, and 4.'),
    transition('Create equivalent forms', '1/2 became 6/12, 2/3 became 8/12, and 3/4 became 9/12.', 'Scaling top and bottom together preserves each value.', '2×6=12, 3×4=12, and 4×3=12.'),
    transition('Compare numerators', 'The selected twelfths 6, 8, and 9 were ordered.', 'With equal-sized pieces, the fraction containing more pieces is larger.', '6<8<9.'),
    transition('Restore the names', 'The equivalent twelfths were replaced by their original fractions.', 'Equivalent forms occupy the same position in the order.', '6/12=1/2, 8/12=2/3, and 9/12=3/4.'),
  ],
  memoryTip: { title: 'Memory trick — same-sized pieces first', rule: 'For several unlike fractions, make a common denominator, compare numerators, then write the original fractions in order.', reason: 'Numerators can be compared directly only after denominators describe the same-sized parts.', examples: ['1/2=6/12', '2/3=8/12', '3/4=9/12'] },
}

export const addUnlikeVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Adding one third and three fifths by explicitly scaling both fractions to fifteenths',
  stages: [
    { label: 'Unlike parts', expression: [{ text: '1/3 + 3/5', emphasis: 'highlight' }] },
    { label: 'Common denominator', expression: [{ text: 'LCM(3,5)=15', emphasis: 'circled' }] },
    { label: 'Scale one third', expression: [{ text: '(1×5)/(3×5)=5/15' }] },
    { label: 'Scale three fifths', expression: [{ text: '(3×3)/(5×3)=9/15' }] },
    { label: 'Add equal parts', expression: [{ text: '5/15 + 9/15' }] },
    { label: 'Sum', expression: [{ text: '14/15', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Choose fifteenths', 'A common denominator of 15 was selected.', 'Thirds and fifths are different-sized pieces and cannot be counted together directly.', '15 is the least common multiple of 3 and 5.'),
    transition('Scale by 5', '1/3 became 5/15 by multiplying top and bottom by 5.', 'The numerator must use the same scale factor so the fraction value stays equal.', '3×5=15, so 1×5=5.'),
    transition('Scale by 3', '3/5 became 9/15 by multiplying top and bottom by 3.', 'Both fractions now use the same-sized pieces.', '5×3=15, so 3×3=9.'),
    transition('Combine selected pieces', 'The two equivalent fractions were placed together.', 'Both denominators are now 15, so both count fifteenths.', '5 and 9 are the scaled numerators.'),
    transition('Add numerators', 'Five fifteenths plus nine fifteenths became fourteen fifteenths.', 'The count changes, but the piece size remains one fifteenth.', '5+9=14; denominator 15 stays.'),
  ],
  memoryTip: { title: 'Memory trick — common denominator before adding', rule: 'Find a common denominator, scale top and bottom together, add numerators, and keep the common denominator.', reason: 'Only equal-sized fraction pieces can be counted together.', examples: ['1/3→5/15', '3/5→9/15', '5/15+9/15=14/15'] },
}

export const subtractUnlikeVisual = {
  kind: 'fraction-equivalence',
  ariaLabel: 'Subtracting one fourth from five sixths by converting both fractions to twelfths',
  stages: [
    { label: 'Unlike parts', expression: [{ text: '5/6 − 1/4', emphasis: 'highlight' }] },
    { label: 'Choose twelfths', expression: [{ text: 'LCM(6,4)=12', emphasis: 'circled' }] },
    { label: 'Scale both', expression: [{ text: '10/12 − 3/12' }], annotation: '5×2=10 and 1×3=3' },
    { label: 'Subtract pieces', expression: [{ text: '7/12', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Find common parts', 'A common denominator of 12 was selected.', 'Sixths and fourths must be renamed as equal-sized pieces before subtraction.', '12 is the least common multiple of 6 and 4.'),
    transition('Scale top and bottom', '5/6 became 10/12 and 1/4 became 3/12.', 'Multiplying each numerator by its denominator scale preserves both values.', '6×2=12, so 5×2=10; 4×3=12, so 1×3=3.'),
    transition('Remove selected parts', 'Three twelfths were removed from ten twelfths.', 'The piece size stays one twelfth, so only the numerator count changes.', '10−3=7; denominator 12 stays.'),
  ],
  memoryTip: { title: 'Memory trick — subtract equal pieces', rule: 'Make denominators equal, subtract numerators in the original order, then simplify if possible.', reason: 'Subtraction removes a count of pieces; it does not change their size.', examples: ['5/6=10/12', '1/4=3/12', '10/12−3/12=7/12'] },
}

export const multiplyFractionsVisual = {
  kind: 'transformation',
  ariaLabel: 'Multiplying two thirds by four fifths as two thirds of four fifths',
  stages: [
    { label: 'Fraction of a fraction', expression: [{ text: '2/3 of 4/5', emphasis: 'highlight' }] },
    { label: 'Translate “of”', expression: [{ text: '2/3 × 4/5', emphasis: 'circled' }] },
    { label: 'Multiply tops', expression: [{ text: '2×4=8' }] },
    { label: 'Multiply bottoms', expression: [{ text: '3×5=15' }] },
    { label: 'Product', expression: [{ text: '8/15', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Use multiplication', 'The word “of” became a multiplication sign.', 'Taking a fraction of another amount is multiplication.', '2/3 is the portion taken; 4/5 is the starting amount.'),
    transition('Count selected subparts', 'The numerators 2 and 4 were multiplied.', 'The product numerator counts selected subdivisions.', '2×4=8.'),
    transition('Count total subparts', 'The denominators 3 and 5 were multiplied.', 'Each original part is divided again, making 3×5 total equal subparts.', '3×5=15.'),
    transition('Build the fraction', 'The numerator product 8 was placed over denominator product 15.', 'Eight of the fifteen equal subparts are selected.', '8 comes from 2×4; 15 comes from 3×5.'),
  ],
  memoryTip: { title: 'Memory trick — top × top, bottom × bottom', rule: 'Multiply numerators, multiply denominators, then simplify.', reason: 'A fraction of a fraction subdivides both selected parts and total parts.', examples: ['2×4=8', '3×5=15', '2/3×4/5=8/15'] },
}

export const divideFractionsVisual = {
  kind: 'transformation',
  ariaLabel: 'Dividing two thirds by four fifths using the reciprocal and simplifying ten twelfths to five sixths',
  stages: [
    { label: 'Division question', expression: [{ text: '2/3 ÷ 4/5', emphasis: 'highlight' }], annotation: 'How many groups of 4/5 fit in 2/3?' },
    { label: 'Reciprocal of divisor', expression: [{ text: '4/5 → 5/4', emphasis: 'circled' }] },
    { label: 'Keep, change, flip', expression: [{ text: '2/3 × 5/4' }] },
    { label: 'Multiply', expression: [{ text: '10/12' }] },
    { label: 'Simplify', expression: [{ text: '5/6', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Flip the divisor', 'The second fraction 4/5 became its reciprocal 5/4.', 'The reciprocal is the multiplier that undoes multiplication by 4/5.', 'The numerator and denominator of the divisor trade places.'),
    transition('Change the operation', 'Division became multiplication by 5/4 while 2/3 stayed unchanged.', 'Dividing by a nonzero fraction is equivalent to multiplying by its reciprocal.', 'Keep 2/3; change ÷ to ×; flip only 4/5.'),
    transition('Multiply', 'Numerators produced 10 and denominators produced 12.', 'Fraction multiplication uses top×top and bottom×bottom.', '2×5=10 and 3×4=12.'),
    transition('Reduce', '10/12 became 5/6 by dividing top and bottom by 2.', 'Simplifying creates an equivalent fraction with smaller numbers.', '10÷2=5 and 12÷2=6.'),
  ],
  memoryTip: { title: 'Memory trick — Keep, Change, Flip', rule: 'Keep the first fraction, change ÷ to ×, and flip the second fraction.', reason: 'Multiplying by the reciprocal undoes division by the nonzero divisor fraction.', examples: ['2/3 stays', '÷ becomes ×', '4/5 becomes 5/4'] },
}

export const fractionApplicationVisual = {
  kind: 'transformation',
  ariaLabel: 'Finding three fifths of two hundred applicants by dividing by five and multiplying by three',
  stages: [
    { label: 'Identify values', expression: [{ text: 'fraction=3/5' }, { text: ' whole=200' }], annotation: 'Find the required part' },
    { label: '“of” means multiply', expression: [{ text: '3/5 × 200', emphasis: 'highlight' }] },
    { label: 'Find one fifth', expression: [{ text: '200 ÷ 5 = 40', emphasis: 'circled' }] },
    { label: 'Take three fifths', expression: [{ text: '40 × 3 = 120' }] },
    { label: 'Answer in context', expression: [{ text: '120 applicants', emphasis: 'final' }] },
  ],
  transitions: [
    transition('Translate “of”', 'The fraction and whole were joined by multiplication.', 'A fraction of a whole asks for that proportional part.', '3/5 and 200 are given in the problem.'),
    transition('Divide by denominator', 'The whole 200 was divided into five equal groups.', 'The denominator 5 tells how many equal parts form the whole.', '200÷5=40 applicants in one fifth.'),
    transition('Use the numerator', 'One-fifth group 40 was multiplied by 3.', 'The numerator asks for three of the equal groups.', '40×3=120.'),
    transition('Attach the unit', 'The number 120 was written as 120 applicants.', 'A word-problem answer must identify what was counted.', 'Applicants are the original whole’s unit.'),
  ],
  memoryTip: { title: 'Memory trick — denominator divides, numerator multiplies', rule: 'For a fraction of a whole, divide the whole by the denominator, then multiply by the numerator.', reason: 'Division finds one equal part; multiplication counts how many of those parts are selected.', examples: ['200÷5=40', '40×3=120'] },
}

export const fractionsLessonSpecs = [
  { slug: 'introduction-to-fractions', title: 'Introduction to Fractions', lessonType: 'reading', estimatedMinutes: 8, blocks: [
    heading('Introduction to Fractions', 1), paragraph('A fraction is a number that names part of a whole, group, quantity, or measurement. The whole must be separated into equal parts before the fraction has a fair meaning.'),
    image('/images/fraction-three-fourths.svg', 'One whole divided into four equal parts with three highlighted', 'Three highlighted fourths represent 3/4.'),
    example('From a whole to three fourths', 'A strip is divided into 4 equal parts and 3 are selected.', ['The whole has 4 equal parts, so each part is one fourth.', 'Three parts are selected.', 'Write selected parts over total equal parts: 3/4.'], 'The selected amount is 3/4 of the strip.'),
    callout('Why equal parts matter', 'If pieces have different sizes, counting them does not describe a reliable fraction of the whole.', 'important'),
    callout('Common mistake', 'A fraction does not mean any selected pieces. The pieces must be equal parts of the same reference whole.', 'warning'),
    summary(['A fraction is a number that compares a selected part with a whole.', 'The whole can be an object, group, amount, or measurement.', 'Fraction parts must be equal in size.', 'Fractions can be compared and used in calculations.']),
  ] },
  { slug: 'parts-of-a-fraction', title: 'Parts of a Fraction', lessonType: 'reading', estimatedMinutes: 8, blocks: [
    heading('Parts of a Fraction', 1), paragraph('In 3/5, the numerator 3 counts selected equal parts, the denominator 5 counts all equal parts in the whole, and the fraction bar means 3 divided by 5.'),
    example('Read 3/5 from the picture', 'What does 3/5 tell us?', ['First count all equal parts: 5. This becomes the denominator.', 'Then count highlighted parts: 3. This becomes the numerator.', 'The fraction bar separates the selected count from the total equal-part count.'], '3/5 means three of five equal parts.', fractionPartsVisual),
    formula('numerator / denominator', 'Top = selected equal parts. Bottom = total equal parts. The fraction bar also means division.'),
    callout('Common mistake', 'Do not reverse the numbers. In 3/5, 3 is selected and 5 is the equal-part total. Also, a denominator can never be zero.', 'warning'),
    summary(['The numerator is the top selected-part count.', 'The denominator is the bottom equal-part total.', 'The fraction bar means division.', 'A denominator cannot be zero.']),
  ] },
  { slug: 'proper-improper-and-mixed-fractions', title: 'Proper, Improper, and Mixed Fractions', lessonType: 'reading', estimatedMinutes: 10, blocks: [
    heading('Proper, Improper, and Mixed Fractions', 1), paragraph('A proper fraction is less than one whole, an improper fraction is at least one whole, and a mixed number writes complete wholes beside a remaining proper fraction.'),
    formula('proper: 3/5   improper: 7/5   mixed: 1 2/5', 'Compare the numerator with the denominator to see whether the fraction contains a complete whole.'),
    example('Why 7/5 equals 1 2/5', 'Convert 7/5 to a mixed number and back.', ['Five fifths make one whole.', 'Separate 7/5 into 5/5 + 2/5.', 'Replace 5/5 with 1 to get 1 2/5.', 'To return, count fifths: 1×5+2=7, then keep denominator 5.'], '7/5 = 1 2/5.', mixedImproperVisual),
    callout('Common mistake', 'The shortcut whole×denominator+numerator counts equal parts; it does not change the denominator. Keep denominator 5 in this example.', 'warning'),
    summary(['Proper fractions are less than one whole.', 'Improper fractions contain one whole or more.', 'Five fifths make one whole when the denominator is 5.', 'Mixed→improper counts denominator-sized parts in the wholes, then adds the numerator.']),
  ] },
  { slug: 'equivalent-fractions', title: 'Equivalent Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Equivalent Fractions', 1), paragraph('Equivalent fractions use different numbers to name the same amount. The value stays equal only when numerator and denominator use the same nonzero scale factor.'),
    example('One half has many names', 'Show why 1/2 = 2/4 = 3/6.', ['Multiply top and bottom of 1/2 by 2 to get 2/4.', 'Multiplying both by 2 divides the same half into smaller pieces without changing its coverage.', 'Multiply top and bottom by 3 to get 3/6.'], '1/2, 2/4, and 3/6 are equivalent.', equivalentFractionsVisual),
    example('Scale down', 'Simplify 9/12 by a shared factor.', ['Both 9 and 12 divide by 3.', '9÷3=3 and 12÷3=4.', 'The same divisor preserves the fraction value.'], '9/12 = 3/4.'),
    callout('Common mistake', 'Changing only the numerator or only the denominator changes the value. Scale both by the same nonzero number.', 'warning'),
    summary(['Equivalent fractions name the same amount.', 'Scale numerator and denominator together.', 'The scale factor must be nonzero.', 'You may scale up by multiplication or down by division.']),
  ] },
  { slug: 'simplifying-fractions', title: 'Simplifying Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Simplifying Fractions', 1), paragraph('Simplifying writes an equivalent fraction with smaller numbers. First find a number that divides both numerator and denominator evenly.'),
    example('Simplify 12/18', 'Write 12/18 in simplest form.', ['Both numbers divide evenly by 6.', 'Divide the numerator: 12÷6=2.', 'Divide the denominator by the same 6: 18÷6=3.', 'No whole number greater than 1 divides both 2 and 3.'], '12/18 = 2/3.'),
    formula('12/18 → (12÷6)/(18÷6) → 2/3', 'The greatest common factor is useful, but any shared factor produces an equivalent step toward simplest form.'),
    callout('Memory trick — divide top and bottom together', 'Use the same common factor because simplification must keep the fraction equivalent. Continue until top and bottom share no factor above 1.', 'important'),
    callout('Common mistake', 'Do not subtract the factor or divide only one number. Simplifying requires the same division on numerator and denominator.', 'warning'),
    summary(['Simplifying does not change a fraction’s value.', 'Divide numerator and denominator by the same common factor.', 'Using the greatest common factor can finish in one step.', 'Check that the final numbers share no factor greater than 1.']),
  ] },
  { slug: 'comparing-and-ordering-fractions', title: 'Comparing and Ordering Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Comparing and Ordering Fractions', 1), paragraph('Choose the simplest comparison method: with the same denominator compare numerators; with the same numerator, fewer equal pieces means larger pieces; otherwise use equivalent common-denominator forms.'),
    example('Quick comparisons', 'Compare 3/8 with 5/8, then 3/5 with 3/7.', ['For 3/8 and 5/8, the pieces are both eighths; 5 selected pieces exceed 3.', 'For 3/5 and 3/7, both select 3 pieces, but fifths are larger than sevenths.'], '5/8 > 3/8 and 3/5 > 3/7.'),
    example('Order three unlike fractions', 'Order 1/2, 2/3, and 3/4 from least to greatest.', ['Use denominator 12 so every fraction counts twelfths.', '1/2=6/12, 2/3=8/12, and 3/4=9/12.', 'Compare 6, 8, and 9 selected twelfths.'], '1/2 < 2/3 < 3/4.', compareOrderVisual),
    callout('Why cross comparison works', 'For two positive fractions, cross products compare both amounts after scaling them to the same denominator. It is a shortcut for equivalent-fraction comparison, not magic.', 'important'),
    callout('Common mistake', 'Do not compare numerators alone when denominators differ. First account for the different piece sizes.', 'warning'),
    summary(['Same denominator: compare numerators.', 'Same numerator: the smaller denominator makes larger pieces.', 'Several unlike fractions: use a common denominator.', 'Cross comparison is a common-denominator shortcut for two fractions.']),
  ] },
  { slug: 'adding-fractions', title: 'Adding Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Adding Fractions', 1), paragraph('Addition combines fraction pieces. Like denominators already name equal-sized pieces; unlike denominators must first be renamed with a common denominator.'),
    example('Like denominators', 'Add 2/7 + 3/7.', ['Both fractions count sevenths, so the pieces already match.', 'Add selected pieces: 2+3=5.', 'Keep denominator 7 because the piece size remains one seventh.'], '2/7 + 3/7 = 5/7.'),
    callout('Memory trick — like denominators', 'Add the numerators and keep the denominator because only the number of equal-sized pieces changes.', 'important'),
    example('Unlike denominators', 'Add 1/3 + 3/5.', ['Thirds and fifths are different-sized pieces.', 'Use denominator 15.', 'Scale 1/3 by 5 to get 5/15.', 'Scale 3/5 by 3 to get 9/15.', 'Add 5+9 and keep 15.'], '1/3 + 3/5 = 14/15.', addUnlikeVisual),
    callout('Common mistake', '2/7+3/7 is not 5/14. Adding denominators would change the piece size even though no piece was subdivided.', 'warning'),
    summary(['Like denominators: add numerators and keep the denominator.', 'Unlike denominators: create equivalent fractions with a common denominator.', 'Scale numerator whenever you scale its denominator.', 'Simplify the final sum when possible.']),
  ] },
  { slug: 'subtracting-fractions', title: 'Subtracting Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Subtracting Fractions', 1), paragraph('Subtraction removes fraction pieces. Use the same common-denominator reasoning as addition, and keep the original subtraction order.'),
    example('Subtract unlike fractions', 'Compute 5/6 − 1/4.', ['Sixths and fourths differ, so use twelfths.', '5/6 becomes 10/12 by multiplying top and bottom by 2.', '1/4 becomes 3/12 by multiplying top and bottom by 3.', 'Subtract 10−3 and keep denominator 12.'], '5/6 − 1/4 = 7/12.', subtractUnlikeVisual),
    example('Like denominators and simplify', 'Compute 7/8 − 3/8.', ['Both fractions count eighths.', '7−3=4, so the result is 4/8.', 'Divide top and bottom by 4.'], '7/8 − 3/8 = 1/2.'),
    callout('Common mistake', 'Do not reverse the fractions or subtract denominators. Preserve the question’s order and subtract counts of equal-sized pieces.', 'warning'),
    summary(['Make unlike denominators equal before subtracting.', 'Scale numerator and denominator together.', 'Subtract numerators in the original order.', 'Keep the common denominator and simplify.']),
  ] },
  { slug: 'multiplying-fractions', title: 'Multiplying Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Multiplying Fractions', 1), paragraph('Multiplying fractions finds a fraction of another amount. The word “of” commonly signals multiplication.'),
    example('Two thirds of four fifths', 'Multiply 2/3 × 4/5.', ['Translate “of” as multiplication.', 'Multiply numerators: 2×4=8.', 'Multiply denominators: 3×5=15.', '8 and 15 share no common factor above 1.'], '2/3 × 4/5 = 8/15.', multiplyFractionsVisual),
    example('Optional cross-cancellation', 'Multiply 2/3 × 9/10 efficiently.', ['Before multiplying, divide 2 and 10 by 2 to get 1 and 5.', 'Divide 9 and 3 by 3 to get 3 and 1.', 'Multiply the reduced numerators and denominators.'], '2/3 × 9/10 = 3/5.'),
    callout('Common mistake', 'Convert mixed numbers to improper fractions before multiplying. Cross-cancellation divides a numerator and denominator by the same factor; it is not cross multiplication.', 'warning'),
    summary(['“Of” usually means multiply.', 'Multiply numerator by numerator and denominator by denominator.', 'Simplify before or after multiplying.', 'Cross-cancellation is optional efficiency after the base method is understood.']),
  ] },
  { slug: 'dividing-fractions', title: 'Dividing Fractions', lessonType: 'practice', estimatedMinutes: 10, blocks: [
    heading('Dividing Fractions', 1), paragraph('Fraction division asks how many groups of the divisor fit into the first amount. Multiplying by the divisor’s reciprocal performs the inverse operation.'),
    example('Keep, Change, Flip with a reason', 'Compute 2/3 ÷ 4/5.', ['Keep the first fraction 2/3.', 'Change division to multiplication.', 'Flip only the divisor 4/5 to 5/4.', 'Multiply to get 10/12.', 'Divide top and bottom by 2 to simplify.'], '2/3 ÷ 4/5 = 5/6.', divideFractionsVisual),
    example('Count small groups', 'Compute 2/3 ÷ 1/6.', ['Keep 2/3 and multiply by reciprocal 6/1.', '2×6 over 3×1 gives 12/3.', '12/3=4.'], 'Four groups of 1/6 fit into 2/3.'),
    callout('Common mistake', 'Flip only the second fraction—the divisor. Also convert mixed numbers to improper fractions before applying the reciprocal rule.', 'warning'),
    summary(['Division asks how many divisor-sized groups fit.', 'Keep the first fraction, change ÷ to ×, and flip the second.', 'The reciprocal undoes division by a nonzero fraction.', 'Multiply and simplify the result.']),
  ] },
  { slug: 'mixed-fraction-applications', title: 'Mixed Fraction Applications', lessonType: 'practice', estimatedMinutes: 12, blocks: [
    heading('Mixed Fraction Applications', 1), paragraph('A fraction word problem becomes easier after labeling the whole, the fraction, and the required part. Then translate relationship words such as “of,” “remaining,” or “combined.”'),
    example('Applicants who passed', 'Three fifths of 200 applicants passed. How many passed?', ['Whole=200 applicants.', 'Fraction=3/5.', 'Required part=the applicants who passed.', '“Of” means multiply.', 'Divide 200 by denominator 5, then multiply by numerator 3.'], '120 applicants passed.', fractionApplicationVisual),
    example('Remaining fraction', 'A project completed 3/8 in the morning and 1/4 in the afternoon. What remains?', ['Convert 1/4 to 2/8.', 'Completed: 3/8+2/8=5/8.', 'A whole is 8/8.', 'Remaining: 8/8−5/8=3/8.'], '3/8 of the project remains.'),
    example('Fraction of money', 'Two thirds of a ₱900 allowance is reserved. How much is reserved?', ['Divide ₱900 by denominator 3 to find one third: ₱300.', 'Multiply ₱300 by numerator 2.'], '₱600 is reserved.'),
    callout('Common mistake', 'Do not stop at the fraction calculation without checking the question and attaching the correct unit, such as applicants, pesos, or work completed.', 'warning'),
    summary(['Identify the whole, fraction, required part, and unit.', '“Of” means multiply.', 'For a fraction of a whole, denominator divides and numerator multiplies.', 'For remaining amounts, subtract the used or completed fraction from one whole.', 'Check whether the final result is reasonable in context.']),
  ] },
  { slug: 'fractions-topic-quiz', title: 'Fractions Topic Quiz', lessonType: 'quiz', estimatedMinutes: 15, blocks: [
    heading('Fractions Topic Quiz', 1), paragraph('This checkpoint covers fraction meaning, types, equivalence, simplification, comparison and ordering, all four operations, and applications.'),
    callout('Before you start', 'Label numerator and denominator, make unlike pieces comparable, convert mixed numbers before multiplication or division, and simplify final answers.', 'important'),
    summary(['15 questions', 'Passing score: 70%', 'Use exact fraction reasoning.', 'The quiz is platform-authored and not an official CSC allocation.']),
  ] },
]

export const fractionsLessonBySlug = new Map(fractionsLessonSpecs.map((lesson) => [lesson.slug, lesson]))
