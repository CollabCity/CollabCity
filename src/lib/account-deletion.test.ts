import { describe, expect, it } from "vitest";
import {
  DEFAULT_DELETION_GRACE_DAYS,
  daysUntil,
  deletionDeadline,
  formatDeadline,
} from "./account-deletion";

const AGORA = new Date("2026-09-06T12:00:00Z");
const DIA = 86_400_000;

describe("deletionDeadline", () => {
  it("usa o prazo padrão quando nenhum é informado", () => {
    const prazo = deletionDeadline(undefined, AGORA);
    expect(prazo.getTime() - AGORA.getTime()).toBe(DEFAULT_DELETION_GRACE_DAYS * DIA);
  });

  it("respeita o prazo configurado", () => {
    const prazo = deletionDeadline(7, AGORA);
    expect(prazo.getTime() - AGORA.getTime()).toBe(7 * DIA);
  });

  it("com prazo zero, vence na hora", () => {
    // É o que desliga o arrependimento; só faz sentido em teste.
    expect(deletionDeadline(0, AGORA).getTime()).toBe(AGORA.getTime());
  });
});

describe("daysUntil", () => {
  it("conta os dias que faltam", () => {
    expect(daysUntil(new Date(AGORA.getTime() + 10 * DIA), AGORA)).toBe(10);
  });

  it("não devolve negativo depois de vencido", () => {
    // Uma contagem negativa apareceria na tela como "em -3 dias".
    expect(daysUntil(new Date(AGORA.getTime() - 3 * DIA), AGORA)).toBe(0);
  });

  it("arredonda para cima o que falta de um dia", () => {
    expect(daysUntil(new Date(AGORA.getTime() + DIA / 2), AGORA)).toBe(1);
  });
});

describe("formatDeadline", () => {
  it("usa hoje quando o prazo já venceu", () => {
    expect(formatDeadline(new Date(AGORA.getTime() - DIA), AGORA)).toBe("hoje");
  });

  it("usa amanhã para o último dia", () => {
    expect(formatDeadline(new Date(AGORA.getTime() + DIA), AGORA)).toBe("amanhã");
  });

  it("usa o plural no resto", () => {
    expect(formatDeadline(new Date(AGORA.getTime() + 30 * DIA), AGORA)).toBe("em 30 dias");
  });
});
