#!/usr/bin/env node
// Scores the guard on the labelled set: of the rewrites marked as holding a real change of meaning, how many it
// refuses, and how many of the others it refuses too.
//
//   node benchmark/score.js
//
// To score another checker, give it check()'s answer: { ok, figures: [], words: [] }, the two lists saying why.
import { check } from "../guard/index.js";
import { labels, pairs, runs } from "./load.js";

const real = new Set(labels.filter((l) => l.real).map((l) => l.run + " " + l.id));
const row = () => ({ read: 0, real: 0, caught: 0, others: 0, figure: 0, words: 0 });
const by = Object.fromEntries(runs.map(({ run }) => [run, row()])), fresh = row(), all = row();
const english = Object.fromEntries(runs.map((r) => [r.run, r.language === "en" && !r.limit_words_built_on]));
for (const { run, id, original, rewrite, sameLanguage, reader } of pairs()) {
  if (reader === "not read") continue;
  const said = check(original, rewrite, { sameLanguage });
  for (const r of [by[run], all, ...(english[run] ? [fresh] : [])]) {
    r.read++;
    if (real.has(run + " " + id)) { r.real++; r.caught += !said.ok; }
    else { r.others++; r.figure += said.figures.length > 0; r.words += !said.figures.length && said.words.length > 0; }
  }
}
const cells = (name, r) => [name, r.read, `${r.caught} of ${r.real}`, r.others, r.figure, r.words];
const table = [
  ["", "", "real changes", "", "others refused", "others refused"],
  ["run", "read", "refused", "others", "for a figure", "for words only"],
  ...Object.entries(by).map(([run, r]) => cells(run, r)),
  cells("English runs the limit words were not built on", fresh),
  cells("all", all),
];
const wide = table[0].map((_, k) => Math.max(...table.map((line) => String(line[k]).length)));
for (const line of table) console.log(line.map((cell, k) => (k ? String(cell).padStart(wide[k]) : String(cell).padEnd(wide[k]))).join("   "));
