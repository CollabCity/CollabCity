import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/**
 * Sessão do pedido atual. `cache` garante uma única leitura por render, mesmo
 * quando vários Server Components pedem a sessão.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Sessão obrigatória. Sem login, leva à tela de entrada. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/entrar");
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
