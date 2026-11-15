// Reads the labelled set: each rewrite beside its original, as the measurement compared them.
import { readFileSync, readdirSync } from "node:fs";

const here = new URL(".", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, here), "utf8"));

export const sections = Object.fromEntries(read("sections.json").map((s) => [s.id, s]));
export const runs = read("runs.json");
export const labels = read("labels.json");

/** Every rewrite of every run: { run, id, original, rewrite, sameLanguage, reader }. */
export function* pairs() {
  for (const { run, language } of runs) {
    for (const r of read(`rewrites/${run}.json`)) {
      const s = sections[r.id];
      // A model often leaves the section's heading out. An English rewrite gets it back, so a figure in the heading
      // isn't counted as lost. A Spanish one is held against the original as it is.
      yield { run, id: r.id, original: s.heading + "\n" + s.text, rewrite: (language === "en" ? s.heading + "\n" : "") + r.text, sameLanguage: language === "en", reader: r.reader };
    }
  }
}
