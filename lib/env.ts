const REQUIRED_IN_PROD = ['DATABASE_URL', 'SESSION_SECRET', 'CRON_SECRET'] as const;

export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value == null) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/London';

export function assertRuntimeEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  for (const name of REQUIRED_IN_PROD) {
    if (!process.env[name]) {
      throw new Error(`Missing required production env: ${name}`);
    }
  }
}
