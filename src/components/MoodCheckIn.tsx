import { useState } from "react";
import { dataClient } from "@/lib/data-client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { emitPathSignal } from "@/lib/pathSignals";

interface MoodCheckInProps {
  onComplete: () => void;
}

const EMOTION_TAGS: Record<string, string[]> = {
  positive: ["motivated", "excited", "focused", "grateful", "confident", "calm"],
  negative: ["anxious", "drained", "stuck", "overwhelmed", "frustrated", "lonely"],
  neutral: ["reflective", "restless", "numb", "uncertain"],
};

function inferTags(text: string, mood: number, energy: number): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  const keywords: Record<string, string> = {
    anxious: "anxious", anxiety: "anxious", worried: "anxious", nervous: "anxious",
    tired: "drained", exhausted: "drained", burnt: "drained", fatigue: "drained",
    stuck: "stuck", lost: "stuck", confused: "stuck", "don't know": "stuck",
    excited: "excited", pumped: "excited", hyped: "excited",
    focused: "focused", flow: "focused", locked: "focused", productive: "focused",
    motivated: "motivated", driven: "motivated", ready: "motivated",
    calm: "calm", peaceful: "calm", relaxed: "calm",
    overwhelmed: "overwhelmed", "too much": "overwhelmed",
    frustrated: "frustrated", angry: "frustrated", annoyed: "frustrated",
    grateful: "grateful", thankful: "grateful",
    lonely: "lonely", alone: "lonely",
    restless: "restless", bored: "restless",
  };

  for (const [word, tag] of Object.entries(keywords)) {
    if (lower.includes(word) && !tags.includes(tag)) tags.push(tag);
  }

  // Infer from scores if no text tags
  if (tags.length === 0) {
    if (mood >= 7 && energy >= 7) tags.push("motivated");
    else if (mood >= 7 && energy < 5) tags.push("calm");
    else if (mood < 4 && energy < 4) tags.push("drained");
    else if (mood < 4 && energy >= 6) tags.push("restless");
    else if (mood >= 5) tags.push("reflective");
    else tags.push("uncertain");
  }

  return tags.slice(0, 4);
}

export function MoodCheckIn({ onComplete }: MoodCheckInProps) {
  const { user } = useAuth();
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [oneLine, setOneLine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);

    const tags = inferTags(oneLine, mood, energy);

    const { error } = await dataClient.from("emotion_logs").insert({
      user_id: user.id,
      mood_score: mood,
      energy_score: energy,
      one_line: oneLine.trim() || null,
      ai_tags: tags,
    } as any);

    if (!error) {
      // Emit path signal for low mood
      if (mood <= 4) {
        await emitPathSignal(user.id, "stat_gain", {
          type: "low_mood_log",
          mood_score: mood,
          energy_score: energy,
          tags,
        });
      }
      onComplete();
    }
    setSubmitting(false);
  };

  const moodLabel = mood <= 3 ? "Struggling" : mood <= 5 ? "Okay" : mood <= 7 ? "Good" : "Great";
  const energyLabel = energy <= 3 ? "Low" : energy <= 5 ? "Moderate" : energy <= 7 ? "High" : "Charged";

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in" style={{ borderLeftColor: "hsl(var(--theme-green))", borderLeftWidth: 3 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-cinzel text-sm tracking-wider text-foreground">How are you feeling?</h3>
        <button onClick={onComplete} className="font-mono-stat text-[9px] text-muted-foreground hover:text-foreground">
          skip
        </button>
      </div>

      <div className="space-y-4">
        {/* Mood Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-mono-stat text-[10px] text-muted-foreground uppercase tracking-wider">Mood</span>
            <span className="font-mono-stat text-[10px] text-foreground">{mood}/10 · {moodLabel}</span>
          </div>
          <Slider
            value={[mood]}
            onValueChange={(v) => setMood(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* Energy Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-mono-stat text-[10px] text-muted-foreground uppercase tracking-wider">Energy</span>
            <span className="font-mono-stat text-[10px] text-foreground">{energy}/10 · {energyLabel}</span>
          </div>
          <Slider
            value={[energy]}
            onValueChange={(v) => setEnergy(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* One Line */}
        <div>
          <input
            type="text"
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value.slice(0, 120))}
            placeholder="One line. What's on your mind?"
            className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="font-mono-stat text-[9px] text-muted-foreground mt-1 block text-right">
            {oneLine.length}/120
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="sm"
          className="w-full font-mono-stat text-[11px] tracking-wider"
        >
          {submitting ? "Logging..." : "Log Feeling"}
        </Button>
      </div>
    </div>
  );
}
