import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financial — Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get() findAll(@CurrentUser() u: any) { return this.service.findAll(u.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @CurrentUser() u: any) { return this.service.findOne(id, u.companyId); }

  @Post('from-budget/:budgetId/project/:projectId')
  createFromBudget(@Param('budgetId') bId: string, @Param('projectId') pId: string, @CurrentUser() u: any) {
    return this.service.createFromBudget(pId, u.companyId, bId, u.id);
  }

  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.recordPayment(id, u.companyId, dto);
  }
}
