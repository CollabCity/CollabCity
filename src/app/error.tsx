"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O `digest` correlaciona esta tela com a entrada correspondente no log do
    // servidor, onde a mensagem original fica registrada.
    console.error("Falha ao renderizar a página:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-semibold text-3xl tracking-tight">Algo deu errado</h1>
      <p className="max-w-md text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      {error.digest && (
        <p className="font-mono text-muted-foreground text-xs">Código: {error.digest}</p>
      )}
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
