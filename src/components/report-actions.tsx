"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveReport } from "@/server/actions/reports";
import { idleState } from "@/server/actions/types";

/**
 * As duas decisões possíveis sobre uma denúncia, em um formulário só.
 *
 * Os botões enviam `decision` pelo próprio `name`/`value`: o navegador inclui
 * apenas o do botão acionado. Um formulário para cada decisão duplicaria o
 * campo de nota, e a nota escrita antes de descartar se perderia.
 */
export function ReportActions({
  reportId,
  consequence,
}: {
  reportId: string;
  consequence: string;
}) {
  const [state, formAction] = useActionState(resolveReport.bind(null, reportId), idleState);

  return (
    <form action={formAction} className="grid gap-3 border-border border-t pt-4">
      <div className="grid gap-2">
        <Label htmlFor={`note-${reportId}`}>Nota da decisão (opcional)</Label>
        <Textarea
          id={`note-${reportId}`}
          name="note"
          rows={2}
          placeholder="O que foi verificado e o que foi feito."
        />
      </div>

      <p className="text-muted-foreground text-xs">{consequence}</p>

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="upheld" label="Acolher denúncia" />
        <SubmitButton name="decision" value="dismissed" label="Descartar" variant="outline" />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}

function SubmitButton({
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
