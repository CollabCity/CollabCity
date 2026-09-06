import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";
import {
  ACCOUNTS,
  type AccountName,
  CONSENT_COOKIE_STATE,
  PASSWORD,
  storageStatePath,
} from "./accounts";

// Sem estado inicial: este é o projeto que o produz.
setup.use({ storageState: { cookies: [], origins: [] } });

for (const name of Object.keys(ACCOUNTS) as AccountName[]) {
  setup(`autenticar ${name}`, async ({ page }) => {
    const account = ACCOUNTS[name];

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(account.email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/painel/);

    // O consentimento entra junto da sessão: ver `CONSENT_COOKIE_STATE`.
    await page.context().addCookies([CONSENT_COOKIE_STATE]);

    const path = storageStatePath(name);
    mkdirSync(dirname(path), { recursive: true });
    await page.context().storageState({ path });
  });
}
