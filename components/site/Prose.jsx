/** Long-form text styles for the legal pages, without a typography plugin. */

export function PageTitle({ title, updated }) {
  return (
    <header className="mb-12 animate-fade-up">
      <p className="eyebrow">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-ember-2" aria-hidden="true" />
        Legal
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="hairline mt-10" />
    </header>
  );
}

export function H2({ children }) {
  return <h2 className="mt-12 text-xl font-semibold tracking-tight">{children}</h2>;
}

export function P({ children }) {
  return <p className="mt-4 text-[15px] leading-[1.75] text-foreground/75">{children}</p>;
}

export function List({ children }) {
  return (
    <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[15px] leading-[1.75] text-foreground/75 marker:text-ember-2">{children}</ul>
  );
}

export function A({ href, children }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-foreground underline decoration-ember-2/60 underline-offset-4 transition-colors duration-300 hover:decoration-ember-2"
    >
      {children}
    </a>
  );
}
