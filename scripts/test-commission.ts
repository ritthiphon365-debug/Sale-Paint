import { computeCommission } from '../src/services/calculationService';
import type { CommissionConfig, GallonIncentiveRule, SaleItem } from '../src/types';
import { INITIAL_COMMISSION_CONFIG } from '../src/mockData';

const baseConfig: CommissionConfig = { ...INITIAL_COMMISSION_CONFIG, specialBands: undefined, rewardPerHead: undefined };

let seq = 0;
const sale = (productName: string, quantity: number, total = quantity * 100, extra: Partial<SaleItem> = {}): SaleItem => ({
  id: `test-${++seq}`,
  billId: `bill-${seq}`,
  date: '2026-09-15',
  productId: `p-${seq}`,
  productName,
  brand: 'TEST',
  sku: `SKU-${seq}`,
  size: '1GL',
  base: 'A',
  filmColor: 'กึ่งเงา',
  colorCode: '-',
  price: total / quantity,
  tintPrice: 0,
  quantity,
  total,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
  ...extra,
});

function commissionCase(target: number, salesAmount: number, headcount: number) {
  const result = computeCommission([sale('TEST', 1, salesAmount)], 9, 2026, { ...baseConfig, monthlyTarget: target, headcount }, []);
  return [result.achievementPercent, result.mainCommission, result.specialCommission, result.perHeadCommission, result.mainCommission + result.specialCommission + result.perHeadCommission];
}

const expectedCases: Array<[number, number, number, number[]]> = [
  [380000, 380000, 2, [100, 10000, 2000, 0, 12000]],
  [380000, 300000, 2, [78.94736842105263, 0, 0, 0, 0]],
  [380000, 304000, 2, [80, 6000, 1000, 0, 7000]],
  [380000, 303999, 2, [79.99973684210526, 0, 0, 0, 0]],
  [380000, 494000, 3, [130, 16750, 2000, 0, 18750]],
  [300000, 300000, 1, [100, 10000, 2000, 2000, 14000]],
  [300000, 330000, 2, [110, 12000, 2000, 0, 14000]],
  [500000, 400000, 4, [80, 6000, 0, 0, 6000]],
  [500000, 650000, 5, [130, 16750, 0, 0, 16750]],
  [200000, 160000, 2, [80, 6000, 1000, 0, 7000]],
  [400000, 400000, 2, [100, 10000, 2000, 1000, 13000]],
  [450000, 200000, 2, [44.44444444444444, 0, 0, 0, 0]],
];

let failed = 0;
const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const print = (name: string, pass: boolean, actual: unknown, expected: unknown) => {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) console.log(`  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  if (!pass) failed++;
};

expectedCases.forEach(([target, salesAmount, headcount, expected], i) => {
  const actual = commissionCase(target, salesAmount, headcount);
  const pass = actual.length === expected.length && actual.every((v, j) => typeof v === 'number' && approx(v, expected[j]));
  print(`commission ${i + 1}`, pass, actual, expected);
});

const rules: GallonIncentiveRule[] = [
  { id: 'r1', name: 'r1', ruleType: 'per_unit', productName: 'WEATHERBOND', selectedFilmColors: ['กึ่งเงา'], selectedSizes: ['1GL'], selectedBases: ['A'], reward: 20, enabled: true },
  { id: 'r2', name: 'r2', ruleType: 'lump_sum_qty', productName: 'WEATHERBOND', selectedFilmColors: ['กึ่งเงา'], selectedSizes: ['1GL'], minQuantity: 6, reward: 100, enabled: true },
  { id: 'r3', name: 'r3', ruleType: 'per_unit', productName: 'ODOURLESS', selectedSizes: ['5GL'], selectedBases: ['A', 'B'], reward: 50, enabled: true },
];
const incentiveSales = [
  sale('WEATHERBOND', 10, 1000, { base: 'A', size: '1GL', filmColor: 'กึ่งเงา' }),
  sale('WEATHERBOND', 7, 700, { base: 'B', size: '1GL', filmColor: 'กึ่งเงา' }),
  sale('WEATHERBOND', 5, 500, { base: 'C', size: '1GL', filmColor: 'กึ่งเงา' }),
  sale('ODOURLESS', 30, 3000, { base: 'B', size: '5GL', filmColor: 'กึ่งเงา' }),
  sale('ODOURLESS', 99, 9900, { base: 'D', size: '5GL', filmColor: 'กึ่งเงา' }),
  sale('WEATHERBOND ADVANCE', 50, 5000, { base: 'A', size: '1GL', filmColor: 'กึ่งเงา' }),
];
const incentive = (headcount: number) => computeCommission(incentiveSales, 9, 2026, { ...baseConfig, monthlyTarget: 1000, headcount }, rules);
const inc1 = incentive(1);
const expectedBreakdowns = [[10, 200], [22, 300], [30, 1500]];
print('gallon rule breakdowns', inc1.ruleBreakdowns.length === 3 && inc1.ruleBreakdowns.every((r, i) => r.matchedQuantity === expectedBreakdowns[i][0] && r.potentialAmount === expectedBreakdowns[i][1]), inc1.ruleBreakdowns.map(r => [r.matchedQuantity, r.potentialAmount]), expectedBreakdowns);
print('gallon subtotal', inc1.gallonSubtotal === 2000, inc1.gallonSubtotal, 2000);
for (const hc of [1, 2, 3]) {
  const r = incentive(hc);
  const expectedPer = 2000 / hc;
  print(`gallon payout headcount ${hc}`, approx(r.gallonPerPersonRaw, expectedPer) && approx(r.gallonPerPersonCapped, expectedPer) && r.gallonIncentiveTotal === 2000, [r.gallonPerPersonRaw, r.gallonIncentiveTotal], [expectedPer, 2000]);
}
const capRule: GallonIncentiveRule[] = [{ id: 'cap', name: 'cap', ruleType: 'per_unit', productName: 'WEATHERBOND', reward: 5000, enabled: true }];
const cap = computeCommission([sale('WEATHERBOND', 4, 400)], 9, 2026, { ...baseConfig, monthlyTarget: 100, headcount: 2 }, capRule);
print('gallon cap', cap.gallonSubtotal === 20000 && cap.gallonPerPersonRaw === 10000 && cap.gallonPerPersonCapped === 5000 && cap.gallonCapApplied === true && cap.gallonIncentiveTotal === 10000, [cap.gallonSubtotal, cap.gallonPerPersonRaw, cap.gallonPerPersonCapped, cap.gallonCapApplied, cap.gallonIncentiveTotal], [20000, 10000, 5000, true, 10000]);
const gate = computeCommission(incentiveSales, 9, 2026, { ...baseConfig, monthlyTarget: 380000, headcount: 1 }, rules);
print('gallon 80% gate', gate.achievementPercent < 80 && gate.gallonIncentiveTotal === 0 && gate.gallonSubtotal === 2000, [gate.achievementPercent, gate.gallonIncentiveTotal, gate.gallonSubtotal], ['<80', 0, 2000]);

if (failed) throw new Error(`${failed} test group(s) failed`);
console.log(`\nALL TESTS PASS (${expectedCases.length + 1 + 3 + 1 + 1} groups)`);
