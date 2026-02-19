import { Role } from '@prisma/client';
import { ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { getFormulaParityProof } from '@/lib/server/formulaParity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const proof = await getFormulaParityProof();
    return ok(proof);
  } catch (error) {
    return fromCaughtError(error);
  }
}
