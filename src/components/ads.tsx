import Script from "next/script";
import { AdSlot } from "@/components/ad-slot";
import { allowsAds } from "@/lib/consent";
import { getConsent } from "@/lib/consent-server";
import { env } from "@/lib/env";

/** Biblioteca do AdSense, uma vez por página e só com consentimento. */
export async function AdSenseLoader() {
  const consent = await getConsent();
  if (!allowsAds(consent) || !env.NEXT_PUBLIC_ADSENSE_CLIENT) return null;

  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}

/**
 * Espaço de anúncio, decidido no servidor.
 *
 * `intent` existe para uma regra de produto: **não há publicidade em página de
 * pedido**. Alguém pedindo um notebook doado não vira inventário de anunciante,
 * e a monetização fica onde há intenção comercial.
 */
export async function Ad({
  intent,
  className,
}: {
  intent?: "need" | "offer" | undefined;
  className?: string;
}) {
  if (intent === "need") return null;

  const consent = await getConsent();
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = env.NEXT_PUBLIC_ADSENSE_SLOT;

  if (!allowsAds(consent) || !client || !slot) return null;

  return <AdSlot client={client} slot={slot} className={className} />;
}
