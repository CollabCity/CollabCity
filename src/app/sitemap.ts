import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { db } from "@/db";
import { listings } from "@/db/schema";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Gerado a cada requisição, com cache de uma hora. Prerenderizar exigiria um
 * banco disponível durante o build, o que a esteira de CI não garante.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const open = await db
    .select({ id: listings.id, updatedAt: listings.updatedAt })
    .from(listings)
    .where(eq(listings.status, "open"))
    .limit(5000);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/anuncios`, changeFrequency: "hourly", priority: 0.9 },
    ...open.map((listing) => ({
      url: `${base}/anuncios/${listing.id}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
