import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { DemonEncounterCard } from "@/components/DemonEncounterCard";

export function DemonEncounterTrigger() {
  const { user } = useAuth();
  const [encounter, setEncounter] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        const { data, error } = await dataClient.functions.invoke("generate-demon-encounter", {
          body: { action: "check" },
        });
        if (error || !data?.encounter) return;
        setEncounter(data.encounter);
      } catch {
        // non-critical
      }
    };

    // Delay to not block dashboard render, after character visits
    const timer = setTimeout(check, 5000);
    return () => clearTimeout(timer);
  }, [user]);

  if (!encounter || dismissed) return null;

  return (
    <DemonEncounterCard
      encounter={encounter}
      onDismiss={() => setDismissed(true)}
    />
  );
}
