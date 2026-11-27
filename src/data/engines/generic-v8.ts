import { buildVeeEngine } from './veeParts.ts'

// A teaching 90° cross-plane V8, about 5.0 L. Not a copy of any one manufacturer's engine.
export const genericV8Data = buildVeeEngine({
  id: 'generic-v8',
  code: 'GV8',
  model: 'V8',
  layout: 'v8',
  displacementCc: 4999,
  bankAngleDeg: 90,
  boreM: 0.092,
  strokeM: 0.094,
  boreMm: 92,
  strokeMm: 94,
  cylindersPerBank: 4,
  firingOrder: [1, 8, 4, 3, 6, 5, 7, 2],
  firingLabel: '1-8-4-3-6-5-7-2',
  boreSpacing: 0.112,
  block: { length: 0.56, width: 0.28, height: 0.3 },
  mainCaps: 5,
  headBolts: 10,
  coverBolts: 10,
  exhaustNuts: 8,
  intakeBolts: 12,
  panBolts: 12,
  liters: '5.0 L',
})