import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SCHOOL_ID_REQUIRED_MESSAGE =
  'schoolId is required for this operation (SUPER_ADMIN has schoolId=null in JWT — pass schoolId in query or body).';

function resolveSchoolId(request: any): string | undefined {
  const user = request.user;
  if (user?.role === 'SUPER_ADMIN') {
    return request.body?.schoolId ?? request.query?.schoolId ?? user?.schoolId ?? undefined;
  }
  return user?.schoolId ?? undefined;
}

/**
 * Injects the active school id for Prisma-scoped work.
 * Throws if missing: non–school users are blocked earlier by SchoolGuard; SUPER_ADMIN must supply schoolId.
 */
export const SchoolContext = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const schoolId = resolveSchoolId(request);
  if (schoolId == null || schoolId === '') {
    throw new BadRequestException(SCHOOL_ID_REQUIRED_MESSAGE);
  }
  return schoolId;
});

