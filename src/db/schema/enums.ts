import { pgEnum } from "drizzle-orm/pg-core";

/** Um anúncio ou pede ajuda (`need`) ou oferece algo (`offer`). */
export const listingIntent = pgEnum("listing_intent", ["need", "offer"]);

/** Natureza do que está sendo pedido ou oferecido. */
export const resourceType = pgEnum("resource_type", ["skill", "item", "volunteer"]);

/** Como a troca acontece: doação, permuta ou pagamento. */
export const exchangeMode = pgEnum("exchange_mode", ["free", "trade", "paid"]);

/** Ciclo de vida de um anúncio. */
export const listingStatus = pgEnum("listing_status", ["draft", "open", "fulfilled", "archived"]);
