"use client";

import { StarIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RATING_LABELS,
  RATING_VALUES,
  type Rating,
  REVIEW_BLIND_DAYS,
  REVIEW_COMMENT_MAX,
} from "@/lib/reputation";
import { cn } from "@/lib/utils";
import { submitReview } from "@/server/actions/reviews";
import { idleState } from "@/server/actions/types";

export function ReviewForm({
  conversationId,
  counterpartName,
}: {
  conversationId: string;
  counterpartName: string;
}) {
  const action = submitReview.bind(null, conversationId);
  const [state, formAction] = useActionState(action, idleState);
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");

  if (state.status === "success") {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="font-medium text-sm">Como foi negociar com {counterpartName}?</legend>

        {/* Os rádios continuam sendo a fonte da verdade do formulário; o estado
            só controla o preenchimento visual das estrelas. */}
        <div className="flex items-center gap-1">
          {RATING_VALUES.map((value) => (
            <label key={value} className="cursor-pointer p-0.5" title={RATING_LABELS[value]}>
              <input
                type="radio"
                name="rating"
                value={value}
                required
                checked={rating === value}
                onChange={() => setRating(value)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {value} — {RATING_LABELS[value]}
              </span>
              <StarIcon
                aria-hidden
                className={cn(
                  "size-7 rounded-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                  rating !== null && value <= rating
                    ? "fill-highlight text-highlight"
                    : "text-muted-foreground/40",
                )}
              />
            </label>
          ))}
          {rating !== null && (
            <span className="ml-2 text-muted-foreground text-sm">{RATING_LABELS[rating]}</span>
          )}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="comment">Comentário (opcional)</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Conte como foi a combinação e o encontro."
        />
        <p className="text-right text-muted-foreground text-xs">
          {comment.length}/{REVIEW_COMMENT_MAX}
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        A avaliação não pode ser editada depois de enviada, e só fica visível quando a outra pessoa
        também avaliar — ou em {REVIEW_BLIND_DAYS} dias, o que vier primeiro.
      </p>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar avaliação"}
    </Button>
  );
}
