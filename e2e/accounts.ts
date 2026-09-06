import { fileURLToPath } from "node:url";

/**
 * Contas de demonstração e onde fica a sessão salva de cada uma.
 *
 * O login acontece uma vez, no projeto `setup`, e os testes reaproveitam o
 * cookie. Não é só velocidade: o Better Auth limita `/sign-in/email` a 10 por
 * minuto **por IP** (ver `src/lib/auth.ts`), e a suíte inteira sai de um IP só.
 * Autenticar em cada teste esbarrava nesse limite e derrubava a execução — o
 * limite está certo, quem estava errado era a suíte.
 */
export const PASSWORD = "collabcity-demo-2026";

export const ACCOUNTS = {
  ana: { email: "ana@exemplo.test", name: "Ana Ribeiro" },
  bruno: { email: "bruno@exemplo.test", name: "Bruno Cavalcanti" },
  moderacao: { email: "moderacao@exemplo.test", name: "Equipe de moderação" },
  carla: { email: "carla@exemplo.test", name: "Carla Nunes" },
  revisao: { email: "revisao@exemplo.test", name: "Equipe de revisão" },
} as const;

export type AccountName = keyof typeof ACCOUNTS;

export function storageStatePath(account: AccountName): string {
  return fileURLToPath(new URL(`./.auth/${account}.json`, import.meta.url));
}

/** Estado explicitamente vazio, para os testes que exercitam o próprio login. */
export const ANONYMOUS = { cookies: [], origins: [] };
