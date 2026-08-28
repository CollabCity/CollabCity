"use client";

import { SendIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/server/actions/messages";
import { idleState } from "@/server/actions/types";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendMessage.bind(null, conversationId), idleState);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o campo somente depois que o envio é confirmado, para não perder o
  // texto se a ação falhar.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      <label htmlFor="body" className="sr-only">
        Escrever mensagem
      </label>
      <Textarea id="body" name="body" rows={3} required placeholder="Escreva sua mensagem..." />
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
    <Button type="submit" disabled={pending} className="justify-self-end">
      <SendIcon />
      {pending ? "Enviando..." : "Enviar"}
    </Button>
  );
}
