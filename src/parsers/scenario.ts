import type { NormalizedTestCase, ParserResult } from "@/types/testCase";
import { extractTestCaseIdFromTitle } from "@/utils/extractId";

function parseBlock(block: string): { testCase: NormalizedTestCase; errors: string[] } {
  const errors: string[] = [];
  const raw = block.trim();

  const scenarioMatch = raw.match(/\bScenario:\s*([\s\S]*?)(?=\n\s*(?:Test\s*Data|Action|Outcome|$))/i);
  const title = scenarioMatch ? scenarioMatch[1].trim() : "";
  if (!title) errors.push("Missing Scenario");

  const testDataMatch = raw.match(/\bTest\s*Data:\s*([\s\S]*?)(?=\n\s*Action:|Outcome:|$)/i);
  const testData = testDataMatch ? testDataMatch[1].trim() : undefined;

  const actionMatch = raw.match(/\bAction:\s*([\s\S]*?)(?=\n\s*Outcome:|$)/i);
  const action = actionMatch ? actionMatch[1].trim() : undefined;
  if (!action) errors.push("Missing Action");

  const outcomeMatch = raw.match(/\bOutcome:\s*([\s\S]*)$/i);
  const outcome = outcomeMatch ? outcomeMatch[1].trim() : undefined;
  if (!outcome) errors.push("Missing Outcome");

  const testCase: NormalizedTestCase = {
    title: title || "Untitled",
    rawBlock: raw,
    preconditions: testData ? [testData] : undefined,
    steps: action ? [action] : undefined,
    expectedResult: outcome,
    when: action,
    then: outcome,
    errors: errors.length ? errors : undefined,
  };
  if (title) {
    const id = extractTestCaseIdFromTitle(title);
    if (id) testCase.id = id;
  }
  return { testCase, errors };
}

export function parse(text: string): ParserResult {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const cases: NormalizedTestCase[] = [];
  const blockErrors: ParserResult["blockErrors"] = [];

  for (const block of blocks) {
    const { testCase, errors } = parseBlock(block);
    cases.push(testCase);
    if (errors.length) {
      blockErrors.push({ blockText: block.slice(0, 200), message: errors.join("; ") });
    }
  }

  return { cases, blockErrors };
}

function detect(text: string): boolean {
  return /Scenario:\s*\S/im.test(text) && (/Action:/im.test(text) || /Outcome:/im.test(text));
}

export const scenarioParser: import("@/types/testCase").TestCaseParser = {
  id: "scenario",
  name: "Scenario (Scenario / Test Data / Action / Outcome)",
  description: "Scenario:, Test Data:, Action:, Outcome:",
  detect,
  parse,
};
