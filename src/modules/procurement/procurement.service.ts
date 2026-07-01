import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, projectId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { project: { companyId }, ...(projectId && { projectId }) },
      include: { supplier: true, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, dto: any) {
    const { items, ...poData } = dto;
    const number = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const total = items.reduce((s: number, i: any) => s + i.qty * i.unitPrice, 0);
    return this.prisma.purchaseOrder.create({
      data: {
        ...poData, number, createdBy: userId, total,
        items: { create: items },
      },
      include: { supplier: true, items: true },
    });
  }

  async updateStatus(id: string, companyId: string, status: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, project: { companyId } } });
    if (!po) throw new NotFoundException('PO not found');
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
  }
}
