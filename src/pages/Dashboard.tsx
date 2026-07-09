import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { dataClient } from "@/lib/data-client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { Starfield } from "@/components/layout/Starfield";
import { IconSidebar } from "@/components/layout/IconSidebar";
import { ScenarioFocusCard } from "@/components/dashboard/ScenarioFocusCard";
import { DisasterFocusCard } from "@/components/dashboard/DisasterFocusCard";
import { DashboardRightPanel } from "@/components/dashboard/DashboardRightPanel";
import { TagChip } from "@/components/dashboard/TagChip";
import { useSystemChat } from "@/contexts/SystemChatContext";
import { SystemAnnouncement } from "@/components/ui/SystemAnnouncement";
import { CharacterVisitTrigger } from "@/components/CharacterVisitTrigger";
import { DemonEncounterTrigger } from "@/components/DemonEncounterTrigger";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { NpcEncounterCard } from "@/components/NpcEncounterCard";
import { PrestigeDialog } from "@/components/PrestigeDialog";
import { Button } from "@/components/ui/button";
import { ThemeName, themeNames } from "@/lib/themes";
import { Link } from "react-router-dom";
import { useUniverse } from "@/hooks/useUniverse";
import { FounderSwitcher } from "@/components/FounderSwitcher";
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
  const { t, isSoloLeveling, founderMode } = useUniverse();
  const sl = useSoloLeveling();
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
  const [showPrestige, setShowPrestige] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState<{ id: string; title: string; hp?: number } | null>(null);
  const [focusQuestTitle, setFocusQuestTitle] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<"scenario" | "disaster">("scenario");
  const [lifePathPreview, setLifePathPreview] = useState<{
    pathTitle: string;
    arcTitle: string;
    progress: number;
    alignment: number;
  } | null>(null);
  const { setOpen: setChatOpen } = useSystemChat();
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

  useEffect(() => {
    if (!user) return;
    dataClient
      .from("life_paths")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .then(async ({ data: paths }) => {
        if (!paths?.[0]) return;
        const path = paths[0];
        const { data: arcs } = await dataClient
          .from("life_path_arcs")
          .select("title, status, progress_pct")
          .eq("life_path_id", path.id)
          .order("order_index");
        const activeArc = arcs?.find((a) => a.status === "active") ?? arcs?.[0];
        setLifePathPreview({
          pathTitle: path.title,
          arcTitle: activeArc?.title ?? "",
          progress: activeArc?.progress_pct ?? 0,
          alignment: 78,
        });
      });
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
    { label: t("stat_physical"), value: profile.stat_physical ?? 0, color: "hsl(var(--theme-red))" },
    { label: t("stat_psyche"), value: profile.stat_psyche ?? 0, color: "hsl(var(--theme-blue))" },
    { label: t("stat_intel"), value: profile.stat_intel ?? 0, color: "hsl(var(--theme-green))" },
    { label: t("stat_spiritual"), value: profile.stat_spiritual ?? 0, color: "hsl(320 80% 55%)" },
    { label: t("stat_core"), value: profile.stat_core ?? 0, color: "hsl(var(--primary))" },
    { label: t("stat_craft"), value: profile.stat_craft ?? 0, color: "hsl(30 80% 55%)" },
  ];

  const statShort = stats.map((s) => s.label.slice(0, 3).toUpperCase());
  const xpForLevel = (profile.level ?? 1) * 200;
  const xpInLevel = (profile.total_xp ?? 0) % xpForLevel;
  const focusScenario = activeScenarios[0] ?? null;
  const otherScenarios = activeScenarios.slice(1);

  return (
    <div className="prototype-shell relative flex h-screen overflow-hidden bg-[hsl(var(--background)/0.96)] pb-16 md:pb-0">
      <Starfield />

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

      <IconSidebar level={profile.level ?? 1} username={profile.username ?? undefined} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-[hsl(var(--surface)/0.82)] px-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="font-cinzel text-[15px] font-bold text-foreground">
              {profile.display_name || profile.username}
            </span>
            {isSoloLeveling ? (
              <RankBadge rank={String(profile.hunter_rank ?? "E")} totalXp={profile.total_xp ?? 0} size="sm" />
            ) : (
              <TagChip>LV {profile.level ?? 1}</TagChip>
            )}
            <TagChip color="hsl(var(--muted-foreground))">{profile.current_title ?? "—"}</TagChip>
            {(profile.prestige_level ?? 0) > 0 && (
              <TagChip color="hsl(var(--muted-foreground))">P{profile.prestige_level}</TagChip>
            )}
          </div>

          <div className="hidden max-w-[300px] flex-1 sm:block">
            <GlowingProgress value={xpInLevel} max={xpForLevel} height="h-[5px]" />
          </div>
          <span className="hidden font-mono-stat text-[10px] whitespace-nowrap text-muted-foreground sm:inline">
            {(profile.total_xp ?? 0).toLocaleString()} / {((profile.level ?? 1) * xpForLevel).toLocaleString()} {t("xp")}
          </span>

          <div className="flex-1" />

          {founderMode && <FounderSwitcher />}

          <div className="flex overflow-hidden rounded-lg border border-border bg-[hsl(var(--dim))]">
            <button
              type="button"
              onClick={() => setFocusMode("scenario")}
              className={`px-3 py-1.5 font-cinzel text-[10px] font-bold tracking-wider transition-all md:px-4 ${
                focusMode === "scenario"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {t("scenario").toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => setFocusMode("disaster")}
              className={`relative px-3 py-1.5 font-cinzel text-[10px] font-bold tracking-wider transition-all md:px-4 ${
                focusMode === "disaster"
                  ? "bg-destructive text-white"
                  : "text-muted-foreground"
              }`}
            >
              {t("disaster").toUpperCase()}
              {activeDisaster && (
                <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => pom.setOpenGlobal(true)}
            className="hidden font-mono-stat text-xs text-primary rounded-lg border border-primary/30 px-2 py-1 md:inline"
          >
            {pom.isActive
              ? `⏱ ${String(Math.floor(pom.secondsLeft / 60)).padStart(2, "0")}:${String(pom.secondsLeft % 60).padStart(2, "0")}`
              : "⏱"}
          </button>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-body text-xs font-semibold text-primary"
          >
            <span>✦</span>
            <span className="hidden sm:inline">Ask System</span>
          </button>

          <button
            type="button"
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="hidden items-center gap-2 rounded border px-2 py-1 font-mono-stat text-xs md:flex"
          >
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{theme}</span>
          </button>

          <Link to="/settings" className="hidden font-mono-stat text-[10px] text-muted-foreground hover:text-primary md:inline">
            Settings
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="hidden font-mono-stat text-[10px] md:inline-flex">
            Exit
          </Button>
        </header>

        {showThemePicker && (
          <div className="absolute right-4 top-14 z-50 grid w-64 grid-cols-2 gap-2 rounded-lg border bg-card p-3 shadow-lg animate-fade-in">
            {themeNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={async () => {
                  setTheme(name);
                  setShowThemePicker(false);
                  if (user) await dataClient.from("profiles").update({ ui_theme: name }).eq("id", user.id);
                }}
                className="flex items-center gap-2 rounded p-2 text-left font-mono-stat text-xs transition-colors hover:bg-accent"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                {name}
              </button>
            ))}
          </div>
        )}

        {/* SL overlays */}
        {isSoloLeveling && sl.penaltyActive && (
          <PenaltyZoneOverlay onClear={() => sl.setPenaltyActive(false)} />
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left column — protagonist (prototype_v4) */}
          <div className="hidden w-[190px] shrink-0 overflow-auto border-r border-border bg-[hsl(var(--surface)/0.82)] p-3.5 xl:block">
            <SectionLabel>Protagonist</SectionLabel>
            <div className="mt-2 font-cinzel text-[15px] font-bold text-primary">
              {profile.display_name || profile.username}
            </div>
            <div className="mb-3 font-mono-stat text-[10px] text-muted-foreground">
              {profile.current_title ?? "—"} · {t("level")} {profile.level ?? 1}
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative mb-3.5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[hsl(var(--dim))] to-background"
              disabled={uploading}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center opacity-50">
                  <div className="mb-1 text-3xl">{isSoloLeveling ? "⚔" : "✦"}</div>
                  <div className="font-mono-stat text-[9px] text-muted-foreground">
                    {uploading ? "UPLOADING..." : "UPLOAD AVATAR"}
                  </div>
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </button>

            <SectionLabel>Stats</SectionLabel>
            <div className="mt-2 space-y-2">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="mb-0.5 flex justify-between">
                    <span className="font-body text-[10px] text-foreground">{s.label}</span>
                    <span className="font-mono-stat text-[9px] text-primary">{s.value}</span>
                  </div>
                  <GlowingProgress value={s.value} max={500} color={s.color} height="h-1" />
                </div>
              ))}
            </div>

            {isSoloLeveling && <div className="mt-3.5"><ShadowArmyWidget /></div>}

            {(profile.level ?? 1) >= 10 && (
              <button
                type="button"
                onClick={() => setShowPrestige(true)}
                className="mt-3.5 w-full rounded-lg border border-primary/30 bg-primary/10 py-2 font-cinzel text-[10px] font-bold tracking-wider text-primary"
              >
                {t("prestige").toUpperCase()} ↑
              </button>
            )}
          </div>

          {/* Center */}
          <div className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
            {isSoloLeveling && sl.questSet && !sl.penaltyActive && (
              <div className="mb-4">
                <DailyQuestPanel questSet={sl.questSet} onUpdate={sl.refresh} />
              </div>
            )}

            {!hasLoggedMood && (
              <div className="mb-4">
                <MoodCheckIn onComplete={() => setHasLoggedMood(true)} />
              </div>
            )}

            {weeklyReviewPreview && (
              <Link
                to="/review"
                className="mb-4 block rounded-xl border p-4 transition-colors hover:border-primary/40"
                style={{
                  borderColor: "hsl(var(--primary) / 0.25)",
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.05))",
                }}
                onClick={() => setWeeklyReviewPreview(null)}
              >
                <div className="mb-1 font-mono-stat text-[10px] uppercase tracking-widest text-primary">
                  ◆ Your Chronicle Has Been Updated
                </div>
                <p className="font-cinzel text-sm text-foreground opacity-85">{weeklyReviewPreview}</p>
              </Link>
            )}

            <NpcEncounterCard />

            {/* Vitals strip */}
            <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {vitals.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between rounded-xl border border-border bg-[hsl(var(--card)/0.75)] px-4 py-3"
                >
                  <span className="font-body text-xs text-muted-foreground">◆ {v.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-stat text-base font-bold" style={{ color: v.color }}>
                      {v.value}
                    </span>
                    <button type="button" onClick={() => updateVital(v.key, -1)} className="font-mono-stat text-[10px] text-muted-foreground">−</button>
                    <button type="button" onClick={() => updateVital(v.key, 1)} className="font-mono-stat text-[10px] text-primary">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's intention */}
            <div className="mb-5 rounded-xl border border-border bg-[hsl(var(--card)/0.5)] px-5 py-3.5">
              <SectionLabel>{isSoloLeveling ? "Hunter Status" : "Today's Intention"}</SectionLabel>
              <input
                className="mt-2 w-full border-none bg-transparent font-body text-xs italic text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={isSoloLeveling ? "Today I enter the gates prepared." : "Today I am locked in."}
                defaultValue={profile.today_intention ?? ""}
                onBlur={async (e) => {
                  if (user) {
                    await dataClient.from("profiles").update({ today_intention: e.target.value }).eq("id", user.id);
                  }
                }}
              />
            </div>

            {/* Main focus card */}
            <div className="mb-4 max-w-[680px]">
              {focusMode === "disaster" ? (
                <DisasterFocusCard />
              ) : focusScenario ? (
                <ScenarioFocusCard scenario={focusScenario} />
              ) : (
                <div className="prototype-focus-card flex min-h-[280px] flex-col items-center justify-center rounded-[20px] border-[1.5px] border-dashed border-border bg-[hsl(var(--card)/0.5)] p-8 text-center">
                  <p className="mb-3 font-body text-sm text-muted-foreground">No active {t("scenario").toLowerCase()}.</p>
                  <Button asChild size="sm" className="font-cinzel tracking-wider glow-accent">
                    <Link to="/scenarios/new">Create Your First {t("scenario")}</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Other active scenarios */}
            {otherScenarios.length > 0 && (
              <div className="mb-4 max-w-[680px]">
                <div className="mb-2.5 font-mono-stat text-[9px] tracking-wider text-muted-foreground">
                  OTHER ACTIVE {t("scenario").toUpperCase()}S
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {otherScenarios.map((s) => {
                    const catColor =
                      s.category === "Academic"
                        ? "hsl(var(--theme-blue))"
                        : s.category === "Career"
                          ? "hsl(var(--primary))"
                          : "hsl(var(--theme-green))";
                    return (
                      <Link
                        key={s.id}
                        to={`/scenarios/${s.id}`}
                        className="rounded-r-xl border border-border bg-[hsl(var(--card)/0.75)] p-3.5 transition-colors hover:border-primary/30"
                        style={{ borderLeft: `3px solid ${catColor}` }}
                      >
                        <div className="mb-1.5 flex justify-between">
                          <TagChip color={catColor}>{s.category}</TagChip>
                          <span className="font-mono-stat text-[9px] text-muted-foreground">+{s.xp_reward} {t("xp")}</span>
                        </div>
                        <div className="font-cinzel text-[13px] font-semibold text-foreground">{s.title}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Life path preview */}
            {lifePathPreview && isFeatureUnlocked("/life-path", profile.level ?? 1) && (
              <Link
                to="/life-path"
                className="mb-4 block max-w-[680px] rounded-xl border border-border bg-[hsl(var(--card)/0.75)] p-4 transition-colors hover:border-primary/30"
              >
                <SectionLabel>{t("life_path")}</SectionLabel>
                <div className="mt-1 font-cinzel text-[13px] font-bold text-primary">{lifePathPreview.pathTitle}</div>
                <div className="mb-2.5 font-body text-[10px] italic text-muted-foreground">{lifePathPreview.arcTitle}</div>
                <GlowingProgress value={lifePathPreview.progress} max={100} height="h-1.5" />
                <div className="mt-1 flex justify-between">
                  <span className="font-mono-stat text-[9px] text-muted-foreground">{lifePathPreview.progress}% complete</span>
                  <span className="font-mono-stat text-[9px] text-primary">Path Alignment: {lifePathPreview.alignment}%</span>
                </div>
              </Link>
            )}

            <DemonEncounterTrigger />
          </div>

          <DashboardRightPanel
            musts={musts}
            completions={completions}
            onToggleMust={toggleMust}
            stats={stats}
            statLabels={statShort}
            vitals={vitals.map((v) => ({ label: v.label, value: v.value, color: v.color }))}
            pathTitle={lifePathPreview?.pathTitle}
            arcTitle={lifePathPreview?.arcTitle}
            pathProgress={lifePathPreview?.progress}
            pathAlignment={lifePathPreview?.alignment}
          />
        </div>
      </div>

      <CharacterVisitTrigger />
      <WhatDoINowButton />

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[hsl(var(--surface)/0.95)] backdrop-blur-sm md:hidden">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", path: "/dashboard", icon: "⬡" },
            { label: t("scenario"), path: "/scenarios", icon: "◇" },
            { label: "Stats", path: "/stats", icon: "◈" },
            { label: "Lobby", path: "/lobby", icon: "⊕" },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-mono-stat text-[9px] uppercase">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
