import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// RS MEANS 2024 — MasterFormat CSI Divisions
// Prices in USD. Units: SF=sq ft, SY=sq yd, CY=cu yd, LF=lin ft,
//   EA=each, LB=pound, TON=short ton, GAL=gallon, BF=board ft,
//   MSF=thousand sq ft, CSF=100 sq ft, PR=pair, LS=lump sum,
//   BOX, BAG, SQ=100 sq ft roofing, GLF=gal
// ─────────────────────────────────────────────────────────────────────────────

const DIVISIONS: { code: string; name: string; description: string }[] = [
  { code: '01', name: 'General Requirements',         description: 'Temporary facilities, allowances, quality control, project management' },
  { code: '02', name: 'Existing Conditions',          description: 'Subsurface investigation, hazardous material assessment, demolition' },
  { code: '03', name: 'Concrete',                     description: 'Formwork, reinforcing, cast-in-place, precast, cementitious grout' },
  { code: '04', name: 'Masonry',                      description: 'Unit masonry, stone, masonry accessories, mortar & grout' },
  { code: '05', name: 'Metals',                       description: 'Structural steel, joists, metal deck, cold-formed framing, ornamental metal' },
  { code: '06', name: 'Wood, Plastics & Composites',  description: 'Rough carpentry, finish carpentry, millwork, architectural woodwork' },
  { code: '07', name: 'Thermal & Moisture Protection',description: 'Waterproofing, insulation, roofing, flashing, sealants, fire-stopping' },
  { code: '08', name: 'Openings',                     description: 'Doors, windows, skylights, hardware, glazing, curtain walls' },
  { code: '09', name: 'Finishes',                     description: 'Plaster, drywall, tile, ceilings, flooring, wall finishes, painting' },
  { code: '10', name: 'Specialties',                  description: 'Visual display, compartments, lockers, signage, fire protection' },
  { code: '11', name: 'Equipment',                    description: 'Vehicle & pedestrian, loading dock, commercial kitchen, residential' },
  { code: '22', name: 'Plumbing',                     description: 'Plumbing piping, fixtures, domestic water, drainage, gas piping' },
  { code: '23', name: 'HVAC',                         description: 'Air distribution, refrigeration, heating, ventilation, ductwork' },
  { code: '26', name: 'Electrical',                   description: 'Wiring, lighting, low voltage, grounding, motors, switchgear' },
  { code: '31', name: 'Earthwork',                    description: 'Site clearing, grading, excavation, fill, compaction, drainage' },
  { code: '32', name: 'Exterior Improvements',        description: 'Paving, curbs, walks, fencing, landscaping, irrigation, site furnishings' },
];

// line: [lineNumber, description, unit, matCost, labCost, eqpCost, crewCode, dailyOutput, laborHours, notes?]
type LineRow = [string, string, string, number, number, number, string, number, number, string?];

const ITEMS: Record<string, LineRow[]> = {

  '01': [
    ['01 10 00.10 0010', 'General contractor overhead & profit allowance',         'LS',  0,       0,      0,      '',       0,    0,     'Typically 15–20% of direct costs'],
    ['01 21 16.00 0010', 'Allowance, temporary fencing, chain link 6\' H',         'LF',  2.85,    1.12,   0,      '1 Carp', 200,  0.04],
    ['01 21 16.00 0020', 'Allowance, temporary power, 200A service',               'LS',  385,     145,    0,      '1 Elec', 1,    8],
    ['01 21 16.00 0030', 'Temporary water supply, 3/4" hose bib connection',       'EA',  48,      72,     0,      '1 Plum', 4,    2],
    ['01 21 16.00 0040', 'Portable toilet, rent/month',                            'MO',  125,     0,      0,      '',       0,    0],
    ['01 21 16.00 0050', 'Construction trailer, 8\'x32\', rent/month',             'MO',  520,     0,      0,      '',       0,    0],
    ['01 21 16.00 0060', 'Dumpster, 10 CY, rent/week',                             'WK',  285,     0,      0,      '',       0,    0],
    ['01 21 16.00 0070', 'Site safety sign, OSHA compliant',                       'EA',  58,      18,     0,      '1 Carp', 16,   0.5],
    ['01 41 26.00 0010', 'Building permit allowance, per $1000 contract value',    'EA',  7.50,    0,      0,      '',       0,    0,    'Varies by municipality; ~0.5–1.5%'],
    ['01 74 13.00 0010', 'Debris hauling, truck, 10 CY per load',                  'EA',  85,      65,     35,     'B-16',   8,    1],
    ['01 74 13.00 0020', 'Recycling fee, mixed C&D debris, per ton',               'TON', 65,      0,      0,      '',       0,    0],
  ],

  '02': [
    ['02 21 13.00 0010', 'Soil boring, mobilization',                              'LS',  650,     0,      0,      'A-6',    1,    8],
    ['02 21 13.00 0020', 'Soil boring, standard penetration test, per foot',       'LF',  12.50,   0,      18.50,  'A-6',    80,   0.1],
    ['02 41 13.00 0010', 'Selective demolition, concrete slab, 4" thick',          'SF',  0,       0.78,   0.42,   'B-9',    480,  0.017],
    ['02 41 13.00 0020', 'Selective demolition, brick wall, 4" thick',             'SF',  0,       1.15,   0.38,   'B-9',    320,  0.025],
    ['02 41 13.00 0030', 'Demolition, wood frame partition wall',                  'SF',  0,       0.65,   0.22,   'B-1',    600,  0.013],
    ['02 41 13.00 0040', 'Demolition, remove & haul existing door & frame',        'EA',  0,       38,     0,      '2 Carp', 10,   0.8],
    ['02 41 13.00 0050', 'Demolition, saw cut asphalt pavement, 2"',               'LF',  0,       0.95,   1.05,   'B-89',   600,  0.013],
    ['02 82 13.00 0010', 'Asbestos removal, pipe insulation, 1"–3" dia.',          'LF',  0,       9.75,   0,      'Hazmat', 60,   0.133, 'Licensed abatement contractor'],
    ['02 82 13.00 0020', 'Asbestos removal, floor tile 12"x12"',                   'SF',  0,       3.85,   0,      'Hazmat', 200,  0.04,  'Licensed abatement contractor'],
    ['02 82 13.00 0030', 'Lead paint removal, chemical stripping, per coat',       'SF',  1.45,    2.15,   0,      'Hazmat', 180,  0.044, 'Licensed abatement contractor'],
  ],

  '03': [
    ['03 10 05.20 0010', 'Formwork, slab on grade, edge form 4" high',             'LF',  1.12,    2.15,   0,      '1 Carp', 120,  0.067],
    ['03 10 05.20 0020', 'Formwork, wall, 1–4 use, job-built plywood',             'SFCA',1.85,    3.72,   0,      'C-2',    200,  0.04],
    ['03 10 05.20 0030', 'Formwork, elevated slab, 1 use, shoring incl.',          'SFCA',2.45,    4.85,   0,      'C-2',    150,  0.053],
    ['03 10 05.20 0040', 'Formwork, column, round fiber tube 12" dia.',            'LF',  8.50,    12.25,  0,      '2 Carp', 35,   0.229],
    ['03 10 05.20 0050', 'Formwork, strip & clean, reuse factor',                  'SFCA',0,       0.85,   0,      '1 Carp', 640,  0.013],
    ['03 20 00.10 0010', 'Reinforcing steel, #4 rebar, A615 gr 60, in place',      'TON', 1050,   625,    0,      'E-4',    3.5,  2.286],
    ['03 20 00.10 0020', 'Reinforcing steel, #5 rebar, A615 gr 60, in place',      'TON', 995,     595,    0,      'E-4',    4,    2],
    ['03 20 00.10 0030', 'Reinforcing steel, #6 rebar, A615 gr 60, in place',      'TON', 975,     555,    0,      'E-4',    4.5,  1.778],
    ['03 20 00.10 0040', 'Welded wire fabric, 6x6-W1.4xW1.4, in slab',            'CSF', 38.50,   45,     0,      'C-10',   6,    1.333],
    ['03 30 53.40 0010', 'Concrete, ready-mix, 3000 PSI, delivered',               'CY',  138,     0,      0,      '',       0,    0],
    ['03 30 53.40 0020', 'Concrete, ready-mix, 4000 PSI, delivered',               'CY',  148,     0,      0,      '',       0,    0],
    ['03 30 53.40 0030', 'Concrete, ready-mix, 5000 PSI, delivered',               'CY',  162,     0,      0,      '',       0,    0],
    ['03 30 53.40 0040', 'Concrete, pump placement, includes pump',                'CY',  0,       24,     18,     'C-20',   80,   0.1],
    ['03 30 53.40 0050', 'Concrete, place & vibrate, slab on grade 4"',            'CY',  0,       28,     0,      'C-8',    120,  0.067],
    ['03 30 53.40 0060', 'Concrete, finishing, trowel machine, slab',              'SF',  0,       0.22,   0.08,   'C-10A',  2000, 0.004],
    ['03 30 53.40 0070', 'Concrete, curing compound, spray applied',               'SF',  0.12,    0.07,   0,      '1 Labr', 4000, 0.002],
    ['03 30 53.40 0080', 'Concrete, saw cutting, green concrete, per LF/inch',     'LF',  0,       0.48,   0.32,   'B-89',   300,  0.027],
    ['03 35 23.13 0010', 'Concrete floor, grind & seal, polished finish',          'SF',  0.45,    1.85,   0.65,   'C-10A',  500,  0.016],
    ['03 39 13.00 0010', 'Concrete, shotcrete, wet mix, 3" thickness',             'SF',  2.85,    3.45,   0.95,   'C-20',   200,  0.04],
    ['03 47 13.00 0010', 'Precast concrete, hollow core plank, 6" x 4\'',          'SF',  9.50,    3.25,   1.85,   'E-2',    800,  0.01],
    ['03 47 13.00 0020', 'Precast concrete, double-tee 60" x 34" span',            'SF',  12.75,   4.15,   2.25,   'E-2',    640,  0.013],
    ['03 62 00.10 0010', 'Non-shrink grout, metallic, 1.5" cap',                   'SF',  4.25,    6.50,   0,      '1 Carp', 24,   0.333],
  ],

  '04': [
    ['04 21 13.10 0010', 'Face brick, standard 4"x2-2/3"x8", running bond',       'SF',  6.85,    9.25,   0,      'D-4',    185,  0.043],
    ['04 21 13.10 0020', 'Face brick, modular, common bond, incl. mortar',         'SF',  6.45,    8.75,   0,      'D-4',    200,  0.04],
    ['04 21 13.10 0030', 'Brick, 8" cavity wall, ties & wall ties incl.',          'SF',  14.25,   19.50,  0,      'D-4',    90,   0.089],
    ['04 22 00.10 0010', 'Concrete masonry unit CMU, 8"x8"x16", hollow',           'SF',  3.85,    7.15,   0,      'D-4',    240,  0.033],
    ['04 22 00.10 0020', 'CMU, 6"x8"x16", hollow, standard weight',               'SF',  3.45,    6.85,   0,      'D-4',    265,  0.03],
    ['04 22 00.10 0030', 'CMU, 12"x8"x16", hollow',                               'SF',  5.25,    8.50,   0,      'D-4',    180,  0.044],
    ['04 22 00.10 0040', 'CMU, filled solid w/ grout & vertical rebar',            'SF',  2.15,    3.85,   0,      'D-4',    300,  0.027],
    ['04 22 00.10 0050', 'Mortar, type S, per bag (60 lb)',                        'BAG', 12.50,   0,      0,      '',       0,    0],
    ['04 43 00.10 0010', 'Stone veneer, granite, 1-1/4" thick, installed',         'SF',  28.50,   22.75,  0,      'D-10',   60,   0.133],
    ['04 43 00.10 0020', 'Stone veneer, limestone, 2" thick, installed',           'SF',  24.75,   19.50,  0,      'D-10',   72,   0.111],
    ['04 43 00.10 0030', 'Stone veneer, manufactured cultured stone',              'SF',  9.75,    12.50,  0,      'D-4',    100,  0.08],
    ['04 72 00.10 0010', 'Cast stone sill, 4"x8" profile, per LF',                'LF',  18.50,   8.25,   0,      'D-4',    48,   0.167],
    ['04 72 00.10 0020', 'Lintel, angle iron 3"x3-1/2"x1/4", per LF',             'LF',  6.85,    4.25,   0,      'E-4',    90,   0.089],
  ],

  '05': [
    ['05 12 23.00 0010', 'Structural steel, W-shapes, A992, shop fab, per ton',    'TON', 2850,   0,      0,      '',       0,    0,     'Material only, FOB shop'],
    ['05 12 23.00 0020', 'Structural steel, W-shapes, erect, bolted connections',  'TON', 0,       1385,  285,    'E-28',   4,    2],
    ['05 12 23.00 0030', 'Steel column base plate, 10"x10"x3/4"',                 'EA',  68,      145,    0,      'E-28',   8,    1],
    ['05 12 23.00 0040', 'Steel beam, W8x31, per LF erected',                     'LF',  18.25,   8.75,   2.45,   'E-28',   80,   0.1],
    ['05 12 23.00 0050', 'High-strength bolt, A325, 3/4"x2-1/4", installed',      'EA',  1.85,    2.45,   0,      'E-28',   80,   0.1],
    ['05 31 13.00 0010', 'Metal deck, 1-1/2" type B, 22 gauge, unshored',         'SF',  2.15,    1.15,   0,      'E-4',    1000, 0.008],
    ['05 31 13.00 0020', 'Metal deck, 3" composite, 18 gauge',                    'SF',  3.45,    1.55,   0,      'E-4',    800,  0.01],
    ['05 41 13.00 0010', 'Cold-formed framing, 3-5/8" x 25 ga., studs 16" OC',   'SF',  1.65,    2.85,   0,      '2 Carp', 500,  0.016],
    ['05 41 13.00 0020', 'Cold-formed framing, 6" x 18 ga., studs 16" OC',       'SF',  2.35,    3.15,   0,      '2 Carp', 450,  0.018],
    ['05 51 23.00 0010', 'Metal stairs, industrial, 3-1/2" channel stringer',     'RISER',125,    185,    0,      'E-4',    8,    1],
    ['05 52 13.00 0010', 'Metal railing, pipe, 1-1/2" dia., straight',            'LF',  28.50,   22.50,  0,      'E-4',    48,   0.167],
    ['05 52 13.00 0020', 'Metal railing, aluminum, 42" H, powder coated',         'LF',  42.75,   18.50,  0,      '2 Carp', 64,   0.125],
    ['05 73 00.10 0010', 'Ornamental metal, loose lintels, angle 4"x3-1/2"',      'LB',  1.85,    2.15,   0,      'E-4',    120,  0.067],
  ],

  '06': [
    ['06 11 10.20 0010', 'Framing, 2"x4" studs, Douglas fir, 16" OC',             'SF',  0.72,    1.65,   0,      '2 Carp', 800,  0.01],
    ['06 11 10.20 0020', 'Framing, 2"x6" studs, 16" OC',                          'SF',  1.05,    1.75,   0,      '2 Carp', 750,  0.011],
    ['06 11 10.20 0030', 'Framing, 2"x4" plates, top & bottom',                   'LF',  0.62,    0.95,   0,      '2 Carp', 400,  0.02],
    ['06 11 10.20 0040', 'Framing, 2"x10" floor joist, 16" OC',                   'SF',  1.45,    1.85,   0,      '2 Carp', 700,  0.011],
    ['06 11 10.20 0050', 'Framing, LVL beam 3-1/2"x9-1/2"',                      'LF',  9.85,    4.25,   0,      '2 Carp', 120,  0.067],
    ['06 11 10.20 0060', 'Sheathing, plywood, 1/2" roof, 4\'x8\' sheets',         'SF',  0.88,    0.65,   0,      '2 Carp', 1200, 0.007],
    ['06 11 10.20 0070', 'Sheathing, OSB, 7/16" wall, 4\'x8\' sheets',            'SF',  0.55,    0.58,   0,      '2 Carp', 1400, 0.006],
    ['06 11 10.20 0080', 'Blocking, 2"x6", per LF',                               'LF',  0.65,    1.45,   0,      '1 Carp', 200,  0.04],
    ['06 16 23.00 0010', 'Plywood, ACX 1/2", underlayment',                       'SF',  0.88,    0.72,   0,      '2 Carp', 900,  0.009],
    ['06 16 23.00 0020', 'Plywood, T&G 3/4" subfloor, glued & nailed',            'SF',  1.42,    0.85,   0,      '2 Carp', 1000, 0.008],
    ['06 22 10.00 0010', 'Base molding, colonial 3-1/2", pine, paint grade',      'LF',  1.85,    2.45,   0,      '1 Carp', 200,  0.04],
    ['06 22 10.00 0020', 'Base molding, MDF 3-1/2", paint grade',                 'LF',  1.45,    2.25,   0,      '1 Carp', 220,  0.036],
    ['06 22 10.00 0030', 'Crown molding, 3-1/4", pine',                           'LF',  2.15,    3.85,   0,      '1 Carp', 120,  0.067],
    ['06 22 10.00 0040', 'Window casing, colonial, 3" wide, installed',           'LF',  1.65,    2.85,   0,      '1 Carp', 160,  0.05],
    ['06 41 16.00 0010', 'Cabinets, kitchen, base unit, 24"x36", laminate',       'LF',  185,     62,     0,      '2 Carp', 16,   0.5],
    ['06 41 16.00 0020', 'Cabinets, kitchen, wall unit, 12"x30", laminate',       'LF',  145,     55,     0,      '2 Carp', 18,   0.444],
    ['06 41 16.00 0030', 'Countertop, laminate, post-form, per LF',               'LF',  28.50,   18.50,  0,      '1 Carp', 36,   0.222],
    ['06 41 16.00 0040', 'Countertop, granite, 3/4" slab, per SF',                'SF',  58,      22.50,  0,      'D-7',    30,   0.267],
    ['06 41 16.00 0050', 'Countertop, quartz composite, per SF',                  'SF',  65,      22.50,  0,      'D-7',    28,   0.286],
  ],

  '07': [
    ['07 11 13.00 0010', 'Waterproofing, elastomeric membrane, 2-ply, neg side',  'SF',  1.85,    1.45,   0,      '1 Rofc', 640,  0.013],
    ['07 11 13.00 0020', 'Waterproofing, bentonite panels, 4\'x4\'',              'SF',  2.25,    1.15,   0,      '2 Rofc', 800,  0.01],
    ['07 13 53.00 0010', 'Sheet membrane, HDPE 30 mil, on grade',                 'SF',  0.88,    0.55,   0,      '1 Labr', 1500, 0.005],
    ['07 19 00.10 0010', 'Dampproofing, bituminous, brush-applied, 1 coat',       'SF',  0.35,    0.28,   0,      '1 Labr', 2500, 0.003],
    ['07 21 13.00 0010', 'Batt insulation, fiberglass, R-13, 3-1/2", walls',      'SF',  0.42,    0.28,   0,      '1 Carp', 1500, 0.005],
    ['07 21 13.00 0020', 'Batt insulation, fiberglass, R-19, 6", floor/ceil.',    'SF',  0.65,    0.32,   0,      '1 Carp', 1350, 0.006],
    ['07 21 13.00 0030', 'Batt insulation, fiberglass, R-38, 12", attic',         'SF',  1.15,    0.38,   0,      '1 Carp', 1200, 0.007],
    ['07 21 16.00 0010', 'Rigid insulation, EPS, 1" per inch',                    'SF',  0.45,    0.22,   0,      '1 Carp', 2000, 0.004],
    ['07 21 16.00 0020', 'Rigid insulation, polyisocyanurate, 2" R-13',           'SF',  1.25,    0.35,   0,      '1 Carp', 1800, 0.004],
    ['07 21 29.00 0010', 'Spray-on foam insulation, open-cell, 3-1/2"',           'SF',  1.65,    0.85,   0,      'D-1',    400,  0.02],
    ['07 21 29.00 0020', 'Spray-on foam insulation, closed-cell, 2"',             'SF',  2.45,    0.95,   0,      'D-1',    350,  0.023],
    ['07 31 13.00 0010', 'Shingles, asphalt, 240 lb, 25 yr, installed',           'SQ',  135,     95,     0,      '1 Rofc', 10,   0.8],
    ['07 31 13.00 0020', 'Shingles, asphalt, architectural 30 yr, installed',     'SQ',  175,     115,    0,      '1 Rofc', 8,    1],
    ['07 31 13.00 0030', 'Shingles, asphalt, 50-yr premium, installed',           'SQ',  245,     135,    0,      '1 Rofc', 6,    1.333],
    ['07 32 13.00 0010', 'Metal roofing, standing seam, 24 ga., steel',           'SQ',  395,     185,    0,      '2 Rofc', 6,    1.333],
    ['07 32 13.00 0020', 'Metal roofing, corrugated, 26 ga., galvanized',         'SQ',  145,     125,    0,      '2 Rofc', 8,    1],
    ['07 46 00.10 0010', 'Vinyl siding, 0.044" thick, double 4" exposure',        'SQ',  115,     155,    0,      '2 Carp', 8,    1],
    ['07 46 00.10 0020', 'Fiber cement siding, 7-1/2" exposure, primed',          'SQ',  175,     195,    0,      '2 Carp', 6,    1.333],
    ['07 46 00.10 0030', 'Cedar clapboard siding, 1"x6", painted',               'SQ',  425,     245,    0,      '2 Carp', 5,    1.6],
    ['07 62 00.10 0010', 'Flashing, aluminum, .019" thick, 12" wide',             'LF',  2.85,    2.15,   0,      '1 Shme', 120,  0.067],
    ['07 62 00.10 0020', 'Valley flashing, W-metal, 16" wide, galvanized',        'LF',  4.25,    2.85,   0,      '1 Shme', 100,  0.08],
    ['07 62 00.10 0030', 'Step flashing, aluminum, 5"x7", per unit',             'EA',  1.45,    1.85,   0,      '1 Shme', 200,  0.04],
    ['07 84 13.00 0010', 'Firestopping, pipe penetration, 1" to 4" dia.',         'EA',  12.50,   18.50,  0,      '1 Carp', 16,   0.5],
    ['07 92 13.00 0010', 'Sealant, silicone, 1/4"x1/4", per LF',                 'LF',  0.38,    0.85,   0,      '1 Carp', 300,  0.027],
    ['07 92 13.00 0020', 'Sealant, polyurethane, 1/2"x1/2", per LF',             'LF',  0.72,    1.15,   0,      '1 Carp', 225,  0.036],
    ['07 92 13.00 0030', 'Weather stripping, foam tape, door, per set',           'EA',  4.85,    6.50,   0,      '1 Carp', 40,   0.2],
  ],

  '08': [
    ['08 11 13.00 0010', 'Door, hollow metal, 3\'x7\'x1-3/4", 16 ga., incl. frame','EA', 285,    165,    0,      '2 Carp', 6,    1.333],
    ['08 11 13.00 0020', 'Door, hollow metal, 6\'x7\', pair, incl. frame',         'EA', 545,    245,    0,      '2 Carp', 4,    2],
    ['08 11 13.00 0030', 'Door, hollow metal, fire rated 90-min, 3\'x7\'',         'EA', 385,    175,    0,      '2 Carp', 5,    1.6],
    ['08 14 16.00 0010', 'Door, flush wood, hollow core, 3\'x7\'x1-3/8"',          'EA', 145,    125,    0,      '2 Carp', 8,    1],
    ['08 14 16.00 0020', 'Door, flush wood, solid core, 3\'x7\'x1-3/4"',           'EA', 245,    145,    0,      '2 Carp', 6,    1.333],
    ['08 14 16.00 0030', 'Door, 6-panel pine, 3\'x7\'x1-3/4", primed',             'EA', 185,    135,    0,      '2 Carp', 7,    1.143],
    ['08 33 23.00 0010', 'Overhead door, residential, 9\'x7\', insulated',         'EA', 865,    245,    0,      '2 Carp', 4,    2],
    ['08 33 23.00 0020', 'Overhead door, commercial, 10\'x10\', sectional',        'EA', 1850,  485,    0,      '2 Carp', 2,    4],
    ['08 51 13.00 0010', 'Window, single-hung, vinyl, 2\'8"x4\'6", insulated',     'EA', 245,    75,     0,      '2 Carp', 12,   0.667],
    ['08 51 13.00 0020', 'Window, double-hung, vinyl, 2\'8"x4\'6", Low-E',         'EA', 285,    85,     0,      '2 Carp', 10,   0.8],
    ['08 51 13.00 0030', 'Window, casement, vinyl, 2\'4"x4\'0", Low-E',            'EA', 345,    95,     0,      '2 Carp', 9,    0.889],
    ['08 51 13.00 0040', 'Window, aluminum, single-hung, 3\'x4\', thermal break',  'EA', 285,    95,     0,      '2 Carp', 10,   0.8],
    ['08 51 13.00 0050', 'Sliding glass door, vinyl, 6\'x6-8\', Low-E',            'EA', 685,    165,    0,      '2 Carp', 5,    1.6],
    ['08 71 00.10 0010', 'Door hardware, cylindrical lockset, passage, grade 2',   'EA', 48,     28,     0,      '1 Carp', 20,   0.4],
    ['08 71 00.10 0020', 'Door hardware, cylindrical lockset, entry, gr 2',        'EA', 75,     28,     0,      '1 Carp', 20,   0.4],
    ['08 71 00.10 0030', 'Door hardware, mortise lockset, commercial grade',        'EA', 285,    62,     0,      '1 Carp', 8,    1],
    ['08 71 00.10 0040', 'Door hardware, panic device, mortise, 3\'opening',       'EA', 445,    95,     0,      '1 Carp', 5,    1.6],
    ['08 71 00.10 0050', 'Closer, door, heavy duty, surface-mounted',              'EA', 125,    45,     0,      '1 Carp', 10,   0.8],
    ['08 80 00.10 0010', 'Glass, 1/4" clear float, cut to size',                   'SF', 4.85,   2.45,   0,      'G-1',    60,   0.133],
    ['08 80 00.10 0020', 'Glass, insulating, 1" unit, dual pane, clear',           'SF', 14.25,  5.85,   0,      'G-1',    40,   0.2],
    ['08 80 00.10 0030', 'Glass, insulating, 1" unit, Low-E coating',              'SF', 18.50,  5.85,   0,      'G-1',    38,   0.211],
    ['08 80 00.10 0040', 'Glass, tempered, 1/4" clear, per SF',                   'SF', 9.75,   2.85,   0,      'G-1',    50,   0.16],
  ],

  '09': [
    ['09 21 16.23 0010', 'Drywall, 5/8" type X, 1 layer, taped',                  'SF',  0.48,    0.95,   0,      'J-1',    2000, 0.004],
    ['09 21 16.23 0020', 'Drywall, 1/2" regular, 1 layer, taped',                 'SF',  0.38,    0.85,   0,      'J-1',    2200, 0.004],
    ['09 21 16.23 0030', 'Drywall, 5/8" moisture resistant (green board)',         'SF',  0.55,    0.95,   0,      'J-1',    1800, 0.004],
    ['09 21 16.23 0040', 'Drywall, tape, prime & 2 coats paint',                  'SF',  0,       1.15,   0,      'J-1',    800,  0.01],
    ['09 21 16.23 0050', 'Drywall corners, metal bead, per LF',                   'LF',  0.22,    0.38,   0,      '1 Tplt', 300,  0.027],
    ['09 30 13.00 0010', 'Ceramic tile, 4"x4", floor, set in dry mortar',         'SF',  4.25,    9.50,   0,      'D-7',    60,   0.133],
    ['09 30 13.00 0020', 'Ceramic tile, 12"x12" porcelain, floor',                'SF',  6.85,    8.25,   0,      'D-7',    72,   0.111],
    ['09 30 13.00 0030', 'Ceramic tile, 4"x4" wall, thin-set',                    'SF',  3.85,    10.50,  0,      'D-7',    50,   0.16],
    ['09 30 13.00 0040', 'Ceramic tile, 6"x6" field, wall, thin-set',             'SF',  5.45,    9.75,   0,      'D-7',    55,   0.145],
    ['09 30 13.00 0050', 'Mosaic tile, 2"x2" glass, wall, thin-set',              'SF',  12.50,   15.25,  0,      'D-7',    35,   0.229],
    ['09 30 13.00 0060', 'Natural stone, marble, 12"x12", floor, thin-set',       'SF',  18.50,   11.50,  0,      'D-7',    55,   0.145],
    ['09 30 13.00 0070', 'Natural stone, travertine, 12"x12", floor',             'SF',  16.75,   11.50,  0,      'D-7',    55,   0.145],
    ['09 30 13.00 0080', 'Grout, sanded, 1/4" joint, per SF',                    'SF',  0.28,    0.75,   0,      'D-7',    120,  0.067],
    ['09 51 13.00 0010', 'Acoustic tile ceiling, 2\'x4\' grid, 5/8" tile',        'SF',  1.25,    2.35,   0,      'J-1',    300,  0.027],
    ['09 51 13.00 0020', 'Acoustic tile ceiling, 2\'x2\' grid, 5/8" tile',        'SF',  1.65,    2.85,   0,      'J-1',    250,  0.032],
    ['09 51 13.00 0030', 'Gyp board ceiling, 1/2", taped & finished',             'SF',  0.38,    1.45,   0,      'J-1',    500,  0.016],
    ['09 64 19.00 0010', 'Hardwood flooring, 3/4"x2-1/4" strip, oak, unfinished', 'SF',  5.85,    4.25,   0,      '1 Carp', 120,  0.067],
    ['09 64 19.00 0020', 'Hardwood flooring, prefinished, 3/4"x3-1/4" oak',       'SF',  7.25,    3.85,   0,      '1 Carp', 135,  0.059],
    ['09 64 19.00 0030', 'Flooring, laminate, click-lock, AC3 rating',             'SF',  2.45,    1.85,   0,      '1 Carp', 500,  0.016],
    ['09 64 19.00 0040', 'Flooring, LVP luxury vinyl plank, click-lock',           'SF',  2.85,    1.65,   0,      '1 Carp', 600,  0.013],
    ['09 65 13.00 0010', 'Carpet, commercial, 30 oz, glue-down',                  'SY',  18.50,   6.25,   0,      'D-12',   200,  0.04],
    ['09 65 13.00 0020', 'Carpet, residential, 35 oz, with 1/2" pad',             'SY',  22.75,   6.85,   0,      'D-12',   175,  0.046],
    ['09 65 13.00 0030', 'VCT tile, 12"x12"x1/8", commercial vinyl',              'SF',  1.45,    2.25,   0,      'D-12',   400,  0.02],
    ['09 65 13.00 0040', 'Sheet vinyl, commercial, 6\' wide, inlaid pattern',      'SY',  28.50,   6.50,   0,      'D-12',   150,  0.053],
    ['09 65 13.00 0050', 'Epoxy floor coating, 2-part, 1/8" thick',               'SF',  2.15,    1.85,   0,      'D-12',   250,  0.032],
    ['09 91 13.00 0010', 'Painting, interior walls, 2 coats, brush & roll',        'SF',  0.25,    0.78,   0,      '1 Pntr', 700,  0.011],
    ['09 91 13.00 0020', 'Painting, interior ceiling, 2 coats',                   'SF',  0.28,    0.95,   0,      '1 Pntr', 600,  0.013],
    ['09 91 13.00 0030', 'Painting, exterior siding, brush, 2 coats',             'SF',  0.32,    1.15,   0,      '1 Pntr', 550,  0.015],
    ['09 91 13.00 0040', 'Painting, trim, doors, windows, brush, 2 coats per LF', 'LF',  0.12,    0.95,   0,      '1 Pntr', 400,  0.02],
    ['09 91 13.00 0050', 'Painting, prime coat, interior walls',                  'SF',  0.12,    0.45,   0,      '1 Pntr', 1200, 0.007],
    ['09 91 13.00 0060', 'Painting, spray, exterior wall, 2 coats',               'SF',  0.22,    0.65,   0,      'D-1',    1800, 0.004],
    ['09 97 13.00 0010', 'Epoxy wall coating, 2-part, 10 mil wet',                'SF',  0.85,    0.85,   0,      '1 Pntr', 400,  0.02],
  ],

  '10': [
    ['10 11 00.10 0010', 'Chalkboard, porcelain enamel, 4\'x8\' panel',            'EA', 345,     62,     0,      '2 Carp', 8,    1],
    ['10 11 00.10 0020', 'Whiteboard, magnetic, 4\'x8\'',                          'EA', 185,     45,     0,      '2 Carp', 10,   0.8],
    ['10 22 13.00 0010', 'Toilet partition, floor mount, overhead brace, plastic', 'EA', 485,     95,     0,      '2 Carp', 6,    1.333],
    ['10 22 13.00 0020', 'Toilet partition, floor mount, stainless steel',         'EA', 845,     115,    0,      '2 Carp', 5,    1.6],
    ['10 22 13.00 0030', 'Urinal screen, flush-mount, powder coated steel',        'EA', 245,     45,     0,      '2 Carp', 12,   0.667],
    ['10 28 13.00 0010', 'Toilet accessories, paper holder, surface-mount',        'EA', 28,      14,     0,      '1 Carp', 32,   0.25],
    ['10 28 13.00 0020', 'Toilet accessories, grab bar, 42", stainless',           'EA', 62,      22,     0,      '1 Carp', 20,   0.4],
    ['10 28 13.00 0030', 'Hand dryer, surface-mount, 115V',                        'EA', 385,     55,     0,      '1 Elec', 8,    1],
    ['10 44 13.00 0010', 'Fire extinguisher, 10 lb ABC, bracket mounted',          'EA', 58,      14,     0,      '1 Carp', 30,   0.267],
    ['10 44 13.00 0020', 'Fire extinguisher cabinet, recessed, 8"x12"x27"',       'EA', 125,     35,     0,      '1 Carp', 16,   0.5],
    ['10 75 00.10 0010', 'Flagpole, steel, 20\' H, direct buried',                'EA', 685,     285,    0,      'E-4',    2,    4],
  ],

  '11': [
    ['11 13 00.10 0010', 'Loading dock leveler, 25000 lb capacity, hydraulic',   'EA', 3850,   685,    0,      'E-28',   1,    8],
    ['11 13 00.10 0020', 'Loading dock bumper, rubber, 4-1/2"x14"x14"',           'EA', 125,     28,     0,      '2 Carp', 16,   0.5],
    ['11 13 00.10 0030', 'Dock seal, inflatable, 10\'x9\' opening',               'EA', 1285,   185,    0,      '2 Carp', 3,    2.667],
    ['11 40 00.10 0010', 'Commercial range, 6-burner gas, 36"',                    'EA', 2850,   125,    0,      '2 Plum', 2,    4,     'Food service equipment'],
    ['11 40 00.10 0020', 'Commercial refrigerator, reach-in, 27 cu ft',            'EA', 2250,   85,     0,      '1 Elec', 3,    2.667],
    ['11 40 00.10 0030', 'Commercial dishwasher, undercounter',                    'EA', 3450,   145,    0,      '2 Plum', 2,    4],
    ['11 52 13.00 0010', 'Projection screen, ceiling-recessed, 9\'x9\'',           'EA', 1450,   145,    0,      '2 Carp', 3,    2.667],
  ],

  '22': [
    ['22 05 23.00 0010', 'Pipe, copper, type L, 1/2" dia, soldered',              'LF',  3.85,    5.25,   0,      '1 Plum', 80,   0.1],
    ['22 05 23.00 0020', 'Pipe, copper, type L, 3/4" dia, soldered',              'LF',  5.25,    6.15,   0,      '1 Plum', 70,   0.114],
    ['22 05 23.00 0030', 'Pipe, copper, type L, 1" dia, soldered',                'LF',  7.85,    7.25,   0,      '1 Plum', 60,   0.133],
    ['22 05 23.00 0040', 'Pipe, PEX, 1/2" dia, crimped',                          'LF',  1.15,    2.85,   0,      '1 Plum', 130,  0.062],
    ['22 05 23.00 0050', 'Pipe, PVC, schedule 40, 2" dia DWV',                    'LF',  2.25,    4.85,   0,      '1 Plum', 100,  0.08],
    ['22 05 23.00 0060', 'Pipe, PVC, schedule 40, 4" dia DWV',                    'LF',  4.85,    6.50,   0,      '1 Plum', 75,   0.107],
    ['22 05 23.00 0070', 'Pipe, CPVC, 1/2" dia, hot/cold supply',                 'LF',  1.65,    3.15,   0,      '1 Plum', 120,  0.067],
    ['22 11 13.00 0010', 'Water heater, electric, 40 gal, 240V',                  'EA',  685,     185,    0,      '2 Plum', 2,    4],
    ['22 11 13.00 0020', 'Water heater, gas, 40 gal, power vent',                 'EA',  745,     225,    0,      '2 Plum', 2,    4],
    ['22 11 13.00 0030', 'Water heater, tankless, gas, 6.5 GPM',                  'EA',  985,     285,    0,      '2 Plum', 2,    4],
    ['22 41 13.00 0010', 'Water closet, vitreous china, elongated, floor mount',  'EA',  285,     225,    0,      '2 Plum', 3,    2.667],
    ['22 41 13.00 0020', 'Lavatory, drop-in, vitreous china, 20"x17"',            'EA',  185,     185,    0,      '2 Plum', 4,    2],
    ['22 41 13.00 0030', 'Bathtub, cast iron, 5\', white',                        'EA',  745,     285,    0,      '2 Plum', 2,    4],
    ['22 41 13.00 0040', 'Shower receptor, fiberglass, 36"x36"',                  'EA',  285,     185,    0,      '2 Plum', 3,    2.667],
    ['22 41 13.00 0050', 'Kitchen sink, stainless steel, double bowl, 33"',       'EA',  285,     225,    0,      '2 Plum', 3,    2.667],
    ['22 41 13.00 0060', 'Faucet, bathroom, single-hole, chrome',                  'EA',  85,      85,     0,      '1 Plum', 6,    1.333],
    ['22 41 13.00 0070', 'Faucet, kitchen, single-lever, chrome w/ spray',         'EA',  125,     95,     0,      '1 Plum', 5,    1.6],
    ['22 41 13.00 0080', 'Sump pump, 1/3 HP, submersible, w/ pit',                'EA',  385,     245,    0,      '2 Plum', 2,    4],
    ['22 11 23.00 0010', 'Backflow preventer, 1" reduced pressure zone',           'EA',  485,     145,    0,      '2 Plum', 4,    2],
    ['22 11 23.00 0020', 'Ball valve, bronze, 1/2", solder ends',                 'EA',  18.50,   22,     0,      '1 Plum', 20,   0.4],
    ['22 11 23.00 0030', 'Ball valve, bronze, 1", solder ends',                   'EA',  28,      28,     0,      '1 Plum', 16,   0.5],
  ],

  '23': [
    ['23 05 13.00 0010', 'Ductwork, rectangular, galv., 24 ga., to 5 SF/LF',      'LB',  1.85,    3.45,   0,      'Q-10',   80,   0.1],
    ['23 05 13.00 0020', 'Ductwork, round spiral, galv., 8" dia.',                 'LF',  8.25,    6.50,   0,      'Q-10',   60,   0.133],
    ['23 05 13.00 0030', 'Ductwork, round spiral, galv., 12" dia.',                'LF',  12.50,   8.25,   0,      'Q-10',   50,   0.16],
    ['23 05 13.00 0040', 'Flexible duct, insulated, 6" dia.',                      'LF',  3.85,    2.85,   0,      'Q-10',   120,  0.067],
    ['23 31 13.00 0010', 'Supply register, 4-way, 10"x4", steel',                 'EA',  18.50,   18.50,  0,      'Q-10',   16,   0.5],
    ['23 31 13.00 0020', 'Return air grille, 12"x12", steel, fixed blade',        'EA',  22.50,   18.50,  0,      'Q-10',   16,   0.5],
    ['23 31 13.00 0030', 'Diffuser, ceiling, round, 12" dia., adj. pattern',      'EA',  35,      22,     0,      'Q-10',   12,   0.667],
    ['23 34 23.00 0010', 'Exhaust fan, bathroom, 70 CFM, 4" round duct',           'EA',  65,      85,     0,      'Q-5',    4,    2],
    ['23 34 23.00 0020', 'Exhaust fan, kitchen range hood, 400 CFM, 6" duct',      'EA',  285,     125,    0,      'Q-5',    3,    2.667],
    ['23 82 19.00 0010', 'A/C unit, split system, 2-ton, 16 SEER',                'EA',  1650,   685,    0,      'Q-6',    1,    8],
    ['23 82 19.00 0020', 'A/C unit, split system, 3-ton, 16 SEER',                'EA',  2150,   785,    0,      'Q-6',    1,    8],
    ['23 82 19.00 0030', 'Heat pump, split system, 2-ton, 16 SEER',               'EA',  2285,   785,    0,      'Q-6',    1,    8],
    ['23 82 19.00 0040', 'Gas furnace, 100 MBH, 96% AFUE, upflow',                'EA',  1285,   385,    0,      'Q-6',    1,    8],
    ['23 82 19.00 0050', 'Mini-split, ductless, 9000 BTU, 23 SEER',             'EA',  1450,   485,    0,      'Q-5',    1,    8],
    ['23 82 19.00 0060', 'Mini-split, ductless, 12000 BTU, 21 SEER',            'EA',  1650,   535,    0,      'Q-5',    1,    8],
    ['23 21 13.00 0010', 'Hot water boiler, gas, 150 MBH, cast iron',             'EA',  4850,   985,    0,      'Q-6',    1,    8],
    ['23 21 13.00 0020', 'Baseboard radiation, fin-tube, 3/4" copper',             'LF',  28.50,   12.50,  0,      '1 Plum', 32,   0.25],
    ['23 21 13.00 0030', 'Thermostat, programmable, 7-day',                       'EA',  55,      35,     0,      '1 Elec', 6,    1.333],
    ['23 21 13.00 0040', 'Thermostat, smart/WiFi, 7-day',                         'EA',  145,     45,     0,      '1 Elec', 5,    1.6],
  ],

  '26': [
    ['26 05 19.00 0010', 'Wire, copper, #12 AWG, THHN, pull in conduit',           'LF',  0.22,    0.48,   0,      '1 Elec', 1000, 0.008],
    ['26 05 19.00 0020', 'Wire, copper, #10 AWG, THHN, pull in conduit',           'LF',  0.35,    0.55,   0,      '1 Elec', 900,  0.009],
    ['26 05 19.00 0030', 'Wire, copper, #8 AWG, THHN, pull in conduit',            'LF',  0.68,    0.65,   0,      '1 Elec', 800,  0.01],
    ['26 05 19.00 0040', 'Wire, copper, #6 AWG, THHN, pull in conduit',            'LF',  1.05,    0.75,   0,      '1 Elec', 700,  0.011],
    ['26 05 33.00 0010', 'Conduit, EMT, 3/4" dia., installed in wall',             'LF',  1.25,    2.85,   0,      '1 Elec', 120,  0.067],
    ['26 05 33.00 0020', 'Conduit, EMT, 1" dia., installed in wall',               'LF',  1.85,    3.25,   0,      '1 Elec', 100,  0.08],
    ['26 05 33.00 0030', 'Conduit, rigid PVC, 3/4" dia., underground',             'LF',  0.72,    1.85,   0,      '1 Elec', 150,  0.053],
    ['26 05 33.00 0040', 'Conduit, RMC rigid metallic, 1" dia.',                   'LF',  4.85,    4.25,   0,      '1 Elec', 70,   0.114],
    ['26 24 16.00 0010', 'Panel board, 100A, 120/240V, 24-circuit, surface',       'EA',  585,     385,    0,      '2 Elec', 1,    8],
    ['26 24 16.00 0020', 'Panel board, 200A, 120/240V, 40-circuit, flush',         'EA',  985,     485,    0,      '2 Elec', 1,    8],
    ['26 24 16.00 0030', 'Circuit breaker, 1-pole, 15A, plug-in',                  'EA',  8.50,    12,     0,      '1 Elec', 20,   0.4],
    ['26 24 16.00 0040', 'Circuit breaker, 2-pole, 30A, plug-in',                  'EA',  18.50,   16,     0,      '1 Elec', 16,   0.5],
    ['26 27 26.00 0010', 'Receptacle, 15A, 125V, duplex, grounded',               'EA',  3.85,    22,     0,      '1 Elec', 16,   0.5],
    ['26 27 26.00 0020', 'Receptacle, GFCI, 15A, 125V, tamper resistant',         'EA',  18.50,   28,     0,      '1 Elec', 12,   0.667],
    ['26 27 26.00 0030', 'Receptacle, 20A, 125V, duplex, commercial grade',        'EA',  8.50,    28,     0,      '1 Elec', 14,   0.571],
    ['26 27 26.00 0040', 'Switch, single-pole, 15A, 120V, toggle',                 'EA',  3.50,    18.50,  0,      '1 Elec', 18,   0.444],
    ['26 27 26.00 0050', 'Switch, 3-way, 15A, 120V',                              'EA',  7.25,    22,     0,      '1 Elec', 16,   0.5],
    ['26 27 26.00 0060', 'AFCI breaker, 1-pole, 15A',                             'EA',  48,      22,     0,      '1 Elec', 12,   0.667],
    ['26 51 13.00 0010', 'Light fixture, LED recessed, 6" dia., 75W equiv.',       'EA',  45,      55,     0,      '1 Elec', 8,    1],
    ['26 51 13.00 0020', 'Light fixture, LED, 2\'x4\' troffer, 40W',               'EA',  85,      65,     0,      '1 Elec', 6,    1.333],
    ['26 51 13.00 0030', 'Light fixture, LED strip, 8\' shop light',               'EA',  38,      35,     0,      '1 Elec', 12,   0.667],
    ['26 51 13.00 0040', 'Light fixture, exterior, LED wall pack, 40W',            'EA',  95,      55,     0,      '1 Elec', 7,    1.143],
    ['26 51 13.00 0050', 'Light fixture, pendant, LED, 12" shade',                 'EA',  185,     85,     0,      '1 Elec', 4,    2],
    ['26 51 13.00 0060', 'Smoke detector, 120V, with battery backup',              'EA',  28,      35,     0,      '1 Elec', 12,   0.667],
    ['26 51 13.00 0070', 'Carbon monoxide detector, 120V, combo CO/smoke',         'EA',  35,      35,     0,      '1 Elec', 12,   0.667],
    ['26 32 13.00 0010', 'Generator, standby, 20kW, natural gas, automatic',       'EA',  7850,   1850,  0,      'R-22',   0.5,  16],
    ['26 32 13.00 0020', 'Generator, portable, 7.5kW, gasoline',                   'EA',  1250,   245,    0,      'R-22',   2,    4],
    ['26 41 13.00 0010', 'Lightning protection, copper air terminal, 12" lead',    'EA',  28,      35,     0,      '1 Elec', 8,    1],
    ['26 41 13.00 0020', 'Lightning protection, copper conductor, #2 AWG, roof',   'LF',  5.85,    4.25,   0,      '1 Elec', 60,   0.133],
  ],

  '31': [
    ['31 10 00.10 0010', 'Site clearing, light brush, dozer',                      'ACRE',0,       485,    1285,  'B-6',    0.4,  20],
    ['31 10 00.10 0020', 'Site clearing, heavy brush & small trees',               'ACRE',0,       985,    2450,  'B-6',    0.2,  40],
    ['31 10 00.10 0030', 'Tree removal, 6" dia. trunk, incl. stump grind',         'EA',  0,       285,    245,    'B-85',   4,    2],
    ['31 10 00.10 0040', 'Tree removal, 12" dia. trunk',                           'EA',  0,       485,    385,    'B-85',   2,    4],
    ['31 23 16.00 0010', 'Excavation, bulk, open cut, hydraulic excavator',        'CY',  0,       3.85,   4.25,   'B-12B',  200,  0.04],
    ['31 23 16.00 0020', 'Excavation, hand, in confined space',                    'CY',  0,       28,     0,      '1 Labr', 8,    1],
    ['31 23 16.00 0030', 'Trench excavation, 1\'–4\' deep, backhoe',              'LF',  0,       3.25,   2.85,   'B-12B',  200,  0.04],
    ['31 23 16.00 0040', 'Trench excavation, 4\'–6\' deep, backhoe',              'LF',  0,       5.85,   4.50,   'B-12B',  120,  0.067],
    ['31 23 23.00 0010', 'Fill, compacted, granular, incl. material & place',      'CY',  22.50,   6.85,   4.25,   'B-10B',  100,  0.08],
    ['31 23 23.00 0020', 'Fill, borrow, onsite, dozer/scraper',                   'CY',  0,       2.85,   3.45,   'B-10B',  400,  0.02],
    ['31 23 23.00 0030', 'Compaction, vibrating drum roller, 8" lifts',            'CY',  0,       1.85,   2.15,   'B-10C',  800,  0.01],
    ['31 23 23.00 0040', 'Granular backfill, 3/4" stone, incl. delivery',         'TON', 28.50,   0,      0,      '',       0,    0],
    ['31 32 19.00 0010', 'Geotextile fabric, non-woven, 4 oz/SY',                 'SY',  0.72,    0.35,   0,      '1 Labr', 800,  0.01],
    ['31 32 19.00 0020', 'French drain, 4" perforated pipe, stone-wrapped',        'LF',  8.50,    6.85,   2.45,   'B-12B',  80,   0.1],
    ['31 36 00.10 0010', 'Sheet pile, steel, PS27.5, including removal',           'SF',  28,      24,     18.50,  'B-40',   200,  0.04],
    ['31 41 13.00 0010', 'Shoring, timber, trench box, 2-8\' deep, per LF/day',   'LF',  0,       4.25,   0,      '2 Labr', 80,   0.1],
  ],

  '32': [
    ['32 11 23.00 0010', 'Base course, 4" crushed stone, grade & compact',         'SY',  6.85,    3.25,   2.85,   'B-36',   500,  0.016],
    ['32 11 23.00 0020', 'Base course, 6" crushed stone, grade & compact',         'SY',  9.50,    4.25,   3.65,   'B-36',   400,  0.02],
    ['32 12 16.00 0010', 'Asphalt paving, 2" bituminous concrete',                 'SY',  8.50,    5.85,   4.50,   'B-25',   250,  0.032],
    ['32 12 16.00 0020', 'Asphalt paving, 3" bituminous concrete',                 'SY',  12.75,   7.25,   5.50,   'B-25',   200,  0.04],
    ['32 12 16.00 0030', 'Asphalt paving, parking lot, 4" incl. base',             'SY',  28.50,   12.50,  8.50,   'B-25',   150,  0.053],
    ['32 12 16.00 0040', 'Asphalt milling, 2" depth, cold plane',                  'SY',  0,       3.85,   4.25,   'B-36',   1200, 0.007],
    ['32 13 13.00 0010', 'Concrete sidewalk, 4" thick, broom finish',              'SF',  2.45,    3.25,   0.85,   'C-5',    160,  0.05],
    ['32 13 13.00 0020', 'Concrete sidewalk, 6" thick, ADA compliant',             'SF',  3.45,    4.25,   1.05,   'C-5',    120,  0.067],
    ['32 13 13.00 0030', 'Concrete driveway, 6" thick, residential',               'SF',  3.85,    4.85,   1.25,   'C-5',    100,  0.08],
    ['32 16 13.00 0010', 'Curb, extruded concrete, 6"x8", machine formed',         'LF',  6.50,    3.85,   2.45,   'B-63',   400,  0.02],
    ['32 16 13.00 0020', 'Curb & gutter, concrete, 6"x18", formed & placed',      'LF',  12.50,   9.50,   3.25,   'C-2',    80,   0.1],
    ['32 16 13.00 0030', 'Curb, granite, 5"x16", set in concrete',                'LF',  28.50,   12.50,  0,      'B-63',   45,   0.178],
    ['32 17 23.00 0010', 'Pavement marking, 4" solid white, paint',               'LF',  0.28,    0.22,   0.15,   'B-78',   1500, 0.005],
    ['32 17 23.00 0020', 'Pavement marking, parking stall, 9\'x18\'',             'EA',  18.50,   12.50,  0,      'B-78',   20,   0.4],
    ['32 31 13.00 0010', 'Fence, chain link, 4\' H, galvanized, 9 ga.',           'LF',  12.50,   8.50,   0,      'B-80',   72,   0.111],
    ['32 31 13.00 0020', 'Fence, chain link, 6\' H, galvanized',                  'LF',  16.50,   10.50,  0,      'B-80',   60,   0.133],
    ['32 31 13.00 0030', 'Fence, wood privacy, 6\' H, cedar',                     'LF',  22.50,   12.50,  0,      '2 Carp', 45,   0.178],
    ['32 31 13.00 0040', 'Fence, vinyl, 6\' H, privacy style',                    'LF',  28.50,   14.50,  0,      '2 Carp', 40,   0.2],
    ['32 91 13.00 0010', 'Topsoil, 4" layer, place & grade',                      'SY',  3.85,    2.85,   1.25,   'B-6',    500,  0.016],
    ['32 91 13.00 0020', 'Hydroseeding, including seed mix',                        'SY',  1.15,    0.45,   0.85,   'A-1H',   2000, 0.004],
    ['32 91 13.00 0030', 'Sod, bluegrass, 1-1/2" thick, laid in place',            'SY',  5.85,    3.25,   0,      '1 Labr', 100,  0.08],
    ['32 92 23.00 0010', 'Mulch, wood chips, 3" depth, place by hand',             'SY',  2.25,    2.85,   0,      '1 Labr', 250,  0.032],
    ['32 93 43.00 0010', 'Shrub, 3-gallon, deciduous, incl. install',              'EA',  28,      22,     0,      '1 Labr', 30,   0.267],
    ['32 93 43.00 0020', 'Tree, 2-1/2" caliper, B&B, deciduous, install',         'EA',  285,     125,    35,     'B-11',   4,    2],
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding RS Means 2024 Cost Library...');

  // Upsert divisions
  for (const div of DIVISIONS) {
    await prisma.costDivision.upsert({
      where: { code: div.code },
      create: div,
      update: { name: div.name, description: div.description },
    });
    console.log(`  ✓ Division ${div.code} — ${div.name}`);
  }

  // Fetch division id map
  const divisionMap: Record<string, string> = {};
  const allDivs = await prisma.costDivision.findMany();
  for (const d of allDivs) divisionMap[d.code] = d.id;

  // Upsert items
  let total = 0;
  for (const [divCode, rows] of Object.entries(ITEMS)) {
    const divisionId = divisionMap[divCode];
    if (!divisionId) {
      console.warn(`  ⚠ Division ${divCode} not found, skipping`);
      continue;
    }
    for (const row of rows) {
      const [lineNumber, description, unit, materialCost, laborCost, equipmentCost, crewCode, dailyOutput, laborHours, notes] = row;
      const totalCost = materialCost + laborCost + equipmentCost;
      await prisma.costItem.upsert({
        where: { lineNumber },
        create: {
          divisionId,
          lineNumber,
          description,
          unit,
          materialCost,
          laborCost,
          equipmentCost,
          totalCost,
          crewCode: crewCode || undefined,
          dailyOutput: dailyOutput || undefined,
          laborHours: laborHours || undefined,
          notes: notes || undefined,
          source: 'RSMeans 2024',
        },
        update: {
          description,
          unit,
          materialCost,
          laborCost,
          equipmentCost,
          totalCost,
          crewCode: crewCode || undefined,
          dailyOutput: dailyOutput || undefined,
          laborHours: laborHours || undefined,
          notes: notes || undefined,
        },
      });
      total++;
    }
    console.log(`  ✓ Division ${divCode}: ${rows.length} items`);
  }

  console.log(`\n✅ Seeded ${DIVISIONS.length} divisions and ${total} cost items.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
