import React, { useState, useEffect } from 'react';
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
  Share2,
  Link2,
  Globe,
  FolderOpen,
  PlusCircle,
  Database,
  Smartphone,
  Laptop,
  LogIn,
  LogOut,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleSheetsService } from '../services/googleSheetsService';

export const SyncView: React.FC = () => {
  const {
    googleConnected,
    connectGoogle,
    disconnectGoogle,
    spreadsheetId,
    spreadsheetName,
    spreadsheetUrl,
    setSpreadsheetId,
    googleWebhookUrl,
    setGoogleWebhookUrl,
    autoSyncSheets,
    setAutoSyncSheets,
    unsyncedSaleCount,
    sales,
    customers,
    catalogItems,
    computedStock,
    computedCommission,
    syncWithGoogle,
    syncAllTabsToGoogle,
    exportAllTabsToExcel,
    openSpreadsheet,
    openSpreadsheetViewer,
    syncStatus,
    syncError,
    lastSyncTime,
    exportSalesToCsv,
    copySalesToClipboard,
    showToast,
    isGoogleOAuthConnected,
    connectGoogleOAuth,
    disconnectGoogleOAuth,
    driveSpreadsheets,
    isLoadingDriveFiles,
    loadDriveSpreadsheets,
    cloudSpreadsheetInfo,
    selectSpreadsheet,
    createNewCloudSpreadsheet,
    pullSalesFromGoogleSheet,
  } = useApp();

  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);
  const [inputWebhookUrl, setInputWebhookUrl] = useState(googleWebhookUrl);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [showScriptDetails, setShowScriptDetails] = useState(false);

  // Real-time Multi-Device & Google Drive states
  const [isPullingSales, setIsPullingSales] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [searchDriveQuery, setSearchDriveQuery] = useState('');
  const [newSheetTitleInput, setNewSheetTitleInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      await connectGoogleOAuth();
      setShowDrivePicker(true);
    } catch (e) {
      // handled
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handlePullSales = async () => {
    setIsPullingSales(true);
    try {
      await pullSalesFromGoogleSheet();
    } catch (e) {
      // handled
    } finally {
      setIsPullingSales(false);
    }
  };

  const handleCreateNewSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSheet(true);
    try {
      if (!isGoogleOAuthConnected && !GoogleSheetsService.isTokenValid()) {
        await connectGoogleOAuth();
      }
      await createNewCloudSpreadsheet(newSheetTitleInput.trim() || undefined);
      setShowCreateModal(false);
      setNewSheetTitleInput('');
    } catch (e) {
      // handled with toast in createNewCloudSpreadsheet
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Synchronize local input state whenever Cloud or Context updates
  useEffect(() => {
    setInputSheetId(spreadsheetId);
  }, [spreadsheetId]);

  useEffect(() => {
    setInputWebhookUrl(googleWebhookUrl);
  }, [googleWebhookUrl]);

  const handleSaveSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    setSpreadsheetId(inputSheetId.trim());
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleWebhookUrl(inputWebhookUrl.trim());
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = new URL(window.location.origin + window.location.pathname);
      if (googleWebhookUrl) url.searchParams.set('webhook', googleWebhookUrl);
      if (spreadsheetId) url.searchParams.set('sheetId', spreadsheetId);
      navigator.clipboard.writeText(url.toString());
      setCopiedShareLink(true);
      showToast('คัดลอกลิงก์พร้อมการตั้งค่าแล้ว! สามารถส่งลิงก์นี้ให้เพื่อนร่วมงานเปิดใช้งานได้ทันที', 'success');
      setTimeout(() => setCopiedShareLink(false), 3000);
    }
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

      {/* Real-time Google Sheets & Multi-Device Shared Hub */}
      <div className="bg-white rounded-3xl p-5 md:p-7 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                  ระบบลงยอด Real-time & เชื่อมต่อ 2 เครื่อง (Shared Google Sheet)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" /> Real-time Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                บันทึกยอดขายในแอปแล้วส่งเข้า Google Sheet ทันทีแบบสดๆ พร้อมเปิดดูชีตได้ในคลิกเดียว และเมื่อเปิดแอปจากเครื่องอื่น สามารถกดเลือกสเปรดชีตเดียวกันเพื่อลงยอดขายต่อได้อย่างไร้รอยต่อ
              </p>
            </div>
          </div>

          {/* Google Account OAuth Status */}
          <div className="flex items-center gap-2 shrink-0">
            {isGoogleOAuthConnected ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-800">เชื่อมต่อบัญชี Google แล้ว</span>
                <button
                  onClick={disconnectGoogleOAuth}
                  className="text-slate-400 hover:text-rose-600 ml-1 transition-colors"
                  title="ยกเลิกการเชื่อมต่อบัญชี Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-xs border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 text-emerald-600" />
                <span>{isConnectingGoogle ? 'กำลังเปิด Google...' : 'เชื่อมต่อบัญชี Google (Drive & Sheets)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Spreadsheet Overview Card */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl p-4 md:p-5 border border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                สเปรดชีตที่กำลังใช้งานบันทึกยอดขณะนี้
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {spreadsheetName || (spreadsheetId ? `สเปรดชีต (${spreadsheetId.slice(0, 10)}...)` : 'ยังไม่ได้เลือกสเปรดชีต')}
                </h3>
                {spreadsheetId && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                    Active
                  </span>
                )}
              </div>
              {spreadsheetId ? (
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                  ID: {spreadsheetId}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">
                  * โปรดเลือกสเปรดชีตจาก Cloud, Google Drive หรือระบุ Spreadsheet ID ด้านล่างเพื่อเริ่มส่งยอด
                </p>
              )}
            </div>

            {/* Quick Actions for Active Sheet */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openSpreadsheetViewer}
                disabled={!spreadsheetId}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40"
              >
                <Eye className="w-4 h-4" />
                <span>เปิดดูชีตในแอป</span>
              </button>
              <button
                onClick={openSpreadsheet}
                disabled={!spreadsheetId}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs disabled:opacity-40"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <span>เปิดแท็บใหม่</span>
              </button>
              <button
                onClick={handlePullSales}
                disabled={!spreadsheetId || isPullingSales}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs disabled:opacity-40"
                title="ดึงยอดขายจาก Google Sheet มาอัปเดตลงเครื่องนี้"
              >
                <Download className={`w-4 h-4 text-slate-600 ${isPullingSales ? 'animate-bounce' : ''}`} />
                <span>{isPullingSales ? 'กำลังดึงยอด...' : 'ดึงยอดจากชีตมาเครื่องนี้'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Multi-Device Sync Indicator */}
          <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                เมื่อบันทึกบิลที่หน้าร้าน ระบบจะส่งยอดไปต่อท้ายในแท็บ <strong>Sales_Transactions</strong> บน Google Sheet อัตโนมัติทันที
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-slate-400 text-[11px]">
                ซิงค์ล่าสุด: {lastSyncTime}
              </span>
            )}
          </div>
        </div>

        {/* Multi-Device Shared Sheet: เครื่องที่ 2 เลือกใช้สเปรดชีตเดียวกัน */}
        {cloudSpreadsheetInfo && cloudSpreadsheetInfo.spreadsheetId && (
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-2xl p-4 md:p-5 border border-indigo-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      สเปรดชีตที่เปิดใช้งานอยู่จากเครื่องอื่น / Cloud Sync
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      ตรวจพบชีตกลาง
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {cloudSpreadsheetInfo.spreadsheetName || 'สเปรดชีตหลักของร้าน'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {cloudSpreadsheetInfo.spreadsheetId}
                  </p>
                </div>
              </div>

              {spreadsheetId === cloudSpreadsheetInfo.spreadsheetId ? (
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>เครื่องนี้เชื่อมต่อสเปรดชีตเดียวกันนี้อยู่แล้ว (ลงยอดต่อได้ทันที)</span>
                </div>
              ) : (
                <button
                  onClick={() => selectSpreadsheet(cloudSpreadsheetInfo.spreadsheetId, cloudSpreadsheetInfo.spreadsheetName)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
                >
                  <Database className="w-4 h-4" />
                  <span>กดเลือกสเปรดชีตเดียวกันนี้เพื่อลงยอดต่อ (เครื่องที่ 2)</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              * ข้อมูลสเปรดชีตนี้ถูกเชื่อมโยงผ่านระบบคลาวด์แบบ Real-time เมื่อเปิดใช้งานในเครื่องที่ 2 หรืออุปกรณ์อื่น เพียงกดปุ่มด้านบน แอปทั้ง 2 เครื่องจะลงยอดต่อในไฟล์เดียวกันทันที
            </p>
          </div>
        )}

        {/* Google Drive Spreadsheet Picker & Creator */}
        <div className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                <span>เลือกสเปรดชีตจาก Google Drive หรือสร้างไฟล์ใหม่</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกไฟล์สเปรดชีตที่มีอยู่แล้วใน Google Drive ของคุณ หรือกดสร้างไฟล์ใหม่พร้อม 5 แท็บ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setShowDrivePicker(!showDrivePicker);
                  if (!showDrivePicker && driveSpreadsheets.length === 0) {
                    loadDriveSpreadsheets();
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-xs border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                <span>{showDrivePicker ? 'ซ่อนรายชื่อ Drive' : 'เลือกจาก Google Drive ของฉัน'}</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>สร้างสเปรดชีตใหม่ (5 แท็บ)</span>
              </button>
            </div>
          </div>

          {/* Drive Spreadsheets List Dropdown Area */}
          {showDrivePicker && (
            <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchDriveQuery}
                    onChange={(e) => setSearchDriveQuery(e.target.value)}
                    placeholder="ค้นหาชื่อไฟล์สเปรดชีตใน Drive..."
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {searchDriveQuery && (
                    <button
                      onClick={() => setSearchDriveQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  onClick={() => loadDriveSpreadsheets()}
                  disabled={isLoadingDriveFiles}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                  <span>รีเฟรชไฟล์</span>
                </button>
              </div>

              {isLoadingDriveFiles ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>กำลังค้นหาสเปรดชีตใน Google Drive ของคุณ...</span>
                </div>
              ) : driveSpreadsheets.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200/80 p-4">
                  <p>ยังไม่พบไฟล์สเปรดชีตใน Google Drive หรือยังไม่ได้เชื่อมต่อสิทธิ์ Drive</p>
                  <button
                    onClick={handleConnectGoogle}
                    className="mt-2 text-emerald-600 hover:underline font-semibold"
                  >
                    กดเชื่อมต่อ Google Drive เพื่อค้นหาไฟล์
                  </button>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {driveSpreadsheets
                    .filter((f) => f.name.toLowerCase().includes(searchDriveQuery.toLowerCase()))
                    .map((file) => {
                      const isCurrent = spreadsheetId === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-xs text-slate-900 truncate">
                                {file.name}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                  ใช้อยู่ขณะนี้
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>ID: {file.id.slice(0, 14)}...</span>
                              {file.modifiedTime && (
                                <span>• แก้ไข: {new Date(file.modifiedTime).toLocaleDateString('th-TH')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                title="เปิดดูใน Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {isCurrent ? (
                              <button
                                onClick={openSpreadsheetViewer}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูชีต</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => selectSpreadsheet(file.id, file.name)}
                                className="px-3 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                เลือกสเปรดชีตนี้
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Google Sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    สร้าง Google Spreadsheet ใหม่
                  </h3>
                  <p className="text-xs text-slate-500">
                    ระบบจะสร้างไฟล์พร้อม 5 แท็บจัดระเบียบให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSheet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อไฟล์ Google Sheet
                </label>
                <input
                  type="text"
                  value={newSheetTitleInput}
                  onChange={(e) => setNewSheetTitleInput(e.target.value)}
                  placeholder="เช่น Nippon Paint — รายงานยอดขายและสต็อก 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5 แท็บที่จะถูกสร้างในสเปรดชีตให้อัตโนมัติ:</span>
                </div>
                <div className="text-[11px] text-emerald-700 pl-4 space-y-0.5">
                  <div>1. Sales_Transactions (ยอดขาย Real-time)</div>
                  <div>2. Customers (ข้อมูลลูกค้า CRM)</div>
                  <div>3. Products_Catalog (แคตตาล็อกสินค้า)</div>
                  <div>4. Stock_Inventory (สต็อกคงเหลือ)</div>
                  <div>5. Commission_Summary (สรุปคอมมิชชั่น)</div>
                </div>
              </div>

              {!isGoogleOAuthConnected && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ระบบจะเชื่อมต่อบัญชี Google ของคุณโดยอัตโนมัติ</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    เมื่อคลิกปุ่มด้านล่าง หากยังไม่ได้เข้าสู่ระบบ Google หน้าต่างป๊อปอัปจะเปิดขึ้นมาเพื่อให้คุณเลือกบัญชี Google และอนุญาตการสร้างไฟล์ลงใน Google Drive ครับ
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSheet}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PlusCircle className={`w-4 h-4 ${isCreatingSheet ? 'animate-spin' : ''}`} />
                  <span>
                    {isCreatingSheet
                      ? 'กำลังเชื่อมต่อและสร้างชีต...'
                      : !isGoogleOAuthConnected
                      ? 'เข้าสู่ระบบ Google & สร้างชีต'
                      : 'สร้างและเชื่อมต่อทันที'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click Multi-Tab Google Sheet Master Hub */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-5 md:p-7 text-white shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-bold mb-2 border border-white/10 backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>ระบบเชื่อมต่อ 5 แท็บในสเปรดชีตเดียว (One-Click Multi-Tab)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Google Sheet เดียว รวมครบทุกข้อมูลของร้าน
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              ยอดขาย, ลูกค้า, แคตตาล็อกสินค้า, สต็อกคงเหลือ และสรุปคอมมิชชั่น จะถูกส่งเข้าไปรวมในสเปรดชีตเดียวกัน แต่แยกเป็น 5 แท็บชีตอัตโนมัติ เพื่อให้เปิดดูและมั่นใจได้ว่าข้อมูลไม่หายแน่นอน
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              onClick={() => openSpreadsheet()}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-4 h-4 text-emerald-700" />
              <span>เปิดดู Google Sheet ของเรา</span>
            </button>
            <button
              onClick={() => exportAllTabsToExcel()}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl text-xs flex items-center gap-2 transition-all border border-white/20 cursor-pointer"
              title="ดาวน์โหลดไฟล์ Excel รวมครบทั้ง 5 แท็บ"
            >
              <Download className="w-4 h-4" />
              <span>สำรอง Excel 5 แท็บ</span>
            </button>
          </div>
        </div>

        {/* 5-Tab Visual Blueprint */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">ชีต 1</div>
            <div className="font-bold text-xs text-white mt-0.5 truncate">Sales_Transactions</div>
            <div className="text-[11px] text-emerald-100/80 mt-1">ยอดขาย {sales.length} รายการ</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">ชีต 2</div>
            <div className="font-bold text-xs text-white mt-0.5 truncate">Customers</div>
            <div className="text-[11px] text-emerald-100/80 mt-1">ลูกค้า {customers.length} คน</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">ชีต 3</div>
            <div className="font-bold text-xs text-white mt-0.5 truncate">Products_Catalog</div>
            <div className="text-[11px] text-emerald-100/80 mt-1">สินค้า {catalogItems.length} รายการ</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">ชีต 4</div>
            <div className="font-bold text-xs text-white mt-0.5 truncate">Stock_Inventory</div>
            <div className="text-[11px] text-emerald-100/80 mt-1">สต็อก {computedStock.length} รหัส</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">ชีต 5</div>
            <div className="font-bold text-xs text-white mt-0.5 truncate">Commission_Summary</div>
            <div className="text-[11px] text-emerald-100/80 mt-1">฿{Math.round(computedCommission.netCommission).toLocaleString()} บาท</div>
          </div>
        </div>

        {/* 1-Click Sync Master Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => syncAllTabsToGoogle()}
            disabled={syncStatus === 'syncing'}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 fill-slate-950 ${syncStatus === 'syncing' ? 'animate-bounce' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'กำลังซิงค์ครบทั้ง 5 แท็บเข้า Sheet...' : '⚡ ซิงค์ครบทั้ง 5 แท็บใน 1 คลิกเดียว (One-Click Sync All)'}</span>
          </button>

          <span className="text-xs text-emerald-200/90 text-center sm:text-left">
            * สคริปต์จะจัดระเบียบ 5 แท็บในไฟล์ชีตให้อัตโนมัติในคลิกเดียว
          </span>
        </div>
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

      {/* Cloud Persistence & Auto-Config Link for Team */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-5 md:p-6 border border-emerald-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">
                  ส่งต่อลิงก์ใช้งานจริงให้ทีมงาน (Auto-Config Team Link)
                </h3>
                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                  Cloud Synced
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                การตั้งค่า Webhook และ Spreadsheet ID ถูกบันทึกไว้บนระบบคลาวด์แล้ว สามารถกดคัดลอกลิงก์ด้านล่างไปเปิดบนเครื่อง PC, แท็บเล็ต หรือมือถือของพนักงานคนอื่น เพื่อใช้งานและส่งยอดเข้า Google Sheet เดียวกันได้ทันที
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyShareLink}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 shadow-sm"
          >
            {copiedShareLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            <span>{copiedShareLink ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์แอปพร้อมตั้งค่าอัตโนมัติ'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-500 border-t border-emerald-100">
          <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
            <Globe className="w-3.5 h-3.5" /> โดเมนปัจจุบัน:
          </span>
          <code className="px-2 py-0.5 bg-white rounded-md border border-emerald-200 font-mono text-[11px] text-emerald-900">
            {typeof window !== 'undefined' ? window.location.hostname : 'Cloud Run'}
          </code>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-700 font-medium">
            วิธี Apps Script Webhook รองรับทุกลิงก์และทุกอุปกรณ์โดยไม่ต้องตั้งค่า Domain เพิ่มเติมใน Firebase
          </span>
        </div>
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
