import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Award,
  BarChart3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const YearlyView: React.FC = () => {
  const { sales, yearTargets } = useApp();
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const monthNames = [
    'มกราคม (Jan)',
    'กุมภาพันธ์ (Feb)',
    'มีนาคม (Mar)',
    'เมษายน (Apr)',
    'พฤษภาคม (May)',
    'มิถุนายน (Jun)',
    'กรกฎาคม (Jul)',
    'สิงหาคม (Aug)',
    'กันยายน (Sep)',
    'ตุลาคม (Oct)',
    'พฤศจิกายน (Nov)',
    'ธันวาคม (Dec)',
  ];

  // Aggregate monthly stats
  const monthlyData = monthNames.map((name, idx) => {
    const monthIndex = idx + 1;
    const targetObj = yearTargets.find((t) => t.month === monthIndex && t.year === selectedYear);
    const target = targetObj?.target || 500000;

    const monthSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === monthIndex;
    });

    const salesTotal = monthSales.reduce((acc, s) => acc + s.total, 0);
    const quantity = monthSales.reduce((acc, s) => acc + s.quantity, 0);
    const achievement = target > 0 ? ((salesTotal / target) * 100).toFixed(1) : '0.0';

    return {
      monthIndex,
      name,
      target,
      sales: salesTotal,
      quantity,
      achievement: Number(achievement),
    };
  });

  const yearTotalSales = monthlyData.reduce((acc, m) => acc + m.sales, 0);
  const yearTotalTarget = monthlyData.reduce((acc, m) => acc + m.target, 0);
  const yearTotalQuantity = monthlyData.reduce((acc, m) => acc + m.quantity, 0);

  // Best month
  const bestMonth = [...monthlyData].sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with year picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            ภาพรวมยอดขายรายปี (Yearly Overview)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Annual Summary • ตรวจสอบผลงาน 12 เดือน เปรียบเทียบเป้าหมายและหายอดขายสูงสุด
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-slate-900 px-3">
            พ.ศ. {selectedYear + 543} ({selectedYear})
          </span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Year Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ยอดขายรวมทั้งปี (Year Total)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ฿{yearTotalSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">จากเป้า ฿{yearTotalTarget.toLocaleString()}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">เป้าหมายรวมทั้งปี (Annual Target)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ฿{yearTotalTarget.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">12 เดือนรวมกัน</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">จำนวนชิ้นที่ขายได้</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {yearTotalQuantity.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">หน่วย</span>
          </div>
          <span className="text-[11px] text-slate-400">ทุกขนาดบรรจุภัณฑ์</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">เดือนที่ทำยอดสูงสุด (Best Month)</span>
          <div className="text-xl font-bold text-rose-600 mt-1 truncate">
            {bestMonth ? bestMonth.name.split(' ')[0] : '-'}
          </div>
          <span className="text-[11px] text-slate-400">
            ฿{bestMonth?.sales.toLocaleString() || 0}
          </span>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-base text-slate-900">
          ตารางแจกแจงผลงานรายเดือน (Monthly Breakdown)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold">
                <th className="py-3 px-4">เดือน</th>
                <th className="py-3 px-4 text-right">ยอดขายจริง (Sales)</th>
                <th className="py-3 px-4 text-right">เป้าหมาย (Target)</th>
                <th className="py-3 px-4 text-center">ความสำเร็จ (% Achieved)</th>
                <th className="py-3 px-4 text-center">จำนวนที่ขาย (Qty)</th>
                <th className="py-3 px-4">แถบความคืบหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((m) => (
                <tr key={m.monthIndex} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                    {m.name}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                    ฿{m.sales.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                    ฿{m.target.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        m.achievement >= 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.achievement >= 80
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.achievement}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600">
                    {m.quantity} ชิ้น
                  </td>
                  <td className="py-3.5 px-4 w-48">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.achievement >= 100
                            ? 'bg-emerald-500'
                            : m.achievement >= 80
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, m.achievement)}%` }}
                      />
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
