# Test Case Text to Azure DevOps CSV Converter

Paste plain-text test cases in one of several supported formats, preview and edit them, and export to an Azure DevOps bulk-importable CSV file.

There is **no OpenAI/API usage** in this app – it only parses text you paste into the browser.

## Supported input templates

You can choose a **template** (parser) from the dropdown or use **Auto-detect** to let the app guess the format.

1. **Given/When/Then (current)** – Original format: first line = title, then `Given` / `When` / `Then` (and `And`) lines. Blank line between cases.
2. **BDD (title + Given/When/Then)** – Same structure; auto-detect prefers this when the first line is not a keyword.
3. **Standard** – `Title:`, `Preconditions:`, `Steps:` (1. … 2. …), `Expected Result:`.
4. **Scenario** – `Scenario:`, `Test Data:`, `Action:`, `Outcome:`.
5. **Loose (AI / flexible)** – Best-effort parsing of flexible labels: Given, When, Then, And, Steps, Expected, etc.

All parsers normalize into a single internal shape; the same CSV export (two rows per case, Step Action = given+when, Step Expected = then) is used for every template.

## Parser selection and auto-detect

- **Template dropdown** – Select the format that matches your pasted text before clicking **Parse text**.
- **Auto-detect** – Click **Auto-detect** to run heuristics on the text; the dropdown updates to the suggested parser and shows “Detected: …”.
- **Rules** – If the text has `Title:`, `Preconditions:`, or `Expected Result:`, the standard parser is preferred. If it has `Scenario:`, `Action:`, `Outcome:`, the scenario parser is preferred. If it has Given/When/Then with a non-keyword first line, BDD is preferred; otherwise Given/When/Then. If nothing else matches, the loose parser is used.

## How normalized parsing maps to CSV export

Internally, every parser produces **normalized** test cases (title, optional given/when/then, steps, expectedResult, preconditions, etc.). The export layer maps this to the fixed CSV shape:

- **Title** → CSV “Title”.
- **Step Action** → `given` + `when` (newline-joined). If neither is present, `steps` are used.
- **Step Expected** → `then`, or `expectedResult` if `then` is missing.

So formats that only have “Steps” and “Expected” (e.g. standard or scenario) still produce a valid two-row CSV; steps become the step action and expected becomes the step expected.

## How to add a new parser

1. **Types** – Ensure `src/types/testCase.ts` has the shared `NormalizedTestCase` and `TestCaseParser` interface.
2. **New file** – Add e.g. `src/parsers/myFormat.ts` that exports an object:
   - `id`: string (unique key)
   - `name`: string (dropdown label)
   - `description`: string (short hint)
   - `detect(text: string): boolean` – return true if this parser is a good fit for the text
   - `parse(text: string): ParserResult` – return `{ cases: NormalizedTestCase[], blockErrors: { blockText, message }[] }`
3. **Registry** – In `src/parsers/registry.ts`, import the parser and add it to the `allParsers` array. Optionally extend `detect()` so the new format is chosen when appropriate.
4. **Export** – No change needed; `normalizeToExport` in `src/utils/normalizeToExport.ts` maps normalized cases to the CSV export shape.

## Tech stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **CSV:** `csv-stringify` (sync API) on the client
- **Storage:** `localStorage` for raw text and Azure DevOps defaults

## Input format (default: Given/When/Then)

The **Given/When/Then** template expects repeated blocks like this (blank line between blocks):

```text
COPO-785: Request date section label
Given a patient opens a referral link for General, Commercial, or Defence eReferral
When the eReferral detail screen loads
Then the request date field is displayed with the section label "Request date"

COPO-785: Referrer section label
Given a patient opens a referral link for General, Commercial, or Defence eReferral
When the eReferral detail screen loads
Then the referrer field is displayed with the section label "Referrer"
```

Parsing rules for this template:

- First non-empty line of a block → **Title**
- Next line starting with `Given` → **Given** (supports multi-line using `And ...`)
- Next line starting with `When` → **When** (supports multi-line using `And ...`)
- Next line starting with `Then` → **Then** (supports multi-line using `And ...`)
- Blank lines separate blocks
- Incomplete blocks (missing Given/When/Then) are reported as **validation errors**.

### Sample inputs for other templates

**Standard (Title / Preconditions / Steps / Expected Result):**

```text
Title: TC01 - User can log in
Preconditions: User is on the login page
Steps:
1. Enter valid username
2. Enter valid password
3. Click Login
Expected Result: User is taken to the dashboard
```

**Scenario (Scenario / Test Data / Action / Outcome):**

```text
Scenario: Verify login with valid credentials
Test Data: username=testuser, password=secret
Action: Enter credentials and click Login
Outcome: Dashboard is displayed
```

**BDD (title on first line, then Given/When/Then):** Use the same block as the Given/When/Then sample above; BDD is auto-selected when the first line is not a keyword.

**Loose:** Flexible labels such as `Given: ...`, `Steps: ...`, `Expected: ...` are parsed on a best-effort basis.

## CSV output

The generated CSV has these columns:

- `ID`
- `Work Item Type`
- `Title`
- `Test Step`
- `Step Action`
- `Step Expected`
- `Area Path`
- `Assigned To`
- `State`

Rules:

- Each test case becomes **two rows**:
  - **Row 1** (Test Case):
    - `Work Item Type` = `Test Case`
    - `Title` = parsed title
    - `Area Path`, `Assigned To`, `State` = from the **settings panel** (`State` defaults to `Design`)
    - Step columns left blank
  - **Row 2** (Step 1):
    - `Test Step` = `1`
    - `Step Action` = `Given` + `When` joined with a line break
    - `Step Expected` = `Then`
    - Other columns left blank

You can open the CSV in Excel and import it via Azure DevOps Test Plans bulk import.

## Running the app locally

1. **Install dependencies**

   ```bash
   cd "c:\\Cursor\\Test case generator"
   npm install
   ```

2. **Start the dev server**

   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000` in your browser.

There are **no environment variables or API keys** required.

## Sharing with others (run without an IDE)

You can send the app to colleagues so they can run it locally without Cursor or any IDE.

### What they need

- **Node.js** (LTS, e.g. 18 or 20). They can download it from [nodejs.org](https://nodejs.org) if they don’t have it.

### How to share the project

1. **Option A – Zip the folder**  
   Zip the whole project folder (e.g. `Test case generator`) **excluding** `node_modules` and `.next`.  
   So the zip should contain: `package.json`, `src/`, `public/` (if any), `README.md`, config files, etc., but not `node_modules` or `.next`.

2. **Option B – Git**  
   If you use Git, they can clone the repo. They still need to run `npm install` after cloning.

### How they run it (no IDE)

1. Unzip the folder (or clone the repo) and open a **terminal** (or **Command Prompt** / **PowerShell** on Windows) in that folder.
2. Run:
   ```bash
   npm install
   npm run dev
   ```
3. Open a browser and go to **http://localhost:3000**.

They don’t need Cursor, VS Code, or any editor—only Node.js and a browser.

### Optional: production build

If they prefer to run the built app (faster startup, no dev watcher):

```bash
npm install
npm run build
npm run start
```

Then open **http://localhost:3000** as above.

## How to use

1. **Paste test cases**
   - Paste your test cases into the large text area, or click **“Load sample input”** to see the expected format.
2. **Configure Azure DevOps defaults**
   - On the right, fill in:
     - **Area Path**
     - **Assigned To** (optional)
     - **State** (defaults to `Design`)
   - These values are saved in `localStorage` and reused next time.
3. **Parse**
   - Click **“Parse text”**.
   - Parsed cases appear in the side panel; any incomplete blocks show up in the **validation issues** panel with their raw text.
4. **Review and edit**
   - For each parsed case, you can edit:
     - **Title**
     - **Given / When / Then** lines
   - You can also **delete** a test case if you don’t want it in the CSV.
5. **Download CSV**
   - When happy, click **“Download CSV”** to get an Azure DevOps-ready CSV file.

## Project structure (simplified)

```text
src/
  app/
    globals.css        # Tailwind base + minimal theming
    layout.tsx         # Root layout and metadata
    page.tsx           # Main UI: paste box, template dropdown, auto-detect, parse, CSV download
  lib/
    parser.ts          # Legacy API: parseTestCaseText (uses Given/When/Then parser + export mapping)
    csv.ts             # Azure DevOps CSV builder (consumes ExportTestCase; 2 rows per case)
    storage.ts         # localStorage helpers for text and settings
  parsers/
    registry.ts        # Parser list, get(id), detect(text)
    givenWhenThen.ts   # Current/Given/When/Then parser
    bdd.ts             # BDD (title + G/W/T)
    standard.ts        # Title / Preconditions / Steps / Expected Result
    scenario.ts        # Scenario / Test Data / Action / Outcome
    loose.ts           # Flexible AI-style labels
  types/
    testCase.ts        # NormalizedTestCase, ExportTestCase, TestCaseParser, ParserResult
  utils/
    extractId.ts       # extractTestCaseIdFromTitle (TC01, COPO-786, etc.)
    normalizeToExport.ts # Map NormalizedTestCase → ExportTestCase for CSV
```

## Notes

- Everything runs entirely in the browser; there is **no server-side API** beyond what Next.js provides for rendering.
- You can safely host this without any secrets, since it only processes whatever you paste into it.

