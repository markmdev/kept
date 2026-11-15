// The guard: one wrapper around a page's "replace text" function. A rewrite goes onto the page only if it keeps
// every figure of the original and the limit words beside them.
import { compare, recount } from "./facts.js";
import { beside, duty, lists } from "./limits.js";

const plain = (f) => f.replace(/^(?:date|time|month|n|code):/, "");

/**
 * What the checks say of one rewrite of one text.
 *
 * sameLanguage: false for a translation. The duty-word check needs both texts in one language and is then left out.
 * Returns { ok, reasons, figures, words }. reasons are sentences a reader, or the model that wrote the rewrite, can
 * be shown. figures and words say which check refused: a figure missing, added or given fewer times, or the words
 * around the figures.
 */
export function check(original, rewrite, { sameLanguage = true } = {}) {
  const { lost, added, ok } = compare(original, rewrite);
  // A rewrite may repeat a figure when it cuts a sentence in two. It may not give one fewer times than the original.
  const fewer = ok ? recount(original, rewrite).fewer : [];
  const figures = [
    ...(lost.length ? [`missing from the rewrite: ${lost.map(plain).join(", ")}`] : []),
    ...(added.length ? [`added by the rewrite: ${added.map(plain).join(", ")}`] : []),
    ...(fewer.length ? [`given fewer times than in the original: ${fewer.map(plain).join(", ")}`] : []),
  ];
  const words = [...beside(original, rewrite), ...(sameLanguage ? duty(original, rewrite) : []), ...lists(original, rewrite)];
  return { ok: !figures.length && !words.length, reasons: [...figures, ...words], figures, words };
}

/**
 * Wraps a function that puts new text somewhere. The wrapped function takes the original text first:
 *
 *     const replace = guard((text, element) => { element.textContent = text; });
 *     const said = replace(original, rewrite, element);
 *
 * When the checks refuse the rewrite, nothing is replaced and said.reasons says why. Otherwise the function runs
 * with the rewrite and the other arguments, and what it returns is in said.result.
 */
export function guard(replace, options) {
  return (original, rewrite, ...rest) => {
    const said = check(original, rewrite, options);
    return said.ok ? { ...said, result: replace(rewrite, ...rest) } : said;
  };
}
