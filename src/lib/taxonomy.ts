import type {
  ExchangeMode,
  ListingIntent,
  ListingStatus,
  ReportReason,
  ReportStatus,
  ReportTarget,
  ResourceType,
} from "@/lib/types";

/**
 * Rótulos em português para os enums do banco.
 *
 * O banco guarda o valor em inglês porque é o identificador estável; a tradução
 * fica na borda de apresentação, para que trocar o texto não exija migração.
 */
export const INTENT_LABELS: Record<ListingIntent, string> = {
  need: "Preciso de ajuda",
  offer: "Posso ajudar",
};

export const INTENT_SHORT: Record<ListingIntent, string> = {
  need: "Pedido",
  offer: "Oferta",
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  skill: "Habilidade",
  item: "Item",
  volunteer: "Voluntariado",
};

export const EXCHANGE_LABELS: Record<ExchangeMode, string> = {
  free: "Doação",
  trade: "Troca",
  paid: "Pago",
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Rascunho",
  open: "Aberto",
  fulfilled: "Atendido",
  archived: "Arquivado",
};

/** Pedidos usam o laranja da paleta; ofertas, o violeta. */
export function intentVariant(intent: ListingIntent): "highlight" | "primary" {
  return intent === "need" ? "highlight" : "primary";
}

/**
 * Motivos de denúncia, na ordem em que aparecem no formulário.
 *
 * A ordem não é alfabética nem aleatória: os motivos que exigem ação urgente
 * vêm primeiro, para que quem está diante de um golpe ou de assédio não role a
 * lista atrás da opção certa.
 */
export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  {
    value: "scam",
    label: "Golpe ou fraude",
    hint: "Pedido de pagamento antecipado, comprovante falso, cobrança que não corresponde ao combinado.",
  },
  {
    value: "harassment",
    label: "Assédio ou discurso de ódio",
    hint: "Ameaça, insulto, constrangimento ou ataque a uma pessoa ou grupo.",
  },
  {
    value: "illegal",
    label: "Conteúdo ilegal",
    hint: "Venda de item proibido, exploração de pessoas, qualquer coisa que a lei vede.",
  },
  {
    value: "misleading",
    label: "Informação enganosa",
    hint: "O anúncio descreve algo diferente do que é, ou promete o que não entrega.",
  },
  {
    value: "spam",
    label: "Spam ou repetição",
    hint: "Publicação em massa, propaganda fora do lugar, o mesmo anúncio várias vezes.",
  },
  {
    value: "other",
    label: "Outro motivo",
    hint: "Descreva abaixo o que aconteceu.",
  },
];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label]),
) as Record<ReportReason, string>;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Em aberto",
  upheld: "Acolhida",
  dismissed: "Descartada",
};

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  listing: "Anúncio",
  review: "Avaliação",
  conversation: "Conversa",
};
