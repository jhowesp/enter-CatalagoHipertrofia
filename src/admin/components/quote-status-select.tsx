import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_OPTIONS, type QuoteStatus } from "@/config/store";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<QuoteStatus, string> = {
  new: "bg-foreground/10 text-foreground border-border",
  in_progress: "bg-warning/15 text-warning border-warning/40",
  sold: "bg-success/15 text-success border-success/40",
  cancelled: "bg-secondary text-muted-foreground border-border",
};

export function QuoteStatusBadge({
  status,
  className,
}: {
  status: QuoteStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className,
      )}
    >
      {QUOTE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function QuoteStatusSelect({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: QuoteStatus;
  onChange: (next: QuoteStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as QuoteStatus)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-10 w-[168px]", className)} aria-label="Status do orçamento">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUOTE_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
