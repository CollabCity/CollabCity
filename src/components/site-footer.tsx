import Link from "next/link";
import { ConsentReset } from "@/components/consent-banner";

export function SiteFooter() {
  return (
    <footer className="border-border border-t py-10">
      <div className="container-page flex flex-col gap-6 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="font-semibold">CollabCity</p>
          <p className="text-muted-foreground">
            Projeto open source que conecta quem precisa de ajuda com quem tem habilidades, recursos
            ou tempo para oferecer.
          </p>
        </div>

        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-10 gap-y-2">
          <Link href="/anuncios" className="text-muted-foreground hover:text-foreground">
            Explorar
          </Link>
          <Link href="/anuncios/novo" className="text-muted-foreground hover:text-foreground">
            Publicar
          </Link>
          <Link href="/seguranca" className="text-muted-foreground hover:text-foreground">
            Segurança
          </Link>
          <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">
            Privacidade
          </Link>
          <ConsentReset />
          <a
            href="https://github.com/CollabCity/CollabCity"
            className="text-muted-foreground hover:text-foreground"
          >
            Código-fonte
          </a>
          <a
            href="https://github.com/CollabCity/CollabCity/blob/main/CONTRIBUTING.md"
            className="text-muted-foreground hover:text-foreground"
          >
            Contribuir
          </a>
        </nav>
      </div>
    </footer>
  );
}
