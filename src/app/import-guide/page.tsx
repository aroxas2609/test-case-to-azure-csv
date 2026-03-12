import Link from "next/link";

const STEPS = [
  {
    title: "1. Open your Azure DevOps project",
    body: "Go to your Azure DevOps organisation and open the project where you want to create test cases.",
  },
  {
    title: "2. Go to Test Plans",
    body: "In the left navigation, select Test Plans (or Test Plans under the Boards/Test Plans hub, depending on your process template).",
  },
  {
    title: "3. Create or select a Test Plan and Test Suite",
    body: "Open an existing Test Plan, then select or create a static Test Suite where these cases should live. The CSV import works from inside a suite.",
  },
  {
    title: "4. Download the bulk import template (recommended)",
    body: "From Azure DevOps, use 'New test case' → 'Import test cases' (or the equivalent bulk import option) and download the sample CSV. Compare the column headers to the file you generated here if you run into issues.",
  },
  {
    title: "5. Upload the CSV from this tool",
    body: "In Azure DevOps, choose the import option and select the CSV file you downloaded from this site. Confirm the preview looks correct (titles, steps, expected results) before you complete the import.",
  },
  {
    title: "6. Finish and review in Azure DevOps",
    body: "After import completes, refresh the Test Suite. You should see your new test cases, each with steps and expected results. Adjust Area Path, Assigned To, State, and Tags directly in Azure DevOps if needed.",
  },
];

export default function ImportGuidePage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            ← Back to converter
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50">
            How to import the CSV into Azure DevOps
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Use these steps as a guide. UI labels may vary slightly between Azure DevOps versions and
            process templates.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-300 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</h2>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Tip: If Azure DevOps shows an error during import, start by downloading its sample CSV and checking
          that the column headers and sheet format match the file from this tool.
        </p>
      </main>
      <footer className="border-t border-slate-300 bg-white py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">
            Home
          </Link>
          {" · "}
          <Link href="/faq" className="hover:text-slate-700 dark:hover:text-slate-300">
            FAQ
          </Link>
          {" · "}
          <Link href="/feedback" className="hover:text-slate-700 dark:hover:text-slate-300">
            Feedback
          </Link>
        </div>
      </footer>
    </div>
  );
}

