import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { dataClient } from "@/lib/data-client";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type EmotionLog = {
  id: string;
  logged_at: string;
  mood_score: number;
  energy_score: number;
  one_line: string | null;
  ai_tags: string[];
  created_at: string;
};

type MoodInsight = {
  id: string;
  insight_text: string;
  pattern_type: string;
  generated_at: string;
  dismissed: boolean;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getMoodColor(score: number | null): string {
  if (score === null) return "hsl(var(--muted) / 0.3)";
  if (score <= 2) return "hsl(var(--destructive) / 0.6)";
  if (score <= 4) return "hsl(var(--destructive) / 0.3)";
  if (score <= 6) return "hsl(var(--primary) / 0.3)";
  if (score <= 8) return "hsl(var(--primary) / 0.6)";
  return "hsl(var(--primary) / 0.9)";
}

export default function MoodMap() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EmotionLog[]>([]);
  const [insights, setInsights] = useState<MoodInsight[]>([]);
  const [selectedDay, setSelectedDay] = useState<EmotionLog | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    if (!user) return;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    Promise.all([
      dataClient
        .from("emotion_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", sixMonthsAgo.toISOString().split("T")[0])
        .order("logged_at", { ascending: true }),
      dataClient
        .from("mood_insights")
        .select("*")
        .eq("user_id", user.id)
        .eq("dismissed", false)
        .order("generated_at", { ascending: false })
        .limit(5),
    ]).then(([logsRes, insightsRes]) => {
      setLogs((logsRes.data as any[]) ?? []);
      setInsights((insightsRes.data as any[]) ?? []);
    });
  }, [user]);

  // Build heatmap data (last 180 days)
  const heatmapData = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (let i = 179; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().split("T")[0]] = null;
    }
    for (const log of logs) {
      const day = log.logged_at;
      if (day in map) map[day] = log.mood_score;
    }
    return Object.entries(map).map(([date, mood]) => ({ date, mood }));
  }, [logs]);

  // Monthly averages for line chart
  const monthlyData = useMemo(() => {
    const buckets: Record<string, { total: number; count: number; energy: number }> = {};
    for (const log of logs) {
      const month = log.logged_at.substring(0, 7);
      if (!buckets[month]) buckets[month] = { total: 0, count: 0, energy: 0 };
      buckets[month].total += log.mood_score;
      buckets[month].energy += log.energy_score;
      buckets[month].count++;
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: MONTHS[parseInt(month.split("-")[1]) - 1],
        mood: Math.round((data.total / data.count) * 10) / 10,
        energy: Math.round((data.energy / data.count) * 10) / 10,
      }));
  }, [logs]);

  // Tag cloud
  const tagCloud = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const tags = Array.isArray(log.ai_tags) ? log.ai_tags : [];
      for (const tag of tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [logs]);

  const maxTagCount = tagCloud.length > 0 ? tagCloud[0][1] : 1;

  const dismissInsight = async (id: string) => {
    await dataClient.from("mood_insights").update({ dismissed: true } as any).eq("id", id);
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  const generateInsights = async () => {
    if (!user) return;
    setGeneratingInsights(true);
    try {
      await dataClient.functions.invoke("mood-insights", {
        body: {},
      });
      // Refetch insights
      const { data } = await dataClient
        .from("mood_insights")
        .select("*")
        .eq("user_id", user.id)
        .eq("dismissed", false)
        .order("generated_at", { ascending: false })
        .limit(5);
      setInsights((data as any[]) ?? []);
    } catch (e) {
      console.error("Failed to generate insights:", e);
    }
    setGeneratingInsights(false);
  };

  // Heatmap grid: 26 weeks × 7 days
  const weeks: { date: string; mood: number | null }[][] = [];
  let currentWeek: { date: string; mood: number | null }[] = [];
  for (let i = 0; i < heatmapData.length; i++) {
    const d = new Date(heatmapData[i].date + "T00:00:00");
    if (i === 0) {
      // pad start of first week
      for (let j = 0; j < d.getDay(); j++) {
        currentWeek.push({ date: "", mood: null });
      }
    }
    currentWeek.push(heatmapData[i]);
    if (d.getDay() === 6 || i === heatmapData.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const logsByDate = useMemo(() => {
    const map: Record<string, EmotionLog> = {};
    for (const log of logs) map[log.logged_at] = log;
    return map;
  }, [logs]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
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

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h1 className="font-cinzel text-2xl font-bold text-foreground tracking-wider">Mood Map</h1>
          <p className="font-body text-sm text-muted-foreground mt-1" style={{ opacity: 0.8 }}>
            Your emotional landscape over time
          </p>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <SectionLabel prefix="◈">Pattern Insights</SectionLabel>
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-lg border bg-card p-4 animate-fade-in"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: "hsl(var(--theme-green))",
                  animation: "pulse 4s ease-in-out infinite",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono-stat text-[9px] uppercase tracking-widest text-muted-foreground">
                      {insight.pattern_type}
                    </span>
                    <p className="font-body text-sm text-foreground mt-1" style={{ opacity: 0.9 }}>
                      {insight.insight_text}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="font-mono-stat text-[9px] text-muted-foreground hover:text-foreground shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={generatingInsights || logs.length < 7}
            className="font-mono-stat text-[10px]"
          >
            {generatingInsights ? "Analyzing..." : "Generate Insights"}
          </Button>
        </div>

        {/* Heatmap */}
        <div className="rounded-lg border bg-card p-4">
          <SectionLabel prefix="◆">Mood Heatmap · Last 6 Months</SectionLabel>
          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-[3px] min-w-[600px]">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-1">
                {DAYS.map((d, i) => (
                  <div key={d} className="h-[14px] flex items-center">
                    {i % 2 === 1 && (
                      <span className="font-mono-stat text-[8px] text-muted-foreground">{d}</span>
                    )}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <button
                      key={`${wi}-${di}`}
                      className="w-[14px] h-[14px] rounded-[2px] transition-all hover:ring-1 hover:ring-primary/50"
                      style={{ background: day.date ? getMoodColor(day.mood) : "transparent" }}
                      onClick={() => {
                        if (day.date && logsByDate[day.date]) {
                          setSelectedDay(logsByDate[day.date]);
                        }
                      }}
                      title={day.date ? `${day.date}: ${day.mood !== null ? `${day.mood}/10` : "No log"}` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="font-mono-stat text-[8px] text-muted-foreground">Less</span>
              {[0.3, 0.3, 0.3, 0.6, 0.9].map((op, i) => (
                <div
                  key={i}
                  className="w-[12px] h-[12px] rounded-[2px]"
                  style={{
                    background: i === 0
                      ? "hsl(var(--muted) / 0.3)"
                      : `hsl(var(--primary) / ${op})`,
                  }}
                />
              ))}
              <span className="font-mono-stat text-[8px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay && (
          <div className="rounded-lg border bg-card p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel prefix="◈">{selectedDay.logged_at}</SectionLabel>
              <button
                onClick={() => setSelectedDay(null)}
                className="font-mono-stat text-[9px] text-muted-foreground hover:text-foreground"
              >
                close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono-stat text-[10px] text-muted-foreground">Mood</span>
                <div className="font-cinzel text-2xl font-bold text-primary">{selectedDay.mood_score}/10</div>
              </div>
              <div>
                <span className="font-mono-stat text-[10px] text-muted-foreground">Energy</span>
                <div className="font-cinzel text-2xl font-bold text-foreground">{selectedDay.energy_score}/10</div>
              </div>
            </div>
            {selectedDay.one_line && (
              <p className="font-body text-sm text-foreground mt-3 italic" style={{ opacity: 0.85 }}>
                "{selectedDay.one_line}"
              </p>
            )}
            {Array.isArray(selectedDay.ai_tags) && selectedDay.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedDay.ai_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="font-mono-stat text-[9px] px-2 py-0.5 rounded-full border text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monthly Average Chart */}
        {monthlyData.length > 1 && (
          <div className="rounded-lg border bg-card p-4">
            <SectionLabel prefix="◆">Monthly Averages</SectionLabel>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
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
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    name="Mood"
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="hsl(var(--theme-green))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--theme-green))" }}
                    name="Energy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Emotion Tag Cloud */}
        {tagCloud.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <SectionLabel prefix="✦">Emotion Landscape</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {tagCloud.map(([tag, count]) => {
                const scale = 0.7 + (count / maxTagCount) * 0.8;
                const opacity = 0.5 + (count / maxTagCount) * 0.5;
                return (
                  <span
                    key={tag}
                    className="font-body transition-all hover:text-primary cursor-default"
                    style={{
                      fontSize: `${scale}rem`,
                      opacity,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="font-body text-muted-foreground">No mood logs yet. Start by logging from your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
