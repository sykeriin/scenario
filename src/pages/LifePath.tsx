import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SystemMessage } from "@/components/ui/SystemMessage";

interface LifePath {
  id: string;
  user_id: string;
  title: string;
  vision_statement: string | null;
  time_horizon: string;
  raw_input: any;
  generated_roadmap: any;
  status: string;
  created_at: string;
  recalibrated_at: string | null;
  last_recalibrated_at: string | null;
  recalibration_count: number;
  drift_log: any[];
}

interface Arc {
  id: string;
  life_path_id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_months: number;
  status: string;
  focus_areas: string[];
  is_ai_modified: boolean;
  modification_reason: string | null;
  modified_at: string | null;
  original_data: any;
}

interface PathScenario {
  id: string;
  arc_id: string;
  scenario_id: string | null;
  suggested_title: string;
  suggested_category: string | null;
  suggested_why: string | null;
  is_completed: boolean;
  order_index: number;
}

const TIME_HORIZONS = [
  { value: "1yr", label: "1 Year" },
  { value: "3yr", label: "3 Years" },
  { value: "5yr", label: "5 Years" },
  { value: "10yr", label: "10 Years" },
];

const focusColors: Record<string, string> = {
  Academic: "hsl(210 80% 55%)",
  Skill: "hsl(32 90% 50%)",
  Career: "hsl(270 60% 55%)",
  Social: "hsl(340 70% 55%)",
  Fitness: "hsl(0 80% 55%)",
};

function getAlignmentLabel(score: number): { label: string; color: string } {
  if (score <= 30) return { label: "Undefined", color: "hsl(var(--muted-foreground))" };
  if (score <= 60) return { label: "Converging", color: "hsl(210 80% 55%)" };
  if (score <= 85) return { label: "Aligned", color: "hsl(var(--theme-green))" };
  return { label: "True to Path", color: "hsl(45 90% 50%)" };
}

const LifePathPage = () => {
  const { user } = useAuth();
  const { t, isSoloLeveling } = useUniverse();
  const navigate = useNavigate();
  const [lifePath, setLifePath] = useState<LifePath | null>(null);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [pathScenarios, setPathScenarios] = useState<PathScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showRecalibrate, setShowRecalibrate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [driftMsg, setDriftMsg] = useState<{ title: string; subtitle?: string; rarity: "common" | "rare" | "epic" | "legendary" } | null>(null);

  // Form state
  const [formBe, setFormBe] = useState("");
  const [formBuild, setFormBuild] = useState("");
  const [formMaster, setFormMaster] = useState("");
  const [formIdealDay, setFormIdealDay] = useState("");
  const [formHorizon, setFormHorizon] = useState("3yr");

  useEffect(() => {
    if (user) loadPath();
  }, [user]);

  // Check for drift notification
  useEffect(() => {
    if (!user) return;
    const driftData = sessionStorage.getItem(`path_drift_${user.id}`);
    if (driftData) {
      try {
        const drift = JSON.parse(driftData);
        const rarity = drift.modifications_count >= 3 ? "epic" : drift.modifications_count >= 2 ? "rare" : "common";
        setDriftMsg({
          title: "◆ THE PATH HAS SHIFTED",
          subtitle: drift.summary,
          rarity: rarity as any,
        });
        sessionStorage.removeItem(`path_drift_${user.id}`);
      } catch { /* ignore */ }
    }
  }, [user]);

  const loadPath = async () => {
    setLoading(true);
    const { data: paths } = await dataClient
      .from("life_paths")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (paths && paths.length > 0) {
      const path = paths[0] as unknown as LifePath;
      setLifePath(path);

      if (path.raw_input) {
        setFormBe(path.raw_input.be ?? "");
        setFormBuild(path.raw_input.build ?? "");
        setFormMaster(path.raw_input.master ?? "");
        setFormIdealDay(path.raw_input.idealDay ?? "");
        setFormHorizon(path.time_horizon);
      }

      const { data: arcData } = await dataClient
        .from("life_path_arcs")
        .select("*")
        .eq("life_path_id", path.id)
        .order("order_index");

      const arcList = (arcData ?? []) as unknown as Arc[];
      setArcs(arcList);

      if (arcList.length > 0) {
        const arcIds = arcList.map((a) => a.id);
        const { data: scenData } = await dataClient
          .from("life_path_scenarios")
          .select("*")
          .in("arc_id", arcIds)
          .order("order_index");
        setPathScenarios((scenData ?? []) as PathScenario[]);
      }
    } else {
      setShowCreate(true);
    }
    setLoading(false);
  };

  const generatePath = async (isRecalibration = false) => {
    if (!user) return;
    const hasInput = formBe.trim() || formBuild.trim() || formMaster.trim() || formIdealDay.trim();
    if (!hasInput) { toast.error("Please fill in at least one field."); return; }

    setGenerating(true);
    try {
      const rawInput = { be: formBe, build: formBuild, master: formMaster, idealDay: formIdealDay };
      const contentParts = [];
      if (formBe.trim()) contentParts.push(`WHO I WANT TO BE: ${formBe}`);
      if (formBuild.trim()) contentParts.push(`WHAT I WANT TO BUILD/CREATE: ${formBuild}`);
      if (formMaster.trim()) contentParts.push(`WHAT I WANT TO MASTER: ${formMaster}`);
      if (formIdealDay.trim()) contentParts.push(`MY IDEAL DAY IN ${formHorizon}: ${formIdealDay}`);
      contentParts.push(`TIME HORIZON: ${formHorizon}`);

      const { data, error } = await dataClient.functions.invoke("generate-scenario", {
        body: { type: "life_path", content: contentParts.join("\n"), timeHorizon: formHorizon },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data.result;

      if (isRecalibration && lifePath) {
        await dataClient.from("life_paths").update({ status: "archived" }).eq("id", lifePath.id);
      }

      const { data: newPath, error: pathErr } = await dataClient.from("life_paths").insert({
        user_id: user.id,
        title: result.path_title,
        vision_statement: result.vision_statement,
        time_horizon: formHorizon,
        raw_input: rawInput,
        generated_roadmap: result,
        status: "active",
        recalibrated_at: isRecalibration ? new Date().toISOString() : null,
      }).select().single();

      if (pathErr || !newPath) throw pathErr || new Error("Failed to create path");

      for (let i = 0; i < result.arcs.length; i++) {
        const arc = result.arcs[i];
        const { data: newArc } = await dataClient.from("life_path_arcs").insert({
          life_path_id: newPath.id,
          title: arc.title,
          description: arc.description,
          order_index: i,
          duration_months: arc.duration_months,
          status: i === 0 ? "active" : "locked",
          focus_areas: arc.focus_areas,
        }).select().single();

        if (newArc && arc.suggested_scenarios) {
          for (let j = 0; j < arc.suggested_scenarios.length; j++) {
            const s = arc.suggested_scenarios[j];
            await dataClient.from("life_path_scenarios").insert({
              arc_id: newArc.id,
              suggested_title: s.title,
              suggested_category: s.category,
              suggested_why: s.why,
              order_index: j,
            });
          }
        }
      }

      toast.success(isRecalibration ? "Destiny recalibrated." : "Your Life Path has been forged.");
      setShowCreate(false);
      setShowRecalibrate(false);
      await loadPath();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate Life Path");
    } finally {
      setGenerating(false);
    }
  };

  const revertArc = async (arc: Arc) => {
    if (!arc.original_data || !arc.is_ai_modified) return;
    try {
      await dataClient.from("life_path_arcs").update({
        title: arc.original_data.title,
        description: arc.original_data.description,
        focus_areas: arc.original_data.focus_areas,
        is_ai_modified: false,
        modification_reason: null,
        modified_at: null,
        original_data: null,
      }).eq("id", arc.id);

      // Emit resistance signal
      if (user) {
        await dataClient.from("path_signals").insert({
          user_id: user.id,
          signal_type: "resistance" as any,
          signal_data: { arc_title: arc.title, reverted_to: arc.original_data.title },
        });
      }

      toast.success("You have resisted the System's rewriting. Your will shapes your fate.");
      await loadPath();
    } catch (e: any) {
      toast.error(e.message || "Failed to revert");
    }
  };

  const createScenarioFromSuggestion = (title: string, category: string | null) => {
    const params = new URLSearchParams();
    params.set("title", title);
    if (category) params.set("category", category);
    navigate(`/scenarios/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING DESTINY...</p>
      </div>
    );
  }

  if (showCreate && !lifePath) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
            <span className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">LIFE PATH</span>
            <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">← Dashboard</Link>
          </div>
        </nav>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8 space-y-3">
            <h1 className="font-cinzel text-3xl font-bold text-primary tracking-wider">
              {isSoloLeveling ? `◆ DEFINE YOUR ${t('life_path').toUpperCase()}` : '◆ DEFINE YOUR DESTINY'}
            </h1>
            <p className="font-body text-sm text-muted-foreground italic max-w-md mx-auto">
              "The System has observed your potential. Declare the path you wish to walk, and your roadmap shall be forged."
            </p>
          </div>
          {renderForm(false)}
        </div>
      </div>
    );
  }

  if (showRecalibrate && lifePath) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
            <span className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">RECALIBRATE</span>
            <button onClick={() => setShowRecalibrate(false)} className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">← Back to Path</button>
          </div>
        </nav>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8 space-y-3">
            <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">◆ RECALIBRATING DESTINY</h1>
            <p className="font-body text-sm text-destructive italic">"The path ahead will shift. Past achievements remain. Are you certain?"</p>
          </div>
          {renderForm(true)}
        </div>
      </div>
    );
  }

  function renderForm(isRecalibration: boolean) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {[
            { label: "What do you want to BE?", value: formBe, set: setFormBe, placeholder: "e.g. A world-class AI researcher..." },
            { label: "What do you want to BUILD or CREATE?", value: formBuild, set: setFormBuild, placeholder: "e.g. An AI startup, a novel..." },
            { label: "What do you want to MASTER?", value: formMaster, set: setFormMaster, placeholder: "e.g. Machine learning, public speaking..." },
            { label: "Ideal day in the future?", value: formIdealDay, set: setFormIdealDay, placeholder: "e.g. Wake at 6am, train, research..." },
          ].map((field) => (
            <div key={field.label}>
              <label className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">{field.label}</label>
              <textarea value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder} rows={2}
                className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />
            </div>
          ))}
          <div>
            <label className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Time Horizon</label>
            <div className="flex gap-2">
              {TIME_HORIZONS.map((h) => (
                <button key={h.value} onClick={() => setFormHorizon(h.value)}
                  className={`font-mono-stat text-[10px] uppercase px-4 py-2 rounded border transition-all ${formHorizon === h.value ? "border-primary/50 text-primary bg-primary/10" : "text-muted-foreground hover:border-primary/30"}`}>{h.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-center pt-4">
          <Button onClick={() => generatePath(isRecalibration)} disabled={generating || !(formBe.trim() || formBuild.trim() || formMaster.trim() || formIdealDay.trim())} className="font-cinzel tracking-wider glow-accent px-8">
            {generating ? "◈ Forging Destiny..." : isRecalibration ? "◈ Recalibrate Path" : "◈ Forge My Path"}
          </Button>
        </div>
      </div>
    );
  }

  if (!lifePath) return null;

  const getArcScenarios = (arcId: string) => pathScenarios.filter((s) => s.arc_id === arcId);
  const getArcProgress = (arcId: string) => {
    const scenarios = getArcScenarios(arcId);
    return { completed: scenarios.filter((s) => s.is_completed).length, total: scenarios.length };
  };

  // Calculate alignment from latest drift log entry
  const latestDrift = Array.isArray(lifePath.drift_log) && lifePath.drift_log.length > 0
    ? lifePath.drift_log[lifePath.drift_log.length - 1]
    : null;
  const alignmentScore = latestDrift?.alignment_score ?? 50;
  const alignment = getAlignmentLabel(alignmentScore);

  return (
    <div className="min-h-screen bg-background">
      {driftMsg && (
        <SystemMessage title={driftMsg.title} subtitle={driftMsg.subtitle} rarity={driftMsg.rarity} onDismiss={() => setDriftMsg(null)} />
      )}

      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">LIFE PATH</span>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative rounded-xl border p-8 mb-10 overflow-hidden"
          style={{ borderColor: "hsl(var(--primary) / 0.3)", background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--background)))" }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: "radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.15), transparent 60%), radial-gradient(ellipse at 70% 50%, hsl(var(--primary) / 0.1), transparent 50%)",
          }} />
          <div className="relative z-10 text-center space-y-4">
            <div className="flex justify-center gap-2 mb-2">
              <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {TIME_HORIZONS.find((h) => h.value === lifePath.time_horizon)?.label ?? lifePath.time_horizon}
              </span>
              {/* Alignment badge */}
              <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: `${alignment.color}20`, color: alignment.color }}>
                {alignment.label} ({alignmentScore}%)
              </span>
            </div>

            <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-primary tracking-wider">{lifePath.title}</h1>

            {lifePath.vision_statement && (
              <p className="font-body text-base text-muted-foreground italic max-w-2xl mx-auto leading-relaxed">"{lifePath.vision_statement}"</p>
            )}

            <div className="flex flex-wrap justify-center gap-4 items-center pt-2">
              <span className="font-mono-stat text-[10px] text-muted-foreground">Created {new Date(lifePath.created_at).toLocaleDateString()}</span>
              {lifePath.last_recalibrated_at && (
                <span className="font-mono-stat text-[10px] text-primary">
                  ◆ AI recalibrated {new Date(lifePath.last_recalibrated_at).toLocaleDateString()}
                </span>
              )}
              {lifePath.recalibration_count > 0 && (
                <span className="font-mono-stat text-[9px] text-muted-foreground">
                  ({lifePath.recalibration_count} AI shifts)
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowRecalibrate(true)} className="font-mono-stat text-[10px]">
                ↻ Recalibrate
              </Button>
            </div>

            {/* Path Alignment Bar */}
            <div className="max-w-xs mx-auto pt-3">
              <div className="flex items-center gap-2">
                <span className="font-mono-stat text-[9px] text-muted-foreground">PATH ALIGNMENT</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${alignmentScore}%`, background: alignment.color, boxShadow: alignmentScore > 85 ? `0 0 8px ${alignment.color}` : "none" }} />
                </div>
                <span className="font-mono-stat text-[10px]" style={{ color: alignment.color }}>{alignmentScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Arc Timeline */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 hidden md:block"
            style={{ background: "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--primary) / 0.2))" }} />

          <div className="space-y-8">
            {arcs.map((arc) => {
              const progress = getArcProgress(arc.id);
              const arcScenarios = getArcScenarios(arc.id);
              const isActive = arc.status === "active";
              const isCleared = arc.status === "cleared";
              const isLocked = arc.status === "locked";
              const isModified = arc.is_ai_modified;

              return (
                <div key={arc.id} className="relative md:pl-16">
                  {/* Timeline node */}
                  <div className="absolute left-4 top-6 h-5 w-5 rounded-full border-2 hidden md:block z-10"
                    style={{
                      borderColor: isCleared ? "hsl(45 90% 50%)" : isActive ? "hsl(var(--primary))" : "hsl(var(--dim))",
                      background: isCleared ? "hsl(45 90% 50%)" : isActive ? "hsl(var(--primary))" : "hsl(var(--background))",
                      boxShadow: isActive ? "0 0 12px hsl(var(--glow) / 0.6)" : isModified ? "0 0 8px hsl(270 60% 55% / 0.5)" : "none",
                    }} />

                  <div className={`rounded-xl border p-6 transition-all relative ${isLocked ? "opacity-60" : ""}`}
                    style={{
                      borderColor: isModified && isLocked
                        ? "hsl(270 60% 55% / 0.4)"
                        : isActive ? "hsl(var(--primary) / 0.4)"
                        : isCleared ? "hsl(45 90% 50% / 0.3)"
                        : "hsl(var(--border))",
                      boxShadow: isActive ? "0 0 20px hsl(var(--glow) / 0.15)"
                        : isModified && isLocked ? "0 0 12px hsl(270 60% 55% / 0.1)"
                        : "none",
                      background: "hsl(var(--card))",
                    }}>

                    {/* Badges */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {isCleared && (
                        <span className="font-cinzel text-sm font-bold tracking-widest rotate-[-8deg]" style={{ color: "hsl(45 90% 50% / 0.6)" }}>✦ CLEARED</span>
                      )}
                      {isLocked && !isModified && (
                        <span className="font-mono-stat text-[10px] text-muted-foreground">🔒 LOCKED</span>
                      )}
                      {isModified && (
                        <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded" 
                          style={{ background: "hsl(270 60% 55% / 0.15)", color: "hsl(270 60% 55%)" }}
                          title={arc.modification_reason ?? "AI modified"}>
                          ✦ UPDATED
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-4 mb-3 pr-24">
                      <div>
                        <h3 className="font-cinzel text-lg font-bold text-foreground">{arc.title}</h3>
                        <span className="font-mono-stat text-[10px] text-muted-foreground">{arc.duration_months} months</span>
                      </div>
                      {isActive && (
                        <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">Current Arc</span>
                      )}
                    </div>

                    {arc.description && <p className="font-body text-sm text-muted-foreground mb-3">{arc.description}</p>}

                    {/* AI modification reason */}
                    {isModified && arc.modification_reason && (
                      <p className="font-body text-xs italic mb-3" style={{ color: "hsl(270 60% 55%)" }}>
                        "{arc.modification_reason}"
                      </p>
                    )}

                    {/* Focus area chips */}
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {(arc.focus_areas as string[] ?? []).map((f) => (
                        <span key={f} className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ background: `${focusColors[f] ?? "hsl(var(--secondary))"}20`, color: focusColors[f] ?? "hsl(var(--muted-foreground))" }}>{f}</span>
                      ))}
                    </div>

                    {/* Progress */}
                    {!isLocked && (
                      <div className="mb-4">
                        <div className="flex items-center gap-3">
                          <GlowingProgress value={progress.completed} max={progress.total || 1} height="h-1.5" className="flex-1" />
                          <span className="font-mono-stat text-[10px] text-muted-foreground shrink-0">{progress.completed}/{progress.total}</span>
                        </div>
                      </div>
                    )}

                    {/* Scenarios */}
                    {!isLocked && arcScenarios.length > 0 && (
                      <div className="space-y-2">
                        {arcScenarios.map((s) => (
                          <div key={s.id} className={`rounded-lg border p-3 flex items-start gap-3 ${s.is_completed ? "bg-secondary/30 border-primary/20" : "bg-secondary/10"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {s.suggested_category && (
                                  <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                                    style={{ background: `${focusColors[s.suggested_category] ?? "hsl(var(--secondary))"}20`, color: focusColors[s.suggested_category] ?? "hsl(var(--muted-foreground))" }}>{s.suggested_category}</span>
                                )}
                                {s.is_completed && <span className="font-mono-stat text-[9px] text-primary">✓ Completed</span>}
                                {s.scenario_id && !s.is_completed && <span className="font-mono-stat text-[9px] text-primary">Linked ✓</span>}
                              </div>
                              <p className={`font-body text-sm ${s.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{s.suggested_title}</p>
                              {s.suggested_why && <p className="font-body text-xs text-muted-foreground mt-1 italic">{s.suggested_why}</p>}
                            </div>
                            {!s.is_completed && !s.scenario_id && (
                              <Button size="sm" variant="outline" onClick={() => createScenarioFromSuggestion(s.suggested_title, s.suggested_category)} className="font-mono-stat text-[9px] shrink-0">Create →</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Revert button for AI-modified locked arcs */}
                    {isModified && isLocked && arc.original_data && (
                      <div className="mt-4 pt-3 border-t">
                        <button onClick={() => revertArc(arc)}
                          className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                          ↺ Resist — Revert to original
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drift Log */}
        {Array.isArray(lifePath.drift_log) && lifePath.drift_log.length > 0 && (
          <div className="mt-12">
            <SectionLabel prefix="◆">Drift Log — The System's Observations</SectionLabel>
            <div className="space-y-3 mt-4">
              {[...lifePath.drift_log].reverse().map((entry: any, i: number) => (
                <div key={i} className="rounded-lg border bg-card p-4" style={{ borderColor: "hsl(270 60% 55% / 0.2)" }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-mono-stat text-[9px] uppercase tracking-wider" style={{ color: "hsl(270 60% 55%)" }}>
                      ◆ Path Shift #{lifePath.drift_log.length - i}
                    </span>
                    <span className="font-mono-stat text-[9px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()} · {entry.signals_processed} signals · {entry.modifications_count} changes
                    </span>
                  </div>
                  <p className="font-body text-sm text-foreground italic">"{entry.summary}"</p>
                  {entry.alignment_score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-mono-stat text-[9px] text-muted-foreground">Alignment:</span>
                      <span className="font-mono-stat text-[10px]" style={{ color: getAlignmentLabel(entry.alignment_score).color }}>
                        {entry.alignment_score}% — {getAlignmentLabel(entry.alignment_score).label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LifePathPage;
