import { Database, Gauge, ShieldCheck, UserRound } from "lucide-react";

import { getViewer } from "@/utils/auth";
import { getUsageToday } from "@/utils/usage";

import { DeleteAllButton, ExportButton, ManageAccountButton } from "./_components/DataControls";

export const metadata = { title: "Settings" };

const USAGE_ROWS = [
  { action: "interview", label: "New interviews" },
  { action: "answer", label: "Answer reviews" },
  { action: "report", label: "Coaching reports" },
];

function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="glass p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" /> {title}
      </h2>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
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
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">Your account, your usage and your data.</p>
      </header>

      <Card icon={UserRound} title="Account" description="Change your name, email address, password or connected accounts.">
        <ManageAccountButton />
      </Card>

      {usage.length > 0 && (
        <Card icon={Gauge} title="Today's AI usage" description="Limits keep the free AI service available for everyone. They reset at midnight UTC.">
          <dl className="space-y-4">
            {usage.map(({ action, label, used, limit }) => (
              <div key={action}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <dt>{label}</dt>
                  <dd className="text-muted-foreground">{Number.isFinite(limit) ? `${Math.min(used, limit)} of ${limit}` : `${used} (no limit)`}</dd>
                </div>
                {Number.isFinite(limit) && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card icon={Database} title="Your data" description="Download everything we store about your interviews as a JSON file: questions, answers, scores, feedback and reports.">
        <ExportButton />
      </Card>

      <section className="rounded-2xl border border-red-400/25 bg-red-400/[0.04] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-red-200">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Delete your data
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Permanently delete all your interviews, answers, feedback and usage records. Download a copy first if you want to keep anything.
        </p>
        <div className="mt-5">
          <DeleteAllButton />
        </div>
      </section>
    </div>
  );
}
