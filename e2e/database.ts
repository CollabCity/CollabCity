import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Resolução do banco usado pelos testes de ponta a ponta.
 *
 * Só o processo do Playwright resolve a URL; quem prepara o banco
 * (`e2e/prepare-database.ts`) a recebe pronta em `DATABASE_URL`. Concentrar a
 * derivação aqui evita o erro clássico de derivar duas vezes e acabar em
 * `collabcity_e2e_e2e`.
 */

const DEFAULT_DEVELOPMENT_URL = "postgresql://collabcity:collabcity@localhost:5432/collabcity";

const envFile = fileURLToPath(new URL("../.env.local", import.meta.url));

/** Lê `.env.local` sem tocar em `process.env`. Usado pelas verificações de segurança. */
export function readEnvFile(): Record<string, string> {
  if (!existsSync(envFile)) return {};

  const entries: Record<string, string> = {};
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match?.[1]) continue;
    entries[match[1]] = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
  }
  return entries;
}

/**
 * O Playwright não lê `.env.local`. Carregamos no processo pai para que os
 * comandos filhos — build, servidor, seed — herdem `BETTER_AUTH_SECRET` e
 * companhia.
 *
 * `process.loadEnvFile` não sobrescreve o que já está em `process.env`, então a
 * CI, que injeta as variáveis direto no ambiente, continua no comando.
 */
export function loadLocalEnv(): void {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

export function developmentDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? readEnvFile().DATABASE_URL ?? DEFAULT_DEVELOPMENT_URL;
}

/**
 * Banco de teste: o de desenvolvimento com o sufixo `_e2e` no nome.
 *
 * Derivar em vez de exigir configuração mantém `pnpm test:e2e` funcionando sem
 * nenhum passo extra. Quem precisar de outro alvo — um Postgres remoto, por
 * exemplo — define `E2E_DATABASE_URL`.
 */
export function testDatabaseUrl(): string {
  const configured = process.env.E2E_DATABASE_URL;
  if (configured) {
    assertNotDevelopment(configured);
    return configured;
  }

  const url = new URL(developmentDatabaseUrl());
  url.pathname = `/${databaseName(url)}_e2e`;
  return url.toString();
}

/**
 * O seed começa truncando todas as tabelas de domínio. Apontá-lo para o banco
 * errado apaga o trabalho de alguém sem aviso, e o sintoma que apareceria
 * depois — anúncios sumindo — não levaria ninguém até aqui.
 *
 * A comparação usa o valor do arquivo, não `process.env`, porque dentro do
 * servidor sob teste `DATABASE_URL` já é o banco de teste.
 */
export function assertNotDevelopment(candidate: string): void {
  const development = readEnvFile().DATABASE_URL;
  if (!development) return;

  const name = databaseName(new URL(candidate));
  if (name === databaseName(new URL(development))) {
    throw new Error(
      `O banco de teste não pode ser o de desenvolvimento (${name}). A suíte de ponta a ponta ` +
        `apaga e repopula o banco que recebe; use outro em E2E_DATABASE_URL.`,
    );
  }
}

export function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}
