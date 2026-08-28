"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { startConversation } from "@/server/actions/messages";
import { idleState } from "@/server/actions/types";

export function ContactForm({ listingId }: { listingId: string }) {
  const action = startConversation.bind(null, listingId);
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="grid gap-2">
      <Label htmlFor="body">Enviar mensagem</Label>
      <Textarea
        id="body"
        name="body"
        rows={4}
        required
        placeholder="Apresente-se e diga como pode ajudar ou o que precisa."
        aria-invalid={state.status === "error"}
      />
      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Enviando..." : "Iniciar conversa"}
    </Button>
  );
}
