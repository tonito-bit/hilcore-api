import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects for the company' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details with related data' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.companyId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get project financial summary' })
  getSummary(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getSummary(id, user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.companyId);
  }
}
