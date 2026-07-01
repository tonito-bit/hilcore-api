import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { project: { companyId } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, project: { companyId } },
      include: { items: true, payments: true, project: { select: { id: true, name: true, customer: true } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async createFromBudget(projectId: string, companyId: string, budgetId: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, project: { id: projectId, companyId } },
      include: { items: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');

    const invNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const subtotal = Number(budget.totalSell);
    const taxAmt = subtotal * 0; // NJ contractor typically 0 on labor
    return this.prisma.invoice.create({
      data: {
        projectId,
        createdBy: userId,
        number: invNumber,
        status: 'draft',
        subtotal,
        taxPct: 0,
        taxAmount: taxAmt,
        total: subtotal + taxAmt,
        amountPaid: 0,
        items: {
          create: budget.items.map(i => ({
            description: i.description,
            unit: i.unit,
            qty: i.qty,
            unitPrice: i.unitCost,
          })),
        },
      },
    });
  }

  async recordPayment(invoiceId: string, companyId: string, dto: any) {
    const inv = await this.findOne(invoiceId, companyId);
    const payment = await this.prisma.payment.create({ data: { invoiceId, ...dto } });
    const totalPaid = Number(inv.amountPaid) + Number(dto.amount);
    const newStatus = totalPaid >= Number(inv.total) ? 'paid' : 'partial';
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { amountPaid: totalPaid, status: newStatus } });
    return payment;
  }
}
