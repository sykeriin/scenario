import { useEffect, useState } from 'react';

interface GateOpenAnimationProps {
  title: string;
  rank?: string;
  onDone: () => void;
}

export function GateOpenAnimation({ title, rank = 'E', onDone }: GateOpenAnimationProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(onDone, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90">
      <div className="text-center space-y-4">
        <div
          className={`w-48 h-48 mx-auto rounded-full border-4 transition-all duration-700 ${
            phase >= 1 ? 'scale-150 opacity-0 border-[#00b4ff]' : 'scale-100 opacity-100 border-[#00b4ff]'
          }`}
          style={{ boxShadow: '0 0 60px rgba(0,180,255,0.5)' }}
        />
        {phase >= 1 && (
          <div className="animate-fade-in space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00b4ff]">SYSTEM NOTIFICATION</p>
            <h2 className="font-cinzel text-xl font-bold text-white">NEW GATE DETECTED</h2>
            <p className="font-mono text-sm text-white/80">Rank: [{rank}]</p>
            <p className="font-cinzel text-lg text-[#00b4ff]">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
