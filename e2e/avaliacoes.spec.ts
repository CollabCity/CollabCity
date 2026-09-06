import { expect, test } from "@playwright/test";
import { ACCOUNTS, ANONYMOUS, storageStatePath } from "./accounts";

// Por padrão, os testes deste arquivo agem como a Ana.
test.use({ storageState: storageStatePath("ana") });

test.describe("sem estar autenticado", () => {
  test.use({ storageState: ANONYMOUS });

  test("a página de segurança diz o que a plataforma não faz", async ({ page }) => {
    await page.goto("/seguranca");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Segurança e responsabilidade",
    );
    await expect(page.getByRole("heading", { name: "O que o CollabCity não faz" })).toBeVisible();
    await expect(page.getByText("não intermedia pagamentos").first()).toBeVisible();
  });

  test("o anúncio avisa que a plataforma não participa da negociação", async ({ page }) => {
    await page.goto("/anuncios");
    await page
      .getByRole("link", { name: /matemática/i })
      .first()
      .click();

    await expect(page.getByText("apenas hospeda o anúncio")).toBeVisible();
    await expect(page.getByRole("link", { name: "Veja como se proteger" })).toBeVisible();
  });

  test("o perfil público mostra sinais de confiança sem expor dados privados", async ({ page }) => {
    await page.goto("/anuncios");
    await page
      .getByRole("link", { name: /matemática/i })
      .first()
      .click();
    await page.getByRole("link", { name: ACCOUNTS.ana.name }).click();

    await expect(page).toHaveURL(/\/membros\//);
    await expect(page.getByRole("heading", { level: 1, name: ACCOUNTS.ana.name })).toBeVisible();
    await expect(page.getByText("desde")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Anúncios abertos" })).toBeVisible();

    // O e-mail e as coordenadas ficam de fora da consulta pública de propósito.
    await expect(page.locator("body")).not.toContainText(ACCOUNTS.ana.email);
    await expect(page.locator("body")).not.toContainText("-8.04");
  });
});

test("uma avaliação só aparece depois que as duas partes avaliam", async ({
  page,
  browser,
}, testInfo) => {
  // O anúncio é criado aqui, com título único. `chromium` e `mobile` rodam em
  // paralelo contra o mesmo banco, e a unicidade `(listing_id, requester_id)`
  // faria os dois projetos disputarem a mesma conversa se o alvo fosse fixo.
  const sufixo = `${testInfo.project.name}-${Date.now()}`;
  const titulo = `Aulas de reforço de física ${sufixo}`;
  const comentario = `Combinou tudo pelo chat e cumpriu o combinado (${sufixo}).`;

  // 1. A Ana publica.
  await page.goto("/anuncios/novo");
  await page.getByLabel("Título").fill(titulo);
  await page
    .getByLabel("Descrição")
    .fill(
      "Ofereço duas noites por semana de reforço de física para o ensino médio, na biblioteca.",
    );
  await page.getByLabel("Cidade").fill("Recife");
  await page.getByLabel("Latitude").fill("-8.0476");
  await page.getByLabel("Longitude").fill("-34.8770");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  const anuncio = page.url();

  // 2. O Bruno procura a Ana por causa do anúncio.
  const brunoContext = await browser.newContext({ storageState: storageStatePath("bruno") });
  const bruno = await brunoContext.newPage();
  await bruno.goto(anuncio);
  await bruno.getByLabel("Enviar mensagem").fill("Oi, Ana! Ainda há vaga na turma?");
  await bruno.getByRole("button", { name: "Iniciar conversa" }).click();
  await expect(bruno).toHaveURL(/\/mensagens\/[0-9a-f-]{36}/);
  const conversa = bruno.url();

  // Só uma pessoa falou: ainda não há o que avaliar.
  await expect(bruno.getByRole("heading", { name: "Avaliação" })).toBeHidden();

  // 3. A Ana responde.
  await page.goto("/mensagens");
  await page.getByRole("link").filter({ hasText: titulo }).first().click();
  await page.getByLabel("Escrever mensagem").fill("Oi! Tenho sim, nas terças às 19h.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Oi! Tenho sim")).toBeVisible();

  // 4. Agora que os dois falaram, o Bruno pode avaliar.
  await bruno.goto(conversa);
  await expect(bruno.getByRole("heading", { name: "Avaliação" })).toBeVisible();

  // O rádio fica visualmente escondido atrás da estrela: o clique vai no
  // rótulo, que é o que uma pessoa acerta, e o navegador repassa ao rádio.
  await bruno.getByTitle("Excelente").click();
  await expect(bruno.getByRole("radio", { name: /Excelente/ })).toBeChecked();
  await bruno.getByLabel("Comentário (opcional)").fill(comentario);
  await bruno.getByRole("button", { name: "Enviar avaliação" }).click();

  // O `revalidatePath` da ação substitui o formulário pelo estado do servidor,
  // que já explica o prazo — por isso a asserção é sobre esse texto, e não
  // sobre a mensagem de sucesso do cliente, que nem chega a ser exibida.
  await expect(bruno.getByText(/Você já avaliou/)).toBeVisible();
  await expect(bruno.getByRole("button", { name: "Enviar avaliação" })).toBeHidden();

  // 5. O prazo às cegas: a Ana não avaliou de volta, então o comentário
  // recém-escrito ainda não pode aparecer no perfil dela.
  await bruno.goto(anuncio);
  await bruno.getByRole("link", { name: ACCOUNTS.ana.name }).click();
  await expect(bruno).toHaveURL(/\/membros\//);
  await expect(bruno.locator("body")).not.toContainText(comentario);

  await brunoContext.close();
});
