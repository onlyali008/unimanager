export function PageHeader({
  title,
  description,
  eyebrow = "Semestra",
  children,
}: {
  title: string;
  description?: string;
  /** Mono kicker above the title — a dateline or section context. */
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <span aria-hidden className="size-2.5 shrink-0 bg-primary" />
        <span className="label-mono">{eyebrow}</span>
      </div>
      <div className="rule-strong flex flex-wrap items-end justify-between gap-4 pb-4">
        <div className="space-y-2">
          <h1 className="font-heading text-4xl leading-[0.95] font-extrabold tracking-[-0.03em] sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="flex flex-wrap items-center gap-2 pb-1">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
