import { cn } from "@/lib/utils";

/** A perforated paper slip. Put LineItems and a Total inside. */
export function Slip({ title, kicker, className, children }: {
  title?: string;
  kicker?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("ledger-slip px-[18px] pb-6 pt-[22px]", className)}>
      {kicker && (
        <p className="text-center font-ledger-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ledger-ink/55">
          {kicker}
        </p>
      )}
      {title && <h2 className="mb-3.5 mt-1 text-center font-ledger-serif text-xl font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function SlipTotal({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-ledger-ink pt-3 font-ledger-mono text-[15px] font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function Barcode({ className }: { className?: string }) {
  return <div aria-hidden className={cn("ledger-barcode mt-4", className)} />;
}
