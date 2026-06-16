import path from 'node:path';
import { prisma } from '../lib/prisma';
import { importPortfolioSpreadsheet } from '../lib/spreadsheet/importer';

// Seed = the real academy master watchlist only. No demo users, watchlists, or
// usage fixtures: every member's portfolio/watchlist data is self-input via the
// app. Admins/owners are granted through SPA_OWNER/ADMIN_EMAIL_ALLOWLIST + Clerk.
async function main() {
  const xlsxPath = path.join(process.cwd(), 'reference', 'portfolio-blotter-upload.xlsx');
  await importPortfolioSpreadsheet(xlsxPath);
  console.log('Seed complete: academy master watchlist imported (no demo data).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
