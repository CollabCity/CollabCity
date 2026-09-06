"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveAppeal } from "@/server/actions/appeals";
import { idleState } from "@/server/actions/types";

/**
 * As duas saídas de uma contestação, no mesmo formulário — pelo mesmo motivo de
 * `ReportActions`: a nota é uma só, e quem escolhe é o botão que envia.
 */
export function AppealActions({
  appealId,
  blockedReason,
}: {
  appealId: string;
  /** Preenchido quando esta pessoa não pode julgar esta contestação. */
  blockedReason?: string | undefined;
}) {
  const [state, formAction] = useActionState(resolveAppeal.bind(null, appealId), idleState);

  if (blockedReason) {
    return (
      <p className="border-border border-t pt-4 text-muted-foreground text-xs">{blockedReason}</p>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 border-border border-t pt-4">
      <div className="grid gap-2">
        <Label htmlFor={`nota-${appealId}`}>Resposta à contestação (opcional)</Label>
        <Textarea
          id={`nota-${appealId}`}
          name="note"
          rows={2}
          placeholder="O que foi revisto e por que a decisão muda ou se mantém."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <DecisionButton name="decision" value="accepted" label="Aceitar e desfazer" />
        <DecisionButton
          name="decision"
          value="rejected"
          label="Manter a decisão"
          variant="outline"
        />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}

function DecisionButton({
  label,
  variant = "primary",
  ...props
}: {
  label: string;
  variant?: "primary" | "outline";
} & React.ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending} {...props}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}
