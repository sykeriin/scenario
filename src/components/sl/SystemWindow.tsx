import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface SystemWindowProps {
  title: string;
  subtitle?: string;
  body?: string;
  rank?: string;
  actions?: Array<{ label: string; onClick: () => void; variant?: 'default' | 'outline' }>;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function SystemWindow({ title, subtitle, body, rank, actions, onDismiss, autoDismissMs }: SystemWindowProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    if (autoDismissMs && onDismiss) {
      const t = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [autoDismissMs, onDismiss]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 px-4">
      <div
        className={`w-full max-w-md rounded border-2 transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{
          background: 'rgba(10, 10, 20, 0.95)',
          borderColor: '#00b4ff',
          boxShadow: '0 0 30px rgba(0, 180, 255, 0.3)',
        }}
      >
        <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'rgba(0,180,255,0.3)' }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/70">SYSTEM</span>
          {rank && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#00b4ff]/50 text-[#00b4ff]">
              [{rank}]
            </span>
          )}
        </div>
        <div className="p-5 space-y-3">
          <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">{title}</h3>
          {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
          {body && <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{body}</p>}
        </div>
        {(actions?.length || onDismiss) && (
          <div className="px-4 pb-4 flex gap-2 justify-end">
            {actions?.map((a) => (
              <Button key={a.label} size="sm" variant={a.variant ?? 'default'} onClick={a.onClick} className="font-mono text-[10px]">
                {a.label}
              </Button>
            ))}
            {onDismiss && !actions?.length && (
              <Button size="sm" variant="outline" onClick={onDismiss} className="font-mono text-[10px] border-[#00b4ff]/50 text-[#00b4ff]">
                Acknowledge
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
