import type { TestCaseParser } from "@/types/testCase";
import { givenWhenThenParser } from "./givenWhenThen";
import { bddParser } from "./bdd";
import { standardParser } from "./standard";
import { scenarioParser } from "./scenario";
import { looseParser } from "./loose";

const allParsers: TestCaseParser[] = [
  givenWhenThenParser,
  bddParser,
  standardParser,
  scenarioParser,
  looseParser,
];

export const parserRegistry = {
  list: (): TestCaseParser[] => [...allParsers],
  get: (id: string): TestCaseParser | undefined => allParsers.find((p) => p.id === id),
  detect: (text: string): TestCaseParser | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (/Title:\s*\S/im.test(trimmed) && (/Preconditions?:/im.test(trimmed) || /Expected\s*Result:/im.test(trimmed)))
      return standardParser;
    if (/Scenario:\s*\S/im.test(trimmed) && (/Action:/im.test(trimmed) || /Outcome:/im.test(trimmed)))
      return scenarioParser;
    const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
    const hasGwt = /^given\b/i.test(trimmed) || /^when\b/i.test(trimmed) || /^then\b/i.test(trimmed);
    const firstLineIsKeyword = /^(given|when|then)\b/i.test(firstLine);
    if (hasGwt && !firstLineIsKeyword) return bddParser;
    if (hasGwt) return givenWhenThenParser;
    return looseParser;
  },
};
