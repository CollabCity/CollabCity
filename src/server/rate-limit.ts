type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Limitador de taxa por janela fixa, mantido em memória.
 *
 * Serve para conter abuso trivial (envio repetido de formulário, script
 * ingênuo) sem depender de infraestrutura externa. Como o estado vive no
 * processo, cada instância tem seu próprio contador: em um deploy com várias
 * réplicas o limite efetivo é multiplicado pelo número de instâncias. Para
 * garantias reais é preciso um armazenamento compartilhado — ver docs/roadmap.md.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Remove buckets expirados. Chamado nas ações para limitar o uso de memória. */
export function pruneRateLimits(now = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Apenas para testes. */
export function resetRateLimits(): void {
  buckets.clear();
}
