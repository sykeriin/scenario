import { cn } from "@/lib/utils";

/** Dashed-outline card for the one main thing to do. */
export function Ticket({ kicker, title, action, onAction, className }: {
  kicker: string;
  title: string;
  action: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-[1.5px] border-dashed border-ledger-faded/50 px-4 py-3.5", className)}>
      <div className="min-w-0 flex-1">
        <p className="font-ledger-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ledger-faded">{kicker}</p>
        <p className="mt-0.5 font-ledger-serif text-[17px] font-semibold leading-tight">{title}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="min-h-[44px] bg-ledger-paper px-4 font-ledger-mono text-[13px] font-semibold tracking-wide text-ledger-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-stamp"
      >
        {action}
      </button>
    </div>
  );
}
