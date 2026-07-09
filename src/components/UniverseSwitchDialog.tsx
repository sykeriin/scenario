import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UNIVERSE_META } from '@/lib/universe';
import type { GameUniverse } from '@/integrations/local/schema-extensions';

interface UniverseSwitchDialogProps {
  from: GameUniverse;
  to: GameUniverse;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UniverseSwitchDialog({ from, to, onConfirm, onCancel }: UniverseSwitchDialogProps) {
  const [phase, setPhase] = useState<'confirm' | 'animating' | 'done'>('confirm');

  const startSwitch = () => {
    setPhase('animating');
    setTimeout(() => {
      onConfirm();
      setPhase('done');
    }, 1500);
  };

  const isOrvToSl = from === 'orv' && to === 'solo_leveling';
  const isSlToOrv = from === 'solo_leveling' && to === 'orv';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 px-4">
      {phase === 'animating' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isOrvToSl && (
            <div className="w-64 h-64 rounded-full border-4 border-[#00b4ff] animate-ping opacity-30" />
          )}
          {isSlToOrv && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent animate-fade-in" />
          )}
          {!isOrvToSl && !isSlToOrv && (
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          )}
        </div>
      )}

      {phase === 'confirm' && (
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-4 animate-scale-in relative z-10">
          <h2 className="font-cinzel text-lg font-bold text-primary tracking-wider">Switch Universe</h2>
          <p className="text-sm text-muted-foreground">
            {UNIVERSE_META[from].title} → {UNIVERSE_META[to].title}
          </p>
          <p className="text-xs italic text-muted-foreground">
            Your records will be preserved. Only the lens through which you see them changes.
          </p>
          <div className="h-1 rounded-full bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-pulse" />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={startSwitch}>Confirm switch</Button>
            <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
