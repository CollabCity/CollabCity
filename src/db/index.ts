import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Em desenvolvimento o hot reload recria os módulos a cada alteração, o que
 * abriria uma conexão nova a cada vez. Guardar o pool no escopo global evita
 * esgotar os slots do Postgres.
 */
const globalForDb = globalThis as unknown as {
  collabcityPool?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.collabcityPool ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 3,
    prepare: false,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.collabcityPool = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
export type Database = typeof db;
