import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function WhatDoINowButton() {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);

  const ask = async () => {
    setLoading(true);
    try {
      const res = await api.chat.send(
        [{ role: 'user', text: 'What should I do right now? Give me one clear priority based on my active scenarios, quests, and musts.' }],
        'what-now'
      );
      if (res.action?.action === 'get_plan' && res.action.confirm_required) {
        const plan = await api.chat.executeAction('get_plan', res.action.params ?? {});
        setBrief((plan as { message?: string }).message ?? res.message);
      } else {
        setBrief(res.message);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not get brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={ask}
        disabled={loading}
        title="What should I do now?"
        className="fixed bottom-36 md:bottom-20 right-6 z-[75] h-10 w-10 rounded-full border border-primary/40 bg-card flex items-center justify-center text-primary shadow-lg hover:scale-105 transition-transform"
      >
        {loading ? '…' : '✦'}
      </button>
      {brief && (
        <div className="fixed bottom-48 md:bottom-32 right-6 z-[75] max-w-xs rounded-lg border border-primary/30 bg-card p-3 shadow-xl">
          <p className="font-cinzel text-[10px] text-primary tracking-widest mb-1">MISSION BRIEF</p>
          <p className="text-xs whitespace-pre-wrap">{brief}</p>
          <button type="button" className="text-[10px] text-muted-foreground mt-2" onClick={() => setBrief(null)}>Dismiss</button>
        </div>
      )}
    </>
  );
}
