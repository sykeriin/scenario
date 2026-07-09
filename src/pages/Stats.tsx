import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { StigmaDisplay } from "@/components/StigmaDisplay";
import { StatSkillCard } from "@/components/StatSkillCard";
import { DuelHistoryWidget } from "@/components/DuelHistoryWidget";
import { getCharacterByName } from "@/lib/orvCharacters";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useUniverse } from "@/hooks/useUniverse";
import { RankBadge } from "@/components/sl/RankBadge";
import api from "@/lib/api";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Title = Tables<"titles">;

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string }> = {
  common: { border: "hsl(var(--border))", glow: "none", label: "Common" },
  rare: { border: "hsl(var(--theme-blue))", glow: "0 0 8px hsl(var(--theme-blue) / 0.4)", label: "Rare" },
  epic: { border: "hsl(270 80% 60%)", glow: "0 0 12px hsl(270 80% 60% / 0.4)", label: "Epic" },
  legendary: { border: "hsl(var(--primary))", glow: "0 0 16px hsl(var(--glow) / 0.5)", label: "Legendary" },
};

const Stats = () => {
  const { user } = useAuth();
  const { t, isSoloLeveling } = useUniverse();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [xpHistory, setXpHistory] = useState<{ date: string; xp: number }[]>([]);
  const [radarAnimated, setRadarAnimated] = useState(false);
  const [shadow, setShadow] = useState<{ shadow_name: string; shadow_xp: number; shadow_note: string | null; shadow_stats: Record<string, number> } | null>(null);
  const [visitorLog, setVisitorLog] = useState<{ id: string; character_name: string; visit_type: string; visited_at: string }[]>([]);
  const [prestigeHistory, setPrestigeHistory] = useState<{
    prestige_level: number;
    xp_at_prestige: number;
    level_at_prestige: number;
    title_at_prestige: string | null;
    prestiged_at: string;
  }[]>([]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      dataClient.from("profiles").select("*").eq("id", user.id).single(),
      dataClient.from("titles").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
      dataClient.from("xp_log").select("amount, created_at").eq("user_id", user.id).order("created_at", { ascending: true }),
      dataClient.from("shadow_selves").select("*").eq("user_id", user.id).maybeSingle(),
      dataClient.from("character_visits").select("id, character_name, visit_type, visited_at").eq("user_id", user.id).order("visited_at", { ascending: false }).limit(20),
    ]).then(([profileRes, titlesRes, xpRes, shadowRes, visitsRes]) => {
      setProfile(profileRes.data);
      setTitles(titlesRes.data ?? []);
      if (shadowRes.data) setShadow(shadowRes.data as any);
      setVisitorLog((visitsRes.data as any) ?? []);

      // Aggregate XP by day for last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyXp: Record<string, number> = {};
      
      for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
        dailyXp[d.toISOString().split("T")[0]] = 0;
      }
      
      (xpRes.data ?? []).forEach((log) => {
        if (!log.created_at) return;
        const date = log.created_at.split("T")[0];
        if (dailyXp[date] !== undefined) {
          dailyXp[date] += log.amount;
        }
      });

      setXpHistory(Object.entries(dailyXp).map(([date, xp]) => ({ date, xp })));
    });

    // Trigger radar animation after mount
    setTimeout(() => setRadarAnimated(true), 300);
    api.profiles.prestigeHistory().then(setPrestigeHistory).catch(() => {});
  }, [user]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING CHARACTER SHEET...</p>
      </div>
    );
  }

  const stats = [
    { label: t('stat_physical'), key: "stat_physical", value: profile.stat_physical ?? 0, color: "hsl(var(--theme-red))" },
    { label: t('stat_psyche'), key: "stat_psyche", value: profile.stat_psyche ?? 0, color: "hsl(var(--theme-blue))" },
    { label: t('stat_intel'), key: "stat_intel", value: profile.stat_intel ?? 0, color: "hsl(var(--theme-green))" },
    { label: t('stat_spiritual'), key: "stat_spiritual", value: profile.stat_spiritual ?? 0, color: "hsl(270 80% 55%)" },
    { label: t('stat_core'), key: "stat_core", value: profile.stat_core ?? 0, color: "hsl(var(--primary))" },
    { label: t('stat_craft'), key: "stat_craft", value: profile.stat_craft ?? 0, color: "hsl(30 80% 55%)" },
  ];

  const radarData = stats.map((s) => ({
    stat: s.label,
    value: radarAnimated ? s.value : 0,
    fullMark: 100,
  }));

  const xpForLevel = (profile.level ?? 1) * 200;

  // Locked title placeholders
  const lockedTitles = [
    { name: "Shadow Walker", rarity: "rare", desc: "Complete 5 scenarios" },
    { name: "Dawn Breaker", rarity: "epic", desc: "Reach level 15" },
    { name: "Constellation", rarity: "legendary", desc: "Max all stats to 50+" },
    { name: "Iron Will", rarity: "common", desc: "30-day streak" },
    { name: "Void Keeper", rarity: "epic", desc: "Complete 20 scenarios" },
    { name: "The Reader", rarity: "legendary", desc: "Reach level 30" },
  ];

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

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Character Header */}
        <div className="text-center space-y-2">
          {isSoloLeveling ? (
            <RankBadge rank={String((profile as Record<string, unknown>).hunter_rank ?? 'E')} totalXp={profile.total_xp ?? 0} size="lg" />
          ) : (
            <div className="font-cinzel text-3xl font-bold text-primary">LV. {profile.level ?? 1}</div>
          )}
          <h1 className="font-cinzel text-xl tracking-wider">{profile.display_name || profile.username}</h1>
          <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest">
            ✦ {profile.current_title ?? "Nameless Reader"}
          </p>
          <div className="flex justify-center items-center gap-3 mt-2">
            <span className="font-mono-stat text-xs text-primary">{profile.total_xp ?? 0} {t('xp')}</span>
            <GlowingProgress value={(profile.total_xp ?? 0) % xpForLevel} max={xpForLevel} height="h-2" className="w-40" />
            <span className="font-mono-stat text-[10px] text-muted-foreground">
              {(profile.total_xp ?? 0) % xpForLevel}/{xpForLevel}
            </span>
          </div>
        </div>

        {/* Radar Chart + Stat Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar */}
          <div className="rounded-lg border bg-card p-6">
            <SectionLabel prefix="◈">Initiations</SectionLabel>
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="stat"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  />
                  <Radar
                    name="Stats"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stat Skill Cards */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <SectionLabel prefix="✦">Core Attributes</SectionLabel>
            <div className="grid grid-cols-1 gap-3">
              {stats.map((s) => (
                <StatSkillCard key={s.key} statName={s.label} statXp={s.value} />
              ))}
            </div>
          </div>
        </div>

        {/* Stigma Marks */}
        {user && (
          <div className="space-y-4">
            <SectionLabel prefix="◈">Stigma Marks</SectionLabel>
            <StigmaDisplay userId={user.id} />
          </div>
        )}

        {/* Shadow Gap */}
        {shadow && (
          <div className="rounded-lg border bg-card p-6 space-y-4" style={{ borderColor: "hsl(0 70% 45% / 0.2)" }}>
            <SectionLabel prefix="◆">Shadow Gap</SectionLabel>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-cinzel text-sm italic" style={{ opacity: 0.7, textShadow: "0 0 6px hsl(0 70% 45% / 0.3)" }}>
                  {shadow.shadow_name}
                </div>
                <div className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
                  Shadow XP: {shadow.shadow_xp.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono-stat text-lg font-bold" style={{ color: "hsl(0 70% 55%)" }}>
                  −{Math.max(0, shadow.shadow_xp - (profile.total_xp ?? 0)).toLocaleString()} XP
                </div>
                <div className="font-mono-stat text-[9px] text-muted-foreground">deficit</div>
              </div>
            </div>
            <div className="relative w-full overflow-hidden rounded-full h-3" style={{ background: "hsl(0 70% 45% / 0.12)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${shadow.shadow_xp > 0 ? Math.min(100, ((profile.total_xp ?? 0) / shadow.shadow_xp) * 100) : 0}%`,
                  background: "hsl(0 70% 50%)",
                  boxShadow: "0 0 10px hsl(0 70% 50% / 0.5)",
                }}
              />
            </div>
            {shadow.shadow_note && (
              <p className="font-body text-xs italic text-muted-foreground" style={{ opacity: 0.8 }}>
                "{shadow.shadow_note}"
              </p>
            )}
          </div>
        )}

        {/* Duel History */}
        {user && <DuelHistoryWidget userId={user.id} />}

        {/* Title Collection */}
        <div className="space-y-4">
          <SectionLabel prefix="◆">Title Collection</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Earned titles */}
            {titles.map((t) => {
              const style = RARITY_STYLES[t.rarity ?? "common"] ?? RARITY_STYLES.common;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border bg-card p-4 text-center transition-all hover:scale-[1.02]"
                  style={{ borderColor: style.border, boxShadow: style.glow }}
                >
                  <div className="font-cinzel text-sm font-semibold mb-1">{t.title_name}</div>
                  <div className="font-mono-stat text-[9px] uppercase tracking-wider text-primary mb-1">{style.label}</div>
                  {t.description && (
                    <p className="font-body text-[10px] text-muted-foreground">{t.description}</p>
                  )}
                </div>
              );
            })}
            {/* Locked titles */}
            {lockedTitles.map((t) => {
              const isUnlocked = titles.some((ut) => ut.title_name === t.name);
              if (isUnlocked) return null;
              return (
                <div
                  key={t.name}
                  className="rounded-lg border bg-card/50 p-4 text-center opacity-40"
                >
                  <div className="font-cinzel text-sm font-semibold mb-1">???</div>
                  <div className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    {RARITY_STYLES[t.rarity]?.label ?? "Common"}
                  </div>
                  <p className="font-body text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demon Resistance */}
        {((profile?.demon_encounters_resisted ?? 0) + (profile?.demon_encounters_submitted ?? 0)) > 0 && (
          <div className="space-y-4">
            <SectionLabel prefix="👁">Demon Resistance</SectionLabel>
            <div className="rounded-lg border bg-card p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-mono-stat text-xl font-bold" style={{ color: "hsl(120 60% 45%)" }}>{profile?.demon_encounters_resisted ?? 0}</p>
                  <p className="font-mono-stat text-[9px] uppercase text-muted-foreground">Resisted</p>
                </div>
                <div>
                  <p className="font-mono-stat text-xl font-bold text-destructive">{profile?.demon_encounters_submitted ?? 0}</p>
                  <p className="font-mono-stat text-[9px] uppercase text-muted-foreground">Submitted</p>
                </div>
                <div>
                  <p className="font-mono-stat text-xl font-bold text-muted-foreground">
                    {Math.round(((profile?.demon_encounters_submitted ?? 0) / ((profile?.demon_encounters_resisted ?? 0) + (profile?.demon_encounters_submitted ?? 0))) * 100)}%
                  </p>
                  <p className="font-mono-stat text-[9px] uppercase text-muted-foreground">Corruption</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <Link to="/demons" className="font-mono-stat text-[10px] text-primary hover:underline">View Demon Bestiary →</Link>
              </div>
            </div>
          </div>
        )}

        {/* Visitor Log */}
        {visitorLog.length > 0 && (
          <div className="space-y-4">
            <SectionLabel prefix="◈">Visitor Log</SectionLabel>
            <div className="rounded-lg border bg-card p-4 space-y-2">
              {visitorLog.map((v) => {
                const char = getCharacterByName(v.character_name);
                return (
                  <div key={v.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-lg">{char?.icon ?? "◈"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-cinzel text-xs font-semibold truncate">{v.character_name}</div>
                      <div className="font-mono-stat text-[9px] text-muted-foreground uppercase">{v.visit_type}</div>
                    </div>
                    <div className="font-mono-stat text-[9px] text-muted-foreground">
                      {new Date(v.visited_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* XP History Chart */}
        <div className="rounded-lg border bg-card p-6">
          <SectionLabel prefix="✦">XP History — Last 30 Days</SectionLabel>
          <div className="h-[250px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={xpHistory}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontFamily: "JetBrains Mono" }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {prestigeHistory.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <SectionLabel>Prestige History</SectionLabel>
          <p className="text-xs text-muted-foreground mb-3">You have returned {prestigeHistory.length} time(s).</p>
          <div className="space-y-2">
            {prestigeHistory.map((p) => (
              <div key={p.prestiged_at} className="rounded-lg border border-border p-3 text-sm flex flex-wrap gap-4">
                <span className="font-cinzel font-bold text-primary">P{p.prestige_level}</span>
                <span>{new Date(p.prestiged_at).toLocaleDateString()}</span>
                <span>{p.xp_at_prestige} XP sacrificed</span>
                <span>Level {p.level_at_prestige}</span>
                <span>{p.title_at_prestige}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm z-50">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", path: "/dashboard", icon: "🏠" },
            { label: "Quests", path: "/scenarios", icon: "⚔️" },
            { label: "Stats", path: "/stats", icon: "📊" },
            { label: "Lobby", path: "/lobby", icon: "🏛️" },
          ].map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="text-lg">{t.icon}</span>
              <span className="font-mono-stat text-[9px] uppercase">{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
