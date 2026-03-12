"use client";

import Link from "next/link";
import { useState } from "react";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim() || undefined, message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.message || "Something went wrong. Please try again later.");
        return;
      }
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            ← Back to converter
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50">Feedback</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Suggestions, bugs, or questions? Send a message and we&apos;ll get back to you.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
        >
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Name (optional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Your email (optional, for reply)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Message (required)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          {status === "error" && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
          {status === "sent" && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400">
              Thanks! Your message was sent. If you asked for a reply, check your inbox (and spam the first time).
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending" || !message.trim()}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            {status === "sending" ? "Sending…" : "Send feedback"}
          </button>
        </form>
      </main>
      <footer className="border-t border-slate-300 bg-white py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto max-w-2xl px-4 text-center text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">Home</Link>
          {" · "}
          <Link href="/faq" className="hover:text-slate-700 dark:hover:text-slate-300">FAQ</Link>
        </div>
      </footer>
    </div>
  );
}
