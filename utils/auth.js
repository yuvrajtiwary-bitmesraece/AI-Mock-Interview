import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

/**
 * The signed-in user as `{ id, email }`, or `null` when signed out.
 *
 * `id` is the Clerk user ID, the owner key for interviews created since 1.1.
 * `email` is the primary email address, but only if it's verified: interviews
 * created before 1.1 are matched to their owner by email, and an unverified
 * address must never grant access to them.
 *
 * Cached for the duration of one request.
 */
export const getViewer = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const primary = user?.primaryEmailAddress;
  const email = primary?.verification?.status === "verified" ? primary.emailAddress : null;

  return { id: userId, email };
});
