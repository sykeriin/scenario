import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PartyData {
  id: string;
  name: string;
  status: string;
  leader_id: string;
}

interface MemberData {
  user_id: string;
  role: string;
  username: string;
  avatar_url: string | null;
}

const MEMBER_COLORS = [
  "hsl(var(--primary))",
  "hsl(210 70% 55%)",
  "hsl(140 60% 45%)",
  "hsl(35 90% 55%)",
];

export const PartyWidget = () => {
  const { user } = useAuth();
  const [party, setParty] = useState<PartyData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Find active party for this user
      const { data: myMemberships } = await dataClient
        .from("party_members")
        .select("party_id")
        .eq("user_id", user.id);

      if (!myMemberships || myMemberships.length === 0) return;

      const partyIds = myMemberships.map((m) => m.party_id);
      const { data: parties } = await dataClient
        .from("parties")
        .select("*")
        .in("id", partyIds)
        .in("status", ["forming", "active"])
        .limit(1);

      if (!parties || parties.length === 0) return;
      const activeParty = parties[0] as PartyData;
      setParty(activeParty);

      // Fetch members with profiles
      const { data: partyMembers } = await dataClient
        .from("party_members")
        .select("user_id, role")
        .eq("party_id", activeParty.id);

      if (partyMembers && partyMembers.length > 0) {
        const userIds = partyMembers.map((m) => m.user_id);
        const { data: profiles } = await dataClient
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        const memberList = partyMembers.map((m) => {
          const profile = (profiles ?? []).find((p) => p.id === m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            username: profile?.display_name || profile?.username || "Unknown",
            avatar_url: profile?.avatar_url ?? null,
          };
        });
        setMembers(memberList);
      }
    };

    load();
  }, [user]);

  if (!party) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <SectionLabel prefix="◆">Active Party</SectionLabel>
      <div className="font-cinzel text-sm font-bold text-center">{party.name}</div>
      <div className="font-mono-stat text-[9px] text-center text-muted-foreground uppercase">
        {party.status} · {members.length} members
      </div>

      {/* Member avatars cluster */}
      <div className="flex justify-center -space-x-2">
        {members.map((m, i) => (
          <div
            key={m.user_id}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              background: MEMBER_COLORS[i % MEMBER_COLORS.length],
              borderColor: "hsl(var(--card))",
              zIndex: members.length - i,
            }}
            title={`${m.username}${m.role === "leader" ? " (Leader)" : ""}`}
          >
            {m.username.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Member list */}
      <div className="space-y-1">
        {members.map((m, i) => (
          <div key={m.user_id} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
            />
            <span className="font-mono-stat text-[9px] truncate">
              {m.username}
              {m.role === "leader" && <span className="text-primary ml-1">★</span>}
            </span>
          </div>
        ))}
      </div>

      <Link to={`/party/${party.id}`}>
        <Button variant="outline" size="sm" className="w-full font-mono-stat text-[9px] mt-2">
          View Party →
        </Button>
      </Link>
    </div>
  );
};
