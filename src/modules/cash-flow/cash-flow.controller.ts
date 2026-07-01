import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Obras — Acompanhamento / Cash Flow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('work-budgets')
export class CashFlowController {
  constructor(private service: CashFlowService) {}

  // ── Work Budgets ───────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos de obra' })
  findAll(@Query('projectId') projectId: string, @CurrentUser() u: any) {
    return this.service.findBudgets(u.companyId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do orçamento de obra' })
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findOneBudget(id, u.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar orçamento de obra' })
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createBudget(u.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar orçamento de obra' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateBudget(id, u.companyId, dto);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copiar orçamento para outra obra' })
  copy(
    @Param('id') id: string,
    @Body() dto: { targetProjectId: string; targetDescription: string },
    @CurrentUser() u: any,
  ) {
    return this.service.copyBudget(id, u.companyId, dto.targetProjectId, dto.targetDescription);
  }

  // ── Services ───────────────────────────────────────────────────

  @Post(':id/services')
  @ApiOperation({ summary: 'Adicionar serviço ao orçamento' })
  addService(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.addService(id, u.companyId, dto);
  }

  @Patch('services/:serviceId/price')
  @ApiOperation({ summary: 'Atualizar preço do serviço' })
  updateServicePrice(@Param('serviceId') sid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateServicePrice(sid, u.companyId, dto);
  }

  // ── Insumos ────────────────────────────────────────────────────

  @Patch('insumos/:insumoId/price')
  @ApiOperation({ summary: 'Atualizar preço do insumo (Preço Informado)' })
  updateInsumoPrice(@Param('insumoId') iid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateInsumoPrice(iid, u.companyId, dto);
  }

  @Post(':id/recalc-prices')
  @ApiOperation({ summary: 'Recalcular todos preços dos insumos' })
  recalcPrices(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.updateAllInsumosPrices(id, u.companyId);
  }

  // ── Cash Flow ──────────────────────────────────────────────────

  @Get(':id/cash-flow')
  @ApiOperation({ summary: 'Cronograma físico-financeiro' })
  getCashFlow(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.getCashFlow(id, u.companyId);
  }

  @Post(':id/cash-flow/period')
  @ApiOperation({ summary: 'Lançar / atualizar período do cash flow' })
  upsertPeriod(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.upsertPeriod(id, u.companyId, dto);
  }

  @Post(':id/cash-flow/process')
  @ApiOperation({ summary: 'Processar cash flow (calcula comprometido e realizado)' })
  process(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.processCashFlow(id, u.companyId);
  }

  @Get(':id/cash-flow/financing-gap')
  @ApiOperation({
    summary: 'Gap de financiamento da obra (defasagem de recebimento)',
    description: 'Returns the maximum working capital needed by month — the gap between costs incurred (executedValue) and amounts received (receivedValue). The contractor finances this gap.',
  })
  async getFinancingGap(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.getFinancingGap(id, u.companyId);
  }

  // ── Indexers ───────────────────────────────────────────────────

  @Get('indexers/list')
  @ApiOperation({ summary: 'Listar indexadores' })
  findIndexers(@CurrentUser() u: any) {
    return this.service.findIndexers(u.companyId);
  }

  @Post('indexers')
  @ApiOperation({ summary: 'Criar indexador (IGPM, INCC, etc.)' })
  createIndexer(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createIndexer(u.companyId, dto);
  }

  @Post('indexers/:indexerId/rates')
  @ApiOperation({ summary: 'Cadastrar variação mensal do indexador' })
  addRate(@Param('indexerId') iid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.addIndexerRate(iid, u.companyId, dto);
  }
}
