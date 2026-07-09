import { useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CATEGORIES = ["Academic", "Skill", "Career", "Social", "Fitness"];

interface SponseeInfo {
  constellationId: string;
  sponseeId: string;
  sponseeName: string;
  lifePathTitle?: string;
  weakStats?: string[];
}

interface IssueConstellationScenarioDialogProps {
  sponsee: SponseeInfo;
  onClose: () => void;
  onIssued?: () => void;
}

interface GeneratedStage {
  title: string;
  xp_reward: number;
  quests: { title: string; type: string; xp_reward: number; description: string }[];
}

interface GeneratedScenario {
  title: string;
  description: string;
  xp_reward: number;
  stages: GeneratedStage[];
}

export function IssueConstellationScenarioDialog({ sponsee, onClose, onIssued }: IssueConstellationScenarioDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [category, setCategory] = useState("Academic");
  const [deadline, setDeadline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedScenario | null>(null);
  const [sending, setSending] = useState(false);

  const handleGenerate = async () => {
    if (!personalNote.trim()) {
      toast.error("Please write a personal note first.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await dataClient.functions.invoke("generate-scenario", {
        body: {
          type: "constellation_scenario",
          category,
          content: `Mentor note: ${personalNote.trim()}\nMentee's Life Path: ${sponsee.lifePathTitle || "Unknown"}\nMentee's weak stats: ${sponsee.weakStats?.join(", ") || "Unknown"}\nCategory: ${category}\nTitle hint: ${title.trim() || "Auto-generate"}`,
        },
      });

      if (error) throw error;
      const result = data?.result;
      if (!result) throw new Error("No result from AI");

      setPreview(result);
      if (!title.trim() && result.title) {
        setTitle(result.title);
      }
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!user || !preview || sending) return;
    setSending(true);
    try {
      // Check active limit (max 3 per sponsee)
      const { data: existing } = await dataClient
        .from("constellation_scenarios")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("sponsee_id", sponsee.sponseeId)
        .in("status", ["pending_acceptance", "active"]);

      if (existing && existing.length >= 3) {
        toast.error("Max 3 active scenarios per sponsee.");
        setSending(false);
        return;
      }

      const { error } = await dataClient.from("constellation_scenarios").insert({
        constellation_id: sponsee.constellationId,
        mentor_id: user.id,
        sponsee_id: sponsee.sponseeId,
        title: title.trim() || preview.title,
        description: preview.description,
        personal_note: personalNote.trim(),
        category,
        stages: preview.stages as any,
        xp_reward: Math.round(preview.xp_reward * 1.25), // 1.25x multiplier
        deadline: deadline || null,
        status: "pending_acceptance",
      } as any);

      if (error) throw error;

      toast.success(`Scenario issued to ${sponsee.sponseeName}!`);
      onIssued?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to issue scenario");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border rounded-lg p-6 max-w-lg w-full mx-4 space-y-4 animate-fade-in max-h-[85vh] overflow-y-auto"
        style={{ borderColor: "hsl(45 90% 55% / 0.3)", boxShadow: "0 0 40px hsl(45 90% 55% / 0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h2 className="font-cinzel text-lg font-bold" style={{ color: "hsl(45 90% 55%)" }}>
            ✦ Issue Personal Scenario
          </h2>
          <p className="font-mono-stat text-[10px] text-muted-foreground mt-1">
            To: {sponsee.sponseeName}
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave blank to auto-generate"
            className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 mt-1"
          />
        </div>

        {/* Personal Note */}
        <div>
          <label className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">
            Why I'm giving you this (shown to sponsee)
          </label>
          <textarea
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value.slice(0, 200))}
            placeholder="Your personal message to your sponsee..."
            rows={3}
            className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none mt-1"
          />
          <span className="font-mono-stat text-[8px] text-muted-foreground">{personalNote.length}/200</span>
        </div>

        {/* Category */}
        <div>
          <label className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">Category</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`font-mono-stat text-[10px] px-3 py-1.5 rounded border transition-all ${
                  category === c ? "border-primary/50 text-primary bg-primary/10" : "text-muted-foreground hover:border-primary/30"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="font-mono-stat text-[9px] text-muted-foreground uppercase tracking-wider">Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:border-primary/50 mt-1"
          />
        </div>

        {/* Generate button */}
        {!preview && (
          <Button
            onClick={handleGenerate}
            disabled={generating || !personalNote.trim()}
            className="w-full font-mono-stat text-[11px] tracking-wider"
            style={{ background: "hsl(45 90% 55%)", color: "hsl(40 100% 2%)" }}
          >
            {generating ? "◈ SYSTEM GENERATING..." : "✦ Generate with AI"}
          </Button>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-3 border rounded-lg p-4" style={{ borderColor: "hsl(45 90% 55% / 0.2)" }}>
            <div className="flex items-center gap-2">
              <span className="font-mono-stat text-[9px] uppercase tracking-wider" style={{ color: "hsl(45 90% 55%)" }}>
                ✦ Preview
              </span>
              <span className="font-mono-stat text-[9px] text-primary">
                {preview.xp_reward} XP (1.25× multiplier applied: {Math.round(preview.xp_reward * 1.25)})
              </span>
            </div>

            <h3 className="font-cinzel text-sm font-bold text-foreground">{preview.title}</h3>
            <p className="font-body text-xs text-muted-foreground italic">{preview.description}</p>

            <div className="space-y-2">
              {preview.stages.map((stage, i) => (
                <div key={i} className="p-2 rounded border bg-secondary/20">
                  <p className="font-cinzel text-xs font-semibold text-foreground">{stage.title}</p>
                  <div className="mt-1 space-y-1">
                    {stage.quests.map((q, j) => (
                      <p key={j} className="font-body text-[10px] text-muted-foreground pl-2">
                        • {q.title} (+{q.xp_reward} XP)
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 font-mono-stat text-[11px] tracking-wider"
                style={{ background: "hsl(45 90% 55%)", color: "hsl(40 100% 2%)" }}
              >
                {sending ? "Issuing..." : "✦ Issue Scenario"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                className="font-mono-stat text-[10px]"
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}

        <Button variant="ghost" onClick={onClose} className="w-full font-mono-stat text-[10px]">
          Cancel
        </Button>
      </div>
    </div>
  );
}
