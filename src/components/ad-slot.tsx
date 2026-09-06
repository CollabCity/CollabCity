"use client";

import { useEffect, useRef } from "react";

/**
 * Um espaço de anúncio do AdSense.
 *
 * Renderizado apenas quando há consentimento **e** configuração — quem recusou
 * não recebe nem a marcação vazia, porque a decisão é tomada no servidor.
 *
 * O `push` roda no cliente e a cada montagem: a navegação do App Router não
 * recarrega a página, então um `<ins>` novo não seria preenchido se o anúncio
 * fosse pedido só uma vez no carregamento inicial.
 */
export function AdSlot({
  client,
  slot,
  className,
}: {
  client: string;
  slot: string;
  className?: string;
}) {
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current) return;
    rendered.current = true;

    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle;
      if (adsbygoogle) adsbygoogle.push({});
    } catch (error) {
      // O bloqueador de anúncios de quem visita é motivo comum de falha aqui, e
      // não é problema da aplicação: a página segue inteira sem o anúncio.
      console.warn("Anúncio não pôde ser exibido:", error);
    }
  }, []);

  return (
    <aside aria-label="Publicidade" className={className}>
      <p className="mb-1 text-muted-foreground text-[10px] uppercase tracking-wide">Publicidade</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
