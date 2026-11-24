import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pairs } from "../benchmark/load.js";
import { compare, recount } from "../guard/facts.js";
import { check, guard } from "../guard/index.js";
import { beside, duty, lists } from "../guard/limits.js";

// measured.json is what the checks said of each rewrite when they were last measured, on 24 November 2026, in the Python
// they were first written in. The numbers the README gives were counted from those verdicts.
test("every rewrite of the labelled set gets the verdict it got when the checks were measured", () => {
  const measured = JSON.parse(readFileSync(new URL("measured.json", import.meta.url), "utf8"));
  let seen = 0;
  for (const { run, id, original, rewrite, sameLanguage } of pairs()) {
    const figures = compare(original, rewrite);
    const now = {
      lost: figures.lost, added: figures.added, fewer: recount(original, rewrite).fewer,
      beside: beside(original, rewrite), duty: sameLanguage ? duty(original, rewrite) : [], lists: lists(original, rewrite),
    };
    assert.deepEqual(now, measured[run][id], `${run} ${id}`);
    seen++;
  }
  assert.equal(seen, 1981);
});

test("a refused rewrite never reaches the page, and says why", () => {
  const page = [];
  const replace = guard((text, where) => { page.push([where, text]); return "replaced"; });
  const refused = [
    ["You need to spend at least 35 hours a week caring.", "You must care for someone for 35 hours a week.", /'at least' beside 35h is gone/],
    ["Tell HMRC by 5 October.", "Tell HMRC before 5 October.", /'by' beside 10-05 became 'before'/],
    ["You'll get a penalty if you miss the deadline for your return.", "You may get a penalty if you miss the deadline for your return.", /'will get' or 'must get' became 'may get'/],
    ["You may be able to claim Marriage Allowance to reduce your partner's tax.", "You can claim Marriage Allowance to reduce your partner's tax.", /'may' is gone/],
    ["Apprentices get it if they both:\n- are aged 19 or over\n- have completed the first year", "Apprentices get it if they are 19 or over. Apprentices get it if they have finished their first year.", /the list of 2 under 'both' or 'all'/],
    ["Pay by 11:59pm on 31 January 2027.", "Pay by 11:59pm on 31 January 2028.", /missing from the rewrite: 2027-01-31/],
    ["It is paid for up to 39 weeks.", "It is paid for up to 39 months.", /missing from the rewrite: 39w/],
    ["The rate is £194.32 a week. You get £194.32 for each week you are off.", "You get £194.32 for each week you are off.", /given fewer times than in the original: £194.32/],
    ["You need at least 35 hours.", "You need 35 or fewer hours.", /'at least' beside 35h became 'up to'/],
    ["Pay by 5pm.", "Pay before 17:00.", /'by' beside 17:00 became 'before'/],
    ["Pay by midnight.", "Pay after midnight.", /'by' beside midnight became 'after'/],
    ["The first job needs at least 35 hours. The second job needs at least 35 hours.", "The first job needs 35 hours. The second job needs at least 35 hours.", /'at least' beside 35h is kept 1 of 2 times/],
    ["Your balance is -£100.", "Your balance is £100.", /missing from the rewrite: -£100/],
    ["Your balance is -100.", "Your balance is 100.", /missing from the rewrite: -100/],
    ["|A|-£100|", "|A|£100|", /missing from the rewrite: -£100/],
    ["The adjustment is -5 hours.", "The adjustment is 5 hours.", /missing from the rewrite: -5h/],
    ["You need two or more hours.", "You need two or fewer hours.", /'at least' beside 2h became 'up to'/],
    ["£100\n-5%", "£100\n5%", /missing from the rewrite: -5%/],
  ];
  for (const [original, rewrite, why] of refused) {
    const said = replace(original, rewrite, "s1");
    assert.equal(said.ok, false, rewrite);
    assert.match(said.reasons.join("; "), why);
  }
  assert.deepEqual(page, []);

  const said = replace("You need to spend at least 35 hours a week caring.", "You must care for someone at least 35 hours each week.", "s1");
  assert.deepEqual([said.ok, said.reasons, said.result], [true, [], "replaced"]);
  assert.deepEqual(page, [["s1", "You must care for someone at least 35 hours each week."]]);
});

test("the same figures and limits in other words are accepted", () => {
  for (const [original, rewrite] of [
    ["You need at least 35 hours.", "You need 35 or more hours."],
    ["Pay by 5pm.", "Pay by 17:00."],
    ["The fee is £100-200.", "The fee is £100 to 200."],
    ["Your balance is −£100.", "You have a balance of -£100."],
  ]) assert.equal(check(original, rewrite).ok, true, rewrite);
});

test("a translation is not held to the duty words of another language", () => {
  const original = "You'll get a penalty if you miss the deadline.", rewrite = "Recibirá una multa si no cumple el plazo.";
  assert.equal(check(original, rewrite, { sameLanguage: false }).ok, true);
});
