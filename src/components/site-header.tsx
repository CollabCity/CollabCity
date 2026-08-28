import { LogOutIcon, MessageCircleIcon, PlusIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSession } from "@/lib/session";
import { initials } from "@/lib/utils";
import { countUnreadMessages } from "@/server/queries/messages";

export async function SiteHeader() {
  const session = await getSession();
  const unread = session ? await countUnreadMessages(session.user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-border border-b bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.svg" alt="" width={28} height={28} priority />
          <span>CollabCity</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/anuncios">Explorar</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/anuncios?intent=need">Quem precisa</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/anuncios?intent=offer">Quem oferece</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {session ? (
            <>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link
                  href="/mensagens"
                  aria-label={`Mensagens${unread ? `, ${unread} não lidas` : ""}`}
                >
                  <MessageCircleIcon />
                  {unread > 0 && (
                    <Badge
                      variant="accent"
                      className="-top-1 -right-1 absolute size-5 justify-center p-0 text-[10px]"
                    >
                      {unread > 9 ? "9+" : unread}
                    </Badge>
                  )}
                </Link>
              </Button>

              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/anuncios/novo">
                  <PlusIcon />
                  Publicar
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Menu da conta">
                    <Avatar>
                      {session.user.image && <AvatarImage src={session.user.image} alt="" />}
                      <AvatarFallback>{initials(session.user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 h-px bg-border" />
                  <DropdownMenuItem asChild>
                    <Link href="/painel">
                      <UserIcon className="size-4" />
                      Meu painel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/painel/perfil">Editar perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/painel/salvos">Salvos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 h-px bg-border" />
                  <DropdownMenuItem asChild>
                    <SignOutButton>
                      <LogOutIcon className="size-4" />
                      Sair
                    </SignOutButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/entrar">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
