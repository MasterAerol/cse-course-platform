PRAGMA foreign_keys = ON;

DELETE FROM lesson_blocks
WHERE lesson_id IN (
    SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.slug = 'numerical-ability'
      AND topics.slug = 'percentages'
      AND lessons.public_id IN (
          'lesson-introduction-to-percentages',
          'lesson-understanding-percentages',
          'lesson-fractions-decimals-and-percentages',
          'lesson-finding-the-percentage',
          'lesson-finding-the-base',
          'lesson-finding-the-rate',
          'lesson-percentage-increase-and-decrease',
          'lesson-discounts-and-markups',
          'lesson-worked-examples',
          'lesson-guided-practice',
          'lesson-percentages-topic-quiz'
      )
);

INSERT INTO lesson_blocks (
    lesson_id,
    block_type,
    content_json,
    position
)
WITH blocks(lesson_public_id, position, block_type, content_json) AS (
    VALUES
    ('lesson-introduction-to-percentages', 1, 'heading', '{"level":1,"text":"Introduction to Percentages"}'),
    ('lesson-introduction-to-percentages', 2, 'paragraph', '{"text":"Percentages help us describe a part of a whole using 100 as the reference. Instead of saying a long fraction each time, we can say how many parts out of 100 are being considered."}'),
    ('lesson-introduction-to-percentages', 3, 'callout', '{"variant":"info","title":"Read percent as per hundred","text":"The word percent means per hundred. So 50% means 50 out of 100, 25% means 25 out of 100, 100% means the entire amount, and 0% means none of the amount."}'),
    ('lesson-introduction-to-percentages', 4, 'formula', '{"expression":"Percentage = part out of 100","description":"At this stage, think of a percentage as a simple comparison with 100 parts."}'),
    ('lesson-introduction-to-percentages', 5, 'image', '{"src":"/images/percentage-grid-25.svg","alt":"A ten by ten grid with exactly twenty-five highlighted squares","caption":"Twenty-five highlighted squares out of one hundred squares represent 25%."}'),
    ('lesson-introduction-to-percentages', 6, 'heading', '{"level":2,"text":"Everyday percentage statements"}'),
    ('lesson-introduction-to-percentages', 7, 'paragraph', '{"text":"A 20% discount means the price is reduced by 20 out of every 100 parts of the original price. A 75% attendance rate means 75 out of every 100 expected attendees were present. A 90% score means 90 out of 100 points or items. A 5% increase means the new amount grew by 5 parts for every 100 parts of the original amount."}'),
    ('lesson-introduction-to-percentages', 8, 'example', '{"title":"Department share","problem":"A group has 100 people. If 35 are employees from Department A, what percentage of the group is from Department A?","steps":["The whole group has 100 people.","Department A has 35 people.","Because the reference is already 100, 35 out of 100 is 35%."],"answer":"Department A represents 35% of the group."}'),
    ('lesson-introduction-to-percentages', 9, 'callout', '{"variant":"important","title":"Percentages can be small or large","text":"A percentage is not always a whole number between 0% and 100%. Values like 12.5%, 0.5%, and 125% are possible. More than 100% means more than the reference amount."}'),
    ('lesson-introduction-to-percentages', 10, 'summary', '{"items":["Percent means per hundred.","The percent symbol (%) shows that a value is compared with 100.","A percentage describes a part in relation to a whole.","Percentages appear in discounts, attendance, scores, salaries, inventory, and many other daily situations."]}'),
    ('lesson-introduction-to-percentages', 11, 'paragraph', '{"text":"Next, you will build stronger intuition for comparing percentages, especially values below, equal to, and above 100%."}'),

    ('lesson-understanding-percentages', 1, 'heading', '{"level":1,"text":"Understanding Percentages"}'),
    ('lesson-understanding-percentages', 2, 'paragraph', '{"text":"A percentage is a ratio that uses 100 as the reference. This makes it easier to compare different quantities because they are expressed using the same denominator."}'),
    ('lesson-understanding-percentages', 3, 'formula', '{"expression":"25% = 25/100, 60% = 60/100, 125% = 125/100","description":"The denominator 100 is the reference. The numerator tells how many parts out of 100 are represented."}'),
    ('lesson-understanding-percentages', 4, 'heading', '{"level":2,"text":"Useful mental benchmarks"}'),
    ('lesson-understanding-percentages', 5, 'summary', '{"items":["1% = one hundredth","10% = one tenth","25% = one fourth","50% = one half","75% = three fourths","100% = the whole"]}'),
    ('lesson-understanding-percentages', 6, 'heading', '{"level":2,"text":"Below, equal to, and above 100%"}'),
    ('lesson-understanding-percentages', 7, 'paragraph', '{"text":"Less than 100% means less than the full reference amount. Exactly 100% means equal to the full reference amount. More than 100% means greater than the reference amount, such as reaching 120% of a sales target."}'),
    ('lesson-understanding-percentages', 8, 'example', '{"title":"Interpreting attendance","problem":"A class has 85% attendance today. What does that mean?","steps":["Use 100 as the reference.","85% means 85 out of every 100 expected students were present.","The attendance is high, but not complete."],"answer":"85% attendance means 85 out of every 100 expected students attended."}'),
    ('lesson-understanding-percentages', 9, 'example', '{"title":"Interpreting a target above 100%","problem":"A sales team reached 120% of its monthly target. What does that mean?","steps":["100% would mean the team exactly reached the target.","120% is greater than 100%.","The team exceeded the target by 20 percentage points."],"answer":"The team sold more than the target amount."}'),
    ('lesson-understanding-percentages', 10, 'example', '{"title":"Comparing percentages","problem":"Which is larger, 45% or 54%?","steps":["Both percentages use 100 as the reference.","Compare 45 and 54 directly.","54 is larger than 45."],"answer":"54% is larger than 45%."}'),
    ('lesson-understanding-percentages', 11, 'callout', '{"variant":"info","title":"Percentage points","text":"If a score increases from 60% to 70%, it increases by 10 percentage points. Detailed percentage change calculations come later."}'),
    ('lesson-understanding-percentages', 12, 'callout', '{"variant":"warning","title":"Common mistakes","text":"Avoid confusing 0.5 with 0.5%, assuming percentages cannot exceed 100%, ignoring the base quantity, or treating a percentage as an absolute amount."}'),
    ('lesson-understanding-percentages', 13, 'summary', '{"items":["Percentages are ratios with denominator 100.","Benchmarks like 10%, 25%, 50%, and 75% help with mental math.","Values above 100% are valid when the amount is greater than the reference.","Always identify the base quantity before interpreting a percentage."]}'),

    ('lesson-fractions-decimals-and-percentages', 1, 'heading', '{"level":1,"text":"Fractions, Decimals and Percentages"}'),
    ('lesson-fractions-decimals-and-percentages', 2, 'paragraph', '{"text":"Fractions, decimals, and percentages are different forms of the same idea. Learning to move between them makes percentage problems much easier to read and solve."}'),
    ('lesson-fractions-decimals-and-percentages', 3, 'callout', '{"variant":"info","title":"Equivalent forms","text":"Some common equivalents are 1/4 = 0.25 = 25%, 1/2 = 0.5 = 50%, and 3/4 = 0.75 = 75%."}'),
    ('lesson-fractions-decimals-and-percentages', 4, 'heading', '{"level":2,"text":"Fraction to percentage"}'),
    ('lesson-fractions-decimals-and-percentages', 5, 'paragraph', '{"text":"To convert a fraction to a percentage, divide the numerator by the denominator, multiply the decimal by 100, and attach the percent symbol."}'),
    ('lesson-fractions-decimals-and-percentages', 6, 'example', '{"title":"Convert 3/5 to percent","problem":"What is 3/5 as a percentage?","steps":["Divide 3 by 5 to get 0.6.","Multiply 0.6 by 100 to get 60.","Attach the percent symbol."],"answer":"3/5 = 60%"}'),
    ('lesson-fractions-decimals-and-percentages', 7, 'example', '{"title":"Convert 7/20 to percent","problem":"What is 7/20 as a percentage?","steps":["Divide 7 by 20 to get 0.35.","Multiply 0.35 by 100 to get 35.","Attach the percent symbol."],"answer":"7/20 = 35%"}'),
    ('lesson-fractions-decimals-and-percentages', 8, 'heading', '{"level":2,"text":"Decimal to percentage"}'),
    ('lesson-fractions-decimals-and-percentages', 9, 'paragraph', '{"text":"To convert a decimal to a percentage, multiply by 100. You can also move the decimal point two places to the right."}'),
    ('lesson-fractions-decimals-and-percentages', 10, 'formula', '{"expression":"0.42 = 42%, 0.075 = 7.5%, 1.2 = 120%","description":"Decimals greater than 1 become percentages greater than 100%."}'),
    ('lesson-fractions-decimals-and-percentages', 11, 'heading', '{"level":2,"text":"Percentage to decimal"}'),
    ('lesson-fractions-decimals-and-percentages', 12, 'paragraph', '{"text":"To convert a percentage to a decimal, divide by 100. You can also move the decimal point two places to the left."}'),
    ('lesson-fractions-decimals-and-percentages', 13, 'formula', '{"expression":"36% = 0.36, 5% = 0.05, 125% = 1.25","description":"The decimal form is the form normally used in percentage computations."}'),
    ('lesson-fractions-decimals-and-percentages', 14, 'example', '{"title":"Percentage to fraction","problem":"Convert 40%, 75%, and 12.5% to fractions.","steps":["40% = 40/100, which simplifies to 2/5.","75% = 75/100, which simplifies to 3/4.","12.5% = 12.5/100. Multiply top and bottom by 10 to get 125/1000, then simplify to 1/8."],"answer":"40% = 2/5, 75% = 3/4, and 12.5% = 1/8."}'),
    ('lesson-fractions-decimals-and-percentages', 15, 'summary', '{"items":["1/10 = 0.1 = 10%","1/5 = 0.2 = 20%","1/4 = 0.25 = 25%","1/2 = 0.5 = 50%","3/4 = 0.75 = 75%","1 = 1.0 = 100%","Try first: 0.18 = 18%, 65% = 0.65, and 3/4 = 75%."]}'),

    ('lesson-finding-the-percentage', 1, 'heading', '{"level":1,"text":"Finding the Percentage"}'),
    ('lesson-finding-the-percentage', 2, 'paragraph', '{"text":"In this lesson, the percentage amount is the part you are looking for. The rate is the percent, and the base is the whole or reference amount."}'),
    ('lesson-finding-the-percentage', 3, 'formula', '{"expression":"Percentage amount = Rate × Base","description":"Convert the rate from percent to decimal before multiplying."}'),
    ('lesson-finding-the-percentage', 4, 'summary', '{"items":["Identify the base or whole amount.","Identify the rate.","Convert the rate to decimal form.","Multiply rate by base.","Write the answer with the correct unit."]}'),
    ('lesson-finding-the-percentage', 5, 'example', '{"title":"Find 25% of 240","problem":"What is 25% of 240?","steps":["The base is 240.","The rate is 25%, or 0.25.","Multiply 0.25 × 240 = 60."],"answer":"25% of 240 is 60."}'),
    ('lesson-finding-the-percentage', 6, 'example', '{"title":"Find 18% of 500","problem":"What is 18% of 500?","steps":["The base is 500.","The rate is 18%, or 0.18.","Multiply 0.18 × 500 = 90."],"answer":"18% of 500 is 90."}'),
    ('lesson-finding-the-percentage', 7, 'example', '{"title":"Inventory sold","problem":"A store sold 35% of 800 items. How many items were sold?","steps":["The base is 800 items.","The rate is 35%, or 0.35.","Multiply 0.35 × 800 = 280."],"answer":"The store sold 280 items."}'),
    ('lesson-finding-the-percentage', 8, 'callout', '{"variant":"warning","title":"Common mistakes","text":"Do not multiply by 25 when the rate is 25%. Use 0.25. Also check that you are multiplying the rate by the base and that your final answer includes units."}'),
    ('lesson-finding-the-percentage', 9, 'summary', '{"items":["Use Percentage amount = Rate × Base.","Percent rates must become decimals before computation.","The answer is a part of the base.","The practice activity below will ask you to find percentage amounts."]}'),

    ('lesson-finding-the-base', 1, 'heading', '{"level":1,"text":"Finding the Base"}'),
    ('lesson-finding-the-base', 2, 'paragraph', '{"text":"The base is the whole, original, or reference amount. Use this approach when the problem gives a percentage amount and a rate, then asks for the whole."}'),
    ('lesson-finding-the-base', 3, 'formula', '{"expression":"Base = Percentage amount ÷ Rate","description":"Convert the rate to decimal form before dividing."}'),
    ('lesson-finding-the-base', 4, 'callout', '{"variant":"info","title":"Identify the pieces","text":"The percentage amount is the part already given. The rate is the percent. The unknown base is the whole amount that produced the part."}'),
    ('lesson-finding-the-base', 5, 'example', '{"title":"20 is 25% of what number?","problem":"Find the base when 20 is 25% of the unknown number.","steps":["The percentage amount is 20.","The rate is 25%, or 0.25.","Base = 20 ÷ 0.25 = 80."],"answer":"20 is 25% of 80."}'),
    ('lesson-finding-the-base', 6, 'example', '{"title":"45 is 15% of what number?","problem":"Find the base when 45 is 15% of the unknown number.","steps":["The percentage amount is 45.","The rate is 15%, or 0.15.","Base = 45 ÷ 0.15 = 300."],"answer":"45 is 15% of 300."}'),
    ('lesson-finding-the-base', 7, 'example', '{"title":"Original price","problem":"₱600 is 30% of what original amount?","steps":["The percentage amount is ₱600.","The rate is 30%, or 0.30.","Base = 600 ÷ 0.30 = 2,000."],"answer":"The original amount is ₱2,000."}'),
    ('lesson-finding-the-base', 8, 'callout', '{"variant":"warning","title":"Reasonableness check","text":"If 25% of a number is 20, the whole must be larger than 20. This quick check helps catch division and decimal mistakes."}'),
    ('lesson-finding-the-base', 9, 'summary', '{"items":["Use Base = Percentage amount ÷ Rate.","The base is the whole or original amount.","Convert the rate to decimal form first.","The practice activity below will ask you to solve for the base."]}'),

    ('lesson-finding-the-rate', 1, 'heading', '{"level":1,"text":"Finding the Rate"}'),
    ('lesson-finding-the-rate', 2, 'paragraph', '{"text":"The rate tells what percent one amount is of another. Use this when the problem gives a part and a whole, then asks what percent the part represents."}'),
    ('lesson-finding-the-rate', 3, 'formula', '{"expression":"Rate = Percentage amount ÷ Base","description":"After dividing, convert the decimal result to a percentage."}'),
    ('lesson-finding-the-rate', 4, 'example', '{"title":"30 is what percent of 120?","problem":"Find the rate represented by 30 out of 120.","steps":["The percentage amount is 30.","The base is 120.","Rate = 30 ÷ 120 = 0.25.","Convert 0.25 to 25%."],"answer":"30 is 25% of 120."}'),
    ('lesson-finding-the-rate', 5, 'example', '{"title":"45 is what percent of 180?","problem":"Find the rate represented by 45 out of 180.","steps":["The percentage amount is 45.","The base is 180.","Rate = 45 ÷ 180 = 0.25.","Convert 0.25 to 25%."],"answer":"45 is 25% of 180."}'),
    ('lesson-finding-the-rate', 6, 'example', '{"title":"Employee attendance","problem":"72 employees out of 90 attended. What percent attended?","steps":["The percentage amount is 72 employees.","The base is 90 employees.","Rate = 72 ÷ 90 = 0.8.","Convert 0.8 to 80%."],"answer":"80% of the employees attended."}'),
    ('lesson-finding-the-rate', 7, 'callout', '{"variant":"warning","title":"Common mistakes","text":"Do not reverse the part and the whole. Do not forget to multiply by 100 when expressing the decimal as a percent. Always choose the true base."}'),
    ('lesson-finding-the-rate', 8, 'summary', '{"items":["Use Rate = Percentage amount ÷ Base.","The rate begins as a decimal.","Convert the decimal result to percent.","The practice activity below will ask you to find rates."]}'),

    ('lesson-percentage-increase-and-decrease', 1, 'heading', '{"level":1,"text":"Percentage Increase and Decrease"}'),
    ('lesson-percentage-increase-and-decrease', 2, 'paragraph', '{"text":"Percentage change describes how much a value rises or falls compared with its original amount. The original amount is the base of the comparison."}'),
    ('lesson-percentage-increase-and-decrease', 3, 'formula', '{"expression":"Percentage Change = Change ÷ Original Amount × 100%","description":"Change is New Amount − Original Amount. For a decrease, report the size of the decrease as a positive percentage."}'),
    ('lesson-percentage-increase-and-decrease', 4, 'example', '{"title":"Salary increase","problem":"A salary rises from ₱20,000 to ₱23,000. What is the percentage increase?","steps":["Change = ₱23,000 − ₱20,000 = ₱3,000.","Original amount = ₱20,000.","Percentage increase = 3,000 ÷ 20,000 × 100% = 15%."],"answer":"The salary increased by 15%."}'),
    ('lesson-percentage-increase-and-decrease', 5, 'example', '{"title":"Price decrease","problem":"A price falls from ₱800 to ₱680. What is the percentage decrease?","steps":["Decrease = ₱800 − ₱680 = ₱120.","Original amount = ₱800.","Percentage decrease = 120 ÷ 800 × 100% = 15%."],"answer":"The price decreased by 15%."}'),
    ('lesson-percentage-increase-and-decrease', 6, 'callout', '{"variant":"important","title":"Use the original amount","text":"Percentage change is normally compared with the original amount, not the new amount. This is one of the most common sources of wrong answers."}'),
    ('lesson-percentage-increase-and-decrease', 7, 'heading', '{"level":2,"text":"Finding the new value"}'),
    ('lesson-percentage-increase-and-decrease', 8, 'formula', '{"expression":"New value after increase = Original × (1 + rate)","description":"Use the decimal form of the rate. For example, 15% becomes 0.15."}'),
    ('lesson-percentage-increase-and-decrease', 9, 'formula', '{"expression":"New value after decrease = Original × (1 − rate)","description":"A decrease removes part of the original amount."}'),
    ('lesson-percentage-increase-and-decrease', 10, 'example', '{"title":"Increase a target","problem":"A target of 500 forms increases by 8%. What is the new target?","steps":["Convert 8% to 0.08.","Use 500 × (1 + 0.08).","500 × 1.08 = 540."],"answer":"The new target is 540 forms."}'),
    ('lesson-percentage-increase-and-decrease', 11, 'example', '{"title":"Decrease inventory","problem":"Inventory of 250 items decreases by 12%. How many items remain?","steps":["Convert 12% to 0.12.","Use 250 × (1 − 0.12).","250 × 0.88 = 220."],"answer":"220 items remain."}'),
    ('lesson-percentage-increase-and-decrease', 12, 'example', '{"title":"Successive changes","problem":"A value of 100 increases by 20%, then decreases by 20%. Does it return to 100?","steps":["After a 20% increase: 100 × 1.20 = 120.","Then a 20% decrease: 120 × 0.80 = 96.","The second change uses 120 as the new base."],"answer":"No. The final value is 96."}'),
    ('lesson-percentage-increase-and-decrease', 13, 'callout', '{"variant":"warning","title":"Common mistakes","text":"Avoid dividing by the new amount, confusing percentage points with percentage change, adding 15 instead of 0.15, or assuming equal successive changes automatically cancel."}'),
    ('lesson-percentage-increase-and-decrease', 14, 'summary', '{"items":["Change is based on the original amount.","Increase adds to the original value.","Decrease subtracts from the original value.","Successive percentage changes use a new base each time."]}'),

    ('lesson-discounts-and-markups', 1, 'heading', '{"level":1,"text":"Discounts and Markups"}'),
    ('lesson-discounts-and-markups', 2, 'paragraph', '{"text":"Discounts and markups are common percentage applications. A discount reduces a price. A markup adds to cost to create a selling price."}'),
    ('lesson-discounts-and-markups', 3, 'formula', '{"expression":"Discount Amount = Original Price × Discount Rate","description":"Convert the discount rate to decimal form before multiplying."}'),
    ('lesson-discounts-and-markups', 4, 'formula', '{"expression":"Sale Price = Original Price − Discount Amount","description":"You can also use Sale Price = Original Price × (1 − Discount Rate)."}'),
    ('lesson-discounts-and-markups', 5, 'example', '{"title":"Bag discount","problem":"A bag costs ₱1,200 with a 25% discount. What is the sale price?","steps":["Convert 25% to 0.25.","Discount = 1,200 × 0.25 = ₱300.","Sale price = ₱1,200 − ₱300 = ₱900."],"answer":"The sale price is ₱900."}'),
    ('lesson-discounts-and-markups', 6, 'heading', '{"level":2,"text":"Markup"}'),
    ('lesson-discounts-and-markups', 7, 'formula', '{"expression":"Markup Amount = Cost × Markup Rate","description":"Markup is usually based on cost."}'),
    ('lesson-discounts-and-markups', 8, 'formula', '{"expression":"Selling Price = Cost + Markup","description":"You can also use Selling Price = Cost × (1 + Markup Rate)."}'),
    ('lesson-discounts-and-markups', 9, 'example', '{"title":"Item markup","problem":"An item costs ₱800 and is marked up by 30%. What is the selling price?","steps":["Convert 30% to 0.30.","Markup = 800 × 0.30 = ₱240.","Selling price = ₱800 + ₱240 = ₱1,040."],"answer":"The selling price is ₱1,040."}'),
    ('lesson-discounts-and-markups', 10, 'heading', '{"level":2,"text":"Successive discounts"}'),
    ('lesson-discounts-and-markups', 11, 'example', '{"title":"20% then 10% discount","problem":"An item priced at ₱1,000 gets a 20% discount, then another 10% discount. What is the final price?","steps":["After 20% off: ₱1,000 × 0.80 = ₱800.","The second discount is based on ₱800.","After 10% off: ₱800 × 0.90 = ₱720."],"answer":"The final price is ₱720, so the effective discount is 28%."}'),
    ('lesson-discounts-and-markups', 12, 'callout', '{"variant":"important","title":"Successive rates do not simply add","text":"A 20% discount followed by a 10% discount is not the same as 30% off. The second discount applies to the already reduced price."}'),
    ('lesson-discounts-and-markups', 13, 'callout', '{"variant":"warning","title":"Common mistakes","text":"Do not subtract the rate directly from the price, apply markup to the wrong base, add successive discount rates directly, or forget to convert percent to decimal."}'),
    ('lesson-discounts-and-markups', 14, 'summary', '{"items":["Discounts reduce original price.","Markups increase cost to form selling price.","Use decimal rates in computations.","Successive discounts apply one after another, not all at once."]}'),

    ('lesson-worked-examples', 1, 'heading', '{"level":1,"text":"Worked Examples"}'),
    ('lesson-worked-examples', 2, 'paragraph', '{"text":"This lesson brings the main percentage skills together. Read each example slowly and notice how the given information leads to the correct formula."}'),
    ('lesson-worked-examples', 3, 'example', '{"title":"Finding a percentage amount","problem":"What is 35% of 240?","steps":["Given: rate = 35%, base = 240.","Required: percentage amount.","Formula: Percentage amount = Rate × Base.","Substitution: 0.35 × 240 = 84.","Reasonableness check: 35% is a little more than one third, and one third of 240 is 80."],"answer":"The percentage amount is 84."}'),
    ('lesson-worked-examples', 4, 'example', '{"title":"Finding the base","problem":"36 is 20% of what number?","steps":["Given: percentage amount = 36, rate = 20%.","Required: base.","Formula: Base = Percentage amount ÷ Rate.","Substitution: 36 ÷ 0.20 = 180.","Reasonableness check: 20% is one fifth, so the whole should be five times 36."],"answer":"The base is 180."}'),
    ('lesson-worked-examples', 5, 'example', '{"title":"Finding the rate","problem":"24 is what percent of 96?","steps":["Given: percentage amount = 24, base = 96.","Required: rate.","Formula: Rate = Percentage amount ÷ Base.","Substitution: 24 ÷ 96 = 0.25 = 25%.","Reasonableness check: 24 is one fourth of 96."],"answer":"24 is 25% of 96."}'),
    ('lesson-worked-examples', 6, 'example', '{"title":"Percentage increase","problem":"A value increases from 150 to 180. What is the percentage increase?","steps":["Given: original amount = 150, new amount = 180.","Required: percentage increase.","Formula: Change ÷ Original Amount × 100%.","Substitution: (180 − 150) ÷ 150 × 100% = 20%.","Reasonableness check: 30 is one fifth of 150."],"answer":"The value increased by 20%."}'),
    ('lesson-worked-examples', 7, 'example', '{"title":"Discount","problem":"An item priced at ₱800 is discounted by 25%. What is the sale price?","steps":["Given: original price = ₱800, discount rate = 25%.","Required: sale price.","Formula: Sale Price = Original Price × (1 − Discount Rate).","Substitution: 800 × 0.75 = 600.","Reasonableness check: 25% off removes one fourth of the price."],"answer":"The sale price is ₱600."}'),
    ('lesson-worked-examples', 8, 'example', '{"title":"Markup","problem":"An item costs ₱500 and is marked up by 15%. What is the selling price?","steps":["Given: cost = ₱500, markup rate = 15%.","Required: selling price.","Formula: Selling Price = Cost × (1 + Markup Rate).","Substitution: 500 × 1.15 = 575.","Reasonableness check: 15% of 500 is 75, then add it to 500."],"answer":"The selling price is ₱575."}'),
    ('lesson-worked-examples', 9, 'callout', '{"variant":"important","title":"Pattern to notice","text":"Most percentage problems become clear after you label the percentage amount, rate, and base. The formula follows from what is missing."}'),
    ('lesson-worked-examples', 10, 'summary', '{"items":["Asked for the part: multiply rate by base.","Asked for the whole: divide percentage amount by rate.","Asked for the percent: divide percentage amount by base.","For change, compare the change with the original amount.","For discounts and markups, identify the correct price or cost base."]}'),

    ('lesson-guided-practice', 1, 'heading', '{"level":1,"text":"Guided Practice Preparation"}'),
    ('lesson-guided-practice', 2, 'paragraph', '{"text":"Before answering the practice activity, pause long enough to identify what the question is asking for. The same numbers can lead to different operations depending on the unknown."}'),
    ('lesson-guided-practice', 3, 'summary', '{"items":["Asked for the part → use Percentage amount = Rate × Base.","Asked for the whole → use Base = Percentage amount ÷ Rate.","Asked for the percent → use Rate = Percentage amount ÷ Base.","For increase or decrease → compare the change with the original amount."]}'),
    ('lesson-guided-practice', 4, 'callout', '{"variant":"info","title":"Word problem checklist","text":"Identify the base, convert percent to decimal, estimate before calculating, compute carefully, check units, and reread the question before choosing an answer."}'),
    ('lesson-guided-practice', 5, 'example', '{"title":"Identify the unknown: part","problem":"A store sold 18% of 450 items. What is being asked?","steps":["The base is 450 items.","The rate is 18%.","The unknown is the percentage amount, or the number of items sold."],"answer":"Use Percentage amount = Rate × Base."}'),
    ('lesson-guided-practice', 6, 'example', '{"title":"Identify the unknown: whole","problem":"₱64 is 40% of what amount? What is being asked?","steps":["The percentage amount is ₱64.","The rate is 40%.","The unknown is the base or whole amount."],"answer":"Use Base = Percentage amount ÷ Rate."}'),
    ('lesson-guided-practice', 7, 'example', '{"title":"Identify the unknown: rate","problem":"27 out of 90 employees attended. What is being asked?","steps":["The percentage amount is 27 employees.","The base is 90 employees.","The unknown is the rate or percent attended."],"answer":"Use Rate = Percentage amount ÷ Base, then convert to percent."}'),
    ('lesson-guided-practice', 8, 'callout', '{"variant":"important","title":"Good exam habits","text":"Write or mentally label the base first. Convert percent to decimal. Estimate the size of the answer. Keep units in mind. Then reread the final question."}'),
    ('lesson-guided-practice', 9, 'summary', '{"items":["The right formula depends on the unknown.","The base is the reference amount.","A quick estimate can prevent many mistakes.","The practice activity below will mix several percentage skills."]}'),

    ('lesson-percentages-topic-quiz', 1, 'heading', '{"level":1,"text":"Percentages Topic Quiz"}'),
    ('lesson-percentages-topic-quiz', 2, 'paragraph', '{"text":"This quiz checks your understanding of the Percentages topic. It covers percentage meaning, conversions, finding the percentage amount, finding the base, finding the rate, percentage change, discounts, and markups."}'),
    ('lesson-percentages-topic-quiz', 3, 'summary', '{"items":["10 questions","Passing score: 70%","Unlimited attempts","No time limit","Questions are original review questions, not official CSC material."]}'),
    ('lesson-percentages-topic-quiz', 4, 'callout', '{"variant":"important","title":"Before you start","text":"Complete the lessons and practice activities first. The quiz is meant to check readiness after you have studied the examples and tried guided practice."}'),
    ('lesson-percentages-topic-quiz', 5, 'paragraph', '{"text":"Read each question carefully. Identify the base quantity, convert percentages to decimals when computing, and check whether the item asks for the part, the whole, the rate, or a changed value."}'),
    ('lesson-percentages-topic-quiz', 6, 'callout', '{"variant":"info","title":"Answer review","text":"Answers and explanations are shown only after you submit an attempt. Do your best before checking the result."}')
)
SELECT
    lessons.id,
    blocks.block_type,
    blocks.content_json,
    blocks.position
FROM blocks
INNER JOIN lessons ON lessons.public_id = blocks.lesson_public_id
INNER JOIN topics ON topics.id = lessons.topic_id
INNER JOIN subjects ON subjects.id = topics.subject_id
INNER JOIN courses ON courses.id = subjects.course_id
WHERE courses.slug = 'cse-professional'
  AND subjects.slug = 'numerical-ability'
  AND topics.slug = 'percentages';
