#!/usr/bin/env node
// Planted damage: takes rewrites the guard accepts, damages each in one way, and counts how often the guard then
// refuses. It measures the guard on your own rewrites, not ours.
//
//   node damage/plant.js                 the labelled set's rewrites
//   node damage/plant.js pairs.json      yours: [{ "original": "...", "rewrite": "...", "sameLanguage": true }, ...]
//
// Three kinds of damage: one digit changed, a unit, month or sign beside a figure swapped for another, and a line
// that holds a figure dropped. Damage that touches no figure the checks know of is counted apart.
import { readFileSync } from "node:fs";
import { pairs } from "../benchmark/load.js";
import { counted } from "../guard/facts.js";
import { check } from "../guard/index.js";

// The same damage on every run: a small random-number maker with a fixed start.
let seed = 11;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const places = (text, pattern) => [...text.matchAll(pattern)].map((m) => m.index);

const SWAPS = [
  [" weeks", " months"], [" months", " weeks"], [" days", " weeks"], [" years", " months"],
  [" semanas", " meses"], [" meses", " semanas"], [" días", " semanas"], [" años", " meses"],
  ["January", "February"], ["April", "May"], ["October", "November"], ["July", "June"],
  ["enero", "febrero"], ["abril", "mayo"], ["octubre", "noviembre"], ["julio", "junio"], ["pm", "am"], ["%", " pounds"],
];
const DAMAGE = {
  "a digit changed": (text) => {
    const at = places(text, /\d/g);
    if (!at.length) return null;
    const i = pick(at);
    return text.slice(0, i) + (Number(text[i]) + pick([1, 2, 3])) % 10 + text.slice(i + 1);
  },
  "a unit, month or sign swapped": (text) => {
    const can = SWAPS.filter(([from]) => text.includes(from));
    if (!can.length) return null;
    const [from, to] = pick(can), i = pick(places(text, new RegExp(from.replace("%", "\\%"), "g")));
    return text.slice(0, i) + to + text.slice(i + from.length);
  },
  "a line with a figure dropped": (text) => {
    const lines = text.split("\n"), withFigure = lines.map((line, i) => (/\d/.test(line) ? i : -1)).filter((i) => i >= 0);
    if (!withFigure.length) return null;
    lines.splice(pick(withFigure), 1);
    return lines.join("\n");
  },
};

const same = (a, b) => a.size === b.size && [...a].every(([f, n]) => b.get(f) === n);
const file = process.argv[2];
const all = file ? JSON.parse(readFileSync(file, "utf8")) : [...pairs()];
const tally = {}, missed = [];
let accepted = 0;
for (const { original, rewrite, sameLanguage = true, id = "" } of all) {
  if (!counted(original).size || !check(original, rewrite, { sameLanguage }).ok) continue;
  accepted++;
  for (const [name, damage] of Object.entries(DAMAGE)) {
    const bad = damage(rewrite);
    if (bad === null || bad === rewrite) continue;
    const row = (tally[name] ??= { refused: 0, "let through": 0, "no figure touched": 0 });
    if (same(counted(bad), counted(rewrite))) { row["no figure touched"]++; continue; }
    const refused = !check(original, bad, { sameLanguage }).ok;
    row[refused ? "refused" : "let through"]++;
    if (!refused && missed.length < 5) {
      const i = [...bad].findIndex((c, k) => c !== rewrite[k]);
      missed.push(`${name}${id && " in " + id}: "${rewrite.slice(Math.max(0, i - 40), i + 30)}" became "${bad.slice(Math.max(0, i - 40), i + 30)}"`.replaceAll("\n", " "));
    }
  }
}
console.log(`${all.length} rewrites, ${accepted} of them with figures and accepted by the guard. Each was damaged in up to three ways:\n`);
for (const [name, row] of Object.entries(tally)) {
  const tried = row.refused + row["let through"];
  console.log(`${name}: refused ${row.refused} of ${tried}` + (row["no figure touched"] ? ` (${row["no figure touched"]} more touched no figure)` : ""));
}
if (missed.length) console.log("\nThe first let through:\n" + missed.map((m) => "  " + m).join("\n"));
