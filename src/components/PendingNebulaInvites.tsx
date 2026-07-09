import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Invite {
  id: string;
  nebula_id: string;
  invited_by: string;
  status: string;
  nebula?: { name: string; domain: string; motto: string };
  inviter?: { username: string; display_name: string | null };
}

export const PendingNebulaInvites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (user) fetchInvites();
  }, [user]);

  const fetchInvites = async () => {
    const { data } = await dataClient
      .from("nebula_invites")
      .select("*, nebula:nebulae(name, domain, motto), inviter:profiles!nebula_invites_invited_by_fkey(username, display_name)")
      .eq("invited_user_id", user!.id)
      .eq("status", "pending");
    setInvites((data as any[]) ?? []);
  };

  const respond = async (invite: Invite, accept: boolean) => {
    await dataClient
      .from("nebula_invites")
      .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() } as any)
      .eq("id", invite.id);

    if (accept) {
      await dataClient.from("nebula_members").insert({
        nebula_id: invite.nebula_id,
        user_id: user!.id,
        role: "member",
      } as any);

      // Increment member count
      await dataClient.rpc("add_xp" as any, { user_id_param: user!.id, amount: 0 }); // no-op to keep types happy
      // Actually update count via direct update
      const { data: currentNebula } = await dataClient.from("nebulae").select("member_count").eq("id", invite.nebula_id).single();
      if (currentNebula) {
        await dataClient.from("nebulae").update({ member_count: (currentNebula as any).member_count + 1 } as any).eq("id", invite.nebula_id);
      }

      toast({ title: "◆ YOUR STAR ALIGNS", description: `You have joined ${invite.nebula?.name}.` });
    } else {
      toast({ title: "Invitation declined" });
    }
    fetchInvites();
  };

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3">
      {invites.map((inv) => (
        <div key={inv.id} className="bg-card border border-primary/30 rounded-lg p-4">
          <p className="font-mono-stat text-xs text-primary mb-2">◆ NEBULA INVITATION</p>
          <p className="font-body text-sm text-foreground">
            <span className="text-primary">{inv.inviter?.display_name || inv.inviter?.username}</span> has invited you to join{" "}
            <span className="font-cinzel text-foreground">{inv.nebula?.name}</span>.
          </p>
          <p className="font-body text-xs text-muted-foreground italic mt-1">
            Domain: {inv.nebula?.domain} · "{inv.nebula?.motto}"
          </p>
          <p className="font-mono-stat text-[10px] text-muted-foreground mt-2 italic">
            Will your star align with theirs?
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="font-mono-stat text-xs" onClick={() => respond(inv, true)}>
              ✦ ALIGN
            </Button>
            <Button size="sm" variant="ghost" className="font-mono-stat text-xs" onClick={() => respond(inv, false)}>
              DECLINE
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
