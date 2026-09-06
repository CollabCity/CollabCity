"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appealReport, appealSuspension } from "@/server/actions/appeals";
import { idleState } from "@/server/actions/types";

/**
 * Formulário de contestação, para suspensão ou para denúncia acolhida.
 *
 * O texto do rótulo pede o que a moderação **deixou de considerar**, e não uma
 * defesa genérica: quem vai revisar já leu a decisão, e o que falta é o que não
 * estava lá.
 */
export function AppealForm({
  target,
  targetId,
}: {
  target: "suspension" | "report";
  targetId: string;
}) {
  const action = target === "suspension" ? appealSuspension : appealReport;
  const [state, formAction] = useActionState(action.bind(null, targetId), idleState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm leading-relaxed">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Contestar esta decisão
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <Label htmlFor={`contestacao-${targetId}`}>O que a moderação deixou de considerar?</Label>
      <Textarea
        id={`contestacao-${targetId}`}
        name="body"
        rows={4}
        required
        minLength={20}
        maxLength={2000}
        placeholder="Conte o que aconteceu do seu lado, com o que puder comprovar."
        aria-invalid={state.status === "error"}
      />
      <p className="text-muted-foreground text-xs">
        A contestação é lida por alguém da moderação que não tomou esta decisão. É possível
        contestar uma vez.
      </p>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Enviando..." : "Enviar contestação"}
    </Button>
  );
}
