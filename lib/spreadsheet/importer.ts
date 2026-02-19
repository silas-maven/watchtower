import path from 'node:path';
import XLSX from 'xlsx';
import { AssetType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ImportedAssetRow = {
  row: number;
  symbol: string;
  name: string;
  reason: string | null;
  assetType: AssetType;
  currency: string;
  currentPrice: number | null;
  brokerEntryPrice: number | null;
  averageEntryPrice: number | null;
  shares: number | null;
  currentCostGBP: number | null;
  currentValueGBP: number | null;
  weightPct: number | null;
  returnPct: number | null;
  dailyChangePct: number | null;
  dailyChange: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  closeYest: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  beta: number | null;
  low52: number | null;
  high52: number | null;
  volumeAvg: number | null;
  pe: number | null;
  dataDelay: number | null;
  marketCap: number | null;
};

export type ImportResult = {
  sourceFile: string;
  rowsScanned: number;
  assetsParsed: number;
  assetsUpserted: number;
};

function toNum(input: unknown): number | null {
  if (input == null || input === '') return null;
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}

function cleanString(input: unknown): string {
  if (typeof input !== 'string') return input == null ? '' : String(input);
  return input.trim();
}

function inferAssetType(symbol: string, name: string): AssetType {
  const s = symbol.toUpperCase();
  const n = name.toLowerCase();
  if (['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK', 'RNDR', 'NEAR'].includes(s)) {
    return AssetType.CRYPTO;
  }
  if (n.includes('etf') || n.includes('index fund')) return AssetType.ETF;
  if (n.includes('gold') || n.includes('silver') || n.includes('crude')) return AssetType.COMMODITY;
  return AssetType.STOCK;
}

export function parsePortfolioSheet(filePath: string): ImportedAssetRow[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets['Portfolio'];
  if (!sheet) {
    throw new Error('Portfolio sheet not found');
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const parsed: ImportedAssetRow[] = [];

  for (let i = 3; i < rows.length; i += 1) {
    const row = rows[i];
    const symbol = cleanString(row?.[0]);
    if (!symbol) continue;

    const name = cleanString(row?.[1]);
    if (!name) continue;

    parsed.push({
      row: i + 1,
      symbol,
      name,
      reason: cleanString(row?.[2]) || null,
      assetType: inferAssetType(symbol, name),
      currency: cleanString(row?.[12]) || 'USD',
      currentPrice: toNum(row?.[3]),
      brokerEntryPrice: toNum(row?.[4]),
      averageEntryPrice: toNum(row?.[5]),
      shares: toNum(row?.[6]),
      currentCostGBP: toNum(row?.[7]),
      currentValueGBP: toNum(row?.[8]),
      weightPct: toNum(row?.[9]),
      returnPct: toNum(row?.[10]),
      dailyChangePct: toNum(row?.[13]),
      dailyChange: toNum(row?.[14]),
      dailyHigh: toNum(row?.[15]),
      dailyLow: toNum(row?.[16]),
      closeYest: toNum(row?.[30]),
      targetEntry: toNum(row?.[19]),
      targetExit: toNum(row?.[20]),
      beta: toNum(row?.[23]),
      low52: toNum(row?.[24]),
      high52: toNum(row?.[25]),
      volumeAvg: toNum(row?.[26]),
      pe: toNum(row?.[27]),
      dataDelay: toNum(row?.[28]),
      marketCap: toNum(row?.[29]),
    });
  }

  return parsed;
}

export async function importPortfolioSpreadsheet(filePath: string): Promise<ImportResult> {
  const rows = parsePortfolioSheet(filePath);
  const sourceFile = path.basename(filePath);

  const run = await prisma.importRun.create({
    data: {
      sourceFile,
      status: 'RUNNING',
      rowCount: rows.length,
      notes: Prisma.JsonNull,
    },
  });

  let upserted = 0;
  try {
    for (const row of rows) {
      const asset = await prisma.asset.upsert({
        where: { symbol: row.symbol },
        update: {
          name: row.name,
          reason: row.reason,
          assetType: row.assetType,
          currency: row.currency,
          sourceRow: row.row,
          brokerEntryPrice: row.brokerEntryPrice,
          averageEntryPrice: row.averageEntryPrice,
          shares: row.shares,
          currentCostGBP: row.currentCostGBP,
          currentValueGBP: row.currentValueGBP,
          weightPct: row.weightPct,
          returnPct: row.returnPct,
          beta: row.beta,
          low52: row.low52,
          high52: row.high52,
          volumeAvg: row.volumeAvg,
          pe: row.pe,
          dataDelay: row.dataDelay,
          marketCap: row.marketCap,
          closeYest: row.closeYest,
          isActive: true,
        },
        create: {
          symbol: row.symbol,
          name: row.name,
          reason: row.reason,
          assetType: row.assetType,
          currency: row.currency,
          sourceRow: row.row,
          brokerEntryPrice: row.brokerEntryPrice,
          averageEntryPrice: row.averageEntryPrice,
          shares: row.shares,
          currentCostGBP: row.currentCostGBP,
          currentValueGBP: row.currentValueGBP,
          weightPct: row.weightPct,
          returnPct: row.returnPct,
          beta: row.beta,
          low52: row.low52,
          high52: row.high52,
          volumeAvg: row.volumeAvg,
          pe: row.pe,
          dataDelay: row.dataDelay,
          marketCap: row.marketCap,
          closeYest: row.closeYest,
          isActive: true,
        },
      });

      await prisma.assetRule.upsert({
        where: { assetId: asset.id },
        update: {
          targetEntry: row.targetEntry,
          targetExit: row.targetExit,
        },
        create: {
          assetId: asset.id,
          targetEntry: row.targetEntry,
          targetExit: row.targetExit,
        },
      });

      await prisma.assetSnapshot.create({
        data: {
          assetId: asset.id,
          currentPrice: row.currentPrice,
          dailyChangePct: row.dailyChangePct,
          dailyChange: row.dailyChange,
          dailyHigh: row.dailyHigh,
          dailyLow: row.dailyLow,
          closeYest: row.closeYest,
          beta: row.beta,
          low52: row.low52,
          high52: row.high52,
          volumeAvg: row.volumeAvg,
          pe: row.pe,
          dataDelay: row.dataDelay,
          marketCap: row.marketCap,
          source: 'spreadsheet-import',
          raw: row as unknown as Prisma.JsonObject,
        },
      });
      upserted += 1;
    }

    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        assetCount: upserted,
        notes: { message: 'Import completed' },
      },
    });
  } catch (error) {
    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        assetCount: upserted,
        notes: { message: (error as Error).message },
      },
    });
    throw error;
  }

  return {
    sourceFile,
    rowsScanned: rows.length,
    assetsParsed: rows.length,
    assetsUpserted: upserted,
  };
}
