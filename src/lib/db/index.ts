import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env, hasDatabaseUrl } from "@/lib/env";
import * as schema from "@/lib/db/schema";

let database:
  | ReturnType<typeof drizzle<typeof schema>>
  | null
  | undefined;

export function getDb() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  if (database !== undefined) {
    return database;
  }

  const client = neon(env.DATABASE_URL!);
  database = drizzle(client, { schema });
  return database;
}

export { schema };
