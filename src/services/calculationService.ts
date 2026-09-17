import { SaleItem, StockInRecord, ProductConfig, StockItemComputed, CustomerCRM, FollowUpStatus, CommissionConfig, GallonIncentiveRule, SizeOption } from '../types';

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
  rewardRate: number;
  targetQuantity?: number;
  targetRevenue?: number;
}

export function computeCommission(
  sales: SaleItem[],
  currentMonth: number,
  currentYear: number,
  config: CommissionConfig,
  gallonRules: GallonIncentiveRule[]
) {
  // Filter sales for the specific month/year
  const monthSales = sales.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSalesAmount = monthSales.reduce((acc, s) => acc + s.total, 0);
  const totalQuantity = monthSales.reduce((acc, s) => acc + s.quantity, 0);
  const target = config.monthlyTarget || 500000;
  const achievementPercent = target > 0 ? (totalSalesAmount / target) * 100 : 0;

  // 1. Main Step Commission from highest achieved tier (ยอดขายกี่ % ได้เงินเท่าไหร่)
  let mainCommission = 0;
  let activeTierPercent = 0;
  const sortedTiers = [...config.tiers].sort((a, b) => a.achievementPercent - b.achievementPercent);
  for (const tier of sortedTiers) {
    if (achievementPercent >= tier.achievementPercent) {
      mainCommission = tier.rewardAmount;
      activeTierPercent = tier.achievementPercent;
    }
  }

  // Next tier to motivate PC
  const nextTier = sortedTiers.find((t) => t.achievementPercent > achievementPercent);

  // 2. Special Commission Bands
  let specialCommission = 0;
  for (const band of config.specialBands) {
    if (totalSalesAmount >= band.minSales && totalSalesAmount <= band.maxSales) {
      specialCommission += band.rewardAmount;
    }
  }

  // 3. Per Head Commission
  const headcount = Math.max(1, config.headcount);
  const salesPerHead = Math.round(totalSalesAmount / headcount);
  const perHeadCommission = headcount * (config.rewardPerHead || 1500);

  // 4. เงินรางวัลพิเศษรายชิ้น (Product-specific Incentive Engine)
  let gallonIncentiveTotal = 0;
  const ruleBreakdowns: RuleRewardBreakdown[] = [];

  const activeRules = gallonRules.filter((r) => r.enabled);

  activeRules.forEach((rule) => {
    // Filter matching sales for this rule
    const matchingSales = monthSales.filter((sale) => {
      // 1. Match Product Name (if specified)
      if (rule.productName && rule.productName.trim() !== '') {
        const p1 = (sale.productName || '').toLowerCase().trim();
        const p2 = rule.productName.toLowerCase().trim();
        if (!p1.includes(p2) && !p2.includes(p1)) return false;
      }

      // 2. Match SKU (if specified)
      if (rule.sku && sale.sku !== rule.sku) return false;

      // 3. Match Sizes (if specified)
      if (Array.isArray(rule.selectedSizes) && rule.selectedSizes.length > 0) {
        if (!sale.size || !rule.selectedSizes.includes(sale.size)) return false;
      } else if (rule.size && sale.size !== rule.size) {
        return false;
      }

      // 4. Match Bases (if specified)
      if (Array.isArray(rule.selectedBases) && rule.selectedBases.length > 0) {
        if (!sale.base || !rule.selectedBases.includes(sale.base)) return false;
      } else if (rule.base && sale.base !== rule.base) {
        return false;
      }

      // 5. Match Film Colors (if specified)
      if (Array.isArray(rule.selectedFilmColors) && rule.selectedFilmColors.length > 0) {
        if (!sale.filmColor || !rule.selectedFilmColors.includes(sale.filmColor)) return false;
      }

      // 6. Match Color Codes (if specified)
      if (Array.isArray(rule.selectedColorCodes) && rule.selectedColorCodes.length > 0) {
        if (!sale.colorCode || !rule.selectedColorCodes.includes(sale.colorCode)) return false;
      }

      return true;
    });

    const matchedQuantity = matchingSales.reduce((acc, s) => acc + s.quantity, 0);
    const matchedRevenue = matchingSales.reduce((acc, s) => acc + s.total, 0);

    let earnedAmount = 0;
    let isQualified = false;
    let matchedDescription = 'จ่ายเงินรางวัลรายถัง';

    if (rule.ruleType === 'per_unit') {
      // จ่ายรายถังทันที เช่น ถังละ 50 บาท
      earnedAmount = matchedQuantity * rule.reward;
      isQualified = matchedQuantity > 0;
      matchedDescription = `ถังละ ฿${rule.reward.toLocaleString()} ทุกชิ้นที่ขายได้`;
    } else if (rule.ruleType === 'lump_sum_qty') {
      // ขายรวมกันให้ได้ X ถัง ถึงจะจ่าย Y บาท (เช่น ครบ 4 ถัง จ่าย 200)
      const minQty = rule.minQuantity || 1;
      const bundleCount = Math.floor(matchedQuantity / minQty);
      earnedAmount = bundleCount * rule.reward;
      isQualified = matchedQuantity >= minQty;
      matchedDescription = `ซื้อครบทุกๆ ${minQty} ถัง รับเงินก้อน ฿${rule.reward.toLocaleString()}`;
    } else if (rule.ruleType === 'threshold_revenue_per_bucket') {
      // ขายรวมกันได้ยอด X บาท ถึงจะจ่ายตามรายถังที่ขายไป ถังละ Y บาท
      const minRev = rule.minRevenue || 0;
      if (matchedRevenue >= minRev && minRev > 0) {
        earnedAmount = matchedQuantity * rule.reward;
        isQualified = true;
      } else {
        isQualified = false;
        earnedAmount = 0;
      }
      matchedDescription = `ยอดขายขั้นต่ำ ฿${minRev.toLocaleString()} (ได้ถังละ ฿${rule.reward})`;
    } else if (rule.ruleType === 'min_qty_per_unit') {
      const minQty = rule.minQuantity || 1;
      if (matchedQuantity >= minQty) {
        earnedAmount = rule.reward;
        isQualified = true;
      }
      matchedDescription = `ขายครบ ${minQty} ถัง รับ ฿${rule.reward.toLocaleString()}`;
    } else if (rule.ruleType === 'size_standard') {
      // Default standard size incentives
      matchingSales.forEach((s) => {
        const stdReward = s.size === '5GL' ? 50 : s.size === '2.5GL' ? 30 : s.size === '1GL' ? 15 : 5;
        earnedAmount += stdReward * s.quantity;
      });
      isQualified = matchedQuantity > 0;
      matchedDescription = `จ่ายตามขนาดบรรจุมาตรฐาน (5GL=50, 2.5GL=30, 1GL=15, 1/4GL=5)`;
    }

    gallonIncentiveTotal += earnedAmount;

    ruleBreakdowns.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matchedDescription,
      productName: rule.productName || 'สินค้าที่ร่วมรายการ',
      ruleType: rule.ruleType,
      matchedQuantity,
      matchedRevenue,
      isQualified,
      earnedAmount,
      rewardRate: rule.reward,
      targetQuantity: rule.minQuantity,
      targetRevenue: rule.minRevenue,
    });
  });

  const grandTotalCommission = mainCommission + specialCommission + perHeadCommission + gallonIncentiveTotal;

  return {
    monthSalesCount: monthSales.length,
    totalSalesAmount,
    totalQuantity,
    target,
    achievementPercent: Number(achievementPercent.toFixed(1)),
    gap: Math.max(0, target - totalSalesAmount),
    surplus: Math.max(0, totalSalesAmount - target),
    mainCommission,
    activeTierPercent,
    nextTier,
    specialCommission,
    perHeadCommission,
    headcount,
    salesPerHead,
    gallonIncentiveTotal,
    ruleBreakdowns,
    grandTotalCommission,
  };
}
