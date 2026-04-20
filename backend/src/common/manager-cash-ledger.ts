import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

const EPS = 1e-6;

/**
 * Cash held by a manager from fee collections, after handovers to admin and expenses they logged.
 * Formula: collected − Σ(handover.amountSubmitted) − Σ(expense where MANAGEMENT creator).
 */
export async function getManagerCashLedger(prisma: PrismaService, schoolId: string, managerId: string) {
  const [collectedAgg, handedAgg, expenseAgg, paymentCount] = await Promise.all([
    prisma.feePayment.aggregate({
      where: { schoolId, collectedById: managerId },
      _sum: { amountPaid: true },
    }),
    prisma.feeHandover.aggregate({
      where: { schoolId, managerId },
      _sum: { amountSubmitted: true },
    }),
    prisma.expense.aggregate({
      where: {
        schoolId,
        createdById: managerId,
        deletedAt: null,
        createdByRole: UserRole.MANAGEMENT,
      },
      _sum: { amount: true },
    }),
    prisma.feePayment.count({
      where: { schoolId, collectedById: managerId },
    }),
  ]);

  const totalCollected = collectedAgg._sum.amountPaid ?? 0;
  const totalSubmittedToAdmin = handedAgg._sum.amountSubmitted ?? 0;
  const totalExpensesFromFloat = expenseAgg._sum.amount ?? 0;
  const remainingOnHand = totalCollected - totalSubmittedToAdmin - totalExpensesFromFloat;

  return {
    totalCollected,
    totalSubmittedToAdmin,
    totalExpensesFromFloat,
    remainingOnHand,
    feePaymentsCount: paymentCount,
  };
}

/** Max amount this manager can hand over or spend right now (floored at 0). */
export function clampNonNegative(n: number) {
  return n < EPS ? 0 : n;
}

export { EPS };
