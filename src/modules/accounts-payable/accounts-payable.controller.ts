import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsPayableService } from './accounts-payable.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financeiro — Contas a Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('payables')
export class AccountsPayableController {
  constructor(private service: AccountsPayableService) {}

  @Get()
  @ApiOperation({ summary: 'Listar títulos a pagar' })
  findAll(
    @Query('status') status: string,
    @Query('projectId') projectId: string,
    @Query('supplierId') supplierId: string,
    @Query('costCenterId') costCenterId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findAll(u.companyId, { status, projectId, supplierId, costCenterId, from, to });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro AP' })
  summary(@CurrentUser() u: any) {
    return this.service.getSummary(u.companyId);
  }

  @Get('retentions')
  @ApiOperation({ summary: 'Totais de retenções a recolher' })
  retentions(@CurrentUser() u: any) {
    return this.service.getRetentionsDue(u.companyId);
  }

  @Get('cost-centers')
  @ApiOperation({ summary: 'Listar centros de custo' })
  findCostCenters(@Query('projectId') projectId: string, @CurrentUser() u: any) {
    return this.service.findCostCenters(u.companyId, projectId);
  }

  @Post('cost-centers')
  @ApiOperation({ summary: 'Criar centro de custo' })
  createCostCenter(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createCostCenter(u.companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do título a pagar' })
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar título a pagar' })
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(u.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar título a pagar' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(id, u.companyId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar título (workflow)' })
  approve(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.approve(id, u.companyId, u.id);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Liberar título para pagamento' })
  release(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.release(id, u.companyId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registrar pagamento (baixa)' })
  recordPayment(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.recordPayment(id, u.companyId, dto);
  }
}
