"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { liftSuspension, suspendAccount } from "@/server/actions/suspensions";
import { idleState } from "@/server/actions/types";

/**
 * Suspender uma conta, a partir da denúncia que motivou.
 *
 * Fica atrás de um botão, e não aberto junto das decisões da denúncia, porque é
 * a ação mais grave da moderação e não deve ficar a um clique de distância de
 * quem só queria arquivar um anúncio.
 */
export function SuspendAccountForm({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction] = useActionState(suspendAccount.bind(null, userId), idleState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Suspender {userName}
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-2 rounded-lg border border-destructive/40 p-3">
      <Label htmlFor={`suspensao-${userId}`}>Motivo da suspensão</Label>
      <p className="text-muted-foreground text-xs">
        O texto é mostrado inteiro a {userName}. É o que a pessoa terá para entender a decisão.
      </p>
      <Textarea id={`suspensao-${userId}`} name="reason" rows={3} required minLength={10} />

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <ConfirmButton label="Confirmar suspensão" variant="destructive" />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Reativa uma conta suspensa. */
export function LiftSuspensionForm({ suspensionId }: { suspensionId: string }) {
  const [state, formAction] = useActionState(liftSuspension.bind(null, suspensionId), idleState);

  return (
    <form action={formAction} className="grid gap-2">
      <Label htmlFor={`reativar-${suspensionId}`}>Nota da reativação (opcional)</Label>
      <Textarea id={`reativar-${suspensionId}`} name="note" rows={2} />

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}

      <ConfirmButton label="Reativar conta" />
    </form>
  );
}

function ConfirmButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}
