import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { env, isOAuthEnabled } from "./env";

export const auth = betterAuth({
  appName: "CollabCity",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    // A verificação por e-mail depende de um provedor de envio, que ainda não
    // faz parte do escopo. Ver docs/roadmap.md.
    requireEmailVerification: false,
  },
  socialProviders: {
    ...(isOAuthEnabled.github && {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    }),
    ...(isOAuthEnabled.google && {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    }),
  },
  rateLimit: {
    // O Better Auth já limita por IP em produção, mas o padrão de 3 tentativas
    // por minuto em /sign-in/email é agressivo demais aqui: com CGNAT, um
    // bairro inteiro pode compartilhar um endereço, e vizinhos bloqueariam uns
    // aos outros. Os valores ficam explícitos para poderem ser discutidos.
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 10 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  advanced: {
    // O critério é o esquema da URL, não o NODE_ENV: um build de produção
    // servido em http (teste de ponta a ponta local, container atrás de proxy
    // que termina o TLS) emitiria cookies `Secure` que o navegador descarta,
    // e o login falharia silenciosamente.
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
