import { expect, test } from "@playwright/test";
import { ACCOUNTS, storageStatePath } from "./accounts";

// Por padrão os testes deste arquivo rodam como a Ana, uma membra comum.
test.use({ storageState: storageStatePath("ana") });

/**
 * O ciclo de uma denúncia, do botão até o anúncio sair do ar.
 *
 * Cada execução publica um anúncio próprio, com título único. `chromium` e
 * `mobile` compartilham o banco: com um alvo fixo, a unicidade
 * `(reporter_id, listing_id)` faria os dois projetos brigarem, e acolher a
 * denúncia arquivaria um anúncio do seed de que os outros testes dependem.
 */
test("a fila de moderação não existe para quem não modera", async ({ page }) => {
  await page.goto("/painel/denuncias");

  // 404, e não 403: confirmar a existência da página já entregaria informação.
  await expect(page.getByRole("heading", { name: "Denúncias" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Denúncias" })).toBeHidden();
});

test.describe("com a conta de moderação", () => {
  test.use({ storageState: storageStatePath("moderacao") });

  test("a aba de denúncias aparece no painel", async ({ page }) => {
    await page.goto("/painel");
    await expect(page.getByRole("link", { name: "Denúncias" })).toBeVisible();
  });
});

test("denunciar um anúncio tira ele do ar quando a moderação acolhe", async ({
  page,
  browser,
}, testInfo) => {
  const sufixo = `${testInfo.project.name}-${Date.now()}`;
  const titulo = `Vendo bicicleta seminova ${sufixo}`;

  // 1. A Ana publica. (A sessão vem do projeto `setup`.)
  await page.goto("/anuncios/novo");
  await page.getByLabel("Título").fill(titulo);
  await page
    .getByLabel("Descrição")
    .fill("Bicicleta em bom estado, pouco uso, entrego na região central mediante combinação.");
  await page.getByLabel("Cidade").fill("Recife");
  await page.getByLabel("Latitude").fill("-8.0476");
  await page.getByLabel("Longitude").fill("-34.8770");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  const anuncio = page.url();

  // Quem publicou não vê o botão: ninguém denuncia o próprio anúncio.
  await expect(page.getByRole("button", { name: "Denunciar anúncio" })).toBeHidden();

  // 2. O Bruno denuncia.
  const leitorContext = await browser.newContext({ storageState: storageStatePath("bruno") });
  const leitor = await leitorContext.newPage();
  await leitor.goto(anuncio);
  await leitor.getByRole("button", { name: "Denunciar anúncio" }).click();

  const dialogo = leitor.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await dialogo.getByText("Informação enganosa").click();
  await dialogo
    .getByLabel(/Descrição/)
    .fill("O anúncio pede pagamento antecipado por transferência antes de mostrar a bicicleta.");
  await dialogo.getByRole("button", { name: "Enviar denúncia" }).click();
  await expect(dialogo.getByRole("status")).toContainText("Denúncia registrada");

  // Denunciar de novo não é oferecido.
  await leitor.goto(anuncio);
  await expect(leitor.getByTestId("ja-denunciado")).toBeVisible();
  await leitorContext.close();

  // 3. A moderação acolhe.
  const modContext = await browser.newContext({ storageState: storageStatePath("moderacao") });
  const mod = await modContext.newPage();
  await mod.goto("/painel/denuncias");

  const cartao = mod.locator("li").filter({ hasText: titulo });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText(ACCOUNTS.bruno.name);
  await cartao.getByLabel(/Nota da decisão/).fill("Confirmado pelo relato e pelo anúncio.");
  await cartao.getByRole("button", { name: "Acolher denúncia" }).click();

  await expect(mod.locator("li").filter({ hasText: titulo })).toBeHidden();
  await mod.goto("/painel/denuncias?status=upheld");
  await expect(mod.locator("li").filter({ hasText: titulo })).toBeVisible();
  await modContext.close();

  // 4. O anúncio saiu da busca.
  await page.goto(`/anuncios?q=${encodeURIComponent(`bicicleta seminova ${sufixo}`)}`);
  await expect(page.getByRole("main").getByText(titulo)).toBeHidden();
});
