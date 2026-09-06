import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { purgeDueAccounts } from "@/server/account-purge";

/**
 * Executa o expurgo das contas cujo prazo de arrependimento venceu.
 *
 * É rota, e não processo agendado dentro da aplicação, porque a premissa de
 * camada gratuita da ADR-0010 não comporta um serviço a mais. Quem chama é o
 * agendador de fora — a esteira do GitHub, uma vez por dia.
 *
 * Sem `MAINTENANCE_SECRET` a rota **não existe**: responde 404 como qualquer
 * endereço inválido. Deixar um endereço destrutivo respondendo "não
 * autorizado" já confirma que ele está ali.
 */
export async function POST(request: Request): Promise<Response> {
  const expected = env.MAINTENANCE_SECRET;
  if (!expected) return new Response("Not Found", { status: 404 });

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  // Comparação de tempo constante: comparar com `===` vaza, pelo tempo de
  // resposta, quantos caracteres iniciais do segredo estavam certos.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Not Found", { status: 404 });
  }

  const { purged } = await purgeDueAccounts();

  return Response.json({ expurgadas: purged });
}
