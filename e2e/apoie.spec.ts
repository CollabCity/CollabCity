import { expect, test } from "@playwright/test";
import { ANONYMOUS } from "./accounts";

test.use({ storageState: ANONYMOUS });

test.describe("apoio ao projeto", () => {
  test("o rodapé leva à página, que oferece os canais configurados", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Apoie o projeto" }).click();
    await expect(page.getByRole("heading", { name: "Apoie o projeto", level: 1 })).toBeVisible();

    // Os dois canais vêm da configuração do servidor de teste.
    const contribuir = page.getByRole("link", { name: "Fazer uma doação" });
    await expect(contribuir).toHaveAttribute("href", "https://exemplo.invalid/apoio");
    // Sai da plataforma: abrir em aba nova sem `noopener` daria à página de
    // destino acesso a esta por `window.opener`.
    await expect(contribuir).toHaveAttribute("target", "_blank");
    await expect(contribuir).toHaveAttribute("rel", /noopener/);

    await expect(page.getByText("apoio@exemplo.invalid")).toBeVisible();
  });

  test("a página diz que doar não compra vantagem", async ({ page }) => {
    // É a regra de produto que a página existe para sustentar: em ajuda mútua,
    // quem tem menos dinheiro costuma ser quem mais precisa ser visto.
    await page.goto("/apoie");

    await expect(page.getByRole("heading", { name: "Doar não compra nada" })).toBeVisible();
    await expect(page.getByText(/não.*ganha destaque na busca/)).toBeVisible();
  });

  test("a chave Pix pode ser copiada", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "permissão de área de transferência varia por navegador");

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/apoie");

    await page.getByRole("button", { name: "Copiar chave" }).click();

    await expect(page.getByRole("button", { name: "Copiada" })).toBeVisible();
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toBe("apoio@exemplo.invalid");
  });
});
