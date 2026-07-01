import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CostLibraryService } from './cost-library.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Cost Library — RS Means 2024')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('cost-library')
export class CostLibraryController {
  constructor(private service: CostLibraryService) {}

  // ── Reference data ─────────────────────────────────────────────

  @Get('divisions')
  @ApiOperation({ summary: 'List all MasterFormat CSI divisions' })
  findAllDivisions() {
    return this.service.findAllDivisions();
  }

  @Get('divisions/:code')
  @ApiOperation({ summary: 'Get division by code (e.g. "03", "09")' })
  findDivision(@Param('code') code: string) {
    return this.service.findDivision(code);
  }

  @Get('divisions/:code/items')
  @ApiOperation({ summary: 'List all items in a division' })
  findByDivision(
    @Param('code') code: string,
    @Query('skip') skip: string,
    @Query('take') take: string,
  ) {
    return this.service.findByDivision(code, Number(skip ?? 0), Number(take ?? 100));
  }

  @Get('units')
  @ApiOperation({ summary: 'List all US measurement units used in RS Means' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category: area, length, volume, weight, quantity, time, misc' })
  getUnits(@Query('category') category?: string) {
    return this.service.getUnits(category);
  }

  @Get('location-factors')
  @ApiOperation({ summary: 'RS Means 2024 City Cost Index — location factors by city' })
  getLocationFactors() {
    return this.service.getLocationFactors();
  }

  // ── Item search ────────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: 'Search cost items by keyword, division, or unit' })
  @ApiQuery({ name: 'q',            required: false, description: 'Keyword search in description or line number' })
  @ApiQuery({ name: 'divisionCode', required: false, description: 'Filter by division code (01, 03, 09, 26, etc.)' })
  @ApiQuery({ name: 'unit',         required: false, description: 'Filter by unit (SF, CY, LF, EA, etc.)' })
  @ApiQuery({ name: 'minCost',      required: false, description: 'Minimum total cost per unit' })
  @ApiQuery({ name: 'maxCost',      required: false, description: 'Maximum total cost per unit' })
  @ApiQuery({ name: 'skip',         required: false })
  @ApiQuery({ name: 'take',         required: false })
  search(
    @Query('q') q: string,
    @Query('divisionCode') divisionCode: string,
    @Query('unit') unit: string,
    @Query('minCost') minCost: string,
    @Query('maxCost') maxCost: string,
    @Query('skip') skip: string,
    @Query('take') take: string,
  ) {
    return this.service.search({
      q,
      divisionCode,
      unit,
      minTotalCost: minCost ? Number(minCost) : undefined,
      maxTotalCost: maxCost ? Number(maxCost) : undefined,
      skip: Number(skip ?? 0),
      take: Number(take ?? 50),
    });
  }

  @Get('items/line/:lineNumber')
  @ApiOperation({ summary: 'Get item by RS Means line number (e.g. "03 30 53.40 0010")' })
  findByLineNumber(@Param('lineNumber') lineNumber: string) {
    return this.service.findByLineNumber(lineNumber.replace(/_/g, ' '));
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get cost item by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ── Quick Estimate ─────────────────────────────────────────────

  @Post('estimate')
  @ApiOperation({
    summary: 'Build quick estimate from RS Means line items',
    description: 'Pass an array of { lineNumber, quantity, locationFactor? } to get a cost breakdown. locationFactor adjusts for city — use /location-factors to look up.',
  })
  buildEstimate(@Body() body: { items: { lineNumber: string; quantity: number; locationFactor?: number }[] }) {
    return this.service.buildEstimate(body.items);
  }

  // ── BDI Calculator ─────────────────────────────────────────────

  @Post('bdi/calculate')
  @ApiOperation({
    summary: 'Calculate BDI using the TCU formula (Acórdão 2.622/2013)',
    description: 'BDI = [(1 + AC + S + R + G) / (1 - DF - L)] - 1. Pass component percentages and work type to get the computed BDI% with TCU benchmark comparison.',
  })
  calculateBdi(
    @Body() body: {
      ac?: number; s?: number; r?: number; g?: number; df?: number; l?: number;
      workType?: string;
    },
  ) {
    return this.service.calculateBdi(body);
  }

  @Get('bdi/benchmarks')
  @ApiOperation({ summary: 'TCU BDI benchmark ranges by work type (Acórdão 2.622/2013)' })
  getBdiBenchmarks() {
    return {
      buildings:  { q1: 20.34, median: 22.12, q3: 25.00 },
      roads:      { q1: 19.60, median: 20.97, q3: 24.23 },
      sanitation: { q1: 20.76, median: 24.18, q3: 26.44 },
      energy:     { q1: 24.00, median: 25.84, q3: 27.86 },
      ports:      { q1: 22.80, median: 27.48, q3: 30.95 },
      reference: 'TCU Acórdão 2.622/2013',
    };
  }

  // ── AACE Estimate Classes ──────────────────────────────────────

  @Get('aace-classes')
  @ApiOperation({ summary: 'AACE estimate class definitions (Class 1–5) with accuracy ranges' })
  getAaceClasses() {
    return this.service.getAaceClasses();
  }

  // ── Waste Factors ──────────────────────────────────────────────

  @Get('waste-factors')
  @ApiOperation({ summary: 'Typical material waste / loss factors (perdas) per material type' })
  getWasteFactors() {
    return this.service.getWasteFactors();
  }
}
