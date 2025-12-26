import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SchoolGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admin can access all schools
    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Other users must have a schoolId
    if (!user?.schoolId) {
      throw new ForbiddenException('School context required');
    }

    return true;
  }
}


