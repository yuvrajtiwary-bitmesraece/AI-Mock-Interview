/**
 * A link from a public page into the app: sign-in, sign-up or the dashboard.
 * It loads the page in full instead of navigating in place. The public pages
 * don't run Clerk (components/auth/AuthProvider.jsx), so a signed-in visitor's
 * short-lived session token may have expired while they read; a full page load
 * lets Clerk renew it on the way in, where an in-place navigation would show
 * them the sign-in page first.
 */
export function AppLink(props) {
  return <a {...props} />;
}
