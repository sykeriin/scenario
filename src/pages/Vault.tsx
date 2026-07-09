import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { VaultGraph } from "@/components/VaultGraph";

type VaultEntry = {
  id: string;
  user_id: string;
  source_quest_id: string | null;
  source_scenario_id: string | null;
  title: string;
  content: string;
  ai_summary: string | null;
  tags: string[];
  category: string;
  created_at: string;
  is_pinned: boolean;
  is_favorite: boolean;
};

type VaultConnection = {
  id: string;
  entry_id_a: string;
  entry_id_b: string;
  connection_type: string;
};

const CATEGORIES = ["All", "Concept", "Method", "Resource", "Reference", "Insight"];

const CATEGORY_COLORS: Record<string, string> = {
  Concept: "hsl(var(--theme-blue))",
  Method: "hsl(var(--theme-green))",
  Resource: "hsl(30 80% 55%)",
  Reference: "hsl(270 80% 55%)",
  Insight: "hsl(var(--primary))",
};

const Vault = () => {
  const { user } = useAuth();
  const { t } = useUniverse();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [connections, setConnections] = useState<VaultConnection[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "graph">("grid");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Insight");
  const [newTags, setNewTags] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataClient.from("vault_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      dataClient.from("vault_connections").select("*"),
    ]).then(([entriesRes, connRes]) => {
      setEntries((entriesRes.data as any[]) ?? []);
      setConnections((connRes.data as any[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    let result = entries;
    if (categoryFilter !== "All") result = result.filter((e) => e.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          (e.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    }
    // Pinned first
    return result.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  }, [entries, categoryFilter, search]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) return;
    setAdding(true);
    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const { data, error } = await dataClient
      .from("vault_entries")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        ai_summary: newContent.trim().slice(0, 200),
        tags,
        category: newCategory,
      })
      .select()
      .single();
    if (data && !error) {
      setEntries((prev) => [data as any, ...prev]);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      setAddOpen(false);
      toast.success("Added to The Vault!");
    } else {
      toast.error("Failed to add entry");
    }
    setAdding(false);
  };

  const togglePin = async (entry: VaultEntry) => {
    await dataClient.from("vault_entries").update({ is_pinned: !entry.is_pinned }).eq("id", entry.id);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_pinned: !e.is_pinned } : e)));
  };

  const toggleFavorite = async (entry: VaultEntry) => {
    await dataClient.from("vault_entries").update({ is_favorite: !entry.is_favorite }).eq("id", entry.id);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_favorite: !e.is_favorite } : e)));
  };

  const deleteEntry = async (entry: VaultEntry) => {
    await dataClient.from("vault_entries").delete().eq("id", entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setSelectedEntry(null);
    toast.success("Entry removed");
  };

  const handleGraphNodeClick = useCallback((entry: VaultEntry) => {
    setSelectedEntry(entry);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ OPENING THE VAULT...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            SCENARIO
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider flex items-center gap-2">
              🔐 {t('vault')}
            </h1>
            <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
              ◆ {entries.length} insights captured
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="font-mono-stat text-[10px]">+ Add to Vault</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-cinzel">Add Vault Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input placeholder="Insight title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <Textarea placeholder="Content — what's worth remembering?" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={4} />
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Tags (comma-separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
                <Button onClick={handleAdd} disabled={!newTitle.trim() || adding} className="w-full font-cinzel tracking-wider">
                  {adding ? "Adding..." : "Save to Vault"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search insights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs font-mono-stat text-xs"
          />
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`font-mono-stat text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {(["grid", "list", "graph"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`font-mono-stat text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  viewMode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {m === "grid" ? "▦" : m === "list" ? "☰" : "◎"} {m}
              </button>
            ))}
          </div>
        </div>

        {/* Graph View */}
        {viewMode === "graph" && (
          <div className="rounded-lg border bg-card overflow-hidden" style={{ height: 500 }}>
            <VaultGraph entries={filtered} connections={connections} onNodeClick={handleGraphNodeClick} />
          </div>
        )}

        {/* Grid/List View */}
        {viewMode !== "graph" && (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16">
                <p className="font-body text-sm text-muted-foreground">No entries yet. Complete quests to auto-capture insights.</p>
              </div>
            )}
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border bg-card p-4 space-y-2 transition-all hover:border-primary/30 cursor-pointer ${
                  entry.is_pinned ? "ring-1 ring-primary/20" : ""
                } ${viewMode === "list" ? "flex gap-4 items-start" : ""}`}
                style={{ borderLeft: `3px solid ${CATEGORY_COLORS[entry.category] ?? "hsl(var(--border))"}` }}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className={viewMode === "list" ? "flex-1 min-w-0" : ""}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-mono-stat text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: `${CATEGORY_COLORS[entry.category] ?? "hsl(var(--primary))"}20`,
                        color: CATEGORY_COLORS[entry.category] ?? "hsl(var(--primary))",
                      }}
                    >
                      {entry.category}
                    </span>
                    {entry.is_pinned && <span className="text-[10px]">📌</span>}
                    {entry.is_favorite && <span className="text-[10px]">⭐</span>}
                  </div>
                  <h3 className="font-cinzel text-sm font-semibold leading-tight">{entry.title}</h3>
                  <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-3">
                    {entry.ai_summary || entry.content}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(entry.tags as string[]).map((tag) => (
                        <span key={tag} className="font-mono-stat text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="font-mono-stat text-[9px] text-muted-foreground block mt-2">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entry Detail Modal */}
        {selectedEntry && (
          <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-cinzel text-lg">{selectedEntry.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm"
                    style={{
                      background: `${CATEGORY_COLORS[selectedEntry.category] ?? "hsl(var(--primary))"}20`,
                      color: CATEGORY_COLORS[selectedEntry.category] ?? "hsl(var(--primary))",
                    }}
                  >
                    {selectedEntry.category}
                  </span>
                  <span className="font-mono-stat text-[9px] text-muted-foreground">
                    {new Date(selectedEntry.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="font-body text-sm leading-relaxed">{selectedEntry.content}</p>
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(selectedEntry.tags as string[]).map((tag) => (
                      <span key={tag} className="font-mono-stat text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => togglePin(selectedEntry)} className="font-mono-stat text-[10px]">
                    {selectedEntry.is_pinned ? "📌 Unpin" : "📌 Pin"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleFavorite(selectedEntry)} className="font-mono-stat text-[10px]">
                    {selectedEntry.is_favorite ? "⭐ Unfav" : "☆ Fav"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteEntry(selectedEntry)} className="font-mono-stat text-[10px] ml-auto">
                    Delete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm z-50">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", path: "/dashboard", icon: "🏠" },
            { label: "Quests", path: "/scenarios", icon: "⚔️" },
            { label: "Vault", path: "/vault", icon: "🔐" },
            { label: "Stats", path: "/stats", icon: "📊" },
            { label: "Lobby", path: "/lobby", icon: "🏛️" },
          ].map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="text-lg">{t.icon}</span>
              <span className="font-mono-stat text-[9px] uppercase">{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Vault;
