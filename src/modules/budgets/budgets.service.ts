import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string, companyId: string) {
    // Verify project belongs to company
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.budget.findMany({
      where: { projectId },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(id: string, companyId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, project: { companyId } },
      include: {
        items: {
          include: { material: true, assembly: true },
          orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async create(projectId: string, companyId: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.budget.create({ data: { projectId, ...dto } });
  }

  async addItem(budgetId: string, companyId: string, dto: any) {
    const budget = await this.findOne(budgetId, companyId);
    const item = await this.prisma.budgetItem.create({ data: { budgetId, ...dto } });
    await this.recalcBudget(budgetId, budget.overheadPct, budget.markupPct);
    return item;
  }

  async updateItem(itemId: string, companyId: string, dto: any) {
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: itemId, budget: { project: { companyId } } },
      include: { budget: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    const updated = await this.prisma.budgetItem.update({ where: { id: itemId }, data: dto });
    await this.recalcBudget(item.budgetId, item.budget.overheadPct, item.budget.markupPct);
    return updated;
  }

  async removeItem(itemId: string, companyId: string) {
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: itemId, budget: { project: { companyId } } },
      include: { budget: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.budgetItem.delete({ where: { id: itemId } });
    await this.recalcBudget(item.budgetId, item.budget.overheadPct, item.budget.markupPct);
  }

  async finalize(id: string, companyId: string) {
    const budget = await this.findOne(id, companyId);
    // Only one final budget per project
    await this.prisma.budget.updateMany({
      where: { projectId: budget.projectId, status: 'final' },
      data: { status: 'superseded' },
    });
    return this.prisma.budget.update({ where: { id }, data: { status: 'final' } });
  }

  private async recalcBudget(budgetId: string, overheadPct: any, markupPct: any) {
    const items = await this.prisma.budgetItem.findMany({ where: { budgetId } });
    const direct = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.unitCost), 0);
    const overhead = direct * (Number(overheadPct) / 100);
    const sell = (direct + overhead) * (1 + Number(markupPct) / 100);
    await this.prisma.budget.update({
      where: { id: budgetId },
      data: { totalDirect: direct, totalOverhead: overhead, totalSell: sell, updatedAt: new Date() },
    });
  }
}
