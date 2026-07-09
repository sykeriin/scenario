import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  nebulaId: string;
  onCreated: () => void;
}

export const NebulaDeclarationForm = ({ nebulaId, onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSaving(true);

    const { error } = await dataClient.from("nebula_declarations").insert({
      nebula_id: nebulaId,
      title: title.trim(),
      content: content.trim(),
      created_by: user.id,
    } as any);

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Declaration posted" });
      setTitle("");
      setContent("");
      setExpanded(false);
      onCreated();
    }
    setSaving(false);
  };

  if (!expanded) {
    return (
      <Button variant="outline" size="sm" className="font-mono-stat text-xs" onClick={() => setExpanded(true)}>
        + POST DECLARATION
      </Button>
    );
  }

  return (
    <div className="bg-secondary rounded-lg p-3 space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Declaration title" maxLength={80} className="text-sm" />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your message to the Nebula..." maxLength={500} rows={3} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="font-mono-stat text-xs" onClick={handleSubmit} disabled={saving || !title.trim() || !content.trim()}>
          {saving ? "POSTING..." : "POST"}
        </Button>
        <Button size="sm" variant="ghost" className="font-mono-stat text-xs" onClick={() => setExpanded(false)}>
          CANCEL
        </Button>
      </div>
    </div>
  );
};
