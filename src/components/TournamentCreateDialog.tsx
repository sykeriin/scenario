import { useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TournamentCreateDialogProps {
  channelId: string;
  onCreated: () => Promise<void> | void;
}

export function TournamentCreateDialog({ channelId, onCreated }: TournamentCreateDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tournament_name: "",
    scenario_title: "",
    category: "Academic",
    max_participants: 8,
    entry_xp_fee: 100,
    deadline: "",
  });

  const handleCreate = async () => {
    if (!user || !form.tournament_name.trim() || !form.scenario_title.trim() || !form.deadline) return;
    setSubmitting(true);
    try {
      const { error } = await dataClient.from("channel_tournaments").insert({
        channel_id: channelId,
        created_by: user.id,
        tournament_name: form.tournament_name.trim(),
        scenario_title: form.scenario_title.trim(),
        category: form.category,
        max_participants: form.max_participants,
        entry_xp_fee: form.entry_xp_fee,
        deadline: new Date(form.deadline).toISOString(),
        tournament_status: "forming",
        current_round: 1,
        current_participants: 0,
        bracket_structure: [],
      });

      if (error) throw error;

      toast.success("Tournament created.");
      setOpen(false);
      setForm({
        tournament_name: "",
        scenario_title: "",
        category: "Academic",
        max_participants: 8,
        entry_xp_fee: 100,
        deadline: "",
      });
      await onCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create tournament");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-mono-stat text-[10px] uppercase">Host Duel Tournament</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-cinzel tracking-wide">Create Dokkaebi Tournament</DialogTitle>
          <DialogDescription>Bracket elimination tournament for this channel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={form.tournament_name}
            onChange={(e) => setForm((p) => ({ ...p, tournament_name: e.target.value }))}
            placeholder="Tournament name"
          />
          <Input
            value={form.scenario_title}
            onChange={(e) => setForm((p) => ({ ...p, scenario_title: e.target.value }))}
            placeholder="Duel scenario title"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {['Academic', 'Skill', 'Career', 'Social', 'Fitness'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.max_participants}
              onChange={(e) => setForm((p) => ({ ...p, max_participants: Number(e.target.value) }))}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {[4, 8, 16].map((n) => (
                <option key={n} value={n}>{n} players</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              value={form.entry_xp_fee}
              onChange={(e) => setForm((p) => ({ ...p, entry_xp_fee: Number(e.target.value || 0) }))}
              placeholder="Entry XP"
            />
            <Input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || !form.tournament_name || !form.scenario_title || !form.deadline}
          >
            {submitting ? "Creating..." : "Create Tournament"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
