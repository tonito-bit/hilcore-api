import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsReceivableService } from './accounts-receivable.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financeiro — Contas a Receber')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('receivables')
export class AccountsReceivableController {
  constructor(private service: AccountsReceivableService) {}

  @Get()
  @ApiOperation({ summary: 'Listar títulos a receber' })
  findAll(
    @Query('status') status: string,
    @Query('projectId') projectId: string,
    @Query('customerId') customerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findAll(u.companyId, { status, projectId, customerId, from, to });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro AR' })
  summary(@CurrentUser() u: any) {
    return this.service.getSummary(u.companyId);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Aging de recebíveis' })
  aging(@CurrentUser() u: any) {
    return this.service.getAging(u.companyId);
  }

  @Post('mark-overdue')
  @ApiOperation({ summary: 'Marcar vencidos como overdue' })
  markOverdue(@CurrentUser() u: any) {
    return this.service.markOverdue(u.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do título a receber' })
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar título a receber' })
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(u.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar título a receber' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(id, u.companyId, dto);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registrar pagamento (baixa)' })
  recordPayment(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.recordPayment(id, u.companyId, dto);
  }

  @Patch(':id/nfe')
  @ApiOperation({ summary: 'Vincular NF-e / NFS-e ao título' })
  linkNfe(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.linkNfe(id, u.companyId, dto);
  }
}
