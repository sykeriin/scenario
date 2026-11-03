import { cn } from "@/lib/utils";

/**
 * Rolling counter. Each digit is a 0-9 column shifted to the current digit, so changing
 * the value rolls the digits instead of swapping text. Screen readers get the plain number.
 */
export function Odometer({ value, className }: { value: number; className?: string }) {
  const digits = String(Math.max(0, Math.floor(value))).split("");
  return (
    <span role="text" aria-label={String(value)} className={cn("inline-flex tabular-nums", className)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} aria-hidden className="ledger-odo-col">
          <span style={{ transform: `translateY(-${Number(d)}em)` }}>
            {Array.from({ length: 10 }, (_, n) => (
              <i key={n}>{n}</i>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
