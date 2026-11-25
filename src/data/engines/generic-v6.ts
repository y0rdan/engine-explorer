import { buildVeeEngine } from './veeParts.ts'

// A teaching 60° V6, about 3.5 L. Not a copy of any one manufacturer's engine.
export const genericV6Data = buildVeeEngine({
  id: 'generic-v6',
  code: 'GV6',
  model: 'V6',
  layout: 'v6',
  displacementCc: 3498,
  bankAngleDeg: 60,
  boreM: 0.094,
  strokeM: 0.084,
  boreMm: 94,
  strokeMm: 84,
  cylindersPerBank: 3,
  firingOrder: [1, 2, 3, 4, 5, 6],
  firingLabel: '1-2-3-4-5-6',
  boreSpacing: 0.108,
  block: { length: 0.42, width: 0.24, height: 0.28 },
  mainCaps: 4,
  headBolts: 8,
  coverBolts: 8,
  exhaustNuts: 6,
  intakeBolts: 8,
  panBolts: 10,
  liters: '3.5 L',
})
