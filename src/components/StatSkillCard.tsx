import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { STAT_COLORS, STAT_ICONS, STAT_KEYS } from "@/lib/skillTreeData";
import { GlowingProgress } from "@/components/ui/GlowingProgress";

interface StatSkillCardProps {
  statName: string;
  statXp: number;
}

export const StatSkillCard = ({ statName, statXp }: StatSkillCardProps) => {
  const { user } = useAuth();
  const [totalNodes, setTotalNodes] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [latestBonus, setLatestBonus] = useState<string | null>(null);
  const colors = STAT_COLORS[statName] ?? STAT_COLORS.Core;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient.from("skill_nodes").select("id", { count: "exact", head: true }).eq("stat_name", statName),
      dataClient
        .from("user_skill_nodes")
        .select("node_id")
        .eq("user_id", user.id),
    ]).then(async ([countRes, unlockedRes]) => {
      setTotalNodes(countRes.count ?? 0);
      const allUnlocked = (unlockedRes.data as any[]) ?? [];
      // Filter by stat: fetch the stat's node ids
      const { data: statNodes } = await dataClient
        .from("skill_nodes")
        .select("id, bonus_description")
        .eq("stat_name", statName)
        .order("tier", { ascending: false });
      const statNodeIds = new Set((statNodes ?? []).map((n: any) => n.id));
      const matching = allUnlocked.filter((u: any) => statNodeIds.has(u.node_id));
      setUnlockedCount(matching.length);
      if (matching.length > 0 && statNodes) {
        const latest = statNodes.find((n: any) => n.id === matching[0].node_id);
        setLatestBonus(latest?.bonus_description ?? null);
      }
    });
  }, [user, statName]);

  return (
    <Link
      to={`/skill-tree?stat=${statName}`}
      className="rounded-lg border bg-card p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-primary/30 block"
      style={{ borderColor: `${colors.primary}20` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{STAT_ICONS[statName]}</span>
          <div>
            <h3 className="font-cinzel text-sm font-semibold">{statName}</h3>
            <span className="font-mono-stat text-[9px] text-muted-foreground">
              {unlockedCount}/{totalNodes} nodes
            </span>
          </div>
        </div>
        <span className="font-mono-stat text-lg font-bold" style={{ color: colors.primary }}>
          {statXp}
        </span>
      </div>

      <GlowingProgress value={unlockedCount} max={Math.max(totalNodes, 1)} color={colors.primary} height="h-1.5" />

      {latestBonus && (
        <div
          className="rounded-md px-2 py-1.5 font-mono-stat text-[9px]"
          style={{ background: colors.bg, color: colors.primary }}
        >
          ◆ {latestBonus}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono-stat text-[9px] text-muted-foreground">XP: {statXp}</span>
        <span className="font-mono-stat text-[9px] text-primary">View Tree →</span>
      </div>
    </Link>
  );
};
