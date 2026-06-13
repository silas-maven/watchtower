import OpenAI from 'openai';
import { OPENAI_MODEL, OPENROUTER_MODEL, optionalEnv } from '@/lib/env';

// Shared JSON-mode LLM caller. Providers are tried in order: OpenRouter first
// (free gpt-oss model for the demo), then OpenAI as the fallback. Both speak the
// OpenAI Chat Completions API, so one code path covers both. Callers are expected
// to validate the returned JSON and fall back deterministically on any failure.

type Provider = {
  name: string;
  client: OpenAI;
  model: string;
  // gpt-5 family on OpenAI is locked to temperature 1; only set it where supported.
  temperature?: number;
};

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  const openRouterKey = optionalEnv('OPENROUTER_API_KEY');
  if (openRouterKey) {
    providers.push({
      name: 'openrouter',
      model: OPENROUTER_MODEL,
      temperature: 0,
      client: new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        // The free model can be heavily queued. Cap the wait and do not retry, so
        // a slow request fails over to OpenAI rather than hanging the request.
        timeout: 120_000,
        maxRetries: 0,
        defaultHeaders: {
          'HTTP-Referer': 'https://watchtower-virid.vercel.app',
          'X-Title': 'Stock Pickers Academy',
        },
      }),
    });
  }

  const openAiKey = optionalEnv('OPENAI_API_KEY');
  if (openAiKey) {
    providers.push({
      name: 'openai',
      model: OPENAI_MODEL,
      client: new OpenAI({ apiKey: openAiKey, timeout: 60_000, maxRetries: 1 }),
    });
  }

  return providers;
}

// The community's house style bans em and en dashes in member-facing copy.
// Strip them from model output, leaving deterministic text untouched.
function sanitiseCopy(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ' - ');
}

export function hasLlmProvider(): boolean {
  return buildProviders().length > 0;
}

export type JsonModelResult = { text: string; model: string; provider: string };

/**
 * Calls the first available provider that returns content. The model is asked
 * for a JSON object; the system prompt is responsible for describing the exact
 * shape. Throws only when every provider fails.
 */
export async function callJsonModel(system: string, user: string): Promise<JsonModelResult> {
  const providers = buildProviders();
  if (providers.length === 0) throw new Error('No AI provider configured');

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      const response = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        ...(provider.temperature != null ? { temperature: provider.temperature } : {}),
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text: sanitiseCopy(text), model: `${provider.name}:${provider.model}`, provider: provider.name };
      lastError = new Error(`${provider.name} returned empty content`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[llm] ${provider.name} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error('All AI providers failed');
}
