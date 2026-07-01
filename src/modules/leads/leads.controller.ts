import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CRM — Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Get() findAll(@CurrentUser() u: any, @Query() q: any) { return this.service.findAll(u.companyId, q); }
  @Get('pipeline') pipeline(@CurrentUser() u: any) { return this.service.getPipelineSummary(u.companyId); }
  @Post() create(@Body() dto: any, @CurrentUser() u: any) { return this.service.create(u.companyId, dto); }
  @Put(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() u: any) {
    return this.service.updateStatus(id, u.companyId, status);
  }
}
