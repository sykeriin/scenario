import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { dataClient } from "@/lib/data-client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { SystemAnnouncement } from "@/components/ui/SystemAnnouncement";
import { ConstellationWidget } from "@/components/ConstellationWidget";
import { PendingConstellationScenarios } from "@/components/PendingConstellationScenarios";
import { PendingNebulaInvites } from "@/components/PendingNebulaInvites";
import { LifePathWidget } from "@/components/LifePathWidget";
import { ShadowSelfWidget } from "@/components/ShadowSelfWidget";
import { DreamBoardWidget } from "@/components/DreamBoardWidget";
import { DisasterCard } from "@/components/DisasterCard";
import { CharacterVisitTrigger } from "@/components/CharacterVisitTrigger";
import { DemonEncounterTrigger } from "@/components/DemonEncounterTrigger";
import { RegressionCallout } from "@/components/RegressionCallout";
import { DuelWidget } from "@/components/DuelWidget";
import { PartyWidget } from "@/components/PartyWidget";
import { PartyCreateDialog } from "@/components/PartyCreateDialog";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { NpcEncounterCard } from "@/components/NpcEncounterCard";
import { PrestigeDialog } from "@/components/PrestigeDialog";
import { Button } from "@/components/ui/button";
import { ThemeName, themeNames } from "@/lib/themes";
import { Link, useNavigate } from "react-router-dom";
import { useUniverse } from "@/hooks/useUniverse";
import { FounderSwitcher } from "@/components/FounderSwitcher";
import { DashboardNav } from "@/components/DashboardNav";
import { WhatDoINowButton } from "@/components/WhatDoINowButton";
import { isFeatureUnlocked } from "@/lib/unlocks";
import { RankBadge } from "@/components/sl/RankBadge";
import { DailyQuestPanel } from "@/components/sl/DailyQuestPanel";
import { PenaltyZoneOverlay } from "@/components/sl/PenaltyZoneOverlay";
import { ShadowArmyWidget } from "@/components/sl/ShadowArmyWidget";
import { useSoloLeveling } from "@/hooks/useSoloLeveling";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Scenario = Tables<"scenarios">;
type MorningMust = Tables<"morning_musts">;
type MustCompletion = Tables<"must_completions">;
type Habit = Tables<"habits">;

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const pom = usePomodoro();
  const { universe, t, isSoloLeveling, founderMode } = useUniverse();
  const sl = useSoloLeveling();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>([]);
  const [musts, setMusts] = useState<MorningMust[]>([]);
  const [completions, setCompletions] = useState<MustCompletion[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [xpLogs, setXpLogs] = useState<{ created_at: string | null; amount: number }[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [todayPomodoros, setTodayPomodoros] = useState(0);
  const [hasLoggedMood, setHasLoggedMood] = useState(true);
  const [weeklyReviewPreview, setWeeklyReviewPreview] = useState<string | null>(null);
  const [showPartyCreate, setShowPartyCreate] = useState(false);
  const [showPrestige, setShowPrestige] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState<{ id: string; title: string; hp?: number } | null>(null);
  const [focusQuestTitle, setFocusQuestTitle] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Promise.all([
      dataClient.from("profiles").select("*").eq("id", user.id).single(),
      dataClient.from("scenarios").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(5),
      dataClient.from("morning_musts").select("*").eq("user_id", user.id).order("order_index"),
      dataClient.from("habits").select("*").eq("user_id", user.id).order("created_at"),
      dataClient.from("xp_log").select("created_at, amount").eq("user_id", user.id).gte("created_at", thirtyDaysAgo.toISOString()).order("created_at"),
      dataClient.from("pomodoro_sessions").select("id").eq("user_id", user.id).eq("completed", true).gte("created_at", `${new Date().toISOString().split("T")[0]}T00:00:00`),
      dataClient.from("emotion_logs").select("id").eq("user_id", user.id).eq("logged_at", new Date().toISOString().split("T")[0]),
      dataClient.from("disasters").select("id, title, hp").eq("user_id", user.id).eq("status", "active").limit(1),
    ]).then(async ([profileRes, scenariosRes, mustsRes, habitsRes, xpRes, pomodoroRes, moodRes, disasterRes]) => {
      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.ui_theme) setTheme(profileRes.data.ui_theme as ThemeName);
      }
      setActiveScenarios(scenariosRes.data ?? []);
      setMusts(mustsRes.data ?? []);
      setHabits(habitsRes.data ?? []);
      setXpLogs(xpRes.data ?? []);
      setTodayPomodoros(pomodoroRes.data?.length ?? 0);
      setHasLoggedMood((moodRes.data?.length ?? 0) > 0);
      const disasters = disasterRes.data as { id: string; title: string; hp?: number }[] | null;
      if (disasters?.[0]) setActiveDisaster(disasters[0]);

      const scenarioList = scenariosRes.data ?? [];
      if (scenarioList[0]) {
        const { data: stages } = await dataClient.from("stages").select("id").eq("scenario_id", scenarioList[0].id).eq("status", "active").limit(1);
        if (stages?.[0]) {
          const { data: pq } = await dataClient.from("quests").select("title").eq("stage_id", stages[0].id).eq("status", "pending").limit(1);
          if (pq?.[0]) setFocusQuestTitle(String(pq[0].title));
        }
      }

      // Load today's completions
      if (mustsRes.data && mustsRes.data.length > 0) {
        const mustIds = mustsRes.data.map((m) => m.id);
        const { data: comps } = await dataClient
          .from("must_completions")
          .select("*")
          .in("must_id", mustIds)
          .eq("completed_date", today);
        setCompletions(comps ?? []);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = dataClient
      .channel("profile-xp")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        if (payload.new?.id === user.id) setProfile(payload.new as Profile);
      })
      .subscribe();
    return () => ch.unsubscribe();
  }, [user]);

  // Weekly Review check — trigger on first login after Sunday
  useEffect(() => {
    if (!user) return;
    const reviewKey = `weekly_review_checked_${user.id}`;
    if (sessionStorage.getItem(reviewKey)) return;
    sessionStorage.setItem(reviewKey, "1");

    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) return; // Sunday — too early

    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - dayOfWeek);
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    const weekStart = lastMonday.toISOString().split("T")[0];

    dataClient
      .from("weekly_reviews")
      .select("id, narrative_text")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const firstSentence = (data[0] as any).narrative_text?.split(/[.!?]/)?.[0];
          if (firstSentence) setWeeklyReviewPreview(firstSentence + ".");
        } else {
          dataClient.functions.invoke("weekly-review", {
            body: {},
          }).then(({ data: reviewData, error }) => {
            if (!error && reviewData?.result?.narrative_text) {
              const firstSentence = reviewData.result.narrative_text.split(/[.!?]/)?.[0];
              if (firstSentence) setWeeklyReviewPreview(firstSentence + ".");
            }
          });
        }
      });
  }, [user]);

  // Novel chapter auto-generation — first login of each new month
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const monthKey = `novel_chapter_check_${user.id}_${now.getFullYear()}_${now.getMonth()}`;
    if (sessionStorage.getItem(monthKey)) return;
    sessionStorage.setItem(monthKey, "1");

    // Only trigger if we're in the first 7 days of a new month
    if (now.getDate() <= 7) {
      dataClient.functions.invoke("generate-novel-chapter", {
        body: {},
      }).then(({ data }) => {
        if (data?.chapter) {
          console.log("Novel chapter generated:", data.chapter.chapter_title);
        }
      });
    }
  }, [user]);

  // System Announcement — once per login session
  useEffect(() => {
    if (!profile || !user) return;
    const sessionKey = `system_announcement_shown_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const cacheKey = `system_announcement_${user.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { date, message } = JSON.parse(cached);
        if (date === today) {
          setAnnouncement(message);
          sessionStorage.setItem(sessionKey, "1");
          return;
        }
      } catch { /* regenerate */ }
    }

    const scenarioSummary = activeScenarios.map(s => s.title).join(", ") || "No active scenarios";
    const statsStr = `Level ${profile.level ?? 1}, Total XP: ${profile.total_xp ?? 0}, HP: ${profile.hp ?? 5}/10, Mood: ${profile.mood ?? 5}/10, Focus: ${profile.concentration ?? 5}/10, Drive: ${profile.motivation ?? 5}/10`;
    const habitStr = habits.map(h => `${h.label} (streak: ${h.current_streak ?? 0})`).join(", ") || "No habits";

    const content = `Active Scenarios: ${scenarioSummary}\nStats: ${statsStr}\nHabits: ${habitStr}`;

    dataClient.functions.invoke("generate-scenario", {
      body: { type: "announcement", content },
    }).then(({ data, error }) => {
      if (error || !data?.result?.message) return;
      const message = data.result.message;
      setAnnouncement(message);
      localStorage.setItem(cacheKey, JSON.stringify({ date: today, message }));
      sessionStorage.setItem(sessionKey, "1");
    });
  }, [profile, user, activeScenarios, habits]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await dataClient.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = dataClient.storage.from("avatars").getPublicUrl(path);
      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      await dataClient.from("profiles").update({ avatar_url }).eq("id", user.id);
      setProfile((p) => p ? { ...p, avatar_url } : p);
    }
    setUploading(false);
  };

  const updateVital = async (field: "hp" | "mood" | "concentration" | "motivation", delta: number) => {
    if (!profile || !user) return;
    const current = (profile[field] ?? 5) as number;
    const next = Math.max(0, Math.min(10, current + delta));
    setProfile({ ...profile, [field]: next });
    await dataClient.from("profiles").update({ [field]: next }).eq("id", user.id);
  };

  const toggleMust = async (mustId: string) => {
    const isCompleted = completions.some((c) => c.must_id === mustId);
    if (isCompleted) {
      // Un-complete
      const comp = completions.find((c) => c.must_id === mustId);
      if (comp) {
        await dataClient.from("must_completions").delete().eq("id", comp.id);
        setCompletions(completions.filter((c) => c.id !== comp.id));
      }
    } else {
      // Complete
      const { data } = await dataClient
        .from("must_completions")
        .insert({ must_id: mustId, completed_date: today })
        .select()
        .single();
      if (data) setCompletions([...completions, data]);
    }
  };

  // Build 30-day XP chart data (must be before early return)
  const xpChartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().split("T")[0]] = 0;
    }
    for (const log of xpLogs) {
      if (!log.created_at) continue;
      const day = log.created_at.split("T")[0];
      if (day in map) map[day] += log.amount;
    }
    return Object.entries(map).map(([date, xp]) => ({
      date: `${parseInt(date.split("-")[1])}/${parseInt(date.split("-")[2])}`,
      xp,
    }));
  }, [xpLogs]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING CONSTELLATION...</p>
      </div>
    );
  }

  const vitals = [
    { key: "hp" as const, label: "HP", color: "hsl(var(--theme-red))", value: profile.hp ?? 5 },
    { key: "mood" as const, label: "MOOD", color: "hsl(var(--theme-green))", value: profile.mood ?? 5 },
    { key: "concentration" as const, label: "FOCUS", color: "hsl(var(--theme-blue))", value: profile.concentration ?? 5 },
    { key: "motivation" as const, label: "DRIVE", color: "hsl(var(--primary))", value: profile.motivation ?? 5 },
  ];

  const stats = [
    { label: "Physical", value: profile.stat_physical ?? 0, color: "hsl(var(--theme-red))" },
    { label: "Psyche", value: profile.stat_psyche ?? 0, color: "hsl(var(--theme-blue))" },
    { label: "Intel", value: profile.stat_intel ?? 0, color: "hsl(var(--theme-green))" },
    { label: "Spiritual", value: profile.stat_spiritual ?? 0, color: "hsl(320 80% 55%)" },
    { label: "Core", value: profile.stat_core ?? 0, color: "hsl(var(--primary))" },
    { label: "Craft", value: profile.stat_craft ?? 0, color: "hsl(30 80% 55%)" },
  ];

  const totalStats = stats.reduce((s, x) => s + x.value, 0);
  const xpForLevel = (profile.level ?? 1) * 200;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {showPartyCreate && (
        <PartyCreateDialog
          onClose={() => setShowPartyCreate(false)}
          onCreated={(partyId) => {
            setShowPartyCreate(false);
            navigate(`/party/${partyId}`);
          }}
        />
      )}
      {showPrestige && (
        <PrestigeDialog
          profile={profile}
          onClose={() => setShowPrestige(false)}
          onPrestige={() => {
            setShowPrestige(false);
            window.location.reload();
          }}
        />
      )}
      {announcement && (
        <SystemAnnouncement message={announcement} onDismiss={() => setAnnouncement(null)} />
      )}
      {/* Top Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            {isSoloLeveling ? 'SOLO LEVELING' : 'SCENARIO'}
          </Link>
          {founderMode && <FounderSwitcher />}
          <DashboardNav level={profile.level ?? 1} founderMode={founderMode} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => pom.setOpenGlobal(true)}
              className="font-mono-stat text-xs text-primary px-2 py-1 rounded border border-primary/30"
            >
              {pom.isActive ? `⏱ ${String(Math.floor(pom.secondsLeft / 60)).padStart(2, '0')}:${String(pom.secondsLeft % 60).padStart(2, '0')}` : '⏱'}
            </button>
            <Link to="/settings" className="font-mono-stat text-[10px] text-muted-foreground hover:text-primary">Settings</Link>
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex items-center gap-2 px-2 py-1 rounded border text-xs font-mono-stat"
            >
              <div className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
              <span className="hidden sm:inline text-muted-foreground">{theme}</span>
            </button>
            <Button variant="ghost" size="sm" onClick={signOut} className="font-mono-stat text-[10px]">
              Exit
            </Button>
          </div>
        </div>
        {showThemePicker && (
          <div className="absolute right-4 top-14 z-50 rounded-lg border bg-card p-3 shadow-lg grid grid-cols-2 gap-2 w-64 animate-fade-in">
            {themeNames.map((name) => (
              <button
                key={name}
                onClick={async () => {
                  setTheme(name);
                  setShowThemePicker(false);
                  if (user) await dataClient.from("profiles").update({ ui_theme: name }).eq("id", user.id);
                }}
                className="flex items-center gap-2 p-2 rounded text-left hover:bg-accent text-xs font-mono-stat transition-colors"
              >
                <div className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                {name}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Identity strip + Focus card */}
      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
        {isSoloLeveling && sl.penaltyActive && (
          <PenaltyZoneOverlay onClear={() => sl.setPenaltyActive(false)} />
        )}
        {isSoloLeveling && sl.questSet && !sl.penaltyActive && (
          <DailyQuestPanel questSet={sl.questSet} onUpdate={sl.refresh} />
        )}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/60 px-4 py-2">
          <span className="font-cinzel text-sm font-bold text-primary">{profile.username}</span>
          <span className="text-muted-foreground">·</span>
          {isSoloLeveling ? (
            <>
              <RankBadge rank={String(profile.hunter_rank ?? 'E')} totalXp={profile.total_xp ?? 0} size="sm" />
              <span className="font-mono-stat text-xs">{t('level')} {profile.level ?? 1}</span>
            </>
          ) : (
            <span className="font-mono-stat text-xs">Lv {profile.level ?? 1}</span>
          )}
          <div className="flex-1 min-w-[120px] max-w-xs">
            <GlowingProgress value={(profile.total_xp ?? 0) % 500} max={500} color="hsl(var(--primary))" height="h-2" />
          </div>
          <span className="font-mono-stat text-[10px] text-muted-foreground">{profile.total_xp ?? 0} {t('xp')}</span>
          <span className="font-mono-stat text-[10px] text-primary">{profile.current_title}</span>
        </div>
        {activeDisaster ? (
          <div className="rounded-xl border-2 border-destructive/40 bg-card p-6 min-h-[140px]">
            <p className="font-mono-stat text-[9px] uppercase tracking-widest text-destructive mb-2">⚠ Active {t('disaster')}</p>
            <h2 className="font-cinzel text-lg font-bold text-foreground">{activeDisaster.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{activeDisaster.hp ?? '?'} HP remaining</p>
          </div>
        ) : activeScenarios[0] ? (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-6 min-h-[140px]">
            <p className="font-mono-stat text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Focus now</p>
            <h2 className="font-cinzel text-lg font-bold text-foreground">{activeScenarios[0].title}</h2>
            {focusQuestTitle && <p className="text-sm text-muted-foreground mt-2">Next {t('quest').toLowerCase()}: {focusQuestTitle}</p>}
            <Button className="mt-4" size="sm" onClick={() => navigate(`/scenarios/${activeScenarios[0].id}`)}>
              Open {t('scenario').toLowerCase()} →
            </Button>
          </div>
        ) : null}
        <div className="flex gap-4">
          {vitals.slice(0, 4).map((v) => (
            <div key={v.key} className="flex items-center gap-2 text-xs font-mono-stat">
              <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
              {v.label} {v.value}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Vitals Strip */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {vitals.map((v) => (
            <div key={v.key} className="rounded-lg border bg-card p-3 category-card animate-fade-in" style={{ borderLeftColor: v.color }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground">
                  ◆ {v.label}
                </span>
                <span className="font-mono-stat text-xs font-bold">{v.value}/10</span>
              </div>
              <GlowingProgress value={v.value} max={10} color={v.color} height="h-1.5" />
              <div className="flex gap-1 mt-2 justify-end">
                <button
                  onClick={() => updateVital(v.key, -1)}
                  className="font-mono-stat text-[10px] px-1.5 rounded border hover:bg-accent"
                >
                  −
                </button>
                <button
                  onClick={() => updateVital(v.key, 1)}
                  className="font-mono-stat text-[10px] px-1.5 rounded border hover:bg-accent"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          {/* Focus / Pomodoro card */}
          <div className="rounded-lg border bg-card p-3 category-card animate-fade-in" style={{ borderLeftColor: "hsl(30 80% 55%)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground">
                🍅 Focus
              </span>
              <span className="font-mono-stat text-xs font-bold">{todayPomodoros}/{(profile as any).daily_focus_goal ?? 4}</span>
            </div>
            <GlowingProgress value={todayPomodoros} max={(profile as any).daily_focus_goal ?? 4} color="hsl(30 80% 55%)" height="h-1.5" />
            <div className="mt-2">
              <span className="font-mono-stat text-[9px] text-muted-foreground">
                {todayPomodoros >= ((profile as any).daily_focus_goal ?? 4) ? "✦ Goal reached!" : `${((profile as any).daily_focus_goal ?? 4) - todayPomodoros} to go`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Column */}
          <div className="w-full md:w-[200px] shrink-0 space-y-4">
            {/* Level Badge */}
            <div className="rounded-lg border bg-card p-4 text-center animate-scale-in">
              <div className="font-cinzel text-2xl font-bold text-primary">
                LV. {profile.level ?? 1}
              </div>
              <div className="font-mono-stat text-[10px] text-muted-foreground mt-1">
                {profile.current_title ?? "Nameless Reader"}
              </div>
            </div>

            {/* Avatar Placeholder */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="rounded-lg border bg-card aspect-square flex items-center justify-center overflow-hidden w-full relative group cursor-pointer"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--surface)))" }}
              disabled={uploading}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono-stat text-[10px] text-muted-foreground">
                  {uploading ? "UPLOADING..." : "UPLOAD AVATAR"}
                </span>
              )}
              {profile.avatar_url && (
                <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="font-mono-stat text-[10px] text-foreground">
                    {uploading ? "UPLOADING..." : "CHANGE"}
                  </span>
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </button>

            {/* Stats Panel */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <SectionLabel prefix="✦">Stats</SectionLabel>
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono-stat text-[10px]">{s.label}</span>
                    <span className="font-mono-stat text-[10px] text-muted-foreground">{s.value}</span>
                  </div>
                  <GlowingProgress value={s.value} max={100} color={s.color} height="h-1" />
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-mono-stat text-[10px] text-muted-foreground">TOTAL</span>
                <span className="font-mono-stat text-xs font-bold">{totalStats}</span>
              </div>
            </div>
          </div>

          {/* Center Column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Active Disasters — above everything */}
            <DisasterCard />

            {/* Mood Check-In */}
            {!hasLoggedMood && (
              <MoodCheckIn onComplete={() => setHasLoggedMood(true)} />
            )}

            {/* Weekly Review Notification */}
            {weeklyReviewPreview && (
              <Link
                to="/review"
                className="block rounded-lg border p-4 animate-fade-in hover:border-primary/40 transition-colors"
                style={{
                  borderColor: "hsl(var(--primary) / 0.25)",
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.05))",
                }}
                onClick={() => setWeeklyReviewPreview(null)}
              >
                <div className="font-mono-stat text-[10px] uppercase tracking-widest text-primary mb-1">
                  ◆ Your Chronicle Has Been Updated
                </div>
                <p className="font-cinzel text-sm text-foreground" style={{ opacity: 0.85 }}>
                  {weeklyReviewPreview}
                </p>
                <span className="font-mono-stat text-[9px] text-muted-foreground mt-2 block">
                  Click to read full review →
                </span>
              </Link>
            )}

            {/* NPC Encounter */}
            <NpcEncounterCard />

            {/* Today's Intention */}
            <div className="rounded-lg border bg-card p-4">
              <SectionLabel prefix="◈">Today's Intention</SectionLabel>
              <input
                className="w-full bg-transparent border-none outline-none mt-2 italic text-foreground font-body text-sm placeholder:text-muted-foreground"
                placeholder="What is your intention today?"
                defaultValue={profile.today_intention ?? ""}
                onBlur={async (e) => {
                  if (user) {
                    await dataClient.from("profiles").update({ today_intention: e.target.value }).eq("id", user.id);
                  }
                }}
              />
            </div>

            {/* Active Scenarios */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel prefix="◆">Active Scenarios</SectionLabel>
                <Link to="/scenarios/new" className="font-mono-stat text-[10px] text-primary hover:underline">+ New</Link>
              </div>
              {activeScenarios.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground font-body">No active scenarios yet.</p>
                  <Button asChild className="mt-3 font-cinzel tracking-wider glow-accent" size="sm">
                    <Link to="/scenarios/new">Create Your First Scenario</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeScenarios.map((s) => (
                    <Link
                      key={s.id}
                      to={`/scenarios/${s.id}`}
                      className="flex items-center justify-between p-3 rounded border bg-secondary/30 hover:bg-secondary/50 transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-sm truncate group-hover:text-primary transition-colors">
                          {((s as any).regression_count ?? 0) > 0 && <span className="text-purple-400 mr-1">↺</span>}
                          {s.title}
                        </p>
                        <span className="font-mono-stat text-[9px] text-muted-foreground uppercase">{s.category}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {((s as any).xp_multiplier ?? 1) > 1 && (
                          <span className="font-mono-stat text-[9px] text-purple-400">{Number((s as any).xp_multiplier).toFixed(1)}x</span>
                        )}
                        <span className="font-mono-stat text-[10px] text-primary">+{s.xp_reward} XP</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Morning Musts */}
            <div className="rounded-lg border bg-card p-4">
              <SectionLabel prefix="✦">Morning Musts</SectionLabel>
              {musts.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2 font-body">No morning musts set. Add them in onboarding.</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {musts.map((m) => {
                    const isDone = completions.some((c) => c.must_id === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMust(m.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded transition-all text-left ${
                          isDone ? "bg-secondary/50" : "hover:bg-secondary/30"
                        }`}
                      >
                        <div
                          className="h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-all"
                          style={{
                            borderColor: isDone ? "hsl(var(--primary))" : "hsl(var(--border))",
                            background: isDone ? "hsl(var(--primary))" : "transparent",
                          }}
                        >
                          {isDone && <span className="text-[10px] text-primary-foreground">✓</span>}
                        </div>
                        <span className={`font-body text-sm transition-all ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {m.text}
                        </span>
                      </button>
                    );
                  })}
                  <div className="text-right mt-1">
                    <span className="font-mono-stat text-[10px] text-muted-foreground">
                      {completions.length}/{musts.length} complete
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* XP Streak Graph */}
            <div className="rounded-lg border bg-card p-4">
              <SectionLabel prefix="◆">XP · Last 30 Days</SectionLabel>
              <div className="h-40 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpChartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                      itemStyle={{ color: "hsl(var(--primary))" }}
                      formatter={(value: number) => [`${value} XP`, "Earned"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="xp"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#xpGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-[240px] shrink-0 space-y-4">
            {/* XP Card */}
            <div className="rounded-lg border bg-card p-4 text-center">
              <SectionLabel prefix="◆">Experience</SectionLabel>
              <div className="font-cinzel text-3xl font-bold text-primary mt-2">
                {profile.total_xp ?? 0}
              </div>
              <div className="font-mono-stat text-[10px] text-muted-foreground mb-2">TOTAL XP</div>
              <GlowingProgress value={(profile.total_xp ?? 0) % xpForLevel} max={xpForLevel} />
              <div className="font-mono-stat text-[10px] text-muted-foreground mt-1">
                {(profile.total_xp ?? 0) % xpForLevel} / {xpForLevel} to next level
              </div>
            </div>

            {/* Daily XP */}
            <div className="rounded-lg border bg-card p-4 text-center">
              <SectionLabel prefix="✦">Daily XP</SectionLabel>
              <div className="font-mono-stat text-lg font-bold mt-2">
                {profile.daily_xp_today ?? 0} / {profile.daily_xp_target ?? 10}
              </div>
              <GlowingProgress value={profile.daily_xp_today ?? 0} max={profile.daily_xp_target ?? 10} height="h-1.5" />
            </div>

            {/* Habits */}
            <div className="rounded-lg border bg-card p-4">
              <SectionLabel prefix="◈">Habits</SectionLabel>
              {habits.length === 0 ? (
                <p className="font-body text-xs text-muted-foreground mt-2">No habits tracked yet.</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {habits.map((h) => (
                    <div key={h.id} className="flex items-center justify-between">
                      <span className="font-body text-xs truncate">{h.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm">🔥</span>
                        <span className="font-mono-stat text-[10px] text-primary">{h.current_streak ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Level Milestones */}
            <div className="rounded-lg border bg-card p-4">
              <SectionLabel prefix="◈">Milestones</SectionLabel>
              <div className="space-y-2 mt-3">
                {[5, 10, 15, 20, 25, 30].map((lv) => (
                  <div key={lv} className="flex items-center gap-2">
                    <span className={`text-sm ${(profile.level ?? 1) >= lv ? "text-primary" : "text-muted-foreground"}`}>
                      {(profile.level ?? 1) >= lv ? "★" : "☆"}
                    </span>
                    <span className="font-mono-stat text-[10px]">LV {lv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadow Self Widget */}
            <ShadowSelfWidget />
            {isSoloLeveling && <ShadowArmyWidget />}

            {/* Dream Board Widget */}
            {isFeatureUnlocked('/dream-board', profile.level ?? 1) && <DreamBoardWidget />}

            {/* Active Duels */}
            <DuelWidget />

            {/* Party Widget */}
            <PartyWidget />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPartyCreate(true)}
              className="w-full font-mono-stat text-[9px]"
            >
              ◆ Create Party
            </Button>

            {/* Regression Callout for 0 regressions */}
            {(profile.regression_count ?? 0) === 0 && <RegressionCallout />}

            {/* Prestige Button */}
            {(profile.level ?? 1) >= 10 && (
              <button
                onClick={() => setShowPrestige(true)}
                className="w-full rounded-lg border p-3 text-center font-mono-stat text-[10px] uppercase tracking-wider transition-all hover:border-purple-500/50 text-purple-400"
                style={{ borderColor: 'hsl(270 70% 55% / 0.2)', background: 'hsl(270 70% 55% / 0.05)' }}
              >
                ↺ Prestige Available
              </button>
            )}

            {/* Life Path Widget */}
            {isFeatureUnlocked('/life-path', profile.level ?? 1) && <LifePathWidget />}

            {isFeatureUnlocked('/constellation-dashboard', profile.level ?? 1) && (
              <>
                <PendingConstellationScenarios />
                <PendingNebulaInvites />
                <ConstellationWidget />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Character Visit Overlay */}
      <CharacterVisitTrigger />

      {/* Demon Encounter Overlay */}
      <DemonEncounterTrigger />

      <WhatDoINowButton />

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

export default Dashboard;
