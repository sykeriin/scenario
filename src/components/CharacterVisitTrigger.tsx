import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { useUniverse } from "@/hooks/useUniverse";
import { CharacterVisitOverlay } from "@/components/CharacterVisitOverlay";
import { SL_CHARACTERS } from "@/lib/solo-leveling/sl-characters";

export function CharacterVisitTrigger() {
  const { user } = useAuth();
  const { isSoloLeveling } = useUniverse();
  const [visit, setVisit] = useState<any>(null);
  const [charMeta, setCharMeta] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchVisit = async () => {
      try {
        if (isSoloLeveling) {
          const profile = await dataClient.from("profiles").select("*").eq("id", user.id).single();
          const penalty = profile.data?.penalty_zone_active;
          const char = penalty ? SL_CHARACTERS.find((c) => c.name === "Hwang Dongsoo") : SL_CHARACTERS[0];
          if (char && Math.random() > 0.7) {
            setVisit({
              id: crypto.randomUUID(),
              character_name: char.name,
              message: `"${char.voice}" — The System relays a message from ${char.title}.`,
              visit_type: "sl_encounter",
            });
            setCharMeta(char);
          }
          return;
        }
        const { data, error } = await dataClient.functions.invoke("generate-character-visit", {
          body: { action: "check" },
        });
        if (error || !data?.visit) return;
        if (data.visit.dismissed_at) return;
        setVisit(data.visit);
        if (data.character) setCharMeta(data.character);
      } catch {
        /* non-critical */
      }
    };

    const timer = setTimeout(fetchVisit, 2000);
    return () => clearTimeout(timer);
  }, [user, isSoloLeveling]);

  if (!visit || dismissed) return null;

  return (
    <CharacterVisitOverlay
      visit={visit}
      characterMeta={charMeta}
      onDismiss={() => setDismissed(true)}
    />
  );
}
