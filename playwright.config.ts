import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnv, testDatabaseUrl } from "./e2e/database";

// Torna `.env.local` visível aos comandos filhos — build, servidor e seed
// precisam de `BETTER_AUTH_SECRET`, que o Playwright não carrega sozinho.
loadLocalEnv();

/**
 * O servidor sob teste sobe numa porta própria, longe da 3000 do `pnpm dev`.
 *
 * Não é preferência: `reuseExistingServer` fica ligado fora da CI, e com o
 * servidor de desenvolvimento ocupando a 3000 o Playwright reusaria ele — um
 * processo que fala com o banco de desenvolvimento. O isolamento seria
 * ignorado em silêncio, que é exatamente a falha que este arranjo impede.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const serverURL = `http://localhost:${PORT}`;

const baseURL = process.env.E2E_BASE_URL ?? serverURL;

/** Único ponto que deriva o banco de teste. Quem prepara recebe pronto. */
const databaseUrl = testDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // `setup` autentica as contas uma vez e salva o cookie; os dois projetos de
    // navegador partem dele. Ver o porquê em `e2e/accounts.ts`.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      testMatch: "**/*.spec.ts",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // A preparação do banco é o primeiro elo, e não um `globalSetup`,
        // porque o Playwright sobe o `webServer` antes do setup global e a
        // sonda de prontidão já consulta o banco.
        command: "pnpm exec tsx e2e/prepare-database.ts && pnpm build && pnpm start",
        url: serverURL,
        reuseExistingServer: !process.env.CI,
        // Na CI o `pnpm build` sai do zero, sem cache do Turbopack.
        timeout: process.env.CI ? 600_000 : 300_000,
        // O Next consulta `process.env` antes de `.env.local`, então isto tira
        // o servidor sob teste do banco de desenvolvimento. `BETTER_AUTH_URL`
        // acompanha a porta porque o Better Auth o usa como origem confiável.
        env: {
          DATABASE_URL: databaseUrl,
          PORT: String(PORT),
          BETTER_AUTH_URL: serverURL,
          NEXT_PUBLIC_APP_URL: serverURL,
          // Valores de fachada: o que se testa é o consentimento decidir se os
          // scripts entram na página, não a resposta do Google.
          NEXT_PUBLIC_GA_ID: "G-TESTE0000",
          NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-0000000000000000",
          NEXT_PUBLIC_ADSENSE_SLOT: "0000000000",
          // Sem prazo de arrependimento, para que o teste possa exercitar o
          // expurgo sem esperar trinta dias nem mexer no relógio do banco.
          ACCOUNT_DELETION_GRACE_DAYS: "0",
          MAINTENANCE_SECRET: "segredo-de-teste",
        },
      },
});
