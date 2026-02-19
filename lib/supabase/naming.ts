const PREFIX = process.env.SUPABASE_BUCKET_PREFIX || 'watchtower';

export const STORAGE_BUCKETS = {
  uploads: `${PREFIX}_uploads`,
  reports: `${PREFIX}_reports`,
  exports: `${PREFIX}_exports`,
} as const;

export function withWatchtowerPrefix(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  return normalized.startsWith('watchtower_') ? normalized : `watchtower_${normalized}`;
}
