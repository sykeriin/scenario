import { SystemWindow } from '@/components/sl/SystemWindow';
import type { ShadowArmyRow } from '@/integrations/local/schema-extensions';

interface ShadowExtractionOverlayProps {
  shadow: ShadowArmyRow;
  onDone: () => void;
}

export function ShadowExtractionOverlay({ shadow, onDone }: ShadowExtractionOverlayProps) {
  return (
    <SystemWindow
      title="SHADOW EXTRACTION SUCCESSFUL"
      subtitle={`${shadow.shadow_name} has joined your army.`}
      body={`Rank: ${shadow.shadow_rank}\nAbility: ${shadow.ability}`}
      rank={shadow.shadow_rank.toUpperCase()}
      onDismiss={onDone}
      actions={[{ label: 'Acknowledge', onClick: onDone }]}
    />
  );
}
