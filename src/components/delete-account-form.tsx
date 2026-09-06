"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestAccountDeletion } from "@/server/actions/account";
import { idleState } from "@/server/actions/types";

/**
 * Pedido de exclusão, atrás de duas barreiras.
 *
 * A primeira é abrir o formulário; a segunda é digitar o próprio e-mail. O
 * prazo de arrependimento protege de quem mudou de ideia; estas duas protegem
 * do clique errado, que é problema diferente.
 */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(requestAccountDeletion, idleState);
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
      {pending ? "Agendando..." : "Agendar exclusão"}
    </Button>
  );
}
