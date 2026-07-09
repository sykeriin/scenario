import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_install_dismissed') === '1');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setDeferred(null);
    localStorage.setItem('pwa_install_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 z-[70] max-w-sm rounded-lg border border-primary/30 bg-card p-4 shadow-lg">
      <p className="font-cinzel text-sm font-bold text-primary">Install Founder OS</p>
      <p className="text-xs text-muted-foreground mt-1">Run as a standalone app — works offline.</p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={install}>Install</Button>
        <Button size="sm" variant="ghost" onClick={() => { setDismissed(true); localStorage.setItem('pwa_install_dismissed', '1'); }}>Later</Button>
      </div>
    </div>
  );
}
