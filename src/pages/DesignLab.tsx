import { useState } from "react";
import { Slip, SlipTotal, Barcode, LineItem, Odometer, Ticket } from "@/components/ledger";
import { isMuted, setMuted, stampFeedback } from "@/lib/feedback";

const QUESTS = [
  { name: "Train 20 min", xp: 40 },
  { name: "Read 15 pages", xp: 30 },
  { name: "Plan tomorrow", xp: 20 },
  { name: "Message a friend", xp: 20 },
];

/** Dev-only sandbox for the ledger primitives (route: /design). */
export default function DesignLab() {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [muted, setMutedState] = useState(isMuted());
  const xp = 90 + QUESTS.reduce((sum, q, i) => sum + (done[i] ? q.xp : 0), 0);

  return (
    <div className="ledger mx-auto min-h-screen max-w-[390px] space-y-[18px] px-[18px] py-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-ledger-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ledger-faded">Design lab</p>
          <h1 className="mt-1 font-ledger-serif text-[22px] font-semibold leading-tight">Ledger primitives</h1>
        </div>
        <button
          type="button"
          onClick={() => { setMuted(!muted); setMutedState(!muted); }}
          className="min-h-[44px] border border-ledger-faded/50 px-3 font-ledger-mono text-[11px] uppercase tracking-wider"
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </header>

      <Slip kicker="Daily quests" title="Today's slip">
        {QUESTS.map((q, i) => (
          <LineItem
            key={q.name}
            name={q.name}
            value={q.xp}
            done={!!done[i]}
            onToggle={() => {
              if (!done[i]) stampFeedback();
              setDone((d) => ({ ...d, [i]: !d[i] }));
            }}
          />
        ))}
        <SlipTotal label="XP TODAY" value={<><Odometer value={xp} /> / 200</>} />
        <Barcode />
      </Slip>

      <Ticket kicker="Main quest · 2 of 4" title="Finish the portfolio site" action="OPEN" />
    </div>
  );
}
