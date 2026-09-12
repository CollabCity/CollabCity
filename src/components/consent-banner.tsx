import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clearConsent, setConsent } from "@/server/actions/consent";

/**
 * Pergunta antes de carregar a medição.
 *
 * Componente de servidor: quem decide se ele aparece é o cookie lido no
 * layout, então não há piscada entre a renderização e a hidratação, e a escolha
 * funciona com JavaScript desligado.
 */
export function ConsentBanner() {
  return (
    <div
      role="dialog"
      aria-label="Consentimento de medição"
      className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-card/95 backdrop-blur"
    >
      <div className="container-page flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed">
          Usamos cookies para medir a audiência, o que envolve compartilhar dados com o Google. Não
          há publicidade aqui. Nada disso carrega sem a sua permissão, e a plataforma funciona
          inteira sem ela.{" "}
          <Link href="/privacidade" className="font-medium underline underline-offset-2">
            O que é coletado
          </Link>
          .
        </p>

        {/* Mesma variante e mesmo tamanho nos dois, de propósito. Um "aceitar"
            preenchido ao lado de um "recusar" contornado já é um empurrão: o
            guia da ANPD pede que recusar seja tão fácil quanto aceitar, e "tão
            fácil" inclui não ser o botão menos convidativo. */}
        <form action={setConsent} className="flex shrink-0 gap-2">
          <Button type="submit" name="decision" value="reject" size="sm" variant="outline">
            Recusar
          </Button>
          <Button type="submit" name="decision" value="accept" size="sm" variant="outline">
            Aceitar
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Reabre a escolha, a partir do rodapé. */
export function ConsentReset() {
  return (
    <form action={clearConsent}>
      <button type="submit" className="text-left text-muted-foreground hover:text-foreground">
        Cookies e privacidade
      </button>
    </form>
  );
}
