import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface DreamBoardItemData {
  id: string;
  board_id: string;
  item_type: "image" | "quote" | "word" | "goal";
  content: string;
  position_x: number;
  position_y: number;
  size: "small" | "medium" | "large";
  color_override: string | null;
  added_at: string;
}

interface Props {
  item: DreamBoardItemData;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, size: "small" | "medium" | "large") => void;
  onDelete: (id: string) => void;
  glowing?: boolean;
}

const SIZE_MAP = {
  small: "w-28 h-28",
  medium: "w-44 h-44",
  large: "w-64 h-64",
};

const NEXT_SIZE: Record<string, "small" | "medium" | "large"> = {
  small: "medium",
  medium: "large",
  large: "small",
};

export function DreamBoardItem({ item, onMove, onResize, onDelete, glowing }: Props) {
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    offset.current = { x: e.clientX - item.position_x, y: e.clientY - item.position_y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [item.position_x, item.position_y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    onMove(item.id, e.clientX - offset.current.x, e.clientY - offset.current.y);
  }, [dragging, item.id, onMove]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const colorStyle = item.color_override ? { borderColor: item.color_override, boxShadow: `0 4px 20px ${item.color_override}40` } : {};

  return (
    <div
      className={cn(
        "absolute rounded-xl border-2 border-border bg-card shadow-lg cursor-grab select-none flex flex-col items-center justify-center p-3 text-center transition-shadow",
        SIZE_MAP[item.size],
        dragging && "cursor-grabbing z-50 shadow-2xl",
        glowing && "ring-2 ring-primary animate-pulse"
      )}
      style={{
        transform: `translate(${item.position_x}px, ${item.position_y}px)`,
        ...colorStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Controls */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onResize(item.id, NEXT_SIZE[item.size]); }}
          className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center hover:bg-accent"
        >⤢</button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
        >×</button>
      </div>

      {/* Content */}
      {item.item_type === "image" && (
        <img src={item.content} alt="Vision" className="w-full h-full object-cover rounded-lg" draggable={false} />
      )}
      {item.item_type === "quote" && (
        <p className="font-body text-sm italic text-foreground/90 leading-relaxed">"{item.content}"</p>
      )}
      {item.item_type === "word" && (
        <p className="font-cinzel text-2xl font-bold text-primary tracking-wide uppercase">{item.content}</p>
      )}
      {item.item_type === "goal" && (
        <div className="space-y-1">
          <span className="font-mono-stat text-[10px] uppercase tracking-widest text-primary">◆ Goal</span>
          <p className="font-body text-sm font-medium text-foreground">{item.content}</p>
        </div>
      )}
    </div>
  );
}
