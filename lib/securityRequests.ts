// Shared vocabulary for member security requests. One definition used by the
// member form, the API validation and the admin queue, so the three cannot drift
// apart the way the Dashboard tool list did.

export const REQUEST_STATUSES = ['PENDING', 'REVIEWED', 'ADDED', 'DECLINED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Statuses that mean the academy has finished with the request. */
export const DECIDED_STATUSES: RequestStatus[] = ['ADDED', 'DECLINED'];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  ADDED: 'Added',
  DECLINED: 'Declined',
};

export const STATUS_TONE: Record<RequestStatus, 'amber' | 'blue' | 'emerald' | 'zinc'> = {
  PENDING: 'amber',
  REVIEWED: 'blue',
  ADDED: 'emerald',
  DECLINED: 'zinc',
};

/**
 * What kind of security is being asked for. These match the AssetType values
 * used everywhere else, so an approved request can be turned into an asset
 * without translating anything.
 */
export const REQUEST_TYPES = ['STOCK', 'ETF', 'CRYPTO', 'COMMODITY', 'INDEX', 'FOREX', 'OTHER'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  STOCK: 'Stock',
  ETF: 'ETF or fund',
  CRYPTO: 'Crypto',
  COMMODITY: 'Commodity',
  INDEX: 'Index',
  FOREX: 'Currency pair',
  OTHER: 'Something else',
};

/** Where the member believes it trades. Free text is allowed; these are hints. */
export const COMMON_MARKETS = [
  'London (LSE)',
  'New York (NYSE)',
  'Nasdaq',
  'Euronext',
  'Frankfurt (XETRA)',
  'Toronto (TSX)',
  'Australia (ASX)',
  'Crypto exchange',
] as const;

export function requestTypeLabel(value: string): string {
  return REQUEST_TYPE_LABEL[value as RequestType] ?? value;
}

export function statusLabel(value: string): string {
  return STATUS_LABEL[value as RequestStatus] ?? value;
}

export function statusTone(value: string): 'amber' | 'blue' | 'emerald' | 'zinc' {
  return STATUS_TONE[value as RequestStatus] ?? 'zinc';
}
