import { useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface DuelChallengeDialogProps {
  opponentId: string;
  opponentName: string;
  onClose: () => void;
  onSent: () => void;
}

const CATEGORIES = ["Academic", "Career", "Skills", "Physical", "Creative"];

export const DuelChallengeDialog = ({ opponentId, opponentName, onClose, onSent }: DuelChallengeDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Academic");
  const [xpStake, setXpStake] = useState(50);
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user || !title.trim()) return;
    setSending(true);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    const { error } = await dataClient.from("duels").insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      scenario_title: title.trim(),
      category,
      deadline: deadline.toISOString(),
      xp_stake: xpStake,
      status: "pending",
    });

    setSending(false);
    if (!error) onSent();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-lg border bg-card p-6 w-full max-w-md space-y-4 shadow-2xl"
        style={{ borderColor: "hsl(0 60% 40% / 0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <SectionLabel prefix="⚔">CHALLENGE TO DUEL</SectionLabel>
          <p className="font-body text-sm text-muted-foreground mt-1">
            vs <span className="text-foreground font-semibold">{opponentName}</span>
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Scenario Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master React Hooks"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={100}
            />
          </div>

          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Category</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`font-mono-stat text-[9px] uppercase px-2 py-1 rounded-full border transition-all ${
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">XP Stake ({xpStake} XP)</label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={xpStake}
              onChange={(e) => setXpStake(Number(e.target.value))}
              className="w-full mt-1 accent-[hsl(0,70%,50%)]"
            />
            <div className="flex justify-between font-mono-stat text-[8px] text-muted-foreground">
              <span>10 XP</span>
              <span>500 XP</span>
            </div>
          </div>

          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Deadline ({deadlineDays} days)</label>
            <input
              type="range"
              min={1}
              max={14}
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              className="w-full mt-1 accent-[hsl(0,70%,50%)]"
            />
            <div className="flex justify-between font-mono-stat text-[8px] text-muted-foreground">
              <span>1 day</span>
              <span>14 days</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 font-mono-stat text-[10px]">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || sending}
            onClick={handleSend}
            className="flex-1 font-mono-stat text-[10px] text-white"
            style={{ background: "hsl(0 70% 50%)" }}
          >
            {sending ? "Sending..." : "⚔ Send Challenge"}
          </Button>
        </div>
      </div>
    </div>
  );
};
