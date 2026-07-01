import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('procurement/purchase-orders')
export class ProcurementController {
  constructor(private service: ProcurementService) {}

  @Get() findAll(@CurrentUser() u: any, @Query('projectId') pId: string) { return this.service.findAll(u.companyId, pId); }
  @Post() create(@Body() dto: any, @CurrentUser() u: any) { return this.service.create(u.companyId, u.id, dto); }
  @Put(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() u: any) {
    return this.service.updateStatus(id, u.companyId, status);
  }
}
