import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { UniverseSelector } from "@/components/UniverseSelector";
import { FounderModeToggle } from "@/components/FounderModeToggle";
import { LOCAL_USER_ID, type GameUniverse } from "@/integrations/local/schema-extensions";
import { isAIReady } from "@/lib/ai-config";
import { db, ensureSeeded } from "@/integrations/local/db";

const STEPS = ["Universe", "Founder OS", "Vision", "First Initiative", "First Task"];

function toGameUniverse(raw: unknown): GameUniverse {
  return raw === "solo_leveling" ? "solo_leveling" : "orv";
}

async function persistProfile(patch: Record<string, unknown>) {
  await ensureSeeded();
  const existing = (await db.table("profiles").get(LOCAL_USER_ID)) as Record<string, unknown> | undefined;
  const updated = {
    ...(existing ?? {}),
    id: LOCAL_USER_ID,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await db.table("profiles").put(updated);
  await dataClient.from("profiles").update(patch).eq("id", LOCAL_USER_ID);
}

export async function finishOnboarding(patch: Record<string, unknown> = {}) {
  await persistProfile({
    ...patch,
    onboarding_completed: true,
    onboarding_step: STEPS.length,
  });
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [universe, setUniverse] = useState<GameUniverse>("orv");
  const [founderMode, setFounderMode] = useState(false);
  const [vision, setVision] = useState("");
  const [initiativeGoal, setInitiativeGoal] = useState("");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [questId, setQuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded().then(async () => {
      const profile = (await db.table("profiles").get(LOCAL_USER_ID)) as Record<string, unknown> | undefined;
      if (cancelled) return;

      if (profile?.onboarding_completed === true) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (profile?.universe) setUniverse(toGameUniverse(profile.universe));
      if (typeof profile?.founder_mode === "boolean") setFounderMode(profile.founder_mode);
      const savedStep = typeof profile?.onboarding_step === "number" ? profile.onboarding_step : 0;
      setStep(Math.min(Math.max(savedStep, 0), STEPS.length - 1));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const goToStep = async (nextStep: number, patch: Record<string, unknown> = {}) => {
    await persistProfile({ onboarding_step: nextStep, ...patch });
    setStep(nextStep);
  };

  const saveUniverse = async () => {
    if (!user) return;
    await goToStep(1, { universe });
  };

  const saveFounderMode = async () => {
    if (!user) return;
    await goToStep(2, { founder_mode: founderMode });
  };

  const saveVision = async () => {
    if (!user || !vision.trim()) {
      toast.error("Enter your vision");
      return;
    }
    setLoading(true);
    try {
      await dataClient.from("life_paths").insert({
        id: crypto.randomUUID(),
        user_id: LOCAL_USER_ID,
        title: "My Vision",
        vision_statement: vision,
        time_horizon: "3yr",
        status: "active",
        created_at: new Date().toISOString(),
      });
      await goToStep(3);
    } finally {
      setLoading(false);
    }
  };

  const createManualInitiative = async () => {
    if (!user || !initiativeGoal.trim()) {
      toast.error("Describe your first initiative");
      return;
    }
    setLoading(true);
    try {
      const sid = crypto.randomUUID();
      const stageId = crypto.randomUUID();
      const qid = crypto.randomUUID();
      await dataClient.from("scenarios").insert({
        id: sid,
        user_id: LOCAL_USER_ID,
        title: initiativeGoal.trim(),
        dramatic_intro: `Your first initiative: ${initiativeGoal.trim()}`,
        category: "Career",
        status: "active",
        xp_reward: 500,
        bonus_xp: 200,
        created_at: new Date().toISOString(),
      });
      await dataClient.from("stages").insert({
        id: stageId,
        scenario_id: sid,
        title: "Stage 1: Begin",
        order_index: 0,
        status: "active",
      });
      await dataClient.from("quests").insert({
        id: qid,
        stage_id: stageId,
        title: initiativeGoal.trim(),
        description: "Complete your first task to finish onboarding.",
        quest_type: "Study",
        xp_reward: 50,
        status: "pending",
      });
      setScenarioId(sid);
      setQuestId(qid);
      await goToStep(4);
      toast.success("Initiative created!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create initiative");
    } finally {
      setLoading(false);
    }
  };

  const createInitiative = async () => {
    if (!user || !initiativeGoal.trim()) {
      toast.error("Describe your first initiative");
      return;
    }
    if (!isAIReady()) {
      await createManualInitiative();
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await dataClient.functions.invoke("generate-scenario", {
        body: { type: "scenario", category: "Career", deadline: "30 days", content: initiativeGoal },
      });
      if (error) throw error;
      const result = (data as { result?: Record<string, unknown> })?.result;
      if (!result) throw new Error("Generation failed");

      const sid = crypto.randomUUID();
      await dataClient.from("scenarios").insert({
        id: sid,
        user_id: LOCAL_USER_ID,
        title: result.title,
        dramatic_intro: result.dramatic_intro,
        category: "Career",
        status: "active",
        xp_reward: result.xp_reward ?? 500,
        bonus_xp: result.bonus_xp ?? 200,
        created_at: new Date().toISOString(),
      });

      const stages = (result.stages as { title: string; quests: { title: string; type?: string; xp_reward?: number; description?: string }[] }[]) ?? [];
      let firstQuest: string | null = null;

      if (stages.length === 0) {
        const stageId = crypto.randomUUID();
        const qid = crypto.randomUUID();
        await dataClient.from("stages").insert({
          id: stageId,
          scenario_id: sid,
          title: "Stage 1: Begin",
          order_index: 0,
          status: "active",
        });
        await dataClient.from("quests").insert({
          id: qid,
          stage_id: stageId,
          title: "Complete your first task",
          description: "Finish this quest to complete onboarding.",
          quest_type: "Study",
          xp_reward: 50,
          status: "pending",
        });
        firstQuest = qid;
      } else {
        for (let i = 0; i < stages.length; i++) {
          const stageId = crypto.randomUUID();
          await dataClient.from("stages").insert({
            id: stageId,
            scenario_id: sid,
            title: stages[i].title,
            order_index: i,
            status: i === 0 ? "active" : "locked",
          });
          for (const q of stages[i].quests ?? []) {
            const qid = crypto.randomUUID();
            if (!firstQuest) firstQuest = qid;
            await dataClient.from("quests").insert({
              id: qid,
              stage_id: stageId,
              title: q.title,
              description: q.description,
              quest_type: q.type ?? "Study",
              xp_reward: q.xp_reward ?? 50,
              status: i === 0 ? "pending" : "locked",
            });
          }
        }
      }

      if (!firstQuest) {
        const stageId = crypto.randomUUID();
        const qid = crypto.randomUUID();
        await dataClient.from("stages").insert({
          id: stageId,
          scenario_id: sid,
          title: "Stage 1: Begin",
          order_index: 0,
          status: "active",
        });
        await dataClient.from("quests").insert({
          id: qid,
          stage_id: stageId,
          title: "Complete your first task",
          quest_type: "Study",
          xp_reward: 50,
          status: "pending",
        });
        firstQuest = qid;
      }

      setScenarioId(sid);
      setQuestId(firstQuest);
      await goToStep(4);
      toast.success("Initiative created!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create initiative");
    } finally {
      setLoading(false);
    }
  };

  const enterDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (questId && scenarioId) {
        try {
          await api.scenarios.completeQuest(scenarioId, questId);
        } catch {
          /* quest completion is optional for onboarding exit */
        }
      }
      await finishOnboarding({ username: "Hunter", universe, founder_mode: founderMode });
      toast.success("◆ INITIATION COMPLETE. The System acknowledges you.", { className: "font-cinzel", duration: 3000 });
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to finish onboarding");
    } finally {
      setLoading(false);
    }
  };

  const skipToDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await finishOnboarding({ universe, founder_mode: founderMode });
      toast.success("Welcome to the dashboard.");
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to skip onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="h-2 w-2 rounded-full" style={{ background: i <= step ? "hsl(var(--primary))" : "hsl(var(--dim))" }} />
          ))}
        </div>
        <h2 className="font-cinzel text-xl font-bold text-center text-primary tracking-wider">
          {STEPS[step]}
        </h2>

        {step === 0 && (
          <div className="space-y-4">
            <UniverseSelector value={universe} onChange={setUniverse} />
            <Button className="w-full" onClick={saveUniverse}>Continue</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <FounderModeToggle value={founderMode} onChange={setFounderMode} />
            <Button className="w-full" onClick={saveFounderMode}>Continue</Button>
            <p className="text-xs text-center text-muted-foreground">Optional — you can change this anytime in Settings.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input value={vision} onChange={(e) => setVision(e.target.value)} placeholder="What are you building? Who do you want to become?" />
            <Button className="w-full" onClick={saveVision} disabled={loading}>Forge Vision</Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => goToStep(3)} disabled={loading}>
              Skip vision for now
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Input value={initiativeGoal} onChange={(e) => setInitiativeGoal(e.target.value)} placeholder="First initiative — e.g. Launch MVP in 30 days" />
            <Button className="w-full" onClick={createInitiative} disabled={loading}>
              {loading ? "Creating..." : isAIReady() ? "Create First Initiative (AI)" : "Create First Initiative"}
            </Button>
            {!isAIReady() && (
              <p className="text-xs text-center text-muted-foreground">AI not configured — a simple initiative will be created locally.</p>
            )}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => goToStep(4)} disabled={loading}>
              Skip initiative for now
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {questId
                ? "Complete your first task to unlock the dashboard."
                : "You're ready to enter the dashboard."}
            </p>
            <Button className="w-full" onClick={enterDashboard} disabled={loading}>
              {loading ? "Entering..." : questId ? "Complete First Task & Enter" : "Enter Dashboard"}
            </Button>
          </div>
        )}

        <Button
          variant="link"
          className="w-full text-xs text-muted-foreground"
          onClick={skipToDashboard}
          disabled={loading}
        >
          Skip onboarding → go to dashboard
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
