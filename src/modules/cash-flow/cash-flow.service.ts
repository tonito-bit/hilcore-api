import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CashFlowService {
  constructor(private prisma: PrismaService) {}

  // ── Work Budgets ───────────────────────────────────────────────

  async findBudgets(companyId: string, projectId?: string) {
    return this.prisma.workBudget.findMany({
      where: { companyId, ...(projectId && { projectId }) },
      include: {
        project: { select: { id: true, name: true } },
        indexer: { select: { id: true, name: true } },
        _count: { select: { services: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBudget(id: string, companyId: string) {
    const wb = await this.prisma.workBudget.findFirst({
      where: { id, companyId },
      include: {
        project: { select: { id: true, name: true } },
        indexer: true,
        services: {
          include: { insumos: { include: { material: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!wb) throw new NotFoundException('Work budget not found');
    return wb;
  }

  async createBudget(companyId: string, dto: any) {
    return this.prisma.workBudget.create({ data: { companyId, ...dto } });
  }

  async updateBudget(id: string, companyId: string, dto: any) {
    await this.findOneBudget(id, companyId);
    return this.prisma.workBudget.update({ where: { id }, data: dto });
  }

  // ── Services ───────────────────────────────────────────────────

  async addService(workBudgetId: string, companyId: string, dto: any) {
    await this.findOneBudget(workBudgetId, companyId);
    const { insumos, ...serviceData } = dto;
    const bdiMultiplier = 1 + Number(serviceData.bdiPct ?? 0) / 100;
    const baseTotal = Number(serviceData.quantity) * Number(serviceData.unitPrice);
    const service = await this.prisma.workBudgetService.create({
      data: {
        workBudgetId,
        ...serviceData,
        totalPrice: baseTotal * bdiMultiplier,
        ...(insumos?.length && {
          insumos: {
            create: insumos.map((i: any) => ({
              workBudgetId,
              ...i,
            })),
          },
        }),
      },
      include: { insumos: true },
    });
    await this.recalcBudgetTotal(workBudgetId);
    return service;
  }

  async updateServicePrice(serviceId: string, companyId: string, dto: { unitPrice: number; quantity?: number }) {
    const svc = await this.prisma.workBudgetService.findFirst({
      where: { id: serviceId, workBudget: { companyId } },
    });
    if (!svc) throw new NotFoundException('Service not found');
    const qty = dto.quantity ?? Number(svc.quantity);
    const price = dto.unitPrice;
    const bdiMult = 1 + Number(svc.bdiPct) / 100;
    const updated = await this.prisma.workBudgetService.update({
      where: { id: serviceId },
      data: { unitPrice: price, ...(dto.quantity !== undefined && { quantity: qty }), totalPrice: qty * price * bdiMult },
    });
    await this.recalcBudgetTotal(svc.workBudgetId);
    return updated;
  }

  private async recalcBudgetTotal(workBudgetId: string) {
    const services = await this.prisma.workBudgetService.findMany({ where: { workBudgetId } });
    const total = services.reduce((sum, s) => sum + Number(s.totalPrice), 0);
    await this.prisma.workBudget.update({ where: { id: workBudgetId }, data: { totalValue: total } });
  }

  // ── Insumos ────────────────────────────────────────────────────

  async updateInsumoPrice(insumoId: string, companyId: string, dto: { unitPrice: number; deliveryDays?: number }) {
    const insumo = await this.prisma.workBudgetInsumo.findFirst({
      where: { id: insumoId, service: { workBudget: { companyId } } },
    });
    if (!insumo) throw new NotFoundException('Insumo not found');
    return this.prisma.workBudgetInsumo.update({ where: { id: insumoId }, data: dto });
  }

  async updateAllInsumosPrices(workBudgetId: string, companyId: string) {
    await this.findOneBudget(workBudgetId, companyId);
    const insumos = await this.prisma.workBudgetInsumo.findMany({
      where: { workBudgetId },
      include: { service: true },
    });
    for (const insumo of insumos) {
      const qty = Number(insumo.quantity);
      const price = Number(insumo.unitPrice);
      await this.prisma.workBudgetInsumo.update({
        where: { id: insumo.id },
        data: { unitPrice: price },
      });
    }
    await this.recalcBudgetTotal(workBudgetId);
  }

  // ── Cash Flow Periods ──────────────────────────────────────────

  async getCashFlow(workBudgetId: string, companyId: string) {
    await this.findOneBudget(workBudgetId, companyId);
    const periods = await this.prisma.cashFlowPeriod.findMany({
      where: { workBudgetId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // Build cumulative S-curve totals for reporting
    let cumBase = 0, cumExec = 0, cumPaid = 0, cumReceived = 0;
    return periods.map(p => {
      cumBase      += Number(p.baseValue);
      cumExec      += Number(p.executedValue);
      cumPaid      += Number(p.paidValue);
      cumReceived  += Number(p.receivedValue);
      return {
        ...p,
        cumBaseValue:     parseFloat(cumBase.toFixed(2)),
        cumExecutedValue: parseFloat(cumExec.toFixed(2)),
        cumPaidValue:     parseFloat(cumPaid.toFixed(2)),
        cumReceivedValue: parseFloat(cumReceived.toFixed(2)),
      };
    });
  }

  async upsertPeriod(workBudgetId: string, companyId: string, dto: {
    year: number; month: number;
    basePct?: number; reprogrammedPct?: number;
    executedPct?: number; paidValue?: number;
    receivedValue?: number;
  }) {
    await this.findOneBudget(workBudgetId, companyId);
    const budget = await this.prisma.workBudget.findUnique({ where: { id: workBudgetId } });
    const total = Number(budget!.totalValue);
    const lagDays = budget!.paymentLagDays ?? 30;

    const baseValue        = ((dto.basePct        ?? 0) / 100) * total;
    const reprogrammedValue = ((dto.reprogrammedPct ?? 0) / 100) * total;
    const executedValue    = ((dto.executedPct     ?? 0) / 100) * total;

    // receivedValue: if not explicitly provided, estimate from previous period's executedValue
    // using the payment lag (construtora financia a obra — gasta primeiro, recebe depois)
    let receivedValue = dto.receivedValue;
    if (receivedValue === undefined) {
      const lagMonths = Math.ceil(lagDays / 30);
      const prevMonth = dto.month - lagMonths <= 0
        ? { year: dto.year - 1, month: 12 + (dto.month - lagMonths) }
        : { year: dto.year, month: dto.month - lagMonths };
      const prevPeriod = await this.prisma.cashFlowPeriod.findUnique({
        where: { workBudgetId_year_month: { workBudgetId, year: prevMonth.year, month: prevMonth.month } },
      });
      receivedValue = prevPeriod ? Number(prevPeriod.executedValue) : 0;
    }

    return this.prisma.cashFlowPeriod.upsert({
      where: { workBudgetId_year_month: { workBudgetId, year: dto.year, month: dto.month } },
      create: { workBudgetId, year: dto.year, month: dto.month, baseValue, reprogrammedValue, executedValue, receivedValue, ...dto },
      update: { baseValue, reprogrammedValue, executedValue, receivedValue, ...dto },
    });
  }

  // Working capital gap — how much the contractor must finance each month
  // (cumulative cost incurred minus cumulative receipts = max financing need)
  async getFinancingGap(workBudgetId: string, companyId: string) {
    const budget = await this.findOneBudget(workBudgetId, companyId);
    const periods = await this.prisma.cashFlowPeriod.findMany({
      where: { workBudgetId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    let cumCost = 0, cumReceived = 0, maxGap = 0;
    const breakdown = periods.map(p => {
      cumCost     += Number(p.executedValue);
      cumReceived += Number(p.receivedValue);
      const gap = cumCost - cumReceived;
      if (gap > maxGap) maxGap = gap;
      return {
        year: p.year, month: p.month,
        executed: Number(p.executedValue),
        received: Number(p.receivedValue),
        cumulativeCost: parseFloat(cumCost.toFixed(2)),
        cumulativeReceived: parseFloat(cumReceived.toFixed(2)),
        financingGap: parseFloat(gap.toFixed(2)),
      };
    });

    return {
      workBudgetId,
      totalValue: budget.totalValue,
      paymentLagDays: (budget as any).paymentLagDays ?? 30,
      maxFinancingGap: parseFloat(maxGap.toFixed(2)),
      maxGapPct: Number(budget.totalValue) > 0
        ? parseFloat(((maxGap / Number(budget.totalValue)) * 100).toFixed(1))
        : 0,
      periods: breakdown,
    };
  }

  async processCashFlow(workBudgetId: string, companyId: string) {
    const budget = await this.findOneBudget(workBudgetId, companyId);

    // Aggregate committed from subcontractor contracts
    const contracts = await this.prisma.subcontractorContract.findMany({
      where: { projectId: budget.projectId, status: { in: ['approved', 'released'] } },
      select: { executedValue: true, totalValue: true },
    });
    const totalCommittedContracts = contracts.reduce((s, c) => s + Number(c.totalValue), 0);

    // Aggregate committed from purchase orders
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { projectId: budget.projectId, status: { not: 'cancelled' } },
      select: { total: true },
    });
    const totalCommittedOrders = orders.reduce((s, o) => s + Number(o.total), 0);

    // Aggregate paid from payables
    const paid = await this.prisma.payablePayment.aggregate({
      where: { payable: { projectId: budget.projectId } },
      _sum: { amount: true },
    });

    return {
      workBudgetId,
      totalValue: budget.totalValue,
      committedContracts: totalCommittedContracts,
      committedOrders: totalCommittedOrders,
      totalPaid: paid._sum.amount ?? 0,
    };
  }

  // ── Indexers ───────────────────────────────────────────────────

  async findIndexers(companyId: string) {
    return this.prisma.indexer.findMany({
      where: { companyId, inactive: false },
      include: { rates: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 } },
    });
  }

  async createIndexer(companyId: string, dto: any) {
    return this.prisma.indexer.create({ data: { companyId, ...dto } });
  }

  async addIndexerRate(indexerId: string, companyId: string, dto: { year: number; month: number; rate: number }) {
    const indexer = await this.prisma.indexer.findFirst({ where: { id: indexerId, companyId } });
    if (!indexer) throw new NotFoundException('Indexer not found');
    return this.prisma.indexerRate.upsert({
      where: { indexerId_year_month: { indexerId, year: dto.year, month: dto.month } },
      create: { indexerId, ...dto },
      update: { rate: dto.rate },
    });
  }

  // ── Copy budget ────────────────────────────────────────────────

  async copyBudget(sourceId: string, companyId: string, targetProjectId: string, targetDescription: string) {
    const source = await this.findOneBudget(sourceId, companyId);
    const newBudget = await this.prisma.workBudget.create({
      data: {
        companyId,
        projectId: targetProjectId,
        description: targetDescription,
        baseDate: source.baseDate,
        bdiPct: source.bdiPct,
        status: 'draft',
        indexerId: source.indexerId,
      },
    });
    for (const svc of source.services) {
      const newSvc = await this.prisma.workBudgetService.create({
        data: {
          workBudgetId: newBudget.id,
          serviceCode: svc.serviceCode,
          description: svc.description,
          unit: svc.unit,
          quantity: svc.quantity,
          unitPrice: svc.unitPrice,
          totalPrice: svc.totalPrice,
          bdiPct: svc.bdiPct,
          isLumpSum: svc.isLumpSum,
          sortOrder: svc.sortOrder,
          parentCode: svc.parentCode,
        },
      });
      if (svc.insumos?.length) {
        await this.prisma.workBudgetInsumo.createMany({
          data: svc.insumos.map((i: any) => ({
            workBudgetId: newBudget.id,
            workBudgetServiceId: newSvc.id,
            materialId: i.materialId,
            description: i.description,
            unit: i.unit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            deliveryDays: i.deliveryDays,
          })),
        });
      }
    }
    await this.recalcBudgetTotal(newBudget.id);
    return this.findOneBudget(newBudget.id, companyId);
  }
}
