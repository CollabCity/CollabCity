"use client";

import { FlagIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/taxonomy";
import type { ReportReason, ReportTarget } from "@/lib/types";
import { REPORT_DETAILS_MAX } from "@/lib/validations/report";
import { reportContent } from "@/server/actions/reports";
import { idleState } from "@/server/actions/types";

const TARGET_TITLES: Record<ReportTarget, string> = {
  listing: "Denunciar anúncio",
  review: "Denunciar avaliação",
  conversation: "Denunciar conversa",
};

export function ReportDialog({
  target,
  targetId,
  alreadyReported = false,
  className,
}: {
  target: ReportTarget;
  targetId: string;
  alreadyReported?: boolean;
  className?: string;
}) {
  const action = reportContent.bind(null, target, targetId);
  const [state, formAction] = useActionState(action, idleState);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  // Fechar sozinho engoliria a confirmação. O diálogo fica aberto mostrando o
  // que aconteceu, e quem fecha é a pessoa.
  useEffect(() => {
    if (state.status === "success") {
      setReason(null);
      setDetails("");
    }
  }, [state]);

  // `alreadyReported` vem do servidor e vira verdadeiro assim que a denúncia é
  // gravada, porque a ação revalida a rota. Sem esta precedência, o diálogo
  // sumiria no mesmo instante em que exibiria a confirmação.
  if (alreadyReported && state.status !== "success") {
    return (
      <p className={className} data-testid="ja-denunciado">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
          <FlagIcon className="size-3.5" aria-hidden />
          Você já denunciou este conteúdo.
        </span>
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <FlagIcon />
          {TARGET_TITLES[target]}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TARGET_TITLES[target]}</DialogTitle>
          <DialogDescription>
            A denúncia vai para a moderação, que decide o que fazer. Ela não é anônima para a
            equipe, mas a pessoa denunciada não vê quem denunciou. Em caso de risco imediato,
            procure a polícia — a plataforma não substitui isso.
          </DialogDescription>
        </DialogHeader>

        {state.status === "success" ? (
          <p role="status" className="text-sm leading-relaxed">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 font-medium text-sm">O que aconteceu?</legend>
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer gap-2.5 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    required
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-muted-foreground text-xs leading-relaxed">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor={`details-${targetId}`}>
                Descrição {reason === "other" ? "(obrigatória)" : "(opcional)"}
              </Label>
              <Textarea
                id={`details-${targetId}`}
                name="details"
                rows={3}
                maxLength={REPORT_DETAILS_MAX}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Conte o que aconteceu, com datas e detalhes que ajudem a avaliar."
                aria-invalid={Boolean(state.errors?.details)}
              />
              <p className="text-right text-muted-foreground text-xs">
                {details.length}/{REPORT_DETAILS_MAX}
              </p>
            </div>

            {state.status === "error" && (
              <p role="alert" className="text-destructive text-xs">
                {state.errors?.details?.[0] ?? state.message}
              </p>
            )}

            <SubmitButton />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar denúncia"}
    </Button>
  );
}
