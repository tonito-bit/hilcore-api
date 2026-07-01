import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId },
      include: { certifications: true, _count: { select: { timesheets: true } } },
    });
  }

  async create(companyId: string, dto: any) {
    return this.prisma.employee.create({ data: { companyId, ...dto } });
  }

  async logTimesheet(companyId: string, dto: any) {
    const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, companyId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return this.prisma.timesheet.create({
      data: { ...dto, hourlyRate: dto.hourlyRate ?? emp.hourlyRate },
    });
  }

  async getExpiringCerts(companyId: string, daysAhead = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.prisma.certification.findMany({
      where: { employee: { companyId }, expiryDate: { lte: cutoff } },
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
