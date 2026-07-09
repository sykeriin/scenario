import { useState } from 'react';
import { AI_PRESETS, getAIConfig, setAIConfig, type AIProvider } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKeyGateProps {
  onComplete: () => void;
}

export function ApiKeyGate({ onComplete }: ApiKeyGateProps) {
  const existing = getAIConfig();
  const [provider, setProvider] = useState<AIProvider>(existing.provider);
  const [baseUrl, setBaseUrl] = useState(existing.baseUrl);
  const [model, setModel] = useState(existing.model);
  const [apiKey, setApiKey] = useState(existing.apiKey);

  const applyPreset = (p: Exclude<AIProvider, 'custom'>) => {
    setProvider(p);
    setBaseUrl(AI_PRESETS[p].baseUrl);
    setModel(AI_PRESETS[p].model);
  };

  const save = (skipAi = false) => {
    setAIConfig({
      provider,
      baseUrl,
      model,
      apiKey,
      configured: !skipAi && !!apiKey,
      skipAi,
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="text-center">
          <h2 className="font-cinzel text-xl font-bold tracking-wider text-primary">Configure AI</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Founder OS runs locally. AI features call your provider directly from the browser.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(AI_PRESETS) as Exclude<AIProvider, 'custom'>[]).map((p) => (
            <Button
              key={p}
              type="button"
              variant={provider === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset(p)}
            >
              {AI_PRESETS[p].label}
            </Button>
          ))}
          <Button
            type="button"
            variant={provider === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setProvider('custom')}
          >
            Custom
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.groq.com/openai/v1" />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama-3.3-70b-versatile" />
          </div>
          <div>
            <Label>API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => save(false)} disabled={!apiKey}>
            Save & Continue
          </Button>
          <Button variant="ghost" onClick={() => save(true)}>
            Continue without AI
          </Button>
        </div>
      </div>
    </div>
  );
}
