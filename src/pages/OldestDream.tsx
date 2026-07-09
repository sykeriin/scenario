import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { dataClient } from "@/lib/data-client";
import { Link } from "react-router-dom";
import { useUniverse } from "@/hooks/useUniverse";
import { Crown, ArrowLeft } from "lucide-react";

interface Seat {
  id: string;
  user_id: string;
  seat_number: number;
  record_score: number;
  total_xp_at_entry: number;
  prestige_level: number;
  constellation_grade: string;
  earned_at: string;
  profiles?: { username: string; current_title: string | null; display_name: string | null };
}

interface HistoryEntry {
  id: string;
  user_id: string;
  seat_number: number;
  held_from: string;
  held_until: string | null;
  profiles?: { username: string; display_name: string | null };
}

const tierLabel = (seat: number, isSl: boolean) => {
  if (isSl) {
    if (seat === 1) return { label: "The Shadow Monarch's Seat", color: "text-[#00b4ff]" };
    if (seat <= 10) return { label: "S-Rank Registry", color: "text-yellow-400" };
    if (seat <= 33) return { label: "A-Rank Registry", color: "text-gray-300" };
    return { label: "Registered Hunters", color: "text-muted-foreground" };
  }
  if (seat <= 10) return { label: "The Named", color: "text-yellow-400" };
  if (seat <= 33) return { label: "The Remembered", color: "text-gray-300" };
  return { label: "The Recorded", color: "text-muted-foreground" };
};

const OldestDream = () => {
  const { user } = useAuth();
  const { t, isSoloLeveling } = useUniverse();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [phase, setPhase] = useState(0); // 0=dark, 1=intro, 2=table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // Fetch seats with profile info
    const { data: seatsData } = await dataClient
      .from("oldest_dream_seats")
      .select("*, profiles(username, current_title, display_name)")
      .eq("is_active", true)
      .order("seat_number", { ascending: true });

    if (seatsData) setSeats(seatsData as any);

    // Fetch history
    const { data: histData } = await dataClient
      .from("oldest_dream_history")
      .select("*, profiles(username, display_name)")
      .order("held_until", { ascending: false })
      .limit(50);

    if (histData) setHistory(histData as any);

    // Get current user's score
    if (user) {
      const { data: scoreData } = await dataClient.rpc("calculate_record_score", { p_user_id: user.id });
      if (scoreData !== null) setMyScore(Number(scoreData));

      // Find rank
      const mySeat = seatsData?.find((s: any) => s.user_id === user.id);
      if (mySeat) {
        setMyRank((mySeat as any).seat_number);
      }
    }

    setLoading(false);
  };

  const handleRecalculate = async () => {
    setLoading(true);
    await dataClient.rpc("recalculate_oldest_dream");
    await fetchData();
  };

  return (
    <div className="oldest-dream-bg min-h-screen relative overflow-hidden">
      {/* Starfield layer */}
      <div className="oldest-dream-stars absolute inset-0 pointer-events-none" />

      {/* Back button */}
      <div className="relative z-10 p-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-yellow-400 transition-colors font-mono-stat text-xs uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Return
        </Link>
      </div>

      {/* Intro */}
      <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-[2000ms] ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
        <div className={`text-center max-w-xl px-6 py-12 transition-all duration-[2000ms] ${phase >= 2 ? "opacity-30 -translate-y-8 scale-95" : "opacity-100"}`}>
          <p className="font-cinzel text-lg md:text-xl text-muted-foreground italic leading-relaxed">
            In the beginning, there was a story.
          </p>
          <p className="font-cinzel text-lg md:text-xl text-muted-foreground italic leading-relaxed mt-3">
            And those who lived it most completely
          </p>
          <p className="font-cinzel text-lg md:text-xl text-muted-foreground italic leading-relaxed mt-3">
            earned the right to be remembered.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 max-w-4xl mx-auto px-4 pb-20 transition-all duration-[1500ms] ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="font-cinzel text-3xl md:text-5xl font-black tracking-[0.15em] text-yellow-400 oldest-dream-title-glow">
            {isSoloLeveling ? 'THE S-RANK REGISTRY' : 'The Oldest Dream'}
          </h1>
          <p className="font-mono-stat text-[10px] uppercase tracking-[0.4em] text-muted-foreground mt-3">
            {isSoloLeveling
              ? '◆ A record of hunters whose achievements cannot be ignored ◆'
              : '◆ The 100 Greatest Protagonists ◆'}
          </p>
        </div>

        {/* My score */}
        {myScore !== null && (
          <div className="text-center mb-8 border border-yellow-400/20 rounded-sm bg-card/30 backdrop-blur-sm p-4">
            <p className="font-mono-stat text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your Record Score</p>
            <p className="font-cinzel text-2xl font-bold text-yellow-400 mt-1">{myScore.toLocaleString()}</p>
            {myRank && (
              <p className="font-mono-stat text-xs text-yellow-400/80 mt-1">Seat #{myRank}</p>
            )}
            {!myRank && seats.length > 0 && (
              <p className="font-mono-stat text-[10px] text-muted-foreground mt-1">Not yet seated in The Oldest Dream</p>
            )}
          </div>
        )}

        {/* Recalculate button */}
        <div className="text-center mb-6">
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground hover:text-yellow-400 transition-colors border border-border hover:border-yellow-400/40 px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {loading ? "◈ Recalculating..." : "◈ Recalculate Rankings"}
          </button>
        </div>

        {/* Seats table */}
        <div className="space-y-0">
          {/* Tier headers rendered inline */}
          {seats.map((seat) => {
            const tier = tierLabel(seat.seat_number, isSoloLeveling);
            const isMe = seat.user_id === user?.id;
            const isFirst = seat.seat_number === 1;
            const showTierHeader = seat.seat_number === 1 || seat.seat_number === 11 || seat.seat_number === 34;
            const prevTier = seat.seat_number === 1 ? null : seat.seat_number === 11 ? "The Named" : seat.seat_number === 34 ? "The Remembered" : null;

            return (
              <div key={seat.id}>
                {showTierHeader && (
                  <div className="flex items-center gap-3 py-3 mt-4 first:mt-0">
                    <div className="h-px flex-1 bg-yellow-400/20" />
                    <span className={`font-cinzel text-sm font-bold tracking-[0.2em] uppercase ${tier.color}`}>
                      {tier.label}
                    </span>
                    <div className="h-px flex-1 bg-yellow-400/20" />
                  </div>
                )}
                <div
                  className={`
                    flex items-center gap-4 px-4 py-3 border-b border-border/30
                    transition-all duration-300
                    ${isMe ? "bg-yellow-400/10 border-yellow-400/30" : "hover:bg-card/30"}
                    ${isFirst ? "oldest-dream-seat-one" : ""}
                  `}
                >
                  {/* Rank */}
                  <div className="w-10 text-right shrink-0">
                    {isFirst ? (
                      <Crown className="w-5 h-5 text-yellow-400 inline-block animate-pulse" />
                    ) : (
                      <span className={`font-cinzel text-lg font-bold ${tier.color}`}>
                        {seat.seat_number}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-cinzel text-base font-bold truncate ${isFirst ? "text-yellow-400" : "text-foreground"}`}>
                      {seat.profiles?.display_name || seat.profiles?.username || "Unknown"}
                    </p>
                    {seat.profiles?.current_title && (
                      <p className="font-mono-stat text-[9px] text-muted-foreground truncate">
                        「{seat.profiles.current_title}」
                      </p>
                    )}
                  </div>

                  {/* Grade badge */}
                  <span className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {seat.constellation_grade}
                  </span>

                  {/* Score */}
                  <div className="text-right shrink-0 w-24">
                    <p className={`font-mono-stat text-sm font-bold ${seat.seat_number <= 10 ? "text-yellow-400" : seat.seat_number <= 33 ? "text-gray-300" : "text-muted-foreground"}`}>
                      {Number(seat.record_score).toLocaleString()}
                    </p>
                    {seat.prestige_level > 0 && (
                      <p className="font-mono-stat text-[9px] text-muted-foreground">
                        P{seat.prestige_level}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {seats.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="font-cinzel text-lg text-muted-foreground italic">
                No protagonists have yet been recorded.
              </p>
              <p className="font-mono-stat text-[10px] text-muted-foreground mt-2">
                The Oldest Dream waits.
              </p>
            </div>
          )}
        </div>

        {/* Hall of History */}
        {history.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border/30" />
              <span className="font-cinzel text-sm tracking-[0.2em] text-muted-foreground uppercase">
                Hall of History
              </span>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            <p className="text-center font-cinzel text-xs text-muted-foreground italic mb-6">
              These were recorded. They are not forgotten.
            </p>

            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-4 px-4 py-2 opacity-60">
                  <span className="font-cinzel text-sm text-muted-foreground w-10 text-right">
                    #{h.seat_number}
                  </span>
                  <span className="font-cinzel text-sm text-muted-foreground flex-1 truncate">
                    {h.profiles?.display_name || h.profiles?.username || "Unknown"}
                  </span>
                  <span className="font-mono-stat text-[9px] text-muted-foreground shrink-0">
                    {h.held_until ? new Date(h.held_until).toLocaleDateString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OldestDream;
