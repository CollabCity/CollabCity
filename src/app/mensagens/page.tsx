import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { getConversationsForUser } from "@/server/queries/messages";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  const session = await requireSession();
  const conversations = await getConversationsForUser(session.user.id);

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <h1 className="font-semibold text-2xl tracking-tight">Mensagens</h1>

      {conversations.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="Quando você responder a um anúncio ou alguém responder ao seu, a conversa aparece aqui."
          action={
            <Button asChild>
              <Link href="/anuncios">Explorar anúncios</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="p-5">
                  <Link href={`/mensagens/${conversation.id}`} className="block space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{conversation.counterpartName}</span>
                      <div className="flex items-center gap-2">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="accent">{conversation.unreadCount}</Badge>
                        )}
                        <time
                          dateTime={conversation.lastMessageAt.toISOString()}
                          className="text-muted-foreground text-xs"
                        >
                          {conversation.lastMessageAt.toLocaleDateString("pt-BR")}
                        </time>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{conversation.listingTitle}</p>
                    {conversation.lastMessage && (
                      <p className="truncate text-muted-foreground text-sm">
                        {conversation.lastMessage}
                      </p>
                    )}
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
