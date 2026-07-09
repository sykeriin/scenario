import { useState, useEffect, useCallback } from "react";
import { dataClient } from "@/lib/data-client";
import { getCharacterByName } from "@/lib/orvCharacters";
import { Button } from "@/components/ui/button";

interface CharacterVisit {
  id: string;
  character_name: string;
  character_title: string;
  visit_type: string;
  message: string;
  scenario_data: any;
  follow_up_message: string | null;
  dismissed_at: string | null;
  accepted: boolean | null;
}

interface Props {
  visit: CharacterVisit;
  characterMeta?: { icon: string; colorPrimary: string; colorSecondary: string; isVillain: boolean };
  onDismiss: () => void;
}

export function CharacterVisitOverlay({ visit, characterMeta, onDismiss }: Props) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [followUp, setFollowUp] = useState<string | null>(visit.follow_up_message);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const char = getCharacterByName(visit.character_name);
  const primary = characterMeta?.colorPrimary ?? char?.colorPrimary ?? "0 0% 50%";
  const secondary = characterMeta?.colorSecondary ?? char?.colorSecondary ?? "0 0% 80%";
  const icon = characterMeta?.icon ?? char?.icon ?? "◈";
  const isVillain = characterMeta?.isVillain ?? char?.isVillain ?? false;

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const words = visit.message.split(" ");
    let i = 0;
    setDisplayedText("");
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < words.length) {
        setDisplayedText((prev) => (prev ? prev + " " + words[i] : words[i]));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [visit.message]);

  const handleDismiss = useCallback(async () => {
    setExiting(true);
    await dataClient
      .from("character_visits")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", visit.id);
    setTimeout(onDismiss, 400);
  }, [visit.id, onDismiss]);

  const handleAccept = useCallback(async () => {
    await dataClient
      .from("character_visits")
      .update({ accepted: true, dismissed_at: new Date().toISOString() })
      .eq("id", visit.id);
    setExiting(true);
    setTimeout(onDismiss, 400);
  }, [visit.id, onDismiss]);

  const handleFollowUp = useCallback(async () => {
    setLoadingFollowUp(true);
    try {
      const { data } = await dataClient.functions.invoke("generate-character-visit", {
        body: { action: "follow_up", visitId: visit.id },
      });
      if (data?.follow_up) setFollowUp(data.follow_up);
    } catch { /* ignore */ }
    setLoadingFollowUp(false);
  }, [visit.id]);

  const borderColor = `hsl(${primary})`;
  const glowColor = `hsl(${primary} / 0.3)`;
  const textColor = `hsl(${secondary})`;

  // Visit type button config
  const getButtons = () => {
    switch (visit.visit_type) {
      case "challenge":
        return [
          { label: "I accept", action: handleAccept, variant: "default" as const },
          { label: "Not today", action: handleDismiss, variant: "ghost" as const },
        ];
      case "taunt":
        return [
          { label: "Prove me wrong", action: handleAccept, variant: "default" as const },
          { label: "...", action: handleDismiss, variant: "ghost" as const },
        ];
      case "prophecy":
        return [
          { label: "I understand", action: handleDismiss, variant: "default" as const },
        ];
      case "scenario":
        return [
          { label: "Accept", action: handleAccept, variant: "default" as const },
          { label: "Respectfully decline", action: handleDismiss, variant: "ghost" as const },
        ];
      default: // advice, comfort, warning
        return [
          { label: "Thank you", action: handleDismiss, variant: "default" as const },
          ...(!followUp ? [{ label: loadingFollowUp ? "..." : "Tell me more", action: handleFollowUp, variant: "ghost" as const }] : []),
        ];
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: isVillain
          ? `radial-gradient(ellipse at center, hsl(${primary} / 0.15) 0%, hsl(0 0% 0% / 0.9) 100%)`
          : `radial-gradient(ellipse at center, hsl(${primary} / 0.08) 0%, hsl(0 0% 0% / 0.85) 100%)`,
        opacity: visible && !exiting ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="max-w-md w-full rounded-xl p-6 space-y-5"
        style={{
          background: "hsl(var(--card))",
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 30px ${glowColor}, inset 0 0 20px ${glowColor}`,
          animation: isVillain ? "character-pulse 2s ease-in-out infinite" : undefined,
        }}
      >
        {/* Character header */}
        <div className="text-center space-y-1">
          <div className="text-3xl">{icon}</div>
          <div
            className="font-cinzel text-lg font-bold tracking-wider"
            style={{ color: borderColor }}
          >
            {visit.character_name.toUpperCase()}
          </div>
          <div
            className="font-mono-stat text-[10px] uppercase tracking-[0.2em]"
            style={{ color: textColor, opacity: 0.7 }}
          >
            {visit.character_title}
          </div>
        </div>

        {/* Message with typewriter */}
        <div className="min-h-[80px]">
          <p
            className="font-body text-sm leading-relaxed italic"
            style={{ color: `hsl(${secondary})` }}
          >
            "{displayedText}
            {isTyping && <span className="animate-pulse">▌</span>}"
          </p>
        </div>

        {/* Follow-up message */}
        {followUp && (
          <div
            className="border-t pt-3"
            style={{ borderColor: `hsl(${primary} / 0.2)` }}
          >
            <p
              className="font-body text-sm leading-relaxed italic"
              style={{ color: `hsl(${secondary})`, opacity: 0.85 }}
            >
              "{followUp}"
            </p>
          </div>
        )}

        {/* Scenario data */}
        {visit.scenario_data && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{ background: `hsl(${primary} / 0.08)`, border: `1px solid hsl(${primary} / 0.2)` }}
          >
            <div className="font-cinzel text-xs font-semibold" style={{ color: borderColor }}>
              {visit.scenario_data.scenario_title}
            </div>
            {visit.scenario_data.quests?.map((q: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-mono-stat text-[9px] text-muted-foreground">⚔ {q.damage ?? 100}</span>
                <span className="font-body text-xs" style={{ color: textColor }}>{q.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!isTyping && (
          <div className="flex gap-2 justify-center pt-2">
            {getButtons().map((btn, i) => (
              <Button
                key={i}
                variant={btn.variant}
                size="sm"
                onClick={btn.action}
                className="font-mono-stat text-[10px] uppercase tracking-wider"
                style={
                  btn.variant === "default"
                    ? { background: borderColor, color: "hsl(var(--card))" }
                    : {}
                }
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}

        {/* Visit type badge */}
        <div className="text-center">
          <span
            className="font-mono-stat text-[8px] uppercase tracking-[0.3em]"
            style={{ color: `hsl(${primary} / 0.5)` }}
          >
            {visit.visit_type}
          </span>
        </div>
      </div>
    </div>
  );
}
