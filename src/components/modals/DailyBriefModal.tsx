import React, { useMemo } from 'react';
import {
  X,
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  Package,
  Award,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DailyBriefModal: React.FC = () => {
  const { modalOpen, setModalOpen, sales, computedStock, computedCommission, commissionConfig } = useApp();

  if (modalOpen !== 'daily-brief') return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const todaySales = useMemo(() => {
    return sales.filter((s) => s.date === todayStr);
  }, [sales, todayStr]);

  const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todayQty = todaySales.reduce((acc, s) => acc + s.quantity, 0);
  const uniqueCustomers = new Set(todaySales.map((s) => s.customerName || 'ทั่วไป')).size;

  const lowStockCount = computedStock.filter((s) => s.isLowStock || s.isOversold).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="font-bold text-base">สรุปผลงานประจำวัน (Daily Brief)</h2>
              <span className="text-[11px] text-slate-400">วันที่ {todayStr}</span>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Main metric */}
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
            <span className="text-rose-600 font-semibold text-xs block mb-1">ยอดขายวันนี้ (Today's Sales)</span>
            <div className="text-3xl font-extrabold text-rose-700">
              ฿{todayTotal.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-500 mt-1">
              ขายได้ทั้งหมด {todayQty} ชิ้น • ลูกค้า {uniqueCustomers} ราย
            </div>
          </div>

          {/* Highlights grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[11px] block">ยอดสะสมเดือนนี้</span>
              <span className="font-bold text-slate-900 text-base">
                ฿{computedCommission.totalSalesAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {computedCommission.achievementPercent}% ของเป้า
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-400 text-[11px] block">แจ้งเตือนสต็อกต่ำ</span>
              <span className={`font-bold text-base ${lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {lowStockCount} รายการ
              </span>
              <span className="text-[10px] text-slate-500 block">
                {lowStockCount > 0 ? 'ควรเติมสต็อกด่วน' : 'สต็อกพร้อมขาย'}
              </span>
            </div>
          </div>

          {/* Today's Transactions list */}
          <div>
            <span className="font-bold text-slate-800 block mb-2">รายการที่ขายได้วันนี้:</span>
            {todaySales.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                ยังไม่มีรายการขายในวันนี้
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {todaySales.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-slate-400">
                        {item.size} • {item.quantity} ถัง • {item.customerName || 'ทั่วไป'}
                      </div>
                    </div>
                    <span className="font-bold text-slate-800">฿{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setModalOpen(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
