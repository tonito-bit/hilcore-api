import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.companyId) throw new ForbiddenException('No company context');
    // Inject company_id into query/body for all requests
    request.companyId = user.companyId;
    return true;
  }
}
