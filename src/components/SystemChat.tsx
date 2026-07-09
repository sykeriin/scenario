import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useUniverse } from '@/hooks/useUniverse';
import { useSystemChat } from '@/contexts/SystemChatContext';
import { TERM_MAPS } from '@/lib/universe';
import api from '@/lib/api';
import { sanitizeChatMessages } from '@/lib/ai';

interface ChatMsg {
  role: 'user' | 'system' | 'action';
  text: string;
  actionData?: Record<string, unknown>;
}

export const SystemChat = () => {
  const { user } = useAuth();
  const pom = usePomodoro();
  const { t, founderMode } = useUniverse();
  const { open, setOpen, toggle } = useSystemChat();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  if (!user) return null;

  const systemLabel = founderMode ? TERM_MAPS.founder.system.toUpperCase() : 'THE SYSTEM';

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMsgs: ChatMsg[] = [...msgs, { role: 'user', text }];
    setMsgs(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat.send(
        sanitizeChatMessages(newMsgs.map((m) => ({ role: m.role, text: m.text }))),
        sessionId
      );
      const updated: ChatMsg[] = [...newMsgs, { role: 'system', text: res.message }];

      if (res.action) {
        updated.push({
          role: 'action',
          text: res.action.confirm_required
            ? `⚡ ${res.action.confirm_message || 'Execute action?'}`
            : '⚡ Executing...',
          actionData: res.action,
        });

        if (!res.action.confirm_required) {
          const result = await api.chat.executeAction(String(res.action.action), (res.action.params as Record<string, unknown>) ?? {});
          if ((result as { open_pomodoro?: boolean }).open_pomodoro) {
            pom.setOpenGlobal(true);
          }
          updated.push({ role: 'system', text: `✓ ${(result as { message?: string }).message || 'Done.'}` });
        }
      }
      setMsgs(updated);
    } catch (err: unknown) {
      setMsgs([...newMsgs, { role: 'system', text: `◈ Error: ${err instanceof Error ? err.message : 'Failed'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionData: Record<string, unknown>) => {
    setLoading(true);
    try {
      const result = await api.chat.executeAction(String(actionData.action), (actionData.params as Record<string, unknown>) ?? {});
      if ((result as { open_pomodoro?: boolean }).open_pomodoro) {
        pom.setOpenGlobal(true);
      }
      setMsgs(prev => [...prev, { role: 'system', text: `✓ ${(result as { message?: string }).message || 'Action completed.'}` }]);
    } catch (err: unknown) {
      setMsgs(prev => [...prev, { role: 'system', text: `✗ Failed: ${err instanceof Error ? err.message : 'Error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "📋 Today's plan", msg: 'Give me my plan for today based on my active scenarios and quests' },
    { label: `✓ Complete ${t('quest').toLowerCase()}`, msg: 'What quests do I have pending? Help me complete one' },
    { label: `⚡ Create ${t('scenario').toLowerCase()}`, msg: 'Help me create a new scenario' },
    { label: '📊 Stats', msg: 'Show me my current stats and progress' },
  ];

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-20 md:bottom-6 right-6 z-[80] h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 md:hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
          boxShadow: `0 0 20px hsl(var(--glow) / 0.4), 0 4px 20px rgba(0,0,0,0.3)`,
        }}
      >
        <span className="font-cinzel text-lg text-primary-foreground font-bold">{open ? '×' : '✦'}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-[101] flex w-full max-w-[360px] flex-col border-l border-border bg-[hsl(var(--surface)/0.95)] animate-slide-in-right"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-cinzel text-sm font-bold tracking-widest text-primary">{systemLabel}</h3>
                <p className="mt-0.5 font-mono-stat text-[8px] tracking-wider text-muted-foreground">
                  Ask anything · Automate anything
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-xl text-muted-foreground hover:text-foreground">
                ×
              </button>
            </div>

            <div ref={scrollRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="text-center py-8">
                <p className="font-cinzel text-xs text-muted-foreground italic">"{t('system')} is watching."</p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {quickActions.map(qa => (
                    <button key={qa.label} type="button" onClick={() => sendMessage(qa.msg)} className="font-mono-stat text-[9px] px-2.5 py-1.5 rounded-full border text-muted-foreground hover:border-primary/50 hover:text-primary">
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'action' ? (
                  <div className="w-full rounded-lg p-3 border border-primary/30 bg-primary/5">
                    <p className="font-mono-stat text-[10px] text-primary">{m.text}</p>
                    {m.actionData?.confirm_required && (
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => executeAction(m.actionData!)} disabled={loading} className="font-mono-stat text-[9px] px-3 py-1 rounded border border-primary/50 text-primary">✓ Confirm</button>
                        <button type="button" onClick={() => setMsgs(prev => [...prev, { role: 'system', text: 'Action cancelled.' }])} className="font-mono-stat text-[9px] px-3 py-1 rounded border text-muted-foreground">✗ Cancel</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${m.role === 'user' ? 'bg-primary/15' : 'bg-secondary border-l-2 border-primary/40'}`}>
                    <p className="font-body text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-secondary">
                  <span className="font-mono-stat text-xs text-primary animate-pulse">◆ ◆ ◆</span>
                </div>
              </div>
            )}
          </div>

          {msgs.length > 0 && (
            <div className="px-3 py-1.5 border-t flex gap-1 overflow-x-auto shrink-0">
              {quickActions.map(qa => (
                <button key={qa.label} type="button" onClick={() => sendMessage(qa.msg)} disabled={loading} className="font-mono-stat text-[8px] px-2 py-1 rounded-full border whitespace-nowrap text-muted-foreground shrink-0">
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          <div className="shrink-0 border-t border-border px-3 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder={`Ask ${t('system')}...`}
                disabled={loading}
                className="flex-1 rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 font-body text-xs outline-none"
              />
              <button type="button" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="rounded-lg bg-primary px-3 py-2 font-mono-stat text-[10px] text-primary-foreground">✦</button>
            </div>
          </div>
          </div>
        </>
      )}
    </>
  );
};
