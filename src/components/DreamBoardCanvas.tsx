import { useState, useRef } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { DreamBoardItem, type DreamBoardItemData } from "./DreamBoardItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  boardId: string;
  items: DreamBoardItemData[];
  setItems: React.Dispatch<React.SetStateAction<DreamBoardItemData[]>>;
  analyzingItemId: string | null;
}

export function DreamBoardCanvas({ boardId, items, setItems, analyzingItemId }: Props) {
  const { user } = useAuth();
  const [addMode, setAddMode] = useState<"quote" | "word" | "goal" | "image" | null>(null);
  const [textInput, setTextInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addItem = async (type: DreamBoardItemData["item_type"], content: string) => {
    if (!content.trim()) return;
    const newItem = {
      board_id: boardId,
      item_type: type,
      content,
      position_x: 40 + Math.random() * 300,
      position_y: 40 + Math.random() * 300,
      size: "medium" as const,
      color_override: null,
    };

    const { data, error } = await dataClient.from("dream_board_items").insert(newItem).select().single();
    if (error) { toast.error("Failed to add item"); return; }
    setItems((prev) => [...prev, data as unknown as DreamBoardItemData]);
    setAddMode(null);
    setTextInput("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await dataClient.storage.from("dream-board-images").upload(path, file);
    if (uploadError) { toast.error("Upload failed"); return; }

    const { data: urlData } = dataClient.storage.from("dream-board-images").getPublicUrl(path);
    await addItem("image", urlData.publicUrl);
    if (fileRef.current) fileRef.current.value = "";
    setAddMode(null);
  };

  const handleMove = (id: string, x: number, y: number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, position_x: x, position_y: y } : it)));
    // Debounced save handled on pointer up via the item
    dataClient.from("dream_board_items").update({ position_x: x, position_y: y }).eq("id", id).then();
  };

  const handleResize = async (id: string, size: "small" | "medium" | "large") => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, size } : it)));
    await dataClient.from("dream_board_items").update({ size }).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await dataClient.from("dream_board_items").delete().eq("id", id);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-border bg-card/50">
        <Button size="sm" variant={addMode === "quote" ? "default" : "outline"} onClick={() => setAddMode(addMode === "quote" ? null : "quote")}>
          + Quote
        </Button>
        <Button size="sm" variant={addMode === "word" ? "default" : "outline"} onClick={() => setAddMode(addMode === "word" ? null : "word")}>
          + Word
        </Button>
        <Button size="sm" variant={addMode === "goal" ? "default" : "outline"} onClick={() => setAddMode(addMode === "goal" ? null : "goal")}>
          + Goal
        </Button>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          + Image
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Add form */}
      {addMode && addMode !== "image" && (
        <div className="flex gap-2 p-3 border-b border-border bg-card/30">
          <Input
            placeholder={addMode === "quote" ? "Enter a quote..." : addMode === "word" ? "Enter a word..." : "Enter your goal..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem(addMode, textInput)}
            className="flex-1"
          />
          <Button size="sm" onClick={() => addItem(addMode, textInput)}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAddMode(null); setTextInput(""); }}>Cancel</Button>
        </div>
      )}

      {/* Canvas */}
      <div
        className="relative flex-1 min-h-[500px] overflow-auto"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {items.map((item) => (
          <DreamBoardItem
            key={item.id}
            item={item}
            onMove={handleMove}
            onResize={handleResize}
            onDelete={handleDelete}
            glowing={analyzingItemId === item.id}
          />
        ))}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono-stat text-sm text-muted-foreground">
              ◈ Pin your dreams here. Add quotes, words, goals, or images.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
