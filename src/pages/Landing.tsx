import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Radial glow behind title */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "hsl(var(--glow))" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-2xl">
        {/* Logo */}
        <h1 className="font-cinzel text-5xl font-bold tracking-[0.15em] sm:text-7xl" style={{ color: "hsl(var(--primary))" }}>
          SCENARIO
        </h1>

        {/* Dramatic quote */}
        <p className="font-cinzel text-sm tracking-[0.1em] text-muted-foreground sm:text-base italic">
          "The world has changed. Only the prepared survive."
        </p>

        {/* Subtitle */}
        <p className="font-body text-base text-muted-foreground max-w-md">
          Turn your life into clearable Scenarios. Earn XP, build stats, unlock titles, and climb the leaderboard — all powered by AI.
        </p>

        {/* CTA buttons */}
        <div className="flex gap-4 mt-4">
          <Button asChild size="lg" className="font-cinzel tracking-wider glow-accent">
            <Link to="/auth?mode=signup">Begin Your Story</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-cinzel tracking-wider">
            <Link to="/auth?mode=login">Log In</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 w-full">
          {[
            { icon: "⚔️", label: "Scenarios", desc: "AI-generated quests" },
            { icon: "📊", label: "Stats", desc: "Track 6 core attributes" },
            { icon: "🏛️", label: "Lobby", desc: "College leaderboard" },
            { icon: "🤖", label: "AI Tools", desc: "Flashcards & gameplans" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg border bg-card p-4 text-center category-card">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-cinzel text-xs font-semibold tracking-wider">{f.label}</div>
              <div className="font-mono-stat text-[10px] text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <div className="absolute bottom-6 font-mono-stat text-[10px] text-muted-foreground tracking-widest">
        ◈ INSPIRED BY OMNISCIENT READER'S VIEWPOINT
      </div>
    </div>
  );
};

export default Landing;
