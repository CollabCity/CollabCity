import { StarIcon } from "lucide-react";
import { RATING_VALUES } from "@/lib/reputation";
import { cn } from "@/lib/utils";

/**
 * Estrelas de leitura. O desenho é decorativo — o valor vai para leitores de
 * tela pelo `aria-label`, porque cinco ícones repetidos não dizem nada em áudio.
 *
 * A média é arredondada só para escolher quantas estrelas preencher; o número
 * exato aparece ao lado, escrito.
 */
export function RatingStars({
  value,
  className,
  starClassName,
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  const filled = Math.round(value);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1).replace(".", ",")} de 5 estrelas`}
    >
      {RATING_VALUES.map((star) => (
        <StarIcon
          key={star}
          aria-hidden
          className={cn(
            "size-4",
            star <= filled ? "fill-highlight text-highlight" : "text-muted-foreground/40",
            starClassName,
          )}
        />
      ))}
    </span>
  );
}
