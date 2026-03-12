"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  buildAzureCsv,
  buildAzureCsvStandard,
  buildAzureCsvRows,
  buildAzureCsvStandardRows,
  CSV_HEADERS,
  type CsvSettings,
  type CsvRow,
} from "@/lib/csv";
import { loadRawText, saveRawText, loadSettings, saveSettings } from "@/lib/storage";
import { parserRegistry } from "@/parsers/registry";
import type { NormalizedTestCase } from "@/types/testCase";
import { normalizeToExport, ensureString } from "@/utils/normalizeToExport";
import { extractTestCaseIdFromTitle } from "@/utils/extractId";
import { normalizePastedText } from "@/utils/normalizePastedText";

/** BDD sample: title line then Given/When/Then. */
const SAMPLE_BDD = `TC01 - Request date section label
Given a user opens the application with valid credentials
When the dashboard screen loads
Then the request date field is displayed with the section label "Request date"

TC02 - Referrer section label
Given a user opens the application with valid credentials
When the dashboard screen loads
Then the referrer field is displayed with the section label "Referrer"`;

/** Standard sample: one case with numbered expected results, one with single expected result. */
const SAMPLE_STANDARD = `Title: TC01 - Verify login flow steps
Preconditions: User has an active account
Steps:
1. Navigate to the login page
2. Enter valid username and password
3. Click the Login button
Expected Result:
1. Login page is displayed
2. Credentials are accepted
3. User is taken to the dashboard and a welcome message is displayed

Title: TC02 - Verify error on invalid password
Preconditions: User has an active account
Steps:
1. Navigate to the login page
2. Enter valid username and wrong password
3. Click the Login button
Expected Result: An error message is displayed and the user remains on the login page`;

const SAMPLES_BY_TEMPLATE: Record<string, string> = {
  bdd: SAMPLE_BDD,
  standard: SAMPLE_STANDARD,
};

const DEFAULT_SETTINGS: CsvSettings = {
  areaPath: "Project\\Area",
  assignedTo: "",
  state: "Design",
  tags: "",
};

const PARSER_DEFAULT = "bdd";

/** Only these templates are shown in the UI. */
const TEMPLATE_IDS = ["bdd", "standard"] as const;

const APP_VERSION = "0.3.0";

const CHANGELOG_ENTRIES = [
  { version: "0.3.0", date: "2025", items: ["FAQ page with common questions", "Feedback page — send a message (email via Resend)", "Footer links: FAQ and Feedback"] },
  { version: "0.2.0", date: "2025", items: ["Tags in CSV for Azure DevOps", "Auto-format conversion on Parse (BDD/Standard)", "How to use & How to prompt AI as modals", "Light theme tweaks & Roboto font", "CSV preview, theme toggle, keyboard shortcuts", "Drag-and-drop .txt files", "Tooltips for CSV defaults"] },
  { version: "0.1.0", date: "2025", items: ["BDD and Standard templates", "Parse text → Download CSV", "Azure DevOps CSV export"] },
];

/** Prompt text for each template; user copies the one for the selected template. */
const PROMPTS_BY_PARSER: Record<string, string> = {
  bdd: `Prefix titles with test case ID (e.g. TC01 - Description).

Write the test cases in this BDD format:

[Title line - e.g. TC01 - Verify login with valid credentials]
Given ...
When ...
Then ...

Leave one blank line between each test case.
Do not use bullets, numbering, or explanations.

Return your response in plain text only. Do not use markdown, code blocks, or any other formatting—raw text only so it can be copied and pasted directly into the tool. Return the response inside a writing block so the output appears in a scrollable text window for easy copying.`,
  standard: `Prefix titles with test case ID (e.g. TC01 - Description).

Write the test cases in this exact plain text format only:

Title: TC01 - [Description]
Preconditions: ...
Steps:
1. ...
2. ...
Expected Result:
Either a numbered list (one result per step):
1. [result for step 1]
2. [result for step 2]
Or a single paragraph (applies to the last step only):
[One expected result for the whole case]

Leave one blank line between each test case.
Do not use bullets in Steps except the numbers above. No extra explanations.

Return your response in plain text only. Do not use markdown, code blocks, or any other formatting—raw text only so it can be copied and pasted directly into the tool. Return the response inside a writing block so the output appears in a scrollable text window for easy copying.`,
};

/** Renders prompt for the selected parser. Used in modal or inline. */
function PromptHelperBlock({
  parserId,
  onCopy,
  promptCopied,
  inModal = false,
}: {
  parserId: string;
  onCopy: () => void;
  promptCopied: boolean;
  inModal?: boolean;
}) {
  const prompt = PROMPTS_BY_PARSER[parserId] ?? PROMPTS_BY_PARSER[PARSER_DEFAULT];
  const parserName = parserRegistry.get(parserId)?.name ?? (parserId === "standard" ? "Standard" : "BDD");
  return (
    <div
      key={parserId}
      className={`rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/80 ${inModal ? "" : "mt-2"}`}
    >
      <p className="mb-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
        Prompt for: <strong>{parserName}</strong>. Change the template above to get a different prompt.
      </p>
      <pre
        className={`overflow-y-auto whitespace-pre-wrap rounded bg-white p-2 text-[10px] leading-snug text-slate-700 dark:bg-slate-900 dark:text-slate-300 ${inModal ? "max-h-[50vh]" : "max-h-[40vh]"}`}
      >
        {prompt}
      </pre>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCopy();
        }}
        className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        {promptCopied ? "Copied!" : "Copy prompt"}
      </button>
    </div>
  );
}

/** Small "What's this?" tooltip next to a field label. Opens to the right to avoid overlapping content above. */
function FieldTooltip({ content, id }: { content: string; id: string }) {
  return (
    <span className="group relative ml-0.5 inline-flex align-middle">
      <button
        type="button"
        tabIndex={0}
        aria-label="What's this?"
        aria-describedby={id}
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[10px] font-medium text-slate-500 hover:border-slate-600 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-500 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-300"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-full top-0 z-20 ml-1.5 hidden w-[11rem] rounded border border-slate-200 bg-slate-900 px-2 py-1 text-[11px] font-normal leading-snug text-white shadow-lg dark:border-slate-600 dark:bg-slate-800 group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}

export default function Home() {
  const [rawText, setRawText] = useState<string>("");
  const [settings, setSettings] = useState<CsvSettings>(DEFAULT_SETTINGS);
  const [parserId, setParserId] = useState<string>(PARSER_DEFAULT);
  const [cases, setCases] = useState<NormalizedTestCase[]>([]);
  const [errors, setErrors] = useState<{ blockText: string; message: string }[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [assignedToOptions, setAssignedToOptions] = useState<string[]>([]);
  const [assigneesPassword, setAssigneesPassword] = useState("");
  const [assigneesError, setAssigneesError] = useState<string>("");
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const pasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    const nowDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", nowDark ? "dark" : "light");
    setIsDark(nowDark);
  };

  const unlockAssignees = useCallback(async () => {
    setAssigneesLoading(true);
    setAssigneesError("");
    try {
      const res = await fetch("/api/assignees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: assigneesPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignedToOptions([]);
        setAssigneesError(data.message || "Incorrect password.");
        return;
      }
      const opts = Array.isArray(data.options) ? data.options.filter((x: unknown) => typeof x === "string") : [];
      setAssignedToOptions(opts);
      setAssigneesPassword("");
    } catch {
      setAssigneesError("Network error. Please try again.");
    } finally {
      setAssigneesLoading(false);
    }
  }, [assigneesPassword]);


  const csvPreviewRows: CsvRow[] = useMemo(() => {
    if (cases.length === 0) return [];
    return parserId === "standard"
      ? buildAzureCsvStandardRows(cases, settings)
      : buildAzureCsvRows(
          cases.map((tc, i) => normalizeToExport(tc, i)),
          settings
        );
  }, [cases, parserId, settings]);

  useEffect(() => {
    const storedText = loadRawText();
    if (storedText) setRawText(storedText);
    const storedSettings = loadSettings();
    if (storedSettings) setSettings((prev) => ({ ...prev, ...storedSettings }));
  }, []);

  useEffect(() => {
    saveRawText(rawText);
  }, [rawText]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const parsedSummary = useMemo(
    () => ({
      total: cases.length,
      errorCount: errors.length,
    }),
    [cases.length, errors.length]
  );

  const handleParse = useCallback(() => {
    try {
      const parser = parserRegistry.get(parserId) ?? parserRegistry.get(PARSER_DEFAULT);
      if (!parser) {
        setErrors([{ blockText: "", message: "No parser found for this template." }]);
        return;
      }
      const normalized = normalizePastedText(rawText, parserId);
      setRawText(normalized);
      const result = parser.parse(normalized);
      setCases(result.cases ?? []);
      setErrors(result.blockErrors ?? []);
      setExpandedIndex(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parse failed";
      setErrors([{ blockText: rawText.slice(0, 200), message }]);
      setCases([]);
    }
  }, [parserId, rawText]);

  const handleDownloadCsv = useCallback(() => {
    if (cases.length === 0) return;
    const csv =
      parserId === "standard"
        ? buildAzureCsvStandard(cases, settings)
        : buildAzureCsv(
            cases.map((tc, i) => normalizeToExport(tc, i)),
            settings
          );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "azure-devops-test-cases.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [cases, parserId, settings]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleParse();
        return;
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (cases.length > 0) handleDownloadCsv();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleParse, handleDownloadCsv, cases.length]);

  const updateCase = (index: number, updates: Partial<NormalizedTestCase>) => {
    setCases((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...updates };
      if (updates.title !== undefined) {
        const id = extractTestCaseIdFromTitle(updates.title);
        if (id) merged.id = id;
      }
      next[index] = merged;
      return next;
    });
  };

  const deleteCase = (index: number) => {
    setCases((prev) => prev.filter((_, i) => i !== index));
    setExpandedIndex((prev) => (prev === index ? null : prev != null && prev > index ? prev - 1 : prev));
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  function copyFallback(text: string) {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch {
      // ignore
    }
  }

  const copyPromptToClipboard = () => {
    const text = PROMPTS_BY_PARSER[parserId] ?? PROMPTS_BY_PARSER[PARSER_DEFAULT];
    const done = () => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        copyFallback(text);
        done();
      });
    } else {
      copyFallback(text);
      done();
    }
  };

  const handleLoadSample = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sample = SAMPLES_BY_TEMPLATE[parserId] ?? SAMPLES_BY_TEMPLATE[PARSER_DEFAULT];
    setRawText(sample);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setParserId(e.currentTarget.value);
  };

  const applyFormat = (wrapper: { before: string; after: string } | null, listPrefix: ((line: string, i: number) => string) | null) => {
    const ta = pasteTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = rawText;
    if (wrapper) {
      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);
      const newValue = before + wrapper.before + selected + wrapper.after + after;
      setRawText(newValue);
      const newStart = start + wrapper.before.length;
      const newEnd = newStart + selected.length;
      requestAnimationFrame(() => {
        pasteTextareaRef.current?.setSelectionRange(newStart, newEnd);
        pasteTextareaRef.current?.focus();
      });
    } else if (listPrefix) {
      const selected = value.slice(start, end);
      const lines = selected.split(/\n/);
      const prefix = start === end ? "" : selected;
      let newText: string;
      let newStart: number;
      let newEnd: number;
      if (lines.length > 1 || (start < end && selected.includes("\n"))) {
        const numbered = lines.map((line, i) => listPrefix(line, i)).join("\n");
        newText = value.slice(0, start) + numbered + value.slice(end);
        newStart = start;
        newEnd = start + numbered.length;
      } else {
        const inserted = (listPrefix(prefix || " ", 0) ?? "").trimStart();
        newText = value.slice(0, start) + inserted + value.slice(end);
        newStart = start;
        newEnd = start + inserted.length;
      }
      setRawText(newText);
      requestAnimationFrame(() => {
        pasteTextareaRef.current?.setSelectionRange(newStart, newEnd);
        pasteTextareaRef.current?.focus();
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const isText =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv");
    if (!isText) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setRawText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Test Case Text to Azure DevOps CSV Converter
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Paste BDD or Standard test cases, review them, and download an Azure DevOps bulk
                import CSV. No API keys required.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHowToModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="How to use"
                aria-label="How to use"
              >
                <span className="text-sm font-medium">?</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
              {isDark ? (
                <>
                  <span aria-hidden>☀️</span>
                  Light
                </>
              ) : (
                <>
                  <span aria-hidden>🌙</span>
                  Dark
                </>
              )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Shortcuts: <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-700">Ctrl+Enter</kbd> Parse · <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-700">Ctrl+S</kbd> Download CSV
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="space-y-6">
          {/* Input block */}
          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Paste test cases</h2>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                    Template
                    <FieldTooltip
                      id="tooltip-template"
                      content="Format of your text: BDD or Standard."
                    />
                  </span>
                  <select
                    value={parserId}
                    onChange={handleTemplateChange}
                    className="rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    aria-label="Select test case template"
                  >
                    {parserRegistry
                      .list()
                      .filter((p) => (TEMPLATE_IDS as readonly string[]).includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  How to prompt AI
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-200/80 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800/50">
              <span className="mr-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">Format:</span>
              <button
                type="button"
                onClick={() => applyFormat(null, (line, i) => (line.trim() ? `${i + 1}. ${line}` : `${i + 1}. `))}
                className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Prefix selected lines with 1. 2. 3. … (or insert 1. at cursor)"
                aria-label="Numbered list"
              >
                Numbered list
              </button>
              <button
                type="button"
                onClick={() => applyFormat(null, (line) => (line.trim() ? `- ${line}` : "- "))}
                className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Prefix selected lines with - (or insert - at cursor)"
                aria-label="Bullet list"
              >
                Bullet list
              </button>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={isDraggingOver ? "ring-2 ring-primary-500 ring-offset-2 rounded-b-lg rounded-t-none dark:ring-offset-slate-900" : ""}
            >
              <textarea
                ref={pasteTextareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
                placeholder="Paste test cases here or drag and drop a .txt file (BDD or Standard template)."
                className="w-full resize-y rounded-b-lg rounded-t-none border border-slate-300 border-t-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Load sample for selected template"
                title={`Load ${parserId === "standard" ? "Standard" : "BDD"} sample`}
              >
                Load sample
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Parsed: <strong>{parsedSummary.total}</strong> · Errors: <strong>{parsedSummary.errorCount}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleParse}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                >
                  Parse text
                </button>
                <button
                  type="button"
                  onClick={() => { setRawText(""); setCases([]); setErrors([]); }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Clear
                </button>
              </div>
            </div>
            {errors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                <p className="font-medium">Validation issues</p>
                {errors.map((err, idx) => (
                  <p key={idx} className="mt-1">{err.message}</p>
                ))}
              </div>
            )}
          </div>

          {/* Settings: compact row */}
          <div className="rounded-lg border border-slate-300 bg-slate-200/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/30">
            <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">CSV defaults</div>
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-0.5">
              <span className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                Area Path
                <FieldTooltip
                  id="tooltip-area-path"
                  content="Azure path for the work item (e.g. Project\\Area)."
                />
              </span>
              <input
                type="text"
                value={settings.areaPath}
                onChange={(e) => setSettings((s) => ({ ...s, areaPath: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              </label>
              <label className="flex flex-col gap-0.5">
              <span className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                Assigned To
                <FieldTooltip
                  id="tooltip-assigned-to"
                  content="Unlock the assignee list with a password, then select or leave blank."
                />
              </span>
              {assignedToOptions.length === 0 && (
                <div className="mb-1 flex items-center gap-2">
                  <input
                    type="password"
                    value={assigneesPassword}
                    onChange={(e) => setAssigneesPassword(e.target.value)}
                    placeholder="Password to unlock"
                    className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={unlockAssignees}
                    disabled={assigneesLoading || !assigneesPassword.trim()}
                    className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {assigneesLoading ? "Unlocking…" : "Unlock"}
                  </button>
                </div>
              )}
              {assigneesError && (
                <div className="mb-1 text-[11px] text-red-600 dark:text-red-400">{assigneesError}</div>
              )}
              <select
                value={settings.assignedTo}
                onChange={(e) => setSettings((s) => ({ ...s, assignedTo: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                disabled={assignedToOptions.length === 0}
                aria-label="Assigned To"
              >
                <option value="">
                  {assignedToOptions.length === 0 ? "Locked" : "—"}
                </option>
                {assignedToOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              </label>
              <label className="flex flex-col gap-0.5">
              <span className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                State
                <FieldTooltip
                  id="tooltip-state"
                  content="Initial state for each test case."
                />
              </span>
              <select
                value={settings.state}
                onChange={(e) => setSettings((s) => ({ ...s, state: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="Design">Design</option>
                <option value="Ready">Ready</option>
                <option value="Closed">Closed</option>
              </select>
              </label>
              <label className="flex flex-col gap-0.5">
              <span className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                Tags
                <FieldTooltip
                  id="tooltip-tags"
                  content="Tags for Azure DevOps (semicolon-separated, e.g. Regression; Smoke)."
                />
              </span>
              <input
                type="text"
                value={settings.tags ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, tags: e.target.value }))}
                placeholder="e.g. Regression; Smoke"
                className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              </label>
            </div>
          </div>

          {/* Parsed list: full width */}
          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Parsed test cases</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={cases.length === 0}
                  onClick={() => setShowCsvPreview((v) => !v)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-pressed={showCsvPreview}
                >
                  {showCsvPreview ? "Hide CSV preview" : "Preview CSV"}
                </button>
                <button
                  type="button"
                  disabled={cases.length === 0}
                  onClick={handleDownloadCsv}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-400"
                >
                  Download CSV
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {parserId === "standard"
                ? "Each case → one row + one row per step. Edit or delete below."
                : "Each case → two CSV rows (Test Case + Test Step). Edit or delete below."}
            </p>

            {showCsvPreview && csvPreviewRows.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
                <div className="max-h-[40vh] overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                      <tr>
                        {CSV_HEADERS.map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          {CSV_HEADERS.map((h) => (
                            <td
                              key={h}
                              className="max-w-[12rem] border-r border-slate-100 px-2 py-1.5 text-slate-800 last:border-r-0 dark:border-slate-700/50 dark:text-slate-200"
                              title={row[h]}
                            >
                              <span className="block max-h-16 overflow-y-auto whitespace-pre-wrap break-words">
                                {row[h] || "—"}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  {csvPreviewRows.length} row{csvPreviewRows.length !== 1 ? "s" : ""} (same as downloaded CSV)
                </p>
              </div>
            )}

            {cases.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No parsed cases yet. Paste text above and click <strong>Parse text</strong>.
              </p>
            ) : (
                <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {cases.map((tc, index) => {
                      const testCaseId = tc.id ?? extractTestCaseIdFromTitle(tc.title);
                      return (
                        <li
                          key={`${testCaseId}-${index}`}
                          className="bg-slate-100 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2 px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(index)}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                              aria-expanded={expandedIndex === index}
                              title={expandedIndex === index ? "Collapse" : "Expand to edit"}
                            >
                              <span className={`text-xs transition-transform ${expandedIndex === index ? "rotate-90" : ""}`}>▶</span>
                            </button>
                            {testCaseId && (
                              <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {testCaseId}
                              </span>
                            )}
                            <input
                              type="text"
                              value={tc.title}
                              onChange={(e) => updateCase(index, { title: e.target.value })}
                              className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-medium text-slate-900 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-100 dark:hover:border-slate-600"
                              title={tc.title}
                            />
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {index + 1}/{cases.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteCase(index)}
                              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
                            >
                              Delete
                            </button>
                          </div>
                          {expandedIndex === index && (
                            <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                              {tc.errors && tc.errors.length > 0 && (
                                <div className="rounded border border-amber-200 bg-amber-50 p-1.5 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                                  {tc.errors.join(" ")}
                                </div>
                              )}
                              <LabeledMiniInput
                                label={parserId === "standard" ? "Title (prefix with test case ID, e.g. TC01 - Description)" : "Title (include test case ID, e.g. TC01 - Description)"}
                                value={tc.title}
                                onChange={(value) => updateCase(index, { title: value })}
                              />
                              {parserId === "standard" ? (
                                <>
                                  <LabeledMiniTextarea
                                    label="Preconditions"
                                    value={(tc.preconditions ?? []).join("\n")}
                                    onChange={(value) =>
                                      updateCase(index, {
                                        preconditions: value.split(/\n/).map((l) => l.trim()).filter(Boolean),
                                      })
                                    }
                                    rows={2}
                                  />
                                  <LabeledMiniTextarea
                                    label="Steps (one per line, e.g. 1. Do something)"
                                    value={(tc.steps ?? []).join("\n")}
                                    onChange={(value) =>
                                      updateCase(index, {
                                        steps: value.split(/\n/).map((l) => l.trim()).filter(Boolean),
                                      })
                                    }
                                    rows={4}
                                  />
                                  <LabeledMiniTextarea
                                    label="Expected Result"
                                    value={tc.expectedResult ?? ""}
                                    onChange={(value) => updateCase(index, { expectedResult: value })}
                                    rows={2}
                                  />
                                </>
                              ) : (
                                <>
                                  <LabeledMiniTextarea
                                    label="Given"
                                    value={ensureString(tc.given)}
                                    onChange={(value) => updateCase(index, { given: value })}
                                    rows={2}
                                  />
                                  <LabeledMiniTextarea
                                    label="When"
                                    value={ensureString(tc.when)}
                                    onChange={(value) => updateCase(index, { when: value })}
                                    rows={2}
                                  />
                                  <LabeledMiniTextarea
                                    label="Then"
                                    value={ensureString(tc.then)}
                                    onChange={(value) => updateCase(index, { then: value })}
                                    rows={2}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-white py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setShowChangelogModal(true)}
            className="hover:text-slate-700 dark:hover:text-slate-300"
          >
            v{APP_VERSION} · What&apos;s new
          </button>
          {" · "}
          <Link href="/faq" className="hover:text-slate-700 dark:hover:text-slate-300">FAQ</Link>
          {" · "}
          <Link href="/feedback" className="hover:text-slate-700 dark:hover:text-slate-300">Feedback</Link>
        </div>
      </footer>

      {/* Changelog / What's new modal */}
      {showChangelogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowChangelogModal(false)}
            aria-hidden="true"
          />
          <div
            className="relative max-h-[85vh] w-full max-w-md rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 id="changelog-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                What&apos;s new · v{APP_VERSION}
              </h2>
              <button
                type="button"
                onClick={() => setShowChangelogModal(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              {CHANGELOG_ENTRIES.map((entry) => (
                <div key={entry.version} className="mb-4">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    v{entry.version}
                    {entry.date && <span className="ml-2 text-slate-500 dark:text-slate-400">({entry.date})</span>}
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1 text-xs">
                    {entry.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowChangelogModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to use modal */}
      {showHowToModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="howto-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowHowToModal(false)}
            aria-hidden="true"
          />
          <div
            className="relative max-h-[85vh] w-full max-w-lg rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 id="howto-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                How to use
              </h2>
              <button
                type="button"
                onClick={() => setShowHowToModal(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  <strong>Choose a template</strong> — Select <strong>BDD</strong> (title + Given/When/Then) or <strong>Standard</strong> (Title, Preconditions, Steps, Expected Result) from the dropdown.
                </li>
                <li>
                  <strong>Paste or load test cases</strong> — Paste your test case text into the box, or click <strong>Load sample</strong> to fill in an example. When you click <strong>Parse text</strong>, the app converts common formats (e.g. markdown bullets, different casing) into the expected format. Prefix titles with a test case ID (e.g. <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">TC01 - Description</code>).
                </li>
                <li>
                  <strong>Parse</strong> — Click <strong>Parse text</strong>. Parsed cases appear below; any validation issues are shown in the orange panel.
                </li>
                <li>
                  <strong>Review and edit</strong> — Expand a case (click the arrow) to edit Title, and either Given/When/Then (BDD) or Preconditions/Steps/Expected Result (Standard). Use <strong>Delete</strong> to remove a case.
                </li>
                <li>
                  <strong>Set CSV defaults</strong> — Fill in <strong>Area Path</strong>, <strong>Assigned To</strong>, <strong>State</strong>, and optional <strong>Tags</strong>. These are applied to every test case in the export and are saved for next time.
                </li>
                <li>
                  <strong>Download CSV</strong> — Click <strong>Download CSV</strong> to get an Azure DevOps–ready file. BDD produces two rows per case (Test Case + one step); Standard produces one row per case plus one row per step (including preconditions).
                </li>
              </ol>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Need a prompt for AI? Open <strong>How to prompt AI</strong> next to the template dropdown and copy the prompt for your chosen format.
              </p>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowHowToModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to prompt AI modal */}
      {showPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPromptModal(false)}
            aria-hidden="true"
          />
          <div
            className="relative max-h-[85vh] w-full max-w-lg rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 id="prompt-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                How to prompt AI
              </h2>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-3">
              <PromptHelperBlock
                parserId={parserId}
                onCopy={copyPromptToClipboard}
                promptCopied={promptCopied}
                inModal
              />
            </div>
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledMiniInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

function LabeledMiniTextarea({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="min-h-0 resize-y rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

