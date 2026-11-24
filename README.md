# kept

A guard for pages that let an AI model rewrite official text: the rewrite goes onto the page only if it keeps every figure of the original and the limit words beside them. With it comes a labelled set to measure rewrites with.

A working name. Made for the Open Agentic Web Challenge.

## Why

A government page says "you need to spend **at least** 35 hours a week" and "tell HMRC **by** 5 October". Ask a model to put that page in plain words, or in Spanish, and most of the time it does it well. Sometimes it writes "35 hours a week" or "before 5 October", and the reader now believes something the page never said. On the pages we measured, a model changed the meaning of between 1 section in 45 and 1 in 3, depending on the model and how it was asked.

Most of those changes can't be caught by code. Some can, exactly and in a millisecond, and those should never reach the page. That is this guard.

## Use it

It has no dependencies and runs in a browser or in Node 20.

```js
import { guard } from "./guard/index.js";

// Your own function that puts text on the page.
const replace = guard((text, element) => { element.textContent = text; });

const said = replace(original, rewrite, element);
if (!said.ok) console.log(said.reasons);
// [ "'at least' beside 35h is gone" ]
```

`replace` takes the original text first, then what your function takes. When the checks refuse the rewrite, your function is not called and `said.reasons` says why, in sentences you can show a reader or hand back to the model for another try. For a translation, pass `guard(fn, { sameLanguage: false })`. `check(original, rewrite)` gives the same answer without replacing anything.

## What it checks

English and Spanish.

- **Figures.** Every date, time, amount of money, percentage, counted period ("39 weeks") and other number of the original must be in the rewrite, and the rewrite may add none. Each is read into one fixed form first, so "6 April 2026", "April 6, 2026" and "6 de abril de 2026" are the same date, and "£1,000" is "1.000 libras". A period keeps its unit: 3 months can't become 3 weeks. A minus sign is part of its figure: -£100 can't become £100.
- **How often.** No figure may appear fewer times than in the original. A rewrite may repeat one when it cuts a sentence in two.
- **Limit words beside a figure.** "At least", "up to", "more than", "less than", "by", "before", "after", "within", "from" and their Spanish forms. A figure that has one keeps it in every place it had it, in any wording of the same kind: "no more than" and "35 or fewer hours" may stand for "up to", "before" may not stand for "by".
- **Duty words.** In a rewrite in the same language, "you'll get" and "you must" can't become "you may", and a "may", "usually" or "in most cases" can't vanish.
- **Lists under "both" or "all of".** A list that must hold together can't be turned into separate sentences that each read as enough.

## What it catches, and what it doesn't

`node benchmark/score.js` prints this for every run in the labelled set. On the seven runs in English that the limit-words check was not built on, 1,028 rewrites:

- 97 hold a real change of meaning, by the marks in the set. The guard refuses 31 of them.
- Of the other 931 it refuses 26: 18 for a figure that is missing, added or given fewer times, which anyone can check against the page, and 8 for words alone, under 1 in 100.

So it stops about 3 in 10 of the changes that matter, and it does not replace a second reader. It sees a limit word lost, a duty word weakened and a list pulled apart. It does not see a condition turned into a statement, a person dropped from a rule, or an example turned into the rule. Use it before a second model that reads the rewrite against the original, not instead of one.

Planted damage, `node damage/plant.js`: each of the 1,440 rewrites the guard accepts is damaged in three ways, and the guard is asked again.

| Damage | Refused |
|---|---|
| One digit changed | 1,430 of 1,430 |
| A unit, month or sign beside a figure swapped | 733 of 733 |
| A line that holds a figure dropped | 1,349 of 1,429 |

The 80 dropped lines it lets through each held figures that the rewrite also gives elsewhere, most of them a heading that the text under it repeats.

## Measure your own rewrites

```
node damage/plant.js pairs.json
```

`pairs.json` is a list of `{ "original": "...", "rewrite": "...", "sameLanguage": true }`. The script keeps the rewrites the guard accepts, plants the same three kinds of damage, and prints how many the guard then refuses and the first few it lets through.

## The labelled set

`benchmark/` holds 147 sections of official text (91 from GOV.UK guides, 56 from Medicare.gov), 1,981 rewrites of them from 15 runs of 6 models, and 453 places where a stronger model said a rewrite changed the meaning, each marked as a real change or not. [benchmark/README.md](benchmark/README.md) says how it was made, in which words the models were asked, and what the marks are worth: **an AI agent marked every flag, and no person has read them yet.**

## Tests

```
npm test
```

No install step. The tests hold the guard to the verdict each of the 1,981 rewrites got when the checks were measured, and to a handful of plain cases.

## Licence

The code, the marks and the models' rewrites are under Apache 2.0. The official text in `benchmark/sections.json` keeps its own terms: the GOV.UK sections contain public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/), and the Medicare.gov sections are a work of the United States Government.
