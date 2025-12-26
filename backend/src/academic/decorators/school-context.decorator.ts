import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SchoolContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // For super admin, schoolId might come from query params or body
    if (user?.role === 'SUPER_ADMIN') {
      return request.body?.schoolId || request.query?.schoolId || user?.schoolId;
    }
    
    return user?.schoolId;
  },
);

