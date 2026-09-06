import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { ACCOUNTS, ANONYMOUS, PASSWORD, storageStatePath } from "./accounts";

/**
 * Os direitos do art. 18 da LGPD: acesso, portabilidade e eliminação.
 *
 * Em série porque o segundo teste cria uma conta, conversa com a Ana e a
 * exclui — e o terceiro confere o que sobrou do lado dela.
 */
test.describe.configure({ mode: "serial" });
/**
 * Só em um projeto. Estes fluxos mexem em estado **global** do banco — o índice
 * parcial admite uma suspensão ativa por conta, e o expurgo varre todas as
 * contas vencidas —, então `chromium` e `mobile` rodando em paralelo derrubam um
 * ao outro. O comportamento aqui não depende do formato da tela.
 */
test.skip(({ isMobile }) => Boolean(isMobile), "fluxo com estado global do banco");

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

test.describe("exclusão", () => {
  // Estado com o consentimento já respondido. Sem ele o banner aparece, e além
  // de interceptar cliques ele quebra buscas por rótulo: `getByLabel` casa por
  // substring, e "publicidade" no `aria-label` do banner contém "cidade".
  test.use({ storageState: ANONYMOUS });

  test("a exclusão espera o prazo, pode ser cancelada e então expurga", async ({
    page,
    browser,
    request,
  }, testInfo) => {
    const sufixo = `${testInfo.project.name}-${Date.now()}`;
    const visitante = {
      nome: `Passageiro ${sufixo}`,
      email: `passageiro-${sufixo}@exemplo.test`,
    };
    const anuncio = `Empresto uma escada de alumínio ${sufixo}`;
    const mensagem = `Oi! Tenho interesse, ainda está disponível? (${sufixo})`;

    // 1. Alguém se cadastra, publica e conversa com a Ana.
    await page.goto("/cadastro");
    await page.getByLabel("Nome").fill(visitante.nome);
    await page.getByLabel("E-mail").fill(visitante.email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/painel/);

    await page.goto("/anuncios/novo");
    await page.getByLabel("Título").fill(anuncio);
    await page
      .getByLabel("Descrição")
      .fill("Escada de três metros parada na garagem. Empresto para quem precisa fazer um reparo.");
    await page.getByLabel("Cidade").fill("Recife");
    await page.getByLabel("Latitude").fill("-8.0476");
    await page.getByLabel("Longitude").fill("-34.8770");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("heading", { level: 1, name: anuncio })).toBeVisible();

    await page.goto("/anuncios");
    await page
      .getByRole("link", { name: /matemática/i })
      .first()
      .click();
    await page.getByLabel("Enviar mensagem").fill(mensagem);
    await page.getByRole("button", { name: "Iniciar conversa" }).click();
    await expect(page).toHaveURL(/\/mensagens\/[0-9a-f-]{36}/);

    // 2. Pede a exclusão. O e-mail errado não serve.
    await page.goto("/painel/meus-dados");
    await page.getByRole("button", { name: "Quero excluir minha conta" }).click();
    await page.getByLabel(/para confirmar/).fill("outro@exemplo.test");
    await page.getByRole("button", { name: "Agendar exclusão" }).click();
    // Pelo texto, e não por `role="alert"`: o Toaster do layout também expõe uma
    // região com esse papel, e o seletor pegaria a dele, vazia.
    await expect(page.getByText(/exatamente o e-mail/)).toBeVisible();

    await page.getByLabel(/para confirmar/).fill(visitante.email);
    await page.getByRole("button", { name: "Agendar exclusão" }).click();

    // A sessão acaba junto: quem pediu para sair não fica logado.
    await expect(page).toHaveURL(/\/(\?conta=exclusao-agendada)?$/, { timeout: 15_000 });
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar/);

    // 3. O anúncio sai do ar imediatamente, antes de qualquer expurgo.
    await page.goto(`/anuncios?q=${encodeURIComponent(`escada de alumínio ${sufixo}`)}`);
    await expect(page.getByRole("main").getByText(anuncio)).toBeHidden();

    // 4. Dentro do prazo, dá para voltar atrás.
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(visitante.email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/painel/);

    await page.goto("/painel/meus-dados");
    await expect(page.getByText("Exclusão marcada para")).toBeVisible();
    await page.getByRole("button", { name: /Cancelar exclusão/ }).click();
    await expect(page.getByRole("button", { name: "Quero excluir minha conta" })).toBeVisible({
      timeout: 15_000,
    });

    // O anúncio volta.
    await page.goto(`/anuncios?q=${encodeURIComponent(`escada de alumínio ${sufixo}`)}`);
    await expect(page.getByRole("main").getByText(anuncio)).toBeVisible();

    // 5. Pede de novo e deixa o expurgo rodar.
    await page.goto("/painel/meus-dados");
    await page.getByRole("button", { name: "Quero excluir minha conta" }).click();
    await page.getByLabel(/para confirmar/).fill(visitante.email);
    await page.getByRole("button", { name: "Agendar exclusão" }).click();
    await expect(page).toHaveURL(/\/(\?conta=exclusao-agendada)?$/, { timeout: 15_000 });

    // Sem o segredo, a rota de manutenção não existe.
    const semSegredo = await request.post("/api/manutencao/expurgo");
    expect(semSegredo.status()).toBe(404);

    const expurgo = await request.post("/api/manutencao/expurgo", {
      headers: { Authorization: "Bearer segredo-de-teste" },
    });
    expect(expurgo.status()).toBe(200);

    // 6. As credenciais deixam de valer.
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(visitante.email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("inválidos");

    // 7. Do lado da Ana, a conversa continua inteira — com o autor anonimizado.
    const anaContext = await browser.newContext({ storageState: storageStatePath("ana") });
    const ana = await anaContext.newPage();
    await ana.goto("/mensagens");

    const conversa = ana.getByRole("link").filter({ hasText: "Membro removido" }).first();
    await expect(conversa).toBeVisible();
    await conversa.click();

    await expect(ana.getByText(mensagem)).toBeVisible();
    await expect(ana.getByText(visitante.nome)).toBeHidden();
    await anaContext.close();
  });
});
