import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Executa as migrações do Drizzle.
 *
 * A extensão PostGIS é criada aqui, antes de qualquer migração, porque as
 * tabelas `listings` e `profiles` têm colunas geradas que dependem de
 * `ST_SetSRID`/`ST_MakePoint`. Provedores gerenciados como Neon e Supabase já
 * disponibilizam a extensão; basta habilitá-la no banco.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida. Copie .env.example para .env.local.");
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);

  try {
    await client`CREATE EXTENSION IF NOT EXISTS postgis`;
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.warn("Migrações aplicadas com sucesso.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Falha ao aplicar as migrações:", error);
  process.exit(1);
});
