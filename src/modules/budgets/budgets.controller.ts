import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private service: BudgetsService) {}

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string, @CurrentUser() u: any) {
    return this.service.findByProject(projectId, u.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.companyId);
  }

  @Post('project/:projectId')
  create(@Param('projectId') projectId: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(projectId, u.companyId, dto);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.addItem(id, u.companyId, dto);
  }

  @Put('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateItem(itemId, u.companyId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @CurrentUser() u: any) {
    return this.service.removeItem(itemId, u.companyId);
  }

  @Post(':id/finalize')
  finalize(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.finalize(id, u.companyId);
  }
}
