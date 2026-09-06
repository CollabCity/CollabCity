import { getSession } from "@/lib/session";
import { collectPersonalData } from "@/server/queries/personal-data";

/**
 * Exportação dos dados pessoais, em JSON.
 *
 * É rota, e não Server Action, porque o resultado é um **arquivo**: só uma
 * resposta HTTP carrega `Content-Disposition`, e é isso que faz o navegador
 * salvar em vez de exibir.
 *
 * Usa `getSession` em vez de `requireSession` porque uma resposta de API não
 * deve redirecionar para uma tela de login — quem não está autenticado recebe
 * 401 e pronto. Uma conta suspensa continua com o direito de exportar: a
 * suspensão limita o que se pode publicar, não o acesso aos próprios dados.
 */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const data = await collectPersonalData(session.user.id);
  const dia = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="collabcity-meus-dados-${dia}.json"`,
      // Nunca em cache: é o conteúdo mais sensível que a aplicação devolve.
      "Cache-Control": "no-store",
    },
  });
}
