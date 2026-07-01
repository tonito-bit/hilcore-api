import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Compras — Purchasing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(private service: PurchasingService) {}

  // ── Suppliers ──────────────────────────────────────────────────

  @Get('suppliers')
  @ApiOperation({ summary: 'Listar fornecedores' })
  findSuppliers(@Query('type') supplierType: string, @CurrentUser() u: any) {
    return this.service.findSuppliers(u.companyId, { inactive: false, supplierType });
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Cadastrar fornecedor' })
  createSupplier(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createSupplier(u.companyId, dto);
  }

  @Patch('suppliers/:id')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  updateSupplier(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateSupplier(id, u.companyId, dto);
  }

  // ── Materials ──────────────────────────────────────────────────

  @Get('materials')
  @ApiOperation({ summary: 'Pesquisar materiais / insumos' })
  findMaterials(
    @Query('familyId') familyId: string,
    @Query('search') search: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findMaterials(u.companyId, { familyId, search, inactive: false });
  }

  @Post('materials')
  @ApiOperation({ summary: 'Cadastrar material / insumo' })
  createMaterial(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createMaterial(u.companyId, dto);
  }

  @Get('material-families')
  @ApiOperation({ summary: 'Listar famílias de materiais' })
  findFamilies(@CurrentUser() u: any) {
    return this.service.findFamilies(u.companyId);
  }

  @Post('material-families')
  @ApiOperation({ summary: 'Criar família de materiais' })
  createFamily(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createFamily(u.companyId, dto);
  }

  // ── Requisitions ───────────────────────────────────────────────

  @Get('requisitions')
  @ApiOperation({ summary: 'Listar requisições de insumos' })
  findRequisitions(
    @Query('status') status: string,
    @Query('projectId') projectId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findRequisitions(u.companyId, { status, projectId });
  }

  @Post('requisitions')
  @ApiOperation({ summary: 'Criar requisição de insumos' })
  createRequisition(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createRequisition(u.companyId, u.id, dto);
  }

  @Post('requisitions/:id/approve')
  @ApiOperation({ summary: 'Aprovar requisição' })
  approveRequisition(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.approveRequisition(id, u.companyId);
  }

  // ── Quotation Maps ─────────────────────────────────────────────

  @Get('quotation-maps')
  @ApiOperation({ summary: 'Listar mapas de cotação' })
  findQuotationMaps(
    @Query('status') status: string,
    @Query('projectId') projectId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findQuotationMaps(u.companyId, { status, projectId });
  }

  @Post('quotation-maps')
  @ApiOperation({ summary: 'Criar mapa de cotação' })
  createQuotationMap(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createQuotationMap(u.companyId, dto);
  }

  @Patch('quotation-maps/:id/items/:itemId/price')
  @ApiOperation({ summary: 'Informar preço do fornecedor no mapa' })
  addPrice(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.addQuotationPrice(id, u.companyId, itemId, dto);
  }

  @Post('quotation-maps/:id/approve')
  @ApiOperation({ summary: 'Aprovar mapa de cotação' })
  approveMap(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.approveQuotationMap(id, u.companyId);
  }

  @Get('quotation-maps/:id/best-price')
  @ApiOperation({ summary: 'Menor preço por item do mapa de cotação' })
  bestPrice(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.getBestPrice(id, u.companyId);
  }

  // ── Purchase Orders ────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  findOrders(
    @Query('status') status: string,
    @Query('projectId') projectId: string,
    @Query('supplierId') supplierId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.findOrders(u.companyId, { status, projectId, supplierId });
  }

  @Post('orders')
  @ApiOperation({ summary: 'Criar pedido de compra (PO)' })
  createOrder(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.createOrder(u.companyId, u.id, dto);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  updateStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() u: any) {
    return this.service.updateOrderStatus(id, u.companyId, status);
  }
}
