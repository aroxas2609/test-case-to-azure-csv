import Link from "next/link";

const FAQ_ITEMS = [
  {
    q: "What templates are supported?",
    a: "BDD (title + Given/When/Then) and Standard (Title, Preconditions, Steps, Expected Result). Choose the one that matches your pasted text.",
  },
  {
    q: "Do I need an API key or Azure DevOps account?",
    a: "No. The app runs entirely in your browser. You paste text, parse it, and download a CSV file. You then import that CSV into Azure DevOps using your own account.",
  },
  {
    q: "Is my data sent to any server?",
    a: "No. Parsing and CSV generation happen in your browser. Nothing is sent to a server except when you submit feedback (if you use the Feedback page).",
  },
  {
    q: "Why does the text change when I click Parse?",
    a: "The app normalizes common formats (e.g. markdown bullets, different casing for Given/When/Then) into the format the parser expects. The textarea updates to show the normalized version so you see exactly what was parsed.",
  },
  {
    q: "Can I use tags in the CSV?",
    a: "Yes. In CSV defaults, enter tags in the Tags field (semicolon-separated, e.g. Regression; Smoke). They are applied to every test case on import into Azure DevOps.",
  },
  {
    q: "How do I get a prompt for AI to write test cases?",
    a: "Click \"How to prompt AI\" next to the template dropdown. A modal opens with a copy-ready prompt for the selected template. Copy it and use it in your AI tool, then paste the output back into the app.",
  },
  {
    q: "Why is the Assigned To dropdown locked?",
    a: "Assigned To is optional and can be configured with a password-protected list of assignees for your organisation. Click the padlock icon to enter the password and unlock the list. Once unlocked you can pick a name or leave it blank; clicking the padlock again will lock the list and hide the names.",
  },
];

export default function FaqPage() {
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
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50">FAQ</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <ul className="space-y-6">
          {FAQ_ITEMS.map((item, i) => (
            <li key={i} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.q}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
            </li>
          ))}
        </ul>
      </main>
      <footer className="border-t border-slate-300 bg-white py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">Home</Link>
          {" · "}
          <Link href="/feedback" className="hover:text-slate-700 dark:hover:text-slate-300">Feedback</Link>
        </div>
      </footer>
    </div>
  );
}
