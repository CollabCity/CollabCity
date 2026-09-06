import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { activeSuspension } from "@/server/queries/reports";
import { auth } from "./auth";

/**
 * Sessão do pedido atual. `cache` garante uma única leitura por render, mesmo
 * quando vários Server Components pedem a sessão.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * A suspensão em vigor de quem está logado. `cache` evita repetir a consulta
 * quando vários componentes do mesmo render perguntam.
 */
export const getActiveSuspension = cache(async (userId: string) => activeSuspension(userId));

/**
 * Sessão obrigatória. Sem login, leva à tela de entrada.
 *
 * É também onde a suspensão passa a valer. Toda página autenticada e **toda
 * Server Action** chamam esta função antes de qualquer escrita — bloquear aqui
 * cobre publicar, mensagens, avaliações, denúncias e moderação de uma vez, sem
 * depender de ninguém lembrar de checar caso a caso.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  if (await getActiveSuspension(session.user.id)) redirect("/conta-suspensa");

  return session;
}

/**
 * Garante que o usuário logado é dono do recurso.
 *
 * Responde 404 em vez de 403: um 403 confirmaria que o recurso existe, o que
 * permitiria enumerar identificadores alheios.
 */
export async function requireOwnership(ownerId: string) {
  const session = await requireSession();
  if (session.user.id !== ownerId) notFound();
  return session;
}
