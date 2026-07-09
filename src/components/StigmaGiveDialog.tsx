import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GLOBAL_STIGMA_TYPES } from "@/lib/stigmaTypes";
import { checkStigmaTitleMilestones } from "@/lib/stigmaRewards";
import { toast } from "sonner";

interface StigmaGiveDialogProps {
  receiverId: string;
  receiverName: string;
  onClose: () => void;
  onGiven?: () => void;
}

export function StigmaGiveDialog({ receiverId, receiverName, onClose, onGiven }: StigmaGiveDialogProps) {
  const { user } = useAuth();
  const [alreadyGiven, setAlreadyGiven] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    dataClient
      .from("stigma_marks")
      .select("stigma_type")
      .eq("giver_id", user.id)
      .eq("receiver_id", receiverId)
      .then(({ data }) => {
        setAlreadyGiven(new Set((data ?? []).map((d: any) => d.stigma_type)));
      });
  }, [user, receiverId]);

  const handleGive = async () => {
    if (!user || !selected || sending) return;
    setSending(true);

    const { error } = await dataClient.from("stigma_marks").insert({
      giver_id: user.id,
      receiver_id: receiverId,
      stigma_type: selected,
      note: note.trim() || null,
    } as any);

    if (error) {
      toast.error(error.message.includes("unique") ? "Already given this stigma." : error.message);
      setSending(false);
      return;
    }

    toast.success(`${selected} stigma given to ${receiverName}!`);

    // Check milestone titles for receiver
    await checkStigmaTitleMilestones(receiverId);

    setSending(false);
    onGiven?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border rounded-lg p-6 max-w-sm w-full mx-4 space-y-4 animate-fade-in"
        style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h2 className="font-cinzel text-lg font-bold text-foreground">Give Stigma</h2>
          <p className="font-mono-stat text-[10px] text-muted-foreground mt-1">
            To: {receiverName}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {GLOBAL_STIGMA_TYPES.map((s) => {
            const given = alreadyGiven.has(s.type);
            const isSelected = selected === s.type;
            return (
              <button
                key={s.type}
                disabled={given}
                onClick={() => setSelected(isSelected ? null : s.type)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  given
                    ? "opacity-40 cursor-not-allowed border-border"
                    : isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <div>
                  <span className="font-cinzel text-sm font-semibold text-foreground">{s.type}</span>
                  {given && <span className="font-mono-stat text-[8px] text-muted-foreground ml-2">GIVEN</span>}
                  <p className="font-body text-xs text-muted-foreground">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 50))}
          placeholder="Optional note (max 50 chars)"
          className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />

        <div className="flex gap-2">
          <Button onClick={handleGive} disabled={!selected || sending} className="flex-1 font-mono-stat text-[11px]">
            {sending ? "Giving..." : "Give Stigma"}
          </Button>
          <Button variant="ghost" onClick={onClose} className="font-mono-stat text-[10px]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
