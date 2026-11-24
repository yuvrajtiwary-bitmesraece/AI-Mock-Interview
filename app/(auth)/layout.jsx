import { AuthProvider } from "@/components/auth/AuthProvider";

/** Sign-in and sign-up: of the public pages, the only ones that load Clerk. */
export default function AuthLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
