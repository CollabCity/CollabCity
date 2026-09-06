"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ACCEPT_ALL,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  REJECT_ALL,
  serializeConsent,
} from "@/lib/consent";

/**
 * Grava a escolha de consentimento.
 *
 * No servidor, e não com `document.cookie`, por três motivos: o banner passa a
 * funcionar sem JavaScript, o cookie é gravado com os atributos certos em um
 * lugar só, e a revalidação já devolve a página com — ou sem — os scripts, sem
 * precisar recarregar à mão.
 */
export async function setConsent(formData: FormData): Promise<void> {
  const decision = formData.get("decision");
  const consent = decision === "accept" ? ACCEPT_ALL : REJECT_ALL;

  const store = await cookies();
  store.set(CONSENT_COOKIE, serializeConsent(consent), {
    path: "/",
    maxAge: CONSENT_MAX_AGE_SECONDS,
    sameSite: "lax",
    // Sem `httpOnly`: nada aqui é segredo, e deixar legível ao cliente permite
    // que uma extensão ou o próprio dono da conta inspecione o que foi salvo.
    httpOnly: false,
  });

  revalidatePath("/", "layout");
}

/** Apaga a escolha, para que o banner volte a perguntar. */
export async function clearConsent(): Promise<void> {
  const store = await cookies();
  store.delete(CONSENT_COOKIE);
  revalidatePath("/", "layout");
}
