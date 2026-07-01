import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubcontractorContractsService } from './subcontractor-contracts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Contratos — Sub-Empreiteiros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('subcontractor-contracts')
export class SubcontractorContractsController {
  constructor(private service: SubcontractorContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contratos com sub-empreiteiros' })
  findAll(
    @Query('projectId') projectId: string,
    @Query('supplierId') supplierId: string,
    @Query('status') status: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findAll(u.companyId, { projectId, supplierId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do contrato' })
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.companyId);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Saldo do contrato' })
  balance(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.getContractBalance(id, u.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar contrato com sub-empreiteiro' })
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(u.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contrato' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(id, u.companyId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar contrato (perm 55)' })
  approve(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.approve(id, u.companyId, u.id);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Liberar contrato para medição (perm 21)' })
  release(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.release(id, u.companyId, u.id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Encerrar contrato' })
  close(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.close(id, u.companyId, u.id);
  }

  // ── Services ───────────────────────────────────────────────────

  @Post(':id/services')
  @ApiOperation({ summary: 'Adicionar serviço ao contrato' })
  addService(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.addService(id, u.companyId, dto);
  }

  @Patch('services/:serviceId')
  @ApiOperation({ summary: 'Atualizar serviço do contrato' })
  updateService(@Param('serviceId') sid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateService(sid, u.companyId, dto);
  }

  // ── Measurements ───────────────────────────────────────────────

  @Get(':id/measurements')
  @ApiOperation({ summary: 'Medições do contrato' })
  findMeasurements(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.findMeasurements(id, u.companyId);
  }

  @Post(':id/measurements')
  @ApiOperation({ summary: 'Criar medição (perm 298)' })
  createMeasurement(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createMeasurement(id, u.companyId, dto);
  }

  @Post('measurements/:measurementId/approve')
  @ApiOperation({ summary: 'Aprovar medição (perm 51)' })
  approveMeasurement(@Param('measurementId') mid: string, @CurrentUser() u: any) {
    return this.service.approveMeasurement(mid, u.companyId, u.id);
  }

  @Post('measurements/:measurementId/process')
  @ApiOperation({ summary: 'Processar medição — gera título no AP (perm 54)' })
  processMeasurement(@Param('measurementId') mid: string, @CurrentUser() u: any) {
    return this.service.processMeasurement(mid, u.companyId);
  }
}
