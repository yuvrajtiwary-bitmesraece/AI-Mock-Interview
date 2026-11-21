"use client";

import "./globals.css";

/**
 * Last-resort error page, used only when the root layout itself fails.
 * It replaces the whole document, so it renders its own <html> and <body>.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-foreground">
        <main>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">Please reload the page. If this keeps happening, try again in a few minutes.</p>
          {error?.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
