import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters?: any) {
    return this.prisma.lead.findMany({
      where: { companyId, ...(filters?.status && { status: filters.status }) },
      include: { customer: { select: { id: true, name: true } }, owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, dto: any) {
    return this.prisma.lead.create({ data: { companyId, ...dto } });
  }

  async updateStatus(id: string, companyId: string, status: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, companyId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({ where: { id }, data: { status, updatedAt: new Date() } });
  }

  async getPipelineSummary(companyId: string) {
    const statuses = ['new','contacted','inspection','estimate','proposal','negotiation','won','lost'];
    const results = await Promise.all(
      statuses.map(s => this.prisma.lead.aggregate({
        where: { companyId, status: s },
        _count: true,
        _sum: { value: true },
      }).then(r => ({ status: s, count: r._count, value: r._sum.value ?? 0 })))
    );
    return results;
  }
}
