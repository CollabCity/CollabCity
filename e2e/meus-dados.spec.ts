import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { ACCOUNTS, PASSWORD, storageStatePath } from "./accounts";

/**
 * Os direitos do art. 18 da LGPD: acesso, portabilidade e eliminação.
 *
 * Em série porque o segundo teste cria uma conta, conversa com a Ana e a
 * exclui — e o terceiro confere o que sobrou do lado dela.
 */
test.describe.configure({ mode: "serial" });

test.describe("exportação", () => {
  test.use({ storageState: storageStatePath("ana") });

  test("baixa um JSON com os próprios dados e sem os de terceiros", async ({ page }) => {
    await page.goto("/painel/meus-dados");
    await expect(page.getByRole("heading", { level: 1, name: "Meus dados" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Baixar arquivo" }).click();
    const arquivo = await download;

    expect(arquivo.suggestedFilename()).toMatch(/^collabcity-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);

    const caminho = await arquivo.path();
    const conteudo = JSON.parse(await readFile(caminho as string, "utf8"));

    expect(conteudo.conta.email).toBe(ACCOUNTS.ana.email);
    expect(Array.isArray(conteudo.anuncios)).toBe(true);
    expect(conteudo.anuncios.length).toBeGreaterThan(0);

    // Nenhum e-mail de terceiro no arquivo inteiro.
    const bruto = JSON.stringify(conteudo);
    expect(bruto).not.toContain(ACCOUNTS.bruno.email);
    expect(bruto).not.toContain(ACCOUNTS.carla.email);
  });

  test("a exportação exige autenticação", async ({ browser }) => {
    // Estado vazio explícito: um `newContext()` sem opções herda as do
    // `test.use` do bloco, e o contexto sairia autenticado como a Ana.
    const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const resposta = await anonimo.request.get("/api/meus-dados");
    expect(resposta.status()).toBe(401);
    await anonimo.close();
  });
});

test("excluir a conta anonimiza sem destruir o histórico de quem ficou", async ({
  page,
  browser,
}, testInfo) => {
  const sufixo = `${testInfo.project.name}-${Date.now()}`;
  const visitante = {
    nome: `Passageiro ${sufixo}`,
    email: `passageiro-${sufixo}@exemplo.test`,
  };
  const mensagem = `Oi! Tenho interesse, ainda está disponível? (${sufixo})`;

  // 1. Alguém se cadastra e conversa com a Ana.
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(visitante.nome);
  await page.getByLabel("E-mail").fill(visitante.email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel/);

  await page.goto("/anuncios");
  await page
    .getByRole("link", { name: /matemática/i })
    .first()
    .click();
  await page.getByLabel("Enviar mensagem").fill(mensagem);
  await page.getByRole("button", { name: "Iniciar conversa" }).click();
  await expect(page).toHaveURL(/\/mensagens\/[0-9a-f-]{36}/);

  // 2. A pessoa exclui a conta, confirmando com o próprio e-mail.
  await page.goto("/painel/meus-dados");
  await page.getByRole("button", { name: "Quero excluir minha conta" }).click();

  // O e-mail errado não serve.
  await page.getByLabel(/para confirmar/).fill("outro@exemplo.test");
  await page.getByRole("button", { name: "Excluir permanentemente" }).click();
  // Pelo texto, e não por `role="alert"`: o Toaster do layout também expõe uma
  // região com esse papel, e o seletor pegaria a dele, vazia.
  await expect(page.getByText(/exatamente o e-mail/)).toBeVisible();

  await page.getByLabel(/para confirmar/).fill(visitante.email);
  await page.getByRole("button", { name: "Excluir permanentemente" }).click();

  // A sessão acaba junto: o painel volta a pedir login.
  await expect(page).toHaveURL(/\/(\?conta=excluida)?$/, { timeout: 15_000 });
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar/);

  // 3. Do lado da Ana, a conversa continua inteira — com o autor anonimizado.
  const anaContext = await browser.newContext({ storageState: storageStatePath("ana") });
  const ana = await anaContext.newPage();
  await ana.goto("/mensagens");

  const conversa = ana.getByRole("link").filter({ hasText: "Membro removido" }).first();
  await expect(conversa).toBeVisible();
  await conversa.click();

  // A mensagem sobrevive; o nome de quem escreveu, não.
  await expect(ana.getByText(mensagem)).toBeVisible();
  await expect(ana.getByText(visitante.nome)).toBeHidden();
  await anaContext.close();
});
