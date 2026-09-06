import { describe, expect, it } from "vitest";
import { REPORT_DETAILS_MAX, reportSchema } from "./report";

describe("reportSchema", () => {
  it("aceita um motivo sem descrição", () => {
    const result = reportSchema.safeParse({ reason: "scam" });
    expect(result.success).toBe(true);
    expect(result.data?.details).toBeNull();
  });

  it("recusa um motivo que não existe", () => {
    expect(reportSchema.safeParse({ reason: "porque-sim" }).success).toBe(false);
  });

  it('exige descrição quando o motivo é "outro"', () => {
    // Sem isso a fila recebe uma denúncia que ninguém consegue avaliar.
    const result = reportSchema.safeParse({ reason: "other", details: "chato" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.details?.[0]).toContain("Descreva");
  });

  it('aceita "outro" com descrição suficiente', () => {
    const result = reportSchema.safeParse({
      reason: "other",
      details: "A pessoa republicou o mesmo anúncio seis vezes em duas horas.",
    });
    expect(result.success).toBe(true);
  });

  it("recusa descrição acima do limite", () => {
    const result = reportSchema.safeParse({
      reason: "spam",
      details: "x".repeat(REPORT_DETAILS_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("normaliza descrição em branco para nulo", () => {
    const result = reportSchema.safeParse({ reason: "spam", details: "   " });
    expect(result.success).toBe(true);
    expect(result.data?.details).toBeNull();
  });
});
