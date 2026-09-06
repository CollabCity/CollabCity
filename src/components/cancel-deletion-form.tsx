"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cancelAccountDeletion } from "@/server/actions/account";
import { idleState } from "@/server/actions/types";

/** Desfaz um pedido de exclusão dentro do prazo. */
export function CancelDeletionForm() {
  const [state, formAction] = useActionState(cancelAccountDeletion, idleState);

  return (
    <form action={formAction} className="grid gap-2">
      <CancelButton />
      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}

function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="justify-self-start">
      {pending ? "Cancelando..." : "Cancelar exclusão e manter minha conta"}
    </Button>
  );
}
