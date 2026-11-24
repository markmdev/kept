// The figures check: the dates, times, amounts, percentages, counted periods and other numbers of a text, each in
// one fixed form, so a rewrite can be held against its original whatever its wording or language (English, Spanish).
const MONTHS = {};
for (const names of [
  ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
  ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
  ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
]) names.forEach((name, n) => { MONTHS[name] = n + 1; });
MONTHS.sept = 9; MONTHS.setiembre = 9;
const longestFirst = (words) => [...words].sort((a, b) => b.length - a.length).join("|");
export const MON = "(" + longestFirst(Object.keys(MONTHS)) + ")";
export const UNITS = {
  day: "d", days: "d", "día": "d", "días": "d", dia: "d", dias: "d", week: "w", weeks: "w", semana: "w", semanas: "w",
  month: "mo", months: "mo", mes: "mo", meses: "mo", year: "y", years: "y", "año": "y", "años": "y",
  hour: "h", hours: "h", hora: "h", horas: "h", minute: "min", minutes: "min", minuto: "min", minutos: "min",
};
export const WORDS = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};
export const NUM = "\\d+(?:[.,]\\d+)*";
const SIGN = "(?:(?<![^\\s(|])([-−]))?";
const TAKEN = "\u0000";
const signed = (sign) => (sign ? "-" : "");
// Month names that stand alone, and one word allowed between a figure and its unit ("2 more weeks").
const FULL = Object.fromEntries(Object.entries(MONTHS).filter(([name]) => name.length > 4 || ["june", "july", "mayo"].includes(name)));
const BETWEEN = "(?:(?!(?:or|to|and|in|of|for|a|the|per|than|is|are|o|y|de|en|por|que|a)\\s)[a-záéíóúñ-]+\\s)?";
const UNIT = "(" + longestFirst(Object.keys(UNITS)) + ")";
// The edge of a word, counting accented letters as letters.
export const B = "(?<![\\p{L}\\p{N}_])", E = "(?![\\p{L}\\p{N}_])";

// One form for a figure however it is punctuated: a comma or dot before exactly three digits groups thousands
// (1,000 and 1.000), before one or two digits it is the decimal point (194.32, 194,32).
function num(s) {
  const [first, ...rest] = s.split(/[.,]/);
  let whole = first, frac = "";
  for (const part of rest) { if (part.length === 3 && !frac) whole += part; else frac += part; }
  frac = frac.replace(/0+$/, "");
  return whole + (frac ? "." + frac : "");
}
const pad = (n) => String(n).padStart(2, "0");

/** Each figure of a text in its fixed form, with how many times the text gives it: a Map. */
export function counted(text) {
  text = text.replace(/(?<=[a-z,] )May(?![\p{L}\p{N}_])/gu, "mayo");      // "May" inside a sentence is the month; "may" is not
  text = text.replace(/^\s*\d{1,2}[.)]\s/gm, "");                         // the numbers of a numbered list are not the page's figures
  let t = " " + text.toLowerCase().replaceAll(" ", " ").replaceAll("’", "'").replaceAll("*", "") + " ";
  const out = new Map();
  const take = (pattern, make) => {
    t = t.replace(new RegExp(pattern, "gu"), (...m) => { const f = make(m); if (f) out.set(f, (out.get(f) ?? 0) + 1); return TAKEN; });
  };
  // dates: 6 April 2026, 6 de abril de 2026, 6 April, April 6, 2026, April 2026, April 6
  take(B + "(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:de\\s+)?" + MON + E + "\\.?(?:\\s+(?:de\\s+)?((?:19|20)\\d{2}))?",
    (m) => m[3] ? `date:${m[3]}-${pad(MONTHS[m[2]])}-${pad(m[1])}` : `date:${pad(MONTHS[m[2]])}-${pad(m[1])}`);
  take(B + MON + E + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+((?:19|20)\\d{2})" + E, (m) => `date:${m[3]}-${pad(MONTHS[m[1]])}-${pad(m[2])}`);
  take(B + MON + E + "\\.?\\s+(?:de\\s+)?((?:19|20)\\d{2})" + E, (m) => `date:${m[2]}-${pad(MONTHS[m[1]])}`);
  take(B + MON + E + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?" + E + "(?![.,]?\\d|\\s?(?:%|" + Object.keys(UNITS).join("|") + ")" + E + ")",
    (m) => `date:${pad(MONTHS[m[1]])}-${pad(m[2])}`);
  // money and pence
  take(SIGN + "([£$])\\s?(" + NUM + ")(?:\\s?(million|billion|millones|millón|m" + E + "|bn" + E + "|k" + E + "))?",
    (m) => signed(m[1]) + m[2] + num(m[3]) + ({ million: "m", millones: "m", "millón": "m", billion: "bn" }[m[4]] ?? m[4] ?? ""));
  take(SIGN + B + "(" + NUM + ")\\s?(?:libras|pounds)" + E, (m) => signed(m[1]) + "£" + num(m[2]));
  take(SIGN + B + "(" + NUM + ")\\s?(?:dollars|dólares)" + E, (m) => signed(m[1]) + "$" + num(m[2]));
  take(SIGN + B + "(\\d+)p" + E, (m) => signed(m[1]) + "p" + m[2]);
  take(SIGN + B + "(" + NUM + ")\\s?(?:%|per cent|percent|por ciento)", (m) => signed(m[1]) + num(m[2]) + "%");
  // times of day
  take(B + "(\\d{1,2})(?:[:.](\\d{2}))?\\s?(am|pm|a\\.\\s?m\\.|p\\.\\s?m\\.)", (m) => `time:${pad(Number(m[1]) % 12 + (m[3][0] === "p" ? 12 : 0))}:${m[2] || "00"}`);
  take(B + "([01]?\\d|2[0-3]):([0-5]\\d)" + E + "(?:\\s?(?:h|horas)" + E + ")?", (m) => `time:${pad(Number(m[1]))}:${m[2]}`);
  take(B + "(midnight|medianoche|midday|noon|mediodía)" + E, (m) => "time:" + ({ medianoche: "midnight", noon: "midday", "mediodía": "midday" }[m[1]] ?? m[1]));
  // counted periods, in figures or in words
  take(SIGN + B + "(" + NUM + ")[\\s-]" + UNIT + E, (m) => signed(m[1]) + num(m[2]) + UNITS[m[3]]);
  take(SIGN + B + "(" + NUM + "|" + Object.keys(WORDS).join("|") + ")\\s(?:or more|or less|or fewer|o más|o menos)\\s" + UNIT + E,
    (m) => signed(m[1]) + (WORDS[m[2]] ?? num(m[2])) + UNITS[m[3]]);
  take(SIGN + B + "(?!(?:19|20)\\d{2}" + E + ")(" + NUM + ")[\\s-]" + BETWEEN + UNIT + E, (m) => signed(m[1]) + num(m[2]) + UNITS[m[3]]);
  take(B + "(" + Object.keys(WORDS).join("|") + ")[\\s-]" + BETWEEN + UNIT + E, (m) => WORDS[m[1]] + UNITS[m[2]]);
  take(B + "(" + Object.keys(FULL).join("|") + ")" + E, (m) => "month:" + pad(FULL[m[1]]));
  // ordinals: 16th, 16.º
  take("(?<![a-z0-9])(\\d+)(?:st|nd|rd|th|\\.?[ºª]|\\.?er)(?![a-z0-9])", (m) => "n:" + m[1]);
  // every other figure: years, ages, counts, form numbers, phone numbers
  take(SIGN + "(?<![a-z])(" + NUM + ")(?![a-z])", (m) => "n:" + signed(m[1]) + num(m[2]));
  take(B + "([a-z]+\\d+[a-z0-9]*)" + E, (m) => "code:" + m[1]);
  return out;
}

export const PERIOD = /^(\d[\d.]*)(d|w|mo|y|h|min)$/;

/** A period keeps its unit (3 months can't become 3 weeks). A bare figure may gain "years" in the rewrite
 *  ("aged 16" and "16 años"), and nothing else may appear or go missing. */
export function compare(original, rewrite) {
  const a = counted(original), b = counted(rewrite);
  const lost = [...a.keys()].filter((f) => !b.has(f) && !(f.startsWith("n:") && b.has(f.slice(2) + "y"))).sort();
  const added = [...b.keys()].filter((g) => {
    if (a.has(g)) return false;
    const m = PERIOD.exec(g);
    return !(m && m[2] === "y" && a.has("n:" + m[1]));
  }).sort();
  return { of: a.size, lost, added, ok: !lost.length && !added.length };
}

/** Figures the rewrite gives fewer times, and more times, than the original. "aged 16" and "16 años" are one
 *  figure, so a count of years and a bare number are counted together. */
export function recount(original, rewrite) {
  const same = (c) => {
    const out = new Map();
    for (const [f, n] of c) {
      const m = /^(?:n:([\d.]+)|([\d.]+)y)$/.exec(f);
      const key = m ? "n:" + (m[1] ?? m[2]) : f;
      out.set(key, (out.get(key) ?? 0) + n);
    }
    return out;
  };
  const a = same(counted(original)), b = same(counted(rewrite));
  return {
    fewer: [...a.keys()].filter((f) => (b.get(f) ?? 0) < a.get(f)).sort(),
    more: [...b.keys()].filter((f) => b.get(f) > (a.get(f) ?? 0)).sort(),
  };
}
