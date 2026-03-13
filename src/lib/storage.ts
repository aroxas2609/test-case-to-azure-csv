import type { CsvSettings } from "./csv";
import type { NormalizedTestCase } from "@/types/testCase";

const TEXT_KEY = "ctc-raw-text";
const SETTINGS_KEY = "ctc-settings";
const CASES_KEY = "ctc-parsed-cases";

export function loadRawText(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(TEXT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveRawText(value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEXT_KEY, value);
  } catch {
    // ignore
  }
}

export function loadSettings(): CsvSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CsvSettings;
  } catch {
    return null;
  }
}

export function saveSettings(settings: CsvSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadCases(): NormalizedTestCase[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CASES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NormalizedTestCase[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCases(cases: NormalizedTestCase[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  } catch {
    // ignore
  }
}

