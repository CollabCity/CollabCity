import "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// As variáveis de ambiente são validadas na importação de `@/lib/env`. Os
// testes de unidade não tocam no banco, então valores sintéticos bastam.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "chave-de-teste-com-mais-de-32-caracteres";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
