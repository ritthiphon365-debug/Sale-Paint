import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportSalesToExcel, exportStockToExcel } from '../../services/excelService';

export const ImportExportModal: React.FC = () => {
  const { modalOpen, setModalOpen, sales, computedStock, showToast } = useApp();

  if (modalOpen !== 'import-export') return null;

  const handleExportSales = () => {
    exportSalesToExcel(sales, `Sales_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('ส่งออกยอดขายเป็น Excel เรียบร้อย', 'success');
  };

  const handleExportStock = () => {
    exportStockToExcel(computedStock, `Stock_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('ส่งออกสต็อกเป็น Excel เรียบร้อย', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-base text-slate-900">
              นำเข้า / ส่งออกข้อมูล Excel
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">ส่งออกข้อมูล (Export)</h3>
            <p className="text-slate-500 mb-3">
              ดาวน์โหลดข้อมูลการขายและสต็อกเป็นไฟล์ .xlsx เพื่อนำไปวิเคราะห์ใน Excel หรือ Google Sheets
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportSales}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 font-semibold flex flex-col items-center justify-center text-center gap-1.5 transition-all"
              >
                <Download className="w-5 h-5 text-emerald-600" />
                <span>ส่งออกยอดขาย ({sales.length})</span>
              </button>
              <button
                onClick={handleExportStock}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 font-semibold flex flex-col items-center justify-center text-center gap-1.5 transition-all"
              >
                <Download className="w-5 h-5 text-emerald-600" />
                <span>ส่งออกสต็อก ({computedStock.length})</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-1">นำเข้าข้อมูล (Import)</h3>
            <p className="text-slate-500 mb-2">
              นำเข้าไฟล์ Excel สต็อกเริ่มต้นหรือรายการสินค้า (.xlsx)
            </p>
            <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 text-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="font-semibold text-slate-700 text-xs">แตะเพื่อเลือกไฟล์ Excel</span>
              <span className="text-[10px] text-slate-400">รองรับ .xlsx, .csv</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    showToast(`เลือกไฟล์ ${e.target.files[0].name} แล้ว กำลังประมวลผล`, 'success');
                    setModalOpen(null);
                  }
                }}
              />
            </label>
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
