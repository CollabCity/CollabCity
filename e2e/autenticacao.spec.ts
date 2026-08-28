import { expect, test } from "@playwright/test";

/** Conta criada pelo seed em `src/db/seed.ts`. */
const DEMO = { email: "ana@exemplo.test", password: "collabcity-demo-2026" };

test("entrar leva ao painel com os anúncios da conta", async ({ page }) => {
  await page.goto("/entrar");

  await page.getByLabel("E-mail").fill(DEMO.email);
  await page.getByLabel("Senha").fill(DEMO.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/painel/);
  await expect(page.getByRole("heading", { name: "Meus anúncios" })).toBeVisible();
});

test("credenciais inválidas não revelam se a conta existe", async ({ page }) => {
  await page.goto("/entrar");

  await page.getByLabel("E-mail").fill(DEMO.email);
  await page.getByLabel("Senha").fill("senha-completamente-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail ou senha inválidos.");
});

test("o cadastro recusa senha curta antes de chamar o servidor", async ({ page }) => {
  await page.goto("/cadastro");

  await page.getByLabel("Nome").fill("Pessoa de Teste");
  await page.getByLabel("E-mail").fill("teste@exemplo.test");
  await page.getByLabel("Senha").fill("curta");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.locator("form").getByRole("alert")).toContainText("pelo menos 12 caracteres");
});

test("depois de entrar é possível publicar um anúncio", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(DEMO.email);
  await page.getByLabel("Senha").fill(DEMO.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel/);

  await page.goto("/anuncios/novo");
  await page.getByLabel("Título").fill("Empresto ferramentas de jardinagem no fim de semana");
  await page
    .getByLabel("Descrição")
    .fill(
      "Tenho tesoura de poda, pá e regador que ficam parados durante a semana. Empresto para quem cuida de hortas comunitárias na região.",
    );
  await page.getByLabel("Cidade").fill("Recife");
  await page.getByLabel("Latitude").fill("-8.0476");
  await page.getByLabel("Longitude").fill("-34.8770");
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(
    page.getByRole("heading", { name: /Empresto ferramentas de jardinagem/ }),
  ).toBeVisible();
});
