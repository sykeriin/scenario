import { useEffect, useRef, useState, useCallback } from "react";

type VaultEntry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  is_pinned: boolean;
  is_favorite: boolean;
};

type VaultConnection = {
  id: string;
  entry_id_a: string;
  entry_id_b: string;
  connection_type: string;
};

interface VaultGraphProps {
  entries: VaultEntry[];
  connections: VaultConnection[];
  onNodeClick?: (entry: VaultEntry) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Concept: "#4A9EFF",
  Method: "#4ADE80",
  Resource: "#F59E0B",
  Reference: "#A855F7",
  Insight: "#F97316",
};

type NodePos = { x: number; y: number; vx: number; vy: number; entry: VaultEntry };

export const VaultGraph = ({ entries, connections, onNodeClick }: VaultGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NodePos[]>([]);
  const [edges, setEdges] = useState<{ a: string; b: string }[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const nodesRef = useRef<NodePos[]>([]);

  // Build tag-based edges + explicit connections
  useEffect(() => {
    const tagEdges: { a: string; b: string }[] = [];
    const seen = new Set<string>();

    // Tag-based connections
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const shared = (entries[i].tags || []).filter((t: string) => (entries[j].tags || []).includes(t));
        if (shared.length > 0) {
          const key = [entries[i].id, entries[j].id].sort().join("-");
          if (!seen.has(key)) {
            seen.add(key);
            tagEdges.push({ a: entries[i].id, b: entries[j].id });
          }
        }
      }
    }

    // Explicit connections
    connections.forEach((c) => {
      const key = [c.entry_id_a, c.entry_id_b].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        tagEdges.push({ a: c.entry_id_a, b: c.entry_id_b });
      }
    });

    setEdges(tagEdges);

    // Initialize positions
    const w = 800, h = 500;
    const initialNodes: NodePos[] = entries.map((entry, i) => {
      const angle = (i / entries.length) * Math.PI * 2;
      const r = 150 + Math.random() * 100;
      return {
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        entry,
      };
    });
    nodesRef.current = initialNodes;
    setNodes([...initialNodes]);
  }, [entries, connections]);

  // Force simulation
  useEffect(() => {
    let iterations = 0;
    const maxIterations = 200;

    const simulate = () => {
      if (iterations >= maxIterations) return;
      iterations++;
      const ns = nodesRef.current;
      const damping = 0.85;
      const repulsion = 3000;
      const attraction = 0.005;
      const centerPull = 0.01;
      const cx = 400, cy = 250;

      // Reset forces
      ns.forEach((n) => { n.vx = 0; n.vy = 0; });

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx += fx;
          ns[i].vy += fy;
          ns[j].vx -= fx;
          ns[j].vy -= fy;
        }
      }

      // Attraction along edges
      const nodeMap = new Map(ns.map((n) => [n.entry.id, n]));
      edges.forEach(({ a, b }) => {
        const na = nodeMap.get(a);
        const nb = nodeMap.get(b);
        if (!na || !nb) return;
        const dx = nb.x - na.x;
        const dy = nb.y - na.y;
        const fx = dx * attraction;
        const fy = dy * attraction;
        na.vx += fx;
        na.vy += fy;
        nb.vx -= fx;
        nb.vy -= fy;
      });

      // Center pull
      ns.forEach((n) => {
        n.vx += (cx - n.x) * centerPull;
        n.vy += (cy - n.y) * centerPull;
      });

      // Apply
      ns.forEach((n) => {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
      });

      setNodes([...ns]);
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [edges]);

  // Count connections per node for sizing
  const connectionCount = new Map<string, number>();
  edges.forEach(({ a, b }) => {
    connectionCount.set(a, (connectionCount.get(a) ?? 0) + 1);
    connectionCount.set(b, (connectionCount.get(b) ?? 0) + 1);
  });
  const maxConn = Math.max(1, ...connectionCount.values());

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "rect") {
      setDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({ ...t, scale: Math.max(0.3, Math.min(3, t.scale * delta)) }));
  };

  const nodeMap = new Map(nodes.map((n) => [n.entry.id, n]));

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      viewBox="0 0 800 500"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
    >
      <rect width="800" height="500" fill="transparent" />
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {/* Edges */}
        {edges.map(({ a, b }) => {
          const na = nodeMap.get(a);
          const nb = nodeMap.get(b);
          if (!na || !nb) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.8}
              opacity={0.4}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const conn = connectionCount.get(n.entry.id) ?? 0;
          const size = 8 + (conn / maxConn) * 12;
          const color = CATEGORY_COLORS[n.entry.category] ?? "#F97316";
          const isTop = conn === maxConn && maxConn > 2;

          return (
            <g
              key={n.entry.id}
              onClick={() => onNodeClick?.(n.entry)}
              className="cursor-pointer"
            >
              {isTop && (
                <circle cx={n.x} cy={n.y} r={size + 4} fill="none" stroke="#FFD700" strokeWidth={1.5} opacity={0.5}>
                  <animate attributeName="r" values={`${size + 4};${size + 8};${size + 4}`} dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={size}
                fill={color}
                opacity={0.8}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={n.x}
                y={n.y + size + 12}
                textAnchor="middle"
                fontSize="7"
                fontFamily="JetBrains Mono, monospace"
                fill="hsl(var(--muted-foreground))"
                className="pointer-events-none select-none"
              >
                {n.entry.title.length > 20 ? n.entry.title.slice(0, 18) + "…" : n.entry.title}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
