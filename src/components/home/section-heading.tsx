import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
};

export function SectionHeading({
  title,
  description,
  href,
  linkLabel = "Ver tudo",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 pb-5",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {href && (
        <Link
          to={href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
