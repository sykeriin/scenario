import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";

interface WidgetData {
  pathTitle: string;
  arcTitle: string;
  completed: number;
  total: number;
  alignmentScore: number;
  lastDriftAt: string | null;
}

function getAlignmentColor(score: number): string {
  if (score <= 30) return "hsl(var(--muted-foreground))";
  if (score <= 60) return "hsl(210 80% 55%)";
  if (score <= 85) return "hsl(var(--theme-green))";
  return "hsl(45 90% 50%)";
}

function getAlignmentLabel(score: number): string {
  if (score <= 30) return "Undefined";
  if (score <= 60) return "Converging";
  if (score <= 85) return "Aligned";
  return "True to Path";
}

export const LifePathWidget = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WidgetData | null>(null);
  const [noPath, setNoPath] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadWidget();
  }, [user]);

  const loadWidget = async () => {
    const { data: paths } = await dataClient
      .from("life_paths")
      .select("id, title, drift_log, last_recalibrated_at")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .limit(1);

    if (!paths || paths.length === 0) {
      setNoPath(true);
      return;
    }

    const path = paths[0] as any;
    const driftLog = Array.isArray(path.drift_log) ? path.drift_log : [];
    const latestDrift = driftLog.length > 0 ? driftLog[driftLog.length - 1] : null;
    const alignmentScore = latestDrift?.alignment_score ?? 50;

    const { data: arcs } = await dataClient
      .from("life_path_arcs")
      .select("id, title")
      .eq("life_path_id", path.id)
      .eq("status", "active")
      .limit(1);

    const activeArc = arcs?.[0];
    if (!activeArc) {
      setData({ pathTitle: path.title, arcTitle: "No active arc", completed: 0, total: 0, alignmentScore, lastDriftAt: path.last_recalibrated_at });
      return;
    }

    const { data: scenarios } = await dataClient
      .from("life_path_scenarios")
      .select("is_completed")
      .eq("arc_id", activeArc.id);

    const total = scenarios?.length ?? 0;
    const completed = scenarios?.filter((s) => s.is_completed).length ?? 0;

    setData({
      pathTitle: path.title,
      arcTitle: activeArc.title,
      completed,
      total,
      alignmentScore,
      lastDriftAt: path.last_recalibrated_at,
    });
  };

  if (noPath) {
    return (
      <Link to="/life-path" className="block rounded-lg border bg-card p-4 hover:border-primary/30 transition-all">
        <SectionLabel prefix="◆">Life Path</SectionLabel>
        <p className="font-body text-xs text-muted-foreground mt-2">Path: <span className="text-muted-foreground/60">Undefined</span></p>
        <p className="font-mono-stat text-[10px] text-primary mt-1">Define your destiny →</p>
      </Link>
    );
  }

  if (!data) return null;

  const color = getAlignmentColor(data.alignmentScore);
  const label = getAlignmentLabel(data.alignmentScore);
  const recentDrift = data.lastDriftAt && (Date.now() - new Date(data.lastDriftAt).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-lg border bg-card p-4">
      <SectionLabel prefix="◆">Life Path</SectionLabel>
      <Link to="/life-path" className="block mt-2 group">
        <p className="font-cinzel text-sm font-bold text-primary group-hover:text-primary/80 transition-colors truncate">{data.pathTitle}</p>
        <p className="font-mono-stat text-[10px] text-muted-foreground mt-1 truncate">{data.arcTitle}</p>
        {data.total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <GlowingProgress value={data.completed} max={data.total} height="h-1" className="flex-1" />
            <span className="font-mono-stat text-[9px] text-muted-foreground">{data.completed}/{data.total}</span>
          </div>
        )}
        {/* Alignment indicator */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: data.alignmentScore > 85 ? `0 0 6px ${color}` : "none" }} />
          <span className="font-mono-stat text-[9px]" style={{ color }}>{label} · {data.alignmentScore}%</span>
        </div>
        {recentDrift && (
          <p className="font-mono-stat text-[9px] text-primary mt-1" style={{ textShadow: "0 0 6px hsl(var(--glow) / 0.4)" }}>
            ◆ Path updated recently
          </p>
        )}
        <span className="font-mono-stat text-[9px] text-primary/70 mt-1 block">View full path →</span>
      </Link>
    </div>
  );
};
