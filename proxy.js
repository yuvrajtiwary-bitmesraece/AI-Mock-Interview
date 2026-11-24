import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 calls this file "proxy" (it was "middleware" before). It runs
// before every matching request: here it requires sign-in for the dashboard.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Only the routes that use Clerk: the dashboard (its pages and their
    // server actions) and the sign-in and sign-up pages. The public pages
    // (home, privacy, terms) don't load Clerk at all, so they skip it too:
    // they come straight from the CDN cache, and a first visit isn't
    // redirected through Clerk's servers before the page can load.
    "/dashboard/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
