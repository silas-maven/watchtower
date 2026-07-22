import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { runFinanceSimulation } from '@/lib/finance/simulate';
import { narrateFinance } from '@/lib/ai/financeNarrative';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const maxDuration = 300;

const Debt = z.object({ name: z.string().max(60), balance: z.number().min(0), aprPct: z.number().min(0).max(100) });

const Schema = z.object({
  age: z.number().int().min(16).max(85),
  monthlyIncome: z.number().min(0),
  monthlyExpenses: z.number().min(0),
  savings: z.number().min(0),
  investments: z.number().min(0),
  pension: z.number().min(0),
  debts: z.array(Debt).max(10),
  homeValue: z.number().min(0).nullable(),
  monthlyInvesting: z.number().min(0),
  goal: z.string().max(300).nullable(),
  goalTargetAmount: z.number().positive().nullable(),
  goalTargetAge: z.number().int().min(17).max(90).nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');
    const data = parsed.data;

    // Persist the inputs so the form prefills next time.
    await prisma.personalFinanceInput
      .upsert({
        where: { profileId: user.id },
        update: {
          age: data.age,
          monthlyIncome: data.monthlyIncome,
          monthlyExpenses: data.monthlyExpenses,
          savings: data.savings,
          investments: data.investments,
          pension: data.pension,
          debts: data.debts as unknown as Prisma.InputJsonValue,
          homeValue: data.homeValue,
          monthlyInvesting: data.monthlyInvesting,
          goal: data.goal,
        },
        create: {
          profileId: user.id,
          age: data.age,
          monthlyIncome: data.monthlyIncome,
          monthlyExpenses: data.monthlyExpenses,
          savings: data.savings,
          investments: data.investments,
          pension: data.pension,
          debts: data.debts as unknown as Prisma.InputJsonValue,
          homeValue: data.homeValue,
          monthlyInvesting: data.monthlyInvesting,
          goal: data.goal,
        },
      })
      .catch(() => undefined);

    const result = runFinanceSimulation({
      age: data.age,
      monthlyIncome: data.monthlyIncome,
      monthlyExpenses: data.monthlyExpenses,
      savings: data.savings,
      investments: data.investments,
      pension: data.pension,
      debts: data.debts,
      homeValue: data.homeValue,
      monthlyInvesting: data.monthlyInvesting,
      goalTargetAmount: data.goalTargetAmount,
      goalTargetAge: data.goalTargetAge,
    });
    const narrative = await narrateFinance(result, data.goal);

    await prisma.aiReport
      .create({
        data: {
          kind: 'PERSONAL_FINANCE',
          profileId: user.id,
          inputs: data as unknown as Prisma.InputJsonValue,
          result: { result, narrative } as unknown as Prisma.InputJsonValue,
          model: narrative.model,
        },
      })
      .catch(() => undefined);

    return ok({ result, narrative });
  } catch (error) {
    return fromCaughtError(error);
  }
}
