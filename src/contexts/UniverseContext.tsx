import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dataClient } from '@/lib/data-client';
import { LOCAL_USER_ID, type GameUniverse } from '@/integrations/local/schema-extensions';
import { TERM_MAPS, type TermKey } from '@/lib/universe';
import { applySlTheme, removeSlTheme } from '@/lib/solo-leveling/sl-theme';

function toGameUniverse(raw: string | undefined): GameUniverse {
  return raw === 'solo_leveling' ? 'solo_leveling' : 'orv';
}

interface UniverseContextValue {
  universe: GameUniverse;
  setUniverse: (u: GameUniverse) => Promise<void>;
  founderMode: boolean;
  setFounderMode: (enabled: boolean) => Promise<void>;
  t: (key: TermKey) => string;
  loading: boolean;
  isSoloLeveling: boolean;
}

const UniverseContext = createContext<UniverseContextValue>({
  universe: 'orv',
  setUniverse: async () => {},
  founderMode: false,
  setFounderMode: async () => {},
  t: (key) => key,
  loading: true,
  isSoloLeveling: false,
});

export function UniverseProvider({ children }: { children: React.ReactNode }) {
  const [universe, setUniverseState] = useState<GameUniverse>('orv');
  const [founderMode, setFounderModeState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataClient
      .from('profiles')
      .select('universe, founder_mode')
      .eq('id', LOCAL_USER_ID)
      .single()
      .then(async ({ data }) => {
        const rawUniverse = data?.universe as string | undefined;
        const legacyFounder = rawUniverse === 'founder';
        const gameUniverse = toGameUniverse(rawUniverse);
        const mode = legacyFounder ? true : Boolean(data?.founder_mode);

        if (legacyFounder || data?.founder_mode === undefined) {
          await dataClient
            .from('profiles')
            .update({ universe: gameUniverse, founder_mode: mode })
            .eq('id', LOCAL_USER_ID);
        }

        setUniverseState(gameUniverse);
        setFounderModeState(mode);
        if (gameUniverse === 'solo_leveling') applySlTheme();
        setLoading(false);
      });
  }, []);

  const setUniverse = useCallback(async (u: GameUniverse) => {
    await dataClient.from('profiles').update({ universe: u }).eq('id', LOCAL_USER_ID);
    setUniverseState(u);
    if (u === 'solo_leveling') applySlTheme();
    else removeSlTheme();
  }, []);

  const setFounderMode = useCallback(async (enabled: boolean) => {
    await dataClient.from('profiles').update({ founder_mode: enabled }).eq('id', LOCAL_USER_ID);
    setFounderModeState(enabled);
  }, []);

  const t = useCallback(
    (key: TermKey) => TERM_MAPS[universe][key] ?? TERM_MAPS.orv[key] ?? key,
    [universe],
  );

  return (
    <UniverseContext.Provider
      value={{
        universe,
        setUniverse,
        founderMode,
        setFounderMode,
        t,
        loading,
        isSoloLeveling: universe === 'solo_leveling',
      }}
    >
      {children}
    </UniverseContext.Provider>
  );
}

export const useUniverse = () => useContext(UniverseContext);
