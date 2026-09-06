"use client";

import { ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_DIMENSION, MAX_IMAGES_PER_LISTING } from "@/lib/images";

type Preview = { file: File; url: string };

/**
 * Reduz a imagem antes de enviar.
 *
 * Uma foto de celular passa fácil de 5 MB, e subir isso de uma conexão móvel é
 * lento o bastante para a pessoa desistir no meio. Redimensionar no navegador
 * resolve sem `sharp` — que é dependência nativa e complica o deploy em camada
 * gratuita. Isto é conforto, **não** validação: o servidor confere tamanho e
 * formato pelos bytes de novo, porque nada que vem do cliente é confiável.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_000_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}

export function ImagePicker({
  name = "images",
  existingCount = 0,
}: {
  name?: string;
  /** Quantas o anúncio já tem, para não oferecer mais que o limite. */
  existingCount?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const remaining = MAX_IMAGES_PER_LISTING - existingCount - previews.length;

  // As URLs de pré-visualização seguram memória até serem revogadas.
  useEffect(() => {
    return () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    };
  }, [previews]);

  /**
   * O input é a fonte da verdade do envio, então ele precisa conter exatamente
   * os arquivos já reduzidos — daí o `DataTransfer`, único jeito de reescrever
   * um `FileList`.
   */
  function sync(next: Preview[]) {
    const transfer = new DataTransfer();
    for (const preview of next) transfer.items.add(preview.file);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setPreviews(next);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []).slice(0, Math.max(0, remaining));
    const shrunk = await Promise.all(chosen.map(shrink));

    sync([...previews, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function remove(index: number) {
    const target = previews[index];
    if (target) URL.revokeObjectURL(target.url);
    sync(previews.filter((_, position) => position !== index));
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>Fotos (opcional)</Label>

      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
      />

      {previews.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {previews.map((preview, index) => (
            <li key={preview.url} className="relative">
              {/* `next/image` não serve aqui: a origem é um blob local que só
                  existe neste navegador, sem nada para o otimizador buscar. */}
              {/** biome-ignore lint/performance/noImgElement: pré-visualização local */}
              <img
                src={preview.url}
                alt=""
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-1 right-1 rounded-full bg-background/90 p-1 shadow-sm"
                aria-label={`Remover imagem ${index + 1}`}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlusIcon />
          Escolher {previews.length > 0 ? "mais" : "fotos"}
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          Limite de {MAX_IMAGES_PER_LISTING} imagens por anúncio.
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        JPEG, PNG ou WebP. As fotos são reduzidas no seu navegador antes do envio.
      </p>
    </div>
  );
}
