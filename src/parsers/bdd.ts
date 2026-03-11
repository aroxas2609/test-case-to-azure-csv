import type { TestCaseParser } from "@/types/testCase";
import { givenWhenThenParser } from "./givenWhenThen";

/** BDD: title on first line, then Given/When/Then. Same parsing as givenWhenThen; detect prefers when first line is not a keyword. */
function detect(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const firstLine = t.split(/\r?\n/)[0]?.trim() ?? "";
  const firstIsKeyword = /^(given|when|then)\b/i.test(firstLine);
  const hasGwt = /\bgiven\b/i.test(t) && (/\bwhen\b/i.test(t) || /\bthen\b/i.test(t));
  return hasGwt && !firstIsKeyword;
}

export const bddParser: TestCaseParser = {
  id: "bdd",
  name: "BDD (title + Given/When/Then)",
  description: "First line = title, then Given / When / Then. Blank line between cases.",
  detect,
  parse: givenWhenThenParser.parse,
};
