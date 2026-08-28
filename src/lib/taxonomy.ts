import type { ExchangeMode, ListingIntent, ListingStatus, ResourceType } from "@/lib/types";

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
