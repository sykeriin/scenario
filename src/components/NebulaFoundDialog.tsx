import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NEBULA_DOMAINS, DOMAIN_OPTIONS, NebulaDomainKey } from "@/lib/nebulaDomains";

const EMBLEM_OPTIONS = ["⭐", "🌟", "💫", "✨", "🔥", "⚡", "🌙", "☀️", "🌊", "🏔️", "🗡️", "📜", "🧠", "🎭", "🦅", "🐉"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const NebulaFoundDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [domain, setDomain] = useState<NebulaDomainKey>("Papyrus");
  const [emblem, setEmblem] = useState("⭐");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);

    const domainInfo = NEBULA_DOMAINS[domain];
    const { data, error } = await dataClient
      .from("nebulae")
      .insert({
        name: name.trim(),
        motto: motto.trim(),
        domain,
        founder_id: user.id,
        banner_color: `hsl(${domainInfo.color})`,
        emblem_icon: emblem,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to create Nebula", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Add founder as member
    await dataClient.from("nebula_members").insert({
      nebula_id: (data as any).id,
      user_id: user.id,
      role: "founder",
    } as any);

    toast({ title: "◆ NEBULA FOUNDED", description: `${name} has been born among the stars.` });
    onOpenChange(false);
    onCreated();
    setSaving(false);
    setName("");
    setMotto("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg text-foreground">✧ Found a Nebula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-mono-stat text-xs text-muted-foreground">NEBULA NAME</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Papyrus Nebula" maxLength={40} className="mt-1" />
          </div>
          <div>
            <Label className="font-mono-stat text-xs text-muted-foreground">MOTTO</Label>
            <Input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="e.g. Knowledge is the only true power." maxLength={100} className="mt-1" />
          </div>
          <div>
            <Label className="font-mono-stat text-xs text-muted-foreground">DOMAIN</Label>
            <Select value={domain} onValueChange={(v) => setDomain(v as NebulaDomainKey)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {NEBULA_DOMAINS[d].icon} {NEBULA_DOMAINS[d].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-mono-stat text-xs text-muted-foreground">EMBLEM</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMBLEM_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmblem(e)}
                  className={`w-10 h-10 rounded-md flex items-center justify-center text-xl transition-colors ${
                    emblem === e ? "bg-primary/20 ring-1 ring-primary" : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full font-mono-stat text-xs">
            {saving ? "FOUNDING..." : "✦ FOUND NEBULA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
