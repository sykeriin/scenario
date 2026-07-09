import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { SystemMessage } from "@/components/ui/SystemMessage";
import { getGradeInfo, getGradeBadgeStyle } from "@/lib/constellationGrades";

interface ConstellationData {
  id: string;
  mentor_id: string;
  mentee_id: string;
  active: boolean;
  created_at: string | null;
  mentor_name?: string;
  mentee_name?: string;
}

interface MenteeScenario {
  title: string;
  status: string | null;
  category: string | null;
}

export const ConstellationWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [asMentor, setAsMentor] = useState<ConstellationData | null>(null);
  const [asMentee, setAsMentee] = useState<ConstellationData | null>(null);
  const [menteeScenarios, setMenteeScenarios] = useState<MenteeScenario[]>([]);
  const [stigmaMessage, setStigmaMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [titleNotif, setTitleNotif] = useState<{ title: string; subtitle: string } | null>(null);
  const [recentBoosts, setRecentBoosts] = useState<{ message: string; xp_granted: number; created_at: string | null }[]>([]);
  const [mentorGrade, setMentorGrade] = useState<string>("Low Grade");
  const [mentorStories, setMentorStories] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get active constellation where I'm a mentor
      const { data: mentorData } = await dataClient
        .from("constellations")
        .select("*")
        .eq("mentor_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      // Get active constellation where I'm a mentee
      const { data: menteeData } = await dataClient
        .from("constellations")
        .select("*")
        .eq("mentee_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (mentorData) {
        const { data: menteeProfile } = await dataClient
          .from("profiles")
          .select("display_name, username")
          .eq("id", mentorData.mentee_id)
          .single();
        setAsMentor({
          ...mentorData,
          mentee_name: menteeProfile?.display_name || menteeProfile?.username || "Unknown",
        });

        // Load own grade info
        const { data: myProfile } = await dataClient
          .from("profiles")
          .select("constellation_grade, constellation_stories")
          .eq("id", user.id)
          .single();
        if (myProfile) {
          setMentorGrade((myProfile as any).constellation_grade ?? "Low Grade");
          setMentorStories((myProfile as any).constellation_stories ?? 0);
        }

        // Load mentee's scenarios
        const { data: scenarios } = await dataClient
          .from("scenarios")
          .select("title, status, category")
          .eq("user_id", mentorData.mentee_id)
          .order("created_at", { ascending: false })
          .limit(5);
        setMenteeScenarios(scenarios ?? []);
      }

      if (menteeData) {
        const { data: mentorProfile } = await dataClient
          .from("profiles")
          .select("display_name, username")
          .eq("id", menteeData.mentor_id)
          .single();
        setAsMentee({
          ...menteeData,
          mentor_name: mentorProfile?.display_name || mentorProfile?.username || "Unknown",
        });

        // Load recent stigma boosts for me
        const { data: boosts } = await dataClient
          .from("stigma_boosts")
          .select("message, xp_granted, created_at")
          .eq("mentee_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);
        setRecentBoosts(boosts ?? []);
      }
    };

    load();
  }, [user]);

  const sendStigma = async () => {
    if (!asMentor || !user || !stigmaMessage.trim()) return;
    setSending(true);

    try {
      // Insert stigma boost
      await dataClient.from("stigma_boosts").insert({
        constellation_id: asMentor.id,
        mentor_id: user.id,
        mentee_id: asMentor.mentee_id,
        message: stigmaMessage.trim(),
        xp_granted: 50,
      });

      // Grant XP to mentee
      // Grant XP to mentee via server-side RPC
      await dataClient.rpc("add_xp", {
        user_id_param: asMentor.mentee_id,
        amount: 50,
        source: `stigma:${asMentor.id}`,
      });

      setStigmaMessage("");
      setTitleNotif({ title: "Stigma Sent", subtitle: `+50 XP granted to ${asMentor.mentee_name}` });
    } catch (e) {
      console.error("Stigma send error:", e);
    }
    setSending(false);
  };

  const deactivate = async () => {
    if (!asMentor) return;
    await dataClient.from("constellations").update({ active: false }).eq("id", asMentor.id);
    setAsMentor(null);
    setMenteeScenarios([]);
  };

  if (!asMentor && !asMentee) return null;

  return (
    <>
      {titleNotif && (
        <SystemMessage
          title={titleNotif.title}
          subtitle={titleNotif.subtitle}
          rarity="rare"
          onDismiss={() => setTitleNotif(null)}
        />
      )}

      {/* As Mentee — show my Constellation */}
      {asMentee && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <SectionLabel prefix="✦">My Constellation</SectionLabel>
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/constellation/${asMentee.mentor_id}`)}
          >
            <span className="text-2xl">✦</span>
            <div>
              <p className="font-cinzel text-sm font-bold text-primary">
                {asMentee.mentor_name}
              </p>
              <p className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
                Guiding Constellation · View Profile →
              </p>
            </div>
          </div>

          {recentBoosts.length > 0 && (
            <div className="space-y-2 mt-2">
              <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
                Recent Stigma
              </span>
              {recentBoosts.map((b, i) => (
                <div key={i} className="p-2 rounded border bg-secondary/30 space-y-1">
                  <p className="font-body text-xs italic text-foreground">"{b.message}"</p>
                  <span className="font-mono-stat text-[9px] text-primary">+{b.xp_granted} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* As Mentor — show mentee progress + stigma form */}
      {asMentor && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel prefix="◈">Mentee</SectionLabel>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/constellation/${user?.id}`)}
                className="font-mono-stat text-[9px] hover:underline"
                style={{ color: getGradeInfo(mentorGrade).color }}
              >
                {mentorGrade} · {mentorStories.toLocaleString()} Stories
              </button>
              <button
                onClick={deactivate}
                className="font-mono-stat text-[9px] text-destructive hover:underline"
              >
                Release
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <p className="font-cinzel text-sm font-bold">{asMentor.mentee_name}</p>
          </div>

          {/* Mentee scenarios */}
          {menteeScenarios.length > 0 && (
            <div className="space-y-1">
              <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
                Their Scenarios
              </span>
              {menteeScenarios.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border bg-secondary/20">
                  <span className="font-body text-xs truncate">{s.title}</span>
                  <span className={`font-mono-stat text-[9px] uppercase ${
                    s.status === "completed" ? "text-primary" : s.status === "failed" ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stigma boost form */}
          <div className="space-y-2 pt-2 border-t">
            <span className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
              Send Stigma (+50 XP)
            </span>
            <textarea
              value={stigmaMessage}
              onChange={(e) => setStigmaMessage(e.target.value)}
              placeholder="Write an encouraging message..."
              className="w-full bg-secondary/30 border rounded p-2 text-xs font-body placeholder:text-muted-foreground resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={200}
            />
            <Button
              size="sm"
              onClick={sendStigma}
              disabled={sending || !stigmaMessage.trim()}
              className="w-full font-mono-stat text-[10px] tracking-wider"
            >
              {sending ? "Sending..." : "◆ Send Stigma"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
