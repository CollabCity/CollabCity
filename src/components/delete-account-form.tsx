"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/server/actions/account";
import { idleState } from "@/server/actions/types";

/**
 * Exclusão de conta, atrás de duas barreiras.
 *
 * A primeira é abrir o formulário; a segunda é digitar o próprio e-mail. A ação
 * é irreversível, e um botão vermelho sozinho não é decisão suficiente para
 * isso — nem protege de um clique errado.
 */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(deleteAccount, idleState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Quero excluir minha conta
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-destructive/40 p-4">
      <div className="grid gap-2">
        <Label htmlFor="confirmacao-email">
          Digite <span className="font-mono">{email}</span> para confirmar
        </Label>
        <Input
          id="confirmacao-email"
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="seu e-mail"
          aria-invalid={state.status === "error"}
        />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <ConfirmButton />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>
      {pending ? "Excluindo..." : "Excluir permanentemente"}
    </Button>
  );
}
