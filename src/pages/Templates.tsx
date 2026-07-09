import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TemplateRow {
  id: string;
  title: string;
  category: string | null;
  dramatic_intro: string | null;
  xp_reward: number | null;
  template_uses: number;
  user_id: string | null;
  created_at: string | null;
}

interface TemplateWithMeta extends TemplateRow {
  creator_username: string;
  avg_rating: number;
  rating_count: number;
  stage_count: number;
}

const StarRating = ({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => onRate?.(star)}
        disabled={!onRate}
        className={`text-sm transition-colors ${
          star <= rating ? "text-primary" : "text-muted-foreground/30"
        } ${onRate ? "cursor-pointer hover:text-primary/80" : "cursor-default"}`}
      >
        ★
      </button>
    ))}
  </div>
);

const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Fetch all template scenarios
      const { data: scenarioData, error } = await dataClient
        .from("scenarios")
        .select("id, title, category, dramatic_intro, xp_reward, template_uses, user_id, created_at")
        .eq("is_template", true)
        .order("template_uses", { ascending: false });

      if (error) throw error;
      if (!scenarioData || scenarioData.length === 0) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      // Fetch creator profiles
      const userIds = [...new Set(scenarioData.map((s) => s.user_id).filter(Boolean))] as string[];
      const { data: profiles } = await dataClient
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

      // Fetch ratings
      const scenarioIds = scenarioData.map((s) => s.id);
      const { data: ratings } = await dataClient
        .from("template_ratings")
        .select("scenario_id, rating, user_id")
        .in("scenario_id", scenarioIds);

      const ratingMap = new Map<string, { total: number; count: number }>();
      const myRatings: Record<string, number> = {};
      (ratings ?? []).forEach((r) => {
        const existing = ratingMap.get(r.scenario_id) ?? { total: 0, count: 0 };
        existing.total += r.rating;
        existing.count += 1;
        ratingMap.set(r.scenario_id, existing);
        if (user && r.user_id === user.id) {
          myRatings[r.scenario_id] = r.rating;
        }
      });
      setUserRatings(myRatings);

      // Fetch stage counts
      const { data: stages } = await dataClient
        .from("stages")
        .select("scenario_id")
        .in("scenario_id", scenarioIds);
      const stageCountMap = new Map<string, number>();
      (stages ?? []).forEach((s) => {
        stageCountMap.set(s.scenario_id!, (stageCountMap.get(s.scenario_id!) ?? 0) + 1);
      });

      const enriched: TemplateWithMeta[] = scenarioData.map((s) => {
        const r = ratingMap.get(s.id);
        return {
          ...s,
          creator_username: profileMap.get(s.user_id!) ?? "Unknown",
          avg_rating: r ? Math.round((r.total / r.count) * 10) / 10 : 0,
          rating_count: r?.count ?? 0,
          stage_count: stageCountMap.get(s.id) ?? 0,
        };
      });

      setTemplates(enriched);
    } catch (e: any) {
      toast.error(e.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const cloneTemplate = async (template: TemplateWithMeta) => {
    if (!user || cloning) return;
    setCloning(template.id);

    try {
      // Fetch stages and quests from the original scenario
      const { data: origStages } = await dataClient
        .from("stages")
        .select("*")
        .eq("scenario_id", template.id)
        .order("order_index");

      const stageIds = (origStages ?? []).map((s) => s.id);
      const { data: origQuests } = stageIds.length > 0
        ? await dataClient.from("quests").select("*").in("stage_id", stageIds)
        : { data: [] };

      // Create new scenario
      const { data: newScenario, error: scenErr } = await dataClient
        .from("scenarios")
        .insert({
          user_id: user.id,
          title: template.title,
          category: template.category,
          dramatic_intro: template.dramatic_intro,
          xp_reward: template.xp_reward ?? 500,
          status: "active",
        })
        .select()
        .single();

      if (scenErr || !newScenario) throw scenErr || new Error("Failed to create scenario");

      // Clone stages
      for (let i = 0; i < (origStages ?? []).length; i++) {
        const orig = origStages![i];
        const { data: newStage } = await dataClient
          .from("stages")
          .insert({
            scenario_id: newScenario.id,
            title: orig.title,
            order_index: orig.order_index,
            xp_reward: orig.xp_reward ?? 100,
            status: i === 0 ? "active" : "locked",
          })
          .select()
          .single();

        if (newStage) {
          const stageQuests = (origQuests ?? []).filter((q) => q.stage_id === orig.id);
          for (const q of stageQuests) {
            await dataClient.from("quests").insert({
              stage_id: newStage.id,
              user_id: user.id,
              title: q.title,
              description: q.description,
              quest_type: q.quest_type,
              xp_reward: q.xp_reward ?? 50,
              status: i === 0 ? "pending" : "pending",
            });
          }
        }
      }

      // Increment template_uses
      await dataClient
        .from("scenarios")
        .update({ template_uses: template.template_uses + 1 } as any)
        .eq("id", template.id);

      toast.success("Template cloned! Your new scenario is ready.");
      navigate(`/scenarios/${newScenario.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to clone template");
    } finally {
      setCloning(null);
    }
  };

  const rateTemplate = async (scenarioId: string, rating: number) => {
    if (!user) return;
    try {
      await dataClient.from("template_ratings").upsert(
        { scenario_id: scenarioId, user_id: user.id, rating },
        { onConflict: "scenario_id,user_id" }
      );
      setUserRatings((prev) => ({ ...prev, [scenarioId]: rating }));
      toast.success("Rating saved!");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Failed to rate");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            TEMPLATES
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8 space-y-2">
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">
            ◆ SCENARIO TEMPLATES
          </h1>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
            Clone proven scenarios from other players. Start with a battle-tested path.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING TEMPLATES...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="font-cinzel text-lg text-muted-foreground">No templates yet.</p>
            <p className="font-body text-sm text-muted-foreground">
              Complete a scenario and publish it as a template from the scenario detail page.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border bg-card p-5 space-y-3 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-cinzel text-base font-bold text-foreground truncate">{t.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {t.category ?? "General"}
                      </span>
                      <span className="font-mono-stat text-[10px] text-muted-foreground">
                        by {t.creator_username}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono-stat text-[10px] text-primary shrink-0">+{t.xp_reward} XP</span>
                </div>

                {t.dramatic_intro && (
                  <p className="font-body text-xs text-muted-foreground italic line-clamp-2">{t.dramatic_intro}</p>
                )}

                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="font-mono-stat text-[10px]">
                    {t.stage_count} stages
                  </span>
                  <span className="font-mono-stat text-[10px]">
                    {t.template_uses} uses
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRating rating={Math.round(t.avg_rating)} />
                    <span className="font-mono-stat text-[10px]">
                      {t.avg_rating > 0 ? t.avg_rating.toFixed(1) : "—"} ({t.rating_count})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => cloneTemplate(t)}
                    disabled={cloning === t.id || t.user_id === user?.id}
                    className="font-mono-stat text-[10px] glow-accent flex-1"
                  >
                    {cloning === t.id ? "Cloning..." : t.user_id === user?.id ? "Your Template" : "⬡ Clone Scenario"}
                  </Button>
                  {user && t.user_id !== user.id && (
                    <div className="shrink-0">
                      <StarRating
                        rating={userRatings[t.id] ?? 0}
                        onRate={(r) => rateTemplate(t.id, r)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;
