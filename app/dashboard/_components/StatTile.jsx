/** A labelled headline number for the dashboard's row of key stats. */
export default function StatTile({ icon: Icon, label, value, detail }) {
  return (
    <div className="surface p-5 sm:p-6">
      <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-ember-2">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      {detail && <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
