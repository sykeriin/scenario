import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { SystemMessage } from "@/components/ui/SystemMessage";

const MEMBER_COLORS = [
  "hsl(var(--primary))",
  "hsl(210 70% 55%)",
  "hsl(140 60% 45%)",
  "hsl(35 90% 55%)",
];

interface PartyInfo {
  id: string;
  name: string;
  leader_id: string;
  max_members: number;
  status: string;
}

interface Member {
  user_id: string;
  role: string;
  username: string;
}

interface Stage {
  id: string;
  title: string;
  order_index: number;
  status: string | null;
  scenario_id: string | null;
}

interface Assignment {
  stage_id: string;
  assigned_to_user_id: string;
}

const PartyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [scenarios, setScenarios] = useState<{ id: string; scenario_id: string; title: string }[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activePartyScenarioId, setActivePartyScenarioId] = useState<string | null>(null);
  const [userScenarios, setUserScenarios] = useState<{ id: string; title: string }[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; subtitle: string; rarity: "common" | "epic" | "legendary" } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; user_id: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);

  const isLeader = party?.leader_id === user?.id;

  useEffect(() => {
    if (!id || !user) return;
    loadParty();
  }, [id, user]);

  const loadParty = async () => {
    if (!id || !user) return;

    const { data: partyData } = await dataClient.from("parties").select("*").eq("id", id).single();
    if (!partyData) return;
    setParty(partyData as PartyInfo);

    // Members
    const { data: memberRows } = await dataClient.from("party_members").select("user_id, role").eq("party_id", id);
    const userIds = (memberRows ?? []).map((m) => m.user_id);

    if (userIds.length > 0) {
      const { data: profiles } = await dataClient.from("profiles").select("id, username, display_name").in("id", userIds);
      setMembers(
        (memberRows ?? []).map((m) => {
          const p = (profiles ?? []).find((pr) => pr.id === m.user_id);
          return { user_id: m.user_id, role: m.role, username: p?.display_name || p?.username || "Unknown" };
        })
      );
    }

    // Party scenarios
    const { data: partyScenarios } = await dataClient.from("party_scenarios").select("id, scenario_id").eq("party_id", id);
    if (partyScenarios && partyScenarios.length > 0) {
      const scenarioIds = partyScenarios.map((ps) => ps.scenario_id);
      const { data: scenarioData } = await dataClient.from("scenarios").select("id, title").in("id", scenarioIds);

      setScenarios(
        partyScenarios.map((ps) => {
          const s = (scenarioData ?? []).find((sc) => sc.id === ps.scenario_id);
          return { id: ps.id, scenario_id: ps.scenario_id, title: s?.title ?? "Unknown" };
        })
      );

      // Load stages + assignments for first party scenario
      const firstPS = partyScenarios[0];
      setActivePartyScenarioId(firstPS.id);

      const { data: stageData } = await dataClient
        .from("stages")
        .select("*")
        .eq("scenario_id", firstPS.scenario_id)
        .order("order_index");
      setStages((stageData ?? []) as Stage[]);

      const { data: assignData } = await dataClient
        .from("party_stage_assignments")
        .select("stage_id, assigned_to_user_id")
        .eq("party_scenario_id", firstPS.id);
      setAssignments((assignData ?? []) as Assignment[]);
    }

    // Load user's scenarios for assignment
    if (partyData.leader_id === user.id) {
      const { data: myScenarios } = await dataClient
        .from("scenarios")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      setUserScenarios(myScenarios ?? []);
    }

    // Chat
    const { data: msgs } = await dataClient
      .from("party_messages")
      .select("*")
      .eq("party_id", id)
      .order("created_at", { ascending: true })
      .limit(50);
    setChatMessages((msgs ?? []) as any);

    setLoading(false);
  };

  const addScenarioToParty = async () => {
    if (!selectedScenario || !id || !activePartyScenarioId) return;

    await dataClient.from("party_scenarios").insert({
      party_id: id,
      scenario_id: selectedScenario,
    });

    // Activate party
    await dataClient.from("parties").update({ status: "active" }).eq("id", id);

    setNotification({ title: "SCENARIO ASSIGNED", subtitle: "The party's mission has begun.", rarity: "epic" });
    loadParty();
  };

  const assignStage = async (stageId: string, userId: string) => {
    if (!activePartyScenarioId) return;

    const existing = assignments.find((a) => a.stage_id === stageId);
    if (existing) {
      await dataClient
        .from("party_stage_assignments")
        .update({ assigned_to_user_id: userId })
        .eq("party_scenario_id", activePartyScenarioId)
        .eq("stage_id", stageId);
    } else {
      await dataClient.from("party_stage_assignments").insert({
        party_scenario_id: activePartyScenarioId,
        stage_id: stageId,
        assigned_to_user_id: userId,
      });
    }

    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.stage_id !== stageId);
      return [...filtered, { stage_id: stageId, assigned_to_user_id: userId }];
    });
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !id) return;
    await dataClient.from("party_messages").insert({
      party_id: id,
      user_id: user.id,
      content: chatInput.trim(),
    });
    setChatInput("");
    // Reload chat
    const { data: msgs } = await dataClient
      .from("party_messages")
      .select("*")
      .eq("party_id", id)
      .order("created_at", { ascending: true })
      .limit(50);
    setChatMessages((msgs ?? []) as any);
  };

  const getMemberColor = (userId: string) => {
    const idx = members.findIndex((m) => m.user_id === userId);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  };

  const getMemberName = (userId: string) => {
    return members.find((m) => m.user_id === userId)?.username ?? "Unknown";
  };

  const clearedStages = stages.filter((s) => s.status === "cleared").length;
  const totalStages = stages.length;
  const overallProgress = totalStages > 0 ? Math.round((clearedStages / totalStages) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING PARTY...</p>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-mono-stat text-sm text-muted-foreground">Party not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {notification && (
        <SystemMessage title={notification.title} subtitle={notification.subtitle} rarity={notification.rarity} onDismiss={() => setNotification(null)} />
      )}

      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">SCENARIO</Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Party Header */}
        <div className="text-center space-y-2">
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">{party.name}</h1>
          <div className="font-mono-stat text-[10px] text-muted-foreground tracking-widest uppercase">
            ◆ {party.status} · {members.length}/{party.max_members} members
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex justify-center gap-3">
          {members.map((m, i) => (
            <div key={m.user_id} className="text-center">
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white mx-auto"
                style={{
                  background: MEMBER_COLORS[i % MEMBER_COLORS.length],
                  borderColor: m.role === "leader" ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
              >
                {m.username.charAt(0).toUpperCase()}
              </div>
              <div className="font-mono-stat text-[8px] mt-1 truncate max-w-[60px]">{m.username}</div>
              {m.role === "leader" && <div className="font-mono-stat text-[7px] text-primary">★ LEADER</div>}
            </div>
          ))}
        </div>

        {/* Overall Progress */}
        {totalStages > 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <SectionLabel prefix="◆">Party Progress</SectionLabel>
            <GlowingProgress value={clearedStages} max={totalStages} />
            <div className="font-mono-stat text-[10px] text-center text-muted-foreground">
              {clearedStages}/{totalStages} stages cleared · {overallProgress}%
            </div>
          </div>
        )}

        {/* Scenario Assignment (Leader only, if no scenario yet) */}
        {isLeader && scenarios.length === 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <SectionLabel prefix="⚔">Assign Scenario</SectionLabel>
            <p className="font-body text-xs text-muted-foreground">Select a scenario for the party to tackle together.</p>
            <select
              value={selectedScenario ?? ""}
              onChange={(e) => setSelectedScenario(e.target.value || null)}
              className="w-full rounded-md border bg-background px-3 py-2 font-body text-sm"
            >
              <option value="">Choose scenario...</option>
              {userScenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <Button size="sm" disabled={!selectedScenario} onClick={addScenarioToParty} className="w-full font-mono-stat text-[10px]">
              ◆ Begin Mission
            </Button>
          </div>
        )}

        {/* Stage Assignment Timeline */}
        {stages.length > 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <SectionLabel prefix="◈">Stage Assignments</SectionLabel>
            <div className="space-y-2">
              {stages.map((stage) => {
                const assignment = assignments.find((a) => a.stage_id === stage.id);
                const assignedUser = assignment ? getMemberName(assignment.assigned_to_user_id) : null;
                const assignedColor = assignment ? getMemberColor(assignment.assigned_to_user_id) : undefined;
                const statusIcon = stage.status === "cleared" ? "✓" : stage.status === "active" ? "⟳" : "🔒";

                return (
                  <div
                    key={stage.id}
                    className="flex items-center gap-3 p-3 rounded-md border"
                    style={assignedColor ? { borderLeftWidth: 3, borderLeftColor: assignedColor } : undefined}
                  >
                    <span className="font-mono-stat text-xs shrink-0">{statusIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-sm truncate">{stage.title}</div>
                      {assignedUser ? (
                        <div className="font-mono-stat text-[8px] truncate" style={{ color: assignedColor }}>
                          Assigned to {assignedUser}
                        </div>
                      ) : (
                        <div className="font-mono-stat text-[8px] text-muted-foreground">Unassigned</div>
                      )}
                    </div>
                    {isLeader && (
                      <select
                        value={assignment?.assigned_to_user_id ?? ""}
                        onChange={(e) => e.target.value && assignStage(stage.id, e.target.value)}
                        className="rounded border bg-background px-2 py-1 font-mono-stat text-[9px] shrink-0"
                      >
                        <option value="">Assign...</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.username}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Party Chat */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <SectionLabel prefix="💬">Party Chat</SectionLabel>
          <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded border bg-background">
            {chatMessages.length === 0 ? (
              <p className="font-body text-xs text-muted-foreground text-center py-4">No messages yet. Say something.</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <span className="font-mono-stat text-[9px] font-bold shrink-0" style={{ color: getMemberColor(msg.user_id) }}>
                    {getMemberName(msg.user_id)}:
                  </span>
                  <span className="font-body text-xs">{msg.content}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 rounded-md border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={500}
            />
            <Button size="sm" onClick={sendMessage} disabled={!chatInput.trim()} className="font-mono-stat text-[9px]">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyDetail;
