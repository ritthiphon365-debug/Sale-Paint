import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  Calendar,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SaleItem } from '../types';
import { exportSalesToExcel } from '../services/excelService';

export const HistoryView: React.FC = () => {
  const {
    sales,
    deleteSale,
    setModalOpen,
    syncWithGoogle,
    syncStatus,
    spreadsheetUrl,
    googleWebhookUrl,
    spreadsheetId,
    setActiveTab,
    openSpreadsheetViewer,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'month' | 'day'>('all');
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        (s.productName || '').toLowerCase().includes(q) ||
        (s.sku || '').toLowerCase().includes(q) ||
        (s.billId || '').toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(searchQuery));

      if (!matchQuery) return false;

      if (selectedMonth !== 'all') {
        return s.date.startsWith(selectedMonth);
      }
      return true;
    });
  }, [sales, searchQuery, selectedMonth]);

  // Aggregate statistics
  const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const billIds = new Set(filteredSales.map((s) => s.billId));
  const distinctBillsCount = billIds.size;

  const handleExportExcel = () => {
    exportSalesToExcel(filteredSales, `Sales_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            ประวัติการขายและส่งออกรายงาน
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            History & Export • ตรวจสอบรายการขายย้อนหลัง แก้ไขข้อมูล และส่งออก Excel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => syncWithGoogle(filteredSales)}
            disabled={syncStatus === 'syncing' || filteredSales.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            title="ส่งยอดขายชุดนี้เข้า Google Sheets ทันที"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'กำลังส่งข้อมูล...' : `ส่งเข้า Google Sheet (${filteredSales.length})`}</span>
          </button>
          {spreadsheetId && (
            <button
              onClick={openSpreadsheetViewer}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs md:text-sm font-semibold px-3 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="เปิดดูชีตยอดขายในแอป"
            >
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>ดูชีตในแอป</span>
            </button>
          )}
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs md:text-sm font-semibold px-3 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              title="เปิดดูไฟล์ Google Sheet ในแท็บใหม่"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดแท็บใหม่</span>
            </a>
          )}
          <button
            onClick={() => setModalOpen('import-sales')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            title="นำเข้าประวัติยอดขายจากแอปเดิมด้วยไฟล์ Excel"
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าประวัติ Excel</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ยอดขายรวม (Filtered Total)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ฿{totalAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">จากรายการทั้งหมดที่เลือก</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">จำนวนสินค้าทั้งหมด</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {totalQuantity.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1.5">หน่วย / ถัง</span>
          </div>
          <span className="text-[11px] text-slate-400">รวมทุกขนาดบรรจุภัณฑ์</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">จำนวนบิลขาย (Bill Count)</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {distinctBillsCount.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1.5">ใบเสร็จ</span>
          </div>
          <span className="text-[11px] text-slate-400">ยอดเฉลี่ย ฿{distinctBillsCount > 0 ? Math.round(totalAmount / distinctBillsCount).toLocaleString() : 0} / บิล</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า, SKU, รหัสบิล, ชื่อลูกค้า หรือเบอร์โทร..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
            />
          </div>

          {/* Month selector */}
          <div className="w-full sm:w-48">
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || 'all')}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 text-slate-700"
            />
          </div>

          {selectedMonth !== 'all' && (
            <button
              onClick={() => setSelectedMonth('all')}
              className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium"
            >
              ล้างตัวกรองเดือน
            </button>
          )}
        </div>
      </div>

      {/* Sales Table / Responsive Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <th className="py-3 px-4">วันที่ / บิล</th>
                <th className="py-3 px-4">ลูกค้า / ช่าง</th>
                <th className="py-3 px-4">สินค้า / สเปก</th>
                <th className="py-3 px-4 text-center">ขนาด & เบส</th>
                <th className="py-3 px-4 text-right">ราคา/หน่วย</th>
                <th className="py-3 px-4 text-center">จำนวน</th>
                <th className="py-3 px-4 text-right">ยอดรวม</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบรายการขายที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{s.date}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.billId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{s.customerName || '-'}</div>
                      <div className="text-[11px] text-slate-400">{s.customerPhone || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        SKU: {s.sku} {s.filmColor && `• ${s.filmColor}`} {s.colorCode && `[${s.colorCode}]`}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs">
                        {s.size}
                      </span>
                      {s.base && (
                        <span className="ml-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                          {s.base}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ฿{s.price.toLocaleString()}
                      {s.tintPrice > 0 && <span className="text-[10px] text-slate-400 block">+{s.tintPrice} แม่สี</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {s.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                      ฿{s.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => deleteSale(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่พบรายการขาย
            </div>
          ) : (
            filteredSales.map((s) => (
              <div key={s.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{s.billId}</span>
                  <span className="font-semibold text-slate-700">{s.date}</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.productName}</h3>
                    <p className="text-xs text-slate-500">
                      {s.size} {s.base ? `Base ${s.base}` : ''} {s.filmColor ? `• ${s.filmColor}` : ''} {s.colorCode ? `[${s.colorCode}]` : ''}
                    </p>
                    {s.customerName && (
                      <p className="text-xs text-rose-600 font-medium mt-1">
                        ลูกค้า: {s.customerName} {s.customerPhone ? `(${s.customerPhone})` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-slate-900">
                      ฿{s.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">{s.quantity} หน่วย</div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => deleteSale(s.id)}
                    className="text-xs text-rose-500 flex items-center gap-1 hover:underline p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบรายการ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
