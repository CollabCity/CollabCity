/**
 * Prazo de arrependimento da exclusão de conta.
 *
 * Trinta dias é o intervalo em que a pessoa ainda reconhece a decisão como
 * sua. Mais curto não protege de um clique impulsivo; muito mais longo adia
 * sem propósito um direito que a lei trata como exercível.
 */
export const DEFAULT_DELETION_GRACE_DAYS = 30;

const DAY_IN_MS = 86_400_000;

/**
 * Mantido puro, sem ler `env`: este módulo é importado por componentes de
 * cliente, e o valor configurado vem de quem chama, do lado do servidor.
 */
export function deletionDeadline(
  graceDays: number = DEFAULT_DELETION_GRACE_DAYS,
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + graceDays * DAY_IN_MS);
}

/** Dias inteiros que faltam, nunca negativo. */
export function daysUntil(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / DAY_IN_MS));
}

/** "em 30 dias" / "amanhã" / "hoje", para o aviso. */
export function formatDeadline(deadline: Date, now: Date = new Date()): string {
  const days = daysUntil(deadline, now);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}
