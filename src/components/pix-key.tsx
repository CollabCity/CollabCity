"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * A chave Pix, visível e copiável.
 *
 * A chave aparece por extenso porque a cópia pode falhar — `navigator.clipboard`
 * não existe fora de contexto seguro, e o navegador pode negar a permissão. Nos
 * dois casos ainda dá para selecionar o texto com a mão, então o botão é um
 * atalho, não o único caminho.
 */
export function PixKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Chave Pix copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="select-all rounded-md bg-muted px-3 py-2 font-mono text-sm">{value}</code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        {copied ? "Copiada" : "Copiar chave"}
      </Button>
    </div>
  );
}
