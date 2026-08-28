"use client";

import { LocateFixedIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EXCHANGE_LABELS, INTENT_LABELS, RESOURCE_LABELS } from "@/lib/taxonomy";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

type Category = { id: string; name: string };

export type ListingFormValues = {
  title?: string;
  description?: string;
  categoryId?: string;
  intent?: string;
  resourceType?: string;
  exchange?: string;
  priceCents?: number | null;
  city?: string;
  state?: string | null;
  latitude?: number;
  longitude?: number;
};

export function ListingForm({
  action,
  categories,
  defaultValues = {},
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  defaultValues?: ListingFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [exchange, setExchange] = useState(defaultValues.exchange ?? "free");
  const [coords, setCoords] = useState({
    latitude: defaultValues.latitude?.toString() ?? "",
    longitude: defaultValues.longitude?.toString() ?? "",
  });

  const fieldError = (field: string) => state.errors?.[field]?.[0];

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não expõe a localização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        toast.success("Localização preenchida.");
      },
      () => toast.error("Não foi possível obter sua localização."),
    );
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-success text-sm">
          {state.message}
        </p>
      )}

      <Field label="Título" name="title" error={fieldError("title")}>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues.title}
          placeholder="Ex.: Ofereço aulas de reforço de matemática"
          required
        />
      </Field>

      <Field label="Descrição" name="description" error={fieldError("description")}>
        <Textarea
          id="description"
          name="description"
          rows={7}
          defaultValue={defaultValues.description}
          placeholder="Explique o que você precisa ou oferece, quando, e como o contato deve acontecer."
          required
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Tipo" name="intent" error={fieldError("intent")}>
          <SelectField
            name="intent"
            defaultValue={defaultValues.intent ?? "offer"}
            options={Object.entries(INTENT_LABELS)}
          />
        </Field>

        <Field label="Natureza" name="resourceType" error={fieldError("resourceType")}>
          <SelectField
            name="resourceType"
            defaultValue={defaultValues.resourceType ?? "skill"}
            options={Object.entries(RESOURCE_LABELS)}
          />
        </Field>

        <Field label="Categoria" name="categoryId" error={fieldError("categoryId")}>
          <SelectField
            name="categoryId"
            defaultValue={defaultValues.categoryId ?? categories[0]?.id ?? ""}
            options={categories.map((category) => [category.id, category.name])}
          />
        </Field>

        <Field label="Forma de troca" name="exchange" error={fieldError("exchange")}>
          <SelectField
            name="exchange"
            value={exchange}
            onValueChange={setExchange}
            options={Object.entries(EXCHANGE_LABELS)}
          />
        </Field>
      </div>

      {exchange === "paid" && (
        <Field
          label="Valor em centavos"
          name="priceCents"
          error={fieldError("priceCents")}
          hint="Informe 5000 para R$ 50,00."
        >
          <Input
            id="priceCents"
            name="priceCents"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultValues.priceCents ?? ""}
            required
          />
        </Field>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Cidade" name="city" error={fieldError("city")}>
          <Input id="city" name="city" defaultValue={defaultValues.city} required />
        </Field>
        <Field label="Estado" name="state" error={fieldError("state")}>
          <Input id="state" name="state" defaultValue={defaultValues.state ?? ""} />
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-xl border border-border p-4">
        <legend className="px-1 font-medium text-sm">Localização</legend>
        <p className="text-muted-foreground text-sm">
          As coordenadas alimentam a busca por proximidade. Elas não aparecem no anúncio: só a
          cidade é exibida publicamente.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Latitude" name="latitude" error={fieldError("latitude")}>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              value={coords.latitude}
              onChange={(event) => setCoords((c) => ({ ...c, latitude: event.target.value }))}
              required
            />
          </Field>
          <Field label="Longitude" name="longitude" error={fieldError("longitude")}>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              value={coords.longitude}
              onChange={(event) => setCoords((c) => ({ ...c, longitude: event.target.value }))}
              required
            />
          </Field>
          <Button type="button" variant="outline" onClick={detectLocation}>
            <LocateFixedIcon />
            Detectar
          </Button>
        </div>
      </fieldset>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
      {pending ? "Enviando..." : label}
    </Button>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * O Select do Radix não envia valor em formulários nativos, então um input
 * oculto espelha a seleção para que a Server Action a receba.
 */
function SelectField({
  name,
  defaultValue,
  value,
  onValueChange,
  options,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: [string, string][];
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  return (
    <>
      <input type="hidden" name={name} value={current} />
      <Select
        value={current}
        onValueChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
      >
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
