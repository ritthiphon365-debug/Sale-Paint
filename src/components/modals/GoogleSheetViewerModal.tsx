import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  X,
  Cloud,
  CheckCircle2,
  Download,
  Share2,
  Copy,
  Info,
  Table,
  Eye,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const GoogleSheetViewerModal: React.FC = () => {
  const {
    modalOpen,
    closeSpreadsheetViewer,
    spreadsheetId,
    spreadsheetName,
    spreadsheetUrl,
    lastSyncTime,
    pullSalesFromGoogleSheet,
    showToast,
    sales,
    syncedSaleIds,
    unsyncedSaleCount,
    syncWithGoogle,
    syncStatus,
    setActiveTab,
  } = useApp();

  const [isPulling, setIsPulling] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'iframe'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  if (modalOpen !== 'google-sheet-viewer') return null;

  const targetUrl = spreadsheetUrl || (spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '');
  const embedUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview` : '';

  const handleOpenNewTab = () => {
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = () => {
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      showToast('คัดลอกลิงก์ Google Sheet เรียบร้อยแล้ว', 'success');
    }
  };

  const handlePullSales = async () => {
    setIsPulling(true);
    try {
      await pullSalesFromGoogleSheet();
    } catch (e) {
      // Error handled in AppContext
    } finally {
      setIsPulling(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncWithGoogle();
    } catch (e) {
      // handled
    }
  };

  const syncedSet = new Set(syncedSaleIds || []);

  const filteredSales = sales.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.billId && s.billId.toLowerCase().includes(term)) ||
      (s.productName && s.productName.toLowerCase().includes(term)) ||
      (s.customerName && s.customerName.toLowerCase().includes(term)) ||
      (s.salesperson && s.salesperson.toLowerCase().includes(term))
    );
  });

  return (
    <div
      id="google-sheet-viewer-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="google-sheet-viewer-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {spreadsheetName || 'Google Spreadsheet ของคุณ'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Cloud className="w-3 h-3" />
                  Real-time Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                ID: {spreadsheetId || 'ไม่ได้เชื่อมต่อ'} • ซิงค์ล่าสุด: {lastSyncTime || 'ยังไม่มีการซิงค์'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="sheet-viewer-refresh-btn"
              onClick={() => setIframeKey((prev) => prev + 1)}
              title="รีเฟรชการแสดงผล"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              id="sheet-viewer-pull-btn"
              onClick={handlePullSales}
              disabled={isPulling}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>{isPulling ? 'กำลังดึงยอด...' : 'ดึงยอดล่าสุดมาเครื่องนี้'}</span>
            </button>
            <button
              id="sheet-viewer-open-tab-btn"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดใน Google Sheets แท็บใหม่</span>
            </button>
            <button
              id="sheet-viewer-close-btn"
              onClick={closeSpreadsheetViewer}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Toolbar & Tab Switcher */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800 p-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>ตารางยอดขาย (Sales_Transactions)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {sales.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode('iframe')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'iframe'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>พรีวิวชีตจริง</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-200 hover:underline font-medium px-2 py-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอกลิงก์ชีต</span>
            </button>
            <button
              onClick={() => {
                closeSpreadsheetViewer();
                setActiveTab('sheets-sync');
              }}
              className="text-slate-600 dark:text-slate-400 hover:underline px-2 py-1"
            >
              ตั้งค่า / สลับสเปรดชีต
            </button>
          </div>
        </div>

        {/* Essential Tab Guidance Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>สำคัญมาก:</strong> เมื่อเปิด Google Sheet ให้คลิกดูแท็บด้านล่างชื่อ <span className="underline font-bold bg-amber-200/70 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">Sales_Transactions</span> (ยอดขายทั้งหมดจะถูกบันทึกไว้ในแท็บนี้ ไม่ได้อยู่ใน Sheet1)
            </span>
          </div>
          {unsyncedSaleCount > 0 && (
            <button
              onClick={handleSyncNow}
              disabled={syncStatus === 'syncing'}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1 transition-all disabled:opacity-50 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'กำลังส่งยอด...' : `กดส่งยอดค้าง (${unsyncedSaleCount} รายการ) เข้า Google Sheet ทันที`}</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex flex-col">
          {viewMode === 'table' ? (
            <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3">
              {/* Table search & Quick Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาตามเลขบิล, ชื่อสินค้า, ลูกค้า, ผู้ขาย..."
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 max-w-full"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ล้างค้นหา
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    แสดง {filteredSales.length} จาก {sales.length} รายการ
                  </span>
                  {unsyncedSaleCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                      ค้างส่งชีต: {unsyncedSaleCount} รายการ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ส่งครบทุกบิลแล้ว
                    </span>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    ไม่พบรายการขายที่ตรงกับเงื่อนไข
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">เลขที่บิล (Bill ID)</th>
                        <th className="py-2.5 px-3">วันที่</th>
                        <th className="py-2.5 px-3">สินค้า</th>
                        <th className="py-2.5 px-3">ขนาด</th>
                        <th className="py-2.5 px-3">จำนวน</th>
                        <th className="py-2.5 px-3 text-right">ยอดรวม (฿)</th>
                        <th className="py-2.5 px-3">ลูกค้า</th>
                        <th className="py-2.5 px-3">พนักงาน</th>
                        <th className="py-2.5 px-3 text-center">สถานะ Google Sheet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSales.map((item) => {
                        const isSynced = syncedSet.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                              {item.billId || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {item.size || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ฿{item.total.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                              {item.customerName || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 truncate max-w-[100px]">
                              {item.salesperson || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isSynced ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ลงชีตแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  รอดำเนินการ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom Quick Sync Action */}
              {unsyncedSaleCount > 0 && (
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>มียอดขายใหม่ที่ยังไม่ได้ส่งเข้า Google Sheet จำนวน <strong>{unsyncedSaleCount} รายการ</strong></span>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={syncStatus === 'syncing'}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{syncStatus === 'syncing' ? 'กำลังส่งข้อมูล...' : 'ส่งยอดคงค้างเข้า Google Sheet ทันที'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : spreadsheetId ? (
            <>
              <iframe
                key={iframeKey}
                src={embedUrl}
                title="Google Sheet Preview"
                className="w-full h-full border-0"
                allow="clipboard-write"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-200 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-700/60 flex items-center gap-3 text-xs">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>เปิดดูแบบเต็มจอและคลิกแท็บ <strong>Sales_Transactions</strong>:</span>
                <button
                  onClick={handleOpenNewTab}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  เปิดเต็มจอ
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FileSpreadsheet className="w-16 h-16 text-slate-400 mb-4" />
              <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                ยังไม่ได้เชื่อมต่อ Google Sheet
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                กรุณาเลือกหรือสร้าง Google Sheet ในหน้าซิงค์ข้อมูล เพื่อให้สามารถเปิดดูและลงยอดขายแบบ Real-time ได้
              </p>
              <button
                onClick={() => {
                  closeSpreadsheetViewer();
                  setActiveTab('sheets-sync');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
              >
                ไปที่หน้าซิงค์ข้อมูลเพื่อเลือกสเปรดชีต
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
