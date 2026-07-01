import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountsPayableService {
  constructor(private prisma: PrismaService) {}

  // ── Payables ───────────────────────────────────────────────────

  async findAll(
    companyId: string,
    filters?: {
      status?: string;
      projectId?: string;
      supplierId?: string;
      from?: string;
      to?: string;
      costCenterId?: string;
    },
  ) {
    return this.prisma.payable.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
        ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
        ...(filters?.from && { dueDate: { gte: new Date(filters.from) } }),
        ...(filters?.to && { dueDate: { lte: new Date(filters.to) } }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        costCenter: { select: { id: true, code: true, description: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const p = await this.prisma.payable.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        project: { select: { id: true, name: true } },
        costCenter: true,
        items: true,
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!p) throw new NotFoundException('Payable not found');
    return p;
  }

  async create(companyId: string, dto: any) {
    const { items, ...data } = dto;
    const number = `AP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    return this.prisma.payable.create({
      data: {
        companyId,
        number,
        ...data,
        ...(items?.length && { items: { create: items } }),
      },
      include: { items: true },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.payable.update({ where: { id }, data: dto });
  }

  // ── Approval workflow ──────────────────────────────────────────

  async approve(id: string, companyId: string, userId: string) {
    const p = await this.findOne(id, companyId);
    if (p.status !== 'pending') throw new BadRequestException('Only pending payables can be approved');
    return this.prisma.payable.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async release(id: string, companyId: string) {
    const p = await this.findOne(id, companyId);
    if (p.status !== 'approved') throw new BadRequestException('Only approved payables can be released');
    return this.prisma.payable.update({ where: { id }, data: { status: 'released' } });
  }

  // ── Payments ───────────────────────────────────────────────────

  async recordPayment(id: string, companyId: string, dto: any) {
    const p = await this.findOne(id, companyId);
    if (p.status === 'cancelled') throw new BadRequestException('Cannot pay a cancelled payable');
    const payment = await this.prisma.payablePayment.create({
      data: { payableId: id, ...dto },
    });
    const totalPaid = Number(p.amountPaid) + Number(dto.amount);
    const netAmount =
      Number(p.amount) -
      Number(p.retentionINSS) -
      Number(p.retentionISS) -
      Number(p.retentionIRRF) -
      Number(p.retentionPIS) -
      Number(p.retentionCOFINS) -
      Number(p.retentionCSLL) -
      Number(p.retentionCaution);
    const newStatus = totalPaid >= netAmount ? 'paid' : 'released';
    await this.prisma.payable.update({
      where: { id },
      data: { amountPaid: totalPaid, status: newStatus },
    });
    return payment;
  }

  // ── Cost Centers ───────────────────────────────────────────────

  async findCostCenters(companyId: string, projectId?: string) {
    return this.prisma.costCenter.findMany({
      where: { companyId, ...(projectId && { projectId }), inactive: false },
      orderBy: { code: 'asc' },
    });
  }

  async createCostCenter(companyId: string, dto: any) {
    return this.prisma.costCenter.create({ data: { companyId, ...dto } });
  }

  // ── Summary ────────────────────────────────────────────────────

  async getSummary(companyId: string) {
    const [pending, overdue, paid] = await Promise.all([
      this.prisma.payable.aggregate({
        where: { companyId, status: { in: ['pending', 'approved', 'released'] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payable.aggregate({
        where: {
          companyId,
          status: { in: ['pending', 'approved', 'released'] },
          dueDate: { lt: new Date() },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payablePayment.aggregate({
        where: { payable: { companyId } },
        _sum: { amount: true },
      }),
    ]);
    return {
      pendingAmount: pending._sum.amount ?? 0,
      pendingCount: pending._count,
      overdueAmount: overdue._sum.amount ?? 0,
      overdueCount: overdue._count,
      totalPaid: paid._sum.amount ?? 0,
    };
  }

  async getRetentionsDue(companyId: string) {
    const data = await this.prisma.payable.findMany({
      where: { companyId, status: { not: 'cancelled' } },
      select: {
        retentionINSS: true,
        retentionISS: true,
        retentionIRRF: true,
        retentionPIS: true,
        retentionCOFINS: true,
        retentionCSLL: true,
        retentionCaution: true,
      },
    });
    return data.reduce(
      (acc, p) => ({
        totalINSS: acc.totalINSS + Number(p.retentionINSS),
        totalISS: acc.totalISS + Number(p.retentionISS),
        totalIRRF: acc.totalIRRF + Number(p.retentionIRRF),
        totalPIS: acc.totalPIS + Number(p.retentionPIS),
        totalCOFINS: acc.totalCOFINS + Number(p.retentionCOFINS),
        totalCSLL: acc.totalCSLL + Number(p.retentionCSLL),
        totalCaution: acc.totalCaution + Number(p.retentionCaution),
      }),
      { totalINSS: 0, totalISS: 0, totalIRRF: 0, totalPIS: 0, totalCOFINS: 0, totalCSLL: 0, totalCaution: 0 },
    );
  }
}
