import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUniverse } from '@/hooks/useUniverse';
import { PRIMARY_NAV, MORE_NAV, type NavItem } from '@/lib/nav-config';
import { isFeatureUnlocked, unlockLabel, minLevelForPath } from '@/lib/unlocks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardNavProps {
  level: number;
  founderMode: boolean;
}

function labelFor(item: NavItem, t: (k: import('@/lib/universe').TermKey) => string): string {
  if (item.label) return item.label;
  if (item.termKey) return t(item.termKey);
  return item.path;
}

export function DashboardNav({ level, founderMode }: DashboardNavProps) {
  const { t } = useUniverse();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleMore = MORE_NAV.filter((item) => !item.founderOnly || founderMode);

  return (
    <div className="hidden md:flex items-center gap-1">
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="font-mono-stat text-[11px] uppercase tracking-wider px-3 py-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {item.icon ? `${item.icon} ` : ''}{labelFor(item, t)}
        </Link>
      ))}
      <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="font-mono-stat text-[11px] uppercase tracking-wider px-3 py-2 rounded-md hover:bg-accent text-muted-foreground">
            ··· More
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
          {visibleMore.map((item) => {
            const unlocked = isFeatureUnlocked(item.path, level);
            const min = minLevelForPath(item.path);
            if (!unlocked) {
              return (
                <DropdownMenuItem key={item.path} disabled className="text-muted-foreground text-xs">
                  ? {labelFor(item, t)} — {unlockLabel(min)}
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem key={item.path} asChild>
                <Link to={item.path} onClick={() => setMoreOpen(false)} className="text-xs">
                  {labelFor(item, t)}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
