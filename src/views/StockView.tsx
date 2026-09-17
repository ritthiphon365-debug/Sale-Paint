import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowDown,
  ArrowUp,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportStockToExcel } from '../services/excelService';

export const StockView: React.FC = () => {
  const { computedStock, adjustStockQuick, setModalOpen } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOW' | 'OVERSOLD'>('ALL');

  // Filter items
  const filteredStock = useMemo(() => {
    return computedStock.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        (item.productName || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.size || '').toLowerCase().includes(q) ||
        (item.base && item.base.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (filterType === 'LOW') return item.isLowStock && !item.isOversold;
      if (filterType === 'OVERSOLD') return item.isOversold;
      return true;
    });
  }, [computedStock, searchQuery, filterType]);

  // Aggregates
  const totalStockUnits = computedStock.reduce((acc, i) => acc + Math.max(0, i.remainingStock), 0);
  const totalStockValue = computedStock.reduce((acc, i) => acc + i.totalValue, 0);
  const lowStockCount = computedStock.filter((i) => i.isLowStock && !i.isOversold).length;
  const oversoldCount = computedStock.filter((i) => i.isOversold).length;

  const handleExport = () => {
    exportStockToExcel(computedStock, `Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            คลังสินค้าและสต็อกคงเหลือ
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Inventory Management • คำนวณสต็อกเรียลไทม์ (Initial + In - Sold) พร้อมระบบวิเคราะห์สต็อกต่ำ 14 วัน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalOpen('bulk-stock')}
            className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เติมสต็อก (Bulk Stock In)</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ยอดคงเหลือรวม</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {totalStockUnits.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">หน่วย</span>
          </div>
          <span className="text-[11px] text-slate-400">ทุกขนาดและทุกเบสรวมกัน</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">มูลค่าสินค้าในสต็อก</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ฿{totalStockValue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">คำนวณตามราคาตั้งขาย</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">สินค้าสต็อกต่ำ (Low Stock)</span>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {lowStockCount}
            <span className="text-xs font-normal text-slate-400 ml-1">รายการ</span>
          </div>
          <span className="text-[11px] text-slate-400">เหลือขายได้ ≤ 3 วัน</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">สต็อกติดลบ (Oversold)</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {oversoldCount}
            <span className="text-xs font-normal text-slate-400 ml-1">รายการ</span>
          </div>
          <span className="text-[11px] text-slate-400">ต้องเร่งสั่งซื้อเข้าด่วน</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า, SKU, ขนาด หรือ Base..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ทั้งหมด ({computedStock.length})
            </button>
            <button
              onClick={() => setFilterType('LOW')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === 'LOW'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
              }`}
            >
              สต็อกต่ำ ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterType('OVERSOLD')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === 'OVERSOLD'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
              }`}
            >
              ติดลบ/ค้างส่ง ({oversoldCount})
            </button>
          </div>
        </div>
      </div>

      {/* Inventory List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <th className="py-3 px-4">สินค้า / SKU</th>
                <th className="py-3 px-3 text-center">ขนาด & เบส</th>
                <th className="py-3 px-3 text-center">ตั้งต้น</th>
                <th className="py-3 px-3 text-center">รับเข้า (+)</th>
                <th className="py-3 px-3 text-center">ขายไปแล้ว (-)</th>
                <th className="py-3 px-4 text-center">คงเหลือสุทธิ</th>
                <th className="py-3 px-4 text-center">ขายเฉลี่ย (14 วัน)</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">ปรับสต็อกด่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-400">SKU: {item.sku}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      {item.size}
                    </span>
                    {item.base && (
                      <span className="ml-1 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                        {item.base}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">{item.initialStock}</td>
                  <td className="py-3 px-3 text-center text-emerald-600 font-semibold">+{item.stockIn}</td>
                  <td className="py-3 px-3 text-center text-rose-600 font-semibold">-{item.soldQuantity}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                        item.remainingStock < 0
                          ? 'bg-rose-100 text-rose-700'
                          : item.remainingStock <= 3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.remainingStock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="font-medium text-slate-700">{item.avgDailySales14d} / วัน</div>
                    <div className="text-[10px] text-slate-400">
                      {item.daysLeft === 999 ? 'เพียงพอ' : `เหลืออีก ~${item.daysLeft} วัน`}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.isOversold ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                        Oversold
                      </span>
                    ) : item.isLowStock ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-full">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => adjustStockQuick(item.productId, item.size, item.base, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-700 font-bold flex items-center justify-center text-xs active:scale-90"
                        title="ลด 1 หน่วย (-1)"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjustStockQuick(item.productId, item.size, item.base, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-bold flex items-center justify-center text-xs active:scale-90"
                        title="เพิ่ม 1 หน่วย (+1)"
                      >
                        +1
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
