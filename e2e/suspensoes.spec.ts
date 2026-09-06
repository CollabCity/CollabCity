import { expect, test } from "@playwright/test";
import { ACCOUNTS, storageStatePath } from "./accounts";

/**
 * O ciclo de vida de uma suspensão, incluindo as duas formas de desfazê-la:
 * reativação direta e contestação aceita.
 *
 * Arquivo único e em série de propósito. O índice parcial
 * `suspensions_active_key` admite **uma** suspensão em vigor por conta, então
 * dois arquivos mexendo na mesma pessoa em paralelo derrubariam um ao outro.
 */
test.describe.configure({ mode: "serial" });
/**
 * Só em um projeto. Estes fluxos mexem em estado **global** do banco — o índice
 * parcial admite uma suspensão ativa por conta, e o expurgo varre todas as
 * contas vencidas —, então `chromium` e `mobile` rodando em paralelo derrubam um
 * ao outro. O comportamento aqui não depende do formato da tela.
 */
test.skip(({ isMobile }) => Boolean(isMobile), "fluxo com estado global do banco");

const MOTIVO = "Pediu pagamento antecipado em três conversas diferentes, sem entregar nada.";
const ALEGACAO =
  "As conversas citadas eram sobre uma vaquinha de bairro combinada em assembleia, e não sobre venda. Posso mostrar a ata.";

/** Suspende a conta alvo a partir da denúncia que o seed deixa em aberto. */
async function suspender(page: import("@playwright/test").Page) {
  await page.goto("/painel/denuncias");
  const cartao = page.locator("li").filter({ hasText: "confundiu com outro anúncio" }).first();

  await cartao
    .getByRole("button", { name: new RegExp(`Suspender ${ACCOUNTS.carla.name}`) })
    .click();
  await cartao.getByLabel("Motivo da suspensão").fill(MOTIVO);
  await cartao.getByRole("button", { name: "Confirmar suspensão" }).click();

  // Prazo maior que o padrão: a ação grava e revalida três rotas.
  await expect(page.getByRole("status")).toContainText("Conta suspensa", { timeout: 15_000 });
}

test.describe("como membro comum", () => {
  test.use({ storageState: storageStatePath("ana") });

  test("as abas de equipe não existem", async ({ page }) => {
    await page.goto("/painel");
    await expect(page.getByRole("link", { name: "Suspensões" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Contestações" })).toBeHidden();

    await page.goto("/painel/suspensoes");
    await expect(page.getByRole("heading", { name: "Contas suspensas" })).toBeHidden();
  });
});

test.describe("como administração", () => {
  test.use({ storageState: storageStatePath("moderacao") });

  test("suspender bloqueia a conta e tira os anúncios do ar", async ({ page, browser }) => {
    const antes = await browser.newContext({ storageState: storageStatePath("carla") });
    const carla = await antes.newPage();
    await carla.goto("/painel");
    const titulo = await carla.locator("main li a").first().innerText();
    await antes.close();

    await page.goto("/anuncios");
    await expect(page.getByRole("main").getByText(titulo).first()).toBeVisible();

    await suspender(page);

    // A pessoa suspensa é barrada em qualquer rota autenticada e vê o motivo.
    const depois = await browser.newContext({ storageState: storageStatePath("carla") });
    const suspensa = await depois.newPage();
    await suspensa.goto("/anuncios/novo");
    await expect(suspensa).toHaveURL(/\/conta-suspensa/);
    await expect(suspensa.getByRole("heading", { name: "Sua conta está suspensa" })).toBeVisible();
    await expect(suspensa.getByText(MOTIVO)).toBeVisible();
    await depois.close();

    await page.goto("/anuncios");
    await expect(page.getByRole("main").getByText(titulo)).toBeHidden();
  });

  test("reativar pela tela de suspensões devolve o acesso", async ({ page, browser }) => {
    await page.goto("/painel/suspensoes");
    const cartao = page.locator("li").filter({ hasText: ACCOUNTS.carla.name }).first();
    await expect(cartao).toBeVisible();

    await cartao.getByLabel(/Nota da reativação/).fill("Conversa esclarecida com as duas partes.");
    await cartao.getByRole("button", { name: "Reativar conta" }).click();

    // Esperar o cartão sumir, e não navegar em seguida: uma navegação logo após
    // o clique aborta a ação em voo, e o teste passaria a medir a corrida.
    await expect(cartao).toBeHidden({ timeout: 15_000 });

    const volta = await browser.newContext({ storageState: storageStatePath("carla") });
    const carla = await volta.newPage();
    await carla.goto("/painel");
    await expect(carla).toHaveURL(/\/painel$/);
    await volta.close();
  });

  test("suspende de novo, para o ciclo da contestação", async ({ page }) => {
    await suspender(page);
  });
});

test.describe("como a pessoa suspensa", () => {
  test.use({ storageState: storageStatePath("carla") });

  test("contesta a decisão uma vez", async ({ page }) => {
    await page.goto("/conta-suspensa");
    await page.getByRole("button", { name: "Contestar esta decisão" }).click();
    await page.getByLabel(/O que a moderação deixou de considerar/).fill(ALEGACAO);
    await page.getByRole("button", { name: "Enviar contestação" }).click();

    // A revalidação troca o formulário pelo estado do servidor, que já informa a
    // situação — por isso a asserção é sobre esse texto, e não sobre a mensagem
    // de sucesso do cliente, que é substituída antes de ser lida.
    await expect(page.getByText("em análise")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Contestar esta decisão" })).toBeHidden();

    await page.goto("/conta-suspensa");
    await expect(page.getByText("em análise")).toBeVisible();
  });
});

test.describe("quem decidiu não julga o próprio recurso", () => {
  test.use({ storageState: storageStatePath("moderacao") });

  test("a administração que suspendeu não resolve a contestação", async ({ page }) => {
    await page.goto("/painel/contestacoes");
    const cartao = page.locator("li").filter({ hasText: ALEGACAO }).first();

    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText("Esta decisão foi sua");
    await expect(cartao.getByRole("button", { name: "Aceitar e desfazer" })).toBeHidden();
  });
});

test.describe("como a revisão", () => {
  test.use({ storageState: storageStatePath("revisao") });

  test("outra pessoa da moderação aceita e a conta volta", async ({ page, browser }) => {
    await page.goto("/painel/contestacoes");
    const cartao = page.locator("li").filter({ hasText: ALEGACAO }).first();

    await expect(cartao).toBeVisible();
    await cartao
      .getByLabel(/Resposta à contestação/)
      .fill("Ata da assembleia confere com o relato. Suspensão desfeita.");
    await cartao.getByRole("button", { name: "Aceitar e desfazer" }).click();

    await expect(cartao).toBeHidden({ timeout: 15_000 });

    const volta = await browser.newContext({ storageState: storageStatePath("carla") });
    const carla = await volta.newPage();
    await carla.goto("/painel");
    await expect(carla).toHaveURL(/\/painel$/);
    await volta.close();
  });
});
