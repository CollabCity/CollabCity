import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/painel");

  return (
    <div className="container-page flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Leva menos de um minuto. Você poderá publicar pedidos e ofertas em seguida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="sign-up" />
        </CardContent>
      </Card>
    </div>
  );
}
