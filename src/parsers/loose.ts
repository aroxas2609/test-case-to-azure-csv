import type { NormalizedTestCase, ParserResult } from "@/types/testCase";
import { extractTestCaseIdFromTitle } from "@/utils/extractId";

const isLineEmpty = (line: string) => line.trim().length === 0;

const LABELS = /^(given|when|then|and|steps?|expected|actual|preconditions?|title)\s*:?\s*/i;

function parseBlock(block: string): NormalizedTestCase {
  const raw = block.trim();
  const lines = raw.split(/\r?\n/);
  let title = "";
  const given: string[] = [];
  const when: string[] = [];
  const then: string[] = [];
  const steps: string[] = [];
  let expected = "";
  const errors: string[] = [];
  let section: "given" | "when" | "then" | "and" | "steps" | "expected" | "preconditions" | "title" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const labelMatch = trimmed.match(LABELS);
    if (labelMatch) {
      const label = labelMatch[1].toLowerCase();
      const rest = trimmed.slice(labelMatch[0].length).trim();
      if (label === "title") {
        title = rest || title;
        section = "title";
        continue;
      }
      if (label === "given") {
        section = "given";
        if (rest) given.push(rest);
        continue;
      }
      if (label === "when") {
        section = "when";
        if (rest) when.push(rest);
        continue;
      }
      if (label === "then") {
        section = "then";
        if (rest) then.push(rest);
        continue;
      }
      if (label === "and") {
        if (rest) {
          if (section === "given") given.push(rest);
          else if (section === "when") when.push(rest);
          else if (section === "then") then.push(rest);
        }
        continue;
      }
      if (label === "steps" || label === "step") {
        section = "steps";
        if (rest) steps.push(rest);
        continue;
      }
      if (label === "expected") {
        section = "expected";
        expected = rest;
        continue;
      }
      if (label === "preconditions" || label === "precondition") {
        section = "preconditions";
        continue;
      }
      section = null;
      continue;
    }

    if (section === "expected" && expected) expected += "\n" + trimmed;
    else if (section === "given") given.push(trimmed);
    else if (section === "when") when.push(trimmed);
    else if (section === "then") then.push(trimmed);
    else if (section === "steps") steps.push(trimmed);
    else if (!title && !/^(given|when|then|and)\b/i.test(trimmed)) title = trimmed;
  }

  if (!title) {
    title = "Untitled";
    errors.push("No title found");
  }

  const testCase: NormalizedTestCase = {
    title,
    rawBlock: raw,
    given: given.length ? given : undefined,
    when: when.length ? when : undefined,
    then: then.length ? then.join("\n") : expected || undefined,
    expectedResult: expected || undefined,
    steps: steps.length ? steps : undefined,
    errors: errors.length ? errors : undefined,
  };
  const id = extractTestCaseIdFromTitle(title);
  if (id) testCase.id = id;
  return testCase;
}

export function parse(text: string): ParserResult {
  const lines = text.split(/\r?\n/);
  const cases: NormalizedTestCase[] = [];
  const blockErrors: ParserResult["blockErrors"] = [];
  let current: string[] = [];

  const flush = () => {
    const block = current.join("\n").trim();
    if (!block) {
      current = [];
      return;
    }
    try {
      cases.push(parseBlock(block));
    } catch {
      blockErrors.push({ blockText: block.slice(0, 200), message: "Parse failed" });
    }
    current = [];
  };

  for (const line of lines) {
    if (isLineEmpty(line)) {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();

  return { cases, blockErrors };
}

function detect(_text: string): boolean {
  return true;
}

export const looseParser: import("@/types/testCase").TestCaseParser = {
  id: "loose",
  name: "Loose (AI / flexible labels)",
  description: "Flexible labels: Given, When, Then, And, Steps, Expected, etc. Best-effort.",
  detect,
  parse,
};
