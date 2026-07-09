import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { emitPathSignal } from "@/lib/pathSignals";
import { SystemMessage } from "@/components/ui/SystemMessage";
import { ScenarioCompleteOverlay } from "@/components/ui/ScenarioCompleteOverlay";
import { LevelUpOverlay } from "@/components/ui/LevelUpOverlay";
import { RegressionOverlay } from "@/components/ui/RegressionOverlay";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { XpToast } from "@/components/XpToast";
import { UniverseNotification } from "@/components/UniverseNotification";
import { ShadowExtractionOverlay } from "@/components/sl/ShadowExtractionOverlay";
import { useUniverse } from "@/hooks/useUniverse";
import { extractShadow } from "@/lib/solo-leveling/shadow-army";
import type { ShadowArmyRow } from "@/integrations/local/schema-extensions";
import type { Tables } from "@/types/database";

type Scenario = Tables<"scenarios">;
type Stage = Tables<"stages">;
type Quest = Tables<"quests">;

const ScenarioDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isSoloLeveling, t } = useUniverse();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<{ amount: number; type: 'quest' | 'level_up'; newLevel?: number } | null>(null);
  const [extractedShadow, setExtractedShadow] = useState<ShadowArmyRow | null>(null);
  const [generatingResource, setGeneratingResource] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState<{ title: string; subtitle?: string; rarity: "common" | "rare" | "epic" | "legendary" } | null>(null);
  const [scenarioComplete, setScenarioComplete] = useState<{ title: string; xp: number } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [showRegression, setShowRegression] = useState(false);
  const [focusQuest, setFocusQuest] = useState<Quest | null>(null);
  const [vaultEntries, setVaultEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    loadData();
    // Load vault entries for this scenario
    dataClient.from("vault_entries").select("*").eq("source_scenario_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setVaultEntries((data as any[]) ?? []);
    });
  }, [id, user]);

  const loadData = async () => {
    const [scenarioRes, stagesRes] = await Promise.all([
      dataClient.from("scenarios").select("*").eq("id", id!).single(),
      dataClient.from("stages").select("*").eq("scenario_id", id!).order("order_index"),
    ]);
    setScenario(scenarioRes.data);
    setStages(stagesRes.data ?? []);

    if (stagesRes.data && stagesRes.data.length > 0) {
      const stageIds = stagesRes.data.map((s) => s.id);
      const { data: allQuests } = await dataClient.from("quests").select("*").in("stage_id", stageIds);
      setQuests(allQuests ?? []);
      const activeStage = stagesRes.data.find((s) => s.status === "active");
      if (activeStage) setExpandedStage(activeStage.id);
    }
  };

  const getXpMultiplier = (): number => {
    // xp_multiplier is stored as numeric, access via any cast since types may not be updated yet
    const mult = (scenario as any)?.xp_multiplier;
    return mult ? Number(mult) : 1;
  };

  const completeQuest = async (quest: Quest) => {
    if (!user || completing) return;
    setCompleting(quest.id);

    try {
      await dataClient.from("quests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", quest.id);

      const baseXp = quest.xp_reward ?? 50;
      const multiplier = getXpMultiplier();
      const xpAmount = Math.round(baseXp * multiplier);

      const { data: xpResult } = await dataClient.rpc("add_xp", {
        user_id_param: user.id,
        amount: xpAmount,
        source: `quest:${quest.id}`,
      });

      const result = xpResult as Record<string, unknown> | null;
      if (result?.did_level_up) {
        setTimeout(() => setLevelUp(result.new_level as number), 600);
        setXpToast({ amount: xpAmount, type: 'level_up', newLevel: result.new_level as number });
      } else {
        setXpToast({ amount: xpAmount, type: 'quest' });
      }

      // Emit path signal for quest completion
      emitPathSignal(user.id, "quest_complete", {
        quest_type: quest.quest_type,
        xp: xpAmount,
        scenario_category: scenario?.category,
      });

      // Auto-extract vault insight for Study/Research/Create quests
      const vaultTypes = ["Study", "Research", "Create"];
      if (vaultTypes.some((t) => quest.quest_type?.includes(t) || quest.title.includes(t) || scenario?.category?.includes(t))) {
        dataClient.functions.invoke("extract-vault-insight", {
          body: {
            quest_title: quest.title,
            quest_description: quest.description,
            scenario_title: scenario?.title,
            scenario_category: scenario?.category,
          },
        }).then(({ data }) => {
          if (data && !data.error) {
            dataClient.from("vault_entries").insert({
              user_id: user.id,
              source_quest_id: quest.id,
              source_scenario_id: id,
              title: data.title,
              content: data.content,
              ai_summary: data.content,
              tags: data.tags || [],
              category: data.category || "Insight",
            }).then(() => {
              toast.info("🔐 New insight captured in The Vault", { className: "font-cinzel" });
            });
          }
        }).catch(() => { /* silent fail for vault extraction */ });
      }

      // NPC quest reward handling
      if (quest.description?.includes("[NPC:")) {
        const { checkNpcTitleMilestones, applySpecialReward } = await import("@/lib/npcRewards");
        
        // Check milestone titles
        const newTitle = await checkNpcTitleMilestones(user.id);
        if (newTitle) {
          setTimeout(() => setSystemMessage({
            title: newTitle,
            subtitle: "A new title has been bestowed upon you.",
            rarity: "rare" as const,
          }), 1200);
        }

        // Find the NPC encounter to check special_reward
        const npcNameMatch = quest.description.match(/\[NPC: (.+?)\]/);
        if (npcNameMatch) {
          const { data: npcEnc } = await dataClient
            .from("npc_encounters")
            .select("special_reward")
            .eq("user_id", user.id)
            .eq("npc_name", npcNameMatch[1])
            .limit(1)
            .single();

          if (npcEnc?.special_reward) {
            const reward = await applySpecialReward(user.id, npcEnc.special_reward);
            if (reward) {
              const msg = reward.type === "stat" ? `${reward.detail} granted!` 
                : reward.type === "vault" ? "A Vault Entry has been unlocked."
                : `Title unlocked: ${reward.detail}`;
              toast.success(`✦ Special Reward: ${msg}`, { className: "font-cinzel" });
            }
          }

          // Mark encounter as completed
          await dataClient.from("npc_encounters").update({ status: "completed" } as any)
            .eq("user_id", user.id)
            .eq("npc_name", npcNameMatch[1])
            .eq("status", "active");
        }
      }

      const stageQuests = quests.filter((q) => q.stage_id === quest.stage_id);
      const remainingActive = stageQuests.filter((q) => q.id !== quest.id && q.status !== "completed");

      if (remainingActive.length === 0) {
        await dataClient.from("stages").update({ status: "cleared" }).eq("id", quest.stage_id);

        const currentStage = stages.find((s) => s.id === quest.stage_id);
        if (currentStage) {
          const nextStage = stages.find((s) => s.order_index === currentStage.order_index + 1);
          if (nextStage) {
            await dataClient.from("stages").update({ status: "active" }).eq("id", nextStage.id);
            await dataClient.from("quests").update({ status: "pending" }).eq("stage_id", nextStage.id);
            toast.success("STAGE CLEARED! Next stage unlocked.", { className: "font-cinzel" });
            const titleRoll = Math.random();
            if (titleRoll < 0.3) {
              const titles = [
                { title: "The Persistent", subtitle: "Cleared a stage without hesitation.", rarity: "common" as const },
                { title: "Arcane Scholar", subtitle: "Knowledge is your weapon.", rarity: "rare" as const },
                { title: "Doom Breaker", subtitle: "You defy deadlines themselves.", rarity: "epic" as const },
                { title: "Constellation's Chosen", subtitle: "The stars have noticed your progress.", rarity: "legendary" as const },
              ];
              const pick = titles[Math.floor(Math.random() * titles.length)];
              setTimeout(() => setSystemMessage(pick), 800);
            }
          } else {
            const bonusXp = Number((scenario as Record<string, unknown>)?.bonus_xp ?? scenario!.xp_reward ?? 200);
            await dataClient.from("scenarios").update({
              status: "completed",
              cleared_at: new Date().toISOString(),
            }).eq("id", id);

            const { data: bonusResult } = await dataClient.rpc("add_xp", {
              user_id_param: user.id,
              amount: bonusXp,
              source: `scenario_clear:${id}`,
            });
            const bonus = bonusResult as Record<string, unknown> | null;
            if (bonus?.did_level_up) {
              setTimeout(() => setLevelUp(bonus.new_level as number), 900);
            }
            setScenarioComplete({ title: scenario!.title, xp: bonusXp });

            if (isSoloLeveling && id) {
              try {
                const shadow = await extractShadow(id, scenario!.title, scenario!.category ?? 'General');
                setExtractedShadow(shadow);
              } catch { /* non-critical */ }
            }

            // Emit path signal for scenario completion
            emitPathSignal(user.id, "scenario_clear", {
              category: scenario!.category,
              xp_reward: scenario!.xp_reward,
            });
          }
        }
      }

      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to complete quest");
    } finally {
      setCompleting(null);
    }
  };

  const handleRegress = async () => {
    if (!user || !scenario || !id) return;

    try {
      const currentCount = ((scenario as any).regression_count ?? 0) as number;
      const newCount = currentCount + 1;
      const newMultiplier = 1 + newCount * 0.5;

      // Reset all stages: first one active, rest locked
      const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);
      for (let i = 0; i < sortedStages.length; i++) {
        await dataClient.from("stages").update({ status: i === 0 ? "active" : "locked" }).eq("id", sortedStages[i].id);
      }

      // Reset all quests: first stage's quests to pending, rest to locked (pending)
      const firstStageId = sortedStages[0]?.id;
      for (const quest of quests) {
        await dataClient.from("quests").update({ status: quest.stage_id === firstStageId ? "pending" : "pending", completed_at: null }).eq("id", quest.id);
      }

      // Update scenario
      await dataClient.from("scenarios").update({
        status: "active",
        regression_count: newCount,
        xp_multiplier: newMultiplier,
      } as any).eq("id", id);

      // Grant "Regressed Hero" title on first regression
      if (currentCount === 0) {
        await dataClient.from("titles").insert({
          user_id: user.id,
          title_name: "Regressed Hero",
          description: "Chose to regress and try again, stronger than before.",
          rarity: "epic",
        });
        setTimeout(() => setSystemMessage({
          title: "Regressed Hero",
          subtitle: "You chose to return. The path remembers.",
          rarity: "epic",
        }), 500);
      }

      setShowRegression(false);
      await loadData();
      toast.success(`Regression complete. ${newMultiplier}x XP multiplier active.`, { className: "font-cinzel" });
    } catch (e: any) {
      toast.error(e.message || "Regression failed");
    }
  };

  const handleAbandon = async () => {
    if (!id) return;
    await dataClient.from("scenarios").update({ status: "abandoned" }).eq("id", id);
    setShowRegression(false);
    navigate("/scenarios");
  };

  const generateResource = async (type: "flashcards" | "gameplan") => {
    if (!scenario) return;
    setGeneratingResource(type);

    try {
      const scenarioContent = `Title: ${scenario.title}\n${scenario.dramatic_intro}\nCategory: ${scenario.category}\nStages: ${stages.map((s) => s.title).join(", ")}`;
      const { data, error } = await dataClient.functions.invoke("generate-scenario", {
        body: { type, scenarioContent },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await dataClient.from("resources").insert({
        scenario_id: scenario.id,
        resource_type: type,
        content: data.result,
      });

      toast.success(`${type === "flashcards" ? "Flashcards" : "Gameplan"} generated!`);
    } catch (e: any) {
      toast.error(e.message || `Failed to generate ${type}`);
    } finally {
      setGeneratingResource(null);
    }
  };

  if (!scenario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING SCENARIO...</p>
      </div>
    );
  }

  const completedQuests = quests.filter((q) => q.status === "completed").length;
  const totalQuests = quests.length;
  const regressionCount = ((scenario as any).regression_count ?? 0) as number;
  const xpMultiplier = getXpMultiplier();

  return (
    <div className="min-h-screen bg-background">
      {systemMessage && (
        <UniverseNotification
          title={systemMessage.title}
          subtitle={systemMessage.subtitle}
          rarity={systemMessage.rarity}
          onDismiss={() => setSystemMessage(null)}
        />
      )}
      {scenarioComplete && (
        <ScenarioCompleteOverlay
          title={scenarioComplete.title}
          xpReward={scenarioComplete.xp}
          onDismiss={() => setScenarioComplete(null)}
        />
      )}
      {levelUp && (
        <LevelUpOverlay
          newLevel={levelUp}
          onDismiss={() => setLevelUp(null)}
        />
      )}
      {showRegression && (
        <RegressionOverlay
          scenarioTitle={scenario.title}
          regressionCount={regressionCount}
          onRegress={handleRegress}
          onCancel={handleAbandon}
        />
      )}
      {focusQuest && (
        <PomodoroTimer
          questId={focusQuest.id}
          questTitle={focusQuest.title}
          onClose={() => setFocusQuest(null)}
        />
      )}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/scenarios" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← All Scenarios
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center gap-2">
            <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {scenario.category}
            </span>
            <span className={`font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
              scenario.status === "completed" ? "bg-green-900/30 text-green-400" : "bg-primary/10 text-primary"
            }`}>
              {scenario.status}
            </span>
            {regressionCount > 0 && (
              <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/30 text-purple-400" title={`Regressed ${regressionCount}x`}>
                ↺ {regressionCount}
              </span>
            )}
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">
            {regressionCount > 0 && <span className="text-purple-400 mr-2">↺</span>}
            {scenario.title}
          </h1>
          {scenario.dramatic_intro && (
            <p className="font-body text-sm text-muted-foreground italic max-w-lg mx-auto">{scenario.dramatic_intro}</p>
          )}
          <div className="flex justify-center gap-4 items-center">
            <span className="font-mono-stat text-[10px] text-primary">
              +{scenario.xp_reward} XP
              {xpMultiplier > 1 && (
                <span className="text-purple-400 ml-1">({xpMultiplier}x)</span>
              )}
            </span>
            <GlowingProgress value={completedQuests} max={totalQuests || 1} height="h-1.5" className="w-32" />
            <span className="font-mono-stat text-[10px] text-muted-foreground">
              {completedQuests}/{totalQuests} quests
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Stage Timeline */}
          <div className="flex-1 space-y-3">
            <SectionLabel prefix="◆">Stage Timeline</SectionLabel>
            {stages.map((stage) => {
              const stageQuests = quests.filter((q) => q.stage_id === stage.id);
              const isExpanded = expandedStage === stage.id;
              const isLocked = stage.status === "locked";
              const isCleared = stage.status === "cleared";

              return (
                <div key={stage.id} className={`rounded-lg border bg-card transition-all ${isLocked ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => !isLocked && setExpandedStage(isExpanded ? null : stage.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                    disabled={isLocked}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{
                          background: isCleared
                            ? "hsl(var(--theme-green))"
                            : stage.status === "active"
                              ? "hsl(var(--primary))"
                              : "hsl(var(--dim))",
                          boxShadow: stage.status === "active" ? "0 0 8px hsl(var(--glow) / 0.5)" : "none",
                        }}
                      />
                      <div>
                        <h3 className="font-cinzel text-sm font-semibold">{stage.title}</h3>
                        <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">
                          {isCleared ? "✓ Cleared" : isLocked ? "🔒 Locked" : `${stageQuests.filter((q) => q.status === "completed").length}/${stageQuests.length} quests`}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-stat text-[10px] text-primary">+{stage.xp_reward} XP</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t pt-3">
                      {stageQuests.map((quest) => (
                        <div
                          key={quest.id}
                          className={`flex items-start gap-3 p-3 rounded border transition-all relative ${
                            quest.status === "completed" ? "bg-secondary/50 border-primary/20" : "bg-secondary/30"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono-stat text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {quest.quest_type}
                              </span>
                              <span className={`font-mono-stat text-[10px] ${quest.status === "completed" ? "text-green-400" : "text-primary"}`}>
                                +{quest.xp_reward} XP
                                {xpMultiplier > 1 && quest.status !== "completed" && (
                                  <span className="text-purple-400 ml-1">({xpMultiplier}x)</span>
                                )}
                              </span>
                            </div>
                            <p className={`font-body text-sm ${quest.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                              {quest.title}
                            </p>
                            {quest.description && (
                              <p className="font-body text-xs text-muted-foreground mt-1">{quest.description}</p>
                            )}
                          </div>
                          {quest.status === "pending" && (
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setFocusQuest(quest)}
                                className="font-mono-stat text-[10px] h-7 px-2"
                                title="Start Focus Session"
                              >
                                ⏱
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => completeQuest(quest)}
                                disabled={completing === quest.id}
                                className="font-mono-stat text-[10px] shrink-0 glow-accent"
                              >
                                {completing === quest.id ? "..." : "Complete"}
                              </Button>
                            </div>
                          )}
                          {quest.status === "completed" && (
                            <span className="font-mono-stat text-[10px] text-primary shrink-0">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Side Panel */}
          <div className="w-full md:w-[220px] shrink-0 space-y-3">
            <SectionLabel prefix="✦">AI Resources</SectionLabel>
            <Button
              variant="outline"
              className="w-full font-mono-stat text-[10px] justify-start"
              onClick={() => generateResource("flashcards")}
              disabled={!!generatingResource}
            >
              {generatingResource === "flashcards" ? "Generating..." : "📇 Generate Flashcards"}
            </Button>
            <Button
              variant="outline"
              className="w-full font-mono-stat text-[10px] justify-start"
              onClick={() => generateResource("gameplan")}
              disabled={!!generatingResource}
            >
              {generatingResource === "gameplan" ? "Generating..." : "📋 Generate Gameplan"}
            </Button>

            {scenario.doom_deadline && (
              <div className="rounded-lg border bg-card p-3">
                <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">⏰ Deadline</span>
                <p className="font-mono-stat text-xs text-primary mt-1">
                  {new Date(scenario.doom_deadline).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* XP Multiplier indicator */}
            {xpMultiplier > 1 && (
              <div className="rounded-lg border bg-card p-3 text-center" style={{ borderColor: "hsl(270 70% 55% / 0.3)" }}>
                <span className="font-mono-stat text-[9px] text-purple-400 uppercase tracking-wider">↺ Regression Bonus</span>
                <p className="font-cinzel text-lg font-bold text-purple-400 mt-1">{xpMultiplier}x XP</p>
              </div>
            )}

            {/* Publish as Template toggle */}
            {scenario.status === "completed" && (
              <div className="pt-4 border-t space-y-2">
                <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">◆ Template</span>
                <button
                  onClick={async () => {
                    const newVal = !(scenario as any).is_template;
                    await dataClient.from("scenarios").update({ is_template: newVal } as any).eq("id", id);
                    setScenario({ ...scenario, is_template: newVal } as any);
                    toast.success(newVal ? "Published as template!" : "Template unpublished.");
                  }}
                  className={`w-full font-mono-stat text-[10px] uppercase tracking-wider py-2 px-3 rounded border transition-all ${
                    (scenario as any).is_template
                      ? "border-primary/50 text-primary bg-primary/10"
                      : "text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {(scenario as any).is_template ? "✦ Published" : "Publish as Template"}
                </button>
              </div>
            )}

            {/* Abandon / Regress button */}
            {scenario.status === "active" && (
              <div className="pt-4 border-t">
                <button
                  onClick={() => setShowRegression(true)}
                  className="w-full font-mono-stat text-[10px] uppercase tracking-wider py-2 px-3 rounded border transition-all hover:border-destructive/50 text-muted-foreground hover:text-destructive"
                >
                  ☠ Abandon Scenario
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vault Entries from this Scenario */}
        {vaultEntries.length > 0 && (
          <div className="mt-8 space-y-3">
            <SectionLabel prefix="🔐">Vault Entries from this Scenario</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vaultEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card p-4 space-y-2"
                  style={{ borderLeft: "3px solid hsl(var(--primary))" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
                      {entry.category}
                    </span>
                  </div>
                  <h4 className="font-cinzel text-xs font-semibold">{entry.title}</h4>
                  <p className="font-body text-[11px] text-muted-foreground line-clamp-2">{entry.content}</p>
                  {entry.tags && (entry.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(entry.tags as string[]).map((tag: string) => (
                        <span key={tag} className="font-mono-stat text-[7px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Link to="/vault" className="font-mono-stat text-[10px] text-primary hover:underline block text-center">
              View all in The Vault →
            </Link>
          </div>
        )}
      </div>
      {xpToast && (
        <XpToast amount={xpToast.amount} type={xpToast.type} newLevel={xpToast.newLevel} onDone={() => setXpToast(null)} />
      )}
      {extractedShadow && (
        <ShadowExtractionOverlay shadow={extractedShadow} onDone={() => setExtractedShadow(null)} />
      )}
    </div>
  );
};

export default ScenarioDetail;
