import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { useUniverse } from "@/hooks/useUniverse";
import { GateCard } from "@/components/sl/GateCard";
import type { Tables } from "@/types/database";

type Scenario = Tables<"scenarios">;

interface ConstellationScenario {
  id: string;
  title: string;
  description: string | null;
  personal_note: string | null;
  category: string;
  xp_reward: number;
  deadline: string | null;
  status: string;
  mentor_name?: string;
}

const CATEGORIES = ["All", "Academic", "Skill", "Career", "Social", "Fitness"];

const categoryColors: Record<string, string> = {
  Academic: "hsl(var(--theme-blue))",
  Skill: "hsl(var(--theme-green))",
  Career: "hsl(var(--primary))",
  Social: "hsl(320 80% 55%)",
  Fitness: "hsl(var(--theme-red))",
};

const Scenarios = () => {
  const { user } = useAuth();
  const { t, isSoloLeveling } = useUniverse();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [constellationScenarios, setConstellationScenarios] = useState<ConstellationScenario[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient
        .from("scenarios")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setScenarios(data ?? [])),
      dataClient
        .from("constellation_scenarios")
        .select("*")
        .eq("sponsee_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .then(async ({ data }) => {
          if (!data || data.length === 0) {
            setConstellationScenarios([]);
            return;
          }
          const mentorIds = [...new Set(data.map((d: any) => d.mentor_id))];
          const { data: profiles } = await dataClient
            .from("profiles")
            .select("id, display_name, username")
            .in("id", mentorIds);
          const nameMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.display_name || p.username; });
          setConstellationScenarios(
            data.map((d: any) => ({ ...d, mentor_name: nameMap[d.mentor_id] || "Unknown" }))
          );
        }),
    ]).then(() => setLoading(false));
  }, [user]);

  const filtered = filter === "All" ? scenarios : scenarios.filter((s) => s.category === filter);
  const filteredConstellation = filter === "All" ? constellationScenarios : constellationScenarios.filter((s) => s.category === filter);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <SectionLabel prefix="◆">{t('scenario')}s</SectionLabel>
          <Button asChild className="font-cinzel tracking-wider glow-accent" size="sm">
            <Link to="/scenarios/new">+ New {t('scenario')}</Link>
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`font-mono-stat text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                filter === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Constellation-issued scenarios */}
        {filteredConstellation.length > 0 && (
          <div className="mb-8 space-y-3">
            <SectionLabel prefix="✦">Constellation-Issued Scenarios</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConstellation.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg p-4 space-y-2 constellation-scenario-card"
                  style={{
                    border: "2px solid hsl(45 90% 55% / 0.3)",
                    background: "linear-gradient(135deg, hsl(var(--card)), hsl(45 90% 55% / 0.03))",
                    boxShadow: "0 0 20px hsl(45 90% 55% / 0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="constellation-issued-badge font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">
                      ✦ CONSTELLATION ISSUED
                    </span>
                    <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {s.category}
                    </span>
                  </div>
                  <h3 className="font-cinzel text-sm font-semibold text-foreground">{s.title}</h3>
                  {s.personal_note && (
                    <p className="font-body text-xs italic text-muted-foreground">"{s.personal_note}"</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-mono-stat text-[10px]" style={{ color: "hsl(45 90% 55%)" }}>+{s.xp_reward} XP</span>
                    <span className="font-mono-stat text-[9px] text-muted-foreground">by {s.mentor_name}</span>
                  </div>
                  {s.deadline && (
                    <span className="font-mono-stat text-[9px] text-destructive">
                      ⏰ {new Date(s.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center font-mono-stat text-sm text-muted-foreground animate-pulse mt-12">◈ LOADING SCENARIOS...</p>
        ) : filtered.length === 0 && filteredConstellation.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="font-cinzel text-lg text-muted-foreground">No scenarios yet</p>
            <p className="font-body text-sm text-muted-foreground">Create your first scenario to begin your journey.</p>
            <Button asChild className="font-cinzel tracking-wider glow-accent">
              <Link to="/scenarios/new">Create Scenario</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) =>
              isSoloLeveling ? (
                <GateCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  category={s.category ?? 'General'}
                  status={s.status ?? 'active'}
                  xpReward={s.xp_reward ?? 500}
                  gateRank={String((s as Record<string, unknown>).gate_rank ?? 'E')}
                />
              ) : (
              <Link
                key={s.id}
                to={`/scenarios/${s.id}`}
                className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-all category-card group"
                style={{ borderLeftColor: categoryColors[s.category ?? ""] ?? "hsl(var(--primary))" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {s.category ?? "General"}
                  </span>
                  <span className={`font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                    s.status === "completed" ? "bg-green-900/30 text-green-400"
                      : s.status === "abandoned" ? "bg-red-900/30 text-red-400"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {s.status ?? "active"}
                  </span>
                  {((s as any).regression_count ?? 0) > 0 && (
                    <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/30 text-purple-400" title={`Regressed ${(s as any).regression_count}x`}>
                      ↺ {(s as any).regression_count}
                    </span>
                  )}
                </div>
                <h3 className="font-cinzel text-sm font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {((s as any).regression_count ?? 0) > 0 && <span className="text-purple-400 mr-1">↺</span>}
                  {s.title}
                </h3>
                {s.dramatic_intro && (
                  <p className="font-body text-xs text-muted-foreground italic line-clamp-2 mb-3">{s.dramatic_intro}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-mono-stat text-[10px] text-primary">+{s.xp_reward ?? 500} XP</span>
                  {s.doom_deadline && (
                    <span className="font-mono-stat text-[9px] text-muted-foreground">
                      ⏰ {new Date(s.doom_deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scenarios;
