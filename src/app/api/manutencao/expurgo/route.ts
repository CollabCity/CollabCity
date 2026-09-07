import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { purgeDueAccounts } from "@/server/account-purge";

/**
 * Executa o expurgo das contas cujo prazo de arrependimento venceu.
 *
 * É rota, e não processo agendado dentro da aplicação, porque a premissa de
 * camada gratuita da ADR-0010 não comporta um serviço a mais, e porque um
 * temporizador interno rodaria uma vez por réplica. Quem chama é o agendador
 * de fora — o cron da Vercel, ou a esteira do GitHub como alternativa.
 *
 * Aceita `GET` e `POST` porque os dois agendadores diferem: a Vercel invoca com
 * `GET`, e a chamada por `curl` da esteira usa `POST`. A operação é a mesma.
 *
 * Sem segredo configurado a rota **não existe**: responde 404 como qualquer
 * endereço inválido. Deixar um endereço destrutivo respondendo "não
 * autorizado" já confirma que ele está ali.
 */
function authorized(request: Request): boolean {
  // `CRON_SECRET` é o nome que a Vercel injeta; `MAINTENANCE_SECRET` é o nosso.
  // Aceitar os dois evita configurar a mesma senha duas vezes.
  const expected = env.MAINTENANCE_SECRET || env.CRON_SECRET;
  if (!expected) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  // Comparação de tempo constante: comparar com `===` vaza, pelo tempo de
  // resposta, quantos caracteres iniciais do segredo estavam certos.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Not Found", { status: 404 });

  const { purged } = await purgeDueAccounts();
  return Response.json({ expurgadas: purged });
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
