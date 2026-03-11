/**
 * Shared types for multi-template test case parsing and CSV export.
 */

/** Normalized test case used internally; all parsers produce this shape. */
export type NormalizedTestCase = {
  id?: string;
  title: string;
  preconditions?: string[];
  steps?: string[];
  expectedResult?: string;
  /** When Expected Result is a numbered list (1. ... 2. ...), one per step; otherwise only expectedResult on last step. */
  expectedResults?: string[];
  given?: string | string[];
  when?: string | string[];
  then?: string | string[];
  priority?: string;
  tags?: string[];
  rawBlock?: string;
  errors?: string[];
};

/** Shape consumed by the existing Azure DevOps CSV export (unchanged behavior). */
export type ExportTestCase = {
  id: string;
  testCaseId: string;
  title: string;
  given: string;
  when: string;
  then: string;
};

/** Block-level parse error (e.g. incomplete block). */
export type ParseBlockError = {
  blockText: string;
  message: string;
};

/** Result of a single parser run. */
export type ParserResult = {
  cases: NormalizedTestCase[];
  blockErrors: ParseBlockError[];
};

/** Parser interface for the registry. */
export type TestCaseParser = {
  id: string;
  name: string;
  description: string;
  detect: (text: string) => boolean;
  parse: (text: string) => ParserResult;
};
