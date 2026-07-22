// Bank of England Bank Rate (the "BOE Base Rate" tile). The BoE Interactive
// Database serves this free as CSV with no key, series code IUDBEDR. The rate
// only moves at MPC meetings (~8x a year), so this is about never having to
// hand-update the tile, not about intraday freshness.

const IADB_URL =
  'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp' +
  '?csv.x=yes&Datefrom=01/Jan/2024&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N';

export type BoeBaseRate = { value: number; asOf: string };

function parseMonth(mon: string): number {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return months.indexOf(mon.trim().toLowerCase().slice(0, 3));
}

// Rows are "DD Mon YYYY,value". Returns the most recent dated value.
function parseLatest(csv: string): BoeBaseRate | null {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let latest: BoeBaseRate | null = null;
  let latestTime = -Infinity;
  for (const line of lines) {
    const [datePart, valuePart] = line.split(',');
    if (!datePart || valuePart == null) continue;
    const m = datePart.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
    const value = Number(valuePart);
    if (!m || !Number.isFinite(value)) continue;
    const month = parseMonth(m[2]);
    if (month < 0) continue;
    const t = new Date(Date.UTC(Number(m[3]), month, Number(m[1]))).getTime();
    if (t > latestTime) {
      latestTime = t;
      latest = { value, asOf: new Date(t).toISOString() };
    }
  }
  return latest;
}

export async function fetchBoeBaseRate(): Promise<BoeBaseRate | null> {
  try {
    const res = await fetch(IADB_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Watchtower/SPA market data)' },
      // Revalidate hourly; the underlying data changes at most a few times a year.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const csv = await res.text();
    return parseLatest(csv);
  } catch {
    return null;
  }
}
