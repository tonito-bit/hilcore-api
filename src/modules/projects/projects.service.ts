import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters?: { status?: string; managerId?: string }) {
    return this.prisma.project.findMany({
      where: { companyId, ...(filters?.status && { status: filters.status }) },
      include: {
        customer: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        _count: { select: { tasks: true, rfis: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        manager: { select: { id: true, name: true, email: true } },
        budgets: { where: { status: 'final' }, take: 1 },
        rfis: { where: { status: { not: 'closed' } }, orderBy: { createdAt: 'desc' }, take: 5 },
        tasks: { where: { status: { not: 'done' } }, orderBy: { sortOrder: 'asc' }, take: 10 },
        _count: { select: { photos: true, dailyLogs: true, changeOrders: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(companyId: string, dto: any) {
    return this.prisma.project.create({
      data: { companyId, ...dto },
      include: { customer: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.project.delete({ where: { id } });
  }

  async getSummary(id: string, companyId: string) {
    await this.findOne(id, companyId);
    const [budget, invoiced, paid, laborHours] = await Promise.all([
      this.prisma.budget.findFirst({ where: { projectId: id, status: 'final' } }),
      this.prisma.invoice.aggregate({ where: { projectId: id }, _sum: { total: true } }),
      this.prisma.payment.aggregate({
        where: { invoice: { projectId: id } }, _sum: { amount: true },
      }),
      this.prisma.timesheet.aggregate({ where: { projectId: id }, _sum: { hours: true } }),
    ]);
    return {
      contractValue: (await this.prisma.project.findUnique({ where: { id }, select: { contractValue: true } }))?.contractValue,
      budgetTotal: budget?.totalSell ?? 0,
      invoicedTotal: invoiced._sum.total ?? 0,
      paidTotal: paid._sum.amount ?? 0,
      laborHours: laborHours._sum.hours ?? 0,
    };
  }
}
