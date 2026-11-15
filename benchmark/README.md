# The labelled set

Official text, rewrites of it by six models, and every place where a stronger model said a rewrite changed the meaning, marked as a real change or not. It is for measuring anything that claims to tell a faithful rewrite from an unfaithful one: a code check, a checking model, an instruction.

**Read this before you quote a number from it.** An AI agent (Claude) marked every flag, on 15 November 2026. No person has read the marks yet. Every line of `labels.json` says so in its `marked_by`, and that line changes only when a person has read that flag.

## What is in it

| File | What it holds |
|---|---|
| `sections.json` | 147 sections of official text, cut at the pages' own headings: 91 from 20 pages of GOV.UK guides (fetched 14 November 2026) and 56 from 11 Medicare.gov pages (fetched 15 November 2026). Each has its `source`, the page's `title`, its `heading` and its `text`. |
| `runs.json` | The 15 runs: the writer model, the router it was called through, its thinking setting, which instruction it got, the language, and how many sections the stronger reader flagged and how many hold a change marked real. |
| `rewrites/<run>.json` | The run's rewrites: the section's `id`, the `text` the model returned, the `seconds` the call took, its tokens where the router gave them, and `reader`: what the stronger reader said, "same" or "changed". One rewrite was "not read", after the reader's call failed four times. |
| `labels.json` | The 453 flags. For each: the `run`, the section's `id`, the `kind` (changed, dropped, added), the `original` words and the `rewrite`'s, as the reader quoted them, then `real` (true for 264) and `why`, which are the mark. |
| `load.js`, `score.js` | Reads the set as pairs of original and rewrite, and scores the guard on it. |

Eleven Medicare sections have a `sent` beside their `text`. The pages put table cells on one line, and the first cut of them ran some cells together ("March 31Within"). `sent` is what the models were given; `text` has the spacing put right and is what a rewrite is held against.

## How it was made

**The writers.** Each section was sent alone, under its heading, with this instruction, where the style is one of four:

> You rewrite one section of an official UK government page for one reader. *(style)*
> Keep every fact. Keep every date, time, amount, percentage, period and number exactly as the original gives it, in figures, with the same currency sign: £1,000 stays £1,000. Do not add facts, advice, examples or numbers that are not in the section. Keep the '###' headings, the bullet lists and the table rows.
> Return only the rewritten section, in Markdown.

For a Medicare section it said "US government page" and "$1,000 stays $1,000". The styles, by their names in `runs.json`:

- `first`: Rewrite it in plain English with short sentences, for a reader who finds official writing hard. One idea in each sentence. Use common words.
- `second`: Rewrite it in plain English with short sentences, for a reader who finds official writing hard. Keep each condition with what it is a condition of. Use common words.
- `third`: Rewrite it in plain English with short sentences, for a reader who finds official writing hard. Keep each condition with what it is a condition of: an 'if', 'unless', 'and', 'or', 'both' or 'either' stays in the same sentence or list as the rule it limits. Keep limit words beside figures as they are (at least, up to, by, before, after, within, more than, less than), and keep must, will, may, can, cannot and should as they are. Use common words.
- `spanish`: Rewrite it in clear, natural Spanish, for a reader who does not read English. Translate month names. Keep the names of benefits, taxes and forms in English.

The four runs through Anthropic's API cover the 91 GOV.UK sections. The eleven through Otari cover all 147.

**The stronger reader.** Claude Opus 5.5 read every rewrite beside its original, with this instruction:

> You compare a rewrite of one section of an official UK government page with the original. The rewrite may be in simpler English or in Spanish.
> Report only differences that would change what a reader does or believes: a condition, exception or step that was dropped; an obligation, permission, person, time or amount that changed; something stated that the original does not say.
> Do not report style, order, tone, names left in English, added glosses of a term in brackets, or the heading being left out.
> Return only JSON: {"verdict": "same" or "changed", "problems": [{"kind": "dropped" or "changed" or "added", "original": "the original's words", "rewrite": "the rewrite's words, or empty"}]}

**The marks.** Each thing it reported is one line of `labels.json`. An AI agent then read each against the two texts and marked it: `real` when a reader of the rewrite would do or believe something the original doesn't say, with a line of `why`.

## What the marks are worth

- **One reader made the list.** A change the stronger reader missed is not in `labels.json`, and counts as a faithful rewrite when you score against the set. It missed at least nine: Spanish rewrites that turned "by" a date into "antes de" (before). So a checker's misses, counted here, are a floor, and its false alarms are a ceiling.
- **One agent made the marks,** and the borderline ones would move with another marker: a dropped "generally", a "may" turned into "can".
- **The guard's limit-words check was written while reading five of the runs** (`limit_words_built_on` in `runs.json`). Score it on the others.
- **Two kinds of page.** Tax and benefit guides and Medicare pages, in English, rewritten into plain English and Spanish. The Medicare pages are harder for every model: long tables, and many sentences that start with "Generally".

## Scoring something against it

```
node benchmark/score.js
```

prints, for each run, how many of the rewrites with a real change the guard refuses, and how many of the others, split into refusals for a figure and for words alone. `load.js` gives you the same pairs for a checker of your own:

```js
import { pairs, labels } from "./benchmark/load.js";
for (const { run, id, original, rewrite, sameLanguage, reader } of pairs()) { /* ... */ }
```

The original is the section's heading and its text. An English rewrite gets the heading put back above it first, because a model often leaves the heading out and a figure in it would then count as lost. A Spanish rewrite is held against the original as it is.

## Whose text it is

The GOV.UK sections contain public sector information licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). The Medicare.gov sections are a work of the United States Government. Both are quoted as they stood on the day they were fetched, and the pages have the current words. The rewrites are models' output and are wrong in places: that is what the set is for. Don't take one for the official text.
