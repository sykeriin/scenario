import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { toast } from "sonner";

interface PendingScenario {
  id: string;
  title: string;
  description: string | null;
  personal_note: string | null;
  category: string;
  xp_reward: number;
  deadline: string | null;
  mentor_id: string;
  mentor_name?: string;
  created_at: string;
}

export function PendingConstellationScenarios() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingScenario[]>([]);

  useEffect(() => {
    if (!user) return;
    loadPending();
  }, [user]);

  const loadPending = async () => {
    if (!user) return;
    const { data } = await dataClient
      .from("constellation_scenarios")
      .select("*")
      .eq("sponsee_id", user.id)
      .eq("status", "pending_acceptance")
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setPending([]);
      return;
    }

    // Get mentor names
    const mentorIds = [...new Set(data.map((d: any) => d.mentor_id))];
    const { data: profiles } = await dataClient
      .from("profiles")
      .select("id, display_name, username")
      .in("id", mentorIds);

    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nameMap[p.id] = p.display_name || p.username;
    });

    setPending(
      data.map((d: any) => ({
        ...d,
        mentor_name: nameMap[d.mentor_id] || "Unknown Constellation",
      }))
    );
  };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await dataClient
      .from("constellation_scenarios")
      .update({
        status: accept ? "active" : "declined",
        responded_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(accept ? "Scenario accepted! It appears in your Quest Board." : "Scenario declined respectfully.");
    loadPending();
  };

  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      {pending.map((s) => (
        <div
          key={s.id}
          className="rounded-lg border-2 p-5 space-y-3 animate-fade-in constellation-scenario-card"
          style={{
            borderImage: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 80% 40%), hsl(45 90% 55%)) 1",
            background: "linear-gradient(135deg, hsl(var(--card)), hsl(45 90% 55% / 0.03))",
            boxShadow: "0 0 30px hsl(45 90% 55% / 0.08)",
          }}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <p className="font-mono-stat text-[9px] uppercase tracking-[0.3em]" style={{ color: "hsl(45 90% 55%)" }}>
              ◆ A Constellation Has Spoken
            </p>
            <p className="font-cinzel text-sm font-bold text-foreground">
              {s.mentor_name} has issued you a personal Scenario.
            </p>
          </div>

          <div className="h-px" style={{ background: "hsl(45 90% 55% / 0.2)" }} />

          <div className="space-y-2">
            <h3 className="font-cinzel text-base font-bold text-foreground">{s.title}</h3>
            {s.personal_note && (
              <p className="font-body text-xs italic text-muted-foreground">
                Their words: "{s.personal_note}"
              </p>
            )}
            {s.description && (
              <p className="font-body text-xs text-muted-foreground">{s.description}</p>
            )}
            <div className="flex items-center gap-4">
              <span className="font-mono-stat text-[10px] text-primary">{s.xp_reward} XP (1.25× boosted)</span>
              <span className="font-mono-stat text-[10px] text-muted-foreground">{s.category}</span>
              {s.deadline && (
                <span className="font-mono-stat text-[10px] text-destructive">
                  Due: {new Date(s.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <p className="font-body text-xs text-muted-foreground italic text-center">
            This Scenario carries their authority. Will you accept?
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => respond(s.id, true)}
              className="flex-1 font-mono-stat text-[11px] tracking-wider"
              style={{ background: "hsl(45 90% 55%)", color: "hsl(40 100% 2%)" }}
            >
              ✦ Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => respond(s.id, false)}
              className="flex-1 font-mono-stat text-[10px]"
            >
              Decline Respectfully
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
