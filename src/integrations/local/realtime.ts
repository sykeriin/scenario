export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = Record<string, unknown>> {
  table: string;
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
}

const bus = new EventTarget();
const CHANNEL_NAME = 'founder_os_db';

let bc: BroadcastChannel | null = null;
try {
  bc = new BroadcastChannel(CHANNEL_NAME);
  bc.onmessage = (ev) => {
    const payload = ev.data as RealtimePayload;
    bus.dispatchEvent(new CustomEvent('db-change', { detail: payload }));
  };
} catch {
  /* BroadcastChannel unavailable */
}

export function emitRealtime<T extends Record<string, unknown>>(
  table: string,
  eventType: RealtimeEventType,
  newRecord: T | null,
  oldRecord: T | null
) {
  const payload: RealtimePayload<T> = { table, eventType, new: newRecord, old: oldRecord };
  bus.dispatchEvent(new CustomEvent('db-change', { detail: payload }));
  bc?.postMessage(payload);
}

type PostgresChangesFilter = {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
};

type RealtimeCallback = (payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

const channelListeners: {
  filter: PostgresChangesFilter;
  callback: RealtimeCallback;
}[] = [];

bus.addEventListener('db-change', ((ev: CustomEvent<RealtimePayload>) => {
  const payload = ev.detail;
  for (const { filter, callback } of channelListeners) {
    if (filter.table && filter.table !== payload.table) continue;
    const eventFilter = filter.event ?? '*';
    if (eventFilter !== '*' && eventFilter !== payload.eventType) continue;
    callback({
      eventType: payload.eventType,
      new: (payload.new ?? {}) as Record<string, unknown>,
      old: (payload.old ?? {}) as Record<string, unknown>,
    });
  }
}) as EventListener);

export function createChannel(_name: string) {
  let subscribed = false;
  const localListeners: typeof channelListeners = [];

  return {
    on(
      _type: 'postgres_changes',
      filter: PostgresChangesFilter,
      callback: RealtimeCallback
    ) {
      localListeners.push({ filter, callback });
      return this;
    },
    subscribe() {
      subscribed = true;
      channelListeners.push(...localListeners);
      return {
        unsubscribe: () => {
          if (!subscribed) return;
          subscribed = false;
          for (const l of localListeners) {
            const idx = channelListeners.indexOf(l);
            if (idx >= 0) channelListeners.splice(idx, 1);
          }
        },
      };
    },
  };
}
