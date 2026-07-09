import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { getArchetype } from "@/lib/archetypes";
import { Link } from "react-router-dom";

export function DreamBoardWidget() {
  const { user } = useAuth();
  const [archetype, setArchetype] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<Array<{ item_type: string; content: string }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: board } = await dataClient
        .from("dream_boards")
        .select("id, ai_analysis, last_analyzed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (board) {
        const analysis = board.ai_analysis as Record<string, unknown> | null;
        if (analysis?.motivational_archetype) setArchetype(analysis.motivational_archetype as string);
        if (board.last_analyzed_at) setLastAnalyzed(board.last_analyzed_at);

        const { data: items } = await dataClient
          .from("dream_board_items")
          .select("item_type, content")
          .eq("board_id", board.id)
          .order("added_at", { ascending: false })
          .limit(3);
        if (items) setPreviewItems(items);
      }
    })();
  }, [user]);

  const arch = archetype ? getArchetype(archetype) : null;

  return (
    <Link to="/dream-board" className="block">
      <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-2">
          <p className="font-mono-stat text-xs uppercase tracking-widest text-muted-foreground">◈ Dream Board</p>

          {previewItems.length > 0 ? (
            <div className="flex gap-2">
              {previewItems.map((it, i) => (
                <div key={i} className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border border-border">
                  {it.item_type === "image" ? (
                    <img src={it.content} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-[10px] font-body text-foreground/70 p-1 text-center leading-tight truncate">
                      {it.content.slice(0, 30)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-body">No items yet — start pinning your dreams.</p>
          )}

          {arch && (
            <p className="font-body text-sm text-foreground">
              <span className="mr-1">{arch.icon}</span>
              <span className="text-primary font-semibold">{arch.name}</span>
            </p>
          )}

          {lastAnalyzed && (
            <p className="font-mono-stat text-[10px] text-muted-foreground">
              Last analyzed: {new Date(lastAnalyzed).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
