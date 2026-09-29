import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DiscountBadge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  if (!percent || percent <= 0) return null;

  return (
    <Badge
      className={cn(
        "border-transparent bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.9)]",
        className,
      )}
    >
      -{percent}%
    </Badge>
  );
}
