// ============================================================
// COMMON — Guards, Decorators, Base patterns
// ============================================================

// ---------- guards/jwt-auth.guard.ts ----------
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;
    return super.canActivate(context);
  }
}


// ---------- guards/roles.guard.ts ----------
import { Injectable, CanActivate, ForbiddenException } from '@nestjs/common';

export type Role = 'owner' | 'admin' | 'pm' | 'field' | 'viewer';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!required.includes(user.role)) {
      throw new ForbiddenException(`Required role: ${required.join(' | ')}`);
    }
    return true;
  }
}


// ---------- decorators/current-user.decorator.ts ----------
import { createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);

export const Roles = (...roles: Role[]) =>
  Reflect.metadata('roles', roles);

export const Public = () => Reflect.metadata('isPublic', true);


// ---------- filters/http-exception.filter.ts ----------
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    this.logger.error(`${request.method} ${request.url} → ${status}`, String(exception));

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}


// ---------- interceptors/transform.interceptor.ts ----------
import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}


// ---------- dto/pagination.dto.ts ----------
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional() @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';
}


// ---------- base/base.service.ts ----------
import { Repository, FindManyOptions, ILike } from 'typeorm';

export abstract class BaseService<T extends { id: string; companyId?: string }> {
  constructor(protected repo: Repository<T>) {}

  async findAll(companyId: string, pagination: PaginationDto, searchFields: string[] = []): Promise<{ data: T[]; total: number }> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', order = 'DESC' } = pagination;

    const where: any = { companyId };

    if (search && searchFields.length) {
      return this.repo.findAndCount({
        where: searchFields.map(f => ({ companyId, [f]: ILike(`%${search}%`) })),
        skip: (page - 1) * limit,
        take: limit,
        order: { [sortBy]: order } as any,
      }).then(([data, total]) => ({ data, total }));
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: order } as any,
    });

    return { data, total };
  }

  async findOne(id: string, companyId: string): Promise<T> {
    const item = await this.repo.findOne({ where: { id, companyId } as any });
    if (!item) throw new Error(`Not found: ${id}`);
    return item;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const item = await this.findOne(id, companyId);
    await this.repo.remove(item);
  }
}
