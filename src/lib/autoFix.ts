/**
 * Split BDD text into blocks the same way the parser does (blank lines separate blocks).
 * Returns array of { block, start, end } in document order.
 */
function splitBddBlocksWithRanges(rawText: string): { block: string; start: number; end: number }[] {
  const result: { block: string; start: number; end: number }[] = [];
  const lines = rawText.split(/\r?\n/);
  let blockStart = 0;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = line.trim().length === 0;
    const lineEnd = rawText.indexOf("\n", rawText.indexOf(line, blockStart));
    const lineEndIndex = lineEnd === -1 ? rawText.length : lineEnd + 1;

    if (isEmpty) {
      if (currentLines.length > 0) {
        const block = currentLines.join("\n").trim();
        if (block) result.push({ block, start: blockStart, end: i > 0 ? rawText.indexOf(line, blockStart) : rawText.length });
        currentLines = [];
      }
      blockStart = lineEndIndex;
    } else {
      if (currentLines.length === 0) blockStart = rawText.indexOf(line, blockStart) >= 0 ? rawText.indexOf(line, blockStart) : blockStart;
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    const block = currentLines.join("\n").trim();
    if (block) result.push({ block, start: blockStart, end: rawText.length });
  }
  return result;
}

const normalizeBlock = (s: string) => s.trim().replace(/\r\n/g, "\n");

/** Map from normalized index (treating \r\n as one char) to raw index. */
function normToRawIndex(rawText: string, normIndex: number): number {
  let raw = 0;
  let norm = 0;
  while (norm < normIndex && raw < rawText.length) {
    if (rawText[raw] === "\r" && rawText[raw + 1] === "\n") raw += 2;
    else raw += 1;
    norm += 1;
  }
  return raw;
}

/**
 * Split BDD text into blocks the same way the parser does: blank lines separate blocks.
 * Returns blocks with (start, end) as character positions in rawText.
 */
function splitBddBlocksWithRangesSimple(rawText: string): { block: string; start: number; end: number }[] {
  const result: { block: string; start: number; end: number }[] = [];
  const normalized = rawText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let posNorm = 0;
  let blockStartNorm = 0;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLenNorm = line.length + 1;
    const isEmpty = line.trim().length === 0;

    if (isEmpty) {
      if (currentLines.length > 0) {
        const block = currentLines.join("\n").trim();
        if (block) {
          const endNorm = blockStartNorm + block.length;
          result.push({
            block,
            start: normToRawIndex(rawText, blockStartNorm),
            end: normToRawIndex(rawText, endNorm),
          });
        }
        currentLines = [];
      }
      posNorm += lineLenNorm;
    } else {
      if (currentLines.length === 0) blockStartNorm = posNorm;
      currentLines.push(line);
      posNorm += lineLenNorm;
    }
  }
  if (currentLines.length > 0) {
    const block = currentLines.join("\n").trim();
    if (block) {
      const endNorm = blockStartNorm + block.length;
      result.push({
        block,
        start: normToRawIndex(rawText, blockStartNorm),
        end: normToRawIndex(rawText, endNorm),
      });
    }
  }
  return result;
}

/**
 * Find the range [start, end] of the block in rawText.
 * For BDD, errorIndex selects which failing block when multiple match (same content in different blocks).
 */
export function findBlockRange(
  rawText: string,
  blockText: string,
  parserId: string,
  errorIndex: number = 0
): { start: number; end: number } | null {
  const needle = normalizeBlock(blockText);
  if (!needle) return null;

  if (parserId === "bdd" || parserId === "givenWhenThen") {
    const blocksWithRanges = splitBddBlocksWithRangesSimple(rawText);
    const matching = blocksWithRanges.filter((b) => normalizeBlock(b.block) === needle);
    if (errorIndex >= matching.length) return null;
    const m = matching[errorIndex];
    return { start: m.start, end: m.end };
  }

  if (parserId === "standard") {
    const start = rawText.indexOf(needle);
    if (start === -1) return null;
    const nextTitle = rawText.indexOf("\nTitle:", start + 1);
    const end = nextTitle === -1 ? rawText.length : nextTitle;
    return { start, end };
  }
  return null;
}

/**
 * Suggests a fixed version of a block when validation fails.
 * Returns the fixed block text, or null if we can't suggest a fix.
 */
export function suggestBlockFix(
  parserId: string,
  blockText: string,
  message: string
): string | null {
  const block = blockText.trim();
  if (!block) return null;

  if (parserId === "bdd" || parserId === "givenWhenThen") {
    return fixBddBlock(block, message);
  }
  if (parserId === "standard") {
    return fixStandardBlock(block, message);
  }
  return null;
}

function fixBddBlock(block: string, message: string): string | null {
  if (!message.includes("Incomplete block") || !message.includes("missing")) return null;
  const missing: string[] = [];
  if (/missing\s+Given/i.test(message)) missing.push("Given");
  if (/missing\s+When/i.test(message)) missing.push("When");
  if (/missing\s+Then/i.test(message)) missing.push("Then");
  if (missing.length === 0) return null;

  const lines = block.split(/\r?\n/);
  const hasGiven = lines.some((l) => /^\s*given\b/i.test(l.trim()));
  const hasWhen = lines.some((l) => /^\s*when\b/i.test(l.trim()));
  const hasThen = lines.some((l) => /^\s*then\b/i.test(l.trim()));

  const toAppend: string[] = [];
  if (missing.includes("Given") && !hasGiven) toAppend.push("Given ");
  if (missing.includes("When") && !hasWhen) toAppend.push("When ");
  if (missing.includes("Then") && !hasThen) toAppend.push("Then ");
  if (toAppend.length === 0) return null;

  const base = block.trimEnd();
  return base + "\n" + toAppend.join("\n");
}

function fixStandardBlock(block: string, message: string): string | null {
  let out = block.trimEnd();
  let changed = false;

  if (/Missing\s+Title/i.test(message) && !/^\s*Title\s*:/im.test(out)) {
    out = "Title: \n" + out;
    changed = true;
  }
  if (/Missing\s+Expected\s*Result/i.test(message) && !/\bExpected\s*Result\s*:/im.test(out)) {
    out = out + "\nExpected Result: ";
    changed = true;
  }
  return changed ? out : null;
}
