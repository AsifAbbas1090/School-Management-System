import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Call when role === PARENT and the operation is scoped by studentId. */
export async function assertParentOwnsStudent(
  prisma: PrismaService,
  schoolId: string,
  parentUserId: string,
  studentId: string,
): Promise<void> {
  const row = await prisma.student.findFirst({
    where: { id: studentId, schoolId, parentId: parentUserId },
    select: { id: true },
  });
  if (!row) {
    throw new ForbiddenException('You do not have access to this student');
  }
}
