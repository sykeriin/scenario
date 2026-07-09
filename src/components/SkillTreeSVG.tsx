import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  STAT_COLORS,
  type SkillNode,
  type UserSkillNode,
  type NodeState,
  getNodeState,
  getTierRarity,
} from "@/lib/skillTreeData";

interface SkillTreeSVGProps {
  statName: string;
  statXp: number;
  onNodeUnlocked?: (node: SkillNode) => void;
}

const HEX_SIZE = 32;

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export const SkillTreeSVG = ({ statName, statXp, onNodeUnlocked }: SkillTreeSVGProps) => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [userNodes, setUserNodes] = useState<UserSkillNode[]>([]);
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const colors = STAT_COLORS[statName] ?? STAT_COLORS.Core;
  const unlockedIds = new Set(userNodes.map((un) => un.node_id));

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient.from("skill_nodes").select("*").eq("stat_name", statName).order("tier"),
      dataClient.from("user_skill_nodes").select("*").eq("user_id", user.id),
    ]).then(([nodesRes, userRes]) => {
      setNodes((nodesRes.data as any[]) ?? []);
      setUserNodes((userRes.data as any[]) ?? []);
    });
  }, [user, statName]);

  const handleUnlock = async (node: SkillNode) => {
    if (!user || unlocking) return;
    setUnlocking(true);
    const { error } = await dataClient
      .from("user_skill_nodes")
      .insert({ user_id: user.id, node_id: node.id });
    if (!error) {
      setUserNodes((prev) => [
        ...prev,
        { id: crypto.randomUUID(), user_id: user.id, node_id: node.id, unlocked_at: new Date().toISOString(), is_active: true },
      ]);
      toast.success(`◆ ${node.node_name} unlocked!`);
      onNodeUnlocked?.(node);
    } else {
      toast.error("Failed to unlock node");
    }
    setUnlocking(false);
    setSelected(null);
  };

  // Calculate SVG bounds
  const padding = 60;
  const minX = Math.min(...nodes.map((n) => n.position_x), 400) - padding;
  const maxX = Math.max(...nodes.map((n) => n.position_x), 400) + padding;
  const minY = Math.min(...nodes.map((n) => n.position_y), 50) - padding;
  const maxY = Math.max(...nodes.map((n) => n.position_y), 50) + padding;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  return (
    <div className="relative w-full h-full overflow-auto">
      {/* Hex grid background pattern */}
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        className="w-full h-full min-h-[600px]"
        style={{ minWidth: svgW > 700 ? svgW : 700 }}
      >
        <defs>
          {/* Hex grid pattern */}
          <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse" patternTransform="translate(0, 0)">
            <path
              d="M30 0 L60 15 L60 37 L30 52 L0 37 L0 15 Z"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.3"
              opacity="0.2"
            />
          </pattern>
          <rect id="hexbg" width="100%" height="100%" fill="url(#hexgrid)" />

          {/* Glow filter */}
          <filter id={`glow-${statName}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={colors.primary} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="colorblur" />
            <feMerge>
              <feMergeNode in="colorblur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation for available nodes */}
          <filter id="pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={colors.primary} floodOpacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="colorblur" />
            <feMerge>
              <feMergeNode in="colorblur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x={minX} y={minY} width={svgW} height={svgH} fill="url(#hexgrid)" />

        {/* Connection lines */}
        {nodes.map((node) => {
          if (!node.prerequisite_node_id) return null;
          const parent = nodes.find((n) => n.id === node.prerequisite_node_id);
          if (!parent) return null;
          const nodeState = getNodeState(node, unlockedIds, statXp);
          const parentState = getNodeState(parent, unlockedIds, statXp);
          const bothUnlocked = nodeState === "unlocked" && parentState === "unlocked";
          const oneAvailable = nodeState === "available" || parentState === "available";

          return (
            <line
              key={`line-${node.id}`}
              x1={parent.position_x}
              y1={parent.position_y}
              x2={node.position_x}
              y2={node.position_y}
              stroke={bothUnlocked ? colors.primary : oneAvailable ? colors.primary : "hsl(var(--border))"}
              strokeWidth={bothUnlocked ? 3 : 1.5}
              strokeDasharray={bothUnlocked ? "none" : "6 4"}
              opacity={bothUnlocked ? 1 : oneAvailable ? 0.6 : 0.2}
              filter={bothUnlocked ? `url(#glow-${statName})` : "none"}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const state = getNodeState(node, unlockedIds, statXp);
          const isSelected = selected?.id === node.id;
          const cx = node.position_x;
          const cy = node.position_y;

          return (
            <g
              key={node.id}
              onClick={() => setSelected(isSelected ? null : node)}
              className="cursor-pointer"
              style={{ transition: "transform 0.2s" }}
            >
              {/* Hex shape */}
              <polygon
                points={hexPoints(cx, cy, HEX_SIZE)}
                fill={
                  state === "unlocked"
                    ? colors.bg
                    : state === "available"
                    ? "hsl(var(--card))"
                    : "hsl(var(--muted) / 0.3)"
                }
                stroke={
                  state === "unlocked"
                    ? colors.primary
                    : state === "available"
                    ? colors.primary
                    : "hsl(var(--border))"
                }
                strokeWidth={state === "unlocked" ? 2.5 : state === "available" ? 2 : 1}
                filter={state === "unlocked" ? `url(#glow-${statName})` : state === "available" ? "url(#pulse-glow)" : "none"}
                opacity={state === "locked" ? 0.35 : 1}
              >
                {state === "available" && (
                  <animate
                    attributeName="stroke-opacity"
                    values="1;0.4;1"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </polygon>

              {/* Selection ring */}
              {isSelected && (
                <polygon
                  points={hexPoints(cx, cy, HEX_SIZE + 5)}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.8"
                />
              )}

              {/* Lock icon for locked */}
              {state === "locked" && (
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize="16"
                  opacity="0.4"
                  className="select-none pointer-events-none"
                >
                  🔒
                </text>
              )}

              {/* Node icon for unlocked/available */}
              {state !== "locked" && (
                <>
                  <text
                    x={cx}
                    y={cy - 2}
                    textAnchor="middle"
                    fontSize="14"
                    className="select-none pointer-events-none"
                    fill={state === "unlocked" ? colors.primary : "hsl(var(--muted-foreground))"}
                  >
                    {node.node_type === "active" ? "★" : "◆"}
                  </text>
                  <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                    fill={state === "unlocked" ? colors.primary : "hsl(var(--muted-foreground))"}
                    className="select-none pointer-events-none"
                    opacity={0.8}
                  >
                    {node.xp_required}
                  </text>
                </>
              )}

              {/* Node name label below hex */}
              <text
                x={cx}
                y={cy + HEX_SIZE + 14}
                textAnchor="middle"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fill={state === "unlocked" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                className="select-none pointer-events-none"
                opacity={state === "locked" ? 0.35 : 0.9}
              >
                {node.node_name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip / detail panel */}
      {selected && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[340px] max-w-[90vw] rounded-lg border bg-card/95 backdrop-blur-md p-5 space-y-3 z-20 animate-fade-in"
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 20px ${colors.glow}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel text-sm font-bold">{selected.node_name}</h3>
              <span
                className="font-mono-stat text-[9px] uppercase tracking-wider"
                style={{ color: colors.primary }}
              >
                {selected.node_type} · Tier {selected.tier} · {getTierRarity(selected.tier)}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="font-mono-stat text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <p className="font-body text-xs text-muted-foreground">{selected.description}</p>

          <div
            className="rounded-md p-2.5 font-mono-stat text-[10px]"
            style={{ background: colors.bg, color: colors.primary }}
          >
            ◆ {selected.bonus_description}
          </div>

          <div className="flex items-center justify-between font-mono-stat text-[10px]">
            <span className="text-muted-foreground">
              Required: {selected.xp_required} {statName} XP
            </span>
            <span className={statXp >= selected.xp_required ? "text-primary" : "text-destructive"}>
              You: {statXp}
            </span>
          </div>

          {(() => {
            const state = getNodeState(selected, unlockedIds, statXp);
            if (state === "unlocked") {
              return (
                <div className="text-center font-mono-stat text-[10px] text-primary py-1">
                  ✓ UNLOCKED
                </div>
              );
            }
            if (state === "available") {
              return (
                <button
                  onClick={() => handleUnlock(selected)}
                  disabled={unlocking}
                  className="w-full py-2 rounded-md font-cinzel text-xs font-bold tracking-wider transition-all"
                  style={{
                    background: colors.primary,
                    color: "hsl(var(--card))",
                    boxShadow: `0 0 12px ${colors.glow}`,
                  }}
                >
                  {unlocking ? "UNLOCKING..." : "◆ UNLOCK NODE"}
                </button>
              );
            }
            return (
              <div className="text-center font-mono-stat text-[10px] text-muted-foreground py-1">
                🔒 {!selected.prerequisite_node_id || unlockedIds.has(selected.prerequisite_node_id)
                  ? `Need ${selected.xp_required} XP`
                  : "Prerequisite not unlocked"}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
