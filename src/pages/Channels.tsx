import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const THEMES = ["Academic", "Skill", "Career", "Social", "Fitness"] as const;

interface Channel {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  banner_image_url: string | null;
  member_count: number;
  created_at: string;
}

interface ChannelWithMeta extends Channel {
  dokkaebi_names: string[];
  active_scenario_count: number;
  is_member: boolean;
}

const themeColors: Record<string, string> = {
  Academic: "hsl(210 80% 55%)",
  Skill: "hsl(32 90% 50%)",
  Career: "hsl(270 60% 55%)",
  Social: "hsl(340 70% 55%)",
  Fitness: "hsl(0 80% 55%)",
};

const Channels = () => {
  const { user } = useAuth();
  const { t } = useUniverse();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<ChannelWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", theme: "Academic" });

  useEffect(() => {
    loadChannels();
  }, [user]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const { data: channelData } = await dataClient
        .from("channels")
        .select("*")
        .order("member_count", { ascending: false });

      if (!channelData || channelData.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      const channelIds = channelData.map((c) => c.id);

      // Fetch members (dokkaebi) and user membership in parallel
      const [membersRes, scenariosRes] = await Promise.all([
        dataClient.from("channel_members").select("channel_id, user_id, role").in("channel_id", channelIds),
        dataClient.from("channel_scenarios").select("channel_id").in("channel_id", channelIds).eq("status", "active"),
      ]);

      const members = membersRes.data ?? [];
      const scenarios = scenariosRes.data ?? [];

      // Get dokkaebi profile names
      const dokkaebiIds = [...new Set(members.filter((m) => m.role === "dokkaebi").map((m) => m.user_id))];
      const { data: profiles } = dokkaebiIds.length > 0
        ? await dataClient.from("profiles").select("id, username").in("id", dokkaebiIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

      const enriched: ChannelWithMeta[] = channelData.map((ch) => {
        const chMembers = members.filter((m) => m.channel_id === ch.id);
        const dokkaebi = chMembers.filter((m) => m.role === "dokkaebi");
        return {
          ...ch,
          dokkaebi_names: dokkaebi.map((d) => profileMap.get(d.user_id) ?? "Unknown"),
          active_scenario_count: scenarios.filter((s) => s.channel_id === ch.id).length,
          is_member: user ? chMembers.some((m) => m.user_id === user.id) : false,
        };
      });

      setChannels(enriched);
    } catch (e: any) {
      toast.error(e.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    if (!user || !form.name.trim()) return;
    setCreating(true);
    try {
      const { data: newChannel, error } = await dataClient
        .from("channels")
        .insert({ name: form.name.trim(), description: form.description.trim() || null, theme: form.theme, member_count: 1 })
        .select()
        .single();

      if (error) throw error;

      // Add creator as dokkaebi
      await dataClient.from("channel_members").insert({
        channel_id: newChannel.id,
        user_id: user.id,
        role: "dokkaebi",
      });

      toast.success("Channel created! You are its first Dokkaebi.");
      setShowCreate(false);
      setForm({ name: "", description: "", theme: "Academic" });
      navigate(`/channels/${newChannel.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!user || joining) return;
    setJoining(channelId);
    try {
      await dataClient.from("channel_members").insert({
        channel_id: channelId,
        user_id: user.id,
        role: "reader",
      });

      // Increment member_count
      const ch = channels.find((c) => c.id === channelId);
      if (ch) {
        await dataClient.from("channels").update({ member_count: ch.member_count + 1 }).eq("id", channelId);
      }

      // Auto-enroll in all active mandatory scenarios
      const { data: mandatoryScenarios } = await dataClient
        .from("channel_scenarios")
        .select("id")
        .eq("channel_id", channelId)
        .eq("status", "active")
        .eq("is_mandatory", true);

      if (mandatoryScenarios && mandatoryScenarios.length > 0) {
        const inserts = mandatoryScenarios.map((s) => ({
          channel_scenario_id: s.id,
          user_id: user.id,
          status: "enrolled",
        }));
        await dataClient.from("channel_scenario_progress").insert(inserts);
      }

      toast.success("Joined channel as Reader!");
      navigate(`/channels/${channelId}`);
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        toast.info("Already a member!");
        navigate(`/channels/${channelId}`);
      } else {
        toast.error(e.message || "Failed to join");
      }
    } finally {
      setJoining(null);
    }
  };

  const filtered = filter ? channels.filter((c) => c.theme === filter) : channels;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/dashboard" className="font-cinzel text-lg font-bold tracking-[0.15em] text-primary">
            {t('guild').toUpperCase()}S
          </Link>
          <Link to="/dashboard" className="font-mono-stat text-[11px] text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8 space-y-2">
          <h1 className="font-cinzel text-2xl font-bold text-primary tracking-wider">◆ {t('guild').toUpperCase()} DISCOVERY</h1>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
            Join a {t('guild').toLowerCase()}. Complete {t('scenario').toLowerCase()}s. Rise under your {t('dokkaebi')}'s guidance.
          </p>
        </div>

        {/* Filter + Create */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={`font-mono-stat text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border transition-all ${
                !filter ? "border-primary/50 text-primary bg-primary/10" : "text-muted-foreground hover:border-primary/30"
              }`}
            >
              All
            </button>
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`font-mono-stat text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border transition-all ${
                  filter === t ? "border-primary/50 text-primary bg-primary/10" : "text-muted-foreground hover:border-primary/30"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="font-mono-stat text-[10px] glow-accent"
          >
            + Create Channel
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-lg border bg-card p-5 mb-6 space-y-4 animate-fade-in">
            <SectionLabel prefix="◈">Create New Channel</SectionLabel>
            <input
              type="text"
              placeholder="Channel Name (e.g. The Iron Gauntlet)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <textarea
              placeholder="Description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, theme: t })}
                  className={`font-mono-stat text-[10px] px-3 py-1.5 rounded border transition-all ${
                    form.theme === t ? "border-primary/50 text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createChannel} disabled={creating || !form.name.trim()} className="font-mono-stat text-[10px]">
                {creating ? "Creating..." : "◈ Create & Become Dokkaebi"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="font-mono-stat text-[10px]">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Channel Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ SCANNING CHANNELS...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="font-cinzel text-lg text-muted-foreground">No channels found.</p>
            <p className="font-body text-sm text-muted-foreground">Create the first one and become its Dokkaebi.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ch) => (
              <div
                key={ch.id}
                className="rounded-lg border bg-card overflow-hidden transition-all hover:border-primary/30 group"
              >
                {/* Banner */}
                <div
                  className="h-20 relative"
                  style={{
                    background: ch.banner_image_url
                      ? `url(${ch.banner_image_url}) center/cover`
                      : `linear-gradient(135deg, ${themeColors[ch.theme] ?? "hsl(var(--primary))"}, hsl(var(--background)))`,
                  }}
                >
                  <div className="absolute top-2 right-2">
                    <span className="font-mono-stat text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-foreground">
                      {ch.theme}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-cinzel text-base font-bold text-foreground">{ch.name}</h3>
                  {ch.description && (
                    <p className="font-body text-xs text-muted-foreground line-clamp-2">{ch.description}</p>
                  )}

                  {/* Dokkaebi list */}
                  {ch.dokkaebi_names.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary text-xs" style={{ textShadow: "0 0 6px hsl(var(--glow) / 0.5)" }}>◈</span>
                      <span className="font-mono-stat text-[10px] text-muted-foreground">
                        {ch.dokkaebi_names.join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="font-mono-stat text-[10px]">{ch.member_count} members</span>
                    <span className="font-mono-stat text-[10px]">{ch.active_scenario_count} active</span>
                  </div>

                  {ch.is_member ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-mono-stat text-[10px]"
                      onClick={() => navigate(`/channels/${ch.id}`)}
                    >
                      Enter Channel →
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full font-mono-stat text-[10px] glow-accent"
                      onClick={() => joinChannel(ch.id)}
                      disabled={joining === ch.id}
                    >
                      {joining === ch.id ? "Joining..." : "⬡ Join as Reader"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Channels;
