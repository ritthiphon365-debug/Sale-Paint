import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  parseSalesHistoryExcel,
  downloadSampleSalesExcel,
  ParseSalesResult,
} from '../../services/excelService';

export const ImportSalesModal: React.FC = () => {
  const { modalOpen, setModalOpen, importSalesHistory, sales } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParseSalesResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (modalOpen !== 'import-sales') return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    setParsedData(null);

    try {
      const result = await parseSalesHistoryExcel(selectedFile);
      setParsedData(result);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + (err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'));
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.items.length === 0) return;

    if (importMode === 'replace') {
      const confirmReplace = window.confirm(
        `คุณเลือก "แทนที่ประวัติทั้งหมด" ยอดขายเดิมจำนวน ${sales.length} รายการในแอพจะถูกลบและแทนที่ด้วย ${parsedData.items.length} รายการจากไฟล์นี้ ยืนยันหรือไม่?`
      );
      if (!confirmReplace) return;
    }

    importSalesHistory(parsedData.items, importMode);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setParsing(false);
    setImportMode('append');
    setModalOpen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                นำเข้าประวัติยอดขายจากแอปเดิม (Import Sales History)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                นำเข้าไฟล์ Excel (.xlsx, .xls, .csv) เพื่อดึงข้อมูลประวัติการขายย้อนหลังเข้าสู่ระบบอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Instructions and Download Template Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-900 text-xs block">
                  ระบบตรวจจับหัวคอลัมน์อัตโนมัติ (Smart Column Mapping)
                </span>
                <span className="text-[11px] text-blue-700">
                  รองรับหัวตารางภาษาไทยและอังกฤษ (วันที่, เลขที่บิล, ชื่อสินค้า, SKU, ขนาด, เบส, ฟิล์มสี, ราคา, จำนวน, ยอดรวม, ลูกค้า)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleSalesExcel}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100/60 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area */}
          {!parsedData && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />

              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                  <span className="font-bold text-sm text-slate-800">
                    กำลังอ่านและประมวลผลไฟล์ Excel...
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ระบบกำลังตรวจสอบคอลัมน์ วันที่ และคำนวณยอดขายย้อนหลัง
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base text-slate-800 block">
                      ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                    </span>
                    <span className="text-slate-400 text-xs mt-0.5 block">
                      รองรับไฟล์ประวัติการขาย .xlsx, .xls และ .csv จากแอปเดิม
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
                      .XLSX
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
                      .XLS
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
                      .CSV
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedData && (
            <div className="space-y-4 animate-fade-in">
              {/* File Info & Re-select */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      {file?.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ตรวจพบ {parsedData.rawCount.toLocaleString()} แถวข้อมูล • แปลงสำเร็จ {parsedData.items.length.toLocaleString()} รายการ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
                >
                  เลือกไฟล์ใหม่
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">จำนวนรายการขาย</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
                    {parsedData.items.length.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">รายการ</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">ยอดขายรวมในไฟล์</span>
                  <div className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
                    ฿{parsedData.totalRevenue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">บาท (THB)</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">ปริมาณสินค้ารวม</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
                    {parsedData.totalQuantity.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">ชิ้น / ถัง</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">ช่วงเวลาข้อมูล</span>
                  <div className="text-xs font-bold text-slate-900 mt-1 font-mono truncate">
                    {parsedData.earliestDate || '-'} ถึง {parsedData.latestDate || '-'}
                  </div>
                  <span className="text-[10px] text-slate-400">วัน/เดือน/ปี</span>
                </div>
              </div>

              {/* Errors or Warnings */}
              {parsedData.errors.length > 0 && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>แจ้งเตือนข้อผิดพลาดบางรายการ ({parsedData.errors.length} รายการ):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-amber-800 pr-1">
                    {parsedData.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                    {parsedData.errors.length > 5 && (
                      <div className="text-amber-600 font-semibold">
                        ...และอีก {parsedData.errors.length - 5} รายการ
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Mode Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 block text-xs">
                  เลือกรูปแบบการนำเข้าข้อมูล (Import Mode):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-white border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        ➕ นำเข้าเพิ่มต่อจากเดิม (Append)
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                        เก็บยอดขายเดิม {sales.length} รายการไว้ และเพิ่มยอดขายใหม่ต่อท้าย (ข้ามรายการซ้ำให้อัตโนมัติ)
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-white border-rose-500 shadow-2xs ring-2 ring-rose-500/20'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-rose-700 block text-xs">
                        🔄 แทนที่ประวัติทั้งหมด (Replace)
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                        ล้างยอดขายเดิมในเครื่องทั้งหมด แล้วใช้ข้อมูลจากไฟล์ Excel นี้แทนที่ทั้งหมด
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table (First 5 records) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    ตัวอย่างข้อมูล 5 รายการแรกที่จะถูกนำเข้า (Data Preview):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    แสดง 5 จาก {parsedData.items.length} รายการ
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2.5 px-3 whitespace-nowrap">วันที่</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">เลขที่บิล</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ชื่อสินค้า / SKU</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">ขนาด</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">เบส/ฟิล์ม</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">จำนวน</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ยอดรวม (บาท)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ลูกค้า/ช่าง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.items.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700">
                            {item.date}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-500">
                            {item.billId}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap font-mono font-semibold">
                            {item.size}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap text-slate-500">
                            {item.base || '-'} / {item.filmColor || '-'}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600">
                            ฿{item.total.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                            {item.customerName || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                importMode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                ยืนยันนำเข้า {parsedData.items.length.toLocaleString()} รายการ ({importMode === 'replace' ? 'แทนที่ทั้งหมด' : 'เพิ่มต่อท้าย'})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
