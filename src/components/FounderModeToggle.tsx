import { Switch } from '@/components/ui/switch';

interface FounderModeToggleProps {
  value: boolean;
  onChange: (enabled: boolean) => void;
}

const FOUNDER_FEATURES = ['Roadmap', 'SWOT', 'R&D', 'Multi-founder'];

export function FounderModeToggle({ value, onChange }: FounderModeToggleProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-card to-secondary p-5 space-y-4">
      <div>
        <h3 className="font-cinzel text-sm font-bold tracking-wide text-primary">FOUNDER OS</h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Are you a founder — or building toward one? Enable Founder OS tools alongside your universe.
          Works in both ORV and Solo Leveling.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FOUNDER_FEATURES.map((feature) => (
          <span
            key={feature}
            className="font-mono-stat text-[8px] px-2 py-0.5 rounded-full border border-primary/20 text-muted-foreground"
          >
            {feature}
          </span>
        ))}
      </div>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm">Enable Founder OS</span>
        <Switch checked={value} onCheckedChange={onChange} />
      </label>
    </div>
  );
}
