import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageComposer } from "@/components/message-composer";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getConversation, markConversationRead } from "@/server/queries/messages";

export const metadata: Metadata = { title: "Conversa" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSession();
  const conversation = await getConversation(id, session.user.id);

  if (!conversation) notFound();

  await markConversationRead(id, session.user.id);

  return (
    <div className="container-page max-w-2xl space-y-6 py-10">
      <header className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/mensagens">
            <ArrowLeftIcon />
            Todas as conversas
          </Link>
        </Button>
        <h1 className="font-semibold text-xl tracking-tight">
          <Link href={`/anuncios/${conversation.listingId}`} className="hover:underline">
            {conversation.listingTitle}
          </Link>
        </h1>
      </header>

      <ol className="grid gap-3">
        {conversation.messages.map((message) => {
          const mine = message.senderId === session.user.id;
          return (
            <li
              key={message.id}
              className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {message.body}
              </div>
              <span className="text-muted-foreground text-xs">
                {mine ? "Você" : message.senderName} ·{" "}
                <time dateTime={message.createdAt.toISOString()}>
                  {message.createdAt.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </span>
            </li>
          );
        })}
      </ol>

      <MessageComposer conversationId={id} />
    </div>
  );
}
