import type * as React from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border border-dashed px-6 py-16 text-center">
      <p className="font-semibold text-lg">{title}</p>
      <p className="max-w-md text-muted-foreground text-sm">{description}</p>
      {action}
    </div>
  );
}
