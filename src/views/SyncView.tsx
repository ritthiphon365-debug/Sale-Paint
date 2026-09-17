import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SyncView: React.FC = () => {
  const {
    googleConnected,
    connectGoogle,
    disconnectGoogle,
    spreadsheetId,
    setSpreadsheetId,
    syncWithGoogle,
    syncStatus,
    syncError,
    lastSyncTime,
  } = useApp();

  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);

  const handleSaveSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    setSpreadsheetId(inputSheetId.trim());
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-600" />
          การเชื่อมต่อ Google Sheets & Google Drive
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium">
          Cloud Integration • สำรองและซิงค์ข้อมูลการขาย สต็อก และลูกค้าขึ้น Google Spreadsheet แบบสองทาง (Bi-directional)
        </p>
      </div>

      {/* Connection Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                สถานะการเชื่อมต่อบัญชี Google
              </h2>
              <p className="text-xs text-slate-500">
                สิทธิ์การเข้าถึง: Google Sheets API & Google Drive
              </p>
            </div>
          </div>

          <div>
            {googleConnected ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> เชื่อมต่อแล้ว
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                ยังไม่ได้เชื่อมต่อ
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2">
          {googleConnected ? (
            <div className="flex items-center gap-3">
              <button
                onClick={syncWithGoogle}
                disabled={syncStatus === 'syncing'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'กำลังซิงค์...' : 'กดซิงค์ข้อมูลทันที'}</span>
              </button>
              <button
                onClick={disconnectGoogle}
                className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors font-medium"
              >
                ตัดการเชื่อมต่อ (Sign out)
              </button>
            </div>
          ) : (
            <button
              onClick={connectGoogle}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Cloud className="w-4 h-4" />
              <span>เข้าสู่ระบบด้วย Google (OAuth 2.0)</span>
            </button>
          )}
        </div>

        {/* Sync logs */}
        {lastSyncTime && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>ซิงค์ข้อมูลล่าสุดเมื่อ: {new Date(lastSyncTime).toLocaleString('th-TH')}</span>
          </div>
        )}

        {syncError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Spreadsheet ID Configuration */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-xs">
        <h2 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
          ตั้งค่า Google Spreadsheet ปลายทาง
        </h2>

        <form onSubmit={handleSaveSheetId} className="space-y-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Google Spreadsheet ID หรือ URL เต็ม
            </label>
            <input
              type="text"
              value={inputSheetId}
              onChange={(e) => setInputSheetId(e.target.value)}
              placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              * ดูได้จาก URL ของ Google Sheet ในเบราว์เซอร์ของคุณ (หลัง /d/ และก่อน /edit)
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              บันทึก Sheet ID
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
