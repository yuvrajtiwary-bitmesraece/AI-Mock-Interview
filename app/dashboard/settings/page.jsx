import { Database, Gauge, ShieldAlert, UserRound } from "lucide-react";

import { Accent, PageHeader } from "@/components/ui/page-header";
import { getViewer } from "@/utils/auth";
import { getUsageToday } from "@/utils/usage";

import { DeleteAllButton, ExportButton, ManageAccountButton } from "./_components/DataControls";

export const metadata = { title: "Settings" };

const USAGE_ROWS = [
  { action: "interview", label: "New interviews" },
  { action: "answer", label: "Answer reviews" },
  { action: "report", label: "Coaching reports" },
  { action: "transcription", label: "Voice transcriptions" },
];

function Card({ icon: Icon, title, description, tone = "default", children }) {
  const danger = tone === "danger";
  return (
    <section className={danger ? "rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-6 sm:p-7" : "surface p-6 sm:p-7"}>
      <h2 className={`flex items-center gap-2.5 font-semibold tracking-tight ${danger ? "text-red-200" : ""}`}>
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ${danger ? "bg-red-400/10 text-red-300" : "bg-primary/10 text-ember-2"}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await getViewer();

  // Today's usage against the daily limits. Not critical, so failures just hide it.
  let usage = [];
  try {
    usage = viewer
      ? await Promise.all(USAGE_ROWS.map(async (row) => ({ ...row, ...(await getUsageToday(viewer.id, row.action)) })))
      : [];
  } catch (error) {
    console.error("[settings] could not read usage:", error);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        className="mb-10"
        eyebrow="Settings"
        title={
          <>
            Your account, <Accent>your data</Accent>
          </>
        }
        description="Manage your sign-in details, see today's AI usage, and download or delete everything you've saved."
      />

      <Card icon={UserRound} title="Account" description="Change your name, email address, password or connected accounts.">
        <ManageAccountButton />
      </Card>

      {usage.length > 0 && (
        <Card icon={Gauge} title="Today's AI usage" description="Limits keep the free AI service available for everyone. They reset at midnight UTC.">
          <dl className="space-y-5">
            {usage.map(({ action, label, used, limit }) => (
              <div key={action}>
                <div className="mb-2 flex justify-between text-sm">
                  <dt>{label}</dt>
                  <dd className="font-mono text-[13px] text-muted-foreground">
                    {Number.isFinite(limit) ? `${Math.min(used, limit)} / ${limit}` : `${used} (no limit)`}
                  </dd>
                </div>
                {Number.isFinite(limit) && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--ember-1)),hsl(var(--ember-2)))]"
                      style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card
        icon={Database}
        title="Your data"
        description="Download everything stored about your interviews as a JSON file: questions, answers, scores, feedback and reports."
      >
        <ExportButton />
      </Card>

      <Card
        icon={ShieldAlert}
        tone="danger"
        title="Delete your data"
        description="Permanently delete all your interviews, answers, feedback and usage records. Download a copy first if you want to keep anything."
      >
        <DeleteAllButton />
      </Card>
    </div>
  );
}
