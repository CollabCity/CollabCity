"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ListingStatus } from "@/lib/types";
import { deleteListing, setListingStatus } from "@/server/actions/listings";

export function ListingRowActions({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<{ status: string; message?: string }>) {
    startTransition(async () => {
      const result = await task();
      if (result.status === "error") toast.error(result.message ?? "Algo deu errado.");
      else toast.success(result.message ?? "Feito.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/anuncios/${listingId}/editar`}>Editar</Link>
      </Button>

      {status === "open" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setListingStatus(listingId, "fulfilled"))}
        >
          Marcar como atendido
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setListingStatus(listingId, "open"))}
        >
          Reabrir
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remover este anúncio? A ação não pode ser desfeita.")) return;
          run(() => deleteListing(listingId));
        }}
      >
        Remover
      </Button>
    </div>
  );
}
