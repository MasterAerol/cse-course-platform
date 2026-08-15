const heading=(text,level=2)=>({blockType:'heading',content:{level,text}})
const paragraph=(text)=>({blockType:'paragraph',content:{text}})
const callout=(title,text,variant='info')=>({blockType:'callout',content:{title,text,variant}})
const formula=(expression,description)=>({blockType:'formula',content:{expression,description}})
const example=(title,problem,steps,answer,visual)=>({blockType:'example',content:{title,problem,steps,answer,...(visual===undefined?{}:{visual})}})
const summary=(items)=>({blockType:'summary',content:{items}})
const t=(label,whatChanged,why,source,arrow='straight',movement)=>({label,whatChanged,why,source,arrow,...(movement===undefined?{}:{movement})})
const memory=(title,rule,reason,examples)=>({title,rule,reason,examples})

export const decimalPlaceValueVisual={kind:'transformation',ariaLabel:'Place-value expansion of 3.472 into three ones, four tenths, seven hundredths, and two thousandths',stages:[
 {label:'Decimal number',expression:[{text:'3.472',emphasis:'highlight'}],annotation:'The point separates wholes from fractional places'},
 {label:'Ones',expression:[{text:'3',emphasis:'circled'},{text:' . 4 7 2'}],annotation:'3 means 3 ones'},
 {label:'Tenths',expression:[{text:'3 . '},{text:'4',emphasis:'circled'},{text:' 7 2'}],annotation:'4 means 4 tenths = 0.4'},
 {label:'Hundredths',expression:[{text:'3 . 4 '},{text:'7',emphasis:'circled'},{text:' 2'}],annotation:'7 means 7 hundredths = 0.07'},
 {label:'Thousandths',expression:[{text:'3 . 4 7 '},{text:'2',emphasis:'circled'}],annotation:'2 means 2 thousandths = 0.002'},
 {label:'Expanded form',expression:[{text:'3 + 0.4 + 0.07 + 0.002',emphasis:'final'}]}],transitions:[
 t('Locate the whole','The digit 3 was isolated.','Digits left of the point name whole-number places.','3 comes from the ones column.'),
 t('Move one place right','The digit 4 became 0.4.','The first place right is tenths, or parts of size 1/10.','4 comes from the tenths column.'),
 t('Move two places right','The digit 7 became 0.07.','The second place right is hundredths, or parts of size 1/100.','7 comes from the hundredths column.'),
 t('Move three places right','The digit 2 became 0.002.','The third place right is thousandths, or parts of size 1/1000.','2 comes from the thousandths column.'),
 t('Add each place','The four place values were joined by addition.','A decimal is the sum contributed by every digit.','All four addends came from their columns.')],memoryTip:memory('Memory trick — name the final place','Right of the point: tenths, hundredths, thousandths.','Each step right divides the place value by 10.',['0.4 = 4 tenths','0.07 = 7 hundredths','0.002 = 2 thousandths'])}

export const readingWritingDecimalsVisual={kind:'transformation',ariaLabel:'Writing six and twenty-three hundredths as 6.23 from its whole and fractional parts',stages:[
 {label:'Words',expression:[{text:'six and twenty-three hundredths',emphasis:'highlight'}]},
 {label:'Whole part',expression:[{text:'6',emphasis:'circled'}],annotation:'The word before “and” names the whole'},
 {label:'Fractional part',expression:[{text:'23/100',emphasis:'circled'}],annotation:'Hundredths means denominator 100'},
 {label:'Decimal fraction',expression:[{text:'0.23'}],annotation:'23/100 fills tenths and hundredths'},
 {label:'Combine',expression:[{text:'6 + 0.23 = 6.23',emphasis:'final'}]}],transitions:[
 t('Read the whole','The word six became 6.','“And” marks the decimal point.','6 comes directly from “six.”'),
 t('Name the fraction','Twenty-three hundredths became 23/100.','The final place name supplies the denominator.','23 is the count; hundredths means 100.'),
 t('Use place value','23/100 became 0.23.','Two places are needed to reach hundredths.','2 tenths and 3 hundredths make 23 hundredths.'),
 t('Join both parts','6 and 0.23 became 6.23.','The point separates whole and fractional parts.','6 is whole; .23 is fractional.')],memoryTip:memory('Memory trick — “and” marks the point','Write the whole, place the point at “and,” then fill through the final place name.','The final place name tells the denominator and required digits.',['seven tenths → 0.7','seven hundredths → 0.07'])}

export const compareOrderDecimalsVisual={kind:'transformation',ariaLabel:'Comparing 0.6 with 0.58 and ordering four decimals by aligned place values',stages:[
 {label:'Compare',expression:[{text:'0.6  ?  0.58',emphasis:'highlight'}]},
 {label:'Match places',expression:[{text:'0.60  ?  0.58',emphasis:'circled'}],annotation:'A trailing zero preserves value'},
 {label:'Compare tenths',expression:[{text:'6 tenths > 5 tenths'}]},
 {label:'Result',expression:[{text:'0.6 > 0.58',emphasis:'final'}]},
 {label:'Align a list',expression:[{text:'0.700, 0.650, 0.705, 0.680'}]},
 {label:'Ascending',expression:[{text:'0.65 < 0.68 < 0.70 < 0.705',emphasis:'final'}]}],transitions:[
 t('Add a placeholder','0.6 became 0.60.','6/10 and 60/100 are equal.','The zero fills hundredths and adds no value.'),
 t('Compare left to right','The tenths digits 6 and 5 were compared.','The first unequal place decides the larger value.','6 and 5 come from the tenths columns.'),
 t('Use the symbol','The question mark became >.','Six tenths exceeds five tenths.','The result comes from 6>5 in equal places.'),
 t('Align every number','Each value was written through thousandths.','Matching columns compare equal place values.','Zeros were appended only at right ends.'),
 t('Sort the aligned values','The values were ordered by tenths, hundredths, then thousandths.','Left-to-right place-value comparison is reliable.','650<680<700<705 thousandths.')],memoryTip:memory('Memory trick — line up, fill, compare','Line up points, add trailing zeros if helpful, then compare left to right.','Aligned columns represent equal place values.',['0.6 = 0.60','0.60 > 0.58','0.70 = 0.700'])}

export const roundingDecimalsVisual={kind:'transformation',ariaLabel:'Rounding 4.376 to the nearest hundredth by marking 7 and inspecting 6',stages:[
 {label:'Number',expression:[{text:'4.376',emphasis:'highlight'}]},
 {label:'Mark hundredths',expression:[{text:'4.3'},{text:'7',emphasis:'circled'},{text:'6'}],annotation:'7 is the target'},
 {label:'Look right',expression:[{text:'6',emphasis:'highlight'}],annotation:'6 is the thousandths digit'},
 {label:'Round upward',expression:[{text:'7 → 8'}],annotation:'6 is at least 5'},
 {label:'Rounded value',expression:[{text:'4.38',emphasis:'final'}]}],transitions:[
 t('Find the target','The hundredths digit 7 was marked.','The requested place may stay or increase.','7 is second right of the point.'),
 t('Inspect one place right','Attention moved to 6.','It indicates which nearby hundredth is closer.','6 is the thousandths digit.'),
 t('Increase the target','7 became 8.','A look-right digit of at least 5 rounds upward.','8 comes from 7+1.'),
 t('Remove later digits','The thousandths digit was removed.','A value rounded to hundredths ends there.','4.38 retains the other places and new 8.')],memoryTip:memory('Memory trick — mark, then look right','5–9 adds 1 to the marked digit; 0–4 keeps it.','The next digit shows which nearby rounded value is closer.',['4.376 → 4.38','4.372 → 4.37'])}

export const addingDecimalsVisual={kind:'transformation',ariaLabel:'Adding 12.5 and 3.75 by appending zero and aligning equal place values',stages:[
 {label:'Problem',expression:[{text:'12.5 + 3.75',emphasis:'highlight'}]},
 {label:'Equal places',expression:[{text:'12.50 + 3.75',emphasis:'circled'}],annotation:'12.5 equals 12.50'},
 {label:'Align points',expression:[{text:' 12.50\n+ 3.75'}],annotation:'Ones under ones; tenths under tenths'},
 {label:'Add columns',expression:[{text:' 12.50\n+ 3.75\n———\n 16.25',emphasis:'final'}]}],transitions:[
 t('Add a zero','12.5 became 12.50.','A trailing zero fills hundredths without changing value.','12.5=125/10 and 12.50=1250/100.'),
 t('Match places','The points and columns were aligned.','Only equal place values may be added directly.','Columns represent ones, tenths, and hundredths.'),
 t('Add right to left','The aligned values produced 16.25.','Column addition preserves place value.','0+5=5; 5+7=12 tenths with carrying.')],memoryTip:memory('Memory trick — align decimal points','Align points, add trailing zeros if needed, then add by place.','Point alignment matches ones, tenths, and hundredths.',['12.5 = 12.50','12.50 + 3.75 = 16.25'])}

export const subtractingDecimalsVisual={kind:'transformation',ariaLabel:'Subtracting 7.85 from 15.2 by adding zero, aligning, and regrouping',stages:[
 {label:'Problem',expression:[{text:'15.2 − 7.85',emphasis:'highlight'}]},
 {label:'Add placeholder',expression:[{text:'15.20 − 7.85',emphasis:'circled'}]},
 {label:'Align points',expression:[{text:' 15.20\n− 7.85'}]},
 {label:'Regroup',expression:[{text:'10 hundredths − 5; 11 tenths − 8'}],annotation:'Borrow one tenth, then one one'},
 {label:'Difference',expression:[{text:'7.35',emphasis:'final'}]}],transitions:[
 t('Fill hundredths','15.2 became 15.20.','The zero is a value-preserving placeholder.','15.2 and 15.20 are equal.'),
 t('Match columns','The points were aligned.','Subtraction removes equal place values.','Columns come from decimal place value.'),
 t('Exchange equal value','One tenth became ten hundredths; one one became ten tenths.','Regrouping renames value without changing the total.','The borrowed values come from the next larger places.'),
 t('Subtract by column','The regrouped values produced 7.35.','Ordinary subtraction applies after places match.','10−5=5, 11−8=3, and 14−7=7.')],memoryTip:memory('Memory trick — align, fill, regroup','Align points, fill ending places with zeros, then regroup by place.','One larger unit equals ten units in the next smaller place.',['1 tenth = 10 hundredths','15.20 − 7.85 = 7.35'])}

export const multiplyingDecimalsVisual={kind:'decimal-movement',ariaLabel:'Multiplying 2.4 by 0.3 through whole-number digits, decimal-place count, and fractions',stages:[
 {label:'Decimal factors',expression:[{text:'2.4 × 0.3',emphasis:'highlight'}]},
 {label:'Whole-number digits',expression:[{text:'24 × 3'}]},
 {label:'Multiply',expression:[{text:'24 × 3 = 72',emphasis:'circled'}]},
 {label:'Count places',expression:[{text:'1 place + 1 place = 2 places'}]},
 {label:'Place decimal',expression:[{text:'0.72',emphasis:'final'}]},
 {label:'Why it works',expression:[{text:'24/10 × 3/10 = 72/100 = 0.72'}]}],transitions:[
 t('Use the digit patterns','2.4 and 0.3 became 24 and 3 temporarily.','Whole-number multiplication finds product digits first.','24 comes from ×10; 3 comes from ×10.','straight','right'),
 t('Multiply the digits','24×3 became 72.','This is ordinary multiplication.','72 comes from 24 groups of 3.'),
 t('Count denominator factors','The original places were added.','Each decimal place contributes a factor of 10 below the fraction.','/10 times /10 makes /100.'),
 t('Restore hundredths','72 became 0.72.','72/100 means seventy-two hundredths.','Two places come from denominator 100.','curved','left'),
 t('Verify with fractions','The shortcut became an exact fraction equation.','This proves placement follows place value.','24/10 and 3/10 equal the original factors.')],memoryTip:memory('Memory trick — multiply, count, check size','Multiply as wholes, use total decimal places, then estimate.','The place total counts combined factors of 10 in the denominators.',['2.4×0.3 → 72 → 0.72','0.3<1, so product <2.4'])}

export const dividingDecimalsVisual={kind:'decimal-movement',ariaLabel:'Dividing 4.8 by 0.6 by multiplying both numbers by 10',stages:[
 {label:'Decimal division',expression:[{text:'4.8 ÷ 0.6',emphasis:'highlight'}]},
 {label:'Goal',expression:[{text:'Make divisor 0.6 whole',emphasis:'circled'}]},
 {label:'Scale both',expression:[{text:'4.8 × 10 ÷ 0.6 × 10'}]},
 {label:'Equivalent division',expression:[{text:'48 ÷ 6'}]},
 {label:'Quotient',expression:[{text:'8',emphasis:'final'}]}],transitions:[
 t('Inspect the divisor','0.6 was identified as the number to make whole.','Whole-number division is easier to perform.','0.6 follows the division sign.'),
 t('Multiply both by 10','Both numbers were scaled equally.','Equal nonzero scaling preserves the quotient.','10 is chosen because 0.6×10=6.','straight','right'),
 t('Evaluate scaling','4.8 became 48 and 0.6 became 6.','Multiplying by 10 shifts every digit one place greater.','Both results come from ×10.'),
 t('Divide wholes','48÷6 became 8.','Six fits into forty-eight eight times.','6×8=48.')],memoryTip:memory('Memory trick — make the divisor whole','Multiply divisor and dividend by the same power of ten, then divide.','Equal scaling does not change how many divisor-sized groups fit.',['4.8÷0.6 = 48÷6','1.44÷0.12 = 144÷12'])}

export const decimalConversionsVisual={kind:'fraction-equivalence',ariaLabel:'Converting 0.25 to twenty-five hundredths, one fourth, and twenty-five percent',stages:[
 {label:'Decimal',expression:[{text:'0.25',emphasis:'highlight'}]},
 {label:'Use final place',expression:[{text:'25/100',emphasis:'circled'}],annotation:'The final digit is hundredths'},
 {label:'Simplify',expression:[{text:'25/100 = 1/4'}]},
 {label:'Per hundred',expression:[{text:'25/100 = 25%',emphasis:'final'}]}],transitions:[
 t('Write a fraction','0.25 became 25/100.','Hundredths means parts out of 100.','25 is the count; 100 comes from place value.'),
 t('Reduce together','25/100 became 1/4.','Equal scaling preserves fraction value.','25÷25=1 and 100÷25=4.'),
 t('Name per hundred','25/100 became 25%.','Percent means per hundred.','25 is the number of hundredths.')],memoryTip:memory('Memory trick — let place value choose','Use the final decimal place for a fraction; express per 100 for percent.','All three notations can name the same amount.',['0.25=25/100=1/4=25%','0.6=6/10=3/5'])}
export const decimalsLessonSpecs=[
 {slug:'introduction-to-decimals',title:'Introduction to Decimals',lessonType:'reading',estimatedMinutes:8,blocks:[
  heading('Introduction to Decimals',1),paragraph('A decimal is another way to write a whole number, a part of a whole, or both. The decimal point separates whole-number places on the left from fractional places on the right.'),
  formula('1 whole = 10 tenths = 100 hundredths','The same whole can be divided into ten equal tenths or one hundred equal hundredths.'),
  example('Name familiar decimals','What do 0.5, 0.25, and 1.75 mean?',['0.5 means five tenths of one whole.','0.25 means twenty-five hundredths of one whole.','1.75 means one whole and seventy-five hundredths.'],'Decimals precisely name whole and fractional amounts.'),
  callout('Decimals in daily life','Money such as ₱35.75, a distance of 2.5 km, and a score of 9.5 use the point to separate whole units from parts of a unit.','info'),
  callout('Common mistake','The decimal point is not decoration. Moving it changes each digit’s place and therefore changes the value.','warning'),
  summary(['Decimals can name wholes, parts, or both.','The point separates whole and fractional places.','Tenths are parts of 10; hundredths are parts of 100.','Keep the unit or context attached to an amount.'])]},
 {slug:'decimal-place-value',title:'Decimal Place Value',lessonType:'reading',estimatedMinutes:9,blocks:[
  heading('Decimal Place Value',1),paragraph('A digit’s position gives it value. In 3.472 the columns are Ones | Decimal Point | Tenths | Hundredths | Thousandths, containing 3 | . | 4 | 7 | 2.'),
  example('Expand 3.472','Explain every digit.',['3 is 3 ones.','4 is 4 tenths, or 0.4.','7 is 7 hundredths, or 0.07.','2 is 2 thousandths, or 0.002.','Add the place values.'],'3.472 = 3 + 0.4 + 0.07 + 0.002.',decimalPlaceValueVisual),
  callout('Zero is a placeholder','In 4.05, zero says there are no tenths while 5 occupies hundredths. It is four and five hundredths—not 4.5.','important'),
  callout('Common mistake','4.05 and 4.5 differ: 4.05 has 5 hundredths, while 4.5 has 5 tenths, equal to 50 hundredths.','warning'),
  summary(['Position determines a digit’s value.','Each place right is one tenth of the previous place.','Zeros protect the position of later digits.','Expanded form adds every occupied place.'])]},
 {slug:'reading-and-writing-decimals',title:'Reading and Writing Decimals',lessonType:'reading',estimatedMinutes:9,blocks:[
  heading('Reading and Writing Decimals',1),paragraph('Read the whole part first, say “and” for the point, then read the digits to the right using the final occupied place name.'),
  example('Read four decimals','Read 0.7, 0.07, 2.35, and 12.408.',['0.7 is seven tenths.','0.07 is seven hundredths.','2.35 is two and thirty-five hundredths.','12.408 is twelve and four hundred eight thousandths.'],'The final decimal place supplies the fractional name.'),
  example('Write words as a decimal','Write “six and twenty-three hundredths.”',['Write whole part 6.','“And” marks the point.','Twenty-three hundredths is 23/100, or 0.23.','Combine both parts.'],'The decimal is 6.23.',readingWritingDecimalsVisual),
  callout('Trailing zeros preserve value','0.5 = 0.50 = 0.500 because 5/10 = 50/100 = 500/1000. The piece count and piece size scale together.','important'),
  callout('Common mistake','0.6 is six tenths, but 0.06 is six hundredths. The zero in tenths is essential.','warning'),
  summary(['Say “and” at the point.','Use the final place to name the fractional part.','Placeholders show empty places.','Trailing zeros on the right do not change value.'])]},
 {slug:'comparing-and-ordering-decimals',title:'Comparing and Ordering Decimals',lessonType:'practice',estimatedMinutes:10,blocks:[
  heading('Comparing and Ordering Decimals',1),paragraph('Compare by place value, not digit count. Align decimal points and add trailing zeros so corresponding places are visible.'),
  example('Compare, then order','Compare 0.6 and 0.58; order 0.7, 0.65, 0.705, and 0.68.',['Rewrite 0.6 as 0.60.','Compare tenths: 6 tenths exceeds 5 tenths.','Write the list through thousandths.','Compare aligned digits left to right.'],'0.6 > 0.58; ascending: 0.65 < 0.68 < 0.70 < 0.705.',compareOrderDecimalsVisual),
  callout('Why trailing zeros work','Appending zero changes 6 tenths to 60 hundredths—an equivalent amount—so alignment improves without changing value.','important'),
  callout('Common mistake','Do not say 0.58>0.6 because 58>6. The digits occupy different places until aligned.','warning'),
  summary(['Align decimal points.','Add trailing zeros when helpful.','Compare greatest places first.','The first unequal place decides the order.'])]},
 {slug:'rounding-decimals',title:'Rounding Decimals',lessonType:'practice',estimatedMinutes:10,blocks:[
  heading('Rounding Decimals',1),paragraph('Rounding replaces a decimal with a nearby value at a requested place. Mark that place, then inspect exactly one digit right.'),
  example('Round to nearest hundredth','Round 4.376.',['The target hundredths digit is 7.','The digit right is 6.','Since 6 is at least 5, increase 7 to 8.','Remove later digits.'],'4.376 rounds to 4.38.',roundingDecimalsVisual),
  callout('Why the next digit matters','It shows whether the original value is nearer the lower rounded value or the next higher one.','important'),
  callout('Common mistake','Do not inspect the wrong digit. Mark the requested place and look only one position right.','warning'),
  summary(['Mark the requested place.','Look one digit right.','5–9 raises; 0–4 keeps.','Remove later digits and check the size.'])]},
 {slug:'adding-decimals',title:'Adding Decimals',lessonType:'practice',estimatedMinutes:10,blocks:[
  heading('Adding Decimals',1),paragraph('Decimal addition combines equal place values. Align points so ones meet ones, tenths meet tenths, and hundredths meet hundredths.'),
  example('Add unequal lengths','Compute 12.5 + 3.75.',['Append zero: 12.5=12.50.','Align points.','Add from right and carry when a column reaches ten.','Bring the point into the sum.'],'12.50 + 3.75 = 16.25.',addingDecimalsVisual),
  callout('Reasonableness check','12.5 is about 13 and 3.75 about 4, so the answer should be near 17. The exact 16.25 is reasonable.','important'),
  callout('Common mistake','Do not align final digits. Align points because they locate matching place-value columns.','warning'),
  summary(['Align decimal points.','Trailing zeros fill missing ending places.','Add matching place columns.','Estimate to catch a misplaced point.'])]},
 {slug:'subtracting-decimals',title:'Subtracting Decimals',lessonType:'practice',estimatedMinutes:10,blocks:[
  heading('Subtracting Decimals',1),paragraph('Decimal subtraction removes equal place values. Align points, add harmless trailing placeholders, and regroup when needed.'),
  example('Subtract with regrouping','Compute 15.2 − 7.85.',['Rewrite 15.2 as 15.20.','Align points.','Borrow 1 tenth as 10 hundredths.','Borrow 1 one as 10 tenths.','Subtract remaining columns.'],'15.20 − 7.85 = 7.35.',subtractingDecimalsVisual),
  callout('Why regrouping works','One tenth equals ten hundredths; one one equals ten tenths. Regrouping changes form, not total value.','important'),
  callout('Common mistake','Do not omit the placeholder zero in 15.20; it protects the hundredths column.','warning'),
  summary(['Align decimal points.','Fill missing ending places.','Regroup with 1 larger place = 10 smaller places.','Estimate the difference.'])]},
 {slug:'multiplying-decimals',title:'Multiplying Decimals',lessonType:'practice',estimatedMinutes:11,blocks:[
  heading('Multiplying Decimals',1),paragraph('Find product digits as whole numbers, then use place value for decimal position. Total places count factors of 10 in the original denominators.'),
  example('Multiply two decimals','Compute 2.4 × 0.3.',['Multiply digit patterns: 24×3=72.','Each factor has one decimal place, for two total.','Write 72 as hundredths: 0.72.','Verify: 24/10×3/10=72/100.'],'2.4 × 0.3 = 0.72.',multiplyingDecimalsVisual),
  example('Decimal times a whole','Compute 2.4 × 3.',['2.4=24/10.','24×3=72.','72/10=7.2.'],'2.4 × 3 = 7.2.'),
  callout('Powers of ten','4.27×10=42.7, 4.27×100=427, and 4.27×1000=4270 because digits shift into greater places. Division shifts them smaller: 4.27÷10=0.427 and 4.27÷100=0.0427.','important'),
  callout('Common mistake','Do not answer 7.2 for 2.4×0.3. Because 0.3<1, the product must be smaller than 2.4; 0.72 passes.','warning'),
  summary(['Multiply digit patterns.','Use total decimal places because denominators multiply.','Powers of ten shift every digit’s value.','Estimate answer size.'])]},
 {slug:'dividing-decimals',title:'Dividing Decimals',lessonType:'practice',estimatedMinutes:11,blocks:[
  heading('Dividing Decimals',1),paragraph('Division asks how many divisor-sized groups fit. Make a decimal divisor whole by scaling both numbers equally.'),
  example('Divide by a decimal','Compute 4.8 ÷ 0.6.',['Identify divisor 0.6.','Multiply both numbers by 10.','4.8×10=48 and 0.6×10=6.','Divide 48÷6.'],'4.8 ÷ 0.6 = 8.',dividingDecimalsVisual),
  example('Divide by a whole','Compute 7.5 ÷ 3.',['Set up 3 ) 7.5.','3 fits in 7 twice, leaving 1.','Place quotient point above dividend point.','15 tenths÷3=5 tenths.'],'7.5 ÷ 3 = 2.5; three groups should each be a little over 2.'),
  example('Scale two places','Compute 1.44 ÷ 0.12.',['Make 0.12 whole by ×100.','Apply ×100 to both numbers.','The expression becomes 144÷12.','144÷12=12.'],'1.44 ÷ 0.12 = 12.'),
  callout('Common mistake','Never scale only the divisor. Multiply both numbers by the same power of ten or the quotient changes.','warning'),
  summary(['Place a quotient point above the dividend point.','Make decimal divisors whole.','Scale both numbers equally.','Estimate quotient size.'])]},
 {slug:'fractions-decimals-and-percentages-decimals',title:'Fractions, Decimals, and Percentages',lessonType:'practice',estimatedMinutes:12,blocks:[
  heading('Fractions, Decimals, and Percentages',1),paragraph('These are different notations for amounts. Place value explains conversion; this is a concise bridge to the full Fractions and Percentages topics.'),
  example('Convert 0.25','Write it as a fraction and percent.',['Hundredths gives 0.25=25/100.','Divide top and bottom by 25 to get 1/4.','Percent means per hundred, so 25/100=25%.'],'0.25 = 1/4 = 25%.',decimalConversionsVisual),
  example('Convert the other way','Write 3/4 and 35% as decimals.',['3/4=75/100=0.75; numerator÷denominator also gives 0.75.','35%=35/100.','Divide by 100: 35. → 3.5 → 0.35.'],'3/4=0.75 and 35%=0.35.'),
  callout('Why shortcuts work','A decimal place names 10 or 100; percent means per 100. Moving two places is multiplication or division by 100.','important'),
  callout('Common mistake','Do not invent a denominator. Use 10, 100, or 1000 from the final place, then simplify.','warning'),
  summary(['Decimal to fraction: use final place, then simplify.','Fraction to decimal: divide or use a power-of-ten denominator.','Decimal to percent: multiply by 100.','Percent to decimal: divide by 100.'])]},
 {slug:'decimal-applications',title:'Decimal Applications',lessonType:'practice',estimatedMinutes:12,blocks:[
  heading('Decimal Applications',1),paragraph('CSE-style decimal problems use money, measurement, distance, rates, and quantities. Label values and units, choose an operation, and estimate.'),
  example('Total purchase cost','Two notebooks cost ₱35.75 each and one pen costs ₱18.50.',['Notebook total: ₱35.75×2=₱71.50.','Align money amounts to hundredths.','Total: ₱71.50+₱18.50=₱90.00.','Estimate ₱36×2+₱19≈₱91.'],'The total cost is ₱90.00.'),
  example('Remaining measurement','12.5 L holds liquid; 3.75 L is used.',['Rewrite 12.5 L as 12.50 L.','Align points and subtract.','12.50−3.75=8.75.','Keep liters.'],'8.75 L remains.'),
  callout('Money and trailing zeros','Currency shows two places for centavos: ₱90=₱90.00 and ₱5.5=₱5.50. The zeros preserve value and show money precision.','important'),
  callout('Common mistake','A number without its unit can be incomplete. Keep ₱, L, km, or the stated quantity and estimate.','warning'),
  summary(['Identify values, result, and units.','Choose the operation from the relationship.','Align points for addition and subtraction.','Use two places for money.','Estimate and attach units.'])]},
 {slug:'decimals-topic-quiz',title:'Decimals Topic Quiz',lessonType:'quiz',estimatedMinutes:15,blocks:[
  heading('Decimals Topic Quiz',1),paragraph('This checkpoint covers meaning, place value, reading and writing, comparison, rounding, operations, conversions, and applications.'),
  callout('Before you start','Align equal places, explain shifts through powers of ten, estimate answer size, and preserve units.','important'),
  summary(['15 questions','Passing score: 70%','Use place-value reasoning instead of unexplained shortcuts.','The quiz is platform-authored and not an official CSC allocation.'])]}
]

export const decimalsLessonBySlug=new Map(decimalsLessonSpecs.map((lesson)=>[lesson.slug,lesson]))