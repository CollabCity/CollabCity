import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-muted-foreground text-sm">404</p>
      <h1 className="font-semibold text-3xl tracking-tight">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        O endereço não existe ou o anúncio pode ter sido removido pelo autor.
      </p>
      <Button asChild>
        <Link href="/anuncios">Explorar anúncios</Link>
      </Button>
    </div>
  );
}
