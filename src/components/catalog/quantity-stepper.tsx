import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
};

const SIZE_CLASSES = {
  sm: { button: "icon", value: "w-9 text-sm" },
  md: { button: "icon", value: "w-12 text-base" },
  lg: { button: "icon-lg", value: "w-14 text-lg" },
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = "md",
  className,
  ariaLabel = "Quantidade",
}: QuantityStepperProps) {
  const classes = SIZE_CLASSES[size];

  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={classes.button as "icon"}
        onClick={decrease}
        disabled={value <= min}
        aria-label={`Diminuir ${ariaLabel.toLowerCase()}`}
      >
        <Minus />
      </Button>
      <span
        className={cn(
          "text-center font-semibold tabular-nums text-foreground",
          classes.value,
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={classes.button as "icon"}
        onClick={increase}
        disabled={value >= max}
        aria-label={`Aumentar ${ariaLabel.toLowerCase()}`}
      >
        <Plus />
      </Button>
    </div>
  );
}
