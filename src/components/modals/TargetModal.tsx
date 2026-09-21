import React, { useState } from 'react';
import {
  X,
  Target,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TargetModal: React.FC = () => {
  const { modalOpen, setModalOpen, commissionConfig, updateCommissionConfig, activeMonth, updateYearTarget } = useApp();
  const [monthlyTarget, setMonthlyTarget] = useState(commissionConfig.monthlyTarget);
  const [headcount, setHeadcount] = useState(commissionConfig.headcount);

  if (modalOpen !== 'target-manage') return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Keep the Dashboard target and the Commission target source in sync.
    // CommissionView resolves its monthly target from yearTargets first.
    const [yearStr, monthStr] = activeMonth.split('-');
    const targetYear = Number(yearStr);
    const targetMonth = Number(monthStr);

    if (Number.isFinite(targetYear) && Number.isFinite(targetMonth) && targetMonth >= 1 && targetMonth <= 12) {
      updateYearTarget(targetMonth, targetYear, monthlyTarget);
    }

    updateCommissionConfig({
      ...commissionConfig,
      monthlyTarget,
      headcount,
    });
    setModalOpen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              ตั้งค่าเป้าหมายการขาย (Target Settings)
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              เป้าหมายยอดขายประจำเดือน (THB)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(Number(e.target.value) || 0)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-rose-600"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              จำนวนพนักงานขาย (คน)
            </label>
            <input
              type="number"
              min="1"
              value={headcount}
              onChange={(e) => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>เป้าเฉลี่ยต่อพนักงาน:</span>
              <span className="font-bold text-slate-800">
                ฿{headcount > 0 ? Math.round(monthlyTarget / headcount).toLocaleString() : 0} / คน
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกเป้าหมาย</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
