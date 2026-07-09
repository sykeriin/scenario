import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nebulaId: string;
  nebulaName: string;
  domain: string;
  motto: string;
}

interface ConstellationUser {
  id: string;
  username: string;
  display_name: string | null;
  constellation_grade: string;
}

export const NebulaInviteDialog = ({ open, onOpenChange, nebulaId, nebulaName, domain, motto }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [constellations, setConstellations] = useState<ConstellationUser[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    // Get all constellations (users who are mentors)
    const { data: mentors } = await dataClient
      .from("constellations")
      .select("mentor_id")
      .eq("active", true);
    
    const mentorIds = [...new Set((mentors ?? []).map((m: any) => m.mentor_id))];
    if (mentorIds.length === 0) { setConstellations([]); return; }

    const [profilesRes, membersRes, invitesRes] = await Promise.all([
      dataClient.from("profiles").select("id, username, display_name, constellation_grade").in("id", mentorIds),
      dataClient.from("nebula_members").select("user_id").eq("nebula_id", nebulaId),
      dataClient.from("nebula_invites").select("invited_user_id").eq("nebula_id", nebulaId).eq("status", "pending"),
    ]);

    setConstellations((profilesRes.data as any[]) ?? []);
    setExistingMembers(((membersRes.data as any[]) ?? []).map((m: any) => m.user_id));
    setPendingInvites(((invitesRes.data as any[]) ?? []).map((i: any) => i.invited_user_id));
  };

  const sendInvite = async (targetId: string) => {
    if (!user) return;
    setSending(targetId);
    
    const { error } = await dataClient.from("nebula_invites").insert({
      nebula_id: nebulaId,
      invited_by: user.id,
      invited_user_id: targetId,
    } as any);

    if (error) {
      toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite sent", description: "The Constellation has been invited." });
      setPendingInvites((prev) => [...prev, targetId]);
    }
    setSending(null);
  };

  const available = constellations.filter(
    (c) => c.id !== user?.id && !existingMembers.includes(c.id) && !pendingInvites.includes(c.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg text-foreground">✦ Invite Constellation</DialogTitle>
        </DialogHeader>
        <p className="font-mono-stat text-xs text-muted-foreground">
          Invite a Constellation to join {nebulaName}.
        </p>
        <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
          {available.length === 0 ? (
            <p className="font-mono-stat text-xs text-muted-foreground">No available Constellations to invite.</p>
          ) : (
            available.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                <div>
                  <p className="font-body text-sm text-foreground">{c.display_name || c.username}</p>
                  <p className="font-mono-stat text-[10px] text-muted-foreground">{c.constellation_grade}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono-stat text-[10px]"
                  disabled={sending === c.id}
                  onClick={() => sendInvite(c.id)}
                >
                  {sending === c.id ? "..." : "INVITE"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
