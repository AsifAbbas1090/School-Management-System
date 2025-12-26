import { Injectable } from '@nestjs/common';

@Injectable()
export class ReceiptService {
  /**
   * Generate unique receipt number
   * Format: RCP + YY + MM + 4-digit random
   * Example: RCP2412001
   */
  generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP${year}${month}${random}`;
  }

  /**
   * Ensure receipt number is unique
   */
  async ensureUniqueReceiptNumber(
    prisma: any,
    receiptNumber: string,
  ): Promise<string> {
    let finalReceiptNumber = receiptNumber;
    let counter = 1;

    while (true) {
      const existing = await prisma.feePayment.findUnique({
        where: { receiptNumber: finalReceiptNumber },
      });

      if (!existing) {
        break;
      }

      // If exists, append counter
      const base = receiptNumber.slice(0, -4);
      finalReceiptNumber = `${base}${(parseInt(receiptNumber.slice(-4)) + counter)
        .toString()
        .padStart(4, '0')}`;
      counter++;
    }

    return finalReceiptNumber;
  }
}


