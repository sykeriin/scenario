import { LOCAL_USER_ID } from './schema-extensions';

export interface LocalUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

export interface LocalSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: LocalUser;
}

const LOCAL_USER: LocalUser = {
  id: LOCAL_USER_ID,
  email: 'founder@local',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { username: 'Founder' },
  created_at: new Date().toISOString(),
};

const LOCAL_SESSION: LocalSession = {
  access_token: 'local-session-token',
  refresh_token: 'local-refresh',
  expires_in: 999999999,
  token_type: 'bearer',
  user: LOCAL_USER,
};

type AuthChangeCallback = (event: string, session: LocalSession | null) => void;
const authListeners = new Set<AuthChangeCallback>();

function notifyAuth(event: string, session: LocalSession | null) {
  authListeners.forEach((cb) => cb(event, session));
}

export const localAuth = {
  async getSession() {
    return { data: { session: LOCAL_SESSION }, error: null };
  },

  async getUser() {
    return { data: { user: LOCAL_USER }, error: null };
  },

  onAuthStateChange(callback: AuthChangeCallback) {
    queueMicrotask(() => callback('SIGNED_IN', LOCAL_SESSION));
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    };
  },

  async signUp(_opts: { email: string; password: string; options?: { emailRedirectTo?: string } }) {
    notifyAuth('SIGNED_IN', LOCAL_SESSION);
    return { data: { user: LOCAL_USER, session: LOCAL_SESSION }, error: null };
  },

  async signInWithPassword(_opts: { email: string; password: string }) {
    notifyAuth('SIGNED_IN', LOCAL_SESSION);
    return { data: { user: LOCAL_USER, session: LOCAL_SESSION }, error: null };
  },

  async signInWithOAuth(_opts: { provider: string; options?: { redirectTo?: string } }) {
    notifyAuth('SIGNED_IN', LOCAL_SESSION);
    return { data: { provider: _opts.provider, url: null }, error: null };
  },

  async signOut() {
    notifyAuth('SIGNED_OUT', null);
    return { error: null };
  },
};
