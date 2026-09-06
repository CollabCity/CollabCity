/**
 * Sinais de confiança exibidos no perfil público.
 *
 * Nenhum deles é uma avaliação: são fatos derivados do que a plataforma já
 * registra — quando a pessoa entrou, quantos anúncios mantém abertos, com que
 * frequência responde a quem a procura. A decisão de começar por aqui, em vez
 * de por uma nota, está na ADR-0016.
 */

/**
 * Conversas recebidas antes de a taxa de resposta ser exibida.
 *
 * Com uma ou duas conversas, uma única mensagem sem resposta vira "0% de
 * resposta" — que se lê como acusação, não como medida. Abaixo do mínimo o
 * perfil simplesmente não afirma nada sobre resposta.
 */
export const MIN_CONVERSATIONS_FOR_RESPONSE_RATE = 3;

/** Janela em que um membro ainda é apresentado como recém-chegado. */
export const NEW_MEMBER_DAYS = 30;

/**
 * Dias que uma avaliação fica invisível esperando a da outra parte.
 *
 * Enquanto as duas não chegam, nenhuma aparece — e passado o prazo, aparece o
 * que houver. Sem isso, quem avalia primeiro fica exposto à retaliação de quem
 * avalia depois, e o resultado é a inflação de notas que se vê nas plataformas
 * sem essa proteção. É o mesmo desenho do Airbnb. Ver ADR-0016.
 */
export const REVIEW_BLIND_DAYS = 14;

/** Limite do comentário, igual ao que a OLX adota. */
export const REVIEW_COMMENT_MAX = 300;

/** Notas possíveis, da pior para a melhor. */
export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export type Rating = (typeof RATING_VALUES)[number];

/** Rótulo de cada nota, para dar sentido à estrela e servir de texto acessível. */
export const RATING_LABELS: Record<Rating, string> = {
  1: "Ruim",
  2: "Regular",
  3: "Boa",
  4: "Muito boa",
  5: "Excelente",
};

const DAY_IN_MS = 86_400_000;

export type ResponseStats = {
  /** Conversas iniciadas por outras pessoas nos anúncios do membro. */
  received: number;
  /** Quantas dessas conversas receberam ao menos uma resposta do membro. */
  answered: number;
  /** Mediana, em segundos, entre o início da conversa e a primeira resposta. */
  medianSeconds: number | null;
};

/**
 * Proporção de conversas respondidas, de 0 a 1, ou `null` quando ainda não há
 * conversas suficientes para que o número signifique alguma coisa.
 */
export function responseRate(stats: ResponseStats): number | null {
  if (stats.received < MIN_CONVERSATIONS_FOR_RESPONSE_RATE) return null;
  return stats.answered / stats.received;
}

/**
 * Tempo típico de resposta em faixas largas.
 *
 * A imprecisão é deliberada: "em cerca de um dia" é honesto sobre a variação
 * que uma mediana esconde, enquanto "em 19 h" sugere uma regularidade que não
 * existe — e, com poucas conversas, também aponta a rotina da pessoa.
 */
export function formatResponseTime(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  if (seconds < 3_600) return "em menos de uma hora";
  if (seconds < 86_400) return `em cerca de ${Math.round(seconds / 3_600)} horas`;
  if (seconds < 172_800) return "em cerca de um dia";
  return `em cerca de ${Math.round(seconds / 86_400)} dias`;
}

/** "desde março de 2026", para a data de entrada do membro. */
export function formatMemberSince(date: Date): string {
  return `desde ${date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
}

/**
 * Um perfil recente é apresentado como "novo por aqui", nunca como "sem
 * avaliações": a segunda forma lê a ausência de histórico como histórico ruim,
 * e deixaria quem acabou de chegar sem a primeira troca.
 */
export function isNewMember(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < NEW_MEMBER_DAYS * DAY_IN_MS;
}

/**
 * Média com uma casa decimal e vírgula, como se escreve em português.
 *
 * Uma casa é o limite do que a média significa: com poucas avaliações, a
 * segunda casa oscila a cada nota nova sem dizer nada sobre a pessoa.
 */
export function formatRating(average: number | null | undefined): string | null {
  if (average === null || average === undefined) return null;
  return average.toFixed(1).replace(".", ",");
}

/** "1 avaliação" / "12 avaliações", para não deixar a média sozinha na tela. */
export function formatReviewCount(count: number): string {
  return count === 1 ? "1 avaliação" : `${count} avaliações`;
}
