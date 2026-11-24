"use client";

import "./globals.css";

/**
 * The last-resort error page, used only when the root layout itself fails. It
 * replaces the whole document, so it renders its own <html> and <body>, and its
 * button reloads the page from scratch rather than re-rendering the broken one.
 */
export default function GlobalError({ error }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh items-center justify-center px-6 text-center">
        <main>
          <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">Please reload the page. If this keeps happening, try again in a few minutes.</p>
          {error?.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-white"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
