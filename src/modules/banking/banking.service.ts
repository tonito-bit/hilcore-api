import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BankingService {
  constructor(private prisma: PrismaService) {}

  // ── Bank Accounts ──────────────────────────────────────────────

  async findAllAccounts(companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { companyId, inactive: false },
      include: { _count: { select: { transactions: true } } },
      orderBy: { bankName: 'asc' },
    });
  }

  async createAccount(companyId: string, dto: any) {
    return this.prisma.bankAccount.create({ data: { companyId, ...dto } });
  }

  async updateAccount(id: string, companyId: string, dto: any) {
    await this.getAccount(id, companyId);
    return this.prisma.bankAccount.update({ where: { id }, data: dto });
  }

  async getAccount(id: string, companyId: string) {
    const acc = await this.prisma.bankAccount.findFirst({ where: { id, companyId } });
    if (!acc) throw new NotFoundException('Bank account not found');
    return acc;
  }

  // ── Transactions ───────────────────────────────────────────────

  async findTransactions(
    companyId: string,
    bankAccountId: string,
    filters?: { from?: string; to?: string; conciliated?: boolean },
  ) {
    const account = await this.getAccount(bankAccountId, companyId);
    return this.prisma.bankTransaction.findMany({
      where: {
        bankAccountId: account.id,
        ...(filters?.from && { date: { gte: new Date(filters.from) } }),
        ...(filters?.to && { date: { lte: new Date(filters.to) } }),
        ...(filters?.conciliated !== undefined && { conciliated: filters.conciliated }),
      },
      orderBy: { date: 'desc' },
    });
  }

  async createTransaction(companyId: string, bankAccountId: string, dto: any) {
    await this.getAccount(bankAccountId, companyId);
    const tx = await this.prisma.bankTransaction.create({
      data: { bankAccountId, ...dto },
    });
    // update balance
    const delta = dto.type === 'credit' ? Number(dto.amount) : -Number(dto.amount);
    await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: delta } },
    });
    return tx;
  }

  async reconcileTransaction(id: string, companyId: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id, bankAccount: { companyId } },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.prisma.bankTransaction.update({
      where: { id },
      data: { conciliated: true, conciliatedAt: new Date() },
    });
  }

  // ── Bank Reconciliation ────────────────────────────────────────

  async createReconciliation(companyId: string, bankAccountId: string, dto: any) {
    await this.getAccount(bankAccountId, companyId);
    const diff = Number(dto.statementBalance) - Number(dto.bookBalance);
    return this.prisma.bankReconciliation.create({
      data: { bankAccountId, difference: diff, ...dto },
    });
  }

  async findReconciliations(companyId: string, bankAccountId: string) {
    await this.getAccount(bankAccountId, companyId);
    return this.prisma.bankReconciliation.findMany({
      where: { bankAccountId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  // ── Check Books ────────────────────────────────────────────────

  async createCheckBook(companyId: string, bankAccountId: string, dto: any) {
    await this.getAccount(bankAccountId, companyId);
    return this.prisma.checkBook.create({
      data: { bankAccountId, currentNumber: dto.firstNumber, ...dto },
    });
  }

  async findCheckBooks(companyId: string, bankAccountId: string) {
    await this.getAccount(bankAccountId, companyId);
    return this.prisma.checkBook.findMany({
      where: { bankAccountId },
      include: { _count: { select: { checks: true } } },
    });
  }

  async issueCheck(companyId: string, checkBookId: string, dto: any) {
    const book = await this.prisma.checkBook.findFirst({
      where: { id: checkBookId, bankAccount: { companyId } },
    });
    if (!book) throw new NotFoundException('Check book not found');
    const check = await this.prisma.check.create({
      data: {
        checkBookId,
        number: book.currentNumber,
        status: 'issued',
        issuedAt: new Date(),
        ...dto,
      },
    });
    await this.prisma.checkBook.update({
      where: { id: checkBookId },
      data: { currentNumber: { increment: 1 } },
    });
    return check;
  }

  // ── Summary ────────────────────────────────────────────────────

  async getAccountSummary(companyId: string, bankAccountId: string) {
    await this.getAccount(bankAccountId, companyId);
    const [credits, debits, pending] = await Promise.all([
      this.prisma.bankTransaction.aggregate({
        where: { bankAccountId, type: 'credit' },
        _sum: { amount: true },
      }),
      this.prisma.bankTransaction.aggregate({
        where: { bankAccountId, type: 'debit' },
        _sum: { amount: true },
      }),
      this.prisma.bankTransaction.count({
        where: { bankAccountId, conciliated: false },
      }),
    ]);
    return {
      totalCredits: credits._sum.amount ?? 0,
      totalDebits: debits._sum.amount ?? 0,
      pendingReconciliation: pending,
    };
  }
}
