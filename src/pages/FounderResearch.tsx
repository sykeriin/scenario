import { useState, useEffect } from 'react';
import { db } from '@/integrations/local/db';
import { LOCAL_USER_ID } from '@/integrations/local/schema-extensions';
import { callAI } from '@/lib/ai';
import { isAIReady } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { dataClient } from '@/lib/data-client';

const FounderResearch = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [founderId, setFounderId] = useState<string | null>(null);

  useEffect(() => {
    db.table('app_meta').get('active_founder_id').then((m) => setFounderId(String(m?.value ?? '')));
  }, []);

  const research = async () => {
    if (!isAIReady()) {
      toast.error('Configure AI in Settings');
      return;
    }
    if (!query.trim()) return;
    setLoading(true);
    try {
      const text = await callAI([
        { role: 'system', content: 'You are a founder research assistant. Give concise, actionable research notes.' },
        { role: 'user', content: query },
      ]);
      setAnswer(text);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  const saveToVault = async () => {
    if (!answer) return;
    await dataClient.from('vault_entries').insert({
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      founder_id: founderId,
      title: query.slice(0, 80),
      content: answer,
      ai_summary: answer.slice(0, 200),
      tags: ['research', 'founder'],
      category: 'Research',
      created_at: new Date().toISOString(),
    });
    toast.success('Saved to Research Library');
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="font-cinzel text-2xl font-bold text-primary">Founder R&D</h1>
      <p className="text-sm text-muted-foreground">Individual research sessions — saved to your vault for Sync.</p>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Research question..." />
      <Button onClick={research} disabled={loading}>{loading ? 'Researching...' : 'Research'}</Button>
      {answer && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{answer}</p>
          <Button variant="outline" size="sm" onClick={saveToVault}>Save to Vault</Button>
        </div>
      )}
    </div>
  );
};

export default FounderResearch;
