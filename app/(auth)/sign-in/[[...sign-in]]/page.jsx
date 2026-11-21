import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "../../_components/AuthShell";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell>
      {/* Redirect set in code so sign-in always lands on the dashboard, whatever the env vars say. */}
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
