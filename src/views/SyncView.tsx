import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Users,
  Clock,
  Copy,
  Download,
  Check,
  Code,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleSheetsService } from '../services/googleSheetsService';

export const SyncView: React.FC = () => {
  const {
    googleConnected,
    connectGoogle,
    disconnectGoogle,
    spreadsheetId,
    spreadsheetUrl,
    setSpreadsheetId,
    googleWebhookUrl,
    setGoogleWebhookUrl,
    autoSyncSheets,
    setAutoSyncSheets,
    unsyncedSaleCount,
    sales,
    syncWithGoogle,
    syncStatus,
    syncError,
    lastSyncTime,
    exportSalesToCsv,
    copySalesToClipboard,
    showToast,
  } = useApp();

  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);
  const [inputWebhookUrl, setInputWebhookUrl] = useState(googleWebhookUrl);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [showScriptDetails, setShowScriptDetails] = useState(false);

  const handleSaveSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    setSpreadsheetId(inputSheetId.trim());
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleWebhookUrl(inputWebhookUrl.trim());
  };

  const handleCopyScript = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(GoogleSheetsService.APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      showToast('คัดลอกโค้ด Google Apps Script แล้ว! นำไปวางใน Extensions > Apps Script ได้เลย', 'success');
      setTimeout(() => setCopiedScript(false), 3000);
    }
  };

  const handleCopyTsv = async () => {
    await copySalesToClipboard();
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 3000);
  };

  const handleTestWebhook = async () => {
    if (!inputWebhookUrl && !googleWebhookUrl) {
      showToast('กรุณาระบุ Webhook URL ก่อนกดทดสอบ', 'error');
      return;
    }
    setIsTestingWebhook(true);
    try {
      const targetUrl = (inputWebhookUrl || googleWebhookUrl).trim();
      const testSale = {
        billId: `TEST-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        productName: 'ทดสอบการเชื่อมต่อ Google Sheets',
        brand: 'NIPPON PAINT',
        sku: 'TEST-001',
        size: '1GL',
        base: 'BASE A',
        filmColor: 'กึ่งเงา',
        colorCode: 'TEST-WHITE',
        price: 0,
        tintPrice: 0,
        quantity: 1,
        total: 0,
        customerName: 'ระบบทดสอบ',
        customerPhone: '-',
        salesperson: 'ทดสอบระบบ',
        salespersonEmail: 'test@example.com',
      };
      await GoogleSheetsService.pushSalesViaWebhook(targetUrl, [testSale]);
      showToast('ทดสอบส่งข้อมูลเข้า Google Sheets สำเร็จ! โปรดเปิดดูในไฟล์ Sheet ของคุณ', 'success');
    } catch (err: any) {
      showToast(`ทดสอบไม่ผ่าน: ${err.message || 'โปรดตรวจสอบสิทธิ์ของ Web App URL'}`, 'error');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const isConfigured = Boolean(googleWebhookUrl || spreadsheetId || googleConnected);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          การเชื่อมต่อ Google Sheets & Google Drive
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium">
          ระบบสำรองและส่งยอดขาย สต็อก และข้อมูล PC ไปยัง Google Spreadsheet แบบอัตโนมัติ Real-time
        </p>
      </div>

      {/* Main Status & Quick Sync Control */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  สถานะการซิงค์ Google Sheets
                </h2>
                {isConfigured ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมบันทึกยอด
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> ยังไม่ได้ตั้งค่าปลายทาง
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {googleWebhookUrl
                  ? 'เชื่อมต่อผ่าน Apps Script Webhook (ส่งยอดเข้าชีตทันทีทุกบิล)'
                  : spreadsheetId
                  ? `เชื่อมต่อกับ Spreadsheet ID: ${spreadsheetId.slice(0, 16)}...`
                  : 'กรุณาระบุ Webhook URL หรือ Spreadsheet ID ด้านล่างเพื่อให้ข้อมูลส่งเข้า Google Sheet ได้จริง'}
              </p>
            </div>
          </div>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs transition-colors border border-emerald-200 self-start sm:self-auto"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดดูไฟล์ Google Sheet</span>
            </a>
          )}
        </div>

        {/* Sync Summary & Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">ยอดขายทั้งหมดในแอป</span>
            <span className="text-lg font-bold text-slate-900">{sales.length} <span className="text-xs font-normal text-slate-400">รายการ</span></span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">รายการที่ยังไม่ส่ง</span>
            <span className={`text-lg font-bold ${unsyncedSaleCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {unsyncedSaleCount} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">ส่งยอดอัตโนมัติ (Auto-Sync)</span>
                <span className="text-xs font-semibold text-slate-800">
                  {autoSyncSheets ? 'เปิดใช้งาน (ส่งทันทีเมื่อเปิดบิล)' : 'ปิดไว้ (กดซิงค์ด้วยตนเอง)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoSyncSheets(!autoSyncSheets)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSyncSheets ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    autoSyncSheets ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => syncWithGoogle()}
            disabled={syncStatus === 'syncing' || sales.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'กำลังส่งข้อมูลเข้า Sheet...' : `ซิงค์ยอดขายทั้งหมด (${sales.length} รายการ)`}</span>
          </button>

          <button
            onClick={exportSalesToCsv}
            disabled={sales.length === 0}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="ดาวน์โหลดไฟล์ CSV เพื่อเปิดใน Google Sheets หรือ Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>ดาวน์โหลด CSV สำหรับ Sheets</span>
          </button>

          <button
            onClick={handleCopyTsv}
            disabled={sales.length === 0}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="คัดลอกตารางยอดขายเพื่อกด Ctrl+V วางใน Google Sheet ทันที"
          >
            {copiedTsv ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copiedTsv ? 'คัดลอกแล้ว!' : 'คัดลอกไปวาง (Ctrl+V)'}</span>
          </button>
        </div>

        {/* Sync status feedback */}
        {lastSyncTime && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>ส่งข้อมูลไปยัง Google Sheets ครั้งล่าสุดเมื่อ: <strong>{lastSyncTime}</strong></span>
          </div>
        )}

        {syncError && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2 border border-rose-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Option 1: Google Apps Script Webhook (Recommended for PC & Retail) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900">
                  วิธีที่ 1: Google Apps Script Webhook
                </h2>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200">
                  แนะนำสำหรับพนักงาน PC ใช้งานง่ายที่สุด 100%
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                ไม่ต้องตั้งค่า OAuth ให้ยุ่งยาก ไม่มีวันหมดอายุ ข้อมูลทุกบิลส่งตรงเข้า Google Sheet ของคุณทันที
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveWebhook} className="space-y-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Google Apps Script Webhook URL (เว็บแอป)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={inputWebhookUrl}
                onChange={(e) => setInputWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
              >
                บันทึก Webhook
              </button>
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-pulse' : ''}`} />
                <span>{isTestingWebhook ? 'กำลังทดสอบ...' : 'ทดสอบส่ง'}</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              * ดูวิธีติดตั้งสคริปต์ลง Google Sheet ด้านล่าง (ทำครั้งเดียว ใช้ได้ตลอดชีพ)
            </span>
          </div>
        </form>

        {/* Step-by-Step Apps Script Setup Guide */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowScriptDetails(!showScriptDetails)}
            className="flex items-center justify-between w-full text-left font-semibold text-slate-800 hover:text-emerald-700 text-xs py-1"
          >
            <span className="flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-600" />
              <span>วิธีนำโค้ดไปใส่ใน Google Sheet ของคุณ (ใช้เวลา 1 นาที)</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {showScriptDetails ? 'ซ่อนคำแนะนำ' : 'แสดงคำแนะนำและโค้ด'}
            </span>
          </button>

          {showScriptDetails && (
            <div className="mt-3 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-xs leading-relaxed">
                <li>เปิดไฟล์ Google Sheet ของคุณ (สร้างใหม่หรือใช้ไฟล์เดิม)</li>
                <li>ไปที่เมนูด้านบน: <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                <li>ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดด้านล่างนี้ลงไป</li>
                <li>กดปุ่มสีน้ำเงินด้านขวาบน: <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong></li>
                <li>เลือกประเภทเฟือง ⚙️ เป็น <strong>เว็บแอป (Web app)</strong></li>
                <li>ตั้งค่าสำคัญ 2 จุด:
                  <ul className="list-disc list-inside ml-4 mt-1 text-slate-600 font-medium">
                    <li>เรียกใช้ในฐานะ (Execute as): <strong>Me (บัญชีของฉัน)</strong></li>
                    <li>ผู้มีสิทธิ์เข้าถึง (Who has access): <strong>Anyone (ทุกคน)</strong></li>
                  </ul>
                </li>
                <li>กด <strong>การทำให้ใช้งานได้ (Deploy)</strong> แล้วคัดลอก <strong>URL เว็บแอป</strong> มาวางในช่องด้านบน</li>
              </ol>

              <div className="relative pt-2">
                <div className="flex items-center justify-between pb-1.5">
                  <span className="font-semibold text-slate-700 text-[11px]">โค้ด Google Apps Script (พร้อมใช้งาน):</span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {GoogleSheetsService.APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Option 2: Direct Google Spreadsheet ID / URL */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              วิธีที่ 2: ระบุ Google Spreadsheet ID หรือ URL เต็ม
            </h2>
            <p className="text-slate-500 text-[11px]">
              ใส่ลิงก์ชีตเพื่อให้แอปสร้างปุ่มลัดเปิดดูไฟล์ Sheet ได้โดยตรงใน 1 คลิก
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSheetId} className="space-y-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Google Spreadsheet ID หรือ URL เต็มของไฟล์ชีต
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputSheetId}
                onChange={(e) => setInputSheetId(e.target.value)}
                placeholder="เช่น https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
              >
                บันทึก ID
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              * วาง URL ทั้งหมดจากเบราว์เซอร์ได้ทันที ระบบจะแยก Spreadsheet ID ให้อัตโนมัติ
            </span>
          </div>
        </form>

        {spreadsheetUrl && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
            <span className="text-indigo-900 font-medium text-xs">
              ไฟล์ชีตที่ผูกอยู่: <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[11px]">{spreadsheetId}</code>
            </span>
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
            >
              เปิดไฟล์ <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Multi-PC Shared Google Spreadsheet Explanation Card */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 rounded-3xl p-6 border border-indigo-100/80 shadow-xs space-y-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              การใช้งานร่วมกันหลายคน (พนักงาน PC 2 คนขึ้นไป บันทึกลง Sheet เดียวกัน)
            </h3>
            <p className="text-[11px] text-slate-500">
              พนักงานทุกคนเปิดแอปบนเครื่องตัวเอง แล้วนำ Webhook URL หรือ Sheet ID ชุดเดียวกันไปใส่
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">1</span>
              สร้างไฟล์ Sheet กลาง
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ผู้จัดการหรือหัวหน้า PC สร้าง Google Sheet 1 ไฟล์ พร้อมติดตั้ง Webhook 1 ครั้ง
            </p>
          </div>

          <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">2</span>
              แชร์ Webhook URL ให้ทีม
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ส่ง Webhook URL ให้พนักงานทุกคนนำไปวางในหน้า <strong>ซิงค์ข้อมูล</strong> บนเครื่องของตน
            </p>
          </div>

          <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-[10px]">3</span>
              บันทึกแยกชื่อผู้ขายอัตโนมัติ
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              เมื่อพนักงานคนใดบันทึกบิล ยอดขายจะวิ่งไปต่อท้ายในชีตทันที พร้อมระบุชื่อและอีเมล PC กำกับไว้ทุกบรรทัด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
