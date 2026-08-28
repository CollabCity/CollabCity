"use client";

import { BookmarkIcon } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/server/actions/favorites";

export function FavoriteButton({
  listingId,
  initialSaved = false,
}: {
  listingId: string;
  initialSaved?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(initialSaved);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      aria-pressed={saved}
      onClick={() =>
        startTransition(async () => {
          setSaved(!saved);
          try {
            const result = await toggleFavorite(listingId);
            toast.success(result.saved ? "Anúncio salvo." : "Anúncio removido dos salvos.");
          } catch {
            toast.error("Não foi possível atualizar seus salvos.");
          }
        })
      }
    >
      <BookmarkIcon className={saved ? "fill-current" : undefined} />
      {saved ? "Salvo" : "Salvar"}
    </Button>
  );
}
