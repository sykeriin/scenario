import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface PomodoroState {
  isActive: boolean;
  isRunning: boolean;
  mode: 'focus' | 'break' | 'done' | 'idle';
  secondsLeft: number;
  totalSeconds: number;
  linkedQuestId: string | null;
  linkedQuestTitle: string | null;
  pomodoroMode: 'linked' | 'free';
  sessionId: string | null;
  sessionCount: number;
  consecutiveCount: number;
}

interface PomodoroContextValue extends PomodoroState {
  startTimer: (duration: number, questId?: string, questTitle?: string) => void;
  startBreak: (duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  adjustTime: (delta: number) => void;
  completeSession: () => void;
  setSessionId: (id: string | null) => void;
  setSessionCount: (n: number) => void;
  setConsecutiveCount: (n: number) => void;
  openGlobal: boolean;
  setOpenGlobal: (v: boolean) => void;
}

const PomodoroContext = createContext<PomodoroContextValue>({} as PomodoroContextValue);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>({
    isActive: false,
    isRunning: false,
    mode: 'idle',
    secondsLeft: 0,
    totalSeconds: 0,
    linkedQuestId: null,
    linkedQuestTitle: null,
    pomodoroMode: 'free',
    sessionId: null,
    sessionCount: 0,
    consecutiveCount: 0,
  });
  const [openGlobal, setOpenGlobal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.secondsLeft <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Play completion sound
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              osc2.connect(gain);
              osc2.frequency.value = 1200;
              osc2.start();
              osc2.stop(ctx.currentTime + 0.2);
            }, 300);
          } catch { /* silent fail */ }

          if (prev.mode === 'focus') {
            return { ...prev, secondsLeft: 0, isRunning: false, mode: 'done' };
          } else if (prev.mode === 'break') {
            return { ...prev, secondsLeft: 0, isRunning: false, mode: 'done' };
          }
          return { ...prev, secondsLeft: 0, isRunning: false };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  const startBreak = useCallback((duration: number) => {
    const totalSecs = duration * 60;
    setState(prev => ({
      ...prev,
      isActive: true,
      isRunning: true,
      mode: 'break',
      secondsLeft: totalSecs,
      totalSeconds: totalSecs,
    }));
  }, []);

  const startTimer = useCallback((duration: number, questId?: string, questTitle?: string) => {
    const totalSecs = duration * 60;
    setState(prev => ({
      ...prev,
      isActive: true,
      isRunning: true,
      mode: 'focus',
      secondsLeft: totalSecs,
      totalSeconds: totalSecs,
      linkedQuestId: questId || null,
      linkedQuestTitle: questTitle || null,
      pomodoroMode: questId ? 'linked' : 'free',
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resumeTimer = useCallback(() => {
    if (state.secondsLeft > 0) {
      setState(prev => ({ ...prev, isRunning: true }));
    }
  }, [state.secondsLeft]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState(prev => ({
      ...prev,
      isActive: false,
      isRunning: false,
      mode: 'idle',
      secondsLeft: 0,
      totalSeconds: 0,
      linkedQuestId: null,
      linkedQuestTitle: null,
      sessionId: null,
    }));
  }, []);

  const adjustTime = useCallback((delta: number) => {
    setState(prev => {
      const newSeconds = Math.max(0, prev.secondsLeft + delta * 60);
      const newTotal = Math.max(prev.totalSeconds, newSeconds);
      return { ...prev, secondsLeft: newSeconds, totalSeconds: newTotal };
    });
  }, []);

  const completeSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      mode: 'done',
      sessionCount: prev.sessionCount + 1,
      consecutiveCount: prev.consecutiveCount + 1,
    }));
  }, []);

  return (
    <PomodoroContext.Provider value={{
      ...state,
      startTimer,
      startBreak,
      pauseTimer,
      resumeTimer,
      resetTimer,
      adjustTime,
      completeSession,
      setSessionId: (id) => setState(prev => ({ ...prev, sessionId: id })),
      setSessionCount: (n) => setState(prev => ({ ...prev, sessionCount: n })),
      setConsecutiveCount: (n) => setState(prev => ({ ...prev, consecutiveCount: n })),
      openGlobal,
      setOpenGlobal,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export const usePomodoro = () => useContext(PomodoroContext);
