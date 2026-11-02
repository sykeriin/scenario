import { Link, useLocation } from "react-router-dom";
import { BookOpen, Home, Swords, User } from "lucide-react";
import { TAB_NAV, tabForPath, type TabItem } from "@/lib/nav-config";

const ICONS: Record<TabItem["icon"], typeof Home> = {
  home: Home,
  quests: Swords,
  hero: User,
  world: BookOpen,
};

/** Phone navigation. Hidden from md up, where IconSidebar/DashboardNav take over. */
export function BottomTabBar() {
  const { pathname } = useLocation();
  const activePath = tabForPath(pathname);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TAB_NAV.map((tab) => {
        const Icon = ICONS[tab.icon];
        const active = tab.path === activePath;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
