export const CONSTELLATION_GRADES = [
  { grade: "Low Grade", min: 0, max: 499, color: "hsl(0 0% 50%)", glow: false, maxSponsees: 3 },
  { grade: "Middle Grade", min: 500, max: 1999, color: "hsl(0 0% 90%)", glow: false, maxSponsees: 10 },
  { grade: "High Grade", min: 2000, max: 7499, color: "hsl(210 80% 55%)", glow: true, maxSponsees: 25 },
  { grade: "Transcendent Grade", min: 7500, max: 19999, color: "hsl(270 70% 60%)", glow: true, maxSponsees: 50 },
  { grade: "Ancient Grade", min: 20000, max: 49999, color: "hsl(45 90% 55%)", glow: true, maxSponsees: Infinity },
  { grade: "Myth Grade", min: 50000, max: Infinity, color: "hsl(45 100% 55%)", glow: true, maxSponsees: Infinity },
  { grade: "Outer God", min: Infinity, max: Infinity, color: "hsl(0 0% 100%)", glow: true, maxSponsees: Infinity },
] as const;

export type ConstellationGrade = (typeof CONSTELLATION_GRADES)[number]["grade"];

export function getGradeInfo(grade: string) {
  return CONSTELLATION_GRADES.find((g) => g.grade === grade) ?? CONSTELLATION_GRADES[0];
}

export function getGradeForStories(stories: number) {
  for (let i = CONSTELLATION_GRADES.length - 1; i >= 0; i--) {
    const g = CONSTELLATION_GRADES[i];
    if (g.min !== Infinity && stories >= g.min) return g;
  }
  return CONSTELLATION_GRADES[0];
}

export function getNextGrade(currentGrade: string) {
  const idx = CONSTELLATION_GRADES.findIndex((g) => g.grade === currentGrade);
  if (idx < 0 || idx >= CONSTELLATION_GRADES.length - 1) return null;
  return CONSTELLATION_GRADES[idx + 1];
}

export function getGradeBadgeStyle(grade: string): React.CSSProperties {
  const info = getGradeInfo(grade);
  const base: React.CSSProperties = {
    color: info.color,
    fontWeight: 700,
  };
  if (info.glow) {
    base.textShadow = `0 0 12px ${info.color}, 0 0 24px ${info.color}`;
  }
  if (grade === "Myth Grade") {
    base.background = `linear-gradient(135deg, hsl(45 100% 55%), hsl(35 90% 65%), hsl(45 100% 55%))`;
    base.WebkitBackgroundClip = "text";
    base.WebkitTextFillColor = "transparent";
    base.backgroundSize = "200% 200%";
  }
  if (grade === "Outer God") {
    base.background = `linear-gradient(135deg, hsl(0 80% 60%), hsl(45 100% 55%), hsl(120 60% 50%), hsl(210 80% 60%), hsl(270 70% 60%), hsl(0 80% 60%))`;
    base.WebkitBackgroundClip = "text";
    base.WebkitTextFillColor = "transparent";
    base.backgroundSize = "400% 400%";
  }
  return base;
}
