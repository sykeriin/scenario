import { dataClient } from "@/lib/data-client";

/**
 * Records a story fragment for all constellations sponsoring the current user.
 * Called after significant achievements.
 */
export async function recordStory(
  sourceType: string,
  sourceId?: string,
  achievementDescription?: string
) {
  try {
    const { data, error } = await dataClient.functions.invoke("record-story", {
      body: {
        source_type: sourceType,
        source_id: sourceId || null,
        achievement_description: achievementDescription || sourceType,
      },
    });

    if (error) {
      console.error("recordStory error:", error);
      return null;
    }

    return data;
  } catch (e) {
    console.error("recordStory failed:", e);
    return null;
  }
}
