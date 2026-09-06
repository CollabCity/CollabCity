import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

/**
 * Aviso curto de que a plataforma não entra na negociação.
 *
 * Aparece onde a decisão é tomada — no anúncio, antes do primeiro contato, e
 * dentro da conversa — e não só em uma página de termos que ninguém abre. O
 * texto longo mora em `/seguranca`; aqui fica o suficiente para lembrar e um
 * caminho para o resto.
 */
export function SafetyNotice({ context }: { context: "listing" | "conversation" }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-border bg-muted/40 p-3 text-muted-foreground text-xs leading-relaxed">
      <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        {context === "listing"
          ? "O CollabCity apenas hospeda o anúncio: não participa da negociação, não confere o que é oferecido e não intermedia pagamentos. "
          : "Combine com cuidado. O CollabCity não participa da negociação nem intermedia pagamentos, e não tem como confirmar o que é combinado aqui. "}
        <Link href="/seguranca" className="font-medium underline underline-offset-2">
          Veja como se proteger
        </Link>
        .
      </p>
    </div>
  );
}
