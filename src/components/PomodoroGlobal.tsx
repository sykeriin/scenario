import { useState, useEffect, useRef, useCallback } from 'react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { dataClient } from '@/lib/data-client';
import { LOCAL_USER_ID } from '@/integrations/local/schema-extensions';
import { Button } from '@/components/ui/button';
import { XpToast } from '@/components/XpToast';

const DURATION_PRESETS = [25, 45, 60, 90];

interface PendingQuest {
  id: string;
  title: string;
  scenario_id: string;
}

export const PomodoroGlobal = () => {
  const { user } = useAuth();
  const pom = usePomodoro();
  const [xpToast, setXpToast] = useState<{ amount: number; type: 'quest' | 'pomodoro' | 'level_up'; newLevel?: number } | null>(null);
  const [customDuration, setCustomDuration] = useState(25);
  const [pendingQuests, setPendingQuests] = useState<PendingQuest[]>([]);
  const [linkToQuest, setLinkToQuest] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState('');
  const [selectedQuestTitle, setSelectedQuestTitle] = useState('');
  const [completionAnswer, setCompletionAnswer] = useState<'yes' | 'no' | null>(null);
  const [xpAwarded, setXpAwarded] = useState(false);
  const awardingRef = useRef(false);
  const sessionKindRef = useRef<'focus' | 'break'>('focus');

  useEffect(() => {
    if (!pom.openGlobal || !user) return;
    dataClient
      .from('quests')
      .select('id, title, scenario_id')
      .eq('user_id', LOCAL_USER_ID)
      .neq('status', 'completed')
      .limit(40)
      .then(({ data }) => setPendingQuests((data as PendingQuest[]) ?? []));

    dataClient
      .from('profiles')
      .select('preferred_pomodoro_duration')
      .eq('id', LOCAL_USER_ID)
      .single()
      .then(({ data }) => {
        const d = Number((data as { preferred_pomodoro_duration?: number } | null)?.preferred_pomodoro_duration);
        if (d >= 5) setCustomDuration(d);
      });
  }, [pom.openGlobal, user]);

  useEffect(() => {
    if (pom.mode === 'idle') {
      setCompletionAnswer(null);
      setXpAwarded(false);
      awardingRef.current = false;
    }
  }, [pom.mode]);

  const awardSessionXp = useCallback(async (markQuestComplete: boolean) => {
    if (awardingRef.current || xpAwarded) return;
    awardingRef.current = true;
    try {
      if (markQuestComplete && pom.linkedQuestId) {
        const scenarioId = pendingQuests.find((q) => q.id === pom.linkedQuestId)?.scenario_id;
        if (scenarioId) {
          await api.scenarios.completeQuest(scenarioId, pom.linkedQuestId);
        }
      }
      if (pom.sessionId) {
        const result = await api.pomodoro.complete(pom.sessionId);
        if (result.xp_awarded) {
          setXpToast({
            amount: result.xp_awarded,
            type: result.did_level_up ? 'level_up' : 'pomodoro',
            newLevel: result.new_level,
          });
        }
      }
      pom.completeSession();
      setXpAwarded(true);
    } catch {
      pom.completeSession();
      setXpAwarded(true);
    } finally {
      awardingRef.current = false;
    }
  }, [pom, pendingQuests, xpAwarded]);

  useEffect(() => {
    if (pom.mode !== 'done' || xpAwarded) return;
    if (sessionKindRef.current === 'break') {
      pom.resetTimer();
      return;
    }
    const isLinked = pom.pomodoroMode === 'linked' && !!pom.linkedQuestId;
    if (isLinked && completionAnswer === null) return;
    if (!isLinked || completionAnswer !== null) {
      void awardSessionXp(completionAnswer === 'yes');
    }
  }, [pom.mode, pom.pomodoroMode, pom.linkedQuestId, completionAnswer, xpAwarded, awardSessionXp, pom]);

  if (!pom.openGlobal) return null;

  const minutes = Math.floor(pom.secondsLeft / 60);
  const seconds = pom.secondsLeft % 60;
  const progress = pom.totalSeconds > 0 ? 1 - pom.secondsLeft / pom.totalSeconds : 0;
  const isWarning = pom.mode === 'focus' && pom.secondsLeft <= 300 && pom.secondsLeft > 0;
  const isLongBreakNext = pom.sessionCount > 0 && pom.sessionCount % 4 === 0;

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const handleStart = async (duration: number) => {
    const questId = linkToQuest && selectedQuestId ? selectedQuestId : undefined;
    const questTitle = linkToQuest && selectedQuestTitle ? selectedQuestTitle : 'Free Focus';
    setCompletionAnswer(null);
    setXpAwarded(false);
    awardingRef.current = false;
    sessionKindRef.current = 'focus';
    pom.startTimer(duration, questId, questTitle);
    try {
      const session = await api.pomodoro.start(questId, duration, questId ? 'linked' : 'free');
      pom.setSessionId(session._id);
      await api.pomodoro.setPreferredDuration(duration);
    } catch {
      /* local timer still runs */
    }
  };

  const handleInterrupt = async () => {
    if (pom.sessionId) {
      try {
        await api.pomodoro.interrupt(pom.sessionId);
      } catch {
        /* ok */
      }
    }
    pom.resetTimer();
  };

  const startBreak = (mins: number) => {
    setCompletionAnswer(null);
    setXpAwarded(false);
    awardingRef.current = false;
    sessionKindRef.current = 'break';
    pom.startBreak(mins);
  };

  const filledDots = pom.sessionCount % 4 === 0 && pom.sessionCount > 0 ? 4 : pom.sessionCount % 4;
  const sessionDots = Array.from({ length: 4 }, (_, i) => i < filledDots);

  const showLinkedPrompt =
    pom.mode === 'done' &&
    pom.pomodoroMode === 'linked' &&
    !!pom.linkedQuestTitle &&
    completionAnswer === null &&
    !xpAwarded;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'hsl(var(--background) / 0.97)' }}>
        <div className="flex flex-col items-center gap-6 animate-fade-in max-w-md w-full px-6 max-h-[100vh] overflow-y-auto py-8">
          <h2 className="font-cinzel text-lg font-bold text-foreground tracking-wider text-center">
            {pom.linkedQuestTitle || 'Free Focus'}
          </h2>

          <p className="font-mono-stat text-[10px] text-muted-foreground tracking-widest uppercase">
            {pom.mode === 'focus'
              ? '◈ Deep Focus'
              : pom.mode === 'break'
                ? '☕ Break'
                : pom.mode === 'done'
                  ? '✦ Session Complete'
                  : '◈ Choose Duration'}
          </p>

          {!pom.isActive && (
            <div className="w-full space-y-5">
              <div className="space-y-2">
                <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground block">Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLinkToQuest(false);
                      setSelectedQuestId('');
                      setSelectedQuestTitle('');
                    }}
                    className={`flex-1 py-2 rounded border font-mono-stat text-[10px] transition-all ${!linkToQuest ? 'border-primary/50 text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  >
                    Free Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkToQuest(true)}
                    className={`flex-1 py-2 rounded border font-mono-stat text-[10px] transition-all ${linkToQuest ? 'border-primary/50 text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  >
                    Link to Quest
                  </button>
                </div>
              </div>

              {linkToQuest && (
                <div className="space-y-2">
                  <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground block">Pending quest</label>
                  <select
                    value={selectedQuestId}
                    onChange={(e) => {
                      setSelectedQuestId(e.target.value);
                      setSelectedQuestTitle(e.target.selectedOptions[0]?.text ?? '');
                    }}
                    className="w-full bg-secondary/50 border rounded px-3 py-2 font-body text-xs text-foreground"
                  >
                    <option value="">Select a quest…</option>
                    {pendingQuests.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground block">Duration</label>
                <div className="flex gap-2">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCustomDuration(d)}
                      className={`flex-1 py-2.5 rounded border font-mono-stat text-xs transition-all ${
                        customDuration === d ? 'border-primary/50 text-primary bg-primary/10 font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button type="button" onClick={() => setCustomDuration(Math.max(5, customDuration - 5))} className="font-mono-stat text-xs px-3 py-1.5 rounded border hover:bg-accent">
                    −5
                  </button>
                  <span className="font-mono-stat text-lg font-bold text-primary w-16 text-center">{customDuration}m</span>
                  <button type="button" onClick={() => setCustomDuration(Math.min(180, customDuration + 5))} className="font-mono-stat text-xs px-3 py-1.5 rounded border hover:bg-accent">
                    +5
                  </button>
                </div>
              </div>

              <Button onClick={() => handleStart(customDuration)} className="w-full font-cinzel tracking-wider glow-accent text-base py-6">
                ◈ Begin Focus
              </Button>
            </div>
          )}

          {pom.isActive && (
            <>
              <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                <svg width="300" height="300" className="absolute -rotate-90">
                  <circle cx="150" cy="150" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                  <circle
                    cx="150"
                    cy="150"
                    r={radius}
                    fill="none"
                    stroke={isWarning ? 'hsl(var(--theme-red))' : pom.mode === 'break' ? 'hsl(var(--theme-blue))' : 'hsl(var(--primary))'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                      filter: isWarning ? 'drop-shadow(0 0 12px hsl(var(--theme-red) / 0.6))' : 'drop-shadow(0 0 8px hsl(var(--glow) / 0.4))',
                    }}
                  />
                </svg>
                <div className="text-center z-10">
                  <div
                    className={`font-mono-stat text-5xl font-bold tracking-wider ${isWarning ? 'text-destructive animate-pulse' : 'text-primary'}`}
                    style={{ textShadow: isWarning ? '0 0 20px hsl(var(--theme-red) / 0.5)' : '0 0 15px hsl(var(--glow) / 0.3)' }}
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <p className="font-mono-stat text-[9px] text-muted-foreground mt-1">
                    {pom.pomodoroMode === 'linked' ? '🔗 Linked' : '🌀 Free'}
                  </p>
                </div>
              </div>

              {pom.mode !== 'done' && (
                <div className="flex gap-2 items-center">
                  <button type="button" onClick={() => pom.adjustTime(-5)} className="font-mono-stat text-[10px] px-3 py-1.5 rounded border hover:bg-accent">
                    −5m
                  </button>
                  {pom.isRunning ? (
                    <Button variant="outline" onClick={pom.pauseTimer} className="font-mono-stat text-[10px]">
                      ⏸ Pause
                    </Button>
                  ) : (
                    <Button onClick={pom.resumeTimer} className="font-mono-stat text-[10px] glow-accent">
                      ▶ Resume
                    </Button>
                  )}
                  <button type="button" onClick={() => pom.adjustTime(5)} className="font-mono-stat text-[10px] px-3 py-1.5 rounded border hover:bg-accent">
                    +5m
                  </button>
                </div>
              )}

              {showLinkedPrompt && (
                <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-3">
                  <p className="font-cinzel text-sm text-primary">Did you complete this quest?</p>
                  <p className="text-xs text-muted-foreground">{pom.linkedQuestTitle}</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={() => setCompletionAnswer('yes')}>
                      Yes — mark complete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCompletionAnswer('no')}>
                      Not yet
                    </Button>
                  </div>
                </div>
              )}

              {pom.mode === 'done' && xpAwarded && (
                <div className="w-full space-y-3">
                  <p className="text-center font-mono-stat text-[10px] text-muted-foreground uppercase tracking-wider">Take a break?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 font-mono-stat text-[10px]" onClick={() => startBreak(isLongBreakNext ? 15 : 5)}>
                      {isLongBreakNext ? '15m long break' : '5m break'}
                    </Button>
                    <Button variant="outline" className="flex-1 font-mono-stat text-[10px]" onClick={() => startBreak(15)}>
                      15m break
                    </Button>
                  </div>
                  {isLongBreakNext && (
                    <p className="text-[10px] text-center text-primary font-mono-stat">4 sessions complete — long break recommended</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 font-cinzel" onClick={() => { pom.resetTimer(); pom.setOpenGlobal(false); }}>
                      Done
                    </Button>
                    <Button className="flex-1 font-cinzel glow-accent" onClick={() => { pom.resetTimer(); }}>
                      Another round
                    </Button>
                  </div>
                </div>
              )}

              {pom.mode !== 'done' && (
                <button type="button" onClick={handleInterrupt} className="font-mono-stat text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors">
                  End Session
                </button>
              )}

              <div className="flex gap-1.5">
                {sessionDots.map((filled, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full transition-all"
                    style={{
                      background: filled ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
                      boxShadow: filled ? '0 0 6px hsl(var(--glow) / 0.5)' : 'none',
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {!pom.isActive && (
            <button type="button" onClick={() => pom.setOpenGlobal(false)} className="font-mono-stat text-[10px] text-muted-foreground hover:text-foreground">
              Close
            </button>
          )}
        </div>
      </div>

      {xpToast && (
        <XpToast amount={xpToast.amount} type={xpToast.type} newLevel={xpToast.newLevel} onDone={() => setXpToast(null)} />
      )}
    </>
  );
};
