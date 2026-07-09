import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useUniverse } from "@/hooks/useUniverse";
import { GateOpenAnimation } from "@/components/sl/GateOpenAnimation";

const CATEGORIES = ["Academic", "Skill", "Career", "Social", "Fitness"];

const LOADING_MESSAGES = [
  "◈ System analyzing submission...",
  "◆ Generating scenario parameters...",
  "✦ Calculating difficulty rating...",
  "◈ Constructing stage framework...",
  "◆ Assigning quest objectives...",
];

interface GeneratedQuest {
  title: string;
  type: string;
  xp_reward: number;
  description: string;
}

interface GeneratedStage {
  title: string;
  xp_reward: number;
  quests: GeneratedQuest[];
}

interface GeneratedScenario {
  title: string;
  dramatic_intro: string;
  xp_reward: number;
  stages: GeneratedStage[];
}

const ScenarioNew = () => {
  const { user } = useAuth();
  const { isSoloLeveling, t } = useUniverse();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [deadline, setDeadline] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [generated, setGenerated] = useState<GeneratedScenario | null>(null);
  const [saving, setSaving] = useState(false);
  const [gateAnim, setGateAnim] = useState<{ title: string } | null>(null);

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error("Please describe your goal or paste content.");
      return;
    }
    setGenerating(true);
    setLoadingMsg(0);

    const interval = setInterval(() => {
      setLoadingMsg((m) => (m + 1) % LOADING_MESSAGES.length);
    }, 2000);

    try {
      // Fetch dream board themes for AI context
      let dreamBoardThemes: string[] = [];
      try {
        const { data: board } = await dataClient
          .from("dream_boards")
          .select("ai_analysis")
          .eq("user_id", user!.id)
          .maybeSingle();
        if (board?.ai_analysis) {
          const a = board.ai_analysis as Record<string, unknown>;
          if (Array.isArray(a.dominant_themes)) dreamBoardThemes = a.dominant_themes as string[];
        }
      } catch {}

      const { data, error } = await dataClient.functions.invoke("generate-scenario", {
        body: { type: "scenario", category, deadline, content, dreamBoardThemes },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGenerated(data.result);
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate scenario");
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generated) return;
    setSaving(true);

    try {
      // Insert scenario
      const { data: scenario, error: scenarioError } = await dataClient
        .from("scenarios")
        .insert({
          user_id: user.id,
          title: generated.title,
          dramatic_intro: generated.dramatic_intro,
          category,
          xp_reward: generated.xp_reward,
          doom_deadline: deadline || null,
          urgency: deadline ? 5 : 3,
        })
        .select()
        .single();

      if (scenarioError) throw scenarioError;

      // Insert stages
      for (let i = 0; i < generated.stages.length; i++) {
        const stage = generated.stages[i];
        const { data: stageData, error: stageError } = await dataClient
          .from("stages")
          .insert({
            scenario_id: scenario.id,
            title: stage.title,
            order_index: i,
            xp_reward: stage.xp_reward,
            status: i === 0 ? "active" : "locked",
          })
          .select()
          .single();

        if (stageError) throw stageError;

        // Insert quests
        const questInserts = stage.quests.map((q) => ({
          user_id: user.id,
          stage_id: stageData.id,
          title: q.title,
          description: q.description,
          quest_type: q.type,
          xp_reward: q.xp_reward,
          status: i === 0 ? "pending" : "locked",
        }));

        const { error: questError } = await dataClient.from("quests").insert(questInserts);
        if (questError) throw questError;
      }

      // Auto-link to Life Path suggested scenarios
      try {
        const { data: lifePath } = await dataClient
          .from("life_paths")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (lifePath) {
          const { data: arcs } = await dataClient
            .from("life_path_arcs")
            .select("id")
            .eq("life_path_id", lifePath.id);

          if (arcs && arcs.length > 0) {
            const arcIds = arcs.map((a) => a.id);
            const { data: suggestions } = await dataClient
              .from("life_path_scenarios")
              .select("*")
              .in("arc_id", arcIds)
              .is("scenario_id", null)
              .eq("is_completed", false);

            if (suggestions) {
              const titleLower = generated.title.toLowerCase();
              const catLower = (category || "").toLowerCase();

              const match = suggestions.find((s) => {
                const sugTitle = s.suggested_title.toLowerCase();
                const sugCat = (s.suggested_category || "").toLowerCase();
                const titleWords = titleLower.split(/\s+/);
                const sugWords = sugTitle.split(/\s+/);
                const commonWords = titleWords.filter((w) => w.length > 3 && sugWords.includes(w));
                const titleSimilar = commonWords.length >= 2 || sugTitle.includes(titleLower) || titleLower.includes(sugTitle);
                const catMatch = catLower === sugCat;
                return catMatch && titleSimilar;
              }) || suggestions.find((s) => {
                const sugTitle = s.suggested_title.toLowerCase();
                const titleWords = titleLower.split(/\s+/);
                const sugWords = sugTitle.split(/\s+/);
                const commonWords = titleWords.filter((w) => w.length > 3 && sugWords.includes(w));
                return commonWords.length >= 2;
              });

              if (match) {
                await dataClient
                  .from("life_path_scenarios")
                  .update({ scenario_id: scenario.id })
                  .eq("id", match.id);
                toast.success("Linked to your Life Path!");
              }
            }
          }
        }
      } catch {
        // Non-critical — don't block scenario creation
      }

      toast.success(isSoloLeveling ? `${t('scenario')} detected!` : "Scenario created!");
      if (isSoloLeveling) {
        setGateAnim({ title: scenario.title });
      } else {
        navigate(`/scenarios/${scenario.id}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save scenario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {gateAnim && (
        <GateOpenAnimation
          title={gateAnim.title}
          onDone={() => navigate(`/scenarios`)}
        />
      )}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/scenarios" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {["Category", "Content", "Generate", "Preview"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full transition-all"
                style={{
                  background: i <= step ? "hsl(var(--primary))" : "hsl(var(--dim))",
                  boxShadow: i === step ? "0 0 8px hsl(var(--glow) / 0.5)" : "none",
                }}
              />
              <span className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 0: Category & Deadline */}
        {step === 0 && (
          <div className="space-y-6 max-w-md mx-auto">
            <SectionLabel prefix="◆">Choose Category & Deadline</SectionLabel>
            <div className="space-y-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <label className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">
                  Doom Deadline (optional)
                </label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <Button
              onClick={() => setStep(1)}
              disabled={!category}
              className="w-full font-cinzel tracking-wider glow-accent"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 1: Content */}
        {step === 1 && (
          <div className="space-y-6 max-w-lg mx-auto">
            <SectionLabel prefix="✦">Describe Your Goal</SectionLabel>
            <p className="font-body text-sm text-muted-foreground">
              Paste your study material, describe your goal, or explain what you want to accomplish.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. I need to learn React fundamentals including hooks, state management, and routing in 2 weeks..."
              className="min-h-[200px]"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="font-cinzel tracking-wider">
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!content.trim()}
                className="flex-1 font-cinzel tracking-wider glow-accent"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Generate */}
        {step === 2 && (
          <div className="space-y-6 max-w-lg mx-auto text-center">
            {generating ? (
              <div className="py-16 space-y-6">
                <div className="h-16 w-16 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="font-mono-stat text-sm text-primary animate-pulse">
                  {LOADING_MESSAGES[loadingMsg]}
                </p>
                <p className="font-body text-xs text-muted-foreground">The System is analyzing your submission...</p>
              </div>
            ) : (
              <>
                <SectionLabel prefix="◈">Ready to Generate</SectionLabel>
                <div className="rounded-lg border bg-card p-4 text-left space-y-2">
                  <div className="flex gap-2">
                    <span className="font-mono-stat text-[10px] text-muted-foreground">Category:</span>
                    <span className="font-mono-stat text-[10px] text-primary">{category}</span>
                  </div>
                  {deadline && (
                    <div className="flex gap-2">
                      <span className="font-mono-stat text-[10px] text-muted-foreground">Deadline:</span>
                      <span className="font-mono-stat text-[10px] text-primary">{deadline}</span>
                    </div>
                  )}
                  <p className="font-body text-xs text-muted-foreground line-clamp-3">{content}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="font-cinzel tracking-wider">
                    Back
                  </Button>
                  <Button onClick={handleGenerate} className="flex-1 font-cinzel tracking-wider glow-accent">
                    Generate Scenario
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && generated && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-cinzel text-xl font-bold text-primary tracking-wider">{generated.title}</h2>
              <p className="font-body text-sm text-muted-foreground italic">{generated.dramatic_intro}</p>
              <span className="inline-block font-mono-stat text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full">
                +{generated.xp_reward} XP TOTAL
              </span>
            </div>

            <div className="space-y-4">
              {generated.stages.map((stage, si) => (
                <div key={si} className="rounded-lg border bg-card p-4 category-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-cinzel text-sm font-semibold">{stage.title}</h3>
                    <span className="font-mono-stat text-[10px] text-primary">+{stage.xp_reward} XP</span>
                  </div>
                  <div className="space-y-2">
                    {stage.quests.map((q, qi) => (
                      <div key={qi} className="flex items-start gap-3 p-2 rounded bg-secondary/50">
                        <span className="font-mono-stat text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                          {q.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs font-medium">{q.title}</p>
                          <p className="font-body text-[11px] text-muted-foreground">{q.description}</p>
                        </div>
                        <span className="font-mono-stat text-[10px] text-primary shrink-0">+{q.xp_reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="font-cinzel tracking-wider">
                Regenerate
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 font-cinzel tracking-wider glow-accent">
                {saving ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioNew;
