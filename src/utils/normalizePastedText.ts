/**
 * Normalizes pasted text so it matches the format expected by the BDD or Standard parser.
 * Handles common variations: markdown bullets, wrong casing, extra spaces, "Title :", etc.
 */

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/** Strip leading markdown/bullet/number from a line, e.g. "- Given ..." or "1. Given ..." → "Given ..." */
function stripLeadingBulletOrNumber(line: string): string {
  return line.replace(/^[\s\-*•·]+\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

/** BDD: Ensure Given/When/Then/And are at line start with correct casing; strip leading bullets. */
export function normalizeBddText(text: string): string {
  const lines = normalizeLineEndings(text).split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }
    const stripped = stripLeadingBulletOrNumber(trimmed);
    const lower = stripped.toLowerCase();
    if (lower.startsWith("given ")) result.push("Given " + stripped.slice(6).trim());
    else if (lower.startsWith("when ")) result.push("When " + stripped.slice(5).trim());
    else if (lower.startsWith("then ")) result.push("Then " + stripped.slice(5).trim());
    else if (lower.startsWith("and ")) result.push("And " + stripped.slice(4).trim());
    else result.push(trimmed);
  }
  return result.join("\n");
}

/** Standard: Normalize labels (Title:, Preconditions:, Steps:, Expected Result:) and strip markdown from content. */
export function normalizeStandardText(text: string): string {
  let out = normalizeLineEndings(text);

  // Normalize label casing (allow "title :" or "Title" → "Title:")
  out = out.replace(/\bTitle\s*:\s*/gi, "Title: ");
  out = out.replace(/\bPreconditions?\s*:\s*/gi, "Preconditions: ");
  out = out.replace(/\bSteps?\s*:\s*/gi, "Steps: ");
  out = out.replace(/\bExpected\s+Result\s*:\s*/gi, "Expected Result: ");

  // Strip leading ## or ** from lines (markdown headings/bold)
  const lines = out.split("\n");
  const cleaned = lines.map((line) => {
    const t = line.trim();
    if (t.startsWith("##")) return t.replace(/^#+\s*/, "").trim();
    if (t.startsWith("**") && t.endsWith("**")) return t.slice(2, -2).trim();
    return t;
  });

  return cleaned.join("\n");
}

export function normalizePastedText(text: string, templateId: string): string {
  if (!text.trim()) return text;
  if (templateId === "standard") return normalizeStandardText(text);
  return normalizeBddText(text);
}
