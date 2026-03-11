import type { NormalizedTestCase, ParserResult } from "@/types/testCase";
import { extractTestCaseIdFromTitle } from "@/utils/extractId";

const isLineEmpty = (line: string) => line.trim().length === 0;

function parseBlock(block: string, index: number): { testCase?: NormalizedTestCase; error?: string } {
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {};
  }

  const title = lines[0];
  const testCaseId = extractTestCaseIdFromTitle(title);
  const startIndex = 1;

  let given = "";
  let when = "";
  let then = "";
  let lastSection: "given" | "when" | "then" | null = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (/^given\b/i.test(line)) {
      given = given ? `${given}\n${line}` : line;
      lastSection = "given";
      continue;
    }
    if (/^when\b/i.test(line)) {
      when = when ? `${when}\n${line}` : line;
      lastSection = "when";
      continue;
    }
    if (/^then\b/i.test(line)) {
      then = then ? `${then}\n${line}` : line;
      lastSection = "then";
      continue;
    }
    if (/^and\b/i.test(line) && lastSection) {
      if (lastSection === "given") given = `${given}\n${line}`;
      else if (lastSection === "when") when = `${when}\n${line}`;
      else if (lastSection === "then") then = `${then}\n${line}`;
    }
  }

  const missing: string[] = [];
  if (!given) missing.push("Given");
  if (!when) missing.push("When");
  if (!then) missing.push("Then");

  if (missing.length > 0) {
    return { error: `Incomplete block: missing ${missing.join(", ")} line(s).` };
  }

  return {
    testCase: {
      id: testCaseId || undefined,
      title,
      rawBlock: block,
      given,
      when,
      then,
    },
  };
}

function parse(text: string): ParserResult {
  const lines = text.split(/\r?\n/);
  const cases: NormalizedTestCase[] = [];
  const blockErrors: ParserResult["blockErrors"] = [];
  let currentLines: string[] = [];

  const flushBlock = () => {
    const rawBlock = currentLines.join("\n").trim();
    if (!rawBlock) {
      currentLines = [];
      return;
    }
    const { testCase, error } = parseBlock(rawBlock, cases.length + 1);
    if (testCase) cases.push(testCase);
    else if (error) blockErrors.push({ blockText: rawBlock, message: error });
    currentLines = [];
  };

  for (const line of lines) {
    if (isLineEmpty(line)) {
      flushBlock();
    } else {
      currentLines.push(line);
    }
  }
  flushBlock();

  return { cases, blockErrors };
}

function detect(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^given\b/im.test(t) || /^when\b/im.test(t) || /^then\b/im.test(t);
}

export const givenWhenThenParser: import("@/types/testCase").TestCaseParser = {
  id: "givenWhenThen",
  name: "Given/When/Then (current)",
  description: "Title on first line, then Given / When / Then (and And) lines. Blank line between cases.",
  detect,
  parse,
};
