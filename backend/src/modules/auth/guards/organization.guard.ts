import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';

export const SKIP_ORG_CHECK = 'skipOrgCheck';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ORG_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Superadmin bypasses all org checks
    if (user.role === UserRole.SUPERADMIN) return true;

    // All other roles must belong to an org
    if (!user.organizationId) throw new ForbiddenException('Akun tidak terhubung ke organisasi');

    return true;
  }
}
