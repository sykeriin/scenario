import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  chapter_content: string;
  month_year: string;
  stats_snapshot: any;
  key_events: any;
  cover_color: string;
  generated_at: string;
}

const Novel = () => {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [username, setUsername] = useState("");
  const [currentTitle, setCurrentTitle] = useState("Nameless Reader");
  const [level, setLevel] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [{ data: profile }, { data: chapterData }] = await Promise.all([
        dataClient.from("profiles").select("username, display_name, current_title, level").eq("id", user.id).single(),
        dataClient.from("novel_chapters").select("*").eq("user_id", user.id).order("chapter_number"),
      ]);

      if (profile) {
        setUsername(profile.display_name || profile.username);
        setCurrentTitle(profile.current_title ?? "Nameless Reader");
        setLevel(profile.level ?? 1);
      }

      const list = (chapterData ?? []) as Chapter[];
      setChapters(list);
      if (list.length > 0) {
        setSelectedChapter(list[list.length - 1]);
        setShowCover(false);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  const generateChapter = async () => {
    if (!user) return;
    setGenerating(true);

    const { data, error } = await dataClient.functions.invoke("generate-novel-chapter", {
      body: {},
    });

    if (!error && data?.chapter) {
      const newChapter = data.chapter as Chapter;
      setChapters((prev) => [...prev, newChapter]);
      setSelectedChapter(newChapter);
      setShowCover(false);
    }
    setGenerating(false);
  };

  const volumeNumber = chapters.length > 0 ? Math.floor((chapters[0].chapter_number - 1) / 12) + 1 : 1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(40 20% 97%)" }}>
        <p className="font-mono-stat text-sm animate-pulse" style={{ color: "hsl(40 10% 40%)" }}>◈ OPENING THE CHRONICLE...</p>
      </div>
    );
  }

  // Cover page
  if (showCover) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative" style={{ background: "linear-gradient(180deg, hsl(40 20% 95%), hsl(40 15% 88%)" }}>
        <Link to="/dashboard" className="absolute top-4 left-4 font-mono-stat text-[11px] hover:underline" style={{ color: "hsl(40 10% 45%)" }}>
          ← Dashboard
        </Link>

        {/* Book cover */}
        <div
          className="w-80 rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${chapters[0]?.cover_color ?? "hsl(45 80% 50%)"}, hsl(40 15% 20%))`,
            aspectRatio: "3/4",
          }}
        >
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="font-mono-stat text-[9px] uppercase tracking-[0.3em] mb-6" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
              Volume {volumeNumber}
            </div>
            <h1 className="font-cinzel text-2xl font-bold leading-tight mb-4" style={{ color: "white" }}>
              {username}'s<br />Chronicle
            </h1>
            <div className="w-12 h-px mb-4" style={{ background: "hsl(0 0% 100% / 0.3)" }} />
            <p className="font-body text-xs italic leading-relaxed mb-6" style={{ color: "hsl(0 0% 100% / 0.7)" }}>
              A Record of Challenges Faced<br />and Paths Cleared
            </p>
            <div className="font-mono-stat text-[8px] uppercase tracking-widest" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
              LV {level} · {currentTitle}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 items-center">
          {chapters.length > 0 ? (
            <Button
              onClick={() => {
                setShowCover(false);
                setSelectedChapter(chapters[chapters.length - 1]);
              }}
              className="font-cinzel text-sm px-8"
              style={{ background: "hsl(40 30% 25%)", color: "hsl(40 20% 90%)" }}
            >
              Continue Reading →
            </Button>
          ) : (
            <Button
              onClick={generateChapter}
              disabled={generating}
              className="font-cinzel text-sm px-8"
              style={{ background: "hsl(40 30% 25%)", color: "hsl(40 20% 90%)" }}
            >
              {generating ? "Writing Chapter 1..." : "Generate First Chapter"}
            </Button>
          )}
          {chapters.length > 0 && (
            <button
              onClick={() => { setShowCover(false); setSelectedChapter(chapters[0]); }}
              className="font-mono-stat text-[10px] underline"
              style={{ color: "hsl(40 10% 50%)" }}
            >
              Start from Chapter 1
            </button>
          )}
        </div>
      </div>
    );
  }

  // Reading view
  return (
    <div className="min-h-screen flex" style={{ background: "hsl(40 20% 97%)" }}>
      {/* Sidebar - Chapter list */}
      {sidebarOpen && (
        <aside
          className="w-64 shrink-0 border-r overflow-y-auto"
          style={{ background: "hsl(40 15% 93%)", borderColor: "hsl(40 10% 85%)" }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Link to="/dashboard" className="font-mono-stat text-[10px]" style={{ color: "hsl(40 10% 50%)" }}>← Back</Link>
              <button onClick={() => setShowCover(true)} className="font-mono-stat text-[10px] underline" style={{ color: "hsl(40 10% 50%)" }}>
                Cover
              </button>
            </div>

            <h2 className="font-cinzel text-sm font-bold mb-1" style={{ color: "hsl(40 10% 25%)" }}>
              {username}'s Chronicle
            </h2>
            <p className="font-mono-stat text-[8px] uppercase tracking-wider mb-4" style={{ color: "hsl(40 10% 55%)" }}>
              Volume {volumeNumber} · {chapters.length} chapters
            </p>

            <div className="space-y-1">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch)}
                  className={`w-full text-left p-2.5 rounded-md transition-colors text-xs ${
                    selectedChapter?.id === ch.id ? "font-semibold" : ""
                  }`}
                  style={{
                    background: selectedChapter?.id === ch.id ? "hsl(40 15% 88%)" : "transparent",
                    color: "hsl(40 10% 30%)",
                  }}
                >
                  <div className="font-mono-stat text-[8px] uppercase tracking-wider" style={{ color: "hsl(40 10% 55%)" }}>
                    Chapter {String(ch.chapter_number).padStart(2, "0")}
                  </div>
                  <div className="font-body text-xs mt-0.5 truncate">{ch.chapter_title}</div>
                  <div className="font-mono-stat text-[7px] mt-0.5" style={{ color: "hsl(40 10% 60%)" }}>{ch.month_year}</div>
                </button>
              ))}
            </div>

            <Button
              onClick={generateChapter}
              disabled={generating}
              variant="outline"
              size="sm"
              className="w-full mt-4 font-mono-stat text-[9px]"
              style={{ borderColor: "hsl(40 10% 75%)", color: "hsl(40 10% 40%)" }}
            >
              {generating ? "Writing..." : "+ Generate New Chapter"}
            </Button>
          </div>
        </aside>
      )}

      {/* Reading area */}
      <main className="flex-1 overflow-y-auto">
        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-10 w-8 h-8 rounded flex items-center justify-center"
          style={{ background: "hsl(40 15% 90%)", color: "hsl(40 10% 40%)" }}
        >
          {sidebarOpen ? "◂" : "▸"}
        </button>

        {selectedChapter ? (
          <article className="max-w-2xl mx-auto px-6 py-12 md:py-16">
            {/* Chapter header */}
            <div className="text-center mb-10">
              <div className="font-mono-stat text-[9px] uppercase tracking-[0.3em] mb-3" style={{ color: "hsl(40 10% 60%)" }}>
                Chapter {String(selectedChapter.chapter_number).padStart(2, "0")}
              </div>
              <h1 className="font-cinzel text-2xl md:text-3xl font-bold leading-tight mb-3" style={{ color: "hsl(40 10% 15%)" }}>
                {selectedChapter.chapter_title}
              </h1>
              <div className="font-mono-stat text-[9px] tracking-wider mb-4" style={{ color: "hsl(40 10% 55%)" }}>
                {selectedChapter.month_year}
              </div>

              {/* Stats metadata bar */}
              <div className="flex justify-center gap-4 font-mono-stat text-[8px]" style={{ color: "hsl(40 10% 50%)" }}>
                {selectedChapter.stats_snapshot?.total_xp != null && (
                  <span>★ {selectedChapter.stats_snapshot.total_xp} XP</span>
                )}
                {selectedChapter.stats_snapshot?.level != null && (
                  <span>LV {selectedChapter.stats_snapshot.level}</span>
                )}
                {Array.isArray(selectedChapter.key_events) && (
                  <span>⚔ {selectedChapter.key_events.length} events</span>
                )}
              </div>

              <div className="w-16 h-px mx-auto mt-6" style={{ background: "hsl(40 10% 80%)" }} />
            </div>

            {/* Chapter content */}
            <div
              className="font-body leading-[1.9] text-base md:text-lg"
              style={{
                color: "hsl(40 10% 20%)",
                textAlign: "justify",
                textIndent: "2em",
              }}
            >
              {selectedChapter.chapter_content.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-5" style={{ textIndent: i === 0 ? "0" : "2em" }}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Chapter end ornament */}
            <div className="text-center mt-12 mb-8">
              <span className="font-cinzel text-sm" style={{ color: "hsl(40 10% 70%)" }}>◆ ◆ ◆</span>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: "hsl(40 10% 88%)" }}>
              {selectedChapter.chapter_number > 1 ? (
                <button
                  onClick={() => {
                    const prev = chapters.find((c) => c.chapter_number === selectedChapter.chapter_number - 1);
                    if (prev) setSelectedChapter(prev);
                  }}
                  className="font-mono-stat text-[10px]"
                  style={{ color: "hsl(40 10% 50%)" }}
                >
                  ← Previous Chapter
                </button>
              ) : <span />}
              {selectedChapter.chapter_number < chapters.length ? (
                <button
                  onClick={() => {
                    const next = chapters.find((c) => c.chapter_number === selectedChapter.chapter_number + 1);
                    if (next) setSelectedChapter(next);
                  }}
                  className="font-mono-stat text-[10px]"
                  style={{ color: "hsl(40 10% 50%)" }}
                >
                  Next Chapter →
                </button>
              ) : <span />}
            </div>
          </article>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-body text-sm" style={{ color: "hsl(40 10% 55%)" }}>Select a chapter to begin reading.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Novel;
