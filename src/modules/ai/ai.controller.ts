import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Hillcore AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai')
export class AiController {
  constructor(private service: AiService) {}

  @Post('analyze-bid')
  analyzeBid(@Body('pdfBase64') pdf: string, @CurrentUser() u: any) {
    return this.service.analyzeBidPackage(pdf, u.companyId);
  }

  @Post('daily-log')
  generateLog(@Body() dto: any) { return this.service.generateDailyLog(dto); }

  @Post('projects/:id/risks')
  detectRisks(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.detectRisks(id, u.companyId);
  }

  @Post('projects/:id/ask')
  ask(@Param('id') id: string, @Body('question') q: string, @CurrentUser() u: any) {
    return this.service.askAboutProject(id, u.companyId, q);
  }
}
