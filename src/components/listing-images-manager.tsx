"use client";

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_IMAGES_PER_LISTING } from "@/lib/images";
import {
  deleteListingImage,
  moveListingImage,
  updateImageAlt,
  uploadListingImages,
} from "@/server/actions/images";
import { idleState } from "@/server/actions/types";

type ListingImage = { id: string; url: string; alt: string | null };

/**
 * Fotos já publicadas de um anúncio, com envio e remoção.
 *
 * Fica separado do formulário do anúncio porque as operações são de naturezas
 * diferentes: o texto se salva de uma vez, ao enviar; cada foto entra e sai na
 * hora, sem passar pelo botão de salvar.
 */
export function ListingImagesManager({
  listingId,
  images,
  initialError,
}: {
  listingId: string;
  images: ListingImage[];
  /** Erro trazido da publicação, quando as fotos falharam e o anúncio não. */
  initialError?: string | undefined;
}) {
  const [state, formAction] = useActionState(uploadListingImages.bind(null, listingId), idleState);

  return (
    <section className="grid gap-4">
      <div className="space-y-1">
        <h2 className="font-semibold text-xl tracking-tight">Fotos</h2>
        <p className="text-muted-foreground text-sm">
          Até {MAX_IMAGES_PER_LISTING} imagens. A primeira da lista é a capa na busca — use as setas
          para mudar a ordem, e descreva cada foto para quem usa leitor de tela.
        </p>
      </div>

      {initialError && (
        <p role="alert" className="text-destructive text-sm">
          O anúncio foi publicado, mas as fotos não: {initialError}
        </p>
      )}

      {images.length > 0 && (
        <ol className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 rounded-lg border border-border p-3"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="7rem"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute bottom-0 w-full bg-background/85 py-0.5 text-center font-medium text-[10px]">
                    Capa
                  </span>
                )}
              </div>

              <div className="grid content-start gap-2">
                <AltTextForm imageId={image.id} alt={image.alt} position={index + 1} />

                <div className="flex flex-wrap gap-1">
                  <MoveImageForm
                    imageId={image.id}
                    direction="up"
                    disabled={index === 0}
                    position={index + 1}
                  />
                  <MoveImageForm
                    imageId={image.id}
                    direction="down"
                    disabled={index === images.length - 1}
                    position={index + 1}
                  />
                  <DeleteImageForm imageId={image.id} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {images.length < MAX_IMAGES_PER_LISTING && (
        <form action={formAction} className="grid gap-3">
          <ImagePicker name="images" existingCount={images.length} />
          <UploadButton />
        </form>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="text-muted-foreground text-sm">
          {state.message}
        </p>
      )}
    </section>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="justify-self-start" disabled={pending}>
      {pending ? "Enviando..." : "Enviar fotos"}
    </Button>
  );
}

/**
 * Descrição da imagem, salva por conta própria.
 *
 * Cada imagem tem o seu formulário porque o campo precisa de um `id` e um
 * rótulo únicos: um formulário só, com quatro campos `alt`, deixaria o leitor
 * de tela sem saber qual descrição pertence a qual foto.
 */
function AltTextForm({
  imageId,
  alt,
  position,
}: {
  imageId: string;
  alt: string | null;
  position: number;
}) {
  const [state, formAction] = useActionState(updateImageAlt.bind(null, imageId), idleState);

  return (
    <form action={formAction} className="grid gap-1.5">
      <Label htmlFor={`alt-${imageId}`} className="text-xs">
        Descrição da imagem {position}
      </Label>
      <div className="flex gap-1.5">
        <Input
          id={`alt-${imageId}`}
          name="alt"
          defaultValue={alt ?? ""}
          maxLength={200}
          placeholder="O que aparece na foto"
          className="h-9 text-sm"
        />
        <SaveAltButton />
      </div>
      {state.status !== "idle" && state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function SaveAltButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "..." : "Salvar"}
    </Button>
  );
}

/** Sobe ou desce a imagem uma posição. Botões, e não arrastar: ver a ação. */
function MoveImageForm({
  imageId,
  direction,
  disabled,
  position,
}: {
  imageId: string;
  direction: "up" | "down";
  disabled: boolean;
  position: number;
}) {
  const [, formAction] = useActionState(moveListingImage.bind(null, imageId, direction), idleState);

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={`Mover imagem ${position} para ${direction === "up" ? "antes" : "depois"}`}
      >
        {direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Button>
    </form>
  );
}

function DeleteImageForm({ imageId }: { imageId: string }) {
  const [, formAction] = useActionState(deleteListingImage.bind(null, imageId), idleState);
  return (
    <form action={formAction}>
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      <Trash2Icon />
      {pending ? "Removendo..." : "Remover"}
    </Button>
  );
}
