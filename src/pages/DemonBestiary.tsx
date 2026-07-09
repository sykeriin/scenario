import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { DEMON_DOMAIN_META, type DemonEncounter } from "@/lib/demonTypes";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

const DemonBestiary = () => {
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<DemonEncounter[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient.from("demon_encounters").select("*, demon_constellations(*)").eq("user_id", user.id).order("encountered_at", { ascending: false }),
      dataClient.from("profiles").select("*").eq("id", user.id).single(),
    ]).then(([encRes, profRes]) => {
      setEncounters((encRes.data as any) ?? []);
      setProfile(profRes.data);
    });
  }, [user]);

  const resisted = profile?.demon_encounters_resisted ?? 0;
  const submitted = profile?.demon_encounters_submitted ?? 0;
  const total = resisted + submitted;
  const corruptionScore = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="font-mono-stat text-[10px] text-muted-foreground hover:text-primary transition-colors">
              ← DASHBOARD
            </Link>
            <h1 className="font-cinzel text-2xl font-bold mt-2 tracking-wider">Demon Bestiary</h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              A record of every dark whisper you've faced.
            </p>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="font-mono-stat text-2xl font-bold text-green-400">{resisted}</p>
            <p className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground mt-1">Resisted</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="font-mono-stat text-2xl font-bold text-destructive">{submitted}</p>
            <p className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground mt-1">Submitted</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p
              className="font-mono-stat text-2xl font-bold"
              style={{ color: corruptionScore > 50 ? "hsl(var(--destructive))" : corruptionScore > 25 ? "hsl(var(--primary))" : "hsl(120 60% 45%)" }}
            >
              {corruptionScore}%
            </p>
            <p className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground mt-1">Corruption</p>
          </div>
        </div>

        {/* Encounter list */}
        <div className="space-y-4">
          <SectionLabel prefix="◆">Encounter Log</SectionLabel>
          {encounters.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="font-body text-muted-foreground">No demon encounters yet. They will find you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {encounters.map((enc) => {
                const demon = enc.demon_constellations;
                const domainMeta = DEMON_DOMAIN_META[demon?.domain ?? "Sloth"] ?? DEMON_DOMAIN_META.Sloth;
                const isResisted = enc.status === "resisted";
                const isSubmitted = enc.status === "submitted";
                const isActive = enc.status === "active";

                return (
                  <div
                    key={enc.id}
                    className="rounded-lg border bg-card p-4"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: isResisted ? "hsl(120 60% 45%)" : isSubmitted ? "hsl(var(--destructive))" : `hsl(${domainMeta.color})`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{domainMeta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-cinzel text-sm font-bold" style={{ color: `hsl(${domainMeta.color})` }}>
                            {demon?.name ?? "Unknown"}
                          </span>
                          <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                            {demon?.grade}
                          </span>
                          {isResisted && (
                            <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30">
                              RESISTED
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
                              SUBMITTED
                            </span>
                          )}
                          {isActive && (
                            <span className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 animate-pulse">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="font-cinzel text-xs mt-1 text-foreground">「{enc.scenario_title}」</p>
                        <p className="font-body text-xs text-muted-foreground mt-1">{enc.scenario_content}</p>
                        <div className="font-mono-stat text-[9px] text-muted-foreground mt-2">
                          {new Date(enc.encountered_at).toLocaleDateString()}
                          {isResisted && ` • +${enc.resistance_xp_reward} XP`}
                          {isSubmitted && ` • -${enc.submission_penalty} XP`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemonBestiary;
