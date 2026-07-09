import { useUniverse } from '@/hooks/useUniverse';
import { SystemMessage } from '@/components/ui/SystemMessage';
import { SystemWindow } from '@/components/sl/SystemWindow';

interface UniverseNotificationProps {
  title: string;
  subtitle?: string;
  body?: string;
  rank?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  onDismiss?: () => void;
}

export function UniverseNotification({ title, subtitle, body, rank, rarity, onDismiss }: UniverseNotificationProps) {
  const { isSoloLeveling } = useUniverse();

  if (isSoloLeveling) {
    return (
      <SystemWindow
        title={title}
        subtitle={subtitle ?? body}
        rank={rank}
        onDismiss={onDismiss}
        autoDismissMs={5000}
      />
    );
  }

  return <SystemMessage title={title} subtitle={subtitle} rarity={rarity} onDismiss={onDismiss} />;
}
