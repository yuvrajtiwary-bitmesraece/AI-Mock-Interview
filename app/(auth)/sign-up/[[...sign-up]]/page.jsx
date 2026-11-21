import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "../../_components/AuthShell";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell>
      {/* Redirect set in code so sign-up always lands on the dashboard, whatever the env vars say. */}
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
