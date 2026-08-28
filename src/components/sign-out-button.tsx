"use client";

import { useRouter } from "next/navigation";
import type * as React from "react";
import { useTransition } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="flex w-full items-center gap-2 text-left"
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/");
          router.refresh();
        })
      }
    >
      {children}
    </button>
  );
}
