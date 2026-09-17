import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Edit2,
  X,
  CheckCircle2,
  Sparkles,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const YearlyView: React.FC = () => {
  const { sales, yearTargets, updateYearTarget } = useApp();
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Edit Target Modal state
  const [editingMonth, setEditingMonth] = useState<{
    monthIndex: number;
    name: string;
    target: number;
    sales: number;
  } | null>(null);
  const [targetInput, setTargetInput] = useState<number>(500000);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

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

  const handleOpenEdit = (m: { monthIndex: number; name: string; target: number; sales: number }) => {
    setEditingMonth(m);
    setTargetInput(m.target);
    setApplyToAll(false);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonth) return;
    updateYearTarget(editingMonth.monthIndex, selectedYear, targetInput, applyToAll);
    setEditingMonth(null);
  };

  const quickPresets = [300000, 400000, 500000, 600000, 750000, 1000000];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with year picker & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            ภาพรวมยอดขายรายปี (Yearly Overview)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Annual Summary • ตรวจสอบผลงาน 12 เดือน ปรับเปลี่ยนเป้าหมายรายเดือน และหายอดขายสูงสุด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              title="ปีก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-base text-slate-900 px-3">
              พ.ศ. {selectedYear + 543} ({selectedYear})
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              title="ปีถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Year Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ยอดขายรวมทั้งปี (Year Total)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            ฿{yearTotalSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">จากเป้า ฿{yearTotalTarget.toLocaleString()}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">เป้าหมายรวมทั้งปี (Annual Target)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
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
          <span className="text-[11px] text-slate-400 font-mono">
            ฿{bestMonth?.sales.toLocaleString() || 0}
          </span>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h2 className="font-bold text-base text-slate-900">
              ตารางแจกแจงผลงานและเป้าหมายรายเดือน (Monthly Breakdown)
            </h2>
            <p className="text-xs text-slate-500">
              กดปุ่ม <span className="font-semibold text-rose-600">"แก้ไขเป้า"</span> หรือคลิกที่ตัวเลขเป้าหมายเพื่อปรับเปลี่ยนเป้าของเดือนนั้นๆ ได้ทันที
            </p>
          </div>
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
                <th className="py-3 px-4 text-center">จัดการเป้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((m) => (
                <tr key={m.monthIndex} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 text-sm">
                    {m.name}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                    ฿{m.sales.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="font-mono text-slate-700 hover:text-rose-600 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer group"
                      title={`คลิกเพื่อแก้ไขเป้าหมายเดือน ${m.name}`}
                    >
                      <span>฿{m.target.toLocaleString()}</span>
                      <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-mono ${
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
                  <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                    {m.quantity} ชิ้น
                  </td>
                  <td className="py-3.5 px-4 w-44">
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
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs transition-all border border-slate-200 hover:border-rose-200 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>แก้ไขเป้า</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Month Target Modal */}
      {editingMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">
                  แก้ไขเป้าหมายการขาย (Monthly Target)
                </h3>
              </div>
              <button
                onClick={() => setEditingMonth(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-5 space-y-4 text-xs">
              {/* Target info card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">เดือนที่เลือก:</div>
                <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>{editingMonth.name}</span>
                  <span className="text-xs font-normal text-slate-500">
                    พ.ศ. {selectedYear + 543} ({selectedYear})
                  </span>
                </div>
                <div className="text-xs text-slate-600 pt-1 flex items-center justify-between border-t border-slate-200/60 mt-2">
                  <span>ยอดขายจริงปัจจุบัน:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    ฿{editingMonth.sales.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Target Input */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  เป้าหมายยอดขายใหม่ (บาท)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    ฿
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={targetInput}
                    onChange={(e) => setTargetInput(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-rose-600 font-mono focus:bg-white focus:outline-rose-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
                  หรือเลือกค่าด่วน (Quick Presets):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetInput(preset)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all border ${
                        targetInput === preset
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      ฿{(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox: Apply to all months */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50/60 border border-rose-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs text-slate-700">
                  <div className="font-bold text-rose-900">
                    นำเป้าหมายนี้ไปใช้กับทุกเดือนในปี {selectedYear + 543}
                  </div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    ตั้งค่าให้ทั้ง 12 เดือนมีเป้าหมาย ฿{targetInput.toLocaleString()} เท่ากันทั้งหมด
                  </div>
                </div>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMonth(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกเป้าหมาย</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
