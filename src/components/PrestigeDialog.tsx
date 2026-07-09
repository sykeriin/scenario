import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUniverse } from '@/hooks/useUniverse';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const JOB_CHANGE_BADGES = ['Awakened', 'Elite Hunter', 'S-Rank Hunter', '', 'National Level Hunter', '', '', '', '', 'Shadow Monarch'];

interface PrestigeDialogProps {
  profile: any;
  onClose: () => void;
  onPrestige: () => void;
}

export const PrestigeDialog = ({ profile, onClose, onPrestige }: PrestigeDialogProps) => {
  const { user } = useAuth();
  const { isSoloLeveling, t } = useUniverse();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showArise, setShowArise] = useState(false);
  const CONFIRM_PHRASE = isSoloLeveling ? 'ARISE' : 'I HAVE READ THE STAR STREAM';
  const nextLevel = Number(profile?.prestige_level ?? 0) + 1;
  const badge = isSoloLeveling ? (JOB_CHANGE_BADGES[nextLevel - 1] || `Job Change ${nextLevel}`) : null;

  const handlePrestige = async () => {
    if (!user || confirmText !== CONFIRM_PHRASE) return;
    setLoading(true);
    try {
      const result = await api.profiles.prestige();
      if (isSoloLeveling) {
        setShowArise(true);
        setTimeout(() => {
          toast.success(`Job Change ${result.prestige_level} — ${badge || 'Complete'}`, { className: 'font-cinzel' });
          onPrestige();
        }, 2000);
      } else {
        toast.success(`Prestige ${result.prestige_level} achieved. You have been reborn.`, { className: 'font-cinzel' });
        onPrestige();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Prestige failed');
    } finally {
      setLoading(false);
    }
  };

  if (showArise) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
        <p className="font-cinzel text-4xl font-bold text-white animate-pulse tracking-[0.5em]">ARISE.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'hsl(var(--background) / 0.95)' }}>
      <div className="max-w-md w-full mx-4 rounded-xl border p-6 space-y-5 animate-scale-in" style={{ background: 'hsl(var(--card))', borderColor: isSoloLeveling ? 'rgba(0,180,255,0.3)' : 'hsl(270 70% 55% / 0.3)' }}>
        <div className="text-center space-y-2">
          <h2 className="font-cinzel text-xl font-bold tracking-wider" style={{ color: isSoloLeveling ? '#00b4ff' : 'hsl(270 70% 55%)' }}>
            {isSoloLeveling ? '↺ JOB CHANGE AVAILABLE' : '↺ PRESTIGE'}
          </h2>
          {isSoloLeveling && badge && (
            <p className="font-mono text-xs text-muted-foreground">Next badge: {badge}</p>
          )}
          <p className="font-body text-sm text-muted-foreground">
            {isSoloLeveling
              ? 'All accumulated Magic Power will reset. Your shadows, titles, and records remain.'
              : 'You are about to reset your progress. This action cannot be undone.'}
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: 'hsl(var(--destructive) / 0.3)' }}>
          <p className="font-mono-stat text-[10px] uppercase tracking-wider text-destructive">What will be reset:</p>
          <ul className="font-body text-xs text-muted-foreground space-y-1">
            <li>• {t('level')} → 1</li>
            <li>• {t('xp')} → 0</li>
            <li>• All stats → 0</li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-mono-stat text-[9px] text-muted-foreground text-center">
            Type "<span className="text-primary">{CONFIRM_PHRASE}</span>" to confirm:
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type the confirmation phrase..."
            className="w-full bg-secondary/50 border rounded px-3 py-2 font-mono-stat text-xs text-foreground text-center"
          />
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handlePrestige} disabled={loading || confirmText !== CONFIRM_PHRASE} className="font-cinzel tracking-wider">
            {isSoloLeveling ? 'Proceed with Job Change' : 'Prestige'}
          </Button>
        </div>
      </div>
    </div>
  );
};
