import { useEffect, useState } from 'react';
import { db } from '@/integrations/local/db';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Swot = () => {
  const [swot, setSwot] = useState<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    strategic_recommendations: string[];
    created_at: string;
  } | null>(null);

  useEffect(() => {
    db.table('swot_analyses').orderBy('created_at').reverse().first().then((s) => {
      if (s) setSwot(s as typeof swot);
    });
  }, []);

  const Quad = ({ title, items }: { title: string; items: string[] }) => (
    <div className="rounded-lg border border-border p-4">
      <h3 className="font-cinzel text-xs font-bold tracking-widest text-primary mb-2">{title}</h3>
      <ul className="text-sm space-y-1 list-disc pl-4">
        {(items ?? []).map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-cinzel text-2xl font-bold text-primary">SWOT Analysis</h1>
        <Button variant="outline" asChild><Link to="/roadmap">Roadmap</Link></Button>
      </div>
      {!swot ? (
        <p className="text-muted-foreground text-sm">Run Sync on the Roadmap page to generate a SWOT analysis.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{new Date(swot.created_at).toLocaleString()}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Quad title="Strengths" items={swot.strengths} />
            <Quad title="Weaknesses" items={swot.weaknesses} />
            <Quad title="Opportunities" items={swot.opportunities} />
            <Quad title="Threats" items={swot.threats} />
          </div>
          <div className="rounded-lg border border-primary/30 p-4">
            <h3 className="font-cinzel text-sm font-bold text-primary mb-2">Strategic Recommendations</h3>
            <ul className="text-sm space-y-1 list-disc pl-4">
              {swot.strategic_recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Swot;
