import { cn } from "@/lib/utils";

export type StampVariant = "done" | "foil";

/**
 * Rubber stamp mark. Render it inside a `relative` parent; flip `on` to press it.
 * `variant="foil"` is reserved for rare stamps.
 */
export function Stamp({ on, label = "DONE", variant = "done", rotate = -8, className }: {
  on: boolean;
  label?: string;
  variant?: StampVariant;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-on={on}
      data-variant={variant}
      className={cn("ledger-stamp text-ledger-stamp", className)}
      style={{ ["--stamp-rot" as string]: `${rotate}deg` }}
    >
      {label}
    </span>
  );
}
