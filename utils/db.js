import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

// The `server-only` import above makes the build fail if a client component
// ever imports this file, so the connection string can never reach the browser.

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Deprecated: kept so existing deployments keep working after upgrading.
  if (process.env.NEXT_PUBLIC_DRIZZLE_DB_URL) {
    console.warn(
      "[db] NEXT_PUBLIC_DRIZZLE_DB_URL is deprecated and will be removed in v2. Rename it to DATABASE_URL."
    );
    return process.env.NEXT_PUBLIC_DRIZZLE_DB_URL;
  }

  throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
}

let client;

/**
 * Returns the shared Drizzle client, creating it on first use.
 * Creating it lazily means `next build` does not need database credentials.
 */
export function getDb() {
  if (!client) {
    client = drizzle(neon(resolveDatabaseUrl()), { schema });
  }
  return client;
}
