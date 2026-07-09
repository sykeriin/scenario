import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { TagChip } from "@/components/dashboard/TagChip";
import { toast } from "sonner";
import type { Tables } from "@/integrations/dataClient/types";

type Scenario = Tables<"scenarios">;
type Quest = Tables<"quests">;
type Stage = Tables<"stages">;

interface ScenarioFocusCardProps {
  scenario: Scenario;
}

export function ScenarioFocusCard({ scenario }: ScenarioFocusCardProps) {
  const { user } = useAuth();
  const { t } = useUniverse();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [totalStages, setTotalStages] = useState(0);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !scenario.id) return;

    dataClient
      .from("stages")
      .select("*")
      .eq("scenario_id", scenario.id)
      .order("order_index")
      .then(({ data: stages }) => {
        if (!stages?.length) return;
        setTotalStages(stages.length);
        const active = stages.find((s) => s.status === "active") ?? stages[0];
        const idx = stages.findIndex((s) => s.id === active.id);
        setActiveStage(active);
        setStageIndex(idx + 1);

        dataClient
          .from("quests")
          .select("*")
          .eq("stage_id", active.id)
          .order("order_index")
          .then(({ data }) => setQuests(data ?? []));
      });
  }, [user, scenario.id]);

  const done = quests.filter((q) => q.status === "completed").length;
  const totalXp = quests.reduce((s, q) => s + (q.xp_reward ?? 0), 0);

  const toggleQuest = async (quest: Quest) => {
    if (!user || completing) return;
    setCompleting(quest.id);
    const isDone = quest.status === "completed";

    try {
      if (isDone) {
        await dataClient
          .from("quests")
          .update({ status: "pending", completed_at: null })
          .eq("id", quest.id);
        setQuests((prev) =>
          prev.map((q) => (q.id === quest.id ? { ...q, status: "pending", completed_at: null } : q))
        );
      } else {
        await dataClient
          .from("quests")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", quest.id);
        setQuests((prev) =>
          prev.map((q) =>
            q.id === quest.id
              ? { ...q, status: "completed", completed_at: new Date().toISOString() }
              : q
          )
        );
        toast.success(`+${quest.xp_reward ?? 0} ${t("xp")}`);
      }
    } finally {
      setCompleting(null);
    }
  };

  const categoryColor =
    scenario.category === "Academic"
      ? "hsl(var(--theme-blue))"
      : scenario.category === "Career"
        ? "hsl(var(--primary))"
        : "hsl(var(--theme-green))";

  return (
    <div className="prototype-focus-card relative h-full overflow-hidden rounded-[20px] border-[1.5px] border-border bg-[hsl(var(--card)/0.75)] p-7">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.08), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-0.5"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.55), transparent)",
        }}
      />

      <div className="relative mb-5 flex items-start justify-between">
        <div className="flex gap-2">
          <TagChip color={categoryColor}>{scenario.category?.toUpperCase() ?? "SCENARIO"}</TagChip>
          {activeStage && (
            <TagChip color="hsl(var(--muted-foreground))">
              {t("stage")} {stageIndex} of {totalStages}
            </TagChip>
          )}
        </div>
        {totalXp > 0 && (
          <span className="font-mono-stat text-[11px] text-primary">+{totalXp} {t("xp")} total</span>
        )}
      </div>

      <div className="relative mb-5">
        <h2 className="font-cinzel text-[22px] font-bold leading-snug text-foreground">{scenario.title}</h2>
        {scenario.description && (
          <p className="mt-1.5 font-body text-xs italic leading-relaxed text-muted-foreground">
            {scenario.description}
          </p>
        )}
      </div>

      {quests.length > 0 && (
        <div className="relative mb-5">
          <div className="mb-2 flex justify-between">
            <span className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">
              {t("stage").toUpperCase()} PROGRESS
            </span>
            <span className="font-mono-stat text-[9px] text-primary">
              {done}/{quests.length} {t("quest").toUpperCase()}S
            </span>
          </div>
          <GlowingProgress value={done} max={quests.length} height="h-[7px]" />
        </div>
      )}

      <div className="relative space-y-2">
        {quests.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No quests in this stage yet.</p>
        ) : (
          quests.map((q) => {
            const checked = q.status === "completed";
            return (
              <button
                key={q.id}
                type="button"
                disabled={completing === q.id}
                onClick={() => toggleQuest(q)}
                className={`flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-all ${
                  checked
                    ? "border-primary/20 bg-[hsl(var(--dim))] opacity-55"
                    : "border-border bg-[hsl(var(--surface)/0.5)] hover:border-primary/30"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-all ${
                    checked ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {checked && (
                    <span className="text-[11px] font-black text-primary-foreground">✓</span>
                  )}
                </div>
                <span
                  className={`flex-1 font-body text-[13px] ${
                    checked ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {q.title}
                </span>
                {q.quest_type && <TagChip color="hsl(var(--muted-foreground))">{q.quest_type}</TagChip>}
                <span className="font-mono-stat text-[11px] text-primary">+{q.xp_reward ?? 0}</span>
              </button>
            );
          })
        )}
      </div>

      <Link
        to={`/scenarios/${scenario.id}`}
        className="relative mt-4 inline-block font-mono-stat text-[10px] text-primary hover:underline"
      >
        Open full {t("scenario").toLowerCase()} →
      </Link>
    </div>
  );
}
