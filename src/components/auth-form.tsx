"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";

type FieldErrors = Record<string, string[]>;

function fieldErrorsOf(error: { flatten: () => { fieldErrors: unknown } }): FieldErrors {
  return error.flatten().fieldErrors as FieldErrors;
}

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    // Cadastro e entrada usam schemas e endpoints diferentes. Manter os ramos
    // separados preserva os tipos de ponta a ponta, sem conversões manuais.
    if (isSignUp) {
      const parsed = signUpSchema.safeParse(values);
      if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));

      setPending(true);
      const { error } = await signUp.email(parsed.data);
      setPending(false);

      if (error) {
        setFormError("Não foi possível criar a conta. O e-mail pode já estar em uso.");
        return;
      }
    } else {
      const parsed = signInSchema.safeParse(values);
      if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));

      setPending(true);
      const { error } = await signIn.email(parsed.data);
      setPending(false);

      if (error) {
        // A mensagem é deliberadamente genérica: distinguir "e-mail não existe"
        // de "senha incorreta" revelaria quem tem conta na plataforma.
        setFormError("E-mail ou senha inválidos.");
        return;
      }
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {formError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {formError}
        </p>
      )}

      {isSignUp && (
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" autoComplete="name" required />
          {errors.name && (
            <p role="alert" className="text-destructive text-xs">
              {errors.name[0]}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {errors.email && (
          <p role="alert" className="text-destructive text-xs">
            {errors.email[0]}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
        />
        {isSignUp && !errors.password && (
          <p className="text-muted-foreground text-xs">Use pelo menos 12 caracteres.</p>
        )}
        {errors.password && (
          <p role="alert" className="text-destructive text-xs">
            {errors.password[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
      </Button>

      <p className="text-center text-muted-foreground text-sm">
        {isSignUp ? "Já tem uma conta? " : "Ainda não tem conta? "}
        <Link
          href={isSignUp ? "/entrar" : "/cadastro"}
          className="font-medium text-primary hover:underline"
        >
          {isSignUp ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
