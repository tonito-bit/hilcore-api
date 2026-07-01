import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status:   "ok",
        uptime:   process.uptime(),
        db:       "connected",
        latency:  `${Date.now() - start}ms`,
        version:  process.env.npm_package_version || "1.0.0",
        env:      process.env.NODE_ENV,
        ts:       new Date().toISOString(),
      };
    } catch {
      return { status: "degraded", db: "disconnected", ts: new Date().toISOString() };
    }
  }
}