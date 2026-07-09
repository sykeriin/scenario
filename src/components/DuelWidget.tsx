import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { SystemMessage } from "@/components/ui/SystemMessage";

interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  scenario_title: string;
  category: string;
  deadline: string;
  xp_stake: number;
  status: string;
  winner_id: string | null;
  challenger_scenario_id: string | null;
  opponent_scenario_id: string | null;
}

interface DuelProgress {
  user_id: string;
  quests_completed: number;
  total_quests: number;
  cleared_at: string | null;
}

interface UserNames {
  [id: string]: string;
}

export const DuelWidget = () => {
  const { user } = useAuth();
  const [activeDuels, setActiveDuels] = useState<Duel[]>([]);
  const [pendingDuels, setPendingDuels] = useState<Duel[]>([]);
  const [progress, setProgress] = useState<Record<string, DuelProgress[]>>({});
  const [names, setNames] = useState<UserNames>({});
  const [notification, setNotification] = useState<{ title: string; subtitle: string; rarity: "common" | "epic" | "legendary" } | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDuels();
  }, [user]);

  const loadDuels = async () => {
    if (!user) return;

    const { data: duels } = await dataClient
      .from("duels")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });

    const allDuels = (duels ?? []) as Duel[];
    setActiveDuels(allDuels.filter((d) => d.status === "active"));
    setPendingDuels(allDuels.filter((d) => d.status === "pending" && d.opponent_id === user.id));

    // Fetch progress for active duels
    const activeDuelIds = allDuels.filter((d) => d.status === "active").map((d) => d.id);
    if (activeDuelIds.length > 0) {
      const { data: prog } = await dataClient
        .from("duel_progress")
        .select("*")
        .in("duel_id", activeDuelIds);

      const progressMap: Record<string, DuelProgress[]> = {};
      (prog ?? []).forEach((p: any) => {
        if (!progressMap[p.duel_id]) progressMap[p.duel_id] = [];
        progressMap[p.duel_id].push(p);
      });
      setProgress(progressMap);
    }

    // Fetch names
    const userIds = new Set<string>();
    allDuels.forEach((d) => {
      userIds.add(d.challenger_id);
      userIds.add(d.opponent_id);
    });

    if (userIds.size > 0) {
      const { data: profiles } = await dataClient
        .from("profiles")
        .select("id, display_name, username")
        .in("id", Array.from(userIds));

      const nameMap: UserNames = {};
      (profiles ?? []).forEach((p) => {
        nameMap[p.id] = p.display_name || p.username;
      });
      setNames(nameMap);
    }
  };

  const acceptDuel = async (duelId: string) => {
    setAccepting(duelId);
    const { data, error } = await dataClient.functions.invoke("generate-duel", {
      body: { duel_id: duelId },
    });

    if (!error && data?.success) {
      setNotification({
        title: "DUEL ACCEPTED",
        subtitle: "The scenarios have been generated. Begin your quest.",
        rarity: "epic",
      });
      loadDuels();
    }
    setAccepting(null);
  };

  const declineDuel = async (duelId: string) => {
    await dataClient.from("duels").update({ status: "completed" }).eq("id", duelId);
    loadDuels();
  };

  const getTimeLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "EXPIRED";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  if (!user || (activeDuels.length === 0 && pendingDuels.length === 0)) return null;

  return (
    <>
      {notification && (
        <SystemMessage
          title={notification.title}
          subtitle={notification.subtitle}
          rarity={notification.rarity}
          onDismiss={() => setNotification(null)}
        />
      )}

      <div className="space-y-3">
        {/* Pending challenges */}
        {pendingDuels.map((duel) => (
          <div
            key={duel.id}
            className="rounded-lg border p-4 space-y-3"
            style={{
              borderColor: "hsl(0 60% 50% / 0.4)",
              background: "linear-gradient(135deg, hsl(0 70% 50% / 0.05), transparent)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <div className="text-center">
              <SectionLabel prefix="⚔">DUEL CHALLENGE</SectionLabel>
              <p className="font-body text-xs text-muted-foreground mt-1">
                <span className="text-foreground font-semibold">{names[duel.challenger_id] ?? "Unknown"}</span> has challenged you
              </p>
            </div>
            <div className="text-center space-y-1">
              <div className="font-cinzel text-sm font-bold">{duel.scenario_title}</div>
              <div className="font-mono-stat text-[9px] text-muted-foreground">
                {duel.category} · Deadline: {getTimeLeft(duel.deadline)} · Stake: <span style={{ color: "hsl(0 70% 55%)" }}>{duel.xp_stake} XP</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => declineDuel(duel.id)}
                className="flex-1 font-mono-stat text-[9px]"
              >
                Forfeit
              </Button>
              <Button
                size="sm"
                disabled={accepting === duel.id}
                onClick={() => acceptDuel(duel.id)}
                className="flex-1 font-mono-stat text-[9px] text-white"
                style={{ background: "hsl(0 70% 50%)" }}
              >
                {accepting === duel.id ? "Generating..." : "⚔ Accept"}
              </Button>
            </div>
          </div>
        ))}

        {/* Active duels */}
        {activeDuels.map((duel) => {
          const progs = progress[duel.id] ?? [];
          const myProg = progs.find((p) => p.user_id === user.id);
          const theirProg = progs.find((p) => p.user_id !== user.id);
          const opponentId = duel.challenger_id === user.id ? duel.opponent_id : duel.challenger_id;
          const myPct = myProg && myProg.total_quests > 0 ? (myProg.quests_completed / myProg.total_quests) * 100 : 0;
          const theirPct = theirProg && theirProg.total_quests > 0 ? (theirProg.quests_completed / theirProg.total_quests) * 100 : 0;

          return (
            <div
              key={duel.id}
              className="rounded-lg border p-4 space-y-3 relative overflow-hidden"
              style={{
                borderColor: "hsl(0 60% 50% / 0.3)",
                boxShadow: "0 0 20px hsl(0 70% 50% / 0.1)",
              }}
            >
              <div className="text-center">
                <SectionLabel prefix="⚔">ACTIVE DUEL</SectionLabel>
                <div className="font-cinzel text-xs font-bold mt-1">{duel.scenario_title}</div>
                <div className="font-mono-stat text-[8px] text-muted-foreground mt-0.5">
                  ⏱ {getTimeLeft(duel.deadline)} remaining · <span style={{ color: "hsl(0 70% 55%)" }}>{duel.xp_stake} XP</span> at stake
                </div>
              </div>

              {/* VS Split */}
              <div className="flex items-center gap-2">
                {/* Left — You */}
                <div className="flex-1 text-center">
                  <div className="font-mono-stat text-[9px] text-primary font-bold truncate">YOU</div>
                  <div className="w-full bg-secondary/50 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${myPct}%`,
                        background: "hsl(var(--primary))",
                      }}
                    />
                  </div>
                  <div className="font-mono-stat text-[8px] text-muted-foreground mt-0.5">
                    {myProg?.quests_completed ?? 0}/{myProg?.total_quests ?? 0}
                  </div>
                </div>

                {/* VS */}
                <div className="font-cinzel text-lg font-bold shrink-0" style={{ color: "hsl(0 70% 50%)" }}>VS</div>

                {/* Right — Opponent */}
                <div className="flex-1 text-center">
                  <div className="font-mono-stat text-[9px] font-bold truncate" style={{ color: "hsl(0 70% 55%)" }}>
                    {names[opponentId] ?? "Opponent"}
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${theirPct}%`,
                        background: "hsl(0 70% 50%)",
                      }}
                    />
                  </div>
                  <div className="font-mono-stat text-[8px] text-muted-foreground mt-0.5">
                    {theirProg?.quests_completed ?? 0}/{theirProg?.total_quests ?? 0}
                  </div>
                </div>
              </div>

              {/* Ahead indicator */}
              {myPct > theirPct && (
                <div className="font-mono-stat text-[8px] text-center text-primary">◆ YOU'RE AHEAD</div>
              )}
              {theirPct > myPct && (
                <div className="font-mono-stat text-[8px] text-center" style={{ color: "hsl(0 70% 55%)" }}>◆ FALLING BEHIND</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
