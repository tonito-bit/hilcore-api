import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: { name: string; email: string; password: string; companyName: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name: dto.companyName, plan: 'starter' } });
      const hash = await bcrypt.hash(dto.password, 12);
      const user = await tx.user.create({
        data: { companyId: company.id, name: dto.name, email: dto.email, passwordHash: hash, role: 'owner' },
      });
      return { company, user };
    });

    return this.signToken(result.user.id, result.user.companyId, result.user.role);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.signToken(user.id, user.companyId, user.role);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true,
        company: { select: { id: true, name: true, plan: true } },
      },
    });
  }

  private signToken(userId: string, companyId: string, role: string) {
    return { access_token: this.jwt.sign({ sub: userId, companyId, role }), userId, companyId, role };
  }
}
