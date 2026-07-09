export type AIProvider = 'groq' | 'openai' | 'openrouter' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  configured: boolean;
  skipAi: boolean;
}

const STORAGE_KEY = 'founder_os_ai';

export const AI_PRESETS: Record<Exclude<AIProvider, 'custom'>, { baseUrl: string; model: string; label: string }> = {
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  },
};

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        provider: 'groq',
        baseUrl: AI_PRESETS.groq.baseUrl,
        apiKey: '',
        model: AI_PRESETS.groq.model,
        configured: false,
        skipAi: false,
      };
    }
    return JSON.parse(raw) as AIConfig;
  } catch {
    return {
      provider: 'groq',
      baseUrl: AI_PRESETS.groq.baseUrl,
      apiKey: '',
      model: AI_PRESETS.groq.model,
      configured: false,
      skipAi: false,
    };
  }
}

export function setAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isAIReady() {
  const c = getAIConfig();
  return c.configured && !c.skipAi && !!c.apiKey;
}
