import { Link, useLocation } from "react-router-dom";
import { useUniverse } from "@/hooks/useUniverse";
import { isFeatureUnlocked } from "@/lib/unlocks";

interface NavItem {
  path: string;
  icon: string;
  label: string;
  minLevel?: number;
}

export function IconSidebar({ level, username }: { level: number; username?: string }) {
  const location = useLocation();
  const { t, isSoloLeveling } = useUniverse();

  const nav: NavItem[] = [
    { path: "/dashboard", icon: "⬡", label: "Home" },
    { path: "/scenarios", icon: "◇", label: t("scenario") },
    { path: "/life-path", icon: "✦", label: t("life_path"), minLevel: 3 },
    { path: "/training", icon: "◈", label: t("training") },
    { path: "/lobby", icon: "⊕", label: "Lobby" },
    { path: "/constellation-dashboard", icon: "★", label: t("constellation"), minLevel: 5 },
    { path: "/oldest-dream", icon: "♔", label: t("oldest_dream"), minLevel: 8 },
    ...(isSoloLeveling ? [{ path: "/shadow-army", icon: "🌑", label: t("shadow_army"), minLevel: 4 }] : []),
  ];

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

      {nav.map((item) => {
        const locked = item.minLevel ? !isFeatureUnlocked(item.path, level) : false;
        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        if (locked) {
          return (
            <div
              key={item.path}
              title={`Unlocks at Lv ${item.minLevel}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground/30 text-lg cursor-not-allowed"
            >
              {item.icon}
            </div>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-all ${
              active
                ? "border border-primary/30 bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.icon}
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
