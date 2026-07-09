import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { ATTACK_EFFECTS } from "@/lib/disasterTypes";
import { toast } from "sonner";

interface Disaster {
  id: string;
  name: string;
  type: string;
  disaster_class: number;
  flavor_text: string;
  max_hp: number;
  current_hp: number;
  reward_xp: number;
  reward_title: string | null;
  deadline: string;
  status: string;
}

interface DisasterQuest {
  id: string;
  title: string;
  description: string | null;
  damage_dealt: number;
  status: string;
}

interface DisasterAttack {
  id: string;
  attack_type: string;
  damage_description: string;
  attacked_at: string;
}

export function DisasterCard() {
  const { user } = useAuth();
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [quests, setQuests] = useState<Record<string, DisasterQuest[]>>({});
  const [attacks, setAttacks] = useState<Record<string, DisasterAttack[]>>({});
  const [completing, setCompleting] = useState<string | null>(null);
  const [showCleared, setShowCleared] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDisasters();
    // Check for spawns and attacks
    dataClient.functions.invoke("disaster-system", {
      body: { action: "check_and_spawn" },
    }).then(() => loadDisasters());

    dataClient.functions.invoke("disaster-system", {
      body: { action: "attack_check" },
    });
  }, [user]);

  const loadDisasters = async () => {
    if (!user) return;
    const { data } = await dataClient
      .from("disasters")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "approaching"])
      .order("spawned_at", { ascending: false });

    if (data && data.length > 0) {
      setDisasters(data as unknown as Disaster[]);

      // Load quests and attacks for each
      for (const d of data) {
        const { data: dQuests } = await dataClient
          .from("disaster_quests")
          .select("*")
          .eq("disaster_id", d.id)
          .eq("user_id", user.id)
          .order("damage_dealt", { ascending: false });

        if (dQuests) setQuests((prev) => ({ ...prev, [d.id]: dQuests as unknown as DisasterQuest[] }));

        const { data: dAttacks } = await dataClient
          .from("disaster_attacks")
          .select("*")
          .eq("disaster_id", d.id)
          .eq("user_id", user.id)
          .order("attacked_at", { ascending: false })
          .limit(3);

        if (dAttacks) setAttacks((prev) => ({ ...prev, [d.id]: dAttacks as unknown as DisasterAttack[] }));
      }
    }
  };

  const completeQuest = async (questId: string, disasterId: string) => {
    setCompleting(questId);
    try {
      const { data, error } = await dataClient.functions.invoke("disaster-system", {
        body: { action: "complete_disaster_quest", questId },
      });

      if (error) throw error;

      const result = data?.result;
      if (result?.defeated) {
        setShowCleared(disasterId);
        toast.success("DISASTER DEFEATED! 🏆");
        setTimeout(() => {
          setShowCleared(null);
          loadDisasters();
        }, 3000);
      } else {
        toast.success(`Dealt ${result?.damage_dealt ?? 0} damage!`);
        loadDisasters();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to complete quest");
    } finally {
      setCompleting(null);
    }
  };

  if (disasters.length === 0) return null;

  return (
    <>
      {/* Cleared overlay */}
      {showCleared && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-6xl animate-bounce">⚔️</div>
            <h1 className="font-cinzel text-4xl font-black" style={{ color: "hsl(45 90% 55%)" }}>
              DISASTER CLEARED
            </h1>
            <p className="font-body text-muted-foreground">
              {disasters.find((d) => d.id === showCleared)?.name} has been defeated.
            </p>
          </div>
        </div>
      )}

      {disasters.map((disaster) => {
        const dQuests = quests[disaster.id] || [];
        const dAttacks = attacks[disaster.id] || [];
        const hpPercent = (disaster.current_hp / disaster.max_hp) * 100;
        const deadline = new Date(disaster.deadline);
        const hoursLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / (60 * 60 * 1000)));
        const isLowHp = hpPercent < 25;

        return (
          <Card
            key={disaster.id}
            className="border-2 overflow-hidden"
            style={{ borderColor: "hsl(0 80% 55%)" }}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <h3
                      className="font-cinzel text-lg font-black"
                      style={{
                        color: "hsl(0 80% 55%)",
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    >
                      {disaster.name}
                    </h3>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-1 italic">
                    {disaster.flavor_text}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground">
                    Class {disaster.disaster_class}
                  </span>
                  <div
                    className="font-mono-stat text-sm font-bold mt-1"
                    style={{ color: hoursLeft < 24 ? "hsl(0 80% 55%)" : "hsl(var(--foreground))" }}
                  >
                    {hoursLeft < 24 ? `${hoursLeft}h left` : `${Math.ceil(hoursLeft / 24)}d left`}
                  </div>
                </div>
              </div>

              {/* HP Bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono-stat text-[10px] uppercase tracking-widest" style={{ color: "hsl(0 80% 55%)" }}>
                    HP
                  </span>
                  <span className="font-mono-stat text-xs" style={{ color: "hsl(0 80% 55%)" }}>
                    {disaster.current_hp} / {disaster.max_hp}
                  </span>
                </div>
                <div
                  className="relative h-3 w-full overflow-hidden rounded-full"
                  style={{ background: "hsl(var(--dim))" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${hpPercent}%`,
                      background: "hsl(0 80% 55%)",
                      boxShadow: isLowHp
                        ? "0 0 12px hsl(0 80% 55% / 0.8)"
                        : "0 0 6px hsl(0 80% 55% / 0.4)",
                      animation: isLowHp ? "pulse 1.5s ease-in-out infinite" : undefined,
                    }}
                  />
                </div>
              </div>

              {/* Disaster Quests — Deal Damage */}
              {dQuests.length > 0 && (
                <div>
                  <p className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    ⚔ Deal Damage
                  </p>
                  <div className="space-y-1.5">
                    {dQuests.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-foreground truncate">{q.title}</p>
                          {q.description && (
                            <p className="font-body text-[10px] text-muted-foreground truncate">{q.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono-stat text-xs" style={{ color: "hsl(0 80% 55%)" }}>
                            ⚔ {q.damage_dealt}
                          </span>
                          {q.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              style={{ borderColor: "hsl(0 80% 55%)", color: "hsl(0 80% 55%)" }}
                              onClick={() => completeQuest(q.id, disaster.id)}
                              disabled={completing === q.id}
                            >
                              {completing === q.id ? "..." : "Complete"}
                            </Button>
                          ) : (
                            <span className="font-mono-stat text-[10px] text-muted-foreground">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attack Log */}
              {dAttacks.length > 0 && (
                <div>
                  <p className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Attack Log
                  </p>
                  <div className="space-y-1">
                    {dAttacks.map((a) => {
                      const effect = ATTACK_EFFECTS[a.attack_type];
                      return (
                        <div key={a.id} className="flex items-start gap-2">
                          <span className="text-sm">{effect?.icon ?? "⚡"}</span>
                          <p
                            className="font-body text-xs italic"
                            style={{ color: "hsl(0 70% 60%)" }}
                          >
                            {a.damage_description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reward */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <span className="font-mono-stat text-[10px] text-muted-foreground">Reward:</span>
                <span className="font-mono-stat text-xs text-primary">{disaster.reward_xp} XP</span>
                {disaster.reward_title && (
                  <span className="font-mono-stat text-[10px] text-primary">+ "{disaster.reward_title}"</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
