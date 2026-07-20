import { createClient } from "@libsql/client";

const databaseUrl = import.meta.env.TURSO_DATABASE_URL ?? "file:app.db";

export const client = createClient({
  url: databaseUrl,
});
