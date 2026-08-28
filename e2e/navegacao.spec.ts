import { expect, test } from "@playwright/test";

/**
 * Fluxos que atravessam servidor, banco e navegador. Dependem de um banco
 * migrado e populado (`pnpm db:reset`).
 */

test("a página inicial apresenta a plataforma e leva à busca", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Conecte quem precisa de ajuda/i })).toBeVisible();

  await page.getByRole("link", { name: /Ver o que há por perto/i }).click();
  await expect(page).toHaveURL(/\/anuncios/);
  await expect(page.getByRole("heading", { name: "Explorar", level: 1 })).toBeVisible();
});

test("a busca textual filtra os resultados", async ({ page }) => {
  await page.goto("/anuncios");

  await page.getByRole("textbox", { name: "Buscar anúncios" }).fill("bicicleta");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/q=bicicleta/);
  await expect(page.getByRole("link", { name: /bicicleta/i }).first()).toBeVisible();
});

test("filtrar por pedidos remove as ofertas dos resultados", async ({ page }) => {
  await page.goto("/anuncios?intent=need");

  // O escopo é a lista de resultados: o cabeçalho tem links "Quem oferece" que
  // não são etiquetas de anúncio.
  const results = page.getByRole("main").locator("ul > li");
  await expect(results.first()).toBeVisible();
  await expect(results.getByText("Pedido").first()).toBeVisible();
  await expect(results.getByText("Oferta")).toHaveCount(0);
});

test("um anúncio abre com título, localização e autoria", async ({ page }) => {
  await page.goto("/anuncios");

  const first = page.getByRole("main").locator("ul > li h3 a").first();
  const title = (await first.innerText()).trim();
  await first.click();

  await expect(page).toHaveURL(/\/anuncios\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Publicou este anúncio")).toBeVisible();
});

test("publicar exige autenticação", async ({ page }) => {
  await page.goto("/anuncios/novo");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("o painel exige autenticação", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar/);
});

test("um identificador inexistente responde 404", async ({ page }) => {
  const response = await page.goto("/anuncios/00000000-0000-0000-0000-000000000000");

  // O status importa tanto quanto a tela: um 200 aqui seria um soft 404, e
  // buscadores indexariam a página de erro como se fosse conteúdo.
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /não encontrada/i })).toBeVisible();
});
