import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Test Case Text to Azure DevOps CSV Converter",
  description:
    "Paste Given/When/Then test cases and export Azure DevOps-ready CSV without any API keys.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

