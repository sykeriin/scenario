import { from } from './query-builder';
import { localAuth } from './auth';
import { createChannel } from './realtime';
import { executeRpc } from './rpc';
import { invokeFunction } from '@/lib/ai';

export const localClient = {
  from,
  auth: localAuth,
  channel: createChannel,
  rpc: async (name: string, args?: Record<string, unknown>) => {
    const result = await executeRpc(name, args ?? {});
    return result;
  },
  functions: {
    invoke: async (name: string, options?: { body?: Record<string, unknown> }) => {
      try {
        const data = await invokeFunction(name, options?.body ?? {});
        return { data, error: null };
      } catch (e: unknown) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : 'Function invoke failed' },
        };
      }
    },
  },
};

export type LocalClient = typeof localClient;
