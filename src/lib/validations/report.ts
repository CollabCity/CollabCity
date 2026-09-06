import { z } from "zod";

/** Limite do relato livre. Mais que isso vira desabafo; menos, não cabe o contexto. */
export const REPORT_DETAILS_MAX = 1000;

export const REPORT_REASON_VALUES = [
  "scam",
  "harassment",
  "illegal",
  "misleading",
  "spam",
  "other",
] as const;

export const reportSchema = z
  .object({
    reason: z.enum(REPORT_REASON_VALUES, { message: "Escolha um motivo" }),
    details: z
      .string()
      .trim()
      .max(REPORT_DETAILS_MAX, `Use no máximo ${REPORT_DETAILS_MAX} caracteres`)
      .optional()
      .transform((value) => value || null),
  })
  // "Outro motivo" não diz nada sozinho: sem descrição, a fila recebe uma
  // denúncia que ninguém consegue avaliar.
  .refine((value) => value.reason !== "other" || (value.details?.length ?? 0) >= 10, {
    message: "Descreva o que aconteceu para que a denúncia possa ser avaliada",
    path: ["details"],
  });

export type ReportInput = z.infer<typeof reportSchema>;
