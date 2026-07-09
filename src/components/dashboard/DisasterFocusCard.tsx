import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { TagChip } from "@/components/dashboard/TagChip";
import { toast } from "sonner";

interface Disaster {
  id: string;
  name: string;
  disaster_class: number;
  flavor_text: string;
  max_hp: number;
  current_hp: number;
  deadline: string;
}

interface DisasterQuest {
  id: string;
  title: string;
  damage_dealt: number;
  status: string;
}

interface DisasterAttack {
  damage_description: string;
  attacked_at: string;
}

export function DisasterFocusCard() {
  const { user } = useAuth();
  const { t } = useUniverse();
  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [quests, setQuests] = useState<DisasterQuest[]>([]);
  const [lastAttack, setLastAttack] = useState<DisasterAttack | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await dataClient
      .from("disasters")
      .select("id, name, disaster_class, flavor_text, max_hp, current_hp, deadline")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!data?.[0]) {
      setDisaster(null);
      return;
    }

    const d = data[0] as Disaster;
    setDisaster(d);

    const [{ data: dQuests }, { data: dAttacks }] = await Promise.all([
      dataClient
        .from("disaster_quests")
        .select("id, title, damage_dealt, status")
        .eq("disaster_id", d.id)
        .eq("user_id", user.id)
        .order("damage_dealt", { ascending: false }),
      dataClient
        .from("disaster_attacks")
        .select("damage_description, attacked_at")
        .eq("disaster_id", d.id)
        .eq("user_id", user.id)
        .order("attacked_at", { ascending: false })
        .limit(1),
    ]);

    setQuests((dQuests as DisasterQuest[]) ?? []);
    setLastAttack((dAttacks as DisasterAttack[])?.[0] ?? null);
  };

  useEffect(() => {
    if (!user) return;
    load();
    dataClient.functions.invoke("disaster-system", { body: { action: "check_and_spawn" } }).then(() => load());
  }, [user]);

  const completeQuest = async (questId: string) => {
    setCompleting(questId);
    try {
      const { data, error } = await dataClient.functions.invoke("disaster-system", {
        body: { action: "complete_disaster_quest", questId },
      });
      if (error) throw error;
      const result = data?.result;
      if (result?.defeated) {
        toast.success(`${t("disaster").toUpperCase()} DEFEATED!`);
      } else {
        toast.success(`Dealt ${result?.damage_dealt ?? 0} damage!`);
      }
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCompleting(null);
    }
  };

  if (!disaster) {
    return (
      <div className="prototype-focus-card flex h-full min-h-[320px] items-center justify-center rounded-[20px] border-[1.5px] border-dashed border-border bg-[hsl(var(--card)/0.5)] p-7">
        <p className="font-body text-sm text-muted-foreground">No active {t("disaster").toLowerCase()}.</p>
      </div>
    );
  }

  const deadline = new Date(disaster.deadline);
  const msLeft = Math.max(0, deadline.getTime() - Date.now());
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const s = Math.floor((msLeft % 60000) / 1000);
  const timeLeft = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const red = "hsl(var(--destructive))";

  return (
    <div
      className="prototype-focus-card relative h-full min-h-[320px] overflow-hidden rounded-[20px] border-[1.5px] p-7"
      style={{ borderColor: `${red}44`, background: "hsl(0 50% 4% / 0.9)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${red}12, transparent 65%)` }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${red}, transparent)` }}
      />

      <div className="relative mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 font-mono-stat text-[9px] tracking-[0.2em]" style={{ color: red }}>
            ⚠ {t("disaster").toUpperCase()} ACTIVE · CLASS {disaster.disaster_class}
          </div>
          <h2 className="font-cinzel text-[26px] font-bold leading-tight text-foreground">{disaster.name}</h2>
        </div>
        <div className="text-right">
          <div className="font-mono-stat text-[9px] text-muted-foreground">TIME REMAINING</div>
          <div className="font-cinzel text-[22px] font-bold" style={{ color: red }}>
            {timeLeft}
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="mb-2 flex justify-between">
          <span className="font-mono-stat text-[9px] text-muted-foreground">BOSS HP</span>
          <span className="font-mono-stat text-[9px]" style={{ color: red }}>
            {disaster.current_hp.toLocaleString()} / {disaster.max_hp.toLocaleString()}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[hsl(0_50%_6%)]">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${(disaster.current_hp / disaster.max_hp) * 100}%`,
              background: `linear-gradient(90deg, ${red}88, ${red})`,
              boxShadow: `0 0 14px ${red}88`,
            }}
          />
        </div>
      </div>

      <div className="relative mb-3 font-mono-stat text-[9px] tracking-wider text-muted-foreground">
        DEAL DAMAGE — COMPLETE THESE QUESTS
      </div>

      <div className="relative space-y-2">
        {quests.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No damage quests available.</p>
        ) : (
          quests.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={q.status === "completed" || completing === q.id}
              onClick={() => completeQuest(q.id)}
              className="flex w-full items-center justify-between rounded-[10px] border px-4 py-3 text-left transition-all disabled:opacity-40"
              style={{ background: "hsl(0 50% 6%)", borderColor: `${red}22` }}
            >
              <span className="font-body text-[13px] text-foreground">{q.title}</span>
              <span className="font-mono-stat text-xs font-bold" style={{ color: red }}>
                ⚔ {q.damage_dealt}
              </span>
            </button>
          ))
        )}
      </div>

      {lastAttack && (
        <p className="relative mt-4 font-mono-stat text-[9px] italic text-muted-foreground">
          Last attack: "{lastAttack.damage_description}" —{" "}
          {new Date(lastAttack.attacked_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
