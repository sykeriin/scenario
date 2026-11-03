import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Stamp, type StampVariant } from "./Stamp";

/** One quest as a ledger line: name ........ value, with a stamp when done. */
export function LineItem({ name, value, done, onToggle, stamp = "done", className }: {
  name: string;
  value: React.ReactNode;
  done: boolean;
  onToggle: () => void;
  stamp?: StampVariant;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={onToggle}
      className={cn(
        "relative flex min-h-[46px] w-full items-baseline gap-1.5 border-t border-dashed border-ledger-ink/30 py-3 text-left font-ledger-mono text-sm font-medium first:border-t-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-stamp",
        className
      )}
    >
      <span className={cn("whitespace-nowrap", done && "text-ledger-ink/50")}>{name}</span>
      <span aria-hidden className="min-w-3 flex-1 -translate-y-[3px] border-b-2 border-dotted border-ledger-ink/35" />
      <span className="font-semibold tabular-nums">{value}</span>
      <Stamp on={done} variant={stamp} label={stamp === "foil" ? "PERFECT" : "DONE"} />
    </button>
  );
}
