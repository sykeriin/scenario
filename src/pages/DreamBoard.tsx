import { useEffect, useState, useCallback } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DreamBoardCanvas } from "@/components/DreamBoardCanvas";
import { DreamBoardAnalysis } from "@/components/DreamBoardAnalysis";
import { type DreamBoardItemData } from "@/components/DreamBoardItem";
import { toast } from "sonner";

const DreamBoard = () => {
  const { user } = useAuth();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [items, setItems] = useState<DreamBoardItemData[]>([]);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load or create board
  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: board } = await dataClient
        .from("dream_boards")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!board) {
        const { data: newBoard } = await dataClient
          .from("dream_boards")
          .insert({ user_id: user.id })
          .select()
          .single();
        board = newBoard;
      }

      if (board) {
        setBoardId(board.id);
        const a = board.ai_analysis as Record<string, unknown> | null;
        if (a && Object.keys(a).length > 0) setAnalysis(a);

        const { data: boardItems } = await dataClient
          .from("dream_board_items")
          .select("*")
          .eq("board_id", board.id)
          .order("added_at", { ascending: true });

        if (boardItems) setItems(boardItems as unknown as DreamBoardItemData[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleAnalyze = useCallback(async () => {
    if (!boardId || items.length === 0) {
      toast.error("Add some items to your board first.");
      return;
    }
    setAnalyzing(true);
    setShowAnalysis(true);

    // Sequential glow animation
    for (const item of items) {
      setAnalyzingItemId(item.id);
      await new Promise((r) => setTimeout(r, 400));
    }
    setAnalyzingItemId(null);

    try {
      const { data, error } = await dataClient.functions.invoke("analyze-dream-board", {
        body: {
          boardId,
          items: items.map((it) => ({ item_type: it.item_type, content: it.content })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.result);
      toast.success("Board analyzed successfully!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }, [boardId, items]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING DREAM BOARD...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="font-mono-stat text-xs text-muted-foreground hover:text-primary transition-colors">
            ← Dashboard
          </Link>
          <h1 className="font-cinzel text-xl font-bold text-foreground">Dream Board</h1>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <Button size="sm" variant="outline" onClick={() => setShowAnalysis(!showAnalysis)}>
              {showAnalysis ? "Hide Analysis" : "Show Analysis"}
            </Button>
          )}
          <Button size="sm" onClick={handleAnalyze} disabled={analyzing || items.length === 0}>
            {analyzing ? "◈ Analyzing..." : "✦ Analyze My Board"}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {boardId && (
          <DreamBoardCanvas
            boardId={boardId}
            items={items}
            setItems={setItems}
            analyzingItemId={analyzingItemId}
          />
        )}

        {/* Analysis Sidebar */}
        {showAnalysis && analysis && (
          <div className="w-80 border-l border-border bg-card/30 overflow-y-auto p-4">
            <DreamBoardAnalysis analysis={analysis as Record<string, unknown> & { dominant_themes?: string[]; primary_goal?: string; secondary_goals?: string[]; emotional_tone?: string; scenario_suggestions?: Array<{ title: string; category: string; why: string }>; morning_must_suggestions?: string[]; motivational_archetype?: string }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DreamBoard;
