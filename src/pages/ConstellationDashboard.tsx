import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { getGradeInfo, getGradeBadgeStyle } from "@/lib/constellationGrades";
import { IssueConstellationScenarioDialog } from "@/components/IssueConstellationScenarioDialog";
import { NavLink } from "@/components/NavLink";

interface SponseeData {
  constellationId: string;
  id: string;
  username: string;
  displayName: string | null;
  currentTitle: string | null;
  level: number;
  totalXp: number;
  lifePathTitle?: string;
  weakStats: string[];
  activeScenarios: { title: string; status: string | null; category: string | null }[];
  issuedScenarios: { id: string; title: string; status: string; xp_reward: number; created_at: string }[];
}

export default function ConstellationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sponsees, setSponsees] = useState<SponseeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState("Low Grade");
  const [stories, setStories] = useState(0);
  const [issuingFor, setIssuingFor] = useState<SponseeData | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Get my grade
    const { data: myProfile } = await dataClient
      .from("profiles")
      .select("constellation_grade, constellation_stories")
      .eq("id", user.id)
      .single();

    if (myProfile) {
      setGrade((myProfile as any).constellation_grade ?? "Low Grade");
      setStories((myProfile as any).constellation_stories ?? 0);
    }

    // Get my constellations (as mentor)
    const { data: constellations } = await dataClient
      .from("constellations")
      .select("id, mentee_id")
      .eq("mentor_id", user.id)
      .eq("active", true);

    if (!constellations || constellations.length === 0) {
      setSponsees([]);
      setLoading(false);
      return;
    }

    const menteeIds = constellations.map((c: any) => c.mentee_id);

    // Fetch profiles, scenarios, life paths, issued scenarios in parallel
    const [profilesRes, scenariosRes, lifePathsRes, issuedRes] = await Promise.all([
      dataClient.from("profiles").select("id, username, display_name, current_title, level, total_xp, stat_core, stat_craft, stat_intel, stat_physical, stat_psyche, stat_spiritual").in("id", menteeIds),
      dataClient.from("scenarios").select("title, status, category, user_id").in("user_id", menteeIds).order("created_at", { ascending: false }),
      dataClient.from("life_paths").select("title, user_id, status").in("user_id", menteeIds).eq("status", "active"),
      dataClient.from("constellation_scenarios").select("*").eq("mentor_id", user.id).in("sponsee_id", menteeIds),
    ]);

    const profiles = profilesRes.data ?? [];
    const scenarios = scenariosRes.data ?? [];
    const lifePaths = lifePathsRes.data ?? [];
    const issued = issuedRes.data ?? [];

    const result: SponseeData[] = constellations.map((c: any) => {
      const p = profiles.find((pr: any) => pr.id === c.mentee_id);
      const stats = p ? {
        Core: p.stat_core ?? 0,
        Craft: p.stat_craft ?? 0,
        Intel: p.stat_intel ?? 0,
        Physical: p.stat_physical ?? 0,
        Psyche: p.stat_psyche ?? 0,
        Spiritual: p.stat_spiritual ?? 0,
      } : {};
      const sortedStats = Object.entries(stats).sort(([, a], [, b]) => a - b);
      const weakStats = sortedStats.slice(0, 2).map(([name]) => name);

      const lp = lifePaths.find((l: any) => l.user_id === c.mentee_id);
      const userScenarios = scenarios.filter((s: any) => s.user_id === c.mentee_id).slice(0, 5);
      const userIssued = issued.filter((i: any) => i.sponsee_id === c.mentee_id);

      return {
        constellationId: c.id,
        id: c.mentee_id,
        username: p?.username ?? "Unknown",
        displayName: p?.display_name ?? null,
        currentTitle: p?.current_title ?? "Nameless Reader",
        level: p?.level ?? 1,
        totalXp: p?.total_xp ?? 0,
        lifePathTitle: lp?.title,
        weakStats,
        activeScenarios: userScenarios.map((s: any) => ({ title: s.title, status: s.status, category: s.category })),
        issuedScenarios: userIssued.map((i: any) => ({ id: i.id, title: i.title, status: i.status, xp_reward: i.xp_reward, created_at: i.created_at })),
      };
    });

    setSponsees(result);
    setLoading(false);
  };

  const gradeInfo = getGradeInfo(grade);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">✦ LOADING CONSTELLATION DATA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur px-4 py-2 flex items-center gap-4">
        <NavLink to="/dashboard" className="font-mono-stat text-xs text-muted-foreground hover:text-foreground">← Dashboard</NavLink>
        <span className="font-mono-stat text-[10px] text-muted-foreground uppercase tracking-wider">
          Constellation Dashboard
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div
          className="rounded-lg border bg-card p-6 text-center space-y-2"
          style={{ borderColor: gradeInfo.color.replace(")", " / 0.3)"), boxShadow: `0 0 30px ${gradeInfo.color.replace(")", " / 0.08)")}` }}
        >
          <span className="text-3xl">✦</span>
          <h1 className="font-cinzel text-xl font-bold" style={getGradeBadgeStyle(grade)}>
            Constellation Dashboard
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="font-mono-stat text-[10px] uppercase tracking-wider" style={{ color: gradeInfo.color }}>
              {grade}
            </span>
            <span className="font-mono-stat text-[10px] text-muted-foreground">
              {stories.toLocaleString()} Stories
            </span>
            <span className="font-mono-stat text-[10px] text-muted-foreground">
              {sponsees.length} Sponsees
            </span>
          </div>
        </div>

        {/* Sponsees */}
        {sponsees.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="font-cinzel text-lg text-muted-foreground">No active sponsees.</p>
            <p className="font-body text-sm text-muted-foreground">Sponsor readers from the Lobby to begin guiding them.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sponsees.map((s) => {
              const activeIssued = s.issuedScenarios.filter((i) => i.status === "active" || i.status === "pending_acceptance");

              return (
                <div key={s.id} className="rounded-lg border bg-card p-5 space-y-4">
                  {/* Sponsee header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🌟</span>
                      <div>
                        <p className="font-cinzel text-sm font-bold text-foreground">
                          {s.displayName || s.username}
                        </p>
                        <p className="font-mono-stat text-[9px] text-muted-foreground">
                          {s.currentTitle} · Lv.{s.level} · {(s.totalXp ?? 0).toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIssuingFor(s)}
                      disabled={activeIssued.length >= 3}
                      className="font-mono-stat text-[10px] tracking-wider"
                      style={activeIssued.length < 3 ? { background: "hsl(45 90% 55%)", color: "hsl(40 100% 2%)" } : {}}
                    >
                      {activeIssued.length >= 3 ? "Max Reached" : "✦ Issue Scenario"}
                    </Button>
                  </div>

                  {/* Life Path */}
                  {s.lifePathTitle && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">Life Path:</span>
                      <span className="font-body text-xs text-foreground">{s.lifePathTitle}</span>
                    </div>
                  )}

                  {/* Weak stats */}
                  {s.weakStats.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">Weak Areas:</span>
                      {s.weakStats.map((ws) => (
                        <span key={ws} className="font-mono-stat text-[10px] text-destructive/80 px-2 py-0.5 rounded border border-destructive/20 bg-destructive/5">
                          {ws}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Their active scenarios */}
                  {s.activeScenarios.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
                        Their Scenarios
                      </span>
                      {s.activeScenarios.map((sc, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded border bg-secondary/20">
                          <span className="font-body text-xs truncate">{sc.title}</span>
                          <span className={`font-mono-stat text-[9px] uppercase ${
                            sc.status === "completed" ? "text-primary" : sc.status === "failed" ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {sc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Issued constellation scenarios */}
                  {s.issuedScenarios.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-mono-stat text-[9px] uppercase tracking-wider" style={{ color: "hsl(45 90% 55%)" }}>
                        ✦ Issued Scenarios
                      </span>
                      {s.issuedScenarios.map((is) => (
                        <div
                          key={is.id}
                          className="flex items-center justify-between p-2 rounded border"
                          style={{ borderColor: "hsl(45 90% 55% / 0.2)", background: "hsl(45 90% 55% / 0.02)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-body text-xs truncate">{is.title}</span>
                            <span className="font-mono-stat text-[9px] text-primary">+{is.xp_reward} XP</span>
                          </div>
                          <span className={`font-mono-stat text-[9px] uppercase ${
                            is.status === "cleared" ? "text-primary"
                            : is.status === "declined" ? "text-destructive"
                            : is.status === "active" ? "text-foreground"
                            : "text-muted-foreground"
                          }`}>
                            {is.status === "pending_acceptance" ? "PENDING" : is.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Issue dialog */}
      {issuingFor && (
        <IssueConstellationScenarioDialog
          sponsee={{
            constellationId: issuingFor.constellationId,
            sponseeId: issuingFor.id,
            sponseeName: issuingFor.displayName || issuingFor.username,
            lifePathTitle: issuingFor.lifePathTitle,
            weakStats: issuingFor.weakStats,
          }}
          onClose={() => setIssuingFor(null)}
          onIssued={() => load()}
        />
      )}
    </div>
  );
}
