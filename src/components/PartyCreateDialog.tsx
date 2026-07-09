import { useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface PartyCreateDialogProps {
  onClose: () => void;
  onCreated: (partyId: string) => void;
}

export const PartyCreateDialog = ({ onClose, onCreated }: PartyCreateDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(4);
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitedUsers, setInvitedUsers] = useState<{ id: string; username: string }[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [creating, setCreating] = useState(false);

  const addInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviteError("");

    const { data } = await dataClient
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", inviteUsername.trim())
      .maybeSingle();

    if (!data) {
      setInviteError("User not found");
      return;
    }
    if (data.id === user?.id) {
      setInviteError("You're already the leader");
      return;
    }
    if (invitedUsers.find((u) => u.id === data.id)) {
      setInviteError("Already invited");
      return;
    }
    if (invitedUsers.length >= maxMembers - 1) {
      setInviteError("Party is full");
      return;
    }

    setInvitedUsers([...invitedUsers, { id: data.id, username: data.display_name || data.username }]);
    setInviteUsername("");
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);

    // Create party
    const { data: party, error } = await dataClient
      .from("parties")
      .insert({ name: name.trim(), leader_id: user.id, max_members: maxMembers })
      .select()
      .single();

    if (error || !party) {
      setCreating(false);
      return;
    }

    // Add leader as member
    await dataClient.from("party_members").insert({
      party_id: party.id,
      user_id: user.id,
      role: "leader",
    });

    // Add invited members
    if (invitedUsers.length > 0) {
      await dataClient.from("party_members").insert(
        invitedUsers.map((u) => ({
          party_id: party.id,
          user_id: u.id,
          role: "member",
        }))
      );
    }

    setCreating(false);
    onCreated(party.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-lg border bg-card p-6 w-full max-w-md space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <SectionLabel prefix="◆">CREATE PARTY</SectionLabel>
          <p className="font-body text-xs text-muted-foreground mt-1">Assemble your team</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Party Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Readers of Dawn"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={60}
            />
          </div>

          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Max Members</label>
            <div className="flex gap-2 mt-1">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxMembers(n)}
                  className={`font-mono-stat text-xs px-4 py-1.5 rounded-full border transition-all ${
                    maxMembers === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">
              Invite Members ({invitedUsers.length}/{maxMembers - 1})
            </label>
            <div className="flex gap-2 mt-1">
              <input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInvite()}
                placeholder="Enter username"
                className="flex-1 rounded-md border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button variant="outline" size="sm" onClick={addInvite} className="font-mono-stat text-[9px]">
                + Add
              </Button>
            </div>
            {inviteError && <p className="font-mono-stat text-[9px] mt-1" style={{ color: "hsl(0 70% 55%)" }}>{inviteError}</p>}
            {invitedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {invitedUsers.map((u) => (
                  <span key={u.id} className="font-mono-stat text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    {u.username}
                    <button onClick={() => setInvitedUsers(invitedUsers.filter((x) => x.id !== u.id))} className="text-muted-foreground hover:text-foreground">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 font-mono-stat text-[10px]">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim() || creating}
            onClick={handleCreate}
            className="flex-1 font-mono-stat text-[10px]"
          >
            {creating ? "Creating..." : "◆ Create Party"}
          </Button>
        </div>
      </div>
    </div>
  );
};
