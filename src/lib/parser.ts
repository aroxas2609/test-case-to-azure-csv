/**
 * Legacy parser API: same shape and behavior as before.
 * Uses the Given/When/Then parser under the hood; maps to legacy ParsedTestCase for CSV/UI compat.
 */

import { givenWhenThenParser } from "@/parsers/givenWhenThen";
import { normalizeToExport } from "@/utils/normalizeToExport";
import { extractTestCaseIdFromTitle as extractId } from "@/utils/extractId";

export type ParsedTestCase = {
  id: string;
  testCaseId: string;
  title: string;
  given: string;
  when: string;
  then: string;
};

export type ParseError = {
  blockText: string;
  message: string;
};

export type ParseResult = {
  cases: ParsedTestCase[];
  errors: ParseError[];
};

export function extractTestCaseIdFromTitle(title: string): string {
  return extractId(title);
}

export function parseTestCaseText(input: string): ParseResult {
  const result = givenWhenThenParser.parse(input);
  const cases: ParsedTestCase[] = result.cases.map((tc, i) => normalizeToExport(tc, i));
  return {
    cases,
    errors: result.blockErrors,
  };
}
