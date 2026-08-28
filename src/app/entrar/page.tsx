import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage() {
  if (await getSession()) redirect("/painel");

  return (
    <div className="container-page flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta para publicar e responder anúncios.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="sign-in" />
        </CardContent>
      </Card>
    </div>
  );
}
