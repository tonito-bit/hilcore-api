import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

  // ── Suppliers ──────────────────────────────────────────────────

  async findSuppliers(companyId: string, filters?: { inactive?: boolean; supplierType?: string }) {
    return this.prisma.supplier.findMany({
      where: {
        companyId,
        ...(filters?.inactive === false && { inactive: false }),
        ...(filters?.supplierType && { supplierType: filters.supplierType }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(companyId: string, dto: any) {
    return this.prisma.supplier.create({ data: { companyId, ...dto } });
  }

  async updateSupplier(id: string, companyId: string, dto: any) {
    const s = await this.prisma.supplier.findFirst({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ── Materials & Families ───────────────────────────────────────

  async findMaterials(companyId: string, filters?: { familyId?: string; inactive?: boolean; search?: string }) {
    return this.prisma.material.findMany({
      where: {
        companyId,
        ...(filters?.familyId && { familyId: filters.familyId }),
        ...(filters?.inactive !== undefined && { inactive: filters.inactive }),
        ...(filters?.search && { description: { contains: filters.search, mode: 'insensitive' } }),
      },
      include: { family: { select: { id: true, name: true } } },
      orderBy: { description: 'asc' },
    });
  }

  async createMaterial(companyId: string, dto: any) {
    return this.prisma.material.create({ data: { companyId, ...dto } });
  }

  async findFamilies(companyId: string) {
    return this.prisma.materialFamily.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  async createFamily(companyId: string, dto: any) {
    return this.prisma.materialFamily.create({ data: { companyId, ...dto } });
  }

  // ── Purchase Requisitions ──────────────────────────────────────

  async findRequisitions(companyId: string, filters?: { status?: string; projectId?: string }) {
    return this.prisma.purchaseRequisition.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
      },
      include: {
        project: { select: { id: true, name: true } },
        items: { include: { material: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequisition(companyId: string, userId: string, dto: any) {
    const { items, ...data } = dto;
    return this.prisma.purchaseRequisition.create({
      data: {
        companyId,
        requesterId: userId,
        ...data,
        ...(items?.length && { items: { create: items } }),
      },
      include: { items: true },
    });
  }

  async approveRequisition(id: string, companyId: string) {
    const req = await this.prisma.purchaseRequisition.findFirst({ where: { id, companyId } });
    if (!req) throw new NotFoundException('Requisition not found');
    if (req.status !== 'draft') throw new BadRequestException('Only draft requisitions can be approved');
    return this.prisma.purchaseRequisition.update({ where: { id }, data: { status: 'approved' } });
  }

  // ── Quotation Maps ─────────────────────────────────────────────

  async findQuotationMaps(companyId: string, filters?: { status?: string; projectId?: string }) {
    return this.prisma.quotationMap.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
      },
      include: {
        project: { select: { id: true, name: true } },
        items: { include: { supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuotationMap(companyId: string, dto: any) {
    const { items, ...data } = dto;
    const number = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    return this.prisma.quotationMap.create({
      data: {
        companyId,
        number,
        ...data,
        ...(items?.length && { items: { create: items } }),
      },
      include: { items: { include: { supplier: true } } },
    });
  }

  async addQuotationPrice(quotationMapId: string, companyId: string, itemId: string, dto: { unitPrice: number; validity?: string; notes?: string }) {
    const map = await this.prisma.quotationMap.findFirst({ where: { id: quotationMapId, companyId } });
    if (!map) throw new NotFoundException('Quotation map not found');
    return this.prisma.quotationItem.update({
      where: { id: itemId },
      data: {
        unitPrice: dto.unitPrice,
        ...(dto.validity && { validity: new Date(dto.validity) }),
        ...(dto.notes && { notes: dto.notes }),
      },
    });
  }

  async approveQuotationMap(id: string, companyId: string) {
    const map = await this.prisma.quotationMap.findFirst({ where: { id, companyId } });
    if (!map) throw new NotFoundException('Quotation map not found');
    return this.prisma.quotationMap.update({ where: { id }, data: { status: 'approved' } });
  }

  async getBestPrice(quotationMapId: string, companyId: string) {
    const map = await this.prisma.quotationMap.findFirst({
      where: { id: quotationMapId, companyId },
      include: { items: { include: { supplier: { select: { id: true, name: true } } } } },
    });
    if (!map) throw new NotFoundException('Quotation map not found');
    const grouped: Record<string, { description: string; bestSupplier: any; bestPrice: number; items: any[] }> = {};
    for (const item of map.items) {
      if (!grouped[item.description]) {
        grouped[item.description] = { description: item.description, bestSupplier: null, bestPrice: Infinity, items: [] };
      }
      grouped[item.description].items.push(item);
      if (item.unitPrice && Number(item.unitPrice) < grouped[item.description].bestPrice) {
        grouped[item.description].bestPrice = Number(item.unitPrice);
        grouped[item.description].bestSupplier = item.supplier;
      }
    }
    return Object.values(grouped);
  }

  // ── Purchase Orders ────────────────────────────────────────────

  async findOrders(companyId: string, filters?: { status?: string; projectId?: string; supplierId?: string }) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        project: { companyId },
        ...(filters?.status && { status: filters.status }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(companyId: string, userId: string, dto: any) {
    const { items, ...poData } = dto;
    const number = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const total = (items as any[]).reduce((s: number, i: any) => s + Number(i.qty) * Number(i.unitPrice), 0);
    return this.prisma.purchaseOrder.create({
      data: {
        ...poData, number, createdBy: userId, total,
        items: { create: items },
      },
      include: { supplier: true, items: true },
    });
  }

  async updateOrderStatus(id: string, companyId: string, status: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, project: { companyId } } });
    if (!po) throw new NotFoundException('PO not found');
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
  }
}
