import Script from "next/script";
import { env } from "@/lib/env";

/**
 * Google Analytics, carregado **apenas** depois do consentimento.
 *
 * Não usa o Consent Mode do Google, que carrega a biblioteca com sinais
 * negados: aqui o script simplesmente não entra na página. É mais simples de
 * auditar — ou a tag está no HTML, ou não está — e não depende de a biblioteca
 * respeitar um sinal.
 */
export function Analytics({ granted }: { granted: boolean }) {
  if (!granted || !env.NEXT_PUBLIC_GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${env.NEXT_PUBLIC_GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
