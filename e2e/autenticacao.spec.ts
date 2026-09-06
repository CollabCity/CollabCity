import { expect, test } from "@playwright/test";
import { ACCOUNTS, ANONYMOUS, PASSWORD, storageStatePath } from "./accounts";

/** Conta criada pelo seed em `src/db/seed.ts`. */
const DEMO = { email: ACCOUNTS.ana.email, password: PASSWORD };

// Estes testes exercitam o próprio formulário de login e por isso partem
// deslogados, em vez de reaproveitar a sessão do projeto `setup`.
test.use({ storageState: ANONYMOUS });

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

test.describe("já autenticado", () => {
  // Aqui o login é meio, não fim: a sessão vem pronta para não gastar uma
  // autenticação do limite por IP descrito em `e2e/accounts.ts`.
  test.use({ storageState: storageStatePath("ana") });

  test("é possível publicar um anúncio", async ({ page }, testInfo) => {
    // O título carrega o nome do projeto porque `chromium` e `mobile` rodam em
    // paralelo contra o mesmo banco. Com o título fixo, a asserção final de um
    // poderia casar com o anúncio criado pelo outro.
    const titulo = `Empresto ferramentas de jardinagem (${testInfo.project.name})`;

    await page.goto("/anuncios/novo");
    await page.getByLabel("Título").fill(titulo);
    await page
      .getByLabel("Descrição")
      .fill(
        "Tenho tesoura de poda, pá e regador que ficam parados durante a semana. Empresto para quem cuida de hortas comunitárias na região.",
      );
    await page.getByLabel("Cidade").fill("Recife");
    await page.getByLabel("Latitude").fill("-8.0476");
    await page.getByLabel("Longitude").fill("-34.8770");
    await page.getByRole("button", { name: "Publicar" }).click();

    // Nível 1 e nome exato: o anúncio recém-criado abre na própria página, e a
    // asserção precisa falhar se o formulário apenas tiver ficado onde estava.
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  });
});
