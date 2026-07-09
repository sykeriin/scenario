import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";

type WeeklyReview = {
  id: string;
  week_start: string;
  week_end: string;
  stats_snapshot: any;
  xp_gained: number;
  quests_completed: number;
  scenarios_cleared: number;
  streak_data: any;
  narrative_text: string;
  generated_at: string;
  share_image_url: string | null;
};

function getWeekNumber(weekStart: string, accountCreated: string): number {
  const start = new Date(weekStart).getTime();
  const created = new Date(accountCreated).getTime();
  return Math.max(1, Math.ceil((start - created) / (7 * 24 * 60 * 60 * 1000)));
}

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const { t } = useUniverse();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [accountCreated, setAccountCreated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient
        .from("weekly_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false }),
      dataClient.from("profiles").select("created_at").eq("id", user.id).single(),
    ]).then(([reviewsRes, profileRes]) => {
      setReviews((reviewsRes.data as any[]) ?? []);
      setAccountCreated(profileRes.data?.created_at ?? new Date().toISOString());
      setLoading(false);
    });
  }, [user]);

  const generateNow = async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const { data, error } = await dataClient.functions.invoke("weekly-review", {
        body: {},
      });
      if (!error && data?.result) {
        if (data.result === "already_exists") {
          // Already exists
        } else {
          setReviews((prev) => [data.result as WeeklyReview, ...prev]);
        }
      }
    } catch (e) {
      console.error("Failed to generate review:", e);
    }
    setGenerating(false);
  };

  const generateShareImage = async (review: WeeklyReview) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    // Background
    ctx.fillStyle = "#0a0a08";
    ctx.fillRect(0, 0, 600, 400);

    // Border
    ctx.strokeStyle = "#c8a200";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 576, 376);

    // Header
    ctx.fillStyle = "#c8a200";
    ctx.font = "bold 18px 'Cinzel', serif";
    ctx.fillText("SCENARIO", 30, 48);

    const weekNum = getWeekNumber(review.week_start, accountCreated);
    ctx.font = "12px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(`Week ${String(weekNum).padStart(2, "0")} of the Path`, 30, 70);
    ctx.fillText(`${review.week_start} → ${review.week_end}`, 30, 88);

    // Stats row
    ctx.fillStyle = "#c8a200";
    ctx.font = "bold 14px monospace";
    const statsY = 120;
    ctx.fillText(`⚔ ${review.quests_completed} quests`, 30, statsY);
    ctx.fillText(`★ ${review.xp_gained} XP`, 200, statsY);
    ctx.fillText(`✓ ${review.scenarios_cleared} scenarios`, 370, statsY);

    // Divider
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 140);
    ctx.lineTo(570, 140);
    ctx.stroke();

    // Narrative (first sentence)
    ctx.fillStyle = "#e8e0cc";
    ctx.font = "italic 13px 'Cinzel', serif";
    const firstSentence = review.narrative_text.split(/[.!?]/)[0] + ".";
    const words = firstSentence.split(" ");
    let line = "";
    let y = 168;
    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > 530) {
        ctx.fillText(line.trim(), 30, y);
        line = word + " ";
        y += 22;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), 30, y);

    // Level/title
    const snap = review.stats_snapshot || {};
    ctx.fillStyle = "#888";
    ctx.font = "11px monospace";
    ctx.fillText(`LV. ${snap.level ?? "?"} · ${snap.title ?? "Protagonist"}`, 30, 370);

    // Download
    const link = document.createElement("a");
    link.download = `week-${review.week_start}-review.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING CHRONICLES...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <canvas ref={canvasRef} className="hidden" />

      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h1 className="font-cinzel text-2xl font-bold text-foreground tracking-wider">{t('weekly_review')}</h1>
          <p className="font-body text-sm text-muted-foreground mt-1" style={{ opacity: 0.7 }}>
            A weekly record of your journey
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={generateNow}
            disabled={generating}
            className="font-mono-stat text-[10px]"
          >
            {generating ? "Generating..." : "Generate This Week's Review"}
          </Button>
        </div>

        {reviews.length === 0 && (
          <div className="text-center py-16">
            <p className="font-cinzel text-lg text-muted-foreground">No chronicles written yet.</p>
            <p className="font-body text-sm text-muted-foreground mt-2">
              Your first weekly review will appear after your first full week.
            </p>
          </div>
        )}

        {/* Reviews Feed */}
        <div className="space-y-6">
          {reviews.map((review) => {
            const weekNum = getWeekNumber(review.week_start, accountCreated);
            return (
              <article
                key={review.id}
                className="rounded-lg border p-6 animate-fade-in"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.8))",
                  borderColor: "hsl(var(--primary) / 0.2)",
                }}
              >
                {/* Week Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-cinzel text-lg font-bold text-primary tracking-wider">
                      Week {String(weekNum).padStart(2, "0")} of the Path
                    </h2>
                    <span className="font-mono-stat text-[10px] text-muted-foreground">
                      {review.week_start} → {review.week_end}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateShareImage(review)}
                    className="font-mono-stat text-[9px] text-muted-foreground"
                  >
                    Share Week
                  </Button>
                </div>

                {/* Compact Stats Row */}
                <div className="flex flex-wrap gap-4 mb-4 py-2 border-y" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                  <span className="font-mono-stat text-[11px] text-foreground">
                    ⚔ {review.quests_completed} quests
                  </span>
                  <span className="font-mono-stat text-[11px] text-primary">
                    ★ {review.xp_gained} XP
                  </span>
                  <span className="font-mono-stat text-[11px] text-foreground">
                    ✓ {review.scenarios_cleared} scenario{review.scenarios_cleared !== 1 ? "s" : ""}
                  </span>
                  {review.stats_snapshot?.level && (
                    <span className="font-mono-stat text-[11px] text-muted-foreground">
                      LV. {review.stats_snapshot.level}
                    </span>
                  )}
                </div>

                {/* Narrative */}
                <div className="space-y-3">
                  {review.narrative_text.split("\n\n").map((para, i) => (
                    <p
                      key={i}
                      className="font-cinzel text-sm leading-relaxed text-foreground"
                      style={{ opacity: 0.9, textIndent: i > 0 ? "1.5rem" : undefined }}
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* Streak/Titles Info */}
                {review.streak_data?.titles_unlocked?.length > 0 && (
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                    <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
                      Titles Unlocked:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {review.streak_data.titles_unlocked.map((t: any, i: number) => (
                        <span
                          key={i}
                          className="font-mono-stat text-[9px] px-2 py-0.5 rounded-full border text-primary"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
