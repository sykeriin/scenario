import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getGradeInfo, getNextGrade, getGradeBadgeStyle, CONSTELLATION_GRADES } from "@/lib/constellationGrades";
import { NavLink } from "@/components/NavLink";

interface ProfileData {
  id: string;
  display_name: string | null;
  username: string;
  constellation_grade: string;
  constellation_stories: number;
  constellation_sponsee_count: number;
  constellation_scenarios_cleared: number;
  current_title: string | null;
  level: number | null;
  total_xp: number | null;
}

interface StoryFragment {
  id: string;
  sponsee_id: string;
  source_type: string;
  story_value: number;
  narrative: string;
  created_at: string;
  sponsee_name?: string;
}

interface Sponsee {
  id: string;
  mentee_id: string;
  mentee_name: string;
  mentee_level: number;
  mentee_title: string;
}

export default function ConstellationProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stories, setStories] = useState<StoryFragment[]>([]);
  const [sponsees, setSponsees] = useState<Sponsee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      // Fetch profile
      const { data: profileData } = await dataClient
        .from("profiles")
        .select("id, display_name, username, constellation_grade, constellation_stories, constellation_sponsee_count, constellation_scenarios_cleared, current_title, level, total_xp")
        .eq("id", id)
        .single();

      if (!profileData) {
        navigate("/dashboard");
        return;
      }
      setProfile(profileData as ProfileData);

      // Fetch story fragments via constellations where this user is mentor
      const { data: constellationData } = await dataClient
        .from("constellations")
        .select("id, mentee_id")
        .eq("mentor_id", id);

      const constellationIds = (constellationData ?? []).map((c: any) => c.id);

      if (constellationIds.length > 0) {
        const { data: storyData } = await dataClient
          .from("story_fragments")
          .select("*")
          .in("constellation_id", constellationIds)
          .order("created_at", { ascending: false })
          .limit(50);

        // Enrich with sponsee names
        if (storyData && storyData.length > 0) {
          const sponseeIds = [...new Set(storyData.map((s: any) => s.sponsee_id))];
          const { data: sponseeProfiles } = await dataClient
            .from("profiles")
            .select("id, display_name, username")
            .in("id", sponseeIds);

          const nameMap: Record<string, string> = {};
          (sponseeProfiles ?? []).forEach((p: any) => {
            nameMap[p.id] = p.display_name || p.username;
          });

          setStories(
            (storyData as any[]).map((s) => ({
              ...s,
              sponsee_name: nameMap[s.sponsee_id] || "Unknown",
            }))
          );
        }

        // Fetch active sponsees
        const activeConstellations = (constellationData ?? []).filter((c: any) => true);
        const menteeIds = activeConstellations.map((c: any) => c.mentee_id);
        if (menteeIds.length > 0) {
          const { data: menteeProfiles } = await dataClient
            .from("profiles")
            .select("id, display_name, username, level, current_title")
            .in("id", menteeIds);

          setSponsees(
            activeConstellations.map((c: any) => {
              const mp = (menteeProfiles ?? []).find((p: any) => p.id === c.mentee_id);
              return {
                id: c.id,
                mentee_id: c.mentee_id,
                mentee_name: mp?.display_name || mp?.username || "Unknown",
                mentee_level: mp?.level ?? 1,
                mentee_title: mp?.current_title ?? "Nameless Reader",
              };
            })
          );
        }
      }

      setLoading(false);
    };

    load();
  }, [id, navigate]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">
          ◈ LOADING CONSTELLATION DATA...
        </p>
      </div>
    );
  }

  const gradeInfo = getGradeInfo(profile.constellation_grade);
  const nextGrade = getNextGrade(profile.constellation_grade);
  const name = profile.display_name || profile.username;

  // Progress to next grade
  let progressPct = 100;
  let progressLabel = "MAX GRADE";
  if (nextGrade && nextGrade.min !== Infinity) {
    const currentMin = gradeInfo.min;
    const range = nextGrade.min - currentMin;
    const progress = profile.constellation_stories - currentMin;
    progressPct = Math.min(100, Math.max(0, (progress / range) * 100));
    progressLabel = `${profile.constellation_stories.toLocaleString()} / ${nextGrade.min.toLocaleString()}`;
  }

  const sourceTypeLabels: Record<string, string> = {
    scenario_clear: "Scenario Cleared",
    disaster_defeat: "Disaster Defeated",
    title_unlock: "Title Unlocked",
    life_path_arc_clear: "Arc Cleared",
    duel_win: "Duel Won",
    constellation_scenario: "Constellation Scenario",
    level_milestone: "Level Milestone",
    nebula_join: "Nebula Joined",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur px-4 py-2 flex items-center gap-4">
        <NavLink to="/dashboard" className="font-mono-stat text-xs text-muted-foreground hover:text-foreground">← Back</NavLink>
        <span className="font-mono-stat text-[10px] text-muted-foreground uppercase tracking-wider">
          Constellation Profile
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header Card */}
        <div
          className="rounded-lg border bg-card p-6 text-center space-y-4 relative overflow-hidden"
          style={{
            borderColor: gradeInfo.color.replace(")", " / 0.4)"),
            background: `linear-gradient(135deg, hsl(var(--card)), ${gradeInfo.color.replace(")", " / 0.05)")})`,
          }}
        >
          {/* Ambient glow */}
          {gradeInfo.glow && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${gradeInfo.color.replace(")", " / 0.1)")}, transparent 60%)`,
              }}
            />
          )}

          <div className="relative z-10">
            <div className="text-4xl mb-2">✦</div>
            <h1 className="font-cinzel text-2xl font-bold" style={getGradeBadgeStyle(profile.constellation_grade)}>
              {name}
            </h1>
            <div
              className="font-mono-stat text-xs uppercase tracking-[0.3em] mt-2"
              style={{ color: gradeInfo.color }}
            >
              {profile.constellation_grade} Constellation
            </div>
            <div className="font-mono-stat text-[9px] text-muted-foreground mt-1">
              ✦ {profile.current_title ?? "Nameless Reader"} · Lv.{profile.level ?? 1}
            </div>
          </div>
        </div>

        {/* Stories + Grade Progress */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <SectionLabel prefix="◆">Stories Accumulated</SectionLabel>

          <div className="text-center">
            <span
              className="font-cinzel text-4xl font-bold"
              style={{ color: gradeInfo.color, textShadow: gradeInfo.glow ? `0 0 16px ${gradeInfo.color}` : "none" }}
            >
              {profile.constellation_stories.toLocaleString()}
            </span>
            <span className="font-mono-stat text-xs text-muted-foreground ml-2">Stories</span>
          </div>

          {/* Progress to next grade */}
          {nextGrade && nextGrade.min !== Infinity && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">
                  Progress to {nextGrade.grade}
                </span>
                <span className="font-mono-stat text-[9px]" style={{ color: nextGrade.color }}>
                  {progressLabel}
                </span>
              </div>
              <div
                className="relative w-full overflow-hidden rounded-full h-3"
                style={{ background: "hsl(var(--secondary))" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progressPct}%`,
                    background: nextGrade.color,
                    boxShadow: `0 0 10px ${nextGrade.color.replace(")", " / 0.5)")}`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Grade badges overview */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {CONSTELLATION_GRADES.filter((g) => g.min !== Infinity).map((g) => {
              const isActive = profile.constellation_stories >= g.min;
              return (
                <div
                  key={g.grade}
                  className="px-2 py-1 rounded text-center"
                  style={{
                    border: `1px solid ${isActive ? g.color : "hsl(var(--border))"}`,
                    opacity: isActive ? 1 : 0.3,
                  }}
                >
                  <span
                    className="font-mono-stat text-[8px] uppercase tracking-wider"
                    style={{ color: isActive ? g.color : "hsl(var(--muted-foreground))" }}
                  >
                    {g.grade}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Sponsees */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <SectionLabel prefix="✦">
            Sponsees ({sponsees.length}/{gradeInfo.maxSponsees === Infinity ? "∞" : gradeInfo.maxSponsees})
          </SectionLabel>

          {sponsees.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground italic">
              No sponsored readers yet.
            </p>
          ) : (
            <div className="space-y-2">
              {sponsees.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded border bg-secondary/20"
                >
                  <div>
                    <span className="font-cinzel text-sm font-bold text-foreground">
                      {s.mentee_name}
                    </span>
                    <span className="font-mono-stat text-[9px] text-muted-foreground ml-2">
                      Lv.{s.mentee_level}
                    </span>
                  </div>
                  <span className="font-mono-stat text-[8px] text-muted-foreground uppercase">
                    {s.mentee_title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Story Fragment Log */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <SectionLabel prefix="📜">Story Fragment Log</SectionLabel>

          {stories.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground italic">
              No stories recorded yet. Stories are generated when sponsored readers achieve great things.
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {stories.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded border-l-2 bg-secondary/10"
                  style={{
                    borderLeftColor: gradeInfo.color,
                  }}
                >
                  <p className="font-body text-xs italic text-foreground leading-relaxed">
                    "{s.narrative}"
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono-stat text-[8px] text-muted-foreground">
                      {sourceTypeLabels[s.source_type] || s.source_type} · {s.sponsee_name}
                    </span>
                    <span
                      className="font-mono-stat text-[9px] font-bold"
                      style={{ color: gradeInfo.color }}
                    >
                      +{s.story_value} Stories
                    </span>
                  </div>
                  <span className="font-mono-stat text-[7px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Powers Reference */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <SectionLabel prefix="⚡">Grade Powers</SectionLabel>
          <div className="space-y-2">
            {[
              { grade: "Low Grade", powers: "Sponsor up to 3 readers" },
              { grade: "Middle Grade", powers: "Sponsor 10 readers, issue personal scenarios" },
              { grade: "High Grade", powers: "Sponsor 25 readers, found/join Nebulae, 1.5× scenario XP" },
              { grade: "Transcendent Grade", powers: "Sponsor 50 readers, declare Disasters, ✦ badge" },
              { grade: "Ancient Grade", powers: "Unlimited sponsees, custom Stigma marks, 2× scenario XP" },
              { grade: "Myth Grade", powers: "Solo Nebula founding, golden name, Myth aura" },
              { grade: "Outer God", powers: "Unique cosmetic treatment, ORV Character cameo" },
            ].map((p) => {
              const gi = getGradeInfo(p.grade);
              const isReached = profile.constellation_stories >= gi.min;
              return (
                <div
                  key={p.grade}
                  className="flex items-start gap-3 p-2 rounded"
                  style={{ opacity: isReached ? 1 : 0.4 }}
                >
                  <span
                    className="font-mono-stat text-[9px] min-w-[100px] uppercase tracking-wider"
                    style={{ color: gi.color }}
                  >
                    {isReached ? "✦" : "○"} {p.grade}
                  </span>
                  <span className="font-body text-[11px] text-muted-foreground">
                    {p.powers}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
