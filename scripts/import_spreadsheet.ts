import path from 'node:path';
import { importPortfolioSpreadsheet } from '../lib/spreadsheet/importer';
import { prisma } from '../lib/prisma';

async function main() {
  const fileArg = process.argv[2] || 'reference/portfolio-blotter-upload.xlsx';
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const result = await importPortfolioSpreadsheet(filePath);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
