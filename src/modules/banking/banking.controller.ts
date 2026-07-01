import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BankingService } from './banking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financeiro — Controle Bancário')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('banking')
export class BankingController {
  constructor(private service: BankingService) {}

  // ── Accounts ───────────────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'Listar contas bancárias' })
  findAll(@CurrentUser() u: any) {
    return this.service.findAllAccounts(u.companyId);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Cadastrar conta bancária' })
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createAccount(u.companyId, dto);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateAccount(id, u.companyId, dto);
  }

  @Get('accounts/:id/summary')
  @ApiOperation({ summary: 'Resumo da conta bancária' })
  summary(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.getAccountSummary(u.companyId, id);
  }

  // ── Transactions ───────────────────────────────────────────────

  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'Movimentações bancárias' })
  findTransactions(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('conciliated') conciliated: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findTransactions(u.companyId, id, {
      from,
      to,
      conciliated: conciliated !== undefined ? conciliated === 'true' : undefined,
    });
  }

  @Post('accounts/:id/transactions')
  @ApiOperation({ summary: 'Lançar movimentação bancária' })
  createTransaction(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createTransaction(u.companyId, id, dto);
  }

  @Patch('transactions/:txId/reconcile')
  @ApiOperation({ summary: 'Conciliar lançamento' })
  reconcile(@Param('txId') txId: string, @CurrentUser() u: any) {
    return this.service.reconcileTransaction(txId, u.companyId);
  }

  // ── Reconciliation ─────────────────────────────────────────────

  @Get('accounts/:id/reconciliations')
  @ApiOperation({ summary: 'Histórico de conciliações' })
  findReconciliations(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findReconciliations(u.companyId, id);
  }

  @Post('accounts/:id/reconciliations')
  @ApiOperation({ summary: 'Criar conciliação bancária' })
  createReconciliation(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createReconciliation(u.companyId, id, dto);
  }

  // ── Check Books ────────────────────────────────────────────────

  @Get('accounts/:id/checkbooks')
  @ApiOperation({ summary: 'Talões de cheque da conta' })
  findCheckBooks(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findCheckBooks(u.companyId, id);
  }

  @Post('accounts/:id/checkbooks')
  @ApiOperation({ summary: 'Cadastrar talão de cheque' })
  createCheckBook(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createCheckBook(u.companyId, id, dto);
  }

  @Post('checkbooks/:checkBookId/issue')
  @ApiOperation({ summary: 'Emitir cheque' })
  issueCheck(@Param('checkBookId') cbId: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.issueCheck(u.companyId, cbId, dto);
  }
}
