import React, { useMemo } from 'react';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  Users,
  Package,
  Calendar,
  ChevronRight,
  PlusCircle,
  FileText,
  Clock,
  Sparkles,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaintBucketVisualizer } from '../components/PaintBucketVisualizer';

export const DashboardView: React.FC = () => {
  const {
    sales,
    computedStock,
    customers,
    commissionConfig,
    computedCommission,
    catalogItems,
    setActiveTab,
    setModalOpen,
  } = useApp();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysPassed = now.getDate();
  const daysRemaining = Math.max(0, daysInMonth - daysPassed);

  // Month sales calculations
  const monthSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });
  }, [sales, currentMonth, currentYear]);

  const currentSalesTotal = monthSales.reduce((acc, s) => acc + s.total, 0);
  const totalUnitsSold = monthSales.reduce((acc, s) => acc + s.quantity, 0);
  const target = commissionConfig.monthlyTarget || 500000;
  const achievementPercent = target > 0 ? (currentSalesTotal / target) * 100 : 0;
  const targetGap = Math.max(0, target - currentSalesTotal);

  // Pace calculations
  const dailyPace = daysPassed > 0 ? currentSalesTotal / daysPassed : 0;
  const expectedMonthEndSales = dailyPace * daysInMonth;
  const requiredDailyPace = daysRemaining > 0 ? targetGap / daysRemaining : 0;

  // Action Center Items
  const lowStockItems = computedStock.filter((s) => s.isLowStock || s.isOversold);
  const overdueCustomers = customers.filter(
    (c) => c.followUpStatus === 'DUE' || c.followUpStatus === 'OVERDUE'
  );

  // Recent 6 sales
  const recentSales = useMemo(() => {
    return [...sales].slice(0, 6);
  }, [sales]);

  return (
    <div id="dashboard-view" className="space-y-6 pb-24">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>COMMAND CENTER • แดชบอร์ดภาพรวมการขาย</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              ภาพรวมยอดขายประจำเดือน {now.toLocaleString('th-TH', { month: 'long' })} {currentYear + 543}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              ดำเนินงานมาแล้ว {daysPassed} วัน • เหลืออีก {daysRemaining} วันในการพิชิตเป้าหมาย
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('sales-entry')}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-900/40 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>บันทึกการขายด่วน</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>ฐานข้อมูลสินค้า ({catalogItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('commission')}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>คอมมิชชั่น</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEATURE 1: ANIMATED 3D PAINT BUCKET FILL VISUALIZER */}
      <PaintBucketVisualizer
        currentSales={currentSalesTotal}
        targetSales={target}
        achievementPercent={achievementPercent}
        gap={targetGap}
        expectedMonthEndSales={expectedMonthEndSales}
        daysRemaining={daysRemaining}
        onEditTarget={() => setModalOpen('target-manage')}
      />

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Sales */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">ยอดขายจริงเดือนนี้</span>
            <ShoppingBag className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            ฿{currentSalesTotal.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            เฉลี่ยวันละ ฿{Math.round(dailyPace).toLocaleString()}
          </div>
        </div>

        {/* KPI 2: Total Commission Earned */}
        <div
          onClick={() => setActiveTab('commission')}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-2 cursor-pointer hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">คอมมิชชั่นรวมที่ได้</span>
            <Award className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            ฿{computedCommission.grandTotalCommission.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>รวม 4 ส่วน (Tier+แกลลอน)</span>
            <span className="text-rose-600 font-bold flex items-center text-[11px]">
              ดูรายละเอียด <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 3: Units Sold */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">จำนวนถังที่ขายได้</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {totalUnitsSold.toLocaleString()} <span className="text-sm font-normal text-slate-400">ถัง</span>
          </div>
          <div className="text-xs text-slate-500">
            นับรวมทุกขนาดบรรจุ (5GL, 2.5GL, 1GL)
          </div>
        </div>

        {/* KPI 4: Required Pace */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">สปีดยอดขายที่ต้องทำต่อวัน</span>
            <Target className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {targetGap > 0 ? `฿${Math.round(requiredDailyPace).toLocaleString()}` : 'บรรลุแล้ว ✨'}
          </div>
          <div className="text-xs text-slate-500">
            {targetGap > 0 ? `เหลือเวลาอีก ${daysRemaining} วัน` : 'เกินเป้าหมายการขายประจำเดือนแล้ว'}
          </div>
        </div>
      </div>

      {/* Action Alerts & Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900">
                แจ้งเตือนสต็อกสินค้าเหลือน้อย ({lowStockItems.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('stock')}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              เปิดดูคลังสินค้า →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <p className="text-xs text-emerald-600 font-medium py-2">
              ✓ สต็อกสินค้าทุกรายการอยู่ในระดับปลอดภัย
            </p>
          ) : (
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item, idx) => {
                const itemKey = `${item.productId}_${item.size}_${item.base || 'NONE'}_${idx}`;
                return (
                  <div
                    key={itemKey}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 text-xs border border-amber-100"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-slate-500">{item.size} {item.base ? `• Base ${item.base}` : ''} • SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-700">คงเหลือ {item.remainingStock} ถัง</span>
                      <button
                        onClick={() => setActiveTab('stock')}
                        className="block text-[11px] text-rose-600 font-semibold underline mt-0.5"
                      >
                        เติมสต็อก
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Follow-up Reminder */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900">
                ติดตามลูกค้า & ช่างประจำ ({overdueCustomers.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('customers')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              เปิดดู CRM →
            </button>
          </div>

          {overdueCustomers.length === 0 ? (
            <p className="text-xs text-emerald-600 font-medium py-2">
              ✓ ไม่มีรายการลูกค้าค้างติดตามในวันนี้
            </p>
          ) : (
            <div className="space-y-2">
              {overdueCustomers.slice(0, 3).map((c, idx) => (
                <div
                  key={c.id || `cust-${c.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 text-xs border border-indigo-100"
                >
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-slate-500">โทร: {c.phone || '-'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-rose-600">ถึงกำหนดติดตาม</span>
                    {c.phone && c.phone !== '-' && (
                      <a
                        href={`tel:${c.phone}`}
                        className="block text-[11px] text-indigo-600 font-bold underline mt-0.5"
                      >
                        โทรทันที
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Activity Feed */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            รายการขายล่าสุด
          </h3>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            ดูรายงานทั้งหมด →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentSales.map((s, idx) => (
            <div key={s.id || `recent-sale-${idx}`} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900">{s.productName}</p>
                <p className="text-xs text-slate-500">
                  {s.size} {s.base && `• Base ${s.base}`} {s.colorCode && `• [${s.colorCode}]`} • ลูกค้า:{' '}
                  {s.customerName || 'ทั่วไป'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 font-mono">฿{s.total.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400">{s.quantity} ถัง</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
