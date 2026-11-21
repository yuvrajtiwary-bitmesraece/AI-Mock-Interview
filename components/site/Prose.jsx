/** Simple long-form text styles for the legal pages (no typography plugin needed). */

export function PageTitle({ title, updated }) {
  return (
    <header className="mb-10 border-b border-white/10 pb-8">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
    </header>
  );
}

export function H2({ children }) {
  return <h2 className="mt-10 text-xl font-semibold">{children}</h2>;
}

export function P({ children }) {
  return <p className="mt-3 leading-relaxed text-foreground/80">{children}</p>;
}

export function List({ children }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-foreground/80 marker:text-primary">{children}</ul>;
}

export function A({ href, children }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-primary underline underline-offset-4 hover:text-cyan-200"
    >
      {children}
    </a>
  );
}
