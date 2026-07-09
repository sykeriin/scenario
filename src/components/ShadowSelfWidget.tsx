import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";

interface ShadowSelf {
  id: string;
  shadow_name: string;
  shadow_title: string;
  shadow_stats: Record<string, number>;
  shadow_xp: number;
  shadow_note: string | null;
  generated_at: string;
}

export function ShadowSelfWidget() {
  const { user } = useAuth();
  const [shadow, setShadow] = useState<ShadowSelf | null>(null);
  const [userXp, setUserXp] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      dataClient.from("shadow_selves").select("*").eq("user_id", user.id).maybeSingle(),
      dataClient.from("profiles").select("total_xp").eq("id", user.id).single(),
    ]).then(([shadowRes, profileRes]) => {
      if (shadowRes.data) setShadow(shadowRes.data as any);
      setUserXp(profileRes.data?.total_xp ?? 0);
    });
  }, [user]);

  const generateShadow = async () => {
    if (!user || generating) return;
    setGenerating(true);
    const { data, error } = await dataClient.functions.invoke("generate-shadow", {
      body: {},
    });
    if (!error && data?.result) {
      // Re-fetch
      const { data: fresh } = await dataClient.from("shadow_selves").select("*").eq("user_id", user.id).maybeSingle();
      if (fresh) setShadow(fresh as any);
    }
    setGenerating(false);
  };

  if (!shadow) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-fade-in" style={{ borderColor: "hsl(0 70% 45% / 0.3)" }}>
        <SectionLabel prefix="◆">Shadow Self</SectionLabel>
        <p className="font-body text-xs text-muted-foreground mt-2 mb-3">
          Generate your Shadow — the version of you that never faltered.
        </p>
        <button
          onClick={generateShadow}
          disabled={generating}
          className="w-full py-2 rounded border font-mono-stat text-[10px] uppercase tracking-wider hover:bg-accent transition-colors disabled:opacity-50"
          style={{ borderColor: "hsl(0 70% 45% / 0.4)" }}
        >
          {generating ? "◈ MANIFESTING..." : "◈ Summon Shadow Self"}
        </button>
      </div>
    );
  }

  const gap = shadow.shadow_xp - userXp;
  const gapPct = shadow.shadow_xp > 0 ? Math.min(100, Math.max(0, (userXp / shadow.shadow_xp) * 100)) : 0;

  return (
    <div
      className="rounded-lg border bg-card p-4 animate-fade-in"
      style={{
        borderColor: "hsl(0 70% 45% / 0.3)",
        background: "linear-gradient(135deg, hsl(var(--card)), hsl(0 70% 45% / 0.03))",
      }}
    >
      <SectionLabel prefix="◆">Shadow Self</SectionLabel>
      <div className="mt-3 space-y-2">
        <div className="font-cinzel text-sm italic" style={{ opacity: 0.7, textShadow: "0 0 8px hsl(0 70% 45% / 0.3)" }}>
          {shadow.shadow_name}
        </div>
        <div className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">
          ✦ {shadow.shadow_title}
        </div>
        <div className="font-mono-stat text-xs font-bold" style={{ color: "hsl(0 70% 55%)" }}>
          ◈ {shadow.shadow_xp.toLocaleString()} XP
        </div>

        {/* Shadow Gap Bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono-stat text-[9px] text-muted-foreground">Shadow Gap</span>
            <span className="font-mono-stat text-[9px] font-bold" style={{ color: "hsl(0 70% 55%)" }}>
              −{gap.toLocaleString()} XP
            </span>
          </div>
          <div className="relative w-full overflow-hidden rounded-full h-2" style={{ background: "hsl(0 70% 45% / 0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${gapPct}%`,
                background: "hsl(0 70% 50%)",
                boxShadow: "0 0 8px hsl(0 70% 50% / 0.5)",
              }}
            />
          </div>
        </div>

        {shadow.shadow_note && (
          <p className="font-body text-[11px] italic text-muted-foreground mt-2" style={{ opacity: 0.8 }}>
            "{shadow.shadow_note}"
          </p>
        )}
      </div>
    </div>
  );
}
