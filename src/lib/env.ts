import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const optionalString = z.string().optional().default("");

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32, "Use um segredo com pelo menos 32 caracteres"),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: optionalString,
    GITHUB_CLIENT_SECRET: optionalString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    /**
     * Segredo da rota de manutenção que executa o expurgo de contas.
     *
     * Sem ele a rota não existe — responde 404 —, o que evita deixar um
     * endereço destrutivo aberto em qualquer ambiente onde ninguém configurou
     * o agendador.
     */
    MAINTENANCE_SECRET: optionalString,
    /**
     * Prazo de arrependimento da exclusão de conta, em dias.
     *
     * Configurável porque a escolha é de quem opera: trinta dias é o padrão
     * defensável, e zero desliga o prazo — o que só faz sentido em teste.
     */
    ACCOUNT_DELETION_GRACE_DAYS: z.coerce.number().int().min(0).max(365).default(30),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    S3_ENDPOINT: optionalString,
    S3_REGION: optionalString,
    S3_BUCKET: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString,
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    /**
     * Medição e publicidade são opcionais: sem as variáveis, nada carrega e o
     * banner de consentimento nem aparece. É o padrão em desenvolvimento.
     */
    NEXT_PUBLIC_GA_ID: optionalString,
    NEXT_PUBLIC_ADSENSE_CLIENT: optionalString,
    NEXT_PUBLIC_ADSENSE_SLOT: optionalString,
    /**
     * Quem opera esta instância, e para onde vão os pedidos de LGPD.
     *
     * O projeto é open source e auto-hospedável: o controlador dos dados é
     * **quem roda a instância**, não o repositório. Sem estes valores a
     * política diz isso com todas as letras, em vez de inventar uma entidade.
     */
    NEXT_PUBLIC_PRIVACY_CONTROLLER: optionalString,
    NEXT_PUBLIC_PRIVACY_CONTACT: optionalString,
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MAINTENANCE_SECRET: process.env.MAINTENANCE_SECRET,
    ACCOUNT_DELETION_GRACE_DAYS: process.env.ACCOUNT_DELETION_GRACE_DAYS,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
    NEXT_PUBLIC_ADSENSE_SLOT: process.env.NEXT_PUBLIC_ADSENSE_SLOT,
    NEXT_PUBLIC_PRIVACY_CONTROLLER: process.env.NEXT_PUBLIC_PRIVACY_CONTROLLER,
    NEXT_PUBLIC_PRIVACY_CONTACT: process.env.NEXT_PUBLIC_PRIVACY_CONTACT,
  },
  emptyStringAsUndefined: false,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});

/** Medição e publicidade só existem quando configuradas. */
export const isMeasurementEnabled = {
  analytics: Boolean(env.NEXT_PUBLIC_GA_ID),
  ads: Boolean(env.NEXT_PUBLIC_ADSENSE_CLIENT),
};

export const isOAuthEnabled = {
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
};
