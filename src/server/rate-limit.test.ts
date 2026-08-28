import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pruneRateLimits, rateLimit, resetRateLimits } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite requisições até o limite", () => {
    expect(rateLimit("a", 3, 1000)).toBe(true);
    expect(rateLimit("a", 3, 1000)).toBe(true);
    expect(rateLimit("a", 3, 1000)).toBe(true);
  });

  it("bloqueia a requisição seguinte ao limite", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 1000);
    expect(rateLimit("a", 3, 1000)).toBe(false);
  });

  it("isola chaves diferentes", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 1000);
    expect(rateLimit("b", 3, 1000)).toBe(true);
  });

  it("libera novamente depois da janela", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 1000);
    expect(rateLimit("a", 3, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit("a", 3, 1000)).toBe(true);
  });

  it("descarta buckets expirados na limpeza", () => {
    rateLimit("a", 1, 1000);
    vi.advanceTimersByTime(1001);
    pruneRateLimits();
    // Se o bucket tivesse sobrevivido, esta chamada seria bloqueada.
    expect(rateLimit("a", 1, 1000)).toBe(true);
  });
});
