import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(12, "Use pelo menos 12 caracteres").max(200),
});

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Escreva uma mensagem").max(4000),
});
