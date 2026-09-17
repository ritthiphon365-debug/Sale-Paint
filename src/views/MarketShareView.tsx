import React, { useState } from 'react';
import {
  PieChart,
  Calendar,
  Save,
  Camera,
  FileSpreadsheet,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MarketShareRecord } from '../types';

export const MarketShareView: React.FC = () => {
  const {
    marketShareDaily,
    saveMarketShareDaily,
    marketShareWeekly,
    saveMarketShareWeekly,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Current active daily record
  const currentDaily = marketShareDaily.find((r) => r.date === dailyDate) || {
    id: `mks-d-${dailyDate}`,
    mode: 'daily',
    date: dailyDate,
    brandEntries: [
      { brandName: 'NIPPON PAINT', pcCount: 2, targetSales: 25000, actualSales: 28000, note: '' },
      { brandName: 'TOA', pcCount: 2, targetSales: 30000, actualSales: 29500, note: '' },
      { brandName: 'JOTUN', pcCount: 1, targetSales: 15000, actualSales: 13000, note: '' },
      { brandName: 'DULUX', pcCount: 1, targetSales: 10000, actualSales: 8500, note: '' },
      { brandName: 'BEGER', pcCount: 1, targetSales: 10000, actualSales: 11200, note: '' },
    ],
    updatedAt: new Date().toISOString(),
  };

  const [brandEntries, setBrandEntries] = useState(currentDaily.brandEntries);

  const handleBrandChange = (index: number, field: string, value: any) => {
    const updated = [...brandEntries];
    updated[index] = { ...updated[index], [field]: value };
    setBrandEntries(updated);
  };

  const handleSaveDaily = () => {
    const record: MarketShareRecord = {
      id: `mks-d-${dailyDate}`,
      mode: 'daily',
      date: dailyDate,
      brandEntries,
      updatedAt: new Date().toISOString(),
    };
    saveMarketShareDaily(record);
  };

  const totalMarketSales = brandEntries.reduce((acc, b) => acc + (Number(b.actualSales) || 0), 0);
  const nipponSales = brandEntries.find((b) => b.brandName === 'NIPPON PAINT')?.actualSales || 0;
  const nipponShare = totalMarketSales > 0 ? ((nipponSales / totalMarketSales) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            ส่วนแบ่งการตลาด (Market Share / MKS)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            MKS Intelligence • บันทึกเปรียบเทียบยอดขายและ PC หน้าลานระหว่างแบรนด์ (Daily & Weekly)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDaily}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกข้อมูล MKS</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ยอดขายรวมทุกแบรนด์หน้าลาน</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ฿{totalMarketSales.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">ในวันที่เลือก ({dailyDate})</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ส่วนแบ่ง Nippon Paint (% Share)</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {nipponShare}%
          </div>
          <span className="text-[11px] text-slate-400">฿{nipponSales.toLocaleString()}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">เลือกวันที่ต้องการตรวจสอบ</span>
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            className="mt-1 w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* MKS Input Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-base text-slate-900">
            ตารางเปรียบเทียบยอดขายคู่แข่งประจำวัน ({dailyDate})
          </h2>
          <span className="text-xs text-slate-400">กรอกตัวเลขและกดบันทึก</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold">
                <th className="py-3 px-4">แบรนด์ (Brand)</th>
                <th className="py-3 px-4 text-center">จำนวน PC</th>
                <th className="py-3 px-4 text-right">เป้าขาย (THB)</th>
                <th className="py-3 px-4 text-right">ยอดขายจริง (THB)</th>
                <th className="py-3 px-4 text-center">ส่วนแบ่ง %</th>
                <th className="py-3 px-4">หมายเหตุ / สถานการณ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brandEntries.map((b, idx) => {
                const sharePct = totalMarketSales > 0 ? ((b.actualSales / totalMarketSales) * 100).toFixed(1) : '0.0';
                const isNippon = (b.brandName || '').includes('NIPPON');

                return (
                  <tr key={idx} className={isNippon ? 'bg-rose-50/50 font-semibold' : ''}>
                    <td className="py-3 px-4">
                      <div className="text-sm font-bold text-slate-900">{b.brandName}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={b.pcCount ?? ''}
                        onChange={(e) => handleBrandChange(idx, 'pcCount', parseInt(e.target.value) || 0)}
                        className="w-14 text-center p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={b.targetSales || ''}
                        onChange={(e) => handleBrandChange(idx, 'targetSales', parseInt(e.target.value) || 0)}
                        className="w-28 text-right p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={b.actualSales || ''}
                        onChange={(e) => handleBrandChange(idx, 'actualSales', parseInt(e.target.value) || 0)}
                        className="w-28 text-right p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {sharePct}%
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={b.note || ''}
                        onChange={(e) => handleBrandChange(idx, 'note', e.target.value)}
                        placeholder="เช่น ช่างเข้า, โค้ดส่วนลด..."
                        className="w-full p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
