import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { NEBULA_DOMAINS, NebulaDomainKey } from "@/lib/nebulaDomains";
import { NebulaInviteDialog } from "@/components/NebulaInviteDialog";
import { NebulaDeclarationForm } from "@/components/NebulaDeclarationForm";

interface NebulaMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { username: string; display_name: string | null; constellation_grade: string; current_title: string | null };
}

interface Declaration {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  profile?: { username: string; display_name: string | null };
}

const NebulaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [nebula, setNebula] = useState<any>(null);
  const [members, setMembers] = useState<NebulaMember[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, user]);

  const fetchAll = async () => {
    const [nebRes, memRes, decRes] = await Promise.all([
      dataClient.from("nebulae").select("*").eq("id", id!).single(),
      dataClient.from("nebula_members").select("*, profile:profiles(username, display_name, constellation_grade, current_title)").eq("nebula_id", id!).order("joined_at"),
      dataClient.from("nebula_declarations").select("*, profile:profiles(username, display_name)").eq("nebula_id", id!).order("created_at", { ascending: false }).limit(20),
    ]);
    setNebula(nebRes.data);
    const mems = (memRes.data as any[]) ?? [];
    setMembers(mems);
    setDeclarations((decRes.data as any[]) ?? []);
    if (user) setIsMember(mems.some((m: any) => m.user_id === user.id));
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING NEBULA...</p></div>;
  if (!nebula) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="font-mono-stat text-sm text-muted-foreground">Nebula not found.</p></div>;

  const domainInfo = NEBULA_DOMAINS[nebula.domain as NebulaDomainKey];
  const isFounder = user?.id === nebula.founder_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div
        className="relative px-4 py-10 md:py-16 overflow-hidden"
        style={{ background: `linear-gradient(135deg, hsl(${domainInfo?.color ?? "45 80% 50%"} / 0.15), hsl(var(--background)))` }}
      >
        <div className="nebula-stars absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="text-5xl mb-3 block">{nebula.emblem_icon}</span>
          <h1 className="text-3xl md:text-4xl font-cinzel tracking-wide text-foreground">{nebula.name}</h1>
          <p className="font-body text-sm text-muted-foreground italic mt-2">"{nebula.motto}"</p>
          {domainInfo && (
            <span
              className="inline-block mt-3 font-mono-stat text-xs px-3 py-1 rounded-sm"
              style={{ background: `hsl(${domainInfo.color} / 0.2)`, color: `hsl(${domainInfo.color})` }}
            >
              {domainInfo.label} · +5% {domainInfo.bonusType} XP
            </span>
          )}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="font-mono-stat text-2xl text-primary">{nebula.total_stories}</p>
              <p className="font-mono-stat text-[10px] text-muted-foreground">TOTAL STORIES</p>
            </div>
            <div className="text-center">
              <p className="font-mono-stat text-2xl text-foreground">{nebula.member_count}</p>
              <p className="font-mono-stat text-[10px] text-muted-foreground">CONSTELLATIONS</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link to="/nebulae" className="font-mono-stat text-xs text-muted-foreground hover:text-primary transition-colors">
          ← ALL NEBULAE
        </Link>

        {/* Actions */}
        {isMember && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-mono-stat text-xs" onClick={() => setShowInvite(true)}>
              ✦ INVITE CONSTELLATION
            </Button>
          </div>
        )}

        {/* Members */}
        <div>
          <SectionLabel>CONSTELLATION MEMBERS</SectionLabel>
          <div className="grid gap-2 mt-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-card rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-stat text-xs text-primary uppercase">{m.role}</span>
                  <div>
                    <p className="font-body text-sm text-foreground">
                      {m.profile?.display_name || m.profile?.username || "Unknown"}
                    </p>
                    <p className="font-mono-stat text-[10px] text-muted-foreground">
                      {m.profile?.current_title ?? "Nameless Reader"} · {m.profile?.constellation_grade}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Declarations */}
        <div>
          <SectionLabel>NEBULA DECLARATIONS</SectionLabel>
          {isMember && (
            <div className="mt-3 mb-4">
              <NebulaDeclarationForm nebulaId={nebula.id} onCreated={fetchAll} />
            </div>
          )}
          <div className="space-y-3 mt-3">
            {declarations.length === 0 ? (
              <p className="font-mono-stat text-xs text-muted-foreground">No declarations yet.</p>
            ) : (
              declarations.map((d) => (
                <div key={d.id} className="bg-card rounded-lg p-4 border-l-2 border-l-primary">
                  <h3 className="font-cinzel text-sm text-foreground">{d.title}</h3>
                  <p className="font-body text-sm text-muted-foreground mt-1">{d.content}</p>
                  <p className="font-mono-stat text-[10px] text-muted-foreground mt-2">
                    — {d.profile?.display_name || d.profile?.username} · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <NebulaInviteDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        nebulaId={nebula.id}
        nebulaName={nebula.name}
        domain={nebula.domain}
        motto={nebula.motto}
      />
    </div>
  );
};

export default NebulaDetail;
