import { SaleItem, StockInRecord, ProductConfig, StockItemComputed, CustomerCRM, FollowUpStatus, CommissionConfig, GallonIncentiveRule, SizeOption } from '../types';
import { GATE_PERCENT, GALLON_CAP_PER_PERSON, LEGACY_MAIN_TABLE, LEGACY_SPECIAL_TABLE, LEGACY_PERHEAD_TABLE, calcGallonPayout, calcLegacyCommission } from './commissionLegacy';

export function computeStockInventory(
  products: ProductConfig[],
  stockIns: StockInRecord[],
  sales: SaleItem[]
): StockItemComputed[] {
  const result: StockItemComputed[] = [];
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Group sales of last 14 days by variantKey (productId + size + base)
  const salesLast14dMap: Record<string, number> = {};
  const totalSoldMap: Record<string, number> = {};

  sales.forEach((s) => {
    const key = `${s.productId}_${s.size}_${s.base || 'NONE'}`;
    totalSoldMap[key] = (totalSoldMap[key] || 0) + s.quantity;

    const saleDate = new Date(s.date);
    if (saleDate >= fourteenDaysAgo && saleDate <= now) {
      salesLast14dMap[key] = (salesLast14dMap[key] || 0) + s.quantity;
    }
  });

  // Group stock in by variantKey
  const stockInMap: Record<string, number> = {};
  stockIns.forEach((stk) => {
    const key = `${stk.productId}_${stk.size}_${stk.base || 'NONE'}`;
    stockInMap[key] = (stockInMap[key] || 0) + stk.quantity;
  });

  // For each product, compute every relevant size and base combination
  products.forEach((prod) => {
    prod.availableSizes.forEach((size) => {
      const bases = prod.hasBases && prod.availableBases && prod.availableBases.length > 0
        ? prod.availableBases
        : [undefined];

      bases.forEach((base) => {
        const variantKey = `${prod.id}_${size}_${base || 'NONE'}`;
        const initialStockKey = `${size}_${base || 'A'}`;
        const initialStock = prod.initialStock?.[initialStockKey] ?? prod.initialStock?.[size] ?? 0;
        const stockIn = stockInMap[variantKey] || 0;
        const soldQuantity = totalSoldMap[variantKey] || 0;
        const remainingStock = initialStock + stockIn - soldQuantity;

        const sold14d = salesLast14dMap[variantKey] || 0;
        const avgDailySales14d = sold14d / 14;

        let daysLeft = 999;
        if (avgDailySales14d > 0) {
          daysLeft = Math.max(0, Math.round(remainingStock / avgDailySales14d));
        }

        const isLowStock = remainingStock <= 3 || (avgDailySales14d > 0 && daysLeft <= 3);
        const isOversold = remainingStock < 0;
        const unitPrice = prod.basePrices[size] || 0;
        const totalValue = Math.max(0, remainingStock) * unitPrice;

        result.push({
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          brand: prod.brand,
          size,
          base,
          initialStock,
          stockIn,
          soldQuantity,
          remainingStock,
          avgDailySales14d: Number(avgDailySales14d.toFixed(2)),
          daysLeft,
          isLowStock,
          isOversold,
          unitPrice,
          totalValue,
        });
      });
    });
  });

  return result;
}

export function computeCustomerCRM(sales: SaleItem[]): CustomerCRM[] {
  const customerMap: Record<string, {
    name: string;
    phone: string;
    sales: SaleItem[];
  }> = {};

  sales.forEach((s) => {
    const rawName = (s.customerName || '').trim();
    const rawPhone = (s.customerPhone || '').trim();
    if (!rawName && !rawPhone) return;

    const key = `${rawName.toLowerCase()}_${rawPhone}`;
    if (!customerMap[key]) {
      customerMap[key] = {
        name: rawName || 'ลูกค้าทั่วไป (Walk-in)',
        phone: rawPhone || '-',
        sales: [],
      };
    }
    customerMap[key].sales.push(s);
  });

  const now = new Date();

  return Object.entries(customerMap).map(([id, c]) => {
    // Sort customer sales ascending by date
    const sorted = [...c.sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalSpending = sorted.reduce((sum, item) => sum + item.total, 0);
    const totalOrders = sorted.reduce((sum, item) => sum + item.quantity, 0);
    
    // Distinct bill count
    const bills = new Set(sorted.map((s) => s.billId));
    const billCount = bills.size;

    const firstOrderDate = sorted[0]?.date || '';
    const lastOrderDate = sorted[sorted.length - 1]?.date || '';

    // Product favorites
    const prodCountMap: Record<string, number> = {};
    sorted.forEach((s) => {
      prodCountMap[s.productName] = (prodCountMap[s.productName] || 0) + s.quantity;
    });
    const favoriteProducts = Object.entries(prodCountMap)
      .map(([productName, quantity]) => ({ productName, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    // Days since last order
    let daysSinceLastOrder = 0;
    if (lastOrderDate) {
      const lastDate = new Date(lastOrderDate);
      daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Average cycle days
    let avgPurchaseCycleDays = 30; // default benchmark
    if (sorted.length >= 2 && firstOrderDate !== lastOrderDate) {
      const daysDiff = Math.max(1, Math.floor((new Date(lastOrderDate).getTime() - new Date(firstOrderDate).getTime()) / (1000 * 60 * 60 * 24)));
      avgPurchaseCycleDays = Math.max(5, Math.round(daysDiff / (sorted.length - 1)));
    }

    // Follow up status: NEW, OK, DUE (avgCycle * 0.9), OVERDUE (avgCycle * 1.4)
    let followUpStatus: FollowUpStatus = 'OK';
    if (sorted.length <= 1) {
      followUpStatus = 'NEW';
    } else if (daysSinceLastOrder >= avgPurchaseCycleDays * 1.4) {
      followUpStatus = 'OVERDUE';
    } else if (daysSinceLastOrder >= avgPurchaseCycleDays * 0.9) {
      followUpStatus = 'DUE';
    } else {
      followUpStatus = 'OK';
    }

    return {
      id,
      name: c.name,
      phone: c.phone,
      totalSpending,
      totalOrders,
      billCount,
      firstOrderDate,
      lastOrderDate,
      favoriteProducts,
      avgPurchaseCycleDays,
      daysSinceLastOrder,
      followUpStatus,
    };
  }).sort((a, b) => b.totalSpending - a.totalSpending);
}

export interface RuleRewardBreakdown {
  ruleId: string;
  ruleName: string;
  matchedDescription?: string;
  productName: string;
  ruleType: string;
  matchedQuantity: number;
  matchedRevenue: number;
  isQualified: boolean;
  earnedAmount: number;
  potentialAmount: number; // จำนวนเงินรางวัลที่คำนวณได้ก่อนตรวจสอบเงื่อนไข % ยอดรวม
  rewardRate: number;
  targetQuantity?: number;
  targetRevenue?: number;
  requiredTargetPercent?: number; // % ยอดรวมของเป้าหมายที่ต้องทำให้ถึง เช่น 80%
  isTargetAchieved: boolean; // ยอดขายรวมบรรลุเกณฑ์ % หรือยัง
  targetGateMessage?: string; // ข้อความสรุปสถานะการปลดล็อค
}

export function computeCommission(
  sales: SaleItem[],
  currentMonth: number,
  currentYear: number,
  config: CommissionConfig,
  gallonRules: GallonIncentiveRule[]
) {
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const monthSales = sales.filter((s) => s.date.slice(0, 7) === monthKey);

  const totalSalesAmount = monthSales.reduce((acc, s) => acc + s.total, 0);
  const totalQuantity = monthSales.reduce((acc, s) => acc + s.quantity, 0);
  const target = config.monthlyTarget || 500000;
  const mainTable = (config.tiers || []).map((t) => ({ pct: t.achievementPercent, amt: t.rewardAmount })).sort((a, b) => a.pct - b.pct);
  const effectiveMainTable = mainTable.length ? mainTable : LEGACY_MAIN_TABLE;
  const specialTable = config.legacySpecialTable?.length ? config.legacySpecialTable.slice().sort((a, b) => a.pct - b.pct) : LEGACY_SPECIAL_TABLE;
  const perHeadTable = config.legacyPerHeadTable?.length ? config.legacyPerHeadTable.slice().sort((a, b) => b.min - a.min) : LEGACY_PERHEAD_TABLE;
  const gallonGatePercent = typeof config.minTargetAchievementForGallon === 'number' ? config.minTargetAchievementForGallon : GATE_PERCENT;
  const legacy = calcLegacyCommission(target, totalSalesAmount, config.headcount, { mainTable: effectiveMainTable, specialTable, perHeadTable });
  const achievementPercent = legacy.pct;

  const activeTier = [...effectiveMainTable].reverse().find((t) => achievementPercent >= t.pct);
  const nextLegacyTier = effectiveMainTable.find((t) => t.pct > achievementPercent);
  const nextTier = nextLegacyTier
    ? { achievementPercent: nextLegacyTier.pct, rewardAmount: nextLegacyTier.amt }
    : undefined;

  let gallonSubtotal = 0;
  const ruleBreakdowns: RuleRewardBreakdown[] = [];
  const activeRules = gallonRules.filter((r) => r.enabled && (r.ruleType === 'per_unit' || r.ruleType === 'lump_sum_qty'));

  const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
  const matchesSelection = (value: unknown, selected?: string[]) => {
    if (!selected || selected.length === 0 || selected.includes('__ALL__')) return true;
    return selected.some((item) => normalize(item) === normalize(value));
  };

  activeRules.forEach((rule) => {
    // Product name is mandatory for matching; matching is exact, case-insensitive, trimmed.
    if (!rule.productName || !rule.productName.trim()) return;
    const productName = normalize(rule.productName);
    const matchingSales = monthSales.filter((sale) => {
      if (normalize(sale.productName) !== productName) return false;
      if (rule.sku && normalize(sale.sku) !== normalize(rule.sku)) return false;
      if (!matchesSelection(sale.size, rule.selectedSizes ?? (rule.size ? [rule.size] : undefined))) return false;
      if (!matchesSelection(sale.base, rule.selectedBases ?? (rule.base ? [rule.base] : undefined))) return false;
      if (!matchesSelection(sale.filmColor, rule.selectedFilmColors)) return false;
      if (!matchesSelection(sale.colorCode, rule.selectedColorCodes)) return false;
      return true;
    });

    const matchedQuantity = matchingSales.reduce((acc, s) => acc + s.quantity, 0);
    const matchedRevenue = matchingSales.reduce((acc, s) => acc + s.total, 0);
    let potentialAmount = 0;
    let matchedDescription = '';

    if (rule.ruleType === 'per_unit') {
      potentialAmount = matchedQuantity * rule.reward;
      matchedDescription = `ถังละ ฿${rule.reward.toLocaleString()} ทุกชิ้นที่ขายได้`;
    } else {
      const minQty = rule.minQuantity ?? 0;
      if (minQty > 0) potentialAmount = Math.floor(matchedQuantity / minQty) * rule.reward;
      matchedDescription = minQty > 0
        ? `ครบ ${minQty} ถัง รับเงินก้อน ฿${rule.reward.toLocaleString()}`
        : 'กำหนดจำนวนขั้นต่ำต่อชุดไม่ถูกต้อง';
    }

    const isTargetAchieved = achievementPercent >= gallonGatePercent;
    const earnedAmount = isTargetAchieved ? potentialAmount : 0;
    const isQualified = matchedQuantity > 0 && potentialAmount > 0 && isTargetAchieved;
    const gapToUnlock = Math.max(0, Math.ceil((target * gallonGatePercent) / 100 - totalSalesAmount));
    const targetGateMessage = isTargetAchieved
      ? `ผ่านเกณฑ์ยอดรวม ${gallonGatePercent}% ของเป้าแล้ว`
      : `ต้องได้ยอดรวมถึง ${gallonGatePercent}% ของเป้า ขาดอีก ฿${gapToUnlock.toLocaleString()}`;

    gallonSubtotal += potentialAmount;
    ruleBreakdowns.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matchedDescription,
      productName: rule.productName,
      ruleType: rule.ruleType,
      matchedQuantity,
      matchedRevenue,
      isQualified,
      earnedAmount,
      potentialAmount,
      rewardRate: rule.reward,
      targetQuantity: rule.minQuantity,
      requiredTargetPercent: gallonGatePercent,
      isTargetAchieved,
      targetGateMessage,
    });
  });

  const gallonPayout = calcGallonPayout(gallonSubtotal, legacy.headcount);
  const gallonIncentiveTotal = achievementPercent >= gallonGatePercent ? gallonPayout.paidTotal : 0;
  const gallonIncentivePotentialTotal = gallonPayout.paidTotal;
  const gallonCapApplied = gallonPayout.perPersonRaw > GALLON_CAP_PER_PERSON;
  const globalTargetPercent = gallonGatePercent;
  const isGallonTargetUnlocked = achievementPercent >= gallonGatePercent;
  const gapToGallonUnlock = Math.max(0, Math.ceil((target * gallonGatePercent) / 100 - totalSalesAmount));
  const grandTotalCommission = legacy.main + legacy.special + legacy.perHead + gallonIncentiveTotal;

  return {
    monthSalesCount: monthSales.length,
    totalSalesAmount,
    totalQuantity,
    target,
    achievementPercent,
    gap: Math.max(0, target - totalSalesAmount),
    surplus: Math.max(0, totalSalesAmount - target),
    mainCommission: legacy.main,
    activeTierPercent: activeTier?.pct ?? 0,
    nextTier,
    specialCommission: legacy.special,
    perHeadCommission: legacy.perHead,
    headcount: legacy.headcount,
    salesPerHead: legacy.perPersonSales,
    gallonIncentiveTotal,
    gallonIncentivePotentialTotal,
    gallonSubtotal,
    gallonPerPersonRaw: gallonPayout.perPersonRaw,
    gallonPerPersonCapped: gallonPayout.perPersonCapped,
    gallonCapApplied,
    isGallonTargetUnlocked,
    globalTargetPercent,
    gapToGallonUnlock,
    ruleBreakdowns,
    grandTotalCommission,
  };
}
