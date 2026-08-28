import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";

const TABS = [
  { href: "/painel", label: "Meus anúncios" },
  { href: "/painel/salvos", label: "Salvos" },
  { href: "/painel/perfil", label: "Perfil" },
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div className="container-page space-y-8 py-10">
      <nav
        aria-label="Seções do painel"
        className="flex flex-wrap gap-2 border-border border-b pb-4"
      >
        {TABS.map((tab) => (
          <Button key={tab.href} variant="ghost" size="sm" asChild>
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </nav>
      {children}
    </div>
  );
}
