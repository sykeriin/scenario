import { useState, useEffect } from 'react';
import { AI_PRESETS, getAIConfig, setAIConfig, type AIProvider } from '@/lib/ai-config';
import { useUniverse } from '@/hooks/useUniverse';
import { UniverseSelector } from '@/components/UniverseSelector';
import { FounderModeToggle } from '@/components/FounderModeToggle';
import { UniverseSwitchDialog } from '@/components/UniverseSwitchDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/integrations/local/db';
import { toast } from 'sonner';
import type { GameUniverse } from '@/integrations/local/schema-extensions';
import { Link } from 'react-router-dom';

const Settings = () => {
  const { universe, setUniverse, founderMode, setFounderMode } = useUniverse();
  const config = getAIConfig();
  const [provider, setProvider] = useState<AIProvider>(config.provider);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [pendingUniverse, setPendingUniverse] = useState<GameUniverse | null>(null);

  const saveAI = () => {
    setAIConfig({ provider, baseUrl, model, apiKey, configured: !!apiKey, skipAi: false });
    toast.success('AI settings saved');
  };

  const exportData = async () => {
    const dump: Record<string, unknown[]> = {};
    for (const t of db.tables) {
      dump[t.name] = await db.table(t.name).toArray();
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `founder-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUniversePick = (u: GameUniverse) => {
    if (u === universe) return;
    setPendingUniverse(u);
  };

  const confirmUniverse = async () => {
    if (!pendingUniverse) return;
    await setUniverse(pendingUniverse);
    toast.success('Universe switched. Your records are preserved.');
    setPendingUniverse(null);
  };

  const onFounderModeChange = async (enabled: boolean) => {
    await setFounderMode(enabled);
    toast.success(enabled ? 'Founder OS enabled' : 'Founder OS disabled');
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">Settings</h1>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-primary">← Home</Link>
      </div>

      {pendingUniverse && (
        <UniverseSwitchDialog
          from={universe}
          to={pendingUniverse}
          onConfirm={confirmUniverse}
          onCancel={() => setPendingUniverse(null)}
        />
      )}

      <section className="space-y-3">
        <h2 className="font-cinzel text-sm text-muted-foreground tracking-widest">UNIVERSE</h2>
        <UniverseSelector value={universe} onChange={onUniversePick} />
      </section>

      <section className="space-y-3">
        <h2 className="font-cinzel text-sm text-muted-foreground tracking-widest">FOUNDER OS</h2>
        <FounderModeToggle value={founderMode} onChange={onFounderModeChange} />
      </section>

      <section className="space-y-3">
        <h2 className="font-cinzel text-sm text-muted-foreground tracking-widest">AI PROVIDER</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AI_PRESETS) as Exclude<AIProvider, 'custom'>[]).map((p) => (
            <Button key={p} size="sm" variant={provider === p ? 'default' : 'outline'} onClick={() => {
              setProvider(p);
              setBaseUrl(AI_PRESETS[p].baseUrl);
              setModel(AI_PRESETS[p].model);
            }}>{AI_PRESETS[p].label}</Button>
          ))}
          <Button size="sm" variant={provider === 'custom' ? 'default' : 'outline'} onClick={() => setProvider('custom')}>Custom</Button>
        </div>
        <div><Label>Base URL</Label><Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></div>
        <div><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
        <div><Label>API Key</Label><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></div>
        <Button onClick={saveAI}>Save AI</Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-cinzel text-sm text-muted-foreground tracking-widest">DATA</h2>
        <Button variant="outline" onClick={exportData}>Export backup (JSON)</Button>
        <p className="text-xs text-muted-foreground">All data is stored locally in your browser.</p>
      </section>
    </div>
  );
};

export default Settings;
