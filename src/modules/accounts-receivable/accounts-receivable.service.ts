import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountsReceivableService {
  constructor(private prisma: PrismaService) {}

  // ── Receivables ────────────────────────────────────────────────

  async findAll(
    companyId: string,
    filters?: { status?: string; projectId?: string; customerId?: string; from?: string; to?: string },
  ) {
    return this.prisma.receivable.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.customerId && { customerId: filters.customerId }),
        ...(filters?.from && { dueDate: { gte: new Date(filters.from) } }),
        ...(filters?.to && { dueDate: { lte: new Date(filters.to) } }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const rec = await this.prisma.receivable.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        project: { select: { id: true, name: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!rec) throw new NotFoundException('Receivable not found');
    return rec;
  }

  async create(companyId: string, dto: any) {
    const { ...data } = dto;
    const number = `AR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    return this.prisma.receivable.create({
      data: { companyId, number, ...data },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.receivable.update({ where: { id }, data: dto });
  }

  // ── Payments ───────────────────────────────────────────────────

  async recordPayment(id: string, companyId: string, dto: any) {
    const rec = await this.findOne(id, companyId);
    const payment = await this.prisma.receivablePayment.create({
      data: { receivableId: id, ...dto },
    });
    const totalPaid = Number(rec.amountPaid) + Number(dto.amount);
    const netAmount =
      Number(rec.amount) -
      Number(rec.retentionINSS) -
      Number(rec.retentionISS) -
      Number(rec.retentionIR) -
      Number(rec.retentionPIS) -
      Number(rec.retentionCOFINS) -
      Number(rec.retentionCSLL);
    const newStatus = totalPaid >= netAmount ? 'paid' : 'partial';
    await this.prisma.receivable.update({
      where: { id },
      data: { amountPaid: totalPaid, status: newStatus },
    });
    return payment;
  }

  // ── Overview / Aging ───────────────────────────────────────────

  async getAging(companyId: string) {
    const today = new Date();
    const all = await this.prisma.receivable.findMany({
      where: { companyId, status: { not: 'paid' } },
      select: { dueDate: true, amount: true, amountPaid: true, retentionINSS: true, retentionISS: true, retentionIR: true },
    });

    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const r of all) {
      const diff = Math.floor((today.getTime() - r.dueDate.getTime()) / 86400000);
      const net = Number(r.amount) - Number(r.amountPaid) - Number(r.retentionINSS) - Number(r.retentionISS) - Number(r.retentionIR);
      if (diff <= 0) buckets.current += net;
      else if (diff <= 30) buckets.days30 += net;
      else if (diff <= 60) buckets.days60 += net;
      else if (diff <= 90) buckets.days90 += net;
      else buckets.over90 += net;
    }
    return buckets;
  }

  async getSummary(companyId: string) {
    const [open, overdue, received] = await Promise.all([
      this.prisma.receivable.aggregate({
        where: { companyId, status: { in: ['open', 'partial'] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.receivable.aggregate({
        where: { companyId, status: 'overdue' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.receivablePayment.aggregate({
        where: { receivable: { companyId } },
        _sum: { amount: true },
      }),
    ]);
    return {
      openAmount: open._sum.amount ?? 0,
      openCount: open._count,
      overdueAmount: overdue._sum.amount ?? 0,
      overdueCount: overdue._count,
      totalReceived: received._sum.amount ?? 0,
    };
  }

  // ── NF-e helpers ───────────────────────────────────────────────

  async linkNfe(id: string, companyId: string, nfeData: { nfeNumber: string; nfeSeries?: string; nfeDate: string; nfeType?: string; cfop?: string }) {
    await this.findOne(id, companyId);
    return this.prisma.receivable.update({
      where: { id },
      data: {
        nfeNumber: nfeData.nfeNumber,
        nfeSeries: nfeData.nfeSeries,
        nfeDate: new Date(nfeData.nfeDate),
        nfeType: nfeData.nfeType,
        cfop: nfeData.cfop,
      },
    });
  }

  // ── Overdue auto-update ────────────────────────────────────────

  async markOverdue(companyId: string) {
    const today = new Date();
    return this.prisma.receivable.updateMany({
      where: {
        companyId,
        status: { in: ['open', 'partial'] },
        dueDate: { lt: today },
      },
      data: { status: 'overdue' },
    });
  }
}
