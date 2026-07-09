import { useEffect, useMemo, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { toast } from "sonner";

type Tournament = {
  id: string;
  tournament_name: string;
  scenario_title: string;
  category: string;
  tournament_status: string;
  current_round: number;
  max_participants: number;
  current_participants: number;
  entry_xp_fee: number;
  deadline: string;
};

type Participant = {
  id: string;
  tournament_id: string;
  user_id: string;
  bracket_position: number;
  eliminated_at: string | null;
};

type MatchRow = {
  tournament_id: string;
  round_number: number;
  match_position: number;
  duel_id: string;
};

interface TournamentBracketProps {
  channelId: string;
  isDokkaebi: boolean;
}

export function TournamentBracket({ channelId, isDokkaebi }: TournamentBracketProps) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: tData } = await dataClient
      .from("channel_tournaments")
      .select("id, tournament_name, scenario_title, category, tournament_status, current_round, max_participants, current_participants, entry_xp_fee, deadline")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });

    const tournamentIds = (tData ?? []).map((t) => t.id);

    const [{ data: pData }, { data: mData }] = await Promise.all([
      tournamentIds.length
        ? dataClient.from("tournament_participants").select("id, tournament_id, user_id, bracket_position, eliminated_at").in("tournament_id", tournamentIds)
        : Promise.resolve({ data: [] as any[] }),
      tournamentIds.length
        ? dataClient.from("tournament_matches").select("tournament_id, round_number, match_position, duel_id").in("tournament_id", tournamentIds).order("round_number").order("match_position")
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const ids = [...new Set((pData ?? []).map((p) => p.user_id))];
    const { data: profiles } = ids.length
      ? await dataClient.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };

    const nextNames: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nextNames[p.id] = p.display_name || p.username;
    });

    setTournaments((tData ?? []) as Tournament[]);
    setParticipants((pData ?? []) as Participant[]);
    setMatches((mData ?? []) as MatchRow[]);
    setNames(nextNames);
  };

  useEffect(() => {
    load();
  }, [channelId]);

  const groupedParticipants = useMemo(() => {
    const map: Record<string, Participant[]> = {};
    participants.forEach((p) => {
      if (!map[p.tournament_id]) map[p.tournament_id] = [];
      map[p.tournament_id].push(p);
    });
    Object.values(map).forEach((group) => group.sort((a, b) => a.bracket_position - b.bracket_position));
    return map;
  }, [participants]);

  const groupedMatches = useMemo(() => {
    const map: Record<string, MatchRow[]> = {};
    matches.forEach((m) => {
      if (!map[m.tournament_id]) map[m.tournament_id] = [];
      map[m.tournament_id].push(m);
    });
    return map;
  }, [matches]);

  const joinTournament = async (t: Tournament) => {
    if (!user) return;
    const myProfile = await dataClient.from("profiles").select("total_xp").eq("id", user.id).single();
    if ((myProfile.data?.total_xp ?? 0) < t.entry_xp_fee) {
      toast.error("Not enough XP to join.");
      return;
    }

    const existing = groupedParticipants[t.id] ?? [];
    if (existing.some((p) => p.user_id === user.id)) {
      toast.info("Already joined.");
      return;
    }
    if (existing.length >= t.max_participants) {
      toast.error("Bracket is full.");
      return;
    }

    const bracketPosition = existing.length + 1;

    const { error: joinError } = await dataClient.from("tournament_participants").insert({
      tournament_id: t.id,
      user_id: user.id,
      bracket_position: bracketPosition,
    });
    if (joinError) {
      toast.error(joinError.message);
      return;
    }

    await Promise.all([
      dataClient.rpc("add_xp", { user_id_param: user.id, amount: -t.entry_xp_fee, source: "tournament_entry_fee" }),
      dataClient.from("channel_tournaments").update({ current_participants: existing.length + 1 }).eq("id", t.id),
    ]);

    toast.success("Joined tournament bracket.");
    await load();
  };

  const startTournament = async (t: Tournament) => {
    const players = (groupedParticipants[t.id] ?? []).filter((p) => !p.eliminated_at);
    if (players.length < 2 || (players.length & (players.length - 1)) !== 0) {
      toast.error("Need a power-of-2 bracket (2/4/8/16 players).");
      return;
    }

    const seeded = [...players].sort(() => Math.random() - 0.5);

    const duelRows = [] as any[];
    for (let i = 0; i < seeded.length; i += 2) {
      duelRows.push({
        challenger_id: seeded[i].user_id,
        opponent_id: seeded[i + 1].user_id,
        scenario_title: t.scenario_title,
        category: t.category,
        deadline: t.deadline,
        status: "pending",
        xp_stake: t.entry_xp_fee,
      });
    }

    const { data: createdDuels, error: duelError } = await dataClient.from("duels").insert(duelRows).select("id");
    if (duelError || !createdDuels) {
      toast.error(duelError?.message || "Failed to build first round");
      return;
    }

    const matchRows = createdDuels.map((d, idx) => ({
      tournament_id: t.id,
      duel_id: d.id,
      round_number: 1,
      match_position: idx + 1,
      advancement_position: idx + 1,
    }));

    const bracketSeed = seeded.map((p, idx) => ({ bracket_position: idx + 1, user_id: p.user_id }));

    await Promise.all([
      dataClient.from("tournament_matches").insert(matchRows),
      ...seeded.map((p, idx) =>
        dataClient.from("tournament_participants").update({ bracket_position: idx + 1 }).eq("id", p.id)
      ),
      dataClient
        .from("channel_tournaments")
        .update({ tournament_status: "active", current_round: 1, bracket_structure: bracketSeed })
        .eq("id", t.id),
    ]);

    toast.success("Tournament started. First-round duels are live.");
    await load();
  };

  return (
    <div className="space-y-4">
      {tournaments.length === 0 && <p className="font-body text-sm text-muted-foreground">No tournaments yet.</p>}

      {tournaments.map((t) => {
        const tParticipants = groupedParticipants[t.id] ?? [];
        const tMatches = groupedMatches[t.id] ?? [];
        const iJoined = !!user && tParticipants.some((p) => p.user_id === user.id);

        return (
          <div key={t.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel prefix="⚔">{t.tournament_name}</SectionLabel>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {t.scenario_title} · {t.category} · Entry {t.entry_xp_fee} XP
                </p>
              </div>
              <span className="font-mono-stat text-[10px] uppercase text-primary">{t.tournament_status}</span>
            </div>

            <div className="font-mono-stat text-[10px] text-muted-foreground">
              {tParticipants.length}/{t.max_participants} players · Round {t.current_round}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tParticipants.map((p) => (
                <div key={p.id} className="rounded border bg-background px-2 py-1.5 text-xs flex items-center justify-between">
                  <span className="font-body">#{p.bracket_position} {names[p.user_id] ?? "Reader"}</span>
                  {p.eliminated_at && <span className="font-mono-stat text-[9px] text-muted-foreground">OUT</span>}
                </div>
              ))}
            </div>

            {tMatches.length > 0 && (
              <div className="rounded border bg-background p-2">
                <div className="font-mono-stat text-[9px] uppercase text-muted-foreground mb-2">Bracket Matches</div>
                <div className="space-y-1">
                  {tMatches.map((m) => (
                    <div key={`${m.round_number}-${m.match_position}-${m.duel_id}`} className="text-xs font-body text-foreground">
                      Round {m.round_number} · Match {m.match_position}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {t.tournament_status === "forming" && !iJoined && (
                <Button size="sm" variant="outline" onClick={() => joinTournament(t)} className="font-mono-stat text-[10px]">
                  Join Bracket
                </Button>
              )}
              {t.tournament_status === "forming" && isDokkaebi && (
                <Button size="sm" onClick={() => startTournament(t)} className="font-mono-stat text-[10px]">
                  Start Tournament
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
