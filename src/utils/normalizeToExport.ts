/**
 * Maps NormalizedTestCase to the shape expected by the existing CSV export.
 * Keeps CSV columns and behavior unchanged.
 */

import type { NormalizedTestCase, ExportTestCase } from "@/types/testCase";
import { extractTestCaseIdFromTitle } from "./extractId";

/** Join array to string for display/export; identity for string. */
export function ensureString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? v.filter(Boolean).join("\n") : v;
}

/**
 * Build Step Action for CSV: given + when, or steps joined.
 */
function toStepAction(tc: NormalizedTestCase): string {
  const given = ensureString(tc.given);
  const when = ensureString(tc.when);
  if (given || when) return [given, when].filter(Boolean).join("\n");
  return ensureString(tc.steps);
}

/**
 * Build Step Expected for CSV: then or expectedResult.
 */
function toStepExpected(tc: NormalizedTestCase): string {
  const then = ensureString(tc.then);
  if (then) return then;
  return tc.expectedResult ?? "";
}

/**
 * Convert one normalized test case to export shape for buildAzureCsv.
 * When given/when are missing, steps are used as the step action (mapped to when).
 */
export function normalizeToExport(tc: NormalizedTestCase, index: number): ExportTestCase {
  const testCaseId = tc.id ?? extractTestCaseIdFromTitle(tc.title);
  const id = testCaseId ? `${testCaseId}-${index + 1}` : `TC-${index + 1}`;
  const given = ensureString(tc.given);
  const when = ensureString(tc.when) || ensureString(tc.steps);
  return {
    id,
    testCaseId: testCaseId ?? "",
    title: tc.title,
    given,
    when,
    then: toStepExpected(tc),
  };
}

