import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { StatSkillCard } from "@/components/StatSkillCard";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Habit = Tables<"habits">;
type HabitLog = Tables<"habit_logs">;
type Title = Tables<"titles">;
type XpLog = { created_at: string | null; amount: number; source_type: string | null; reason: string | null };

const STAT_CONFIG = [
  { key: "stat_physical", label: "Physical", color: "hsl(var(--theme-red))", icon: "💪" },
  { key: "stat_psyche", label: "Psyche", color: "hsl(var(--theme-blue))", icon: "🧠" },
  { key: "stat_intel", label: "Intel", color: "hsl(var(--theme-green))", icon: "📚" },
  { key: "stat_spiritual", label: "Spiritual", color: "hsl(270 80% 55%)", icon: "✦" },
  { key: "stat_core", label: "Core", color: "hsl(var(--primary))", icon: "⚡" },
  { key: "stat_craft", label: "Craft", color: "hsl(30 80% 55%)", icon: "🔧" },
] as const;

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string; bg: string }> = {
  common: { border: "hsl(var(--border))", glow: "none", label: "Common", bg: "hsl(var(--card))" },
  rare: { border: "hsl(var(--theme-blue))", glow: "0 0 8px hsl(var(--theme-blue) / 0.4)", label: "Rare", bg: "hsl(var(--theme-blue) / 0.05)" },
  epic: { border: "hsl(270 80% 60%)", glow: "0 0 12px hsl(270 80% 60% / 0.4)", label: "Epic", bg: "hsl(270 80% 60% / 0.05)" },
  legendary: { border: "hsl(var(--primary))", glow: "0 0 16px hsl(var(--glow) / 0.5)", label: "Legendary", bg: "hsl(var(--primary) / 0.05)" },
};

const LOCKED_TITLES = [
  { name: "Shadow Walker", rarity: "rare", hint: "Complete 5 scenarios" },
  { name: "Dawn Breaker", rarity: "epic", hint: "Reach level 15" },
  { name: "Constellation", rarity: "legendary", hint: "Max all stats to 50+" },
  { name: "Iron Will", rarity: "common", hint: "30-day streak" },
  { name: "Void Keeper", rarity: "epic", hint: "Complete 20 scenarios" },
  { name: "The Reader", rarity: "legendary", hint: "Reach level 30" },
  { name: "First Step", rarity: "common", hint: "Complete your first quest" },
  { name: "Streak Keeper", rarity: "rare", hint: "7-day habit streak" },
];

const HABIT_CATEGORIES = ["Fitness", "Academic", "Skill", "Wellness", "Social", "Creative"];

const Training = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [xpLogs, setXpLogs] = useState<XpLog[]>([]);
  const [npcEncounters, setNpcEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState("all");

  // Add habit modal state
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("");
  const [addingHabit, setAddingHabit] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Promise.all([
      dataClient.from("profiles").select("*").eq("id", user.id).single(),
      dataClient.from("habits").select("*").eq("user_id", user.id).order("created_at"),
      dataClient.from("habit_logs").select("*").eq("user_id", user.id).gte("logged_date", thirtyDaysAgo.toISOString().split("T")[0]),
      dataClient.from("titles").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
      dataClient.from("xp_log").select("created_at, amount, source_type, reason").eq("user_id", user.id).gte("created_at", sevenDaysAgo.toISOString()),
      dataClient.from("npc_encounters").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]).then(([profileRes, habitsRes, logsRes, titlesRes, xpRes, npcRes]) => {
      setProfile(profileRes.data);
      setHabits(habitsRes.data ?? []);
      setHabitLogs(logsRes.data ?? []);
      setTitles(titlesRes.data ?? []);
      setXpLogs((xpRes.data ?? []) as XpLog[]);
      setNpcEncounters((npcRes.data as any[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  // Stat sparkline data (7 days)
  const statSparklines = useMemo(() => {
    const result: Record<string, { day: string; xp: number }[]> = {};
    STAT_CONFIG.forEach((s) => {
      const days: { day: string; xp: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayXp = xpLogs
          .filter((l) => l.created_at?.startsWith(dateStr) && l.reason?.toLowerCase().includes(s.label.toLowerCase()))
          .reduce((sum, l) => sum + l.amount, 0);
        days.push({ day: dateStr.slice(5), xp: dayXp });
      }
      result[s.key] = days;
    });
    return result;
  }, [xpLogs]);

  // Habit heatmap data (last 30 days)
  const habitHeatmap = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    habitLogs.forEach((log) => {
      if (!log.habit_id) return;
      if (!result[log.habit_id]) result[log.habit_id] = new Set();
      result[log.habit_id].add(log.logged_date);
    });
    return result;
  }, [habitLogs]);

  const logHabitToday = async (habit: Habit) => {
    if (!user) return;
    const alreadyLogged = habitLogs.some(
      (l) => l.habit_id === habit.id && l.logged_date === today
    );
    if (alreadyLogged) {
      toast.info("Already logged today!");
      return;
    }

    const newStreak = (habit.current_streak ?? 0) + 1;
    const longestStreak = Math.max(newStreak, habit.longest_streak ?? 0);

    const [logRes, updateRes] = await Promise.all([
      dataClient.from("habit_logs").insert({ habit_id: habit.id, user_id: user.id, logged_date: today }),
      dataClient.from("habits").update({ current_streak: newStreak, longest_streak: longestStreak, last_logged: today }).eq("id", habit.id),
    ]);

    if (!logRes.error && !updateRes.error) {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, current_streak: newStreak, longest_streak: longestStreak, last_logged: today } : h
        )
      );
      setHabitLogs((prev) => [...prev, { id: crypto.randomUUID(), habit_id: habit.id, user_id: user.id, logged_date: today, created_at: new Date().toISOString() }]);
      toast.success(`Logged! 🔥 ${newStreak}-day streak`);
    }
  };

  const addHabit = async () => {
    if (!user || !newHabitName.trim()) return;
    setAddingHabit(true);
    const { data, error } = await dataClient
      .from("habits")
      .insert({ user_id: user.id, label: newHabitName.trim(), category: newHabitCategory || null })
      .select()
      .single();
    if (data && !error) {
      setHabits((prev) => [...prev, data]);
      setNewHabitName("");
      setNewHabitCategory("");
      setHabitModalOpen(false);
      toast.success("Habit created!");
    } else {
      toast.error("Failed to create habit");
    }
    setAddingHabit(false);
  };

  // Generate last 30 days array
  const last30Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING TRAINING GROUND...</p>
      </div>
    );
  }

  const filteredEarnedTitles = rarityFilter === "all" ? titles : titles.filter((t) => t.rarity === rarityFilter);
  const filteredLockedTitles =
    rarityFilter === "all"
      ? LOCKED_TITLES.filter((lt) => !titles.some((t) => t.title_name === lt.name))
      : LOCKED_TITLES.filter((lt) => lt.rarity === rarityFilter && !titles.some((t) => t.title_name === lt.name));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">Training Ground</h1>
          <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest uppercase">
            ◆ Sharpen your attributes. Build your legacy.
          </p>
        </div>

        {/* ═══ STAT DEEP DIVE ═══ */}
        <section className="space-y-4">
          <SectionLabel prefix="◈">Stat Deep Dive</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAT_CONFIG.map((stat) => {
              const value = (profile as any)[stat.key] ?? 0;
              // Map key like 'stat_physical' -> 'Physical'
              const statName = stat.label;
              return (
                <StatSkillCard key={stat.key} statName={statName} statXp={value} />
              );
            })}
          </div>
        </section>

        {/* ═══ ACTIVE HABITS ═══ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel prefix="✦">Active Habits</SectionLabel>
            <Dialog open={habitModalOpen} onOpenChange={setHabitModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono-stat text-[10px]">
                  + Add Habit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-cinzel">Create New Habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Habit name (e.g. Morning Run)"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                  />
                  <Select value={newHabitCategory} onValueChange={setNewHabitCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addHabit} disabled={!newHabitName.trim() || addingHabit} className="w-full font-cinzel tracking-wider">
                    {addingHabit ? "Creating..." : "Create Habit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-12 rounded-lg border bg-card/50">
              <p className="font-body text-sm text-muted-foreground">No habits yet. Start building consistency.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map((habit) => {
                const loggedDates = habitHeatmap[habit.id] ?? new Set();
                const loggedToday = loggedDates.has(today);

                return (
                  <div key={habit.id} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-body text-sm font-semibold">{habit.label}</h4>
                        {habit.category && (
                          <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {habit.category}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-mono-stat text-lg font-bold text-primary">
                          🔥 {habit.current_streak ?? 0}
                        </div>
                        <span className="font-mono-stat text-[9px] text-muted-foreground">
                          best: {habit.longest_streak ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Mini heatmap */}
                    <div className="flex flex-wrap gap-[3px]">
                      {last30Days.map((day) => {
                        const active = loggedDates.has(day);
                        return (
                          <div
                            key={day}
                            className="w-3 h-3 rounded-sm transition-colors"
                            style={{
                              backgroundColor: active
                                ? "hsl(var(--primary))"
                                : "hsl(var(--secondary))",
                              opacity: active ? 1 : 0.4,
                            }}
                            title={`${day}${active ? " ✓" : ""}`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono-stat text-[9px] text-muted-foreground">
                        Last: {habit.last_logged ?? "never"}
                      </span>
                      <Button
                        size="sm"
                        variant={loggedToday ? "secondary" : "default"}
                        disabled={loggedToday}
                        onClick={() => logHabitToday(habit)}
                        className="font-mono-stat text-[10px] h-7 px-3"
                      >
                        {loggedToday ? "✓ Done" : "Log Today"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ TITLES SHOWCASE ═══ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionLabel prefix="◆">Titles Showcase</SectionLabel>
            <div className="flex gap-1.5">
              {["all", "common", "rare", "epic", "legendary"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`font-mono-stat text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                    rarityFilter === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Earned */}
            {filteredEarnedTitles.map((t) => {
              const style = RARITY_STYLES[t.rarity ?? "common"] ?? RARITY_STYLES.common;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border bg-card p-4 text-center transition-all hover:scale-[1.02]"
                  style={{ borderColor: style.border, boxShadow: style.glow, background: style.bg }}
                >
                  <div className="font-cinzel text-sm font-semibold mb-1">{t.title_name}</div>
                  <div className="font-mono-stat text-[9px] uppercase tracking-wider mb-1" style={{ color: style.border }}>
                    {style.label}
                  </div>
                  {t.description && (
                    <p className="font-body text-[10px] text-muted-foreground">{t.description}</p>
                  )}
                </div>
              );
            })}
            {/* Locked */}
            {filteredLockedTitles.map((t) => {
              const style = RARITY_STYLES[t.rarity] ?? RARITY_STYLES.common;
              return (
                <div
                  key={t.name}
                  className="rounded-lg border bg-card/30 p-4 text-center opacity-40 hover:opacity-60 transition-opacity"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="font-cinzel text-sm font-semibold mb-1">???</div>
                  <div className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    {style.label}
                  </div>
                  <p className="font-body text-[10px] text-muted-foreground italic">{t.hint}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Encounters Log */}
      {npcEncounters.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <section>
            <SectionLabel prefix="✦">Encounters Log</SectionLabel>
            <div className="flex items-center gap-4 mt-2 mb-4">
              <span className="font-mono-stat text-[10px] text-muted-foreground">
                Met: {npcEncounters.length}
              </span>
              <span className="font-mono-stat text-[10px] text-primary">
                Completed: {npcEncounters.filter((e: any) => e.status === "completed").length}
              </span>
              <span className="font-mono-stat text-[10px] text-muted-foreground">
                Missed: {npcEncounters.filter((e: any) => e.status === "expired").length}
              </span>
            </div>
            <div className="space-y-2">
              {npcEncounters.map((enc: any) => {
                const isCompleted = enc.status === "completed";
                const isExpired = enc.status === "expired";
                return (
                  <div
                    key={enc.id}
                    className={`rounded-lg border bg-card p-3 flex items-center gap-3 transition-opacity ${isExpired ? "opacity-40" : ""}`}
                    style={isExpired ? { filter: "grayscale(0.5)" } : {}}
                  >
                    <span className="text-xl shrink-0">
                      {enc.npc_type === "The Wandering Scholar" ? "📚" :
                       enc.npc_type === "The Rival" ? "⚔️" :
                       enc.npc_type === "The Mysterious Benefactor" ? "🎭" :
                       enc.npc_type === "The Struggling NPC" ? "🤝" :
                       enc.npc_type === "The Ancient Master" ? "🏯" :
                       enc.npc_type === "The Marketplace Merchant" ? "🏪" :
                       enc.npc_type === "The Fellow Protagonist" ? "🤜" :
                       enc.npc_type === "The Dokkaebi" ? "👺" : "🎭"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel text-xs font-bold truncate">{enc.npc_name}</span>
                        {isCompleted && <span className="font-mono-stat text-[8px] text-primary">✓ QUEST DONE</span>}
                        {isExpired && <span className="font-mono-stat text-[8px] text-muted-foreground">MISSED</span>}
                      </div>
                      <span className="font-body text-[10px] text-muted-foreground">{enc.quest_title}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono-stat text-[9px] text-muted-foreground">
                        {new Date(enc.created_at).toLocaleDateString()}
                      </span>
                      {isCompleted && (
                        <div className="font-mono-stat text-[9px] text-primary">+{enc.xp_reward} XP</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm z-50">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", path: "/dashboard", icon: "🏠" },
            { label: "Quests", path: "/scenarios", icon: "⚔️" },
            { label: "Training", path: "/training", icon: "🏋️" },
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

export default Training;
