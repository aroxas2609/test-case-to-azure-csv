import { stringify } from "csv-stringify/sync";
import type { ExportTestCase, NormalizedTestCase } from "@/types/testCase";
import { ensureString } from "@/utils/normalizeToExport";

export type CsvSettings = {
  areaPath: string;
  assignedTo: string;
  state: string;
};

export const CSV_HEADERS = [
  "ID",
  "Work Item Type",
  "Title",
  "Test Step",
  "Step Action",
  "Step Expected",
  "Area Path",
  "Assigned To",
  "State",
] as const;

export type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;

/** Given/When/Then format: two rows per case (Test Case + one combined step). */
export function buildAzureCsvRows(cases: ExportTestCase[], settings: CsvSettings): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const tc of cases) {
    rows.push({
      ID: "",
      "Work Item Type": "Test Case",
      Title: tc.title,
      "Test Step": "",
      "Step Action": "",
      "Step Expected": "",
      "Area Path": settings.areaPath,
      "Assigned To": settings.assignedTo,
      State: settings.state || "Design",
    });

    const actionLines: string[] = [];
    if (tc.given) actionLines.push(tc.given);
    if (tc.when) actionLines.push(tc.when);

    rows.push({
      ID: "",
      "Work Item Type": "",
      Title: "",
      "Test Step": "1",
      "Step Action": actionLines.join("\n"),
      "Step Expected": tc.then,
      "Area Path": "",
      "Assigned To": "",
      State: "",
    });
  }

  return rows;
}

export function buildAzureCsv(cases: ExportTestCase[], settings: CsvSettings): string {
  return stringify(buildAzureCsvRows(cases, settings), {
    header: true,
    columns: CSV_HEADERS as unknown as string[],
    bom: true,
  });
}

/** Standard format: one Test Case row plus one row per step (Preconditions as step 1 when present, then Steps, Step Expected on last step). */
export function buildAzureCsvStandardRows(cases: NormalizedTestCase[], settings: CsvSettings): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const tc of cases) {
    rows.push({
      ID: "",
      "Work Item Type": "Test Case",
      Title: tc.title,
      "Test Step": "",
      "Step Action": "",
      "Step Expected": "",
      "Area Path": settings.areaPath,
      "Assigned To": settings.assignedTo,
      State: settings.state || "Design",
    });

    const preconditions = tc.preconditions ?? [];
    const steps = tc.steps ?? [];
    const expectedResult = tc.expectedResult ?? "";
    const expectedResults = tc.expectedResults ?? [];
    const preconditionsText = preconditions.length
      ? (preconditions.length === 1 ? "Preconditions: " + preconditions[0] : "Preconditions:\n" + preconditions.join("\n"))
      : "";

    const stepRows: { stepNum: number; action: string; expected: string }[] = [];
    let stepNum = 1;
    if (preconditionsText) {
      stepRows.push({ stepNum, action: preconditionsText, expected: "" });
      stepNum++;
    }
    if (steps.length === 0) {
      if (stepRows.length === 0) {
        stepRows.push({ stepNum: 1, action: "", expected: expectedResult });
      } else {
        stepRows.push({ stepNum, action: "", expected: expectedResult });
      }
    } else {
      steps.forEach((stepAction, i) => {
        const isLast = i === steps.length - 1;
        const expected =
          expectedResults.length > i
            ? expectedResults[i]
            : expectedResults.length > 0
              ? ""
              : isLast
                ? expectedResult
                : "";
        stepRows.push({
          stepNum,
          action: ensureString(stepAction),
          expected,
        });
        stepNum++;
      });
    }

    stepRows.forEach(({ stepNum: n, action, expected }) => {
      rows.push({
        ID: "",
        "Work Item Type": "",
        Title: "",
        "Test Step": String(n),
        "Step Action": action,
        "Step Expected": expected,
        "Area Path": "",
        "Assigned To": "",
        State: "",
      });
    });
  }

  return rows;
}

export function buildAzureCsvStandard(cases: NormalizedTestCase[], settings: CsvSettings): string {
  return stringify(buildAzureCsvStandardRows(cases, settings), {
    header: true,
    columns: CSV_HEADERS as unknown as string[],
    bom: true,
  });
}

