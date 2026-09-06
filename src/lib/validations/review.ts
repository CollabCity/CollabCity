import { z } from "zod";
import { REVIEW_COMMENT_MAX } from "@/lib/reputation";

export const reviewSchema = z.object({
  // O formulário envia a nota como texto; `coerce` evita converter na borda.
  rating: z.coerce
    .number()
    .int("Escolha uma nota")
    .min(1, "Escolha de 1 a 5 estrelas")
    .max(5, "Escolha de 1 a 5 estrelas"),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX, `Use no máximo ${REVIEW_COMMENT_MAX} caracteres`)
    .optional()
    .transform((value) => value || null),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
