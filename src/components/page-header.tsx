import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="text-xs font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400">
            {eyebrow}
          </span>
        )}
        <h1 className="font-heading text-2xl font-medium tracking-tight text-balance text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
