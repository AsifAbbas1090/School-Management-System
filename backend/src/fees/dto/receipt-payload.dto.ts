import { ApiProperty } from '@nestjs/swagger';

export class ReceiptPayloadDto {
  @ApiProperty()
  payment: {
    receiptNumber: string;
    amount: number;
    paidDate: Date;
    paymentMethod: string;
    feeType: string;
    transactionId?: string;
    remarks?: string;
  };

  @ApiProperty()
  student: {
    name: string;
    rollNumber: string;
    className: string;
    fatherName?: string;
    phone?: string;
    contact?: string;
  };

  @ApiProperty()
  school: {
    name: string;
    logoUrl?: string;
    principalName?: string;
    ownerName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}


