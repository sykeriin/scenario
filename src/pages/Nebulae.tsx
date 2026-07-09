import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { NEBULA_DOMAINS, NebulaDomainKey } from "@/lib/nebulaDomains";
import { NebulaFoundDialog } from "@/components/NebulaFoundDialog";

interface Nebula {
  id: string;
  name: string;
  motto: string;
  domain: string;
  founder_id: string;
  member_count: number;
  total_stories: number;
  nebula_rank: number;
  banner_color: string;
  emblem_icon: string;
  created_at: string;
}

const Nebulae = () => {
  const { user } = useAuth();
  const [nebulae, setNebulae] = useState<Nebula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFoundDialog, setShowFoundDialog] = useState(false);
  const [userGrade, setUserGrade] = useState("");
  const [userNebulaId, setUserNebulaId] = useState<string | null>(null);

  useEffect(() => {
    fetchNebulae();
    if (user) fetchUserInfo();
  }, [user]);

  const fetchNebulae = async () => {
    const { data } = await dataClient
      .from("nebulae")
      .select("*")
      .order("total_stories", { ascending: false });
    setNebulae((data as any[]) ?? []);
    setLoading(false);
  };

  const fetchUserInfo = async () => {
    if (!user) return;
    const [profileRes, memberRes] = await Promise.all([
      dataClient.from("profiles").select("constellation_grade").eq("id", user.id).single(),
      dataClient.from("nebula_members").select("nebula_id").eq("user_id", user.id).limit(1),
    ]);
    setUserGrade(profileRes.data?.constellation_grade ?? "");
    const members = (memberRes.data as any[]) ?? [];
    setUserNebulaId(members.length > 0 ? members[0].nebula_id : null);
  };

  const canFound = ["Myth Grade", "Outer God"].includes(userGrade) && !userNebulaId;

  const getRankBorder = (index: number) => {
    if (index === 0) return "border-l-4 border-l-yellow-400";
    if (index === 1) return "border-l-4 border-l-gray-300";
    if (index === 2) return "border-l-4 border-l-amber-600";
    return "border-l border-l-border";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2">
          <Link to="/dashboard" className="font-mono-stat text-xs text-muted-foreground hover:text-primary transition-colors">
            ← DASHBOARD
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-cinzel tracking-wide text-foreground">
              ✧ NEBULAE
            </h1>
            <p className="font-mono-stat text-xs text-muted-foreground mt-1">
              CONSTELLATION FACTIONS · RANKED BY STORIES
            </p>
          </div>
          {canFound && (
            <Button onClick={() => setShowFoundDialog(true)} className="font-mono-stat text-xs">
              ✦ FOUND A NEBULA
            </Button>
          )}
        </div>

        {loading ? (
          <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ SCANNING NEBULAE...</p>
        ) : nebulae.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center">
            <p className="font-mono-stat text-sm text-muted-foreground">No Nebulae have been founded yet.</p>
            <p className="font-mono-stat text-xs text-muted-foreground mt-2">
              Only Myth Grade Constellations can found a Nebula.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {nebulae.map((n, i) => {
              const domainInfo = NEBULA_DOMAINS[n.domain as NebulaDomainKey];
              return (
                <Link
                  key={n.id}
                  to={`/nebulae/${n.id}`}
                  className={`block bg-card rounded-lg p-5 hover:bg-card/80 transition-colors ${getRankBorder(i)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{n.emblem_icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-stat text-xs text-muted-foreground">#{i + 1}</span>
                          <h2 className="font-cinzel text-lg text-foreground">{n.name}</h2>
                        </div>
                        <p className="font-body text-sm text-muted-foreground italic">"{n.motto}"</p>
                        {domainInfo && (
                          <span
                            className="inline-block mt-1 font-mono-stat text-[10px] px-2 py-0.5 rounded-sm"
                            style={{ background: `hsl(${domainInfo.color} / 0.15)`, color: `hsl(${domainInfo.color})` }}
                          >
                            {domainInfo.label} · +5% {domainInfo.bonusType} XP
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono-stat text-lg text-primary">{n.total_stories}</p>
                      <p className="font-mono-stat text-[10px] text-muted-foreground">STORIES</p>
                      <p className="font-mono-stat text-xs text-muted-foreground mt-1">
                        {n.member_count} Constellation{n.member_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NebulaFoundDialog
        open={showFoundDialog}
        onOpenChange={setShowFoundDialog}
        onCreated={() => { fetchNebulae(); fetchUserInfo(); }}
      />
    </div>
  );
};

export default Nebulae;
