import type { GameUniverse } from '@/integrations/local/schema-extensions';
import { UNIVERSE_META, UNIVERSE_CARD_STYLES } from '@/lib/universe';

interface UniverseSelectorProps {
  value: GameUniverse;
  onChange: (u: GameUniverse) => void;
}

const ORDER: GameUniverse[] = ['orv', 'solo_leveling'];

export function UniverseSelector({ value, onChange }: UniverseSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ORDER.map((u) => {
        const meta = UNIVERSE_META[u];
        const selected = value === u;

        return (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            className={`rounded-lg border p-5 text-left transition-all ${UNIVERSE_CARD_STYLES[u]} ${
              selected ? 'ring-2 ring-primary/50 scale-[1.02]' : 'hover:border-primary/40'
            }`}
          >
            <h3 className="font-cinzel text-sm font-bold tracking-wide text-primary">{meta.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{meta.subtitle}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {meta.concepts.map((c) => (
                <span
                  key={c}
                  className="font-mono-stat text-[8px] px-2 py-0.5 rounded-full border border-primary/20 text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
            {selected && (
              <p className="mt-3 font-mono-stat text-[9px] uppercase tracking-widest text-primary">Selected</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
