import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { assertNotDevelopment, databaseName, loadLocalEnv, testDatabaseUrl } from "./database";

/**
 * Cria, migra e repopula o banco dos testes de ponta a ponta.
 *
 * Roda como primeiro elo do comando do `webServer`, e não como `globalSetup`,
 * por uma razão medida na prática: o Playwright sobe o `webServer` **antes** do
 * setup global, e a sonda de prontidão dele carrega a página inicial — que
 * consulta o banco. Preparar depois deixava o servidor em erro e a suíte
 * expirava esperando um 200 que nunca vinha.
 *
 * Chamado pelo Playwright, o alvo chega pronto em `DATABASE_URL`. Chamado à
 * mão (`pnpm db:e2e`), ele deriva o mesmo nome que a configuração derivaria.
 */

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function ensureDatabaseExists(url: URL): Promise<void> {
  const name = databaseName(url);

  // `CREATE DATABASE` não aceita parâmetro nem roda dentro de transação, e
  // exige estar conectado a outro banco. `postgres` é o banco de manutenção
  // que toda instalação tem.
  const maintenance = new URL(url.toString());
  maintenance.pathname = "/postgres";

  const admin = postgres(maintenance.toString(), { max: 1, onnotice: () => {} });

  try {
    const existing = await admin`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
      console.warn(`Banco de teste ${name} criado.`);
    }
  } finally {
    await admin.end();
  }
}

function run(script: string, databaseUrl: string): void {
  execFileSync("pnpm", ["exec", "tsx", script], {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function main(): Promise<void> {
  // Resolver antes de carregar `.env.local`: o arquivo traz o banco de
  // desenvolvimento em `DATABASE_URL`, e ele não pode virar o alvo por
  // acidente. `run()` reimpõe o alvo em cada filho.
  const databaseUrl = process.env.DATABASE_URL ?? testDatabaseUrl();
  assertNotDevelopment(databaseUrl);

  // O seed valida `BETTER_AUTH_SECRET` ao carregar; quando este script roda
  // fora do Playwright, é daqui que a variável vem.
  loadLocalEnv();

  const url = new URL(databaseUrl);
  console.warn(`Preparando o banco de teste ${databaseName(url)}...`);
  await ensureDatabaseExists(url);

  // O seed trunca as tabelas de domínio antes de inserir, então migrar e
  // popular já devolve o banco ao estado conhecido — não é preciso derrubá-lo.
  run("src/db/migrate.ts", databaseUrl);
  run("src/db/seed.ts", databaseUrl);
}

main().catch((error) => {
  console.error("Falha ao preparar o banco de teste:", error);
  process.exit(1);
});
