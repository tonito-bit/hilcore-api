import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('HR — Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private service: EmployeesService) {}

  @Get() findAll(@CurrentUser() u: any) { return this.service.findAll(u.companyId); }
  @Get('certs/expiring') getExpiring(@CurrentUser() u: any, @Query('days') days: string) {
    return this.service.getExpiringCerts(u.companyId, days ? parseInt(days) : 60);
  }
  @Post() create(@Body() dto: any, @CurrentUser() u: any) { return this.service.create(u.companyId, dto); }
  @Post('timesheets') logTime(@Body() dto: any, @CurrentUser() u: any) { return this.service.logTimesheet(u.companyId, dto); }
}
