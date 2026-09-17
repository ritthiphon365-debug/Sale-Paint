import React from 'react';
import {
  Sparkles,
  Calendar,
  Award,
  TrendingUp,
  X,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WeeklyReviewModal: React.FC = () => {
  const { modalOpen, setModalOpen, sales, computedStock, computedCommission } = useApp();

  if (modalOpen !== 'weekly-review') return null;

  // Calculate 7-day sales
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const weeklySales = sales.filter((s) => s.date >= sevenDaysAgoStr);
  const weeklyTotal = weeklySales.reduce((acc, s) => acc + s.total, 0);
  const weeklyQty = weeklySales.reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">สรุปผลงาน 7 วันล่าสุด (Weekly Review)</h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200/60 p-4 rounded-2xl text-center">
            <span className="text-amber-800 font-semibold block mb-1">ยอดขายรอบ 7 วันที่ผ่านมา</span>
            <div className="text-3xl font-extrabold text-slate-900">
              ฿{weeklyTotal.toLocaleString()}
            </div>
            <span className="text-slate-500 mt-1 block">ขายได้ {weeklyQty} ชิ้น</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">ยอดขายเฉลี่ยต่อวัน:</span>
              <span className="font-bold text-slate-900">฿{Math.round(weeklyTotal / 7).toLocaleString()} / วัน</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">คอมมิชชั่นสะสมเดือนนี้:</span>
              <span className="font-bold text-amber-600">฿{computedCommission.grandTotalCommission.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setModalOpen(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
