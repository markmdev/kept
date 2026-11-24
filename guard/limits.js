// The limit-words check: what a figures check can't see.
//   beside(original, rewrite)  every figure keeps its limit word: "at least 35 hours" can't become "35 hours"
//   duty(original, rewrite)    a sentence keeps the strength of its duty word: "you'll get" can't become "you may get"
//   lists(original, rewrite)   a list under "both" or "all of" keeps its joining word and its items
// Each returns the reasons it refuses the rewrite, in words a reader can be shown. English and Spanish, except
// duty(), which needs the two texts in one language.
import { B, E, MON, NUM, PERIOD, UNITS, WORDS, counted } from "./facts.js";

const SIGN = "(?:(?<![^\\s(])[-−])?";
const UNIT = "(?:" + Object.keys(UNITS).sort((a, b) => b.length - a.length).join("|") + ")";
const WORDNUM = "(?:" + Object.keys(WORDS).join("|") + ")";
const FIGURE = new RegExp([
  "\\d{1,2}(?:st|nd|rd|th)?\\s+(?:de\\s+)?" + MON + E + "\\.?(?:\\s+(?:de\\s+)?(?:19|20)\\d{2})?",
  MON + E + "\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+(?:19|20)\\d{2})?" + E,
  MON + E + "\\.?\\s+(?:de\\s+)?(?:19|20)\\d{2}" + E,
  SIGN + "[£$]\\s?" + NUM + "(?:\\s?(?:million|billion|millones|millón))?",
  SIGN + NUM + "\\s?(?:%|per cent|percent|por ciento|pounds|libras|dollars|dólares)",
  "\\d{1,2}(?:[:.]\\d{2})?\\s?(?:am|pm|a\\.\\s?m\\.|p\\.\\s?m\\.)",
  "(?:[01]?\\d|2[0-3]):[0-5]\\d" + E + "(?:\\s?(?:h|horas)" + E + ")?",
  B + "(?:midnight|medianoche|midday|noon|mediodía)" + E,
  NUM + "\\s(?:or more|or less|or fewer|o más|o menos)\\s" + UNIT + E,
  "(?:" + NUM + "|" + WORDNUM + ")[\\s-](?:[a-záéíóúñ-]+\\s)?" + UNIT + E,
  SIGN + NUM,
].join("|"), "giu");
const INNER = [["at least", /\s(?:or more|o más)\s/iu], ["up to", /\s(?:or less|or fewer|o menos)\s/iu]];

// Each limit word's class. A class is what must survive; any word of the class may stand for another.
const BEFORE_FIGURE = [
  ["at least", "at least|no less than|not less than|a minimum of|minimum of|al menos|como mínimo|por lo menos|un mínimo de|no menos de"],
  ["up to", "(?<!go )(?<!goes )(?<!going )(?<!went )(?<!rise )(?<!rises )(?<!increase )(?<!increases )up to|no more than|not more than|a maximum of|maximum of|at most|capped at|limited to|a limit of|como máximo|un máximo de|no más de|se limita a|limitad[oa]s? a|tope de|límite de"],
  ["more than", "more than|greater than|higher than|above|over|exceeds?|más de|superior(?:es)? a|por encima de|mayor(?:es)? (?:de|que)|super[ae]n?|exced[ae]n?"],
  ["less than", "less than|fewer than|lower than|below|under|menos de|inferior(?:es)? a|por debajo de|menor(?:es)? (?:de|que)"],
  ["by", "by|no later than|not later than|on or before|deadline is|deadline of|deadline on|a más tardar|fecha límite es"],
  ["until", "until|up until|till"],
  ["hasta", "hasta"],
  ["before", "before|earlier than|prior to|antes de|anterior(?:es)? a"],
  ["after", "after|later than|después de|tras|pasado"],
  ["within", "within|dentro de|en un plazo de|en el plazo de"],
  ["from", "from|since|starting(?: on)?|starts on|start on|started on|begins on|on or after|beginning|desde|a partir de|comenzó el|empezó el|comienza el|empieza el|inició el|inicia el"],
];
const AFTER_FIGURE = [
  ["at least", "or (?:more|over|above|older|higher)|and (?:over|above|older)|at least|minimum|o más|y más|o mayor(?:es)?|o superior(?:es)?|en adelante|como mínimo"],
  ["up to", "or (?:less|under|below|younger|lower|fewer)|and (?:under|below|younger)|at (?:the )?most|maximum|o menos|o menor(?:es)?|o inferior(?:es)?|como máximo"],
  ["from", "or (?:after|later)|o después|o posterior(?:mente)?"],
];
const GAP = "(?:\\s+(?:the|a|an|el|la|los|las|un|una|about|around|aged?|age of|next|first|last|end of|unos|los próximos|cumplir|de|threshold of|rate of|umbral de|tasa de|en)){0,3}\\s+";
const PRE = BEFORE_FIGURE.map(([name, words]) => [name, new RegExp("(?<![a-záéíóúñ])(?:" + words + ")" + GAP + "(?:l\\s)?$", "iu")]);
const POST = AFTER_FIGURE.map(([name, words]) => [name, new RegExp("^\\s*(?:" + UNIT + "\\s+)?(?:old\\s+|años\\s+)?(?:" + words + ")(?![a-záéíóúñ])", "iu")]);
const BREAK = /[.;:!?\n|]/;
const AL = new RegExp(B + "al" + E + "(?! menos)", "gu"), DEL = new RegExp(B + "del" + E, "gu");
const SPAN = new RegExp(B + "(?:over|under)" + GAP + "$", "iu");
const clean = (text) => text.replaceAll(" ", " ").replaceAll("’", "'");

/** For each figure, how many times the text puts each limit word's class beside it: Map of figure to a Map of class to count. */
export function limited(text) {
  const out = new Map();
  text = clean(text).replaceAll("*", "");
  for (const m of text.matchAll(FIGURE)) {
    const figures = [...counted(m[0]).keys()];
    if (!figures.length) continue;
    const end = m.index + m[0].length;
    const before = text.slice(Math.max(0, m.index - 60), m.index).split(BREAK).at(-1).replace(DEL, "de el").replace(AL, "a el") + " ";
    const after = text.slice(end, end + 30).split(BREAK)[0];
    const found = new Set([...PRE.filter(([, rx]) => rx.test(before)), ...POST.filter(([, rx]) => rx.test(after)), ...INNER.filter(([, rx]) => rx.test(m[0]))].map(([name]) => name));
    const day = figures.some((f) => /^(?:date|time|month):/.test(f));
    const period = figures.some((f) => PERIOD.test(f));
    // "until" and "hasta" set a deadline before a date and a ceiling before an amount; "by £1" is no limit at all
    if (found.delete("hasta")) found.add(day ? "by" : "up to");
    if (found.delete("until") && day) found.add("by");
    if (!day) { found.delete("by"); found.delete("from"); }      // "by £1" and "starting 3 months before" are no limits
    if (/on or after[^\p{L}\p{N}_]*$/u.test(before)) found.delete("after");
    if (/^\s*(?:to|until|a|al|hasta|-|–)\s/.test(after)) found.delete("from");      // "from 6 April to 5 April" is a span, not a start
    if (/on or before[^\p{L}\p{N}_]*$/u.test(before)) found.delete("before");
    // "over the 12 weeks before" and "over 7 days" are spans of time, not "more than"
    if (period && SPAN.test(before)) { found.delete("more than"); found.delete("less than"); }
    // "aged 16" and "16 años" are one figure
    for (const f of figures) {
      const key = f.replace(/^([\d.]+)y$/, "n:$1");
      if (!out.has(key)) out.set(key, new Map());
      for (const name of found) out.get(key).set(name, (out.get(key).get(name) ?? 0) + 1);
    }
  }
  return out;
}

const shown = (f) => f.slice(f.indexOf(":") + 1);

export function beside(original, rewrite) {
  const a = limited(original), b = limited(rewrite);
  const why = [];
  for (const f of [...a.keys()].sort()) {
    if (!b.has(f)) continue;      // a missing figure is the figures check's to refuse
    // A limit word the rewrite adds where the original had none is left to a second reader: a rewrite that turns a
    // list under "after:" into sentences adds one honestly.
    const was = a.get(f), now = b.get(f);
    const gone = [...was.keys()].filter((name) => !now.has(name)).sort(), added = [...now.keys()].filter((name) => !was.has(name)).sort();
    if (gone.length) why.push(`'${gone.join(" and ")}' beside ${shown(f)} ` + (added.length ? `became '${added.join(" and ")}'` : "is gone"));
    for (const name of [...was.keys()].filter((c) => now.has(c) && now.get(c) < was.get(c)).sort())
      why.push(`'${name}' beside ${shown(f)} is kept ${now.get(name)} of ${was.get(name)} times`);
  }
  return why;
}

// Duty words. A sentence of the rewrite is held against the original sentence it shares most words with.
const SURE = B + "(?:must|will|shall|have to|has to|need to|needs to|cannot|can't|will not|won't|must not)" + E + "|'ll" + E;
const UNSURE = B + "(?:may|might|could|usually|normally|generally|sometimes|in most cases|likely|possibly|perhaps|probably|often|typically|in general|most)" + E;
const MAY = B + "(?:may|might|could)" + E;
const ADVERB = "(?:\\s+(?:still|also|only|then|now|not|never|usually|normally|generally))*\\s+";
const STOP = new Set("the and you your for are not but can has was any all its who that this with from they them then also when must will shall have need cannot may might could usually normally generally sometimes likely possibly perhaps".split(" "));
const sentences = (text) => text.replaceAll("’", "'").split(/(?<=[.!?])\s+|\n+/).map((u) => u.trim()).filter(Boolean);
const words = (u) => new Set((u.toLowerCase().match(/[a-z]{3,}/g) ?? []).map((w) => w.slice(0, 6)).filter((w) => !STOP.has(w)));
const verbs = (modal, u) => new Set([...u.matchAll(new RegExp("(?:" + modal + ")" + ADVERB + "([a-z]+)", "giu"))].map((m) => m[1].toLowerCase()));
const shared = (a, b) => [...a].filter((w) => b.has(w)).length;

export function duty(original, rewrite, share = 0.6) {
  const why = [];
  const O = sentences(original).map((u) => [u, words(u)]);
  // A rewrite often cuts one sentence into several, so each original sentence is held against all the rewrite's
  // sentences that are made mostly of its words.
  const pieces = new Map();
  const R = sentences(rewrite);
  R.forEach((r, n) => {
    const wr = words(r);
    if (!wr.size || !O.length) return;
    let best = 0, bestKey = null;
    O.forEach(([, wo], k) => {
      const key = [shared(wr, wo) / wr.size, shared(wr, wo) / Math.max(1, wo.size)];
      if (!bestKey || key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) { best = k; bestKey = key; }
    });
    if (bestKey[0] >= share) { if (!pieces.has(best)) pieces.set(best, []); pieces.get(best).push(n); }
  });
  for (const [k, group] of pieces) {
    const [o, wo] = O[k];
    const said = group.map((n) => R[n]).join(" ");
    if (shared(words(said), wo) / wo.size < share) continue;      // too little of the sentence is there to judge it
    const around = [...new Set(group.flatMap((n) => [n - 1, n, n + 1]).filter((m) => m >= 0 && m < R.length))].sort((x, y) => x - y);
    const near = around.map((n) => R[n]).join(" ");
    const unsure = new RegExp(UNSURE, "iu").exec(o);
    const kept = UNSURE + (unsure && unsure[0].toLowerCase() === "could" ? "|" + B + "can" + E : "");      // "could get" and "can get" say the same
    if (unsure && !new RegExp(kept, "iu").test(near)) why.push(`'${unsure[0]}' is gone from: ${said}`);
    const may = verbs(MAY, said), sure = verbs(SURE, o), mayBefore = verbs(MAY, o), sureNear = verbs(SURE, near);
    for (const verb of [...may].filter((v) => sure.has(v) && !mayBefore.has(v) && !sureNear.has(v)).sort())
      why.push(`'will ${verb}' or 'must ${verb}' became 'may ${verb}' in: ${said}`);
  }
  return why;
}

// Lists under a joining word.
// Only "both" and "all of": a list under "either" reads the same without the word, and rewrites often drop it.
const BOTH = new RegExp("(?<![a-záéíóúñ])(?:both|all of|all the following|all these|two things|two conditions|ambos|ambas|todos|todas|los dos|las dos|todo lo siguiente|dos condiciones|dos cosas)(?![a-záéíóúñ])", "iu");
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s/;

/** Each list that follows a line with a joining word: the number of its items. */
function joined(text) {
  const out = [];
  const lines = text.replaceAll("’", "'").split("\n").filter((l) => l.trim());
  lines.forEach((line, i) => {
    if (BULLET.test(line) || !BOTH.test(line)) return;
    let n = 0;
    while (i + 1 + n < lines.length && BULLET.test(lines[i + 1 + n])) n++;
    if (n >= 2) out.push(n);
  });
  return out;
}

export function lists(original, rewrite) {
  const a = joined(original), b = joined(rewrite);
  const why = [];
  for (const n of a) {
    const at = b.indexOf(n);
    if (at >= 0) b.splice(at, 1);
    else why.push(`the list of ${n} under 'both' or 'all' is not kept as a list of ${n} under such a word`);
  }
  return why;
}

export function check(original, rewrite, sameLanguage = true) {
  return { beside: beside(original, rewrite), duty: sameLanguage ? duty(original, rewrite) : [], lists: lists(original, rewrite) };
}
