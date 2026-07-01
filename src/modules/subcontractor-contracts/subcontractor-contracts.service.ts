import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubcontractorContractsService {
  constructor(private prisma: PrismaService) {}

  // ── Contracts ──────────────────────────────────────────────────

  async findAll(
    companyId: string,
    filters?: { projectId?: string; supplierId?: string; status?: string },
  ) {
    return this.prisma.subcontractorContract.findMany({
      where: {
        companyId,
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { services: true, measurements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const contract = await this.prisma.subcontractorContract.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        project: { select: { id: true, name: true } },
        indexer: { select: { id: true, name: true } },
        services: { where: { inactive: false }, orderBy: { itemNumber: 'asc' } },
        measurements: { orderBy: { measurementNumber: 'asc' } },
      },
    });
    if (!contract) throw new NotFoundException('Subcontractor contract not found');
    return contract;
  }

  async create(companyId: string, dto: any) {
    const { services, ...data } = dto;
    return this.prisma.subcontractorContract.create({
      data: {
        companyId,
        ...data,
        ...(services?.length && {
          services: {
            create: services.map((s: any) => ({
              ...s,
              totalPrice: Number(s.quantity) * Number(s.unitPrice),
            })),
          },
        }),
      },
      include: { services: true },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.subcontractorContract.update({ where: { id }, data: dto });
  }

  // ── Approval workflow ──────────────────────────────────────────

  async approve(id: string, companyId: string, userId: string) {
    const c = await this.findOne(id, companyId);
    if (c.status !== 'draft') throw new BadRequestException('Only draft contracts can be approved');
    return this.prisma.subcontractorContract.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async release(id: string, companyId: string, userId: string) {
    const c = await this.findOne(id, companyId);
    if (c.status !== 'approved') throw new BadRequestException('Only approved contracts can be released');
    return this.prisma.subcontractorContract.update({
      where: { id },
      data: { status: 'released', releasedBy: userId, releasedAt: new Date() },
    });
  }

  async close(id: string, companyId: string, userId: string) {
    const c = await this.findOne(id, companyId);
    if (!['approved', 'released'].includes(c.status)) throw new BadRequestException('Cannot close contract in current status');
    return this.prisma.subcontractorContract.update({
      where: { id },
      data: { status: 'closed', closedBy: userId, closedAt: new Date() },
    });
  }

  // ── Services ───────────────────────────────────────────────────

  async addService(contractId: string, companyId: string, dto: any) {
    await this.findOne(contractId, companyId);
    return this.prisma.contractService.create({
      data: {
        contractId,
        ...dto,
        totalPrice: Number(dto.quantity) * Number(dto.unitPrice),
      },
    });
  }

  async updateService(serviceId: string, companyId: string, dto: any) {
    const svc = await this.prisma.contractService.findFirst({
      where: { id: serviceId, contract: { companyId } },
    });
    if (!svc) throw new NotFoundException('Contract service not found');
    const updated = await this.prisma.contractService.update({
      where: { id: serviceId },
      data: {
        ...dto,
        ...(dto.quantity !== undefined || dto.unitPrice !== undefined
          ? { totalPrice: Number(dto.quantity ?? svc.quantity) * Number(dto.unitPrice ?? svc.unitPrice) }
          : {}),
      },
    });
    return updated;
  }

  // ── Measurements ───────────────────────────────────────────────

  async findMeasurements(contractId: string, companyId: string) {
    await this.findOne(contractId, companyId);
    return this.prisma.contractMeasurement.findMany({
      where: { contractId },
      include: { items: { include: { service: true } } },
      orderBy: { measurementNumber: 'asc' },
    });
  }

  async createMeasurement(contractId: string, companyId: string, dto: any) {
    const contract = await this.findOne(contractId, companyId);
    if (contract.status !== 'released') throw new BadRequestException('Contract must be released to measure');

    const lastMeasurement = await this.prisma.contractMeasurement.findFirst({
      where: { contractId },
      orderBy: { measurementNumber: 'desc' },
    });
    const measurementNumber = (lastMeasurement?.measurementNumber ?? 0) + 1;

    const { items, ...measureData } = dto;
    const totalValue = (items as any[]).reduce(
      (sum: number, i: any) => sum + Number(i.quantity) * Number(i.unitPrice),
      0,
    );

    // Apply withholdings
    const retBase = totalValue - Number(measureData.deductionAmount ?? 0);
    const appliedINSS = retBase * (Number(contract.retentionINSS) / 100);
    const appliedISS = retBase * (Number(contract.retentionISS) / 100);
    const appliedIRRF = retBase * (Number(contract.retentionIRRF) / 100);
    const appliedCaution = retBase * (Number(contract.retentionCaution) / 100);
    const appliedCSLL = retBase * (Number(contract.retentionCSLL) / 100);
    const appliedPIS = retBase * (Number(contract.retentionPIS) / 100);
    const totalRetentions = appliedINSS + appliedISS + appliedIRRF + appliedCaution + appliedCSLL + appliedPIS;
    const netValue = totalValue - totalRetentions - Number(measureData.advanceAmount ?? 0);

    const measurement = await this.prisma.contractMeasurement.create({
      data: {
        contractId,
        measurementNumber,
        totalValue,
        netValue,
        appliedINSS,
        appliedISS,
        appliedIRRF,
        appliedCaution,
        appliedCSLL,
        appliedPIS,
        ...measureData,
        items: { create: items.map((i: any) => ({ ...i, totalValue: Number(i.quantity) * Number(i.unitPrice) })) },
      },
      include: { items: true },
    });

    // Update executed value on services
    for (const item of items as any[]) {
      await this.prisma.contractService.update({
        where: { id: item.serviceId },
        data: { executed: { increment: Number(item.quantity) } },
      });
    }

    // Update contract executed value
    await this.prisma.subcontractorContract.update({
      where: { id: contractId },
      data: { executedValue: { increment: totalValue } },
    });

    return measurement;
  }

  async approveMeasurement(measurementId: string, companyId: string, userId: string) {
    const m = await this.prisma.contractMeasurement.findFirst({
      where: { id: measurementId, contract: { companyId } },
    });
    if (!m) throw new NotFoundException('Measurement not found');
    return this.prisma.contractMeasurement.update({
      where: { id: measurementId },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async processMeasurement(measurementId: string, companyId: string) {
    const m = await this.prisma.contractMeasurement.findFirst({
      where: { id: measurementId, contract: { companyId } },
      include: { contract: true },
    });
    if (!m) throw new NotFoundException('Measurement not found');
    if (m.status !== 'approved') throw new BadRequestException('Measurement must be approved before processing');

    // Create payable in AP module
    const payable = await this.prisma.payable.create({
      data: {
        companyId,
        projectId: m.contract.projectId,
        supplierId: m.contract.supplierId,
        number: `MED-${m.contract.id.slice(-4)}-${m.measurementNumber}`,
        description: `Medição ${m.measurementNumber} - contrato sub-empreiteiro`,
        issueDate: m.measurementDate,
        dueDate: new Date(m.measurementDate.getTime() + m.contract.paymentDays * 86400000),
        amount: m.netValue,
        retentionINSS: m.appliedINSS,
        retentionISS: m.appliedISS,
        retentionIRRF: m.appliedIRRF,
        retentionCaution: m.appliedCaution,
        retentionCSLL: m.appliedCSLL,
        retentionPIS: m.appliedPIS,
        nfeNumber: m.nfNumber,
        nfeSeries: m.nfSeries,
        docType: m.docType,
        status: 'pending',
      },
    });

    await this.prisma.contractMeasurement.update({
      where: { id: measurementId },
      data: { status: 'processed', payableId: payable.id, processedAt: new Date() },
    });

    return { measurement: measurementId, payableId: payable.id };
  }

  // ── Summary ────────────────────────────────────────────────────

  async getContractBalance(id: string, companyId: string) {
    const contract = await this.findOne(id, companyId);
    const remaining = Number(contract.totalValue) - Number(contract.executedValue);
    const pct = Number(contract.totalValue) > 0
      ? (Number(contract.executedValue) / Number(contract.totalValue)) * 100
      : 0;
    return {
      totalValue: contract.totalValue,
      executedValue: contract.executedValue,
      remaining,
      executedPct: pct.toFixed(2),
    };
  }
}
