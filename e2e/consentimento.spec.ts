import { expect, test } from "@playwright/test";
import { ANONYMOUS, SEM_CONSENTIMENTO } from "./accounts";

const GA = "googletagmanager.com";

/** Nenhum script de terceiro chega a ser buscado durante os testes. */
test.beforeEach(async ({ page }) => {
  await page.route(`**/*${GA}/**`, (route) => route.abort());
});

async function scriptsDeTerceiros(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("script"))
      .map((script) => script.src)
      .filter((src) => src.includes("googletagmanager")),
  );
}

test.describe("sem escolha registrada", () => {
  test.use({ storageState: SEM_CONSENTIMENTO });

  test("o banner aparece e nada de terceiro carrega antes dele", async ({ page }) => {
    await page.goto("/anuncios");

    const banner = page.getByRole("dialog", { name: /Consentimento/ });
    await expect(banner).toBeVisible();

    // O ponto central da implementação: antes da escolha, os scripts não estão
    // na página — não é um sinal de "não rastreie", é ausência de código.
    expect(await scriptsDeTerceiros(page)).toEqual([]);
  });

  test("recusar não carrega nada, e a escolha persiste", async ({ page }) => {
    await page.goto("/anuncios");
    await page.getByRole("button", { name: "Recusar" }).click();

    await expect(page.getByRole("dialog", { name: /Consentimento/ })).toBeHidden();
    expect(await scriptsDeTerceiros(page)).toEqual([]);

    await page.goto("/anuncios");
    await expect(page.getByRole("dialog", { name: /Consentimento/ })).toBeHidden();
    expect(await scriptsDeTerceiros(page)).toEqual([]);
  });

  test("aceitar carrega a medição", async ({ page }) => {
    await page.goto("/anuncios");
    await page.getByRole("button", { name: "Aceitar" }).click();

    await expect(page.getByRole("dialog", { name: /Consentimento/ })).toBeHidden();

    // `afterInteractive` injeta a tag depois da hidratação, então a espera é do
    // elemento aparecer — conferir uma vez só mediria a corrida.
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(1, {
      timeout: 15_000,
    });
  });

  test("recusar e aceitar têm o mesmo peso visual", async ({ page }) => {
    await page.goto("/anuncios");

    // O guia da ANPD pede que recusar seja tão fácil quanto aceitar. Os dois são
    // botões de verdade, do mesmo tamanho e da mesma variante — sem o preenchido
    // contra contornado que empurra para o aceite.
    const recusar = page.getByRole("button", { name: "Recusar" });
    const aceitar = page.getByRole("button", { name: "Aceitar" });

    const caixaRecusar = await recusar.boundingBox();
    const caixaAceitar = await aceitar.boundingBox();

    expect(caixaRecusar?.height).toBe(caixaAceitar?.height);
    expect(await recusar.evaluate((el) => el.className)).toBe(
      await aceitar.evaluate((el) => el.className),
    );
  });
});

test.describe("sem publicidade", () => {
  test.use({ storageState: SEM_CONSENTIMENTO });

  test("aceitar tudo não traz anúncio nenhum", async ({ page }) => {
    // A plataforma não exibe publicidade (ADR-0025). O aceite é o estado mais
    // permissivo que existe, e nem nele aparece anúncio: não sobrou nenhum
    // interruptor que ligue a publicidade de volta.
    await page.goto("/anuncios");
    await page.getByRole("button", { name: "Aceitar" }).click();
    await expect(page.getByRole("dialog", { name: /Consentimento/ })).toBeHidden();

    await expect(page.locator('aside[aria-label="Publicidade"]')).toHaveCount(0);
    await expect(page.locator("ins.adsbygoogle")).toHaveCount(0);

    // A busca de pedidos era a página que o desenho antigo protegia da
    // publicidade por regra; hoje não há regra a aplicar, e é a mesma resposta.
    await page.goto("/anuncios?intent=need");
    await expect(page.locator('aside[aria-label="Publicidade"]')).toHaveCount(0);

    await page
      .getByRole("link", { name: /notebook/i })
      .first()
      .click();
    await expect(page.locator('aside[aria-label="Publicidade"]')).toHaveCount(0);
  });
});

test.describe("com escolha já registrada", () => {
  test.use({ storageState: ANONYMOUS });

  test("o banner não reaparece", async ({ page }) => {
    await page.goto("/anuncios");
    await expect(page.getByRole("dialog", { name: /Consentimento/ })).toBeHidden();
  });
});
