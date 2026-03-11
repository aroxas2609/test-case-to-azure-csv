/**
 * Extract test case ID prefix from title for CSV and display.
 * Used by parsers and by normalizeToExport.
 */

export function extractTestCaseIdFromTitle(title: string): string {
  const trimmed = title.trim();
  const tcMatch = trimmed.match(/^(TC\d+)\s*[-–—]\s*/i);
  if (tcMatch) return tcMatch[1];
  const prefixMatch = trimmed.match(/^([A-Za-z0-9]+-\d+)\s*:\s*/);
  if (prefixMatch) return prefixMatch[1];
  return "";
}
