import type { NormalizedTestCase, ParserResult } from "@/types/testCase";
import { extractTestCaseIdFromTitle } from "@/utils/extractId";

function parseBlock(block: string): { testCase: NormalizedTestCase; errors: string[] } {
  const errors: string[] = [];
  const raw = block.trim();
  const titleMatch = raw.match(/\bTitle:\s*([\s\S]*?)(?=\n\s*(?:Preconditions|Steps|Expected|$))/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  if (!title) errors.push("Missing Title");

  const precondMatch = raw.match(/\bPreconditions?:\s*([\s\S]*?)(?=\n\s*Steps?:|Expected\s*Result:|$)/i);
  const preconditionsText = precondMatch ? precondMatch[1].trim() : "";
  const preconditions = preconditionsText
    ? preconditionsText.split(/\n/).map((l) => l.replace(/^[\s\-*\d.)]+\s*/, "").trim()).filter(Boolean)
    : undefined;

  const stepsMatch = raw.match(/\bSteps?:\s*([\s\S]*?)(?=\n\s*Expected\s*Result:|$)/i);
  const stepsText = stepsMatch ? stepsMatch[1].trim() : "";
  const steps = stepsText
    ? stepsText.split(/\n/).map((l) => l.replace(/^[\s\-*\d.)]+\s*/, "").trim()).filter(Boolean)
    : undefined;

  const expectedMatch = raw.match(/\bExpected\s*Result:\s*([\s\S]*)$/i);
  const expectedResult = expectedMatch ? expectedMatch[1].trim() : undefined;
  if (!expectedResult) errors.push("Missing Expected Result");

  let expectedResults: string[] | undefined;
  if (expectedResult) {
    const lines = expectedResult.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const hasNumberedLines = lines.some((l) => /^\d+[.)]\s*/.test(l));
    if (hasNumberedLines && lines.length > 0) {
      expectedResults = lines.map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
      if (expectedResults.length === 0) expectedResults = undefined;
    }
  }

  const testCase: NormalizedTestCase = {
    title: title || "Untitled",
    rawBlock: raw,
    preconditions,
    steps,
    expectedResult,
    expectedResults,
    errors: errors.length ? errors : undefined,
  };
  if (title) {
    const id = extractTestCaseIdFromTitle(title);
    if (id) testCase.id = id;
  }
  return { testCase, errors };
}

/**
 * Split text into one block per test case. Standard format uses "Title:" to start each case;
 * we split only on newline followed by "Title:" so one case (with Preconditions, Steps,
 * Expected Result and any internal blank lines) stays in a single block.
 */
function splitIntoBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const blocks = trimmed.split(/\n(?=\s*Title:\s)/i).map((b) => b.trim()).filter(Boolean);
  return blocks;
}

export function parse(text: string): ParserResult {
  const blocks = splitIntoBlocks(text);
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
  return /Title:\s*\S/im.test(text) && (/Preconditions?:/im.test(text) || /Steps?:/im.test(text) || /Expected\s*Result:/im.test(text));
}

export const standardParser: import("@/types/testCase").TestCaseParser = {
  id: "standard",
  name: "Standard (Title / Preconditions / Steps / Expected Result)",
  description: "Title:, Preconditions:, Steps: (1. … 2. …), Expected Result:",
  detect,
  parse,
};
