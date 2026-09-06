import { cookies } from "next/headers";
import { cache } from "react";
import { CONSENT_COOKIE, type Consent, parseConsent } from "@/lib/consent";

/**
 * A escolha de consentimento, lida no servidor.
 *
 * Fica em arquivo separado de `consent.ts` porque `next/headers` só existe no
 * servidor, e aquele módulo é importado também pelo banner, que é cliente.
 *
 * `cache` garante uma leitura por render, como em `getSession`.
 */
export const getConsent = cache(async (): Promise<Consent | null> => {
  const store = await cookies();
  return parseConsent(store.get(CONSENT_COOKIE)?.value);
});
