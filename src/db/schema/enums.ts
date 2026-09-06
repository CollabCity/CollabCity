import { pgEnum } from "drizzle-orm/pg-core";

/** Um anúncio ou pede ajuda (`need`) ou oferece algo (`offer`). */
export const listingIntent = pgEnum("listing_intent", ["need", "offer"]);

/** Natureza do que está sendo pedido ou oferecido. */
export const resourceType = pgEnum("resource_type", ["skill", "item", "volunteer"]);

/** Como a troca acontece: doação, permuta ou pagamento. */
export const exchangeMode = pgEnum("exchange_mode", ["free", "trade", "paid"]);

/** Ciclo de vida de um anúncio. */
export const listingStatus = pgEnum("listing_status", ["draft", "open", "fulfilled", "archived"]);

/** Por que um conteúdo está sendo denunciado. */
export const reportReason = pgEnum("report_reason", [
  "scam",
  "illegal",
  "harassment",
  "spam",
  "misleading",
  "other",
]);

/** Situação de uma denúncia na fila de moderação. */
export const reportStatus = pgEnum("report_status", ["open", "upheld", "dismissed"]);

/**
 * O que alguém da equipe pode fazer.
 *
 * `admin` é um superconjunto de `moderator`: além de resolver denúncias, pode
 * suspender e reativar contas.
 */
export const staffRole = pgEnum("staff_role", ["moderator", "admin"]);

/** Situação de uma contestação de decisão da moderação. */
export const appealStatus = pgEnum("appeal_status", ["open", "accepted", "rejected"]);
