import { getArchetype, ARCHETYPES } from "@/lib/archetypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalysisData {
  dominant_themes?: string[];
  primary_goal?: string;
  secondary_goals?: string[];
  emotional_tone?: string;
  suggested_life_path_alignment?: string;
  scenario_suggestions?: Array<{ title: string; category: string; why: string }>;
  morning_must_suggestions?: string[];
  motivational_archetype?: string;
}

export function DreamBoardAnalysis({ analysis }: { analysis: AnalysisData }) {
  const archetype = analysis.motivational_archetype ? getArchetype(analysis.motivational_archetype) : null;

  return (
    <div className="space-y-4">
      {/* Archetype */}
      {archetype && (
        <Card className="border-primary/30 bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-4xl">{archetype.icon}</span>
            <div>
              <p className="font-cinzel text-lg font-bold text-primary">{archetype.name}</p>
              <p className="font-body text-sm text-muted-foreground">{archetype.description}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Goal */}
      {analysis.primary_goal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono-stat uppercase tracking-widest text-muted-foreground">Primary Goal</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-body text-foreground">{analysis.primary_goal}</p>
          </CardContent>
        </Card>
      )}

      {/* Themes */}
      {analysis.dominant_themes && analysis.dominant_themes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono-stat uppercase tracking-widest text-muted-foreground">Dominant Themes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {analysis.dominant_themes.map((t) => (
              <Badge key={t} variant="secondary" className="font-body">{t}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emotional Tone */}
      {analysis.emotional_tone && (
        <Card>
          <CardContent className="p-4">
            <span className="font-mono-stat text-xs text-muted-foreground uppercase tracking-widest">Emotional Tone: </span>
            <span className="font-body text-primary font-semibold capitalize">{analysis.emotional_tone}</span>
          </CardContent>
        </Card>
      )}

      {/* Scenario Suggestions */}
      {analysis.scenario_suggestions && analysis.scenario_suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono-stat uppercase tracking-widest text-muted-foreground">Suggested Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {analysis.scenario_suggestions.map((s, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <p className="font-cinzel text-sm font-semibold text-foreground">{s.title}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">{s.why}</p>
                <Badge variant="outline" className="mt-1 text-xs">{s.category}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Morning Must Suggestions */}
      {analysis.morning_must_suggestions && analysis.morning_must_suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono-stat uppercase tracking-widest text-muted-foreground">Morning Must Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {analysis.morning_must_suggestions.map((m, i) => (
                <li key={i} className="font-body text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary">◆</span> {m}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
