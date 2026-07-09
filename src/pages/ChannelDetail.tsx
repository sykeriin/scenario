import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SystemMessage } from "@/components/ui/SystemMessage";
import { TournamentCreateDialog } from "@/components/TournamentCreateDialog";
import { TournamentBracket } from "@/components/TournamentBracket";
import { TournamentLeaderboard } from "@/components/TournamentLeaderboard";

interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  banner_image_url: string | null;
  member_count: number;
}

interface ChannelScenario {
  id: string;
  title: string;
  description: string | null;
  scenario_type: string;
  xp_reward: number;
  deadline: string | null;
  status: string;
  is_mandatory: boolean;
  created_at: string;
  created_by: string;
}

interface MemberWithProfile {
  user_id: string;
  role: string;
  username: string;
  channel_xp: number;
}

interface Announcement {
  id: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author_username: string;
}

interface ProgressRow {
  id: string;
  channel_scenario_id: string;
  user_id: string;
  status: string;
  cleared_at: string | null;
}

const themeColors: Record<string, string> = {
  Academic: "hsl(210 80% 55%)",
  Skill: "hsl(32 90% 50%)",
  Career: "hsl(270 60% 55%)",
  Social: "hsl(340 70% 55%)",
  Fitness: "hsl(0 80% 55%)",
};

const ChannelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChannelRow | null>(null);
  const [scenarios, setScenarios] = useState<ChannelScenario[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [tab, setTab] = useState<"scenarios" | "feed" | "leaderboard" | "tournaments" | "manage">("scenarios");
  const [isDokkaebi, setIsDokkaebi] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [systemMsg, setSystemMsg] = useState<{ title: string; subtitle?: string; rarity: "common" | "rare" | "epic" | "legendary" } | null>(null);

  // Manage tab state
  const [newScenario, setNewScenario] = useState({ title: "", description: "", scenario_type: "sub", xp_reward: 100, is_mandatory: false, deadline: "" });
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [postingAnn, setPostingAnn] = useState(false);

  useEffect(() => {
    if (id) loadAll();
  }, [id, user]);

  const loadAll = async () => {
    const [chRes, scRes, memRes, annRes] = await Promise.all([
      dataClient.from("channels").select("*").eq("id", id!).single(),
      dataClient.from("channel_scenarios").select("*").eq("channel_id", id!).order("created_at", { ascending: false }),
      dataClient.from("channel_members").select("*").eq("channel_id", id!),
      dataClient.from("channel_announcements").select("*").eq("channel_id", id!).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    setChannel(chRes.data);
    setScenarios(scRes.data ?? []);

    const memberData = memRes.data ?? [];
    const userIds = memberData.map((m) => m.user_id);

    // Check membership
    const myMembership = user ? memberData.find((m) => m.user_id === user.id) : null;
    setIsMember(!!myMembership);
    setIsDokkaebi(myMembership?.role === "dokkaebi");

    // Fetch profiles
    const { data: profiles } = userIds.length > 0
      ? await dataClient.from("profiles").select("id, username").in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

    // Fetch progress for XP leaderboard
    const scenarioIds = (scRes.data ?? []).map((s) => s.id);
    let progressData: ProgressRow[] = [];
    if (scenarioIds.length > 0) {
      const { data } = await dataClient.from("channel_scenario_progress").select("*").in("channel_scenario_id", scenarioIds);
      progressData = data ?? [];
    }
    setProgress(progressData);

    // Calculate channel XP per member
    const xpMap = new Map<string, number>();
    const scenarioXpMap = new Map<string, number>();
    (scRes.data ?? []).forEach((s) => scenarioXpMap.set(s.id, s.xp_reward));

    progressData.filter((p) => p.status === "cleared").forEach((p) => {
      const xp = scenarioXpMap.get(p.channel_scenario_id) ?? 0;
      xpMap.set(p.user_id, (xpMap.get(p.user_id) ?? 0) + xp);
    });

    const enrichedMembers: MemberWithProfile[] = memberData
      .map((m) => ({
        user_id: m.user_id,
        role: m.role,
        username: profileMap.get(m.user_id) ?? "Unknown",
        channel_xp: xpMap.get(m.user_id) ?? 0,
      }))
      .sort((a, b) => b.channel_xp - a.channel_xp);

    setMembers(enrichedMembers);

    // Announcements with author names
    const annData = annRes.data ?? [];
    const annAuthorIds = [...new Set(annData.map((a) => a.author_id))];
    const { data: annProfiles } = annAuthorIds.length > 0
      ? await dataClient.from("profiles").select("id, username").in("id", annAuthorIds)
      : { data: [] };
    const annProfileMap = new Map((annProfiles ?? []).map((p) => [p.id, p.username]));

    setAnnouncements(
      annData.map((a) => ({
        id: a.id,
        content: a.content,
        pinned: a.pinned,
        created_at: a.created_at ?? "",
        author_username: annProfileMap.get(a.author_id) ?? "Unknown",
      }))
    );
  };

  const createChannelScenario = async () => {
    if (!user || !id || creatingScenario || !newScenario.title.trim()) return;
    setCreatingScenario(true);
    try {
      const isMandatory = newScenario.scenario_type === "main";
      const { data: created, error } = await dataClient.from("channel_scenarios").insert({
        channel_id: id,
        created_by: user.id,
        title: newScenario.title.trim(),
        description: newScenario.description.trim() || null,
        scenario_type: newScenario.scenario_type,
        xp_reward: newScenario.xp_reward,
        is_mandatory: isMandatory,
        deadline: newScenario.deadline || null,
      }).select().single();

      if (error) throw error;

      // Auto-enroll all members in mandatory scenarios
      if (isMandatory && created) {
        const memberUserIds = members.map((m) => m.user_id);
        const enrollments = memberUserIds.map((uid) => ({
          channel_scenario_id: created.id,
          user_id: uid,
          status: "enrolled",
        }));
        if (enrollments.length > 0) {
          await dataClient.from("channel_scenario_progress").insert(enrollments);
        }
      }

      toast.success(`${newScenario.scenario_type === "main" ? "Main" : "Sub"} Scenario created!`);
      setNewScenario({ title: "", description: "", scenario_type: "sub", xp_reward: 100, is_mandatory: false, deadline: "" });
      await loadAll();

      if (isMandatory) {
        setSystemMsg({
          title: "New Main Scenario Issued",
          subtitle: `◆ Participation is mandatory. "${created.title}" awaits all Readers.`,
          rarity: "legendary",
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create scenario");
    } finally {
      setCreatingScenario(false);
    }
  };

  const postAnnouncement = async () => {
    if (!user || !id || !newAnnouncement.trim()) return;
    setPostingAnn(true);
    try {
      await dataClient.from("channel_announcements").insert({
        channel_id: id,
        author_id: user.id,
        content: newAnnouncement.trim(),
      });
      setNewAnnouncement("");
      toast.success("Announcement posted!");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setPostingAnn(false);
    }
  };

  const enrollInScenario = async (scenarioId: string) => {
    if (!user) return;
    try {
      await dataClient.from("channel_scenario_progress").insert({
        channel_scenario_id: scenarioId,
        user_id: user.id,
        status: "enrolled",
      });
      toast.success("Enrolled!");
      await loadAll();
    } catch (e: any) {
      if (e.message?.includes("duplicate")) toast.info("Already enrolled!");
      else toast.error(e.message || "Failed to enroll");
    }
  };

  const clearScenario = async (scenarioId: string, xpReward: number) => {
    if (!user) return;
    try {
      await dataClient.from("channel_scenario_progress")
        .update({ status: "cleared", cleared_at: new Date().toISOString() })
        .eq("channel_scenario_id", scenarioId)
        .eq("user_id", user.id);

      // Grant XP to global profile
      await dataClient.rpc("add_xp", {
        user_id_param: user.id,
        amount: xpReward,
        source: `channel_scenario:${scenarioId}`,
      });

      toast.success(`+${xpReward} XP earned!`);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as cleared");
    }
  };

  const archiveScenario = async (scenarioId: string) => {
    try {
      await dataClient.from("channel_scenarios").update({ status: "archived" }).eq("id", scenarioId);
      toast.success("Scenario archived.");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to archive");
    }
  };

  const removeMember = async (userId: string) => {
    if (!id) return;
    try {
      await dataClient.from("channel_members").delete().eq("channel_id", id).eq("user_id", userId);
      await dataClient.from("channels").update({ member_count: Math.max(0, (channel?.member_count ?? 1) - 1) }).eq("id", id);
      toast.success("Member removed.");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  if (!channel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING CHANNEL...</p>
      </div>
    );
  }

  const mainScenarios = scenarios.filter((s) => s.scenario_type === "main" && s.status === "active");
  const subScenarios = scenarios.filter((s) => s.scenario_type === "sub" && s.status === "active");
  const dokkaebiMembers = members.filter((m) => m.role === "dokkaebi");
  const themeColor = themeColors[channel.theme] ?? "hsl(var(--primary))";

  const getMyProgress = (scenarioId: string): ProgressRow | undefined =>
    progress.find((p) => p.channel_scenario_id === scenarioId && p.user_id === user?.id);

  const tabs = [
    { key: "scenarios", label: "Scenarios" },
    { key: "feed", label: "Feed" },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "tournaments", label: "⚔ Tournaments" },
    ...(isDokkaebi ? [{ key: "manage", label: "◈ Manage" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {systemMsg && (
        <SystemMessage title={systemMsg.title} subtitle={systemMsg.subtitle} rarity={systemMsg.rarity} onDismiss={() => setSystemMsg(null)} />
      )}

      {/* Banner */}
      <div
        className="h-32 md:h-44 relative"
        style={{
          background: channel.banner_image_url
            ? `url(${channel.banner_image_url}) center/cover`
            : `linear-gradient(135deg, ${themeColor}, hsl(var(--background)))`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 pb-4">
          <div className="flex items-end gap-3">
            <div>
              <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-foreground">
                {channel.theme}
              </span>
              <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-foreground mt-1 tracking-wider">{channel.name}</h1>
            </div>
          </div>
        </div>
        <Link to="/channels" className="absolute top-4 right-4 font-mono-stat text-[11px] text-foreground/70 hover:text-foreground bg-background/50 backdrop-blur-sm rounded px-2 py-1">
          ← Channels
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Channel info row */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {dokkaebiMembers.map((d) => (
            <div key={d.user_id} className="flex items-center gap-1.5">
              <span className="text-primary text-sm" style={{ textShadow: `0 0 8px ${themeColor}` }}>◈</span>
              <span className="font-mono-stat text-[11px] text-primary">{d.username}</span>
              <span className="font-mono-stat text-[8px] text-muted-foreground uppercase">Dokkaebi</span>
            </div>
          ))}
          <span className="font-mono-stat text-[10px] text-muted-foreground">{channel.member_count} members</span>
          {channel.description && (
            <p className="font-body text-xs text-muted-foreground basis-full">{channel.description}</p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`font-mono-stat text-[10px] uppercase tracking-wider px-4 py-2.5 border-b-2 transition-all ${
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SCENARIOS TAB */}
        {tab === "scenarios" && (
          <div className="space-y-6 animate-fade-in">
            {/* Main Scenarios */}
            {mainScenarios.length > 0 && (
              <div className="space-y-3">
                <SectionLabel prefix="◆">Main Scenarios</SectionLabel>
                {mainScenarios.map((s) => {
                  const myProg = getMyProgress(s.id);
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg p-5 space-y-2 relative overflow-hidden"
                      style={{
                        border: "1.5px solid hsl(45 90% 50% / 0.5)",
                        boxShadow: "0 0 20px hsl(45 90% 50% / 0.15), inset 0 0 20px hsl(45 90% 50% / 0.05)",
                        background: "hsl(var(--card))",
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, hsl(45 90% 50% / 0.6), transparent)" }} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/20 text-destructive font-bold">MAIN</span>
                            <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/10 text-destructive/70">Mandatory</span>
                          </div>
                          <h3 className="font-cinzel text-lg font-bold text-foreground">{s.title}</h3>
                          {s.description && <p className="font-body text-xs text-muted-foreground mt-1">{s.description}</p>}
                        </div>
                        <span className="font-mono-stat text-[11px] text-primary font-bold shrink-0">+{s.xp_reward} XP</span>
                      </div>
                      {s.deadline && (
                        <span className="font-mono-stat text-[10px] text-destructive">⏰ {new Date(s.deadline).toLocaleDateString()}</span>
                      )}
                      {isMember && (
                        <div className="pt-2">
                          {!myProg ? (
                            <Button size="sm" onClick={() => enrollInScenario(s.id)} className="font-mono-stat text-[10px]">Enroll</Button>
                          ) : myProg.status === "cleared" ? (
                            <span className="font-mono-stat text-[10px] text-primary">✓ CLEARED</span>
                          ) : (
                            <Button size="sm" onClick={() => clearScenario(s.id, s.xp_reward)} className="font-mono-stat text-[10px] glow-accent">
                              Mark Cleared
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub Scenarios */}
            {subScenarios.length > 0 && (
              <div className="space-y-3">
                <SectionLabel prefix="✦">Sub Scenarios</SectionLabel>
                {subScenarios.map((s) => {
                  const myProg = getMyProgress(s.id);
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border bg-card p-4 space-y-2"
                      style={{ borderColor: "hsl(var(--dim))" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">SUB</span>
                            <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground/70">Optional</span>
                          </div>
                          <h3 className="font-cinzel text-sm font-semibold text-foreground">{s.title}</h3>
                          {s.description && <p className="font-body text-xs text-muted-foreground mt-1">{s.description}</p>}
                        </div>
                        <span className="font-mono-stat text-[10px] text-primary shrink-0">+{s.xp_reward} XP</span>
                      </div>
                      {s.deadline && (
                        <span className="font-mono-stat text-[10px] text-muted-foreground">⏰ {new Date(s.deadline).toLocaleDateString()}</span>
                      )}
                      {isMember && (
                        <div className="pt-1">
                          {!myProg ? (
                            <Button size="sm" variant="outline" onClick={() => enrollInScenario(s.id)} className="font-mono-stat text-[10px]">Enroll</Button>
                          ) : myProg.status === "cleared" ? (
                            <span className="font-mono-stat text-[10px] text-primary">✓ CLEARED</span>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => clearScenario(s.id, s.xp_reward)} className="font-mono-stat text-[10px]">
                              Mark Cleared
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {mainScenarios.length === 0 && subScenarios.length === 0 && (
              <p className="text-center font-body text-sm text-muted-foreground py-8">No active scenarios yet. {isDokkaebi && "Go to Manage to create one."}</p>
            )}
          </div>
        )}

        {/* FEED TAB */}
        {tab === "feed" && (
          <div className="space-y-3 animate-fade-in">
            <SectionLabel prefix="◆">Announcements</SectionLabel>
            {announcements.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-8">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className={`rounded-lg border bg-card p-4 ${a.pinned ? "border-primary/30" : ""}`}>
                  {a.pinned && <span className="font-mono-stat text-[9px] text-primary uppercase mb-1 block">📌 Pinned</span>}
                  <p className="font-body text-sm text-foreground">{a.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary text-xs" style={{ textShadow: "0 0 6px hsl(var(--glow) / 0.5)" }}>◈</span>
                    <span className="font-mono-stat text-[10px] text-muted-foreground">{a.author_username}</span>
                    <span className="font-mono-stat text-[9px] text-muted-foreground/50">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === "leaderboard" && (
          <div className="space-y-3 animate-fade-in">
            <SectionLabel prefix="✦">Channel Leaderboard</SectionLabel>
            <div className="rounded-lg border bg-card overflow-hidden">
              {members.map((m, i) => (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                  <span className="font-cinzel text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {m.role === "dokkaebi" && (
                      <span className="text-primary text-xs" style={{ textShadow: "0 0 6px hsl(var(--glow) / 0.5)" }}>◈</span>
                    )}
                    <span className="font-body text-sm text-foreground truncate">{m.username}</span>
                    {m.role === "dokkaebi" && (
                      <span className="font-mono-stat text-[8px] text-primary uppercase">Dokkaebi</span>
                    )}
                  </div>
                  <span className="font-mono-stat text-[11px] text-primary font-bold">{m.channel_xp} XP</span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="font-body text-sm text-muted-foreground text-center py-8">No members yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TOURNAMENTS TAB */}
        {tab === "tournaments" && (
          <div className="space-y-6 animate-fade-in">
            {isDokkaebi && (
              <div className="flex justify-end">
                <TournamentCreateDialog channelId={id!} onCreated={loadAll} />
              </div>
            )}
            <TournamentBracket channelId={id!} isDokkaebi={isDokkaebi} />
            <TournamentLeaderboard channelId={id!} />
          </div>
        )}

        {/* MANAGE TAB (Dokkaebi only) */}
        {tab === "manage" && isDokkaebi && (
          <div className="space-y-6 animate-fade-in">
            {/* Create Scenario */}
            <div className="space-y-3">
              <SectionLabel prefix="◈">Issue New Scenario</SectionLabel>
              <div className="rounded-lg border bg-card p-5 space-y-3">
                <input
                  type="text"
                  placeholder="Scenario Title"
                  value={newScenario.title}
                  onChange={(e) => setNewScenario({ ...newScenario, title: e.target.value })}
                  className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <textarea
                  placeholder="Description..."
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  rows={2}
                  className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
                <div className="flex gap-3 flex-wrap items-center">
                  <div className="flex gap-2">
                    {(["main", "sub"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewScenario({ ...newScenario, scenario_type: t, is_mandatory: t === "main" })}
                        className={`font-mono-stat text-[10px] uppercase px-3 py-1.5 rounded border transition-all ${
                          newScenario.scenario_type === t
                            ? t === "main"
                              ? "border-destructive/50 text-destructive bg-destructive/10"
                              : "border-primary/50 text-primary bg-primary/10"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder="XP"
                    value={newScenario.xp_reward}
                    onChange={(e) => setNewScenario({ ...newScenario, xp_reward: parseInt(e.target.value) || 100 })}
                    className="w-20 bg-secondary/50 border rounded px-2 py-1.5 font-mono-stat text-[11px] text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <input
                    type="date"
                    value={newScenario.deadline}
                    onChange={(e) => setNewScenario({ ...newScenario, deadline: e.target.value })}
                    className="bg-secondary/50 border rounded px-2 py-1.5 font-mono-stat text-[11px] text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={createChannelScenario}
                  disabled={creatingScenario || !newScenario.title.trim()}
                  className="font-mono-stat text-[10px]"
                >
                  {creatingScenario ? "Creating..." : "Issue Scenario"}
                </Button>
              </div>
            </div>

            {/* Post Announcement */}
            <div className="space-y-3">
              <SectionLabel prefix="◈">Post Announcement</SectionLabel>
              <div className="rounded-lg border bg-card p-5 space-y-3">
                <textarea
                  placeholder="Write announcement..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  rows={3}
                  className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
                <Button size="sm" onClick={postAnnouncement} disabled={postingAnn || !newAnnouncement.trim()} className="font-mono-stat text-[10px]">
                  {postingAnn ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>

            {/* Active Scenarios Management */}
            <div className="space-y-3">
              <SectionLabel prefix="◈">Active Scenarios</SectionLabel>
              {scenarios.filter((s) => s.status === "active").map((s) => {
                const scenarioProgress = progress.filter((p) => p.channel_scenario_id === s.id);
                const cleared = scenarioProgress.filter((p) => p.status === "cleared").length;
                const total = scenarioProgress.length;
                return (
                  <div key={s.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono-stat text-[9px] uppercase px-1.5 py-0.5 rounded ${
                          s.scenario_type === "main" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"
                        }`}>{s.scenario_type}</span>
                        <span className="font-body text-sm text-foreground">{s.title}</span>
                      </div>
                      <span className="font-mono-stat text-[10px] text-muted-foreground">{cleared}/{total} cleared</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => archiveScenario(s.id)} className="font-mono-stat text-[10px]">Archive</Button>
                  </div>
                );
              })}
            </div>

            {/* Member Management */}
            <div className="space-y-3">
              <SectionLabel prefix="◈">Members ({members.length})</SectionLabel>
              <div className="rounded-lg border bg-card overflow-hidden">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {m.role === "dokkaebi" && <span className="text-primary text-xs">◈</span>}
                      <span className="font-body text-sm text-foreground truncate">{m.username}</span>
                      <span className="font-mono-stat text-[8px] text-muted-foreground uppercase">{m.role}</span>
                    </div>
                    <span className="font-mono-stat text-[10px] text-primary">{m.channel_xp} XP</span>
                    {m.role !== "dokkaebi" && m.user_id !== user?.id && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        className="font-mono-stat text-[9px] text-destructive hover:text-destructive/80 px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelDetail;
