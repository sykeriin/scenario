import { useEffect, useState } from 'react';
import { db } from '@/integrations/local/db';
import { invokeFunction } from '@/lib/ai';
import { isAIReady } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { RoadmapRow, SwotAnalysisRow, SyncRunRow } from '@/integrations/local/schema-extensions';

const Roadmap = () => {
  const [roadmap, setRoadmap] = useState<RoadmapRow | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    db.table('roadmaps').orderBy('created_at').reverse().first().then((r) => setRoadmap(r as RoadmapRow | undefined ?? null));
  }, []);

  const runSync = async () => {
    if (!isAIReady()) {
      toast.error('Configure AI in Settings first');
      return;
    }
    setSyncing(true);
    try {
      const founders = await db.table('founders').toArray();
      const vault = await db.table('vault_entries').toArray();
      const scenarios = await db.table('scenarios').toArray();
      const payload = {
        founders,
        recent_research: vault.slice(-20),
        active_initiatives: scenarios.filter((s) => s.status === 'active'),
      };
      const result = (await invokeFunction('founder-sync', payload)) as {
        roadmap: { title: string; phases: { name: string; duration_weeks: number; milestones: string[] }[] };
        swot: SwotAnalysisRow;
      };
      const syncId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.table('sync_runs').put({
        id: syncId,
        created_at: now,
        founder_ids: founders.map((f) => f.id),
        input_summary: `${founders.length} founders`,
      } satisfies SyncRunRow);
      const roadmapId = crypto.randomUUID();
      const versions = await db.table('roadmaps').count();
      await db.table('roadmaps').put({
        id: roadmapId,
        version: versions + 1,
        title: result.roadmap.title,
        phases: result.roadmap.phases,
        created_at: now,
        sync_run_id: syncId,
      } satisfies RoadmapRow);
      await db.table('swot_analyses').put({
        id: crypto.randomUUID(),
        roadmap_id: roadmapId,
        strengths: result.swot.strengths ?? [],
        weaknesses: result.swot.weaknesses ?? [],
        opportunities: result.swot.opportunities ?? [],
        threats: result.swot.threats ?? [],
        strategic_recommendations: result.swot.strategic_recommendations ?? [],
        created_at: now,
      });
      setRoadmap(await db.table('roadmaps').get(roadmapId) as RoadmapRow);
      toast.success('Sync complete — roadmap & SWOT updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const phases = (roadmap?.phases as { name: string; duration_weeks: number; milestones: string[] }[]) ?? [];

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-cinzel text-2xl font-bold text-primary">Roadmap</h1>
        <div className="flex gap-2">
          <Button onClick={runSync} disabled={syncing}>{syncing ? 'Syncing...' : 'Run Sync'}</Button>
          <Button variant="outline" asChild><Link to="/swot">SWOT</Link></Button>
        </div>
      </div>
      {!roadmap ? (
        <p className="text-muted-foreground text-sm">No roadmap yet. Run Sync to merge founder research into a shared plan.</p>
      ) : (
        <div className="space-y-4">
          <h2 className="font-cinzel text-lg">{roadmap.title}</h2>
          <p className="text-xs text-muted-foreground">v{roadmap.version} · {new Date(roadmap.created_at).toLocaleString()}</p>
          {phases.map((phase, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <h3 className="font-cinzel text-sm font-bold">{phase.name}</h3>
              <p className="text-xs text-muted-foreground">{phase.duration_weeks} weeks</p>
              <ul className="mt-2 list-disc pl-4 text-sm space-y-1">
                {(phase.milestones ?? []).map((m, j) => <li key={j}>{m}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Roadmap;
