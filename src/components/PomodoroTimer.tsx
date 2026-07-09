import { useState, useEffect, useRef, useCallback } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PomodoroTimerProps {
  questId: string;
  questTitle: string;
  onClose: () => void;
  focusDuration?: number;
  breakDuration?: number;
}

const MULTIPLIERS = [1.0, 1.0, 1.1, 1.25, 1.5];

export const PomodoroTimer = ({
  questId,
  questTitle,
  onClose,
  focusDuration = 25,
  breakDuration = 5,
}: PomodoroTimerProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"focus" | "break" | "done">("focus");
  const [totalSeconds, setTotalSeconds] = useState(focusDuration * 60);
  const [secondsLeft, setSecondsLeft] = useState(focusDuration * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Load consecutive count for this quest
  useEffect(() => {
    if (!user) return;
    dataClient
      .from("pomodoro_sessions")
      .select("completed, interrupted")
      .eq("user_id", user.id)
      .eq("quest_id", questId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data) return;
        let count = 0;
        for (const s of data) {
          if (s.completed && !s.interrupted) count++;
          else break;
        }
        setConsecutiveCount(count);
      });
  }, [user, questId]);

  // Create session record on mount
  useEffect(() => {
    if (!user) return;
    startTimeRef.current = new Date().toISOString();
    dataClient
      .from("pomodoro_sessions")
      .insert({
        user_id: user.id,
        quest_id: questId,
        started_at: startTimeRef.current,
        duration_minutes: focusDuration,
        completed: false,
        interrupted: false,
        focus_multiplier: 1.0,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data) setSessionId(data.id);
      });
  }, [user, questId, focusDuration]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode]);

  const handleTimerEnd = useCallback(async () => {
    if (mode === "focus") {
      // Complete the focus session
      const newConsecutive = consecutiveCount + 1;
      const multiplier = MULTIPLIERS[Math.min(newConsecutive, MULTIPLIERS.length - 1)];

      if (sessionId) {
        await dataClient
          .from("pomodoro_sessions")
          .update({
            ended_at: new Date().toISOString(),
            completed: true,
            focus_multiplier: multiplier,
          })
          .eq("id", sessionId);
      }

      setConsecutiveCount(newConsecutive);
      toast.success(`Focus complete! ${newConsecutive > 1 ? `${multiplier}× multiplier active` : ""}`, {
        className: "font-cinzel",
      });

      // Start break
      setMode("break");
      setTotalSeconds(breakDuration * 60);
      setSecondsLeft(breakDuration * 60);
      setIsRunning(true);
    } else if (mode === "break") {
      setMode("done");
      setIsRunning(false);
    }
  }, [mode, consecutiveCount, sessionId, breakDuration]);

  const handleInterrupt = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);

    if (mode === "focus" && sessionId) {
      await dataClient
        .from("pomodoro_sessions")
        .update({
          ended_at: new Date().toISOString(),
          interrupted: true,
          completed: false,
        })
        .eq("id", sessionId);
      setConsecutiveCount(0);
      toast.info("Session interrupted. Focus streak reset.");
    }
    onClose();
  };

  const startNewFocus = async () => {
    startTimeRef.current = new Date().toISOString();
    const { data } = await dataClient
      .from("pomodoro_sessions")
      .insert({
        user_id: user!.id,
        quest_id: questId,
        started_at: startTimeRef.current,
        duration_minutes: focusDuration,
        completed: false,
        interrupted: false,
        focus_multiplier: 1.0,
      })
      .select()
      .single();
    if (data) setSessionId(data.id);

    setMode("focus");
    setTotalSeconds(focusDuration * 60);
    setSecondsLeft(focusDuration * 60);
    setIsRunning(true);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const isWarning = mode === "focus" && secondsLeft <= 300 && secondsLeft > 0;
  const currentMultiplier = MULTIPLIERS[Math.min(consecutiveCount + (mode === "focus" ? 1 : 0), MULTIPLIERS.length - 1)];

  // SVG circle params
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "hsl(var(--background) / 0.97)" }}>
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        {/* Quest Title */}
        <h2 className="font-cinzel text-lg font-bold text-foreground tracking-wider text-center max-w-md px-4">
          {questTitle}
        </h2>

        {/* Mode Label */}
        {mode === "break" ? (
          <p className="font-cinzel text-sm text-muted-foreground tracking-widest">Rest, Protagonist</p>
        ) : mode === "done" ? (
          <p className="font-cinzel text-sm text-primary tracking-widest">Session Complete</p>
        ) : (
          <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest uppercase">◈ Deep Focus</p>
        )}

        {/* Timer Ring */}
        <div className="relative w-[300px] h-[300px] flex items-center justify-center">
          <svg width="300" height="300" className="absolute -rotate-90">
            {/* Background ring */}
            <circle
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="4"
            />
            {/* Progress ring */}
            <circle
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke={
                mode === "break"
                  ? "hsl(var(--theme-blue))"
                  : isWarning
                    ? "hsl(var(--theme-red))"
                    : "hsl(var(--primary))"
              }
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 1s linear, stroke 0.5s ease",
                filter: isWarning
                  ? "drop-shadow(0 0 12px hsl(var(--theme-red) / 0.6))"
                  : mode === "break"
                    ? "drop-shadow(0 0 8px hsl(var(--theme-blue) / 0.4))"
                    : "drop-shadow(0 0 8px hsl(var(--glow) / 0.4))",
              }}
            />
          </svg>

          {/* Center content */}
          <div className="text-center z-10">
            <div
              className={`font-mono-stat text-5xl font-bold tracking-wider ${
                isWarning ? "text-destructive animate-pulse" : mode === "break" ? "text-blue-400" : "text-primary"
              }`}
              style={{
                textShadow: isWarning
                  ? "0 0 20px hsl(var(--theme-red) / 0.5)"
                  : mode === "break"
                    ? "0 0 15px hsl(var(--theme-blue) / 0.3)"
                    : "0 0 15px hsl(var(--glow) / 0.3)",
              }}
            >
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            {mode === "focus" && consecutiveCount > 0 && (
              <div
                className="font-mono-stat text-[11px] mt-2 px-3 py-1 rounded-full inline-block"
                style={{
                  background: "hsl(var(--primary) / 0.15)",
                  color: "hsl(var(--primary))",
                  boxShadow: "0 0 12px hsl(var(--glow) / 0.3)",
                }}
              >
                {currentMultiplier}× FOCUS
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {mode === "done" ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="font-cinzel tracking-wider"
            >
              Return
            </Button>
            <Button
              onClick={startNewFocus}
              className="font-cinzel tracking-wider glow-accent"
            >
              Another Round
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={handleInterrupt}
            className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive/50"
          >
            End Session
          </Button>
        )}

        {/* Streak info */}
        {consecutiveCount > 0 && (
          <p className="font-mono-stat text-[9px] text-muted-foreground">
            🔥 {consecutiveCount} consecutive session{consecutiveCount > 1 ? "s" : ""} on this quest
          </p>
        )}
      </div>
    </div>
  );
};
