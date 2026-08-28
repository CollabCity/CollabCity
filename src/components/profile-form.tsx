"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_RADIUS_METERS } from "@/lib/geo";
import { updateProfile } from "@/server/actions/profile";
import { idleState } from "@/server/actions/types";

type Profile = {
  name: string;
  email: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  searchRadiusMeters: number | null;
  website: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, idleState);
  const error = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "success" && (
        <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-success text-sm">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Field label="Nome" name="name" error={error("name")}>
        <Input id="name" name="name" defaultValue={profile.name} required />
      </Field>

      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={profile.email} disabled readOnly />
        <p className="text-muted-foreground text-xs">
          O e-mail é usado para entrar e não pode ser alterado por aqui.
        </p>
      </div>

      <Field label="Resumo" name="headline" error={error("headline")}>
        <Input
          id="headline"
          name="headline"
          defaultValue={profile.headline ?? ""}
          placeholder="Ex.: Marceneira, disponível aos fins de semana"
        />
      </Field>

      <Field label="Sobre você" name="bio" error={error("bio")}>
        <Textarea id="bio" name="bio" rows={5} defaultValue={profile.bio ?? ""} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cidade" name="city" error={error("city")}>
          <Input id="city" name="city" defaultValue={profile.city ?? ""} />
        </Field>
        <Field label="Estado" name="state" error={error("state")}>
          <Input id="state" name="state" defaultValue={profile.state ?? ""} />
        </Field>
        <Field label="País" name="country" error={error("country")}>
          <Input id="country" name="country" maxLength={2} defaultValue={profile.country ?? "BR"} />
        </Field>
        <Field
          label="Raio padrão de busca (metros)"
          name="searchRadiusMeters"
          error={error("searchRadiusMeters")}
        >
          <Input
            id="searchRadiusMeters"
            name="searchRadiusMeters"
            type="number"
            min={1000}
            max={200000}
            step={1000}
            defaultValue={profile.searchRadiusMeters ?? DEFAULT_RADIUS_METERS}
          />
        </Field>
        <Field label="Latitude" name="latitude" error={error("latitude")}>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={profile.latitude ?? ""}
          />
        </Field>
        <Field label="Longitude" name="longitude" error={error("longitude")}>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={profile.longitude ?? ""}
          />
        </Field>
      </div>

      <Field label="Site" name="website" error={error("website")}>
        <Input
          id="website"
          name="website"
          type="url"
          defaultValue={profile.website ?? ""}
          placeholder="https://"
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="justify-self-start">
      {pending ? "Salvando..." : "Salvar perfil"}
    </Button>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
