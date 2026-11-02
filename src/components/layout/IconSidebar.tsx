import { Link, useLocation } from "react-router-dom";
import { useUniverse } from "@/hooks/useUniverse";
import { BookOpen, Home, Swords, User } from "lucide-react";
import { TAB_NAV, tabForPath, type TabItem } from "@/lib/nav-config";

const ICONS: Record<TabItem["icon"], typeof Home> = {
  home: Home,
  quests: Swords,
  hero: User,
  world: BookOpen,
};

export function IconSidebar({ level: _level, username }: { level: number; username?: string }) {
  const location = useLocation();
  const { isSoloLeveling } = useUniverse();
  const activePath = tabForPath(location.pathname);

  const initial = username?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <aside className="hidden md:flex w-16 shrink-0 flex-col items-center border-r border-border bg-[hsl(var(--surface)/0.82)] py-5 gap-1">
      <Link
        to="/dashboard"
        className="font-cinzel text-[11px] font-bold tracking-[0.2em] text-primary mb-6 pb-5 border-b border-border w-full text-center"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {isSoloLeveling ? "SL" : "SCENARIO"}
      </Link>

      {TAB_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.path === activePath;
        return (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              active
                ? "border border-primary/30 bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        to="/settings"
        className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-primary/30 bg-[hsl(var(--dim))] text-sm font-cinzel text-primary"
        title="Settings"
      >
        {initial}
      </Link>
    </aside>
  );
}
