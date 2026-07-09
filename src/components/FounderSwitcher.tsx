import { useEffect, useState } from 'react';
import { db } from '@/integrations/local/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FounderSwitcher() {
  const [founders, setFounders] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    db.table('founders').toArray().then(setFounders as (f: { id: string; name: string }[]) => void);
    db.table('app_meta').get('active_founder_id').then((m) => setActiveId(String(m?.value ?? '')));
  }, []);

  const switchFounder = async (id: string) => {
    await db.table('app_meta').put({ key: 'active_founder_id', value: id });
    setActiveId(id);
  };

  const addFounder = async () => {
    const name = prompt('Founder name?');
    if (!name) return;
    const id = crypto.randomUUID();
    await db.table('founders').put({
      id,
      name,
      role: 'Co-founder',
      focus_area: 'General',
      created_at: new Date().toISOString(),
    });
    setFounders((f) => [...f, { id, name }]);
    switchFounder(id);
  };

  if (founders.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {founders.map((f) => (
        <Button
          key={f.id}
          size="sm"
          variant={activeId === f.id ? 'default' : 'outline'}
          onClick={() => switchFounder(f.id)}
        >
          {f.name}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={addFounder}>+</Button>
    </div>
  );
}
