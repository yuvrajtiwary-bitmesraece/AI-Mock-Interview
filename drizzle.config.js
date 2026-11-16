import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local the same way Next.js does.
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEXT_PUBLIC_DRIZZLE_DB_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
}

export default defineConfig({
  schema: "./utils/schema.js",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
