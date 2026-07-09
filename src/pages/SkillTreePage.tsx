import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SkillTreeSVG } from "@/components/SkillTreeSVG";
import { SystemMessage } from "@/components/ui/SystemMessage";
import { useUniverse } from "@/hooks/useUniverse";
import { STAT_COLORS, STAT_ICONS, STAT_KEYS, getTierRarity, type SkillNode } from "@/lib/skillTreeData";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

const SkillTreePage = () => {
  const { user } = useAuth();
  const { t, isSoloLeveling } = useUniverse();
  const statKeys = isSoloLeveling
    ? [t('stat_physical'), t('stat_psyche'), t('stat_intel'), t('stat_spiritual'), t('stat_core'), t('stat_craft')]
    : ["Physical", "Psyche", "Intel", "Spiritual", "Core", "Craft"];
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStat = searchParams.get("stat") || statKeys[0];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notification, setNotification] = useState<{ title: string; subtitle: string; rarity: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    dataClient.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user]);

  const handleNodeUnlocked = (node: SkillNode) => {
    const rarity = getTierRarity(node.tier) as "common" | "rare" | "epic" | "legendary";
    setNotification({
      title: node.node_name,
      subtitle: node.bonus_description,
      rarity,
    });
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING SKILL TREE...</p>
      </div>
    );
  }

  const statXp = (profile as any)[STAT_KEYS[activeStat]] ?? 0;
  const colors = STAT_COLORS[activeStat] ?? STAT_COLORS.Core;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Notification */}
      {notification && (
        <SystemMessage
          title={notification.title}
          subtitle={notification.subtitle}
          rarity={notification.rarity as any}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/training" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/training" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Training
          </Link>
        </div>
      </nav>

      {/* Stat tabs */}
      <div className="border-b bg-card/50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {statKeys.map((stat) => {
            const isActive = stat === activeStat;
            const sc = STAT_COLORS[stat];
            return (
              <button
                key={stat}
                onClick={() => setSearchParams({ stat })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono-stat text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-foreground border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                style={isActive ? { borderColor: sc.primary, color: sc.primary } : {}}
              >
                <span>{STAT_ICONS[stat]}</span>
                {stat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="shrink-0 max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{STAT_ICONS[activeStat]}</span>
          <div>
            <h1 className="font-cinzel text-xl font-bold" style={{ color: colors.primary }}>
              {activeStat} Skill Tree
            </h1>
            <span className="font-mono-stat text-[10px] text-muted-foreground">
              Current XP: {statXp}
            </span>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 relative overflow-hidden">
        <SkillTreeSVG
          statName={activeStat}
          statXp={statXp}
          onNodeUnlocked={handleNodeUnlocked}
        />
      </div>
    </div>
  );
};

export default SkillTreePage;
