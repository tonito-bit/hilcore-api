import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// All units used in RS Means (US standard)
export const US_UNITS = [
  { code: 'SF',   name: 'Square Foot',          category: 'area' },
  { code: 'SY',   name: 'Square Yard',           category: 'area' },
  { code: 'SQ',   name: 'Square (100 SF)',        category: 'area' },
  { code: 'MSF',  name: 'Thousand Square Feet',   category: 'area' },
  { code: 'CSF',  name: 'Hundred Square Feet',    category: 'area' },
  { code: 'SFCA', name: 'Square Foot Contact Area (formwork)', category: 'area' },
  { code: 'LF',   name: 'Linear Foot',            category: 'length' },
  { code: 'GLF',  name: 'Gal/Linear Foot',         category: 'length' },
  { code: 'IN',   name: 'Inch',                   category: 'length' },
  { code: 'CY',   name: 'Cubic Yard',             category: 'volume' },
  { code: 'CF',   name: 'Cubic Foot',             category: 'volume' },
  { code: 'GAL',  name: 'Gallon',                 category: 'volume' },
  { code: 'TON',  name: 'Short Ton (2,000 lb)',   category: 'weight' },
  { code: 'LB',   name: 'Pound',                  category: 'weight' },
  { code: 'MBF',  name: 'Thousand Board Feet',    category: 'weight' },
  { code: 'BF',   name: 'Board Foot',             category: 'weight' },
  { code: 'EA',   name: 'Each',                   category: 'quantity' },
  { code: 'PR',   name: 'Pair',                   category: 'quantity' },
  { code: 'SET',  name: 'Set',                    category: 'quantity' },
  { code: 'BOX',  name: 'Box',                    category: 'quantity' },
  { code: 'BAG',  name: 'Bag',                    category: 'quantity' },
  { code: 'PKG',  name: 'Package',                category: 'quantity' },
  { code: 'RISER','name': 'Riser (stair)',         category: 'quantity' },
  { code: 'ACRE', name: 'Acre',                   category: 'area' },
  { code: 'LS',   name: 'Lump Sum',               category: 'misc' },
  { code: 'MO',   name: 'Month',                  category: 'time' },
  { code: 'WK',   name: 'Week',                   category: 'time' },
  { code: 'HR',   name: 'Hour',                   category: 'time' },
  { code: 'DAY',  name: 'Day',                    category: 'time' },
  { code: 'LOAD', name: 'Load (truck)',            category: 'misc' },
];

@Injectable()
export class CostLibraryService {
  constructor(private prisma: PrismaService) {}

  // ── Divisions ──────────────────────────────────────────────────

  async findAllDivisions() {
    return this.prisma.costDivision.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async findDivision(code: string) {
    const div = await this.prisma.costDivision.findUnique({ where: { code } });
    if (!div) throw new NotFoundException(`Division ${code} not found`);
    return div;
  }

  // ── Items ──────────────────────────────────────────────────────

  async search(filters: {
    q?: string;
    divisionCode?: string;
    unit?: string;
    maxTotalCost?: number;
    minTotalCost?: number;
    skip?: number;
    take?: number;
  }) {
    const { q, divisionCode, unit, maxTotalCost, minTotalCost, skip = 0, take = 50 } = filters;

    const where: any = {
      ...(q && {
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { lineNumber: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(divisionCode && { division: { code: divisionCode } }),
      ...(unit && { unit: { equals: unit, mode: 'insensitive' } }),
      ...(maxTotalCost !== undefined && { totalCost: { lte: maxTotalCost } }),
      ...(minTotalCost !== undefined && { totalCost: { gte: minTotalCost } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.costItem.findMany({
        where,
        include: { division: { select: { code: true, name: true } } },
        orderBy: { lineNumber: 'asc' },
        skip,
        take,
      }),
      this.prisma.costItem.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const item = await this.prisma.costItem.findUnique({
      where: { id },
      include: { division: true },
    });
    if (!item) throw new NotFoundException('Cost item not found');
    return item;
  }

  async findByLineNumber(lineNumber: string) {
    const item = await this.prisma.costItem.findUnique({
      where: { lineNumber },
      include: { division: true },
    });
    if (!item) throw new NotFoundException(`Line number ${lineNumber} not found`);
    return item;
  }

  async findByDivision(divisionCode: string, skip = 0, take = 100) {
    await this.findDivision(divisionCode);
    const [items, total] = await Promise.all([
      this.prisma.costItem.findMany({
        where: { division: { code: divisionCode } },
        include: { division: { select: { code: true, name: true } } },
        orderBy: { lineNumber: 'asc' },
        skip,
        take,
      }),
      this.prisma.costItem.count({ where: { division: { code: divisionCode } } }),
    ]);
    return { items, total };
  }

  // ── Cost Estimate from Library ─────────────────────────────────

  async buildEstimate(items: { lineNumber: string; quantity: number; locationFactor?: number }[]) {
    const results = [];
    let materialSubtotal = 0;
    let laborSubtotal = 0;
    let equipSubtotal = 0;

    for (const req of items) {
      const item = await this.prisma.costItem.findUnique({
        where: { lineNumber: req.lineNumber },
        include: { division: { select: { code: true, name: true } } },
      });
      if (!item) { results.push({ lineNumber: req.lineNumber, error: 'Not found' }); continue; }

      const lf = req.locationFactor ?? 1.0;
      const mat = Number(item.materialCost) * req.quantity * lf;
      const lab = Number(item.laborCost) * req.quantity * lf;
      const eqp = Number(item.equipmentCost) * req.quantity * lf;
      const total = mat + lab + eqp;

      materialSubtotal += mat;
      laborSubtotal += lab;
      equipSubtotal += eqp;

      results.push({
        lineNumber: item.lineNumber,
        description: item.description,
        unit: item.unit,
        quantity: req.quantity,
        locationFactor: lf,
        materialCost: mat,
        laborCost: lab,
        equipmentCost: eqp,
        totalCost: total,
        division: item.division,
      });
    }

    return {
      lineItems: results,
      summary: {
        materialSubtotal,
        laborSubtotal,
        equipmentSubtotal: equipSubtotal,
        directTotal: materialSubtotal + laborSubtotal + equipSubtotal,
        laborPct: (materialSubtotal + laborSubtotal + equipSubtotal) > 0
          ? ((laborSubtotal / (materialSubtotal + laborSubtotal + equipSubtotal)) * 100).toFixed(1) + '%'
          : '0%',
      },
    };
  }

  // ── Units ──────────────────────────────────────────────────────

  getUnits(category?: string) {
    if (category) return US_UNITS.filter(u => u.category === category);
    return US_UNITS;
  }

  // ── Location Factors (US cities, 2024 RSMeans) ─────────────────

  getLocationFactors() {
    return LOCATION_FACTORS;
  }

  // ── BDI Calculator — TCU formula (Acórdão 2.622/2013) ─────────
  // BDI = [(1 + AC + S + R + G) / (1 - DF - L)] - 1
  // Returns computed BDI% and component breakdown with TCU benchmarks

  calculateBdi(components: {
    ac?: number;  // administração central (%)
    s?: number;   // seguro (%)
    r?: number;   // risco (%)
    g?: number;   // garantia (%)
    df?: number;  // despesas financeiras (%)
    l?: number;   // lucro (%)
    workType?: string; // buildings | roads | sanitation | energy | ports
  }) {
    const ac = (components.ac ?? 4.5) / 100;
    const s  = (components.s  ?? 0.5) / 100;
    const r  = (components.r  ?? 1.0) / 100;
    const g  = (components.g  ?? 0.7) / 100;
    const df = (components.df ?? 1.5) / 100;
    const l  = (components.l  ?? 7.0) / 100;

    const numerator   = 1 + ac + s + r + g;
    const denominator = 1 - df - l;
    const bdi = (numerator / denominator) - 1;

    const benchmark = TCU_BDI_BENCHMARKS[components.workType ?? 'buildings'] ?? TCU_BDI_BENCHMARKS['buildings'];

    return {
      bdiPct: parseFloat((bdi * 100).toFixed(2)),
      formula: '[(1 + AC + S + R + G) / (1 - DF - L)] - 1',
      components: {
        ac: components.ac ?? 4.5,
        s:  components.s  ?? 0.5,
        r:  components.r  ?? 1.0,
        g:  components.g  ?? 0.7,
        df: components.df ?? 1.5,
        l:  components.l  ?? 7.0,
      },
      benchmark,
      withinTcuRange: bdi * 100 >= benchmark.q1 && bdi * 100 <= benchmark.q3,
      reference: 'TCU Acórdão 2.622/2013',
    };
  }

  // ── AACE Estimate Class Reference ─────────────────────────────

  getAaceClasses() {
    return AACE_CLASSES;
  }

  // ── Typical Material Waste Factors ────────────────────────────

  getWasteFactors() {
    return TYPICAL_WASTE_FACTORS;
  }
}

// RS Means 2024 City Cost Indexes (composite factor vs national avg 100.0)
const LOCATION_FACTORS = [
  { city: 'New York, NY',        state: 'NY', factor: 1.288 },
  { city: 'Los Angeles, CA',     state: 'CA', factor: 1.168 },
  { city: 'Chicago, IL',         state: 'IL', factor: 1.145 },
  { city: 'Houston, TX',         state: 'TX', factor: 0.912 },
  { city: 'Phoenix, AZ',         state: 'AZ', factor: 0.965 },
  { city: 'Philadelphia, PA',    state: 'PA', factor: 1.175 },
  { city: 'San Antonio, TX',     state: 'TX', factor: 0.875 },
  { city: 'San Diego, CA',       state: 'CA', factor: 1.125 },
  { city: 'Dallas, TX',          state: 'TX', factor: 0.898 },
  { city: 'San Jose, CA',        state: 'CA', factor: 1.215 },
  { city: 'Austin, TX',          state: 'TX', factor: 0.888 },
  { city: 'Jacksonville, FL',    state: 'FL', factor: 0.875 },
  { city: 'Fort Worth, TX',      state: 'TX', factor: 0.895 },
  { city: 'Columbus, OH',        state: 'OH', factor: 1.025 },
  { city: 'Charlotte, NC',       state: 'NC', factor: 0.892 },
  { city: 'Indianapolis, IN',    state: 'IN', factor: 0.975 },
  { city: 'San Francisco, CA',   state: 'CA', factor: 1.285 },
  { city: 'Seattle, WA',         state: 'WA', factor: 1.085 },
  { city: 'Denver, CO',          state: 'CO', factor: 1.015 },
  { city: 'Nashville, TN',       state: 'TN', factor: 0.895 },
  { city: 'Oklahoma City, OK',   state: 'OK', factor: 0.855 },
  { city: 'El Paso, TX',         state: 'TX', factor: 0.845 },
  { city: 'Washington, DC',      state: 'DC', factor: 1.098 },
  { city: 'Las Vegas, NV',       state: 'NV', factor: 1.055 },
  { city: 'Louisville, KY',      state: 'KY', factor: 0.945 },
  { city: 'Baltimore, MD',       state: 'MD', factor: 1.065 },
  { city: 'Milwaukee, WI',       state: 'WI', factor: 1.075 },
  { city: 'Albuquerque, NM',     state: 'NM', factor: 0.945 },
  { city: 'Tucson, AZ',          state: 'AZ', factor: 0.955 },
  { city: 'Fresno, CA',          state: 'CA', factor: 1.085 },
  { city: 'Sacramento, CA',      state: 'CA', factor: 1.125 },
  { city: 'Kansas City, MO',     state: 'MO', factor: 1.025 },
  { city: 'Atlanta, GA',         state: 'GA', factor: 0.912 },
  { city: 'Minneapolis, MN',     state: 'MN', factor: 1.115 },
  { city: 'Portland, OR',        state: 'OR', factor: 1.078 },
  { city: 'Miami, FL',           state: 'FL', factor: 0.945 },
  { city: 'Tampa, FL',           state: 'FL', factor: 0.918 },
  { city: 'Cleveland, OH',       state: 'OH', factor: 1.068 },
  { city: 'Pittsburgh, PA',      state: 'PA', factor: 1.095 },
  { city: 'New Orleans, LA',     state: 'LA', factor: 0.908 },
  { city: 'Newark, NJ',          state: 'NJ', factor: 1.215 },
  { city: 'Boston, MA',          state: 'MA', factor: 1.225 },
  { city: 'Detroit, MI',         state: 'MI', factor: 1.085 },
  { city: 'Memphis, TN',         state: 'TN', factor: 0.875 },
  { city: 'Richmond, VA',        state: 'VA', factor: 0.945 },
  { city: 'National Average',    state: 'US', factor: 1.000 },
];

// TCU BDI benchmarks by work type (Acórdão 2.622/2013)
const TCU_BDI_BENCHMARKS: Record<string, { q1: number; median: number; q3: number }> = {
  buildings:   { q1: 20.34, median: 22.12, q3: 25.00 },
  roads:       { q1: 19.60, median: 20.97, q3: 24.23 },
  sanitation:  { q1: 20.76, median: 24.18, q3: 26.44 },
  energy:      { q1: 24.00, median: 25.84, q3: 27.86 },
  ports:       { q1: 22.80, median: 27.48, q3: 30.95 },
};

// AACE International estimate class definitions
const AACE_CLASSES = [
  {
    class: 1,
    label: 'Definitive / Detailed',
    scopeDefinition: '50–100%',
    prepEffort: '100×',
    accuracy: '+10% / -5%',
    typical_use: 'Bid check, cost control',
    description: 'Based on complete engineering and procurement. Most expensive to prepare — requires full drawings, specs, quantities.',
  },
  {
    class: 2,
    label: 'Control / Substantive',
    scopeDefinition: '30–70%',
    prepEffort: '20–50×',
    accuracy: '+15% / -10%',
    typical_use: 'Authorization, proposal',
    description: 'Based on approved design documents. Suitable for project authorization and contractor proposals.',
  },
  {
    class: 3,
    label: 'Preliminary / Budget',
    scopeDefinition: '10–40%',
    prepEffort: '5–20×',
    accuracy: '+30% / -20%',
    typical_use: 'Budget authorization, feasibility',
    description: 'Based on schematic design. Typical for early-stage feasibility and internal budget approval.',
  },
  {
    class: 4,
    label: 'Conceptual / Study',
    scopeDefinition: '1–15%',
    prepEffort: '2–5×',
    accuracy: '+50% / -30%',
    typical_use: 'Study / conceptual screening',
    description: 'Based on parametric models or analogies. Used for comparing alternatives in early conceptual phase.',
  },
  {
    class: 5,
    label: 'Order of Magnitude / Stochastic',
    scopeDefinition: '0–2%',
    prepEffort: '1×',
    accuracy: '+100% / -50%',
    typical_use: 'Project selection / screening',
    description: 'ROM estimate based on cost per m², cost per unit, or rough analogy. Highest risk, lowest cost to produce.',
  },
];

// Typical material waste factors (perdas) — Gestão de Custos de Obra, cap. 6
const TYPICAL_WASTE_FACTORS = [
  { material: 'Cement / Cimento',        unit: 'bag/sc',  wastePct: 12, notes: 'TCPO reference 8-15%' },
  { material: 'Ready-mix concrete',      unit: 'CY/m³',   wastePct: 3,  notes: 'Slump, formwork overflow' },
  { material: 'Reinforcement steel',     unit: 'lb/kg',   wastePct: 7,  notes: 'Cutting waste 5-10%' },
  { material: 'Ceramic tile / Cerâmica', unit: 'SF/m²',   wastePct: 10, notes: 'Cutting at borders' },
  { material: 'Mortar / Argamassa',      unit: 'CY/m³',   wastePct: 20, notes: 'Application losses' },
  { material: 'Brick / Bloco',           unit: 'EA',      wastePct: 5,  notes: 'Breaking during handling' },
  { material: 'Lumber / Madeira',        unit: 'BF/MBF',  wastePct: 8,  notes: 'Formwork cuts' },
  { material: 'Paint / Tinta',           unit: 'GAL/L',   wastePct: 10, notes: 'Application overspray' },
  { material: 'Drywall / Gypsum board',  unit: 'SF',      wastePct: 8,  notes: 'Cutting, breakage' },
  { material: 'PVC pipe / Tubulação',    unit: 'LF/m',    wastePct: 5,  notes: 'Fitting adjustments' },
  { material: 'Flooring / Piso madeira', unit: 'SF',      wastePct: 8,  notes: 'Direction cuts, defects' },
  { material: 'Insulation / Isolamento', unit: 'SF',      wastePct: 5,  notes: 'Cuts around openings' },
  { material: 'Roofing shingles',        unit: 'SQ',      wastePct: 10, notes: 'Ridge, valley, starter' },
  { material: 'Gravel / Brita',          unit: 'TON/t',   wastePct: 5,  notes: 'Spillage, swell' },
  { material: 'Sand / Areia',            unit: 'TON/t',   wastePct: 8,  notes: 'Moisture, spillage' },
];
