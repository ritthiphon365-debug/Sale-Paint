export const LEGACY_MAIN_TABLE = [{pct:80,amt:6000},{pct:85,amt:6500},{pct:90,amt:7000},{pct:95,amt:7500},{pct:100,amt:10000},{pct:105,amt:11000},{pct:110,amt:12000},{pct:115,amt:13000},{pct:120,amt:14250},{pct:125,amt:15500},{pct:130,amt:16750}];
export const LEGACY_SPECIAL_TABLE = [{pct:80,amt:1000},{pct:90,amt:1500},{pct:100,amt:2000}];
export const LEGACY_PERHEAD_TABLE = [{min:400000,amt:3000},{min:350000,amt:2500},{min:300000,amt:2000},{min:250000,amt:1500},{min:200000,amt:1000},{min:150000,amt:0}];
export const GATE_PERCENT = 80;
export const GALLON_CAP_PER_PERSON = 5000;
const lookupTiered = (table:{pct:number;amt:number}[], pct:number) => { let amt = 0; for (const t of table) { if (pct >= t.pct) amt = t.amt; } return amt; };
export const inSpecialBand = (target:number) => target >= 200000 && target <= 400000;
export function calcLegacyCommission(target:number, sales:number, headcount:number) {
  const pct = target > 0 ? (sales / target * 100) : 0;
  const monthGoalReached = pct >= GATE_PERCENT;
  const main = monthGoalReached ? lookupTiered(LEGACY_MAIN_TABLE, pct) : 0;
  const special = (inSpecialBand(target) && monthGoalReached) ? lookupTiered(LEGACY_SPECIAL_TABLE, pct) : 0;
  const hc = headcount > 0 ? headcount : 1;
  const perPersonSales = sales / hc;
  let perHead = 0;
  if (monthGoalReached) { for (const t of LEGACY_PERHEAD_TABLE) { if (perPersonSales >= t.min) { perHead = t.amt; break; } } }
  return { pct, main, special, perHead, perPersonSales, headcount: hc, monthGoalReached, total: main + special + perHead, inSpecialBand: inSpecialBand(target) };
}
export function calcGallonPayout(subtotal:number, headcount:number) {
  const hc = headcount > 0 ? headcount : 1;
  const perPersonRaw = subtotal / hc;
  const perPersonCapped = Math.min(perPersonRaw, GALLON_CAP_PER_PERSON);
  return { perPersonRaw, perPersonCapped, paidTotal: perPersonCapped * hc, headcount: hc };
}
