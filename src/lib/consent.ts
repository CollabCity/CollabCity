/**
 * Consentimento para medição e publicidade.
 *
 * O guia de cookies da ANPD admite legítimo interesse para métricas
 * anonimizadas e sem terceiros — não é o caso aqui: o Google Analytics manda
 * dados para o Google, e o AdSense usa cookies de publicidade. Com
 * compartilhamento com terceiro, o consentimento é a base segura, e por isso
 * **nada carrega antes da escolha**.
 *
 * A escolha vive em cookie, e não em `localStorage`, para que o servidor
 * também a enxergue: assim uma pessoa que recusou não recebe nem o espaço
 * reservado do anúncio no HTML.
 */

export const CONSENT_COOKIE = "collabcity-consentimento";

/**
 * Muda quando o que é coletado muda.
 *
 * Uma escolha feita sob outra descrição não vale para a nova: subir a versão
 * faz o banner voltar a perguntar, em vez de herdar um "sim" dado para outra
 * coisa.
 */
export const CONSENT_VERSION = 1;

/** Seis meses. Prazo comum de renovação de consentimento. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type ConsentChoice = "granted" | "denied";

export type Consent = {
  version: number;
  /** Medição de audiência. */
  analytics: ConsentChoice;
  /** Publicidade e os cookies dela. */
  ads: ConsentChoice;
};

export const ACCEPT_ALL: Consent = {
  version: CONSENT_VERSION,
  analytics: "granted",
  ads: "granted",
};

export const REJECT_ALL: Consent = {
  version: CONSENT_VERSION,
  analytics: "denied",
  ads: "denied",
};

/**
 * Lê a escolha guardada. Devolve `null` quando não há escolha **ou** quando ela
 * foi feita sob uma versão anterior — nos dois casos é preciso perguntar.
 *
 * Nunca lança: o valor vem do navegador de quem visita e pode chegar
 * corrompido, truncado ou escrito à mão.
 */
export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    if (value.version !== CONSENT_VERSION) return null;

    const analytics = value.analytics === "granted" ? "granted" : "denied";
    const ads = value.ads === "granted" ? "granted" : "denied";

    return { version: CONSENT_VERSION, analytics, ads };
  } catch {
    return null;
  }
}

export function serializeConsent(consent: Consent): string {
  return encodeURIComponent(JSON.stringify(consent));
}

/** Se a medição pode carregar. */
export function allowsAnalytics(consent: Consent | null): boolean {
  return consent?.analytics === "granted";
}

/** Se a publicidade pode carregar. */
export function allowsAds(consent: Consent | null): boolean {
  return consent?.ads === "granted";
}
