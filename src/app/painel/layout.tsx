import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { staffRoleOf } from "@/server/queries/reports";

const TABS = [
  { href: "/painel", label: "Meus anúncios" },
  { href: "/painel/salvos", label: "Salvos" },
  { href: "/painel/perfil", label: "Perfil" },
  { href: "/painel/decisoes", label: "Decisões" },
  { href: "/painel/meus-dados", label: "Meus dados" },
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // As abas de equipe só existem para quem é da equipe, e a de suspensões só
  // para admin. Cada página repete a verificação: esconder o link não é
  // controle de acesso.
  const role = await staffRoleOf(session.user.id);
  const tabs = [
    ...TABS,
    ...(role
      ? [
          { href: "/painel/denuncias", label: "Denúncias" } as const,
          { href: "/painel/contestacoes", label: "Contestações" } as const,
        ]
      : []),
    ...(role === "admin" ? [{ href: "/painel/suspensoes", label: "Suspensões" } as const] : []),
  ];

  return (
    <div className="container-page space-y-8 py-10">
      <nav
        aria-label="Seções do painel"
        className="flex flex-wrap gap-2 border-border border-b pb-4"
      >
        {tabs.map((tab) => (
          <Button key={tab.href} variant="ghost" size="sm" asChild>
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </nav>
      {children}
    </div>
  );
}
