import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/SectionLabel";

const NPC_ICONS: Record<string, string> = {
  "The Wandering Scholar": "📚",
  "The Rival": "⚔️",
  "The Mysterious Benefactor": "🎭",
  "The Struggling NPC": "🤝",
  "The Ancient Master": "🏯",
  "The Marketplace Merchant": "🏪",
  "The Fellow Protagonist": "🤜",
  "The Dokkaebi": "👺",
};

type NpcEncounter = {
  id: string;
  npc_name: string;
  npc_type: string;
  npc_description: string;
  dialogue: string;
  quest_title: string;
  quest_description: string;
  quest_type: string;
  xp_reward: number;
  special_reward: string | null;
  expires_at: string;
  status: string;
};

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

export function NpcEncounterCard() {
  const { user } = useAuth();
  const [encounter, setEncounter] = useState<NpcEncounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [fadeMessage, setFadeMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!user) return;
    loadOrGenerate();
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!encounter || encounter.status !== "active") return;
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(encounter.expires_at);
      setTimeLeft(remaining);
      if (remaining === "Expired") {
        handleExpire();
        clearInterval(interval);
      }
    }, 60000);
    setTimeLeft(getTimeRemaining(encounter.expires_at));
    return () => clearInterval(interval);
  }, [encounter]);

  const loadOrGenerate = async () => {
    if (!user) return;
    setLoading(true);

    // Check for today's encounter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existing } = await dataClient
      .from("npc_encounters")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const enc = existing[0] as any as NpcEncounter;
      if (enc.status === "active") {
        // Check if expired
        if (new Date(enc.expires_at).getTime() < Date.now()) {
          await dataClient.from("npc_encounters").update({ status: "expired" } as any).eq("id", enc.id);
          setEncounter(null);
        } else {
          setEncounter(enc);
        }
      }
      // If completed or expired, don't show
      setLoading(false);
      return;
    }

    // Generate new encounter
    try {
      const { data, error } = await dataClient.functions.invoke("generate-npc", {
        body: {},
      });
      if (!error && data?.result && data.result !== "already_generated") {
        setEncounter(data.result as NpcEncounter);
      }
    } catch (e) {
      console.error("Failed to generate NPC:", e);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!encounter || !user || accepting) return;
    setAccepting(true);

    // Create a quest from the NPC encounter
    await dataClient.from("quests").insert({
      user_id: user.id,
      title: encounter.quest_title,
      description: `[NPC: ${encounter.npc_name}] ${encounter.quest_description}`,
      quest_type: encounter.quest_type,
      xp_reward: encounter.xp_reward,
      status: "pending",
      due_date: encounter.expires_at,
    } as any);

    await dataClient.from("npc_encounters").update({ status: "completed" } as any).eq("id", encounter.id);
    setEncounter(null);
    setAccepting(false);
  };

  const handleDecline = async () => {
    if (!encounter) return;
    await dataClient.from("npc_encounters").update({ status: "expired" } as any).eq("id", encounter.id);
    setFadeMessage("They walked away...");
    setTimeout(() => {
      setEncounter(null);
      setDismissed(true);
    }, 2000);
  };

  const handleExpire = async () => {
    if (!encounter) return;
    await dataClient.from("npc_encounters").update({ status: "expired" } as any).eq("id", encounter.id);
    setFadeMessage("The window has closed.");
    setTimeout(() => {
      setEncounter(null);
    }, 2000);
  };

  if (loading || dismissed || (!encounter && !fadeMessage)) return null;

  // Fade-out message
  if (fadeMessage) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-fade-in opacity-60">
        <p className="font-body text-sm text-muted-foreground italic text-center">{fadeMessage}</p>
      </div>
    );
  }

  if (!encounter) return null;

  const icon = NPC_ICONS[encounter.npc_type] || "🎭";

  return (
    <div
      className="rounded-lg border bg-card p-4 animate-fade-in"
      style={{
        borderColor: "hsl(var(--primary) / 0.3)",
        boxShadow: "0 0 20px hsl(var(--primary) / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-cinzel text-sm font-bold text-foreground">{encounter.npc_name}</h3>
            <span className="font-mono-stat text-[8px] px-1.5 py-0.5 rounded-full border text-muted-foreground uppercase tracking-wider">
              {encounter.npc_type}
            </span>
          </div>
          <p className="font-body text-xs text-muted-foreground mt-0.5" style={{ opacity: 0.8 }}>
            {encounter.npc_description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono-stat text-[9px] text-muted-foreground">{timeLeft}</span>
        </div>
      </div>

      {/* Dialogue */}
      <div
        className="rounded-md p-3 mb-3"
        style={{ background: "hsl(var(--surface))" }}
      >
        <p className="font-body text-sm italic text-foreground" style={{ opacity: 0.9 }}>
          "{encounter.dialogue}"
        </p>
      </div>

      {/* Quest Offer */}
      <div className="mb-3">
        <SectionLabel prefix="◆">Side Quest</SectionLabel>
        <p className="font-body text-sm text-foreground mt-1">{encounter.quest_title}</p>
        <p className="font-body text-xs text-muted-foreground mt-0.5">{encounter.quest_description}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono-stat text-[10px] text-primary">+{encounter.xp_reward} XP</span>
          <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">{encounter.quest_type}</span>
          {encounter.special_reward && (
            <span className="font-mono-stat text-[9px] text-primary/80 animate-pulse">✦ Special Reward: ???</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={accepting}
          size="sm"
          className="flex-1 font-mono-stat text-[11px] tracking-wider"
        >
          {accepting ? "Accepting..." : "Accept Quest"}
        </Button>
        <Button
          onClick={handleDecline}
          variant="ghost"
          size="sm"
          className="font-mono-stat text-[10px] text-muted-foreground"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
