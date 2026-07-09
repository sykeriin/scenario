import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { SystemMessage } from "@/components/ui/SystemMessage";
import { StigmaGiveDialog } from "@/components/StigmaGiveDialog";
import { StigmaDisplay } from "@/components/StigmaDisplay";
import { getStigmaIcon } from "@/lib/stigmaTypes";
import { getRegressionBadge } from "@/lib/regressionRewards";
import { RegressionLeaderboard } from "@/components/RegressionLeaderboard";
import { DuelChallengeDialog } from "@/components/DuelChallengeDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type LifePath = Tables<"life_paths">;

interface ShadowEntry {
  shadow_name: string;
  shadow_title: string;
  shadow_xp: number;
  user_id: string;
}

const FILTERS = ["Overall", "Academic", "Career", "Skills"];

const Lobby = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<(Profile & { scenario_count?: number; path_title?: string | null })[]>([]);
  const [myCollege, setMyCollege] = useState<string | null>(null);
  const [filter, setFilter] = useState("Overall");
  const [lobbyTab, setLobbyTab] = useState<"xp" | "regression">("xp");
  const [loading, setLoading] = useState(true);
  const [myActiveConstellation, setMyActiveConstellation] = useState<string | null>(null);
  const [myMentorId, setMyMentorId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; subtitle: string } | null>(null);
  const [stigmaTarget, setStigmaTarget] = useState<{ id: string; name: string } | null>(null);
  const [topStigmas, setTopStigmas] = useState<Record<string, string>>({});
  const [shadowSelves, setShadowSelves] = useState<ShadowEntry[]>([]);
  const [duelTarget, setDuelTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: myProfile } = await dataClient.from("profiles").select("*").eq("id", user.id).single();
      const college = myProfile?.college;
      setMyCollege(college ?? null);

      let query = dataClient.from("profiles").select("*").order("total_xp", { ascending: false });
      if (college) query = query.eq("college", college);
      const { data: allProfiles } = await query;

      const profilesList = allProfiles ?? [];
      const userIds = profilesList.map((p) => p.id);

      if (userIds.length > 0) {
        const { data: scenarios } = await dataClient
          .from("scenarios")
          .select("user_id, status")
          .in("user_id", userIds);

        const countMap: Record<string, number> = {};
        (scenarios ?? []).forEach((s) => {
          if (s.user_id) countMap[s.user_id] = (countMap[s.user_id] ?? 0) + 1;
        });

        // Fetch life paths for all users
        const { data: lifePaths } = await dataClient
          .from("life_paths")
          .select("user_id, title")
          .in("user_id", userIds)
          .eq("status", "active");

        const pathMap: Record<string, string> = {};
        (lifePaths ?? []).forEach((lp) => {
          if (lp.user_id) pathMap[lp.user_id] = lp.title;
        });

        setProfiles(profilesList.map((p) => ({ ...p, scenario_count: countMap[p.id] ?? 0, path_title: pathMap[p.id] ?? null })));
      } else {
        setProfiles([]);
      }

      // Check my active constellation status
      const { data: mentoring } = await dataClient
        .from("constellations")
        .select("mentee_id")
        .eq("mentor_id", user.id)
        .eq("active", true)
        .maybeSingle();
      setMyActiveConstellation(mentoring?.mentee_id ?? null);

      const { data: beingMentored } = await dataClient
        .from("constellations")
        .select("mentor_id")
        .eq("mentee_id", user.id)
        .eq("active", true)
        .maybeSingle();
      setMyMentorId(beingMentored?.mentor_id ?? null);

      // Fetch top stigma per user
      const { data: allStigmas } = await dataClient
        .from("stigma_marks")
        .select("receiver_id, stigma_type");
      
      if (allStigmas && allStigmas.length > 0) {
        const stigmaCounts: Record<string, Record<string, number>> = {};
        (allStigmas as any[]).forEach((s) => {
          if (!stigmaCounts[s.receiver_id]) stigmaCounts[s.receiver_id] = {};
          stigmaCounts[s.receiver_id][s.stigma_type] = (stigmaCounts[s.receiver_id][s.stigma_type] ?? 0) + 1;
        });
        const topMap: Record<string, string> = {};
        Object.entries(stigmaCounts).forEach(([uid, counts]) => {
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          if (sorted[0]) topMap[uid] = sorted[0][0];
        });
        setTopStigmas(topMap);
      }

      // Fetch shadow selves for lobby display
      const { data: shadows } = await dataClient
        .from("shadow_selves")
        .select("shadow_name, shadow_title, shadow_xp, user_id");
      setShadowSelves((shadows ?? []) as any);

      setLoading(false);
    };

    load();
  }, [user]);

  const becomeConstellation = async (menteeId: string) => {
    if (!user || myActiveConstellation) return;

    // Check if mentee already has an active constellation
    const { data: existing } = await dataClient
      .from("constellations")
      .select("id")
      .eq("mentee_id", menteeId)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      setNotification({ title: "Failed", subtitle: "This reader already has a Constellation." });
      return;
    }

    const { error } = await dataClient.from("constellations").insert({
      mentor_id: user.id,
      mentee_id: menteeId,
      active: true,
    });

    if (!error) {
      setMyActiveConstellation(menteeId);
      const mentee = profiles.find((p) => p.id === menteeId);
      setNotification({
        title: "Constellation Formed",
        subtitle: `You are now guiding ${mentee?.display_name || mentee?.username || "a reader"}.`,
      });
    }
  };

  const memberCount = profiles.length;

  return (
    <div className="min-h-screen bg-background">
      {duelTarget && (
        <DuelChallengeDialog
          opponentId={duelTarget.id}
          opponentName={duelTarget.name}
          onClose={() => setDuelTarget(null)}
          onSent={() => {
            setDuelTarget(null);
            setNotification({ title: "DUEL SENT", subtitle: `Your challenge has been delivered. Await their response.` });
          }}
        />
      )}

      {stigmaTarget && (
        <StigmaGiveDialog
          receiverId={stigmaTarget.id}
          receiverName={stigmaTarget.name}
          onClose={() => setStigmaTarget(null)}
        />
      )}

      {notification && (
        <SystemMessage
          title={notification.title}
          subtitle={notification.subtitle}
          rarity="epic"
          onDismiss={() => setNotification(null)}
        />
      )}

      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">
            {myCollege || "Global"} Lobby
          </h1>
          <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest">
            ◆ {memberCount} {memberCount === 1 ? "MEMBER" : "MEMBERS"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setLobbyTab("xp")}
            className={`font-mono-stat text-[10px] uppercase tracking-wider px-4 py-2 rounded-full border transition-all ${
              lobbyTab === "xp"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            ◆ XP Leaderboard
          </button>
          <button
            onClick={() => setLobbyTab("regression")}
            className={`font-mono-stat text-[10px] uppercase tracking-wider px-4 py-2 rounded-full border transition-all`}
            style={
              lobbyTab === "regression"
                ? { background: "hsl(0 70% 50%)", color: "white", borderColor: "hsl(0 70% 50%)" }
                : undefined
            }
          >
            ↺ Resilience Rank
          </button>
        </div>

        {lobbyTab === "regression" ? (
          <RegressionLeaderboard />
        ) : (
        <>
        <div className="flex justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono-stat text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center font-mono-stat text-sm text-muted-foreground animate-pulse mt-12">◈ LOADING LEADERBOARD...</p>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-cinzel text-lg text-muted-foreground">No members yet</p>
            <p className="font-body text-sm text-muted-foreground mt-2">Be the first to join!</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b bg-secondary/30">
              <span className="col-span-1 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">#</span>
              <span className="col-span-3 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Reader</span>
              <span className="col-span-2 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Title</span>
              <span className="col-span-2 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground text-right">XP</span>
              <span className="col-span-1 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground text-right">Scen</span>
              <span className="col-span-3 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground text-right">Constellation</span>
            </div>

            {profiles.map((p, i) => {
              const isMe = p.id === user?.id;
              const isMentoring = myActiveConstellation === p.id;
              const isMyMentor = myMentorId === p.id;
              const canMentor = !isMe && !myActiveConstellation && p.id !== myMentorId;
              const myShadow = isMe ? shadowSelves.find((s) => s.user_id === p.id) : null;

              return (
                <div key={p.id}>
                  {/* Shadow Ghost Entry — rendered directly above the real user */}
                  {myShadow && (
                    <div
                      className="grid grid-cols-12 gap-2 px-4 py-3 border-b"
                      style={{
                        opacity: 0.45,
                        filter: "blur(0.3px)",
                        background: "linear-gradient(90deg, hsl(0 70% 45% / 0.04), transparent)",
                      }}
                    >
                      <span className="col-span-1 font-mono-stat text-xs text-muted-foreground">—</span>
                      <div className="col-span-3">
                        <span className="font-body text-sm italic" style={{ textShadow: "0 0 6px hsl(0 70% 45% / 0.3)" }}>
                          {myShadow.shadow_name}
                        </span>
                        <div className="font-mono-stat text-[8px] uppercase tracking-wider" style={{ color: "hsl(0 70% 55%)" }}>
                          ◈ SHADOW
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-mono-stat text-[10px] text-muted-foreground italic truncate block">
                          {myShadow.shadow_title}
                        </span>
                      </div>
                      <span className="col-span-2 font-mono-stat text-xs text-right font-semibold italic" style={{ color: "hsl(0 70% 55% / 0.7)" }}>
                        {myShadow.shadow_xp.toLocaleString()}
                      </span>
                      <span className="col-span-1 font-mono-stat text-xs text-muted-foreground text-right">—</span>
                      <div className="col-span-3" />
                    </div>
                  )}

                  {/* Real user entry */}
                  <div
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 transition-colors ${
                      isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-secondary/20"
                    }`}
                  >
                    <span className={`col-span-1 font-mono-stat text-xs ${i < 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {i === 0 ? "👑" : i + 1}
                    </span>
                    <div className="col-span-3">
                      <span className={`font-body text-sm ${isMe ? "text-primary font-semibold" : ""}`}>
                        {isMyMentor && <span className="text-primary mr-1">✦</span>}
                        {p.display_name || p.username}
                      </span>
                      {isMe && <span className="font-mono-stat text-[8px] text-primary ml-1">(YOU)</span>}
                      {getRegressionBadge(p.regression_count ?? 0) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1 text-xs cursor-help transition-transform hover:animate-spin" style={{ color: "hsl(0 70% 50%)" }}>↺</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono-stat text-xs">Has regressed {p.regression_count} times. Still here.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <div className="font-mono-stat text-[9px] text-muted-foreground truncate">
                        {p.path_title ? `Path: ${p.path_title}` : "Path: Undefined"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="font-mono-stat text-[10px] text-muted-foreground truncate block">
                        {p.current_title ?? "Nameless Reader"}
                      </span>
                      {topStigmas[p.id] && (
                        <span className="font-mono-stat text-[8px] text-primary/70">
                          {getStigmaIcon(topStigmas[p.id])} {topStigmas[p.id]}
                        </span>
                      )}
                    </div>
                    <span className="col-span-2 font-mono-stat text-xs text-primary text-right font-semibold">
                      {p.total_xp ?? 0}
                    </span>
                    <span className="col-span-1 font-mono-stat text-xs text-muted-foreground text-right">
                      {p.scenario_count ?? 0}
                    </span>
                    <div className="col-span-3 flex justify-end items-center gap-1">
                      {!isMe && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDuelTarget({ id: p.id, name: p.display_name || p.username })}
                            className="font-mono-stat text-[9px] h-6 px-2 hover:text-foreground"
                            style={{ color: "hsl(0 70% 55%)" }}
                          >
                            ⚔ Duel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStigmaTarget({ id: p.id, name: p.display_name || p.username })}
                            className="font-mono-stat text-[9px] h-6 px-2 text-primary/70 hover:text-primary"
                          >
                            ◈ Stigma
                          </Button>
                        </>
                      )}
                      {isMentoring ? (
                        <span className="font-mono-stat text-[9px] text-primary">✦ Mentee</span>
                      ) : isMyMentor ? (
                        <span className="font-mono-stat text-[9px] text-primary">✦ Mentor</span>
                      ) : canMentor ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => becomeConstellation(p.id)}
                          className="font-mono-stat text-[9px] h-6 px-2"
                        >
                          ✦ Guide
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm z-50">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", path: "/dashboard", icon: "🏠" },
            { label: "Quests", path: "/scenarios", icon: "⚔️" },
            { label: "Stats", path: "/stats", icon: "📊" },
            { label: "Lobby", path: "/lobby", icon: "🏛️" },
          ].map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="text-lg">{t.icon}</span>
              <span className="font-mono-stat text-[9px] uppercase">{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
